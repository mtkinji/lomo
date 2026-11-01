#!/usr/bin/env python3
"""Isolated PostgreSQL contract tests; never connects to a configured app database.

Uses historical production table/function/trigger definitions for this contract.
Auth JWT functions and SELECT policies are minimal harness substitutes, not a full
Supabase migration replay. The command always creates and removes its own cluster.
Requires PostgreSQL 17 binaries. No Docker or Python dependencies.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
ENV = {}
PSQL = []

def run(sql):
    result = subprocess.run(PSQL, input=sql, text=True, capture_output=True, env=ENV, timeout=20)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()

def build_schema():
    def read(n): return (ROOT/'supabase/migrations'/n).read_text()
    def fn(source,name):
     m=re.search(r'create or replace function '+re.escape(name)+r'\([\s\S]*?\$\$;',source)
     assert m,name
     return m.group()
    parts=['''create role anon; create role authenticated; create role service_role;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema auth,private to authenticated;
    grant execute on function auth.uid(),auth.jwt() to authenticated;
    ''']
    parts.append(fn(read('20260709131031_budget_living_plan_preferences.sql'),'public.set_updated_at'))
    s=read('20260709130916_budget_family_sharing.sql'); parts.append(s[:s.index('create table if not exists public.budget_household_invites')])
    parts.append(fn(s,'public.can_access_budget_household'))
    parts.append(s[s.index('drop policy if exists "Household members can read shared households"'):s.index('drop policy if exists "Household owners can read active invites"')])
    parts.append('''alter table public.budget_households enable row level security;
    alter table public.budget_household_members enable row level security;''')
    # Minimal pre-existing API SELECT privileges for this isolated fixture.
    # Do not depend on the separate, unmerged full-replay grant-baseline PR.
    # Real household RLS policies and actor-denial assertions remain in force.
    parts.append('grant select on public.budget_households,public.budget_household_members to authenticated;')
    s=read('20260728190000_household_foundation.sql'); parts.append(s[:s.index('create table public.kwilt_child_capability_catalog')])
    s=read('20260901040118_canonical_household_money_access.sql')
    for name in ['private.budget_users_share_adult_household','private.budget_canonical_adult_owner_user_id','private.budget_actor_is_active_household_child','private.budget_effective_owner_user_id','public.budget_effective_owner_user_id','public.can_access_budget_user']: parts.append(fn(s,name))
    s=read('20260709131005_budget_categories_and_plans.sql');parts.append(s[:s.index('alter table public.budget_categories enable')])
    s=read('20260710232320_automatic_living_plans.sql');parts.append(s[:s.index('create or replace function public.promote_budget_living_plan')])
    parts.append(read('20260710234042_version_planning_source_evidence.sql'))
    harden=read('20260710232416_harden_automatic_living_plans.sql')
    parts.append(harden[harden.index('drop policy if exists "Owners write living targets"'):])
    parts.append('grant select on public.budget_living_plan_config to authenticated;')
    s=read('20260727140041_governed_household_money_plan.sql')
    parts.append(s[:s.index('alter table public.budget_transactions')]);a=s.index('alter table public.budget_living_plan_versions');b=s.index('create table if not exists public.budget_planning_basis_overrides');parts.append(s[a:b])
    parts.append(s[s.index('create table if not exists public.budget_planning_basis_overrides'):s.index('create table if not exists public.budget_held_living_plan_candidates')])
    hardened=read('20260727140246_harden_governed_household_money_plan.sql')
    parts.append(hardened[:hardened.index('create policy "Only permanent users can access held Money plans"')])
    explicit=read('20260727140359_make_governed_money_policies_auth_explicit.sql')
    parts.append(explicit[:explicit.index('alter policy "Users can read their held Money plan"')])
    a=s.index('create table if not exists public.budget_held_living_plan_candidates');b=s.index('alter table public.budget_held_living_plan_candidates');parts.append(s[a:b])
    parts.extend([fn(s,'public.promote_budget_living_plan'),fn(s,'public.apply_governed_category_plan_change')])
    parts.append(read('20260802210412_add_budget_plan_role.sql'))
    parts.append(read('20261013123903_category_rollover_start_policy.sql'))
    parts.append(read('20260710234659_project_active_living_plan_into_budgets.sql'))
    parts.append('''alter table public.budget_categories enable row level security;
    alter table public.budget_plans enable row level security;
    create policy test_category_read on public.budget_categories for select to authenticated using(user_id=public.budget_effective_owner_user_id());
    create policy test_plan_read on public.budget_plans for select to authenticated using(user_id=public.budget_effective_owner_user_id());
    grant select on public.budget_categories,public.budget_plans to authenticated;
    ''')
    return "\n".join(parts)

def verify_release_contract():
    query=subprocess.check_output(['node',str(ROOT/'scripts/money/backend-contract.mjs'),'--query'],text=True).strip().rstrip(';')
    observed='select json_agg(checks) from ('+query+') checks;'
    checks=json.loads(run(observed))
    failures=[row['id'] for row in checks if not row['ok']]
    assert not failures, 'Valid isolated schema rejected: '+str(failures)
    run((ROOT/'supabase/tests/category_rollover_schema_contract.sql').read_text())
    cases=[
      ('disabled category timestamp trigger', 'alter table public.budget_categories disable trigger set_budget_categories_updated_at;'),
      ('disabled plan timestamp trigger', 'alter table public.budget_plans disable trigger set_budget_plans_updated_at;'),
      ('disabled plan projection trigger', 'alter table public.budget_active_living_plans disable trigger project_active_living_plan_into_budget_plans;'),
      ('changed timestamp implementation', 'create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin return new; end; $$;'),
      ('changed projection implementation', 'create or replace function public.project_active_living_plan_into_budget_plans() returns trigger language plpgsql security definer set search_path=public as $$ begin return new; end; $$;'),
      ('restricted timestamp trigger', 'drop trigger set_budget_plans_updated_at on public.budget_plans; create trigger set_budget_plans_updated_at before update of status on public.budget_plans for each row execute function public.set_updated_at();'),
      ('misbound projection trigger', 'drop trigger project_active_living_plan_into_budget_plans on public.budget_active_living_plans; create trigger project_active_living_plan_into_budget_plans after insert or update of plan_version_id on public.budget_active_living_plans for each row execute function public.set_updated_at();'),
      ('missing receipt request column', 'alter table private.budget_category_settings_receipts rename column request to old_request;'),
      ('revoked household helper', 'revoke all on function private.budget_effective_owner_user_id(uuid) from public, authenticated;'),
      ('missing rollover column', 'alter table public.budget_plans rename column rollover_policy to old_rollover_policy;'),
      ('missing receipt RPC', 'drop function public.get_budget_category_settings_receipt(uuid,uuid);'),
      ('missing command grant', 'revoke execute on function public.save_budget_category_settings(uuid,uuid,uuid,timestamptz,timestamptz,jsonb,jsonb) from authenticated;'),
      ('changed command body', "create or replace function public.get_budget_category_settings_receipt(p_expected_actor_user_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ begin return null; end; $$;"),
      ('missing household policy', 'drop policy "Household adults can read the Money plan config" on public.budget_living_plan_config;'),
      ('unsafe owner read policy', 'alter policy "Users can read their Money planning basis" on public.budget_planning_basis_overrides using(true);'),
      ('unsafe extra read policy', 'create policy unsafe_test_read on public.budget_living_plan_config for select to authenticated using(true);'),
    ]
    for name,change in cases:
      result=json.loads(run('begin; '+change+' '+observed+' rollback;'))
      assert any(not row['ok'] for row in result), name+' was accepted'
    print('PASS: release contract rejects missing schema/RPC/grant/policy, disabled or misbound triggers, changed code and broader access.')


def verify_concurrent_retry():
    source=(ROOT/'supabase/tests/category_settings_command.sql').read_text().split('set local role authenticated;')[0]
    fixture=json.loads(run(source+"\nselect row_to_json(f) from category_settings_fixture f; commit;"))
    settings=json.dumps(dict(name='Concurrent save',budgetCents=25000,fundingRhythm='monthly',rolloverEnabled=False,rolloverPolicy=None,planRole='flexible',expectedNeedCents=None,expectedNeedDueMonth=None))
    claims=json.dumps(dict(sub=fixture['owner_id'],is_anonymous=False))
    query=f"select public.save_budget_category_settings('{fixture['owner_id']}','{fixture['request_id']}','{fixture['category_id']}','2026-01-01','2026-01-01','{settings}'::jsonb,null)::text;"
    login=f"set role authenticated; select set_config('request.jwt.claims','{claims}',false);"
    first=subprocess.Popen(PSQL,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={**ENV,'PGAPPNAME':'kwilt-settings-first'})
    first.stdin.write('begin;\n'+login+'\n'+query+'\n\\echo SAVED\n');first.stdin.flush()
    lines=[]
    while True:
     line=first.stdout.readline().strip()
     if line=='SAVED':break
     if not line and first.poll() is not None:raise RuntimeError(first.stderr.read())
     lines.append(line)
    receipt=json.loads(lines[-1])
    second=subprocess.Popen(PSQL,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={**ENV,'PGAPPNAME':'kwilt-settings-retry'})
    second.stdin.write(login+'\n'+query);second.stdin.close()
    try:
     deadline=time.monotonic()+5
     while time.monotonic()<deadline:
      waiting=run("select count(*) from pg_stat_activity where application_name='kwilt-settings-retry' and wait_event='advisory';")
      if waiting=='1':break
      if second.poll() is not None:raise RuntimeError('Retry completed before first commit: '+second.stderr.read())
      time.sleep(.05)
     else:raise RuntimeError('Retry did not wait on first request')
     first.stdin.write('commit;\n');first.stdin.close();first.wait(timeout=5)
     second.wait(timeout=5)
     if second.returncode:raise RuntimeError(second.stderr.read())
     replay=json.loads(second.stdout.read().strip().splitlines()[-1])
     assert replay==receipt,'Concurrent retry returned a different result'
     count=run(f"select count(*) from private.budget_category_settings_receipts where actor_user_id='{fixture['owner_id']}' and request_id='{fixture['request_id']}';")
     assert count=='1',count
     print('PASS: concurrent identical request waits, returns the exact committed receipt, and creates one receipt.')
    finally:
     for proc in [first,second]:
      if proc.poll() is None:proc.kill();proc.wait()

def verify_reversal_lock():
    owner=run('select user_id from public.budget_categories limit 1;')
    assert owner
    first=subprocess.Popen(PSQL,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ENV)
    first.stdin.write(f"begin;select pg_advisory_xact_lock(hashtextextended('budget-plan:{owner}',0));\n\\echo LOCKED\n");first.stdin.flush()
    while first.stdout.readline().strip()!='LOCKED':
     if first.poll() is not None:raise RuntimeError(first.stderr.read())
    second=subprocess.Popen(PSQL,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={**ENV,'PGAPPNAME':'kwilt-settings-reversal'})
    claims=json.dumps({'sub':owner,'is_anonymous':False})
    second.stdin.write(f"set role authenticated;select set_config('request.jwt.claims','{claims}',false);select public.reverse_budget_living_plan(null,gen_random_uuid());");second.stdin.close()
    try:
     deadline=time.monotonic()+5
     while time.monotonic()<deadline:
      if run("select count(*) from pg_stat_activity where application_name='kwilt-settings-reversal' and wait_event='advisory';")=='1':break
      if second.poll() is not None:raise AssertionError('Reversal touched active-plan state before acquiring the owner lock: '+second.stderr.read().strip())
      time.sleep(.05)
     else:raise AssertionError('No owner-lock wait observed')
     first.stdin.write('commit;\n');first.stdin.close();first.wait(timeout=5)
     second.wait(timeout=5)
     assert 'restore version unavailable' in second.stderr.read(),'Expected nonexistent fixture version after lock release'
     print('PASS: reversal acquires the owner lock before reading/locking active-plan state.')
    finally:
     for p in [first,second]:
      if p.poll() is None:p.kill();p.wait()


def main():
    global ENV, PSQL
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pg-bin', required=True, help='Directory containing PostgreSQL 17 initdb, pg_ctl and psql')
    args = parser.parse_args()
    pg_bin = Path(args.pg_bin).resolve()
    version = subprocess.check_output([str(pg_bin/'postgres'), '--version'], text=True).strip()
    if not re.search(r'PostgreSQL\) 17\.', version):
        raise RuntimeError('This harness requires PostgreSQL 17: '+version)
    scratch = Path(tempfile.mkdtemp(prefix='kwilt-category-settings-', dir='/tmp'))
    started = False
    try:
        subprocess.run([str(pg_bin/'initdb'), '-D', str(scratch/'data'), '-A', 'trust', '--no-locale'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        subprocess.run([str(pg_bin/'pg_ctl'), '-D', str(scratch/'data'), '-l', str(scratch/'server.log'),
                        '-o', f"-k {scratch} -p 55449 -c listen_addresses=''", 'start'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        started = True
        ENV = {**{key: value for key, value in os.environ.items() if not key.startswith('PG')},
               'PGHOST': str(scratch), 'PGPORT': '55449', 'PGDATABASE': 'postgres',
               'PGOPTIONS': '-c statement_timeout=10000'}
        # Local trust is restricted to this temporary Unix socket; no network listener.
        PSQL = [str(pg_bin/'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
        run(build_schema())
        run((ROOT/'supabase/migrations/20261101154005_atomic_budget_category_settings.sql').read_text())
        run((ROOT/'supabase/migrations/20261101163341_household_category_settings_preview_read.sql').read_text())
        print(run((ROOT/'supabase/tests/category_settings_command.sql').read_text()))
        fixture=(ROOT/'supabase/tests/category_settings_command.sql').read_text().split('set local role authenticated;')[0]
        print(run(fixture+(ROOT/'supabase/tests/household_category_settings_preview.sql').read_text()))
        verify_release_contract()
        verify_concurrent_retry()
        verify_reversal_lock()
        print('PASS: isolated category settings contract on '+version)
    finally:
        if started:
            subprocess.run([str(pg_bin/'pg_ctl'), '-D', str(scratch/'data'), '-m', 'immediate', 'stop'],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        shutil.rmtree(scratch)

if __name__ == '__main__':
    main()

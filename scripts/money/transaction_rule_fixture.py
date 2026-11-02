"""Rule fixture added to the isolated PostgreSQL harness, never a live database.

Historical rule/meaning/coverage DDL and functions are reused verbatim. The base
transaction table, read policies and Pro entitlement lookup are fixture substitutes;
canonical household access and the real entitlement trigger still execute.
"""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[2]
MIGRATION = '20261102021916_transfer_and_literal_merchant_rules.sql'
def schema():
    def read(name): return (ROOT/'supabase/migrations'/name).read_text()
    def fn(source, name):
        match = re.search(r'create or replace function '+re.escape(name)+r'\([\s\S]*?\$\$;', source)
        assert match, name
        return match.group()
    parts = ['''create table public.budget_transactions(
      id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
      name text not null,merchant_name text,original_description text,direction text not null,
      amount_cents integer not null default 10000,pending boolean not null default false,
      budget_assignment_source text,budget_assignment_policy_version text,budget_assignment_governed boolean not null default false);
      create table public.budget_transaction_allocations(transaction_id uuid references public.budget_transactions(id),user_id uuid not null,budget_id text,amount_cents integer);
      alter table public.budget_transactions enable row level security;
      alter table public.budget_transaction_allocations enable row level security;
      grant select on public.budget_transactions,public.budget_transaction_allocations to authenticated;
      grant update(budget_assignment_source,budget_assignment_policy_version,budget_assignment_governed) on public.budget_transactions to authenticated;
      create policy fixture_transactions_read on public.budget_transactions for select to authenticated using(user_id=public.budget_effective_owner_user_id());
    ''']
    for name in ['20260706160000_budget_transaction_reviews.sql','20260710034128_budget_transaction_money_meaning.sql',
                 '20260719155556_enforce_single_budget_transaction_merchant_rule.sql','20260728051739_merchant_rules_apply_all_transactions.sql',
                 '20260728052413_ensure_merchant_rule_backfill_on_rule_write.sql',
                 '20260804151537_add_money_transaction_plan_role_override.sql','20260822005640_add_budget_transaction_plan_coverage.sql',
                 '20260902121922_optimize_exact_merchant_rule_history.sql']:
        parts.append(read(name))
    parts.append(fn(read('20260901040118_canonical_household_money_access.sql'),'public.can_manage_budget_user'))
    s=read('20260915164527_household_money_transaction_write_authority.sql')
    parts.append(s[:s.index('create or replace function public.ensure_budget_transaction_allocations_valid')])
    parts.append(fn(s,'public.upsert_budget_transaction_match_rule'))
    parts.append('''drop policy "Users can read their own budget transaction match rules" on public.budget_transaction_match_rules;
      create policy fixture_rules_read on public.budget_transaction_match_rules for select to authenticated using(user_id=public.budget_effective_owner_user_id());
      create function auth.role() returns text language sql stable as $$ select coalesce(auth.jwt()->>'role','authenticated') $$;
      create function public.kwilt_has_active_pro() returns boolean language sql stable as $$ select coalesce((auth.jwt()->>'fixture_pro')::boolean,true) $$;
    ''')
    parts.append(fn(read('20260901052946_monetization_subscription_lifecycle.sql'),'public.kwilt_require_money_pro_write'))
    parts.append('''create trigger require_pro_for_money_write before insert or update on public.budget_transaction_match_rules for each row execute function public.kwilt_require_money_pro_write();''')
    return '\n'.join(parts)

def verify(run):
    # The existing actor fixture is rolled back along with all transaction rows.
    fixture=(ROOT/'supabase/tests/category_settings_command.sql').read_text().split('set local role authenticated;')[0]
    print(run(fixture+(ROOT/'supabase/tests/transaction_rules_v2.sql').read_text()))

def verify_upgrade(run):
    fixture=(ROOT/'supabase/tests/category_settings_command.sql').read_text().split('set local role authenticated;')[0]
    before="""
    insert into public.budget_transactions(user_id,name,direction)
      select owner_id,'Online Payment To Taylor Example','outflow' from category_settings_fixture;
    insert into public.budget_transaction_match_rules(user_id,budget_id,merchant_contains,merchant_match_mode)
      select owner_id,'legacy-atomic-settings','taylor example','partial' from category_settings_fixture;
    create temporary table rule_upgrade_before as select to_jsonb(t) data from public.budget_transactions t;
    """
    after="""
    do $$ begin
      assert not exists((select to_jsonb(t) from public.budget_transactions t except select data from rule_upgrade_before)
        union all (select data from rule_upgrade_before except select to_jsonb(t) from public.budget_transactions t)), 'Deployment rewrote transaction history';
      assert (select bool_and(match_version='legacy' and rule_kind='category') from public.budget_transaction_match_rules), 'Legacy rules changed interpretation';
    end $$;
    select 'PASS: upgrading existing rules neither rewrites transaction history nor switches legacy matching.';
    rollback;
    """
    print(run(fixture+before+(ROOT/'supabase/migrations'/MIGRATION).read_text()+after))

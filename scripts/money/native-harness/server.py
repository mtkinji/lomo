#!/usr/bin/env python3
"""Disposable, loopback-only PostgreSQL/PostgREST Budget acceptance backend.

No app environment files, production databases or real accounts are used.
Auth identities are synthetic; signed JWTs are verified by real PostgREST.
The auth-user endpoint is a fixture, not Supabase Auth acceptance.
"""
import argparse
import base64
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('contract', ROOT/'scripts/money/verify-category-settings-postgres.py')
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pg-bin', default='/opt/homebrew/opt/postgresql@17/bin')
    parser.add_argument('--postgrest', default='/opt/homebrew/bin/postgrest')
    args = parser.parse_args()
    pg = Path(args.pg_bin)
    secret = secrets.token_urlsafe(48)
    state = {'drop_next_save': False, 'offline_receipt': False}
    pgrst = None
    started = False
    with tempfile.TemporaryDirectory(prefix='kwilt-budget-api-', dir='/tmp') as scratch:
      try:
        subprocess.run([str(pg/'initdb'), '-D', scratch+'/data', '-A', 'trust', '--no-locale'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        subprocess.run([str(pg/'pg_ctl'), '-D', scratch+'/data', '-l', scratch+'/postgres.log', '-o', f"-k {scratch} -p 55450 -c listen_addresses=''", 'start'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        started = True
        contract.ENV = {**{k: v for k, v in os.environ.items() if not k.startswith('PG')}, 'PGHOST': scratch, 'PGPORT': '55450', 'PGDATABASE': 'postgres', 'PGOPTIONS': '-c statement_timeout=10000'}
        contract.PSQL = [str(pg/'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
        run = contract.run
        run(contract.build_schema())
        for migration in ['20261101213719_atomic_budget_category_settings.sql', '20261101213724_household_category_settings_preview_read.sql']:
            run((ROOT/'supabase/migrations'/migration).read_text())
        setup = (ROOT/'supabase/tests/category_settings_command.sql').read_text().split('set local role authenticated;')[0]
        fixture = json.loads(run(setup+"select row_to_json(f) from category_settings_fixture f; commit;"))
        run('create role fixture_authenticator login noinherit; grant anon,authenticated to fixture_authenticator; grant usage on schema public to anon,authenticated;')
        def token(actor, anonymous=False):
            encode = lambda value: base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=')
            body = encode({'alg': 'HS256', 'typ': 'JWT'})+b'.'+encode({'role': 'authenticated', 'sub': actor, 'is_anonymous': anonymous, 'exp': int(time.time())+86400})
            return (body+b'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).rstrip(b'=')).decode()
        sessions = {name: {'actorUserId': fixture[name+'_id'], 'token': token(fixture[name+'_id']), 'categoryId': fixture['category_id']} for name in ['owner','adult','child','other']}
        sessions['anonymous'] = {**sessions['owner'], 'token': token(fixture['owner_id'], True), 'isAnonymous': True}
        log = open(scratch+'/postgrest.log', 'w')
        pgrst = subprocess.Popen([args.postgrest], stdout=log, stderr=log, env={**os.environ,
          'PGRST_DB_URI': f'postgresql://fixture_authenticator@/postgres?host={scratch}&port=55450',
          'PGRST_DB_SCHEMAS': 'public', 'PGRST_DB_ANON_ROLE': 'anon', 'PGRST_JWT_SECRET': secret,
          'PGRST_SERVER_HOST': '127.0.0.1', 'PGRST_SERVER_PORT': '8083', 'PGRST_DB_CONFIG': 'false'})
        for _ in range(100):
            if pgrst.poll() is not None: raise RuntimeError(Path(scratch+'/postgrest.log').read_text())
            try:
                urllib.request.urlopen('http://127.0.0.1:8083/', timeout=.2); break
            except urllib.error.HTTPError: break
            except OSError: time.sleep(.1)
        else: raise RuntimeError('PostgREST did not become ready')

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_args): pass
            def reply(self, value, status=200):
                body=json.dumps(value).encode(); self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
            def do_GET(self): self.handle_request()
            def do_POST(self): self.handle_request()
            def handle_request(self):
                if self.headers.get('Origin') and not self.headers['Origin'].startswith(('http://localhost:', 'http://127.0.0.1:')):
                    self.reply({'error':'Only local fixtures may access this server'},403); return
                body=self.rfile.read(int(self.headers.get('Content-Length','0')))
                if self.path.startswith('/fixture/session') and self.command=='GET':
                    role=self.path.partition('?actor=')[2] or 'owner'
                    self.reply(sessions.get(role, {})); return
                if self.path=='/fixture/control' and self.command=='POST':
                    action=json.loads(body)['action']
                    if action=='lose-response': state.update(drop_next_save=True, offline_receipt=False)
                    elif action=='recover': state.update(drop_next_save=False, offline_receipt=False)
                    elif action=='enable-governance':
                        run(f"insert into public.budget_living_plan_config(user_id,promotion_enabled) values ('{fixture['owner_id']}',true) on conflict(user_id) do update set promotion_enabled=true; insert into public.budget_living_target_intents(user_id,living_percent,provenance) select '{fixture['owner_id']}',70,'settings' where not exists(select 1 from public.budget_living_target_intents where user_id='{fixture['owner_id']}');")
                    elif action=='disable-governance':
                        run(f"update public.budget_living_plan_config set promotion_enabled=false where user_id='{fixture['owner_id']}';")
                    else: self.reply({'error':'Unknown fixture control'},400); return
                    self.reply(state); return
                if self.path=='/fixture/receipt-count' and self.command=='GET':
                    self.reply({'count':int(run('select count(*) from private.budget_category_settings_receipts;')),
                      'versions':int(run('select count(*) from public.budget_living_plan_versions;')),
                      'activePlans':int(run('select count(*) from public.budget_active_living_plans;'))}); return
                if self.path=='/auth/v1/user' and self.command=='GET':
                    bearer=self.headers.get('Authorization','').removeprefix('Bearer ')
                    matched=next((s for s in sessions.values() if hmac.compare_digest(s['token'],bearer)),None)
                    self.reply({'id':matched['actorUserId'],'is_anonymous':matched.get('isAnonymous',False),'aud':'authenticated'} if matched else {'error':'Invalid fixture session'},200 if matched else 401); return
                path=self.path.removeprefix('/rest/v1')
                allowed=(self.command=='GET' and (path.startswith('/budget_categories?') or path.startswith('/budget_plans?'))) or (self.command=='POST' and path in ['/rpc/save_budget_category_settings','/rpc/get_budget_category_settings_receipt'])
                if not allowed: self.reply({'error':'Outside isolated Budget contract'},404); return
                if state['offline_receipt'] and path=='/rpc/get_budget_category_settings_receipt':
                    self.reply({'code':'FIXTURE_OFFLINE','message':'Synthetic offline receipt'},503); return
                request=urllib.request.Request('http://127.0.0.1:8083'+path, data=body if self.command=='POST' else None, method=self.command, headers={'Content-Type':'application/json','Authorization':self.headers.get('Authorization','')})
                try:
                    with urllib.request.urlopen(request, timeout=10) as result: status=result.status; response=result.read()
                except urllib.error.HTTPError as error: status=error.code; response=error.read()
                if path=='/rpc/save_budget_category_settings' and state['drop_next_save'] and status==200:
                    state.update(drop_next_save=False,offline_receipt=True); self.close_connection=True; self.connection.close(); return
                self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(response))); self.end_headers(); self.wfile.write(response)

        server=ThreadingHTTPServer(('127.0.0.1',8082), Handler)
        signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
        print('READY: isolated Budget API on http://localhost:8082; synthetic accounts only',flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: pass
        finally: server.server_close()
      finally:
        if pgrst: pgrst.terminate(); pgrst.wait(timeout=10)
        if started: subprocess.run([str(pg/'pg_ctl'),'-D',scratch+'/data','-m','immediate','stop'],stdout=subprocess.DEVNULL,check=True)

if __name__=='__main__': main()

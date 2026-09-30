import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(new URL(
  '../supabase/migrations/20260917123217_schedule_phone_agent_workers.sql',
  import.meta.url,
), 'utf8');

test('schedules both Phone Agent workers with one Vault-backed secret', () => {
  assert.match(migration, /create extension if not exists pg_cron/);
  assert.match(migration, /create extension if not exists pg_net/);
  assert.match(migration, /cron\.unschedule\('kwilt-phone-agent-tick'\)/);
  assert.match(migration, /cron\.unschedule\('kwilt-agent-channel-tick'\)/);
  assert.match(migration, /cron\.schedule\(\s*'kwilt-phone-agent-tick',\s*'\* \* \* \* \*'/s);
  assert.match(migration, /cron\.schedule\(\s*'kwilt-agent-channel-tick',\s*'\* \* \* \* \*'/s);
  assert.match(migration, /functions\/v1\/phone-agent-tick/);
  assert.match(migration, /functions\/v1\/agent-channel-tick/);
  assert.equal((migration.match(/name = 'kwilt_phone_agent_cron_secret'/g) ?? []).length, 2);
  assert.equal((migration.match(/'Authorization', 'Bearer ' \|\| decrypted_secret/g) ?? []).length, 2);
  assert.doesNotMatch(migration, /PHONE_AGENT_CRON_SECRET\s*=/);
});

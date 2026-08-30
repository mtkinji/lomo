import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../supabase/migrations/20260829054800_activity_backed_chore_profiles.sql', import.meta.url), 'utf8');

test('occurrence reconciliation uses a valid typed-row loop target', () => {
  assert.doesNotMatch(sql, /for\s+v_profile\s*,\s*v_series\s+in/i);
  assert.match(sql, /for\s+v_profile\s+in\s+select\s+cp\.\*/i);
});

test('snapshot aggregates are staged before the final JSON constructor', () => {
  assert.match(sql, /v_members jsonb;\s*v_definitions jsonb;/i);
  assert.doesNotMatch(sql, /'definitions'\s*,\s*coalesce\(\(select/i);
});

test('Chores keeps Activity identity and stores only policy, occurrence, evidence, and reward authority', () => {
  assert.match(sql, /activity_series_id text not null/);
  assert.match(sql, /activity_id text not null/);
  assert.match(sql, /references public\.kwilt_activities/);
  assert.match(sql, /kwilt_chore_evidence_refs/);
  assert.match(sql, /kwilt_chore_reward_ledger/);
});

test('recurrence, missed work, correction, and one-current-credit semantics are server governed', () => {
  assert.match(sql, /kwilt_next_chore_date/);
  assert.match(sql, /reconcile_kwilt_agent_chore_occurrences/);
  assert.match(sql, /set state='missed'/);
  assert.match(sql, /chores\.occurrence\.report_earlier/);
  assert.match(sql, /not v_occurrence\.token_credited/);
  assert.match(sql, /,'adjust',-/);
});

test('native evidence is private uploaded storage, not a local URI claimed as shared proof', () => {
  assert.match(sql, /chore_evidence.*false/);
  assert.match(sql, /kwilt_chore_evidence_storage_insert/);
  assert.match(sql, /chore_evidence_upload_missing/);
});

test('all mutations cross Household actor, exact-version, and idempotency boundaries', () => {
  assert.match(sql, /kwilt_agent_household_actor/);
  assert.match(sql, /stale_chore_occurrence/);
  assert.match(sql, /stale_chore_definition/);
  assert.match(sql, /kwilt_chore_action_receipts/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /kwilt_chore_actor/);
  assert.match(sql, /kwilt_household_device_member_access/);
  assert.match(sql, /invalid_household_mode_chore_actor/);
});

test('public Chores RPC wrappers are executable only by authenticated users', () => {
  assert.match(sql, /revoke all on function public\.get_kwilt_chore_snapshot\(uuid,text\) from public,anon,authenticated;/);
  assert.match(sql, /revoke all on function public\.execute_kwilt_chore_action\(jsonb,uuid,text\) from public,anon,authenticated;/);
  assert.match(sql, /grant execute on function public\.get_kwilt_chore_snapshot\(uuid,text\) to authenticated;/);
  assert.match(sql, /grant execute on function public\.execute_kwilt_chore_action\(jsonb,uuid,text\) to authenticated;/);
});

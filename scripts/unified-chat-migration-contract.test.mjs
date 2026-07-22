import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260722151037_unified_chat_trust_contract.sql', import.meta.url),
  'utf8',
).toLowerCase();
const attachmentMigration = readFileSync(
  new URL('../supabase/migrations/20260722154051_unified_chat_text_attachments.sql', import.meta.url),
  'utf8',
).toLowerCase();
const transitionMigration = readFileSync(
  new URL('../supabase/migrations/20260722163951_unified_chat_atomic_transitions.sql', import.meta.url),
  'utf8',
).toLowerCase();

const trustTables = [
  'kwilt_agent_context_refs',
  'kwilt_agent_run_events',
  'kwilt_agent_evidence_refs',
  'kwilt_agent_proposals',
  'kwilt_agent_proposal_operations',
  'kwilt_agent_decisions',
  'kwilt_agent_mutation_receipts',
  'kwilt_agent_feedback',
];

test('creates every durable trust record with RLS enabled', () => {
  for (const table of trustTables) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test('keeps all trust tables credentialed and owner scoped', () => {
  assert.match(migration, /grant select, insert, update, delete[\s\S]*to authenticated/);
  assert.match(migration, /revoke all[\s\S]*from anon/);
  for (const table of trustTables) {
    assert.match(migration, new RegExp(`${table}_owner_select`));
    assert.match(migration, new RegExp(`${table}_owner_insert`));
    assert.match(migration, new RegExp(`${table}_owner_update`));
    assert.match(migration, new RegExp(`${table}_owner_delete`));
  }
  assert.match(migration, /public\.is_non_anonymous_kwilt_user\(\)/);
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/);
});

test('orders run events and makes capability application idempotent', () => {
  assert.match(migration, /unique \(run_id, sequence\)/);
  assert.match(
    migration,
    /unique index[\s\S]*kwilt_agent_mutation_receipts[\s\S]*user_id, capability_id, idempotency_key/,
  );
  assert.match(migration, /idempotency_key text not null/);
});

test('requires child records to belong to an owned parent', () => {
  assert.match(migration, /from public\.kwilt_agent_threads thread/);
  assert.match(migration, /from public\.kwilt_agent_runs run/);
  assert.match(migration, /from public\.kwilt_agent_proposals proposal/);
  assert.match(migration, /join public\.kwilt_agent_proposal_operations operation/);
});

test('adds request policy and optimistic versioning to durable runs', () => {
  assert.match(migration, /add column request_class text/);
  assert.match(migration, /add column participating_capabilities text\[\]/);
  assert.match(migration, /add column context_policy jsonb/);
  assert.match(migration, /add column version integer not null default 1/);
});

test('makes proposal decisions atomic, owner-scoped, and version-checked', () => {
  assert.match(migration, /create or replace function public\.decide_kwilt_agent_proposal/);
  assert.match(migration, /for update/);
  assert.match(migration, /candidate\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /stale_proposal_version/);
  assert.match(migration, /insert into public\.kwilt_agent_decisions/);
  assert.match(migration, /update public\.kwilt_agent_proposal_operations/);
  assert.match(migration, /jsonb_object_keys\(p_patch\)/);
  assert.match(migration, /unsupported_proposal_patch/);
  assert.match(migration, /grant execute on function public\.decide_kwilt_agent_proposal/);
  assert.match(migration, /revoke all on function public\.decide_kwilt_agent_proposal[^;]+from anon/);
});

test('reserves mutation receipts before apply and records correction feedback atomically', () => {
  assert.match(migration, /status in \('reserved', 'applied', 'failed', 'undone'\)/);
  assert.match(migration, /create or replace function public\.record_kwilt_agent_message_feedback/);
  assert.match(migration, /select \* into v_message[\s\S]*for update/);
  assert.match(migration, /insert into public\.kwilt_agent_feedback/);
  assert.match(migration, /grant execute on function public\.record_kwilt_agent_message_feedback/);
  assert.match(migration, /revoke all on function public\.record_kwilt_agent_message_feedback[^;]+from public, anon/);
});

test('persists bounded text attachments atomically under message ownership', () => {
  assert.match(attachmentMigration, /create table public\.kwilt_agent_message_attachments/);
  assert.match(attachmentMigration, /alter table public\.kwilt_agent_message_attachments enable row level security/);
  assert.match(attachmentMigration, /kwilt_agent_message_attachments_owner_select/);
  assert.match(attachmentMigration, /join public\.kwilt_agent_threads thread/);
  assert.match(attachmentMigration, /create or replace function public\.create_kwilt_agent_user_message/);
  assert.match(attachmentMigration, /jsonb_array_length\(v_attachments\)/);
  assert.match(attachmentMigration, /v_attachment_count > 3/);
  assert.match(attachmentMigration, /octet_length\(item ->> 'content'\) > 100000/);
  assert.match(attachmentMigration, /v_attachment_total > 200000/);
  assert.match(attachmentMigration, /insert into public\.kwilt_agent_messages/);
  assert.match(attachmentMigration, /insert into public\.kwilt_agent_message_attachments/);
  assert.match(attachmentMigration, /client_request_conflict/);
  assert.match(attachmentMigration, /revoke all on function public\.create_kwilt_agent_user_message[^;]+from public, anon/);
});

test('persists legal run and proposal transitions atomically with ordered events', () => {
  assert.match(transitionMigration, /create or replace function public\.transition_kwilt_agent_run/);
  assert.match(transitionMigration, /create or replace function public\.transition_kwilt_agent_proposal/);
  assert.match(transitionMigration, /for update/);
  assert.match(transitionMigration, /stale_run_version/);
  assert.match(transitionMigration, /invalid_run_transition/);
  assert.match(transitionMigration, /stale_proposal_version/);
  assert.match(transitionMigration, /invalid_proposal_transition/);
  assert.match(transitionMigration, /coalesce\(max\(sequence\), 0\) \+ 1/);
  assert.match(transitionMigration, /insert into public\.kwilt_agent_run_events/);
  assert.match(transitionMigration, /grant execute on function public\.transition_kwilt_agent_run/);
  assert.match(transitionMigration, /grant execute on function public\.transition_kwilt_agent_proposal/);
});

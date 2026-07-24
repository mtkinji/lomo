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
const clientActionMigration = readFileSync(
  new URL('../supabase/migrations/20260723161849_unified_chat_pending_client_actions.sql', import.meta.url),
  'utf8',
).toLowerCase();
const channelRunMigration = readFileSync(
  new URL('../supabase/migrations/20260723164223_canonical_agent_run_channels.sql', import.meta.url),
  'utf8',
).toLowerCase();
const channelJobMigration = readFileSync(
  new URL('../supabase/migrations/20260723170039_agent_channel_job_queue.sql', import.meta.url),
  'utf8',
).toLowerCase();
const serverActivityCaptureMigration = readFileSync(
  new URL('../supabase/migrations/20260723171559_unified_chat_server_activity_capture.sql', import.meta.url),
  'utf8',
).toLowerCase();
const serverProposalStagingMigration = readFileSync(
  new URL('../supabase/migrations/20260723174500_unified_chat_server_proposal_staging.sql', import.meta.url),
  'utf8',
).toLowerCase();
const serverProposalBatchMigration = readFileSync(
  new URL('../supabase/migrations/20260723184500_unified_chat_server_proposal_batch.sql', import.meta.url),
  'utf8',
).toLowerCase();
const phoneAgentTimezoneMigration = readFileSync(
  new URL('../supabase/migrations/20260723181500_phone_agent_timezone.sql', import.meta.url),
  'utf8',
).toLowerCase();
const agentProfileProjectionMigration = readFileSync(
  new URL('../supabase/migrations/20260723190000_unified_chat_agent_profile_projection.sql', import.meta.url),
  'utf8',
).toLowerCase();
const relationshipMemoryMigration = readFileSync(
  new URL('../supabase/migrations/20260723193000_unified_chat_relationship_memory.sql', import.meta.url),
  'utf8',
).toLowerCase();
const relationshipManagementMigration = readFileSync(
  new URL('../supabase/migrations/20260723194500_unified_chat_relationship_management.sql', import.meta.url),
  'utf8',
).toLowerCase();
const relationshipMemoryFunction = readFileSync(
  new URL('../supabase/functions/relationship-memory/index.ts', import.meta.url),
  'utf8',
);
const phoneSmsFunction = readFileSync(
  new URL('../supabase/functions/phone-agent-sms/index.ts', import.meta.url),
  'utf8',
);
const phoneAgentLinkFunction = readFileSync(
  new URL('../supabase/functions/phone-agent-link/index.ts', import.meta.url),
  'utf8',
);
const channelTickFunction = readFileSync(
  new URL('../supabase/functions/agent-channel-tick/index.ts', import.meta.url),
  'utf8',
);

test('persists bounded phone-link timezone context for relative Plan dates', () => {
  assert.match(phoneAgentTimezoneMigration, /add column if not exists timezone text/);
  assert.match(phoneAgentTimezoneMigration, /char_length\(timezone\) between 1 and 100/);
  assert.match(channelTickFunction, /permissions,timezone/);
  assert.match(channelTickFunction, /timeZone: input\.timeZone/);
});

test('projects only bounded native Profile fields for owner-scoped server-channel use', () => {
  const tableDefinition = agentProfileProjectionMigration.slice(
    agentProfileProjectionMigration.indexOf('create table'),
    agentProfileProjectionMigration.indexOf('\n);') + 3,
  );
  assert.match(agentProfileProjectionMigration, /create table public\.kwilt_agent_profile_projections/);
  assert.match(agentProfileProjectionMigration, /profile_id text/);
  assert.match(agentProfileProjectionMigration, /full_name text/);
  assert.match(agentProfileProjectionMigration, /age_range text/);
  assert.match(agentProfileProjectionMigration, /profile_updated_at timestamptz/);
  assert.match(agentProfileProjectionMigration, /enable row level security/);
  assert.match(agentProfileProjectionMigration, /kwilt_agent_profile_projections_owner_select/);
  assert.match(agentProfileProjectionMigration, /kwilt_agent_profile_projections_owner_insert/);
  assert.match(agentProfileProjectionMigration, /kwilt_agent_profile_projections_owner_update/);
  assert.match(agentProfileProjectionMigration, /kwilt_agent_profile_projections_owner_delete/);
  assert.match(agentProfileProjectionMigration, /\(select auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(tableDefinition, /\b(email|birthdate|identity_summary|coach_context|raw_profile)\b/);
});

test('applies explicit relationship memory atomically through existing owner-scoped records and trust receipts', () => {
  assert.match(relationshipMemoryMigration, /'remember_relationships', false/);
  assert.match(relationshipMemoryMigration, /create or replace function public\.remember_kwilt_agent_relationship/);
  assert.match(relationshipMemoryMigration, /security definer/);
  assert.match(relationshipMemoryMigration, /candidate\.status = 'active'/);
  assert.match(relationshipMemoryMigration, /candidate\.user_id = p_user_id/);
  assert.match(relationshipMemoryMigration, /unsupported_relationship_field/);
  assert.match(relationshipMemoryMigration, /relationship_fact_required/);
  assert.match(relationshipMemoryMigration, /kwilt_phone_agent_people/);
  assert.match(relationshipMemoryMigration, /kwilt_phone_agent_memory_items/);
  assert.match(relationshipMemoryMigration, /kwilt_phone_agent_events/);
  assert.match(relationshipMemoryMigration, /kwilt_phone_agent_cadences/);
  assert.match(relationshipMemoryMigration, /insert into public\.kwilt_agent_proposals/);
  assert.match(relationshipMemoryMigration, /insert into public\.kwilt_agent_proposal_operations/);
  assert.match(relationshipMemoryMigration, /insert into public\.kwilt_agent_mutation_receipts/);
  assert.match(relationshipMemoryMigration, /insert into public\.kwilt_phone_agent_action_log/);
  assert.match(relationshipMemoryMigration, /update public\.kwilt_agent_channel_jobs/);
  assert.match(relationshipMemoryMigration, /legacy_enrichment_at = v_timestamp/);
  assert.match(relationshipMemoryMigration, /v_idempotency_key/);
  assert.match(relationshipMemoryMigration, /revoke all on function public\.remember_kwilt_agent_relationship[\s\S]+from public, anon, authenticated/);
  assert.match(relationshipMemoryMigration, /grant execute on function public\.remember_kwilt_agent_relationship[\s\S]+to service_role/);
  assert.match(phoneAgentLinkFunction, /remember_relationships: false/);
  assert.match(channelTickFunction, /\['relationships\.remember', 'relationships\.correct', 'relationships\.forget'\]\.includes\(tool\.id\)/);
  assert.match(channelTickFunction, /permissions\.remember_relationships === true[\s\S]+buildLegacyPhoneAgentEnrichmentPayload/);
});

test('uses one authenticated relationship provider for mobile correction and forgetting', () => {
  assert.match(relationshipMemoryFunction, /executeServerRelationshipTool/);
  assert.match(relationshipMemoryFunction, /auth\.getUser\(token\)/);
  assert.match(relationshipMemoryFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(relationshipMemoryFunction, /relationships\.correct/);
  assert.match(relationshipMemoryFunction, /relationships\.forget/);
  assert.match(relationshipMemoryFunction, /threadId/);
  assert.match(relationshipMemoryFunction, /runId/);
  assert.match(relationshipMemoryFunction, /messageId/);
  assert.match(relationshipManagementMigration, /create or replace function public\.manage_kwilt_agent_relationship/);
  assert.match(relationshipManagementMigration, /candidate\.status = 'active'/);
  assert.match(relationshipManagementMigration, /candidate\.user_id = p_user_id/);
  assert.match(relationshipManagementMigration, /for update/);
  assert.match(relationshipManagementMigration, /stale_relationship_record/);
  assert.match(relationshipManagementMigration, /p_action not in \('correct', 'forget'\)/);
  assert.match(relationshipManagementMigration, /p_record_type not in \('memory', 'event', 'cadence'\)/);
  assert.doesNotMatch(relationshipManagementMigration, /kwilt_phone_agent_people/);
  assert.match(relationshipManagementMigration, /kwilt_phone_agent_memory_items/);
  assert.match(relationshipManagementMigration, /kwilt_phone_agent_events/);
  assert.match(relationshipManagementMigration, /kwilt_phone_agent_cadences/);
  assert.match(relationshipManagementMigration, /insert into public\.kwilt_agent_proposals/);
  assert.match(relationshipManagementMigration, /insert into public\.kwilt_agent_proposal_operations/);
  assert.match(relationshipManagementMigration, /insert into public\.kwilt_agent_mutation_receipts/);
  assert.match(relationshipManagementMigration, /insert into public\.kwilt_phone_agent_action_log/);
  assert.match(relationshipManagementMigration, /v_idempotency_key/);
  assert.match(relationshipManagementMigration, /revoke all on function public\.manage_kwilt_agent_relationship[\s\S]+from public, anon, authenticated/);
  assert.match(relationshipManagementMigration, /grant execute on function public\.manage_kwilt_agent_relationship[\s\S]+to service_role/);
});

test('restores exact relationship corrections and forgotten records through their authoritative receipt', () => {
  assert.match(relationshipManagementMigration, /'restore_relationship_record'/);
  assert.match(relationshipManagementMigration, /create or replace function public\.undo_kwilt_agent_relationship/);
  assert.match(relationshipManagementMigration, /candidate\.user_id = p_user_id[\s\S]+candidate\.capability_id = 'relationships'/);
  assert.match(relationshipManagementMigration, /for update/);
  assert.match(relationshipManagementMigration, /stale_relationship_undo/);
  assert.match(relationshipManagementMigration, /update public\.kwilt_agent_mutation_receipts[\s\S]+status = 'undone'/);
  assert.match(relationshipManagementMigration, /update public\.kwilt_agent_proposals[\s\S]+status = 'undone'/);
  assert.match(relationshipManagementMigration, /revoke all on function public\.undo_kwilt_agent_relationship[\s\S]+from public, anon, authenticated/);
  assert.match(relationshipManagementMigration, /grant execute on function public\.undo_kwilt_agent_relationship[\s\S]+to service_role/);
  assert.match(relationshipMemoryFunction, /executeServerRelationshipUndo/);
  assert.match(relationshipMemoryFunction, /undo_kwilt_agent_relationship|body\.undo/);
});

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

test('keeps native handoffs durable, owner-scoped, and state-machine controlled', () => {
  assert.match(clientActionMigration, /create table public\.kwilt_agent_client_actions/);
  assert.match(clientActionMigration, /alter table public\.kwilt_agent_client_actions enable row level security/);
  assert.match(clientActionMigration, /kwilt_agent_client_actions_owner_select/);
  assert.match(clientActionMigration, /kwilt_agent_client_actions_owner_insert/);
  assert.doesNotMatch(clientActionMigration, /grant select, insert, update/);
  assert.match(clientActionMigration, /create or replace function public\.transition_kwilt_agent_client_action/);
  assert.match(clientActionMigration, /security definer/);
  assert.match(clientActionMigration, /candidate\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(clientActionMigration, /stale_client_action_version/);
  assert.match(clientActionMigration, /invalid_client_action_transition/);
  assert.match(clientActionMigration, /revoke all on function public\.transition_kwilt_agent_client_action[^;]+from public, anon/);
});

test('enqueues a cross-channel run atomically and idempotently under the authenticated owner', () => {
  assert.match(channelRunMigration, /add column origin_channel text not null default 'mobile'/);
  assert.match(channelRunMigration, /add column channel_context jsonb not null default '\{\}'::jsonb/);
  assert.match(channelRunMigration, /create or replace function public\.enqueue_kwilt_agent_run/);
  assert.match(channelRunMigration, /security definer/);
  assert.match(channelRunMigration, /when coalesce\(\(select auth\.jwt\(\) ->> 'role'\), ''\) = 'service_role' then p_user_id/);
  assert.match(channelRunMigration, /else \(select auth\.uid\(\)\)/);
  assert.match(channelRunMigration, /candidate\.client_request_id = p_client_request_id/);
  assert.match(channelRunMigration, /'replayed', true/);
  assert.match(channelRunMigration, /insert into public\.kwilt_agent_messages/);
  assert.match(channelRunMigration, /insert into public\.kwilt_agent_runs/);
  assert.match(channelRunMigration, /insert into public\.kwilt_agent_run_events/);
  assert.match(channelRunMigration, /revoke all on function public\.enqueue_kwilt_agent_run[^;]+from public, anon/);
  assert.match(channelRunMigration, /create or replace function public\.complete_kwilt_agent_run_with_message/);
  assert.match(channelRunMigration, /insert into public\.kwilt_agent_messages/);
  assert.match(channelRunMigration, /assistant_message_id = v_message\.id/);
  assert.match(channelRunMigration, /stale_run_version/);
  assert.match(channelRunMigration, /revoke all on function public\.complete_kwilt_agent_run_with_message[^;]+from public, anon/);
  assert.match(channelRunMigration, /when coalesce\(\(select auth\.jwt\(\) ->> 'role'\), ''\) = 'service_role' then p_user_id/);
  assert.match(channelRunMigration, /create or replace function public\.transition_kwilt_agent_channel_run/);
  assert.match(channelRunMigration, /invalid_channel_run_transition/);
  assert.match(channelRunMigration, /grant execute on function public\.transition_kwilt_agent_channel_run[^;]+to service_role/);
});

test('queues channel work idempotently and claims it with bounded crash recovery', () => {
  assert.match(channelJobMigration, /create table public\.kwilt_agent_channel_bindings/);
  assert.match(channelJobMigration, /create table public\.kwilt_agent_channel_jobs/);
  assert.match(channelJobMigration, /unique \(channel, phone_link_id, external_message_id\)/);
  assert.match(channelJobMigration, /alter table public\.kwilt_agent_channel_jobs enable row level security/);
  assert.match(channelJobMigration, /kwilt_agent_channel_jobs_owner_select/);
  assert.doesNotMatch(channelJobMigration, /grant (insert|update|delete)[^;]+to authenticated/);
  assert.match(channelJobMigration, /create or replace function public\.claim_kwilt_agent_channel_jobs/);
  assert.match(channelJobMigration, /for update skip locked/);
  assert.match(channelJobMigration, /attempts < 3/);
  assert.match(channelJobMigration, /worker_attempts_exhausted/);
  assert.match(channelJobMigration, /create or replace function public\.finish_kwilt_agent_channel_job/);
  assert.match(channelJobMigration, /invalid_channel_job_source_state/);
  assert.match(channelJobMigration, /channel_job_run_owner_mismatch/);
  assert.match(channelJobMigration, /create or replace function public\.retry_kwilt_agent_channel_job/);
  assert.match(channelJobMigration, /available_at = now\(\) \+ make_interval/);
  assert.match(channelJobMigration, /create or replace function public\.bind_kwilt_agent_channel_thread/);
  assert.match(channelJobMigration, /channel_binding_link_owner_mismatch/);
  assert.match(channelJobMigration, /channel_binding_thread_owner_mismatch/);
  assert.match(channelJobMigration, /outbound_message_ids text\[\]/);
  assert.match(channelJobMigration, /create or replace function public\.checkpoint_kwilt_agent_channel_response/);
  assert.match(channelJobMigration, /candidate\.status in \('complete', 'partial'\)/);
  assert.match(channelJobMigration, /create or replace function public\.record_kwilt_agent_channel_delivery_part/);
  assert.match(channelJobMigration, /cardinality\(v_job\.outbound_message_ids\) <> p_expected_part/);
  assert.match(channelJobMigration, /legacy_enrichment_at timestamptz/);
  assert.match(channelJobMigration, /create or replace function public\.enrich_kwilt_agent_channel_activity/);
  assert.match(channelJobMigration, /join public\.kwilt_agent_proposals proposal on proposal\.id = receipt\.proposal_id/);
  assert.match(channelJobMigration, /insert into public\.kwilt_phone_agent_memory_items/);
  assert.match(channelJobMigration, /insert into public\.kwilt_phone_agent_events/);
  assert.match(channelJobMigration, /insert into public\.kwilt_phone_agent_cadences/);
  assert.match(channelJobMigration, /if v_job\.legacy_enrichment_at is not null/);
  assert.match(channelJobMigration, /revoke all on function public\.enrich_kwilt_agent_channel_activity[^;]+from public, anon, authenticated/);
  assert.match(channelJobMigration, /if coalesce\(\(select auth\.jwt\(\) ->> 'role'\), ''\) <> 'service_role'/);
  assert.doesNotMatch(channelJobMigration, /auth\.role\(\)/);
  assert.match(channelJobMigration, /revoke all on function public\.claim_kwilt_agent_channel_jobs[^;]+from public, anon, authenticated/);
});

test('applies server Activity capture atomically with proposal operation and receipt evidence', () => {
  assert.match(serverActivityCaptureMigration, /create or replace function public\.capture_kwilt_agent_activity/);
  assert.match(serverActivityCaptureMigration, /candidate\.status = 'active'/);
  assert.match(serverActivityCaptureMigration, /insert into public\.kwilt_agent_proposals/);
  assert.match(serverActivityCaptureMigration, /insert into public\.kwilt_agent_proposal_operations/);
  assert.match(serverActivityCaptureMigration, /insert into public\.kwilt_activities/);
  assert.match(serverActivityCaptureMigration, /insert into public\.kwilt_agent_mutation_receipts/);
  assert.match(serverActivityCaptureMigration, /v_idempotency_key/);
  assert.match(serverActivityCaptureMigration, /undo_operation/);
  assert.match(serverActivityCaptureMigration, /revoke all on function public\.capture_kwilt_agent_activity[^;]+from public, anon, authenticated/);
  assert.match(serverActivityCaptureMigration, /grant execute on function public\.capture_kwilt_agent_activity[^;]+to service_role/);
});

test('stages cross-channel proposals atomically for the existing mobile capability executor', () => {
  assert.match(serverProposalStagingMigration, /create or replace function public\.stage_kwilt_agent_proposal/);
  assert.match(serverProposalStagingMigration, /security definer/);
  assert.match(serverProposalStagingMigration, /candidate\.user_id = p_user_id/);
  assert.match(serverProposalStagingMigration, /v_run\.status <> 'active'/);
  assert.match(serverProposalStagingMigration, /v_idempotency_key/);
  assert.match(serverProposalStagingMigration, /insert into public\.kwilt_agent_proposals/);
  assert.match(serverProposalStagingMigration, /insert into public\.kwilt_agent_proposal_operations/);
  assert.match(serverProposalStagingMigration, /insert into public\.kwilt_agent_run_events/);
  assert.match(serverProposalStagingMigration, /'requiresexplicitapproval', true/);
  assert.doesNotMatch(serverProposalStagingMigration, /insert into public\.kwilt_goals/);
  assert.doesNotMatch(serverProposalStagingMigration, /update public\.kwilt_goals/);
  assert.match(serverProposalStagingMigration, /revoke all on function public\.stage_kwilt_agent_proposal[\s\S]+from public, anon, authenticated/);
  assert.match(serverProposalStagingMigration, /grant execute on function public\.stage_kwilt_agent_proposal[\s\S]+to service_role/);
});

test('stages grouped Plan proposals atomically in one service-only transaction', () => {
  assert.match(serverProposalBatchMigration, /create or replace function public\.stage_kwilt_agent_proposal_batch/);
  assert.match(serverProposalBatchMigration, /jsonb_array_length\(p_proposals\)/);
  assert.match(serverProposalBatchMigration, /v_count < 2 or v_count > 10/);
  assert.match(serverProposalBatchMigration, /public\.stage_kwilt_agent_proposal\(/);
  assert.match(serverProposalBatchMigration, /p_call_id \|\| ':' \|\| v_index/);
  assert.match(serverProposalBatchMigration, /revoke all on function public\.stage_kwilt_agent_proposal_batch[\s\S]+from public, anon, authenticated/);
  assert.match(serverProposalBatchMigration, /grant execute on function public\.stage_kwilt_agent_proposal_batch[\s\S]+to service_role/);
});

test('keeps compliance commands deterministic while ordinary SMS enters the durable agent queue', () => {
  const stopBoundary = phoneSmsFunction.indexOf("if (command.kind === 'stop')");
  const queueBoundary = phoneSmsFunction.lastIndexOf('buildAgentChannelJobInsert');
  assert.ok(stopBoundary >= 0 && queueBoundary > stopBoundary);
  assert.match(phoneSmsFunction, /command\.kind === 'done'/);
  assert.match(phoneSmsFunction, /command\.kind === 'snooze'/);
  assert.match(phoneSmsFunction, /kwilt_agent_channel_jobs/);
  assert.match(phoneSmsFunction, /ignoreDuplicates: true/);
  assert.doesNotMatch(phoneSmsFunction.slice(queueBoundary), /from\('kwilt_activities'\)\.insert/);
  assert.match(channelTickFunction, /processAgentChannelJob/);
  assert.match(channelTickFunction, /executeCanonicalAgentRun/);
  assert.match(channelTickFunction, /createServiceAgentRunPersistence/);
});

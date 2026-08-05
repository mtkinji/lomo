import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260729024629_harden_friendships.sql', import.meta.url),
  'utf8',
).toLowerCase();
const acceptFunction = readFileSync(
  new URL('../supabase/functions/friend-invite-accept/index.ts', import.meta.url),
  'utf8',
);
const previewMigration = readFileSync(
  new URL('../supabase/migrations/20260805014856_harden_friend_invite_preview.sql', import.meta.url),
  'utf8',
).toLowerCase();
const previewFunction = readFileSync(
  new URL('../supabase/functions/friend-invite-preview/index.ts', import.meta.url),
  'utf8',
);
const createFunction = readFileSync(
  new URL('../supabase/functions/friend-invite-create/index.ts', import.meta.url),
  'utf8',
);

test('makes friendship a zero-access relationship with server-authorized writes', () => {
  assert.match(migration, /status in \('pending', 'active', 'ended', 'blocked'\)/);
  assert.match(migration, /create table public\.kwilt_friendship_audit_events/);
  assert.match(migration, /drop policy if exists "friends can read user feed events"/i);
  assert.match(
    migration,
    /revoke insert, update, delete on public\.kwilt_friendships from anon, authenticated/,
  );
  assert.match(migration, /create or replace function public\.transition_kwilt_friendship/);
  assert.match(migration, /create or replace function public\.accept_kwilt_friend_invite/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /p_action not in \('accept', 'decline', 'end', 'block'\)/);
  assert.match(migration, /candidate\.initiated_by = v_actor/);
  assert.match(migration, /insert into public\.kwilt_friendship_audit_events/);
  assert.match(
    migration,
    /grant execute on function public\.transition_kwilt_friendship\(uuid, text\) to authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.accept_kwilt_friend_invite\(text\) to authenticated/,
  );
});

test('keeps participants immutable and records distinct end and block state', () => {
  assert.match(migration, /kwilt_friendships_initiator_is_participant/);
  assert.match(migration, /add column if not exists blocked_by uuid/);
  assert.match(migration, /add column if not exists ended_at timestamptz/);
  assert.match(migration, /status = 'ended'/);
  assert.match(migration, /status = 'blocked'/);
  assert.match(migration, /blocked_by = v_actor/);
});

test('accepts a one-use Friend link atomically as the second party consent', () => {
  assert.match(migration, /for update/);
  assert.match(migration, /entity_type = 'friendship'/);
  assert.match(migration, /invite\.uses >= invite\.max_uses/);
  assert.match(migration, /inviter_id = v_actor/);
  assert.match(migration, /least\(inviter_id, v_actor\)/);
  assert.match(migration, /greatest\(inviter_id, v_actor\)/);
  assert.match(migration, /status = 'active'/);
  assert.match(migration, /uses = invite\.uses \+ 1/);
  assert.match(migration, /'friend_invite_accepted'/);
});

test('keeps the Friend accept Edge Function as an authenticated atomic RPC adapter', () => {
  assert.match(acceptFunction, /auth\.getUser\(\)/);
  assert.match(
    acceptFunction,
    /rpc\('accept_kwilt_friend_invite',\s*\{\s*p_code:\s*code\s*\}\)/,
  );
  assert.doesNotMatch(acceptFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(acceptFunction, /\.from\('kwilt_friendships'\)/);
  assert.doesNotMatch(acceptFunction, /invite\.uses \+ 1/);
  assert.doesNotMatch(acceptFunction, /status:\s*'pending'/);
});

test('repairs the Friend roster against the live auth identity source', () => {
  assert.match(previewMigration, /create or replace function public\.get_kwilt_friendships\(\)/);
  assert.match(previewMigration, /left join auth\.users/);
  assert.match(previewMigration, /raw_user_meta_data/);
  assert.doesNotMatch(previewMigration, /public\.profiles/);
});

test('rate-limits public Friend preview without storing raw install identity', () => {
  assert.match(previewMigration, /create table public\.kwilt_friend_invite_preview_budgets/);
  assert.match(previewMigration, /enable row level security/);
  assert.match(previewMigration, /revoke all on public\.kwilt_friend_invite_preview_budgets/);
  assert.match(previewMigration, /consume_kwilt_friend_invite_preview_budget/);
  assert.match(previewMigration, /grant execute .* to service_role/);
  assert.match(previewFunction, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(previewFunction, /consume_kwilt_friend_invite_preview_budget/);
  assert.doesNotMatch(previewFunction, /createdBy\s*:/);
});

test('previews inviter identity before acceptance without a profiles dependency', () => {
  assert.match(previewFunction, /entity_type/);
  assert.match(previewFunction, /friendship/);
  assert.match(previewFunction, /inviteState/);
  assert.match(previewFunction, /canAccept/);
  assert.match(createFunction, /user_metadata/);
  assert.doesNotMatch(createFunction, /\.from\('profiles'\)/);
});

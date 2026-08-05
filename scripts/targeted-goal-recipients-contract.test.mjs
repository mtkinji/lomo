import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260805015640_targeted_goal_recipients.sql', import.meta.url),
  'utf8',
).toLowerCase();
const createFunction = readFileSync(
  new URL('../supabase/functions/invite-create/index.ts', import.meta.url),
  'utf8',
);
const previewFunction = readFileSync(
  new URL('../supabase/functions/invite-preview/index.ts', import.meta.url),
  'utf8',
);
const acceptFunction = readFileSync(
  new URL('../supabase/functions/invite-accept/index.ts', import.meta.url),
  'utf8',
);
const redirectFunction = readFileSync(
  new URL('../supabase/functions/invite-redirect/index.ts', import.meta.url),
  'utf8',
);
const supabaseConfig = readFileSync(
  new URL('../supabase/config.toml', import.meta.url),
  'utf8',
);
const shareDrawer = readFileSync(
  new URL('../src/features/goals/ShareGoalDrawer.tsx', import.meta.url),
  'utf8',
);
const joinDrawer = readFileSync(
  new URL('../src/features/goals/JoinSharedGoalDrawerHost.tsx', import.meta.url),
  'utf8',
);
const createInviteMigration = migration.slice(
  migration.indexOf('create or replace function public.create_kwilt_targeted_goal_invite'),
  migration.indexOf('create or replace function public.respond_to_kwilt_targeted_goal_invite'),
);

test('adds an additive recipient-bound lifecycle without changing generic Goal invites', () => {
  assert.match(migration, /add column if not exists intended_recipient_user_id uuid/);
  assert.match(migration, /add column if not exists recipient_kind text/);
  assert.match(migration, /add column if not exists recipient_relationship_id uuid/);
  assert.match(migration, /add column if not exists recipient_state text/);
  assert.match(migration, /recipient_state in \('pending', 'accepted', 'declined', 'revoked'\)/);
  assert.match(migration, /intended_recipient_user_id is null/);
});

test('projects only eligible Friends and authenticated Household members', () => {
  assert.match(migration, /create or replace function public\.get_kwilt_goal_share_recipients\(\)/);
  assert.match(migration, /candidate\.status = 'active'/);
  assert.match(migration, /public\.kwilt_person_auth_bindings/);
  assert.match(migration, /binding\.status = 'active'/);
  assert.match(migration, /target_binding\.user_id <> v_actor/);
  assert.doesNotMatch(migration, /returns table \([^)]*recipient_user_id/s);
});

test('uses the live auth identity source without depending on a profiles table', () => {
  assert.doesNotMatch(migration, /public\.profiles/);
  assert.match(migration, /auth\.users/);
  assert.match(migration, /raw_user_meta_data/);
});

test('resolves a selected relationship server-side and creates one pending invitation', () => {
  assert.match(migration, /create or replace function public\.create_kwilt_targeted_goal_invite/);
  assert.match(migration, /p_recipient_kind not in \('friend', 'household'\)/);
  assert.match(migration, /candidate\.id = p_relationship_id/);
  assert.match(migration, /candidate\.status = 'active'/);
  assert.match(migration, /target_membership\.id = p_relationship_id/);
  assert.match(migration, /target_binding\.status = 'active'/);
  assert.match(migration, /intended_recipient_user_id/);
  assert.match(migration, /recipient_state/);
  assert.match(migration, /'pending'/);
  assert.match(migration, /max_uses/);
});

test('accepts only as the intended account in one locked transaction', () => {
  assert.match(migration, /create or replace function public\.respond_to_kwilt_targeted_goal_invite/);
  assert.match(migration, /for update/);
  assert.match(migration, /invite\.intended_recipient_user_id <> v_actor/);
  assert.match(migration, /p_action not in \('accept', 'decline'\)/);
  assert.match(migration, /on conflict \(entity_type, entity_id, user_id\)/);
  assert.match(migration, /recipient_state = 'accepted'/);
  assert.match(migration, /recipient_state = 'declined'/);
  assert.match(migration, /uses = 1/);
});

test('keeps privileged commands narrow and explicitly granted', () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /revoke all on function public\.get_kwilt_goal_share_recipients\(\) from public, anon/);
  assert.match(migration, /grant execute on function public\.get_kwilt_goal_share_recipients\(\) to authenticated/);
  assert.match(migration, /grant execute on function public\.create_kwilt_targeted_goal_invite/);
  assert.match(migration, /grant execute on function public\.respond_to_kwilt_targeted_goal_invite/);
});

test('schema-qualifies extension functions under the empty search path', () => {
  assert.match(createInviteMigration, /extensions\.gen_random_bytes\(9\)/);
  assert.doesNotMatch(createInviteMigration, /(?<!extensions\.)gen_random_bytes\(9\)/);
});

test('Edge adapters route targeted creation and acceptance through authenticated RPCs', () => {
  assert.match(createFunction, /create_kwilt_targeted_goal_invite/);
  assert.match(acceptFunction, /respond_to_kwilt_targeted_goal_invite/);
  assert.match(acceptFunction, /p_action:\s*'accept'/);
});

test('pins the deployed gateway authentication contract for sharing functions', () => {
  for (const functionName of [
    'invite-create',
    'invite-preview',
    'invite-accept',
    'invite-redirect',
    'friend-invite-create',
    'friend-invite-preview',
  ]) {
    assert.match(
      supabaseConfig,
      new RegExp(`\\[functions\\.${functionName}\\]\\n(?:#[^\\n]*\\n)*verify_jwt = false`),
    );
  }
});

test('targeted previews require the intended authenticated account before private reads', () => {
  assert.match(previewFunction, /intended_recipient_user_id/);
  assert.match(previewFunction, /requireBearerToken/);
  assert.match(previewFunction, /auth\.getUser/);
  assert.match(previewFunction, /invite_unavailable/);
});

test('projects pending and active Goal access in both Sharing directions', () => {
  assert.match(migration, /create or replace function public\.get_kwilt_goal_sharing\(\)/);
  assert.match(migration, /'by_you'::text/);
  assert.match(migration, /'with_you'::text/);
  assert.match(migration, /'pending'::text/);
  assert.match(migration, /'expired'::text/);
  assert.match(migration, /'active'::text/);
  assert.match(migration, /invite\.intended_recipient_user_id = v_actor/);
  assert.match(migration, /membership\.user_id = v_actor/);
});

test('lets only the creator revoke a still-pending targeted invitation', () => {
  assert.match(migration, /create or replace function public\.revoke_kwilt_targeted_goal_invite/);
  assert.match(migration, /invite\.created_by <> v_actor/);
  assert.match(migration, /invite\.recipient_state <> 'pending'/);
  assert.match(migration, /recipient_state = 'revoked'/);
  assert.match(migration, /grant execute on function public\.revoke_kwilt_targeted_goal_invite/);
});

test('does not leak a targeted Goal title or image through public rich-link metadata', () => {
  assert.match(redirectFunction, /intended_recipient_user_id/);
  assert.match(redirectFunction, /targeted/);
  assert.match(redirectFunction, /Private Goal invitation/);
  assert.match(redirectFunction, /if \(!targeted\)/);
});

test('does not elevate a co-owner while creating a targeted invitation', () => {
  assert.doesNotMatch(createInviteMigration, /membership\.role in \('owner', 'co_owner'\)/);
  assert.doesNotMatch(createInviteMigration, /do update set\s+role = 'owner'/);
});

test('distinguishes an invalid session from the wrong intended account', () => {
  assert.match(previewFunction, /if \(userErr \|\| !userData\?\.user\)/);
  assert.match(previewFunction, /userData\.user\.id !== intendedRecipientUserId/);
});

test('keeps Sharing and invite-decision analytics free of Goal identifiers', () => {
  const sources = [shareDrawer, joinDrawer];
  for (const source of sources) {
    const captures = source.match(/capture\(AnalyticsEvent\.(?:Share|JoinGoal)[\s\S]*?\);/g) ?? [];
    for (const capture of captures) {
      assert.doesNotMatch(capture, /\bgoalId\b/);
    }
  }
});

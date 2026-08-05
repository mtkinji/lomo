import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const gamesMigration = read('supabase/migrations/20260805032257_preview_open_game_table.sql').toLowerCase();
const webReply = read('supabase/functions/share-web-reply/index.ts');
const webCheer = read('supabase/functions/share-web-cheer/index.ts');
const config = read('supabase/config.toml');

test('Games invitation previews authenticate and disclose only table context', () => {
  assert.match(gamesMigration, /create or replace function public\.preview_open_game_table/);
  assert.match(gamesMigration, /auth\.uid\(\)/);
  assert.match(gamesMigration, /set search_path = ''/);
  assert.match(gamesMigration, /extensions\.digest/);
  assert.match(gamesMigration, /game_key text/);
  assert.match(gamesMigration, /host_display_name text/);
  assert.match(gamesMigration, /invite_state text/);
  assert.doesNotMatch(gamesMigration, /auth\.users/);
  assert.match(gamesMigration, /revoke all on function public\.preview_open_game_table\(text, text\) from public, anon/);
});

test('Games rematches are host-only and preserve the existing table participants', () => {
  assert.match(gamesMigration, /create or replace function public\.restart_open_game_table/);
  assert.match(gamesMigration, /host_user_id = v_user/);
  assert.match(gamesMigration, /status <> 'completed'/);
  assert.match(gamesMigration, /from public\.game_participants/);
  assert.match(gamesMigration, /status = 'lobby'/);
  assert.match(gamesMigration, /grant execute on function public\.restart_open_game_table\(uuid\) to authenticated/);
});

test('anonymous Goal web responses reject recipient-bound invitations', () => {
  for (const source of [webReply, webCheer]) {
    assert.match(source, /intended_recipient_user_id/);
    assert.match(source, /webGoalSupportInviteIsEligible/);
    assert.match(source, /sign_in_required/);
  }
});

test('public Goal response endpoints bypass the gateway JWT check and validate their invite tokens', () => {
  assert.match(config, /\[functions\.share-web-cheer\]\s+verify_jwt = false/);
  assert.match(config, /\[functions\.share-web-reply\]\s+verify_jwt = false/);
});

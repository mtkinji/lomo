import { readFileSync } from 'node:fs';
import path from 'node:path';

const sql = readFileSync(path.resolve(
  __dirname,
  '../../../migrations/20260827181938_conversational_action_handoffs.sql',
), 'utf8');

describe('conversational action receipt and handoff migration contract', () => {
  test('keeps both ledgers owner-scoped and idempotent', () => {
    for (const table of [
      'kwilt_conversational_action_receipts',
      'kwilt_conversational_action_handoffs',
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`on public.${table} for select to authenticated`);
    }
    expect(sql.match(/unique \(actor_id, operation_id, request_id\)/g)).toHaveLength(2);
    expect(sql).toContain('(select auth.uid()) = actor_id');
    expect(sql).toContain('public.kwilt_is_active_household_member(household_id)');
    expect(sql).not.toContain('user_metadata');
  });

  test('bounds handoff transitions with ownership and optimistic version checks', () => {
    expect(sql).toContain("p_from_state = 'created' and p_to_state in ('claimed', 'cancelled', 'expired')");
    expect(sql).toContain("p_from_state = 'claimed' and p_to_state in ('completed', 'cancelled', 'expired')");
    expect(sql).toContain("raise exception 'handoff_version_conflict'");
    expect(sql).toContain("raise exception 'handoff_transition_invalid'");
    expect(sql).toContain("raise exception 'handoff_identity_immutable'");
    expect(sql).toContain("raise exception 'handoff_version_increment_required'");
    expect(sql).toContain('before update on public.kwilt_conversational_action_handoffs');
    expect(sql).toContain('security invoker');
  });

  test('persists redacted arguments and stable references, not secret-bearing columns', () => {
    expect(sql).toContain('redacted_arguments jsonb not null');
    expect(sql).toContain("result_refs jsonb not null default '[]'::jsonb");
    for (const forbiddenColumn of [
      'oauth_token ', 'access_token ', 'refresh_token ', 'credential ',
      'screen_time_token ', 'photo_bytes ', 'image_bytes ',
    ]) expect(sql.toLowerCase()).not.toContain(forbiddenColumn);
  });
});

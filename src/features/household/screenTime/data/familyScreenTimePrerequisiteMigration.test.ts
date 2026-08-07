import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Family Screen Time prerequisite agreement migration', () => {
  const migration = readFileSync(resolve(
    process.cwd(),
    'supabase/migrations/20260806012026_family_screen_time_prerequisite_activity.sql',
  ), 'utf8').toLowerCase();

  it('creates one atomic authorized and versioned prerequisite agreement RPC', () => {
    expect(migration).toContain('create or replace function public.create_kwilt_family_screen_time_prerequisite_agreement');
    expect(migration).toContain('kwilt_family_screen_time_caregiver_for_child');
    expect(migration).toContain('p_expected_policy_version');
    expect(migration).toContain("raise exception 'family_screen_time_version_mismatch'");
    expect(migration).toContain("raise exception 'selection_subject_mismatch'");
    expect(migration).toContain('desired_policy_version = desired_policy_version + 1');
    expect(migration).toContain("operation_kind, operation_id, result");
  });

  it('validates the bounded daily prerequisite shape without storing usage history', () => {
    expect(migration).toContain("prerequisiteactivity");
    expect(migration).toContain("thresholdminutes");
    expect(migration).toContain("'daily'");
    expect(migration).toContain("raise exception 'invalid_family_screen_time_prerequisite_rule'");
    expect(migration).not.toContain('usage_history');
    expect(migration).not.toContain('application_token');
  });

  it('exposes only the RPC to authenticated clients', () => {
    expect(migration).toContain(
      'revoke execute on function public.create_kwilt_family_screen_time_prerequisite_agreement(uuid, uuid, uuid, bigint, jsonb, text) from public, anon;',
    );
    expect(migration).toContain(
      'grant execute on function public.create_kwilt_family_screen_time_prerequisite_agreement(uuid, uuid, uuid, bigint, jsonb, text) to authenticated;',
    );
  });
});

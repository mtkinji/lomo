import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260730152735_family_screen_time_control_plane.sql',
);

describe('Family Screen Time control-plane migration', () => {
  const migration = readFileSync(migrationPath, 'utf8').toLowerCase();

  const tables = [
    'kwilt_family_screen_time_subjects',
    'kwilt_family_screen_time_selections',
    'kwilt_family_screen_time_agreements',
    'kwilt_family_screen_time_overrides',
    'kwilt_family_screen_time_access_requests',
    'kwilt_family_screen_time_devices',
    'kwilt_family_screen_time_device_receipts',
    'kwilt_family_screen_time_operations',
  ];

  it('models child policy, saved selections, standing agreements, overrides, and request provenance separately', () => {
    for (const table of tables) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }

    expect(migration).toContain('unique (household_id, child_membership_id)');
    expect(migration).toContain('desired_policy_version');
    expect(migration).toContain("check (action in ('block', 'allow'))");
    expect(migration).toContain("check (time_basis in ('wall_clock', 'foreground_usage'))");
    expect(migration).toContain("check (provenance in ('caregiver_direct', 'child_request_approved'))");
    expect(migration).toContain("check (status in ('pending', 'approved', 'denied', 'cancelled', 'expired'))");
    expect(migration).not.toContain('kwilt_family_screen_time_exceptions');
  });

  it('keeps Apple tokens off the server and stores only an opaque native selection reference', () => {
    expect(migration).toContain('selection_ref uuid not null');
    expect(migration).not.toContain('application_token');
    expect(migration).not.toContain('category_token');
    expect(migration).not.toContain('web_domain_token');
  });

  it('uses child policy versions and durable idempotency for caregiver mutations', () => {
    expect(migration).toContain('p_expected_version');
    expect(migration).toContain('p_operation_id');
    expect(migration).toContain("raise exception 'family_screen_time_version_mismatch'");
    expect(migration).toContain('unique (operation_id)');
    expect(migration).toContain('desired_policy_version = desired_policy_version + 1');
  });

  it('makes a multi-child temporary override one atomic validated operation', () => {
    expect(migration).toContain('apply_kwilt_family_screen_time_override_batch');
    expect(migration).toContain('jsonb_array_elements(p_items)');
    expect(migration).toContain("raise exception 'duplicate_child_in_override_batch'");
    expect(migration).toContain("raise exception 'selection_subject_mismatch'");
    expect(migration).toContain("raise exception 'mixed_household_override_batch'");
    expect(migration).toContain("raise exception 'foreground_usage_not_yet_supported'");
  });

  it('authorizes every RPC against the exact child and Screen Time grant', () => {
    for (const rpc of [
      'get_kwilt_family_screen_time_snapshot',
      'save_kwilt_family_screen_time_selection',
      'set_kwilt_family_screen_time_agreement',
      'apply_kwilt_family_screen_time_override_batch',
      'cancel_kwilt_family_screen_time_override',
      'decide_kwilt_family_screen_time_access_request',
      'record_kwilt_family_screen_time_device_receipt',
    ]) {
      expect(migration).toContain(`create or replace function public.${rpc}`);
      expect(migration).toMatch(new RegExp(
        `create or replace function public\\.${rpc}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      ));
      expect(migration).toMatch(new RegExp(
        `revoke execute on function public\\.${rpc}\\([^;]*from public, anon;`,
      ));
    }

    expect(migration).toContain("raise exception 'household_caregiver_required'");
    expect(migration).toContain("raise exception 'capability_grant_required'");
    expect(migration).toContain("g.capability_id = 'screen-time'");
    expect(migration).toContain("a.capability_id = 'screen-time'");
    expect(migration).toContain('binding.user_id = auth.uid()');
  });

  it('keeps desired policy saves distinct from child-device application', () => {
    expect(migration).toContain('kwilt_family_screen_time_device_receipts');
    expect(migration).toContain("check (outcome in ('received', 'applied', 'failed', 'expired', 'released'))");
    expect(migration).not.toContain('set applied_policy_version = desired_policy_version');
  });

  it('blocks direct app-client mutation of every control-plane table', () => {
    for (const table of tables) {
      expect(migration).toContain(`revoke all on public.${table} from anon, authenticated`);
    }
  });
});

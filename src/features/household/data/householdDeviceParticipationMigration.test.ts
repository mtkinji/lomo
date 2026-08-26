import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260826201117_household_device_participation.sql',
), 'utf8').toLowerCase();
const sixDigitMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260826203033_six_digit_household_device_codes.sql',
), 'utf8').toLowerCase();
const revokedCredentialMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260826204906_allow_revoked_personal_device_without_credential.sql',
), 'utf8').toLowerCase();
const accessEnforcementMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260826212100_enforce_household_device_access.sql',
), 'utf8').toLowerCase();

describe('Household device participation migration', () => {
  it('keeps personal setup sessions, devices, and shared-member access distinct', () => {
    for (const table of [
      'kwilt_household_device_setup_sessions',
      'kwilt_household_devices',
      'kwilt_household_device_member_access',
      'kwilt_household_device_setup_attempts',
    ]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated`);
    }
    expect(migration).toContain("check (device_kind in ('personal_child', 'shared_household'))");
    expect(migration).toContain('personal_child_requires_child');
    expect(migration).toContain('shared_household_requires_caregiver');
  });

  it('exposes only organizer-authorized device commands to app sessions', () => {
    for (const rpc of [
      'list_kwilt_household_devices',
      'create_kwilt_household_device_setup_session',
      'cancel_kwilt_household_device_setup_session',
      'designate_kwilt_shared_household_device',
      'set_kwilt_shared_household_device_members',
      'revoke_kwilt_household_device',
    ]) {
      expect(migration).toContain(`create or replace function public.${rpc}`);
      expect(migration).toMatch(new RegExp(
        `create or replace function public\\.${rpc}[\\s\\s]*?security definer[\\s\\s]*?set search_path = ''`
          .replaceAll('\\s\\s', '\\s\\S'),
      ));
    }
    expect(migration).toContain("raise exception 'household_device_manager_required'");
  });

  it('keeps token claims private and independent from a child auth binding', () => {
    expect(migration).toContain('create or replace function public.kwilt_preview_household_device_setup');
    expect(migration).toContain('create or replace function public.kwilt_claim_household_device_setup');
    expect(migration).toContain('grant execute on function public.kwilt_claim_household_device_setup');
    expect(migration).toContain('to service_role');
    expect(migration).not.toContain('child_jwt');
    expect(migration).not.toContain('claimed_by_user_id');
    expect(migration).toContain("status = 'issued'");
    expect(migration).toContain('expires_at > now()');
    expect(migration).toContain('for update');
    expect(migration).toContain('kwilt_consume_household_device_setup_attempt');
    expect(migration).toContain("raise exception 'household_device_setup_rate_limited'");
  });

  it('stores only secret and credential hashes and audits lifecycle changes', () => {
    expect(migration).toContain('secret_hash text not null unique');
    expect(migration).toContain('manual_code_hash text not null unique');
    expect(migration).toContain('credential_hash text');
    for (const event of [
      'household_device_setup_issued',
      'household_device_setup_cancelled',
      'household_device_claimed',
      'shared_household_device_designated',
      'shared_household_device_members_changed',
      'household_device_revoked',
    ]) expect(migration).toContain(`'${event}'`);
  });

  it('replaces the manual fallback with a cryptographically generated six-digit code', () => {
    expect(sixDigitMigration).toContain('create or replace function public.create_kwilt_household_device_setup_session');
    expect(sixDigitMigration).toContain('extensions.gen_random_bytes(4)');
    expect(sixDigitMigration).toContain('% 1000000');
    expect(sixDigitMigration).toContain('lpad(');
    expect(sixDigitMigration).toContain("where status = 'issued'");
    expect(sixDigitMigration).toContain('grant execute on function public.create_kwilt_household_device_setup_session(uuid) to authenticated');
  });

  it('allows revocation to remove a personal-device credential without weakening active devices', () => {
    expect(revokedCredentialMigration).toContain('drop constraint personal_child_requires_child');
    expect(revokedCredentialMigration).toContain('status = \'revoked\' and credential_hash is null');
    expect(revokedCredentialMigration).toContain('status <> \'revoked\' and credential_hash is not null');
  });

  it('serializes manual-code attempts and resolves only active exact-device credentials', () => {
    expect(accessEnforcementMigration).toContain('pg_advisory_xact_lock');
    expect(accessEnforcementMigration).toContain('create or replace function public.kwilt_resolve_managed_child_access');
    expect(accessEnforcementMigration).toContain("d.status = 'ready'");
    expect(accessEnforcementMigration).toContain('d.install_id = p_install_id');
    expect(accessEnforcementMigration).toContain('d.credential_hash = p_credential_hash');
    expect(accessEnforcementMigration).toContain('grant execute on function public.kwilt_resolve_managed_child_access');
    expect(accessEnforcementMigration).toContain('to service_role');
  });
});

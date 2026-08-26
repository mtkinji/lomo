import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260730042845_household_child_account_invites.sql',
);

describe('Household child account invitation migration', () => {
  const migration = readFileSync(migrationPath, 'utf8');

  it('allows explicit caregiver and child invitation roles', () => {
    expect(migration).toContain("check (invited_role in ('caregiver', 'child'))");
    expect(migration).toContain("raise exception 'invalid_household_invite_role'");
    expect(migration).toContain('v_invite.invited_role');
  });

  it('exposes narrow creation, preview, and acceptance commands', () => {
    for (const rpc of [
      'create_kwilt_household_member_invite',
      'preview_kwilt_household_invite',
      'accept_kwilt_household_member_invite',
    ]) {
      expect(migration).toContain(`create or replace function public.${rpc}`);
      expect(migration).toMatch(new RegExp(
        `create or replace function public\\.${rpc}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      ));
      expect(migration).toMatch(new RegExp(
        `revoke execute on function public\\.${rpc}\\([^;]*from public, anon;`,
      ));
      expect(migration).toMatch(new RegExp(
        `grant execute on function public\\.${rpc}\\([^;]*to authenticated;`,
      ));
    }
  });

  it('binds a targeted email without exposing account existence', () => {
    expect(migration).toContain("raise exception 'invite_email_mismatch'");
    expect(migration).toContain('lower(auth_user.email) <> v_invite.invited_email');
    expect(migration).toContain("encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')");
    expect(migration).not.toContain('select email from auth.users');
  });

  it('locks one pending invitation and records role-specific audit events', () => {
    expect(migration).toContain('for update');
    expect(migration).toContain("'child_invited'");
    expect(migration).toContain("'child_joined'");
    expect(migration).toContain("'caregiver_invited'");
    expect(migration).toContain("'caregiver_joined'");
    expect(migration).toContain("status = 'accepted'");
  });

  it('keeps legacy caregiver RPCs as compatibility wrappers', () => {
    expect(migration).toContain('create or replace function public.create_kwilt_household_invite');
    expect(migration).toContain("'caregiver'");
    expect(migration).toContain('create or replace function public.accept_kwilt_household_invite');
  });
});

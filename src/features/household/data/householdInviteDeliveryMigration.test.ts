import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260830205220_household_invite_delivery_recovery.sql',
);

describe('Household invitation delivery and recovery migration', () => {
  const migration = readFileSync(migrationPath, 'utf8');

  it('uses one readable eight-character bootstrap code', () => {
    expect(migration).toContain("v_code_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'");
    expect(migration).toContain('for v_index in 1..8 loop');
    expect(migration).toContain("regexp_replace(upper(trim(p_code)), '[-[:space:]]', '', 'g')");
  });

  it('recovers the existing pending email-bound invitation instead of duplicating it', () => {
    expect(migration).toContain('create unique index kwilt_household_invites_one_pending_email_role');
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain("'recovered', v_recovered");
    expect(migration).toContain("status = 'revoked'");
  });

  it('lets the exact authenticated email discover and explicitly accept its pending invite', () => {
    for (const rpc of [
      'get_kwilt_pending_household_invitation_for_me',
      'accept_kwilt_pending_household_invitation_for_me',
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
    expect(migration).toContain('lower(auth_user.email) = invitation.invited_email');
    expect(migration).toContain('where id = p_invitation_id');
    expect(migration).toContain('for update');
  });
});

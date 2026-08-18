import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260818152351_household_member_avatars.sql',
), 'utf8').toLowerCase();

describe('Household member avatar migration', () => {
  it('creates private bounded image storage and separate account/dependent references', () => {
    expect(migration).toContain("values ('household-avatars', 'household-avatars', false, 5242880");
    expect(migration).toContain("array['image/jpeg', 'image/png', 'image/webp']");
    expect(migration).toContain('create table public.kwilt_account_avatars');
    expect(migration).toContain('create table public.kwilt_avatar_upload_intents');
    expect(migration).toContain('user_id uuid primary key references auth.users(id) on delete cascade');
    expect(migration).toContain('add column managed_avatar_storage_path text');
  });

  it('does not expose avatar references or writes directly to app roles', () => {
    expect(migration).toContain('revoke all on public.kwilt_account_avatars from anon, authenticated');
    expect(migration).toContain('revoke select on public.kwilt_people from authenticated');
    expect(migration).toContain('grant select (id, display_name, kind, created_by_user_id, created_at, updated_at)');
    expect(migration).not.toContain('grant select on public.kwilt_account_avatars to authenticated');
    expect(migration).toContain('revoke all on public.kwilt_avatar_upload_intents from anon, authenticated');
  });

  it('defines server-only authority and account-first resolution functions', () => {
    for (const functionName of [
      'kwilt_avatar_upload_authority',
      'kwilt_confirm_avatar_upload',
      'kwilt_remove_avatar',
      'kwilt_resolve_household_avatars',
      'kwilt_resolve_self_avatar',
    ]) {
      expect(migration).toContain(`create or replace function public.${functionName}`);
      expect(migration).toMatch(new RegExp(
        `create or replace function public\\.${functionName}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      ));
    }

    expect(migration).toContain("when account_avatar.storage_path is not null then 'account'");
    expect(migration).toContain("when person.managed_avatar_storage_path is not null then 'dependent'");
    expect(migration).toContain("else 'initials'");
    expect(migration).toContain("raise exception 'household_owner_required'");
    expect(migration).toContain("raise exception 'connected_account_photo_owned_by_member'");
  });

  it('revokes public execution and grants only the authenticated broker contract', () => {
    expect(migration).toContain('revoke execute on function public.kwilt_avatar_upload_authority(uuid, text, uuid) from public, anon, authenticated');
    expect(migration).toContain('revoke execute on function public.kwilt_confirm_avatar_upload(uuid, text, uuid, text) from public, anon, authenticated');
    expect(migration).toContain('revoke execute on function public.kwilt_remove_avatar(uuid, text, uuid) from public, anon, authenticated');
    expect(migration).toContain('revoke execute on function public.kwilt_resolve_household_avatars(uuid) from public, anon, authenticated');
    expect(migration).toContain('revoke execute on function public.kwilt_resolve_self_avatar(uuid) from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.kwilt_confirm_avatar_upload(uuid, text, uuid, text) to service_role');
  });
});

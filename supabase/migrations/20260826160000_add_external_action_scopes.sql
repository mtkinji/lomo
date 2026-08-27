-- Replace broad connector grants with capability-and-effect OAuth scopes.
-- Existing broad grants remain recognizable only as a time-bounded Life
-- compatibility policy; they never imply Household, Money, or Food access.

alter table public.kwilt_external_oauth_authorization_codes
  add column if not exists scope_policy_version smallint null,
  add column if not exists legacy_scope_expires_at timestamptz null;

alter table public.kwilt_external_oauth_tokens
  add column if not exists scope_policy_version smallint null,
  add column if not exists legacy_scope_expires_at timestamptz null;

update public.kwilt_external_oauth_authorization_codes
   set scope = coalesce(scope, 'read'),
       scope_policy_version = 1,
       legacy_scope_expires_at = '2026-11-30T00:00:00.000Z'::timestamptz
 where scope is null or scope in ('read', 'write', 'read write');

update public.kwilt_external_oauth_tokens
   set scope = coalesce(scope, 'read'),
       scope_policy_version = 1,
       legacy_scope_expires_at = '2026-11-30T00:00:00.000Z'::timestamptz
 where scope is null or scope in ('read', 'write', 'read write');

update public.kwilt_external_oauth_authorization_codes
   set scope_policy_version = 2
 where scope_policy_version is null;

update public.kwilt_external_oauth_tokens
   set scope_policy_version = 2
 where scope_policy_version is null;

alter table public.kwilt_external_oauth_authorization_codes
  alter column scope set not null,
  alter column scope_policy_version set default 2,
  alter column scope_policy_version set not null;

alter table public.kwilt_external_oauth_tokens
  alter column scope set not null,
  alter column scope_policy_version set default 2,
  alter column scope_policy_version set not null;

alter table public.kwilt_external_oauth_authorization_codes
  add constraint kwilt_external_oauth_codes_scope_policy_check check (
    (
      scope_policy_version = 1
      and scope in ('read', 'write', 'read write')
      and legacy_scope_expires_at = '2026-11-30T00:00:00.000Z'::timestamptz
    ) or (
      scope_policy_version = 2
      and legacy_scope_expires_at is null
      and regexp_split_to_array(btrim(scope), '\s+') <@ array[
        'life.read', 'life.write', 'household.read', 'household.write',
        'money.read', 'money.write', 'food.read', 'food.write'
      ]::text[]
    )
  );

alter table public.kwilt_external_oauth_tokens
  add constraint kwilt_external_oauth_tokens_scope_policy_check check (
    (
      scope_policy_version = 1
      and scope in ('read', 'write', 'read write')
      and legacy_scope_expires_at = '2026-11-30T00:00:00.000Z'::timestamptz
    ) or (
      scope_policy_version = 2
      and legacy_scope_expires_at is null
      and regexp_split_to_array(btrim(scope), '\s+') <@ array[
        'life.read', 'life.write', 'household.read', 'household.write',
        'money.read', 'money.write', 'food.read', 'food.write'
      ]::text[]
    )
  );

comment on column public.kwilt_external_oauth_tokens.scope_policy_version is
  '1 is the expiring read/write compatibility policy; 2 is capability-scoped OAuth.';

comment on column public.kwilt_external_oauth_tokens.legacy_scope_expires_at is
  'Hard removal timestamp for legacy broad-scope compatibility; never extends access to new capabilities.';

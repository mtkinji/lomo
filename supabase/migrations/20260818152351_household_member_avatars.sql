-- Private account and Household-dependent avatars.
-- Object access is brokered by the household-avatars Edge Function. App roles
-- never receive storage references or direct mutation authority.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('household-avatars', 'household-avatars', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.kwilt_account_avatars (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage_path text not null unique
    check (storage_path ~ '^account/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  updated_at timestamptz not null default now()
);

alter table public.kwilt_account_avatars enable row level security;
revoke all on public.kwilt_account_avatars from anon, authenticated;

alter table public.kwilt_people
  add column managed_avatar_storage_path text unique
    check (
      managed_avatar_storage_path is null
      or managed_avatar_storage_path ~ '^dependent/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    );

-- The original table grant included every future column. Replace it with the
-- original public projection so the private storage reference is not exposed.
revoke select on public.kwilt_people from authenticated;
grant select (id, display_name, kind, created_by_user_id, created_at, updated_at)
  on public.kwilt_people to authenticated;

create table public.kwilt_avatar_deletion_queue (
  storage_path text primary key,
  reason text not null check (reason in ('replaced', 'removed', 'member_removed', 'account_deleted')),
  queued_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz
);

alter table public.kwilt_avatar_deletion_queue enable row level security;
revoke all on public.kwilt_avatar_deletion_queue from anon, authenticated;

create table public.kwilt_avatar_upload_intents (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('account', 'dependent')),
  target_membership_id uuid references public.kwilt_household_memberships(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'discarded')),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  check (
    (source = 'account' and target_membership_id is null)
    or (source = 'dependent' and target_membership_id is not null)
  )
);

alter table public.kwilt_avatar_upload_intents enable row level security;
revoke all on public.kwilt_avatar_upload_intents from anon, authenticated;

create or replace function public.kwilt_require_avatar_actor(p_actor_user_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from auth.users actor
    where actor.id = p_actor_user_id
      and coalesce(actor.is_anonymous, false) = false
  ) then
    raise exception 'authentication_required';
  end if;
  return p_actor_user_id;
end;
$$;

create or replace function public.kwilt_avatar_upload_authority(
  p_actor_user_id uuid,
  p_source text,
  p_membership_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := public.kwilt_require_avatar_actor(p_actor_user_id);
  v_subject public.kwilt_household_memberships;
  v_actor public.kwilt_household_memberships;
  v_person public.kwilt_people;
  v_previous_path text;
begin
  if p_source = 'account' then
    if p_membership_id is not null then raise exception 'invalid_avatar_target'; end if;
    select avatar.storage_path into v_previous_path
    from public.kwilt_account_avatars avatar
    where avatar.user_id = v_actor_user_id;
    return jsonb_build_object(
      'source', 'account',
      'targetId', v_actor_user_id,
      'previousStoragePath', v_previous_path
    );
  end if;

  if p_source <> 'dependent' or p_membership_id is null then
    raise exception 'invalid_avatar_target';
  end if;

  select membership.* into v_subject
  from public.kwilt_household_memberships membership
  where membership.id = p_membership_id and membership.status = 'active';
  if v_subject.id is null or v_subject.role <> 'child' then
    raise exception 'household_member_not_found';
  end if;

  select membership.* into v_actor
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding
    on binding.person_id = membership.person_id and binding.status = 'active'
  where binding.user_id = v_actor_user_id
    and membership.household_id = v_subject.household_id
    and membership.status = 'active'
  limit 1;
  if v_actor.id is null or v_actor.role <> 'owner' then
    raise exception 'household_owner_required';
  end if;

  if exists (
    select 1 from public.kwilt_person_auth_bindings binding
    where binding.person_id = v_subject.person_id and binding.status = 'active'
  ) then
    raise exception 'connected_account_photo_owned_by_member';
  end if;

  select person.* into v_person from public.kwilt_people person where person.id = v_subject.person_id;
  return jsonb_build_object(
    'source', 'dependent',
    'targetId', v_subject.person_id,
    'membershipId', v_subject.id,
    'previousStoragePath', v_person.managed_avatar_storage_path
  );
end;
$$;

create or replace function public.kwilt_confirm_avatar_upload(
  p_actor_user_id uuid,
  p_source text,
  p_membership_id uuid,
  p_storage_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
  v_previous_path text;
  v_target_id uuid;
begin
  v_authority := public.kwilt_avatar_upload_authority(
    p_actor_user_id,
    p_source,
    p_membership_id
  );
  v_previous_path := nullif(v_authority->>'previousStoragePath', '');
  v_target_id := (v_authority->>'targetId')::uuid;

  if p_source = 'account' then
    if p_storage_path !~ '^account/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
      raise exception 'invalid_avatar_storage_path';
    end if;
    insert into public.kwilt_account_avatars (user_id, storage_path, updated_at)
    values (v_target_id, p_storage_path, now())
    on conflict (user_id) do update
      set storage_path = excluded.storage_path, updated_at = excluded.updated_at;
  else
    if p_storage_path !~ '^dependent/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
      raise exception 'invalid_avatar_storage_path';
    end if;
    update public.kwilt_people
    set managed_avatar_storage_path = p_storage_path, updated_at = now()
    where id = v_target_id;
  end if;

  if v_previous_path is not null and v_previous_path <> p_storage_path then
    insert into public.kwilt_avatar_deletion_queue (storage_path, reason)
    values (v_previous_path, 'replaced')
    on conflict (storage_path) do nothing;
  end if;

  return jsonb_build_object(
    'source', p_source,
    'storagePath', p_storage_path,
    'previousStoragePath', v_previous_path,
    'membershipId', p_membership_id
  );
end;
$$;

create or replace function public.kwilt_remove_avatar(
  p_actor_user_id uuid,
  p_source text,
  p_membership_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority jsonb;
  v_previous_path text;
  v_target_id uuid;
begin
  v_authority := public.kwilt_avatar_upload_authority(
    p_actor_user_id,
    p_source,
    p_membership_id
  );
  v_previous_path := nullif(v_authority->>'previousStoragePath', '');
  v_target_id := (v_authority->>'targetId')::uuid;

  if p_source = 'account' then
    delete from public.kwilt_account_avatars where user_id = v_target_id;
  else
    update public.kwilt_people
    set managed_avatar_storage_path = null, updated_at = now()
    where id = v_target_id;
  end if;

  if v_previous_path is not null then
    insert into public.kwilt_avatar_deletion_queue (storage_path, reason)
    values (v_previous_path, 'removed')
    on conflict (storage_path) do nothing;
  end if;

  return jsonb_build_object(
    'source', 'initials',
    'previousStoragePath', v_previous_path,
    'membershipId', p_membership_id
  );
end;
$$;

create or replace function public.kwilt_resolve_self_avatar(p_actor_user_id uuid)
returns table(avatar_source text, storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when account_avatar.storage_path is not null then 'account' else 'initials' end as avatar_source,
    account_avatar.storage_path
  from (select public.kwilt_require_avatar_actor(p_actor_user_id)) actor
  left join public.kwilt_account_avatars account_avatar
    on account_avatar.user_id = p_actor_user_id
$$;

create or replace function public.kwilt_resolve_household_avatars(p_actor_user_id uuid)
returns table(membership_id uuid, avatar_source text, storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  with actor_membership as (
    select membership.household_id
    from public.kwilt_household_memberships membership
    join public.kwilt_person_auth_bindings binding
      on binding.person_id = membership.person_id and binding.status = 'active'
    where binding.user_id = public.kwilt_require_avatar_actor(p_actor_user_id)
      and membership.status = 'active'
    order by membership.joined_at
    limit 1
  )
  select
    membership.id,
    case
      when account_avatar.storage_path is not null then 'account'
      when person.managed_avatar_storage_path is not null then 'dependent'
      else 'initials'
    end as avatar_source,
    coalesce(account_avatar.storage_path, person.managed_avatar_storage_path) as storage_path
  from actor_membership actor
  join public.kwilt_household_memberships membership
    on membership.household_id = actor.household_id and membership.status = 'active'
  join public.kwilt_people person on person.id = membership.person_id
  left join public.kwilt_person_auth_bindings binding
    on binding.person_id = person.id and binding.status = 'active'
  left join public.kwilt_account_avatars account_avatar
    on account_avatar.user_id = binding.user_id
  order by membership.joined_at
$$;

-- Preserve the released member-removal API while queuing private managed media
-- for idempotent service cleanup.
create or replace function public.remove_kwilt_household_member(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_subject public.kwilt_household_memberships;
  v_owner public.kwilt_household_memberships;
  v_managed_path text;
begin
  select * into v_subject from public.kwilt_household_memberships where id = p_membership_id and status = 'active';
  if v_subject.id is null then raise exception 'household_member_not_found'; end if;
  select * into v_owner from public.kwilt_current_household_membership(v_subject.household_id);
  if v_owner.id is null or v_owner.role <> 'owner' then raise exception 'household_owner_required'; end if;
  if v_subject.role = 'owner' then raise exception 'owner_cannot_be_removed'; end if;
  select managed_avatar_storage_path into v_managed_path
  from public.kwilt_people where id = v_subject.person_id;
  update public.kwilt_child_capability_activations
    set state = case when capability_id = 'screen-time' and state <> 'inactive' then 'pending_cleanup' else 'inactive' end,
        changed_by_membership_id = v_owner.id, changed_at = now()
    where child_membership_id = v_subject.id;
  delete from public.kwilt_household_capability_grants
    where caregiver_membership_id = v_subject.id or child_membership_id = v_subject.id;
  update public.kwilt_household_memberships set status = 'removed', removed_at = now() where id = v_subject.id;
  if v_managed_path is not null then
    update public.kwilt_people set managed_avatar_storage_path = null, updated_at = now()
    where id = v_subject.person_id;
    insert into public.kwilt_avatar_deletion_queue (storage_path, reason)
    values (v_managed_path, 'member_removed')
    on conflict (storage_path) do nothing;
  end if;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (v_subject.household_id, v_owner.id, 'member_removed', v_subject.id);
  return public.get_kwilt_household_snapshot();
end;
$$;

revoke execute on function public.kwilt_require_avatar_actor(uuid) from public, anon, authenticated;
revoke execute on function public.kwilt_avatar_upload_authority(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.kwilt_confirm_avatar_upload(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.kwilt_remove_avatar(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.kwilt_resolve_household_avatars(uuid) from public, anon, authenticated;
revoke execute on function public.kwilt_resolve_self_avatar(uuid) from public, anon, authenticated;

grant execute on function public.kwilt_require_avatar_actor(uuid) to service_role;
grant execute on function public.kwilt_avatar_upload_authority(uuid, text, uuid) to service_role;
grant execute on function public.kwilt_confirm_avatar_upload(uuid, text, uuid, text) to service_role;
grant execute on function public.kwilt_remove_avatar(uuid, text, uuid) to service_role;
grant execute on function public.kwilt_resolve_household_avatars(uuid) to service_role;
grant execute on function public.kwilt_resolve_self_avatar(uuid) to service_role;

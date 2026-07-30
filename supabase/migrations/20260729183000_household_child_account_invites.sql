-- Connect an existing authenticated Kwilt account to a Household as either a
-- caregiver or child. Delivery transports only bootstrap this invitation;
-- accepting while authenticated creates the durable membership.

alter table public.kwilt_household_invites
  drop constraint if exists kwilt_household_invites_invited_role_check;

alter table public.kwilt_household_invites
  add constraint kwilt_household_invites_invited_role_check
  check (invited_role in ('caregiver', 'child'));

create or replace function public.create_kwilt_household_member_invite(
  p_household_id uuid,
  p_invited_role text,
  p_invited_email text default null,
  p_owner_display_name text default 'Kwilter'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner public.kwilt_household_memberships;
  v_role text := lower(trim(coalesce(p_invited_role, '')));
  v_code text := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  v_invite_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  perform public.kwilt_require_permanent_user();
  if v_role not in ('caregiver', 'child') then
    raise exception 'invalid_household_invite_role';
  end if;

  v_owner := public.kwilt_ensure_household_owner(p_household_id, p_owner_display_name);
  insert into public.kwilt_household_invites
    (household_id, invited_role, code_hash, invited_email, created_by_membership_id, expires_at)
  values (
    v_owner.household_id,
    v_role,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    nullif(lower(trim(p_invited_email)), ''),
    v_owner.id,
    v_expires_at
  )
  returning id into v_invite_id;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, details)
  values (
    v_owner.household_id,
    v_owner.id,
    case when v_role = 'child' then 'child_invited' else 'caregiver_invited' end,
    jsonb_build_object('inviteId', v_invite_id)
  );

  return jsonb_build_object(
    'code', v_code,
    'expiresAt', v_expires_at,
    'role', v_role
  );
end;
$$;

create or replace function public.preview_kwilt_household_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_invite public.kwilt_household_invites;
  v_household public.kwilt_households;
  v_inviter_name text;
  auth_user auth.users%rowtype;
begin
  select * into v_invite
  from public.kwilt_household_invites
  where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    and status = 'pending'
    and expires_at > now();
  if v_invite.id is null then
    raise exception 'invite_not_found_or_expired';
  end if;

  if v_invite.invited_email is not null then
    select * into auth_user from auth.users where id = v_user_id;
    if auth_user.email is null or lower(auth_user.email) <> v_invite.invited_email then
      raise exception 'invite_email_mismatch';
    end if;
  end if;

  select * into v_household from public.kwilt_households where id = v_invite.household_id;
  select person.display_name into v_inviter_name
  from public.kwilt_household_memberships membership
  join public.kwilt_people person on person.id = membership.person_id
  where membership.id = v_invite.created_by_membership_id;

  return jsonb_build_object(
    'householdName', v_household.name,
    'inviterDisplayName', coalesce(v_inviter_name, 'A family organizer'),
    'role', v_invite.invited_role,
    'expiresAt', v_invite.expires_at
  );
end;
$$;

create or replace function public.accept_kwilt_household_member_invite(
  p_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_invite public.kwilt_household_invites;
  v_person_id uuid;
  v_membership public.kwilt_household_memberships;
  auth_user auth.users%rowtype;
begin
  select * into v_invite
  from public.kwilt_household_invites
  where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    and status = 'pending'
    and expires_at > now()
  for update;
  if v_invite.id is null then
    raise exception 'invite_not_found_or_expired';
  end if;

  if v_invite.invited_email is not null then
    select * into auth_user from auth.users where id = v_user_id;
    if auth_user.email is null or lower(auth_user.email) <> v_invite.invited_email then
      raise exception 'invite_email_mismatch';
    end if;
  end if;

  if exists (
    select 1
    from public.kwilt_person_auth_bindings existing_binding
    join public.kwilt_household_memberships existing_membership
      on existing_membership.person_id = existing_binding.person_id
     and existing_membership.status = 'active'
    where existing_binding.user_id = v_user_id
      and existing_binding.status = 'active'
  ) then
    raise exception 'already_in_household';
  end if;

  select person_id into v_person_id
  from public.kwilt_person_auth_bindings
  where user_id = v_user_id and status = 'active';

  if v_person_id is null then
    insert into public.kwilt_people (display_name, kind, created_by_user_id)
    values (
      coalesce(
        nullif(trim(p_display_name), ''),
        case when v_invite.invited_role = 'child' then 'Child' else 'Caregiver' end
      ),
      case when v_invite.invited_role = 'child' then 'dependent' else 'adult' end,
      v_user_id
    )
    returning id into v_person_id;

    insert into public.kwilt_person_auth_bindings (person_id, user_id)
    values (v_person_id, v_user_id);
  end if;

  insert into public.kwilt_household_memberships (household_id, person_id, role)
  values (v_invite.household_id, v_person_id, v_invite.invited_role)
  returning * into v_membership;

  update public.kwilt_household_invites
  set status = 'accepted',
      accepted_by_membership_id = v_membership.id,
      accepted_at = now()
  where id = v_invite.id;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (
    v_invite.household_id,
    v_membership.id,
    case when v_invite.invited_role = 'child' then 'child_joined' else 'caregiver_joined' end,
    v_membership.id
  );

  return public.get_kwilt_household_snapshot();
end;
$$;

create or replace function public.create_kwilt_household_invite(
  p_household_id uuid,
  p_invited_email text default null,
  p_owner_display_name text default 'Kwilter'
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.create_kwilt_household_member_invite(
    p_household_id,
    'caregiver',
    p_invited_email,
    p_owner_display_name
  )
$$;

create or replace function public.accept_kwilt_household_invite(
  p_code text,
  p_display_name text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.accept_kwilt_household_member_invite(p_code, p_display_name)
$$;

revoke execute on function public.create_kwilt_household_member_invite(uuid, text, text, text) from public, anon;
revoke execute on function public.preview_kwilt_household_invite(text) from public, anon;
revoke execute on function public.accept_kwilt_household_member_invite(text, text) from public, anon;
revoke execute on function public.create_kwilt_household_invite(uuid, text, text) from public, anon;
revoke execute on function public.accept_kwilt_household_invite(text, text) from public, anon;

grant execute on function public.create_kwilt_household_member_invite(uuid, text, text, text) to authenticated;
grant execute on function public.preview_kwilt_household_invite(text) to authenticated;
grant execute on function public.accept_kwilt_household_member_invite(text, text) to authenticated;
grant execute on function public.create_kwilt_household_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_kwilt_household_invite(text, text) to authenticated;

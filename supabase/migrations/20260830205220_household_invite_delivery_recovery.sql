-- Recover an email-bound Household invitation as one durable pending intent.
-- The short code and QR are bootstrap transports; authenticated review and
-- explicit acceptance remain the authority boundary.

with ranked as (
  select id,
         row_number() over (
           partition by household_id, invited_role, lower(invited_email)
           order by created_at desc, id desc
         ) as position
  from public.kwilt_household_invites
  where status = 'pending' and invited_email is not null
)
update public.kwilt_household_invites invitation
set status = 'revoked'
from ranked
where invitation.id = ranked.id and ranked.position > 1;

create unique index kwilt_household_invites_one_pending_email_role
  on public.kwilt_household_invites (household_id, invited_role, lower(invited_email))
  where status = 'pending' and invited_email is not null;

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
  v_email text := nullif(lower(trim(p_invited_email)), '');
  v_code_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text;
  v_index integer;
  v_invite_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
  v_recovered boolean := false;
begin
  perform public.kwilt_require_permanent_user();
  if v_role not in ('caregiver', 'child') then
    raise exception 'invalid_household_invite_role';
  end if;

  v_owner := public.kwilt_ensure_household_owner(p_household_id, p_owner_display_name);
  if v_email is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_owner.household_id::text || ':' || v_role || ':' || v_email, 0)
    );
  end if;

  loop
    v_code := '';
    for v_index in 1..8 loop
      v_code := v_code || substr(
        v_code_alphabet,
        (get_byte(extensions.gen_random_bytes(1), 0) % length(v_code_alphabet)) + 1,
        1
      );
    end loop;
    exit when not exists (
      select 1 from public.kwilt_household_invites
      where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
    );
  end loop;

  if v_email is not null then
    select id into v_invite_id
    from public.kwilt_household_invites
    where household_id = v_owner.household_id
      and invited_role = v_role
      and invited_email = v_email
      and status = 'pending'
    order by created_at desc
    limit 1
    for update skip locked;
  end if;

  if v_invite_id is not null then
    v_recovered := true;
    update public.kwilt_household_invites
    set code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex'),
        expires_at = v_expires_at,
        created_by_membership_id = v_owner.id
    where id = v_invite_id;
  else
    insert into public.kwilt_household_invites
      (household_id, invited_role, code_hash, invited_email, created_by_membership_id, expires_at)
    values (
      v_owner.household_id,
      v_role,
      encode(extensions.digest(v_code, 'sha256'), 'hex'),
      v_email,
      v_owner.id,
      v_expires_at
    )
    returning id into v_invite_id;
  end if;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, details)
  values (
    v_owner.household_id,
    v_owner.id,
    case when v_role = 'child' then 'child_invited' else 'caregiver_invited' end,
    jsonb_build_object('inviteId', v_invite_id, 'recovered', v_recovered)
  );

  return jsonb_build_object(
    'code', v_code,
    'expiresAt', v_expires_at,
    'role', v_role,
    'recovered', v_recovered
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
  v_code text := regexp_replace(upper(trim(p_code)), '[-[:space:]]', '', 'g');
  invitation public.kwilt_household_invites;
  household public.kwilt_households;
  inviter_name text;
  auth_user auth.users%rowtype;
begin
  select * into invitation
  from public.kwilt_household_invites
  where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
    and status = 'pending' and expires_at > now();
  if invitation.id is null then raise exception 'invite_not_found_or_expired'; end if;

  if invitation.invited_email is not null then
    select * into auth_user from auth.users where id = v_user_id;
    if auth_user.email is null or auth_user.email_confirmed_at is null
      or lower(auth_user.email) <> invitation.invited_email then
      raise exception 'invite_email_mismatch';
    end if;
  end if;

  select * into household from public.kwilt_households where id = invitation.household_id;
  select person.display_name into inviter_name
  from public.kwilt_household_memberships membership
  join public.kwilt_people person on person.id = membership.person_id
  where membership.id = invitation.created_by_membership_id;

  return jsonb_build_object(
    'invitationId', invitation.id,
    'householdName', household.name,
    'inviterDisplayName', coalesce(inviter_name, 'A family organizer'),
    'role', invitation.invited_role,
    'expiresAt', invitation.expires_at
  );
end;
$$;

create or replace function public.get_kwilt_pending_household_invitation_for_me()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  auth_user auth.users%rowtype;
  invitation public.kwilt_household_invites;
  household public.kwilt_households;
  inviter_name text;
begin
  select * into auth_user from auth.users where id = v_user_id;
  if auth_user.email is null or auth_user.email_confirmed_at is null then return null; end if;

  select * into invitation
  from public.kwilt_household_invites
  where status = 'pending'
    and expires_at > now()
    and lower(auth_user.email) = invitation.invited_email
  order by created_at desc
  limit 1;
  if invitation.id is null then return null; end if;

  select * into household from public.kwilt_households where id = invitation.household_id;
  select person.display_name into inviter_name
  from public.kwilt_household_memberships membership
  join public.kwilt_people person on person.id = membership.person_id
  where membership.id = invitation.created_by_membership_id;

  return jsonb_build_object(
    'invitationId', invitation.id,
    'householdName', household.name,
    'inviterDisplayName', coalesce(inviter_name, 'A family organizer'),
    'role', invitation.invited_role,
    'expiresAt', invitation.expires_at
  );
end;
$$;

create or replace function public.accept_kwilt_pending_household_invitation_for_me(
  p_invitation_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  invitation public.kwilt_household_invites;
  v_person_id uuid;
  membership public.kwilt_household_memberships;
  auth_user auth.users%rowtype;
begin
  select * into invitation
  from public.kwilt_household_invites
  where id = p_invitation_id and status = 'pending' and expires_at > now()
  for update;
  if invitation.id is null or invitation.invited_email is null then
    raise exception 'invite_not_found_or_expired';
  end if;

  select * into auth_user from auth.users where id = v_user_id;
  if auth_user.email is null or auth_user.email_confirmed_at is null
    or lower(auth_user.email) <> invitation.invited_email then
    raise exception 'invite_email_mismatch';
  end if;

  if exists (
    select 1 from public.kwilt_person_auth_bindings binding
    join public.kwilt_household_memberships existing
      on existing.person_id = binding.person_id and existing.status = 'active'
    where binding.user_id = v_user_id and binding.status = 'active'
  ) then raise exception 'already_in_household'; end if;

  select person_id into v_person_id
  from public.kwilt_person_auth_bindings
  where user_id = v_user_id and status = 'active';

  if v_person_id is null then
    insert into public.kwilt_people (display_name, kind, created_by_user_id)
    values (
      coalesce(nullif(trim(p_display_name), ''),
        case when invitation.invited_role = 'child' then 'Child' else 'Caregiver' end),
      case when invitation.invited_role = 'child' then 'dependent' else 'adult' end,
      v_user_id
    ) returning id into v_person_id;
    insert into public.kwilt_person_auth_bindings (person_id, user_id)
    values (v_person_id, v_user_id);
  end if;

  insert into public.kwilt_household_memberships (household_id, person_id, role)
  values (invitation.household_id, v_person_id, invitation.invited_role)
  returning * into membership;

  update public.kwilt_household_invites
  set status = 'accepted', accepted_by_membership_id = membership.id, accepted_at = now()
  where id = invitation.id;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (
    invitation.household_id,
    membership.id,
    case when invitation.invited_role = 'child' then 'child_joined' else 'caregiver_joined' end,
    membership.id
  );
  return public.get_kwilt_household_snapshot();
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
  v_code text := regexp_replace(upper(trim(p_code)), '[-[:space:]]', '', 'g');
  invitation public.kwilt_household_invites;
  v_person_id uuid;
  membership public.kwilt_household_memberships;
  auth_user auth.users%rowtype;
begin
  select * into invitation
  from public.kwilt_household_invites
  where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
    and status = 'pending' and expires_at > now()
  for update;
  if invitation.id is null then raise exception 'invite_not_found_or_expired'; end if;

  if invitation.invited_email is not null then
    select * into auth_user from auth.users where id = v_user_id;
    if auth_user.email is null or auth_user.email_confirmed_at is null
      or lower(auth_user.email) <> invitation.invited_email then
      raise exception 'invite_email_mismatch';
    end if;
  end if;

  if exists (
    select 1 from public.kwilt_person_auth_bindings binding
    join public.kwilt_household_memberships existing
      on existing.person_id = binding.person_id and existing.status = 'active'
    where binding.user_id = v_user_id and binding.status = 'active'
  ) then raise exception 'already_in_household'; end if;

  select person_id into v_person_id
  from public.kwilt_person_auth_bindings
  where user_id = v_user_id and status = 'active';

  if v_person_id is null then
    insert into public.kwilt_people (display_name, kind, created_by_user_id)
    values (
      coalesce(nullif(trim(p_display_name), ''),
        case when invitation.invited_role = 'child' then 'Child' else 'Caregiver' end),
      case when invitation.invited_role = 'child' then 'dependent' else 'adult' end,
      v_user_id
    ) returning id into v_person_id;
    insert into public.kwilt_person_auth_bindings (person_id, user_id)
    values (v_person_id, v_user_id);
  end if;

  insert into public.kwilt_household_memberships (household_id, person_id, role)
  values (invitation.household_id, v_person_id, invitation.invited_role)
  returning * into membership;

  update public.kwilt_household_invites
  set status = 'accepted', accepted_by_membership_id = membership.id, accepted_at = now()
  where id = invitation.id;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (
    invitation.household_id,
    membership.id,
    case when invitation.invited_role = 'child' then 'child_joined' else 'caregiver_joined' end,
    membership.id
  );
  return public.get_kwilt_household_snapshot();
end;
$$;

revoke execute on function public.get_kwilt_pending_household_invitation_for_me() from public, anon;
revoke execute on function public.accept_kwilt_pending_household_invitation_for_me(uuid, text) from public, anon;
grant execute on function public.get_kwilt_pending_household_invitation_for_me() to authenticated;
grant execute on function public.accept_kwilt_pending_household_invitation_for_me(uuid, text) to authenticated;

comment on function public.get_kwilt_pending_household_invitation_for_me() is
  'Returns a bounded preview of the newest pending Household invitation matching the caller verified email.';
comment on function public.accept_kwilt_pending_household_invitation_for_me(uuid, text) is
  'Explicitly accepts an email-bound Household invitation after rechecking the authenticated caller email.';

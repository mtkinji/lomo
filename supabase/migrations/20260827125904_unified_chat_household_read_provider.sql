-- Service-only Household read projection for OAuth MCP and other durable agent channels.
-- The caller supplies the user id already established by the external token boundary;
-- the function re-applies the same membership and capability-grant rules as native RLS.

create or replace function public.get_kwilt_agent_household_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
begin
  if p_user_id is null then
    raise exception 'authentication_required';
  end if;

  select membership.* into v_actor
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding
    on binding.person_id = membership.person_id
   and binding.status = 'active'
  where binding.user_id = p_user_id
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if v_actor.id is null then
    return jsonb_build_object(
      'household', null,
      'currentMembershipId', null,
      'members', '[]'::jsonb,
      'activations', '[]'::jsonb,
      'grants', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'household', (
      select jsonb_build_object('id', household.id, 'name', household.name)
      from public.kwilt_households household
      where household.id = v_actor.household_id
    ),
    'currentMembershipId', v_actor.id,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', membership.id,
        'personId', person.id,
        'displayName', person.display_name,
        'kind', person.kind,
        'role', membership.role
      ) order by membership.joined_at)
      from public.kwilt_household_memberships membership
      join public.kwilt_people person on person.id = membership.person_id
      where membership.household_id = v_actor.household_id
        and membership.status = 'active'
    ), '[]'::jsonb),
    'activations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'childMembershipId', activation.child_membership_id,
        'capabilityId', activation.capability_id,
        'state', activation.state
      ))
      from public.kwilt_child_capability_activations activation
      where activation.household_id = v_actor.household_id
        and (
          v_actor.role = 'owner'
          or v_actor.id = activation.child_membership_id
          or exists (
            select 1
            from public.kwilt_household_capability_grants grant_row
            where grant_row.household_id = activation.household_id
              and grant_row.caregiver_membership_id = v_actor.id
              and grant_row.child_membership_id = activation.child_membership_id
              and grant_row.capability_id = activation.capability_id
          )
        )
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'caregiverMembershipId', grant_row.caregiver_membership_id,
        'childMembershipId', grant_row.child_membership_id,
        'capabilityId', grant_row.capability_id
      ))
      from public.kwilt_household_capability_grants grant_row
      where grant_row.household_id = v_actor.household_id
        and (
          v_actor.role = 'owner'
          or v_actor.id = grant_row.caregiver_membership_id
          or v_actor.id = grant_row.child_membership_id
        )
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.preview_kwilt_agent_household_invite(
  p_user_id uuid,
  p_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_invite public.kwilt_household_invites;
  v_household public.kwilt_households;
  v_inviter_name text;
  auth_user auth.users%rowtype;
begin
  if p_user_id is null then
    raise exception 'authentication_required';
  end if;
  if length(trim(coalesce(p_code, ''))) not between 1 and 200 then
    raise exception 'invalid_household_invitation_code';
  end if;

  select * into v_invite
  from public.kwilt_household_invites invite
  where invite.code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    and invite.status = 'pending'
    and invite.expires_at > now();
  if v_invite.id is null then
    raise exception 'invite_not_found_or_expired';
  end if;

  if v_invite.invited_email is not null then
    select * into auth_user from auth.users user_row where user_row.id = p_user_id;
    if auth_user.email is null or lower(auth_user.email) <> v_invite.invited_email then
      raise exception 'invite_email_mismatch';
    end if;
  end if;

  select * into v_household
  from public.kwilt_households household
  where household.id = v_invite.household_id;

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

revoke all on function public.get_kwilt_agent_household_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_kwilt_agent_household_snapshot(uuid) to service_role;

revoke all on function public.preview_kwilt_agent_household_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.preview_kwilt_agent_household_invite(uuid, text) to service_role;

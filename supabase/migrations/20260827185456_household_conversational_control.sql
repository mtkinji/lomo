-- Exact, actor-authorized Household member and device controls shared by native
-- chat and service-owned channels. Revoked/removed rows remain as audit history.

alter table public.kwilt_household_memberships
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_kwilt_household_memberships_updated_at
  on public.kwilt_household_memberships;
create trigger set_kwilt_household_memberships_updated_at
before update on public.kwilt_household_memberships
for each row execute function public.set_updated_at();

create or replace function public.kwilt_agent_household_actor(p_user_id uuid)
returns public.kwilt_household_memberships
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
begin
  if p_user_id is null then raise exception 'authentication_required'; end if;
  select membership.* into v_actor
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding
    on binding.person_id = membership.person_id and binding.status = 'active'
  where binding.user_id = p_user_id and membership.status = 'active'
  order by membership.joined_at
  limit 1;
  if v_actor.id is null then raise exception 'household_membership_required'; end if;
  return v_actor;
end;
$$;

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
  begin
    v_actor := public.kwilt_agent_household_actor(p_user_id);
  exception when others then
    if sqlerrm in ('authentication_required', 'household_membership_required') then
      return jsonb_build_object('household', null, 'currentMembershipId', null,
        'members', '[]'::jsonb, 'activations', '[]'::jsonb, 'grants', '[]'::jsonb);
    end if;
    raise;
  end;

  return jsonb_build_object(
    'household', (select jsonb_build_object('id', h.id, 'name', h.name)
      from public.kwilt_households h where h.id = v_actor.household_id),
    'currentMembershipId', v_actor.id,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'personId', p.id, 'displayName', p.display_name,
        'kind', p.kind, 'role', m.role,
        'updatedAt', greatest(m.updated_at, p.updated_at)
      ) order by m.joined_at)
      from public.kwilt_household_memberships m
      join public.kwilt_people p on p.id = m.person_id
      where m.household_id = v_actor.household_id and m.status = 'active'
    ), '[]'::jsonb),
    'activations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'childMembershipId', a.child_membership_id,
        'capabilityId', a.capability_id, 'state', a.state
      ))
      from public.kwilt_child_capability_activations a
      where a.household_id = v_actor.household_id and (
        v_actor.role = 'owner' or v_actor.id = a.child_membership_id or exists (
          select 1 from public.kwilt_household_capability_grants g
          where g.household_id = a.household_id
            and g.caregiver_membership_id = v_actor.id
            and g.child_membership_id = a.child_membership_id
            and g.capability_id = a.capability_id
        )
      )
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'caregiverMembershipId', g.caregiver_membership_id,
        'childMembershipId', g.child_membership_id,
        'capabilityId', g.capability_id
      ))
      from public.kwilt_household_capability_grants g
      where g.household_id = v_actor.household_id and (
        v_actor.role = 'owner' or v_actor.id = g.caregiver_membership_id
          or v_actor.id = g.child_membership_id
      )
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_kwilt_household_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.get_kwilt_agent_household_snapshot(public.kwilt_require_permanent_user());
end;
$$;

create or replace function public.kwilt_household_device_json(p_device_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id, 'householdId', d.household_id, 'kind', d.device_kind,
    'childMembershipId', d.child_membership_id,
    'assignedCaregiverMembershipId', d.assigned_caregiver_membership_id,
    'installId', d.install_id, 'label', d.label, 'platform', d.platform,
    'status', d.status, 'updatedAt', d.updated_at,
    'memberIds', coalesce((
      select jsonb_agg(a.child_membership_id order by a.created_at)
      from public.kwilt_household_device_member_access a where a.device_id = d.id
    ), '[]'::jsonb)
  )
  from public.kwilt_household_devices d where d.id = p_device_id
$$;

create or replace function public.kwilt_list_household_devices_for_actor(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(p_user_id);
begin
  if v_actor.role not in ('owner', 'caregiver') then
    raise exception 'household_device_manager_required';
  end if;
  return coalesce((
    select jsonb_agg(public.kwilt_household_device_json(d.id) order by d.created_at)
    from public.kwilt_household_devices d where d.household_id = v_actor.household_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_kwilt_household_devices(p_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(v_user_id);
begin
  if v_actor.household_id <> p_household_id then raise exception 'wrong_household'; end if;
  return public.kwilt_list_household_devices_for_actor(v_user_id);
end;
$$;

create or replace function public.list_kwilt_agent_household_devices(p_user_id uuid, p_household_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(p_user_id);
begin
  if v_actor.household_id <> p_household_id then raise exception 'wrong_household'; end if;
  return public.kwilt_list_household_devices_for_actor(p_user_id);
end;
$$;

create or replace function public.kwilt_update_household_member_for_actor(
  p_user_id uuid, p_household_id uuid,
  p_membership_id uuid,
  p_expected_updated_at timestamptz,
  p_display_name text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(p_user_id);
  v_target public.kwilt_household_memberships;
  v_person public.kwilt_people;
begin
  if v_actor.household_id <> p_household_id then raise exception 'wrong_household'; end if;
  select * into v_target from public.kwilt_household_memberships
  where id = p_membership_id and status = 'active' for update;
  if v_target.id is null or v_target.household_id <> v_actor.household_id then
    raise exception 'household_member_not_found';
  end if;
  select * into v_person from public.kwilt_people where id = v_target.person_id for update;
  if greatest(v_target.updated_at, v_person.updated_at) <> p_expected_updated_at then
    raise exception 'stale_household_member';
  end if;
  if not (
    (v_actor.id = v_target.id and v_actor.role in ('owner', 'caregiver'))
    or (v_actor.role = 'owner' and v_target.role <> 'owner')
    or (v_actor.role = 'caregiver' and v_target.role = 'child')
  ) then raise exception 'household_member_manager_required'; end if;
  if p_role is not null and (
    v_actor.role <> 'owner' or v_target.role = 'owner' or p_role not in ('caregiver', 'child')
  ) then raise exception 'household_owner_required'; end if;
  if p_display_name is null and p_role is null then raise exception 'empty_household_member_patch'; end if;
  if p_display_name is not null then
    if length(trim(p_display_name)) not between 1 and 80 then raise exception 'invalid_household_member_name'; end if;
    update public.kwilt_people set display_name = trim(p_display_name), updated_at = now()
    where id = v_target.person_id;
  end if;
  if p_role is not null then
    update public.kwilt_household_memberships set role = p_role where id = v_target.id;
  end if;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_actor.household_id, v_actor.id, 'household_member_updated', v_target.id,
    jsonb_strip_nulls(jsonb_build_object('displayNameChanged', p_display_name is not null, 'role', p_role)));
  return public.get_kwilt_agent_household_snapshot(p_user_id);
end;
$$;

create or replace function public.update_kwilt_household_member(
  p_membership_id uuid, p_expected_updated_at timestamptz,
  p_display_name text default null, p_role text default null
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_update_household_member_for_actor(
    public.kwilt_require_permanent_user(),
    (public.kwilt_agent_household_actor(public.kwilt_require_permanent_user())).household_id,
    p_membership_id, p_expected_updated_at,
    p_display_name, p_role)
$$;

create or replace function public.update_kwilt_agent_household_member(
  p_user_id uuid, p_household_id uuid, p_membership_id uuid, p_expected_updated_at timestamptz,
  p_display_name text default null, p_role text default null
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_update_household_member_for_actor(
    p_user_id, p_household_id, p_membership_id, p_expected_updated_at, p_display_name, p_role)
$$;

create or replace function public.kwilt_preview_household_member_removal_for_actor(
  p_user_id uuid, p_household_id uuid, p_membership_id uuid, p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(p_user_id);
  v_target public.kwilt_household_memberships;
  v_person public.kwilt_people;
begin
  if v_actor.household_id <> p_household_id then raise exception 'wrong_household'; end if;
  select * into v_target from public.kwilt_household_memberships
  where id = p_membership_id and status = 'active';
  if v_target.id is null or v_target.household_id <> v_actor.household_id then
    raise exception 'household_member_not_found';
  end if;
  if v_actor.role <> 'owner' or v_target.role = 'owner' then raise exception 'household_owner_required'; end if;
  select * into v_person from public.kwilt_people where id = v_target.person_id;
  if greatest(v_target.updated_at, v_person.updated_at) <> p_expected_updated_at then
    raise exception 'stale_household_member';
  end if;
  return jsonb_build_object(
    'membershipId', v_target.id, 'expectedUpdatedAt', p_expected_updated_at,
    'displayName', v_person.display_name,
    'capabilityGrants', (select count(*) from public.kwilt_household_capability_grants g
      where g.caregiver_membership_id = v_target.id or g.child_membership_id = v_target.id),
    'deviceAssignments', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'label', d.label))
      from public.kwilt_household_devices d where d.household_id = v_actor.household_id
        and d.status <> 'revoked' and (d.child_membership_id = v_target.id
          or d.assigned_caregiver_membership_id = v_target.id
          or exists (select 1 from public.kwilt_household_device_member_access a
            where a.device_id = d.id and a.child_membership_id = v_target.id))), '[]'::jsonb),
    'sharedObjects', jsonb_build_array(
      jsonb_build_object('kind', 'child_capability', 'count',
        (select count(*) from public.kwilt_child_capability_activations a where a.child_membership_id = v_target.id)),
      jsonb_build_object('kind', 'caregiver_grant', 'count',
        (select count(*) from public.kwilt_household_capability_grants g
          where g.caregiver_membership_id = v_target.id or g.child_membership_id = v_target.id))
    ),
    'recovery', 'The person can be invited back. Device and Screen Time cleanup may need completion on the affected device.'
  );
end;
$$;

create or replace function public.preview_kwilt_household_member_removal(
  p_membership_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.kwilt_preview_household_member_removal_for_actor(
    public.kwilt_require_permanent_user(),
    (public.kwilt_agent_household_actor(public.kwilt_require_permanent_user())).household_id,
    p_membership_id, p_expected_updated_at)
$$;

create or replace function public.preview_kwilt_agent_household_member_removal(
  p_user_id uuid, p_household_id uuid, p_membership_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.kwilt_preview_household_member_removal_for_actor(
    p_user_id, p_household_id, p_membership_id, p_expected_updated_at)
$$;

create or replace function public.kwilt_remove_household_member_for_actor(
  p_user_id uuid, p_household_id uuid, p_membership_id uuid, p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(p_user_id);
  v_target public.kwilt_household_memberships;
  v_person public.kwilt_people;
  v_managed_path text;
begin
  if v_actor.household_id <> p_household_id then raise exception 'wrong_household'; end if;
  select * into v_target from public.kwilt_household_memberships
  where id = p_membership_id and status = 'active' for update;
  if v_target.id is null or v_target.household_id <> v_actor.household_id then
    raise exception 'household_member_not_found';
  end if;
  if v_actor.role <> 'owner' or v_target.role = 'owner' then raise exception 'household_owner_required'; end if;
  select * into v_person from public.kwilt_people where id = v_target.person_id for update;
  if greatest(v_target.updated_at, v_person.updated_at) <> p_expected_updated_at then
    raise exception 'stale_household_member';
  end if;
  v_managed_path := v_person.managed_avatar_storage_path;
  update public.kwilt_child_capability_activations
    set state = case when capability_id = 'screen-time' and state <> 'inactive'
      then 'pending_cleanup' else 'inactive' end,
      changed_by_membership_id = v_actor.id, changed_at = now()
    where child_membership_id = v_target.id;
  delete from public.kwilt_household_capability_grants
    where caregiver_membership_id = v_target.id or child_membership_id = v_target.id;
  delete from public.kwilt_household_device_member_access where child_membership_id = v_target.id;
  update public.kwilt_household_devices
    set status = 'revoked', credential_hash = null, revoked_at = now(), updated_at = now()
    where status <> 'revoked' and (child_membership_id = v_target.id
      or assigned_caregiver_membership_id = v_target.id);
  update public.kwilt_household_memberships set status = 'removed', removed_at = now()
    where id = v_target.id;
  if v_managed_path is not null then
    update public.kwilt_people set managed_avatar_storage_path = null, updated_at = now()
      where id = v_target.person_id;
    insert into public.kwilt_avatar_deletion_queue (storage_path, reason)
      values (v_managed_path, 'member_removed') on conflict (storage_path) do nothing;
  end if;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_actor.household_id, v_actor.id, 'member_removed', v_target.id,
    jsonb_build_object('reviewedVersion', p_expected_updated_at));
  return public.get_kwilt_agent_household_snapshot(p_user_id);
end;
$$;

create or replace function public.remove_kwilt_household_member_reviewed(
  p_membership_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_remove_household_member_for_actor(
    public.kwilt_require_permanent_user(),
    (public.kwilt_agent_household_actor(public.kwilt_require_permanent_user())).household_id,
    p_membership_id, p_expected_updated_at)
$$;

create or replace function public.remove_kwilt_agent_household_member_reviewed(
  p_user_id uuid, p_household_id uuid, p_membership_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_remove_household_member_for_actor(
    p_user_id, p_household_id, p_membership_id, p_expected_updated_at)
$$;

create or replace function public.kwilt_mutate_household_device_for_actor(
  p_user_id uuid, p_household_id uuid, p_device_id uuid, p_expected_updated_at timestamptz,
  p_action text, p_display_name text default null, p_member_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships := public.kwilt_agent_household_actor(p_user_id);
  v_device public.kwilt_household_devices;
  v_requires_cleanup boolean := false;
begin
  if v_actor.household_id <> p_household_id then raise exception 'wrong_household'; end if;
  if v_actor.role not in ('owner', 'caregiver') then raise exception 'household_device_manager_required'; end if;
  select * into v_device from public.kwilt_household_devices where id = p_device_id for update;
  if v_device.id is null or v_device.household_id <> v_actor.household_id then
    raise exception 'household_device_not_found';
  end if;
  if v_device.updated_at <> p_expected_updated_at then raise exception 'stale_household_device'; end if;
  if p_action = 'update' then
    if p_display_name is null and p_member_ids is null then raise exception 'empty_household_device_patch'; end if;
    if p_display_name is not null and length(trim(p_display_name)) not between 1 and 80 then
      raise exception 'invalid_household_device_name';
    end if;
    if p_member_ids is not null and v_device.device_kind <> 'shared_household' then
      raise exception 'household_device_members_not_supported';
    end if;
    if p_member_ids is not null and exists (
      select 1 from unnest(p_member_ids) member_id
      left join public.kwilt_household_memberships m on m.id = member_id
      where m.id is null or m.household_id <> v_actor.household_id
        or m.role <> 'child' or m.status <> 'active'
    ) then raise exception 'invalid_shared_device_member'; end if;
    update public.kwilt_household_devices
      set label = coalesce(trim(p_display_name), label), updated_at = now()
      where id = v_device.id;
    if p_member_ids is not null then
      delete from public.kwilt_household_device_member_access where device_id = v_device.id;
      insert into public.kwilt_household_device_member_access
        (device_id, child_membership_id, added_by_membership_id)
      select v_device.id, member_id, v_actor.id from unnest(p_member_ids) member_id;
    end if;
  elsif p_action = 'revoke' then
    update public.kwilt_household_devices
      set status = 'revoked', credential_hash = null, revoked_at = now(), updated_at = now()
      where id = v_device.id;
    delete from public.kwilt_household_device_member_access where device_id = v_device.id;
    v_requires_cleanup := v_device.device_kind = 'personal_child';
  elsif p_action = 'reconcile' then
    v_requires_cleanup := v_device.device_kind = 'personal_child'
      and v_device.status in ('needs_attention', 'revoked');
    if v_device.status <> 'revoked' and v_device.child_membership_id is not null and not exists (
      select 1 from public.kwilt_household_memberships m
      where m.id = v_device.child_membership_id and m.household_id = v_actor.household_id and m.status = 'active'
    ) then
      update public.kwilt_household_devices set status = 'needs_attention', updated_at = now()
        where id = v_device.id;
      v_requires_cleanup := true;
    end if;
  else raise exception 'invalid_household_device_action'; end if;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_actor.household_id, v_actor.id, 'household_device_' || p_action,
    v_device.child_membership_id, jsonb_build_object('deviceId', v_device.id));
  if p_action = 'reconcile' then
    return jsonb_build_object('device', public.kwilt_household_device_json(v_device.id),
      'requiresNativeCleanup', v_requires_cleanup);
  end if;
  return public.kwilt_household_device_json(v_device.id);
end;
$$;

create or replace function public.update_kwilt_household_device(
  p_device_id uuid, p_expected_updated_at timestamptz,
  p_display_name text default null, p_member_ids uuid[] default null
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_mutate_household_device_for_actor(
    public.kwilt_require_permanent_user(),
    (public.kwilt_agent_household_actor(public.kwilt_require_permanent_user())).household_id,
    p_device_id, p_expected_updated_at,
    'update', p_display_name, p_member_ids)
$$;
create or replace function public.revoke_kwilt_household_device_reviewed(
  p_device_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_mutate_household_device_for_actor(
    public.kwilt_require_permanent_user(),
    (public.kwilt_agent_household_actor(public.kwilt_require_permanent_user())).household_id,
    p_device_id, p_expected_updated_at, 'revoke')
$$;
create or replace function public.reconcile_kwilt_household_device(
  p_device_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_mutate_household_device_for_actor(
    public.kwilt_require_permanent_user(),
    (public.kwilt_agent_household_actor(public.kwilt_require_permanent_user())).household_id,
    p_device_id, p_expected_updated_at, 'reconcile')
$$;

create or replace function public.update_kwilt_agent_household_device(
  p_user_id uuid, p_household_id uuid, p_device_id uuid, p_expected_updated_at timestamptz,
  p_display_name text default null, p_member_ids uuid[] default null
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_mutate_household_device_for_actor(
    p_user_id, p_household_id, p_device_id, p_expected_updated_at, 'update', p_display_name, p_member_ids)
$$;
create or replace function public.revoke_kwilt_agent_household_device(
  p_user_id uuid, p_household_id uuid, p_device_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_mutate_household_device_for_actor(
    p_user_id, p_household_id, p_device_id, p_expected_updated_at, 'revoke')
$$;
create or replace function public.reconcile_kwilt_agent_household_device(
  p_user_id uuid, p_household_id uuid, p_device_id uuid, p_expected_updated_at timestamptz
)
returns jsonb language sql security definer set search_path = '' as $$
  select public.kwilt_mutate_household_device_for_actor(
    p_user_id, p_household_id, p_device_id, p_expected_updated_at, 'reconcile')
$$;

revoke all on function public.kwilt_agent_household_actor(uuid) from public, anon, authenticated;
revoke all on function public.kwilt_household_device_json(uuid) from public, anon, authenticated;
revoke all on function public.kwilt_list_household_devices_for_actor(uuid) from public, anon, authenticated;
revoke all on function public.kwilt_update_household_member_for_actor(uuid, uuid, uuid, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.kwilt_preview_household_member_removal_for_actor(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.kwilt_remove_household_member_for_actor(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.kwilt_mutate_household_device_for_actor(uuid, uuid, uuid, timestamptz, text, text, uuid[]) from public, anon, authenticated;

revoke all on function public.update_kwilt_household_member(uuid, timestamptz, text, text) from public, anon;
revoke all on function public.preview_kwilt_household_member_removal(uuid, timestamptz) from public, anon;
revoke all on function public.remove_kwilt_household_member_reviewed(uuid, timestamptz) from public, anon;
revoke all on function public.list_kwilt_household_devices(uuid) from public, anon;
revoke all on function public.update_kwilt_household_device(uuid, timestamptz, text, uuid[]) from public, anon;
revoke all on function public.revoke_kwilt_household_device_reviewed(uuid, timestamptz) from public, anon;
revoke all on function public.reconcile_kwilt_household_device(uuid, timestamptz) from public, anon;
grant execute on function public.update_kwilt_household_member(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.preview_kwilt_household_member_removal(uuid, timestamptz) to authenticated;
grant execute on function public.remove_kwilt_household_member_reviewed(uuid, timestamptz) to authenticated;
grant execute on function public.list_kwilt_household_devices(uuid) to authenticated;
grant execute on function public.update_kwilt_household_device(uuid, timestamptz, text, uuid[]) to authenticated;
grant execute on function public.revoke_kwilt_household_device_reviewed(uuid, timestamptz) to authenticated;
grant execute on function public.reconcile_kwilt_household_device(uuid, timestamptz) to authenticated;

revoke all on function public.get_kwilt_agent_household_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.list_kwilt_agent_household_devices(uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_kwilt_agent_household_member(uuid, uuid, uuid, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.preview_kwilt_agent_household_member_removal(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.remove_kwilt_agent_household_member_reviewed(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.update_kwilt_agent_household_device(uuid, uuid, uuid, timestamptz, text, uuid[]) from public, anon, authenticated;
revoke all on function public.revoke_kwilt_agent_household_device(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.reconcile_kwilt_agent_household_device(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.get_kwilt_agent_household_snapshot(uuid) to service_role;
grant execute on function public.list_kwilt_agent_household_devices(uuid, uuid) to service_role;
grant execute on function public.update_kwilt_agent_household_member(uuid, uuid, uuid, timestamptz, text, text) to service_role;
grant execute on function public.preview_kwilt_agent_household_member_removal(uuid, uuid, uuid, timestamptz) to service_role;
grant execute on function public.remove_kwilt_agent_household_member_reviewed(uuid, uuid, uuid, timestamptz) to service_role;
grant execute on function public.update_kwilt_agent_household_device(uuid, uuid, uuid, timestamptz, text, uuid[]) to service_role;
grant execute on function public.revoke_kwilt_agent_household_device(uuid, uuid, uuid, timestamptz) to service_role;
grant execute on function public.reconcile_kwilt_agent_household_device(uuid, uuid, uuid, timestamptz) to service_role;

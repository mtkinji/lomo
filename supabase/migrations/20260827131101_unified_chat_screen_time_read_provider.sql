-- Service-only Screen Time read projection for OAuth MCP and other durable agent channels.
-- Apple FamilyActivitySelection references, install identifiers, and raw usage history never leave
-- the native control plane through this projection.

create or replace function public.get_kwilt_agent_screen_time_snapshot(
  p_user_id uuid,
  p_child_membership_ids uuid[] default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_authorized_child_ids uuid[] := '{}'::uuid[];
  v_target_child_ids uuid[] := '{}'::uuid[];
  v_unauthorized_child_id uuid;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_child_membership_ids is not null and cardinality(p_child_membership_ids) > 20 then
    raise exception 'too_many_screen_time_children';
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

  if v_actor.id is null or v_actor.role not in ('owner', 'caregiver') then
    return jsonb_build_object('children', '[]'::jsonb);
  end if;

  select coalesce(array_agg(child.id order by child.joined_at), '{}'::uuid[])
  into v_authorized_child_ids
  from public.kwilt_household_memberships child
  join public.kwilt_child_capability_activations activation
    on activation.household_id = child.household_id
   and activation.child_membership_id = child.id
   and activation.capability_id = 'screen-time'
   and activation.state in ('pending_setup', 'active', 'pending_cleanup', 'blocked')
  where child.household_id = v_actor.household_id
    and child.role = 'child'
    and child.status = 'active'
    and (
      v_actor.role = 'owner'
      or exists (
        select 1
        from public.kwilt_household_capability_grants grant_row
        where grant_row.household_id = child.household_id
          and grant_row.caregiver_membership_id = v_actor.id
          and grant_row.child_membership_id = child.id
          and grant_row.capability_id = 'screen-time'
      )
    );

  if p_child_membership_ids is not null then
    select requested.child_id into v_unauthorized_child_id
    from unnest(p_child_membership_ids) requested(child_id)
    where not (requested.child_id = any(v_authorized_child_ids))
    limit 1;
    if v_unauthorized_child_id is not null then
      raise exception 'screen_time_child_not_authorized';
    end if;
    select coalesce(array_agg(distinct requested.child_id), '{}'::uuid[])
    into v_target_child_ids
    from unnest(p_child_membership_ids) requested(child_id);
  else
    v_target_child_ids := v_authorized_child_ids;
  end if;

  return jsonb_build_object(
    'children', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membershipId', child.id,
        'displayName', person.display_name,
        'desiredPolicyVersion', coalesce(subject.desired_policy_version, 0),
        'selections', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', selection.id,
            'label', selection.label,
            'status', selection.status
          ) order by selection.label, selection.id)
          from public.kwilt_family_screen_time_selections selection
          where selection.subject_id = subject.id
            and selection.status = 'active'
        ), '[]'::jsonb),
        'agreements', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', agreement.id,
            'selectionId', agreement.selection_id,
            'rule', jsonb_build_object(
              'weekdays', agreement.rule -> 'weekdays',
              'startMinute', agreement.rule -> 'startMinute',
              'endMinute', agreement.rule -> 'endMinute',
              'dailyLimitMinutes', agreement.rule -> 'dailyLimitMinutes'
            ) || case
              when jsonb_typeof(agreement.rule -> 'prerequisiteActivity') = 'object' then
                jsonb_build_object('prerequisiteActivity', jsonb_build_object(
                  'selectionId', agreement.rule #> '{prerequisiteActivity,selectionId}',
                  'thresholdMinutes', agreement.rule #> '{prerequisiteActivity,thresholdMinutes}',
                  'reset', agreement.rule #> '{prerequisiteActivity,reset}'
                ))
              else '{}'::jsonb
            end,
            'active', agreement.active,
            'version', agreement.version,
            'updatedAt', agreement.updated_at
          ) order by agreement.created_at, agreement.id)
          from public.kwilt_family_screen_time_agreements agreement
          where agreement.subject_id = subject.id
        ), '[]'::jsonb),
        'activeOverrides', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', override_row.id,
            'selectionId', override_row.selection_id,
            'action', override_row.action,
            'timeBasis', override_row.time_basis,
            'startsAt', override_row.starts_at,
            'expiresAt', override_row.expires_at,
            'usageMinutes', override_row.usage_minutes,
            'provenance', override_row.provenance,
            'policyVersion', override_row.policy_version,
            'status', override_row.status
          ) order by override_row.created_at desc, override_row.id)
          from public.kwilt_family_screen_time_overrides override_row
          where override_row.subject_id = subject.id
            and override_row.status = 'active'
            and (override_row.time_basis = 'foreground_usage' or override_row.expires_at > now())
        ), '[]'::jsonb),
        'pendingRequests', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', request_row.id,
            'selectionId', request_row.selection_id,
            'kind', request_row.kind,
            'requestedMinutes', request_row.requested_minutes,
            'message', request_row.message,
            'status', request_row.status,
            'expiresAt', request_row.expires_at,
            'createdAt', request_row.created_at
          ) order by request_row.created_at desc, request_row.id)
          from public.kwilt_family_screen_time_access_requests request_row
          where request_row.subject_id = subject.id
            and request_row.status = 'pending'
            and request_row.expires_at > now()
        ), '[]'::jsonb),
        'devices', coalesce((
          select jsonb_agg(jsonb_build_object(
            'readiness', device.readiness,
            'authorizationStatus', device.authorization_status,
            'lastSeenAt', device.last_seen_at,
            'releasedAt', device.released_at
          ) order by device.created_at, device.id)
          from public.kwilt_family_screen_time_devices device
          where device.subject_id = subject.id
        ), '[]'::jsonb),
        'latestDeviceReceipt', (
          select jsonb_build_object(
            'policyVersion', receipt.policy_version,
            'outcome', receipt.outcome,
            'failureCode', receipt.failure_code,
            'occurredAt', receipt.occurred_at
          )
          from public.kwilt_family_screen_time_device_receipts receipt
          where receipt.subject_id = subject.id
          order by receipt.policy_version desc, receipt.occurred_at desc, receipt.id
          limit 1
        )
      ) order by child.joined_at, child.id)
      from public.kwilt_household_memberships child
      join public.kwilt_people person on person.id = child.person_id
      left join public.kwilt_family_screen_time_subjects subject
        on subject.household_id = child.household_id
       and subject.child_membership_id = child.id
      where child.id = any(v_target_child_ids)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_kwilt_agent_screen_time_snapshot(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_kwilt_agent_screen_time_snapshot(uuid, uuid[]) to service_role;

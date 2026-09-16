-- Make named-child device pairing recoverable across navigation loss, app
-- restarts, expired on-screen codes, and a failed first secure-storage write.

create or replace function public.create_kwilt_household_device_setup_session(
  p_child_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.kwilt_household_memberships;
  v_actor public.kwilt_household_memberships;
  v_secret text := encode(extensions.gen_random_bytes(32), 'hex');
  v_random_bytes bytea;
  v_random_value bigint;
  v_manual_code text;
  v_manual_code_hash text;
  v_session public.kwilt_household_device_setup_sessions;
  v_replaced_session_id uuid;
begin
  if not public.kwilt_has_active_pro() then raise exception 'kwilt_pro_required'; end if;

  select * into v_child from public.kwilt_household_memberships
  where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_membership_not_found'; end if;
  v_actor := public.kwilt_require_household_device_manager(v_child.household_id);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_child.id::text, 0));

  if exists (
    select 1 from public.kwilt_household_devices
    where child_membership_id = v_child.id and device_kind = 'personal_child' and status <> 'revoked'
  ) then raise exception 'child_personal_device_already_connected'; end if;

  update public.kwilt_household_device_setup_sessions
  set status = 'expired'
  where child_membership_id = v_child.id and status = 'issued' and expires_at <= now();

  update public.kwilt_household_device_setup_sessions
  set status = 'cancelled', cancelled_at = now()
  where child_membership_id = v_child.id and status = 'issued'
  returning id into v_replaced_session_id;

  if v_replaced_session_id is not null then
    insert into public.kwilt_household_audit_events
      (household_id, actor_membership_id, event_type, subject_membership_id, details)
    values (v_child.household_id, v_actor.id, 'household_device_setup_cancelled', v_child.id,
      jsonb_build_object('sessionId', v_replaced_session_id, 'reason', 'replaced'));
  end if;

  loop
    v_random_bytes := extensions.gen_random_bytes(4);
    v_random_value := get_byte(v_random_bytes, 0)::bigint * 16777216
      + get_byte(v_random_bytes, 1)::bigint * 65536
      + get_byte(v_random_bytes, 2)::bigint * 256
      + get_byte(v_random_bytes, 3)::bigint;
    if v_random_value < 4294000000 then
      v_manual_code := lpad((v_random_value % 1000000)::text, 6, '0');
      v_manual_code_hash := encode(extensions.digest(v_manual_code, 'sha256'), 'hex');
      exit when not exists (
        select 1 from public.kwilt_household_device_setup_sessions
        where manual_code_hash = v_manual_code_hash and status = 'issued'
      );
    end if;
  end loop;

  insert into public.kwilt_household_device_setup_sessions
    (household_id, child_membership_id, created_by_membership_id, secret_hash, manual_code_hash, expires_at)
  values (
    v_child.household_id, v_child.id, v_actor.id,
    encode(extensions.digest(v_secret, 'sha256'), 'hex'),
    v_manual_code_hash,
    now() + interval '15 minutes'
  ) returning * into v_session;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_child.household_id, v_actor.id, 'household_device_setup_issued', v_child.id,
    jsonb_build_object('sessionId', v_session.id));

  return jsonb_build_object(
    'id', v_session.id,
    'token', v_secret,
    'manualCode', v_manual_code,
    'expiresAt', v_session.expires_at,
    'childMembershipId', v_child.id
  );
end;
$$;

revoke execute on function public.create_kwilt_household_device_setup_session(uuid) from public, anon;
grant execute on function public.create_kwilt_household_device_setup_session(uuid) to authenticated;

create or replace function public.kwilt_claim_household_device_setup(
  p_secret_hash text,
  p_install_id text,
  p_label text,
  p_platform text,
  p_credential_hash text,
  p_preview_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.kwilt_household_device_setup_sessions;
  v_device public.kwilt_household_devices;
  v_child_membership_id uuid;
begin
  select s.child_membership_id into v_child_membership_id
  from public.kwilt_household_device_setup_sessions s
  where (s.secret_hash = p_secret_hash or s.manual_code_hash = p_secret_hash)
    and s.status in ('issued', 'claimed')
    and s.expires_at > now()
    and (p_preview_session_id is null or s.id = p_preview_session_id);
  if v_child_membership_id is null then
    raise exception 'household_device_setup_unavailable';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_child_membership_id::text, 0)
  );

  select * into v_session
  from public.kwilt_household_device_setup_sessions s
  where (s.secret_hash = p_secret_hash or s.manual_code_hash = p_secret_hash)
    and s.status = 'claimed'
    and s.expires_at > now()
    and (p_preview_session_id is null or s.id = p_preview_session_id)
  for update;

  if v_session.id is not null then
    select * into v_device
    from public.kwilt_household_devices d
    where d.id = v_session.claimed_device_id
      and d.device_kind = 'personal_child'
      and d.status = 'ready'
      and d.install_id = p_install_id
    for update;

    if v_device.id is not null then
      update public.kwilt_household_devices
      set credential_hash = p_credential_hash, updated_at = now()
      where id = v_device.id
      returning * into v_device;

      insert into public.kwilt_household_audit_events
        (household_id, actor_membership_id, event_type, subject_membership_id, details)
      values (v_session.household_id, v_session.created_by_membership_id,
        'household_device_access_recovered', v_session.child_membership_id,
        jsonb_build_object('deviceId', v_device.id, 'sessionId', v_session.id));

      return jsonb_build_object(
        'deviceId', v_device.id,
        'childMembershipId', v_session.child_membership_id,
        'status', v_device.status
      );
    end if;
  end if;

  if p_preview_session_id is not null and not exists (
    select 1
    from public.kwilt_household_device_setup_sessions s
    where s.id = p_preview_session_id
      and s.manual_code_hash = p_secret_hash
      and s.status = 'issued'
      and s.expires_at > now()
  ) then
    raise exception 'household_device_setup_unavailable';
  end if;

  return public.kwilt_claim_household_device_setup(
    p_secret_hash, p_install_id, p_label, p_platform, p_credential_hash
  );
end;
$$;

revoke all on function public.kwilt_claim_household_device_setup(text, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.kwilt_claim_household_device_setup(text, text, text, text, text)
  from service_role;
grant execute on function public.kwilt_claim_household_device_setup(text, text, text, text, text, uuid)
  to service_role;

-- Some production schemas received the claim/rate-limit hardening without the
-- resolver from the same rollout. Recreate it here so a successfully paired
-- child device can authenticate on the next request and after an app restart.
create or replace function public.kwilt_resolve_managed_child_access(
  p_device_id uuid,
  p_install_id text,
  p_credential_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.kwilt_household_devices;
begin
  select * into v_device
  from public.kwilt_household_devices d
  where d.id = p_device_id
    and d.device_kind = 'personal_child'
    and d.status = 'ready'
    and d.install_id = p_install_id
    and d.credential_hash = p_credential_hash;
  if v_device.id is null then
    raise exception 'managed_child_access_revoked';
  end if;
  if not exists (
    select 1 from public.kwilt_household_memberships m
    where m.id = v_device.child_membership_id
      and m.household_id = v_device.household_id
      and m.role = 'child'
      and m.status = 'active'
  ) then
    raise exception 'managed_child_access_revoked';
  end if;

  return jsonb_build_object(
    'deviceId', v_device.id,
    'childMembershipId', v_device.child_membership_id,
    'childDisplayName', (
      select p.display_name
      from public.kwilt_people p
      join public.kwilt_household_memberships m on m.person_id = p.id
      where m.id = v_device.child_membership_id
    ),
    'householdName', (
      select h.name from public.kwilt_households h where h.id = v_device.household_id
    ),
    'caregiverDisplayName', coalesce((
      select p.display_name
      from public.kwilt_household_device_setup_sessions s
      join public.kwilt_household_memberships m on m.id = s.created_by_membership_id
      join public.kwilt_people p on p.id = m.person_id
      where s.claimed_device_id = v_device.id
      order by s.claimed_at desc nulls last
      limit 1
    ), 'Caregiver'),
    'capabilityIds', coalesce((
      select jsonb_agg(a.capability_id order by a.capability_id)
      from public.kwilt_child_capability_activations a
      where a.child_membership_id = v_device.child_membership_id
        and a.state = 'active'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.kwilt_resolve_managed_child_access(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.kwilt_resolve_managed_child_access(uuid, text, text)
  to service_role;

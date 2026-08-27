-- Enforce managed-child revocation/current grants at the device boundary and
-- serialize low-entropy manual-code attempts without double-counting a valid claim.

create or replace function public.kwilt_consume_household_device_setup_attempt(
  p_install_hash text,
  p_network_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_lock bigint;
  v_second_lock bigint;
begin
  v_first_lock := pg_catalog.hashtextextended(
    least('install:' || p_install_hash, 'network:' || p_network_hash), 0
  );
  v_second_lock := pg_catalog.hashtextextended(
    greatest('install:' || p_install_hash, 'network:' || p_network_hash), 0
  );
  perform pg_catalog.pg_advisory_xact_lock(v_first_lock);
  if v_second_lock <> v_first_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_second_lock);
  end if;

  delete from public.kwilt_household_device_setup_attempts
  where attempted_at < now() - interval '1 day';
  if (select count(*) from public.kwilt_household_device_setup_attempts
    where attempted_at > now() - interval '15 minutes'
      and (install_hash = p_install_hash or network_hash = p_network_hash)) >= 10 then
    raise exception 'household_device_setup_rate_limited';
  end if;
  insert into public.kwilt_household_device_setup_attempts (install_hash, network_hash)
  values (p_install_hash, p_network_hash);
end;
$$;

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
begin
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

revoke all on function public.kwilt_claim_household_device_setup(text, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.kwilt_resolve_managed_child_access(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.kwilt_claim_household_device_setup(text, text, text, text, text, uuid)
  to service_role;
grant execute on function public.kwilt_resolve_managed_child_access(uuid, text, text)
  to service_role;

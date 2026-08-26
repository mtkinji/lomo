-- Household-owned device participation for personal child devices and shared iPads.
-- A dependent membership does not need an auth binding to receive managed access.

create table public.kwilt_household_device_setup_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  child_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  secret_hash text not null unique,
  manual_code_hash text not null unique,
  status text not null default 'issued' check (status in ('issued', 'claimed', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  claimed_device_id uuid,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  cancelled_at timestamptz
);

create unique index kwilt_one_issued_device_setup_per_child
  on public.kwilt_household_device_setup_sessions (child_membership_id)
  where status = 'issued';

create table public.kwilt_household_device_setup_attempts (
  id bigint generated always as identity primary key,
  install_hash text not null,
  network_hash text not null,
  attempted_at timestamptz not null default now()
);
create index kwilt_household_device_setup_attempt_install_recent
  on public.kwilt_household_device_setup_attempts (install_hash, attempted_at desc);
create index kwilt_household_device_setup_attempt_network_recent
  on public.kwilt_household_device_setup_attempts (network_hash, attempted_at desc);

create table public.kwilt_household_devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  device_kind text not null check (device_kind in ('personal_child', 'shared_household')),
  child_membership_id uuid references public.kwilt_household_memberships(id) on delete cascade,
  assigned_caregiver_membership_id uuid references public.kwilt_household_memberships(id) on delete restrict,
  install_id text not null check (length(trim(install_id)) between 8 and 200),
  label text not null check (length(trim(label)) between 1 and 80),
  platform text not null check (platform in ('ios', 'ipados')),
  credential_hash text,
  status text not null default 'ready' check (status in ('pending', 'ready', 'needs_attention', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint personal_child_requires_child check (
    device_kind <> 'personal_child'
    or (child_membership_id is not null and assigned_caregiver_membership_id is null and credential_hash is not null)
  ),
  constraint shared_household_requires_caregiver check (
    device_kind <> 'shared_household'
    or (child_membership_id is null and assigned_caregiver_membership_id is not null and credential_hash is null)
  ),
  unique (household_id, install_id)
);

alter table public.kwilt_household_device_setup_sessions
  add constraint kwilt_device_setup_claimed_device_fk
  foreign key (claimed_device_id) references public.kwilt_household_devices(id) on delete set null;

create unique index kwilt_one_active_personal_device_per_child
  on public.kwilt_household_devices (child_membership_id)
  where device_kind = 'personal_child' and status <> 'revoked';

create table public.kwilt_household_device_member_access (
  device_id uuid not null references public.kwilt_household_devices(id) on delete cascade,
  child_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  added_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  primary key (device_id, child_membership_id)
);

alter table public.kwilt_household_device_setup_sessions enable row level security;
alter table public.kwilt_household_device_setup_attempts enable row level security;
alter table public.kwilt_household_devices enable row level security;
alter table public.kwilt_household_device_member_access enable row level security;

revoke all on public.kwilt_household_device_setup_sessions from anon, authenticated;
revoke all on public.kwilt_household_device_setup_attempts from anon, authenticated;
revoke all on public.kwilt_household_devices from anon, authenticated;
revoke all on public.kwilt_household_device_member_access from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_device_setup_sessions from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_device_setup_attempts from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_devices from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_device_member_access from anon, authenticated;

create or replace function public.kwilt_require_household_device_manager(p_household_id uuid)
returns public.kwilt_household_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_actor from public.kwilt_current_household_membership(p_household_id);
  if v_actor.id is null or v_actor.role not in ('owner', 'caregiver') then
    raise exception 'household_device_manager_required';
  end if;
  return v_actor;
end;
$$;

create or replace function public.list_kwilt_household_devices(p_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
begin
  v_actor := public.kwilt_require_household_device_manager(p_household_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'householdId', d.household_id,
      'kind', d.device_kind,
      'childMembershipId', d.child_membership_id,
      'assignedCaregiverMembershipId', d.assigned_caregiver_membership_id,
      'installId', d.install_id,
      'label', d.label,
      'platform', d.platform,
      'status', d.status,
      'memberIds', coalesce((
        select jsonb_agg(a.child_membership_id order by a.created_at)
        from public.kwilt_household_device_member_access a where a.device_id = d.id
      ), '[]'::jsonb)
    ) order by d.created_at)
    from public.kwilt_household_devices d
    where d.household_id = v_actor.household_id and d.status <> 'revoked'
  ), '[]'::jsonb);
end;
$$;

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
  v_manual_code text := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  v_session public.kwilt_household_device_setup_sessions;
begin
  select * into v_child from public.kwilt_household_memberships
  where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_membership_not_found'; end if;
  v_actor := public.kwilt_require_household_device_manager(v_child.household_id);

  update public.kwilt_household_device_setup_sessions
  set status = 'expired'
  where child_membership_id = v_child.id and status = 'issued' and expires_at <= now();
  if exists (
    select 1 from public.kwilt_household_device_setup_sessions
    where child_membership_id = v_child.id and status = 'issued'
  ) then raise exception 'household_device_setup_already_active'; end if;
  if exists (
    select 1 from public.kwilt_household_devices
    where child_membership_id = v_child.id and device_kind = 'personal_child' and status <> 'revoked'
  ) then raise exception 'child_personal_device_already_connected'; end if;

  insert into public.kwilt_household_device_setup_sessions
    (household_id, child_membership_id, created_by_membership_id, secret_hash, manual_code_hash, expires_at)
  values (
    v_child.household_id, v_child.id, v_actor.id,
    encode(extensions.digest(v_secret, 'sha256'), 'hex'),
    encode(extensions.digest(v_manual_code, 'sha256'), 'hex'),
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

create or replace function public.cancel_kwilt_household_device_setup_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.kwilt_household_device_setup_sessions;
  v_actor public.kwilt_household_memberships;
begin
  select * into v_session from public.kwilt_household_device_setup_sessions
  where id = p_session_id for update;
  if v_session.id is null then raise exception 'household_device_setup_not_found'; end if;
  v_actor := public.kwilt_require_household_device_manager(v_session.household_id);
  if v_session.status = 'issued' then
    update public.kwilt_household_device_setup_sessions
    set status = 'cancelled', cancelled_at = now() where id = v_session.id;
    insert into public.kwilt_household_audit_events
      (household_id, actor_membership_id, event_type, subject_membership_id, details)
    values (v_session.household_id, v_actor.id, 'household_device_setup_cancelled',
      v_session.child_membership_id, jsonb_build_object('sessionId', v_session.id));
  end if;
end;
$$;

create or replace function public.designate_kwilt_shared_household_device(
  p_household_id uuid,
  p_install_id text,
  p_label text,
  p_platform text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_device public.kwilt_household_devices;
begin
  v_actor := public.kwilt_require_household_device_manager(p_household_id);
  if length(trim(coalesce(p_install_id, ''))) not between 8 and 200 then raise exception 'invalid_install_id'; end if;
  if length(trim(coalesce(p_label, ''))) not between 1 and 80 then raise exception 'invalid_device_label'; end if;
  if p_platform not in ('ios', 'ipados') then raise exception 'invalid_device_platform'; end if;
  if exists (
    select 1 from public.kwilt_household_devices
    where household_id = p_household_id and install_id = trim(p_install_id)
      and device_kind = 'personal_child' and status <> 'revoked'
  ) then raise exception 'personal_device_cannot_be_shared'; end if;

  insert into public.kwilt_household_devices
    (household_id, device_kind, assigned_caregiver_membership_id, install_id, label, platform, status)
  values (p_household_id, 'shared_household', v_actor.id, trim(p_install_id), trim(p_label), p_platform, 'ready')
  on conflict (household_id, install_id) do update set
    device_kind = 'shared_household', child_membership_id = null,
    assigned_caregiver_membership_id = excluded.assigned_caregiver_membership_id,
    label = excluded.label, platform = excluded.platform, credential_hash = null,
    status = 'ready', updated_at = now(), revoked_at = null
  returning * into v_device;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, details)
  values (p_household_id, v_actor.id, 'shared_household_device_designated',
    jsonb_build_object('deviceId', v_device.id));
  return jsonb_build_object('id', v_device.id, 'status', v_device.status);
end;
$$;

create or replace function public.set_kwilt_shared_household_device_members(
  p_device_id uuid,
  p_child_membership_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.kwilt_household_devices;
  v_actor public.kwilt_household_memberships;
begin
  select * into v_device from public.kwilt_household_devices
  where id = p_device_id and device_kind = 'shared_household' and status <> 'revoked';
  if v_device.id is null then raise exception 'shared_household_device_not_found'; end if;
  v_actor := public.kwilt_require_household_device_manager(v_device.household_id);
  if exists (
    select 1 from unnest(coalesce(p_child_membership_ids, '{}'::uuid[])) member_id
    left join public.kwilt_household_memberships m on m.id = member_id
    where m.id is null or m.household_id <> v_device.household_id or m.role <> 'child' or m.status <> 'active'
  ) then raise exception 'invalid_shared_device_member'; end if;

  delete from public.kwilt_household_device_member_access where device_id = v_device.id;
  insert into public.kwilt_household_device_member_access
    (device_id, child_membership_id, added_by_membership_id)
  select v_device.id, member_id, v_actor.id
  from unnest(coalesce(p_child_membership_ids, '{}'::uuid[])) member_id;

  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, details)
  values (v_device.household_id, v_actor.id, 'shared_household_device_members_changed',
    jsonb_build_object('deviceId', v_device.id, 'memberIds', coalesce(to_jsonb(p_child_membership_ids), '[]'::jsonb)));
end;
$$;

create or replace function public.revoke_kwilt_household_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device public.kwilt_household_devices;
  v_actor public.kwilt_household_memberships;
begin
  select * into v_device from public.kwilt_household_devices where id = p_device_id for update;
  if v_device.id is null then raise exception 'household_device_not_found'; end if;
  v_actor := public.kwilt_require_household_device_manager(v_device.household_id);
  update public.kwilt_household_devices
  set status = 'revoked', credential_hash = null, revoked_at = now(), updated_at = now()
  where id = v_device.id and status <> 'revoked';
  delete from public.kwilt_household_device_member_access where device_id = v_device.id;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_device.household_id, v_actor.id, 'household_device_revoked', v_device.child_membership_id,
    jsonb_build_object('deviceId', v_device.id, 'deviceKind', v_device.device_kind));
end;
$$;

-- Private service-role functions used by the token claim Edge Function.
create or replace function public.kwilt_consume_household_device_setup_attempt(
  p_install_hash text,
  p_network_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
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

create or replace function public.kwilt_preview_household_device_setup(p_secret_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.kwilt_household_device_setup_sessions;
begin
  select * into v_session from public.kwilt_household_device_setup_sessions
  where (secret_hash = p_secret_hash or manual_code_hash = p_secret_hash)
    and status = 'issued' and expires_at > now();
  if v_session.id is null then raise exception 'household_device_setup_unavailable'; end if;
  return jsonb_build_object(
    'sessionId', v_session.id,
    'childMembershipId', v_session.child_membership_id,
    'childDisplayName', (select p.display_name from public.kwilt_people p join public.kwilt_household_memberships m on m.person_id = p.id where m.id = v_session.child_membership_id),
    'householdName', (select h.name from public.kwilt_households h where h.id = v_session.household_id),
    'caregiverDisplayName', (select p.display_name from public.kwilt_people p join public.kwilt_household_memberships m on m.person_id = p.id where m.id = v_session.created_by_membership_id),
    'capabilityIds', coalesce((select jsonb_agg(a.capability_id order by a.capability_id)
      from public.kwilt_child_capability_activations a
      where a.child_membership_id = v_session.child_membership_id and a.state = 'active'), '[]'::jsonb),
    'expiresAt', v_session.expires_at
  );
end;
$$;

create or replace function public.kwilt_claim_household_device_setup(
  p_secret_hash text,
  p_install_id text,
  p_label text,
  p_platform text,
  p_credential_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.kwilt_household_device_setup_sessions;
  v_device public.kwilt_household_devices;
begin
  select * into v_session from public.kwilt_household_device_setup_sessions
  where (secret_hash = p_secret_hash or manual_code_hash = p_secret_hash)
    and status = 'issued' and expires_at > now()
  for update;
  if v_session.id is null then raise exception 'household_device_setup_unavailable'; end if;
  insert into public.kwilt_household_devices
    (household_id, device_kind, child_membership_id, install_id, label, platform, credential_hash, status)
  values (v_session.household_id, 'personal_child', v_session.child_membership_id,
    trim(p_install_id), trim(p_label), p_platform, p_credential_hash, 'ready')
  returning * into v_device;
  update public.kwilt_household_device_setup_sessions
  set status = 'claimed', claimed_device_id = v_device.id, claimed_at = now()
  where id = v_session.id and status = 'issued';
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, details)
  values (v_session.household_id, v_session.created_by_membership_id, 'household_device_claimed',
    v_session.child_membership_id, jsonb_build_object('deviceId', v_device.id));
  return jsonb_build_object('deviceId', v_device.id, 'childMembershipId', v_session.child_membership_id,
    'status', v_device.status);
end;
$$;

revoke all on function public.kwilt_require_household_device_manager(uuid) from public, anon, authenticated;
revoke execute on function public.list_kwilt_household_devices(uuid) from public, anon;
revoke execute on function public.create_kwilt_household_device_setup_session(uuid) from public, anon;
revoke execute on function public.cancel_kwilt_household_device_setup_session(uuid) from public, anon;
revoke execute on function public.designate_kwilt_shared_household_device(uuid, text, text, text) from public, anon;
revoke execute on function public.set_kwilt_shared_household_device_members(uuid, uuid[]) from public, anon;
revoke execute on function public.revoke_kwilt_household_device(uuid) from public, anon;
revoke all on function public.kwilt_preview_household_device_setup(text) from public, anon, authenticated;
revoke all on function public.kwilt_consume_household_device_setup_attempt(text, text) from public, anon, authenticated;
revoke all on function public.kwilt_claim_household_device_setup(text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.list_kwilt_household_devices(uuid) to authenticated;
grant execute on function public.create_kwilt_household_device_setup_session(uuid) to authenticated;
grant execute on function public.cancel_kwilt_household_device_setup_session(uuid) to authenticated;
grant execute on function public.designate_kwilt_shared_household_device(uuid, text, text, text) to authenticated;
grant execute on function public.set_kwilt_shared_household_device_members(uuid, uuid[]) to authenticated;
grant execute on function public.revoke_kwilt_household_device(uuid) to authenticated;
grant execute on function public.kwilt_preview_household_device_setup(text) to service_role;
grant execute on function public.kwilt_consume_household_device_setup_attempt(text, text) to service_role;
grant execute on function public.kwilt_claim_household_device_setup(text, text, text, text, text) to service_role;

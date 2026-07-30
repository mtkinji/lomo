-- Authoritative family Screen Time control plane.
-- Apple FamilyActivitySelection tokens remain on the child device. The server stores
-- only a caregiver-facing label and an opaque reference to that native selection.

create table public.kwilt_family_screen_time_subjects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  child_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  desired_policy_version bigint not null default 0 check (desired_policy_version >= 0),
  changed_by_membership_id uuid references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, child_membership_id)
);

create table public.kwilt_family_screen_time_selections (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.kwilt_family_screen_time_subjects(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 80),
  normalized_label text not null check (length(trim(normalized_label)) between 1 and 80),
  selection_ref uuid not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, normalized_label),
  unique (subject_id, selection_ref)
);

create table public.kwilt_family_screen_time_agreements (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.kwilt_family_screen_time_subjects(id) on delete cascade,
  selection_id uuid not null references public.kwilt_family_screen_time_selections(id) on delete restrict,
  rule jsonb not null,
  active boolean not null default false,
  version bigint not null default 1 check (version > 0),
  changed_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kwilt_family_screen_time_access_requests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.kwilt_family_screen_time_subjects(id) on delete cascade,
  selection_id uuid not null references public.kwilt_family_screen_time_selections(id) on delete restrict,
  kind text not null check (kind in ('use_now', 'more_time', 'something_wrong')),
  requested_minutes integer check (requested_minutes is null or requested_minutes between 1 and 1440),
  message text check (message is null or length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'cancelled', 'expired')),
  requested_by_user_id uuid not null references auth.users(id),
  decided_by_membership_id uuid references public.kwilt_household_memberships(id),
  decision_override_id uuid,
  expires_at timestamptz not null,
  decided_at timestamptz,
  operation_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id)
);

create table public.kwilt_family_screen_time_operations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  actor_membership_id uuid references public.kwilt_household_memberships(id),
  actor_user_id uuid not null references auth.users(id),
  operation_kind text not null check (operation_kind in (
    'selection_save', 'agreement_set', 'override_batch', 'override_cancel',
    'request_create', 'request_decide', 'device_receipt'
  )),
  operation_id text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (operation_id)
);

create table public.kwilt_family_screen_time_overrides (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.kwilt_family_screen_time_subjects(id) on delete cascade,
  selection_id uuid not null references public.kwilt_family_screen_time_selections(id) on delete restrict,
  action text not null check (action in ('block', 'allow')),
  time_basis text not null check (time_basis in ('wall_clock', 'foreground_usage')),
  starts_at timestamptz not null,
  expires_at timestamptz,
  usage_minutes integer,
  provenance text not null check (provenance in ('caregiver_direct', 'child_request_approved')),
  request_id uuid references public.kwilt_family_screen_time_access_requests(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  policy_version bigint not null check (policy_version > 0),
  operation_id text not null references public.kwilt_family_screen_time_operations(operation_id),
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  cancelled_by_membership_id uuid references public.kwilt_household_memberships(id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (time_basis = 'wall_clock' and expires_at > starts_at and usage_minutes is null)
    or (time_basis = 'foreground_usage' and expires_at is null and usage_minutes between 1 and 1440)
  )
);

alter table public.kwilt_family_screen_time_access_requests
  add constraint kwilt_family_screen_time_request_override_fk
  foreign key (decision_override_id) references public.kwilt_family_screen_time_overrides(id) on delete set null;

create table public.kwilt_family_screen_time_devices (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.kwilt_family_screen_time_subjects(id) on delete cascade,
  install_id text not null check (length(trim(install_id)) between 1 and 200),
  bound_user_id uuid not null references auth.users(id) on delete cascade,
  readiness text not null default 'pending' check (readiness in ('pending', 'ready', 'blocked', 'released')),
  authorization_status text not null default 'unknown'
    check (authorization_status in ('unknown', 'pending', 'authorized', 'denied', 'revoked')),
  last_seen_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, install_id)
);

create table public.kwilt_family_screen_time_device_receipts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.kwilt_family_screen_time_subjects(id) on delete cascade,
  device_id uuid not null references public.kwilt_family_screen_time_devices(id) on delete cascade,
  policy_version bigint not null check (policy_version > 0),
  outcome text not null check (outcome in ('received', 'applied', 'failed', 'expired', 'released')),
  failure_code text,
  occurred_at timestamptz not null,
  operation_id text not null,
  created_at timestamptz not null default now(),
  unique (operation_id)
);

create index kwilt_family_screen_time_agreements_subject on public.kwilt_family_screen_time_agreements(subject_id, active);
create index kwilt_family_screen_time_overrides_active on public.kwilt_family_screen_time_overrides(subject_id, status, expires_at);
create index kwilt_family_screen_time_requests_pending on public.kwilt_family_screen_time_access_requests(subject_id, status, created_at desc);
create index kwilt_family_screen_time_receipts_latest on public.kwilt_family_screen_time_device_receipts(subject_id, policy_version desc, occurred_at desc);

alter table public.kwilt_family_screen_time_subjects enable row level security;
alter table public.kwilt_family_screen_time_selections enable row level security;
alter table public.kwilt_family_screen_time_agreements enable row level security;
alter table public.kwilt_family_screen_time_overrides enable row level security;
alter table public.kwilt_family_screen_time_access_requests enable row level security;
alter table public.kwilt_family_screen_time_devices enable row level security;
alter table public.kwilt_family_screen_time_device_receipts enable row level security;
alter table public.kwilt_family_screen_time_operations enable row level security;

create or replace function public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id uuid)
returns public.kwilt_household_memberships
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_child public.kwilt_household_memberships;
  v_actor public.kwilt_household_memberships;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_child from public.kwilt_household_memberships
    where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_not_found'; end if;
  select * into v_actor from public.kwilt_current_household_membership(v_child.household_id);
  if v_actor.id is null or v_actor.role not in ('owner', 'caregiver') then
    raise exception 'household_caregiver_required';
  end if;
  if not exists (
    select 1 from public.kwilt_child_capability_activations a
    where a.household_id = v_child.household_id and a.child_membership_id = v_child.id
      and a.capability_id = 'screen-time'
      and a.state in ('pending_setup', 'active', 'pending_cleanup', 'blocked')
  ) then raise exception 'capability_activation_required'; end if;
  if v_actor.role = 'caregiver' and not exists (
    select 1 from public.kwilt_household_capability_grants g
    where g.household_id = v_child.household_id and g.caregiver_membership_id = v_actor.id
      and g.child_membership_id = v_child.id and g.capability_id = 'screen-time'
  ) then raise exception 'capability_grant_required'; end if;
  return v_actor;
end;
$$;

create or replace function public.kwilt_family_screen_time_subject_for_child(
  p_child_membership_id uuid,
  p_actor_membership_id uuid
)
returns public.kwilt_family_screen_time_subjects
language plpgsql security definer set search_path = ''
as $$
declare
  v_child public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
begin
  select * into v_child from public.kwilt_household_memberships where id = p_child_membership_id;
  insert into public.kwilt_family_screen_time_subjects
    (household_id, child_membership_id, changed_by_membership_id)
  values (v_child.household_id, v_child.id, p_actor_membership_id)
  on conflict (household_id, child_membership_id) do update
    set updated_at = public.kwilt_family_screen_time_subjects.updated_at
  returning * into v_subject;
  return v_subject;
end;
$$;

create or replace function public.get_kwilt_family_screen_time_snapshot(p_child_membership_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
begin
  v_actor := public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id);
  select * into v_subject from public.kwilt_family_screen_time_subjects
    where household_id = v_actor.household_id and child_membership_id = p_child_membership_id;
  return jsonb_build_object(
    'childMembershipId', p_child_membership_id,
    'subjectId', v_subject.id,
    'desiredPolicyVersion', coalesce(v_subject.desired_policy_version, 0),
    'selections', coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'label', s.label, 'selectionRef', s.selection_ref, 'status', s.status
    ) order by s.label) from public.kwilt_family_screen_time_selections s
      where s.subject_id = v_subject.id and s.status = 'active'), '[]'::jsonb),
    'agreements', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'selectionId', a.selection_id, 'rule', a.rule, 'active', a.active,
      'version', a.version, 'updatedAt', a.updated_at
    ) order by a.created_at) from public.kwilt_family_screen_time_agreements a
      where a.subject_id = v_subject.id), '[]'::jsonb),
    'activeOverrides', coalesce((select jsonb_agg(jsonb_build_object(
      'id', o.id, 'selectionId', o.selection_id, 'action', o.action,
      'timeBasis', o.time_basis, 'startsAt', o.starts_at, 'expiresAt', o.expires_at,
      'usageMinutes', o.usage_minutes, 'provenance', o.provenance,
      'policyVersion', o.policy_version, 'status', o.status
    ) order by o.created_at desc) from public.kwilt_family_screen_time_overrides o
      where o.subject_id = v_subject.id and o.status = 'active'
        and (o.time_basis = 'foreground_usage' or o.expires_at > now())), '[]'::jsonb),
    'pendingRequests', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'selectionId', r.selection_id, 'kind', r.kind,
      'requestedMinutes', r.requested_minutes, 'message', r.message,
      'status', r.status, 'expiresAt', r.expires_at, 'createdAt', r.created_at
    ) order by r.created_at desc) from public.kwilt_family_screen_time_access_requests r
      where r.subject_id = v_subject.id and r.status = 'pending' and r.expires_at > now()), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'readiness', d.readiness, 'authorizationStatus', d.authorization_status,
      'lastSeenAt', d.last_seen_at, 'releasedAt', d.released_at
    ) order by d.created_at) from public.kwilt_family_screen_time_devices d
      where d.subject_id = v_subject.id), '[]'::jsonb),
    'latestDeviceReceipt', (select jsonb_build_object(
      'policyVersion', r.policy_version, 'outcome', r.outcome, 'failureCode', r.failure_code,
      'occurredAt', r.occurred_at, 'deviceId', r.device_id
    ) from public.kwilt_family_screen_time_device_receipts r
      where r.subject_id = v_subject.id order by r.policy_version desc, r.occurred_at desc limit 1)
  );
end;
$$;

create or replace function public.save_kwilt_family_screen_time_selection(
  p_child_membership_id uuid, p_label text, p_selection_ref uuid, p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_selection public.kwilt_family_screen_time_selections;
  v_existing jsonb;
  v_result jsonb;
begin
  v_actor := public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id);
  if nullif(trim(p_label), '') is null or p_selection_ref is null or nullif(trim(p_operation_id), '') is null
    then raise exception 'invalid_family_screen_time_selection'; end if;
  select result into v_existing from public.kwilt_family_screen_time_operations
    where operation_id = p_operation_id and household_id = v_actor.household_id;
  if v_existing is not null then return v_existing; end if;
  v_subject := public.kwilt_family_screen_time_subject_for_child(p_child_membership_id, v_actor.id);
  insert into public.kwilt_family_screen_time_selections
    (subject_id, label, normalized_label, selection_ref, created_by_membership_id)
  values (v_subject.id, trim(p_label), lower(trim(p_label)), p_selection_ref, v_actor.id)
  on conflict (subject_id, normalized_label) do update set
    label = excluded.label, selection_ref = excluded.selection_ref, status = 'active', updated_at = now()
  returning * into v_selection;
  v_result := jsonb_build_object('selectionId', v_selection.id, 'childMembershipId', p_child_membership_id,
    'label', v_selection.label, 'selectionRef', v_selection.selection_ref, 'operationId', p_operation_id);
  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_membership_id, actor_user_id, operation_kind, operation_id, result)
  values (v_actor.household_id, v_actor.id, auth.uid(), 'selection_save', p_operation_id, v_result);
  return v_result;
end;
$$;

create or replace function public.set_kwilt_family_screen_time_agreement(
  p_child_membership_id uuid, p_agreement_id uuid, p_selection_id uuid,
  p_expected_version bigint, p_rule jsonb, p_active boolean, p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_agreement public.kwilt_family_screen_time_agreements;
  v_existing jsonb;
  v_result jsonb;
begin
  v_actor := public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id);
  if jsonb_typeof(p_rule) <> 'object' or nullif(trim(p_operation_id), '') is null
    then raise exception 'invalid_family_screen_time_agreement'; end if;
  select result into v_existing from public.kwilt_family_screen_time_operations
    where operation_id = p_operation_id and household_id = v_actor.household_id;
  if v_existing is not null then return v_existing; end if;
  v_subject := public.kwilt_family_screen_time_subject_for_child(p_child_membership_id, v_actor.id);
  if not exists (select 1 from public.kwilt_family_screen_time_selections
    where id = p_selection_id and subject_id = v_subject.id and status = 'active')
    then raise exception 'selection_subject_mismatch'; end if;
  if p_agreement_id is null then
    if p_expected_version <> 0 then raise exception 'family_screen_time_version_mismatch'; end if;
    insert into public.kwilt_family_screen_time_agreements
      (subject_id, selection_id, rule, active, changed_by_membership_id)
    values (v_subject.id, p_selection_id, p_rule, p_active, v_actor.id) returning * into v_agreement;
  else
    select * into v_agreement from public.kwilt_family_screen_time_agreements
      where id = p_agreement_id and subject_id = v_subject.id for update;
    if v_agreement.id is null or v_agreement.version <> p_expected_version
      then raise exception 'family_screen_time_version_mismatch'; end if;
    update public.kwilt_family_screen_time_agreements set selection_id = p_selection_id,
      rule = p_rule, active = p_active, version = version + 1,
      changed_by_membership_id = v_actor.id, updated_at = now()
      where id = v_agreement.id returning * into v_agreement;
  end if;
  update public.kwilt_family_screen_time_subjects set
    desired_policy_version = desired_policy_version + 1,
    changed_by_membership_id = v_actor.id, updated_at = now()
    where id = v_subject.id returning * into v_subject;
  v_result := jsonb_build_object('agreementId', v_agreement.id, 'childMembershipId', p_child_membership_id,
    'selectionId', v_agreement.selection_id, 'rule', v_agreement.rule, 'active', v_agreement.active,
    'version', v_agreement.version, 'desiredPolicyVersion', v_subject.desired_policy_version,
    'operationId', p_operation_id);
  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_membership_id, actor_user_id, operation_kind, operation_id, result)
  values (v_actor.household_id, v_actor.id, auth.uid(), 'agreement_set', p_operation_id, v_result);
  return v_result;
end;
$$;

create or replace function public.apply_kwilt_family_screen_time_override_batch(
  p_items jsonb, p_action text, p_time_basis text, p_expires_at timestamptz,
  p_usage_minutes integer, p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_item jsonb;
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_household_id uuid;
  v_existing jsonb;
  v_results jsonb := '[]'::jsonb;
  v_override public.kwilt_family_screen_time_overrides;
begin
  perform public.kwilt_require_permanent_user();
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or p_action not in ('block', 'allow')
    or nullif(trim(p_operation_id), '') is null then raise exception 'invalid_family_screen_time_override'; end if;
  if p_time_basis = 'foreground_usage' then raise exception 'foreground_usage_not_yet_supported'; end if;
  if p_time_basis <> 'wall_clock' or p_expires_at <= now() or p_expires_at > now() + interval '7 days'
    or p_usage_minutes is not null then raise exception 'invalid_family_screen_time_override'; end if;
  if (select count(*) from jsonb_array_elements(p_items)) <>
     (select count(distinct item->>'childMembershipId') from jsonb_array_elements(p_items) item)
    then raise exception 'duplicate_child_in_override_batch'; end if;

  -- Re-check authority for every target before returning an idempotent result.
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_actor := public.kwilt_family_screen_time_caregiver_for_child((v_item->>'childMembershipId')::uuid);
    if v_household_id is null then v_household_id := v_actor.household_id;
    elsif v_household_id <> v_actor.household_id then raise exception 'mixed_household_override_batch'; end if;
  end loop;
  select result into v_existing from public.kwilt_family_screen_time_operations
    where operation_id = p_operation_id and household_id = v_household_id and actor_user_id = auth.uid();
  if v_existing is not null then return v_existing; end if;

  -- Validate the entire batch before writing any row; function failure rolls back the transaction.
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_subject from public.kwilt_family_screen_time_subjects
      where household_id = v_household_id
        and child_membership_id = (v_item->>'childMembershipId')::uuid for update;
    if v_subject.id is null or v_subject.desired_policy_version <> (v_item->>'expectedVersion')::bigint
      then raise exception 'family_screen_time_version_mismatch'; end if;
    if not exists (select 1 from public.kwilt_family_screen_time_selections s
      where s.id = (v_item->>'selectionId')::uuid and s.subject_id = v_subject.id and s.status = 'active')
      then raise exception 'selection_subject_mismatch'; end if;
  end loop;

  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_membership_id, actor_user_id, operation_kind, operation_id, result)
  values (v_household_id, v_actor.id, auth.uid(), 'override_batch', p_operation_id, '{}'::jsonb);

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_subject from public.kwilt_family_screen_time_subjects
      where child_membership_id = (v_item->>'childMembershipId')::uuid for update;
    update public.kwilt_family_screen_time_subjects set
      desired_policy_version = desired_policy_version + 1,
      changed_by_membership_id = v_actor.id, updated_at = now()
      where id = v_subject.id returning * into v_subject;
    insert into public.kwilt_family_screen_time_overrides
      (subject_id, selection_id, action, time_basis, starts_at, expires_at, usage_minutes,
       provenance, status, policy_version, operation_id, created_by_membership_id)
    values (v_subject.id, (v_item->>'selectionId')::uuid, p_action, p_time_basis, now(),
      p_expires_at, p_usage_minutes, 'caregiver_direct', 'active',
      v_subject.desired_policy_version, p_operation_id, v_actor.id)
    returning * into v_override;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'overrideId', v_override.id, 'childMembershipId', v_subject.child_membership_id,
      'selectionId', v_override.selection_id, 'action', v_override.action,
      'timeBasis', v_override.time_basis, 'startsAt', v_override.starts_at,
      'expiresAt', v_override.expires_at, 'policyVersion', v_override.policy_version));
  end loop;
  v_existing := jsonb_build_object('operationId', p_operation_id, 'overrides', v_results);
  update public.kwilt_family_screen_time_operations set result = v_existing where operation_id = p_operation_id;
  return v_existing;
end;
$$;

create or replace function public.cancel_kwilt_family_screen_time_override(
  p_child_membership_id uuid, p_override_id uuid, p_expected_version bigint, p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_override public.kwilt_family_screen_time_overrides;
  v_existing jsonb;
  v_result jsonb;
begin
  v_actor := public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id);
  select result into v_existing from public.kwilt_family_screen_time_operations
    where operation_id = p_operation_id and household_id = v_actor.household_id;
  if v_existing is not null then return v_existing; end if;
  select * into v_subject from public.kwilt_family_screen_time_subjects
    where household_id = v_actor.household_id and child_membership_id = p_child_membership_id for update;
  if v_subject.id is null or v_subject.desired_policy_version <> p_expected_version
    then raise exception 'family_screen_time_version_mismatch'; end if;
  select * into v_override from public.kwilt_family_screen_time_overrides
    where id = p_override_id and subject_id = v_subject.id and status = 'active' for update;
  if v_override.id is null then raise exception 'family_screen_time_override_not_active'; end if;
  update public.kwilt_family_screen_time_overrides set status = 'cancelled',
    cancelled_by_membership_id = v_actor.id, cancelled_at = now(), updated_at = now()
    where id = v_override.id returning * into v_override;
  update public.kwilt_family_screen_time_subjects set
    desired_policy_version = desired_policy_version + 1,
    changed_by_membership_id = v_actor.id, updated_at = now()
    where id = v_subject.id returning * into v_subject;
  v_result := jsonb_build_object('overrideId', v_override.id, 'childMembershipId', p_child_membership_id,
    'status', v_override.status, 'desiredPolicyVersion', v_subject.desired_policy_version,
    'operationId', p_operation_id);
  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_membership_id, actor_user_id, operation_kind, operation_id, result)
  values (v_actor.household_id, v_actor.id, auth.uid(), 'override_cancel', p_operation_id, v_result);
  return v_result;
end;
$$;

create or replace function public.create_kwilt_family_screen_time_access_request(
  p_child_membership_id uuid, p_selection_id uuid, p_kind text,
  p_requested_minutes integer, p_message text, p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_child public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_request public.kwilt_family_screen_time_access_requests;
  v_result jsonb;
begin
  select * into v_child from public.kwilt_household_memberships
    where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_not_found'; end if;
  if not exists (select 1 from public.kwilt_person_auth_bindings binding
    where binding.person_id = v_child.person_id and binding.user_id = auth.uid()
      and binding.user_id = v_user_id and binding.status = 'active')
    then raise exception 'child_device_authentication_required'; end if;
  select * into v_subject from public.kwilt_family_screen_time_subjects
    where household_id = v_child.household_id and child_membership_id = v_child.id;
  if p_kind not in ('use_now', 'more_time', 'something_wrong')
    or p_requested_minutes not between 1 and 1440 or nullif(trim(p_operation_id), '') is null
    then raise exception 'invalid_family_screen_time_request'; end if;
  select r.* into v_request from public.kwilt_family_screen_time_access_requests r
    where r.operation_id = p_operation_id and r.subject_id = v_subject.id;
  if v_request.id is not null then
    select result into v_result from public.kwilt_family_screen_time_operations
      where operation_id = p_operation_id and household_id = v_child.household_id and actor_user_id = v_user_id;
    return v_result;
  end if;
  if not exists (select 1 from public.kwilt_family_screen_time_selections s
    where s.id = p_selection_id and s.subject_id = v_subject.id and s.status = 'active')
    then raise exception 'selection_subject_mismatch'; end if;
  insert into public.kwilt_family_screen_time_access_requests
    (subject_id, selection_id, kind, requested_minutes, message, requested_by_user_id,
     expires_at, operation_id)
  values (v_subject.id, p_selection_id, p_kind, p_requested_minutes,
    nullif(trim(p_message), ''), v_user_id, now() + interval '24 hours', p_operation_id)
  returning * into v_request;
  v_result := jsonb_build_object('requestId', v_request.id, 'childMembershipId', v_child.id,
    'selectionId', v_request.selection_id, 'kind', v_request.kind,
    'requestedMinutes', v_request.requested_minutes, 'status', v_request.status,
    'expiresAt', v_request.expires_at, 'operationId', p_operation_id);
  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_user_id, operation_kind, operation_id, result)
  values (v_child.household_id, v_user_id, 'request_create', p_operation_id, v_result);
  return v_result;
end;
$$;

create or replace function public.decide_kwilt_family_screen_time_access_request(
  p_child_membership_id uuid, p_request_id uuid, p_decision text,
  p_allow_minutes integer, p_expected_version bigint, p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_request public.kwilt_family_screen_time_access_requests;
  v_override public.kwilt_family_screen_time_overrides;
  v_existing jsonb;
  v_result jsonb;
begin
  v_actor := public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id);
  if p_decision not in ('approved', 'denied') or nullif(trim(p_operation_id), '') is null
    then raise exception 'invalid_family_screen_time_request_decision'; end if;
  select result into v_existing from public.kwilt_family_screen_time_operations
    where operation_id = p_operation_id and household_id = v_actor.household_id;
  if v_existing is not null then return v_existing; end if;
  select * into v_subject from public.kwilt_family_screen_time_subjects
    where household_id = v_actor.household_id and child_membership_id = p_child_membership_id for update;
  if v_subject.id is null or v_subject.desired_policy_version <> p_expected_version
    then raise exception 'family_screen_time_version_mismatch'; end if;
  select * into v_request from public.kwilt_family_screen_time_access_requests
    where id = p_request_id and subject_id = v_subject.id and status = 'pending' and expires_at > now() for update;
  if v_request.id is null then raise exception 'family_screen_time_request_not_pending'; end if;
  if p_decision = 'approved' and p_allow_minutes not between 1 and 1440
    then raise exception 'invalid_family_screen_time_request_decision'; end if;
  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_membership_id, actor_user_id, operation_kind, operation_id, result)
  values (v_actor.household_id, v_actor.id, auth.uid(), 'request_decide', p_operation_id, '{}'::jsonb);
  if p_decision = 'approved' then
    update public.kwilt_family_screen_time_subjects set
      desired_policy_version = desired_policy_version + 1,
      changed_by_membership_id = v_actor.id, updated_at = now()
      where id = v_subject.id returning * into v_subject;
    insert into public.kwilt_family_screen_time_overrides
      (subject_id, selection_id, action, time_basis, starts_at, expires_at, provenance,
       request_id, status, policy_version, operation_id, created_by_membership_id)
    values (v_subject.id, v_request.selection_id, 'allow', 'wall_clock', now(),
      now() + make_interval(mins => p_allow_minutes), 'child_request_approved',
      v_request.id, 'active', v_subject.desired_policy_version, p_operation_id, v_actor.id)
    returning * into v_override;
  end if;
  update public.kwilt_family_screen_time_access_requests set status = p_decision,
    decided_by_membership_id = v_actor.id, decision_override_id = v_override.id,
    decided_at = now(), updated_at = now() where id = v_request.id;
  v_result := jsonb_build_object('requestId', v_request.id, 'childMembershipId', p_child_membership_id,
    'decision', p_decision, 'overrideId', v_override.id,
    'desiredPolicyVersion', v_subject.desired_policy_version, 'operationId', p_operation_id);
  update public.kwilt_family_screen_time_operations set result = v_result where operation_id = p_operation_id;
  return v_result;
end;
$$;

create or replace function public.record_kwilt_family_screen_time_device_receipt(
  p_child_membership_id uuid, p_install_id text, p_policy_version bigint, p_outcome text,
  p_occurred_at timestamptz, p_operation_id text, p_failure_code text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_child public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_device public.kwilt_family_screen_time_devices;
  v_receipt public.kwilt_family_screen_time_device_receipts;
begin
  if p_outcome not in ('received', 'applied', 'failed', 'expired', 'released')
    or p_policy_version <= 0 or nullif(trim(p_operation_id), '') is null
    then raise exception 'invalid_family_screen_time_receipt'; end if;
  select * into v_child from public.kwilt_household_memberships
    where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_not_found'; end if;
  if not exists (select 1 from public.kwilt_person_auth_bindings binding
    where binding.person_id = v_child.person_id and binding.user_id = auth.uid()
      and binding.user_id = v_user_id and binding.status = 'active')
    then raise exception 'child_device_authentication_required'; end if;
  select * into v_subject from public.kwilt_family_screen_time_subjects
    where household_id = v_child.household_id and child_membership_id = v_child.id;
  if v_subject.id is null or p_policy_version > v_subject.desired_policy_version
    then raise exception 'family_screen_time_policy_version_invalid'; end if;
  select * into v_device from public.kwilt_family_screen_time_devices
    where subject_id = v_subject.id and install_id = p_install_id and bound_user_id = v_user_id for update;
  if v_device.id is null then raise exception 'family_screen_time_device_not_bound'; end if;
  select * into v_receipt from public.kwilt_family_screen_time_device_receipts
    where operation_id = p_operation_id and subject_id = v_subject.id and device_id = v_device.id;
  if v_receipt.id is null then
    insert into public.kwilt_family_screen_time_device_receipts
      (subject_id, device_id, policy_version, outcome, failure_code, occurred_at, operation_id)
    values (v_subject.id, v_device.id, p_policy_version, p_outcome,
      nullif(trim(p_failure_code), ''), p_occurred_at, p_operation_id) returning * into v_receipt;
  end if;
  update public.kwilt_family_screen_time_devices set
    readiness = case when v_receipt.outcome = 'released' then 'released'
      when v_receipt.outcome = 'failed' then 'blocked' else 'ready' end,
    last_seen_at = greatest(coalesce(last_seen_at, v_receipt.occurred_at), v_receipt.occurred_at),
    released_at = case when v_receipt.outcome = 'released' then v_receipt.occurred_at else released_at end,
    updated_at = now() where id = v_device.id;
  return jsonb_build_object('receiptId', v_receipt.id, 'deviceId', v_receipt.device_id,
    'policyVersion', v_receipt.policy_version, 'outcome', v_receipt.outcome,
    'failureCode', v_receipt.failure_code, 'occurredAt', v_receipt.occurred_at,
    'operationId', v_receipt.operation_id);
end;
$$;

revoke all on public.kwilt_family_screen_time_subjects from anon, authenticated;
revoke all on public.kwilt_family_screen_time_selections from anon, authenticated;
revoke all on public.kwilt_family_screen_time_agreements from anon, authenticated;
revoke all on public.kwilt_family_screen_time_overrides from anon, authenticated;
revoke all on public.kwilt_family_screen_time_access_requests from anon, authenticated;
revoke all on public.kwilt_family_screen_time_devices from anon, authenticated;
revoke all on public.kwilt_family_screen_time_device_receipts from anon, authenticated;
revoke all on public.kwilt_family_screen_time_operations from anon, authenticated;

revoke execute on function public.kwilt_family_screen_time_caregiver_for_child(uuid) from public, anon;
revoke execute on function public.kwilt_family_screen_time_subject_for_child(uuid, uuid) from public, anon;
revoke execute on function public.get_kwilt_family_screen_time_snapshot(uuid) from public, anon;
revoke execute on function public.save_kwilt_family_screen_time_selection(uuid, text, uuid, text) from public, anon;
revoke execute on function public.set_kwilt_family_screen_time_agreement(uuid, uuid, uuid, bigint, jsonb, boolean, text) from public, anon;
revoke execute on function public.apply_kwilt_family_screen_time_override_batch(jsonb, text, text, timestamptz, integer, text) from public, anon;
revoke execute on function public.cancel_kwilt_family_screen_time_override(uuid, uuid, bigint, text) from public, anon;
revoke execute on function public.create_kwilt_family_screen_time_access_request(uuid, uuid, text, integer, text, text) from public, anon;
revoke execute on function public.decide_kwilt_family_screen_time_access_request(uuid, uuid, text, integer, bigint, text) from public, anon;
revoke execute on function public.record_kwilt_family_screen_time_device_receipt(uuid, text, bigint, text, timestamptz, text, text) from public, anon;

grant execute on function public.get_kwilt_family_screen_time_snapshot(uuid) to authenticated;
grant execute on function public.save_kwilt_family_screen_time_selection(uuid, text, uuid, text) to authenticated;
grant execute on function public.set_kwilt_family_screen_time_agreement(uuid, uuid, uuid, bigint, jsonb, boolean, text) to authenticated;
grant execute on function public.apply_kwilt_family_screen_time_override_batch(jsonb, text, text, timestamptz, integer, text) to authenticated;
grant execute on function public.cancel_kwilt_family_screen_time_override(uuid, uuid, bigint, text) to authenticated;
grant execute on function public.create_kwilt_family_screen_time_access_request(uuid, uuid, text, integer, text, text) to authenticated;
grant execute on function public.decide_kwilt_family_screen_time_access_request(uuid, uuid, text, integer, bigint, text) to authenticated;
grant execute on function public.record_kwilt_family_screen_time_device_receipt(uuid, text, bigint, text, timestamptz, text, text) to authenticated;

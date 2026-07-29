-- Canonical Kwilt Household foundation.
-- Household membership never grants access to capability-owned personal data.

create extension if not exists pgcrypto;

create table public.kwilt_people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  kind text not null check (kind in ('adult', 'dependent')),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kwilt_person_auth_bindings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.kwilt_people(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.kwilt_households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kwilt_household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  person_id uuid not null references public.kwilt_people(id) on delete restrict,
  role text not null check (role in ('owner', 'caregiver', 'child')),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (household_id, person_id)
);

create unique index kwilt_household_one_active_owner
  on public.kwilt_household_memberships (household_id)
  where role = 'owner' and status = 'active';

create table public.kwilt_child_capability_catalog (
  capability_id text primary key,
  display_name text not null,
  available_for_activation boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.kwilt_child_capability_catalog
  (capability_id, display_name, available_for_activation)
values
  ('todos', 'To-dos', true),
  ('screen-time', 'Screen Time', true);

create table public.kwilt_child_capability_activations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  child_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  capability_id text not null references public.kwilt_child_capability_catalog(capability_id),
  state text not null default 'inactive'
    check (state in ('inactive', 'pending_setup', 'active', 'pending_cleanup', 'blocked')),
  changed_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  changed_at timestamptz not null default now(),
  unique (household_id, child_membership_id, capability_id)
);

create table public.kwilt_household_capability_grants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  caregiver_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  child_membership_id uuid not null references public.kwilt_household_memberships(id) on delete cascade,
  capability_id text not null references public.kwilt_child_capability_catalog(capability_id),
  granted_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  unique (household_id, caregiver_membership_id, child_membership_id, capability_id)
);

create table public.kwilt_household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  invited_role text not null default 'caregiver' check (invited_role = 'caregiver'),
  code_hash text not null unique,
  invited_email text,
  created_by_membership_id uuid not null references public.kwilt_household_memberships(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_by_membership_id uuid references public.kwilt_household_memberships(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table public.kwilt_household_audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  actor_membership_id uuid references public.kwilt_household_memberships(id),
  event_type text not null,
  subject_membership_id uuid references public.kwilt_household_memberships(id),
  capability_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.kwilt_people enable row level security;
alter table public.kwilt_person_auth_bindings enable row level security;
alter table public.kwilt_households enable row level security;
alter table public.kwilt_household_memberships enable row level security;
alter table public.kwilt_child_capability_catalog enable row level security;
alter table public.kwilt_child_capability_activations enable row level security;
alter table public.kwilt_household_capability_grants enable row level security;
alter table public.kwilt_household_invites enable row level security;
alter table public.kwilt_household_audit_events enable row level security;

create or replace function public.kwilt_require_permanent_user()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;
  return v_user_id;
end;
$$;

create or replace function public.kwilt_current_household_membership(p_household_id uuid)
returns public.kwilt_household_memberships
language sql
stable
security definer
set search_path = ''
as $$
  select membership.*
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding
    on binding.person_id = membership.person_id
   and binding.status = 'active'
  where membership.household_id = p_household_id
    and membership.status = 'active'
    and binding.user_id = auth.uid()
  limit 1
$$;

create or replace function public.kwilt_is_active_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_household_memberships membership
    join public.kwilt_person_auth_bindings binding
      on binding.person_id = membership.person_id
     and binding.status = 'active'
    where membership.household_id = p_household_id
      and membership.status = 'active'
      and binding.user_id = auth.uid()
  )
$$;

create or replace function public.kwilt_can_view_child_capability(
  p_household_id uuid,
  p_child_membership_id uuid,
  p_capability_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
begin
  select * into v_actor from public.kwilt_current_household_membership(p_household_id);
  if v_actor.id is null then return false; end if;
  return v_actor.role = 'owner'
    or v_actor.id = p_child_membership_id
    or exists (
      select 1 from public.kwilt_household_capability_grants grant_row
      where grant_row.household_id = p_household_id
        and grant_row.caregiver_membership_id = v_actor.id
        and grant_row.child_membership_id = p_child_membership_id
        and grant_row.capability_id = p_capability_id
    );
end;
$$;

create or replace function public.kwilt_can_view_capability_grant(
  p_household_id uuid,
  p_caregiver_membership_id uuid,
  p_child_membership_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
begin
  select * into v_actor from public.kwilt_current_household_membership(p_household_id);
  return v_actor.id is not null and (
    v_actor.role = 'owner'
    or v_actor.id = p_caregiver_membership_id
    or v_actor.id = p_child_membership_id
  );
end;
$$;

create policy kwilt_people_household_read on public.kwilt_people
for select to authenticated
using (
  exists (
    select 1 from public.kwilt_household_memberships subject
    where subject.person_id = kwilt_people.id
      and subject.status = 'active'
      and public.kwilt_is_active_household_member(subject.household_id)
  )
);

create policy kwilt_auth_binding_self_read on public.kwilt_person_auth_bindings
for select to authenticated using (user_id = auth.uid() and status = 'active');

create policy kwilt_households_member_read on public.kwilt_households
for select to authenticated using (public.kwilt_is_active_household_member(id));

create policy kwilt_memberships_member_read on public.kwilt_household_memberships
for select to authenticated using (public.kwilt_is_active_household_member(household_id));

create policy kwilt_capability_catalog_authenticated_read on public.kwilt_child_capability_catalog
for select to authenticated using (available_for_activation = true);

create policy kwilt_child_activations_member_read on public.kwilt_child_capability_activations
for select to authenticated using (
  public.kwilt_can_view_child_capability(household_id, child_membership_id, capability_id)
);

create policy kwilt_capability_grants_member_read on public.kwilt_household_capability_grants
for select to authenticated using (
  public.kwilt_can_view_capability_grant(household_id, caregiver_membership_id, child_membership_id)
);

create policy kwilt_audit_member_read on public.kwilt_household_audit_events
for select to authenticated using (
  (public.kwilt_current_household_membership(household_id)).role = 'owner'
);

grant select on public.kwilt_people to authenticated;
grant select on public.kwilt_person_auth_bindings to authenticated;
grant select on public.kwilt_households to authenticated;
grant select on public.kwilt_household_memberships to authenticated;
grant select on public.kwilt_child_capability_catalog to authenticated;
grant select on public.kwilt_child_capability_activations to authenticated;
grant select on public.kwilt_household_capability_grants to authenticated;
grant select on public.kwilt_household_audit_events to authenticated;

revoke all on public.kwilt_household_invites from anon, authenticated;
revoke insert, update, delete on public.kwilt_people from anon, authenticated;
revoke insert, update, delete on public.kwilt_person_auth_bindings from anon, authenticated;
revoke insert, update, delete on public.kwilt_households from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_memberships from anon, authenticated;
revoke insert, update, delete on public.kwilt_child_capability_catalog from anon, authenticated;
revoke insert, update, delete on public.kwilt_child_capability_activations from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_capability_grants from anon, authenticated;
revoke insert, update, delete on public.kwilt_household_audit_events from anon, authenticated;

create or replace function public.kwilt_ensure_household_owner(
  p_household_id uuid,
  p_display_name text default 'Kwilter'
)
returns public.kwilt_household_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_membership public.kwilt_household_memberships;
  v_person_id uuid;
begin
  if p_household_id is not null then
    select * into v_membership
    from public.kwilt_current_household_membership(p_household_id);
    if v_membership.id is null or v_membership.role <> 'owner' then
      raise exception 'household_owner_required';
    end if;
    return v_membership;
  end if;

  select membership.* into v_membership
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding on binding.person_id = membership.person_id
  where binding.user_id = v_user_id
    and binding.status = 'active'
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if v_membership.id is not null then
    if v_membership.role <> 'owner' then
      raise exception 'household_owner_required';
    end if;
    return v_membership;
  end if;

  insert into public.kwilt_people (display_name, kind, created_by_user_id)
  values (coalesce(nullif(trim(p_display_name), ''), 'Kwilter'), 'adult', v_user_id)
  returning id into v_person_id;

  insert into public.kwilt_person_auth_bindings (person_id, user_id)
  values (v_person_id, v_user_id);

  insert into public.kwilt_households (name, created_by_user_id)
  values ('My household', v_user_id)
  returning id into p_household_id;

  insert into public.kwilt_household_memberships (household_id, person_id, role)
  values (p_household_id, v_person_id, 'owner')
  returning * into v_membership;

  return v_membership;
end;
$$;

create or replace function public.get_kwilt_household_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_membership public.kwilt_household_memberships;
begin
  select membership.* into v_membership
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding on binding.person_id = membership.person_id
  where binding.user_id = v_user_id
    and binding.status = 'active'
    and membership.status = 'active'
  order by membership.joined_at
  limit 1;

  if v_membership.id is null then
    return jsonb_build_object('household', null, 'currentMembershipId', null, 'members', '[]'::jsonb,
      'activations', '[]'::jsonb, 'grants', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'household', (select jsonb_build_object('id', h.id, 'name', h.name) from public.kwilt_households h where h.id = v_membership.household_id),
    'currentMembershipId', v_membership.id,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'personId', p.id, 'displayName', p.display_name, 'kind', p.kind, 'role', m.role
      ) order by m.joined_at)
      from public.kwilt_household_memberships m
      join public.kwilt_people p on p.id = m.person_id
      where m.household_id = v_membership.household_id and m.status = 'active'
    ), '[]'::jsonb),
    'activations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'childMembershipId', a.child_membership_id, 'capabilityId', a.capability_id, 'state', a.state
      )) from public.kwilt_child_capability_activations a
      where a.household_id = v_membership.household_id
        and public.kwilt_can_view_child_capability(a.household_id, a.child_membership_id, a.capability_id)
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'caregiverMembershipId', g.caregiver_membership_id, 'childMembershipId', g.child_membership_id,
        'capabilityId', g.capability_id
      )) from public.kwilt_household_capability_grants g
      where g.household_id = v_membership.household_id
        and public.kwilt_can_view_capability_grant(g.household_id, g.caregiver_membership_id, g.child_membership_id)
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.add_kwilt_dependent(
  p_household_id uuid,
  p_display_name text,
  p_owner_display_name text default 'Kwilter'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_owner public.kwilt_household_memberships;
  v_person_id uuid;
  v_child public.kwilt_household_memberships;
begin
  if length(trim(coalesce(p_display_name, ''))) not between 1 and 80 then
    raise exception 'dependent_name_required';
  end if;
  v_owner := public.kwilt_ensure_household_owner(p_household_id, p_owner_display_name);
  insert into public.kwilt_people (display_name, kind, created_by_user_id)
  values (trim(p_display_name), 'dependent', v_user_id) returning id into v_person_id;
  insert into public.kwilt_household_memberships (household_id, person_id, role)
  values (v_owner.household_id, v_person_id, 'child') returning * into v_child;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (v_owner.household_id, v_owner.id, 'dependent_added', v_child.id);
  return public.get_kwilt_household_snapshot();
end;
$$;

create or replace function public.set_kwilt_child_capability_activation(
  p_child_membership_id uuid,
  p_capability_id text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_child public.kwilt_household_memberships;
  v_actor public.kwilt_household_memberships;
  v_state text;
begin
  select * into v_child from public.kwilt_household_memberships
  where id = p_child_membership_id and role = 'child' and status = 'active';
  if v_child.id is null then raise exception 'child_not_found'; end if;
  select * into v_actor from public.kwilt_current_household_membership(v_child.household_id);
  if v_actor.id is null then raise exception 'authentication_required'; end if;
  if v_actor.role <> 'owner' and not exists (
    select 1 from public.kwilt_household_capability_grants g
    where g.household_id = v_child.household_id
      and g.caregiver_membership_id = v_actor.id
      and g.child_membership_id = v_child.id
      and g.capability_id = p_capability_id
  ) then
    raise exception 'capability_grant_required';
  end if;
  if not exists (select 1 from public.kwilt_child_capability_catalog c
    where c.capability_id = p_capability_id and c.available_for_activation) then
    raise exception 'capability_not_available';
  end if;
  v_state := case
    when p_enabled and p_capability_id = 'screen-time' then 'pending_setup'
    when p_enabled then 'active'
    when p_capability_id = 'screen-time' and exists (
      select 1 from public.kwilt_child_capability_activations a
      where a.child_membership_id = v_child.id and a.capability_id = p_capability_id
        and a.state in ('active', 'pending_setup', 'blocked')
    ) then 'pending_cleanup'
    else 'inactive'
  end;
  insert into public.kwilt_child_capability_activations
    (household_id, child_membership_id, capability_id, state, changed_by_membership_id)
  values (v_child.household_id, v_child.id, p_capability_id, v_state, v_actor.id)
  on conflict (household_id, child_membership_id, capability_id) do update
    set state = excluded.state, changed_by_membership_id = excluded.changed_by_membership_id, changed_at = now();
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, capability_id, details)
  values (v_child.household_id, v_actor.id, 'child_capability_changed', v_child.id,
    p_capability_id, jsonb_build_object('enabled', p_enabled, 'state', v_state));
  return public.get_kwilt_household_snapshot();
end;
$$;

create or replace function public.set_kwilt_household_capability_grant(
  p_caregiver_membership_id uuid,
  p_child_membership_id uuid,
  p_capability_id text,
  p_granted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_child public.kwilt_household_memberships;
  v_caregiver public.kwilt_household_memberships;
  v_owner public.kwilt_household_memberships;
begin
  select * into v_child from public.kwilt_household_memberships where id = p_child_membership_id and role = 'child' and status = 'active';
  select * into v_caregiver from public.kwilt_household_memberships where id = p_caregiver_membership_id and role = 'caregiver' and status = 'active';
  if v_child.id is null or v_caregiver.id is null or v_child.household_id <> v_caregiver.household_id then
    raise exception 'household_member_not_found';
  end if;
  select * into v_owner from public.kwilt_current_household_membership(v_child.household_id);
  if v_owner.id is null or v_owner.role <> 'owner' then raise exception 'household_owner_required'; end if;
  if p_granted then
    insert into public.kwilt_household_capability_grants
      (household_id, caregiver_membership_id, child_membership_id, capability_id, granted_by_membership_id)
    values (v_child.household_id, v_caregiver.id, v_child.id, p_capability_id, v_owner.id)
    on conflict do nothing;
  else
    delete from public.kwilt_household_capability_grants
    where household_id = v_child.household_id and caregiver_membership_id = v_caregiver.id
      and child_membership_id = v_child.id and capability_id = p_capability_id;
  end if;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id, capability_id, details)
  values (v_child.household_id, v_owner.id, 'capability_grant_changed', v_caregiver.id,
    p_capability_id, jsonb_build_object('childMembershipId', v_child.id, 'granted', p_granted));
  return public.get_kwilt_household_snapshot();
end;
$$;

create or replace function public.create_kwilt_household_invite(
  p_household_id uuid,
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
  v_code text := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  v_invite_id uuid;
begin
  perform public.kwilt_require_permanent_user();
  v_owner := public.kwilt_ensure_household_owner(p_household_id, p_owner_display_name);
  insert into public.kwilt_household_invites
    (household_id, code_hash, invited_email, created_by_membership_id, expires_at)
  values (v_owner.household_id, encode(extensions.digest(v_code, 'sha256'), 'hex'), nullif(lower(trim(p_invited_email)), ''), v_owner.id, now() + interval '7 days')
  returning id into v_invite_id;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, details)
  values (v_owner.household_id, v_owner.id, 'caregiver_invited', jsonb_build_object('inviteId', v_invite_id));
  return jsonb_build_object('code', v_code, 'expiresAt', now() + interval '7 days');
end;
$$;

create or replace function public.accept_kwilt_household_invite(
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
begin
  select * into v_invite from public.kwilt_household_invites
  where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex')
    and status = 'pending' and expires_at > now()
  for update;
  if v_invite.id is null then raise exception 'invite_not_found_or_expired'; end if;
  if exists (
    select 1
    from public.kwilt_person_auth_bindings existing_binding
    join public.kwilt_household_memberships existing_membership
      on existing_membership.person_id = existing_binding.person_id
     and existing_membership.status = 'active'
    where existing_binding.user_id = v_user_id and existing_binding.status = 'active'
  ) then
    raise exception 'already_in_household';
  end if;
  if exists (select 1 from public.kwilt_person_auth_bindings where user_id = v_user_id and status = 'active') then
    select person_id into v_person_id from public.kwilt_person_auth_bindings where user_id = v_user_id and status = 'active';
  else
    insert into public.kwilt_people (display_name, kind, created_by_user_id)
    values (coalesce(nullif(trim(p_display_name), ''), 'Caregiver'), 'adult', v_user_id) returning id into v_person_id;
    insert into public.kwilt_person_auth_bindings (person_id, user_id) values (v_person_id, v_user_id);
  end if;
  insert into public.kwilt_household_memberships (household_id, person_id, role)
  values (v_invite.household_id, v_person_id, 'caregiver') returning * into v_membership;
  update public.kwilt_household_invites set status = 'accepted', accepted_by_membership_id = v_membership.id, accepted_at = now()
  where id = v_invite.id;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (v_invite.household_id, v_membership.id, 'caregiver_joined', v_membership.id);
  return public.get_kwilt_household_snapshot();
end;
$$;

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
begin
  select * into v_subject from public.kwilt_household_memberships where id = p_membership_id and status = 'active';
  if v_subject.id is null then raise exception 'household_member_not_found'; end if;
  select * into v_owner from public.kwilt_current_household_membership(v_subject.household_id);
  if v_owner.id is null or v_owner.role <> 'owner' then raise exception 'household_owner_required'; end if;
  if v_subject.role = 'owner' then raise exception 'owner_cannot_be_removed'; end if;
  update public.kwilt_child_capability_activations
    set state = case when capability_id = 'screen-time' and state <> 'inactive' then 'pending_cleanup' else 'inactive' end,
        changed_by_membership_id = v_owner.id, changed_at = now()
    where child_membership_id = v_subject.id;
  delete from public.kwilt_household_capability_grants
    where caregiver_membership_id = v_subject.id or child_membership_id = v_subject.id;
  update public.kwilt_household_memberships set status = 'removed', removed_at = now() where id = v_subject.id;
  insert into public.kwilt_household_audit_events
    (household_id, actor_membership_id, event_type, subject_membership_id)
  values (v_subject.household_id, v_owner.id, 'member_removed', v_subject.id);
  return public.get_kwilt_household_snapshot();
end;
$$;

revoke execute on function public.kwilt_require_permanent_user() from public, anon;
revoke execute on function public.kwilt_current_household_membership(uuid) from public, anon;
revoke execute on function public.kwilt_is_active_household_member(uuid) from public, anon;
revoke execute on function public.kwilt_can_view_child_capability(uuid, uuid, text) from public, anon;
revoke execute on function public.kwilt_can_view_capability_grant(uuid, uuid, uuid) from public, anon;
revoke execute on function public.kwilt_ensure_household_owner(uuid, text) from public, anon;
revoke execute on function public.get_kwilt_household_snapshot() from public, anon;
revoke execute on function public.add_kwilt_dependent(uuid, text, text) from public, anon;
revoke execute on function public.set_kwilt_child_capability_activation(uuid, text, boolean) from public, anon;
revoke execute on function public.set_kwilt_household_capability_grant(uuid, uuid, text, boolean) from public, anon;
revoke execute on function public.create_kwilt_household_invite(uuid, text, text) from public, anon;
revoke execute on function public.accept_kwilt_household_invite(text, text) from public, anon;
revoke execute on function public.remove_kwilt_household_member(uuid) from public, anon;

grant execute on function public.kwilt_is_active_household_member(uuid) to authenticated;
grant execute on function public.kwilt_current_household_membership(uuid) to authenticated;
grant execute on function public.kwilt_can_view_child_capability(uuid, uuid, text) to authenticated;
grant execute on function public.kwilt_can_view_capability_grant(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_kwilt_household_snapshot() to authenticated;
grant execute on function public.add_kwilt_dependent(uuid, text, text) to authenticated;
grant execute on function public.set_kwilt_child_capability_activation(uuid, text, boolean) to authenticated;
grant execute on function public.set_kwilt_household_capability_grant(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.create_kwilt_household_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_kwilt_household_invite(text, text) to authenticated;
grant execute on function public.remove_kwilt_household_member(uuid) to authenticated;

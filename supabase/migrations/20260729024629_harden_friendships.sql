-- Friends are reusable recipients, not an access grant. Applied to production on 2026-07-29.
-- Harden the dormant relationship model before exposing it in Settings.

alter table public.kwilt_friendships
  drop constraint if exists kwilt_friendships_status_check;

alter table public.kwilt_friendships
  add constraint kwilt_friendships_status_check
  check (status in ('pending', 'active', 'ended', 'blocked'));

alter table public.kwilt_friendships
  add column if not exists blocked_by uuid references auth.users(id),
  add column if not exists ended_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.kwilt_friendships
  drop constraint if exists kwilt_friendships_initiator_is_participant;

alter table public.kwilt_friendships
  add constraint kwilt_friendships_initiator_is_participant
  check (initiated_by = user_a or initiated_by = user_b);

create table public.kwilt_friendship_audit_events (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.kwilt_friendships(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
      'friend_invite_accepted',
      'friend_request_accepted',
      'friend_request_declined',
      'friendship_ended',
      'friendship_blocked'
    )
  ),
  previous_status text,
  resulting_status text not null,
  occurred_at timestamptz not null default now()
);

create index kwilt_friendship_audit_events_friendship_idx
  on public.kwilt_friendship_audit_events(friendship_id, occurred_at desc);

alter table public.kwilt_friendship_audit_events enable row level security;

-- Relationship safety details, including who blocked whom, remain server-only.
revoke all on public.kwilt_friendship_audit_events from public, anon, authenticated;
grant select, insert on public.kwilt_friendship_audit_events to service_role;

-- Remove the original participant-wide mutation policies.
drop policy if exists "Users can read own friendships" on public.kwilt_friendships;
drop policy if exists "Users can create friendships" on public.kwilt_friendships;
drop policy if exists "Users can update own friendships" on public.kwilt_friendships;

-- Raw rows include safety-only state. Mobile clients use the safe snapshot below.
revoke select, insert, update, delete on public.kwilt_friendships from anon, authenticated;
revoke insert, update, delete on public.kwilt_friendships from anon, authenticated;

-- The legacy policy made friendship itself a content grant. Remove it.
drop policy if exists "Friends can read user feed events" on public.kwilt_feed_events;

-- Legacy helpers must not become a social-graph enumeration API.
revoke all on function public.kwilt_are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.kwilt_get_friend_ids(uuid) from public, anon, authenticated;
grant execute on function public.kwilt_are_friends(uuid, uuid) to service_role;
grant execute on function public.kwilt_get_friend_ids(uuid) to service_role;

create or replace function public.get_kwilt_friendships()
returns table (
  friendship_id uuid,
  friend_user_id uuid,
  relationship_status text,
  initiated_by_me boolean,
  incoming_request boolean,
  created_at timestamptz,
  accepted_at timestamptz,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  return query
  select
    candidate.id,
    case when candidate.user_a = v_actor then candidate.user_b else candidate.user_a end,
    candidate.status,
    candidate.initiated_by = v_actor,
    candidate.status = 'pending' and candidate.initiated_by <> v_actor,
    candidate.created_at,
    candidate.accepted_at,
    profile.display_name,
    profile.avatar_url
  from public.kwilt_friendships candidate
  left join public.profiles profile
    on profile.id = case
      when candidate.user_a = v_actor then candidate.user_b
      else candidate.user_a
    end
  where (candidate.user_a = v_actor or candidate.user_b = v_actor)
    and candidate.status in ('pending', 'active')
  order by candidate.created_at desc;
end;
$$;

create or replace function public.transition_kwilt_friendship(
  p_friendship_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  candidate public.kwilt_friendships%rowtype;
  v_previous_status text;
  v_event_type text;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  if p_action not in ('accept', 'decline', 'end', 'block') then
    raise exception 'unsupported_friendship_action';
  end if;

  select *
  into candidate
  from public.kwilt_friendships
  where id = p_friendship_id
  for update;

  if not found then
    raise exception 'friendship_not_found';
  end if;

  if v_actor <> candidate.user_a and v_actor <> candidate.user_b then
    raise exception 'friendship_not_found';
  end if;

  v_previous_status := candidate.status;

  if p_action = 'accept' then
    if candidate.status <> 'pending' or candidate.initiated_by = v_actor then
      raise exception 'friendship_transition_not_allowed';
    end if;

    update public.kwilt_friendships
    set status = 'active',
        accepted_at = coalesce(accepted_at, now()),
        ended_at = null,
        blocked_by = null,
        updated_at = now()
    where id = candidate.id;
    v_event_type := 'friend_request_accepted';
  elsif p_action = 'decline' then
    if candidate.status <> 'pending' or candidate.initiated_by = v_actor then
      raise exception 'friendship_transition_not_allowed';
    end if;

    update public.kwilt_friendships
    set status = 'ended',
        ended_at = now(),
        updated_at = now()
    where id = candidate.id;
    v_event_type := 'friend_request_declined';
  elsif p_action = 'end' then
    if candidate.status <> 'active' then
      raise exception 'friendship_transition_not_allowed';
    end if;

    update public.kwilt_friendships
    set status = 'ended',
        ended_at = now(),
        updated_at = now()
    where id = candidate.id;
    v_event_type := 'friendship_ended';
  else
    if candidate.status not in ('pending', 'active') then
      raise exception 'friendship_transition_not_allowed';
    end if;

    update public.kwilt_friendships
    set status = 'blocked',
        blocked_by = v_actor,
        ended_at = now(),
        updated_at = now()
    where id = candidate.id;
    v_event_type := 'friendship_blocked';
  end if;

  insert into public.kwilt_friendship_audit_events (
    friendship_id,
    actor_id,
    event_type,
    previous_status,
    resulting_status
  ) values (
    candidate.id,
    v_actor,
    v_event_type,
    v_previous_status,
    case when p_action in ('decline', 'end') then 'ended'
         when p_action = 'block' then 'blocked'
         else 'active'
    end
  );

  return jsonb_build_object(
    'friendshipId', candidate.id,
    'status', case when p_action in ('decline', 'end') then 'ended'
                   when p_action = 'block' then 'blocked'
                   else 'active'
              end
  );
end;
$$;

create or replace function public.accept_kwilt_friend_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  invite public.kwilt_invites%rowtype;
  inviter_id uuid;
  v_user_a uuid;
  v_user_b uuid;
  candidate public.kwilt_friendships%rowtype;
  v_friendship_id uuid;
  v_previous_status text;
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;

  if nullif(btrim(p_code), '') is null then
    raise exception 'invalid_invite';
  end if;

  select *
  into invite
  from public.kwilt_invites
  where code = btrim(p_code)
    and entity_type = 'friendship'
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  inviter_id := invite.entity_id;
  if inviter_id = v_actor then
    raise exception 'self_friend_not_allowed';
  end if;

  v_user_a := least(inviter_id, v_actor);
  v_user_b := greatest(inviter_id, v_actor);

  select *
  into candidate
  from public.kwilt_friendships
  where user_a = v_user_a and user_b = v_user_b
  for update;

  if found and candidate.status = 'blocked' then
    raise exception 'invite_unavailable';
  end if;

  -- Replaying the same accepted link is safe for an existing participant and
  -- does not consume another use or reveal a third party's relationship.
  if found and candidate.status = 'active' then
    return jsonb_build_object(
      'friendshipId', candidate.id,
      'status', 'active',
      'replayed', true
    );
  end if;

  if invite.expires_at is not null and invite.expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  if invite.uses >= invite.max_uses then
    raise exception 'invite_exhausted';
  end if;

  if found then
    v_friendship_id := candidate.id;
    v_previous_status := candidate.status;
    update public.kwilt_friendships
    set status = 'active',
        initiated_by = inviter_id,
        accepted_at = now(),
        ended_at = null,
        blocked_by = null,
        updated_at = now()
    where id = candidate.id;
  else
    v_previous_status := null;
    insert into public.kwilt_friendships (
      user_a,
      user_b,
      status,
      initiated_by,
      accepted_at
    ) values (
      v_user_a,
      v_user_b,
      'active',
      inviter_id,
      now()
    )
    returning id into v_friendship_id;
  end if;

  update public.kwilt_invites
  set uses = invite.uses + 1
  where id = invite.id;

  insert into public.kwilt_friendship_audit_events (
    friendship_id,
    actor_id,
    event_type,
    previous_status,
    resulting_status
  ) values (
    v_friendship_id,
    v_actor,
    'friend_invite_accepted',
    v_previous_status,
    'active'
  );

  return jsonb_build_object(
    'friendshipId', v_friendship_id,
    'status', 'active',
    'replayed', false
  );
end;
$$;

revoke all on function public.get_kwilt_friendships() from public, anon;
revoke all on function public.transition_kwilt_friendship(uuid, text) from public, anon;
revoke all on function public.accept_kwilt_friend_invite(text) from public, anon;

grant execute on function public.get_kwilt_friendships() to authenticated;
grant execute on function public.transition_kwilt_friendship(uuid, text) to authenticated;
grant execute on function public.accept_kwilt_friend_invite(text) to authenticated;

comment on function public.get_kwilt_friendships() is
  'Returns only active and pending relationship projection fields safe for the authenticated participant.';
comment on function public.transition_kwilt_friendship(uuid, text) is
  'Applies one actor-authorized friendship lifecycle transition and appends an audit event.';
comment on function public.accept_kwilt_friend_invite(text) is
  'Atomically accepts a one-use Friend link as the recipient party without granting content access.';

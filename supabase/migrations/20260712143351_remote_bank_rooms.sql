create extension if not exists pgcrypto with schema extensions;

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_key text not null check (game_key = 'bank'),
  rules_version integer not null default 1 check (rules_version > 0),
  kind text not null default 'remote' check (kind = 'remote'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('lobby', 'active', 'completed', 'abandoned')),
  state jsonb not null,
  state_version bigint not null default 1 check (state_version > 0),
  last_action_sequence bigint not null default 0 check (last_action_sequence >= 0),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  seat_index integer not null check (seat_index between 0 and 5),
  display_name_snapshot text not null check (char_length(trim(display_name_snapshot)) between 1 and 80),
  user_id uuid references auth.users(id) on delete set null,
  controller_user_id uuid references auth.users(id) on delete set null,
  role text not null default 'player' check (role in ('host', 'player')),
  join_status text not null default 'local' check (join_status in ('local', 'invited', 'joined', 'disconnected', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, seat_index)
);

create table if not exists public.game_invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  participant_id uuid not null references public.game_participants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  short_code text not null unique check (char_length(short_code) = 6),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses = 1),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.game_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid not null references public.game_participants(id) on delete cascade,
  action_type text not null check (action_type in ('roll', 'bank')),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key uuid not null,
  expected_state_version bigint not null,
  resulting_state_version bigint not null,
  created_at timestamptz not null default now(),
  unique(session_id, sequence),
  unique(session_id, actor_user_id, idempotency_key)
);

create index if not exists game_participants_user_session_idx on public.game_participants(user_id, session_id);
create index if not exists game_participants_controller_session_idx on public.game_participants(controller_user_id, session_id);
create index if not exists game_invites_session_idx on public.game_invites(session_id);
create index if not exists game_actions_session_sequence_idx on public.game_actions(session_id, sequence);

alter table public.game_sessions enable row level security;
alter table public.game_participants enable row level security;
alter table public.game_invites enable row level security;
alter table public.game_actions enable row level security;

revoke all on public.game_sessions, public.game_participants, public.game_invites, public.game_actions from anon, authenticated;
grant select on public.game_sessions, public.game_participants to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.game_is_member(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.game_sessions gs
    where gs.id = p_session_id and (
      gs.host_user_id = auth.uid() or exists (
        select 1 from public.game_participants gp
        where gp.session_id = p_session_id and (gp.user_id = auth.uid() or gp.controller_user_id = auth.uid())
      )
    )
  );
$$;
revoke all on function private.game_is_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.game_is_member(uuid) to authenticated;

drop policy if exists "game members read sessions" on public.game_sessions;
create policy "game members read sessions" on public.game_sessions for select to authenticated using (
  private.game_is_member(id)
);

drop policy if exists "game members read participants" on public.game_participants;
create policy "game members read participants" on public.game_participants for select to authenticated using (
  private.game_is_member(session_id)
);

create or replace function public.create_remote_bank_room(p_names text[], p_banking_rule text default 'turns')
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
  v_players jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if coalesce(array_length(p_names, 1), 0) < 2 or array_length(p_names, 1) > 6 then raise exception 'players_must_be_two_to_six'; end if;
  if p_banking_rule not in ('turns', 'anyone') then raise exception 'invalid_banking_rule'; end if;
  if exists (select 1 from unnest(p_names) n where char_length(trim(n)) not between 1 and 80) then raise exception 'invalid_player_name'; end if;

  select jsonb_agg(jsonb_build_object('id', ordinal, 'name', trim(name), 'score', 0, 'banked', false) order by ordinal)
    into v_players from unnest(p_names) with ordinality as names(name, ordinal);

  insert into public.game_sessions(host_user_id, status, state)
  values (v_user, 'active', jsonb_build_object(
    'players', v_players, 'bankingRule', p_banking_rule, 'pot', 0, 'round', 1, 'maxRounds', 10,
    'rollInRound', 0, 'activePlayer', 0, 'status', 'playing', 'lastRoll', jsonb_build_array(3, 5), 'message', 'Three safe rolls'
  )) returning id into v_session;

  insert into public.game_participants(session_id, seat_index, display_name_snapshot, controller_user_id, role, join_status)
  select v_session, ordinal - 1, trim(name), v_user, case when ordinal = 1 then 'host' else 'player' end, 'local'
  from unnest(p_names) with ordinality as names(name, ordinal);
  return v_session;
end;
$$;

create or replace function public.create_remote_bank_invite(p_session_id uuid, p_participant_id uuid)
returns table(token text, short_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_code text;
  v_expiry timestamptz := now() + interval '30 minutes';
begin
  if not exists (select 1 from public.game_sessions where id = p_session_id and host_user_id = v_user and status in ('lobby', 'active') and expires_at > now()) then
    raise exception 'host_room_not_found' using errcode = '42501';
  end if;
  if not exists (select 1 from public.game_participants where id = p_participant_id and session_id = p_session_id and controller_user_id = v_user and join_status in ('local', 'invited')) then
    raise exception 'seat_not_available' using errcode = '42501';
  end if;
  loop
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.game_invites where game_invites.short_code = v_code);
  end loop;
  update public.game_invites set revoked_at = now() where participant_id = p_participant_id and claimed_at is null and revoked_at is null;
  insert into public.game_invites(session_id, participant_id, created_by, token_hash, short_code, expires_at)
  values (p_session_id, p_participant_id, v_user, encode(digest(v_token, 'sha256'), 'hex'), v_code, v_expiry);
  update public.game_participants set join_status = 'invited', updated_at = now() where id = p_participant_id;
  return query select v_token, v_code, v_expiry;
end;
$$;

create or replace function public.claim_remote_bank_invite(p_token text default null, p_short_code text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.game_invites%rowtype;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_invite from public.game_invites
  where revoked_at is null and claimed_at is null and use_count < max_uses and expires_at > now()
    and ((p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  for update skip locked;
  if v_invite.id is null then raise exception 'invite_unavailable' using errcode = 'P0002'; end if;
  update public.game_invites set claimed_by = v_user, claimed_at = now(), use_count = use_count + 1 where id = v_invite.id;
  update public.game_participants set user_id = v_user, controller_user_id = v_user, join_status = 'joined', updated_at = now() where id = v_invite.participant_id;
  return v_invite.session_id;
end;
$$;

create or replace function public.commit_remote_bank_command(
  p_session_id uuid, p_actor_user_id uuid, p_participant_id uuid, p_action_type text,
  p_payload jsonb, p_idempotency_key uuid, p_expected_state_version bigint, p_next_state jsonb
)
returns table(state jsonb, state_version bigint, duplicate boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.game_sessions%rowtype;
  v_sequence bigint;
  v_existing public.game_actions%rowtype;
begin
  if current_user not in ('service_role', 'postgres') then raise exception 'service_role_required' using errcode = '42501'; end if;
  select * into v_existing from public.game_actions where session_id = p_session_id and actor_user_id = p_actor_user_id and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    return query select gs.state, gs.state_version, true from public.game_sessions gs where gs.id = p_session_id;
    return;
  end if;
  select * into v_session from public.game_sessions where id = p_session_id and status = 'active' and expires_at > now() for update;
  if v_session.id is null then raise exception 'room_unavailable' using errcode = 'P0002'; end if;
  if v_session.state_version <> p_expected_state_version then raise exception 'state_conflict' using errcode = '40001'; end if;
  if not exists (select 1 from public.game_participants where id = p_participant_id and session_id = p_session_id and controller_user_id = p_actor_user_id and join_status in ('local', 'joined', 'disconnected')) then
    raise exception 'seat_not_controlled' using errcode = '42501';
  end if;
  v_sequence := v_session.last_action_sequence + 1;
  update public.game_sessions set state = p_next_state, state_version = state_version + 1, last_action_sequence = v_sequence,
    status = case when p_next_state->>'status' = 'finished' then 'completed' else status end, updated_at = now()
  where id = p_session_id;
  insert into public.game_actions(session_id, sequence, actor_user_id, participant_id, action_type, payload, idempotency_key, expected_state_version, resulting_state_version)
  values (p_session_id, v_sequence, p_actor_user_id, p_participant_id, p_action_type, coalesce(p_payload, '{}'::jsonb), p_idempotency_key, p_expected_state_version, p_expected_state_version + 1);
  return query select gs.state, gs.state_version, false from public.game_sessions gs where gs.id = p_session_id;
end;
$$;

revoke all on function public.create_remote_bank_room(text[], text) from public, anon;
revoke all on function public.create_remote_bank_invite(uuid, uuid) from public, anon;
revoke all on function public.claim_remote_bank_invite(text, text) from public, anon;
revoke all on function public.commit_remote_bank_command(uuid, uuid, uuid, text, jsonb, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.create_remote_bank_room(text[], text) to authenticated;
grant execute on function public.create_remote_bank_invite(uuid, uuid) to authenticated;
grant execute on function public.claim_remote_bank_invite(text, text) to authenticated;
grant execute on function public.commit_remote_bank_command(uuid, uuid, uuid, text, jsonb, uuid, bigint, jsonb) to service_role;

drop policy if exists "game members receive realtime" on realtime.messages;
create policy "game members receive realtime" on realtime.messages for select to authenticated using (
  realtime.messages.extension in ('broadcast', 'presence') and exists (
    select 1 from public.game_participants gp
    where ('game:' || gp.session_id::text) = realtime.topic()
      and private.game_is_member(gp.session_id)
  )
);

drop policy if exists "game members send realtime presence" on realtime.messages;
create policy "game members send realtime presence" on realtime.messages for insert to authenticated with check (
  realtime.messages.extension = 'presence' and exists (
    select 1 from public.game_participants gp
    where ('game:' || gp.session_id::text) = realtime.topic()
      and private.game_is_member(gp.session_id)
  )
);
;


-- Imported from Kwilt Games 20260712000000_remote_bank_rooms.sql at 7b3e209.

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
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'permanent_host_required' using errcode = '42501'; end if;
  if coalesce(array_length(p_names, 1), 0) < 2 or array_length(p_names, 1) > 6 then raise exception 'players_must_be_two_to_six'; end if;
  if p_banking_rule not in ('turns', 'anyone') then raise exception 'invalid_banking_rule'; end if;
  if exists (select 1 from unnest(p_names) n where char_length(trim(n)) not between 1 and 80) then raise exception 'invalid_player_name'; end if;

  select jsonb_agg(jsonb_build_object('id', ordinal, 'name', trim(name), 'score', 0, 'banked', false) order by ordinal)
    into v_players from unnest(p_names) with ordinality as names(name, ordinal);

  insert into public.game_sessions(game_key, host_user_id, status, state)
  values ('bank', v_user, 'active', jsonb_build_object(
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
  if not exists (select 1 from public.game_sessions gs where gs.id = p_session_id and gs.host_user_id = v_user and gs.status in ('lobby', 'active') and gs.expires_at > now()) then
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
  update public.game_sessions gs set state = p_next_state, state_version = gs.state_version + 1, last_action_sequence = v_sequence,
    status = case when p_next_state->>'status' = 'finished' then 'completed' else gs.status end, updated_at = now()
  where gs.id = p_session_id;
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
drop policy if exists "game members send realtime updates" on realtime.messages;
create policy "game members send realtime updates" on realtime.messages for insert to authenticated with check (
  realtime.messages.extension in ('broadcast', 'presence') and exists (
    select 1 from public.game_participants gp
    where ('game:' || gp.session_id::text) = realtime.topic()
      and private.game_is_member(gp.session_id)
  )
);


-- Imported from Kwilt Games 20260712001000_fix_remote_bank_room_game_key.sql at 7b3e209.

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
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'permanent_host_required' using errcode = '42501'; end if;
  if coalesce(array_length(p_names, 1), 0) < 2 or array_length(p_names, 1) > 6 then raise exception 'players_must_be_two_to_six'; end if;
  if p_banking_rule not in ('turns', 'anyone') then raise exception 'invalid_banking_rule'; end if;
  if exists (select 1 from unnest(p_names) n where char_length(trim(n)) not between 1 and 80) then raise exception 'invalid_player_name'; end if;

  select jsonb_agg(jsonb_build_object('id', ordinal, 'name', trim(name), 'score', 0, 'banked', false) order by ordinal)
    into v_players from unnest(p_names) with ordinality as names(name, ordinal);

  insert into public.game_sessions(game_key, host_user_id, status, state)
  values ('bank', v_user, 'active', jsonb_build_object(
    'players', v_players, 'bankingRule', p_banking_rule, 'pot', 0, 'round', 1, 'maxRounds', 10,
    'rollInRound', 0, 'activePlayer', 0, 'status', 'playing', 'lastRoll', jsonb_build_array(3, 5), 'message', 'Three safe rolls'
  )) returning id into v_session;

  insert into public.game_participants(session_id, seat_index, display_name_snapshot, controller_user_id, role, join_status)
  select v_session, ordinal - 1, trim(name), v_user, case when ordinal = 1 then 'host' else 'player' end, 'local'
  from unnest(p_names) with ordinality as names(name, ordinal);
  return v_session;
end;
$$;

revoke all on function public.create_remote_bank_room(text[], text) from public, anon;
grant execute on function public.create_remote_bank_room(text[], text) to authenticated;


-- Imported from Kwilt Games 20260712002000_fix_remote_bank_invite_expiry.sql at 7b3e209.

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
  if not exists (select 1 from public.game_sessions gs where gs.id = p_session_id and gs.host_user_id = v_user and gs.status in ('lobby', 'active') and gs.expires_at > now()) then
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

revoke all on function public.create_remote_bank_invite(uuid, uuid) from public, anon;
grant execute on function public.create_remote_bank_invite(uuid, uuid) to authenticated;


-- Imported from Kwilt Games 20260712003000_fix_remote_bank_commit_version.sql at 7b3e209.

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
  update public.game_sessions gs set state = p_next_state, state_version = gs.state_version + 1, last_action_sequence = v_sequence,
    status = case when p_next_state->>'status' = 'finished' then 'completed' else gs.status end, updated_at = now()
  where gs.id = p_session_id;
  insert into public.game_actions(session_id, sequence, actor_user_id, participant_id, action_type, payload, idempotency_key, expected_state_version, resulting_state_version)
  values (p_session_id, v_sequence, p_actor_user_id, p_participant_id, p_action_type, coalesce(p_payload, '{}'::jsonb), p_idempotency_key, p_expected_state_version, p_expected_state_version + 1);
  return query select gs.state, gs.state_version, false from public.game_sessions gs where gs.id = p_session_id;
end;
$$;

revoke all on function public.commit_remote_bank_command(uuid, uuid, uuid, text, jsonb, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.commit_remote_bank_command(uuid, uuid, uuid, text, jsonb, uuid, bigint, jsonb) to service_role;


-- Imported from Kwilt Games 20260712004000_require_permanent_remote_bank_host.sql at 7b3e209.

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
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'permanent_host_required' using errcode = '42501'; end if;
  if coalesce(array_length(p_names, 1), 0) < 2 or array_length(p_names, 1) > 6 then raise exception 'players_must_be_two_to_six'; end if;
  if p_banking_rule not in ('turns', 'anyone') then raise exception 'invalid_banking_rule'; end if;
  if exists (select 1 from unnest(p_names) n where char_length(trim(n)) not between 1 and 80) then raise exception 'invalid_player_name'; end if;

  select jsonb_agg(jsonb_build_object('id', ordinal, 'name', trim(name), 'score', 0, 'banked', false) order by ordinal)
    into v_players from unnest(p_names) with ordinality as names(name, ordinal);
  insert into public.game_sessions(game_key, host_user_id, status, state)
  values ('bank', v_user, 'active', jsonb_build_object(
    'players', v_players, 'bankingRule', p_banking_rule, 'pot', 0, 'round', 1, 'maxRounds', 10,
    'rollInRound', 0, 'activePlayer', 0, 'status', 'playing', 'lastRoll', jsonb_build_array(3, 5), 'message', 'Three safe rolls'
  )) returning id into v_session;
  insert into public.game_participants(session_id, seat_index, display_name_snapshot, controller_user_id, role, join_status)
  select v_session, ordinal - 1, trim(name), v_user, case when ordinal = 1 then 'host' else 'player' end, 'local'
  from unnest(p_names) with ordinality as names(name, ordinal);
  return v_session;
end;
$$;

revoke all on function public.create_remote_bank_room(text[], text) from public, anon;
grant execute on function public.create_remote_bank_room(text[], text) to authenticated;


-- Imported from Kwilt Games 20260712005000_add_saved_player_identity.sql at 7b3e209.

alter table public.game_saved_players
  add column if not exists color_id text not null default 'turmeric'
    check (color_id in ('turmeric', 'coral', 'mint', 'violet', 'sky', 'rose')),
  add column if not exists success_sound_id text not null default 'chime'
    check (success_sound_id in ('chime', 'sparkle', 'fanfare')),
  add column if not exists failure_sound_id text not null default 'trombone'
    check (failure_sound_id in ('trombone', 'bonk', 'wobble'));


-- Imported from Kwilt Games 20260712006000_add_hawk_success_sound.sql at 7b3e209.

alter table public.game_saved_players
  drop constraint if exists game_saved_players_success_sound_id_check;

alter table public.game_saved_players
  add constraint game_saved_players_success_sound_id_check
  check (success_sound_id in ('chime', 'sparkle', 'fanfare', 'hawk'));


-- Imported from Kwilt Games 20260712201915_add_game_player_profiles.sql at 7b3e209.

create table if not exists public.game_player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 18),
  color_id text not null default 'turmeric'
    check (color_id in ('turmeric', 'coral', 'mint', 'violet', 'sky', 'rose')),
  success_sound_id text not null default 'chime'
    check (success_sound_id in ('chime', 'sparkle', 'fanfare', 'hawk')),
  failure_sound_id text not null default 'trombone'
    check (failure_sound_id in ('trombone', 'bonk', 'wobble')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_player_profiles enable row level security;

revoke all on table public.game_player_profiles from anon;
revoke all on table public.game_player_profiles from authenticated;
grant select, insert, update on table public.game_player_profiles to authenticated;

drop policy if exists "Players can read their own game profile" on public.game_player_profiles;
create policy "Players can read their own game profile"
on public.game_player_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own game profile" on public.game_player_profiles;
create policy "Players can create their own game profile"
on public.game_player_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own game profile" on public.game_player_profiles;
create policy "Players can update their own game profile"
on public.game_player_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


-- Imported from Kwilt Games 20260712223439_add_remote_pass_pattern.sql at 7b3e209.

alter table public.game_sessions drop constraint if exists game_sessions_game_key_check;
alter table public.game_sessions add constraint game_sessions_game_key_check check (game_key in ('bank', 'pass-pattern'));

alter table public.game_actions drop constraint if exists game_actions_action_type_check;
alter table public.game_actions add constraint game_actions_action_type_check check (
  action_type in ('roll', 'bank', 'ready', 'replay_watch', 'finish_watch', 'submit_beat', 'next_player', 'restart')
);

create or replace function public.create_remote_pass_pattern_room(
  p_names text[],
  p_difficulty text default 'gentle'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
  v_pattern jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'permanent_host_required' using errcode = '42501'; end if;
  if coalesce(array_length(p_names, 1), 0) < 2 or array_length(p_names, 1) > 6 then raise exception 'players_must_be_two_to_six'; end if;
  if p_difficulty not in ('gentle', 'classic', 'challenge') then raise exception 'invalid_difficulty'; end if;
  if exists (select 1 from unnest(p_names) n where char_length(trim(n)) not between 1 and 80) then raise exception 'invalid_player_name'; end if;

  v_pattern := case p_difficulty
    when 'challenge' then '["coral", "pine", "gold"]'::jsonb
    else '["coral", "pine"]'::jsonb
  end;

  insert into public.game_sessions(game_key, rules_version, host_user_id, status, state)
  values ('pass-pattern', 1, v_user, 'active', jsonb_build_object(
    'difficulty', p_difficulty,
    'playerCount', array_length(p_names, 1),
    'playerIndex', 0,
    'phase', 'handoff',
    'pattern', v_pattern,
    'answer', '[]'::jsonb,
    'success', null,
    'watchSequence', 0
  )) returning id into v_session;

  insert into public.game_participants(session_id, seat_index, display_name_snapshot, controller_user_id, role, join_status)
  select v_session, ordinal - 1, trim(name), v_user, case when ordinal = 1 then 'host' else 'player' end, 'local'
  from unnest(p_names) with ordinality as names(name, ordinal);

  return v_session;
end;
$$;

revoke all on function public.create_remote_pass_pattern_room(text[], text) from public, anon;
grant execute on function public.create_remote_pass_pattern_room(text[], text) to authenticated;


-- Imported from Kwilt Games 20260720025200_add_game_personal_bests.sql at 7b3e209.

create table if not exists public.game_personal_bests (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  player_key text not null check (player_key ~ '^(profile|saved):.+$'),
  game_key text not null check (game_key in ('bank', 'farkle')),
  score integer not null check (score >= 0),
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, player_key, game_key)
);

alter table public.game_personal_bests enable row level security;

revoke all on table public.game_personal_bests from anon, authenticated;
grant select, insert, update on table public.game_personal_bests to authenticated;

drop policy if exists "Players can read their private personal bests" on public.game_personal_bests;
create policy "Players can read their private personal bests"
on public.game_personal_bests for select
to authenticated
using ((select auth.uid()) = owner_user_id);

drop policy if exists "Players can create their private personal bests" on public.game_personal_bests;
create policy "Players can create their private personal bests"
on public.game_personal_bests for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "Players can improve their private personal bests" on public.game_personal_bests;
create policy "Players can improve their private personal bests"
on public.game_personal_bests for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.preserve_game_personal_best()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.score <= old.score then
    new.score := old.score;
    new.achieved_at := old.achieved_at;
  end if;
  new.updated_at := greatest(new.updated_at, old.updated_at);
  return new;
end;
$$;

revoke all on function private.preserve_game_personal_best() from public, anon, authenticated;

drop trigger if exists preserve_game_personal_best on public.game_personal_bests;
create trigger preserve_game_personal_best
before update on public.game_personal_bests
for each row execute function private.preserve_game_personal_best();


-- Imported from Kwilt Games 20260720152859_open_table_nearby_join.sql at 7b3e209.

alter table public.game_invites
  add column if not exists kind text not null default 'seat';

alter table public.game_invites
  drop constraint if exists game_invites_kind_check;
alter table public.game_invites
  add constraint game_invites_kind_check check (kind in ('seat', 'table'));

alter table public.game_invites
  alter column participant_id drop not null;

alter table public.game_invites
  drop constraint if exists game_invites_max_uses_check;
alter table public.game_invites
  add constraint game_invites_max_uses_check check (max_uses between 1 and 6);

create or replace function public.create_open_bank_table(
  p_names text[],
  p_banking_rule text default 'anyone',
  p_capacity integer default 6
)
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
  if p_capacity not between 2 and 6 then raise exception 'invalid_table_capacity'; end if;
  if coalesce(array_length(p_names, 1), 0) < 1 or array_length(p_names, 1) >= p_capacity then
    raise exception 'local_players_must_leave_room_to_join';
  end if;
  if p_banking_rule not in ('turns', 'anyone') then raise exception 'invalid_banking_rule'; end if;
  if exists (select 1 from unnest(p_names) name where char_length(trim(name)) not between 1 and 18) then
    raise exception 'invalid_player_name';
  end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) and exists (
    select 1 from public.game_sessions
    where host_user_id = v_user and status in ('lobby', 'active') and expires_at > now()
  ) then
    raise exception 'anonymous_room_limit';
  end if;

  select jsonb_agg(
    jsonb_build_object('id', ordinal, 'name', trim(name), 'score', 0, 'banked', false)
    order by ordinal
  ) into v_players
  from unnest(p_names) with ordinality as names(name, ordinal);

  insert into public.game_sessions(game_key, host_user_id, status, state, expires_at)
  values (
    'bank',
    v_user,
    'lobby',
    jsonb_build_object(
      'players', v_players,
      'capacity', p_capacity,
      'bankingRule', p_banking_rule,
      'pot', 0,
      'round', 1,
      'maxRounds', 10,
      'rollInRound', 0,
      'activePlayer', 0,
      'status', 'playing',
      'lastRoll', jsonb_build_array(3, 5),
      'message', 'Waiting for the table'
    ),
    now() + interval '4 hours'
  ) returning id into v_session;

  insert into public.game_participants(session_id, seat_index, display_name_snapshot, user_id, controller_user_id, role, join_status)
  select v_session, ordinal - 1, trim(name), case when ordinal = 1 then v_user else null end, v_user,
    case when ordinal = 1 then 'host' else 'player' end, 'local'
  from unnest(p_names) with ordinality as names(name, ordinal);

  return v_session;
end;
$$;

create or replace function public.create_open_bank_table_invite(p_session_id uuid)
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
  v_capacity integer;
  v_participant_count integer;
begin
  select coalesce((game_sessions.state->>'capacity')::integer, 6)
  into v_capacity
  from public.game_sessions
  where game_sessions.id = p_session_id
    and game_sessions.host_user_id = v_user
    and game_sessions.status = 'lobby'
    and game_sessions.expires_at > now()
  for update;

  if v_capacity is null then raise exception 'host_lobby_not_found' using errcode = '42501'; end if;

  select count(*) into v_participant_count
  from public.game_participants
  where session_id = p_session_id and join_status <> 'left';

  if v_participant_count >= v_capacity then raise exception 'table_full'; end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.game_invites where game_invites.short_code = v_code);
  end loop;

  update public.game_invites
  set revoked_at = now()
  where session_id = p_session_id and kind = 'table' and revoked_at is null;

  insert into public.game_invites(session_id, participant_id, created_by, kind, token_hash, short_code, expires_at, max_uses)
  values (
    p_session_id,
    null,
    v_user,
    'table',
    encode(digest(v_token, 'sha256'), 'hex'),
    v_code,
    v_expiry,
    v_capacity - v_participant_count
  );

  return query select v_token, v_code, v_expiry;
end;
$$;

create or replace function public.claim_open_bank_table(
  p_token text default null,
  p_short_code text default null,
  p_display_name text default null
)
returns table(session_id uuid, participant_id uuid, table_code text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(p_display_name);
  v_invite public.game_invites%rowtype;
  v_session public.game_sessions%rowtype;
  v_participant uuid;
  v_count integer;
  v_capacity integer;
  v_seat_index integer;
  v_players jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 18 then raise exception 'invalid_player_name'; end if;

  select * into v_invite
  from public.game_invites
  where kind = 'table'
    and game_invites.participant_id is null
    and revoked_at is null
    and use_count < max_uses
    and expires_at > now()
    and ((p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  for update skip locked;

  if v_invite.id is null then raise exception 'table_invite_unavailable' using errcode = 'P0002'; end if;

  select * into v_session
  from public.game_sessions
  where id = v_invite.session_id
  for update;

  if v_session.id is null or v_session.status <> 'lobby' or v_session.expires_at <= now() then
    raise exception 'table_unavailable' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.game_participants
    where game_participants.session_id = v_session.id
      and (user_id = v_user or controller_user_id = v_user)
      and join_status <> 'left'
  ) then raise exception 'already_joined'; end if;

  select count(*), coalesce(max(seat_index), -1) + 1
  into v_count, v_seat_index
  from public.game_participants
  where game_participants.session_id = v_session.id and join_status <> 'left';

  v_capacity := coalesce((v_session.state->>'capacity')::integer, 6);
  if v_count >= v_capacity or v_seat_index >= v_capacity then raise exception 'table_full'; end if;

  insert into public.game_participants(
    session_id, seat_index, display_name_snapshot, user_id, controller_user_id, role, join_status
  ) values (
    v_session.id, v_seat_index, v_name, v_user, v_user, 'player', 'joined'
  ) returning id into v_participant;

  v_players := coalesce(v_session.state->'players', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('id', v_seat_index + 1, 'name', v_name, 'score', 0, 'banked', false)
  );

  update public.game_sessions
  set state = jsonb_set(state, '{players}', v_players, true),
      state_version = state_version + 1,
      updated_at = now()
  where id = v_session.id;

  update public.game_invites
  set use_count = use_count + 1, claimed_by = v_user, claimed_at = now()
  where id = v_invite.id;

  return query select v_session.id, v_participant, v_invite.short_code;
end;
$$;

create or replace function public.start_open_bank_table(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if not exists (
    select 1 from public.game_sessions
    where id = p_session_id and host_user_id = v_user and status = 'lobby' and expires_at > now()
    for update
  ) then raise exception 'host_lobby_not_found' using errcode = '42501'; end if;

  select count(*) into v_count
  from public.game_participants
  where session_id = p_session_id and join_status <> 'left';
  if v_count not between 2 and 6 then raise exception 'players_must_be_two_to_six'; end if;

  update public.game_sessions
  set status = 'active',
      state = jsonb_set(state, '{message}', to_jsonb('Table ready'::text), true),
      state_version = state_version + 1,
      updated_at = now()
  where id = p_session_id;

  update public.game_invites
  set revoked_at = now()
  where session_id = p_session_id and kind = 'table' and revoked_at is null;
end;
$$;

create or replace function public.remove_open_bank_table_participant(
  p_session_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_target public.game_participants%rowtype;
  v_row record;
  v_next_index integer := 0;
  v_players jsonb;
begin
  if not exists (
    select 1 from public.game_sessions
    where id = p_session_id and host_user_id = v_user and status = 'lobby' and expires_at > now()
    for update
  ) then raise exception 'host_lobby_not_found' using errcode = '42501'; end if;

  select * into v_target
  from public.game_participants
  where id = p_participant_id and session_id = p_session_id
  for update;

  if v_target.id is null or v_target.role = 'host' then raise exception 'participant_not_removable' using errcode = '42501'; end if;

  delete from public.game_participants where id = v_target.id;

  for v_row in
    select id from public.game_participants where session_id = p_session_id order by seat_index
  loop
    update public.game_participants set seat_index = v_next_index, updated_at = now() where id = v_row.id;
    v_next_index := v_next_index + 1;
  end loop;

  select jsonb_agg(
    jsonb_build_object('id', seat_index + 1, 'name', display_name_snapshot, 'score', 0, 'banked', false)
    order by seat_index
  ) into v_players
  from public.game_participants
  where session_id = p_session_id;

  update public.game_sessions
  set state = jsonb_set(state, '{players}', coalesce(v_players, '[]'::jsonb), true),
      state_version = state_version + 1,
      updated_at = now()
  where id = p_session_id;

  update public.game_invites
  set use_count = greatest(use_count - 1, 0), claimed_by = null, claimed_at = null
  where session_id = p_session_id and kind = 'table' and revoked_at is null;
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
  where kind = 'seat' and participant_id is not null
    and revoked_at is null and claimed_at is null and use_count < max_uses and expires_at > now()
    and ((p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  for update skip locked;
  if v_invite.id is null then raise exception 'invite_unavailable' using errcode = 'P0002'; end if;
  update public.game_invites set claimed_by = v_user, claimed_at = now(), use_count = use_count + 1 where id = v_invite.id;
  update public.game_participants set user_id = v_user, controller_user_id = v_user, join_status = 'joined', updated_at = now() where id = v_invite.participant_id;
  return v_invite.session_id;
end;
$$;

revoke all on function public.create_open_bank_table(text[], text, integer) from public, anon;
revoke all on function public.create_open_bank_table_invite(uuid) from public, anon;
revoke all on function public.claim_open_bank_table(text, text, text) from public, anon;
revoke all on function public.start_open_bank_table(uuid) from public, anon;
revoke all on function public.remove_open_bank_table_participant(uuid, uuid) from public, anon;
revoke all on function public.claim_remote_bank_invite(text, text) from public, anon;

grant execute on function public.create_open_bank_table(text[], text, integer) to authenticated;
grant execute on function public.create_open_bank_table_invite(uuid) to authenticated;
grant execute on function public.claim_open_bank_table(text, text, text) to authenticated;
grant execute on function public.start_open_bank_table(uuid) to authenticated;
grant execute on function public.remove_open_bank_table_participant(uuid, uuid) to authenticated;
grant execute on function public.claim_remote_bank_invite(text, text) to authenticated;


-- Imported from Kwilt Games 20260720154640_return_open_table_code.sql at 7b3e209.

-- The first open-table migration shipped before the claim result included the
-- human-readable table code. Recreate the function so QR and nearby joins land
-- on the same visibly identified lobby.
drop function public.claim_open_bank_table(text, text, text);

create function public.claim_open_bank_table(
  p_token text default null,
  p_short_code text default null,
  p_display_name text default null
)
returns table(session_id uuid, participant_id uuid, table_code text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(p_display_name);
  v_invite public.game_invites%rowtype;
  v_session public.game_sessions%rowtype;
  v_participant uuid;
  v_count integer;
  v_capacity integer;
  v_seat_index integer;
  v_players jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 18 then raise exception 'invalid_player_name'; end if;

  select * into v_invite
  from public.game_invites
  where kind = 'table'
    and game_invites.participant_id is null
    and revoked_at is null
    and use_count < max_uses
    and expires_at > now()
    and ((p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  for update skip locked;

  if v_invite.id is null then raise exception 'table_invite_unavailable' using errcode = 'P0002'; end if;

  select * into v_session
  from public.game_sessions
  where id = v_invite.session_id
  for update;

  if v_session.id is null or v_session.status <> 'lobby' or v_session.expires_at <= now() then
    raise exception 'table_unavailable' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.game_participants
    where game_participants.session_id = v_session.id
      and (user_id = v_user or controller_user_id = v_user)
      and join_status <> 'left'
  ) then raise exception 'already_joined'; end if;

  select count(*), coalesce(max(seat_index), -1) + 1
  into v_count, v_seat_index
  from public.game_participants
  where game_participants.session_id = v_session.id and join_status <> 'left';

  v_capacity := coalesce((v_session.state->>'capacity')::integer, 6);
  if v_count >= v_capacity or v_seat_index >= v_capacity then raise exception 'table_full'; end if;

  insert into public.game_participants(
    session_id, seat_index, display_name_snapshot, user_id, controller_user_id, role, join_status
  ) values (
    v_session.id, v_seat_index, v_name, v_user, v_user, 'player', 'joined'
  ) returning id into v_participant;

  v_players := coalesce(v_session.state->'players', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('id', v_seat_index + 1, 'name', v_name, 'score', 0, 'banked', false)
  );

  update public.game_sessions
  set state = jsonb_set(state, '{players}', v_players, true),
      state_version = state_version + 1,
      updated_at = now()
  where id = v_session.id;

  update public.game_invites
  set use_count = use_count + 1, claimed_by = v_user, claimed_at = now()
  where id = v_invite.id;

  return query select v_session.id, v_participant, v_invite.short_code;
end;
$$;

revoke all on function public.claim_open_bank_table(text, text, text) from public, anon;
grant execute on function public.claim_open_bank_table(text, text, text) to authenticated;


-- Imported from Kwilt Games 20260720155033_qualify_open_table_invite.sql at 7b3e209.

create or replace function public.create_open_bank_table_invite(p_session_id uuid)
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
  v_capacity integer;
  v_participant_count integer;
begin
  select coalesce((game_sessions.state->>'capacity')::integer, 6)
  into v_capacity
  from public.game_sessions
  where game_sessions.id = p_session_id
    and game_sessions.host_user_id = v_user
    and game_sessions.status = 'lobby'
    and game_sessions.expires_at > now()
  for update;

  if v_capacity is null then raise exception 'host_lobby_not_found' using errcode = '42501'; end if;

  select count(*) into v_participant_count
  from public.game_participants
  where session_id = p_session_id and join_status <> 'left';

  if v_participant_count >= v_capacity then raise exception 'table_full'; end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.game_invites where game_invites.short_code = v_code);
  end loop;

  update public.game_invites
  set revoked_at = now()
  where session_id = p_session_id and kind = 'table' and revoked_at is null;

  insert into public.game_invites(session_id, participant_id, created_by, kind, token_hash, short_code, expires_at, max_uses)
  values (
    p_session_id,
    null,
    v_user,
    'table',
    encode(digest(v_token, 'sha256'), 'hex'),
    v_code,
    v_expiry,
    v_capacity - v_participant_count
  );

  return query select v_token, v_code, v_expiry;
end;
$$;

revoke all on function public.create_open_bank_table_invite(uuid) from public, anon;
grant execute on function public.create_open_bank_table_invite(uuid) to authenticated;


-- Imported from Kwilt Games 20260720155132_qualify_open_table_claim.sql at 7b3e209.

create or replace function public.claim_open_bank_table(
  p_token text default null,
  p_short_code text default null,
  p_display_name text default null
)
returns table(session_id uuid, participant_id uuid, table_code text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(p_display_name);
  v_invite public.game_invites%rowtype;
  v_session public.game_sessions%rowtype;
  v_participant uuid;
  v_count integer;
  v_capacity integer;
  v_seat_index integer;
  v_players jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 18 then raise exception 'invalid_player_name'; end if;

  select * into v_invite
  from public.game_invites
  where kind = 'table'
    and game_invites.participant_id is null
    and revoked_at is null
    and use_count < max_uses
    and expires_at > now()
    and ((p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  for update skip locked;

  if v_invite.id is null then raise exception 'table_invite_unavailable' using errcode = 'P0002'; end if;

  select * into v_session
  from public.game_sessions
  where id = v_invite.session_id
  for update;

  if v_session.id is null or v_session.status <> 'lobby' or v_session.expires_at <= now() then
    raise exception 'table_unavailable' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.game_participants
    where game_participants.session_id = v_session.id
      and (user_id = v_user or controller_user_id = v_user)
      and join_status <> 'left'
  ) then raise exception 'already_joined'; end if;

  select count(*), coalesce(max(seat_index), -1) + 1
  into v_count, v_seat_index
  from public.game_participants
  where game_participants.session_id = v_session.id and join_status <> 'left';

  v_capacity := coalesce((v_session.state->>'capacity')::integer, 6);
  if v_count >= v_capacity or v_seat_index >= v_capacity then raise exception 'table_full'; end if;

  insert into public.game_participants(
    session_id, seat_index, display_name_snapshot, user_id, controller_user_id, role, join_status
  ) values (
    v_session.id, v_seat_index, v_name, v_user, v_user, 'player', 'joined'
  ) returning id into v_participant;

  v_players := coalesce(v_session.state->'players', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('id', v_seat_index + 1, 'name', v_name, 'score', 0, 'banked', false)
  );

  update public.game_sessions
  set state = jsonb_set(state, '{players}', v_players, true),
      state_version = state_version + 1,
      updated_at = now()
  where id = v_session.id;

  update public.game_invites
  set use_count = use_count + 1, claimed_by = v_user, claimed_at = now()
  where id = v_invite.id;

  return query select v_session.id, v_participant, v_invite.short_code;
end;
$$;

revoke all on function public.claim_open_bank_table(text, text, text) from public, anon;
grant execute on function public.claim_open_bank_table(text, text, text) to authenticated;


-- Imported from Kwilt Games 20260720172101_add_slanguage_learning_release.sql at 7b3e209.

alter table public.game_sessions drop constraint if exists game_sessions_game_key_check;
alter table public.game_sessions add constraint game_sessions_game_key_check check (game_key in ('bank', 'pass-pattern', 'slanguage'));

alter table public.game_participants drop constraint if exists game_participants_seat_index_check;
alter table public.game_participants add constraint game_participants_seat_index_check check (seat_index between 0 and 7);

alter table public.game_invites drop constraint if exists game_invites_max_uses_check;
alter table public.game_invites add constraint game_invites_max_uses_check check (max_uses between 1 and 8);

alter table public.game_actions drop constraint if exists game_actions_action_type_check;
alter table public.game_actions add constraint game_actions_action_type_check check (
  action_type in (
    'roll', 'bank', 'ready', 'replay_watch', 'finish_watch', 'submit_beat', 'next_player', 'restart',
    'start', 'submit_translation', 'advance_reveal', 'submit_vote', 'next_round'
  )
);

create table if not exists public.slanguage_hands (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_index integer not null check (round_index between 0 and 4),
  participant_id uuid not null references public.game_participants(id) on delete cascade,
  tile_ids jsonb not null check (jsonb_typeof(tile_ids) = 'array'),
  created_at timestamptz not null default now(),
  primary key (session_id, round_index, participant_id)
);

create table if not exists public.slanguage_submissions (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_index integer not null check (round_index between 0 and 4),
  participant_id uuid not null references public.game_participants(id) on delete cascade,
  placements jsonb not null check (jsonb_typeof(placements) = 'object'),
  translation_text text not null check (char_length(translation_text) between 1 and 400),
  slang_score integer not null check (slang_score between 0 and 24),
  submitted_at timestamptz not null default now(),
  primary key (session_id, round_index, participant_id)
);

create table if not exists public.slanguage_votes (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_index integer not null check (round_index between 0 and 4),
  voter_participant_id uuid not null references public.game_participants(id) on delete cascade,
  submission_participant_id uuid not null references public.game_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, round_index, voter_participant_id),
  check (voter_participant_id <> submission_participant_id)
);

alter table public.slanguage_hands enable row level security;
alter table public.slanguage_submissions enable row level security;
alter table public.slanguage_votes enable row level security;
revoke all on public.slanguage_hands, public.slanguage_submissions, public.slanguage_votes from public, anon, authenticated;

create or replace function public.create_open_slanguage_table(
  p_host_name text,
  p_capacity integer default 8
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
  v_name text := trim(p_host_name);
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 18 then raise exception 'invalid_player_name'; end if;
  if p_capacity not between 3 and 8 then raise exception 'invalid_table_capacity'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) and exists (
    select 1 from public.game_sessions
    where host_user_id = v_user and status in ('lobby', 'active') and expires_at > now()
  ) then raise exception 'anonymous_room_limit'; end if;

  insert into public.game_sessions(game_key, rules_version, host_user_id, status, state, expires_at)
  values (
    'slanguage', 1, v_user, 'lobby',
    jsonb_build_object(
      'phase', 'lobby',
      'status', 'playing',
      'capacity', p_capacity,
      'roundIndex', 0,
      'totalRounds', 5,
      'promptId', null,
      'deadline', null,
      'revealOrder', '[]'::jsonb,
      'revealIndex', 0,
      'crowns', '{}'::jsonb,
      'crownScores', '{}'::jsonb,
      'roundWinnerIds', '[]'::jsonb,
      'winnerIds', '[]'::jsonb
    ),
    now() + interval '4 hours'
  ) returning id into v_session;

  insert into public.game_participants(
    session_id, seat_index, display_name_snapshot, user_id, controller_user_id, role, join_status
  ) values (v_session, 0, v_name, v_user, v_user, 'host', 'local');

  return v_session;
end;
$$;

create or replace function public.create_open_game_table_invite(p_session_id uuid)
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
  v_capacity integer;
  v_participant_count integer;
begin
  select coalesce((game_sessions.state->>'capacity')::integer, 6)
  into v_capacity
  from public.game_sessions
  where game_sessions.id = p_session_id
    and game_sessions.host_user_id = v_user
    and game_sessions.status = 'lobby'
    and game_sessions.game_key in ('bank', 'slanguage')
    and game_sessions.expires_at > now()
  for update;

  if v_capacity is null then raise exception 'host_lobby_not_found' using errcode = '42501'; end if;

  select count(*) into v_participant_count
  from public.game_participants
  where session_id = p_session_id and join_status <> 'left';
  if v_participant_count >= v_capacity then raise exception 'table_full'; end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.game_invites where game_invites.short_code = v_code);
  end loop;

  update public.game_invites set revoked_at = now()
  where session_id = p_session_id and kind = 'table' and revoked_at is null;

  insert into public.game_invites(session_id, participant_id, created_by, kind, token_hash, short_code, expires_at, max_uses)
  values (
    p_session_id, null, v_user, 'table', encode(digest(v_token, 'sha256'), 'hex'), v_code, v_expiry,
    v_capacity - v_participant_count
  );

  return query select v_token, v_code, v_expiry;
end;
$$;

create or replace function public.claim_open_game_table(
  p_token text default null,
  p_short_code text default null,
  p_display_name text default null
)
returns table(session_id uuid, participant_id uuid, table_code text, game_key text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(p_display_name);
  v_invite public.game_invites%rowtype;
  v_session public.game_sessions%rowtype;
  v_participant uuid;
  v_count integer;
  v_capacity integer;
  v_seat_index integer;
  v_players jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 18 then raise exception 'invalid_player_name'; end if;

  select * into v_invite
  from public.game_invites
  where kind = 'table' and game_invites.participant_id is null and revoked_at is null
    and use_count < max_uses and expires_at > now()
    and ((p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  for update skip locked;
  if v_invite.id is null then raise exception 'table_invite_unavailable' using errcode = 'P0002'; end if;

  select * into v_session from public.game_sessions where id = v_invite.session_id for update;
  if v_session.id is null or v_session.status <> 'lobby' or v_session.expires_at <= now() then
    raise exception 'table_unavailable' using errcode = 'P0002';
  end if;
  if v_session.game_key not in ('bank', 'slanguage') then raise exception 'unsupported_table'; end if;

  if exists (
    select 1 from public.game_participants
    where game_participants.session_id = v_session.id
      and (user_id = v_user or controller_user_id = v_user)
      and join_status <> 'left'
  ) then raise exception 'already_joined'; end if;

  select count(*), coalesce(max(seat_index), -1) + 1 into v_count, v_seat_index
  from public.game_participants where game_participants.session_id = v_session.id and join_status <> 'left';
  v_capacity := coalesce((v_session.state->>'capacity')::integer, 6);
  if v_count >= v_capacity or v_seat_index >= v_capacity then raise exception 'table_full'; end if;

  insert into public.game_participants(
    session_id, seat_index, display_name_snapshot, user_id, controller_user_id, role, join_status
  ) values (v_session.id, v_seat_index, v_name, v_user, v_user, 'player', 'joined')
  returning id into v_participant;

  if v_session.game_key = 'bank' then
    v_players := coalesce(v_session.state->'players', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('id', v_seat_index + 1, 'name', v_name, 'score', 0, 'banked', false)
    );
    update public.game_sessions
    set state = jsonb_set(state, '{players}', v_players, true), state_version = state_version + 1, updated_at = now()
    where id = v_session.id;
  else
    update public.game_sessions set state_version = state_version + 1, updated_at = now() where id = v_session.id;
  end if;

  update public.game_invites set use_count = use_count + 1, claimed_by = v_user, claimed_at = now()
  where id = v_invite.id;

  return query select v_session.id, v_participant, v_invite.short_code, v_session.game_key;
end;
$$;

create or replace function public.remove_open_game_table_participant(
  p_session_id uuid,
  p_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_session public.game_sessions%rowtype;
  v_target public.game_participants%rowtype;
  v_row record;
  v_next_index integer := 0;
  v_players jsonb;
begin
  select * into v_session from public.game_sessions
  where id = p_session_id and host_user_id = v_user and status = 'lobby' and expires_at > now()
  for update;
  if v_session.id is null then raise exception 'host_lobby_not_found' using errcode = '42501'; end if;

  select * into v_target from public.game_participants
  where id = p_participant_id and session_id = p_session_id for update;
  if v_target.id is null or v_target.role = 'host' then raise exception 'participant_not_removable' using errcode = '42501'; end if;

  delete from public.game_participants where id = v_target.id;
  for v_row in select id from public.game_participants where session_id = p_session_id order by seat_index loop
    update public.game_participants set seat_index = v_next_index, updated_at = now() where id = v_row.id;
    v_next_index := v_next_index + 1;
  end loop;

  if v_session.game_key = 'bank' then
    select jsonb_agg(
      jsonb_build_object('id', seat_index + 1, 'name', display_name_snapshot, 'score', 0, 'banked', false)
      order by seat_index
    ) into v_players from public.game_participants where session_id = p_session_id;
    update public.game_sessions
    set state = jsonb_set(state, '{players}', coalesce(v_players, '[]'::jsonb), true),
        state_version = state_version + 1, updated_at = now()
    where id = p_session_id;
  else
    update public.game_sessions set state_version = state_version + 1, updated_at = now() where id = p_session_id;
  end if;

  update public.game_invites
  set use_count = greatest(use_count - 1, 0), claimed_by = null, claimed_at = null
  where session_id = p_session_id and kind = 'table' and revoked_at is null;
end;
$$;

revoke all on function public.create_open_slanguage_table(text, integer) from public, anon;
revoke all on function public.create_open_game_table_invite(uuid) from public, anon;
revoke all on function public.claim_open_game_table(text, text, text) from public, anon;
revoke all on function public.remove_open_game_table_participant(uuid, uuid) from public, anon;
grant execute on function public.create_open_slanguage_table(text, integer) to authenticated;
grant execute on function public.create_open_game_table_invite(uuid) to authenticated;
grant execute on function public.claim_open_game_table(text, text, text) to authenticated;
grant execute on function public.remove_open_game_table_participant(uuid, uuid) to authenticated;

-- Kwilt hardening: PostgreSQL grants EXECUTE on new functions to PUBLIC by
-- default. Keep the Games RPC surface limited to the roles each function
-- authenticates and authorizes explicitly.
revoke execute on function private.game_is_member(uuid) from public, anon;
grant execute on function private.game_is_member(uuid) to authenticated;

revoke execute on function private.preserve_game_personal_best() from public, anon, authenticated;

revoke execute on function public.create_remote_bank_room(text[], text) from public, anon;
revoke execute on function public.create_remote_bank_invite(uuid, uuid) from public, anon;
revoke execute on function public.claim_remote_bank_invite(text, text) from public, anon;
revoke execute on function public.create_remote_pass_pattern_room(text[], text) from public, anon;
revoke execute on function public.create_open_bank_table(text[], text, integer) from public, anon;
revoke execute on function public.create_open_bank_table_invite(uuid) from public, anon;
revoke execute on function public.claim_open_bank_table(text, text, text) from public, anon;
revoke execute on function public.start_open_bank_table(uuid) from public, anon;
revoke execute on function public.remove_open_bank_table_participant(uuid, uuid) from public, anon;
revoke execute on function public.create_open_slanguage_table(text, integer) from public, anon;
revoke execute on function public.create_open_game_table_invite(uuid) from public, anon;
revoke execute on function public.claim_open_game_table(text, text, text) from public, anon;
revoke execute on function public.remove_open_game_table_participant(uuid, uuid) from public, anon;

grant execute on function public.create_remote_bank_room(text[], text) to authenticated;
grant execute on function public.create_remote_bank_invite(uuid, uuid) to authenticated;
grant execute on function public.claim_remote_bank_invite(text, text) to authenticated;
grant execute on function public.create_remote_pass_pattern_room(text[], text) to authenticated;
grant execute on function public.create_open_bank_table(text[], text, integer) to authenticated;
grant execute on function public.create_open_bank_table_invite(uuid) to authenticated;
grant execute on function public.claim_open_bank_table(text, text, text) to authenticated;
grant execute on function public.start_open_bank_table(uuid) to authenticated;
grant execute on function public.remove_open_bank_table_participant(uuid, uuid) to authenticated;
grant execute on function public.create_open_slanguage_table(text, integer) to authenticated;
grant execute on function public.create_open_game_table_invite(uuid) to authenticated;
grant execute on function public.claim_open_game_table(text, text, text) to authenticated;
grant execute on function public.remove_open_game_table_participant(uuid, uuid) to authenticated;

revoke execute on function public.commit_remote_bank_command(uuid, uuid, uuid, text, jsonb, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.commit_remote_bank_command(uuid, uuid, uuid, text, jsonb, uuid, bigint, jsonb) to service_role;

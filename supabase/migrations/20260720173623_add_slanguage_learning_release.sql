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
;

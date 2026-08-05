create or replace function public.preview_open_game_table(
  p_token text default null,
  p_short_code text default null
)
returns table(
  game_key text,
  host_display_name text,
  participant_count integer,
  capacity integer,
  invite_state text,
  can_join boolean,
  already_joined boolean,
  session_id uuid,
  table_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.game_invites%rowtype;
  v_session public.game_sessions%rowtype;
  v_count integer;
  v_capacity integer;
  v_already_joined boolean;
  v_state text;
  v_host_name text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if nullif(trim(p_token), '') is null and nullif(trim(p_short_code), '') is null then
    raise exception 'invitation_required' using errcode = '22023';
  end if;

  select * into v_invite
  from public.game_invites
  where kind = 'table' and participant_id is null
    and ((p_token is not null and token_hash = pg_catalog.encode(extensions.digest(pg_catalog.btrim(p_token), 'sha256'), 'hex'))
      or (p_short_code is not null and short_code = upper(regexp_replace(p_short_code, '[^A-Za-z0-9]', '', 'g'))))
  order by created_at desc
  limit 1;
  if v_invite.id is null then raise exception 'table_invite_not_found' using errcode = 'P0002'; end if;

  select * into v_session from public.game_sessions where id = v_invite.session_id;
  if v_session.id is null or v_session.game_key not in ('bank', 'slanguage') then
    raise exception 'table_invite_not_found' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_count
  from public.game_participants
  where public.game_participants.session_id = v_session.id and join_status <> 'left';
  v_capacity := coalesce((v_session.state->>'capacity')::integer, 6);
  select exists(
    select 1 from public.game_participants
    where public.game_participants.session_id = v_session.id
      and (user_id = v_user or controller_user_id = v_user)
      and join_status <> 'left'
  ) into v_already_joined;
  select coalesce(nullif(trim(display_name_snapshot), ''), 'Your host') into v_host_name
  from public.game_participants
  where public.game_participants.session_id = v_session.id and role = 'host'
  order by seat_index limit 1;

  v_state := case
    when v_session.expires_at <= now() then 'closed'
    when v_already_joined then 'already_joined'
    when v_invite.expires_at <= now() then 'expired'
    when v_invite.revoked_at is not null or v_session.status <> 'lobby' then 'closed'
    when v_invite.use_count >= v_invite.max_uses or v_count >= v_capacity then 'full'
    else 'available'
  end;

  return query select
    v_session.game_key,
    coalesce(v_host_name, 'Your host'),
    v_count,
    v_capacity,
    v_state,
    v_state = 'available',
    v_already_joined,
    v_session.id,
    v_invite.short_code;
end;
$$;

revoke all on function public.preview_open_game_table(text, text) from public, anon;
grant execute on function public.preview_open_game_table(text, text) to authenticated;

create or replace function public.restart_open_game_table(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.game_sessions%rowtype;
  v_players jsonb;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select * into v_session
  from public.game_sessions
  where id = p_session_id and host_user_id = v_user
  for update;
  if v_session.id is null then raise exception 'host_table_not_found' using errcode = '42501'; end if;
  if v_session.game_key not in ('bank', 'slanguage') or v_session.status <> 'completed' then
    raise exception 'table_not_ready_for_rematch';
  end if;

  update public.game_invites set revoked_at = now()
  where public.game_invites.session_id = p_session_id and revoked_at is null;

  if v_session.game_key = 'bank' then
    select jsonb_agg(
      jsonb_build_object(
        'id', seat_index + 1,
        'name', display_name_snapshot,
        'score', 0,
        'banked', false
      ) order by seat_index
    ) into v_players
    from public.game_participants
    where public.game_participants.session_id = p_session_id and join_status <> 'left';

    update public.game_sessions set
      status = 'lobby',
      state = jsonb_build_object(
        'players', coalesce(v_players, '[]'::jsonb),
        'bankingRule', coalesce(v_session.state->>'bankingRule', 'anyone'),
        'capacity', coalesce((v_session.state->>'capacity')::integer, 6),
        'pot', 0,
        'round', 1,
        'maxRounds', coalesce((v_session.state->>'maxRounds')::integer, 10),
        'rollInRound', 0,
        'activePlayer', 0,
        'status', 'playing',
        'lastRoll', jsonb_build_array(3, 5),
        'message', 'Three safe rolls'
      ),
      state_version = state_version + 1,
      expires_at = now() + interval '6 hours',
      updated_at = now()
    where id = p_session_id;
  else
    delete from public.slanguage_votes where public.slanguage_votes.session_id = p_session_id;
    delete from public.slanguage_submissions where public.slanguage_submissions.session_id = p_session_id;
    delete from public.slanguage_hands where public.slanguage_hands.session_id = p_session_id;
    update public.game_sessions set
      status = 'lobby',
      state = jsonb_build_object(
        'phase', 'lobby',
        'status', 'playing',
        'capacity', coalesce((v_session.state->>'capacity')::integer, 8),
        'roundIndex', 0,
        'totalRounds', coalesce((v_session.state->>'totalRounds')::integer, 5),
        'promptId', null,
        'deadline', null,
        'revealOrder', '[]'::jsonb,
        'revealIndex', 0,
        'revealStartedAt', null,
        'crowns', '{}'::jsonb,
        'crownScores', '{}'::jsonb,
        'roundWinnerIds', '[]'::jsonb,
        'winnerIds', '[]'::jsonb
      ),
      state_version = state_version + 1,
      expires_at = now() + interval '6 hours',
      updated_at = now()
    where id = p_session_id;
  end if;
end;
$$;

revoke all on function public.restart_open_game_table(uuid) from public, anon;
grant execute on function public.restart_open_game_table(uuid) to authenticated;

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
;

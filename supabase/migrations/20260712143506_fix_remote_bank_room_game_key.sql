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
;

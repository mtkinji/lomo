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
grant execute on function public.create_remote_pass_pattern_room(text[], text) to authenticated;;

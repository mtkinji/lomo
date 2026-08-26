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
;

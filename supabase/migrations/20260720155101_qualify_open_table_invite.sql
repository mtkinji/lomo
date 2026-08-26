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
;

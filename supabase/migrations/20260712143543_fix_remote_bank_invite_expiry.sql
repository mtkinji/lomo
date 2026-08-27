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
;

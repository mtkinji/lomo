-- Chores RPC wrappers are authenticated-only. PostgreSQL grants EXECUTE to
-- PUBLIC for new functions unless it is revoked explicitly.

revoke all on function public.get_kwilt_chore_snapshot(uuid,text)
  from public, anon, authenticated;
revoke all on function public.execute_kwilt_chore_action(jsonb,uuid,text)
  from public, anon, authenticated;

grant execute on function public.get_kwilt_chore_snapshot(uuid,text)
  to authenticated;
grant execute on function public.execute_kwilt_chore_action(jsonb,uuid,text)
  to authenticated;

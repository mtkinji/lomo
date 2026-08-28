alter table public.kwilt_calendar_preferences
  add column if not exists version integer not null default 0 check (version >= 0);

create or replace function public.update_kwilt_calendar_preferences(
  p_user_id uuid,
  p_expected_version integer,
  p_read_calendar_refs jsonb,
  p_write_calendar_ref jsonb
)
returns table(status text, version integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_version integer;
begin
  if p_expected_version < 0 or jsonb_typeof(p_read_calendar_refs) <> 'array' then
    raise exception 'invalid_calendar_preferences';
  end if;
  select p.version into current_version
    from public.kwilt_calendar_preferences p
    where p.user_id = p_user_id
    for update;
  if not found then
    if p_expected_version <> 0 then
      return query select 'stale'::text, 0;
      return;
    end if;
    insert into public.kwilt_calendar_preferences (
      user_id, read_calendar_refs, write_calendar_ref, version, updated_at
    ) values (p_user_id, p_read_calendar_refs, p_write_calendar_ref, 1, now());
    return query select 'updated'::text, 1;
    return;
  end if;
  if current_version <> p_expected_version then
    return query select 'stale'::text, current_version;
    return;
  end if;
  update public.kwilt_calendar_preferences
    set read_calendar_refs = p_read_calendar_refs,
        write_calendar_ref = p_write_calendar_ref,
        version = current_version + 1,
        updated_at = now()
    where user_id = p_user_id;
  return query select 'updated'::text, current_version + 1;
end;
$$;

revoke all on function public.update_kwilt_calendar_preferences(uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.update_kwilt_calendar_preferences(uuid, integer, jsonb, jsonb) to service_role;

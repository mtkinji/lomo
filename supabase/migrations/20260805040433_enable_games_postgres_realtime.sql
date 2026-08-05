-- Room membership and game state are authoritative in Postgres. Publishing these
-- tables lets authenticated participants refresh from committed state even when a
-- best-effort client broadcast is delayed or unavailable.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'game_sessions'
    ) then
    alter publication supabase_realtime add table public.game_sessions;
  end if;
end
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'game_participants'
    ) then
    alter publication supabase_realtime add table public.game_participants;
  end if;
end
$$;

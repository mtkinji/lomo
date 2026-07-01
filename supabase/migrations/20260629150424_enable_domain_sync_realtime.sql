do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kwilt_arcs'
  ) then
    alter publication supabase_realtime add table public.kwilt_arcs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kwilt_goals'
  ) then
    alter publication supabase_realtime add table public.kwilt_goals;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kwilt_activities'
  ) then
    alter publication supabase_realtime add table public.kwilt_activities;
  end if;
end $$;

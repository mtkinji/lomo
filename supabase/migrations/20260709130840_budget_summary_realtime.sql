do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'budget_transactions'
    ) then
      alter publication supabase_realtime add table public.budget_transactions;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'budget_financial_connections'
    ) then
      alter publication supabase_realtime add table public.budget_financial_connections;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'budget_financial_accounts'
    ) then
      alter publication supabase_realtime add table public.budget_financial_accounts;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'budget_forecast_settings'
    ) then
      alter publication supabase_realtime add table public.budget_forecast_settings;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'budget_transaction_match_rules'
    ) then
      alter publication supabase_realtime add table public.budget_transaction_match_rules;
    end if;
  end if;
end $$;
;

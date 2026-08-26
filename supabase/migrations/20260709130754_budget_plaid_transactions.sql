create schema if not exists budget_private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.budget_financial_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'plaid' check (provider = 'plaid'),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'development', 'production')),
  plaid_item_id text not null,
  institution_id text,
  institution_name text not null default 'Linked account',
  status text not null default 'linked' check (status in ('linked', 'syncing', 'healthy', 'error')),
  products text[] not null default array['transactions']::text[],
  sync_cursor text,
  last_synced_at timestamptz,
  last_sync_added integer not null default 0,
  last_sync_modified integer not null default 0,
  last_sync_removed integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plaid_item_id)
);

drop trigger if exists set_budget_financial_connections_updated_at on public.budget_financial_connections;
create trigger set_budget_financial_connections_updated_at
before update on public.budget_financial_connections
for each row execute function public.set_updated_at();

create table if not exists budget_private.budget_plaid_tokens (
  connection_id uuid primary key references public.budget_financial_connections(id) on delete cascade,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_budget_plaid_tokens_updated_at on budget_private.budget_plaid_tokens;
create trigger set_budget_plaid_tokens_updated_at
before update on budget_private.budget_plaid_tokens
for each row execute function public.set_updated_at();

create table if not exists public.budget_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.budget_financial_connections(id) on delete cascade,
  plaid_account_id text not null,
  name text not null,
  official_name text,
  mask text,
  type text,
  subtype text,
  iso_currency_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, plaid_account_id)
);

drop trigger if exists set_budget_financial_accounts_updated_at on public.budget_financial_accounts;
create trigger set_budget_financial_accounts_updated_at
before update on public.budget_financial_accounts
for each row execute function public.set_updated_at();

create table if not exists public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.budget_financial_connections(id) on delete cascade,
  financial_account_id uuid references public.budget_financial_accounts(id) on delete set null,
  plaid_account_id text not null,
  plaid_transaction_id text not null,
  pending_transaction_id text,
  name text not null,
  merchant_name text,
  original_description text,
  amount_cents integer not null,
  direction text not null check (direction in ('inflow', 'outflow')),
  authorized_date date,
  date date not null,
  pending boolean not null default false,
  iso_currency_code text not null default 'USD',
  personal_finance_category_primary text,
  personal_finance_category_detailed text,
  personal_finance_category_confidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, plaid_transaction_id)
);

create index if not exists budget_transactions_user_date_idx
on public.budget_transactions (user_id, date desc);

drop trigger if exists set_budget_transactions_updated_at on public.budget_transactions;
create trigger set_budget_transactions_updated_at
before update on public.budget_transactions
for each row execute function public.set_updated_at();

alter table public.budget_financial_connections enable row level security;
alter table public.budget_financial_accounts enable row level security;
alter table public.budget_transactions enable row level security;
alter table budget_private.budget_plaid_tokens enable row level security;

drop policy if exists "Users can read their own budget financial connections" on public.budget_financial_connections;
create policy "Users can read their own budget financial connections"
on public.budget_financial_connections
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own budget financial accounts" on public.budget_financial_accounts;
create policy "Users can read their own budget financial accounts"
on public.budget_financial_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own budget transactions" on public.budget_transactions;
create policy "Users can read their own budget transactions"
on public.budget_transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.budget_financial_connections from anon, authenticated;
revoke all on public.budget_financial_accounts from anon, authenticated;
revoke all on public.budget_transactions from anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.budget_financial_connections to authenticated;
grant select on public.budget_financial_accounts to authenticated;
grant select on public.budget_transactions to authenticated;

revoke all on schema budget_private from public;
revoke all on all tables in schema budget_private from public;
;

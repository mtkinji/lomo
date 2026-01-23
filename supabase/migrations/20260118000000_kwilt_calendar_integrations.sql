-- Kwilt: Calendar integrations (direct OAuth for Google + Microsoft)
-- Stores connected accounts, encrypted tokens, and per-user read/write preferences.

create extension if not exists "pgcrypto";

-- -------------------------------
-- Connected accounts
-- -------------------------------

create table if not exists public.kwilt_calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  provider_account_id text not null,
  email text null,
  display_name text null,
  scopes text[] null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create index if not exists kwilt_calendar_accounts_user_id_idx
  on public.kwilt_calendar_accounts(user_id);

alter table public.kwilt_calendar_accounts enable row level security;

drop policy if exists "kwilt_calendar_accounts_owner_only" on public.kwilt_calendar_accounts;
create policy "kwilt_calendar_accounts_owner_only"
  on public.kwilt_calendar_accounts
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------
-- Encrypted token storage (per account)
-- -------------------------------

create table if not exists public.kwilt_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.kwilt_calendar_accounts(id) on delete cascade,
  token_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id)
);

create index if not exists kwilt_calendar_tokens_account_id_idx
  on public.kwilt_calendar_tokens(account_id);

alter table public.kwilt_calendar_tokens enable row level security;

drop policy if exists "kwilt_calendar_tokens_owner_only" on public.kwilt_calendar_tokens;
create policy "kwilt_calendar_tokens_owner_only"
  on public.kwilt_calendar_tokens
  for all
  to authenticated
  using (
    account_id in (
      select id from public.kwilt_calendar_accounts where user_id = auth.uid()
    )
  )
  with check (
    account_id in (
      select id from public.kwilt_calendar_accounts where user_id = auth.uid()
    )
  );

-- -------------------------------
-- Per-user calendar preferences
-- -------------------------------

create table if not exists public.kwilt_calendar_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  read_calendar_refs jsonb not null default '[]'::jsonb,
  write_calendar_ref jsonb null,
  updated_at timestamptz not null default now()
);

alter table public.kwilt_calendar_preferences enable row level security;

drop policy if exists "kwilt_calendar_prefs_owner_only" on public.kwilt_calendar_preferences;
create policy "kwilt_calendar_prefs_owner_only"
  on public.kwilt_calendar_preferences
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());



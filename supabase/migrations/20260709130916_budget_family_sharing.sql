create table if not exists public.budget_households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Kwilt family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_budget_households_updated_at on public.budget_households;
create trigger set_budget_households_updated_at
before update on public.budget_households
for each row execute function public.set_updated_at();

create table if not exists public.budget_household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.budget_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create unique index if not exists budget_household_members_one_active_household_per_user
on public.budget_household_members (user_id)
where status = 'active';

drop trigger if exists set_budget_household_members_updated_at on public.budget_household_members;
create trigger set_budget_household_members_updated_at
before update on public.budget_household_members
for each row execute function public.set_updated_at();

create table if not exists public.budget_household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.budget_households(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  invite_code_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.budget_households enable row level security;
alter table public.budget_household_members enable row level security;
alter table public.budget_household_invites enable row level security;

create or replace function public.can_access_budget_household(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.budget_household_members member
    where member.household_id = target_household_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  );
$$;

create or replace function public.can_access_budget_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = (select auth.uid())
    or exists (
      select 1
      from public.budget_household_members viewer
      join public.budget_household_members target
        on target.household_id = viewer.household_id
      where viewer.user_id = (select auth.uid())
        and viewer.status = 'active'
        and target.user_id = target_user_id
        and target.status = 'active'
    );
$$;

drop policy if exists "Household members can read shared households" on public.budget_households;
create policy "Household members can read shared households"
on public.budget_households
for select
to authenticated
using (public.can_access_budget_household(id));

drop policy if exists "Household members can read shared memberships" on public.budget_household_members;
create policy "Household members can read shared memberships"
on public.budget_household_members
for select
to authenticated
using (public.can_access_budget_household(household_id));

drop policy if exists "Household owners can read active invites" on public.budget_household_invites;
create policy "Household owners can read active invites"
on public.budget_household_invites
for select
to authenticated
using (
  created_by_user_id = (select auth.uid())
  or exists (
    select 1
    from public.budget_household_members member
    where member.household_id = budget_household_invites.household_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
      and member.status = 'active'
  )
);

drop policy if exists "Users can read their own budget financial connections" on public.budget_financial_connections;
drop policy if exists "Household members can read shared budget financial connections" on public.budget_financial_connections;
create policy "Household members can read shared budget financial connections"
on public.budget_financial_connections
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can read their own budget financial accounts" on public.budget_financial_accounts;
drop policy if exists "Household members can read shared budget financial accounts" on public.budget_financial_accounts;
create policy "Household members can read shared budget financial accounts"
on public.budget_financial_accounts
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can read their own budget transactions" on public.budget_transactions;
drop policy if exists "Household members can read shared budget transactions" on public.budget_transactions;
create policy "Household members can read shared budget transactions"
on public.budget_transactions
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can update their own budget transaction reviews" on public.budget_transactions;
drop policy if exists "Household members can update shared budget transaction reviews" on public.budget_transactions;
create policy "Household members can update shared budget transaction reviews"
on public.budget_transactions
for update
to authenticated
using (public.can_access_budget_user(user_id))
with check (public.can_access_budget_user(user_id));

drop policy if exists "Users can read their own budget forecast settings" on public.budget_forecast_settings;
drop policy if exists "Household members can read shared budget forecast settings" on public.budget_forecast_settings;
create policy "Household members can read shared budget forecast settings"
on public.budget_forecast_settings
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can read their own budget transaction match rules" on public.budget_transaction_match_rules;
drop policy if exists "Household members can read shared budget transaction match rules" on public.budget_transaction_match_rules;
create policy "Household members can read shared budget transaction match rules"
on public.budget_transaction_match_rules
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can update their own budget transaction match rules" on public.budget_transaction_match_rules;
drop policy if exists "Household members can update shared budget transaction match rules" on public.budget_transaction_match_rules;
create policy "Household members can update shared budget transaction match rules"
on public.budget_transaction_match_rules
for update
to authenticated
using (public.can_access_budget_user(user_id))
with check (public.can_access_budget_user(user_id));

grant select on public.budget_households to authenticated;
grant select on public.budget_household_members to authenticated;
grant select on public.budget_household_invites to authenticated;
;

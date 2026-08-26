create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.budget_living_plan_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.budget_households(id) on delete set null,
  living_percent integer not null default 70 check (living_percent between 0 and 100),
  giving_percent integer not null default 10 check (giving_percent between 0 and 100),
  saving_percent integer not null default 20 check (saving_percent between 0 and 100),
  template_id text not null default '70-10-20' check (length(trim(template_id)) > 0),
  source text not null default 'onboarding' check (source in ('onboarding', 'settings', 'import', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  check (living_percent + giving_percent + saving_percent = 100)
);

drop trigger if exists set_budget_living_plan_preferences_updated_at on public.budget_living_plan_preferences;
create trigger set_budget_living_plan_preferences_updated_at
before update on public.budget_living_plan_preferences
for each row execute function public.set_updated_at();

create table if not exists public.budget_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.budget_households(id) on delete set null,
  preference_id uuid references public.budget_living_plan_preferences(id) on delete set null,
  basis_key text not null check (length(trim(basis_key)) > 0),
  lookback_months integer not null default 12 check (lookback_months between 1 and 24),
  monthly_income_cents integer not null check (monthly_income_cents >= 0),
  living_target_cents integer not null check (living_target_cents >= 0),
  fixed_cost_cents integer not null check (fixed_cost_cents >= 0),
  variable_budget_cents integer not null check (variable_budget_cents >= 0),
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  recommendation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, basis_key)
);

drop trigger if exists set_budget_recommendation_runs_updated_at on public.budget_recommendation_runs;
create trigger set_budget_recommendation_runs_updated_at
before update on public.budget_recommendation_runs
for each row execute function public.set_updated_at();

create index if not exists budget_recommendation_runs_user_created_idx
on public.budget_recommendation_runs (user_id, created_at desc);

alter table public.budget_living_plan_preferences enable row level security;
alter table public.budget_recommendation_runs enable row level security;

drop policy if exists "Users can read accessible budget living plan preferences" on public.budget_living_plan_preferences;
create policy "Users can read accessible budget living plan preferences"
on public.budget_living_plan_preferences
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can insert their own budget living plan preferences" on public.budget_living_plan_preferences;
create policy "Users can insert their own budget living plan preferences"
on public.budget_living_plan_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budget living plan preferences" on public.budget_living_plan_preferences;
create policy "Users can update their own budget living plan preferences"
on public.budget_living_plan_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read accessible budget recommendation runs" on public.budget_recommendation_runs;
create policy "Users can read accessible budget recommendation runs"
on public.budget_recommendation_runs
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can insert their own budget recommendation runs" on public.budget_recommendation_runs;
create policy "Users can insert their own budget recommendation runs"
on public.budget_recommendation_runs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budget recommendation runs" on public.budget_recommendation_runs;
create policy "Users can update their own budget recommendation runs"
on public.budget_recommendation_runs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.budget_living_plan_preferences from anon, authenticated;
revoke all on public.budget_recommendation_runs from anon, authenticated;

grant select, insert, update on public.budget_living_plan_preferences to authenticated;
grant select, insert, update on public.budget_recommendation_runs to authenticated;
;

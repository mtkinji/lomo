create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.budget_forecast_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id text not null,
  forecast_mode text not null default 'paced' check (forecast_mode in ('paced', 'scheduled', 'manual')),
  manual_projected_spend_cents integer check (manual_projected_spend_cents is null or manual_projected_spend_cents >= 0),
  scheduled_label text check (scheduled_label is null or length(trim(scheduled_label)) > 0),
  scheduled_amount_cents integer check (scheduled_amount_cents is null or scheduled_amount_cents > 0),
  scheduled_due_day integer check (scheduled_due_day is null or scheduled_due_day between 1 and 31),
  scheduled_merchant_contains text check (scheduled_merchant_contains is null or length(trim(scheduled_merchant_contains)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, budget_id),
  check (
    (
      forecast_mode = 'paced'
      and manual_projected_spend_cents is null
      and scheduled_label is null
      and scheduled_amount_cents is null
      and scheduled_due_day is null
      and scheduled_merchant_contains is null
    )
    or (
      forecast_mode = 'manual'
      and manual_projected_spend_cents is not null
      and scheduled_label is null
      and scheduled_amount_cents is null
      and scheduled_due_day is null
      and scheduled_merchant_contains is null
    )
    or (
      forecast_mode = 'scheduled'
      and manual_projected_spend_cents is null
      and scheduled_label is not null
      and scheduled_amount_cents is not null
      and scheduled_due_day is not null
    )
  )
);

drop trigger if exists set_budget_forecast_settings_updated_at on public.budget_forecast_settings;
create trigger set_budget_forecast_settings_updated_at
before update on public.budget_forecast_settings
for each row execute function public.set_updated_at();

alter table public.budget_forecast_settings enable row level security;

drop policy if exists "Users can read their own budget forecast settings" on public.budget_forecast_settings;
create policy "Users can read their own budget forecast settings"
on public.budget_forecast_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own budget forecast settings" on public.budget_forecast_settings;
create policy "Users can insert their own budget forecast settings"
on public.budget_forecast_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budget forecast settings" on public.budget_forecast_settings;
create policy "Users can update their own budget forecast settings"
on public.budget_forecast_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.budget_forecast_settings from anon, authenticated;
grant select, insert, update on public.budget_forecast_settings to authenticated;
;

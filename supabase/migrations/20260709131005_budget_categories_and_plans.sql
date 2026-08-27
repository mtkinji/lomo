create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.budget_households(id) on delete set null,
  slug text not null check (length(trim(slug)) > 0),
  legacy_budget_id text,
  name text not null check (length(trim(name)) > 0),
  icon_key text,
  description text,
  accent_color text,
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_categories_user_slug_unique unique (user_id, slug)
);

create unique index if not exists budget_categories_active_legacy_id_unique
on public.budget_categories (user_id, legacy_budget_id)
where status = 'active' and legacy_budget_id is not null;

drop trigger if exists set_budget_categories_updated_at on public.budget_categories;
create trigger set_budget_categories_updated_at
before update on public.budget_categories
for each row execute function public.set_updated_at();

create table if not exists public.budget_category_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.budget_households(id) on delete set null,
  slug text not null check (length(trim(slug)) > 0),
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_category_groups_user_slug_unique unique (user_id, slug)
);

drop trigger if exists set_budget_category_groups_updated_at on public.budget_category_groups;
create trigger set_budget_category_groups_updated_at
before update on public.budget_category_groups
for each row execute function public.set_updated_at();

create table if not exists public.budget_category_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.budget_category_groups(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, category_id)
);

create table if not exists public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cadence text not null default 'monthly' check (cadence in ('monthly')),
  base_budget_cents integer not null check (base_budget_cents >= 0),
  rollover_enabled boolean not null default false,
  rollover_reset_starts_on date,
  starts_on date,
  ends_on date,
  forecast_mode text not null default 'paced' check (forecast_mode in ('paced', 'scheduled', 'manual')),
  manual_projected_spend_cents integer,
  scheduled_label text,
  scheduled_amount_cents integer,
  scheduled_due_day integer,
  scheduled_merchant_contains text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_plans_category_unique unique (category_id)
);

drop trigger if exists set_budget_plans_updated_at on public.budget_plans;
create trigger set_budget_plans_updated_at
before update on public.budget_plans
for each row execute function public.set_updated_at();

alter table public.budget_categories enable row level security;
alter table public.budget_category_groups enable row level security;
alter table public.budget_category_group_members enable row level security;
alter table public.budget_plans enable row level security;

drop policy if exists "Users can read accessible budget categories" on public.budget_categories;
create policy "Users can read accessible budget categories"
on public.budget_categories
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can insert their own budget categories" on public.budget_categories;
create policy "Users can insert their own budget categories"
on public.budget_categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budget categories" on public.budget_categories;
create policy "Users can update their own budget categories"
on public.budget_categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read accessible budget category groups" on public.budget_category_groups;
create policy "Users can read accessible budget category groups"
on public.budget_category_groups
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can insert their own budget category groups" on public.budget_category_groups;
create policy "Users can insert their own budget category groups"
on public.budget_category_groups
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budget category groups" on public.budget_category_groups;
create policy "Users can update their own budget category groups"
on public.budget_category_groups
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read accessible budget category group members" on public.budget_category_group_members;
create policy "Users can read accessible budget category group members"
on public.budget_category_group_members
for select
to authenticated
using (
  exists (
    select 1
    from public.budget_categories category
    where category.id = budget_category_group_members.category_id
      and public.can_access_budget_user(category.user_id)
  )
);

drop policy if exists "Users can insert their own budget category group members" on public.budget_category_group_members;
create policy "Users can insert their own budget category group members"
on public.budget_category_group_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.budget_categories category
    join public.budget_category_groups category_group
      on category_group.id = budget_category_group_members.group_id
    where category.id = budget_category_group_members.category_id
      and category.user_id = (select auth.uid())
      and category_group.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update their own budget category group members" on public.budget_category_group_members;
create policy "Users can update their own budget category group members"
on public.budget_category_group_members
for update
to authenticated
using (
  exists (
    select 1
    from public.budget_categories category
    join public.budget_category_groups category_group
      on category_group.id = budget_category_group_members.group_id
    where category.id = budget_category_group_members.category_id
      and category.user_id = (select auth.uid())
      and category_group.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.budget_categories category
    join public.budget_category_groups category_group
      on category_group.id = budget_category_group_members.group_id
    where category.id = budget_category_group_members.category_id
      and category.user_id = (select auth.uid())
      and category_group.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can read accessible budget plans" on public.budget_plans;
create policy "Users can read accessible budget plans"
on public.budget_plans
for select
to authenticated
using (public.can_access_budget_user(user_id));

drop policy if exists "Users can insert their own budget plans" on public.budget_plans;
create policy "Users can insert their own budget plans"
on public.budget_plans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own budget plans" on public.budget_plans;
create policy "Users can update their own budget plans"
on public.budget_plans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.budget_categories from anon, authenticated;
revoke all on public.budget_category_groups from anon, authenticated;
revoke all on public.budget_category_group_members from anon, authenticated;
revoke all on public.budget_plans from anon, authenticated;

grant select, insert, update on public.budget_categories to authenticated;
grant select, insert, update on public.budget_category_groups to authenticated;
grant select, insert, update on public.budget_category_group_members to authenticated;
grant select, insert, update on public.budget_plans to authenticated;
;

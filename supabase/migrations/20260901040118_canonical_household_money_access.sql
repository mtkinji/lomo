-- kwilt_household_money_access_v1
-- Hosted migration version: 20260901040118.
-- Canonical Kwilt Household owner/caregiver membership grants automatic access
-- to the household Money owner's rows. Child memberships are intentionally
-- excluded. The legacy Money-only household remains a compatibility fallback.

create schema if not exists private;

create or replace function private.budget_users_share_adult_household(
  p_viewer_user_id uuid,
  p_target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_viewer_user_id is not null
    and p_target_user_id is not null
    and exists (
      select 1
      from public.kwilt_person_auth_bindings viewer_binding
      join public.kwilt_household_memberships viewer_membership
        on viewer_membership.person_id = viewer_binding.person_id
       and viewer_membership.status = 'active'
       and viewer_membership.role in ('owner', 'caregiver')
      join public.kwilt_household_memberships target_membership
        on target_membership.household_id = viewer_membership.household_id
       and target_membership.status = 'active'
       and target_membership.role in ('owner', 'caregiver')
      join public.kwilt_person_auth_bindings target_binding
        on target_binding.person_id = target_membership.person_id
       and target_binding.status = 'active'
      where viewer_binding.user_id = p_viewer_user_id
        and viewer_binding.status = 'active'
        and target_binding.user_id = p_target_user_id
    );
$$;

revoke all on function private.budget_users_share_adult_household(uuid, uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.budget_users_share_adult_household(uuid, uuid) to authenticated;

create or replace function private.budget_canonical_adult_owner_user_id(p_actor_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select owner_binding.user_id
  from public.kwilt_person_auth_bindings actor_binding
  join public.kwilt_household_memberships actor_membership
    on actor_membership.person_id = actor_binding.person_id
   and actor_membership.status = 'active'
   and actor_membership.role in ('owner', 'caregiver')
  join public.kwilt_household_memberships owner_membership
    on owner_membership.household_id = actor_membership.household_id
   and owner_membership.status = 'active'
   and owner_membership.role = 'owner'
  join public.kwilt_person_auth_bindings owner_binding
    on owner_binding.person_id = owner_membership.person_id
   and owner_binding.status = 'active'
  where actor_binding.user_id = p_actor_user_id
    and actor_binding.status = 'active'
  order by actor_membership.joined_at, actor_membership.id
  limit 1;
$$;

create or replace function private.budget_actor_is_active_household_child(p_actor_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_person_auth_bindings binding
    join public.kwilt_household_memberships membership
      on membership.person_id = binding.person_id
     and membership.status = 'active'
     and membership.role = 'child'
    where binding.user_id = p_actor_user_id
      and binding.status = 'active'
  );
$$;

revoke all on function private.budget_canonical_adult_owner_user_id(uuid) from public, anon;
revoke all on function private.budget_actor_is_active_household_child(uuid) from public, anon;
grant execute on function private.budget_canonical_adult_owner_user_id(uuid) to authenticated;
grant execute on function private.budget_actor_is_active_household_child(uuid) to authenticated;

create or replace function public.can_access_budget_user(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with context as (
    select
      private.budget_canonical_adult_owner_user_id((select auth.uid())) as canonical_owner_user_id,
      private.budget_actor_is_active_household_child((select auth.uid())) as active_household_child
  )
  select (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
    and case
      when context.active_household_child then false
      when context.canonical_owner_user_id is not null
        then target_user_id = context.canonical_owner_user_id
      else target_user_id = (select auth.uid())
        or exists (
          select 1
          from public.budget_household_members viewer
          join public.budget_household_members target
            on target.household_id = viewer.household_id
          where viewer.user_id = (select auth.uid())
            and viewer.status = 'active'
            and target.user_id = target_user_id
            and target.status = 'active'
        )
    end
  from context;
$$;

create or replace function public.can_manage_budget_user(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.can_access_budget_user(target_user_id);
$$;

create or replace function private.budget_effective_owner_user_id(p_actor_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with legacy_owner as (
    select household.owner_user_id as user_id
    from public.budget_household_members member
    join public.budget_households household on household.id = member.household_id
    where member.user_id = p_actor_user_id
      and member.status = 'active'
    order by member.joined_at, member.id
    limit 1
  )
  select case
    when private.budget_actor_is_active_household_child(p_actor_user_id) then null
    else coalesce(
      private.budget_canonical_adult_owner_user_id(p_actor_user_id),
      (select user_id from legacy_owner),
      p_actor_user_id
    )
  end;
$$;

revoke all on function private.budget_effective_owner_user_id(uuid) from public, anon;
grant execute on function private.budget_effective_owner_user_id(uuid) to authenticated;

create or replace function public.budget_effective_owner_user_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null
      or coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is true
    then null
    else private.budget_effective_owner_user_id((select auth.uid()))
  end;
$$;

drop policy if exists "Users can insert their own budget categories" on public.budget_categories;
create policy "Household adults can insert shared budget categories"
on public.budget_categories
for insert to authenticated
with check (user_id = public.budget_effective_owner_user_id());

drop policy if exists "Users can update their own budget categories" on public.budget_categories;
create policy "Household adults can update shared budget categories"
on public.budget_categories
for update to authenticated
using (public.can_manage_budget_user(user_id))
with check (user_id = public.budget_effective_owner_user_id());

drop policy if exists "Users can insert their own budget plans" on public.budget_plans;
create policy "Household adults can insert shared budget plans"
on public.budget_plans
for insert to authenticated
with check (user_id = public.budget_effective_owner_user_id());

drop policy if exists "Users can update their own budget plans" on public.budget_plans;
create policy "Household adults can update shared budget plans"
on public.budget_plans
for update to authenticated
using (public.can_manage_budget_user(user_id))
with check (user_id = public.budget_effective_owner_user_id());

create or replace function public.create_budget_category_with_plan(
  p_name text,
  p_budget_cents integer,
  p_icon_key text default 'custom'::text,
  p_description text default null::text,
  p_accent_color text default '#315545'::text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_category_id uuid;
  v_budget_id text;
  v_slug_base text;
begin
  if v_owner_user_id is null then
    raise exception 'Sign in before creating a category.';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Category name is required.';
  end if;
  if p_budget_cents is null or p_budget_cents < 0 then
    raise exception 'Budget amount must be zero or greater.';
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then v_slug_base := 'category'; end if;
  v_budget_id := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.budget_categories (
    user_id, slug, legacy_budget_id, name, icon_key, description, accent_color, status
  ) values (
    v_owner_user_id, v_budget_id, v_budget_id, trim(p_name), nullif(trim(p_icon_key), ''),
    nullif(trim(p_description), ''), nullif(trim(p_accent_color), ''), 'active'
  ) returning id into v_category_id;

  insert into public.budget_plans (
    category_id, user_id, cadence, base_budget_cents, forecast_mode, plan_role, status
  ) values (
    v_category_id, v_owner_user_id, 'monthly', p_budget_cents, 'paced', 'flexible', 'active'
  );

  return v_budget_id;
end;
$$;

create or replace function public.reorder_budget_categories(p_category_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_active_ids uuid[];
  v_confirmed_at timestamptz := clock_timestamp();
begin
  if v_owner_user_id is null then
    raise exception 'Sign in to reorder Money categories.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_category_ids), 0) = 0
    or exists (select 1 from unnest(p_category_ids) as input(category_id) where input.category_id is null)
    or (select count(distinct input.category_id) from unnest(p_category_ids) as input(category_id)) <> cardinality(p_category_ids)
  then
    raise exception 'category_order_must_contain_each_category_once' using errcode = '22023';
  end if;

  perform 1 from public.budget_categories
  where user_id = v_owner_user_id and status = 'active'
  order by id for update;

  select coalesce(array_agg(id order by sort_order, id), '{}'::uuid[])
  into v_active_ids
  from public.budget_categories
  where user_id = v_owner_user_id and status = 'active';

  if cardinality(v_active_ids) <> cardinality(p_category_ids)
    or exists (
      select input.category_id from unnest(p_category_ids) as input(category_id)
      except
      select active.category_id from unnest(v_active_ids) as active(category_id)
    )
  then
    raise exception 'category_order_must_match_active_categories' using errcode = '22023';
  end if;

  update public.budget_categories category
  set sort_order = (ordered.ordinality - 1)::integer
  from unnest(p_category_ids) with ordinality as ordered(category_id, ordinality)
  where category.id = ordered.category_id
    and category.user_id = v_owner_user_id
    and category.status = 'active';

  return jsonb_build_object('category_ids', to_jsonb(p_category_ids), 'updated_at', v_confirmed_at);
end;
$$;

create or replace function public.set_budget_category_cover(p_category_id uuid, p_cover jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_confirmed_category_id uuid;
  v_confirmed_at timestamptz := clock_timestamp();
begin
  if v_owner_user_id is null then
    raise exception 'Sign in to update a Money category cover.' using errcode = '42501';
  end if;
  update public.budget_categories
  set cover_image = p_cover
  where id = p_category_id
    and user_id = v_owner_user_id
    and status = 'active'
  returning id into v_confirmed_category_id;
  if v_confirmed_category_id is null then
    raise exception 'The Money category cover could not be updated.' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'category_id', v_confirmed_category_id,
    'cover', p_cover,
    'updated_at', v_confirmed_at
  );
end;
$$;

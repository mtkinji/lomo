-- Restore canonical Budget categories additively. Existing active categories,
-- names, plans, ordering, assignments, and household corrections remain intact.
create or replace function public.restore_default_budget_categories()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_created_category_ids uuid[] := '{}'::uuid[];
begin
  if v_user_id is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'A permanent user is required.' using errcode = '42501';
  end if;

  -- Serialize restoration for one owner so two taps cannot create the same
  -- missing default concurrently.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text, 0));

  with starter(slug, name, sort_order, mapping_tags) as (
    values
      ('housing', 'Housing', 10, array['housing']::text[]),
      ('utilities', 'Utilities', 20, array['utilities', 'connectivity']::text[]),
      ('groceries', 'Groceries', 30, array['food_at_home']::text[]),
      ('dining', 'Dining', 40, array['food_away']::text[]),
      ('transportation', 'Transportation', 50, array['transportation']::text[]),
      ('health-insurance', 'Health & insurance', 60, array['health', 'insurance']::text[]),
      ('family-care', 'Family & care', 70, array['family', 'childcare', 'education']::text[]),
      ('shopping-personal', 'Shopping & personal', 80, array['shopping', 'personal']::text[]),
      ('entertainment-subscriptions', 'Entertainment & subscriptions', 90, array['entertainment', 'subscriptions']::text[]),
      ('travel-gifts-occasions', 'Travel, gifts & occasions', 100, array['travel', 'gifts', 'holidays']::text[]),
      ('debt-fees', 'Debt & fees', 110, array['debt', 'fees']::text[]),
      ('other-spending', 'Other spending', 120, array['other_spending']::text[])
  ), inserted as (
    insert into public.budget_categories (
      user_id, slug, legacy_budget_id, name, icon_key, accent_color, status, sort_order,
      creation_provenance, mapping_policy_version, mapping_tags
    )
    select
      v_user_id, starter.slug, starter.slug, starter.name, 'custom', '#315545', 'active',
      starter.sort_order, 'system_starter', 'governed-category-v2', starter.mapping_tags
    from starter
    where not exists (
      select 1
      from public.budget_categories category
      where category.user_id = v_user_id
        and category.status = 'active'
        and (
          category.slug = starter.slug
          or category.legacy_budget_id = starter.slug
          or category.mapping_tags && starter.mapping_tags
        )
    )
    returning id
  )
  select coalesce(pg_catalog.array_agg(inserted.id), '{}'::uuid[])
  into v_created_category_ids
  from inserted;

  insert into public.budget_plans (
    category_id, user_id, cadence, base_budget_cents, rollover_enabled, forecast_mode, status,
    funding_rhythm, funding_policy_version, starter_weight, reserve_balance_cents,
    reserve_balance_period_id
  )
  select
    category.id, v_user_id, 'monthly', 0, false, 'paced', 'active',
    case when category.slug = 'travel-gifts-occasions' then 'reserve' else 'monthly' end,
    'category-funding-v2',
    case category.slug
      when 'housing' then 0.26 when 'utilities' then 0.09 when 'groceries' then 0.14
      when 'dining' then 0.06 when 'transportation' then 0.11 when 'health-insurance' then 0.08
      when 'family-care' then 0.07 when 'shopping-personal' then 0.06
      when 'entertainment-subscriptions' then 0.04 when 'travel-gifts-occasions' then 0.04
      when 'debt-fees' then 0.03 else 0.02
    end,
    0,
    pg_catalog.to_char(current_date, 'YYYY-MM')
  from public.budget_categories category
  where category.user_id = v_user_id
    and category.id = any(v_created_category_ids)
    and not exists (
      select 1 from public.budget_plans plan
      where plan.category_id = category.id and plan.status = 'active'
    );

  return pg_catalog.jsonb_build_object(
    'createdCategoryCount', pg_catalog.cardinality(v_created_category_ids),
    'categoryIds', pg_catalog.to_jsonb(v_created_category_ids)
  );
end;
$$;

revoke execute on function public.restore_default_budget_categories() from public, anon;
grant execute on function public.restore_default_budget_categories() to authenticated;

-- Canonical Money categories v2. This changes the starter policy for new
-- households and may add one evidence-backed conditional category. Existing
-- household category names, slugs, rules, corrections, and plans stay intact.
create or replace function public.reconcile_governed_household_money_foundation(p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_existing_count integer;
  v_core_created_count integer := 0;
  v_conditional_created_count integer := 0;
  v_assigned_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'A permanent user is required.' using errcode = '42501';
  end if;

  select count(*)::integer into v_existing_count
  from public.budget_categories
  where user_id = v_user_id and status = 'active';

  if v_existing_count = 0 then
    insert into public.budget_categories (
      user_id, slug, legacy_budget_id, name, icon_key, accent_color, status, sort_order,
      creation_provenance, mapping_policy_version, mapping_tags
    )
    select
      v_user_id, starter.slug, starter.slug, starter.name, 'custom', '#315545', 'active',
      starter.sort_order, 'system_starter', 'governed-category-v2', starter.mapping_tags
    from (values
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
    ) as starter(slug, name, sort_order, mapping_tags);
    get diagnostics v_core_created_count = row_count;
  end if;

  -- A user's existing startup or business category remains their category. We
  -- add the semantic mapping only when they have not already governed it.
  update public.budget_categories category
  set mapping_tags = case
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(work|business|startup|entrepreneur)' then array['work_business']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(rent|mortgage|housing|home)' then array['housing']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(grocer)' then array['food_at_home']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(restaurant|food|dining)' then array['food_away']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(transport|automotive|transit|gas)' then array['transportation']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(utilit|phone|internet|cable|electric)' then array['utilities', 'connectivity']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(health|medical|pharmac|insurance)' then array['health', 'insurance']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(family|childcare|education|care)' then array['family', 'childcare', 'education']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(gift|occasion|holiday|travel)' then array['gifts', 'holidays', 'travel']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(personal|shopping|clothing)' then array['personal', 'shopping']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(fun|entertainment|subscription|recreation)' then array['entertainment', 'subscriptions']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(debt|loan|fee|interest)' then array['debt', 'fees']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(other|misc)' then array['other_spending']::text[]
        else category.mapping_tags
      end,
      mapping_policy_version = 'governed-category-v2'
  where category.user_id = v_user_id
    and category.status = 'active'
    and cardinality(category.mapping_tags) = 0;

  -- Work & business is part of the canonical language, but not permanent page
  -- furniture. It appears only when supported provider evidence makes it useful.
  insert into public.budget_categories (
    user_id, slug, legacy_budget_id, name, icon_key, accent_color, status, sort_order,
    creation_provenance, mapping_policy_version, mapping_tags
  )
  select
    v_user_id, 'work-business', 'work-business', 'Work & business', 'custom', '#315545',
    'active', 130, 'system_starter', 'governed-category-v2', array['work_business']::text[]
  where exists (
    select 1
    from public.budget_transactions txn
    where txn.user_id = v_user_id
      and txn.direction = 'outflow'
      and coalesce(txn.money_meaning, 'unknown') not in ('transfer', 'not_counted', 'category_credit')
      and txn.personal_finance_category_confidence in ('HIGH', 'VERY_HIGH')
      and upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed))
        ~ '(BUSINESS_SERVICES|OFFICE_SUPPLIES|ACCOUNTING_AND_FINANCIAL_PLANNING|ADVERTISING_AND_MARKETING)'
  )
    and not exists (
      select 1
      from public.budget_categories category
      where category.user_id = v_user_id
        and category.status = 'active'
        and 'work_business' = any(category.mapping_tags)
    )
    and not exists (
      select 1
      from public.budget_categories category
      where category.user_id = v_user_id
        and (category.slug = 'work-business' or category.legacy_budget_id = 'work-business')
    );
  get diagnostics v_conditional_created_count = row_count;

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
      when 'debt-fees' then 0.03 when 'work-business' then 0.05 else 0.02
    end,
    0,
    to_char(current_date, 'YYYY-MM')
  from public.budget_categories category
  where category.user_id = v_user_id
    and category.status = 'active'
    and category.creation_provenance = 'system_starter'
    and category.mapping_policy_version = 'governed-category-v2'
    and not exists (
      select 1 from public.budget_plans existing_plan
      where existing_plan.category_id = category.id and existing_plan.status = 'active'
    );

  with eligible as (
    select txn.id,
      case
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(BUSINESS_SERVICES|OFFICE_SUPPLIES|ACCOUNTING_AND_FINANCIAL_PLANNING|ADVERTISING_AND_MARKETING)' then 'work_business'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GAS_STATION|PARKING|PUBLIC_TRANSIT|TRANSPORT|AUTOMOTIVE)' then 'transportation'
        when upper(coalesce(txn.personal_finance_category_detailed, '')) ~ '(TELEPHONE|INTERNET|CABLE|ELECTRIC|GAS|UTILIT)' then 'utilities'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(RENT|MORTGAGE|HOME_IMPROVEMENT)' then 'housing'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GROCER)' then 'food_at_home'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(RESTAURANT|COFFEE|FAST_FOOD|FOOD_AND_DRINK)' then 'food_away'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(MEDICAL|HEALTH|PHARMAC|INSURANCE)' then 'health'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(CHILDCARE|EDUCATION)' then 'family'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GIFT|DONATION)' then 'gifts'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(TRAVEL)' then 'travel'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(SUBSCRIPTION|ENTERTAINMENT|RECREATION)' then 'entertainment'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GENERAL_MERCHANDISE|PERSONAL_CARE|CLOTHING)' then 'shopping'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(LOAN|DEBT|BANK_FEES|INTEREST)' then 'debt'
        else 'other_spending'
      end as mapping_tag
    from public.budget_transactions txn
    where txn.user_id = v_user_id
      and txn.direction = 'outflow'
      and not txn.pending
      and txn.budget_id is null
      and txn.budget_match_source is null
      and txn.budget_assignment_source is null
      and coalesce(txn.money_meaning, 'unknown') not in ('transfer', 'not_counted', 'category_credit')
      and txn.personal_finance_category_confidence in ('HIGH', 'VERY_HIGH')
      and not exists (
        select 1 from public.budget_transaction_allocations allocation
        where allocation.transaction_id = txn.id
      )
  ), resolved_assignment as (
    select eligible.id,
      coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) as category_budget_id
    from eligible
    join lateral (
      select category.*
      from public.budget_categories category
      where category.user_id = v_user_id
        and category.status = 'active'
        and eligible.mapping_tag = any(category.mapping_tags)
      order by category.sort_order, category.id
      limit 1
    ) category on true
  )
  update public.budget_transactions txn
  set budget_id = eligible.category_budget_id,
      budget_assignment_source = 'provider_policy',
      budget_assignment_policy_version = 'governed-category-v2',
      budget_assignment_governed = false,
      budget_match_confidence = case
        when txn.personal_finance_category_confidence = 'VERY_HIGH' then 0.95 else 0.85
      end,
      budget_match_reason = 'Assigned from high-confidence provider evidence through the governed canonical category policy.'
  from resolved_assignment eligible
  where txn.id = eligible.id
    and txn.user_id = v_user_id;
  get diagnostics v_assigned_count = row_count;

  return jsonb_build_object(
    'createdCategoryCount', v_core_created_count + v_conditional_created_count,
    'assignedTransactionCount', v_assigned_count,
    'outcome', case
      when v_core_created_count > 0 then 'created_governed_foundation'
      when v_conditional_created_count > 0 then 'activated_conditional_category'
      else 'reconciled_governed_foundation'
    end
  );
end;
$$;

revoke execute on function public.reconcile_governed_household_money_foundation(uuid)
from public, anon, authenticated;
grant execute on function public.reconcile_governed_household_money_foundation(uuid)
to service_role;

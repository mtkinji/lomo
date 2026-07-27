-- Automatic category assignment is trusted server work. The mobile client can
-- request reconciliation through a JWT-verified Edge Function, but it cannot
-- write provider-policy provenance through the Data API.
create or replace function public.reconcile_governed_household_money_foundation(p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_existing_count integer;
  v_created_count integer := 0;
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
      starter.sort_order, 'system_starter', 'governed-category-v1', starter.mapping_tags
    from (values
      ('housing', 'Housing', 10, array['housing']::text[]),
      ('food', 'Food', 20, array['food_at_home', 'food_away']::text[]),
      ('transportation', 'Transportation', 30, array['transportation']::text[]),
      ('utilities', 'Utilities', 40, array['utilities', 'connectivity']::text[]),
      ('health', 'Health', 50, array['health']::text[]),
      ('family', 'Family', 60, array['childcare', 'family']::text[]),
      ('gifts-occasions', 'Gifts and occasions', 70, array['gifts', 'holidays']::text[]),
      ('personal', 'Personal', 80, array['personal', 'shopping']::text[]),
      ('fun', 'Fun', 90, array['entertainment', 'travel']::text[]),
      ('debt-fees', 'Debt and fees', 100, array['debt', 'fees']::text[]),
      ('other', 'Other', 110, array['other_spending']::text[])
    ) as starter(slug, name, sort_order, mapping_tags);
    get diagnostics v_created_count = row_count;
  end if;

  update public.budget_categories category
  set mapping_tags = case
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(rent|mortgage|housing|home)' then array['housing']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(grocer|restaurant|food|dining)' then array['food_at_home', 'food_away']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(transport|automotive|transit|gas)' then array['transportation']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(utilit|phone|internet|cable|electric)' then array['utilities', 'connectivity']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(health|medical|pharmac)' then array['health']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(family|childcare|education)' then array['family', 'childcare']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(gift|occasion|holiday)' then array['gifts', 'holidays']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(personal|shopping|clothing)' then array['personal', 'shopping']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(fun|entertainment|travel|recreation)' then array['entertainment', 'travel']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(debt|loan|fee|interest)' then array['debt', 'fees']::text[]
        when lower(concat_ws(' ', category.slug, category.legacy_budget_id, category.name)) ~ '(other|misc)' then array['other_spending']::text[]
        else category.mapping_tags
      end,
      mapping_policy_version = case
        when cardinality(category.mapping_tags) = 0 then 'governed-category-v1'
        else category.mapping_policy_version
      end
  where category.user_id = v_user_id
    and category.status = 'active'
    and cardinality(category.mapping_tags) = 0;

  insert into public.budget_plans (
    category_id, user_id, cadence, base_budget_cents, rollover_enabled, forecast_mode, status,
    funding_rhythm, funding_policy_version, starter_weight, reserve_balance_cents,
    reserve_balance_period_id
  )
  select
    category.id, v_user_id, 'monthly', 0, false, 'paced', 'active',
    case when category.slug = 'gifts-occasions' then 'reserve' else 'monthly' end,
    'category-funding-v1',
    case category.slug
      when 'housing' then 0.28 when 'food' then 0.18 when 'transportation' then 0.12
      when 'utilities' then 0.10 when 'health' then 0.08 when 'family' then 0.07
      when 'gifts-occasions' then 0.05 when 'personal' then 0.04 when 'fun' then 0.04
      when 'debt-fees' then 0.02 else 0.02
    end,
    0,
    to_char(current_date, 'YYYY-MM')
  from public.budget_categories category
  where category.user_id = v_user_id
    and category.status = 'active'
    and category.creation_provenance = 'system_starter'
    and not exists (
      select 1 from public.budget_plans existing_plan
      where existing_plan.category_id = category.id and existing_plan.status = 'active'
    );

  with eligible as (
    select txn.id,
      case
        when upper(coalesce(txn.personal_finance_category_detailed, '')) ~ '(TELEPHONE|INTERNET|CABLE|ELECTRIC|GAS|UTILIT)' then 'utilities'
        when upper(coalesce(txn.personal_finance_category_detailed, '')) ~ '(RENT|MORTGAGE|HOME_IMPROVEMENT)' then 'housing'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GROCER|FOOD_AND_DRINK|RESTAURANT)' then 'food'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(TRANSPORT|AUTOMOTIVE|GAS_STATION|PARKING|PUBLIC_TRANSIT)' then 'transportation'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(MEDICAL|HEALTH|PHARMAC)' then 'health'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(CHILDCARE|EDUCATION)' then 'family'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GIFT|DONATION)' then 'gifts-occasions'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GENERAL_MERCHANDISE|PERSONAL_CARE|CLOTHING)' then 'personal'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(ENTERTAINMENT|RECREATION|TRAVEL)' then 'fun'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(LOAN|DEBT|BANK_FEES|INTEREST)' then 'debt-fees'
        else 'other'
      end as category_slug,
      case
        when upper(coalesce(txn.personal_finance_category_detailed, '')) ~ '(TELEPHONE|INTERNET|CABLE|ELECTRIC|GAS|UTILIT)' then 'utilities'
        when upper(coalesce(txn.personal_finance_category_detailed, '')) ~ '(RENT|MORTGAGE|HOME_IMPROVEMENT)' then 'housing'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GROCER|FOOD_AND_DRINK|RESTAURANT)' then 'food_at_home'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(TRANSPORT|AUTOMOTIVE|GAS_STATION|PARKING|PUBLIC_TRANSIT)' then 'transportation'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(MEDICAL|HEALTH|PHARMAC)' then 'health'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(CHILDCARE|EDUCATION)' then 'family'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GIFT|DONATION)' then 'gifts'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(GENERAL_MERCHANDISE|PERSONAL_CARE|CLOTHING)' then 'personal'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(ENTERTAINMENT|RECREATION|TRAVEL)' then 'entertainment'
        when upper(concat_ws(' ', txn.personal_finance_category_primary, txn.personal_finance_category_detailed)) ~ '(LOAN|DEBT|BANK_FEES|INTEREST)' then 'debt'
        else 'other_spending'
      end as mapping_tag
    from public.budget_transactions txn
    where txn.user_id = v_user_id
      and txn.direction = 'outflow'
      and not txn.pending
      and txn.budget_id is null
      and txn.budget_match_source is null
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
        and (
          eligible.mapping_tag = any(category.mapping_tags)
          or eligible.category_slug = category.slug
          or eligible.category_slug = nullif(trim(category.legacy_budget_id), '')
        )
      order by
        case when eligible.category_slug = category.slug
          or eligible.category_slug = nullif(trim(category.legacy_budget_id), '') then 0 else 1 end,
        category.sort_order,
        category.id
      limit 1
    ) category on true
  )
  update public.budget_transactions txn
  set budget_id = eligible.category_budget_id,
      budget_assignment_source = 'provider_policy',
      budget_assignment_policy_version = 'governed-category-v1',
      budget_assignment_governed = false,
      budget_match_confidence = case
        when txn.personal_finance_category_confidence = 'VERY_HIGH' then 0.95 else 0.85
      end,
      budget_match_reason = 'Assigned from high-confidence provider evidence through the governed starter policy.'
  from resolved_assignment eligible
  where txn.id = eligible.id
    and txn.user_id = v_user_id;
  get diagnostics v_assigned_count = row_count;

  return jsonb_build_object(
    'createdCategoryCount', v_created_count,
    'assignedTransactionCount', v_assigned_count,
    'outcome', case
      when v_created_count > 0 then 'created_governed_foundation'
      else 'reconciled_governed_foundation'
    end
  );
end;
$$;

revoke execute on function public.reconcile_governed_household_money_foundation(uuid)
from public, anon, authenticated;
grant execute on function public.reconcile_governed_household_money_foundation(uuid)
to service_role;

-- Retire the client-authorized write path. Existing app builds will receive a
-- permission error instead of gaining direct provenance mutation authority.
revoke execute on function public.ensure_governed_household_money_foundation()
from authenticated;

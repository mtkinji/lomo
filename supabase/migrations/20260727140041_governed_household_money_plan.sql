-- Governed Household Money Plan: additive authority and funding contracts.
-- Existing categories, assignments, rules, splits, exclusions, overrides, and plans remain authoritative.

alter table public.budget_categories
  add column if not exists creation_provenance text not null default 'legacy',
  add column if not exists mapping_policy_version text,
  add column if not exists mapping_tags text[] not null default '{}';

alter table public.budget_plans
  add column if not exists funding_rhythm text not null default 'monthly',
  add column if not exists funding_policy_version text,
  add column if not exists starter_weight numeric not null default 0,
  add column if not exists reserve_balance_cents integer not null default 0,
  add column if not exists reserve_balance_period_id text,
  add column if not exists expected_need_cents integer,
  add column if not exists expected_need_due_month text;

alter table public.budget_plans
  alter column reserve_balance_period_id set default to_char(current_date, 'YYYY-MM');

update public.budget_plans
set reserve_balance_period_id = to_char(current_date, 'YYYY-MM')
where reserve_balance_period_id is null;

alter table public.budget_plans
  drop constraint if exists budget_plans_funding_rhythm_check;
alter table public.budget_plans
  add constraint budget_plans_funding_rhythm_check
  check (funding_rhythm in ('monthly', 'reserve'));

alter table public.budget_plans
  drop constraint if exists budget_plans_starter_weight_check;
alter table public.budget_plans
  add constraint budget_plans_starter_weight_check
  check (starter_weight >= 0);

alter table public.budget_plans
  drop constraint if exists budget_plans_reserve_balance_check;
alter table public.budget_plans
  add constraint budget_plans_reserve_balance_check
  check (reserve_balance_cents >= 0);

alter table public.budget_plans
  drop constraint if exists budget_plans_reserve_balance_period_check;
alter table public.budget_plans
  add constraint budget_plans_reserve_balance_period_check
  check (reserve_balance_period_id ~ '^\d{4}-(0[1-9]|1[0-2])$');

alter table public.budget_plans
  drop constraint if exists budget_plans_expected_need_check;
alter table public.budget_plans
  add constraint budget_plans_expected_need_check
  check (
    (expected_need_cents is null and expected_need_due_month is null)
    or (
      funding_rhythm = 'reserve'
      and expected_need_cents > 0
      and expected_need_due_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
    )
  );

alter table public.budget_transactions
  add column if not exists budget_assignment_source text,
  add column if not exists budget_assignment_policy_version text,
  add column if not exists budget_assignment_governed boolean not null default false;

alter table public.budget_living_plan_versions
  add column if not exists evidence_scope jsonb not null default '{}'::jsonb,
  add column if not exists automatic_activation_period_id text;

alter table public.budget_living_plan_components
  add column if not exists funding_rhythm text not null default 'monthly',
  add column if not exists prior_reserve_cents integer not null default 0,
  add column if not exists expected_need_cents integer,
  add column if not exists expected_need_due_month text;

create table if not exists public.budget_planning_basis_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_basis_cents integer not null check (monthly_basis_cents > 0),
  provenance text not null default 'user_set' check (provenance = 'user_set'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_planning_basis_overrides enable row level security;

create policy "Users can read their Money planning basis"
on public.budget_planning_basis_overrides
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their Money planning basis"
on public.budget_planning_basis_overrides
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their Money planning basis"
on public.budget_planning_basis_overrides
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.budget_planning_basis_overrides from anon, authenticated;
grant select, insert, update on public.budget_planning_basis_overrides to authenticated;

create table if not exists public.budget_held_living_plan_candidates (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activation_period_id text not null check (activation_period_id ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  candidate jsonb not null,
  trigger text not null,
  cause text not null,
  evidence_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_held_living_plan_candidates enable row level security;

create policy "Users can read their held Money plan"
on public.budget_held_living_plan_candidates
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their held Money plan"
on public.budget_held_living_plan_candidates
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their held Money plan"
on public.budget_held_living_plan_candidates
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their held Money plan"
on public.budget_held_living_plan_candidates
for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.budget_held_living_plan_candidates from anon, authenticated;
grant select, insert, update, delete on public.budget_held_living_plan_candidates to authenticated;

-- Preserve the existing version/pointer/receipt transaction while extending immutable
-- components with the reserve facts introduced by this migration.
create or replace function public.promote_budget_living_plan(
  expected_active_version_id uuid,
  candidate jsonb,
  components jsonb,
  receipt jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := (select auth.uid());
  current_id uuid;
  new_id uuid;
  component_total bigint;
begin
  if owner_id is null then raise exception 'authentication required'; end if;
  if not coalesce((
    select config.promotion_enabled
    from public.budget_living_plan_config config
    where config.user_id = owner_id
  ), false) then raise exception 'living plan promotion disabled'; end if;

  select active.plan_version_id into current_id
  from public.budget_active_living_plans active
  where active.user_id = owner_id
  for update;
  if current_id is distinct from expected_active_version_id then raise exception 'active living plan changed'; end if;
  if candidate->>'status' in ('blocked', 'missing_resource') then raise exception 'candidate cannot promote'; end if;
  if nullif(candidate->>'candidateHash', '') is null
    or nullif(candidate->>'evidenceHash', '') is null
    or nullif(candidate->>'allocatorVersion', '') is null
  then raise exception 'candidate provenance missing'; end if;
  if (candidate->>'livingPercent')::integer not between 50 and 100
    or (candidate->>'livingPercent')::integer % 5 <> 0
  then raise exception 'invalid living target'; end if;
  if (candidate->>'targetCents')::bigint <> round(
    (candidate->>'resourceBasisCents')::numeric * (candidate->>'livingPercent')::integer / 100.0
  ) then raise exception 'target math mismatch'; end if;

  select coalesce(sum((row->>'amountCents')::bigint), 0)
  into component_total
  from jsonb_array_elements(components) row;
  if component_total <> (candidate->>'plannedCents')::bigint then raise exception 'component total mismatch'; end if;
  if greatest(0, (candidate->>'plannedCents')::bigint - (candidate->>'targetCents')::bigint)
    <> (candidate->>'overTargetCents')::bigint
  then raise exception 'over-target mismatch'; end if;
  if greatest(0, (candidate->>'targetCents')::bigint - (candidate->>'plannedCents')::bigint)
    <> (candidate->>'unassignedCents')::bigint
  then raise exception 'unassigned mismatch'; end if;

  insert into public.budget_living_plan_versions (
    user_id, period_id, predecessor_version_id, living_percent, resource_basis_cents,
    target_cents, planned_cents, unassigned_cents, over_target_cents, status,
    evidence_hash, candidate_hash, allocator_version
  ) values (
    owner_id, candidate->>'periodId', current_id, (candidate->>'livingPercent')::integer,
    (candidate->>'resourceBasisCents')::bigint, (candidate->>'targetCents')::bigint,
    (candidate->>'plannedCents')::bigint, (candidate->>'unassignedCents')::bigint,
    (candidate->>'overTargetCents')::bigint, candidate->>'status', candidate->>'evidenceHash',
    candidate->>'candidateHash', candidate->>'allocatorVersion'
  ) returning id into new_id;

  insert into public.budget_living_plan_components (
    plan_version_id, user_id, category_id, amount_cents, fixed_cents, override_cents,
    flexible_cents, exposure_cents, source, funding_rhythm, prior_reserve_cents,
    expected_need_cents, expected_need_due_month
  )
  select
    new_id, owner_id, row->>'categoryId', (row->>'amountCents')::bigint,
    coalesce((row->>'fixedCents')::bigint, 0), coalesce((row->>'overrideCents')::bigint, 0),
    coalesce((row->>'flexibleCents')::bigint, 0), coalesce((row->>'exposureCents')::bigint, 0),
    row->>'source', case when row->>'fundingRhythm' = 'reserve' then 'reserve' else 'monthly' end,
    coalesce((row->>'priorReserveCents')::integer, 0),
    nullif(row->'expectedNeed'->>'amountCents', '')::integer,
    nullif(row->'expectedNeed'->>'dueMonth', '')
  from jsonb_array_elements(components) row;

  insert into public.budget_living_plan_receipts (
    user_id, plan_version_id, prior_version_id, trigger, outcome, cause,
    changed_category_ids, material_reasons
  ) values (
    owner_id, new_id, current_id, receipt->>'trigger', receipt->>'outcome', receipt->>'cause',
    coalesce(receipt->'changedCategoryIds', '[]'::jsonb),
    coalesce(receipt->'materialReasons', '[]'::jsonb)
  );
  insert into public.budget_active_living_plans (user_id, plan_version_id)
  values (owner_id, new_id)
  on conflict (user_id) do update
  set plan_version_id = excluded.plan_version_id,
      updated_at = now();
  return new_id;
end;
$$;

revoke execute on function public.promote_budget_living_plan(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.promote_budget_living_plan(uuid, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.ensure_governed_household_money_foundation()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_count integer;
  v_created_count integer := 0;
  v_assigned_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = '42501';
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
    v_user_id, starter.slug, starter.slug, starter.name, 'custom', '#315545', 'active', starter.sort_order,
    'system_starter', 'governed-category-v1', starter.mapping_tags
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

  -- Mapping tags are internal policy metadata. Recognizable legacy categories keep their
  -- identity while becoming eligible assignment destinations.
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
      budget_match_confidence = case when txn.personal_finance_category_confidence = 'VERY_HIGH' then 0.95 else 0.85 end,
      budget_match_reason = 'Assigned from high-confidence provider evidence through the governed starter policy.'
  from resolved_assignment eligible
  where txn.id = eligible.id;
  get diagnostics v_assigned_count = row_count;

  return jsonb_build_object(
    'createdCategoryCount', v_created_count,
    'assignedTransactionCount', v_assigned_count,
    'outcome', case when v_created_count > 0 then 'created_governed_foundation' else 'reconciled_governed_foundation' end
  );
end;
$$;

revoke execute on function public.ensure_governed_household_money_foundation() from public, anon;
grant execute on function public.ensure_governed_household_money_foundation() to authenticated;

create or replace function public.apply_governed_category_plan_change(
  p_plan_category_id uuid,
  p_allocation_category_id text,
  p_budget_cents integer,
  p_funding_rhythm text,
  p_expected_need_cents integer,
  p_expected_need_due_month text,
  expected_active_version_id uuid,
  candidate jsonb,
  components jsonb,
  receipt jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_version_id text;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = '42501';
  end if;
  if p_budget_cents < 0 or p_funding_rhythm not in ('monthly', 'reserve') then
    raise exception 'Invalid governed category plan change.' using errcode = '22023';
  end if;
  if (p_expected_need_cents is null) <> (p_expected_need_due_month is null) then
    raise exception 'Expected need amount and due month must be saved together.' using errcode = '22023';
  end if;
  if p_expected_need_cents is not null and (
    p_funding_rhythm <> 'reserve'
    or p_expected_need_cents <= 0
    or p_expected_need_due_month !~ '^\d{4}-(0[1-9]|1[0-2])$'
  ) then
    raise exception 'Invalid reserve expected need.' using errcode = '22023';
  end if;

  update public.budget_plans plan
  set base_budget_cents = p_budget_cents,
      funding_rhythm = p_funding_rhythm,
      funding_policy_version = 'category-funding-v1',
      rollover_enabled = case when p_funding_rhythm = 'reserve' then false else plan.rollover_enabled end,
      expected_need_cents = case when p_funding_rhythm = 'reserve' then p_expected_need_cents else null end,
      expected_need_due_month = case when p_funding_rhythm = 'reserve' then p_expected_need_due_month else null end,
      updated_at = now()
  where plan.category_id = p_plan_category_id
    and plan.user_id = v_user_id
    and plan.status = 'active';
  if not found then
    raise exception 'The governed category plan is unavailable.' using errcode = 'P0002';
  end if;

  insert into public.budget_living_plan_overrides (
    user_id, category_id, amount_cents, active, updated_at
  ) values (
    v_user_id, trim(p_allocation_category_id), p_budget_cents, true, now()
  )
  on conflict (user_id, category_id) do update
  set amount_cents = excluded.amount_cents,
      active = true,
      updated_at = excluded.updated_at;

  select public.promote_budget_living_plan(
    expected_active_version_id,
    candidate,
    components,
    receipt
  )::text into v_version_id;

  delete from public.budget_held_living_plan_candidates held
  where held.user_id = v_user_id;

  return v_version_id;
end;
$$;

revoke execute on function public.apply_governed_category_plan_change(
  uuid, text, integer, text, integer, text, uuid, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.apply_governed_category_plan_change(
  uuid, text, integer, text, integer, text, uuid, jsonb, jsonb, jsonb
) to authenticated;

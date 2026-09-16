-- kwilt_household_money_transaction_write_authority_v1
-- Active owner and caregiver household members write the same canonical Money
-- dataset they read. Row ownership remains with the canonical household owner;
-- the existing review audit trigger records the authenticated actor.

drop policy if exists "Users can update their own budget transaction reviews"
  on public.budget_transactions;
drop policy if exists "Household members can update shared budget transaction reviews"
  on public.budget_transactions;
drop policy if exists "Household adults can update shared budget transactions"
  on public.budget_transactions;
create policy "Household adults can update shared budget transactions"
on public.budget_transactions
for update to authenticated
using (public.can_manage_budget_user(user_id))
with check (user_id = public.budget_effective_owner_user_id());

drop policy if exists "Only permanent users can access budget transaction allocations"
  on public.budget_transaction_allocations;
drop policy if exists "Users can read accessible budget transaction allocations"
  on public.budget_transaction_allocations;
drop policy if exists "Users can insert their own budget transaction allocations"
  on public.budget_transaction_allocations;
drop policy if exists "Users can delete their own budget transaction allocations"
  on public.budget_transaction_allocations;
create policy "Household adults can read shared budget transaction allocations"
on public.budget_transaction_allocations
for select to authenticated
using (public.can_access_budget_user(user_id));
create policy "Household adults can insert shared budget transaction allocations"
on public.budget_transaction_allocations
for insert to authenticated
with check (user_id = public.budget_effective_owner_user_id());
create policy "Household adults can delete shared budget transaction allocations"
on public.budget_transaction_allocations
for delete to authenticated
using (public.can_manage_budget_user(user_id));

drop policy if exists "Users can insert their own budget transaction match rules"
  on public.budget_transaction_match_rules;
drop policy if exists "Users can update their own budget transaction match rules"
  on public.budget_transaction_match_rules;
drop policy if exists "Household members can update shared budget transaction match rules"
  on public.budget_transaction_match_rules;
drop policy if exists "Household adults can insert shared budget transaction match rules"
  on public.budget_transaction_match_rules;
drop policy if exists "Household adults can update shared budget transaction match rules"
  on public.budget_transaction_match_rules;
create policy "Household adults can insert shared budget transaction match rules"
on public.budget_transaction_match_rules
for insert to authenticated
with check (user_id = public.budget_effective_owner_user_id());
create policy "Household adults can update shared budget transaction match rules"
on public.budget_transaction_match_rules
for update to authenticated
using (public.can_manage_budget_user(user_id))
with check (user_id = public.budget_effective_owner_user_id());

create or replace function public.ensure_budget_transaction_allocations_valid()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transaction_id uuid := coalesce(new.transaction_id, old.transaction_id);
  v_transaction public.budget_transactions%rowtype;
  v_allocation_count integer;
  v_allocation_sum bigint;
  v_distinct_budget_count integer;
  v_valid_category_count integer;
begin
  select count(*)::integer, coalesce(sum(amount_cents), 0), count(distinct budget_id)::integer
  into v_allocation_count, v_allocation_sum, v_distinct_budget_count
  from public.budget_transaction_allocations
  where transaction_id = v_transaction_id;

  if v_allocation_count = 0 then return null; end if;

  select * into v_transaction
  from public.budget_transactions
  where id = v_transaction_id;

  if v_transaction.id is null then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;
  if not public.can_manage_budget_user(v_transaction.user_id)
    or v_transaction.user_id <> public.budget_effective_owner_user_id() then
    raise exception 'Transaction ownership does not match the household Money owner.' using errcode = '42501';
  end if;
  if v_transaction.direction <> 'outflow' or v_transaction.pending then
    raise exception 'Only posted spending transactions can be split.' using errcode = 'P0001';
  end if;
  if v_allocation_count < 2 or v_allocation_count > 8 then
    raise exception 'A split requires between 2 and 8 categories.' using errcode = 'P0001';
  end if;
  if v_distinct_budget_count <> v_allocation_count then
    raise exception 'Each split category must be unique.' using errcode = 'P0001';
  end if;
  if v_allocation_sum <> v_transaction.amount_cents then
    raise exception 'Split allocations must equal the transaction amount.' using errcode = 'P0001';
  end if;
  if v_transaction.budget_id is not null or v_transaction.budget_match_source <> 'corrected' then
    raise exception 'A split transaction cannot also have a single category.' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_valid_category_count
  from public.budget_transaction_allocations allocation
  join public.budget_categories category
    on category.user_id = v_transaction.user_id
   and category.status = 'active'
   and (
     category.id::text = allocation.budget_id
     or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = allocation.budget_id
   )
  where allocation.transaction_id = v_transaction_id;

  if v_valid_category_count <> v_allocation_count then
    raise exception 'Every split allocation must reference an active budget category.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create or replace function public.replace_budget_transaction_allocations(
  p_transaction_id uuid,
  p_allocations jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_transaction public.budget_transactions%rowtype;
  v_allocation_count integer;
  v_allocation_sum bigint;
  v_distinct_budget_count integer;
  v_valid_category_count integer;
begin
  if v_owner_user_id is null then
    raise exception 'An active adult household membership is required.' using errcode = '42501';
  end if;
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'Allocations must be a JSON array.' using errcode = 'P0001';
  end if;

  select * into v_transaction
  from public.budget_transactions
  where id = p_transaction_id and user_id = v_owner_user_id
  for update;
  if v_transaction.id is null then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;
  if v_transaction.direction <> 'outflow' or v_transaction.pending then
    raise exception 'Only posted spending transactions can be split.' using errcode = 'P0001';
  end if;

  select count(*)::integer, coalesce(sum(amount_cents), 0), count(distinct trim(budget_id))::integer
  into v_allocation_count, v_allocation_sum, v_distinct_budget_count
  from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer);
  if v_allocation_count < 2 or v_allocation_count > 8 then
    raise exception 'A split requires between 2 and 8 categories.' using errcode = 'P0001';
  end if;
  if v_distinct_budget_count <> v_allocation_count then
    raise exception 'Each split category must be unique.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer)
    where nullif(trim(budget_id), '') is null or amount_cents is null or amount_cents <= 0
  ) then
    raise exception 'Every split allocation needs a category and positive amount.' using errcode = 'P0001';
  end if;
  if v_allocation_sum <> v_transaction.amount_cents then
    raise exception 'Split allocations must equal the transaction amount.' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_valid_category_count
  from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer)
  join public.budget_categories category
    on category.user_id = v_owner_user_id
   and category.status = 'active'
   and (
     category.id::text = trim(allocation.budget_id)
     or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = trim(allocation.budget_id)
   );
  if v_valid_category_count <> v_allocation_count then
    raise exception 'Every split allocation must reference an active budget category.' using errcode = 'P0001';
  end if;

  delete from public.budget_transaction_allocations
  where transaction_id = p_transaction_id and user_id = v_owner_user_id;
  insert into public.budget_transaction_allocations (transaction_id, user_id, budget_id, amount_cents)
  select p_transaction_id, v_owner_user_id, trim(allocation.budget_id), allocation.amount_cents
  from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer);
  update public.budget_transactions
  set budget_id = null,
      budget_match_source = 'corrected',
      budget_match_confidence = 1,
      budget_match_reason = 'Split across categories.',
      budget_match_reviewed_at = now(),
      money_meaning = null,
      money_meaning_source = null,
      money_meaning_category_budget_id = null,
      money_meaning_reason = null,
      money_meaning_reviewed_at = null
  where id = p_transaction_id and user_id = v_owner_user_id;
end;
$$;

drop function if exists public.replace_budget_transaction_review(uuid[], text, boolean);
create function public.replace_budget_transaction_review(
  p_transaction_ids uuid[],
  p_budget_id text,
  p_excluded boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_requested_count integer;
  v_owned_count integer;
  v_updated_count integer;
  v_updated_at timestamptz := now();
begin
  if v_actor_user_id is null or v_owner_user_id is null then
    raise exception 'An active adult household membership is required.' using errcode = '42501';
  end if;
  select count(distinct transaction_id)::integer into v_requested_count
  from unnest(coalesce(p_transaction_ids, '{}'::uuid[])) as transaction_id
  where transaction_id is not null;
  if v_requested_count = 0 then
    raise exception 'Choose at least one transaction.' using errcode = '22023';
  end if;
  if not p_excluded and nullif(trim(p_budget_id), '') is null then
    raise exception 'A category is required.' using errcode = 'P0001';
  end if;
  if not p_excluded and not exists (
    select 1 from public.budget_categories category
    where category.user_id = v_owner_user_id
      and category.status = 'active'
      and (
        category.id::text = trim(p_budget_id)
        or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = trim(p_budget_id)
      )
  ) then
    raise exception 'The category is not available.' using errcode = 'P0001';
  end if;

  perform 1 from public.budget_transactions
  where id = any(p_transaction_ids) and user_id = v_owner_user_id
  for update;
  select count(*)::integer into v_owned_count
  from public.budget_transactions
  where id = any(p_transaction_ids) and user_id = v_owner_user_id;
  if v_owned_count <> v_requested_count then
    raise exception 'One or more transactions are unavailable.' using errcode = '42501';
  end if;

  delete from public.budget_transaction_allocations
  where transaction_id = any(p_transaction_ids) and user_id = v_owner_user_id;
  update public.budget_transactions
  set budget_id = case when p_excluded then null else trim(p_budget_id) end,
      budget_match_source = case when p_excluded then 'excluded' else 'corrected' end,
      budget_match_confidence = 1,
      budget_match_reason = case when p_excluded then 'Marked as not part of any budget.' else 'Assigned to category.' end,
      budget_match_reviewed_at = v_updated_at,
      money_meaning = case when p_excluded then 'not_counted' else null end,
      money_meaning_source = case when p_excluded then 'confirmed' else null end,
      money_meaning_category_budget_id = null,
      money_meaning_reason = case when p_excluded then 'Marked as outside the budget.' else null end,
      money_meaning_reviewed_at = case when p_excluded then v_updated_at else null end,
      updated_at = v_updated_at
  where id = any(p_transaction_ids) and user_id = v_owner_user_id;
  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_requested_count then
    raise exception 'The transaction review was not applied to every transaction.' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'transaction_ids', to_jsonb(p_transaction_ids),
    'category_id', case when p_excluded then null else trim(p_budget_id) end,
    'review_state', case when p_excluded then 'not_counted' else 'assigned' end,
    'updated_at', v_updated_at
  );
end;
$$;

create or replace function public.upsert_budget_transaction_match_rule(
  p_transaction_id uuid,
  p_budget_id text,
  p_merchant_contains text,
  p_match_mode text,
  p_label text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_source_merchant text;
  v_source_merchant_key text;
  v_rule_merchant_key text;
  v_rule_id uuid;
  v_applied_count integer := 0;
begin
  if v_owner_user_id is null then
    raise exception 'An active adult household membership is required.' using errcode = '42501';
  end if;
  if p_match_mode not in ('exact', 'partial') then
    raise exception 'Unsupported merchant match mode.' using errcode = 'P0001';
  end if;
  select coalesce(nullif(trim(txn.merchant_name), ''), txn.name) into v_source_merchant
  from public.budget_transactions txn
  where txn.id = p_transaction_id and txn.user_id = v_owner_user_id and txn.direction = 'outflow';
  if v_source_merchant is null then
    raise exception 'The source transaction is unavailable.' using errcode = '42501';
  end if;

  v_source_merchant_key := public.normalize_budget_merchant(v_source_merchant, p_match_mode);
  v_rule_merchant_key := public.normalize_budget_merchant(p_merchant_contains, p_match_mode);
  if v_source_merchant_key = '' or v_rule_merchant_key = ''
    or (p_match_mode = 'exact' and v_source_merchant_key <> v_rule_merchant_key)
    or (p_match_mode = 'partial' and strpos(v_source_merchant_key, v_rule_merchant_key) = 0) then
    raise exception 'The merchant rule does not match its source transaction.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.budget_categories category
    where category.user_id = v_owner_user_id and category.status = 'active'
      and (
        category.id::text = trim(p_budget_id)
        or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = trim(p_budget_id)
      )
  ) then
    raise exception 'The category is not available.' using errcode = 'P0001';
  end if;

  perform set_config('kwilt.merchant_rule_applied_count', '0', true);
  insert into public.budget_transaction_match_rules (
    user_id, budget_id, merchant_contains, merchant_match_mode, label, created_from_transaction_id
  ) values (
    v_owner_user_id, trim(p_budget_id), v_rule_merchant_key, p_match_mode,
    coalesce(nullif(trim(p_label), ''), 'Merchant rule'), p_transaction_id
  )
  on conflict (user_id, merchant_contains, merchant_match_mode)
  do update set budget_id = excluded.budget_id,
                label = excluded.label,
                created_from_transaction_id = excluded.created_from_transaction_id,
                updated_at = now()
  returning id into v_rule_id;
  v_applied_count := coalesce(
    nullif(current_setting('kwilt.merchant_rule_applied_count', true), '')::integer, 0
  );
  return jsonb_build_object(
    'ruleId', v_rule_id,
    'appliedTransactionCount', v_applied_count,
    'merchantKey', v_rule_merchant_key,
    'matchMode', p_match_mode,
    'categoryId', trim(p_budget_id)
  );
end;
$$;

create or replace function public.review_budget_transfer_pair(
  p_transaction_ids uuid[],
  p_expected_updated_at timestamptz,
  p_decision text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_user_id uuid := public.budget_effective_owner_user_id();
  v_row_count integer;
  v_max_updated_at timestamptz;
  v_amount_count integer;
  v_currency_count integer;
  v_direction_count integer;
  v_updated_at timestamptz := now();
begin
  if v_owner_user_id is null then
    raise exception 'An active adult household membership is required.' using errcode = '42501';
  end if;
  if p_transaction_ids is null or cardinality(p_transaction_ids) <> 2
    or p_transaction_ids[1] = p_transaction_ids[2] then
    raise exception 'Exactly two different transactions are required.' using errcode = '22023';
  end if;
  if p_decision not in ('confirm_pair', 'unpair') then
    raise exception 'Unsupported transfer review decision.' using errcode = '22023';
  end if;

  perform id from public.budget_transactions
  where user_id = v_owner_user_id and id = any(p_transaction_ids)
  order by id for update;
  select count(*), max(updated_at), count(distinct amount_cents),
         count(distinct iso_currency_code), count(distinct direction)
  into v_row_count, v_max_updated_at, v_amount_count, v_currency_count, v_direction_count
  from public.budget_transactions
  where user_id = v_owner_user_id and id = any(p_transaction_ids);
  if v_row_count <> 2 then
    raise exception 'The transfer pair is no longer available.' using errcode = 'P0002';
  end if;
  if v_max_updated_at is distinct from p_expected_updated_at then
    raise exception 'The transfer pair changed. Refresh before continuing.' using errcode = '40001';
  end if;
  if v_amount_count <> 1 or v_currency_count <> 1 or v_direction_count <> 2 then
    raise exception 'The selected transactions are not a valid transfer pair.' using errcode = '22023';
  end if;

  update public.budget_transactions
  set money_meaning = case when p_decision = 'confirm_pair' then 'transfer' else 'unknown' end,
      money_meaning_source = 'user',
      money_meaning_category_budget_id = null,
      money_meaning_reason = case when p_decision = 'confirm_pair'
        then 'Confirmed as an owned-account transfer.' else 'Transfer pairing removed for explicit review.' end,
      money_meaning_reviewed_at = v_updated_at,
      budget_id = null,
      budget_assignment_source = null,
      budget_assignment_policy_version = null,
      budget_assignment_governed = false,
      budget_match_confidence = null,
      budget_match_reason = null,
      saved_resource_cents = 0,
      plan_coverage_reviewed_at = null,
      plan_coverage_provenance = null,
      updated_at = v_updated_at
  where user_id = v_owner_user_id and id = any(p_transaction_ids);
  get diagnostics v_row_count = row_count;
  if v_row_count <> 2 then
    raise exception 'The transfer review was not applied to exactly two transactions.' using errcode = '40001';
  end if;
  return jsonb_build_object(
    'transaction_ids', to_jsonb(p_transaction_ids),
    'decision', p_decision,
    'updated_at', v_updated_at
  );
end;
$$;

revoke execute on function public.replace_budget_transaction_allocations(uuid, jsonb)
from public, anon;
grant execute on function public.replace_budget_transaction_allocations(uuid, jsonb)
to authenticated;
revoke execute on function public.replace_budget_transaction_review(uuid[], text, boolean)
from public, anon;
grant execute on function public.replace_budget_transaction_review(uuid[], text, boolean)
to authenticated;
revoke execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text)
from public, anon;
grant execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text)
to authenticated;
revoke execute on function public.review_budget_transfer_pair(uuid[], timestamptz, text)
from public, anon;
grant execute on function public.review_budget_transfer_pair(uuid[], timestamptz, text)
to authenticated;

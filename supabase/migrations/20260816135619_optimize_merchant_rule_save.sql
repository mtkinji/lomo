-- Keep merchant-rule writes within the authenticated API timeout by resolving only
-- transactions that can be affected by the inserted, changed, or removed rule. The
-- RPC relies on this trigger as its single history pass instead of updating history
-- a second time.

create or replace function public.apply_budget_transaction_match_rule_to_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_applied_count integer := 0;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;

  with candidates as (
    select
      txn.id,
      txn.user_id,
      coalesce(nullif(trim(txn.merchant_name), ''), txn.name) as merchant_name
    from public.budget_transactions txn
    where txn.user_id = v_user_id
      and txn.direction = 'outflow'
      and txn.budget_match_source is distinct from 'excluded'
      and txn.money_meaning is distinct from 'transfer'
      and txn.money_meaning is distinct from 'not_counted'
      and txn.money_meaning is distinct from 'category_credit'
      and not exists (
        select 1
        from public.budget_transaction_allocations allocation
        where allocation.transaction_id = txn.id
      )
      and (
        (
          tg_op <> 'DELETE'
          and public.budget_merchant_rule_matches(
            new.merchant_contains,
            new.merchant_match_mode,
            coalesce(nullif(trim(txn.merchant_name), ''), txn.name)
          )
        )
        or (
          tg_op <> 'INSERT'
          and public.budget_merchant_rule_matches(
            old.merchant_contains,
            old.merchant_match_mode,
            coalesce(nullif(trim(txn.merchant_name), ''), txn.name)
          )
        )
      )
  ),
  resolved as (
    select
      candidate.id,
      matched_rule.budget_id,
      matched_rule.updated_at
    from candidates candidate
    left join lateral (
      select rule.budget_id, rule.updated_at
      from public.budget_transaction_match_rules rule
      where rule.user_id = candidate.user_id
        and public.budget_merchant_rule_matches(
          rule.merchant_contains,
          rule.merchant_match_mode,
          candidate.merchant_name
        )
      order by
        case when rule.merchant_match_mode = 'exact' then 0 else 1 end,
        rule.updated_at desc,
        rule.id desc
      limit 1
    ) matched_rule on true
  )
  update public.budget_transactions txn
  set budget_id = resolved.budget_id,
      budget_match_source = case when resolved.budget_id is null then null else 'merchant_rule' end,
      budget_match_confidence = case when resolved.budget_id is null then null else 1 end,
      budget_match_reason = case
        when resolved.budget_id is null then null
        else 'Applied from saved merchant rule.'
      end,
      budget_match_reviewed_at = resolved.updated_at,
      budget_assignment_source = case when resolved.budget_id is null then null else 'merchant_rule' end,
      budget_assignment_policy_version = case
        when resolved.budget_id is null then null
        else 'merchant-rule-v1'
      end,
      budget_assignment_governed = resolved.budget_id is not null
  from resolved
  where txn.id = resolved.id
    and txn.user_id = v_user_id
    and row(
      txn.budget_id,
      txn.budget_match_source,
      txn.budget_match_confidence,
      txn.budget_match_reason,
      txn.budget_match_reviewed_at,
      txn.budget_assignment_source,
      txn.budget_assignment_policy_version,
      txn.budget_assignment_governed
    ) is distinct from row(
      resolved.budget_id,
      case when resolved.budget_id is null then null else 'merchant_rule' end,
      case when resolved.budget_id is null then null else 1 end,
      case when resolved.budget_id is null then null else 'Applied from saved merchant rule.' end,
      resolved.updated_at,
      case when resolved.budget_id is null then null else 'merchant_rule' end,
      case when resolved.budget_id is null then null else 'merchant-rule-v1' end,
      resolved.budget_id is not null
    );
  get diagnostics v_applied_count = row_count;
  perform set_config('kwilt.merchant_rule_applied_count', v_applied_count::text, true);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
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
  v_user_id uuid := (select auth.uid());
  v_source_merchant text;
  v_normalized_merchant text;
  v_rule_id uuid;
  v_applied_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = '42501';
  end if;
  if p_match_mode not in ('exact', 'partial') then
    raise exception 'Unsupported merchant match mode.' using errcode = 'P0001';
  end if;

  select coalesce(nullif(trim(txn.merchant_name), ''), txn.name)
  into v_source_merchant
  from public.budget_transactions txn
  where txn.id = p_transaction_id
    and txn.user_id = v_user_id
    and txn.direction = 'outflow';

  if v_source_merchant is null then
    raise exception 'The source transaction is unavailable.' using errcode = '42501';
  end if;

  v_normalized_merchant := public.normalize_budget_merchant(v_source_merchant, p_match_mode);
  if v_normalized_merchant = ''
    or v_normalized_merchant <> public.normalize_budget_merchant(p_merchant_contains, p_match_mode)
  then
    raise exception 'The merchant rule does not match its source transaction.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.budget_categories category
    where category.user_id = v_user_id
      and category.status = 'active'
      and (
        category.id::text = trim(p_budget_id)
        or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = trim(p_budget_id)
      )
  ) then
    raise exception 'The category is not available.' using errcode = 'P0001';
  end if;

  perform set_config('kwilt.merchant_rule_applied_count', '0', true);

  insert into public.budget_transaction_match_rules (
    user_id,
    budget_id,
    merchant_contains,
    merchant_match_mode,
    label,
    created_from_transaction_id
  ) values (
    v_user_id,
    trim(p_budget_id),
    v_normalized_merchant,
    p_match_mode,
    coalesce(nullif(trim(p_label), ''), 'Merchant rule'),
    p_transaction_id
  )
  on conflict (user_id, merchant_contains, merchant_match_mode)
  do update set
    budget_id = excluded.budget_id,
    label = excluded.label,
    created_from_transaction_id = excluded.created_from_transaction_id,
    updated_at = now()
  returning id into v_rule_id;

  v_applied_count := coalesce(
    nullif(current_setting('kwilt.merchant_rule_applied_count', true), '')::integer,
    0
  );

  return jsonb_build_object(
    'ruleId', v_rule_id,
    'appliedTransactionCount', v_applied_count,
    'merchantKey', v_normalized_merchant,
    'matchMode', p_match_mode,
    'categoryId', trim(p_budget_id)
  );
end;
$$;

revoke execute on function public.apply_budget_transaction_match_rule_to_history()
from public, anon, authenticated;
revoke execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text)
from public, anon;
grant execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text)
to authenticated;

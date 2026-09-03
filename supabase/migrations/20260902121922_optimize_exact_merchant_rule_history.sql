-- Exact merchant rules are the default transaction-review path. Keep that path
-- inside the authenticated API timeout by indexing the normalized merchant key
-- and resolving only the rows touched by the inserted, changed, or removed rule.
-- Partial rules still require substring matching, but only run that broader pass
-- when a partial key is actually involved.

create index if not exists budget_transactions_user_exact_merchant_idx
on public.budget_transactions (
  user_id,
  (public.normalize_budget_merchant(
    coalesce(nullif(trim(merchant_name), ''), name),
    'exact'
  ))
)
where direction = 'outflow';

create or replace function public.apply_budget_transaction_match_rule_to_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_exact_merchant_keys text[] := '{}'::text[];
  v_partial_merchant_keys text[] := '{}'::text[];
  v_candidate_ids uuid[] := '{}'::uuid[];
  v_partial_candidate_ids uuid[] := '{}'::uuid[];
  v_applied_count integer := 0;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;

  if tg_op <> 'DELETE' then
    if new.merchant_match_mode = 'exact' then
      v_exact_merchant_keys := array_append(v_exact_merchant_keys, new.merchant_contains);
    else
      v_partial_merchant_keys := array_append(v_partial_merchant_keys, new.merchant_contains);
    end if;
  end if;

  if tg_op <> 'INSERT' then
    if old.merchant_match_mode = 'exact' then
      v_exact_merchant_keys := array_append(v_exact_merchant_keys, old.merchant_contains);
    else
      v_partial_merchant_keys := array_append(v_partial_merchant_keys, old.merchant_contains);
    end if;
  end if;

  if cardinality(v_exact_merchant_keys) > 0 then
    select coalesce(array_agg(txn.id), '{}'::uuid[])
    into v_candidate_ids
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
      and public.normalize_budget_merchant(
        coalesce(nullif(trim(txn.merchant_name), ''), txn.name),
        'exact'
      ) = any (v_exact_merchant_keys);
  end if;

  if cardinality(v_partial_merchant_keys) > 0 then
    select coalesce(array_agg(txn.id), '{}'::uuid[])
    into v_partial_candidate_ids
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
      and exists (
        select 1
        from unnest(v_partial_merchant_keys) partial_key
        where public.budget_merchant_rule_matches(
          partial_key,
          'partial',
          coalesce(nullif(trim(txn.merchant_name), ''), txn.name)
        )
      );
    select coalesce(array_agg(distinct candidate_id), '{}'::uuid[])
    into v_candidate_ids
    from unnest(v_candidate_ids || v_partial_candidate_ids) candidate_id;
  end if;

  if cardinality(v_candidate_ids) > 0 then
    with candidates as (
      select
        txn.id,
        txn.user_id,
        coalesce(nullif(trim(txn.merchant_name), ''), txn.name) as merchant_name
      from public.budget_transactions txn
      where txn.user_id = v_user_id
        and txn.id = any (v_candidate_ids)
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
  end if;

  perform set_config('kwilt.merchant_rule_applied_count', v_applied_count::text, true);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.apply_budget_transaction_match_rule_to_history()
from public, anon, authenticated;

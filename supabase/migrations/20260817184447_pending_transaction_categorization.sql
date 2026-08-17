alter table public.budget_transactions
  add column if not exists classification_attempted_at timestamptz,
  add column if not exists classification_attempt_count integer not null default 0,
  add column if not exists classification_next_retry_at timestamptz,
  add column if not exists classification_policy_version text,
  add column if not exists classification_last_outcome text;

alter table public.budget_transactions
  drop constraint if exists budget_transactions_classification_attempt_count_check;
alter table public.budget_transactions
  add constraint budget_transactions_classification_attempt_count_check
  check (classification_attempt_count >= 0);

alter table public.budget_transactions
  drop constraint if exists budget_transactions_classification_last_outcome_check;
alter table public.budget_transactions
  add constraint budget_transactions_classification_last_outcome_check
  check (
    classification_last_outcome is null
    or classification_last_outcome in ('assigned', 'unresolved', 'retryable_failure')
  );

create index if not exists budget_transactions_classification_candidates_idx
on public.budget_transactions (
  user_id,
  classification_next_retry_at,
  classification_attempt_count,
  date desc,
  id
)
where direction = 'outflow'
  and budget_id is null
  and budget_match_source is null
  and budget_assignment_source is null;

comment on column public.budget_transactions.classification_attempted_at is
  'Latest server-owned categorization attempt timestamp. Never shown as transaction truth.';
comment on column public.budget_transactions.classification_attempt_count is
  'Server-owned categorization attempt count used to prevent unresolved rows from starving the queue.';
comment on column public.budget_transactions.classification_next_retry_at is
  'Earliest time the server may retry categorization under the same policy.';
comment on column public.budget_transactions.classification_policy_version is
  'Categorization policy most recently attempted, including unresolved outcomes.';
comment on column public.budget_transactions.classification_last_outcome is
  'Non-sensitive operational result of the latest categorization attempt.';

revoke update (
  classification_attempted_at,
  classification_attempt_count,
  classification_next_retry_at,
  classification_policy_version,
  classification_last_outcome
)
on public.budget_transactions from authenticated;

create or replace function public.apply_money_transaction_classification_attempt(
  p_user_id uuid,
  p_transaction_id uuid,
  p_expected_attempt_count integer,
  p_outcome text,
  p_category_id text,
  p_assignment_source text,
  p_assignment_reason text,
  p_policy_version text,
  p_attempted_at timestamptz,
  p_next_retry_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated boolean := false;
begin
  if p_outcome not in ('assigned', 'unresolved', 'retryable_failure') then
    raise exception 'Unsupported classification outcome';
  end if;

  if p_outcome = 'assigned' and (
    p_category_id is null
    or p_assignment_source not in ('provider_policy', 'merchant_history', 'ai_classifier')
    or p_assignment_reason is null
  ) then
    raise exception 'Assigned classification requires governed assignment evidence';
  end if;

  update public.budget_transactions as txn
  set
    budget_id = case when p_outcome = 'assigned' then p_category_id else txn.budget_id end,
    budget_assignment_source = case when p_outcome = 'assigned' then p_assignment_source else txn.budget_assignment_source end,
    budget_assignment_policy_version = case when p_outcome = 'assigned' then p_policy_version else txn.budget_assignment_policy_version end,
    budget_assignment_governed = case when p_outcome = 'assigned' then false else txn.budget_assignment_governed end,
    budget_assignment_confidence = case when p_outcome = 'assigned' then 'high' else txn.budget_assignment_confidence end,
    budget_assignment_reason = case when p_outcome = 'assigned' then p_assignment_reason else txn.budget_assignment_reason end,
    classification_attempted_at = p_attempted_at,
    classification_attempt_count = txn.classification_attempt_count + 1,
    classification_next_retry_at = case when p_outcome = 'assigned' then null else p_next_retry_at end,
    classification_policy_version = p_policy_version,
    classification_last_outcome = p_outcome
  where txn.user_id = p_user_id
    and txn.id = p_transaction_id
    and txn.classification_attempt_count = p_expected_attempt_count
    and txn.direction = 'outflow'
    and txn.budget_id is null
    and txn.budget_match_source is null
    and txn.budget_assignment_source is null
    and txn.budget_assignment_governed = false
    and (txn.money_meaning is null or txn.money_meaning = 'unknown')
    and not exists (
      select 1
      from public.budget_transaction_allocations as allocation
      where allocation.transaction_id = txn.id
    )
    and (
      p_outcome <> 'assigned'
      or exists (
        select 1
        from public.budget_categories as category
        where category.user_id = p_user_id
          and category.id::text = p_category_id
          and category.status = 'active'
      )
    )
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

revoke all on function public.apply_money_transaction_classification_attempt(
  uuid, uuid, integer, text, text, text, text, text, timestamptz, timestamptz
) from public, authenticated;
grant execute on function public.apply_money_transaction_classification_attempt(
  uuid, uuid, integer, text, text, text, text, text, timestamptz, timestamptz
) to service_role;

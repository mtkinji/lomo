-- Normalize and conservatively pair owned-account credit-card payments.
create or replace function public.reconcile_credit_card_payment_transfers(
  p_user_id uuid,
  p_reference_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_normalized_count integer := 0;
  v_paired_count integer := 0;
begin
  if p_user_id is null then
    raise exception 'A Money owner is required.' using errcode = '22023';
  end if;

  update public.budget_transactions as txn
  set money_meaning = 'transfer',
      money_meaning_source = 'inferred',
      money_meaning_category_budget_id = null,
      money_meaning_reason = 'Recognized from provider credit-card payment evidence.',
      money_meaning_reviewed_at = null,
      budget_id = case when txn.budget_assignment_source is not null then null else txn.budget_id end,
      budget_assignment_source = null,
      budget_assignment_policy_version = null,
      budget_assignment_governed = false,
      budget_match_confidence = null,
      budget_match_reason = null,
      saved_resource_cents = 0,
      plan_coverage_reviewed_at = null,
      plan_coverage_provenance = null,
      updated_at = now()
  where txn.user_id = p_user_id
    and txn.direction = 'outflow'
    and upper(coalesce(txn.personal_finance_category_detailed, '')) = 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
    and (txn.money_meaning is null or txn.money_meaning in ('unknown'))
    and txn.budget_match_source is null
    and (p_reference_date is null or txn.date between p_reference_date - 3 and p_reference_date + 3);
  get diagnostics v_normalized_count = row_count;

  with eligible_pairs as (
    select
      outflow.id as outflow_id,
      inflow.id as inflow_id,
      count(*) over (partition by outflow.id) as candidate_count,
      count(*) over (partition by inflow.id) as anchor_count
    from public.budget_transactions as outflow
    join public.budget_financial_accounts as outflow_account
      on outflow_account.id = outflow.financial_account_id
     and outflow_account.user_id = outflow.user_id
    join public.budget_transactions as inflow
      on inflow.user_id = outflow.user_id
     and outflow.amount_cents = inflow.amount_cents
     and inflow.iso_currency_code = outflow.iso_currency_code
     and inflow.date between outflow.date - 3 and outflow.date + 3
    join public.budget_financial_accounts as inflow_account
      on inflow_account.id = inflow.financial_account_id
     and inflow_account.user_id = inflow.user_id
    where outflow.user_id = p_user_id
      and outflow.direction = 'outflow'
      and inflow.direction = 'inflow'
      and not outflow.pending
      and not inflow.pending
      and outflow_account.type = 'depository'
      and (inflow_account.type = 'credit' or inflow_account.subtype = 'credit card')
      and upper(coalesce(outflow.personal_finance_category_detailed, '')) = 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
      and outflow.money_meaning = 'transfer'
      and (inflow.money_meaning is null or inflow.money_meaning in ('unknown'))
      and inflow.budget_match_source is null
      and (p_reference_date is null or outflow.date between p_reference_date - 3 and p_reference_date + 3)
  ), unique_pairs as (
    select outflow_id, inflow_id
    from eligible_pairs
    where candidate_count = 1 and anchor_count = 1
  )
  update public.budget_transactions as inflow
  set money_meaning = 'transfer',
      money_meaning_source = 'inferred',
      money_meaning_category_budget_id = null,
      money_meaning_reason = 'Paired with an owned-account credit-card payment.',
      money_meaning_reviewed_at = null,
      saved_resource_cents = 0,
      plan_coverage_reviewed_at = null,
      plan_coverage_provenance = null,
      updated_at = now()
  from unique_pairs
  where inflow.id = unique_pairs.inflow_id
    and inflow.user_id = p_user_id;
  get diagnostics v_paired_count = row_count;

  return jsonb_build_object(
    'normalizedOutflowCount', v_normalized_count,
    'pairedInflowCount', v_paired_count
  );
end;
$$;

create or replace function public.reconcile_credit_card_payment_transfers_after_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.reconcile_credit_card_payment_transfers(new.user_id, new.date);
  return new;
end;
$$;

drop trigger if exists reconcile_credit_card_payment_transfers_after_write
  on public.budget_transactions;
create trigger reconcile_credit_card_payment_transfers_after_write
after insert or update of
  user_id,
  financial_account_id,
  amount_cents,
  direction,
  date,
  pending,
  iso_currency_code,
  personal_finance_category_detailed
on public.budget_transactions
for each row
execute function public.reconcile_credit_card_payment_transfers_after_write();

do $$
declare
  owner record;
begin
  for owner in select distinct user_id from public.budget_transactions loop
    perform public.reconcile_credit_card_payment_transfers(owner.user_id, null);
  end loop;
end;
$$;

revoke execute on function public.reconcile_credit_card_payment_transfers(uuid, date)
  from public, anon, authenticated;
grant execute on function public.reconcile_credit_card_payment_transfers(uuid, date)
  to service_role;
revoke execute on function public.reconcile_credit_card_payment_transfers_after_write()
  from public, anon, authenticated;
grant execute on function public.reconcile_credit_card_payment_transfers_after_write()
  to service_role;

-- Exact, owner-scoped transfer review for native and conversational Money control.
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
  v_row_count integer;
  v_max_updated_at timestamptz;
  v_amount_count integer;
  v_currency_count integer;
  v_direction_count integer;
  v_updated_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_transaction_ids is null or cardinality(p_transaction_ids) <> 2
    or p_transaction_ids[1] = p_transaction_ids[2] then
    raise exception 'Exactly two different transactions are required.' using errcode = '22023';
  end if;
  if p_decision not in ('confirm_pair', 'unpair') then
    raise exception 'Unsupported transfer review decision.' using errcode = '22023';
  end if;

  perform id
  from public.budget_transactions
  where user_id = auth.uid() and id = any(p_transaction_ids)
  order by id
  for update;

  select count(*), max(updated_at), count(distinct amount_cents),
         count(distinct iso_currency_code), count(distinct direction)
  into v_row_count, v_max_updated_at, v_amount_count, v_currency_count, v_direction_count
  from public.budget_transactions
  where user_id = auth.uid() and id = any(p_transaction_ids);

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
        then 'Confirmed as an owned-account transfer.'
        else 'Transfer pairing removed for explicit review.' end,
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
  where user_id = auth.uid() and id = any(p_transaction_ids);

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

revoke execute on function public.review_budget_transfer_pair(uuid[], timestamptz, text)
from public, anon;
grant execute on function public.review_budget_transfer_pair(uuid[], timestamptz, text)
to authenticated;

alter table public.budget_financial_connections
  drop constraint if exists budget_financial_connections_status_check;
alter table public.budget_financial_connections
  add constraint budget_financial_connections_status_check
  check (status in ('linked', 'syncing', 'healthy', 'error', 'disconnecting', 'disconnected'));

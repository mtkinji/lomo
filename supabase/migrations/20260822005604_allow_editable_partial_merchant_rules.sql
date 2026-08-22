-- Partial merchant rules are user-authored matching instructions. Keep exact rules
-- tied to the full source merchant, while allowing an authenticated owner to choose
-- a narrower normalized phrase that still occurs inside the source transaction.

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
  v_source_merchant_key text;
  v_rule_merchant_key text;
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

  v_source_merchant_key := public.normalize_budget_merchant(v_source_merchant, p_match_mode);
  v_rule_merchant_key := public.normalize_budget_merchant(p_merchant_contains, p_match_mode);
  if v_source_merchant_key = ''
    or v_rule_merchant_key = ''
    or (p_match_mode = 'exact' and v_source_merchant_key <> v_rule_merchant_key)
    or (p_match_mode = 'partial' and strpos(v_source_merchant_key, v_rule_merchant_key) = 0)
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
    v_rule_merchant_key,
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
    'merchantKey', v_rule_merchant_key,
    'matchMode', p_match_mode,
    'categoryId', trim(p_budget_id)
  );
end;
$$;

revoke execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text)
from public, anon;
grant execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text)
to authenticated;

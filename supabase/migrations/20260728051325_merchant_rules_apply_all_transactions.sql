-- Merchant rules are durable categorization instructions. Saving a rule must update the
-- complete owned history atomically, and Plaid imports must apply the same rule before
-- a transaction can contribute to category totals.

alter table public.budget_transactions
  drop constraint if exists budget_transactions_budget_match_source_check;

alter table public.budget_transactions
  add constraint budget_transactions_budget_match_source_check
  check (
    budget_match_source is null
    or budget_match_source in ('confirmed', 'corrected', 'excluded', 'merchant_rule')
  );

create or replace function public.normalize_budget_merchant(
  p_value text,
  p_mode text
)
returns text
language plpgsql
immutable
parallel safe
security invoker
set search_path = ''
as $$
declare
  v_normalized text := lower(coalesce(p_value, ''));
  v_token text;
  v_tokens text[] := '{}'::text[];
begin
  if p_mode not in ('exact', 'partial') then
    raise exception 'Unsupported merchant match mode.' using errcode = 'P0001';
  end if;

  if p_mode = 'partial' then
    v_normalized := regexp_replace(v_normalized, '''s([^a-z0-9]|$)', '\1', 'g');
    v_normalized := regexp_replace(v_normalized, '#[0-9]+', ' ', 'g');
  end if;

  v_normalized := btrim(regexp_replace(
    regexp_replace(v_normalized, '[^a-z0-9]+', ' ', 'g'),
    '[[:space:]]+',
    ' ',
    'g'
  ));

  if p_mode = 'exact' or v_normalized = '' then
    return v_normalized;
  end if;

  foreach v_token in array regexp_split_to_array(v_normalized, ' ') loop
    if v_token <> ''
      and v_token !~ '^[0-9]+$'
      and v_token <> all(array['co', 'company', 'food', 'foods', 'inc', 'llc', 'market', 'marketplace', 'mktpl', 'store', 'the'])
    then
      v_tokens := array_append(v_tokens, v_token);
      exit when cardinality(v_tokens) = 2;
    end if;
  end loop;

  return array_to_string(v_tokens, ' ');
end;
$$;

create or replace function public.budget_merchant_rule_matches(
  p_rule_key text,
  p_mode text,
  p_merchant_name text
)
returns boolean
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when p_mode = 'exact' then
      public.normalize_budget_merchant(p_rule_key, 'exact')
        = public.normalize_budget_merchant(p_merchant_name, 'exact')
    when p_mode = 'partial' then
      strpos(
        public.normalize_budget_merchant(p_merchant_name, 'partial'),
        public.normalize_budget_merchant(p_rule_key, 'partial')
      ) > 0
      and public.normalize_budget_merchant(p_rule_key, 'partial') <> ''
    else false
  end;
$$;

revoke execute on function public.normalize_budget_merchant(text, text) from public, anon;
revoke execute on function public.budget_merchant_rule_matches(text, text, text) from public, anon;
grant execute on function public.normalize_budget_merchant(text, text) to authenticated, service_role;
grant execute on function public.budget_merchant_rule_matches(text, text, text) to authenticated, service_role;

create or replace function public.apply_budget_transaction_match_rule_to_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rule public.budget_transaction_match_rules%rowtype;
begin
  if new.direction <> 'outflow'
    or new.budget_match_source = 'excluded'
    or new.money_meaning in ('transfer', 'not_counted', 'category_credit')
    or exists (
      select 1
      from public.budget_transaction_allocations allocation
      where allocation.transaction_id = new.id
    )
  then
    return new;
  end if;

  select rule.* into v_rule
  from public.budget_transaction_match_rules rule
  where rule.user_id = new.user_id
    and public.budget_merchant_rule_matches(
      rule.merchant_contains,
      rule.merchant_match_mode,
      coalesce(nullif(trim(new.merchant_name), ''), new.name)
    )
  order by
    case when rule.merchant_match_mode = 'exact' then 0 else 1 end,
    rule.updated_at desc,
    rule.id desc
  limit 1;

  if found then
    new.budget_id := v_rule.budget_id;
    new.budget_match_source := 'merchant_rule';
    new.budget_match_confidence := 1;
    new.budget_match_reason := 'Applied from saved merchant rule.';
    new.budget_match_reviewed_at := v_rule.updated_at;
    new.budget_assignment_source := 'merchant_rule';
    new.budget_assignment_policy_version := 'merchant-rule-v1';
    new.budget_assignment_governed := true;
  elsif new.budget_match_source = 'merchant_rule' then
    new.budget_id := null;
    new.budget_match_source := null;
    new.budget_match_confidence := null;
    new.budget_match_reason := null;
    new.budget_match_reviewed_at := null;
    new.budget_assignment_source := null;
    new.budget_assignment_policy_version := null;
    new.budget_assignment_governed := false;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_budget_transaction_match_rule on public.budget_transactions;
create trigger apply_budget_transaction_match_rule
before insert or update of merchant_name, name, user_id
on public.budget_transactions
for each row
execute function public.apply_budget_transaction_match_rule_to_row();

revoke execute on function public.apply_budget_transaction_match_rule_to_row() from public, anon, authenticated;

grant update (
  budget_assignment_source,
  budget_assignment_policy_version,
  budget_assignment_governed
) on public.budget_transactions to authenticated;

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

  with resolved as (
    select txn.id, matched_rule.budget_id, matched_rule.updated_at
    from public.budget_transactions txn
    join lateral (
      select rule.budget_id, rule.updated_at
      from public.budget_transaction_match_rules rule
      where rule.user_id = txn.user_id
        and public.budget_merchant_rule_matches(
          rule.merchant_contains,
          rule.merchant_match_mode,
          coalesce(nullif(trim(txn.merchant_name), ''), txn.name)
        )
      order by
        case when rule.merchant_match_mode = 'exact' then 0 else 1 end,
        rule.updated_at desc,
        rule.id desc
      limit 1
    ) matched_rule on true
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
  )
  update public.budget_transactions txn
  set budget_id = resolved.budget_id,
      budget_match_source = 'merchant_rule',
      budget_match_confidence = 1,
      budget_match_reason = 'Applied from saved merchant rule.',
      budget_match_reviewed_at = resolved.updated_at,
      budget_assignment_source = 'merchant_rule',
      budget_assignment_policy_version = 'merchant-rule-v1',
      budget_assignment_governed = true
  from resolved
  where txn.id = resolved.id
    and txn.user_id = v_user_id;
  get diagnostics v_applied_count = row_count;

  return jsonb_build_object(
    'ruleId', v_rule_id,
    'appliedTransactionCount', v_applied_count,
    'merchantKey', v_normalized_merchant,
    'matchMode', p_match_mode,
    'categoryId', trim(p_budget_id)
  );
end;
$$;

revoke execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text) from public, anon;
grant execute on function public.upsert_budget_transaction_match_rule(uuid, text, text, text, text) to authenticated;

-- Backfill all existing explicit rules so historical totals become correct as soon as
-- this migration lands, without requiring each user to recreate their rules.
with resolved as (
  select txn.id, matched_rule.budget_id, matched_rule.updated_at
  from public.budget_transactions txn
  join lateral (
    select rule.budget_id, rule.updated_at
    from public.budget_transaction_match_rules rule
    where rule.user_id = txn.user_id
      and public.budget_merchant_rule_matches(
        rule.merchant_contains,
        rule.merchant_match_mode,
        coalesce(nullif(trim(txn.merchant_name), ''), txn.name)
      )
    order by
      case when rule.merchant_match_mode = 'exact' then 0 else 1 end,
      rule.updated_at desc,
      rule.id desc
    limit 1
  ) matched_rule on true
  where txn.direction = 'outflow'
    and txn.budget_match_source is distinct from 'excluded'
    and txn.money_meaning is distinct from 'transfer'
    and txn.money_meaning is distinct from 'not_counted'
    and txn.money_meaning is distinct from 'category_credit'
    and not exists (
      select 1
      from public.budget_transaction_allocations allocation
      where allocation.transaction_id = txn.id
    )
)
update public.budget_transactions txn
set budget_id = resolved.budget_id,
    budget_match_source = 'merchant_rule',
    budget_match_confidence = 1,
    budget_match_reason = 'Applied from saved merchant rule.',
    budget_match_reviewed_at = resolved.updated_at,
    budget_assignment_source = 'merchant_rule',
    budget_assignment_policy_version = 'merchant-rule-v1',
    budget_assignment_governed = true
from resolved
where txn.id = resolved.id;

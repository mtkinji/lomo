-- Older installed clients write the match-rule table directly instead of calling
-- upsert_budget_transaction_match_rule. Keep that path trustworthy by resolving the
-- user's complete eligible history whenever a rule is written or removed.

create or replace function public.apply_budget_transaction_match_rule_to_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;

  with resolved as (
    select
      txn.id,
      matched_rule.budget_id,
      matched_rule.updated_at
    from public.budget_transactions txn
    left join lateral (
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
      and (
        matched_rule.budget_id is not null
        or txn.budget_match_source = 'merchant_rule'
      )
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
    and txn.user_id = v_user_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_budget_transaction_match_rule_to_history
  on public.budget_transaction_match_rules;
create trigger apply_budget_transaction_match_rule_to_history
after insert or update of budget_id, merchant_contains, merchant_match_mode
on public.budget_transaction_match_rules
for each row
execute function public.apply_budget_transaction_match_rule_to_history();

drop trigger if exists remove_budget_transaction_match_rule_from_history
  on public.budget_transaction_match_rules;
create trigger remove_budget_transaction_match_rule_from_history
after delete
on public.budget_transaction_match_rules
for each row
execute function public.apply_budget_transaction_match_rule_to_history();

revoke execute on function public.apply_budget_transaction_match_rule_to_history()
from public, anon, authenticated;

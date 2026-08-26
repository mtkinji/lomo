-- A merchant match can only send future transactions to one budget. Keep the
-- most recently changed rule when older app builds have created conflicts.
with ranked_rules as (
  select
    id,
    row_number() over (
      partition by user_id, merchant_contains, merchant_match_mode
      order by updated_at desc, created_at desc, id desc
    ) as recency_rank
  from public.budget_transaction_match_rules
)
delete from public.budget_transaction_match_rules as rules
using ranked_rules
where rules.id = ranked_rules.id
  and ranked_rules.recency_rank > 1;

alter table public.budget_transaction_match_rules
  drop constraint if exists budget_transaction_match_rule_user_id_budget_id_merchant_co_key;

alter table public.budget_transaction_match_rules
  add constraint budget_transaction_match_rule_user_merchant_mode_key
  unique (user_id, merchant_contains, merchant_match_mode);;

-- Resolve the canonical household owner once per statement. This preserves the
-- one-household Money dataset while avoiding per-row auth context evaluation.

alter policy "Household adults can update shared budget transactions"
on public.budget_transactions
using (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
)
with check (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can read shared budget transaction allocations"
on public.budget_transaction_allocations
using (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can insert shared budget transaction allocations"
on public.budget_transaction_allocations
with check (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can delete shared budget transaction allocations"
on public.budget_transaction_allocations
using (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household members can read shared budget transaction match rules"
on public.budget_transaction_match_rules
using (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can insert shared budget transaction match rules"
on public.budget_transaction_match_rules
with check (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can update shared budget transaction match rules"
on public.budget_transaction_match_rules
using (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
)
with check (
  user_id = (select public.budget_effective_owner_user_id())
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

-- Household Money is unavailable to anonymous authenticated sessions even
-- when a project supports anonymous sign-in. Keep that boundary explicit in
-- each policy in addition to the shared authority helpers.

alter policy "Household adults can update shared budget transactions"
on public.budget_transactions
using (
  public.can_manage_budget_user(user_id)
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
)
with check (
  user_id = public.budget_effective_owner_user_id()
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can read shared budget transaction allocations"
on public.budget_transaction_allocations
using (
  public.can_access_budget_user(user_id)
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can insert shared budget transaction allocations"
on public.budget_transaction_allocations
with check (
  user_id = public.budget_effective_owner_user_id()
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can delete shared budget transaction allocations"
on public.budget_transaction_allocations
using (
  public.can_manage_budget_user(user_id)
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household members can read shared budget transaction match rules"
on public.budget_transaction_match_rules
using (
  public.can_access_budget_user(user_id)
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can insert shared budget transaction match rules"
on public.budget_transaction_match_rules
with check (
  user_id = public.budget_effective_owner_user_id()
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Household adults can update shared budget transaction match rules"
on public.budget_transaction_match_rules
using (
  public.can_manage_budget_user(user_id)
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
)
with check (
  user_id = public.budget_effective_owner_user_id()
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

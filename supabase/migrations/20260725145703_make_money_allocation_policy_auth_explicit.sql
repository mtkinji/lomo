-- Recorded remotely as migration 20260725145703.
alter policy "Users can read accessible budget transaction allocations"
on public.budget_transaction_allocations
using (
  public.can_access_budget_user(user_id)
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Users can insert their own budget transaction allocations"
on public.budget_transaction_allocations
with check (
  (select auth.uid()) = user_id
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

alter policy "Users can delete their own budget transaction allocations"
on public.budget_transaction_allocations
using (
  (select auth.uid()) = user_id
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
);

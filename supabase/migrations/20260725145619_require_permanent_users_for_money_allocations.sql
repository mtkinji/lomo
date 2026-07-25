-- Recorded remotely as migration 20260725145619.
create policy "Only permanent users can access budget transaction allocations"
on public.budget_transaction_allocations
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

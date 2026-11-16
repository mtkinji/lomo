-- Category previews must see the planning basis used by the owner's atomic save.
-- This is read-only access for current permanent household adults. Existing
-- owner-only INSERT/UPDATE policies and restrictive policies remain in force.
create policy "Household adults can read the Money planning basis"
on public.budget_planning_basis_overrides
for select to authenticated
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and user_id=(select public.budget_effective_owner_user_id())
);

alter policy "Owners read living config" on public.budget_living_plan_config
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and user_id=(select auth.uid())
);
create policy "Household adults can read the Money plan config"
on public.budget_living_plan_config
for select to authenticated
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and user_id=(select public.budget_effective_owner_user_id())
);

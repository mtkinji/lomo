-- Supabase anonymous sessions use the authenticated Postgres role. Money planning
-- persistence is reserved for permanent signed-in accounts.
create policy "Only permanent users can access Money planning basis"
on public.budget_planning_basis_overrides
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

create policy "Only permanent users can access held Money plans"
on public.budget_held_living_plan_candidates
as restrictive
for all
to authenticated
using (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false)
with check (coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false);

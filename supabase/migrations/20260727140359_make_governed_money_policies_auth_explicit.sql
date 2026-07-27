-- Make permanent-account authorization visible in every permissive policy as well
-- as the restrictive defense-in-depth policies installed previously.
alter policy "Users can read their Money planning basis"
on public.budget_planning_basis_overrides
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

alter policy "Users can insert their Money planning basis"
on public.budget_planning_basis_overrides
with check (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

alter policy "Users can update their Money planning basis"
on public.budget_planning_basis_overrides
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
)
with check (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

alter policy "Users can read their held Money plan"
on public.budget_held_living_plan_candidates
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

alter policy "Users can insert their held Money plan"
on public.budget_held_living_plan_candidates
with check (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

alter policy "Users can update their held Money plan"
on public.budget_held_living_plan_candidates
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
)
with check (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

alter policy "Users can delete their held Money plan"
on public.budget_held_living_plan_candidates
using (
  coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and (select auth.uid()) = user_id
);

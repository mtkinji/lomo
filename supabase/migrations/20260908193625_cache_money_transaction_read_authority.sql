-- Preserve can_access_budget_user's exact SELECT authority, but resolve actor
-- context once per statement instead of re-running household joins for each row.
-- Keep this CASE aligned with can_access_budget_user; writes are unchanged.
alter policy "Household members can read shared budget transactions"
on public.budget_transactions
using (
  (select auth.uid()) is not null
  and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
  and case
    when (select private.budget_actor_is_active_household_child(auth.uid())) then false
    when (select private.budget_canonical_adult_owner_user_id(auth.uid())) is not null
      then user_id = (select private.budget_canonical_adult_owner_user_id(auth.uid()))
    else user_id = (select auth.uid())
      or user_id in (
        select target.user_id
        from public.budget_household_members viewer
        join public.budget_household_members target
          on target.household_id = viewer.household_id
        where viewer.user_id = (select auth.uid())
          and viewer.status = 'active'
          and target.status = 'active'
      )
  end
);

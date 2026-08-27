create policy "Owners insert planning sources" on public.budget_planning_income_sources for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Owners update planning sources" on public.budget_planning_income_sources for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant insert, update on public.budget_planning_income_sources to authenticated;
;

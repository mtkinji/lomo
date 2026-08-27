revoke execute on function public.promote_budget_living_plan(uuid, jsonb, jsonb, jsonb) from anon;
revoke execute on function public.reverse_budget_living_plan(uuid, uuid) from anon;
revoke execute on function public.mark_budget_living_plan_receipt_seen(uuid) from anon;

drop policy if exists "Owners write living targets" on public.budget_living_target_intents;
create policy "Owners insert living targets" on public.budget_living_target_intents for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Owners update living targets" on public.budget_living_target_intents for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Owners manage living overrides" on public.budget_living_plan_overrides;
create policy "Owners insert living overrides" on public.budget_living_plan_overrides for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Owners update living overrides" on public.budget_living_plan_overrides for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owners delete living overrides" on public.budget_living_plan_overrides for delete to authenticated
using (user_id = (select auth.uid()));

create index if not exists budget_planning_income_sources_user_idx on public.budget_planning_income_sources (user_id);
create index if not exists budget_living_plan_versions_user_idx on public.budget_living_plan_versions (user_id);
create index if not exists budget_living_plan_components_user_idx on public.budget_living_plan_components (user_id);
create index if not exists budget_living_plan_overrides_user_idx on public.budget_living_plan_overrides (user_id);
create index if not exists budget_living_plan_receipts_user_idx on public.budget_living_plan_receipts (user_id);
;

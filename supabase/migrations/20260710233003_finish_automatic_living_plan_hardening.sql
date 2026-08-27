grant update (seen_at) on public.budget_living_plan_receipts to authenticated;
create policy "Owners mark living receipts seen" on public.budget_living_plan_receipts for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.mark_budget_living_plan_receipt_seen(receipt_id uuid)
returns void language sql security invoker set search_path = public as $$
  update public.budget_living_plan_receipts set seen_at = coalesce(seen_at, now())
  where id = receipt_id and user_id = (select auth.uid());
$$;

revoke all on function public.mark_budget_living_plan_receipt_seen(uuid) from public, anon;
grant execute on function public.mark_budget_living_plan_receipt_seen(uuid) to authenticated;

create index if not exists budget_active_living_plans_version_idx on public.budget_active_living_plans (plan_version_id);
create index if not exists budget_living_plan_receipts_prior_idx on public.budget_living_plan_receipts (prior_version_id);
create index if not exists budget_living_plan_versions_predecessor_idx on public.budget_living_plan_versions (predecessor_version_id);
create index if not exists budget_living_plan_versions_reversal_idx on public.budget_living_plan_versions (reversal_of_version_id);
;

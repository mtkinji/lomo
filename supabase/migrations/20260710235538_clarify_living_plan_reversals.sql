create or replace function public.reverse_budget_living_plan(expected_active_version_id uuid, restore_version_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); current_id uuid; restored public.budget_living_plan_versions%rowtype; new_id uuid;
begin
  select plan_version_id into current_id from public.budget_active_living_plans where user_id = owner_id for update;
  if current_id is distinct from expected_active_version_id then raise exception 'active living plan changed'; end if;
  select * into restored from public.budget_living_plan_versions where id = restore_version_id and user_id = owner_id;
  if restored.id is null then raise exception 'restore version unavailable'; end if;
  insert into public.budget_living_plan_versions (user_id, period_id, predecessor_version_id, reversal_of_version_id, living_percent, resource_basis_cents, target_cents, planned_cents, unassigned_cents, over_target_cents, status, evidence_hash, candidate_hash, allocator_version)
  values (owner_id, restored.period_id, current_id, current_id, restored.living_percent, restored.resource_basis_cents, restored.target_cents, restored.planned_cents, restored.unassigned_cents, restored.over_target_cents, restored.status, restored.evidence_hash, restored.candidate_hash || '-reversal-' || current_id, restored.allocator_version) returning id into new_id;
  insert into public.budget_living_plan_components (plan_version_id, user_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source)
  select new_id, owner_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source from public.budget_living_plan_components where plan_version_id = restore_version_id;
  insert into public.budget_living_plan_receipts (user_id, plan_version_id, prior_version_id, trigger, outcome, cause, changed_category_ids, material_reasons)
  values (owner_id, new_id, current_id, 'user_reversal', 'reversal', 'Returned your monthly budgets to the version before the last update.', '[]', '["reversal"]');
  update public.budget_active_living_plans set plan_version_id = new_id, updated_at = now() where user_id = owner_id;
  return new_id;
end; $$;

revoke all on function public.reverse_budget_living_plan(uuid, uuid) from public, anon;
grant execute on function public.reverse_budget_living_plan(uuid, uuid) to authenticated;

update public.budget_living_plan_receipts
set cause = 'Returned your monthly budgets to the version before the last update.'
where outcome = 'reversal' and cause = 'Restored the prior monthly budgets.';
;

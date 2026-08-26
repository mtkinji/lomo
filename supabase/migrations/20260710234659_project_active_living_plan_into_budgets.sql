create or replace function public.project_active_living_plan_into_budget_plans()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.budget_plans plan
  set base_budget_cents = component.amount_cents::integer,
      updated_at = now()
  from public.budget_living_plan_components component
  join public.budget_categories category
    on category.user_id = new.user_id
   and (category.legacy_budget_id = component.category_id or category.slug = component.category_id)
  where component.plan_version_id = new.plan_version_id
    and component.user_id = new.user_id
    and plan.user_id = new.user_id
    and plan.category_id = category.id
    and plan.status = 'active';
  return new;
end;
$$;

revoke all on function public.project_active_living_plan_into_budget_plans() from public, anon, authenticated;

drop trigger if exists project_active_living_plan_into_budget_plans on public.budget_active_living_plans;
create trigger project_active_living_plan_into_budget_plans
after insert or update of plan_version_id on public.budget_active_living_plans
for each row execute function public.project_active_living_plan_into_budget_plans();
;

alter table public.budget_plans
  add column if not exists plan_role text;

alter table public.budget_plans
  drop constraint if exists budget_plans_plan_role_check;

alter table public.budget_plans
  add constraint budget_plans_plan_role_check
  check (plan_role is null or plan_role in ('protected', 'flexible'));

comment on column public.budget_plans.plan_role is
  'Customer-selected category role. Null preserves legacy inference.';

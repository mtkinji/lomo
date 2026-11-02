-- Read-only deployment preflight. Run against the target database before releasing
-- rollover settings; calculation tests alone cannot detect an unapplied migration.
begin read only;
do $$
begin
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budget_plans'
      and column_name = 'rollover_policy' and data_type = 'jsonb'
  ), 'Budget rollover deployment incomplete: budget_plans.rollover_policy is missing';
  assert to_regprocedure('public.valid_budget_rollover_policy(jsonb)') is not null,
    'Budget rollover deployment incomplete: policy validator is missing';
  assert to_regprocedure('public.track_budget_rollover_amount()') is not null,
    'Budget rollover deployment incomplete: amount history function is missing';
  assert exists (
    select 1 from pg_constraint
    where conrelid = 'public.budget_plans'::regclass
      and conname = 'budget_plans_valid_rollover_policy' and convalidated
  ), 'Budget rollover deployment incomplete: policy constraint is missing or unvalidated';
  assert exists (
    select 1 from pg_trigger
    where tgrelid = 'public.budget_plans'::regclass
      and tgname = 'track_budget_rollover_amount' and tgenabled in ('O', 'A')
      and tgfoid = 'public.track_budget_rollover_amount()'::regprocedure
  ), 'Budget rollover deployment incomplete: amount history trigger is missing or disabled';
end;
$$;
rollback;

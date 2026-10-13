-- Run after 20261013123903_category_rollover_start_policy.sql. Only temporary rows.
begin;
create temporary table rollover_policy_test (
  base_budget_cents integer not null,
  rollover_policy jsonb check (public.valid_budget_rollover_policy(rollover_policy))
);
create trigger rollover_policy_test_track before insert or update on rollover_policy_test
  for each row execute function public.track_budget_rollover_amount();
insert into rollover_policy_test values (40000,
  '{"startMonth":"2026-01","startingBalanceCents":-5000,"monthlyAmounts":{"2026-01":40000},"timeZone":"America/Denver"}');
update rollover_policy_test set base_budget_cents = 50000;
do $$
declare saved jsonb; current_month text;
begin
  select rollover_policy into saved from rollover_policy_test;
  current_month := to_char(now() at time zone 'America/Denver','YYYY-MM');
  assert (saved->>'startingBalanceCents')::integer = -5000, 'Opening deficit was erased';
  if current_month <> '2026-01' then
    assert (saved->'monthlyAmounts'->>'2026-01')::integer = 40000, 'Historical budget was rewritten';
  end if;
  assert (saved->'monthlyAmounts'->>current_month)::integer = 50000, 'Current amount was not recorded';
  assert not public.valid_budget_rollover_policy('{}'), 'Incomplete policy accepted';
  assert not public.valid_budget_rollover_policy(jsonb_set(saved,'{startingBalanceCents}','0.5')), 'Fractional cents accepted';
  assert not public.valid_budget_rollover_policy(jsonb_set(saved,'{monthlyAmounts}','{}')), 'Missing baseline accepted';
end $$;
rollback;

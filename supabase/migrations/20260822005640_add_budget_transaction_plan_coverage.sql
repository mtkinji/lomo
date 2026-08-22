alter table public.budget_transactions
  add column if not exists saved_resource_cents integer not null default 0,
  add column if not exists plan_coverage_reviewed_at timestamptz,
  add column if not exists plan_coverage_provenance text;

alter table public.budget_transactions
  drop constraint if exists budget_transactions_saved_resource_cents_check;
alter table public.budget_transactions
  add constraint budget_transactions_saved_resource_cents_check
  check (
    saved_resource_cents >= 0
    and saved_resource_cents <= amount_cents
    and (
      saved_resource_cents = 0
      or (
        direction = 'outflow'
        and pending = false
        and money_meaning is distinct from 'transfer'
        and money_meaning is distinct from 'not_counted'
        and budget_match_source is distinct from 'excluded'
      )
    )
  );

alter table public.budget_transactions
  drop constraint if exists budget_transactions_plan_coverage_provenance_check;
alter table public.budget_transactions
  add constraint budget_transactions_plan_coverage_provenance_check
  check (plan_coverage_provenance is null or plan_coverage_provenance = 'user_declared');

comment on column public.budget_transactions.saved_resource_cents is
  'User-declared portion of a posted household outflow covered by saved money rather than the current monthly plan.';
comment on column public.budget_transactions.plan_coverage_reviewed_at is
  'When the signed-in owner last reviewed this transaction plan coverage.';
comment on column public.budget_transactions.plan_coverage_provenance is
  'Provenance of the plan coverage annotation. No value is inferred from provider data.';

grant update (saved_resource_cents, plan_coverage_reviewed_at, plan_coverage_provenance)
on public.budget_transactions
to authenticated;

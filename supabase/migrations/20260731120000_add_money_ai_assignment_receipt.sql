alter table public.budget_transactions
  add column if not exists budget_assignment_confidence text,
  add column if not exists budget_assignment_reason text;

alter table public.budget_transactions
  drop constraint if exists budget_transactions_assignment_confidence_check;
alter table public.budget_transactions
  add constraint budget_transactions_assignment_confidence_check
  check (budget_assignment_confidence is null or budget_assignment_confidence in ('high', 'medium', 'low'));

revoke update (budget_assignment_confidence, budget_assignment_reason)
on public.budget_transactions from authenticated;

alter table public.budget_transactions
  add column if not exists plan_role_override text,
  add column if not exists plan_role_override_reviewed_at timestamptz;

alter table public.budget_transactions
  drop constraint if exists budget_transactions_plan_role_override_check;

alter table public.budget_transactions
  add constraint budget_transactions_plan_role_override_check
  check (
    plan_role_override is null
    or (
      plan_role_override in ('protected', 'flexible')
      and direction = 'outflow'
      and budget_id is not null
      and coalesce(money_meaning, 'unknown') = 'unknown'
    )
  );

comment on column public.budget_transactions.plan_role_override is
  'Reviewed transaction-only override of the assigned category plan role. Null inherits the category role.';

comment on column public.budget_transactions.plan_role_override_reviewed_at is
  'When the user last reviewed the transaction-only plan role override.';

grant update (plan_role_override, plan_role_override_reviewed_at)
on public.budget_transactions
to authenticated;

create or replace function public.clear_budget_transaction_plan_role_override_on_classification_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.budget_id is distinct from old.budget_id
    or new.money_meaning is distinct from old.money_meaning then
    new.plan_role_override := null;
    new.plan_role_override_reviewed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_budget_transaction_plan_role_override_on_classification_change
on public.budget_transactions;

create trigger clear_budget_transaction_plan_role_override_on_classification_change
before update of budget_id, money_meaning on public.budget_transactions
for each row
execute function public.clear_budget_transaction_plan_role_override_on_classification_change();

revoke execute on function public.clear_budget_transaction_plan_role_override_on_classification_change()
from public, anon, authenticated;

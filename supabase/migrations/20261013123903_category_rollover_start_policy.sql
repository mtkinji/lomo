-- Rollover policy stays on the existing owner/household-protected plan row.
-- Monthly amounts are effective-month changes, preserving past contributions.
create or replace function public.valid_budget_rollover_policy(policy jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare entry record;
begin
  if policy is null then return true; end if;
  if jsonb_typeof(policy) <> 'object'
    or jsonb_typeof(policy->'startMonth') is distinct from 'string'
    or (policy->>'startMonth') !~ '^(19|20|21)[0-9]{2}-(0[1-9]|1[0-2])$'
    or jsonb_typeof(policy->'startingBalanceCents') is distinct from 'number'
    or jsonb_typeof(policy->'monthlyAmounts') is distinct from 'object'
    or jsonb_typeof(policy->'timeZone') is distinct from 'string'
    or length(policy->>'timeZone') not between 1 and 100
    or not ((policy->'monthlyAmounts') ? (policy->>'startMonth')) then return false; end if;
  if abs((policy->>'startingBalanceCents')::numeric) > 1000000000
    or trunc((policy->>'startingBalanceCents')::numeric) <> (policy->>'startingBalanceCents')::numeric then return false; end if;
  for entry in select * from jsonb_each(policy->'monthlyAmounts') loop
    if entry.key !~ '^(19|20|21)[0-9]{2}-(0[1-9]|1[0-2])$'
      or entry.key < policy->>'startMonth'
      or jsonb_typeof(entry.value) <> 'number'
      or (entry.value::text)::numeric not between 0 and 1000000000
      or trunc((entry.value::text)::numeric) <> (entry.value::text)::numeric then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

alter table public.budget_plans add column if not exists rollover_policy jsonb;
alter table public.budget_plans add constraint budget_plans_valid_rollover_policy
  check (public.valid_budget_rollover_policy(rollover_policy));

create or replace function public.track_budget_rollover_amount()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare period text;
begin
  if new.rollover_policy is null then return new; end if;
  if not public.valid_budget_rollover_policy(new.rollover_policy) then
    raise exception 'Invalid rollover settings.';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.rollover_policy->>'timeZone') then
    raise exception 'Invalid rollover time zone.';
  end if;
  period := to_char(now() at time zone (new.rollover_policy->>'timeZone'), 'YYYY-MM');
  if new.rollover_policy->>'startMonth' > period then raise exception 'Rollover cannot start in a future month.'; end if;
  if tg_op = 'UPDATE' and new.base_budget_cents is distinct from old.base_budget_cents
    and new.rollover_policy is not distinct from old.rollover_policy then
    new.rollover_policy := jsonb_set(new.rollover_policy, array['monthlyAmounts', period], to_jsonb(new.base_budget_cents), true);
  end if;
  return new;
end;
$$;
revoke all on function public.track_budget_rollover_amount() from public, anon, authenticated;
create trigger track_budget_rollover_amount
before insert or update on public.budget_plans
for each row execute function public.track_budget_rollover_amount();

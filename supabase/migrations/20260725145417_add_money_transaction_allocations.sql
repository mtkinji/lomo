-- Recorded remotely as migration 20260725145417.
create table public.budget_transaction_allocations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.budget_transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id text not null check (length(trim(budget_id)) > 0),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (transaction_id, budget_id)
);

create index budget_transaction_allocations_user_id_idx
on public.budget_transaction_allocations (user_id);

create index budget_transaction_allocations_transaction_id_idx
on public.budget_transaction_allocations (transaction_id);

create trigger set_budget_transaction_allocations_updated_at
before update on public.budget_transaction_allocations
for each row execute function public.set_updated_at();

alter table public.budget_transaction_allocations enable row level security;

create policy "Users can read accessible budget transaction allocations"
on public.budget_transaction_allocations
for select
to authenticated
using (public.can_access_budget_user(user_id));

create policy "Users can insert their own budget transaction allocations"
on public.budget_transaction_allocations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own budget transaction allocations"
on public.budget_transaction_allocations
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.budget_transaction_allocations from anon, authenticated;
grant select, insert, delete on public.budget_transaction_allocations to authenticated;

create or replace function public.ensure_budget_transaction_allocations_valid()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transaction_id uuid := coalesce(new.transaction_id, old.transaction_id);
  v_transaction public.budget_transactions%rowtype;
  v_allocation_count integer;
  v_allocation_sum bigint;
  v_distinct_budget_count integer;
  v_valid_category_count integer;
begin
  select
    count(*)::integer,
    coalesce(sum(amount_cents), 0),
    count(distinct budget_id)::integer
  into v_allocation_count, v_allocation_sum, v_distinct_budget_count
  from public.budget_transaction_allocations
  where transaction_id = v_transaction_id;

  if v_allocation_count = 0 then
    return null;
  end if;

  select *
  into v_transaction
  from public.budget_transactions
  where id = v_transaction_id;

  if v_transaction.id is null then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;
  if v_transaction.user_id <> (select auth.uid()) then
    raise exception 'Transaction ownership does not match the authenticated user.' using errcode = '42501';
  end if;
  if v_transaction.direction <> 'outflow' or v_transaction.pending then
    raise exception 'Only posted spending transactions can be split.' using errcode = 'P0001';
  end if;
  if v_allocation_count < 2 or v_allocation_count > 8 then
    raise exception 'A split requires between 2 and 8 categories.' using errcode = 'P0001';
  end if;
  if v_distinct_budget_count <> v_allocation_count then
    raise exception 'Each split category must be unique.' using errcode = 'P0001';
  end if;
  if v_allocation_sum <> v_transaction.amount_cents then
    raise exception 'Split allocations must equal the transaction amount.' using errcode = 'P0001';
  end if;
  if v_transaction.budget_id is not null or v_transaction.budget_match_source <> 'corrected' then
    raise exception 'A split transaction cannot also have a single category.' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_valid_category_count
  from public.budget_transaction_allocations allocation
  join public.budget_categories category
    on category.user_id = v_transaction.user_id
   and category.status = 'active'
   and (
     category.id::text = allocation.budget_id
     or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = allocation.budget_id
   )
  where allocation.transaction_id = v_transaction_id;

  if v_valid_category_count <> v_allocation_count then
    raise exception 'Every split allocation must reference an active budget category.' using errcode = 'P0001';
  end if;

  return null;
end;
$$;

revoke execute on function public.ensure_budget_transaction_allocations_valid() from public, anon, authenticated;

create constraint trigger ensure_budget_transaction_allocations_valid
after insert or update or delete on public.budget_transaction_allocations
deferrable initially deferred
for each row execute function public.ensure_budget_transaction_allocations_valid();

create or replace function public.replace_budget_transaction_allocations(
  p_transaction_id uuid,
  p_allocations jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction public.budget_transactions%rowtype;
  v_allocation_count integer;
  v_allocation_sum bigint;
  v_distinct_budget_count integer;
  v_valid_category_count integer;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = '42501';
  end if;
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'Allocations must be a JSON array.' using errcode = 'P0001';
  end if;

  select *
  into v_transaction
  from public.budget_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if v_transaction.id is null then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;
  if v_transaction.direction <> 'outflow' or v_transaction.pending then
    raise exception 'Only posted spending transactions can be split.' using errcode = 'P0001';
  end if;

  select
    count(*)::integer,
    coalesce(sum(amount_cents), 0),
    count(distinct trim(budget_id))::integer
  into v_allocation_count, v_allocation_sum, v_distinct_budget_count
  from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer);

  if v_allocation_count < 2 or v_allocation_count > 8 then
    raise exception 'A split requires between 2 and 8 categories.' using errcode = 'P0001';
  end if;
  if v_distinct_budget_count <> v_allocation_count then
    raise exception 'Each split category must be unique.' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer)
    where nullif(trim(budget_id), '') is null or amount_cents is null or amount_cents <= 0
  ) then
    raise exception 'Every split allocation needs a category and positive amount.' using errcode = 'P0001';
  end if;
  if v_allocation_sum <> v_transaction.amount_cents then
    raise exception 'Split allocations must equal the transaction amount.' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_valid_category_count
  from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer)
  join public.budget_categories category
    on category.user_id = v_user_id
   and category.status = 'active'
   and (
     category.id::text = trim(allocation.budget_id)
     or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = trim(allocation.budget_id)
   );

  if v_valid_category_count <> v_allocation_count then
    raise exception 'Every split allocation must reference an active budget category.' using errcode = 'P0001';
  end if;

  delete from public.budget_transaction_allocations
  where transaction_id = p_transaction_id;

  insert into public.budget_transaction_allocations (transaction_id, user_id, budget_id, amount_cents)
  select p_transaction_id, v_user_id, trim(allocation.budget_id), allocation.amount_cents
  from jsonb_to_recordset(p_allocations) as allocation(budget_id text, amount_cents integer);

  update public.budget_transactions
  set budget_id = null,
      budget_match_source = 'corrected',
      budget_match_confidence = 1,
      budget_match_reason = 'Split across categories.',
      budget_match_reviewed_at = now(),
      money_meaning = null,
      money_meaning_source = null,
      money_meaning_category_budget_id = null,
      money_meaning_reason = null,
      money_meaning_reviewed_at = null
  where id = p_transaction_id
    and user_id = v_user_id;
end;
$$;

revoke execute on function public.replace_budget_transaction_allocations(uuid, jsonb) from public, anon;
grant execute on function public.replace_budget_transaction_allocations(uuid, jsonb) to authenticated;

create or replace function public.replace_budget_transaction_review(
  p_transaction_ids uuid[],
  p_budget_id text,
  p_excluded boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_requested_count integer;
  v_owned_count integer;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = '42501';
  end if;

  select count(distinct transaction_id)::integer
  into v_requested_count
  from unnest(coalesce(p_transaction_ids, '{}'::uuid[])) as transaction_id
  where transaction_id is not null;

  if v_requested_count = 0 then
    return;
  end if;
  if not p_excluded and nullif(trim(p_budget_id), '') is null then
    raise exception 'A category is required.' using errcode = 'P0001';
  end if;
  if not p_excluded and not exists (
    select 1
    from public.budget_categories category
    where category.user_id = v_user_id
      and category.status = 'active'
      and (
        category.id::text = trim(p_budget_id)
        or coalesce(nullif(trim(category.legacy_budget_id), ''), category.slug) = trim(p_budget_id)
      )
  ) then
    raise exception 'The category is not available.' using errcode = 'P0001';
  end if;

  perform 1
  from public.budget_transactions
  where id = any(p_transaction_ids)
    and user_id = v_user_id
  for update;

  select count(*)::integer
  into v_owned_count
  from public.budget_transactions
  where id = any(p_transaction_ids)
    and user_id = v_user_id;

  if v_owned_count <> v_requested_count then
    raise exception 'One or more transactions are unavailable.' using errcode = '42501';
  end if;

  delete from public.budget_transaction_allocations
  where transaction_id = any(p_transaction_ids)
    and user_id = v_user_id;

  update public.budget_transactions
  set budget_id = case when p_excluded then null else trim(p_budget_id) end,
      budget_match_source = case when p_excluded then 'excluded' else 'corrected' end,
      budget_match_confidence = 1,
      budget_match_reason = case when p_excluded then 'Marked as not part of any budget.' else 'Assigned to category.' end,
      budget_match_reviewed_at = now(),
      money_meaning = case when p_excluded then 'not_counted' else null end,
      money_meaning_source = case when p_excluded then 'confirmed' else null end,
      money_meaning_category_budget_id = null,
      money_meaning_reason = case when p_excluded then 'Marked as outside the budget.' else null end,
      money_meaning_reviewed_at = case when p_excluded then now() else null end
  where id = any(p_transaction_ids)
    and user_id = v_user_id;
end;
$$;

revoke execute on function public.replace_budget_transaction_review(uuid[], text, boolean) from public, anon;
grant execute on function public.replace_budget_transaction_review(uuid[], text, boolean) to authenticated;

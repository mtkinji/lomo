create table public.explore_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('session', 'place', 'relationship', 'reset')),
  record_id text not null check (length(trim(record_id)) between 1 and 512),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, record_type, record_id)
);

create index explore_records_owner_updated_idx
on public.explore_records (user_id, updated_at, record_type);

create or replace function public.explore_records_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return old;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.explore_records_touch_updated_at() from public;

create trigger explore_records_touch_updated_at
before update on public.explore_records
for each row execute function public.explore_records_touch_updated_at();

alter table public.explore_records enable row level security;

create policy "Explore owners can read their records"
on public.explore_records for select
to authenticated using ((select auth.uid()) = user_id);

create policy "Explore owners can insert their records"
on public.explore_records for insert
to authenticated with check ((select auth.uid()) = user_id);

create policy "Explore owners can update their records"
on public.explore_records for update
to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Explore owners can delete their records"
on public.explore_records for delete
to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.explore_records from anon, authenticated;
grant select, insert, update, delete on table public.explore_records to authenticated;

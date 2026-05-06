-- Kwilt: local-first show-up streak cloud sync.
--
-- The mobile app remains local-first for streak UX, but signed-in users mirror
-- their current streak state and append idempotent client events to Supabase so
-- desktop can share the same continuity later.

create table if not exists public.kwilt_streak_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_show_up_date date null,
  current_show_up_streak integer not null default 0 check (current_show_up_streak >= 0),
  last_streak_date date null,
  current_covered_show_up_streak integer not null default 0 check (current_covered_show_up_streak >= 0),
  free_days_remaining integer not null default 1 check (free_days_remaining >= 0),
  last_free_reset_week text null,
  shields_available integer not null default 0 check (shields_available >= 0),
  last_shield_earned_week_key text null,
  grace_days_used integer not null default 0 check (grace_days_used >= 0),
  broken_at_date date null,
  broken_streak_length integer null check (broken_streak_length is null or broken_streak_length >= 0),
  eligible_repair_until_ms bigint null,
  repaired_at_ms bigint null,
  timezone text null,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_streak_summaries_updated_at_idx
  on public.kwilt_streak_summaries(updated_at desc);

create index if not exists kwilt_streak_summaries_last_show_up_date_idx
  on public.kwilt_streak_summaries(user_id, last_show_up_date desc);

alter table public.kwilt_streak_summaries enable row level security;

drop policy if exists "kwilt_streak_summaries_owner_select"
  on public.kwilt_streak_summaries;
create policy "kwilt_streak_summaries_owner_select"
  on public.kwilt_streak_summaries
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "kwilt_streak_summaries_owner_insert"
  on public.kwilt_streak_summaries;
create policy "kwilt_streak_summaries_owner_insert"
  on public.kwilt_streak_summaries
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "kwilt_streak_summaries_owner_update"
  on public.kwilt_streak_summaries;
create policy "kwilt_streak_summaries_owner_update"
  on public.kwilt_streak_summaries
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_streak_summaries_owner_delete"
  on public.kwilt_streak_summaries;
create policy "kwilt_streak_summaries_owner_delete"
  on public.kwilt_streak_summaries
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.kwilt_streak_summaries_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kwilt_streak_summaries_touch_updated_at
  on public.kwilt_streak_summaries;
create trigger kwilt_streak_summaries_touch_updated_at
  before update on public.kwilt_streak_summaries
  for each row execute function public.kwilt_streak_summaries_touch_updated_at();

create table if not exists public.kwilt_streak_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  event_type text not null check (
    event_type in (
      'show_up',
      'freeze_used',
      'shield_used',
      'shield_awarded',
      'streak_broken',
      'streak_repaired',
      'reset'
    )
  ),
  local_date date null,
  streak_value integer null check (streak_value is null or streak_value >= 0),
  covered_streak_value integer null check (covered_streak_value is null or covered_streak_value >= 0),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create index if not exists kwilt_streak_events_user_date_idx
  on public.kwilt_streak_events(user_id, local_date desc);

create index if not exists kwilt_streak_events_user_occurred_at_idx
  on public.kwilt_streak_events(user_id, occurred_at desc);

alter table public.kwilt_streak_events enable row level security;

drop policy if exists "kwilt_streak_events_owner_select"
  on public.kwilt_streak_events;
create policy "kwilt_streak_events_owner_select"
  on public.kwilt_streak_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "kwilt_streak_events_owner_insert"
  on public.kwilt_streak_events;
create policy "kwilt_streak_events_owner_insert"
  on public.kwilt_streak_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "kwilt_streak_events_owner_update"
  on public.kwilt_streak_events;
create policy "kwilt_streak_events_owner_update"
  on public.kwilt_streak_events
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_streak_events_owner_delete"
  on public.kwilt_streak_events;
create policy "kwilt_streak_events_owner_delete"
  on public.kwilt_streak_events
  for delete
  to authenticated
  using (user_id = auth.uid());

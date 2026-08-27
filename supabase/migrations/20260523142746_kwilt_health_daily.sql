-- Phase 4-backend of docs/chapters-plan.md — HealthKit daily summaries.
--
-- The Chapters generator reads a passive, pre-summarized health signal
-- on top of the user's own activities. The client writes ONE row per
-- (user_id, local_date) every morning, summarizing yesterday's HealthKit
-- reading on device — the edge function never sees raw sample-level data.
--
-- Date model:
--   * `local_date` is the user's local calendar date at the time the
--     samples were aggregated. We also stamp `timezone` so the edge
--     function can reason about "the week of Apr 13" as the user's
--     iPhone bucketed it, not as UTC would split it.
--
-- Column model:
--   * Every metric column is nullable. A row with only `sleep_hours`
--     populated is valid (user ran the sleep permission but denied the
--     movement read, say). The threshold gate in
--     `computeDeterministicMetrics` treats missing fields as 0 for
--     predicate purposes; it never inserts "unknown" as a signal.
--   * `active_minutes` is HealthKit's `appleExerciseTime` equivalent.
--     `workouts_count` is the count of `HKWorkoutType` samples whose
--     start time falls on `local_date` — not the union of merged
--     sessions. If the user's ring broke at 11:45pm and resumed at
--     12:03am, that's two workouts. Good enough for weekly evidence;
--     a more careful merge isn't worth the complexity here.
--   * `sleep_hours` is the sum of asleep + in-bed - overlap, clipped
--     to the single night ending on `local_date`. Again, a "close
--     enough for a weekly letter" approximation; the prompt is
--     instructed to round to the nearest half hour when it writes.
--
-- RLS: owner-read + owner-upsert. The client writes directly; no RPC
-- wrapper. Follows the same shape as
-- `kwilt_chapter_recommendation_events` (Phase 8) — the data is the
-- user's own pre-processed signal, there is no cross-user derivation,
-- and no LLM output flows through this table.

create table if not exists public.kwilt_health_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  timezone text not null,
  steps_count integer null,
  active_minutes integer null,
  workouts_count integer null,
  sleep_hours numeric(4, 2) null,
  mindfulness_minutes integer null,
  source text not null default 'healthkit',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create index if not exists kwilt_health_daily_user_id_idx
  on public.kwilt_health_daily(user_id);

-- The generator always queries by (user_id, local_date) range for the
-- Chapter period window. This composite index keeps that read fast even
-- once users accumulate a year+ of daily rows.
create index if not exists kwilt_health_daily_user_date_idx
  on public.kwilt_health_daily(user_id, local_date);

alter table public.kwilt_health_daily enable row level security;

drop policy if exists "kwilt_health_daily_owner_select"
  on public.kwilt_health_daily;
create policy "kwilt_health_daily_owner_select"
  on public.kwilt_health_daily
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "kwilt_health_daily_owner_insert"
  on public.kwilt_health_daily;
create policy "kwilt_health_daily_owner_insert"
  on public.kwilt_health_daily
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "kwilt_health_daily_owner_update"
  on public.kwilt_health_daily;
create policy "kwilt_health_daily_owner_update"
  on public.kwilt_health_daily
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_health_daily_owner_delete"
  on public.kwilt_health_daily;
create policy "kwilt_health_daily_owner_delete"
  on public.kwilt_health_daily
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Keep `updated_at` fresh on UPDATE so the client can use it as a
-- "last written" cursor if it wants to skip same-day re-writes.
create or replace function public.kwilt_health_daily_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kwilt_health_daily_touch_updated_at
  on public.kwilt_health_daily;
create trigger kwilt_health_daily_touch_updated_at
  before update on public.kwilt_health_daily
  for each row execute function public.kwilt_health_daily_touch_updated_at();

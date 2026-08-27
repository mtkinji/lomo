-- Phase 8 of docs/chapters-plan.md — Cross-Chapter continuity outcomes.
--
-- A Chapter's `output_json.recommendations[]` (Phase 5 + 6) emits up to 3
-- deterministic "Next Steps" cards per week. Phase 8 closes the loop: the
-- next Chapter's prompt needs to know whether the user acted on each card
-- so the narrative can cite the outcome, and the recommendation trigger
-- can suppress re-nomination of objects that already got created.
--
-- Event model:
--   * One row per (chapter_id, recommendation_id) — the server upserts so
--     the latest action wins (user can dismiss, then act; act wins).
--   * `action`:
--       - `acted_on`    user completed the CTA's resulting flow
--                       (Arc created, Goal created, Align applied).
--                       `resulting_object_id` points at the new row when
--                       the CTA produced one (arc id / goal id).
--       - `dismissed`   user tapped "Not now" on the card. Sleeps the
--                       recommendation id for 90 days (mirrors the
--                       client-side `chapterRecommendationDismissals`
--                       cache; the server copy is the source of truth
--                       for cross-device + next-Chapter governance).
--       - `ignored`     reserved for a future sweep that auto-records
--                       `ignored` when a card neither acted-on nor
--                       dismissed for the life of the Chapter. Not
--                       written by the client today; declared now so
--                       downstream consumers can read the column
--                       shape without a schema bump later.
--
-- RLS: owner-read + owner-insert/update. Direct writes are allowed here
-- (unlike `kwilt_chapters`) because the events are explicit user
-- signals authored from the client; no LLM content flows through this
-- table and there's no cross-user join risk given the per-user row
-- scoping.

create table if not exists public.kwilt_chapter_recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.kwilt_chapters(id) on delete cascade,
  recommendation_id text not null,
  kind text not null check (kind in ('arc', 'goal', 'align', 'activity')),
  action text not null check (action in ('acted_on', 'dismissed', 'ignored')),
  resulting_object_id text null,
  acted_on_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chapter_id, recommendation_id)
);

create index if not exists kwilt_chapter_recommendation_events_user_id_idx
  on public.kwilt_chapter_recommendation_events(user_id);

create index if not exists kwilt_chapter_recommendation_events_chapter_id_idx
  on public.kwilt_chapter_recommendation_events(chapter_id);

-- For the governance query "has this user dismissed recommendation X in
-- the last 90 days?" — scoped by recommendation_id (the `rec-arc-<token>`
-- style stable id) across any chapter.
create index if not exists kwilt_chapter_recommendation_events_rec_id_idx
  on public.kwilt_chapter_recommendation_events(user_id, recommendation_id, action);

alter table public.kwilt_chapter_recommendation_events enable row level security;

drop policy if exists "kwilt_chapter_rec_events_owner_select"
  on public.kwilt_chapter_recommendation_events;
create policy "kwilt_chapter_rec_events_owner_select"
  on public.kwilt_chapter_recommendation_events
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "kwilt_chapter_rec_events_owner_insert"
  on public.kwilt_chapter_recommendation_events;
create policy "kwilt_chapter_rec_events_owner_insert"
  on public.kwilt_chapter_recommendation_events
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
        from public.kwilt_chapters c
       where c.id = chapter_id
         and c.user_id = auth.uid()
    )
  );

drop policy if exists "kwilt_chapter_rec_events_owner_update"
  on public.kwilt_chapter_recommendation_events;
create policy "kwilt_chapter_rec_events_owner_update"
  on public.kwilt_chapter_recommendation_events
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_chapter_rec_events_owner_delete"
  on public.kwilt_chapter_recommendation_events;
create policy "kwilt_chapter_rec_events_owner_delete"
  on public.kwilt_chapter_recommendation_events
  for delete
  to authenticated
  using (user_id = auth.uid());

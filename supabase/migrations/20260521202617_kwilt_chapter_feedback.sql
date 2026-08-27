-- Chapter feedback (thumbs up/down) for continuous chapter-quality improvement.
--
-- Why this exists:
-- - Phase 1+ of docs/chapters-plan.md: we can't improve the
--   generator without signal. A per-chapter thumb + optional note gives us
--   the ground truth the prompt + validator work needs.
--
-- Shape:
-- - One feedback row per (user, chapter). Later ratings overwrite earlier
--   ones via (user_id, chapter_id) upsert so the row always reflects the
--   user's latest opinion.
-- - `rating` is 'up' | 'down' to keep reporting dead-simple.
-- - `reason_tags` is a small chosen-from-menu list for quick triage
--   ("too generic", "wrong tone", "great"). `note` is freeform.
--
-- RLS:
-- - Owner only, full read/write. No service-side writes required.

create table if not exists public.kwilt_chapter_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.kwilt_chapters(id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  reason_tags text[] not null default '{}'::text[],
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

create index if not exists kwilt_chapter_feedback_user_id_idx
  on public.kwilt_chapter_feedback(user_id);

create index if not exists kwilt_chapter_feedback_chapter_id_idx
  on public.kwilt_chapter_feedback(chapter_id);

alter table public.kwilt_chapter_feedback enable row level security;

drop policy if exists "kwilt_chapter_feedback_owner_only" on public.kwilt_chapter_feedback;
create policy "kwilt_chapter_feedback_owner_only"
  on public.kwilt_chapter_feedback
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

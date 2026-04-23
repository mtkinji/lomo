-- Chapters — first-class "add a line" user note.
--
-- Phase 7.1 of docs/chapters-plan.md. Today `kwilt_chapter_feedback.note`
-- is a diagnostic field ("what was off?"). The plan splits that use case
-- from a new user-authored creative note that lives inline in the
-- Chapter itself and is later read by the next Chapter's generator to
-- subtly reference continuity ("after last week's open question about
-- sleep…"). Keeping them on different surfaces preserves the feedback
-- signal untouched and gives the generator a clean field to cite.
--
-- Shape decisions:
--   * `user_note` lives on `kwilt_chapters` (not a side-table) so the
--     row reads as a single artifact and the generator's existing
--     `fetchMyChapterById` / prior-chapter loaders naturally carry it.
--   * `user_note_updated_at` is tracked separately from the row's
--     `updated_at` so the detail-screen attribution ("— you, Apr 9")
--     can show a stable timestamp even if the server later rewrites
--     other columns for ops reasons.
--
-- RLS: the table itself keeps the v0 policy of "owner read, no direct
-- writes" so Edge Functions stay the source of truth for the AI-
-- produced columns. We expose a single SECURITY DEFINER RPC for the
-- user-note update so the client can save a note without broadening the
-- table's update policy. The RPC enforces `auth.uid() = user_id` and
-- only touches `user_note` + `user_note_updated_at` (plus bookkeeping
-- `updated_at`). Empty / whitespace-only notes are collapsed to NULL so
-- "clear the note" works with the same surface.

alter table public.kwilt_chapters
  add column if not exists user_note text null;

alter table public.kwilt_chapters
  add column if not exists user_note_updated_at timestamptz null;

create or replace function public.update_kwilt_chapter_user_note(
  p_chapter_id uuid,
  p_note text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_normalized text;
begin
  v_normalized := nullif(btrim(coalesce(p_note, '')), '');

  update public.kwilt_chapters
     set user_note = v_normalized,
         user_note_updated_at = case
           when v_normalized is null then null
           else now()
         end,
         updated_at = now()
   where id = p_chapter_id
     and user_id = auth.uid();
end;
$$;

revoke all on function public.update_kwilt_chapter_user_note(uuid, text) from public;
grant execute on function public.update_kwilt_chapter_user_note(uuid, text) to authenticated;

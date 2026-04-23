-- Phase 2.1 of docs/chapters-plan.md — weekly-only cutover.
--
-- Chapters collapse from a multi-cadence, user-triggered tool into a single
-- weekly rhythm generated server-side. Monthly / yearly / manual cadences are
-- cut (not deferred). Any monthly / yearly / manual reflection templates that
-- existed as app-created defaults are therefore removed so the cron no longer
-- processes them and so `fetchMyChapterTemplates` never returns a row the
-- client can't render.
--
-- Scope:
-- - Only touches `kind = 'reflection'` templates. Non-reflection ("report")
--   templates are untouched; those are a separate product surface.
-- - Only touches `cadence IN ('monthly', 'yearly', 'manual')`. Weekly
--   templates stay as the single source of truth.
-- - Cascades to `kwilt_chapters` via the existing FK (ON DELETE CASCADE),
--   which is the right behavior — chapters authored against a since-deleted
--   cadence can no longer be re-rendered or refreshed, and their narrative is
--   locked to a shape the client no longer supports.
--
-- Safety:
-- - The plan explicitly notes "no active users" for these cadences at the
--   time of writing. Monthly / yearly wrap-ups, if revived later, will be
--   deterministic rollups over the weekly Chapter corpus (not their own LLM
--   generations) and will come back as a new table shape, not a resurrection
--   of these rows.
-- - Idempotent: running twice is a no-op.

delete from public.kwilt_chapter_templates
 where kind = 'reflection'
   and cadence in ('monthly', 'yearly', 'manual');

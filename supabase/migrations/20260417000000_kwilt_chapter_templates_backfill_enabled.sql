-- Phase 2.5 of docs/chapters-plan.md.
--
-- Ensure every existing reflection template has `enabled = true` so the daily
-- cron actually generates weekly/monthly chapters for users who signed up
-- before the default-template helper stabilized. Brand-new inserts already
-- get `enabled = true` from the column default in
-- supabase/migrations/20260124000000_kwilt_chapters_v0.sql, so this
-- one-shot statement only touches rows that were explicitly turned off
-- (or inserted before that default landed).
--
-- Intentionally leaves `email_enabled` untouched — the digest email stays
-- opt-in (user flips it from the new in-app Digest Settings screen).
--
-- Idempotent: running twice is a no-op.

update public.kwilt_chapter_templates
   set enabled = true,
       updated_at = now()
 where kind = 'reflection'
   and enabled is distinct from true;

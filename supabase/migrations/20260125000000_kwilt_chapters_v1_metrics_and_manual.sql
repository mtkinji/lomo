-- Kwilt: Chapters v1 (metrics column + manual cadence)
--
-- Changes:
-- - Add template cadence: 'manual'
-- - Add chapters.metrics jsonb (deterministic metrics stored separately from AI output)
-- - Allow chapters.output_json to be nullable so pending/failed rows don't need placeholder JSON

-- ---------------------------------
-- Templates
-- ---------------------------------

alter table public.kwilt_chapter_templates
  drop constraint if exists kwilt_chapter_templates_cadence_check;

alter table public.kwilt_chapter_templates
  add constraint kwilt_chapter_templates_cadence_check
  check (cadence in ('weekly', 'monthly', 'yearly', 'manual'));

-- ---------------------------------
-- Chapters
-- ---------------------------------

alter table public.kwilt_chapters
  add column if not exists metrics jsonb not null default '{}'::jsonb;

alter table public.kwilt_chapters
  alter column output_json drop not null;

alter table public.kwilt_chapters
  alter column output_json drop default;



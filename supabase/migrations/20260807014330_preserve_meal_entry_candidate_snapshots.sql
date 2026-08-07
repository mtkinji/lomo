-- Finalized entries are immutable snapshots. Their candidate_id records the
-- selection identity at that version, but must not keep an editable draft
-- candidate alive or block replacement when the organizer revises the plan.

alter table public.kwilt_meal_plan_entries
  drop constraint kwilt_meal_plan_entries_candidate_id_fkey;

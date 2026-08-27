alter table public.budget_planning_income_sources
  add column if not exists active boolean not null default true,
  add column if not exists evidence_hash text;

create index if not exists budget_planning_income_sources_active_idx
on public.budget_planning_income_sources (user_id, active);
;

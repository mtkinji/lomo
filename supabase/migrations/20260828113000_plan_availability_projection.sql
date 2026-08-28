-- Bounded Plan availability projection for authenticated conversational reads.
-- Native UserProfile remains authoritative; writes are staged for exact native review.

alter table public.kwilt_agent_profile_projections
  add column timezone text null check (timezone is null or char_length(timezone) between 1 and 100),
  add column plan_availability_version integer null check (plan_availability_version is null or plan_availability_version >= 0),
  add column plan_availability jsonb null check (plan_availability is null or jsonb_typeof(plan_availability) = 'array');

comment on column public.kwilt_agent_profile_projections.plan_availability is
  'Bounded weekly local-time windows only; excludes calendar events and calendar identifiers.';

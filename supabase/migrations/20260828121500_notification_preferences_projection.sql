-- Bounded notification preference projection for authenticated conversational reads.
-- Native scheduling and Apple permission remain device-owned.

alter table public.kwilt_agent_profile_projections
  add column notification_preferences jsonb null
  check (notification_preferences is null or jsonb_typeof(notification_preferences) = 'object');

comment on column public.kwilt_agent_profile_projections.notification_preferences is
  'App-level notification choices only; excludes Apple permission state, scheduled notification identifiers, and content.';

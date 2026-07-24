-- Bounded, output-only projection of the native coaching Profile for server channels.
-- The native UserProfile remains authoritative; this table intentionally excludes
-- email, birthdate, identity summaries, coaching context, and all raw profile data.

create table public.kwilt_agent_profile_projections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id text null check (profile_id is null or char_length(profile_id) between 1 and 200),
  full_name text null check (full_name is null or char_length(full_name) between 1 and 160),
  age_range text null check (
    age_range is null or age_range in (
      'under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-plus', 'prefer-not-to-say'
    )
  ),
  profile_updated_at timestamptz null,
  updated_at timestamptz not null default now(),
  check (
    (profile_id is null and profile_updated_at is null)
    or (profile_id is not null and profile_updated_at is not null)
  )
);

grant select, insert, update, delete
  on table public.kwilt_agent_profile_projections
  to authenticated;
revoke all on table public.kwilt_agent_profile_projections from anon;

alter table public.kwilt_agent_profile_projections enable row level security;

create policy "kwilt_agent_profile_projections_owner_select"
  on public.kwilt_agent_profile_projections for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_profile_projections_owner_insert"
  on public.kwilt_agent_profile_projections for insert to authenticated
  with check (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_profile_projections_owner_update"
  on public.kwilt_agent_profile_projections for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_profile_projections_owner_delete"
  on public.kwilt_agent_profile_projections for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

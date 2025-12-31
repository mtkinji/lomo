-- Shared goals v1: use text IDs (local-first ids are not UUIDs)
--
-- The client currently generates Goal IDs like `goal-${Date.now()}-${rand}`.
-- Those are not UUIDs, so the shared-goals collaboration spine must store
-- entity IDs as text.

-- Drop policies that depend on the columns we are changing types for.
drop policy if exists "memberships_read_for_members" on public.kwilt_memberships;
drop policy if exists "feed_events_read_for_members" on public.kwilt_feed_events;
drop policy if exists "feed_events_write_for_members" on public.kwilt_feed_events;
drop policy if exists "goal_checkins_read_for_members" on public.goal_checkins;
drop policy if exists "goal_checkins_write_for_members" on public.goal_checkins;

-- Alter entity_id columns to text.
alter table public.kwilt_memberships
  alter column entity_id type text using entity_id::text;

alter table public.kwilt_invites
  alter column entity_id type text using entity_id::text;

alter table public.kwilt_feed_events
  alter column entity_id type text using entity_id::text;

alter table public.goal_checkins
  alter column goal_id type text using goal_id::text;

-- Recreate helper function with text entity id.
drop function if exists public.kwilt_is_member(text, uuid, uuid);

create or replace function public.kwilt_is_member(p_entity_type text, p_entity_id text, p_uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.kwilt_memberships m
    where m.entity_type = p_entity_type
      and m.entity_id = p_entity_id
      and m.user_id = p_uid
      and m.status = 'active'
  );
$$;

-- Policies reference kwilt_is_member; update by recreating them to match signature.
drop policy if exists "memberships_read_for_members" on public.kwilt_memberships;
create policy "memberships_read_for_members"
  on public.kwilt_memberships
  for select
  to authenticated
  using (public.kwilt_is_member(entity_type, entity_id, auth.uid()));

drop policy if exists "feed_events_read_for_members" on public.kwilt_feed_events;
create policy "feed_events_read_for_members"
  on public.kwilt_feed_events
  for select
  to authenticated
  using (public.kwilt_is_member(entity_type, entity_id, auth.uid()));

drop policy if exists "feed_events_write_for_members" on public.kwilt_feed_events;
create policy "feed_events_write_for_members"
  on public.kwilt_feed_events
  for insert
  to authenticated
  with check (public.kwilt_is_member(entity_type, entity_id, auth.uid()) and actor_id = auth.uid());

drop policy if exists "goal_checkins_read_for_members" on public.goal_checkins;
create policy "goal_checkins_read_for_members"
  on public.goal_checkins
  for select
  to authenticated
  using (public.kwilt_is_member('goal', goal_id, auth.uid()));

drop policy if exists "goal_checkins_write_for_members" on public.goal_checkins;
create policy "goal_checkins_write_for_members"
  on public.goal_checkins
  for insert
  to authenticated
  with check (public.kwilt_is_member('goal', goal_id, auth.uid()) and user_id = auth.uid());



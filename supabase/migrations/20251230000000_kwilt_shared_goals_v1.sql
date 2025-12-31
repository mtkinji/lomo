-- Shared goals v1 foundation (auth-backed invites + memberships + signals-only feed)
--
-- Note: This schema intentionally does NOT attempt to sync the full local-first
-- Goals model yet. Instead it provides:
-- - a collaboration spine keyed by (entity_type, entity_id) where entity_id is the local UUID
-- - invite codes that can carry a small payload (e.g. goal title) for Join preview
-- - a minimal signals-only feed via check-ins and feed events

-- Enable extensions we rely on.
create extension if not exists "pgcrypto";

-- -----------------------------
-- Collaboration spine
-- -----------------------------

create table if not exists public.kwilt_memberships (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('goal')),
  entity_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'co_owner', 'collaborator')),
  status text not null default 'active' check (status in ('active', 'pending', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  left_at timestamptz
);

create unique index if not exists kwilt_memberships_unique_member
  on public.kwilt_memberships(entity_type, entity_id, user_id);

create index if not exists kwilt_memberships_entity
  on public.kwilt_memberships(entity_type, entity_id);

create table if not exists public.kwilt_invites (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('goal')),
  entity_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz,
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  -- Small preview payload so invite recipients can see something meaningful
  -- before we have full server-side goal sync.
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_invites_entity
  on public.kwilt_invites(entity_type, entity_id);

create table if not exists public.kwilt_feed_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('goal')),
  entity_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_feed_events_entity
  on public.kwilt_feed_events(entity_type, entity_id, created_at desc);

-- -----------------------------
-- Signals-only: check-ins
-- -----------------------------

create table if not exists public.goal_checkins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  preset text,
  text text,
  created_at timestamptz not null default now()
);

create index if not exists goal_checkins_goal
  on public.goal_checkins(goal_id, created_at desc);

-- -----------------------------
-- RLS helpers
-- -----------------------------

create or replace function public.kwilt_is_member(p_entity_type text, p_entity_id uuid, p_uid uuid)
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

-- -----------------------------
-- RLS policies
-- -----------------------------

alter table public.kwilt_memberships enable row level security;
alter table public.kwilt_invites enable row level security;
alter table public.kwilt_feed_events enable row level security;
alter table public.goal_checkins enable row level security;

-- Memberships: members can read memberships for entities they're part of.
drop policy if exists "memberships_read_for_members" on public.kwilt_memberships;
create policy "memberships_read_for_members"
  on public.kwilt_memberships
  for select
  to authenticated
  using (public.kwilt_is_member(entity_type, entity_id, auth.uid()));

-- Memberships: allow members to insert themselves only via server (edge function uses service role).
-- Keep inserts/updates locked down at RLS level for now.
drop policy if exists "memberships_no_direct_writes" on public.kwilt_memberships;
create policy "memberships_no_direct_writes"
  on public.kwilt_memberships
  for all
  to authenticated
  using (false)
  with check (false);

-- Invites: do not expose invites directly to clients; Edge Functions use service role.
drop policy if exists "invites_no_direct_access" on public.kwilt_invites;
create policy "invites_no_direct_access"
  on public.kwilt_invites
  for all
  to authenticated
  using (false)
  with check (false);

-- Feed events: members can read/write events scoped to their entity.
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

-- Check-ins: members can read/write their entity.
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



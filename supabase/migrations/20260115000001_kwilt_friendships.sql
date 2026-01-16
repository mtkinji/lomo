-- ============================================================================
-- FRIENDSHIPS TABLE
-- ============================================================================
-- Bi-directional friend relationships separate from shared-goal memberships.
-- Enables friend-based milestone celebrations (Phase 4+).
--
-- Design decisions:
-- - Bi-directional (mutual): Both users must accept to establish friendship
-- - Invite-only: No public search/discovery (preserves privacy)
-- - Order-independent storage: user_a < user_b to prevent duplicate rows
--
-- @see docs/prds/social-dynamics-evolution-prd.md (Phase 3)
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: kwilt_friendships
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.kwilt_friendships (
  id uuid primary key default gen_random_uuid(),
  
  -- User pair (normalized: user_a < user_b)
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  
  -- Relationship state
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  
  -- Who sent the friend request (for UI and notifications)
  initiated_by uuid not null references auth.users(id),
  
  -- Timestamps
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  
  -- Ensure no duplicate friendships (order-independent via constraint)
  constraint kwilt_friendships_ordered check (user_a < user_b),
  constraint kwilt_friendships_unique unique (user_a, user_b)
);

-- Fast lookups for "my friends" queries
create index if not exists kwilt_friendships_user_a_idx
  on public.kwilt_friendships(user_a, status);

create index if not exists kwilt_friendships_user_b_idx
  on public.kwilt_friendships(user_b, status);

-- Find pending requests initiated by a specific user
create index if not exists kwilt_friendships_initiated_by_idx
  on public.kwilt_friendships(initiated_by);

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper function: Normalize user pair ordering
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.kwilt_normalize_friendship_pair(a uuid, b uuid)
returns table(user_a uuid, user_b uuid)
language sql
immutable
as $$
  select least(a, b), greatest(a, b);
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper function: Check if two users are friends
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.kwilt_are_friends(uid_1 uuid, uid_2 uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.kwilt_friendships f
    where f.user_a = least(uid_1, uid_2)
      and f.user_b = greatest(uid_1, uid_2)
      and f.status = 'active'
  );
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper function: Get all friend user IDs for a user
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.kwilt_get_friend_ids(uid uuid)
returns setof uuid
language sql
stable
as $$
  select case when f.user_a = uid then f.user_b else f.user_a end
  from public.kwilt_friendships f
  where (f.user_a = uid or f.user_b = uid)
    and f.status = 'active';
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Extend kwilt_invites to support friendship invites
-- ──────────────────────────────────────────────────────────────────────────────
-- Add 'friendship' to allowed entity_type values
alter table public.kwilt_invites
  drop constraint if exists kwilt_invites_entity_type_check;

alter table public.kwilt_invites
  add constraint kwilt_invites_entity_type_check 
  check (entity_type in ('goal', 'friendship'));

-- For friendship invites, entity_id is the initiator's user_id
-- This allows the accept flow to know who sent the invite

-- ──────────────────────────────────────────────────────────────────────────────
-- Extend kwilt_feed_events to support user-level events (milestones visible to friends)
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.kwilt_feed_events
  drop constraint if exists kwilt_feed_events_entity_type_check;

alter table public.kwilt_feed_events
  add constraint kwilt_feed_events_entity_type_check 
  check (entity_type in ('goal', 'user'));

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS Policies
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.kwilt_friendships enable row level security;

-- Users can read friendships they're part of
create policy "Users can read own friendships"
  on public.kwilt_friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Users can insert friendships where they are user_a or user_b
-- (the ordering constraint ensures user_a < user_b)
create policy "Users can create friendships"
  on public.kwilt_friendships for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- Users can update friendships they're part of (for accepting/blocking)
create policy "Users can update own friendships"
  on public.kwilt_friendships for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- No delete policy - friendships are soft-deleted via status = 'blocked'

-- ──────────────────────────────────────────────────────────────────────────────
-- Add RLS for user-level feed events
-- ──────────────────────────────────────────────────────────────────────────────
-- Note: The existing kwilt_feed_events SELECT policy handles goal-level events.
-- We add a separate policy for user-level events (milestones visible to friends).
-- This is additive - the existing policy remains for backward compatibility.

-- Policy for user-level events (milestones)
create policy "Users can read own user feed events"
  on public.kwilt_feed_events for select
  using (
    entity_type = 'user' and entity_id::uuid = auth.uid()
  );

-- Policy for friends' user-level events
create policy "Friends can read user feed events"
  on public.kwilt_feed_events for select
  using (
    entity_type = 'user' and public.kwilt_are_friends(entity_id::uuid, auth.uid())
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- Comments
-- ──────────────────────────────────────────────────────────────────────────────
comment on table public.kwilt_friendships is 
  'Bi-directional friend relationships between users (order-independent: user_a < user_b)';

comment on column public.kwilt_friendships.status is 
  'pending = awaiting acceptance, active = mutual friendship, blocked = one user blocked the other';

comment on column public.kwilt_friendships.initiated_by is 
  'The user who sent the friend request (for notifications and UI)';

comment on function public.kwilt_normalize_friendship_pair is 
  'Returns user IDs in canonical order (smaller UUID first) for consistent storage';

comment on function public.kwilt_are_friends is 
  'Check if two users have an active friendship';

comment on function public.kwilt_get_friend_ids is 
  'Get all friend user IDs for a given user';


-- ============================================================================
-- FOLLOWS (DUOLINGO-STYLE) + BLOCKS
-- ============================================================================
-- Lightweight, asymmetric follower graph:
-- - follower_id -> followed_id
-- - No acceptance required (follow-back is optional)
--
-- This migration keeps the existing kwilt_friendships table for backward compatibility,
-- but shifts new social visibility rules to follows.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: kwilt_follows
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.kwilt_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active')),
  created_at timestamptz not null default now(),
  constraint kwilt_follows_no_self check (follower_id <> followed_id),
  constraint kwilt_follows_unique unique (follower_id, followed_id)
);

create index if not exists kwilt_follows_follower_idx
  on public.kwilt_follows(follower_id, status);

create index if not exists kwilt_follows_followed_idx
  on public.kwilt_follows(followed_id, status);

alter table public.kwilt_follows enable row level security;

create policy "Users can read own follows"
  on public.kwilt_follows for select
  using (auth.uid() = follower_id or auth.uid() = followed_id);

create policy "Users can follow (insert for self)"
  on public.kwilt_follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow (delete for self)"
  on public.kwilt_follows for delete
  using (auth.uid() = follower_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: kwilt_blocks
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.kwilt_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint kwilt_blocks_no_self check (blocker_id <> blocked_id),
  constraint kwilt_blocks_unique unique (blocker_id, blocked_id)
);

create index if not exists kwilt_blocks_blocker_idx
  on public.kwilt_blocks(blocker_id);

create index if not exists kwilt_blocks_blocked_idx
  on public.kwilt_blocks(blocked_id);

alter table public.kwilt_blocks enable row level security;

create policy "Users can read own blocks"
  on public.kwilt_blocks for select
  using (auth.uid() = blocker_id);

create policy "Users can create blocks"
  on public.kwilt_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can remove blocks"
  on public.kwilt_blocks for delete
  using (auth.uid() = blocker_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper functions
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.kwilt_is_following(viewer uuid, target uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.kwilt_follows f
    where f.follower_id = viewer
      and f.followed_id = target
      and f.status = 'active'
  );
$$;

-- True if `target` has blocked `viewer`.
create or replace function public.kwilt_is_blocked(viewer uuid, target uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.kwilt_blocks b
    where b.blocker_id = target
      and b.blocked_id = viewer
  );
$$;

create or replace function public.kwilt_can_view_user_feed(viewer uuid, target uuid)
returns boolean
language sql
stable
as $$
  select
    viewer = target
    or (
      public.kwilt_is_following(viewer, target)
      and not public.kwilt_is_blocked(viewer, target)
    );
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Extend kwilt_invites to support follow invites (keep friendship for old builds)
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.kwilt_invites
  drop constraint if exists kwilt_invites_entity_type_check;

alter table public.kwilt_invites
  add constraint kwilt_invites_entity_type_check
  check (entity_type in ('goal', 'friendship', 'follow'));

-- ──────────────────────────────────────────────────────────────────────────────
-- Shift user-level feed visibility from "friends" to "followers"
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "Friends can read user feed events" on public.kwilt_feed_events;

create policy "Followers can read user feed events"
  on public.kwilt_feed_events for select
  using (
    entity_type = 'user'
    and public.kwilt_can_view_user_feed(auth.uid(), entity_id::uuid)
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- Data migration: map existing friendships -> follows (best-effort)
-- ──────────────────────────────────────────────────────────────────────────────
-- Active friendships become mutual follows.
insert into public.kwilt_follows (follower_id, followed_id, status, created_at)
select f.user_a, f.user_b, 'active', coalesce(f.accepted_at, f.created_at)
from public.kwilt_friendships f
where f.status = 'active'
on conflict do nothing;

insert into public.kwilt_follows (follower_id, followed_id, status, created_at)
select f.user_b, f.user_a, 'active', coalesce(f.accepted_at, f.created_at)
from public.kwilt_friendships f
where f.status = 'active'
on conflict do nothing;

-- Pending friendships become a one-way follow (initiator -> other).
insert into public.kwilt_follows (follower_id, followed_id, status, created_at)
select
  f.initiated_by as follower_id,
  case when f.initiated_by = f.user_a then f.user_b else f.user_a end as followed_id,
  'active',
  f.created_at
from public.kwilt_friendships f
where f.status = 'pending'
on conflict do nothing;

-- Blocked friendships become blocks in both directions (we don't know who blocked whom).
insert into public.kwilt_blocks (blocker_id, blocked_id, created_at)
select f.user_a, f.user_b, f.created_at
from public.kwilt_friendships f
where f.status = 'blocked'
on conflict do nothing;

insert into public.kwilt_blocks (blocker_id, blocked_id, created_at)
select f.user_b, f.user_a, f.created_at
from public.kwilt_friendships f
where f.status = 'blocked'
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────────────────────
-- Comments
-- ──────────────────────────────────────────────────────────────────────────────
comment on table public.kwilt_follows is
  'Asymmetric follower relationships (Duolingo-style): follower_id follows followed_id';

comment on table public.kwilt_blocks is
  'User blocks (blocker_id blocks blocked_id) used to suppress follower visibility';

comment on function public.kwilt_is_following is
  'Check if viewer follows target (active follow)';

comment on function public.kwilt_can_view_user_feed is
  'True if viewer can see target user feed events (viewer follows target and is not blocked)';



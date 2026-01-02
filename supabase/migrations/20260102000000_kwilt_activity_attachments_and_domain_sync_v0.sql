-- Kwilt: Activity attachments (metadata) + v0 domain sync tables (arcs/goals/activities).
--
-- Notes:
-- - App ids are currently string ids (e.g. `goal-...`, `activity-...`). We store them as TEXT.
-- - Attachments binaries live in Supabase Storage bucket `activity_attachments` (private).
-- - Direct client access to Storage is intended to be blocked; Edge Functions will broker signed URLs.
-- - Shared-goals membership tables use UUID ids; we provide a safe cast helper so share gating
--   can work when goal ids are UUID-formatted (and safely no-op otherwise).

create extension if not exists "pgcrypto";

-- ---------------------------------
-- Helpers
-- ---------------------------------

create or replace function public.kwilt_try_uuid(p text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------
-- Storage bucket
-- ---------------------------------

-- Storage buckets are represented in `storage.buckets`.
-- `public = false` => private bucket (requires signed URLs / policies).
insert into storage.buckets (id, name, public)
values ('activity_attachments', 'activity_attachments', false)
on conflict (id) do nothing;

-- ---------------------------------
-- Attachments metadata table
-- ---------------------------------

create table if not exists public.activity_attachments (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null,
  goal_id text null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'document', 'audio')),
  file_name text not null,
  mime_type text null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  duration_seconds int null check (duration_seconds is null or duration_seconds >= 0),
  storage_path text not null unique,
  shared_with_goal_members boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_attachments_activity_id_idx
  on public.activity_attachments(activity_id);

create index if not exists activity_attachments_owner_id_idx
  on public.activity_attachments(owner_id);

create index if not exists activity_attachments_goal_id_idx
  on public.activity_attachments(goal_id);

alter table public.activity_attachments enable row level security;

-- Read: owner can read. If explicitly shared and the goal id is UUID-shaped, goal members can read.
drop policy if exists "activity_attachments_read_owner_or_goal_members" on public.activity_attachments;
create policy "activity_attachments_read_owner_or_goal_members"
  on public.activity_attachments
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or (
      shared_with_goal_members = true
      and public.kwilt_is_member('goal', public.kwilt_try_uuid(goal_id), auth.uid())
    )
  );

-- Writes: only owner can write their rows.
drop policy if exists "activity_attachments_write_owner_only" on public.activity_attachments;
create policy "activity_attachments_write_owner_only"
  on public.activity_attachments
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------
-- Domain sync v0 tables
-- ---------------------------------

-- Store full domain objects as JSONB; client uses LWW merge based on embedded `updatedAt`.

create table if not exists public.kwilt_arcs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.kwilt_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.kwilt_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.kwilt_arcs enable row level security;
alter table public.kwilt_goals enable row level security;
alter table public.kwilt_activities enable row level security;

-- Owner-only access (auth.uid()).
drop policy if exists "kwilt_arcs_owner_only" on public.kwilt_arcs;
create policy "kwilt_arcs_owner_only"
  on public.kwilt_arcs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_goals_owner_only" on public.kwilt_goals;
create policy "kwilt_goals_owner_only"
  on public.kwilt_goals
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "kwilt_activities_owner_only" on public.kwilt_activities;
create policy "kwilt_activities_owner_only"
  on public.kwilt_activities
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());



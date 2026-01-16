-- ============================================================================
-- USER MILESTONES TABLE
-- ============================================================================
-- Server-side tracking of user achievement milestones.
-- Enables friend reactions on achievements (Phase 4+) by making milestones
-- visible beyond the local device.
--
-- Milestones are private by default. Visibility is controlled by friendship
-- settings (Phase 3+).
--
-- @see docs/prds/social-dynamics-evolution-prd.md (Phase 2B)
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Table: user_milestones
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Milestone classification
  milestone_type text not null,
  milestone_value int not null,
  
  -- When the milestone was achieved (client-provided, not server timestamp)
  achieved_at timestamptz not null default now(),
  
  -- Denormalized payload for flexibility
  -- e.g., goal_id for goal completions, streak_type for streak milestones
  payload jsonb not null default '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz not null default now()
);

-- Prevent duplicate milestones (same type + value for a user)
create unique index if not exists user_milestones_unique
  on public.user_milestones(user_id, milestone_type, milestone_value);

-- Fast lookups by user
create index if not exists user_milestones_user_id_idx
  on public.user_milestones(user_id);

-- Fast lookups by type (for analytics / batch operations)
create index if not exists user_milestones_type_idx
  on public.user_milestones(milestone_type);

-- Recent milestones (for friend activity feeds in Phase 4)
create index if not exists user_milestones_achieved_at_idx
  on public.user_milestones(achieved_at desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS Policies
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.user_milestones enable row level security;

-- Users can read their own milestones
create policy "Users can read own milestones"
  on public.user_milestones for select
  using (auth.uid() = user_id);

-- Users can insert their own milestones
create policy "Users can insert own milestones"
  on public.user_milestones for insert
  with check (auth.uid() = user_id);

-- Users can update their own milestones (for payload updates)
create policy "Users can update own milestones"
  on public.user_milestones for update
  using (auth.uid() = user_id);

-- No delete policy - milestones are permanent records
-- (soft delete via payload.hidden if needed in future)

-- ──────────────────────────────────────────────────────────────────────────────
-- Comments
-- ──────────────────────────────────────────────────────────────────────────────
comment on table public.user_milestones is 
  'Server-side record of user achievement milestones (streaks, completions, etc.)';

comment on column public.user_milestones.milestone_type is 
  'Type identifier: streak_7, streak_30, streak_100, streak_365, streak_1000, focus_streak_7, focus_streak_30, goal_completed';

comment on column public.user_milestones.milestone_value is 
  'Numeric value associated with the milestone (e.g., 30 for streak_30, goal count for goal_completed)';

comment on column public.user_milestones.payload is 
  'Flexible JSON payload for milestone-specific data (e.g., goal_id, streak_type)';


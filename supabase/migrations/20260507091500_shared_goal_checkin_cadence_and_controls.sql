-- Shared goal accountability controls.
--
-- Goals are still local-first, so cadence/preferences live in a goal-scoped
-- companion table keyed by the local goal id rather than a canonical goals row.

create table if not exists public.goal_sharing_settings (
  goal_id uuid primary key,
  checkin_cadence text not null default 'weekly' check (checkin_cadence in ('daily', 'three_times_weekly', 'weekly')),
  owner_quiet_goal_nudges_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goal_sharing_settings enable row level security;

drop policy if exists "goal_sharing_settings_read_for_members" on public.goal_sharing_settings;
create policy "goal_sharing_settings_read_for_members"
  on public.goal_sharing_settings
  for select
  to authenticated
  using (public.kwilt_is_member('goal', goal_id, auth.uid()));

drop policy if exists "goal_sharing_settings_write_for_members" on public.goal_sharing_settings;
create policy "goal_sharing_settings_write_for_members"
  on public.goal_sharing_settings
  for all
  to authenticated
  using (public.kwilt_is_member('goal', goal_id, auth.uid()))
  with check (public.kwilt_is_member('goal', goal_id, auth.uid()));

create table if not exists public.goal_partner_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'push')),
  destination text,
  owner_updates_enabled boolean not null default true,
  milestone_enabled boolean not null default true,
  quiet_goal_enabled boolean not null default false,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, user_id, channel)
);

create index if not exists goal_partner_notification_preferences_goal
  on public.goal_partner_notification_preferences(goal_id);

alter table public.goal_partner_notification_preferences enable row level security;

drop policy if exists "goal_partner_notification_preferences_read_own" on public.goal_partner_notification_preferences;
create policy "goal_partner_notification_preferences_read_own"
  on public.goal_partner_notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid() and public.kwilt_is_member('goal', goal_id, auth.uid()));

drop policy if exists "goal_partner_notification_preferences_write_own" on public.goal_partner_notification_preferences;
create policy "goal_partner_notification_preferences_write_own"
  on public.goal_partner_notification_preferences
  for all
  to authenticated
  using (user_id = auth.uid() and public.kwilt_is_member('goal', goal_id, auth.uid()))
  with check (user_id = auth.uid() and public.kwilt_is_member('goal', goal_id, auth.uid()));

alter table public.kwilt_referrals
  add column if not exists kind text not null default 'standard'
  check (kind in ('standard', 'shared_goal_invite'));

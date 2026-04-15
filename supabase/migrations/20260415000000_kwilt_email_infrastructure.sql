-- Kwilt: Email cadence tracking and preferences for lifecycle/drip emails.
--
-- Tables:
-- - kwilt_email_cadence: tracks which messages have been sent to each user.
-- - kwilt_email_preferences: per-user opt-in/out for each email category.

-- ---------------------------------
-- Email cadence (sent-message ledger)
-- ---------------------------------

create table if not exists public.kwilt_email_cadence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_key text not null,
  sent_at timestamptz not null default now(),
  metadata jsonb null,
  unique (user_id, message_key)
);

create index if not exists kwilt_email_cadence_user_id_idx
  on public.kwilt_email_cadence(user_id);

-- ---------------------------------
-- Email preferences
-- ---------------------------------

create table if not exists public.kwilt_email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  welcome_drip boolean not null default true,
  chapter_digest boolean not null default true,
  streak_winback boolean not null default true,
  marketing boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------
-- RLS
-- ---------------------------------

alter table public.kwilt_email_cadence enable row level security;
alter table public.kwilt_email_preferences enable row level security;

-- Cadence: owner can read their own records. Writes go through service role (edge functions).
drop policy if exists "kwilt_email_cadence_owner_read" on public.kwilt_email_cadence;
create policy "kwilt_email_cadence_owner_read"
  on public.kwilt_email_cadence
  for select
  to authenticated
  using (user_id = auth.uid());

-- Preferences: owner can read and update their own preferences.
drop policy if exists "kwilt_email_preferences_owner_all" on public.kwilt_email_preferences;
create policy "kwilt_email_preferences_owner_all"
  on public.kwilt_email_preferences
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

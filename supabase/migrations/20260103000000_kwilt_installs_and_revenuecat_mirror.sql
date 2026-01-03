-- Kwilt: installs registry + RevenueCat subscription mirror (for Super Admin "Kwilt Users" directory).
--
-- Goals:
-- - Track all devices (install_id) even before account creation
-- - Associate install -> auth.user (when available)
-- - Mirror RevenueCat subscription status server-side so Super Admin can see "everything"
--   (paid subscriptions + code/admin grants)
--
-- Security posture:
-- - Tables have RLS enabled with no policies; only Edge Functions (service role) can access.

create table if not exists public.kwilt_installs (
  install_id text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Optional link to authenticated user
  user_id uuid null references auth.users(id) on delete set null,
  user_email text null,
  -- Optional link to RevenueCat subscriber/app user id (often per-device unless you logIn to a stable id)
  revenuecat_app_user_id text null,
  -- Optional metadata
  platform text null,
  app_version text null,
  build_number text null,
  -- Optional analytics correlation (if we later choose to)
  posthog_distinct_id text null
);

create index if not exists kwilt_installs_last_seen_at_idx on public.kwilt_installs(last_seen_at desc);
create index if not exists kwilt_installs_user_id_idx on public.kwilt_installs(user_id);
create index if not exists kwilt_installs_rc_app_user_id_idx on public.kwilt_installs(revenuecat_app_user_id);

create table if not exists public.kwilt_revenuecat_subscriptions (
  revenuecat_app_user_id text primary key,
  is_pro boolean not null default false,
  product_id text null,
  expires_at timestamptz null,
  last_event_type text null,
  last_event_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw jsonb null
);

create index if not exists kwilt_rc_is_pro_idx on public.kwilt_revenuecat_subscriptions(is_pro);
create index if not exists kwilt_rc_expires_at_idx on public.kwilt_revenuecat_subscriptions(expires_at);

alter table public.kwilt_installs enable row level security;
alter table public.kwilt_revenuecat_subscriptions enable row level security;



-- Kwilt: Secret expiry tracking (metadata only; no secret values stored)
-- Used by the `secrets-expiry-monitor` edge function to email admins before expirations.

create extension if not exists "pgcrypto";

create table if not exists public.kwilt_secret_expirations (
  id uuid primary key default gen_random_uuid(),
  -- Friendly label (e.g. "Microsoft Calendar OAuth client secret")
  display_name text not null,
  -- The env var / Supabase secret key name (e.g. "MICROSOFT_CALENDAR_CLIENT_SECRET")
  secret_key text not null,
  provider text null,
  environment text not null default 'prod' check (environment in ('dev', 'staging', 'prod')),
  -- When the *provider-side* secret expires (not access tokens)
  expires_at timestamptz null,
  alert_days_before integer not null default 30 check (alert_days_before >= 0),
  owner_email text null,
  rotation_url text null,
  notes text null,
  is_active boolean not null default true,
  last_notified_at timestamptz null,
  last_notified_severity text null check (last_notified_severity in ('warning', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (secret_key, environment)
);

create index if not exists kwilt_secret_expirations_env_expires_idx
  on public.kwilt_secret_expirations(environment, is_active, expires_at);

alter table public.kwilt_secret_expirations enable row level security;

-- No client-facing access. Studio and service-role can still manage/query this table.
revoke all on table public.kwilt_secret_expirations from anon, authenticated;
grant select, insert, update, delete on table public.kwilt_secret_expirations to service_role;



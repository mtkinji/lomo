-- Kwilt: track install ↔ identity history so a device can be linked to multiple accounts over time.
--
-- Rationale:
-- - `public.kwilt_installs` is keyed by install_id (one row per device) and represents the *latest* association.
-- - For debugging/admin directory purposes, we also want the historical set of identities seen on a device.
--
-- Security:
-- - RLS enabled with no policies; only Edge Functions (service role) should access.

create table if not exists public.kwilt_install_identities (
  install_id text not null references public.kwilt_installs(install_id) on delete cascade,
  -- Stable identity key: e.g. "user:<uuid>" or "email:<lowercase-email>"
  identity_key text not null,
  user_id uuid null references auth.users(id) on delete set null,
  user_email text null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (install_id, identity_key)
);

create index if not exists kwilt_install_identities_user_id_idx on public.kwilt_install_identities(user_id);
create index if not exists kwilt_install_identities_user_email_idx on public.kwilt_install_identities(lower(user_email));
create index if not exists kwilt_install_identities_last_seen_at_idx on public.kwilt_install_identities(last_seen_at desc);

alter table public.kwilt_install_identities enable row level security;



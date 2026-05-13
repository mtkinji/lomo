-- Kwilt External AI Connector foundation.
--
-- Stores Dynamic Client Registration clients, OAuth grants/tokens, and the
-- first-class external tool-call log used by Claude/ChatGPT connector surfaces.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- OAuth clients registered by external MCP hosts.
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_external_oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_secret_hash text null,
  client_name text not null,
  redirect_uris jsonb not null default '[]'::jsonb,
  grant_types jsonb not null default '["authorization_code","refresh_token"]'::jsonb,
  response_types jsonb not null default '["code"]'::jsonb,
  token_endpoint_auth_method text not null default 'client_secret_post',
  surface text not null default 'custom' check (surface in ('claude', 'chatgpt', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create index if not exists kwilt_external_oauth_clients_surface_created_idx
  on public.kwilt_external_oauth_clients(surface, created_at desc);

alter table public.kwilt_external_oauth_clients enable row level security;

-- No authenticated-client policy: OAuth client records are managed by Edge
-- Functions with the service role, not exposed through PostgREST.

-- ---------------------------------------------------------------------------
-- Short-lived authorization codes.
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_external_oauth_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  client_id text not null references public.kwilt_external_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text null,
  code_challenge_method text null,
  scope text null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_external_oauth_codes_client_user_idx
  on public.kwilt_external_oauth_authorization_codes(client_id, user_id, created_at desc);

create index if not exists kwilt_external_oauth_codes_expires_idx
  on public.kwilt_external_oauth_authorization_codes(expires_at);

alter table public.kwilt_external_oauth_authorization_codes enable row level security;

-- Service-role only. Authorization codes are bearer credentials and should
-- never be readable from public clients.

-- ---------------------------------------------------------------------------
-- Access and refresh tokens issued to external MCP hosts.
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_external_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  refresh_token_hash text null unique,
  client_id text not null references public.kwilt_external_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text null,
  expires_at timestamptz not null,
  last_used_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_external_oauth_tokens_user_created_idx
  on public.kwilt_external_oauth_tokens(user_id, created_at desc);

create index if not exists kwilt_external_oauth_tokens_client_created_idx
  on public.kwilt_external_oauth_tokens(client_id, created_at desc);

alter table public.kwilt_external_oauth_tokens enable row level security;

-- Service-role only. User-facing connection management should go through an
-- Edge Function that can redact credentials and aggregate per-surface stats.

-- ---------------------------------------------------------------------------
-- External tool-call log.
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_external_capture_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null default 'custom' check (surface in ('claude', 'chatgpt', 'custom')),
  oauth_client_id text null references public.kwilt_external_oauth_clients(client_id) on delete set null,
  tool_name text not null,
  tool_kind text not null check (tool_kind in ('read', 'write')),
  input_hash text null,
  success boolean not null default true,
  error_code text null,
  request_id_hash text null,
  user_agent_hash text null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_external_capture_log_user_created_idx
  on public.kwilt_external_capture_log(user_id, created_at desc);

create index if not exists kwilt_external_capture_log_surface_created_idx
  on public.kwilt_external_capture_log(surface, created_at desc);

create index if not exists kwilt_external_capture_log_tool_created_idx
  on public.kwilt_external_capture_log(tool_name, created_at desc);

alter table public.kwilt_external_capture_log enable row level security;

drop policy if exists "kwilt_external_capture_log_owner_select"
  on public.kwilt_external_capture_log;

create policy "kwilt_external_capture_log_owner_select"
  on public.kwilt_external_capture_log
  for select
  to authenticated
  using (user_id = auth.uid());

-- Writes are intentionally service-role only so connector traffic cannot forge
-- audit entries through the public Data API.

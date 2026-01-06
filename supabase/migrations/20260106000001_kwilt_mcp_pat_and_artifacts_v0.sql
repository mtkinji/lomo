-- Kwilt MCP v0: per-user PAT auth + progress/artifacts/audit trail.
--
-- Notes:
-- - PATs are stored hashed (never store raw tokens).
-- - MCP writes are audited for trust and debugging.
-- - Artifacts are intentionally small text blobs / references.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Personal Access Tokens (PAT)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_pats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  revoked_at timestamptz null
);

create index if not exists kwilt_pats_owner_id_idx
  on public.kwilt_pats(owner_id);

alter table public.kwilt_pats enable row level security;
drop policy if exists "kwilt_pats_owner_only" on public.kwilt_pats;
create policy "kwilt_pats_owner_only"
  on public.kwilt_pats
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Progress log (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_activity_progress (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  execution_target_id uuid not null references public.kwilt_execution_targets(id) on delete cascade,
  message text not null,
  percent int null check (percent is null or (percent >= 0 and percent <= 100)),
  created_at timestamptz not null default now()
);

create index if not exists kwilt_activity_progress_owner_target_created_idx
  on public.kwilt_activity_progress(owner_id, execution_target_id, created_at desc);

alter table public.kwilt_activity_progress enable row level security;
drop policy if exists "kwilt_activity_progress_owner_only" on public.kwilt_activity_progress;
create policy "kwilt_activity_progress_owner_only"
  on public.kwilt_activity_progress
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Artifacts (small, typed blobs)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_activity_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  execution_target_id uuid not null references public.kwilt_execution_targets(id) on delete cascade,
  type text not null check (type in ('diff_summary', 'file_list', 'commands_run', 'pr_url', 'commit_hash', 'notes')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_activity_artifacts_owner_target_created_idx
  on public.kwilt_activity_artifacts(owner_id, execution_target_id, created_at desc);

alter table public.kwilt_activity_artifacts enable row level security;
drop policy if exists "kwilt_activity_artifacts_owner_only" on public.kwilt_activity_artifacts;
create policy "kwilt_activity_artifacts_owner_only"
  on public.kwilt_activity_artifacts
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Audit log (best-effort)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_mcp_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null,
  execution_target_id uuid null references public.kwilt_execution_targets(id) on delete set null,
  activity_id text null,
  request_id text null,
  summary text null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_mcp_audit_owner_created_idx
  on public.kwilt_mcp_audit_log(owner_id, created_at desc);

alter table public.kwilt_mcp_audit_log enable row level security;
drop policy if exists "kwilt_mcp_audit_log_owner_only" on public.kwilt_mcp_audit_log;
create policy "kwilt_mcp_audit_log_owner_only"
  on public.kwilt_mcp_audit_log
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());



-- Kwilt MCP v0: execution targets + explicit Cursor handoff state (server-brokered).
--
-- Notes:
-- - Domain objects live in `kwilt_activities` as JSONB blobs (user_id,id,data).
-- - MCP needs explicit "handed off to executor" gating that should NOT rely on parsing Activity notes.
-- - These tables are intended to be written/read primarily by server-side code (Edge Functions).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Execution targets (installed instances)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_execution_targets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- NOTE: FK added later in this migration after definitions table exists (for schema-order safety).
  definition_id text null,
  kind text not null,
  display_name text not null,
  -- Definition-specific config (e.g. for Cursor: repo_url/repo_name + verification commands).
  config jsonb not null default '{}'::jsonb,
  -- Definition-specific requirements (e.g. acceptance criteria required, verify steps required).
  requirements jsonb not null default '{}'::jsonb,
  -- Executor playbook / repo context.
  playbook jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_execution_targets_owner_id_idx
  on public.kwilt_execution_targets(owner_id);

create index if not exists kwilt_execution_targets_kind_idx
  on public.kwilt_execution_targets(kind);

create index if not exists kwilt_execution_targets_definition_id_idx
  on public.kwilt_execution_targets(definition_id);

alter table public.kwilt_execution_targets enable row level security;

-- Owner-only access for the signed-in app user. (Executors using PAT are brokered via Edge.)
drop policy if exists "kwilt_execution_targets_owner_only" on public.kwilt_execution_targets;
create policy "kwilt_execution_targets_owner_only"
  on public.kwilt_execution_targets
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Execution target definitions (curated library)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_execution_target_definitions (
  id text primary key,
  kind text not null,
  display_name text not null,
  description text null,
  version int not null default 1,
  -- Versioned JSON schemas / defaults:
  config_schema jsonb not null default '{}'::jsonb,
  requirements_schema jsonb not null default '{}'::jsonb,
  playbook_schema jsonb not null default '{}'::jsonb,
  default_config jsonb not null default '{}'::jsonb,
  default_requirements jsonb not null default '{}'::jsonb,
  default_playbook jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_execution_target_definitions_kind_idx
  on public.kwilt_execution_target_definitions(kind);

alter table public.kwilt_execution_target_definitions enable row level security;

-- Read-only to authenticated users; definitions are curated by Kwilt (managed via migrations/admin).
drop policy if exists "kwilt_execution_target_definitions_read_auth" on public.kwilt_execution_target_definitions;
create policy "kwilt_execution_target_definitions_read_auth"
  on public.kwilt_execution_target_definitions
  for select
  to authenticated
  using (true);

-- Seed curated definitions (v1: Cursor MCP executor).
insert into public.kwilt_execution_target_definitions (
  id,
  kind,
  display_name,
  description,
  version,
  config_schema,
  requirements_schema,
  playbook_schema,
  default_config,
  default_requirements,
  default_playbook
)
values (
  'cursor_mcp_v1',
  'cursor_repo',
  'Cursor (MCP executor)',
  'Execute handed-off Activities in a code repository via Cursor using Kwilt MCP tools.',
  1,
  '{
    "type":"object",
    "required":["repo_name"],
    "properties":{
      "repo_name":{"type":"string"},
      "repo_url":{"type":"string"},
      "branch_policy":{"type":"string"},
      "verification_commands":{"type":"array","items":{"type":"string"}}
    }
  }'::jsonb,
  '{
    "type":"object",
    "required":["requires_acceptance_criteria","requires_verification_steps"],
    "properties":{
      "requires_acceptance_criteria":{"type":"boolean"},
      "requires_verification_steps":{"type":"boolean"}
    }
  }'::jsonb,
  '{
    "type":"object",
    "properties":{
      "style_notes":{"type":"string"},
      "test_instructions":{"type":"string"}
    }
  }'::jsonb,
  '{"repo_name":"","repo_url":null,"branch_policy":"feature_branch","verification_commands":[]}'::jsonb,
  '{"requires_acceptance_criteria":true,"requires_verification_steps":true}'::jsonb,
  '{"style_notes":"Follow repo conventions. Keep artifacts small.","test_instructions":"Run the Work Packet verification steps."}'::jsonb
)
on conflict (id) do nothing;

-- Add FK now that the referenced table exists.
do $$
begin
  alter table public.kwilt_execution_targets
    add constraint kwilt_execution_targets_definition_id_fkey
    foreign key (definition_id) references public.kwilt_execution_target_definitions(id) on delete set null;
exception when duplicate_object then
  null;
end $$;

-- ---------------------------------------------------------------------------
-- Activity handoffs (explicit “handed off to executor” queue state)
-- ---------------------------------------------------------------------------

create table if not exists public.kwilt_activity_handoffs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  execution_target_id uuid not null references public.kwilt_execution_targets(id) on delete cascade,
  handed_off boolean not null default false,
  handed_off_at timestamptz null,
  -- Queue state for the executor (separate from Activity.status in domain JSON).
  status text not null default 'READY' check (status in ('READY', 'IN_PROGRESS', 'BLOCKED', 'DONE')),
  blocked_reason text null,
  -- Structured work packet fields (do not infer by parsing Activity notes).
  title_override text null,
  problem_statement text null,
  desired_outcome text null,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  verification_steps jsonb not null default '[]'::jsonb,
  do_not_change jsonb not null default '[]'::jsonb,
  perf_or_security_notes text null,
  links jsonb not null default '[]'::jsonb,
  relevant_files_hint jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kwilt_activity_handoffs_unique unique (owner_id, activity_id, execution_target_id)
);

create index if not exists kwilt_activity_handoffs_owner_id_idx
  on public.kwilt_activity_handoffs(owner_id);

create index if not exists kwilt_activity_handoffs_execution_target_id_idx
  on public.kwilt_activity_handoffs(execution_target_id);

create index if not exists kwilt_activity_handoffs_owner_target_status_idx
  on public.kwilt_activity_handoffs(owner_id, execution_target_id, status);

create index if not exists kwilt_activity_handoffs_owner_target_handed_off_idx
  on public.kwilt_activity_handoffs(owner_id, execution_target_id, handed_off);

alter table public.kwilt_activity_handoffs enable row level security;

-- Owner-only access for the signed-in app user. (Executors using PAT are brokered via Edge.)
drop policy if exists "kwilt_activity_handoffs_owner_only" on public.kwilt_activity_handoffs;
create policy "kwilt_activity_handoffs_owner_only"
  on public.kwilt_activity_handoffs
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());



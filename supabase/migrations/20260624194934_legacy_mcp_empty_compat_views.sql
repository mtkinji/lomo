-- Temporary compatibility for the currently deployed external-connections
-- function while Supabase function deploys are blocked by a 401 control-plane
-- error. These views are intentionally empty and cannot issue or authenticate
-- legacy MCP access.

create or replace view public.kwilt_pats as
select
  null::uuid as id,
  null::uuid as owner_id,
  null::text as label,
  null::text as token_hash,
  null::timestamptz as created_at,
  null::timestamptz as last_used_at,
  null::timestamptz as revoked_at
where false;

create or replace view public.kwilt_mcp_audit_log as
select
  null::uuid as id,
  null::uuid as owner_id,
  null::text as tool_name,
  null::uuid as execution_target_id,
  null::text as activity_id,
  null::text as request_id,
  null::text as summary,
  null::timestamptz as created_at
where false;

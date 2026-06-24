-- Remove the legacy PAT-based Kwilt MCP surface.
--
-- The canonical MCP server is the hosted OAuth connector at
-- /functions/v1/mcp. These tables only backed the old /functions/v1/kwilt-mcp
-- and pats-create flow.

drop table if exists public.kwilt_activity_artifacts cascade;
drop table if exists public.kwilt_activity_progress cascade;
drop table if exists public.kwilt_mcp_audit_log cascade;
drop table if exists public.kwilt_pats cascade;

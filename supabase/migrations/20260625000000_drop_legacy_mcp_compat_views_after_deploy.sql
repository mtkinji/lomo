-- Remove temporary compatibility views after external-connections was deployed
-- without legacy PAT reads.

drop view if exists public.kwilt_pats;
drop view if exists public.kwilt_mcp_audit_log;

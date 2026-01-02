-- Kwilt: allow representing “Pro Tools trial” entitlements in the existing entitlements table.
-- This supports server-enforced gating for Pro Tools features (like attachments) without
-- granting full Pro (structural) capabilities.

alter table public.kwilt_pro_entitlements
  add column if not exists is_pro_tools_trial boolean not null default false;



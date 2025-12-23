-- Kwilt: AI proxy monthly action quotas + token telemetry (MVP).
-- NOTE: This is additive to the existing daily counter migration.

create table if not exists public.kwilt_ai_usage_monthly (
  month text not null, -- YYYY-MM (UTC)
  quota_key text not null,
  actions_count integer not null default 0,
  tokens_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, quota_key)
);

-- Expand request telemetry to include actions + token usage.
alter table public.kwilt_ai_requests
  add column if not exists actions_cost integer null,
  add column if not exists prompt_tokens integer null,
  add column if not exists completion_tokens integer null,
  add column if not exists total_tokens integer null;

create or replace function public.kwilt_increment_ai_usage_monthly(
  p_quota_key text,
  p_month text,
  p_actions_cost integer,
  p_tokens_increment bigint
) returns integer
language plpgsql
as $$
declare
  next_actions integer;
begin
  insert into public.kwilt_ai_usage_monthly(month, quota_key, actions_count, tokens_count)
  values (p_month, p_quota_key, greatest(p_actions_cost, 0), greatest(p_tokens_increment, 0))
  on conflict (month, quota_key) do update
    set actions_count = public.kwilt_ai_usage_monthly.actions_count + greatest(p_actions_cost, 0),
        tokens_count = public.kwilt_ai_usage_monthly.tokens_count + greatest(p_tokens_increment, 0),
        updated_at = now()
  returning actions_count into next_actions;

  return next_actions;
end;
$$;



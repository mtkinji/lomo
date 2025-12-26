-- Kwilt: AI proxy onboarding-only allowance (shielded from daily/monthly quotas).
-- This prevents first-time onboarding from spending the user's monthly credits,
-- while still enforcing a small cap to avoid abuse (e.g. staying in onboarding forever).

create table if not exists public.kwilt_ai_usage_onboarding (
  quota_key text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (quota_key)
);

create or replace function public.kwilt_increment_ai_usage_onboarding(
  p_quota_key text,
  p_actions_cost integer
) returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.kwilt_ai_usage_onboarding(quota_key, count)
  values (p_quota_key, greatest(p_actions_cost, 0))
  on conflict (quota_key) do update
    set count = public.kwilt_ai_usage_onboarding.count + greatest(p_actions_cost, 0),
        updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;



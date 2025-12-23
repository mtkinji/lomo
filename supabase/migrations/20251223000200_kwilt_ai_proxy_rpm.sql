-- Kwilt: AI proxy per-minute request rate limiting (RPM), per quota_key.
-- This is a safety rail against runaway loops / abuse; monthly action quotas remain the primary limiter.

create table if not exists public.kwilt_ai_usage_minutely (
  minute timestamptz not null, -- truncated to minute boundary (UTC)
  quota_key text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (minute, quota_key)
);

create or replace function public.kwilt_increment_ai_usage_minutely(
  p_quota_key text,
  p_minute timestamptz
) returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.kwilt_ai_usage_minutely(minute, quota_key, count)
  values (date_trunc('minute', p_minute), p_quota_key, 1)
  on conflict (minute, quota_key) do update
    set count = public.kwilt_ai_usage_minutely.count + 1,
        updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;



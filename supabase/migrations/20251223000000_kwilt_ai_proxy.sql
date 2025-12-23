-- Kwilt: AI proxy quota tracking + minimal request telemetry (MVP).
-- This migration is intentionally small and launch-focused.

create extension if not exists "pgcrypto";

create table if not exists public.kwilt_ai_usage_daily (
  day date not null,
  quota_key text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, quota_key)
);

create table if not exists public.kwilt_ai_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quota_key text not null,
  is_pro boolean not null default false,
  route text not null,
  model text null,
  status integer null,
  duration_ms integer null,
  error_code text null
);

create or replace function public.kwilt_increment_ai_usage_daily(
  p_quota_key text,
  p_day date
) returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.kwilt_ai_usage_daily(day, quota_key, count)
  values (p_day, p_quota_key, 1)
  on conflict (day, quota_key) do update
    set count = public.kwilt_ai_usage_daily.count + 1,
        updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;



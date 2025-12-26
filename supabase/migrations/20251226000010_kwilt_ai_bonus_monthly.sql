-- Kwilt: AI proxy bonus monthly actions (reward credits).
-- Bonus credits are additive to the base monthly limit (Free/Pro) and scoped to a month (UTC).

create table if not exists public.kwilt_ai_bonus_monthly (
  month text not null, -- YYYY-MM (UTC)
  quota_key text not null,
  bonus_actions integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, quota_key)
);

create or replace function public.kwilt_increment_ai_bonus_monthly(
  p_quota_key text,
  p_month text,
  p_bonus_actions integer
) returns integer
language plpgsql
as $$
declare
  next_bonus integer;
begin
  insert into public.kwilt_ai_bonus_monthly(month, quota_key, bonus_actions)
  values (p_month, p_quota_key, greatest(p_bonus_actions, 0))
  on conflict (month, quota_key) do update
    set bonus_actions = public.kwilt_ai_bonus_monthly.bonus_actions + greatest(p_bonus_actions, 0),
        updated_at = now()
  returning bonus_actions into next_bonus;

  return next_bonus;
end;
$$;



-- Fix: kwilt_admin_use_summary() had an ambiguous reference because RETURNS TABLE
-- output columns are treated as variables in PL/pgSQL.

create or replace function public.kwilt_admin_use_summary(
  p_user_id uuid,
  p_install_ids text[],
  p_window_days int
)
returns table (
  window_days int,
  start_at timestamptz,
  end_at timestamptz,
  active_days int,
  arcs_touched int,
  goals_touched int,
  activities_touched int,
  activities_created int,
  checkins_count int,
  ai_actions_count int,
  is_activated boolean,
  activated_at timestamptz,
  last_meaningful_action_at timestamptz,
  last_meaningful_action_type text
)
language plpgsql
security definer
as $$
declare
  v_days int := greatest(1, least(coalesce(p_window_days, 7), 90));
  v_end timestamptz := now();
  v_start timestamptz := now() - (greatest(1, least(coalesce(p_window_days, 7), 90))::text || ' days')::interval;
  v_install_ids text[] := coalesce(p_install_ids, array[]::text[]);
  v_install_quota_keys text[] := (
    select coalesce(array_agg('install:' || i), array[]::text[])
    from unnest(v_install_ids) as i
    where i is not null and length(trim(i)) > 0
  );
  v_arcs_min timestamptz;
  v_goals_min timestamptz;
  v_acts_min timestamptz;
  v_arcs_last timestamptz;
  v_goals_last timestamptz;
  v_acts_last timestamptz;
  v_checkins_last timestamptz;
  v_ai_last timestamptz;
  v_last timestamptz;
begin
  select min(created_at), max(updated_at)
    into v_arcs_min, v_arcs_last
  from public.kwilt_arcs
  where user_id = p_user_id;

  select min(created_at), max(updated_at)
    into v_goals_min, v_goals_last
  from public.kwilt_goals
  where user_id = p_user_id;

  select min(created_at), max(updated_at)
    into v_acts_min, v_acts_last
  from public.kwilt_activities
  where user_id = p_user_id;

  select max(created_at)
    into v_checkins_last
  from public.goal_checkins
  where user_id = p_user_id;

  begin
    select max(created_at)
      into v_ai_last
    from public.kwilt_ai_requests
    where quota_key = any(v_install_quota_keys);
  exception when undefined_table then
    v_ai_last := null;
  end;

  v_last := greatest(v_arcs_last, v_goals_last, v_acts_last, v_checkins_last, v_ai_last);

  return query
  with
    arc_days as (
      select distinct (updated_at at time zone 'UTC')::date as d
      from public.kwilt_arcs
      where user_id = p_user_id
        and updated_at >= v_start and updated_at <= v_end
    ),
    goal_days as (
      select distinct (updated_at at time zone 'UTC')::date as d
      from public.kwilt_goals
      where user_id = p_user_id
        and updated_at >= v_start and updated_at <= v_end
    ),
    activity_days as (
      select distinct (updated_at at time zone 'UTC')::date as d
      from public.kwilt_activities
      where user_id = p_user_id
        and updated_at >= v_start and updated_at <= v_end
    ),
    checkin_days as (
      select distinct (created_at at time zone 'UTC')::date as d
      from public.goal_checkins
      where user_id = p_user_id
        and created_at >= v_start and created_at <= v_end
    ),
    ai_days as (
      select distinct day as d
      from public.kwilt_ai_usage_daily
      where quota_key = any(v_install_quota_keys)
        and day >= (v_start at time zone 'UTC')::date
        and day <= (v_end at time zone 'UTC')::date
    ),
    all_days as (
      select d from arc_days
      union
      select d from goal_days
      union
      select d from activity_days
      union
      select d from checkin_days
      union
      select d from ai_days
    ),
    counts as (
      select
        (select count(*) from all_days) as c_active_days,
        (select count(*) from public.kwilt_arcs where user_id = p_user_id and updated_at >= v_start and updated_at <= v_end) as c_arcs_touched,
        (select count(*) from public.kwilt_goals where user_id = p_user_id and updated_at >= v_start and updated_at <= v_end) as c_goals_touched,
        (select count(*) from public.kwilt_activities where user_id = p_user_id and updated_at >= v_start and updated_at <= v_end) as c_activities_touched,
        (select count(*) from public.kwilt_activities where user_id = p_user_id and created_at >= v_start and created_at <= v_end) as c_activities_created,
        (select count(*) from public.goal_checkins where user_id = p_user_id and created_at >= v_start and created_at <= v_end) as c_checkins_count,
        (select coalesce(sum("count"), 0) from public.kwilt_ai_usage_daily where quota_key = any(v_install_quota_keys) and day >= (v_start at time zone 'UTC')::date and day <= (v_end at time zone 'UTC')::date) as c_ai_actions_count
    )
  select
    v_days as window_days,
    v_start as start_at,
    v_end as end_at,
    c.c_active_days::int as active_days,
    c.c_arcs_touched::int as arcs_touched,
    c.c_goals_touched::int as goals_touched,
    c.c_activities_touched::int as activities_touched,
    c.c_activities_created::int as activities_created,
    c.c_checkins_count::int as checkins_count,
    c.c_ai_actions_count::int as ai_actions_count,
    (v_arcs_min is not null and v_goals_min is not null and v_acts_min is not null) as is_activated,
    case
      when (v_arcs_min is not null and v_goals_min is not null and v_acts_min is not null)
        then greatest(v_arcs_min, v_goals_min, v_acts_min)
      else null
    end as activated_at,
    v_last as last_meaningful_action_at,
    case
      when v_last is null then 'none'
      when v_last = v_ai_last then 'ai'
      when v_last = v_checkins_last then 'checkin'
      when v_last = v_acts_last then 'activity'
      when v_last = v_goals_last then 'goal'
      when v_last = v_arcs_last then 'arc'
      else 'unknown'
    end as last_meaningful_action_type
  from counts c;
end;
$$;



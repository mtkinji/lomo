-- Kwilt: Fix ambiguous column references in admin use summary RPC.
-- This fixes the "active_days is ambiguous" error by using unique CTE column aliases.

-- Drop and recreate with fixed column aliases
drop function if exists public.kwilt_admin_use_summary(uuid, text[], int);

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
  last_meaningful_action_type text,
  credits_per_active_day_7d numeric,
  credits_per_calendar_day_7d numeric,
  credits_this_month int,
  days_since_first_credit_this_month int,
  days_since_last_credit int
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
  v_current_month text;
  v_month_start date;
begin
  -- Current month for credit calculations (YYYY-MM format matching kwilt_ai_usage_monthly)
  v_current_month := to_char(now() at time zone 'UTC', 'YYYY-MM');
  v_month_start := date_trunc('month', now() at time zone 'UTC')::date;

  -- Activation prerequisites: at least one arc + goal + activity ever.
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

  -- Check-ins are stored in goal_checkins (shared goals). This is best-effort.
  select max(created_at)
    into v_checkins_last
  from public.goal_checkins
  where user_id = p_user_id;

  -- AI last action: best-effort using request telemetry (more precise than daily rollup).
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
    ai_days_with_counts as (
      select day as d, "count"
      from public.kwilt_ai_usage_daily
      where quota_key = any(v_install_quota_keys)
        and day >= (v_start at time zone 'UTC')::date
        and day <= (v_end at time zone 'UTC')::date
        and "count" > 0
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
        (select count(*) from all_days) as cnt_active_days,
        (select count(*) from public.kwilt_arcs where user_id = p_user_id and updated_at >= v_start and updated_at <= v_end) as cnt_arcs_touched,
        (select count(*) from public.kwilt_goals where user_id = p_user_id and updated_at >= v_start and updated_at <= v_end) as cnt_goals_touched,
        (select count(*) from public.kwilt_activities where user_id = p_user_id and updated_at >= v_start and updated_at <= v_end) as cnt_activities_touched,
        (select count(*) from public.kwilt_activities where user_id = p_user_id and created_at >= v_start and created_at <= v_end) as cnt_activities_created,
        (select count(*) from public.goal_checkins where user_id = p_user_id and created_at >= v_start and created_at <= v_end) as cnt_checkins_count,
        (select coalesce(sum("count"), 0) from public.kwilt_ai_usage_daily where quota_key = any(v_install_quota_keys) and day >= (v_start at time zone 'UTC')::date and day <= (v_end at time zone 'UTC')::date) as cnt_ai_actions_count
    ),
    credit_metrics as (
      select
        -- Total credits in 7-day window
        (select coalesce(sum("count"), 0) from ai_days_with_counts) as cm_total_credits_7d,
        -- Number of days with at least 1 credit spent in 7-day window
        (select count(*) from ai_days_with_counts) as cm_active_credit_days_7d,
        -- Credits this month from monthly rollup table
        (select coalesce(sum(actions_count), 0)::int 
         from public.kwilt_ai_usage_monthly 
         where quota_key = any(v_install_quota_keys) 
           and month = v_current_month) as cm_credits_this_month,
        -- First credit day this month
        (select min(day) 
         from public.kwilt_ai_usage_daily 
         where quota_key = any(v_install_quota_keys) 
           and day >= v_month_start
           and "count" > 0) as cm_first_credit_day,
        -- Last credit day (all time)
        (select max(day) 
         from public.kwilt_ai_usage_daily 
         where quota_key = any(v_install_quota_keys) 
           and "count" > 0) as cm_last_credit_day
    )
  select
    v_days as window_days,
    v_start as start_at,
    v_end as end_at,
    (select cnt_active_days from counts)::int,
    (select cnt_arcs_touched from counts)::int,
    (select cnt_goals_touched from counts)::int,
    (select cnt_activities_touched from counts)::int,
    (select cnt_activities_created from counts)::int,
    (select cnt_checkins_count from counts)::int,
    (select cnt_ai_actions_count from counts)::int,
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
    end as last_meaningful_action_type,
    -- Credit velocity metrics
    case
      when (select cm_active_credit_days_7d from credit_metrics) > 0
        then ((select cm_total_credits_7d from credit_metrics)::numeric / (select cm_active_credit_days_7d from credit_metrics)::numeric)
      else null
    end as credits_per_active_day_7d,
    ((select cm_total_credits_7d from credit_metrics)::numeric / v_days::numeric) as credits_per_calendar_day_7d,
    (select cm_credits_this_month from credit_metrics)::int,
    case
      when (select cm_first_credit_day from credit_metrics) is not null
        then (current_date - (select cm_first_credit_day from credit_metrics))::int
      else null
    end as days_since_first_credit_this_month,
    case
      when (select cm_last_credit_day from credit_metrics) is not null
        then (current_date - (select cm_last_credit_day from credit_metrics))::int
      else null
    end as days_since_last_credit;
end;
$$;




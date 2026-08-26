-- Weekly founder-facing Google HEART report.
--
-- Metric computation lives in a service-role-only SQL function so the Edge
-- Function can pass founder/test exclusions without exposing aggregate user
-- data through the public Data API. The scheduled function renders and emails
-- the report; this cron runs Mondays at 16:05 UTC (09:05 MDT / 10:05 MST).

create or replace function public.kwilt_heart_report(
  p_excluded_user_ids uuid[] default array[]::uuid[],
  p_excluded_install_ids text[] default array[]::text[],
  p_as_of timestamptz default now()
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with
external_accounts as (
  select u.id, u.created_at
  from auth.users u
  where u.deleted_at is null
    and not (u.id = any(p_excluded_user_ids))
),
external_arcs as (
  select a.user_id,
    nullif(a.data->>'createdAt', '')::timestamptz as created_ts,
    nullif(a.data->>'updatedAt', '')::timestamptz as updated_ts
  from public.kwilt_arcs a
  where not coalesce(a.is_deleted, false)
    and not (a.user_id = any(p_excluded_user_ids))
),
external_goals as (
  select g.user_id,
    nullif(g.data->>'createdAt', '')::timestamptz as created_ts,
    nullif(g.data->>'updatedAt', '')::timestamptz as updated_ts
  from public.kwilt_goals g
  where not coalesce(g.is_deleted, false)
    and not (g.user_id = any(p_excluded_user_ids))
),
external_activities as (
  select a.user_id,
    nullif(a.data->>'createdAt', '')::timestamptz as created_ts,
    nullif(a.data->>'updatedAt', '')::timestamptz as updated_ts,
    nullif(a.data->>'completedAt', '')::timestamptz as completed_ts
  from public.kwilt_activities a
  where not coalesce(a.is_deleted, false)
    and not (a.user_id = any(p_excluded_user_ids))
),
object_updates as (
  select user_id, updated_ts from external_arcs
  union all
  select user_id, updated_ts from external_goals
  union all
  select user_id, updated_ts from external_activities
),
meaningful_events as (
  select user_id, created_ts as occurred_at from external_activities where created_ts is not null
  union all
  select user_id, completed_ts from external_activities where completed_ts is not null
  union all
  select c.user_id, c.created_at
  from public.goal_checkins c
  where not (c.user_id = any(p_excluded_user_ids))
  union all
  select s.user_id, s.occurred_at
  from public.kwilt_streak_events s
  where not (s.user_id = any(p_excluded_user_ids))
),
prior_event_users as (
  select distinct user_id
  from meaningful_events
  where occurred_at >= p_as_of - interval '28 days'
    and occurred_at < p_as_of - interval '7 days'
),
current_event_users as (
  select distinct user_id
  from meaningful_events
  where occurred_at >= p_as_of - interval '7 days'
    and occurred_at <= p_as_of
),
new_account_activation as (
  select u.id,
    exists (
      select 1 from external_arcs a
      where a.user_id = u.id and a.created_ts <= u.created_at + interval '7 days'
    )
    and exists (
      select 1 from external_goals g
      where g.user_id = u.id and g.created_ts <= u.created_at + interval '7 days'
    )
    and exists (
      select 1 from external_activities a
      where a.user_id = u.id and a.created_ts <= u.created_at + interval '7 days'
    ) as activated
  from external_accounts u
  where u.created_at >= p_as_of - interval '28 days'
    and u.created_at <= p_as_of
),
external_ai as (
  select r.*
  from public.kwilt_ai_requests r
  where not (
    r.quota_key like 'install:%'
    and substring(r.quota_key from 9) = any(p_excluded_install_ids)
  )
)
select jsonb_build_object(
  'asOf', p_as_of,
  'periodStart', p_as_of - interval '7 days',
  'excludedAccounts', cardinality(p_excluded_user_ids),
  'excludedInstalls', cardinality(p_excluded_install_ids),
  'externalAccountsTotal', (select count(*) from external_accounts),
  'happiness', jsonb_build_object(
    'responses28d', (
      select count(*) from public.kwilt_chapter_feedback f
      where not (f.user_id = any(p_excluded_user_ids))
        and f.created_at >= p_as_of - interval '28 days' and f.created_at <= p_as_of
    ),
    'positive28d', (
      select count(*) from public.kwilt_chapter_feedback f
      where not (f.user_id = any(p_excluded_user_ids))
        and f.created_at >= p_as_of - interval '28 days' and f.created_at <= p_as_of
        and lower(f.rating) in ('up', 'positive', 'helpful')
    )
  ),
  'engagement', jsonb_build_object(
    'activeUsers7d', (
      select count(distinct user_id) from object_updates
      where updated_ts >= p_as_of - interval '7 days' and updated_ts <= p_as_of
    ),
    'previousActiveUsers7d', (
      select count(distinct user_id) from object_updates
      where updated_ts >= p_as_of - interval '14 days' and updated_ts < p_as_of - interval '7 days'
    ),
    'activitiesCreated7d', (
      select count(*) from external_activities
      where created_ts >= p_as_of - interval '7 days' and created_ts <= p_as_of
    ),
    'activitiesCompleted7d', (
      select count(*) from external_activities
      where completed_ts >= p_as_of - interval '7 days' and completed_ts <= p_as_of
    ),
    'aiActors7d', (
      select count(distinct quota_key) from external_ai
      where created_at >= p_as_of - interval '7 days' and created_at <= p_as_of
    ),
    'aiRequests7d', (
      select count(*) from external_ai
      where created_at >= p_as_of - interval '7 days' and created_at <= p_as_of
    )
  ),
  'adoption', jsonb_build_object(
    'newAccounts7d', (
      select count(*) from external_accounts
      where created_at >= p_as_of - interval '7 days' and created_at <= p_as_of
    ),
    'previousNewAccounts7d', (
      select count(*) from external_accounts
      where created_at >= p_as_of - interval '14 days' and created_at < p_as_of - interval '7 days'
    ),
    'activatedNewAccounts28d', (select count(*) from new_account_activation where activated),
    'newAccounts28d', (select count(*) from new_account_activation)
  ),
  'retention', jsonb_build_object(
    'eligibleUsers28d', (select count(*) from prior_event_users),
    'returnedUsers7d', (
      select count(*) from prior_event_users p
      where exists (select 1 from current_event_users c where c.user_id = p.user_id)
    )
  ),
  'taskSuccess', jsonb_build_object(
    'activitiesCreated28d', (
      select count(*) from external_activities
      where created_ts >= p_as_of - interval '28 days'
        and created_ts <= p_as_of - interval '7 days'
    ),
    'activitiesCompletedWithin7d', (
      select count(*) from external_activities
      where created_ts >= p_as_of - interval '28 days'
        and created_ts <= p_as_of - interval '7 days'
        and completed_ts is not null
        and completed_ts >= created_ts
        and completed_ts <= created_ts + interval '7 days'
    ),
    'aiRequests28d', (
      select count(*) from external_ai
      where created_at >= p_as_of - interval '28 days' and created_at <= p_as_of
    ),
    'aiSuccessfulRequests28d', (
      select count(*) from external_ai
      where created_at >= p_as_of - interval '28 days' and created_at <= p_as_of
        and status between 200 and 299
    )
  )
);
$$;

revoke all on function public.kwilt_heart_report(uuid[], text[], timestamptz) from public;
revoke all on function public.kwilt_heart_report(uuid[], text[], timestamptz) from anon;
revoke all on function public.kwilt_heart_report(uuid[], text[], timestamptz) from authenticated;
grant execute on function public.kwilt_heart_report(uuid[], text[], timestamptz) to service_role;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('kwilt-heart-report-weekly');
exception
  when others then null;
end
$$;

select cron.schedule(
  'kwilt-heart-report-weekly',
  '5 16 * * 1',
  $$
    select net.http_get(
      url := 'https://auth.kwilt.app/functions/v1/heart-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-kwilt-cron', 'weekly'
      ),
      timeout_milliseconds := 120000
    ) as request_id;
  $$
);

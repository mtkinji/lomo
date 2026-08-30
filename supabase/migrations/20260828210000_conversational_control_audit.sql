create table public.kwilt_conversational_control_audit (
  id bigint generated always as identity primary key,
  event text not null check (event in (
    'requested', 'authorization_refused', 'proposed', 'handoff', 'completed',
    'failed', 'replayed', 'stale_version_conflict'
  )),
  operation_id text not null check (char_length(operation_id) between 1 and 200),
  tool_version integer not null check (tool_version > 0),
  catalog_hash text not null check (char_length(catalog_hash) between 1 and 200),
  actor_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid null references public.kwilt_households(id) on delete set null,
  oauth_client_id text null check (oauth_client_id is null or char_length(oauth_client_id) <= 200),
  channel text not null check (channel in ('mobile', 'voice', 'phone', 'mcp', 'scheduled')),
  provider text null check (provider is null or char_length(provider) <= 80),
  request_id text not null check (char_length(request_id) between 1 and 200),
  argument_digest text not null check (argument_digest ~ '^[0-9a-f]{64}$'),
  result_status text null check (result_status is null or char_length(result_status) <= 80),
  receipt_id text null check (receipt_id is null or char_length(receipt_id) <= 200),
  error_code text null check (error_code is null or char_length(error_code) <= 160),
  latency_ms integer null check (latency_ms is null or latency_ms >= 0),
  occurred_at timestamptz not null default now()
);

create index kwilt_conversational_control_audit_operation_time_idx
  on public.kwilt_conversational_control_audit(operation_id, channel, occurred_at desc);
create index kwilt_conversational_control_audit_failure_time_idx
  on public.kwilt_conversational_control_audit(event, error_code, occurred_at desc)
  where event in ('authorization_refused', 'failed', 'stale_version_conflict');

create table public.kwilt_conversational_control_rate_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  oauth_client_id text null check (oauth_client_id is null or char_length(oauth_client_id) <= 200),
  operation_id text not null check (char_length(operation_id) between 1 and 200),
  provider text not null check (char_length(provider) between 1 and 80),
  consequence text not null check (consequence in ('low', 'medium', 'high')),
  request_id text not null check (char_length(request_id) between 1 and 200),
  occurred_at timestamptz not null default now(),
  unique (actor_id, operation_id, request_id)
);
create index kwilt_conversational_control_rate_actor_time_idx
  on public.kwilt_conversational_control_rate_events(actor_id, occurred_at desc);
create index kwilt_conversational_control_rate_client_time_idx
  on public.kwilt_conversational_control_rate_events(oauth_client_id, occurred_at desc)
  where oauth_client_id is not null;
create index kwilt_conversational_control_rate_provider_time_idx
  on public.kwilt_conversational_control_rate_events(provider, occurred_at desc);

create table public.kwilt_conversational_control_flags (
  id uuid primary key default gen_random_uuid(),
  operation_id text null check (operation_id is null or char_length(operation_id) between 1 and 200),
  provider text null check (provider is null or char_length(provider) <= 80),
  channel text null check (channel is null or channel in ('mobile', 'voice', 'phone', 'mcp', 'scheduled')),
  enabled boolean not null default true,
  reason text null check (reason is null or char_length(reason) <= 500),
  updated_at timestamptz not null default now(),
  check (operation_id is not null or provider is not null or channel is not null)
);
create unique index kwilt_conversational_control_flags_scope_idx
  on public.kwilt_conversational_control_flags(
    coalesce(operation_id, ''), coalesce(provider, ''), coalesce(channel, '')
  );

create table public.kwilt_conversational_provider_circuits (
  provider text primary key check (char_length(provider) between 1 and 80),
  state text not null default 'closed' check (state in ('closed', 'open', 'half_open')),
  failure_count integer not null default 0 check (failure_count >= 0),
  opened_at timestamptz null,
  retry_after timestamptz null,
  reason text null check (reason is null or char_length(reason) <= 500),
  updated_at timestamptz not null default now()
);

create table public.kwilt_conversational_control_dead_letters (
  id bigint generated always as identity primary key,
  source_kind text not null check (source_kind in ('run', 'handoff')),
  source_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation_id text null check (operation_id is null or char_length(operation_id) <= 200),
  request_id text null check (request_id is null or char_length(request_id) <= 200),
  reason text not null check (char_length(reason) between 1 and 200),
  recovery_state text not null default 'pending' check (recovery_state in ('pending', 'replayed', 'dismissed')),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  unique (source_kind, source_id)
);

create view public.kwilt_conversational_control_alerts
with (security_invoker = true)
as
select 'elevated_failure_or_refusal'::text as alert_type, audit.operation_id as subject,
  count(*)::bigint as event_count, max(audit.occurred_at) as last_observed_at
from public.kwilt_conversational_control_audit audit
where audit.occurred_at >= now() - interval '15 minutes'
  and audit.event in ('authorization_refused', 'failed', 'stale_version_conflict')
group by audit.operation_id having count(*) >= 5
union all
select 'duplicate_or_replay_spike', audit.operation_id, count(*)::bigint, max(audit.occurred_at)
from public.kwilt_conversational_control_audit audit
where audit.occurred_at >= now() - interval '15 minutes' and audit.event = 'replayed'
group by audit.operation_id having count(*) >= 5
union all
select 'receipt_mismatch', audit.operation_id, count(*)::bigint, max(audit.occurred_at)
from public.kwilt_conversational_control_audit audit
where audit.occurred_at >= now() - interval '15 minutes' and audit.error_code = 'receipt_mismatch'
group by audit.operation_id
union all
select 'oauth_scope_mismatch', coalesce(audit.oauth_client_id, 'unknown'), count(*)::bigint, max(audit.occurred_at)
from public.kwilt_conversational_control_audit audit
where audit.occurred_at >= now() - interval '15 minutes' and audit.error_code = 'oauth_scope_mismatch'
group by audit.oauth_client_id
union all
select 'tool_catalog_drift', audit.channel, count(distinct audit.catalog_hash)::bigint, max(audit.occurred_at)
from public.kwilt_conversational_control_audit audit
where audit.occurred_at >= now() - interval '15 minutes'
group by audit.channel having count(distinct audit.catalog_hash) > 1
union all
select 'stalled_handoff_or_run', dead.source_kind, count(*)::bigint, max(dead.last_observed_at)
from public.kwilt_conversational_control_dead_letters dead
where dead.recovery_state = 'pending'
group by dead.source_kind;

alter table public.kwilt_conversational_control_audit enable row level security;
alter table public.kwilt_conversational_control_rate_events enable row level security;
alter table public.kwilt_conversational_control_flags enable row level security;
alter table public.kwilt_conversational_provider_circuits enable row level security;
alter table public.kwilt_conversational_control_dead_letters enable row level security;

revoke all on table public.kwilt_conversational_control_audit from anon, authenticated;
revoke all on table public.kwilt_conversational_control_rate_events from anon, authenticated;
revoke all on table public.kwilt_conversational_control_flags from anon, authenticated;
revoke all on table public.kwilt_conversational_provider_circuits from anon, authenticated;
revoke all on table public.kwilt_conversational_control_dead_letters from anon, authenticated;
grant all on table public.kwilt_conversational_control_audit to service_role;
grant all on table public.kwilt_conversational_control_rate_events to service_role;
grant all on table public.kwilt_conversational_control_flags to service_role;
grant all on table public.kwilt_conversational_provider_circuits to service_role;
grant all on table public.kwilt_conversational_control_dead_letters to service_role;
grant usage, select on sequence public.kwilt_conversational_control_audit_id_seq to service_role;
grant usage, select on sequence public.kwilt_conversational_control_rate_events_id_seq to service_role;
grant usage, select on sequence public.kwilt_conversational_control_dead_letters_id_seq to service_role;
revoke all on table public.kwilt_conversational_control_alerts from public, anon, authenticated;
grant select on table public.kwilt_conversational_control_alerts to service_role;

create or replace function public.record_kwilt_conversational_provider_outcome(
  p_provider text,
  p_succeeded boolean,
  p_error_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_circuit public.kwilt_conversational_provider_circuits%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_provider is null or char_length(btrim(p_provider)) not between 1 and 80 then
    raise exception 'provider_outcome_invalid';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kwilt-control-provider:' || p_provider, 0));
  insert into public.kwilt_conversational_provider_circuits (provider, state, failure_count, updated_at)
  values (btrim(p_provider), 'closed', 0, now())
  on conflict (provider) do nothing;

  if p_succeeded then
    update public.kwilt_conversational_provider_circuits
    set state = 'closed', failure_count = 0, opened_at = null, retry_after = null,
      reason = null, updated_at = now()
    where provider = btrim(p_provider)
    returning * into v_circuit;
  else
    update public.kwilt_conversational_provider_circuits
    set failure_count = failure_count + 1,
      state = case when failure_count + 1 >= 5 then 'open' else state end,
      opened_at = case when failure_count + 1 >= 5 then coalesce(opened_at, now()) else opened_at end,
      retry_after = case when failure_count + 1 >= 5 then now() + interval '5 minutes' else retry_after end,
      reason = left(coalesce(nullif(p_error_code, ''), 'provider_failure'), 500), updated_at = now()
    where provider = btrim(p_provider)
    returning * into v_circuit;
  end if;
  return jsonb_build_object(
    'provider', v_circuit.provider, 'state', v_circuit.state,
    'failureCount', v_circuit.failure_count, 'retryAfter', v_circuit.retry_after
  );
end;
$$;

create or replace function public.authorize_kwilt_conversational_control(
  p_operation_id text,
  p_actor_id uuid,
  p_oauth_client_id text,
  p_channel text,
  p_provider text,
  p_request_id text,
  p_consequence text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_limit integer;
  v_client_limit integer;
  v_provider_limit integer;
  v_count integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_actor_id is null or p_operation_id is null or char_length(btrim(p_operation_id)) not between 1 and 200
    or p_request_id is null or char_length(btrim(p_request_id)) not between 1 and 200
    or p_channel not in ('mobile', 'voice', 'phone', 'mcp', 'scheduled')
    or p_provider is null or char_length(btrim(p_provider)) not between 1 and 80
    or p_consequence not in ('low', 'medium', 'high') then
    raise exception 'conversational_control_authorization_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kwilt-control-actor:' || p_actor_id::text, 0));
  if p_oauth_client_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('kwilt-control-client:' || p_oauth_client_id, 0));
  end if;

  if exists (
    select 1 from public.kwilt_conversational_control_rate_events event
    where event.actor_id = p_actor_id and event.operation_id = p_operation_id and event.request_id = p_request_id
  ) then
    return jsonb_build_object('allowed', true, 'replayed', true, 'reason', null);
  end if;

  if exists (
    select 1 from public.kwilt_conversational_control_flags flag
    where flag.enabled = false
      and (flag.operation_id is null or flag.operation_id = p_operation_id)
      and (flag.provider is null or flag.provider = p_provider)
      and (flag.channel is null or flag.channel = p_channel)
  ) then
    return jsonb_build_object('allowed', false, 'replayed', false, 'reason', 'operation_disabled');
  end if;

  if exists (
    select 1 from public.kwilt_conversational_provider_circuits circuit
    where circuit.provider = p_provider and circuit.state = 'open'
      and (circuit.retry_after is null or circuit.retry_after > now())
  ) then
    return jsonb_build_object('allowed', false, 'replayed', false, 'reason', 'provider_circuit_open');
  end if;

  v_actor_limit := case p_consequence when 'high' then 10 when 'medium' then 30 else 120 end;
  v_client_limit := case p_consequence when 'high' then 30 when 'medium' then 120 else 600 end;
  v_provider_limit := case p_consequence when 'high' then 100 when 'medium' then 500 else 2000 end;

  select count(*) into v_count from public.kwilt_conversational_control_rate_events event
  where event.actor_id = p_actor_id and event.occurred_at >= now() - interval '1 minute';
  if v_count >= v_actor_limit then
    return jsonb_build_object('allowed', false, 'replayed', false, 'reason', 'rate_limited');
  end if;
  if p_oauth_client_id is not null then
    select count(*) into v_count from public.kwilt_conversational_control_rate_events event
    where event.oauth_client_id = p_oauth_client_id and event.occurred_at >= now() - interval '1 minute';
    if v_count >= v_client_limit then
      return jsonb_build_object('allowed', false, 'replayed', false, 'reason', 'rate_limited');
    end if;
  end if;
  select count(*) into v_count from public.kwilt_conversational_control_rate_events event
  where event.provider = p_provider and event.occurred_at >= now() - interval '1 minute';
  if v_count >= v_provider_limit then
    return jsonb_build_object('allowed', false, 'replayed', false, 'reason', 'rate_limited');
  end if;

  insert into public.kwilt_conversational_control_rate_events (
    actor_id, oauth_client_id, operation_id, provider, consequence, request_id
  ) values (
    p_actor_id, nullif(btrim(p_oauth_client_id), ''), btrim(p_operation_id), btrim(p_provider), p_consequence, btrim(p_request_id)
  ) on conflict (actor_id, operation_id, request_id) do nothing;

  return jsonb_build_object('allowed', true, 'replayed', false, 'reason', null);
end;
$$;

create or replace function public.reconcile_kwilt_conversational_control(
  p_stale_after_minutes integer default 15,
  p_limit integer default 100
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_handoffs integer := 0;
  v_dead_letters integer := 0;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_stale_after_minutes not between 5 and 1440 or p_limit not between 1 and 1000 then
    raise exception 'conversational_control_reconciliation_invalid';
  end if;

  with candidates as (
    select handoff.id from public.kwilt_conversational_action_handoffs handoff
    where handoff.state in ('created', 'claimed') and handoff.expires_at <= now()
    order by handoff.expires_at asc limit p_limit for update skip locked
  ), expired as (
    update public.kwilt_conversational_action_handoffs handoff
    set state = 'expired', version = handoff.version + 1, expired_at = now(), updated_at = now()
    from candidates where handoff.id = candidates.id returning handoff.*
  ), letters as (
    insert into public.kwilt_conversational_control_dead_letters (
      source_kind, source_id, actor_id, operation_id, request_id, reason
    ) select 'handoff', expired.id, expired.actor_id, expired.operation_id, expired.request_id, 'handoff_expired'
      from expired
    on conflict (source_kind, source_id) do update
      set last_observed_at = now()
    returning 1
  ) select count(*) into v_expired_handoffs from letters;

  with stale as (
    select run.id, run.user_id from public.kwilt_agent_runs run
    where run.status in ('queued', 'active')
      and run.updated_at <= now() - make_interval(mins => p_stale_after_minutes)
    order by run.updated_at asc limit p_limit for update skip locked
  ), failed as (
    update public.kwilt_agent_runs run
    set status = 'failed', error_code = 'stuck_run_reconciled',
      error_message = 'Kwilt could not finish this response.', completed_at = now(),
      updated_at = now(), version = run.version + 1
    from stale where run.id = stale.id returning run.id, run.user_id
  ), letters as (
    insert into public.kwilt_conversational_control_dead_letters (
      source_kind, source_id, actor_id, reason
    ) select 'run', failed.id, failed.user_id, 'run_stalled' from failed
    on conflict (source_kind, source_id) do update
      set last_observed_at = now()
    returning 1
  ) select count(*) into v_dead_letters from letters;

  return jsonb_build_object('expiredHandoffs', v_expired_handoffs, 'deadLetters', v_dead_letters);
end;
$$;

revoke all on function public.authorize_kwilt_conversational_control(text, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.authorize_kwilt_conversational_control(text, uuid, text, text, text, text, text) to service_role;
revoke all on function public.reconcile_kwilt_conversational_control(integer, integer) from public, anon, authenticated;
grant execute on function public.reconcile_kwilt_conversational_control(integer, integer) to service_role;
revoke all on function public.record_kwilt_conversational_provider_outcome(text, boolean, text) from public, anon, authenticated;
grant execute on function public.record_kwilt_conversational_provider_outcome(text, boolean, text) to service_role;

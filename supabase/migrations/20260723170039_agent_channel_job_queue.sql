create table public.kwilt_agent_channel_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('sms', 'phone')),
  phone_link_id uuid not null references public.kwilt_phone_agent_links(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, phone_link_id)
);

create index kwilt_agent_channel_bindings_user_idx
  on public.kwilt_agent_channel_bindings(user_id, channel, updated_at desc);

create table public.kwilt_agent_channel_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('sms', 'phone')),
  phone_link_id uuid not null references public.kwilt_phone_agent_links(id) on delete cascade,
  external_message_id text not null check (char_length(external_message_id) between 1 and 200),
  prompt text not null check (char_length(prompt) between 1 and 100000),
  channel_context jsonb not null default '{}'::jsonb check (jsonb_typeof(channel_context) = 'object'),
  state text not null default 'queued'
    check (state in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  run_id uuid null references public.kwilt_agent_runs(id) on delete set null,
  response_body text null check (response_body is null or char_length(response_body) <= 100000),
  error_code text null,
  error_message text null,
  attempts integer not null default 0 check (attempts between 0 and 10),
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  completed_at timestamptz null,
  outbound_message_ids text[] not null default '{}',
  legacy_enrichment_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, phone_link_id, external_message_id)
);

create index kwilt_agent_channel_jobs_claim_idx
  on public.kwilt_agent_channel_jobs(state, available_at, created_at)
  where state in ('queued', 'running');

grant select on table public.kwilt_agent_channel_bindings, public.kwilt_agent_channel_jobs
  to authenticated;
grant all on table public.kwilt_agent_channel_bindings, public.kwilt_agent_channel_jobs
  to service_role;
revoke all on table public.kwilt_agent_channel_bindings, public.kwilt_agent_channel_jobs
  from anon;

alter table public.kwilt_agent_channel_bindings enable row level security;
alter table public.kwilt_agent_channel_jobs enable row level security;

create policy "kwilt_agent_channel_bindings_owner_select"
  on public.kwilt_agent_channel_bindings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_channel_jobs_owner_select"
  on public.kwilt_agent_channel_jobs for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.claim_kwilt_agent_channel_jobs(p_limit integer default 10)
returns setof public.kwilt_agent_channel_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  update public.kwilt_agent_channel_jobs
  set state = 'failed',
      error_code = 'worker_attempts_exhausted',
      error_message = 'Kwilt could not finish this channel response.',
      completed_at = now(),
      updated_at = now()
  where state = 'running'
    and attempts >= 3
    and locked_at < now() - interval '5 minutes';

  return query
  with candidates as (
    select job.id
    from public.kwilt_agent_channel_jobs job
    where (
      (job.state = 'queued' and job.available_at <= now())
      or (
        job.state = 'running'
        and job.attempts < 3
        and job.locked_at < now() - interval '5 minutes'
      )
    )
    order by job.available_at asc, job.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  )
  update public.kwilt_agent_channel_jobs job
  set state = 'running',
      attempts = job.attempts + 1,
      locked_at = now(),
      updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_kwilt_agent_channel_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_kwilt_agent_channel_jobs(integer)
  to service_role;

create or replace function public.finish_kwilt_agent_channel_job(
  p_job_id uuid,
  p_state text,
  p_run_id uuid default null,
  p_response_body text default null,
  p_error_code text default null,
  p_error_message text default null,
  p_outbound_message_ids text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.kwilt_agent_channel_jobs%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_state not in ('completed', 'failed', 'cancelled') then
    raise exception 'invalid_channel_job_terminal_state';
  end if;
  select * into v_job
  from public.kwilt_agent_channel_jobs candidate
  where candidate.id = p_job_id
  for update;
  if not found then raise exception 'channel_job_not_found'; end if;
  if v_job.state <> 'running' then raise exception 'invalid_channel_job_source_state'; end if;
  if p_run_id is not null and not exists (
    select 1 from public.kwilt_agent_runs candidate
    where candidate.id = p_run_id and candidate.user_id = v_job.user_id
  ) then raise exception 'channel_job_run_owner_mismatch'; end if;

  update public.kwilt_agent_channel_jobs
  set state = p_state,
      run_id = coalesce(p_run_id, run_id),
      response_body = case when p_state = 'completed' then p_response_body else response_body end,
      error_code = case when p_state in ('failed', 'cancelled') then p_error_code else null end,
      error_message = case when p_state in ('failed', 'cancelled') then p_error_message else null end,
      outbound_message_ids = coalesce(p_outbound_message_ids, '{}'),
      completed_at = now(),
      locked_at = null,
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return to_jsonb(v_job);
end;
$$;

revoke all on function public.finish_kwilt_agent_channel_job(
  uuid, text, uuid, text, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.finish_kwilt_agent_channel_job(
  uuid, text, uuid, text, text, text, text[]
) to service_role;

create or replace function public.retry_kwilt_agent_channel_job(
  p_job_id uuid,
  p_delay_seconds integer,
  p_error_code text,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.kwilt_agent_channel_jobs%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  select * into v_job
  from public.kwilt_agent_channel_jobs candidate
  where candidate.id = p_job_id
  for update;
  if not found then raise exception 'channel_job_not_found'; end if;
  if v_job.state <> 'running' then raise exception 'invalid_channel_job_source_state'; end if;
  if v_job.attempts >= 3 then raise exception 'channel_job_attempts_exhausted'; end if;

  update public.kwilt_agent_channel_jobs
  set state = 'queued',
      available_at = now() + make_interval(secs => greatest(1, least(coalesce(p_delay_seconds, 30), 3600))),
      error_code = p_error_code,
      error_message = p_error_message,
      locked_at = null,
      updated_at = now()
  where id = v_job.id
  returning * into v_job;
  return to_jsonb(v_job);
end;
$$;

revoke all on function public.retry_kwilt_agent_channel_job(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.retry_kwilt_agent_channel_job(uuid, integer, text, text)
  to service_role;

create or replace function public.checkpoint_kwilt_agent_channel_response(
  p_job_id uuid,
  p_run_id uuid,
  p_response_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.kwilt_agent_channel_jobs%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_response_body is null or char_length(btrim(p_response_body)) < 1
    or char_length(p_response_body) > 100000 then raise exception 'invalid_channel_response'; end if;
  select * into v_job
  from public.kwilt_agent_channel_jobs candidate
  where candidate.id = p_job_id
  for update;
  if not found then raise exception 'channel_job_not_found'; end if;
  if v_job.state <> 'running' then raise exception 'invalid_channel_job_source_state'; end if;
  if not exists (
    select 1 from public.kwilt_agent_runs candidate
    where candidate.id = p_run_id and candidate.user_id = v_job.user_id
      and candidate.status in ('complete', 'partial')
  ) then raise exception 'channel_job_run_owner_mismatch'; end if;

  update public.kwilt_agent_channel_jobs
  set run_id = p_run_id,
      response_body = btrim(p_response_body),
      error_code = null,
      error_message = null,
      updated_at = now()
  where id = v_job.id
  returning * into v_job;
  return to_jsonb(v_job);
end;
$$;

revoke all on function public.checkpoint_kwilt_agent_channel_response(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.checkpoint_kwilt_agent_channel_response(uuid, uuid, text)
  to service_role;

create or replace function public.record_kwilt_agent_channel_delivery_part(
  p_job_id uuid,
  p_expected_part integer,
  p_outbound_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.kwilt_agent_channel_jobs%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_outbound_message_id is null or char_length(btrim(p_outbound_message_id)) < 1
    or char_length(p_outbound_message_id) > 200 then raise exception 'invalid_outbound_message_id'; end if;
  select * into v_job
  from public.kwilt_agent_channel_jobs candidate
  where candidate.id = p_job_id
  for update;
  if not found then raise exception 'channel_job_not_found'; end if;
  if v_job.state <> 'running' or v_job.response_body is null then
    raise exception 'invalid_channel_job_delivery_state';
  end if;
  if cardinality(v_job.outbound_message_ids) <> p_expected_part then
    raise exception 'stale_channel_delivery_part';
  end if;

  update public.kwilt_agent_channel_jobs
  set outbound_message_ids = array_append(outbound_message_ids, btrim(p_outbound_message_id)),
      updated_at = now()
  where id = v_job.id
  returning * into v_job;
  return to_jsonb(v_job);
end;
$$;

revoke all on function public.record_kwilt_agent_channel_delivery_part(uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.record_kwilt_agent_channel_delivery_part(uuid, integer, text)
  to service_role;

create or replace function public.bind_kwilt_agent_channel_thread(
  p_user_id uuid,
  p_channel text,
  p_phone_link_id uuid,
  p_thread_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_binding public.kwilt_agent_channel_bindings%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_channel not in ('sms', 'phone') then raise exception 'invalid_channel'; end if;
  if not exists (
    select 1 from public.kwilt_phone_agent_links candidate
    where candidate.id = p_phone_link_id and candidate.user_id = p_user_id
  ) then raise exception 'channel_binding_link_owner_mismatch'; end if;
  if not exists (
    select 1 from public.kwilt_agent_threads candidate
    where candidate.id = p_thread_id and candidate.user_id = p_user_id and candidate.status = 'active'
  ) then raise exception 'channel_binding_thread_owner_mismatch'; end if;

  insert into public.kwilt_agent_channel_bindings (user_id, channel, phone_link_id, thread_id)
  values (p_user_id, p_channel, p_phone_link_id, p_thread_id)
  on conflict (channel, phone_link_id) do update
  set user_id = excluded.user_id,
      thread_id = excluded.thread_id,
      updated_at = now()
  returning * into v_binding;
  return to_jsonb(v_binding);
end;
$$;

revoke all on function public.bind_kwilt_agent_channel_thread(uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.bind_kwilt_agent_channel_thread(uuid, text, uuid, uuid)
  to service_role;

create or replace function public.enrich_kwilt_agent_channel_activity(
  p_job_id uuid,
  p_facts jsonb,
  p_send_followups boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.kwilt_agent_channel_jobs%rowtype;
  v_activity_id text;
  v_person jsonb;
  v_memory jsonb;
  v_event jsonb;
  v_cadence jsonb;
  v_schedule jsonb;
  v_alias text;
  v_display_name text;
  v_person_id uuid;
  v_event_id uuid;
  v_interval_days integer;
  v_people integer := 0;
  v_memories integer := 0;
  v_events integer := 0;
  v_cadences integer := 0;
  v_has_specific_schedule boolean := false;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_facts is null or jsonb_typeof(p_facts) <> 'object' then raise exception 'invalid_phone_agent_facts'; end if;
  select * into v_job
  from public.kwilt_agent_channel_jobs candidate
  where candidate.id = p_job_id
  for update;
  if not found then raise exception 'channel_job_not_found'; end if;
  if v_job.state <> 'running' or v_job.run_id is null or v_job.response_body is null then
    raise exception 'invalid_channel_job_enrichment_state';
  end if;
  if v_job.legacy_enrichment_at is not null then
    return jsonb_build_object('replayed', true, 'activityId', null);
  end if;

  select receipt.resulting_object_id into v_activity_id
  from public.kwilt_agent_mutation_receipts receipt
  join public.kwilt_agent_proposals proposal on proposal.id = receipt.proposal_id
  where proposal.run_id = v_job.run_id
    and proposal.user_id = v_job.user_id
    and receipt.user_id = v_job.user_id
    and receipt.capability_id = 'todos'
    and receipt.status = 'applied'
    and receipt.resulting_object_type = 'activity'
  order by receipt.created_at desc
  limit 1;

  if v_activity_id is null then
    update public.kwilt_agent_channel_jobs
    set legacy_enrichment_at = now(), updated_at = now()
    where id = v_job.id;
    return jsonb_build_object('replayed', false, 'activityId', null);
  end if;

  for v_person in select value from jsonb_array_elements(coalesce(p_facts -> 'people', '[]'::jsonb)) loop
    v_display_name := btrim(coalesce(v_person ->> 'displayName', ''));
    if char_length(v_display_name) between 1 and 160 then
      select alias.person_id into v_person_id
      from public.kwilt_phone_agent_person_aliases alias
      where alias.user_id = v_job.user_id and alias.alias_key = lower(v_display_name)
      limit 1;
      if v_person_id is null then
        insert into public.kwilt_phone_agent_people (user_id, display_name)
        values (v_job.user_id, v_display_name)
        returning id into v_person_id;
      end if;
      insert into public.kwilt_phone_agent_person_aliases (user_id, person_id, alias_text)
      values (v_job.user_id, v_person_id, v_display_name)
      on conflict (user_id, alias_key) do nothing;
      for v_alias in select value from jsonb_array_elements_text(coalesce(v_person -> 'aliases', '[]'::jsonb)) loop
        if char_length(btrim(v_alias)) between 1 and 160 then
          insert into public.kwilt_phone_agent_person_aliases (user_id, person_id, alias_text)
          values (v_job.user_id, v_person_id, btrim(v_alias))
          on conflict (user_id, alias_key) do nothing;
        end if;
      end loop;
      v_people := v_people + 1;
    end if;
    v_person_id := null;
  end loop;

  for v_memory in select value from jsonb_array_elements(coalesce(p_facts -> 'memoryItems', '[]'::jsonb)) loop
    select alias.person_id into v_person_id
    from public.kwilt_phone_agent_person_aliases alias
    where alias.user_id = v_job.user_id
      and alias.alias_key = lower(btrim(coalesce(v_memory ->> 'personName', '')))
    limit 1;
    if char_length(btrim(coalesce(v_memory ->> 'text', ''))) between 1 and 5000 then
      insert into public.kwilt_phone_agent_memory_items (
        user_id, person_id, activity_id, kind, text, source_channel, source_twilio_message_sid
      ) values (
        v_job.user_id, v_person_id, v_activity_id,
        case when v_memory ->> 'kind' = 'preference' then 'preference' else 'note' end,
        btrim(v_memory ->> 'text'), 'sms', v_job.external_message_id
      );
      v_memories := v_memories + 1;
    end if;
    v_person_id := null;
  end loop;

  for v_event in select value from jsonb_array_elements(coalesce(p_facts -> 'events', '[]'::jsonb)) loop
    select alias.person_id into v_person_id
    from public.kwilt_phone_agent_person_aliases alias
    where alias.user_id = v_job.user_id
      and alias.alias_key = lower(btrim(coalesce(v_event ->> 'personName', '')))
    limit 1;
    if char_length(btrim(coalesce(v_event ->> 'title', ''))) between 1 and 500 then
      insert into public.kwilt_phone_agent_events (
        user_id, person_id, activity_id, kind, title, date_text
      ) values (
        v_job.user_id, v_person_id, v_activity_id,
        case when v_event ->> 'kind' = 'birthday' then 'birthday' else 'other' end,
        btrim(v_event ->> 'title'), nullif(btrim(coalesce(v_event ->> 'dateText', '')), '')
      ) returning id into v_event_id;
      v_events := v_events + 1;
      for v_schedule in select value from jsonb_array_elements(coalesce(v_event -> 'promptSchedule', '[]'::jsonb)) loop
        if coalesce(v_schedule ->> 'dueDateText', '') ~ '^\d{4}-\d{2}-\d{2}$' then
          insert into public.kwilt_phone_agent_prompts (
            user_id, phone_link_id, activity_id, person_id, event_id, source_kind,
            prompt_kind, due_at, body, payload
          ) values (
            v_job.user_id, v_job.phone_link_id, v_activity_id, v_person_id, v_event_id, 'event',
            'birthday', ((v_schedule ->> 'dueDateText') || 'T09:00:00Z')::timestamptz,
            case when (v_schedule ->> 'offsetDays')::integer = 10
              then btrim(v_event ->> 'title') || ' is in 10 days. Want to plan something small?'
              else btrim(v_event ->> 'title') || ' is tomorrow. Want to send a note?'
            end,
            jsonb_build_object('offsetDays', (v_schedule ->> 'offsetDays')::integer)
          );
          v_has_specific_schedule := true;
        end if;
      end loop;
    end if;
    v_person_id := null;
    v_event_id := null;
  end loop;

  for v_cadence in select value from jsonb_array_elements(coalesce(p_facts -> 'cadences', '[]'::jsonb)) loop
    select alias.person_id into v_person_id
    from public.kwilt_phone_agent_person_aliases alias
    where alias.user_id = v_job.user_id
      and alias.alias_key = lower(btrim(coalesce(v_cadence ->> 'personName', '')))
    limit 1;
    v_interval_days := greatest(1, least(coalesce((v_cadence ->> 'intervalDays')::integer, 30), 730));
    insert into public.kwilt_phone_agent_cadences (
      user_id, person_id, activity_id, kind, interval_days, next_due_at
    ) values (
      v_job.user_id, v_person_id, v_activity_id, 'drift', v_interval_days,
      now() + make_interval(days => v_interval_days)
    );
    v_cadences := v_cadences + 1;
    v_has_specific_schedule := true;
    v_person_id := null;
  end loop;

  if coalesce(p_send_followups, false) and not v_has_specific_schedule then
    insert into public.kwilt_phone_agent_prompts (
      user_id, phone_link_id, activity_id, source_kind, prompt_kind, due_at, body
    ) values (
      v_job.user_id, v_job.phone_link_id, v_activity_id, 'activity', 'followup',
      date_trunc('day', now() + interval '1 day') + interval '9 hours',
      'Did you make progress on "' || left(v_job.prompt, 80) || '"? Reply done, snooze 2d, pause, or not relevant.'
    );
  end if;

  update public.kwilt_agent_channel_jobs
  set legacy_enrichment_at = now(), updated_at = now()
  where id = v_job.id;

  return jsonb_build_object(
    'replayed', false, 'activityId', v_activity_id, 'people', v_people,
    'memories', v_memories, 'events', v_events, 'cadences', v_cadences
  );
end;
$$;

revoke all on function public.enrich_kwilt_agent_channel_activity(uuid, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.enrich_kwilt_agent_channel_activity(uuid, jsonb, boolean)
  to service_role;

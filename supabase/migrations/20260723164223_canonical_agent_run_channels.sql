alter table public.kwilt_agent_messages
  add column origin_channel text not null default 'mobile'
    check (origin_channel in ('mobile', 'sms', 'phone', 'desktop', 'external'));

alter table public.kwilt_agent_runs
  add column origin_channel text not null default 'mobile'
    check (origin_channel in ('mobile', 'sms', 'phone', 'desktop', 'external')),
  add column channel_context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(channel_context) = 'object');

create index kwilt_agent_runs_user_channel_created_idx
  on public.kwilt_agent_runs(user_id, origin_channel, created_at desc);

create or replace function public.enqueue_kwilt_agent_run(
  p_thread_id uuid,
  p_prompt text,
  p_client_request_id text,
  p_origin_channel text,
  p_channel_context jsonb default '{}'::jsonb,
  p_request_class text default 'general',
  p_participating_capabilities text[] default '{}',
  p_context_policy jsonb default '{}'::jsonb,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := case
    when coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then p_user_id
    else (select auth.uid())
  end;
  v_thread public.kwilt_agent_threads%rowtype;
  v_message public.kwilt_agent_messages%rowtype;
  v_run public.kwilt_agent_runs%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_origin_channel not in ('mobile', 'sms', 'phone', 'desktop', 'external') then
    raise exception 'invalid_origin_channel';
  end if;
  if p_prompt is null or char_length(btrim(p_prompt)) < 1 or char_length(p_prompt) > 100000 then
    raise exception 'invalid_prompt';
  end if;
  if p_client_request_id is null or char_length(btrim(p_client_request_id)) < 1
    or char_length(p_client_request_id) > 200 then
    raise exception 'invalid_client_request_id';
  end if;
  if jsonb_typeof(coalesce(p_channel_context, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_channel_context';
  end if;

  select * into v_message
  from public.kwilt_agent_messages as candidate
  where candidate.user_id = v_user_id
    and candidate.client_request_id = p_client_request_id;

  if found then
    select * into v_run
    from public.kwilt_agent_runs as candidate
    where candidate.user_id = v_user_id
      and candidate.user_message_id = v_message.id
    order by candidate.created_at asc
    limit 1;
    if not found then raise exception 'idempotent_message_missing_run'; end if;
    return jsonb_build_object(
      'threadId', v_message.thread_id,
      'messageId', v_message.id,
      'runId', v_run.id,
      'status', v_run.status,
      'version', v_run.version,
      'replayed', true
    );
  end if;

  if p_thread_id is null then
    insert into public.kwilt_agent_threads (user_id, title)
    values (v_user_id, 'New chat')
    returning * into v_thread;
  else
    select * into v_thread
    from public.kwilt_agent_threads as candidate
    where candidate.id = p_thread_id
      and candidate.user_id = v_user_id
      and candidate.status = 'active'
    for update;
    if not found then raise exception 'thread_not_found'; end if;
  end if;

  insert into public.kwilt_agent_messages (
    user_id, thread_id, role, body, client_request_id, origin_channel
  ) values (
    v_user_id, v_thread.id, 'user', btrim(p_prompt), p_client_request_id, p_origin_channel
  ) returning * into v_message;

  insert into public.kwilt_agent_runs (
    user_id, thread_id, user_message_id, status, request_class,
    participating_capabilities, context_policy, origin_channel, channel_context
  ) values (
    v_user_id, v_thread.id, v_message.id, 'queued', p_request_class,
    coalesce(p_participating_capabilities, '{}'), coalesce(p_context_policy, '{}'::jsonb),
    p_origin_channel, coalesce(p_channel_context, '{}'::jsonb)
  ) returning * into v_run;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status,
    visibility, label, payload
  ) values (
    v_user_id, v_thread.id, v_run.id, 1, 'run', 'pending',
    'user', 'Working', jsonb_build_object('originChannel', p_origin_channel)
  );

  update public.kwilt_agent_threads
  set updated_at = now(), version = version + 1
  where id = v_thread.id;

  return jsonb_build_object(
    'threadId', v_thread.id,
    'messageId', v_message.id,
    'runId', v_run.id,
    'status', v_run.status,
    'version', v_run.version,
    'replayed', false
  );
end;
$$;

revoke all on function public.enqueue_kwilt_agent_run(
  uuid, text, text, text, jsonb, text, text[], jsonb, uuid
) from public, anon;
grant execute on function public.enqueue_kwilt_agent_run(
  uuid, text, text, text, jsonb, text, text[], jsonb, uuid
) to authenticated, service_role;

create or replace function public.complete_kwilt_agent_run_with_message(
  p_run_id uuid,
  p_expected_version integer,
  p_body text,
  p_status text default 'complete',
  p_participating_capabilities text[] default '{}',
  p_request_class text default 'general',
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.kwilt_agent_runs%rowtype;
  v_message public.kwilt_agent_messages%rowtype;
  v_sequence integer;
  v_user_id uuid := case
    when coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then p_user_id
    else (select auth.uid())
  end;
begin
  select * into v_run
  from public.kwilt_agent_runs as candidate
  where candidate.id = p_run_id
    and candidate.user_id = v_user_id
  for update;
  if not found then raise exception 'run_not_found'; end if;
  if v_run.status <> 'active' then raise exception 'invalid_run_source_status'; end if;
  if v_run.version <> p_expected_version then raise exception 'stale_run_version'; end if;
  if p_status not in ('complete', 'partial') then raise exception 'invalid_run_completion_status'; end if;
  if p_body is null or char_length(btrim(p_body)) < 1 or char_length(p_body) > 100000 then
    raise exception 'invalid_assistant_message';
  end if;

  insert into public.kwilt_agent_messages (
    user_id, thread_id, role, body, origin_channel
  ) values (
    v_run.user_id, v_run.thread_id, 'assistant', btrim(p_body), v_run.origin_channel
  ) returning * into v_message;

  update public.kwilt_agent_runs
  set status = p_status,
      assistant_message_id = v_message.id,
      completed_at = now(),
      participating_capabilities = coalesce(p_participating_capabilities, '{}'),
      request_class = p_request_class,
      version = version + 1,
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events
  where run_id = v_run.id;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status,
    visibility, label, payload
  ) values (
    v_run.user_id, v_run.thread_id, v_run.id, v_sequence, 'run', 'complete',
    'user', case when p_status = 'partial' then 'Answered with limits' else 'Answered' end,
    jsonb_build_object('originChannel', v_run.origin_channel, 'assistantMessageId', v_message.id)
  );

  update public.kwilt_agent_threads
  set updated_at = now(), version = version + 1
  where id = v_run.thread_id;

  return jsonb_build_object(
    'threadId', v_run.thread_id,
    'runId', v_run.id,
    'messageId', v_message.id,
    'status', v_run.status,
    'version', v_run.version
  );
end;
$$;

revoke all on function public.complete_kwilt_agent_run_with_message(uuid, integer, text, text, text[], text, uuid)
  from public, anon;
grant execute on function public.complete_kwilt_agent_run_with_message(uuid, integer, text, text, text[], text, uuid)
  to authenticated, service_role;

create or replace function public.transition_kwilt_agent_channel_run(
  p_user_id uuid,
  p_run_id uuid,
  p_from_status text,
  p_to_status text,
  p_expected_version integer,
  p_origin_channel text,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.kwilt_agent_runs%rowtype;
  v_sequence integer;
begin
  if p_user_id is null then raise exception 'user_id_required'; end if;
  select * into v_run
  from public.kwilt_agent_runs candidate
  where candidate.id = p_run_id and candidate.user_id = p_user_id
  for update;
  if not found then raise exception 'run_not_found'; end if;
  if v_run.status <> p_from_status then raise exception 'invalid_run_source_status'; end if;
  if v_run.version <> p_expected_version then raise exception 'stale_run_version'; end if;
  if not (
    (p_from_status = 'queued' and p_to_status = 'active')
    or (p_from_status = 'active' and p_to_status = 'failed')
  ) then raise exception 'invalid_channel_run_transition'; end if;

  update public.kwilt_agent_runs
  set status = p_to_status,
      error_code = case when p_to_status = 'failed' then p_error_code else null end,
      error_message = case when p_to_status = 'failed' then p_error_message else null end,
      completed_at = case when p_to_status = 'failed' then now() else null end,
      version = version + 1,
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events where run_id = v_run.id;
  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status,
    visibility, label, payload
  ) values (
    p_user_id, v_run.thread_id, v_run.id, v_sequence, 'run',
    case when p_to_status = 'failed' then 'failed' else 'active' end,
    'user', case when p_to_status = 'failed' then 'Response interrupted' else 'Working' end,
    jsonb_build_object('originChannel', p_origin_channel)
  );
  return to_jsonb(v_run);
end;
$$;

revoke all on function public.transition_kwilt_agent_channel_run(
  uuid, uuid, text, text, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.transition_kwilt_agent_channel_run(
  uuid, uuid, text, text, integer, text, text, text
) to service_role;

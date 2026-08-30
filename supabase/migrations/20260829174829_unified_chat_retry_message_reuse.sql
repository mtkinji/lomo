-- A retry is a new run of the same user turn. Reuse the original user message
-- instead of inserting the same prompt a second time into the durable thread.

create or replace function public.enqueue_kwilt_agent_run_with_provenance(
  p_thread_id uuid,
  p_prompt text,
  p_client_request_id text,
  p_origin_channel text,
  p_channel_context jsonb default '{}'::jsonb,
  p_request_class text default 'general',
  p_participating_capabilities text[] default '{}',
  p_context_policy jsonb default '{}'::jsonb,
  p_user_id uuid default null,
  p_initiator text default 'user',
  p_trigger_kind text default 'user_message',
  p_trigger_id text default null,
  p_parent_run_id uuid default null
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
  v_result jsonb;
  v_run_id uuid;
  v_message_id uuid;
  v_existing public.kwilt_agent_runs%rowtype;
  v_parent public.kwilt_agent_runs%rowtype;
  v_run public.kwilt_agent_runs%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' and p_initiator <> 'user' then
    raise exception 'service_role_required_for_system_trigger';
  end if;
  if p_initiator not in ('user', 'system') then raise exception 'invalid_run_initiator'; end if;
  if p_trigger_kind not in (
    'user_message', 'reminder', 'recurring_kwilt_action', 'monitor',
    'background_analysis', 'native_device_enforcement'
  ) then raise exception 'invalid_run_trigger_kind'; end if;
  if (p_initiator = 'user') <> (p_trigger_kind = 'user_message') then
    raise exception 'invalid_trigger_provenance';
  end if;
  if p_trigger_id is null or char_length(btrim(p_trigger_id)) < 1
    or char_length(p_trigger_id) > 200 then raise exception 'invalid_trigger_id'; end if;
  if p_origin_channel not in ('mobile', 'sms', 'phone', 'desktop', 'external') then
    raise exception 'invalid_origin_channel';
  end if;
  if p_prompt is null or char_length(btrim(p_prompt)) < 1 or char_length(p_prompt) > 100000 then
    raise exception 'invalid_prompt';
  end if;
  if jsonb_typeof(coalesce(p_channel_context, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_channel_context';
  end if;

  select * into v_existing
  from public.kwilt_agent_runs candidate
  where candidate.user_id = v_user_id
    and candidate.trigger_kind = p_trigger_kind
    and candidate.trigger_id = btrim(p_trigger_id);
  if found then
    return jsonb_build_object(
      'threadId', v_existing.thread_id,
      'messageId', v_existing.user_message_id,
      'runId', v_existing.id,
      'status', v_existing.status,
      'version', v_existing.version,
      'replayed', true
    );
  end if;

  if p_parent_run_id is not null then
    select * into v_parent
    from public.kwilt_agent_runs parent
    where parent.id = p_parent_run_id
      and parent.user_id = v_user_id
    for update;
    if not found then raise exception 'parent_run_not_found'; end if;
  end if;

  if p_channel_context #>> '{origin,action}' = 'run.retry' then
    if p_initiator <> 'user' or p_trigger_kind <> 'user_message' then
      raise exception 'invalid_retry_provenance';
    end if;
    if p_parent_run_id is null then raise exception 'retry_parent_required'; end if;
    if v_parent.status <> 'failed' then raise exception 'invalid_retry_parent_status'; end if;
    if p_thread_id is distinct from v_parent.thread_id then raise exception 'retry_thread_mismatch'; end if;

    v_message_id := v_parent.user_message_id;
    if not exists (
      select 1 from public.kwilt_agent_messages message
      where message.id = v_message_id
        and message.user_id = v_user_id
        and message.thread_id = v_parent.thread_id
        and message.role = 'user'
        and message.body = btrim(p_prompt)
    ) then raise exception 'retry_prompt_mismatch'; end if;

    insert into public.kwilt_agent_runs (
      user_id, thread_id, user_message_id, status, request_class,
      participating_capabilities, context_policy, origin_channel, channel_context,
      initiator, trigger_kind, trigger_id, parent_run_id
    ) values (
      v_user_id, v_parent.thread_id, v_message_id, 'queued', p_request_class,
      coalesce(p_participating_capabilities, '{}'), coalesce(p_context_policy, '{}'::jsonb),
      p_origin_channel, coalesce(p_channel_context, '{}'::jsonb),
      p_initiator, p_trigger_kind, btrim(p_trigger_id), p_parent_run_id
    ) returning * into v_run;

    insert into public.kwilt_agent_run_events (
      user_id, thread_id, run_id, sequence, event_type, status,
      visibility, label, payload
    ) values (
      v_user_id, v_parent.thread_id, v_run.id, 1, 'run', 'pending',
      'user', 'Working', jsonb_build_object(
        'originChannel', p_origin_channel,
        'initiator', p_initiator,
        'triggerKind', p_trigger_kind,
        'triggerId', btrim(p_trigger_id),
        'parentRunId', p_parent_run_id
      )
    );

    update public.kwilt_agent_threads
    set updated_at = now(), version = version + 1
    where id = v_parent.thread_id and user_id = v_user_id;

    return jsonb_build_object(
      'threadId', v_parent.thread_id,
      'messageId', v_message_id,
      'runId', v_run.id,
      'status', v_run.status,
      'version', v_run.version,
      'replayed', false
    );
  end if;

  v_result := public.enqueue_kwilt_agent_run(
    p_thread_id, p_prompt, p_client_request_id, p_origin_channel,
    p_channel_context, p_request_class, p_participating_capabilities,
    p_context_policy, v_user_id
  );
  v_run_id := (v_result ->> 'runId')::uuid;

  update public.kwilt_agent_runs
  set initiator = p_initiator,
      trigger_kind = p_trigger_kind,
      trigger_id = btrim(p_trigger_id),
      parent_run_id = p_parent_run_id,
      updated_at = now()
  where id = v_run_id and user_id = v_user_id;

  update public.kwilt_agent_run_events
  set payload = payload || jsonb_build_object(
    'initiator', p_initiator,
    'triggerKind', p_trigger_kind,
    'triggerId', btrim(p_trigger_id),
    'parentRunId', p_parent_run_id
  )
  where run_id = v_run_id and sequence = 1;

  return v_result;
end;
$$;

revoke all on function public.enqueue_kwilt_agent_run_with_provenance(
  uuid, text, text, text, jsonb, text, text[], jsonb, uuid, text, text, text, uuid
) from public, anon;
grant execute on function public.enqueue_kwilt_agent_run_with_provenance(
  uuid, text, text, text, jsonb, text, text[], jsonb, uuid, text, text, text, uuid
) to authenticated, service_role;

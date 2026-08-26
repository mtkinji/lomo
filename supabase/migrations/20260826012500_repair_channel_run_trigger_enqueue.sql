-- Work-continuity made trigger_id required after the original channel enqueue
-- function was created. Supply a valid user-message provenance identity on the
-- initial insert so the provenance wrapper can atomically replace it with the
-- canonical trigger immediately afterward.

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
    participating_capabilities, context_policy, origin_channel, channel_context,
    initiator, trigger_kind, trigger_id
  ) values (
    v_user_id, v_thread.id, v_message.id, 'queued', p_request_class,
    coalesce(p_participating_capabilities, '{}'), coalesce(p_context_policy, '{}'::jsonb),
    p_origin_channel, coalesce(p_channel_context, '{}'::jsonb),
    'user', 'user_message', btrim(p_client_request_id)
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

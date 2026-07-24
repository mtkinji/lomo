create or replace function public.capture_kwilt_agent_activity(
  p_user_id uuid,
  p_thread_id uuid,
  p_run_id uuid,
  p_message_id uuid,
  p_call_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_payload ->> 'title', ''));
  v_goal_id text := nullif(btrim(coalesce(p_payload ->> 'goalId', '')), '');
  v_idempotency_key text := 'server:' || p_run_id::text || ':' || btrim(coalesce(p_call_id, ''));
  v_activity_id text;
  v_timestamp timestamptz := now();
  v_data jsonb;
  v_proposal_id uuid;
  v_operation_id uuid;
  v_receipt public.kwilt_agent_mutation_receipts%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid_activity_payload'; end if;
  if p_payload - array[
    'title', 'notes', 'goalId', 'type', 'status', 'tags', 'priority', 'scheduledDate',
    'reminderAt', 'repeatRule', 'repeatCustom', 'repeatBasis', 'estimateMinutes', 'difficulty'
  ] <> '{}'::jsonb then raise exception 'unsupported_activity_field'; end if;
  if char_length(v_title) < 1 or char_length(v_title) > 240 then raise exception 'invalid_activity_title'; end if;
  if p_call_id is null or char_length(btrim(p_call_id)) < 1 or char_length(p_call_id) > 120 then
    raise exception 'invalid_tool_call_id';
  end if;
  if not exists (
    select 1 from public.kwilt_agent_runs candidate
    where candidate.id = p_run_id and candidate.user_id = p_user_id
      and candidate.thread_id = p_thread_id and candidate.user_message_id = p_message_id
      and candidate.status = 'active'
  ) then raise exception 'active_run_not_found'; end if;
  if v_goal_id is not null and not exists (
    select 1 from public.kwilt_goals candidate
    where candidate.id = v_goal_id and candidate.user_id = p_user_id and candidate.is_deleted = false
  ) then raise exception 'goal_not_found'; end if;

  select * into v_receipt
  from public.kwilt_agent_mutation_receipts candidate
  where candidate.user_id = p_user_id and candidate.capability_id = 'todos'
    and candidate.idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', v_receipt.status,
      'activityId', v_receipt.resulting_object_id,
      'receiptId', v_receipt.id,
      'resultState', v_receipt.result_state,
      'replayed', true
    );
  end if;

  v_activity_id := 'activity_' || gen_random_uuid()::text;
  v_data := jsonb_strip_nulls(jsonb_build_object(
    'id', v_activity_id,
    'title', v_title,
    'notes', p_payload -> 'notes',
    'goalId', case when v_goal_id is null then 'null'::jsonb else to_jsonb(v_goal_id) end,
    'type', coalesce(p_payload ->> 'type', 'task'),
    'status', coalesce(p_payload ->> 'status', 'planned'),
    'tags', coalesce(p_payload -> 'tags', '[]'::jsonb),
    'priority', p_payload -> 'priority',
    'scheduledDate', p_payload -> 'scheduledDate',
    'reminderAt', p_payload -> 'reminderAt',
    'repeatRule', p_payload -> 'repeatRule',
    'repeatCustom', p_payload -> 'repeatCustom',
    'repeatBasis', p_payload -> 'repeatBasis',
    'estimateMinutes', p_payload -> 'estimateMinutes',
    'difficulty', p_payload -> 'difficulty',
    'forceActual', jsonb_build_object(
      'force-activity', 0, 'force-connection', 0, 'force-mastery', 0, 'force-spirituality', 0
    ),
    'createdAt', to_jsonb(v_timestamp),
    'updatedAt', to_jsonb(v_timestamp)
  ));

  insert into public.kwilt_agent_proposals (
    user_id, thread_id, run_id, message_id, capability_id, title, body, status,
    permission_policy, decided_at, applied_at
  ) values (
    p_user_id, p_thread_id, p_run_id, p_message_id, 'todos', 'Add ' || v_title,
    'Creates this To-do through Kwilt.', 'applied',
    jsonb_build_object('confirmation', 'none', 'autoApplied', true), v_timestamp, v_timestamp
  ) returning id into v_proposal_id;

  insert into public.kwilt_agent_proposal_operations (
    user_id, proposal_id, capability_id, operation_type, target_type, target_id,
    summary, payload, idempotency_key, sequence
  ) values (
    p_user_id, v_proposal_id, 'todos', 'create_activity', 'activity', v_activity_id,
    'Create To-do ' || v_title, p_payload, v_idempotency_key, 1
  ) returning id into v_operation_id;

  insert into public.kwilt_activities (user_id, id, data, created_at, updated_at, is_deleted, deleted_at)
  values (p_user_id, v_activity_id, v_data, v_timestamp, v_timestamp, false, null);

  insert into public.kwilt_agent_mutation_receipts (
    user_id, thread_id, proposal_id, operation_id, capability_id, idempotency_key,
    status, resulting_object_type, resulting_object_id, result_state, return_target,
    undo_operation, applied_at
  ) values (
    p_user_id, p_thread_id, v_proposal_id, v_operation_id, 'todos', v_idempotency_key,
    'applied', 'activity', v_activity_id, v_data,
    jsonb_build_object('screen', 'ActivityDetail', 'params', jsonb_build_object('activityId', v_activity_id)),
    jsonb_build_object(
      'type', 'delete_activity', 'targetId', v_activity_id, 'expectedUpdatedAt', v_timestamp,
      'payload', '{}'::jsonb
    ), v_timestamp
  ) returning * into v_receipt;

  return jsonb_build_object(
    'status', v_receipt.status,
    'activityId', v_activity_id,
    'receiptId', v_receipt.id,
    'resultState', v_data,
    'replayed', false
  );
end;
$$;

revoke all on function public.capture_kwilt_agent_activity(uuid, uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.capture_kwilt_agent_activity(uuid, uuid, uuid, uuid, text, jsonb)
  to service_role;

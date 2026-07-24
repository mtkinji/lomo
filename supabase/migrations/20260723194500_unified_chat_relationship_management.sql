-- Capability-owned correction and forgetting for explicit relationship memory.
-- Mobile Chat and cross-channel agents both enter through the same service-only
-- transaction, existing People/Memory/Event/Cadence tables, and trust records.

create or replace function public.manage_kwilt_agent_relationship(
  p_user_id uuid,
  p_thread_id uuid,
  p_run_id uuid,
  p_message_id uuid,
  p_call_id text,
  p_action text,
  p_record_type text,
  p_record_id uuid,
  p_expected_updated_at timestamptz,
  p_fields jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timestamp timestamptz := now();
  v_idempotency_key text := 'server:' || p_run_id::text || ':' || btrim(coalesce(p_call_id, ''));
  v_origin_channel text;
  v_before jsonb;
  v_after jsonb;
  v_person_id uuid;
  v_current_updated_at timestamptz;
  v_proposal_id uuid;
  v_operation_id uuid;
  v_receipt public.kwilt_agent_mutation_receipts%rowtype;
  v_summary text;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null or p_record_id is null or p_expected_updated_at is null then
    raise exception 'relationship_target_required';
  end if;
  if p_action not in ('correct', 'forget') then raise exception 'unsupported_relationship_action'; end if;
  if p_record_type not in ('memory', 'event', 'cadence') then raise exception 'unsupported_relationship_record_type'; end if;
  if p_call_id is null or char_length(btrim(p_call_id)) < 1 or char_length(p_call_id) > 120 then
    raise exception 'invalid_tool_call_id';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then raise exception 'invalid_relationship_fields'; end if;
  if p_action = 'forget' and p_fields <> '{}'::jsonb then raise exception 'forget_fields_not_allowed'; end if;
  if p_action = 'correct' and p_fields = '{}'::jsonb then raise exception 'relationship_correction_required'; end if;

  select candidate.origin_channel into v_origin_channel
  from public.kwilt_agent_runs candidate
  where candidate.id = p_run_id and candidate.user_id = p_user_id
    and candidate.thread_id = p_thread_id and candidate.user_message_id = p_message_id
    and candidate.status = 'active';
  if not found then raise exception 'active_run_not_found'; end if;

  select * into v_receipt
  from public.kwilt_agent_mutation_receipts candidate
  where candidate.user_id = p_user_id and candidate.capability_id = 'relationships'
    and candidate.idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'status', v_receipt.status,
      'recordType', v_receipt.result_state ->> 'recordType',
      'recordId', v_receipt.resulting_object_id,
      'receiptId', v_receipt.id,
      'replayed', true
    );
  end if;

  if p_record_type = 'memory' then
    select to_jsonb(memory_row), memory_row.person_id, memory_row.updated_at
      into v_before, v_person_id, v_current_updated_at
    from public.kwilt_phone_agent_memory_items memory_row
    where memory_row.id = p_record_id and memory_row.user_id = p_user_id and memory_row.status = 'active'
    for update;
  elsif p_record_type = 'event' then
    select to_jsonb(event_row), event_row.person_id, event_row.updated_at
      into v_before, v_person_id, v_current_updated_at
    from public.kwilt_phone_agent_events event_row
    where event_row.id = p_record_id and event_row.user_id = p_user_id and event_row.status = 'active'
    for update;
  else
    select to_jsonb(cadence_row), cadence_row.person_id, cadence_row.updated_at
      into v_before, v_person_id, v_current_updated_at
    from public.kwilt_phone_agent_cadences cadence_row
    where cadence_row.id = p_record_id and cadence_row.user_id = p_user_id and cadence_row.status = 'active'
    for update;
  end if;
  if v_before is null then raise exception 'relationship_record_not_found'; end if;
  if v_current_updated_at <> p_expected_updated_at then raise exception 'stale_relationship_record'; end if;

  if p_action = 'correct' and p_record_type = 'memory' then
    if p_fields - array['kind', 'text'] <> '{}'::jsonb
      or (p_fields ? 'kind' and coalesce(p_fields ->> 'kind', '') not in ('preference', 'constraint', 'note', 'sensitivity', 'milestone'))
      or (p_fields ? 'text' and (jsonb_typeof(p_fields -> 'text') <> 'string'
        or char_length(btrim(coalesce(p_fields ->> 'text', ''))) not between 1 and 5000)) then
      raise exception 'invalid_relationship_memory_correction';
    end if;
    update public.kwilt_phone_agent_memory_items
    set kind = case when p_fields ? 'kind' then p_fields ->> 'kind' else kind end,
        text = case when p_fields ? 'text' then btrim(p_fields ->> 'text') else text end,
        updated_at = v_timestamp
    where id = p_record_id and user_id = p_user_id;
    select to_jsonb(memory_row) into v_after from public.kwilt_phone_agent_memory_items memory_row
    where memory_row.id = p_record_id and memory_row.user_id = p_user_id;
  elsif p_action = 'correct' and p_record_type = 'event' then
    if p_fields - array['kind', 'title', 'dateText', 'startsAt', 'timeZone'] <> '{}'::jsonb
      or (p_fields ? 'kind' and coalesce(p_fields ->> 'kind', '') not in ('birthday', 'gathering', 'deadline', 'post_event', 'other'))
      or (p_fields ? 'title' and (jsonb_typeof(p_fields -> 'title') <> 'string'
        or char_length(btrim(coalesce(p_fields ->> 'title', ''))) not between 1 and 500))
      or (p_fields ? 'dateText' and (jsonb_typeof(p_fields -> 'dateText') not in ('string', 'null')
        or char_length(coalesce(p_fields ->> 'dateText', '')) > 160))
      or (p_fields ? 'startsAt' and jsonb_typeof(p_fields -> 'startsAt') not in ('string', 'null'))
      or (p_fields ? 'timeZone' and (jsonb_typeof(p_fields -> 'timeZone') not in ('string', 'null')
        or char_length(coalesce(p_fields ->> 'timeZone', '')) > 100)) then
      raise exception 'invalid_relationship_event_correction';
    end if;
    update public.kwilt_phone_agent_events
    set kind = case when p_fields ? 'kind' then p_fields ->> 'kind' else kind end,
        title = case when p_fields ? 'title' then btrim(p_fields ->> 'title') else title end,
        date_text = case when p_fields ? 'dateText' then nullif(btrim(coalesce(p_fields ->> 'dateText', '')), '') else date_text end,
        starts_at = case when p_fields ? 'startsAt' then
          case when nullif(p_fields ->> 'startsAt', '') is null then null else (p_fields ->> 'startsAt')::timestamptz end
          else starts_at end,
        timezone = case when p_fields ? 'timeZone' then nullif(btrim(coalesce(p_fields ->> 'timeZone', '')), '') else timezone end,
        updated_at = v_timestamp
    where id = p_record_id and user_id = p_user_id;
    select to_jsonb(event_row) into v_after from public.kwilt_phone_agent_events event_row
    where event_row.id = p_record_id and event_row.user_id = p_user_id;
  elsif p_action = 'correct' and p_record_type = 'cadence' then
    if p_fields - array['kind', 'intervalDays', 'nextDueAt'] <> '{}'::jsonb
      or (p_fields ? 'kind' and coalesce(p_fields ->> 'kind', '') not in ('drift', 'recurring_followup', 'other'))
      or (p_fields ? 'intervalDays' and (coalesce(p_fields ->> 'intervalDays', '') !~ '^\d{1,3}$'
        or (p_fields ->> 'intervalDays')::integer not between 1 and 730))
      or (p_fields ? 'nextDueAt' and jsonb_typeof(p_fields -> 'nextDueAt') not in ('string', 'null')) then
      raise exception 'invalid_relationship_cadence_correction';
    end if;
    update public.kwilt_phone_agent_cadences
    set kind = case when p_fields ? 'kind' then p_fields ->> 'kind' else kind end,
        interval_days = case when p_fields ? 'intervalDays' then (p_fields ->> 'intervalDays')::integer else interval_days end,
        next_due_at = case when p_fields ? 'nextDueAt' then
          case when nullif(p_fields ->> 'nextDueAt', '') is null then null else (p_fields ->> 'nextDueAt')::timestamptz end
          else next_due_at end,
        updated_at = v_timestamp
    where id = p_record_id and user_id = p_user_id;
    select to_jsonb(cadence_row) into v_after from public.kwilt_phone_agent_cadences cadence_row
    where cadence_row.id = p_record_id and cadence_row.user_id = p_user_id;
  elsif p_record_type = 'memory' then
    update public.kwilt_phone_agent_memory_items
    set status = 'inactive', updated_at = v_timestamp
    where id = p_record_id and user_id = p_user_id;
    select to_jsonb(memory_row) into v_after from public.kwilt_phone_agent_memory_items memory_row
    where memory_row.id = p_record_id and memory_row.user_id = p_user_id;
  elsif p_record_type = 'event' then
    update public.kwilt_phone_agent_events
    set status = 'inactive', updated_at = v_timestamp
    where id = p_record_id and user_id = p_user_id;
    select to_jsonb(event_row) into v_after from public.kwilt_phone_agent_events event_row
    where event_row.id = p_record_id and event_row.user_id = p_user_id;
  else
    update public.kwilt_phone_agent_cadences
    set status = 'inactive', updated_at = v_timestamp
    where id = p_record_id and user_id = p_user_id;
    select to_jsonb(cadence_row) into v_after from public.kwilt_phone_agent_cadences cadence_row
    where cadence_row.id = p_record_id and cadence_row.user_id = p_user_id;
  end if;

  v_summary := case when p_action = 'correct' then 'Correct saved ' else 'Forget saved ' end
    || p_record_type;
  insert into public.kwilt_agent_proposals (
    user_id, thread_id, run_id, message_id, capability_id, title, body, status,
    permission_policy, decided_at, applied_at
  ) values (
    p_user_id, p_thread_id, p_run_id, p_message_id, 'relationships', v_summary,
    case when p_action = 'correct' then 'Corrects only the explicitly identified saved detail.'
      else 'Stops Kwilt from using the explicitly identified saved detail.' end,
    'applied', jsonb_build_object('confirmation', 'none', 'autoApplied', true), v_timestamp, v_timestamp
  ) returning id into v_proposal_id;

  insert into public.kwilt_agent_proposal_operations (
    user_id, proposal_id, capability_id, operation_type, target_type, target_id,
    summary, payload, idempotency_key, sequence
  ) values (
    p_user_id, v_proposal_id, 'relationships', p_action || '_relationship', p_record_type, p_record_id::text,
    v_summary, jsonb_build_object('fields', p_fields, 'expectedUpdatedAt', p_expected_updated_at),
    v_idempotency_key, 1
  ) returning id into v_operation_id;

  insert into public.kwilt_agent_mutation_receipts (
    user_id, thread_id, proposal_id, operation_id, capability_id, idempotency_key,
    status, resulting_object_type, resulting_object_id, result_state, return_target,
    undo_operation, applied_at
  ) values (
    p_user_id, p_thread_id, v_proposal_id, v_operation_id, 'relationships', v_idempotency_key,
    'applied', 'relationship_' || p_record_type, p_record_id::text,
    jsonb_build_object('recordType', p_record_type, 'recordId', p_record_id, 'before', v_before, 'after', v_after),
    jsonb_build_object('screen', 'UnifiedChat', 'threadId', p_thread_id),
    jsonb_build_object(
      'type', 'restore_relationship_record',
      'recordType', p_record_type,
      'recordId', p_record_id,
      'before', v_before,
      'expectedUpdatedAt', v_timestamp
    ),
    v_timestamp
  ) returning * into v_receipt;

  insert into public.kwilt_phone_agent_action_log (
    user_id, channel, action_type, person_id, input_summary, output_summary, permission_used
  ) values (
    p_user_id,
    case when v_origin_channel = 'phone' then 'voice' when v_origin_channel = 'sms' then 'sms' else 'app' end,
    'relationship_memory_' || case when p_action = 'correct' then 'corrected' else 'forgotten' end,
    v_person_id, v_summary, p_record_type || ':' || p_record_id::text,
    case when v_origin_channel in ('phone', 'sms') then 'remember_relationships' else null end
  );

  return jsonb_build_object(
    'status', 'applied', 'recordType', p_record_type, 'recordId', p_record_id,
    'receiptId', v_receipt.id, 'replayed', false
  );
end;
$$;

revoke all on function public.manage_kwilt_agent_relationship(
  uuid, uuid, uuid, uuid, text, text, text, uuid, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.manage_kwilt_agent_relationship(
  uuid, uuid, uuid, uuid, text, text, text, uuid, timestamptz, jsonb
) to service_role;

create or replace function public.undo_kwilt_agent_relationship(
  p_user_id uuid,
  p_receipt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timestamp timestamptz := now();
  v_receipt public.kwilt_agent_mutation_receipts%rowtype;
  v_proposal public.kwilt_agent_proposals%rowtype;
  v_undo jsonb;
  v_before jsonb;
  v_record_type text;
  v_record_id uuid;
  v_expected_updated_at timestamptz;
  v_current_updated_at timestamptz;
  v_person_id uuid;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null or p_receipt_id is null then raise exception 'relationship_undo_target_required'; end if;

  select * into v_receipt
  from public.kwilt_agent_mutation_receipts candidate
  where candidate.id = p_receipt_id and candidate.user_id = p_user_id
    and candidate.capability_id = 'relationships'
  for update;
  if not found then raise exception 'relationship_receipt_not_found'; end if;
  if v_receipt.status = 'undone' then
    return jsonb_build_object(
      'status', 'undone', 'receiptId', v_receipt.id, 'proposalId', v_receipt.proposal_id,
      'undoneAt', v_receipt.undone_at, 'replayed', true
    );
  end if;
  if v_receipt.status <> 'applied' then raise exception 'relationship_receipt_not_applied'; end if;

  v_undo := v_receipt.undo_operation;
  if v_undo is null or jsonb_typeof(v_undo) <> 'object'
    or v_undo ->> 'type' <> 'restore_relationship_record'
    or v_undo ->> 'recordType' not in ('memory', 'event', 'cadence')
    or v_undo ->> 'recordId' is null
    or v_undo ->> 'expectedUpdatedAt' is null
    or jsonb_typeof(v_undo -> 'before') <> 'object' then
    raise exception 'relationship_receipt_not_reversible';
  end if;
  v_record_type := v_undo ->> 'recordType';
  v_record_id := (v_undo ->> 'recordId')::uuid;
  v_expected_updated_at := (v_undo ->> 'expectedUpdatedAt')::timestamptz;
  v_before := v_undo -> 'before';
  if v_receipt.resulting_object_id <> v_record_id::text then raise exception 'relationship_undo_target_mismatch'; end if;

  select * into v_proposal
  from public.kwilt_agent_proposals candidate
  where candidate.id = v_receipt.proposal_id and candidate.user_id = p_user_id
    and candidate.capability_id = 'relationships'
  for update;
  if not found or v_proposal.status <> 'applied' then raise exception 'relationship_proposal_not_applied'; end if;

  if v_record_type = 'memory' then
    select memory_row.updated_at, memory_row.person_id
      into v_current_updated_at, v_person_id
    from public.kwilt_phone_agent_memory_items memory_row
    where memory_row.id = v_record_id and memory_row.user_id = p_user_id
    for update;
    if not found then raise exception 'relationship_record_not_found'; end if;
    if v_current_updated_at <> v_expected_updated_at then raise exception 'stale_relationship_undo'; end if;
    update public.kwilt_phone_agent_memory_items
    set kind = v_before ->> 'kind', text = v_before ->> 'text',
        status = v_before ->> 'status', updated_at = v_timestamp
    where id = v_record_id and user_id = p_user_id;
  elsif v_record_type = 'event' then
    select event_row.updated_at, event_row.person_id
      into v_current_updated_at, v_person_id
    from public.kwilt_phone_agent_events event_row
    where event_row.id = v_record_id and event_row.user_id = p_user_id
    for update;
    if not found then raise exception 'relationship_record_not_found'; end if;
    if v_current_updated_at <> v_expected_updated_at then raise exception 'stale_relationship_undo'; end if;
    update public.kwilt_phone_agent_events
    set kind = v_before ->> 'kind', title = v_before ->> 'title',
        date_text = nullif(v_before ->> 'date_text', ''),
        starts_at = case when v_before ->> 'starts_at' is null then null
          else (v_before ->> 'starts_at')::timestamptz end,
        timezone = nullif(v_before ->> 'timezone', ''),
        status = v_before ->> 'status', updated_at = v_timestamp
    where id = v_record_id and user_id = p_user_id;
  else
    select cadence_row.updated_at, cadence_row.person_id
      into v_current_updated_at, v_person_id
    from public.kwilt_phone_agent_cadences cadence_row
    where cadence_row.id = v_record_id and cadence_row.user_id = p_user_id
    for update;
    if not found then raise exception 'relationship_record_not_found'; end if;
    if v_current_updated_at <> v_expected_updated_at then raise exception 'stale_relationship_undo'; end if;
    update public.kwilt_phone_agent_cadences
    set kind = v_before ->> 'kind', interval_days = (v_before ->> 'interval_days')::integer,
        next_due_at = case when v_before ->> 'next_due_at' is null then null
          else (v_before ->> 'next_due_at')::timestamptz end,
        status = v_before ->> 'status', updated_at = v_timestamp
    where id = v_record_id and user_id = p_user_id;
  end if;

  update public.kwilt_agent_mutation_receipts
  set status = 'undone', undone_at = v_timestamp, updated_at = v_timestamp
  where id = v_receipt.id and user_id = p_user_id;
  update public.kwilt_agent_proposals
  set status = 'undone', version = version + 1, updated_at = v_timestamp
  where id = v_proposal.id and user_id = p_user_id;

  insert into public.kwilt_phone_agent_action_log (
    user_id, channel, action_type, person_id, input_summary, output_summary
  ) values (
    p_user_id, 'app', 'relationship_memory_restored', v_person_id,
    'Undo relationship ' || v_record_type, v_record_type || ':' || v_record_id::text
  );

  return jsonb_build_object(
    'status', 'undone', 'receiptId', v_receipt.id, 'proposalId', v_proposal.id,
    'undoneAt', v_timestamp, 'replayed', false
  );
end;
$$;

revoke all on function public.undo_kwilt_agent_relationship(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.undo_kwilt_agent_relationship(uuid, uuid)
  to service_role;

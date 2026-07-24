-- Canonical server channels stage the same durable proposals consumed by mobile Chat.
-- The owning mobile capability remains responsible for approval, apply, receipts, and undo.

create or replace function public.stage_kwilt_agent_proposal(
  p_user_id uuid,
  p_thread_id uuid,
  p_run_id uuid,
  p_message_id uuid,
  p_call_id text,
  p_capability_id text,
  p_title text,
  p_body text,
  p_operation_type text,
  p_target_type text,
  p_target_id text,
  p_summary text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.kwilt_agent_runs%rowtype;
  v_existing public.kwilt_agent_proposals%rowtype;
  v_proposal public.kwilt_agent_proposals%rowtype;
  v_idempotency_key text;
  v_sequence integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_user_id is null or p_thread_id is null or p_run_id is null or p_message_id is null then
    raise exception 'proposal_stage_identity_required';
  end if;
  if coalesce(char_length(trim(p_call_id)), 0) = 0
    or coalesce(char_length(trim(p_capability_id)), 0) = 0
    or coalesce(char_length(trim(p_title)), 0) = 0
    or coalesce(char_length(trim(p_operation_type)), 0) = 0
    or coalesce(char_length(trim(p_summary)), 0) = 0 then
    raise exception 'proposal_stage_fields_required';
  end if;
  if char_length(p_title) > 500 or char_length(p_summary) > 1000 then
    raise exception 'proposal_stage_fields_too_long';
  end if;

  select candidate.* into v_run
  from public.kwilt_agent_runs as candidate
  where candidate.id = p_run_id
    and candidate.user_id = p_user_id
    and candidate.thread_id = p_thread_id
    and candidate.user_message_id = p_message_id
  for update;
  if not found then raise exception 'proposal_stage_run_not_found'; end if;

  v_idempotency_key := 'server:' || p_run_id::text || ':' || md5(trim(p_call_id));
  select proposal.* into v_existing
  from public.kwilt_agent_proposal_operations as operation
  join public.kwilt_agent_proposals as proposal on proposal.id = operation.proposal_id
  where operation.user_id = p_user_id
    and operation.capability_id = trim(p_capability_id)
    and operation.idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'status', v_existing.status,
      'version', v_existing.version,
      'replayed', true
    );
  end if;

  if v_run.status <> 'active' then raise exception 'proposal_stage_run_not_active'; end if;
  if not exists (
    select 1 from public.kwilt_agent_messages as message
    where message.id = p_message_id
      and message.user_id = p_user_id
      and message.thread_id = p_thread_id
  ) then
    raise exception 'proposal_stage_message_not_found';
  end if;

  insert into public.kwilt_agent_proposals (
    user_id, thread_id, run_id, message_id, capability_id, title, body, status, permission_policy
  ) values (
    p_user_id, p_thread_id, p_run_id, p_message_id, trim(p_capability_id), trim(p_title),
    coalesce(p_body, ''), 'pending', jsonb_build_object('requiresExplicitApproval', true)
  ) returning * into v_proposal;

  insert into public.kwilt_agent_proposal_operations (
    user_id, proposal_id, capability_id, operation_type, target_type, target_id,
    summary, payload, idempotency_key, sequence
  ) values (
    p_user_id, v_proposal.id, trim(p_capability_id), trim(p_operation_type),
    nullif(trim(coalesce(p_target_type, '')), ''), nullif(trim(coalesce(p_target_id, '')), ''),
    trim(p_summary), coalesce(p_payload, '{}'::jsonb), v_idempotency_key, 1
  );

  select coalesce(max(event.sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events as event
  where event.run_id = p_run_id;
  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, event_type, label, status, payload, sequence
  ) values (
    p_user_id, p_thread_id, p_run_id, 'proposal_staged', trim(p_title), 'complete',
    jsonb_build_object(
      'proposalId', v_proposal.id,
      'capabilityId', trim(p_capability_id),
      'operationType', trim(p_operation_type),
      'callId', trim(p_call_id)
    ),
    v_sequence
  );

  return jsonb_build_object(
    'id', v_proposal.id,
    'status', v_proposal.status,
    'version', v_proposal.version,
    'replayed', false
  );
end;
$$;

revoke all on function public.stage_kwilt_agent_proposal(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.stage_kwilt_agent_proposal(
  uuid, uuid, uuid, uuid, text, text, text, text, text, text, text, text, jsonb
) to service_role;

-- Make terminal run changes and proposal lifecycle changes atomic with the
-- ordered user-legible event stream. Locking the parent run serializes event
-- sequence allocation so concurrent or replayed commands cannot produce a
-- contradictory snapshot.

create or replace function public.transition_kwilt_agent_run(
  p_run_id uuid,
  p_from_status text,
  p_to_status text,
  p_expected_version integer,
  p_event_type text,
  p_event_status text,
  p_event_visibility text,
  p_event_label text default null,
  p_event_detail text default null,
  p_event_payload jsonb default '{}'::jsonb,
  p_assistant_message_id uuid default null,
  p_error_code text default null,
  p_error_message text default null,
  p_completed_at timestamptz default null,
  p_stop_requested_at timestamptz default null,
  p_steer_count integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_run public.kwilt_agent_runs%rowtype;
  v_sequence integer;
begin
  select * into v_run
  from public.kwilt_agent_runs as candidate
  where candidate.id = p_run_id
    and candidate.user_id = (select auth.uid())
  for update;

  if not found then raise exception 'run_not_found'; end if;
  if v_run.status <> p_from_status then raise exception 'invalid_run_source_status'; end if;
  if v_run.version <> p_expected_version then raise exception 'stale_run_version'; end if;
  if p_event_status not in ('pending', 'active', 'complete', 'warning', 'failed') then
    raise exception 'invalid_run_event_status';
  end if;
  if p_event_visibility not in ('internal', 'user') then
    raise exception 'invalid_run_event_visibility';
  end if;
  if not (
    (v_run.status = 'queued' and p_to_status in ('active', 'stopped', 'failed'))
    or (v_run.status = 'active' and p_to_status in ('steered', 'partial', 'stopped', 'complete', 'failed'))
    or (v_run.status = 'steered' and p_to_status in ('active', 'partial', 'stopped', 'complete', 'failed'))
    or (v_run.status = 'partial' and p_to_status in ('active', 'stopped', 'complete', 'failed'))
  ) then
    raise exception 'invalid_run_transition';
  end if;

  update public.kwilt_agent_runs
  set status = p_to_status,
      assistant_message_id = p_assistant_message_id,
      error_code = p_error_code,
      error_message = p_error_message,
      completed_at = p_completed_at,
      stop_requested_at = p_stop_requested_at,
      steer_count = coalesce(p_steer_count, steer_count),
      version = version + 1,
      updated_at = now()
  where id = v_run.id
  returning * into v_run;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events
  where run_id = v_run.id;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status,
    visibility, label, detail, payload
  ) values (
    (select auth.uid()), v_run.thread_id, v_run.id, v_sequence, p_event_type,
    p_event_status, p_event_visibility, p_event_label, p_event_detail,
    coalesce(p_event_payload, '{}'::jsonb)
  );

  return to_jsonb(v_run);
end;
$$;

revoke all on function public.transition_kwilt_agent_run(
  uuid, text, text, integer, text, text, text, text, text, jsonb,
  uuid, text, text, timestamptz, timestamptz, integer
) from public, anon;
grant execute on function public.transition_kwilt_agent_run(
  uuid, text, text, integer, text, text, text, text, text, jsonb,
  uuid, text, text, timestamptz, timestamptz, integer
) to authenticated;

create or replace function public.transition_kwilt_agent_proposal(
  p_proposal_id uuid,
  p_from_status text,
  p_to_status text,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_proposal public.kwilt_agent_proposals%rowtype;
  v_sequence integer;
  v_event_status text;
begin
  select * into v_proposal
  from public.kwilt_agent_proposals as candidate
  where candidate.id = p_proposal_id
    and candidate.user_id = (select auth.uid())
  for update;

  if not found then raise exception 'proposal_not_found'; end if;
  if v_proposal.status <> p_from_status then raise exception 'invalid_proposal_source_status'; end if;
  if v_proposal.version <> p_expected_version then raise exception 'stale_proposal_version'; end if;
  if not (
    (v_proposal.status = 'approved' and p_to_status = 'applying')
    or (v_proposal.status = 'applying' and p_to_status in ('applied', 'failed'))
    or (v_proposal.status = 'applied' and p_to_status = 'undone')
  ) then
    raise exception 'invalid_proposal_transition';
  end if;

  perform 1
  from public.kwilt_agent_runs as run
  where run.id = v_proposal.run_id
    and run.user_id = (select auth.uid())
  for update;
  if not found then raise exception 'run_not_found'; end if;

  update public.kwilt_agent_proposals
  set status = p_to_status,
      version = version + 1,
      applied_at = case when p_to_status = 'applied' then now() else applied_at end,
      updated_at = now()
  where id = v_proposal.id
  returning * into v_proposal;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events
  where run_id = v_proposal.run_id;

  v_event_status := case
    when p_to_status = 'failed' then 'failed'
    when p_to_status in ('applying') then 'active'
    else 'complete'
  end;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status,
    visibility, label, payload
  ) values (
    (select auth.uid()), v_proposal.thread_id, v_proposal.run_id, v_sequence,
    'proposal', v_event_status, 'user',
    case p_to_status
      when 'applying' then 'Applying approved change'
      when 'applied' then 'Approved change applied'
      when 'failed' then 'Approved change could not be applied'
      when 'undone' then 'Change undone'
    end,
    jsonb_build_object(
      'proposalId', v_proposal.id,
      'fromStatus', p_from_status,
      'toStatus', p_to_status,
      'version', v_proposal.version
    )
  );

  return jsonb_build_object(
    'id', v_proposal.id,
    'status', v_proposal.status,
    'version', v_proposal.version
  );
end;
$$;

revoke all on function public.transition_kwilt_agent_proposal(uuid, text, text, integer)
  from public, anon;
grant execute on function public.transition_kwilt_agent_proposal(uuid, text, text, integer)
  to authenticated;

create or replace function public.decide_kwilt_agent_proposal(
  p_proposal_id uuid,
  p_action text,
  p_expected_version integer,
  p_patch jsonb default '{}'::jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proposal public.kwilt_agent_proposals%rowtype;
  next_status text;
  v_sequence integer;
begin
  select * into proposal
  from public.kwilt_agent_proposals as candidate
  where candidate.id = p_proposal_id
    and candidate.user_id = (select auth.uid())
  for update;

  if not found then raise exception 'proposal_not_found'; end if;
  if proposal.version <> p_expected_version then raise exception 'stale_proposal_version'; end if;
  if p_action not in ('edit', 'reject', 'defer', 'approve') then raise exception 'invalid_proposal_action'; end if;

  next_status := case p_action
    when 'edit' then 'edited'
    when 'reject' then 'rejected'
    when 'defer' then 'deferred'
    when 'approve' then 'approved'
  end;

  if not (
    (proposal.status in ('pending', 'edited') and next_status in ('edited', 'rejected', 'deferred', 'approved'))
    or (proposal.status = 'deferred' and next_status in ('edited', 'rejected', 'approved'))
    or (proposal.status = 'failed' and next_status = 'approved')
  ) then
    raise exception 'invalid_proposal_transition';
  end if;

  if p_action = 'edit' then
    if jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
      raise exception 'empty_proposal_patch';
    end if;
    if exists (
      select 1 from jsonb_object_keys(p_patch) as patch_key
      where patch_key not in (
        'title', 'notes', 'goalId', 'type', 'status', 'tags',
        'priority', 'scheduledDate', 'estimateMinutes', 'difficulty'
      )
    ) then
      raise exception 'unsupported_proposal_patch';
    end if;
    update public.kwilt_agent_proposal_operations
    set payload = payload || p_patch
    where proposal_id = proposal.id
      and user_id = (select auth.uid());
  end if;

  perform 1
  from public.kwilt_agent_runs as run
  where run.id = proposal.run_id
    and run.user_id = (select auth.uid())
  for update;
  if not found then raise exception 'run_not_found'; end if;

  insert into public.kwilt_agent_decisions (
    user_id, proposal_id, action, proposal_version, patch, note
  ) values (
    (select auth.uid()), proposal.id, p_action, proposal.version, p_patch, p_note
  );

  update public.kwilt_agent_proposals
  set status = next_status,
      version = version + 1,
      decided_at = case when p_action in ('reject', 'approve') then now() else decided_at end,
      updated_at = now()
  where id = proposal.id;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events
  where run_id = proposal.run_id;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status,
    visibility, label, payload
  ) values (
    (select auth.uid()), proposal.thread_id, proposal.run_id, v_sequence,
    'proposal',
    case when p_action in ('reject', 'defer') then 'warning' else 'complete' end,
    'user',
    case p_action
      when 'edit' then 'Proposed change edited'
      when 'reject' then 'Proposed change rejected'
      when 'defer' then 'Proposed change deferred'
      when 'approve' then 'Proposed change approved'
    end,
    jsonb_build_object(
      'proposalId', proposal.id,
      'fromStatus', proposal.status,
      'toStatus', next_status,
      'version', proposal.version + 1
    )
  );

  return jsonb_build_object(
    'id', proposal.id,
    'status', next_status,
    'version', proposal.version + 1
  );
end;
$$;

revoke all on function public.decide_kwilt_agent_proposal(uuid, text, integer, jsonb, text)
  from public, anon;
grant execute on function public.decide_kwilt_agent_proposal(uuid, text, integer, jsonb, text)
  to authenticated;

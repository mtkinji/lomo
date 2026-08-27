create or replace function public.append_kwilt_agent_turn_planning_events(
  p_user_id uuid,
  p_run_id uuid,
  p_selected_namespaces text[],
  p_planner_confidence numeric,
  p_planner_reason text,
  p_authorization jsonb,
  p_allowed_effects text[],
  p_allowed_tool_ids text[],
  p_unresolved_references text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.kwilt_agent_runs%rowtype;
  v_sequence integer;
  v_namespace text;
  v_tool_id text;
begin
  if p_selected_namespaces is null or cardinality(p_selected_namespaces) not between 1 and 3
    or p_planner_confidence is null or p_planner_confidence < 0 or p_planner_confidence > 1
    or p_planner_reason is null or char_length(p_planner_reason) not between 1 and 240
    or p_authorization is null or jsonb_typeof(p_authorization) <> 'object'
    or p_authorization ->> 'kind' not in ('none', 'read', 'write')
    or p_allowed_effects is null or cardinality(p_allowed_effects) > 2
    or p_allowed_tool_ids is null or cardinality(p_allowed_tool_ids) > 128
    or p_unresolved_references is null or cardinality(p_unresolved_references) > 16 then
    raise exception 'invalid_turn_planning_event';
  end if;
  foreach v_namespace in array p_selected_namespaces loop
    if v_namespace not in (
      'life_structure', 'tasks_plan', 'household', 'money', 'food',
      'device_wellbeing', 'account_navigation'
    ) then raise exception 'invalid_turn_planning_namespace'; end if;
  end loop;
  if exists (select 1 from unnest(p_allowed_effects) as effect where effect not in ('read', 'write')) then
    raise exception 'invalid_turn_planning_effect';
  end if;
  foreach v_tool_id in array p_allowed_tool_ids loop
    if v_tool_id !~ '^[a-z][a-z0-9_.-]{0,119}$' then
      raise exception 'invalid_turn_planning_tool';
    end if;
  end loop;

  select * into v_run
  from public.kwilt_agent_runs as candidate
  where candidate.id = p_run_id
    and candidate.user_id = p_user_id
    and candidate.status in ('active', 'steered', 'partial')
  for update;
  if not found then raise exception 'agent_run_not_active'; end if;

  if exists (
    select 1 from public.kwilt_agent_run_events
    where run_id = v_run.id and event_type = 'planner_output'
  ) then return; end if;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events
  where run_id = v_run.id;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status, visibility, label, payload
  ) values
  (
    p_user_id, v_run.thread_id, v_run.id, v_sequence, 'planner_output', 'complete', 'internal',
    'Planner output recorded',
    jsonb_build_object(
      'selectedNamespaces', to_jsonb(p_selected_namespaces),
      'confidence', p_planner_confidence,
      'reason', p_planner_reason
    )
  ),
  (
    p_user_id, v_run.thread_id, v_run.id, v_sequence + 1, 'deterministic_policy', 'complete', 'internal',
    'Deterministic policy resolved',
    jsonb_build_object(
      'authorization', p_authorization,
      'allowedEffects', to_jsonb(p_allowed_effects),
      'allowedToolIds', to_jsonb(p_allowed_tool_ids),
      'unresolvedReferences', to_jsonb(p_unresolved_references)
    )
  );
end;
$$;

revoke all on function public.append_kwilt_agent_turn_planning_events(
  uuid, uuid, text[], numeric, text, jsonb, text[], text[], text[]
) from public, anon, authenticated;
grant execute on function public.append_kwilt_agent_turn_planning_events(
  uuid, uuid, text[], numeric, text, jsonb, text[], text[], text[]
) to service_role;

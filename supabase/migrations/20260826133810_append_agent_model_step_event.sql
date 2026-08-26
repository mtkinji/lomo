create or replace function public.append_kwilt_agent_model_step_event(
  p_user_id uuid,
  p_run_id uuid,
  p_round integer,
  p_response_id text,
  p_routed_model text,
  p_prompt_version text,
  p_tool_catalog_hash text,
  p_latency_ms integer,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_total_tokens integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.kwilt_agent_runs%rowtype;
  v_sequence integer;
begin
  if p_round is null or p_round < 1 or p_round > 8
    or p_response_id is null or char_length(p_response_id) not between 1 and 200
    or p_routed_model is null or char_length(p_routed_model) not between 1 and 120
    or p_prompt_version is null or char_length(p_prompt_version) not between 1 and 120
    or p_tool_catalog_hash is null or p_tool_catalog_hash !~ '^fnv1a:[0-9a-f]{8}$'
    or p_latency_ms is null or p_latency_ms < 0 or p_latency_ms > 3600000
    or coalesce(p_input_tokens, 0) < 0
    or coalesce(p_output_tokens, 0) < 0
    or coalesce(p_total_tokens, 0) < 0 then
    raise exception 'invalid_model_step_event';
  end if;

  select * into v_run
  from public.kwilt_agent_runs as candidate
  where candidate.id = p_run_id
    and candidate.user_id = p_user_id
    and candidate.status in ('active', 'steered', 'partial')
  for update;
  if not found then raise exception 'agent_run_not_active'; end if;

  if exists (
    select 1 from public.kwilt_agent_run_events
    where run_id = v_run.id
      and event_type = 'model_step'
      and payload ->> 'responseId' = p_response_id
  ) then
    return;
  end if;

  select coalesce(max(sequence), 0) + 1 into v_sequence
  from public.kwilt_agent_run_events
  where run_id = v_run.id;

  insert into public.kwilt_agent_run_events (
    user_id, thread_id, run_id, sequence, event_type, status, visibility, label, payload
  ) values (
    p_user_id, v_run.thread_id, v_run.id, v_sequence, 'model_step', 'complete', 'internal',
    'Model step completed',
    jsonb_build_object(
      'round', p_round,
      'responseId', p_response_id,
      'routedModel', p_routed_model,
      'promptVersion', p_prompt_version,
      'toolCatalogHash', p_tool_catalog_hash,
      'latencyMs', p_latency_ms,
      'usage', jsonb_build_object(
        'inputTokens', p_input_tokens,
        'outputTokens', p_output_tokens,
        'totalTokens', p_total_tokens
      )
    )
  );
end;
$$;

revoke all on function public.append_kwilt_agent_model_step_event(
  uuid, uuid, integer, text, text, text, text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.append_kwilt_agent_model_step_event(
  uuid, uuid, integer, text, text, text, text, integer, integer, integer, integer
) to service_role;

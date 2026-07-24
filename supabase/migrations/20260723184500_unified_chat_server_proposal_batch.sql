-- Stage grouped proposals in one transaction so Phone cannot leave a partial native review group.

create or replace function public.stage_kwilt_agent_proposal_batch(
  p_user_id uuid,
  p_thread_id uuid,
  p_run_id uuid,
  p_message_id uuid,
  p_call_id text,
  p_proposals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_index integer := 0;
  v_item jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if jsonb_typeof(p_proposals) <> 'array' then raise exception 'proposal_batch_array_required'; end if;
  v_count := jsonb_array_length(p_proposals);
  if v_count < 2 or v_count > 10 then raise exception 'proposal_batch_size_invalid'; end if;

  for v_item in select value from jsonb_array_elements(p_proposals) loop
    v_index := v_index + 1;
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'capabilityId', '') = ''
      or coalesce(v_item ->> 'title', '') = ''
      or coalesce(v_item #>> '{operation,type}', '') = ''
      or coalesce(v_item #>> '{operation,summary}', '') = '' then
      raise exception 'proposal_batch_item_invalid';
    end if;
    select public.stage_kwilt_agent_proposal(
      p_user_id,
      p_thread_id,
      p_run_id,
      p_message_id,
      p_call_id || ':' || v_index::text,
      v_item ->> 'capabilityId',
      v_item ->> 'title',
      coalesce(v_item ->> 'body', ''),
      v_item #>> '{operation,type}',
      v_item #>> '{operation,targetType}',
      v_item #>> '{operation,targetId}',
      v_item #>> '{operation,summary}',
      coalesce(v_item #> '{operation,payload}', '{}'::jsonb)
    ) into v_result;
    v_results := v_results || jsonb_build_array(v_result);
  end loop;
  return v_results;
end;
$$;

revoke all on function public.stage_kwilt_agent_proposal_batch(
  uuid, uuid, uuid, uuid, text, jsonb
) from public, anon, authenticated;
grant execute on function public.stage_kwilt_agent_proposal_batch(
  uuid, uuid, uuid, uuid, text, jsonb
) to service_role;

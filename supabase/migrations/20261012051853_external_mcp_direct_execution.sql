-- A receipt and its domain writes commit together. No mobile approval task.
alter table public.kwilt_external_capture_log add column if not exists structured_result jsonb;
create table public.kwilt_external_execution_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  oauth_client_id text not null,
  request_id text not null,
  operation_id text not null,
  arguments jsonb not null,
  result jsonb not null,
  before_state jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, oauth_client_id, request_id)
);
alter table public.kwilt_external_execution_receipts enable row level security;
revoke all on public.kwilt_external_execution_receipts from public, anon, authenticated;
grant select, insert on public.kwilt_external_execution_receipts to service_role;

create or replace function public.execute_kwilt_external_life_operations(
  p_user_id uuid, p_oauth_client_id text, p_request_id text,
  p_operation_id text, p_arguments jsonb, p_operations jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  prior public.kwilt_external_execution_receipts%rowtype;
  op jsonb; payload jsonb; patch jsonb; current_data jsonb; next_data jsonb;
  table_name text; kind text; target_id text; operation_type text;
  expected_at timestamptz; current_at timestamptz; at_time timestamptz := clock_timestamp();
  receipt_id uuid := gen_random_uuid(); refs jsonb := '[]'; before_rows jsonb := '[]';
  result jsonb; steps jsonb; step jsonb; step_id text; requested_ids jsonb;
  found_step boolean; child record;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null or nullif(p_oauth_client_id,'') is null or nullif(p_request_id,'') is null then
    raise exception 'execution_identity_required';
  end if;
  if p_arguments is null or p_operations is null or jsonb_typeof(p_arguments) <> 'object' or jsonb_typeof(p_operations) <> 'array'
    or jsonb_array_length(p_operations) not between 1 and 100 then raise exception 'invalid_execution_request'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_oauth_client_id || ':' || p_request_id,0));
  select * into prior from public.kwilt_external_execution_receipts
    where user_id=p_user_id and oauth_client_id=p_oauth_client_id and request_id=p_request_id;
  if found then
    if prior.operation_id <> p_operation_id or prior.arguments <> p_arguments then raise exception 'idempotency_key_conflict'; end if;
    return prior.result || jsonb_build_object('replayed',true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('external-life:' || p_user_id::text,0));
  -- Lock a legacy request before doing any work: an already-approved/applied
  -- mobile proposal must never be executed again through the new path.
  for child in select p.id,p.status from public.kwilt_agent_proposals p
    where p.user_id=p_user_id and p.id::text in (
      select object_id from public.kwilt_external_capture_log where user_id=p_user_id
        and oauth_client_id=p_oauth_client_id and object_type='proposal'
        and idempotency_key_hash=substring(p_request_id from 5)
    ) for update loop
    if child.status not in ('pending','edited','deferred') then
      raise exception 'legacy_request_already_decided';
    end if;
  end loop;
  for op in select value from jsonb_array_elements(p_operations) loop
    operation_type := op->>'type'; payload := op->'payload'; target_id := op->>'targetId';
    if not coalesce((
      (p_operation_id='arcs.create' and operation_type='create_arc') or
      (p_operation_id='arcs.update' and operation_type='update_arc') or
      (p_operation_id='arcs.delete' and operation_type='delete_arc') or
      (p_operation_id='goals.create' and operation_type='create_goal') or
      (p_operation_id='goals.update' and operation_type='update_goal') or
      (p_operation_id='goals.delete' and operation_type='delete_goal') or
      (p_operation_id='activities.capture' and operation_type='create_activity') or
      (p_operation_id in ('activities.update','activities.focus_today','activities.repeat.update','activities.reminder.update') and operation_type='update_activity') or
      (p_operation_id='activities.delete' and operation_type='delete_activity') or
      (p_operation_id='activities.steps.create' and operation_type='create_activity_step') or
      (p_operation_id='activities.steps.update' and operation_type='update_activity_step') or
      (p_operation_id='activities.steps.complete' and operation_type='complete_activity_step') or
      (p_operation_id='activities.steps.delete' and operation_type='delete_activity_step') or
      (p_operation_id='activities.steps.reorder' and operation_type='reorder_activity_steps') or
      (p_operation_id='chapters.note.update' and operation_type='update_chapter_note')
    ),false) then raise exception 'operation_contract_mismatch'; end if;
    if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'invalid_operation_payload'; end if;
    if operation_type in ('create_arc','update_arc','delete_arc') then kind := 'arc'; table_name := 'kwilt_arcs';
    elsif operation_type in ('create_goal','update_goal','delete_goal') then kind := 'goal'; table_name := 'kwilt_goals';
    elsif operation_type in ('create_activity','update_activity','delete_activity','create_activity_step',
      'update_activity_step','complete_activity_step','delete_activity_step','reorder_activity_steps') then kind := 'activity'; table_name := 'kwilt_activities';
    elsif operation_type = 'update_chapter_note' then kind := 'chapter'; table_name := 'kwilt_chapters';
    else raise exception 'external_operation_not_supported:%',operation_type; end if;
    current_data := null; current_at := null;
    if operation_type not in ('create_arc','create_goal','create_activity') then
      if kind='chapter' then
        select jsonb_build_object('user_note',user_note,'user_note_updated_at',user_note_updated_at),
          coalesce(user_note_updated_at,updated_at) into current_data,current_at
          from public.kwilt_chapters where user_id=p_user_id and id::text=target_id for update;
      else
        execute format('select data, coalesce(nullif(data->>''updatedAt'','''')::timestamptz,updated_at) from public.%I where user_id=$1 and id=$2 and not is_deleted for update',table_name)
          into current_data,current_at using p_user_id,target_id;
      end if;
      if current_data is null then raise exception 'target_not_found'; end if;
      expected_at := (payload->>'expectedUpdatedAt')::timestamptz;
      if expected_at is null or current_at is distinct from expected_at then raise exception 'stale_target_version'; end if;
      before_rows := before_rows || jsonb_build_array(jsonb_build_object('kind',kind,'id',target_id,'data',current_data));
    end if;
    patch := payload - 'expectedUpdatedAt' - 'followUpActivity';
    if kind='arc' and operation_type in ('create_arc','update_arc') then
      if patch - array['name','narrative','identityStatement','status'] <> '{}' then raise exception 'unsupported_arc_field'; end if;
      if patch ? 'name' and (jsonb_typeof(patch->'name') <> 'string' or char_length(btrim(patch->>'name')) not between 1 and 160) then raise exception 'invalid_arc_name'; end if;
      if patch ? 'status' and coalesce(patch->>'status','') not in ('active','paused','archived') then raise exception 'invalid_arc_status'; end if;
    elsif kind='goal' and operation_type in ('create_goal','update_goal') then
      if patch - array['title','description','arcId','status','priority','targetDate'] <> '{}' then raise exception 'unsupported_goal_field'; end if;
      if patch ? 'title' and (jsonb_typeof(patch->'title') <> 'string' or char_length(btrim(patch->>'title')) not between 1 and 240) then raise exception 'invalid_goal_title'; end if;
      if patch ? 'status' and coalesce(patch->>'status','') not in ('planned','in_progress','completed','archived') then raise exception 'invalid_goal_status'; end if;
      if nullif(patch->>'arcId','') is not null and not exists (
        select 1 from public.kwilt_arcs where user_id=p_user_id and id=patch->>'arcId' and not is_deleted
      ) then raise exception 'arc_not_found'; end if;
    elsif kind='activity' and operation_type in ('create_activity','update_activity') then
      if patch - array['title','notes','goalId','type','status','tags','priority','scheduledDate','reminderAt',
        'repeatRule','repeatCustom','repeatBasis','estimateMinutes','difficulty'] <> '{}' then raise exception 'unsupported_activity_field'; end if;
      if patch ? 'title' and (jsonb_typeof(patch->'title') <> 'string' or char_length(btrim(patch->>'title')) not between 1 and 240) then raise exception 'invalid_activity_title'; end if;
      if patch ? 'status' and coalesce(patch->>'status','') not in ('planned','in_progress','done','skipped','cancelled') then raise exception 'invalid_activity_status'; end if;
      if nullif(patch->>'goalId','') is not null and not exists (
        select 1 from public.kwilt_goals where user_id=p_user_id and id=patch->>'goalId' and not is_deleted
      ) then raise exception 'goal_not_found'; end if;
    end if;
    if operation_type in ('create_arc','create_goal','create_activity') then
      if kind='arc' and not(patch ? 'name') then raise exception 'invalid_arc_name'; end if;
      if kind<>'arc' and not(patch ? 'title') then raise exception 'invalid_title'; end if;
      target_id := kind || '_' || gen_random_uuid()::text;
      next_data := case kind
        when 'arc' then jsonb_build_object('status','active','startDate',at_time,'endDate',null)
        when 'goal' then jsonb_build_object('status','planned','qualityState','draft','arcId',null,'forceIntent','{}'::jsonb,'metrics','[]'::jsonb)
        else jsonb_build_object('status','planned','type','task','goalId',null,'tags','[]'::jsonb,
          'forceActual',jsonb_build_object('force-activity',0,'force-connection',0,'force-mastery',0,'force-spirituality',0)) end;
      next_data := next_data || patch || jsonb_build_object('id',target_id,'createdAt',at_time,'updatedAt',at_time);
    else next_data := current_data || patch || jsonb_build_object('updatedAt',at_time); end if;
    if kind='goal' then
      for step_id in select value from jsonb_array_elements_text('["description","priority","targetDate"]') loop
        if patch->step_id='null'::jsonb then next_data := next_data-step_id; end if;
      end loop;
    elsif kind='activity' then
      for step_id in select value from jsonb_array_elements_text('["notes","priority","repeatRule","repeatCustom","repeatBasis","difficulty"]') loop
        if patch->step_id='null'::jsonb then next_data := next_data-step_id; end if;
      end loop;
    end if;
    if kind='arc' and patch ? 'identityStatement' then
      next_data := next_data - 'identityStatement';
      if patch->>'identityStatement' is null then next_data := next_data - 'identity';
      else next_data := jsonb_set(next_data,'{identity}',coalesce(current_data->'identity','{}') ||
        jsonb_build_object('statement',patch->>'identityStatement','centralInsight',
          coalesce(current_data #>> '{identity,centralInsight}',patch->>'identityStatement'))); end if;
    end if;
    if operation_type in ('create_activity','update_activity') and patch ? 'status' then
      next_data := next_data || jsonb_build_object('completedAt',case when patch->>'status'='done'
        then coalesce(nullif(current_data->'completedAt','null'),to_jsonb(at_time)) else 'null'::jsonb end);
    end if;
    if operation_type like '%activity_step%' then
      steps := '[]'; found_step := false; step_id := payload->>'stepId';
      if operation_type='create_activity_step' then
        if char_length(btrim(coalesce(payload->>'title',''))) not between 1 and 240 then raise exception 'invalid_step_title'; end if;
        steps := coalesce(current_data->'steps','[]') || jsonb_build_array(jsonb_build_object(
          'id','step_' || gen_random_uuid()::text,'title',payload->>'title','isOptional',coalesce((payload->>'isOptional')::boolean,false),'completedAt',null));
      elsif operation_type='reorder_activity_steps' then
        requested_ids := payload->'stepIds';
        if requested_ids is null or jsonb_typeof(requested_ids)<>'array' or (select count(*) <> count(distinct value) from jsonb_array_elements_text(requested_ids)) then raise exception 'invalid_step_order'; end if;
        for step_id in select value from jsonb_array_elements_text(requested_ids) loop
          select value into step from jsonb_array_elements(coalesce(current_data->'steps','[]')) where value->>'id'=step_id;
          if step is null then raise exception 'step_not_found'; end if;
          steps := steps || jsonb_build_array(step);
        end loop;
        for step in select value from jsonb_array_elements(coalesce(current_data->'steps','[]')) where not(requested_ids ? (value->>'id')) loop
          steps := steps || jsonb_build_array(step);
        end loop;
      else
        for step in select value from jsonb_array_elements(coalesce(current_data->'steps','[]')) loop
          if step->>'id'=step_id then
            found_step := true;
            if operation_type='delete_activity_step' then continue;
            elsif operation_type='update_activity_step' then step := step || (patch - 'stepId');
            elsif operation_type='complete_activity_step' then step := step || jsonb_build_object('completedAt',
              case when (payload->>'completed')::boolean then coalesce(nullif(step->'completedAt','null'),to_jsonb(at_time)) else 'null'::jsonb end);
            end if;
          end if;
          steps := steps || jsonb_build_array(step);
        end loop;
        if not found_step then raise exception 'step_not_found'; end if;
      end if;
      select coalesce(jsonb_agg(value || jsonb_build_object('orderIndex',ordinality-1) order by ordinality),'[]') into steps
        from jsonb_array_elements(steps) with ordinality;
      next_data := current_data || jsonb_build_object('steps',steps,'updatedAt',at_time);
    end if;
    if operation_type='update_chapter_note' then
      if patch - 'note' <> '{}' or char_length(coalesce(patch->>'note',''))>500 then raise exception 'invalid_chapter_note'; end if;
      update public.kwilt_chapters set user_note=nullif(btrim(payload->>'note'),''),user_note_updated_at=at_time
        where user_id=p_user_id and id::text=target_id;
    elsif operation_type in ('delete_arc','delete_goal','delete_activity') then
      if kind='arc' then
        for child in select id,data from public.kwilt_goals where user_id=p_user_id and not is_deleted and data->>'arcId'=target_id for update loop
          before_rows := before_rows || jsonb_build_array(jsonb_build_object('kind','goal','id',child.id,'data',child.data));
        end loop;
      end if;
      if kind in ('arc','goal') then
        for child in select a.id,a.data from public.kwilt_activities a where a.user_id=p_user_id and not a.is_deleted and (
          (kind='goal' and a.data->>'goalId'=target_id) or (kind='arc' and a.data->>'goalId' in (
            select g.id from public.kwilt_goals g where g.user_id=p_user_id and not g.is_deleted and g.data->>'arcId'=target_id))) for update loop
          before_rows := before_rows || jsonb_build_array(jsonb_build_object('kind','activity','id',child.id,'data',child.data));
          update public.kwilt_activities set data='{}',is_deleted=true,deleted_at=at_time,updated_at=at_time where user_id=p_user_id and id=child.id;
        end loop;
      end if;
      if kind='arc' then update public.kwilt_goals set data='{}',is_deleted=true,deleted_at=at_time,updated_at=at_time
        where user_id=p_user_id and not is_deleted and data->>'arcId'=target_id; end if;
      execute format('update public.%I set data=''{}'',is_deleted=true,deleted_at=$3,updated_at=$3 where user_id=$1 and id=$2',table_name) using p_user_id,target_id,at_time;
    elsif operation_type in ('create_arc','create_goal','create_activity') then
      execute format('insert into public.%I(user_id,id,data,created_at,updated_at,is_deleted,deleted_at) values($1,$2,$3,$4,$4,false,null)',table_name)
        using p_user_id,target_id,next_data,at_time;
    else
      execute format('update public.%I set data=$3,updated_at=$4 where user_id=$1 and id=$2',table_name) using p_user_id,target_id,next_data,at_time;
    end if;
    refs := refs || jsonb_build_array(jsonb_build_object('kind',kind,'id',target_id));
  end loop;
  result := jsonb_build_object('receiptId',receipt_id,'operationId',p_operation_id,'requestId',p_request_id,
    'status','completed','source','mcp','actorId',p_user_id,'resultRefs',refs,'replayed',false,'createdAt',at_time);
  insert into public.kwilt_external_execution_receipts(id,user_id,oauth_client_id,request_id,operation_id,arguments,result,before_state)
    values(receipt_id,p_user_id,p_oauth_client_id,p_request_id,p_operation_id,p_arguments,result,before_rows);
  -- A retry of a formerly staged request supersedes only that exact user's
  -- old pending proposal. It must not remain executable later on a phone.
  update public.kwilt_agent_proposals set status='rejected',version=version+1,updated_at=at_time,
    permission_policy=permission_policy || jsonb_build_object('supersededByExternalReceipt',receipt_id)
    where user_id=p_user_id and status in ('pending','edited','deferred') and id::text in (
      select object_id from public.kwilt_external_capture_log where user_id=p_user_id
        and oauth_client_id=p_oauth_client_id and object_type='proposal'
        and idempotency_key_hash=substring(p_request_id from 5)
    );
  return result;
end;
$$;
revoke all on function public.execute_kwilt_external_life_operations(uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.execute_kwilt_external_life_operations(uuid,text,text,text,jsonb,jsonb) to service_role;

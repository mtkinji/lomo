-- Run against a disposable database with the application schema/migration.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000101'),('00000000-0000-4000-8000-000000000102');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;

do $$
declare
  actor uuid := '00000000-0000-4000-8000-000000000101';
  other_actor uuid := '00000000-0000-4000-8000-000000000102';
  receipt jsonb; replay jsonb; goal_id text; activity_id text; arc_id text; version text;
  step_id text; original jsonb; captured boolean; proposal_count bigint;
begin
  select count(*) into proposal_count from public.kwilt_agent_proposals;
  receipt := public.execute_kwilt_external_life_operations(actor,'test-client','goal-create','goals.create',
    '{"title":"Avetta","targetDate":"2027-01-11"}',
    '[{"type":"create_goal","payload":{"title":"Avetta","targetDate":"2027-01-11","expectedUpdatedAt":null}}]');
  goal_id := receipt #>> '{resultRefs,0,id}';
  assert receipt->>'status'='completed';
  assert (select data->>'targetDate'='2027-01-11' and data->>'title'='Avetta' and data->>'qualityState'='draft'
    from public.kwilt_goals where user_id=actor and id=goal_id), 'goal missing or malformed';
  assert (select count(*) from public.kwilt_agent_proposals)=proposal_count, 'created an in-app review task';
  replay := public.execute_kwilt_external_life_operations(actor,'test-client','goal-create','goals.create',
    '{"targetDate":"2027-01-11","title":"Avetta"}',
    '[{"type":"create_goal","payload":{"title":"Avetta","targetDate":"2027-01-11","expectedUpdatedAt":null}}]');
  assert replay->>'receiptId'=receipt->>'receiptId' and replay->>'replayed'='true';
  assert (select count(*) from public.kwilt_goals where user_id=actor)=1, 'duplicate goal on retry';

  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(actor,'test-client','goal-create','goals.create',
      '{"title":"Different"}','[{"type":"create_goal","payload":{"title":"Different"}}]');
  exception when others then captured := sqlerrm='idempotency_key_conflict'; end;
  assert captured, 'changed request accepted with reused key';

  select data->>'updatedAt',data into version,original from public.kwilt_goals where user_id=actor and id=goal_id;
  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(other_actor,'test-client','cross-owner','goals.update','{}',
      jsonb_build_array(jsonb_build_object('type','update_goal','targetId',goal_id,'payload',
        jsonb_build_object('title','Stolen','expectedUpdatedAt',version))));
  exception when others then captured := sqlerrm='target_not_found'; end;
  assert captured, 'cross-owner mutation accepted';
  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(actor,'test-client','stale','goals.update','{}',
      jsonb_build_array(jsonb_build_object('type','update_goal','targetId',goal_id,'payload',
        jsonb_build_object('title','Stale','expectedUpdatedAt','2020-01-01T00:00:00Z'))));
  exception when others then captured := sqlerrm='stale_target_version'; end;
  assert captured, 'stale edit accepted';
  assert (select data from public.kwilt_goals where user_id=actor and id=goal_id)=original;

  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(actor,'test-client','atomic-batch','goals.update','{}',
      jsonb_build_array(
        jsonb_build_object('type','update_goal','targetId',goal_id,'payload',jsonb_build_object('title','Must roll back','expectedUpdatedAt',version)),
        jsonb_build_object('type','update_goal','targetId','missing','payload',jsonb_build_object('title','Missing','expectedUpdatedAt',version))));
  exception when others then captured := sqlerrm='target_not_found'; end;
  assert captured;
  assert (select data from public.kwilt_goals where user_id=actor and id=goal_id)=original, 'partial batch committed';
  assert not exists(select 1 from public.kwilt_external_execution_receipts where user_id=actor and request_id='atomic-batch');

  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(actor,'test-client','wrong-contract','goals.read','{}',
      '[{"type":"create_goal","payload":{"title":"Wrong"}}]');
  exception when others then captured := sqlerrm='operation_contract_mismatch'; end;
  assert captured;
  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(actor,'test-client','foreign-arc','goals.create','{}',
      '[{"type":"create_goal","payload":{"title":"Wrong","arcId":"missing"}}]');
  exception when others then captured := sqlerrm='arc_not_found'; end;
  assert captured;

  receipt := public.execute_kwilt_external_life_operations(actor,'test-client','activity-create','activities.capture','{}',
    jsonb_build_array(jsonb_build_object('type','create_activity','payload',jsonb_build_object('title','Get approval','goalId',goal_id))));
  activity_id := receipt #>> '{resultRefs,0,id}';
  select data->>'updatedAt' into version from public.kwilt_activities where user_id=actor and id=activity_id;
  perform public.execute_kwilt_external_life_operations(actor,'test-client','step-create','activities.steps.create','{}',
    jsonb_build_array(jsonb_build_object('type','create_activity_step','targetId',activity_id,'payload',
      jsonb_build_object('title','Meet leadership','expectedUpdatedAt',version))));
  select data->>'updatedAt',data #>> '{steps,0,id}' into version,step_id from public.kwilt_activities where user_id=actor and id=activity_id;
  perform public.execute_kwilt_external_life_operations(actor,'test-client','step-done','activities.steps.complete','{}',
    jsonb_build_array(jsonb_build_object('type','complete_activity_step','targetId',activity_id,'payload',
      jsonb_build_object('stepId',step_id,'completed',true,'expectedUpdatedAt',version))));
  assert (select data #>> '{steps,0,completedAt}' is not null from public.kwilt_activities where user_id=actor and id=activity_id);
  select data->>'updatedAt' into version from public.kwilt_activities where user_id=actor and id=activity_id;
  perform public.execute_kwilt_external_life_operations(actor,'test-client','activity-done','activities.update','{}',
    jsonb_build_array(jsonb_build_object('type','update_activity','targetId',activity_id,'payload',
      jsonb_build_object('status','done','expectedUpdatedAt',version))));
  assert (select data->>'completedAt' is not null from public.kwilt_activities where user_id=actor and id=activity_id);
  -- Another owner's identical logical ids/links are never part of a cascade.
  insert into public.kwilt_activities(user_id,id,data) values(other_actor,'foreign-activity',jsonb_build_object('goalId',goal_id));
  select data->>'updatedAt' into version from public.kwilt_goals where user_id=actor and id=goal_id;
  receipt := public.execute_kwilt_external_life_operations(actor,'test-client','goal-delete','goals.delete','{}',
    jsonb_build_array(jsonb_build_object('type','delete_goal','targetId',goal_id,'payload',jsonb_build_object('expectedUpdatedAt',version))));
  assert (select is_deleted and data='{}' from public.kwilt_goals where user_id=actor and id=goal_id);
  assert (select is_deleted from public.kwilt_activities where user_id=actor and id=activity_id);
  assert (select not is_deleted from public.kwilt_activities where user_id=other_actor and id='foreign-activity');
  assert (select jsonb_array_length(before_state)=2 from public.kwilt_external_execution_receipts where id=(receipt->>'receiptId')::uuid), 'missing recovery snapshots';
  replay := public.execute_kwilt_external_life_operations(actor,'test-client','goal-delete','goals.delete','{}',
    jsonb_build_array(jsonb_build_object('type','delete_goal','targetId',goal_id,'payload',jsonb_build_object('expectedUpdatedAt',version))));
  assert replay->>'receiptId'=receipt->>'receiptId', 'retry of deleted target failed';

  receipt := public.execute_kwilt_external_life_operations(actor,'test-client','arc-create','arcs.create','{}',
    '[{"type":"create_arc","payload":{"name":"Work","identityStatement":"Trusted leader"}}]');
  arc_id := receipt #>> '{resultRefs,0,id}';
  assert (select data #>> '{identity,statement}'='Trusted leader' from public.kwilt_arcs where user_id=actor and id=arc_id);
  select data->>'updatedAt' into version from public.kwilt_arcs where user_id=actor and id=arc_id;
  perform public.execute_kwilt_external_life_operations(actor,'test-client','arc-update','arcs.update','{}',
    jsonb_build_array(jsonb_build_object('type','update_arc','targetId',arc_id,'payload',jsonb_build_object('name','Leadership','expectedUpdatedAt',version))));
  assert (select data->>'name'='Leadership' and data #>> '{identity,statement}'='Trusted leader' from public.kwilt_arcs where user_id=actor and id=arc_id);
  select data->>'updatedAt' into version from public.kwilt_arcs where user_id=actor and id=arc_id;
  perform public.execute_kwilt_external_life_operations(actor,'test-client','arc-identity','arcs.update','{}',
    jsonb_build_array(jsonb_build_object('type','update_arc','targetId',arc_id,'payload',
      jsonb_build_object('identityStatement','New statement','expectedUpdatedAt',version))));
  assert (select data #>> '{identity,statement}'='New statement' and data #>> '{identity,centralInsight}'='Trusted leader'
    from public.kwilt_arcs where user_id=actor and id=arc_id), 'identity update lost central insight';
  assert not has_function_privilege('authenticated','public.execute_kwilt_external_life_operations(uuid,text,text,text,jsonb,jsonb)','execute');
  assert not has_function_privilege('anon','public.execute_kwilt_external_life_operations(uuid,text,text,text,jsonb,jsonb)','execute');
  assert not has_table_privilege('authenticated','public.kwilt_external_execution_receipts','select');
  perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
  captured := false;
  begin
    perform public.execute_kwilt_external_life_operations(actor,'test-client','bad-role','goals.create','{}','[{"type":"create_goal","payload":{"title":"Wrong"}}]');
  exception when others then captured := sqlerrm='service_role_required'; end;
  assert captured, 'service boundary missing';
end $$;
rollback;

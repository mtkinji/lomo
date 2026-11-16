-- Forward repair of the external Food actor bridge and ordinary private recipes.
-- Auth account state is read by this narrow private predicate only.
create or replace function kwilt_internal.external_food_actor_is_active(p_user_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  return p_user_id is not null and exists (
    select 1 from auth.users u where u.id=p_user_id and not coalesce(u.is_anonymous,false)
      and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
  );
end;
$$;
revoke all on function kwilt_internal.external_food_actor_is_active(uuid) from public,anon,authenticated;
grant usage on schema kwilt_internal to service_role;
grant execute on function kwilt_internal.can_access_shared_meal_cart(uuid) to service_role;
grant execute on function kwilt_internal.external_food_actor_is_active(uuid) to service_role;
grant execute on function public.get_kwilt_agent_food_control_snapshot(uuid),
  public.save_kwilt_recipe_with_equipment(uuid,integer,text,jsonb) to service_role;
grant execute on function public.apply_kwilt_meal_plan_conversational(text,uuid,integer,text,jsonb),
  public.apply_kwilt_grocery_list_conversational(text,uuid,integer,text,jsonb) to service_role;

-- Receipt rows are written only by the canonical SECURITY DEFINER operations.
do $grants$
declare t text;
begin
  foreach t in array array['kwilt_meal_preference_action_receipts','kwilt_cook_session_action_receipts',
    'kwilt_recipe_collaboration_action_receipts','kwilt_meal_plan_action_receipts',
    'kwilt_grocery_list_action_receipts','kwilt_food_stock_action_receipts'] loop
    execute format('revoke all on table public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on table public.%I to authenticated,service_role',t);
  end loop;
end;
$grants$;

create or replace function public.kwilt_external_food_actor_context(p_user_id uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare previous_claims text := current_setting('request.jwt.claims',true);
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if not kwilt_internal.external_food_actor_is_active(p_user_id) then raise exception 'external_food_actor_unavailable'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',p_user_id,'role','authenticated','is_anonymous',false)::text,true);
  if public.kwilt_require_permanent_user() is distinct from p_user_id then raise exception 'external_food_actor_mismatch'; end if;
  if public.kwilt_current_person_id() is null then raise exception 'person_binding_required'; end if;
  return coalesce(previous_claims,'');
end;
$$;

create or replace function public.get_kwilt_external_food_control_snapshot(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous_claims text := current_setting('request.jwt.claims',true); result jsonb;
begin
  previous_claims := public.kwilt_external_food_actor_context(p_user_id);
  result := public.get_kwilt_agent_food_control_snapshot(p_user_id);
  result := jsonb_set(result,'{mealPlans}',coalesce((
    select jsonb_agg(jsonb_build_object('id',p.id,'householdId',p.household_id,
      'organizerPersonId',p.organizer_person_id,'version',p.version,'state',p.state,
      'horizon',p.horizon,'updatedAt',p.updated_at,'candidates',coalesce((
        select jsonb_agg(jsonb_build_object('id',c.id,'kind',c.kind,'title',c.title,
          'recipeSnapshot',c.recipe_snapshot,'lifecycle',c.lifecycle_state,'createdAt',c.created_at,
          'sentAt',c.sent_at,'resolvedAt',c.resolved_at,'removedGroceryBehavior',c.removed_grocery_behavior,
          'timing',c.meal_timing) order by c.position)
        from public.kwilt_meal_plan_candidates c where c.plan_id=p.id),'[]'::jsonb),
      'activeRound',(select jsonb_build_object('id',r.id,'version',r.version,'state',r.state,'closesAt',r.closes_at)
        from public.kwilt_meal_choice_rounds r where r.plan_id=p.id and r.state='open' order by r.opened_at desc limit 1))
      order by p.updated_at desc,p.id)
    from (select q.* from public.kwilt_meal_plans q
      where public.kwilt_is_meal_plan_organizer(q.id) or kwilt_internal.can_access_shared_meal_cart(q.id)
      order by q.updated_at desc,q.id limit 50) p),'[]'::jsonb));
  perform set_config('request.jwt.claims',previous_claims,true);
  return result;
exception when others then
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  raise;
end;
$$;

create or replace function public.get_kwilt_meal_cart_history(p_plan_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare plan public.kwilt_meal_plans;
begin
  perform public.kwilt_require_permanent_user();
  select * into plan from public.kwilt_meal_plans where id=p_plan_id;
  if plan.id is null or not (public.kwilt_is_meal_plan_organizer(p_plan_id)
    or kwilt_internal.can_access_shared_meal_cart(p_plan_id)) then raise exception 'meal_plan_read_forbidden'; end if;
  return jsonb_build_object('mealPlanId',plan.id,'version',plan.version,'groceryList',(
    select jsonb_build_object('id',l.id,'revision',l.revision,'status',l.status)
    from public.kwilt_grocery_lists l where l.source_meal_plan_id=p_plan_id
      and l.status not in ('stale','archived') and public.kwilt_can_read_grocery_list(l.id)
    order by l.updated_at desc,l.id desc limit 1
  ),'activeCandidates',coalesce((
    select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'recipeSnapshot',c.recipe_snapshot,
      'lifecycle',c.lifecycle_state,'sentAt',c.sent_at,'timing',c.meal_timing) order by c.position)
    from public.kwilt_meal_plan_candidates c where c.plan_id=p_plan_id and c.lifecycle_state in ('idea','sent')
  ),'[]'::jsonb),'history',coalesce((
    select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'recipeSnapshot',c.recipe_snapshot,
      'lifecycle',c.lifecycle_state,'sentAt',c.sent_at,'resolvedAt',c.resolved_at,
      'removedGroceryBehavior',c.removed_grocery_behavior,'timing',c.meal_timing)
      order by c.lifecycle_updated_at desc,c.id)
    from public.kwilt_meal_plan_candidates c where c.plan_id=p_plan_id
      and c.lifecycle_state in ('made','removed')
  ),'[]'::jsonb));
end;
$$;

create or replace function public.execute_kwilt_external_food_operations(
  p_user_id uuid,p_oauth_client_id text,p_request_id text,
  p_operation_id text,p_arguments jsonb,p_operations jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  previous_claims text := current_setting('request.jwt.claims',true); prior public.kwilt_external_execution_receipts;
  op jsonb; payload jsonb; domain_result jsonb; result jsonb; refs jsonb:='[]';
  receipt_id uuid:=gen_random_uuid(); actor_person uuid; target uuid; expected integer;
  plan public.kwilt_meal_plans; candidate public.kwilt_meal_plan_candidates;
  member public.kwilt_household_memberships; household uuid; candidate_data jsonb; candidate_id uuid;
  timing jsonb; position_value integer; existing_plan_id uuid; old_list public.kwilt_grocery_lists;
  list_row public.kwilt_grocery_lists; candidate_ids uuid[]; warning_count integer:=0; legacy record;
  ref_id text; ref_kind text; at_time timestamptz:=clock_timestamp();
begin
  previous_claims:=public.kwilt_external_food_actor_context(p_user_id);
  actor_person:=public.kwilt_current_person_id();
  if char_length(coalesce(p_oauth_client_id,'')) not between 1 and 500
    or char_length(coalesce(p_request_id,'')) not between 1 and 200
    or jsonb_typeof(p_arguments) is distinct from 'object'
    or jsonb_typeof(p_operations) is distinct from 'array'
    or jsonb_array_length(p_operations)<>1 then raise exception 'invalid_execution_request'; end if;
  -- Global request identity precedes target/version checks, so a retry after a
  -- successful write returns the original result even after its target changes.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_oauth_client_id||':'||p_request_id,0));
  select * into prior from public.kwilt_external_execution_receipts
    where user_id=p_user_id and oauth_client_id=p_oauth_client_id and request_id=p_request_id;
  if prior.id is not null then
    if prior.operation_id is distinct from p_operation_id or prior.arguments is distinct from p_arguments then
      raise exception 'idempotency_key_conflict'; end if;
    perform set_config('request.jwt.claims',previous_claims,true);
    return prior.result||jsonb_build_object('replayed',true);
  end if;
  -- Same protection as Life: never execute an already-decided legacy proposal.
  for legacy in select p.id,p.status from public.kwilt_agent_proposals p where p.user_id=p_user_id and p.id::text in (
    select object_id from public.kwilt_external_capture_log where user_id=p_user_id and oauth_client_id=p_oauth_client_id
      and object_type='proposal' and idempotency_key_hash=substring(p_request_id from 5)
  ) for update loop
    if legacy.status not in ('pending','edited','deferred') then raise exception 'legacy_request_already_decided'; end if;
  end loop;
  op:=p_operations->0; payload:=op->'payload';
  if op->>'type' is distinct from (case p_operation_id when 'recipes.create' then 'create_recipe' when 'recipes.update' then 'update_recipe' else p_operation_id end) or jsonb_typeof(payload) is distinct from 'object'
    or p_operation_id not in (
      'recipes.create','recipes.update','meal_planning.candidate.add','meal_planning.candidate.remove',
      'meal_planning.cart.ensure','meal_planning.cart.add','meal_planning.cart.mark_made','meal_planning.cart.remove',
      'meal_planning.plan.create','meal_planning.plan.update','meal_planning.plan.finalize','meal_planning.plan.revise',
      'meal_planning.round.open','meal_planning.round.close',
      'meal_planning.response.submit','meal_planning.response.withdraw',
      'groceries.compile','groceries.item.add','groceries.item.update','groceries.item.set_state'
    ) then raise exception 'operation_contract_mismatch'; end if;
  target:=nullif(op->>'targetId','')::uuid;
  expected:=nullif(payload->>'expectedVersion','')::integer;
  if p_operation_id in ('recipes.create','recipes.update') then
    if (p_operation_id='recipes.create' and (target is not null or expected is distinct from 0))
      or (p_operation_id='recipes.update' and (target is null or expected is null or expected<1))
      or jsonb_typeof(payload->'reviewedData') is distinct from 'object' then
      raise exception 'invalid_recipe_operation';
    end if;
    -- Text-authored versions start at the canonical review_required scaling default.
    -- Never carry a verified scaling claim into newly authored ingredient text.
    domain_result:=public.save_kwilt_recipe_with_equipment(target,expected,'external:'||receipt_id::text,(payload->'reviewedData')-'scalingState');
  elsif p_operation_id='meal_planning.cart.ensure' then
    household:=nullif(payload->>'householdId','')::uuid;
    -- Same household advisory namespace as canonical shared nominations.
    perform pg_advisory_xact_lock(hashtextextended(coalesce(household::text,'personal:'||actor_person::text),2086));
    if household is not null then
      select * into member from public.kwilt_shared_meal_cart_membership(household);
      if member.id is null or member.role not in ('owner','caregiver') then raise exception 'meal_plan_organizer_required'; end if;
    end if;
    select * into plan from public.kwilt_meal_plans p where p.state='draft' and p.horizon->>'kind'='open'
      and (household is not null and p.household_id=household
        or household is null and p.household_id is null and p.organizer_person_id=actor_person)
      order by p.updated_at desc,p.id limit 1 for update;
    if plan.id is null then
      domain_result:=public.create_kwilt_meal_plan(household,'{"kind":"open"}'::jsonb,'[]'::jsonb);
    else domain_result:=jsonb_build_object('planId',plan.id,'version',plan.version,'state',plan.state,'reused',true); end if;
  elsif p_operation_id='meal_planning.cart.add' or (p_operation_id='meal_planning.candidate.add' and exists(select 1 from public.kwilt_meal_plans where id=target and horizon->>'kind'='open')) then
    -- Lock scope before plan, matching canonical shared add's lock order.
    select household_id into household from public.kwilt_meal_plans where id=target;
    perform pg_advisory_xact_lock(hashtextextended(coalesce(household::text,'personal:'||actor_person::text),2086));
    select * into plan from public.kwilt_meal_plans where id=target for update;
    if plan.id is null or not(public.kwilt_is_meal_plan_organizer(target) or kwilt_internal.can_access_shared_meal_cart(target)) then
      raise exception 'meal_plan_add_forbidden'; end if;
    if plan.state<>'draft' or plan.horizon->>'kind'<>'open' or expected is null or plan.version<>expected then raise exception 'stale_meal_plan_version'; end if;
    candidate_data:=payload->'candidate'; candidate_id:=nullif(candidate_data->>'id','')::uuid;
    timing:=coalesce(payload->'timing','{"kind":"flexible"}'::jsonb);
    if jsonb_typeof(candidate_data) is distinct from 'object' or candidate_id is null
      or candidate_data->>'kind' is distinct from 'recipe'
      or char_length(btrim(coalesce(candidate_data->>'title',''))) not between 1 and 160
      or jsonb_typeof(candidate_data->'recipeSnapshot') is distinct from 'object'
      or jsonb_typeof(timing) is distinct from 'object'
      or coalesce(timing->>'kind','') not in ('flexible','occasion','coverage') then raise exception 'invalid_meal_candidate'; end if;
    if timing->>'kind'='occasion' then
      if coalesce(timing->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
        or coalesce(timing->>'mealPeriod','') not in ('breakfast','lunch','dinner','snack') then raise exception 'invalid_meal_timing'; end if;
      perform (timing->>'date')::date;
    elsif timing->>'kind'='coverage' then
      if jsonb_typeof(timing->'dates') is distinct from 'array' or jsonb_array_length(timing->'dates') not between 1 and 60
        or coalesce(timing->>'mealPeriod','') not in ('breakfast','lunch','dinner','snack') then raise exception 'invalid_meal_timing'; end if;
      perform value::date from jsonb_array_elements_text(timing->'dates');
    end if;
    -- Catalog projections contain real canonical UUIDs. Refuse hidden, deleted,
    -- unauthorized or unpublished catalog versions.
    if not exists(select 1 from public.kwilt_recipe_versions v join public.kwilt_recipes r on r.id=v.recipe_id
      where v.id=(candidate_data#>>'{recipeSnapshot,recipeVersionId}')::uuid
        and r.id=(candidate_data#>>'{recipeSnapshot,recipeId}')::uuid
        and v.content_hash=candidate_data#>>'{recipeSnapshot,contentHash}'
        and r.lifecycle<>'deleted' and public.kwilt_can_use_recipe_version(r.id,v.id)
        and coalesce((candidate_data#>>'{recipeSnapshot,recipeScaleMultiplier}')::numeric,1) in (1,2,3)
        and (coalesce((candidate_data#>>'{recipeSnapshot,recipeScaleMultiplier}')::numeric,1)=1 or v.scaling_state='verified')) then raise exception 'recipe_version_not_available'; end if;
    if exists(select 1 from public.kwilt_meal_plan_candidates where id=candidate_id) then raise exception 'meal_candidate_id_exists'; end if;
    if household is not null then
      domain_result:=public.add_kwilt_shared_meal_candidate(household,candidate_id,candidate_data);
      if (domain_result->>'planId')::uuid<>target then raise exception 'meal_cart_changed'; end if;
      update public.kwilt_meal_plan_candidates set meal_timing=timing where id=candidate_id;
    else
      if (select count(*) from public.kwilt_meal_plan_candidates where plan_id=target and lifecycle_state in ('idea','sent'))>=60 then raise exception 'invalid_meal_candidates'; end if;
      select coalesce(max(position),-1)+1 into position_value from public.kwilt_meal_plan_candidates where plan_id=target;
      insert into public.kwilt_meal_plan_candidates(id,plan_id,position,kind,title,recipe_snapshot,suggested_by_person_id,meal_timing)
        values(candidate_id,target,position_value,'recipe',btrim(candidate_data->>'title'),candidate_data->'recipeSnapshot',actor_person,timing);
      update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=target returning * into plan;
      domain_result:=jsonb_build_object('planId',target,'candidateId',candidate_id,'version',plan.version);
    end if;
  elsif p_operation_id in ('meal_planning.cart.remove','meal_planning.cart.mark_made')
    or (p_operation_id='meal_planning.candidate.remove' and exists(select 1 from public.kwilt_meal_plans where id=target and horizon->>'kind'='open')) then
    candidate_id:=case when p_operation_id='meal_planning.candidate.remove' then (payload->>'candidateId')::uuid else target end;
    select plan_id into existing_plan_id from public.kwilt_meal_plan_candidates where id=candidate_id;
    select * into plan from public.kwilt_meal_plans where id=existing_plan_id for update;
    select * into candidate from public.kwilt_meal_plan_candidates where id=candidate_id for update;
    if plan.id is null or not(public.kwilt_is_meal_plan_organizer(plan.id) or public.kwilt_can_manage_household_plan(plan.id)) then raise exception 'meal_plan_manage_forbidden'; end if;
    if plan.state<>'draft' or expected is null or plan.version<>expected
      or candidate.lifecycle_state not in ('idea','sent')
      or p_operation_id='meal_planning.cart.mark_made' and candidate.lifecycle_state<>'sent' then raise exception 'stale_plan_candidate'; end if;
    if candidate.lifecycle_state='sent' and p_operation_id<>'meal_planning.cart.mark_made' then
      if payload->>'planAction' is distinct from 'remove' or payload->'candidateIds' is distinct from jsonb_build_array(candidate_id)
        or jsonb_typeof(payload->'compiledItems') is distinct from 'array' then raise exception 'removal_grocery_compilation_required'; end if;
      if plan.household_id is null then
        domain_result:=public.sync_kwilt_personal_plan_groceries(actor_person,plan.id,expected,'remove',array[candidate_id],
          payload->>'payloadHash',payload->'compiledItems',false);
      else
        domain_result:=public.sync_kwilt_household_plan_groceries_with_hard_pass_review(actor_person,plan.id,expected,'remove',array[candidate_id],
          payload->>'payloadHash',payload->'compiledItems',false);
      end if;
      warning_count:=public.kwilt_preserve_external_grocery_corrections((domain_result->>'groceryListId')::uuid);
      domain_result:=domain_result||jsonb_build_object('candidateId',candidate_id,'state','removed','groceryBehavior','removed','rebaseConflictCount',warning_count);
    else
    -- Retire the occurrence, never delete the canonical recipe or its history.
    update public.kwilt_meal_plan_candidates set
      lifecycle_state=case when p_operation_id='meal_planning.cart.mark_made' then 'made' else 'removed' end,
      resolved_at=now(),resolved_by_person_id=actor_person,lifecycle_updated_at=now(),
      removed_grocery_behavior=case when p_operation_id='meal_planning.cart.mark_made' then null when candidate.lifecycle_state='sent' then 'kept' else 'removed' end
      where id=candidate_id;
    update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=plan.id returning * into plan;
    domain_result:=jsonb_build_object('planId',plan.id,'candidateId',candidate_id,'version',plan.version,
      'state',case when p_operation_id='meal_planning.cart.mark_made' then 'made' else 'removed' end,
      'groceryBehavior',case when candidate.lifecycle_state='sent' then 'kept' else 'unchanged' end);
    end if;
  elsif p_operation_id like 'meal_planning.%' then
    domain_result:=public.apply_kwilt_meal_plan_conversational(p_operation_id,target,expected,
      'external:'||receipt_id::text,payload-'expectedVersion');
  elsif p_operation_id='groceries.compile' then
    select * into plan from public.kwilt_meal_plans where id=target for update;
    if plan.id is null or not(public.kwilt_is_meal_plan_organizer(target) or public.kwilt_can_manage_household_plan(target)) then raise exception 'grocery_plan_not_owned'; end if;
    if expected is null or plan.version<>expected then raise exception 'stale_meal_plan_version'; end if;
    select * into old_list from public.kwilt_grocery_lists l where l.source_meal_plan_id=target
      and l.status<>'archived' and (plan.state='draft' or l.source_meal_plan_version<expected)
      order by l.created_at desc,l.id desc limit 1 for update;
    if plan.state='draft' then
      if payload->>'planAction' is distinct from 'send' or jsonb_typeof(payload->'candidateIds') is distinct from 'array'
        or jsonb_array_length(payload->'candidateIds') not between 1 and 60 then raise exception 'invalid_cart_grocery_compilation'; end if;
      select array_agg(value::uuid order by value) into candidate_ids from jsonb_array_elements_text(payload->'candidateIds');
      if cardinality(candidate_ids)<>(select count(distinct id) from unnest(candidate_ids) id) then raise exception 'invalid_cart_grocery_compilation'; end if;
      if plan.household_id is null then
        domain_result:=public.sync_kwilt_personal_plan_groceries(actor_person,target,expected,'send',candidate_ids,
          payload->>'payloadHash',payload->'compiledItems',coalesce((payload->>'acknowledgeHardPasses')::boolean,false));
      else
        domain_result:=public.sync_kwilt_household_plan_groceries_with_hard_pass_review(actor_person,target,expected,'send',candidate_ids,
          payload->>'payloadHash',payload->'compiledItems',coalesce((payload->>'acknowledgeHardPasses')::boolean,false));
      end if;
      warning_count:=public.kwilt_preserve_external_grocery_corrections((domain_result->>'groceryListId')::uuid);
      domain_result:=domain_result||jsonb_build_object('rebaseConflictCount',warning_count);
    else
      if payload ? 'rebaseFromListId' and payload->>'rebaseFromListId' is not null then
        if old_list.id is distinct from (payload->>'rebaseFromListId')::uuid
          or old_list.revision is distinct from (payload->>'expectedRebaseRevision')::integer then raise exception 'stale_grocery_rebase_source'; end if;
      end if;
      domain_result:=public.compile_kwilt_grocery_list(target,expected,payload->>'payloadHash',payload->'compiledItems',
        old_list.id,old_list.revision);
    end if;
  else
    if p_operation_id='groceries.item.add' then
      select * into list_row from public.kwilt_grocery_lists where id=target for update;
    else
      select l.* into list_row from public.kwilt_grocery_lists l join public.kwilt_grocery_items i on i.grocery_list_id=l.id
        where i.id=target for update of l;
    end if;
    if list_row.id is null or not public.kwilt_can_read_grocery_list(list_row.id) then raise exception 'grocery_list_not_accessible'; end if;
    if list_row.status in ('stale','archived') or expected is null or list_row.revision<>expected then raise exception 'stale_grocery_list_revision'; end if;
    if p_operation_id='groceries.item.set_state' and payload->>'state'='removed' then
      payload:=jsonb_set(payload,'{state}','"skipped"'::jsonb);
    end if;
    domain_result:=public.apply_kwilt_grocery_list_conversational(p_operation_id,target,expected,
      'external:'||receipt_id::text,payload-'expectedVersion');
  end if;
  ref_id:=coalesce(domain_result->>'recipeId',domain_result->>'groceryListId',domain_result->>'planId',target::text);
  ref_kind:=case when domain_result ? 'recipeId' then 'recipe' when domain_result ? 'groceryListId' then 'grocery_list' else 'meal_plan' end;
  if ref_id is null then raise exception 'external_food_result_invalid'; end if;
  refs:=jsonb_build_array(jsonb_build_object('kind',ref_kind,'id',ref_id));
  result:=jsonb_build_object('receiptId',receipt_id,'requestId',p_request_id,'operationId',p_operation_id,
    'status','completed','source','mcp','actorId',p_user_id,'resultRefs',refs,'replayed',false,'createdAt',at_time,
    'output',domain_result||jsonb_build_object('warnings',case when coalesce((domain_result->>'rebaseConflictCount')::integer,0)>0
      then jsonb_build_array('Grocery edits were preserved where unambiguous; review rebase conflicts before shopping.') else '[]'::jsonb end));
  insert into public.kwilt_external_execution_receipts(id,user_id,oauth_client_id,request_id,operation_id,arguments,result)
    values(receipt_id,p_user_id,p_oauth_client_id,p_request_id,p_operation_id,p_arguments,result);
  update public.kwilt_agent_proposals set status='rejected',version=version+1,updated_at=at_time,
    permission_policy=permission_policy||jsonb_build_object('supersededByExternalReceipt',receipt_id)
    where user_id=p_user_id and status in ('pending','edited','deferred') and id::text in (
      select object_id from public.kwilt_external_capture_log where user_id=p_user_id and oauth_client_id=p_oauth_client_id
        and object_type='proposal' and idempotency_key_hash=substring(p_request_id from 5));
  perform set_config('request.jwt.claims',previous_claims,true);
  return result;
exception when others then
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  raise;
end;
$$;

-- Sources have stable IDs, not a created_at column.
do $snapshot$
declare definition text;
begin
  definition:=pg_get_functiondef('public.get_kwilt_agent_food_control_snapshot(uuid)'::regprocedure);
  if position('order by source.created_at' in definition)=0 and position('order by source.id' in definition)=0 then raise exception 'food_snapshot_source_shape_changed'; end if;
  execute replace(definition,'order by source.created_at','order by source.id');
end;
$snapshot$;

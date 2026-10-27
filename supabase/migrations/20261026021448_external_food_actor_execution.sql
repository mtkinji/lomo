alter table public.kwilt_meal_plan_candidates add column if not exists meal_timing jsonb not null default '{"kind":"flexible"}'::jsonb;

-- Both canonical shared-cart readers and nominations must select the same
-- open-horizon cart. A newer bounded legacy draft is not the ongoing cart.
do $cart_scope$
declare signature text; definition text; narrowed text;
begin
  foreach signature in array array['public.add_kwilt_shared_meal_candidate(uuid,uuid,jsonb)',
    'public.get_kwilt_shared_meal_cart(uuid)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    narrowed:=regexp_replace(definition,
      'plan\.household_id\s*=\s*p_household_id\s+and\s+plan\.state\s*=\s*''draft''',
      'plan.household_id=p_household_id and plan.state=''draft'' and plan.horizon->>''kind''=''open''','g');
    if narrowed=definition then raise exception 'shared_cart_selection_changed: %',signature; end if;
    if signature='public.get_kwilt_shared_meal_cart(uuid)' then
      narrowed:=replace(narrowed,'''sentAt'',candidate.sent_at,',
        '''sentAt'',candidate.sent_at,''timing'',candidate.meal_timing,');
      if position('candidate.meal_timing' in narrowed)=0 then raise exception 'shared_cart_timing_projection_changed'; end if;
    end if;
    execute narrowed;
  end loop;
end;
$cart_scope$;


-- PostgreSQL has no jsonb_object_length(). Keep the canonical mutation route,
-- but make its nonempty-patch guard executable and serialize native retries
-- before receipt lookup (the external executor also has its own receipt lock).
do $grocery_patch_guard$
declare definition text; updated text;
begin
  definition:=pg_get_functiondef('public.apply_kwilt_grocery_list_conversational(text,uuid,integer,text,jsonb)'::regprocedure);
  updated:=replace(definition,'jsonb_object_length(p_payload->''patch'') < 1','p_payload->''patch'' = ''{}''::jsonb');
  updated:=replace(updated,'  select * into v_receipt from public.kwilt_grocery_list_action_receipts',
    '  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || '':grocery:'' || btrim(p_idempotency_key),0));
  select * into v_receipt from public.kwilt_grocery_list_action_receipts');
  if updated=definition or position('jsonb_object_length' in updated)>0 then raise exception 'grocery_action_patch_guard_changed'; end if;
  execute updated;
end;
$grocery_patch_guard$;

-- MCP authenticates its opaque OAuth token before calling these service-only bridges.
-- This is actor context, not elevated household authority: every domain operation
-- must still pass the canonical person/household ownership checks. No JWT is minted.
create or replace function public.kwilt_external_food_actor_context(p_user_id uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare previous_claims text := current_setting('request.jwt.claims',true);
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_user_id is null or not exists (
    select 1 from auth.users u where u.id=p_user_id and not coalesce(u.is_anonymous,false)
      and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
  ) then raise exception 'external_food_actor_unavailable'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',p_user_id,'role','authenticated','is_anonymous',false)::text,true);
  if public.kwilt_require_permanent_user() is distinct from p_user_id then raise exception 'external_food_actor_mismatch'; end if;
  if public.kwilt_current_person_id() is null then raise exception 'person_binding_required'; end if;
  return coalesce(previous_claims,'');
end;
$$;
revoke all on function public.kwilt_external_food_actor_context(uuid) from public,anon,authenticated;
grant execute on function public.kwilt_external_food_actor_context(uuid) to service_role;

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
      where public.kwilt_is_meal_plan_organizer(q.id) or public.kwilt_can_access_shared_meal_cart(q.id)
      order by q.updated_at desc,q.id limit 50) p),'[]'::jsonb));
  perform set_config('request.jwt.claims',previous_claims,true);
  return result;
exception when others then
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  raise;
end;
$$;

create or replace function public.list_kwilt_external_recipe_catalog_v2(
  p_user_id uuid,p_after_roster_id text default null,p_limit integer default 500
) returns table(projection jsonb) language plpgsql security invoker set search_path='' as $$
declare previous_claims text := current_setting('request.jwt.claims',true);
begin
  previous_claims := public.kwilt_external_food_actor_context(p_user_id);
  return query select catalog.projection from public.list_kwilt_recipe_catalog_v2(p_after_roster_id,p_limit) catalog;
  perform set_config('request.jwt.claims',previous_claims,true);
exception when others then
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  raise;
end;
$$;

-- Timing describes this occurrence, never mutates the shared recipe definition.

create or replace function public.get_kwilt_meal_cart_history(p_plan_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare plan public.kwilt_meal_plans;
begin
  perform public.kwilt_require_permanent_user();
  select * into plan from public.kwilt_meal_plans where id=p_plan_id;
  if plan.id is null or not (public.kwilt_is_meal_plan_organizer(p_plan_id)
    or public.kwilt_can_access_shared_meal_cart(p_plan_id)) then raise exception 'meal_plan_read_forbidden'; end if;
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
revoke all on function public.get_kwilt_meal_cart_history(uuid) from public,anon;
grant execute on function public.get_kwilt_meal_cart_history(uuid) to authenticated,service_role;

create or replace function public.get_kwilt_external_meal_cart_history(p_user_id uuid,p_plan_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous_claims text := current_setting('request.jwt.claims',true); result jsonb;
begin
  previous_claims := public.kwilt_external_food_actor_context(p_user_id);
  result := public.get_kwilt_meal_cart_history(p_plan_id);
  perform set_config('request.jwt.claims',previous_claims,true);
  return result;
exception when others then
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  raise;
end;
$$;

-- Retain explicit quantity/concept/unit corrections in the canonical compiler's
-- newly-created revision. Ambiguous mappings stay visible as conflicts; never
-- guess which of multiple new lines inherits an edit. Manual lines are already
-- copied by the canonical sync routine and are deliberately excluded here.
create or replace function public.kwilt_preserve_external_grocery_corrections(p_list_id uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare new_list public.kwilt_grocery_lists; old_item public.kwilt_grocery_items;
  correction public.kwilt_grocery_item_corrections; matched uuid; matches integer;
  before_row jsonb; changed_count integer:=0; incoming_matches integer;
  edit_concept boolean; edit_min boolean; edit_max boolean; edit_unit boolean; edit_note boolean; edit_state boolean;
begin
  select * into new_list from public.kwilt_grocery_lists where id=p_list_id for update;
  if new_list.id is null or not public.kwilt_can_read_grocery_list(p_list_id) then raise exception 'grocery_list_not_accessible'; end if;
  if new_list.rebased_from_list_id is null then return 0; end if;
  for correction in
    select distinct on (c.grocery_item_id) c.* from public.kwilt_grocery_item_corrections c
    join public.kwilt_grocery_items i on i.id=c.grocery_item_id
    where i.grocery_list_id=new_list.rebased_from_list_id and not exists (
      select 1 from public.kwilt_grocery_item_sources s where s.grocery_item_id=i.id and s.kind in ('manual','household_request'))
    order by c.grocery_item_id,c.created_at desc,c.id desc
  loop
    select * into old_item from public.kwilt_grocery_items where id=correction.grocery_item_id;
    select count(*),min(i.id::text)::uuid into matches,matched from public.kwilt_grocery_items i
    where i.grocery_list_id=p_list_id and exists (
      select 1 from public.kwilt_grocery_item_sources ns
      join public.kwilt_grocery_item_sources os on os.grocery_item_id=old_item.id and ns.kind=os.kind and (
        (ns.kind='recipe_ingredient' and ns.recipe_version_id=os.recipe_version_id and ns.ingredient_line_id=os.ingredient_line_id)
        or (ns.kind='catalog_recipe_ingredient' and ns.source_snapshot->>'recipeVersionId'=os.source_snapshot->>'recipeVersionId'
          and ns.source_snapshot->>'ingredientLineId'=os.source_snapshot->>'ingredientLineId'))
      where ns.grocery_item_id=i.id);
    incoming_matches:=0;
    if matches=1 then
      select count(distinct os.grocery_item_id) into incoming_matches
      from public.kwilt_grocery_item_sources ns
      join public.kwilt_grocery_item_sources os on ns.kind=os.kind and (
        (ns.kind='recipe_ingredient' and ns.recipe_version_id=os.recipe_version_id and ns.ingredient_line_id=os.ingredient_line_id)
        or (ns.kind='catalog_recipe_ingredient' and ns.source_snapshot->>'recipeVersionId'=os.source_snapshot->>'recipeVersionId'
          and ns.source_snapshot->>'ingredientLineId'=os.source_snapshot->>'ingredientLineId'))
      join public.kwilt_grocery_items oi on oi.id=os.grocery_item_id
      where ns.grocery_item_id=matched and oi.grocery_list_id=new_list.rebased_from_list_id
        and exists(select 1 from public.kwilt_grocery_item_corrections c where c.grocery_item_id=oi.id);
    end if;
    if matches=1 and incoming_matches=1 then
      select bool_or(c.before_value->'concept' is distinct from c.after_value->'concept'),
        bool_or(c.before_value->'quantity_min' is distinct from c.after_value->'quantity_min'),
        bool_or(c.before_value->'quantity_max' is distinct from c.after_value->'quantity_max'),
        bool_or(c.before_value->'unit' is distinct from c.after_value->'unit'),
        bool_or(c.before_value->'note' is distinct from c.after_value->'note'),
        bool_or(c.before_value->'state' is distinct from c.after_value->'state')
        into edit_concept,edit_min,edit_max,edit_unit,edit_note,edit_state
      from public.kwilt_grocery_item_corrections c where c.grocery_item_id=old_item.id;
      select to_jsonb(i) into before_row from public.kwilt_grocery_items i where i.id=matched;
      -- Preserve the latest persisted row, not a stale prior correction snapshot.
      update public.kwilt_grocery_items set concept=case when edit_concept then old_item.concept else concept end,
        quantity_min=case when edit_min then old_item.quantity_min else quantity_min end,
        quantity_max=case when edit_max then old_item.quantity_max else quantity_max end,
        unit=case when edit_unit then old_item.unit else unit end,note=case when edit_note then old_item.note else note end,
        state=case when edit_state then old_item.state else state end,updated_at=now()
      where id=matched;
      insert into public.kwilt_grocery_item_corrections(grocery_item_id,grocery_list_revision,corrected_by_person_id,before_value,after_value,reason)
        select matched,new_list.revision,public.kwilt_current_person_id(),before_row,to_jsonb(i),'rebased:user_elected'
        from public.kwilt_grocery_items i where i.id=matched;
      -- Changed compiler quantities can mean a changed meal count. Keep the edit
      -- but require review rather than silently claiming its quantity is current.
      if before_row->'quantity_min' is distinct from correction.before_value->'quantity_min'
        or before_row->'quantity_max' is distinct from correction.before_value->'quantity_max'
        or before_row->'unit' is distinct from correction.before_value->'unit' then
        insert into public.kwilt_grocery_rebase_conflicts(owner_person_id,from_list_id,to_list_id,from_item_id,kind,proposed_delta)
          values(new_list.owner_person_id,new_list.rebased_from_list_id,p_list_id,old_item.id,'correction_ambiguous',
            jsonb_build_object('reason','source_quantity_changed','preserved',to_jsonb(old_item),'compiled',before_row))
          on conflict(to_list_id,from_item_id,kind) do nothing;
        changed_count:=changed_count+1;
      end if;
    else
      insert into public.kwilt_grocery_rebase_conflicts(owner_person_id,from_list_id,to_list_id,from_item_id,kind,proposed_delta)
        values(new_list.owner_person_id,new_list.rebased_from_list_id,p_list_id,old_item.id,
          case when matches=0 then 'correction_unmatched' else 'correction_ambiguous' end,to_jsonb(old_item))
        on conflict(to_list_id,from_item_id,kind) do nothing;
      changed_count:=changed_count+1;
    end if;
  end loop;
  return changed_count;
end;
$$;
revoke all on function public.kwilt_preserve_external_grocery_corrections(uuid) from public,anon,authenticated;
grant execute on function public.kwilt_preserve_external_grocery_corrections(uuid) to service_role;

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
  if op->>'type' is distinct from p_operation_id or jsonb_typeof(payload) is distinct from 'object'
    or p_operation_id not in (
      'meal_planning.cart.ensure','meal_planning.cart.add','meal_planning.cart.mark_made','meal_planning.cart.remove',
      'meal_planning.plan.create','meal_planning.plan.update','meal_planning.plan.finalize','meal_planning.plan.revise',
      'meal_planning.round.open','meal_planning.round.close',
      'meal_planning.response.submit','meal_planning.response.withdraw',
      'groceries.compile','groceries.item.add','groceries.item.update','groceries.item.set_state'
    ) then raise exception 'operation_contract_mismatch'; end if;
  target:=nullif(op->>'targetId','')::uuid;
  expected:=nullif(payload->>'expectedVersion','')::integer;
  if p_operation_id='meal_planning.cart.ensure' then
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
  elsif p_operation_id='meal_planning.cart.add' then
    -- Lock scope before plan, matching canonical shared add's lock order.
    select household_id into household from public.kwilt_meal_plans where id=target;
    perform pg_advisory_xact_lock(hashtextextended(coalesce(household::text,'personal:'||actor_person::text),2086));
    select * into plan from public.kwilt_meal_plans where id=target for update;
    if plan.id is null or not(public.kwilt_is_meal_plan_organizer(target) or public.kwilt_can_access_shared_meal_cart(target)) then
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
  elsif p_operation_id in ('meal_planning.cart.remove','meal_planning.cart.mark_made') then
    candidate_id:=target;
    select plan_id into existing_plan_id from public.kwilt_meal_plan_candidates where id=candidate_id;
    select * into plan from public.kwilt_meal_plans where id=existing_plan_id for update;
    select * into candidate from public.kwilt_meal_plan_candidates where id=candidate_id for update;
    if plan.id is null or not(public.kwilt_is_meal_plan_organizer(plan.id) or public.kwilt_can_manage_household_plan(plan.id)) then raise exception 'meal_plan_manage_forbidden'; end if;
    if plan.state<>'draft' or expected is null or plan.version<>expected
      or candidate.lifecycle_state not in ('idea','sent')
      or p_operation_id='meal_planning.cart.mark_made' and candidate.lifecycle_state<>'sent' then raise exception 'stale_plan_candidate'; end if;
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
  ref_id:=coalesce(domain_result->>'groceryListId',domain_result->>'planId',target::text);
  ref_kind:=case when domain_result ? 'groceryListId' then 'grocery_list' else 'meal_plan' end;
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

revoke all on function public.get_kwilt_external_food_control_snapshot(uuid),
  public.list_kwilt_external_recipe_catalog_v2(uuid,text,integer),
  public.get_kwilt_external_meal_cart_history(uuid,uuid),
  public.execute_kwilt_external_food_operations(uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.get_kwilt_external_food_control_snapshot(uuid),
  public.list_kwilt_external_recipe_catalog_v2(uuid,text,integer),
  public.get_kwilt_external_meal_cart_history(uuid,uuid),
  public.execute_kwilt_external_food_operations(uuid,text,text,text,jsonb,jsonb) to service_role;

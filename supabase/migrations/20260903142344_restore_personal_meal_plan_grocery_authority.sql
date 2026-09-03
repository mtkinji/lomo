-- Version reconciled to the production migration history after deployment.
-- Restore the server-only authority used when an individual Meal Plan sends
-- recipes to its person-owned Grocery list. The original individual-first
-- migration is retained under pending-migrations after hosted-history
-- reconciliation, so the active migration chain must carry this function.
create or replace function public.sync_kwilt_personal_plan_groceries(
  p_actor_person_id uuid,
  p_plan_id uuid,
  p_expected_version integer,
  p_action text,
  p_candidate_ids uuid[],
  p_payload_hash text,
  p_compiled_items jsonb,
  p_acknowledge_hard_passes boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_plan public.kwilt_meal_plans;
  v_previous public.kwilt_grocery_lists;
  v_list public.kwilt_grocery_lists;
  v_candidate_id uuid;
  v_item jsonb;
  v_source jsonb;
  v_item_id uuid;
  v_position bigint;
  v_revision integer;
  v_old_item public.kwilt_grocery_items;
  v_old_state text;
  v_old_note text;
begin
  if p_action not in ('send','remove')
    or coalesce(cardinality(p_candidate_ids),0)<1
    or char_length(coalesce(p_payload_hash,'')) not between 1 and 256
    or jsonb_typeof(p_compiled_items)<>'array'
    or jsonb_array_length(p_compiled_items)>500
  then raise exception 'invalid_personal_plan_grocery_sync'; end if;

  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null
    or v_plan.household_id is not null
    or v_plan.organizer_person_id<>p_actor_person_id
  then raise exception 'personal_plan_grocery_manage_forbidden'; end if;
  if v_plan.state<>'draft' or v_plan.version<>p_expected_version then
    raise exception 'stale_household_plan';
  end if;

  foreach v_candidate_id in array p_candidate_ids loop
    perform pg_advisory_xact_lock(hashtextextended(v_candidate_id::text,0));
    if not exists(
      select 1 from public.kwilt_meal_plan_candidates candidate
      where candidate.id=v_candidate_id
        and candidate.plan_id=p_plan_id
        and candidate.lifecycle_state=case when p_action='send' then 'idea' else 'sent' end
    ) then raise exception 'invalid_household_plan_candidate'; end if;
  end loop;

  if p_action='send' and exists(
    select 1
    from public.kwilt_meal_plan_candidates candidate
    join public.kwilt_meal_candidate_reactions reaction
      on reaction.candidate_id=candidate.id and reaction.reaction='hard_pass'
    where candidate.plan_id=p_plan_id
      and candidate.id=any(p_candidate_ids)
      and (candidate.hard_pass_overridden_at is null or reaction.created_at>candidate.hard_pass_overridden_at)
  ) then
    if not p_acknowledge_hard_passes then raise exception 'hard_pass_review_required'; end if;
    update public.kwilt_meal_plan_candidates
      set hard_pass_overridden_at=now(), hard_pass_overridden_by_person_id=p_actor_person_id
      where plan_id=p_plan_id and id=any(p_candidate_ids);
  end if;

  select * into v_previous
  from public.kwilt_grocery_lists list
  where list.source_kind='meal_plan'
    and list.source_meal_plan_id=p_plan_id
    and list.status<>'stale'
  order by list.revision desc limit 1 for update;

  if p_action='send' then
    update public.kwilt_meal_plan_candidates
      set lifecycle_state='sent', sent_at=now(), sent_by_person_id=p_actor_person_id, lifecycle_updated_at=now()
      where id=any(p_candidate_ids);
  else
    update public.kwilt_meal_plan_candidates
      set lifecycle_state='removed', resolved_at=now(), resolved_by_person_id=p_actor_person_id,
        removed_grocery_behavior='removed', lifecycle_updated_at=now()
      where id=any(p_candidate_ids);
  end if;

  update public.kwilt_meal_plans set version=version+1,updated_at=now()
    where id=p_plan_id returning * into v_plan;
  update public.kwilt_grocery_lists set status='stale',updated_at=now()
    where source_kind='meal_plan' and source_meal_plan_id=p_plan_id and status in ('review_needed','ready');
  select coalesce(max(revision),0)+1 into v_revision
    from public.kwilt_grocery_lists where source_kind='meal_plan' and source_meal_plan_id=p_plan_id;

  insert into public.kwilt_grocery_lists(
    owner_person_id,source_kind,source_household_id,source_meal_plan_id,
    source_meal_plan_version,revision,status,payload_hash,rebased_from_list_id,rebased_from_revision
  ) values(
    p_actor_person_id,'meal_plan',null,p_plan_id,v_plan.version,v_revision,'review_needed',
    p_payload_hash,v_previous.id,v_previous.revision
  ) returning * into v_list;

  for v_item,v_position in select value,ordinality from jsonb_array_elements(p_compiled_items) with ordinality loop
    if char_length(btrim(coalesce(v_item->>'concept',''))) not between 1 and 320
      or jsonb_typeof(coalesce(v_item->'sources','[]'::jsonb))<>'array'
    then raise exception 'invalid_grocery_item'; end if;
    v_old_state:='needed'; v_old_note:=null;
    if v_previous.id is not null then
      select old_item.state,old_item.note into v_old_state,v_old_note
      from public.kwilt_grocery_items old_item
      where old_item.grocery_list_id=v_previous.id
        and old_item.concept=btrim(v_item->>'concept')
        and old_item.unit is not distinct from (v_item->>'unit')
        and old_item.preparation is not distinct from (v_item->>'preparation')
      order by case old_item.state when 'purchased' then 0 when 'already_have' then 1 else 2 end,
        old_item.position limit 1;
    end if;
    insert into public.kwilt_grocery_items(
      grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,
      package_unit,preparation,optional,aisle,original_display_texts,review_reason,state,note
    ) values(
      v_list.id,v_position-1,btrim(v_item->>'concept'),nullif(v_item->>'quantityMin','')::numeric,
      nullif(v_item->>'quantityMax','')::numeric,v_item->>'unit',nullif(v_item->>'packageQuantity','')::numeric,
      v_item->>'packageUnit',v_item->>'preparation',coalesce((v_item->>'optional')::boolean,false),
      coalesce(v_item->>'aisle','other'),coalesce(v_item->'originalDisplayTexts','[]'::jsonb),
      v_item->>'reviewReason',coalesce(v_old_state,'needed'),v_old_note
    ) returning id into v_item_id;

    for v_source in select value from jsonb_array_elements(v_item->'sources') loop
      v_candidate_id:=(v_source->>'planCandidateId')::uuid;
      if not exists(
        select 1 from public.kwilt_meal_plan_candidates candidate
        where candidate.id=v_candidate_id and candidate.plan_id=p_plan_id
          and (candidate.lifecycle_state='sent' or (candidate.lifecycle_state='removed' and candidate.removed_grocery_behavior='kept'))
          and candidate.recipe_snapshot->>'recipeVersionId'=v_source->>'recipeVersionId'
      ) then raise exception 'invalid_grocery_source'; end if;
      if v_source->>'kind'='catalog_recipe_ingredient' then
        if not exists(
          select 1 from public.kwilt_meal_plan_candidates candidate,
            jsonb_array_elements(coalesce(candidate.recipe_snapshot->'ingredients','[]'::jsonb)) ingredient
          where candidate.id=v_candidate_id
            and ingredient->>'id'=v_source->>'ingredientLineId'
            and ingredient->>'originalText'=v_source->>'originalText'
        ) then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(
          grocery_item_id,kind,plan_candidate_id,contribution_quantity_min,contribution_quantity_max,
          contribution_unit,contribution_optional,source_snapshot
        ) values(
          v_item_id,'catalog_recipe_ingredient',v_candidate_id,nullif(v_source->>'quantityMin','')::numeric,
          nullif(v_source->>'quantityMax','')::numeric,v_source->>'unit',coalesce((v_source->>'optional')::boolean,false),
          jsonb_build_object('recipeVersionId',v_source->>'recipeVersionId','ingredientLineId',v_source->>'ingredientLineId','originalText',v_source->>'originalText')
        );
      elsif v_source->>'kind'='recipe_ingredient' then
        if not exists(
          select 1 from public.kwilt_recipe_ingredients ingredient
          where ingredient.id=(v_source->>'ingredientLineId')::uuid
            and ingredient.recipe_version_id=(v_source->>'recipeVersionId')::uuid
            and ingredient.original_text=v_source->>'originalText'
        ) then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(
          grocery_item_id,kind,recipe_version_id,ingredient_line_id,plan_candidate_id,
          contribution_quantity_min,contribution_quantity_max,contribution_unit,contribution_optional,source_snapshot
        ) values(
          v_item_id,'recipe_ingredient',(v_source->>'recipeVersionId')::uuid,(v_source->>'ingredientLineId')::uuid,
          v_candidate_id,nullif(v_source->>'quantityMin','')::numeric,nullif(v_source->>'quantityMax','')::numeric,
          v_source->>'unit',coalesce((v_source->>'optional')::boolean,false),jsonb_build_object('originalText',v_source->>'originalText')
        );
      else raise exception 'invalid_grocery_source'; end if;
    end loop;
  end loop;

  if v_previous.id is not null then
    for v_old_item in
      select old_item.* from public.kwilt_grocery_items old_item
      where old_item.grocery_list_id=v_previous.id
        and exists(select 1 from public.kwilt_grocery_item_sources old_source
          where old_source.grocery_item_id=old_item.id and old_source.kind in ('manual','household_request'))
      order by old_item.position
    loop
      select coalesce(max(position),-1)+1 into v_position from public.kwilt_grocery_items where grocery_list_id=v_list.id;
      insert into public.kwilt_grocery_items(
        grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,
        package_unit,preparation,optional,aisle,original_display_texts,review_reason,state,note
      ) values(
        v_list.id,v_position,v_old_item.concept,v_old_item.quantity_min,v_old_item.quantity_max,
        v_old_item.unit,v_old_item.package_quantity,v_old_item.package_unit,v_old_item.preparation,
        v_old_item.optional,v_old_item.aisle,v_old_item.original_display_texts,v_old_item.review_reason,
        v_old_item.state,v_old_item.note
      ) returning id into v_item_id;
      insert into public.kwilt_grocery_item_sources(
        grocery_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot
      ) select
        v_item_id,kind,note_id,request_id,requested_by_person_id,
        source_snapshot||jsonb_build_object('rebasedFromItemId',v_old_item.id)
      from public.kwilt_grocery_item_sources where grocery_item_id=v_old_item.id
        and kind in ('manual','household_request');
    end loop;
  end if;

  return jsonb_build_object(
    'planId',p_plan_id,'version',v_plan.version,'groceryListId',v_list.id,
    'revision',v_list.revision,'status',v_list.status,'action',p_action
  );
end;
$$;

revoke execute on function public.sync_kwilt_personal_plan_groceries(uuid,uuid,integer,text,uuid[],text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.sync_kwilt_personal_plan_groceries(uuid,uuid,integer,text,uuid[],text,jsonb,boolean) to service_role;

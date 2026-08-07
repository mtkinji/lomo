-- Checking an item off as already at home is user-authored shopping work, just
-- like correcting its quantity or adding a note. Record that state transition
-- in the correction ledger so a later plan revision can carry it forward.
create or replace function public.set_kwilt_grocery_item_state(p_item_id uuid,p_expected_revision integer,p_state text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_item public.kwilt_grocery_items; v_list public.kwilt_grocery_lists; v_person uuid; v_before jsonb;
begin
  perform public.kwilt_require_permanent_user(); select public.kwilt_current_person_id() into v_person; select * into v_item from public.kwilt_grocery_items where id=p_item_id for update; select * into v_list from public.kwilt_grocery_lists where id=v_item.grocery_list_id for update;
  if v_list.owner_person_id<>v_person then raise exception 'grocery_list_not_owned'; end if; if v_list.revision<>p_expected_revision then raise exception 'stale_grocery_list_revision'; end if; if p_state not in ('needed','already_have','purchased','skipped') then raise exception 'invalid_grocery_item_state'; end if;
  if v_item.state<>p_state then
    v_before:=to_jsonb(v_item);
    update public.kwilt_grocery_items set state=p_state,updated_at=now() where id=p_item_id returning * into v_item;
    insert into public.kwilt_grocery_item_corrections(grocery_item_id,grocery_list_revision,corrected_by_person_id,before_value,after_value,reason) values(p_item_id,v_list.revision,v_person,v_before,to_jsonb(v_item),'state:user_elected');
  end if;
  update public.kwilt_grocery_lists set revision=revision+1,updated_at=now() where id=v_list.id returning * into v_list;
  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'itemId',p_item_id,'state',p_state);
end;
$$;

-- Preserve the latest user-authored state alongside quantity, unit, and note
-- corrections when a matching ingredient survives into the revised plan.
create or replace function public.compile_kwilt_grocery_list(p_plan_id uuid,p_expected_plan_version integer,p_payload_hash text,p_compiled_items jsonb,p_rebase_from_list_id uuid default null,p_expected_rebase_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_person uuid; v_plan public.kwilt_meal_plans; v_existing public.kwilt_grocery_lists; v_rebase public.kwilt_grocery_lists; v_list public.kwilt_grocery_lists; v_revision integer; v_item jsonb; v_source jsonb; v_position bigint; v_item_id uuid; v_old_item public.kwilt_grocery_items; v_correction public.kwilt_grocery_item_corrections; v_match_id uuid; v_match_count integer; v_before jsonb; v_manual_count integer:=0; v_correction_count integer:=0; v_conflict_count integer:=0;
begin
  select person_id into v_person from public.kwilt_person_auth_bindings where user_id=v_user and status='active';
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or v_plan.organizer_person_id<>v_person then raise exception 'grocery_plan_not_owned'; end if;
  if v_plan.version<>p_expected_plan_version or v_plan.state<>'finalized' then raise exception 'stale_or_unfinalized_meal_plan'; end if;
  if char_length(coalesce(p_payload_hash,'')) not between 1 and 256 or jsonb_typeof(p_compiled_items)<>'array' or jsonb_array_length(p_compiled_items)>500 then raise exception 'invalid_grocery_compilation'; end if;
  if (p_rebase_from_list_id is null)<>(p_expected_rebase_revision is null) then raise exception 'invalid_grocery_rebase'; end if;
  if p_rebase_from_list_id is not null then select * into v_rebase from public.kwilt_grocery_lists where id=p_rebase_from_list_id for update; if v_rebase.id is null or v_rebase.owner_person_id<>v_person or v_rebase.source_meal_plan_id<>p_plan_id or v_rebase.revision<>p_expected_rebase_revision then raise exception 'stale_grocery_rebase_source'; end if; end if;
  select * into v_existing from public.kwilt_grocery_lists where source_meal_plan_id=p_plan_id and source_meal_plan_version=p_expected_plan_version;
  if v_existing.id is not null then
    if v_existing.payload_hash<>p_payload_hash then raise exception 'grocery_compilation_idempotency_conflict'; end if;
    if p_rebase_from_list_id is not null and (v_existing.rebased_from_list_id is distinct from p_rebase_from_list_id or v_existing.rebased_from_revision is distinct from p_expected_rebase_revision) then raise exception 'grocery_rebase_idempotency_conflict'; end if;
    select count(*) into v_correction_count from public.kwilt_grocery_item_corrections correction join public.kwilt_grocery_items item on item.id=correction.grocery_item_id where item.grocery_list_id=v_existing.id and correction.reason='rebased:user_elected';
    select count(distinct source.grocery_item_id) into v_manual_count from public.kwilt_grocery_item_sources source join public.kwilt_grocery_items item on item.id=source.grocery_item_id where item.grocery_list_id=v_existing.id and source.source_snapshot?'rebasedFromItemId';
    select count(*) into v_conflict_count from public.kwilt_grocery_rebase_conflicts conflict where conflict.to_list_id=v_existing.id;
    return jsonb_build_object('groceryListId',v_existing.id,'revision',v_existing.revision,'status',v_existing.status,'replayed',true,'rebasedCorrectionCount',v_correction_count,'rebasedManualCount',v_manual_count,'rebaseConflictCount',v_conflict_count);
  end if;
  update public.kwilt_grocery_lists set status='stale',updated_at=now() where source_meal_plan_id=p_plan_id and status in ('review_needed','ready');
  select coalesce(max(revision),0)+1 into v_revision from public.kwilt_grocery_lists where source_meal_plan_id=p_plan_id;
  insert into public.kwilt_grocery_lists(owner_person_id,source_meal_plan_id,source_meal_plan_version,revision,status,payload_hash,rebased_from_list_id,rebased_from_revision)
    values(v_person,p_plan_id,p_expected_plan_version,v_revision,'review_needed',p_payload_hash,p_rebase_from_list_id,p_expected_rebase_revision) returning * into v_list;
  for v_item,v_position in select value,ordinality from jsonb_array_elements(p_compiled_items) with ordinality loop
    if char_length(btrim(coalesce(v_item->>'concept',''))) not between 1 and 320 or jsonb_typeof(coalesce(v_item->'sources','[]'::jsonb))<>'array' then raise exception 'invalid_grocery_item'; end if;
    insert into public.kwilt_grocery_items(grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,package_unit,preparation,optional,aisle,original_display_texts,review_reason)
      values(v_list.id,v_position-1,btrim(v_item->>'concept'),nullif(v_item->>'quantityMin','')::numeric,nullif(v_item->>'quantityMax','')::numeric,v_item->>'unit',nullif(v_item->>'packageQuantity','')::numeric,v_item->>'packageUnit',v_item->>'preparation',coalesce((v_item->>'optional')::boolean,false),coalesce(v_item->>'aisle','other'),coalesce(v_item->'originalDisplayTexts','[]'::jsonb),v_item->>'reviewReason') returning id into v_item_id;
    for v_source in select value from jsonb_array_elements(v_item->'sources') loop
      if not exists(select 1 from public.kwilt_meal_plan_entries entry where entry.plan_id=p_plan_id and entry.plan_version=p_expected_plan_version and entry.id=(v_source->>'planEntryId')::uuid and entry.recipe_snapshot->>'recipeVersionId'=v_source->>'recipeVersionId') then raise exception 'invalid_grocery_source'; end if;
      if v_source->>'kind'='catalog_recipe_ingredient' then
        if not exists(
          select 1 from public.kwilt_meal_plan_entries entry,
            jsonb_array_elements(coalesce(entry.recipe_snapshot->'ingredients','[]'::jsonb)) ingredient
          where entry.plan_id=p_plan_id and entry.plan_version=p_expected_plan_version and entry.id=(v_source->>'planEntryId')::uuid
            and entry.recipe_snapshot->>'sourceType'='catalog'
            and entry.recipe_snapshot->>'recipeVersionId'=v_source->>'recipeVersionId'
            and entry.recipe_snapshot->>'contentHash' like 'kwilt:%:v%'
            and ingredient->>'id'=v_source->>'ingredientLineId'
            and ingredient->>'originalText'=v_source->>'originalText'
        ) then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,plan_entry_id,source_snapshot)
          values(v_item_id,'catalog_recipe_ingredient',(v_source->>'planEntryId')::uuid,jsonb_build_object('recipeVersionId',v_source->>'recipeVersionId','ingredientLineId',v_source->>'ingredientLineId','originalText',v_source->>'originalText'));
      elsif v_source->>'kind'='recipe_ingredient' then
        if not exists(select 1 from public.kwilt_recipe_ingredients ingredient where ingredient.id=(v_source->>'ingredientLineId')::uuid and ingredient.recipe_version_id=(v_source->>'recipeVersionId')::uuid) then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,recipe_version_id,ingredient_line_id,plan_entry_id,source_snapshot)
          values(v_item_id,'recipe_ingredient',(v_source->>'recipeVersionId')::uuid,(v_source->>'ingredientLineId')::uuid,(v_source->>'planEntryId')::uuid,jsonb_build_object('originalText',v_source->>'originalText'));
      else
        raise exception 'invalid_grocery_source';
      end if;
    end loop;
  end loop;
  if v_rebase.id is not null then
    for v_old_item in select old_item.* from public.kwilt_grocery_items old_item where old_item.grocery_list_id=v_rebase.id and exists(select 1 from public.kwilt_grocery_item_sources old_source where old_source.grocery_item_id=old_item.id and old_source.kind in ('manual','household_request')) order by old_item.position loop
      select coalesce(max(position),-1)+1 into v_position from public.kwilt_grocery_items where grocery_list_id=v_list.id;
      insert into public.kwilt_grocery_items(grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,package_unit,preparation,optional,aisle,original_display_texts,review_reason,state,note)
      values(v_list.id,v_position,v_old_item.concept,v_old_item.quantity_min,v_old_item.quantity_max,v_old_item.unit,v_old_item.package_quantity,v_old_item.package_unit,v_old_item.preparation,v_old_item.optional,v_old_item.aisle,v_old_item.original_display_texts,v_old_item.review_reason,v_old_item.state,v_old_item.note) returning id into v_item_id;
      insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot)
      select v_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot||jsonb_build_object('rebasedFromItemId',v_old_item.id) from public.kwilt_grocery_item_sources where grocery_item_id=v_old_item.id and kind in ('manual','household_request');
      v_manual_count:=v_manual_count+1;
    end loop;
    for v_correction in select distinct on (correction.grocery_item_id) correction.* from public.kwilt_grocery_item_corrections correction join public.kwilt_grocery_items old_item on old_item.id=correction.grocery_item_id where old_item.grocery_list_id=v_rebase.id order by correction.grocery_item_id,correction.created_at desc loop
      select count(*) into v_match_count from public.kwilt_grocery_items new_item where new_item.grocery_list_id=v_list.id and exists(
        select 1 from public.kwilt_grocery_item_sources new_source join public.kwilt_grocery_item_sources old_source on (
          (new_source.kind='recipe_ingredient' and old_source.kind='recipe_ingredient' and old_source.recipe_version_id=new_source.recipe_version_id and old_source.ingredient_line_id=new_source.ingredient_line_id)
          or (new_source.kind='catalog_recipe_ingredient' and old_source.kind='catalog_recipe_ingredient' and old_source.source_snapshot->>'recipeVersionId'=new_source.source_snapshot->>'recipeVersionId' and old_source.source_snapshot->>'ingredientLineId'=new_source.source_snapshot->>'ingredientLineId')
        ) where new_source.grocery_item_id=new_item.id and old_source.grocery_item_id=v_correction.grocery_item_id
      );
      if v_match_count=1 then
        select new_item.id into v_match_id from public.kwilt_grocery_items new_item where new_item.grocery_list_id=v_list.id and exists(
          select 1 from public.kwilt_grocery_item_sources new_source join public.kwilt_grocery_item_sources old_source on (
            (new_source.kind='recipe_ingredient' and old_source.kind='recipe_ingredient' and old_source.recipe_version_id=new_source.recipe_version_id and old_source.ingredient_line_id=new_source.ingredient_line_id)
            or (new_source.kind='catalog_recipe_ingredient' and old_source.kind='catalog_recipe_ingredient' and old_source.source_snapshot->>'recipeVersionId'=new_source.source_snapshot->>'recipeVersionId' and old_source.source_snapshot->>'ingredientLineId'=new_source.source_snapshot->>'ingredientLineId')
          ) where new_source.grocery_item_id=new_item.id and old_source.grocery_item_id=v_correction.grocery_item_id
        ) limit 1;
        select to_jsonb(matched) into v_before from public.kwilt_grocery_items matched where matched.id=v_match_id;
        update public.kwilt_grocery_items set concept=coalesce(nullif(btrim(v_correction.after_value->>'concept'),''),concept),quantity_min=case when v_correction.after_value?'quantity_min' then nullif(v_correction.after_value->>'quantity_min','')::numeric else quantity_min end,quantity_max=case when v_correction.after_value?'quantity_max' then nullif(v_correction.after_value->>'quantity_max','')::numeric else quantity_max end,unit=case when v_correction.after_value?'unit' then v_correction.after_value->>'unit' else unit end,note=case when v_correction.after_value?'note' then v_correction.after_value->>'note' else note end,state=case when v_correction.after_value?'state' then v_correction.after_value->>'state' else state end,updated_at=now() where id=v_match_id;
        insert into public.kwilt_grocery_item_corrections(grocery_item_id,grocery_list_revision,corrected_by_person_id,before_value,after_value,reason) select v_match_id,v_list.revision,v_person,v_before,to_jsonb(matched),'rebased:user_elected' from public.kwilt_grocery_items matched where matched.id=v_match_id;
        v_correction_count:=v_correction_count+1;
      else
        insert into public.kwilt_grocery_rebase_conflicts(owner_person_id,from_list_id,to_list_id,from_item_id,kind,proposed_delta) values(v_person,v_rebase.id,v_list.id,v_correction.grocery_item_id,case when v_match_count=0 then 'correction_unmatched' else 'correction_ambiguous' end,v_correction.after_value);
        v_conflict_count:=v_conflict_count+1;
      end if;
    end loop;
  end if;
  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'status',v_list.status,'replayed',false,'rebasedCorrectionCount',v_correction_count,'rebasedManualCount',v_manual_count,'rebaseConflictCount',v_conflict_count);
end;
$$;

revoke execute on function public.set_kwilt_grocery_item_state(uuid,integer,text),public.compile_kwilt_grocery_list(uuid,integer,text,jsonb,uuid,integer) from public,anon;
grant execute on function public.set_kwilt_grocery_item_state(uuid,integer,text),public.compile_kwilt_grocery_list(uuid,integer,text,jsonb,uuid,integer) to authenticated;

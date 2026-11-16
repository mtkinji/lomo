do $repair$
declare source jsonb; publication public.kwilt_recipe_publications; old_version public.kwilt_recipe_versions; new_id uuid; inserted integer;
begin
for source in select value from jsonb_array_elements(__PAYLOAD__::jsonb) loop
 select * into strict publication from public.kwilt_recipe_publications where roster_id=source->>'rosterId' for update;
 select * into strict old_version from public.kwilt_recipe_versions where id=publication.published_recipe_version_id;
 if publication.state <> 'withdrawn' or old_version.content_hash is distinct from source->>'sourceRecipeHash' or old_version.version<>1 or exists(select 1 from public.kwilt_recipe_ingredients where recipe_version_id=old_version.id) then raise exception 'repair_precondition_failed:%',source->>'rosterId'; end if;
 new_id:=gen_random_uuid();
 insert into public.kwilt_recipe_versions(id,recipe_id,version,title,description,yield_quantity,yield_unit,scaling_state,prep_minutes,cook_minutes,notes,content_hash,created_by_person_id,mutation_idempotency_key)
 values(new_id,old_version.recipe_id,old_version.version+1,old_version.title,old_version.description,old_version.yield_quantity,old_version.yield_unit,'verified',old_version.prep_minutes,old_version.cook_minutes,old_version.notes,old_version.content_hash,old_version.created_by_person_id,'catalog-ingredient-repair-20261016:'||(source->>'rosterId'));
 insert into public.kwilt_recipe_ingredients(recipe_version_id,source_line_id,position,original_text,quantity_min,quantity_max,unit,ingredient_concept,preparation,optional,parse_confidence,scale_rule)
 select new_id,'catalog-ingredient-'||(line->>'position'),(line->>'position')::integer,line->>'originalText',(line->>'quantityMin')::numeric,(line->>'quantityMax')::numeric,line->>'unit',line->>'ingredientConcept',line->>'preparation',(line->>'optional')::boolean,(line->>'parseConfidence')::numeric,line->'scaleRule' from jsonb_array_elements(source->'ingredients') line;
 get diagnostics inserted=row_count;
 if inserted<>jsonb_array_length(source->'ingredients') or inserted<5 then raise exception 'incomplete_repair'; end if;
 insert into public.kwilt_recipe_instructions(recipe_version_id,source_step_id,position,section_label,step_text) select new_id,source_step_id,position,section_label,step_text from public.kwilt_recipe_instructions where recipe_version_id=old_version.id;
 insert into public.kwilt_recipe_provenance(recipe_version_id,method,source_content_hash,rights_basis,imported_at) select new_id,method,source_content_hash,rights_basis,imported_at from public.kwilt_recipe_provenance where recipe_version_id=old_version.id;
 update public.kwilt_recipes set current_version_id=new_id,updated_at=now() where id=old_version.recipe_id;
 update public.kwilt_recipe_publications set published_recipe_version_id=new_id,updated_at=now() where id=publication.id;
 update public.kwilt_recipe_media_assets a set recipe_version_id=new_id where a.recipe_id=old_version.recipe_id and a.recipe_version_id=old_version.id and a.public_allowed=false and exists(select 1 from public.kwilt_recipe_image_jobs j where j.media_asset_id=a.id and j.status='editorial_review');
 update public.kwilt_recipe_image_jobs set recipe_version_id=new_id where publication_id=publication.id and status='editorial_review' and recipe_version_id=old_version.id;
end loop;
end $repair$;
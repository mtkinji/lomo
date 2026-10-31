-- Rollback-only privacy and mutation assertions for private Recipes.
-- Run against a migrated local database using an administrative connection.

begin;

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'recipe-owner@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'recipe-household@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'recipe-stranger@example.invalid', '', now(), now());

insert into public.kwilt_people(id, display_name, kind, created_by_user_id) values
  ('62000000-0000-0000-0000-000000000001', 'Recipe owner', 'adult', '61000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', 'Household member', 'adult', '61000000-0000-0000-0000-000000000002'),
  ('62000000-0000-0000-0000-000000000003', 'Stranger', 'adult', '61000000-0000-0000-0000-000000000003');

insert into public.kwilt_person_auth_bindings(person_id, user_id) values
  ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002'),
  ('62000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003');

insert into public.kwilt_households(id, name, created_by_user_id)
values ('63000000-0000-0000-0000-000000000001', 'Recipe test household', '61000000-0000-0000-0000-000000000001');
insert into public.kwilt_household_memberships(household_id, person_id, role) values
  ('63000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'owner'),
  ('63000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', 'caregiver');

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $test$
declare
 u uuid:='61000000-0000-0000-0000-000000000001'; r jsonb; replay jsonb; body jsonb; ops jsonb; snap jsonb;
 plan_id uuid; candidate_id uuid:=gen_random_uuid(); recipe_id uuid; version_id uuid; ingredient_id uuid; content_hash text;
 items jsonb; list_id uuid; new_list_id uuid; old_item_id uuid;
begin
 body:='{"title":"Six person rice","scalingState":"review_required","equipmentRequirements":[],"yieldQuantity":6,"yieldUnit":"servings","ingredients":[{"id":"line-1","originalText":"2 cups rice","optional":false}],"instructions":[{"id":"step-1","text":"Cook rice."}],"provenance":{"method":"manual","rightsBasis":"user_authored"},"credits":[],"lineage":[]}';
 ops:=jsonb_build_array(jsonb_build_object('type','create_recipe','targetId',null,'payload',jsonb_build_object('expectedVersion',0,'reviewedData',body)));
 r:=public.execute_kwilt_external_food_operations(u,'fixture','create','recipes.create',body,ops);
 replay:=public.execute_kwilt_external_food_operations(u,'fixture','create','recipes.create',body,ops);
 if r->>'status'<>'completed' or replay->>'replayed'<>'true' or r#>>'{resultRefs,0,kind}'<>'recipe' then raise exception 'recipe receipt/retry failed'; end if;
 recipe_id:=(r#>>'{output,recipeId}')::uuid; version_id:=(r#>>'{output,recipeVersionId}')::uuid;
 if (select count(*) from public.kwilt_recipes where id=recipe_id)<>1 then raise exception 'recipe not persisted'; end if;
 if auth.jwt()->>'role'<>'service_role' then raise exception 'actor claims leaked'; end if;
 snap:=public.get_kwilt_external_food_control_snapshot(u);
 if jsonb_array_length(snap->'recipes')<>1 then raise exception 'saved recipe absent from snapshot'; end if;
 r:=public.execute_kwilt_external_food_operations(u,'fixture','ensure','meal_planning.cart.ensure','{}',
   '[{"type":"meal_planning.cart.ensure","payload":{"householdId":"63000000-0000-0000-0000-000000000001"}}]');
 plan_id:=(r#>>'{output,planId}')::uuid;
 select v.content_hash into content_hash from public.kwilt_recipe_versions v where id=version_id;
 select id into ingredient_id from public.kwilt_recipe_ingredients where recipe_version_id=version_id limit 1;
 ops:=jsonb_build_array(jsonb_build_object('type','meal_planning.candidate.add','targetId',plan_id,'payload',jsonb_build_object('expectedVersion',1,'candidate',jsonb_build_object('id',candidate_id,'kind','recipe','title','Six person rice','recipeSnapshot',jsonb_build_object('recipeId',recipe_id,'recipeVersionId',version_id,'contentHash',content_hash,'recipeScaleMultiplier',1,'plannedPortions',6,'yieldQuantity',6)))));
 r:=public.execute_kwilt_external_food_operations(u,'fixture','add','meal_planning.candidate.add','{}',ops);
 if (r#>>'{output,version}')::int<>2 then raise exception 'candidate add failed'; end if;
 items:=jsonb_build_array(jsonb_build_object('concept','rice','quantityMin',2,'quantityMax',2,'unit','cup','sources',jsonb_build_array(jsonb_build_object('kind','recipe_ingredient','planCandidateId',candidate_id,'recipeVersionId',version_id,'ingredientLineId',ingredient_id,'originalText','2 cups rice','quantityMin',2,'quantityMax',2,'unit','cup','optional',false))));
 ops:=jsonb_build_array(jsonb_build_object('type','groceries.compile','targetId',plan_id,'payload',jsonb_build_object('expectedVersion',2,'planAction','send','candidateIds',jsonb_build_array(candidate_id),'payloadHash','test-hash','compiledItems',items)));
 r:=public.execute_kwilt_external_food_operations(u,'fixture','compile','groceries.compile','{}',ops);
 list_id:=(r#>>'{output,groceryListId}')::uuid;
 if not exists(select 1 from public.kwilt_grocery_items where grocery_list_id=list_id and concept='rice' and quantity_min=2) then raise exception 'grocery item absent'; end if;
 if not exists(select 1 from public.kwilt_grocery_item_sources s join public.kwilt_grocery_items i on i.id=s.grocery_item_id where i.grocery_list_id=list_id and s.recipe_version_id=version_id) then raise exception 'recipe provenance absent'; end if;
 if auth.jwt()->>'role'<>'service_role' then raise exception 'actor claims leaked after compile'; end if;
 select id into old_item_id from public.kwilt_grocery_items where grocery_list_id=list_id and concept='rice';
 -- Manual groceries survive replacement; old recipe contributions leave the active list.
 ops:=jsonb_build_array(jsonb_build_object('type','groceries.item.add','targetId',list_id,'payload',jsonb_build_object('expectedVersion',1,'title','Dish soap','sourceKind','manual')));
 r:=public.execute_kwilt_external_food_operations(u,'fixture','manual','groceries.item.add','{}',ops);
 ops:=jsonb_build_array(jsonb_build_object('type','meal_planning.candidate.remove','targetId',plan_id,'payload',jsonb_build_object('expectedVersion',3,'candidateId',candidate_id,'candidateIds',jsonb_build_array(candidate_id),'planAction','remove','payloadHash','removed-hash','compiledItems','[]'::jsonb)));
 r:=public.execute_kwilt_external_food_operations(u,'fixture','remove','meal_planning.candidate.remove','{}',ops);
 new_list_id:=(r#>>'{output,groceryListId}')::uuid;
 if new_list_id is null or new_list_id=list_id then raise exception 'removal did not recompile'; end if;
 if exists(select 1 from public.kwilt_grocery_items where grocery_list_id=new_list_id and concept='rice' and state='needed') then raise exception 'removed meal still needs groceries'; end if;
 if not exists(select 1 from public.kwilt_grocery_items where grocery_list_id=new_list_id and concept='Dish soap') then raise exception 'manual groceries lost'; end if;
 if not exists(select 1 from public.kwilt_meal_plan_candidates where id=candidate_id and lifecycle_state='removed') or not exists(select 1 from public.kwilt_recipes where id=recipe_id) then raise exception 'history or recipe lost'; end if;
 replay:=public.execute_kwilt_external_food_operations(u,'fixture','remove','meal_planning.candidate.remove','{}',ops);
 if replay->>'replayed'<>'true' then raise exception 'remove retry failed'; end if;
 begin
   perform public.execute_kwilt_external_food_operations(u,'fixture','remove','meal_planning.candidate.remove','{"changed":true}',ops);
   raise exception 'changed retry accepted';
 exception when others then if sqlerrm<>'idempotency_key_conflict' then raise; end if; end;
 if auth.jwt()->>'role'<>'service_role' then raise exception 'actor claims leaked after removal'; end if;

end;
$test$;
rollback;

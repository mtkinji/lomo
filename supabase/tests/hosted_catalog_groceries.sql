-- Rollback-only regression for both bundled and hosted catalog snapshots.
begin;
do $test$
declare
  test_user uuid := gen_random_uuid();
  test_person uuid := gen_random_uuid();
  test_household uuid := gen_random_uuid();
  test_membership uuid := gen_random_uuid();
  plan_id uuid;
  candidate_id uuid;
  entry_id uuid;
  ingredient_id text;
  content_hash text;
  snapshot jsonb;
  items jsonb;
  receipt jsonb;
  source_kind text;
begin
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,created_at,updated_at)
  values ('00000000-0000-0000-0000-000000000000',test_user,'authenticated','authenticated',test_user||'@example.invalid','',now(),now());
  insert into public.kwilt_people(id,display_name,kind,created_by_user_id) values(test_person,'Grocery regression','adult',test_user);
  insert into public.kwilt_person_auth_bindings(person_id,user_id) values(test_person,test_user);
  insert into public.kwilt_households(id,name,created_by_user_id) values(test_household,'Grocery regression',test_user);
  insert into public.kwilt_household_memberships(id,household_id,person_id,role) values(test_membership,test_household,test_person,'owner');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',test_user,'role','authenticated','is_anonymous',false)::text,true);

  foreach source_kind in array array['bundled','hosted'] loop
    plan_id := gen_random_uuid(); candidate_id := gen_random_uuid(); entry_id := gen_random_uuid();
    ingredient_id := case when source_kind='hosted' then gen_random_uuid()::text else 'kwilt-recipe-zz998-v1-ingredient-1' end;
    content_hash := case when source_kind='hosted' then 'sha256:'||repeat('a',64) else 'kwilt:ZZ998:v1' end;
    snapshot := jsonb_build_object(
      'recipeId','kwilt-recipe-zz998','recipeVersionId','kwilt-recipe-zz998-v1','recipeVersion',1,
      'sourceType','catalog','title','Grocery regression','contentHash',content_hash,
      'servings',4,'yieldQuantity',4,'yieldUnit','servings','recipeScaleMultiplier',1,
      'ingredients',jsonb_build_array(jsonb_build_object('id',ingredient_id,'originalText','2 onions','optional',false))
    );
    insert into public.kwilt_meal_plans(id,household_id,organizer_membership_id,organizer_person_id,state,horizon)
    values(plan_id,test_household,test_membership,test_person,'finalized','{"kind":"open"}');
    insert into public.kwilt_meal_plan_candidates(id,plan_id,position,kind,title,recipe_snapshot,suggested_by_person_id)
    values(candidate_id,plan_id,0,'recipe','Grocery regression',snapshot,test_person);
    insert into public.kwilt_meal_plan_entries(id,plan_id,plan_version,position,candidate_id,kind,title,recipe_snapshot,servings)
    values(entry_id,plan_id,1,0,candidate_id,'recipe','Grocery regression',snapshot,4);

    items := jsonb_build_array(jsonb_build_object('concept','onions','quantityMin',2,'unit','count',
      'sources',jsonb_build_array(jsonb_build_object('kind','catalog_recipe_ingredient',
        'recipeVersionId',snapshot->>'recipeVersionId','ingredientLineId',ingredient_id,
        'originalText','2 onions','planEntryId',entry_id))));
    receipt := public.compile_kwilt_grocery_list(plan_id,1,'plan-'||source_kind,items);
    if not exists(select 1 from public.kwilt_grocery_item_sources where grocery_item_id in (
      select id from public.kwilt_grocery_items where grocery_list_id=(receipt->>'groceryListId')::uuid
    ) and source_snapshot->>'ingredientLineId'=ingredient_id) then
      raise exception 'finalized % catalog provenance lost',source_kind;
    end if;

    items := jsonb_set(items,'{0,sources,0}',(items#>'{0,sources,0}')-'planEntryId'||jsonb_build_object('scope','recipe_version'));
    -- Separate recipe identities keep the two compatibility cases independent.
    snapshot := jsonb_set(snapshot,'{recipeVersion}',to_jsonb(case when source_kind='hosted' then 2 else 1 end));
    receipt := public.compile_kwilt_recipe_grocery_list(snapshot,'recipe-'||source_kind,items);
    if receipt->>'groceryListId' is null then raise exception 'direct % catalog compilation failed',source_kind; end if;

    begin
      perform public.compile_kwilt_recipe_grocery_list(jsonb_set(snapshot,'{contentHash}','"sha256:broken"'),'bad',items);
      raise exception 'malformed catalog hash accepted';
    exception when others then
      if sqlerrm <> 'invalid_recipe_grocery_source' then raise; end if;
    end;
    -- A valid hosted hash must not permit unrelated ingredient provenance.
    begin
      perform public.compile_kwilt_recipe_grocery_list(
        jsonb_set(snapshot,'{recipeVersion}','3'),'bad-source',
        jsonb_set(items,'{0,sources,0,ingredientLineId}','"unrelated-ingredient"'));
      raise exception 'unrelated catalog ingredient accepted';
    exception when others then
      if sqlerrm <> 'invalid_grocery_source' then raise; end if;
    end;
  end loop;
end;
$test$;
rollback;

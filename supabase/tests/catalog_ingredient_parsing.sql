-- Rollback-only integration assertions. Run against the complete local schema, never hosted production.
begin;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'catalog-parsing@example.invalid', '', now(), now());
insert into public.kwilt_people(id, display_name, kind, created_by_user_id) values
  ('a2000000-0000-0000-0000-000000000001', 'Catalog parsing owner', 'adult', 'a1000000-0000-0000-0000-000000000001');

do $$
declare
  owner_id uuid := 'a2000000-0000-0000-0000-000000000001';
  source jsonb;
  initial public.kwilt_recipe_publications;
  repaired public.kwilt_recipe_publications;
  replay public.kwilt_recipe_publications;
  bad jsonb;
  legacy jsonb;
begin
  source := jsonb_build_object(
    'rosterId', 'ZZ997', 'publicSlug', 'catalog-parsing-test', 'title', 'Catalog parsing test',
    'category', 'Dinner', 'cuisine', 'Test', 'contentHash', 'catalog-parsing-v1', 'scalingState', 'verified',
    'ingredients', '["250–500ml milk","500g carrots","1 teaspoon salt","2 cups rice","1 onion"]'::jsonb,
    'instructions', '["Prepare.","Combine.","Cook.","Serve."]'::jsonb
  );
  source := source || jsonb_build_object('structuredIngredients', (
    select jsonb_agg(jsonb_build_object('position', ordinality - 1, 'originalText', value,
      'quantityMin', 250, 'quantityMax', 500, 'unit', 'milliliter', 'ingredientConcept', 'milk',
      'preparation', 'cold', 'optional', true, 'parseConfidence', 0.95, 'scaleRule', '{"kind":"multiply"}'::jsonb))
    from jsonb_array_elements_text(source->'ingredients') with ordinality
  ));
  select * into initial from public.import_kwilt_recipe_catalog_source(owner_id, source);
  if (select count(*) from public.kwilt_recipe_ingredients where recipe_version_id = initial.published_recipe_version_id
    and quantity_min = 250 and quantity_max = 500 and unit = 'milliliter' and ingredient_concept = 'milk'
    and preparation = 'cold' and optional and parse_confidence = 0.95) <> 5 then
    raise exception 'new catalog import lost reviewed parsing';
  end if;
  select * into replay from public.import_kwilt_recipe_catalog_source(owner_id, source);
  if replay.published_recipe_version_id <> initial.published_recipe_version_id then raise exception 'exact replay created a version'; end if;

  source := jsonb_set(source, '{structuredIngredients,0,quantityMin}', '300');
  select * into repaired from public.import_kwilt_recipe_catalog_source(owner_id, source);
  if repaired.published_recipe_version_id = initial.published_recipe_version_id then raise exception 'repair did not create an immutable version'; end if;
  if (select quantity_min from public.kwilt_recipe_ingredients where recipe_version_id = initial.published_recipe_version_id and position = 0) <> 250
    or (select quantity_min from public.kwilt_recipe_ingredients where recipe_version_id = repaired.published_recipe_version_id and position = 0) <> 300 then
    raise exception 'repair altered history or failed to retain new parsing';
  end if;
  select * into replay from public.import_kwilt_recipe_catalog_source(owner_id, source);
  if replay.published_recipe_version_id <> repaired.published_recipe_version_id then raise exception 'repair replay created a version'; end if;

  legacy := source || jsonb_build_object('structuredIngredients', (
    select jsonb_agg(jsonb_build_object('position', value->'position', 'originalText', value->'originalText', 'scaleRule', value->'scaleRule'))
    from jsonb_array_elements(source->'structuredIngredients')
  ));
  select * into replay from public.import_kwilt_recipe_catalog_source(owner_id, legacy);
  if replay.published_recipe_version_id <> repaired.published_recipe_version_id then raise exception 'legacy scale-only replay erased parsing'; end if;
  legacy := jsonb_set(legacy, '{structuredIngredients,0,scaleRule}', '{"kind":"fixed","reason":"reviewed_other"}');
  select * into replay from public.import_kwilt_recipe_catalog_source(owner_id, legacy);
  if (select quantity_min from public.kwilt_recipe_ingredients where recipe_version_id = replay.published_recipe_version_id and position = 0) <> 300 then
    raise exception 'legacy scale-only repair erased parsing';
  end if;
  -- A review may deliberately return to an earlier rule set; its mutation key remains unique.
  select * into replay from public.import_kwilt_recipe_catalog_source(owner_id, source);
  if replay.published_recipe_version_id = repaired.published_recipe_version_id then raise exception 'review reversion reused an old version'; end if;

  foreach bad in array array[source - 'ingredients', source - 'structuredIngredients', source - 'instructions',
    jsonb_set(source, '{structuredIngredients,0,quantityMax}', '1'),
    jsonb_set(source, '{structuredIngredients,0,parseConfidence}', '2'),
    jsonb_set(source, '{structuredIngredients,0,originalText}', '"different"'),
    jsonb_set(source, '{structuredIngredients,0,scaleRule}', '{}')]
  loop
    begin
      perform public.import_kwilt_recipe_catalog_source(owner_id, bad);
      raise exception 'invalid catalog input accepted';
    exception when invalid_parameter_value then null;
    end;
  end loop;
  if has_function_privilege('anon', 'public.import_kwilt_recipe_catalog_source(uuid,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.import_kwilt_recipe_catalog_source(uuid,jsonb)', 'execute') then
    raise exception 'catalog import unexpectedly exposed';
  end if;
end $$;
rollback;

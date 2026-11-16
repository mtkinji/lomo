-- Preserve reviewed parsing through the existing governed catalog importer.
-- Published versions and household snapshots remain immutable; repairs create a new version.
-- Scaling review is part of an immutable Recipe version. Republishing reviewed
-- rules creates a new version and advances the catalog publication instead of
-- updating the already-published version and ingredient rows in place.
create or replace function public.import_kwilt_recipe_catalog_source(p_owner_person_id uuid, p_source jsonb)
returns public.kwilt_recipe_publications
language plpgsql
set search_path = ''
as $$
declare
  existing public.kwilt_recipe_publications;
  existing_version public.kwilt_recipe_versions;
  created_publication public.kwilt_recipe_publications;
  v_recipe_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_roster_id text := upper(btrim(p_source->>'rosterId'));
  v_title text := btrim(p_source->>'title');
  v_slug text := lower(btrim(p_source->>'publicSlug'));
  v_content_hash text := btrim(p_source->>'contentHash');
  v_scaling_state text := coalesce(nullif(p_source->>'scalingState', ''), 'review_required');
  v_next_version integer;
  v_scaling_fingerprint text;
  v_inserted_count integer := 0;
  v_line jsonb;
  v_position integer;
  v_field text;
begin
  if not exists (select 1 from public.kwilt_people where id = p_owner_person_id)
    or v_roster_id is null or v_roster_id !~ '^[A-Z]{2}[0-9]{3}$'
    or v_title is null or char_length(v_title) not between 1 and 160
    or v_slug is null or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or v_content_hash is null or char_length(v_content_hash) not between 1 and 256
    or v_scaling_state not in ('verified', 'unavailable', 'review_required')
    or coalesce(jsonb_typeof(p_source->'ingredients'), 'null') <> 'array'
    or jsonb_array_length(p_source->'ingredients') not between 5 and 200
    or coalesce(jsonb_typeof(p_source->'structuredIngredients'), 'null') <> 'array'
    or jsonb_array_length(p_source->'structuredIngredients') <> jsonb_array_length(p_source->'ingredients')
    or coalesce(jsonb_typeof(p_source->'instructions'), 'null') <> 'array'
    or jsonb_array_length(p_source->'instructions') not between 4 and 200 then
    raise exception 'invalid_recipe_catalog_source' using errcode = '22023';
  end if;

  -- Validate before any publication or immutable-version writes, including direct RPC callers.
  for v_line, v_position in
    select value, (ordinality - 1)::integer from jsonb_array_elements(p_source->'structuredIngredients') with ordinality
  loop
    if jsonb_typeof(v_line) is distinct from 'object'
      or v_line->'position' is distinct from to_jsonb(v_position)
      or v_line->'originalText' is distinct from p_source->'ingredients'->v_position
      or jsonb_typeof(v_line->'originalText') is distinct from 'string'
      or char_length(btrim(v_line->>'originalText')) not between 1 and 1000
      or not coalesce(
        v_line->'scaleRule' = '{"kind":"multiply"}'::jsonb
        or v_line->'scaleRule' = '{"kind":"review_required"}'::jsonb
        or (v_line->'scaleRule'->>'kind' = 'fixed'
          and v_line->'scaleRule'->>'reason' in ('as_needed','garnish','to_taste','vessel','reviewed_other')
          and v_line->'scaleRule' = jsonb_build_object('kind', 'fixed', 'reason', v_line->'scaleRule'->>'reason')),
        false) then
      raise exception 'invalid_structured_ingredient' using errcode = '22023';
    end if;
    foreach v_field in array array['quantityMin', 'quantityMax', 'parseConfidence'] loop
      if v_line ? v_field and v_line->v_field <> 'null'::jsonb then
        if jsonb_typeof(v_line->v_field) <> 'number' then
          raise exception 'invalid_structured_ingredient' using errcode = '22023';
        end if;
        if (v_line->>v_field)::numeric < 0
          or (v_line->>v_field)::numeric > (case when v_field = 'parseConfidence' then 1 else 100000 end) then
          raise exception 'invalid_structured_ingredient' using errcode = '22023';
        end if;
      end if;
    end loop;
    if v_line->>'quantityMax' is not null and
      (v_line->>'quantityMin' is null or (v_line->>'quantityMax')::numeric < (v_line->>'quantityMin')::numeric) then
      raise exception 'invalid_structured_ingredient' using errcode = '22023';
    end if;
    if v_line ? 'optional' and jsonb_typeof(v_line->'optional') is distinct from 'boolean' then
      raise exception 'invalid_structured_ingredient' using errcode = '22023';
    end if;
    foreach v_field in array array['unit', 'ingredientConcept', 'preparation'] loop
      if v_line ? v_field and v_line->v_field <> 'null'::jsonb and
        (jsonb_typeof(v_line->v_field) <> 'string' or char_length(v_line->>v_field) >
          (case v_field when 'unit' then 80 when 'ingredientConcept' then 240 else 320 end)) then
        raise exception 'invalid_structured_ingredient' using errcode = '22023';
      end if;
    end loop;
  end loop;
  -- Serialize the first import as well as repairs; no duplicate recipe can escape a racing roster import.
  perform pg_advisory_xact_lock(hashtextextended('catalog-import:' || v_roster_id, 0));

  select * into existing
  from public.kwilt_recipe_publications
  where roster_id = v_roster_id
  for update;

  if existing.id is not null then
    select * into existing_version
    from public.kwilt_recipe_versions
    where id = existing.published_recipe_version_id;

    if existing_version.content_hash <> v_content_hash then
      raise exception 'catalog_content_hash_conflict' using errcode = '23505';
    end if;
    if (select count(*) from public.kwilt_recipe_ingredients where recipe_version_id = existing_version.id)
      <> jsonb_array_length(p_source->'structuredIngredients') then
      raise exception 'catalog_ingredient_mismatch' using errcode = '22023';
    end if;

    if existing_version.scaling_state = v_scaling_state
      and not exists (
        select 1
        from jsonb_array_elements(p_source->'structuredIngredients') with ordinality structured(value, ordinality)
        left join public.kwilt_recipe_ingredients ingredient
          on ingredient.recipe_version_id = existing_version.id
         and ingredient.position = structured.ordinality - 1
        where ingredient.id is null
          or ingredient.original_text <> structured.value->>'originalText'
          or ingredient.scale_rule is distinct from structured.value->'scaleRule'
          or (structured.value ? 'quantityMin' and ingredient.quantity_min is distinct from (structured.value->>'quantityMin')::numeric)
          or (structured.value ? 'quantityMax' and ingredient.quantity_max is distinct from (structured.value->>'quantityMax')::numeric)
          or (structured.value ? 'unit' and ingredient.unit is distinct from (structured.value->>'unit')::text)
          or (structured.value ? 'ingredientConcept' and ingredient.ingredient_concept is distinct from (structured.value->>'ingredientConcept')::text)
          or (structured.value ? 'preparation' and ingredient.preparation is distinct from (structured.value->>'preparation')::text)
          or (structured.value ? 'optional' and ingredient.optional is distinct from (structured.value->>'optional')::boolean)
          or (structured.value ? 'parseConfidence' and ingredient.parse_confidence is distinct from (structured.value->>'parseConfidence')::numeric)
      ) then
      return existing;
    end if;

    select coalesce(max(version), 0) + 1 into v_next_version
    from public.kwilt_recipe_versions
    where recipe_id = existing.recipe_id;
    v_version_id := gen_random_uuid();
    v_scaling_fingerprint := encode(extensions.digest(
      jsonb_build_object(
        'scalingState', v_scaling_state,
        'rules', p_source->'structuredIngredients'
      )::text,
      'sha256'
    ), 'hex');

    insert into public.kwilt_recipe_versions(
      id, recipe_id, version, title, description, yield_quantity, yield_unit, scaling_state,
      prep_minutes, cook_minutes, notes, content_hash, created_by_person_id, mutation_idempotency_key
    ) values (
      v_version_id, existing.recipe_id, v_next_version, existing_version.title,
      existing_version.description, existing_version.yield_quantity, existing_version.yield_unit,
      v_scaling_state, existing_version.prep_minutes, existing_version.cook_minutes,
      existing_version.notes, existing_version.content_hash, existing_version.created_by_person_id,
      left('catalog-scaling:' || v_roster_id || ':' || v_next_version || ':' || v_scaling_fingerprint, 200)
    );

    insert into public.kwilt_recipe_ingredients(
      recipe_version_id, source_line_id, position, group_label, original_text,
      quantity_min, quantity_max, unit, ingredient_concept, preparation, optional,
      parse_confidence, scale_rule
    )
    select
      v_version_id, ingredient.source_line_id, ingredient.position, ingredient.group_label,
      ingredient.original_text,
      case when structured.value ? 'quantityMin' then (structured.value->>'quantityMin')::numeric else ingredient.quantity_min end,
      case when structured.value ? 'quantityMax' then (structured.value->>'quantityMax')::numeric else ingredient.quantity_max end,
      case when structured.value ? 'unit' then (structured.value->>'unit')::text else ingredient.unit end,
      case when structured.value ? 'ingredientConcept' then (structured.value->>'ingredientConcept')::text else ingredient.ingredient_concept end,
      case when structured.value ? 'preparation' then (structured.value->>'preparation')::text else ingredient.preparation end,
      case when structured.value ? 'optional' then (structured.value->>'optional')::boolean else ingredient.optional end,
      case when structured.value ? 'parseConfidence' then (structured.value->>'parseConfidence')::numeric else ingredient.parse_confidence end, structured.value->'scaleRule'
    from public.kwilt_recipe_ingredients ingredient
    join jsonb_array_elements(p_source->'structuredIngredients') with ordinality structured(value, ordinality)
      on ingredient.position = structured.ordinality - 1
     and ingredient.original_text = structured.value->>'originalText'
    where ingredient.recipe_version_id = existing_version.id;
    get diagnostics v_inserted_count = row_count;
    if v_inserted_count <> jsonb_array_length(p_source->'structuredIngredients') then
      raise exception 'catalog_ingredient_mismatch' using errcode = '22023';
    end if;

    insert into public.kwilt_recipe_instructions(
      recipe_version_id, source_step_id, position, section_label, step_text
    )
    select v_version_id, source_step_id, position, section_label, step_text
    from public.kwilt_recipe_instructions
    where recipe_version_id = existing_version.id;

    insert into public.kwilt_recipe_provenance(
      recipe_version_id, method, source_url, source_title, source_author,
      source_content_hash, rights_basis, imported_at
    )
    select v_version_id, method, source_url, source_title, source_author,
      source_content_hash, rights_basis, imported_at
    from public.kwilt_recipe_provenance
    where recipe_version_id = existing_version.id;

    insert into public.kwilt_recipe_credits(
      recipe_version_id, role, person_id, public_profile_id, display_label, position, public_visible
    )
    select v_version_id, role, person_id, public_profile_id, display_label, position, public_visible
    from public.kwilt_recipe_credits
    where recipe_version_id = existing_version.id;

    insert into public.kwilt_recipe_lineage(
      recipe_version_id, relationship, source_recipe_id, source_recipe_version_id, source_publication_id
    )
    select v_version_id, relationship, source_recipe_id, source_recipe_version_id, source_publication_id
    from public.kwilt_recipe_lineage
    where recipe_version_id = existing_version.id;

    insert into public.kwilt_recipe_equipment_requirements(
      recipe_version_id, position, concept_id, label, search_query, necessity,
      confidence, evidence_text, substitute
    )
    select v_version_id, position, concept_id, label, search_query, necessity,
      confidence, evidence_text, substitute
    from public.kwilt_recipe_equipment_requirements
    where recipe_version_id = existing_version.id;

    update public.kwilt_recipes
    set current_version_id = v_version_id, updated_at = now()
    where id = existing.recipe_id;
    update public.kwilt_recipe_publications
    set published_recipe_version_id = v_version_id, updated_at = now()
    where id = existing.id
    returning * into existing;
    return existing;
  end if;

  insert into public.kwilt_recipes(id, owner_person_id, ownership_kind)
  values(v_recipe_id, p_owner_person_id, 'catalog');
  insert into public.kwilt_recipe_versions(
    id, recipe_id, version, title, description, yield_quantity, yield_unit, scaling_state,
    prep_minutes, cook_minutes, notes, content_hash, created_by_person_id, mutation_idempotency_key
  ) values (
    v_version_id, v_recipe_id, 1, v_title, nullif(p_source->>'description', ''),
    nullif(p_source->>'yieldQuantity', '')::numeric, nullif(p_source->>'yieldUnit', ''), v_scaling_state,
    nullif(p_source->>'prepMinutes', '')::integer, nullif(p_source->>'cookMinutes', '')::integer,
    nullif(p_source->>'notes', ''), v_content_hash, p_owner_person_id,
    left('catalog:' || v_roster_id || ':' || v_content_hash, 200)
  );
  update public.kwilt_recipes set current_version_id = v_version_id where id = v_recipe_id;
  insert into public.kwilt_recipe_ingredients(
    recipe_version_id, source_line_id, position, original_text,
    quantity_min, quantity_max, unit, ingredient_concept, preparation, optional, parse_confidence, scale_rule
  )
  select v_version_id, 'catalog-ingredient-' || (ordinality - 1), ordinality - 1,
    btrim(value->>'originalText'), (value->>'quantityMin')::numeric, (value->>'quantityMax')::numeric,
    value->>'unit', value->>'ingredientConcept', value->>'preparation',
    coalesce((value->>'optional')::boolean, (value->>'originalText') ~* '\moptional\M'),
    (value->>'parseConfidence')::numeric, value->'scaleRule'
  from jsonb_array_elements(p_source->'structuredIngredients') with ordinality
  where char_length(btrim(value->>'originalText')) between 1 and 1000;
  insert into public.kwilt_recipe_instructions(recipe_version_id, source_step_id, position, step_text)
  select v_version_id, 'catalog-step-' || (ordinality - 1), ordinality - 1, btrim(value)
  from jsonb_array_elements_text(p_source->'instructions') with ordinality
  where char_length(btrim(value)) between 1 and 8000;
  insert into public.kwilt_recipe_provenance(recipe_version_id, method, rights_basis, source_content_hash, imported_at)
  values(v_version_id, 'catalog', 'kwilt_authored', v_content_hash, now());
  insert into public.kwilt_recipe_publications(
    roster_id, public_slug, recipe_id, published_recipe_version_id, state, distribution_scopes,
    rights_attestation, editorial_metadata, content_hash, published_at
  ) values (
    v_roster_id, v_slug, v_recipe_id, v_version_id, 'published', array['kwilt_mobile'], 'original',
    jsonb_build_object('category', p_source->>'category', 'cuisine', p_source->>'cuisine', 'tier', p_source->>'tier'),
    v_content_hash, now()
  ) returning * into created_publication;
  return created_publication;
end;
$$;

revoke all on function public.import_kwilt_recipe_catalog_source(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_kwilt_recipe_catalog_source(uuid, jsonb) to service_role;

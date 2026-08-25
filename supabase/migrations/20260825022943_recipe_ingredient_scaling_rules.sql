-- Publish reviewed ingredient scaling rules through the hosted Recipe catalog.
alter table public.kwilt_recipe_versions
  add column scaling_state text not null default 'review_required'
  check (scaling_state in ('verified', 'unavailable', 'review_required'));

alter table public.kwilt_recipe_ingredients
  add column scale_rule jsonb not null default '{"kind":"review_required"}'::jsonb,
  add constraint kwilt_recipe_ingredients_scale_rule_valid check (
    scale_rule = '{"kind":"multiply"}'::jsonb
    or scale_rule = '{"kind":"review_required"}'::jsonb
    or (
      scale_rule->>'kind' = 'fixed'
      and scale_rule->>'reason' in ('as_needed','garnish','to_taste','vessel','reviewed_other')
      and scale_rule = jsonb_build_object('kind', 'fixed', 'reason', scale_rule->>'reason')
    )
  );

create or replace function public.import_kwilt_recipe_catalog_source(p_owner_person_id uuid, p_source jsonb)
returns public.kwilt_recipe_publications
language plpgsql
set search_path = ''
as $$
declare
  existing public.kwilt_recipe_publications;
  created_publication public.kwilt_recipe_publications;
  v_recipe_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_roster_id text := upper(btrim(p_source->>'rosterId'));
  v_title text := btrim(p_source->>'title');
  v_slug text := lower(btrim(p_source->>'publicSlug'));
  v_content_hash text := btrim(p_source->>'contentHash');
  v_scaling_state text := coalesce(nullif(p_source->>'scalingState', ''), 'review_required');
  v_updated_count integer := 0;
begin
  if not exists (select 1 from public.kwilt_people where id = p_owner_person_id)
    or v_roster_id !~ '^[A-Z]{2}[0-9]{3}$'
    or v_title is null or char_length(v_title) not between 1 and 160
    or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or v_content_hash is null or char_length(v_content_hash) not between 1 and 256
    or v_scaling_state not in ('verified', 'unavailable', 'review_required')
    or jsonb_typeof(p_source->'ingredients') <> 'array'
    or jsonb_array_length(p_source->'ingredients') not between 5 and 200
    or jsonb_typeof(p_source->'structuredIngredients') <> 'array'
    or jsonb_array_length(p_source->'structuredIngredients') <> jsonb_array_length(p_source->'ingredients')
    or jsonb_typeof(p_source->'instructions') <> 'array'
    or jsonb_array_length(p_source->'instructions') not between 4 and 200 then
    raise exception 'invalid_recipe_catalog_source' using errcode = '22023';
  end if;

  select * into existing from public.kwilt_recipe_publications where roster_id = v_roster_id;
  if existing.id is not null then
    update public.kwilt_recipe_versions
      set scaling_state = v_scaling_state
      where id = existing.published_recipe_version_id and content_hash = v_content_hash;
    if not found then raise exception 'catalog_content_hash_conflict' using errcode = '23505'; end if;
    update public.kwilt_recipe_ingredients ingredient
      set scale_rule = structured.value->'scaleRule'
      from jsonb_array_elements(p_source->'structuredIngredients') with ordinality structured(value, ordinality)
      where ingredient.recipe_version_id = existing.published_recipe_version_id
        and ingredient.position = structured.ordinality - 1
        and ingredient.original_text = structured.value->>'originalText';
    get diagnostics v_updated_count = row_count;
    if v_updated_count <> jsonb_array_length(p_source->'structuredIngredients') then
      raise exception 'catalog_ingredient_mismatch' using errcode = '22023';
    end if;
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
  insert into public.kwilt_recipe_ingredients(recipe_version_id, source_line_id, position, original_text, optional, scale_rule)
  select v_version_id, 'catalog-ingredient-' || (ordinality - 1), ordinality - 1,
    btrim(value->>'originalText'), (value->>'originalText') ~* '\\boptional\\b', value->'scaleRule'
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

create or replace function public.list_kwilt_recipe_catalog_v2(
  p_after_roster_id text default null,
  p_limit integer default 500
)
returns table(projection jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(
    jsonb_set(
      jsonb_set(
        catalog_row.projection,
        '{currentVersion,scalingState}',
        to_jsonb(version_row.scaling_state),
        true
      ),
      '{currentVersion,ingredients}',
      coalesce((
        select jsonb_agg(ingredient_json.value || jsonb_build_object('scaleRule', ingredient.scale_rule) order by ingredient.position)
        from jsonb_array_elements(catalog_row.projection #> '{currentVersion,ingredients}') ingredient_json(value)
        join public.kwilt_recipe_ingredients ingredient on ingredient.id = (ingredient_json.value->>'id')::uuid
      ), '[]'::jsonb),
      true
    ),
    '{currentVersion,equipmentRequirements}',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', equipment.concept_id,
        'label', equipment.label,
        'searchQuery', equipment.search_query,
        'necessity', equipment.necessity,
        'confidence', equipment.confidence,
        'evidenceText', equipment.evidence_text,
        'substitute', equipment.substitute
      ) order by equipment.position)
      from public.kwilt_recipe_equipment_requirements equipment
      where equipment.recipe_version_id = version_row.id
    ), '[]'::jsonb),
    true
  ) as projection
  from public.list_kwilt_recipe_catalog(p_after_roster_id, p_limit) catalog_row
  join public.kwilt_recipe_versions version_row
    on version_row.id = (catalog_row.projection #>> '{currentVersion,id}')::uuid;
$$;

revoke all on function public.list_kwilt_recipe_catalog_v2(text, integer) from public, anon;
grant execute on function public.list_kwilt_recipe_catalog_v2(text, integer) to authenticated;

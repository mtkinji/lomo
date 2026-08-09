-- Grocery execution can begin from one immutable Recipe version without
-- silently creating or mutating a Meal Plan. Meal Plan compilation remains
-- finalized-plan-only and retains its existing authority path.

alter table public.kwilt_grocery_lists
  add column source_kind text not null default 'meal_plan'
    check (source_kind in ('meal_plan','recipe_version')),
  add column source_recipe_id text,
  add column source_recipe_version_id text,
  add column source_recipe_version integer check (source_recipe_version is null or source_recipe_version > 0),
  add column source_title text check (source_title is null or char_length(source_title) between 1 and 500),
  add column source_servings numeric check (source_servings is null or source_servings > 0),
  add column source_recipe_snapshot jsonb check (source_recipe_snapshot is null or jsonb_typeof(source_recipe_snapshot)='object');

alter table public.kwilt_grocery_lists
  alter column source_meal_plan_id drop not null,
  alter column source_meal_plan_version drop not null,
  drop constraint kwilt_grocery_lists_source_meal_plan_id_source_meal_plan_ve_key,
  add constraint kwilt_grocery_lists_source_scope_check check (
    (source_kind='meal_plan'
      and source_meal_plan_id is not null
      and source_meal_plan_version is not null
      and source_recipe_id is null
      and source_recipe_version_id is null
      and source_recipe_version is null
      and source_title is null
      and source_servings is null
      and source_recipe_snapshot is null)
    or
    (source_kind='recipe_version'
      and source_meal_plan_id is null
      and source_meal_plan_version is null
      and source_recipe_id is not null
      and source_recipe_version_id is not null
      and source_recipe_version is not null
      and source_title is not null
      and source_servings is not null
      and source_recipe_snapshot is not null)
  );

create unique index kwilt_grocery_lists_meal_plan_source_unique
  on public.kwilt_grocery_lists(source_meal_plan_id,source_meal_plan_version)
  where source_kind='meal_plan';
create unique index kwilt_grocery_lists_recipe_source_unique
  on public.kwilt_grocery_lists(owner_person_id,source_recipe_version_id,source_recipe_version,source_servings)
  where source_kind='recipe_version';

create or replace function public.compile_kwilt_recipe_grocery_list(
  p_recipe_source jsonb,
  p_payload_hash text,
  p_compiled_items jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=public.kwilt_require_permanent_user();
  v_person uuid;
  v_existing public.kwilt_grocery_lists;
  v_list public.kwilt_grocery_lists;
  v_item jsonb;
  v_source jsonb;
  v_position bigint;
  v_item_id uuid;
  v_recipe_id text:=p_recipe_source->>'recipeId';
  v_recipe_version_id text:=p_recipe_source->>'recipeVersionId';
  v_recipe_version integer;
  v_servings numeric;
  v_source_type text:=p_recipe_source->>'sourceType';
begin
  select person_id into v_person
  from public.kwilt_person_auth_bindings
  where user_id=v_user and status='active';
  if v_person is null then raise exception 'person_binding_required'; end if;

  if jsonb_typeof(p_recipe_source)<>'object'
    or char_length(btrim(coalesce(v_recipe_id,''))) not between 1 and 500
    or char_length(btrim(coalesce(v_recipe_version_id,''))) not between 1 and 500
    or char_length(btrim(coalesce(p_recipe_source->>'title',''))) not between 1 and 500
    or char_length(btrim(coalesce(p_recipe_source->>'contentHash',''))) not between 1 and 256
    or jsonb_typeof(coalesce(p_recipe_source->'ingredients','[]'::jsonb))<>'array'
    or jsonb_array_length(coalesce(p_recipe_source->'ingredients','[]'::jsonb))>200
    or char_length(coalesce(p_payload_hash,'')) not between 1 and 256
    or jsonb_typeof(p_compiled_items)<>'array'
    or jsonb_array_length(p_compiled_items)>500
  then raise exception 'invalid_recipe_grocery_source'; end if;

  begin
    v_recipe_version:=(p_recipe_source->>'recipeVersion')::integer;
    v_servings:=(p_recipe_source->>'servings')::numeric;
  exception when others then
    raise exception 'invalid_recipe_grocery_source';
  end;
  if v_recipe_version<1 or v_servings<=0 then raise exception 'invalid_recipe_grocery_source'; end if;

  if v_source_type='catalog' then
    if v_recipe_version_id !~ '^kwilt-recipe-[a-z0-9-]+-v[0-9]+$'
      or p_recipe_source->>'contentHash' !~ '^kwilt:[A-Z0-9-]+:v[0-9]+$'
    then raise exception 'invalid_recipe_grocery_source'; end if;
  else
    if v_recipe_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or v_recipe_version_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists(
        select 1
        from public.kwilt_recipe_versions version_row
        join public.kwilt_recipes recipe on recipe.id=version_row.recipe_id
        where version_row.id=v_recipe_version_id::uuid
          and recipe.id=v_recipe_id::uuid
          and version_row.version=v_recipe_version
          and version_row.content_hash=p_recipe_source->>'contentHash'
          and recipe.lifecycle<>'deleted'
          and public.kwilt_can_read_recipe(recipe.id)
      )
    then raise exception 'recipe_not_readable'; end if;
  end if;

  select * into v_existing
  from public.kwilt_grocery_lists
  where owner_person_id=v_person
    and source_kind='recipe_version'
    and source_recipe_version_id=v_recipe_version_id
    and source_recipe_version=v_recipe_version
    and source_servings=v_servings;
  if v_existing.id is not null then
    if v_existing.payload_hash<>p_payload_hash then raise exception 'grocery_compilation_idempotency_conflict'; end if;
    if v_existing.status='stale' then
      update public.kwilt_grocery_lists
      set status='review_needed',updated_at=now()
      where id=v_existing.id
      returning * into v_existing;
    end if;
    return jsonb_build_object('groceryListId',v_existing.id,'revision',v_existing.revision,'status',v_existing.status,'replayed',true);
  end if;

  update public.kwilt_grocery_lists
  set status='stale',updated_at=now()
  where owner_person_id=v_person
    and source_kind='recipe_version'
    and source_recipe_version_id=v_recipe_version_id
    and status in ('review_needed','ready');

  insert into public.kwilt_grocery_lists(
    owner_person_id,source_kind,source_recipe_id,source_recipe_version_id,
    source_recipe_version,source_title,source_servings,source_recipe_snapshot,
    revision,status,payload_hash
  ) values(
    v_person,'recipe_version',v_recipe_id,v_recipe_version_id,v_recipe_version,
    p_recipe_source->>'title',v_servings,p_recipe_source,1,'review_needed',p_payload_hash
  ) returning * into v_list;

  for v_item,v_position in
    select value,ordinality from jsonb_array_elements(p_compiled_items) with ordinality
  loop
    if char_length(btrim(coalesce(v_item->>'concept',''))) not between 1 and 320
      or jsonb_typeof(coalesce(v_item->'sources','[]'::jsonb))<>'array'
    then raise exception 'invalid_grocery_item'; end if;
    insert into public.kwilt_grocery_items(
      grocery_list_id,position,concept,quantity_min,quantity_max,unit,
      package_quantity,package_unit,preparation,optional,aisle,
      original_display_texts,review_reason
    ) values(
      v_list.id,v_position-1,btrim(v_item->>'concept'),
      nullif(v_item->>'quantityMin','')::numeric,nullif(v_item->>'quantityMax','')::numeric,
      v_item->>'unit',nullif(v_item->>'packageQuantity','')::numeric,v_item->>'packageUnit',
      v_item->>'preparation',coalesce((v_item->>'optional')::boolean,false),
      coalesce(v_item->>'aisle','other'),coalesce(v_item->'originalDisplayTexts','[]'::jsonb),
      v_item->>'reviewReason'
    ) returning id into v_item_id;

    for v_source in select value from jsonb_array_elements(v_item->'sources') loop
      if v_source->>'scope'<>'recipe_version'
        or v_source->>'recipeVersionId'<>v_recipe_version_id
        or char_length(btrim(coalesce(v_source->>'ingredientLineId',''))) not between 1 and 500
        or char_length(btrim(coalesce(v_source->>'originalText',''))) not between 1 and 500
      then raise exception 'invalid_grocery_source'; end if;

      if v_source_type='catalog' then
        if v_source->>'kind'<>'catalog_recipe_ingredient'
          or not exists(
            select 1 from jsonb_array_elements(p_recipe_source->'ingredients') ingredient
            where ingredient->>'id'=v_source->>'ingredientLineId'
              and ingredient->>'originalText'=v_source->>'originalText'
          )
        then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,source_snapshot)
        values(v_item_id,'catalog_recipe_ingredient',jsonb_build_object(
          'scope','recipe_version','recipeVersionId',v_recipe_version_id,
          'ingredientLineId',v_source->>'ingredientLineId','originalText',v_source->>'originalText'
        ));
      else
        if v_source->>'kind'<>'recipe_ingredient'
          or v_source->>'ingredientLineId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not exists(
            select 1 from public.kwilt_recipe_ingredients ingredient
            where ingredient.id=(v_source->>'ingredientLineId')::uuid
              and ingredient.recipe_version_id=v_recipe_version_id::uuid
              and ingredient.original_text=v_source->>'originalText'
          )
        then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(
          grocery_item_id,kind,recipe_version_id,ingredient_line_id,source_snapshot
        ) values(
          v_item_id,'recipe_ingredient',v_recipe_version_id::uuid,
          (v_source->>'ingredientLineId')::uuid,jsonb_build_object(
            'scope','recipe_version','originalText',v_source->>'originalText'
          )
        );
      end if;
    end loop;
  end loop;

  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'status',v_list.status,'replayed',false);
end;
$$;

revoke execute on function public.compile_kwilt_recipe_grocery_list(jsonb,text,jsonb) from public,anon;
grant execute on function public.compile_kwilt_recipe_grocery_list(jsonb,text,jsonb) to authenticated;

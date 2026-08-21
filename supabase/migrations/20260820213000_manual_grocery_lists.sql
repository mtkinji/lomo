-- Groceries is a valid starting context. A person can create one durable list
-- without first compiling a Recipe or Meal Plan.

alter table public.kwilt_grocery_lists
  drop constraint kwilt_grocery_lists_source_kind_check,
  drop constraint kwilt_grocery_lists_source_scope_check,
  add constraint kwilt_grocery_lists_source_kind_check
    check (source_kind in ('manual','meal_plan','household_plan','recipe_version')),
  add constraint kwilt_grocery_lists_source_scope_check check (
    (source_kind='manual'
      and source_household_id is null
      and source_meal_plan_id is null
      and source_meal_plan_version is null
      and source_recipe_id is null
      and source_recipe_version_id is null
      and source_recipe_version is null
      and source_title is null
      and source_servings is null
      and source_recipe_snapshot is null)
    or
    (source_kind='meal_plan'
      and source_household_id is null
      and source_meal_plan_id is not null
      and source_meal_plan_version is not null
      and source_recipe_id is null
      and source_recipe_version_id is null
      and source_recipe_version is null
      and source_title is null
      and source_servings is null
      and source_recipe_snapshot is null)
    or
    (source_kind='household_plan'
      and source_household_id is not null
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
      and source_household_id is null
      and source_meal_plan_id is null
      and source_meal_plan_version is null
      and source_recipe_id is not null
      and source_recipe_version_id is not null
      and source_recipe_version is not null
      and source_title is not null
      and source_servings is not null
      and source_recipe_snapshot is not null)
  );

create unique index kwilt_grocery_lists_manual_owner_unique
  on public.kwilt_grocery_lists(owner_person_id)
  where source_kind='manual' and status<>'archived';

create or replace function public.create_kwilt_manual_grocery_list()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_person uuid := public.kwilt_current_person_id();
  v_list public.kwilt_grocery_lists;
  v_list_id uuid := gen_random_uuid();
begin
  if v_person is null then raise exception 'person_binding_required'; end if;

  select * into v_list
  from public.kwilt_grocery_lists list
  where list.owner_person_id=v_person
    and list.source_kind='manual'
    and list.status<>'archived'
  limit 1;

  if v_list.id is not null then
    return jsonb_build_object(
      'groceryListId',v_list.id,
      'revision',v_list.revision,
      'status',v_list.status,
      'replayed',true
    );
  end if;

  insert into public.kwilt_grocery_lists(
    id,owner_person_id,source_kind,revision,status,payload_hash,reviewed_at
  ) values (
    v_list_id,v_person,'manual',1,'ready','manual:'||v_list_id::text,now()
  ) returning * into v_list;

  return jsonb_build_object(
    'groceryListId',v_list.id,
    'revision',v_list.revision,
    'status',v_list.status,
    'replayed',false
  );
end;
$$;

revoke execute on function public.create_kwilt_manual_grocery_list() from public,anon;
grant execute on function public.create_kwilt_manual_grocery_list() to authenticated;

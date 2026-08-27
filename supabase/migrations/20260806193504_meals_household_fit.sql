-- Private household meal-fit context and diner-aware finalized meal occasions.

create table public.kwilt_meal_planner_preferences (
  household_id uuid primary key references public.kwilt_households(id) on delete cascade,
  usual_diner_person_ids uuid[] not null default '{}',
  setup_state text not null default 'unseen' check (setup_state in ('unseen','skipped','completed')),
  updated_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kwilt_person_food_needs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  person_id uuid not null references public.kwilt_people(id) on delete cascade,
  kind text not null default 'must_avoid' check (kind = 'must_avoid'),
  ingredient_concept text not null check (char_length(btrim(ingredient_concept)) between 1 and 120),
  display_label text not null check (char_length(btrim(display_label)) between 1 and 120),
  created_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, person_id, ingredient_concept)
);

create or replace function public.kwilt_can_manage_meal_preferences(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_current_household_membership(p_household_id) actor
    where actor.status = 'active' and actor.role in ('owner','caregiver')
  )
$$;

create or replace function public.kwilt_can_manage_person_food_need(p_household_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_current_household_membership(p_household_id) actor
    join public.kwilt_household_memberships target
      on target.household_id = p_household_id
     and target.person_id = p_person_id
     and target.status = 'active'
    join public.kwilt_people target_person on target_person.id = target.person_id
    where actor.status = 'active'
      and (
        actor.person_id = target.person_id
        or actor.role = 'owner'
        or (actor.role = 'caregiver' and target_person.kind = 'dependent')
      )
  )
$$;

alter table public.kwilt_meal_planner_preferences enable row level security;
alter table public.kwilt_person_food_needs enable row level security;

create policy kwilt_meal_planner_preferences_authorized_read
  on public.kwilt_meal_planner_preferences for select to authenticated
  using (public.kwilt_can_manage_meal_preferences(household_id));

create policy kwilt_person_food_needs_authorized_read
  on public.kwilt_person_food_needs for select to authenticated
  using (public.kwilt_can_manage_person_food_need(household_id, person_id));

grant select on public.kwilt_meal_planner_preferences, public.kwilt_person_food_needs to authenticated;
revoke all on public.kwilt_meal_planner_preferences, public.kwilt_person_food_needs from anon;
revoke insert, update, delete on public.kwilt_meal_planner_preferences, public.kwilt_person_food_needs from authenticated;

create or replace function public.set_kwilt_person_food_need(
  p_person_id uuid,
  p_ingredient_concept text,
  p_display_label text,
  p_present boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_person_id uuid := public.kwilt_current_person_id();
  v_household_id uuid;
  v_concept text := lower(btrim(p_ingredient_concept));
  v_label text := btrim(p_display_label);
  v_need public.kwilt_person_food_needs;
begin
  perform public.kwilt_require_permanent_user();
  select membership.household_id into v_household_id
  from public.kwilt_household_memberships membership
  where membership.person_id = p_person_id and membership.status = 'active'
  limit 1;
  if v_household_id is null or not public.kwilt_can_manage_person_food_need(v_household_id, p_person_id) then
    raise exception 'food_need_authority_required';
  end if;
  if p_present is null or char_length(v_concept) not between 1 and 120 or char_length(v_label) not between 1 and 120 then
    raise exception 'invalid_person_food_need';
  end if;
  if p_present then
    insert into public.kwilt_person_food_needs(
      household_id, person_id, ingredient_concept, display_label, created_by_person_id
    ) values (v_household_id, p_person_id, v_concept, v_label, v_actor_person_id)
    on conflict (household_id, person_id, ingredient_concept) do update
      set display_label = excluded.display_label, updated_at = now()
    returning * into v_need;
    return jsonb_build_object('id',v_need.id,'personId',v_need.person_id,'kind',v_need.kind,'ingredientConcept',v_need.ingredient_concept,'displayLabel',v_need.display_label);
  end if;
  delete from public.kwilt_person_food_needs need
  where need.household_id = v_household_id and need.person_id = p_person_id and need.ingredient_concept = v_concept;
  return jsonb_build_object('personId',p_person_id,'ingredientConcept',v_concept,'present',false);
end;
$$;

create or replace function public.set_kwilt_meal_planner_preferences(
  p_household_id uuid,
  p_usual_diner_person_ids uuid[],
  p_setup_state text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_person_id uuid := public.kwilt_current_person_id();
  v_diners uuid[] := coalesce(p_usual_diner_person_ids, '{}');
begin
  perform public.kwilt_require_permanent_user();
  if not public.kwilt_can_manage_meal_preferences(p_household_id) then raise exception 'meal_preferences_authority_required'; end if;
  if p_setup_state not in ('unseen','skipped','completed') then raise exception 'invalid_meal_setup_state'; end if;
  if cardinality(v_diners) <> (select count(distinct diner_id) from unnest(v_diners) diner_id) then raise exception 'duplicate_meal_diner'; end if;
  if exists (
    select 1 from unnest(v_diners) diner_id
    where not exists (
      select 1 from public.kwilt_household_memberships membership
      where membership.household_id = p_household_id and membership.person_id = diner_id and membership.status = 'active'
    )
  ) then raise exception 'invalid_meal_diner'; end if;
  insert into public.kwilt_meal_planner_preferences(household_id,usual_diner_person_ids,setup_state,updated_by_person_id)
  values(p_household_id,v_diners,p_setup_state,v_actor_person_id)
  on conflict(household_id) do update set
    usual_diner_person_ids=excluded.usual_diner_person_ids,
    setup_state=excluded.setup_state,
    updated_by_person_id=excluded.updated_by_person_id,
    updated_at=now();
  return jsonb_build_object('householdId',p_household_id,'usualDinerPersonIds',v_diners,'setupState',p_setup_state);
end;
$$;

create or replace function public.kwilt_prune_removed_usual_meal_diner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'active' and new.status = 'removed' then
    update public.kwilt_meal_planner_preferences
    set usual_diner_person_ids = array_remove(usual_diner_person_ids, new.person_id), updated_at = now()
    where household_id = new.household_id and new.person_id = any(usual_diner_person_ids);
  end if;
  return new;
end;
$$;

create trigger kwilt_prune_removed_usual_meal_diner
after update of status on public.kwilt_household_memberships
for each row execute function public.kwilt_prune_removed_usual_meal_diner();

create table public.kwilt_meal_plan_occasions (
  id uuid primary key,
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  plan_version integer not null check (plan_version > 0),
  position integer not null check (position >= 0),
  title text check (title is null or char_length(btrim(title)) between 1 and 120),
  placement_date date,
  not_eating_person_ids uuid[] not null default '{}',
  finalized_at timestamptz not null default now(),
  unique(plan_id, plan_version, position)
);

alter table public.kwilt_meal_plan_entries
  add column occasion_id uuid references public.kwilt_meal_plan_occasions(id) on delete cascade,
  add column diner_person_ids uuid[] not null default '{}';

alter table public.kwilt_meal_plan_occasions enable row level security;
create policy kwilt_meal_occasions_organizer_read on public.kwilt_meal_plan_occasions
  for select to authenticated using (public.kwilt_is_meal_plan_organizer(plan_id));
grant select on public.kwilt_meal_plan_occasions to authenticated;
revoke insert, update, delete on public.kwilt_meal_plan_occasions from public, anon, authenticated;

drop function public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text);

create function public.finalize_kwilt_meal_plan(
  p_plan_id uuid,
  p_expected_version integer,
  p_occasions jsonb,
  p_organizer_note text,
  p_idempotency_key text,
  p_content_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.kwilt_meal_plans;
  v_occasion jsonb;
  v_dish jsonb;
  v_occ_position bigint;
  v_dish_position bigint := 0;
  v_candidate public.kwilt_meal_plan_candidates;
  v_diners uuid[];
  v_not_eating uuid[];
  v_occasion_id uuid;
  v_covered_people uuid[] := '{}';
  v_usual_people uuid[] := '{}';
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if char_length(coalesce(p_idempotency_key,'')) not between 1 and 200 or char_length(coalesce(p_content_hash,'')) not between 1 and 256 then raise exception 'invalid_meal_plan_finalization_identity'; end if;
  if v_plan.finalization_key=p_idempotency_key then
    if v_plan.finalization_content_hash<>p_content_hash then raise exception 'meal_plan_idempotency_conflict'; end if;
    return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,'entryCount',(select count(*) from public.kwilt_meal_plan_entries where plan_id=v_plan.id and plan_version=v_plan.version),'replayed',true);
  end if;
  if v_plan.version<>p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state not in ('draft','ready_to_finalize') or jsonb_typeof(p_occasions)<>'array' or jsonb_array_length(p_occasions)=0 then raise exception 'meal_plan_not_finalizable'; end if;
  update public.kwilt_meal_plans set state='finalized',version=version+1,organizer_note=nullif(btrim(p_organizer_note),''),finalization_key=p_idempotency_key,finalization_content_hash=p_content_hash,finalized_at=now(),updated_at=now() where id=p_plan_id returning * into v_plan;
  for v_occasion,v_occ_position in select value,ordinality from jsonb_array_elements(p_occasions) with ordinality loop
    v_covered_people := '{}';
    v_occasion_id := (v_occasion->>'id')::uuid;
    if jsonb_typeof(v_occasion->'dishes') <> 'array' or jsonb_array_length(v_occasion->'dishes')=0 then raise exception 'meal_occasion_requires_dish'; end if;
    select coalesce(array_agg(value::uuid), '{}') into v_not_eating from jsonb_array_elements_text(coalesce(v_occasion->'notEatingPersonIds','[]'::jsonb));
    if cardinality(v_not_eating)<>(select count(distinct person_id) from unnest(v_not_eating) person_id) then raise exception 'invalid_not_eating_people'; end if;
    if exists (
      select 1 from unnest(v_not_eating) person_id
      where not exists (
        select 1 from public.kwilt_household_memberships membership
        where membership.household_id=v_plan.household_id and membership.person_id=person_id and membership.status='active'
      )
    ) then raise exception 'invalid_not_eating_person'; end if;
    v_covered_people := v_covered_people || v_not_eating;
    insert into public.kwilt_meal_plan_occasions(id,plan_id,plan_version,position,title,placement_date,not_eating_person_ids)
    values(v_occasion_id,p_plan_id,v_plan.version,v_occ_position-1,nullif(btrim(v_occasion->>'title'),''),nullif(v_occasion->>'placementDate','')::date,
      v_not_eating);
    for v_dish in select value from jsonb_array_elements(v_occasion->'dishes') loop
      select * into v_candidate from public.kwilt_meal_plan_candidates where plan_id=p_plan_id and id=(v_dish->>'candidateId')::uuid;
      if v_candidate.id is null then raise exception 'invalid_meal_choice_candidate'; end if;
      select coalesce(array_agg(value::uuid), '{}') into v_diners from jsonb_array_elements_text(coalesce(v_dish->'dinerPersonIds','[]'::jsonb));
      if cardinality(v_diners)=0 or cardinality(v_diners)<>(select count(distinct diner_id) from unnest(v_diners) diner_id) then raise exception 'invalid_meal_diners'; end if;
      if exists (
        select 1 from unnest(v_diners) diner_id
        where not exists (
          select 1 from public.kwilt_household_memberships membership
          where membership.household_id=v_plan.household_id and membership.person_id=diner_id and membership.status='active'
        )
      ) then raise exception 'invalid_meal_diner'; end if;
      if v_diners && v_not_eating then raise exception 'diner_marked_not_eating'; end if;
      v_covered_people := v_covered_people || v_diners;
      insert into public.kwilt_meal_plan_entries(id,plan_id,plan_version,position,candidate_id,kind,title,recipe_snapshot,servings,placement_date,occasion_id,diner_person_ids)
      values((v_dish->>'id')::uuid,p_plan_id,v_plan.version,v_dish_position,v_candidate.id,v_candidate.kind,v_candidate.title,v_candidate.recipe_snapshot,nullif(v_dish->>'servings','')::numeric,nullif(v_occasion->>'placementDate','')::date,v_occasion_id,v_diners);
      v_dish_position := v_dish_position + 1;
    end loop;
    select coalesce(preference.usual_diner_person_ids,'{}') into v_usual_people
    from public.kwilt_meal_planner_preferences preference where preference.household_id=v_plan.household_id;
    if exists(select 1 from unnest(v_usual_people) person_id where not person_id=any(v_covered_people)) then raise exception 'unresolved_meal_diner'; end if;
  end loop;
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,'entryCount',v_dish_position,'occasionCount',jsonb_array_length(p_occasions),'replayed',false);
end;
$$;

revoke all on function public.kwilt_can_manage_meal_preferences(uuid) from public, anon;
revoke all on function public.kwilt_can_manage_person_food_need(uuid,uuid) from public, anon;
grant execute on function public.kwilt_can_manage_meal_preferences(uuid), public.kwilt_can_manage_person_food_need(uuid,uuid) to authenticated;
revoke all on function public.set_kwilt_person_food_need(uuid,text,text,boolean) from public, anon;
revoke all on function public.set_kwilt_meal_planner_preferences(uuid,uuid[],text) from public, anon;
revoke all on function public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text) from public, anon;
grant execute on function public.set_kwilt_person_food_need(uuid,text,text,boolean), public.set_kwilt_meal_planner_preferences(uuid,uuid[],text), public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text) to authenticated;

-- Separate continuous cart ideas from immutable, progressively timed Next meals.

alter table public.kwilt_meal_plan_occasions
  add column timing_kind text not null default 'flexible',
  add column meal_period text,
  add column coverage_dates date[] not null default '{}',
  add column coverage_label text;

update public.kwilt_meal_plan_occasions
set timing_kind = 'occasion', meal_period = 'dinner'
where placement_date is not null;

create function public.kwilt_dates_are_unique(p_dates date[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(coalesce(p_dates, '{}')) = (
    select count(distinct value) from unnest(coalesce(p_dates, '{}')) value
  )
$$;

revoke all on function public.kwilt_dates_are_unique(date[]) from public, anon, authenticated;

alter table public.kwilt_meal_plan_occasions
  add constraint kwilt_meal_timing_kind_valid
    check (timing_kind in ('flexible', 'occasion', 'coverage')),
  add constraint kwilt_meal_period_valid
    check (meal_period is null or meal_period in ('breakfast', 'lunch', 'dinner', 'snack')),
  add constraint progressive_meal_timing_valid check (
    (timing_kind = 'flexible'
      and placement_date is null
      and meal_period is null
      and cardinality(coverage_dates) = 0
      and coverage_label is null)
    or
    (timing_kind = 'occasion'
      and placement_date is not null
      and meal_period is not null
      and cardinality(coverage_dates) = 0
      and coverage_label is null)
    or
    (timing_kind = 'coverage'
      and placement_date is null
      and meal_period is not null
      and cardinality(coverage_dates) > 0
      and public.kwilt_dates_are_unique(coverage_dates)
      and char_length(btrim(coverage_label)) between 1 and 120)
  );

create or replace function public.get_kwilt_shared_meal_cart(p_household_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;

  select * into v_plan
  from public.kwilt_meal_plans plan
  where plan.household_id = p_household_id and plan.state = 'draft'
  order by plan.updated_at desc, plan.created_at desc
  limit 1;

  return jsonb_build_object(
    'planId', v_plan.id,
    'householdId', p_household_id,
    'version', v_plan.version,
    'state', v_plan.state,
    'viewer', jsonb_build_object(
      'personId', v_actor.person_id,
      'role', v_actor.role,
      'canAdd', true,
      'canSettle', coalesce(v_plan.organizer_membership_id = v_actor.id, false)
    ),
    'candidates', case when v_plan.id is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', candidate.id,
        'kind', candidate.kind,
        'title', candidate.title,
        'recipeSnapshot', candidate.recipe_snapshot,
        'position', candidate.position,
        'selected', true,
        'contributor', jsonb_build_object(
          'personId', contributor.id,
          'displayName', contributor.display_name,
          'avatarUrl', null
        ),
        'supporters', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'personId', supporter.id,
            'displayName', supporter.display_name,
            'avatarUrl', null
          ) order by reaction.created_at, supporter.display_name), '[]'::jsonb)
          from public.kwilt_meal_candidate_reactions reaction
          join public.kwilt_people supporter on supporter.id = reaction.person_id
          where reaction.candidate_id = candidate.id
        ),
        'canWithdraw', candidate.suggested_by_person_id = v_actor.person_id
          or v_plan.organizer_membership_id = v_actor.id
      ) order by candidate.position), '[]'::jsonb)
      from public.kwilt_meal_plan_candidates candidate
      join public.kwilt_people contributor on contributor.id = candidate.suggested_by_person_id
      where candidate.plan_id = v_plan.id
    ) end
  );
end;
$$;

create or replace function public.finalize_kwilt_meal_plan(
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
  v_timing_kind text;
  v_meal_period text;
  v_coverage_dates date[];
  v_coverage_label text;
  v_selected_candidate_ids uuid[] := '{}';
  v_cart_plan_id uuid;
  v_new_candidate_id uuid;
  v_candidate_map jsonb := '{}'::jsonb;
  v_carried_candidate_count integer := 0;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if char_length(coalesce(p_idempotency_key,'')) not between 1 and 200 or char_length(coalesce(p_content_hash,'')) not between 1 and 256 then raise exception 'invalid_meal_plan_finalization_identity'; end if;
  if v_plan.finalization_key = p_idempotency_key then
    if v_plan.finalization_content_hash <> p_content_hash then raise exception 'meal_plan_idempotency_conflict'; end if;
    return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,'entryCount',(select count(*) from public.kwilt_meal_plan_entries where plan_id=v_plan.id and plan_version=v_plan.version),'replayed',true);
  end if;
  if v_plan.version <> p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state not in ('draft','ready_to_finalize') or jsonb_typeof(p_occasions) <> 'array' or jsonb_array_length(p_occasions) = 0 then raise exception 'meal_plan_not_finalizable'; end if;

  select coalesce(array_agg(distinct (dish->>'candidateId')::uuid), '{}')
  into v_selected_candidate_ids
  from jsonb_array_elements(p_occasions) occasion
  cross join lateral jsonb_array_elements(occasion->'dishes') dish;

  update public.kwilt_meal_plans set state='finalized',version=version+1,organizer_note=nullif(btrim(p_organizer_note),''),finalization_key=p_idempotency_key,finalization_content_hash=p_content_hash,finalized_at=now(),updated_at=now() where id=p_plan_id returning * into v_plan;
  for v_occasion,v_occ_position in select value,ordinality from jsonb_array_elements(p_occasions) with ordinality loop
    v_covered_people := '{}';
    v_occasion_id := (v_occasion->>'id')::uuid;
    if jsonb_typeof(v_occasion->'dishes') <> 'array' or jsonb_array_length(v_occasion->'dishes') = 0 then raise exception 'meal_occasion_requires_dish'; end if;
    select coalesce(array_agg(value::uuid), '{}') into v_not_eating from jsonb_array_elements_text(coalesce(v_occasion->'notEatingPersonIds','[]'::jsonb));
    if cardinality(v_not_eating) <> (select count(distinct person_id) from unnest(v_not_eating) person_id) then raise exception 'invalid_not_eating_people'; end if;
    if exists (
      select 1 from unnest(v_not_eating) person_id
      where not exists (
        select 1 from public.kwilt_household_memberships membership
        where membership.household_id=v_plan.household_id and membership.person_id=person_id and membership.status='active'
      )
    ) then raise exception 'invalid_not_eating_person'; end if;
    v_covered_people := v_covered_people || v_not_eating;

    v_timing_kind := coalesce(v_occasion->'timing'->>'kind', case when nullif(v_occasion->>'placementDate','') is null then 'flexible' else 'occasion' end);
    v_meal_period := case when v_timing_kind = 'flexible' then null else coalesce(v_occasion->'timing'->>'mealPeriod', 'dinner') end;
    select coalesce(array_agg(value::date order by value::date), '{}') into v_coverage_dates
    from jsonb_array_elements_text(coalesce(v_occasion->'timing'->'dates', '[]'::jsonb));
    v_coverage_label := case when v_timing_kind = 'coverage' then nullif(btrim(coalesce(v_occasion->'timing'->>'label', v_occasion->>'title')), '') else null end;

    insert into public.kwilt_meal_plan_occasions(
      id,plan_id,plan_version,position,title,placement_date,not_eating_person_ids,
      timing_kind,meal_period,coverage_dates,coverage_label
    ) values(
      v_occasion_id,p_plan_id,v_plan.version,v_occ_position-1,
      nullif(btrim(v_occasion->>'title'),''),
      case when v_timing_kind = 'occasion' then coalesce(nullif(v_occasion->'timing'->>'date',''), nullif(v_occasion->>'placementDate',''))::date else null end,
      v_not_eating,v_timing_kind,v_meal_period,v_coverage_dates,v_coverage_label
    );
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
      values((v_dish->>'id')::uuid,p_plan_id,v_plan.version,v_dish_position,v_candidate.id,v_candidate.kind,v_candidate.title,v_candidate.recipe_snapshot,nullif(v_dish->>'servings','')::numeric,case when v_timing_kind='occasion' then coalesce(nullif(v_occasion->'timing'->>'date',''),nullif(v_occasion->>'placementDate',''))::date else null end,v_occasion_id,v_diners);
      v_dish_position := v_dish_position + 1;
    end loop;
    select coalesce(preference.usual_diner_person_ids,'{}') into v_usual_people
    from public.kwilt_meal_planner_preferences preference where preference.household_id=v_plan.household_id;
    if exists(select 1 from unnest(v_usual_people) person_id where not person_id=any(v_covered_people)) then raise exception 'unresolved_meal_diner'; end if;
  end loop;

  if exists (
    select 1 from public.kwilt_meal_plan_candidates candidate
    where candidate.plan_id = p_plan_id
      and not (candidate.id = any(v_selected_candidate_ids))
  ) then
    insert into public.kwilt_meal_plans(household_id,organizer_membership_id,organizer_person_id,horizon)
    values(v_plan.household_id,v_plan.organizer_membership_id,v_plan.organizer_person_id,jsonb_build_object('kind', 'open'))
    returning id into v_cart_plan_id;

    for v_candidate in
      select candidate.* from public.kwilt_meal_plan_candidates candidate
      where candidate.plan_id = p_plan_id
        and not (candidate.id = any(v_selected_candidate_ids))
      order by candidate.position, candidate.created_at, candidate.id
    loop
      v_new_candidate_id := gen_random_uuid();
      v_candidate_map := v_candidate_map || jsonb_build_object(v_candidate.id::text, v_new_candidate_id::text);
      insert into public.kwilt_meal_plan_candidates(id,plan_id,position,kind,title,recipe_snapshot,suggested_by_person_id)
      values(v_new_candidate_id,v_cart_plan_id,v_carried_candidate_count,v_candidate.kind,v_candidate.title,v_candidate.recipe_snapshot,v_candidate.suggested_by_person_id);
      insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id,reaction,created_at)
      select v_new_candidate_id,reaction.person_id,reaction.reaction,reaction.created_at
      from public.kwilt_meal_candidate_reactions reaction where reaction.candidate_id = v_candidate.id;
      v_carried_candidate_count := v_carried_candidate_count + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,
    'entryCount',v_dish_position,'occasionCount',jsonb_array_length(p_occasions),
    'cartPlanId',v_cart_plan_id,'carriedCandidateCount',v_carried_candidate_count,
    'candidateMap',v_candidate_map,'replayed',false
  );
end;
$$;

revoke execute on function public.get_kwilt_shared_meal_cart(uuid) from public, anon;
grant execute on function public.get_kwilt_shared_meal_cart(uuid) to authenticated;
revoke execute on function public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text) from public, anon;
grant execute on function public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text) to authenticated;

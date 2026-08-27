-- Normalize JSON null to SQL NULL before writing meal-note candidates.
create or replace function public.add_kwilt_shared_meal_candidate(
  p_household_id uuid,
  p_candidate_id uuid,
  p_candidate jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_owner public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
  v_existing public.kwilt_meal_plan_candidates;
  v_kind text := coalesce(p_candidate->>'kind', 'meal_note');
  v_title text := btrim(coalesce(p_candidate->>'title', ''));
  v_snapshot_type text := jsonb_typeof(p_candidate->'recipeSnapshot');
  v_snapshot jsonb := case when jsonb_typeof(p_candidate->'recipeSnapshot') = 'object'
    then p_candidate->'recipeSnapshot' else null end;
  v_position integer;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if p_candidate_id is null or jsonb_typeof(p_candidate) <> 'object'
    or v_kind not in ('recipe', 'meal_note')
    or char_length(v_title) not between 1 and 160
    or (v_kind = 'recipe' and v_snapshot_type <> 'object')
    or (v_kind = 'meal_note' and coalesce(v_snapshot_type, 'null') <> 'null')
  then raise exception 'invalid_meal_candidate'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household_id::text, 2086));

  select * into v_existing from public.kwilt_meal_plan_candidates where id = p_candidate_id;
  if v_existing.id is not null then
    if v_existing.suggested_by_person_id <> v_actor.person_id
      or v_existing.title <> v_title
      or v_existing.kind <> v_kind
      or v_existing.recipe_snapshot is distinct from v_snapshot
    then raise exception 'shared_meal_candidate_idempotency_conflict'; end if;
    return jsonb_build_object('planId', v_existing.plan_id, 'candidateId', v_existing.id, 'replayed', true);
  end if;

  select * into v_plan
  from public.kwilt_meal_plans plan
  where plan.household_id = p_household_id and plan.state = 'draft'
  order by plan.updated_at desc, plan.created_at desc
  limit 1 for update;
  if v_plan.id is null then
    select * into v_owner
    from public.kwilt_household_memberships membership
    where membership.household_id = p_household_id
      and membership.status = 'active' and membership.role = 'owner';
    if v_owner.id is null then raise exception 'meal_plan_organizer_required'; end if;
    insert into public.kwilt_meal_plans(
      household_id, organizer_membership_id, organizer_person_id, horizon
    ) values (
      p_household_id, v_owner.id, v_owner.person_id, jsonb_build_object('kind', 'open')
    ) returning * into v_plan;
  end if;
  select count(*)::integer into v_position
  from public.kwilt_meal_plan_candidates where plan_id = v_plan.id;
  if v_position >= 60 then raise exception 'invalid_meal_candidates'; end if;

  insert into public.kwilt_meal_plan_candidates(
    id, plan_id, position, kind, title, recipe_snapshot, suggested_by_person_id
  ) values (
    p_candidate_id, v_plan.id, v_position, v_kind, v_title, v_snapshot, v_actor.person_id
  );
  insert into public.kwilt_meal_candidate_reactions(candidate_id, person_id)
  values(p_candidate_id, v_actor.person_id);
  update public.kwilt_meal_plans
  set version = version + 1, updated_at = now()
  where id = v_plan.id returning * into v_plan;
  return jsonb_build_object('planId', v_plan.id, 'candidateId', p_candidate_id, 'version', v_plan.version, 'replayed', false);
end;
$$;

revoke execute on function public.add_kwilt_shared_meal_candidate(uuid,uuid,jsonb) from public, anon;
grant execute on function public.add_kwilt_shared_meal_candidate(uuid,uuid,jsonb) to authenticated;

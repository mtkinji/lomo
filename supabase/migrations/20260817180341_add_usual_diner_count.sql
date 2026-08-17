alter table public.kwilt_meal_planner_preferences
  add column usual_diner_count integer;

update public.kwilt_meal_planner_preferences
set usual_diner_count = case
  when cardinality(usual_diner_person_ids) > 0
    then least(20, cardinality(usual_diner_person_ids))
  else 4
end;

alter table public.kwilt_meal_planner_preferences
  alter column usual_diner_count set default 4,
  alter column usual_diner_count set not null,
  add constraint kwilt_meal_planner_preferences_usual_diner_count_check
    check (usual_diner_count between 1 and 20);

create or replace function public.set_kwilt_meal_planner_preferences(
  p_household_id uuid,
  p_usual_diner_person_ids uuid[],
  p_usual_diner_count integer,
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
  if not public.kwilt_can_manage_meal_preferences(p_household_id) then
    raise exception 'meal_preferences_authority_required';
  end if;
  if p_setup_state not in ('unseen','skipped','completed') then
    raise exception 'invalid_meal_setup_state';
  end if;
  if p_usual_diner_count is null
    or p_usual_diner_count not between 1 and 20
    or p_usual_diner_count < cardinality(v_diners) then
    raise exception 'invalid_usual_diner_count';
  end if;
  if cardinality(v_diners) <> (select count(distinct diner_id) from unnest(v_diners) diner_id) then
    raise exception 'duplicate_meal_diner';
  end if;
  if exists (
    select 1 from unnest(v_diners) diner_id
    where not exists (
      select 1 from public.kwilt_household_memberships membership
      where membership.household_id = p_household_id
        and membership.person_id = diner_id
        and membership.status = 'active'
    )
  ) then
    raise exception 'invalid_meal_diner';
  end if;
  insert into public.kwilt_meal_planner_preferences(
    household_id, usual_diner_person_ids, usual_diner_count, setup_state, updated_by_person_id
  ) values (
    p_household_id, v_diners, p_usual_diner_count, p_setup_state, v_actor_person_id
  )
  on conflict(household_id) do update set
    usual_diner_person_ids = excluded.usual_diner_person_ids,
    usual_diner_count = excluded.usual_diner_count,
    setup_state = excluded.setup_state,
    updated_by_person_id = excluded.updated_by_person_id,
    updated_at = now();
  return jsonb_build_object(
    'householdId', p_household_id,
    'usualDinerPersonIds', v_diners,
    'usualDinerCount', p_usual_diner_count,
    'setupState', p_setup_state
  );
end;
$$;

-- Keep the released three-argument command available while older app versions
-- are still installed. It preserves an existing count and raises it when more
-- named diners are selected.
create or replace function public.set_kwilt_meal_planner_preferences(
  p_household_id uuid,
  p_usual_diner_person_ids uuid[],
  p_setup_state text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.set_kwilt_meal_planner_preferences(
    p_household_id,
    p_usual_diner_person_ids,
    greatest(
      cardinality(coalesce(p_usual_diner_person_ids, '{}')),
      coalesce((
        select preferences.usual_diner_count
        from public.kwilt_meal_planner_preferences preferences
        where preferences.household_id = p_household_id
      ), 4)
    ),
    p_setup_state
  );
$$;

revoke execute on function public.set_kwilt_meal_planner_preferences(uuid, uuid[], integer, text) from public, anon;
grant execute on function public.set_kwilt_meal_planner_preferences(uuid, uuid[], integer, text) to authenticated;
revoke execute on function public.set_kwilt_meal_planner_preferences(uuid, uuid[], text) from public, anon;
grant execute on function public.set_kwilt_meal_planner_preferences(uuid, uuid[], text) to authenticated;

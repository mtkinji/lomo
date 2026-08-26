-- Keep household meal-fit data private and index its relationship lookups.

revoke all on public.kwilt_meal_plan_occasions from public, anon;
grant select on public.kwilt_meal_plan_occasions to authenticated;

create index kwilt_meal_planner_preferences_updated_by_person_id_idx
  on public.kwilt_meal_planner_preferences(updated_by_person_id);

create index kwilt_person_food_needs_person_id_idx
  on public.kwilt_person_food_needs(person_id);

create index kwilt_person_food_needs_created_by_person_id_idx
  on public.kwilt_person_food_needs(created_by_person_id);

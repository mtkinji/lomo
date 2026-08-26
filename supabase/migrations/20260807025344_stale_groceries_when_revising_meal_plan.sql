-- A finalized grocery list is a projection of one meal-plan version. Revising
-- that plan must invalidate the active projection in the same transaction so
-- the client can offer an explicit preserve-and-refresh recovery path.
create or replace function public.revise_kwilt_meal_plan(p_plan_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan public.kwilt_meal_plans;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if v_plan.version<>p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state<>'finalized' then raise exception 'meal_plan_not_revisable'; end if;

  update public.kwilt_grocery_lists set status='stale',updated_at=now()
    where source_meal_plan_id=p_plan_id
      and status in ('review_needed','ready');

  update public.kwilt_meal_plans
    set state='draft',version=version+1,finalization_key=null,
        finalization_content_hash=null,finalized_at=null,updated_at=now()
    where id=p_plan_id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state);
end;
$$;

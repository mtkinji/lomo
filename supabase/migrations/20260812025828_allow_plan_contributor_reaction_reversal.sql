-- A recipe nomination begins with the contributor's support, but that support
-- remains a reversible personal reaction. Removing it does not remove the
-- recipe occurrence from the household Plan.
create or replace function public.set_kwilt_shared_meal_reaction(p_candidate_id uuid,p_reacted boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_candidate public.kwilt_meal_plan_candidates;
begin
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state<>'draft' or v_candidate.lifecycle_state not in ('idea','sent') then raise exception 'meal_plan_candidate_not_active'; end if;
  if p_reacted then
    insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id)
      values(p_candidate_id,v_actor.person_id)
      on conflict(candidate_id,person_id) do nothing;
  else
    delete from public.kwilt_meal_candidate_reactions
      where candidate_id=p_candidate_id and person_id=v_actor.person_id;
  end if;
  return jsonb_build_object('candidateId',p_candidate_id,'reacted',p_reacted);
end;
$$;

revoke execute on function public.set_kwilt_shared_meal_reaction(uuid,boolean) from public,anon;
grant execute on function public.set_kwilt_shared_meal_reaction(uuid,boolean) to authenticated;

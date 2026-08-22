-- Return a grocery-committed meal to the active Plan without deleting it.
-- The existing authoritative remove path first recompiles the Grocery list so
-- only unpurchased candidate contributions disappear; this wrapper then
-- restores the candidate to the idea lifecycle in the same transaction.

create or replace function public.return_kwilt_household_plan_candidate_to_ideas(
  p_actor_person_id uuid,
  p_plan_id uuid,
  p_expected_version integer,
  p_candidate_ids uuid[],
  p_payload_hash text,
  p_compiled_items jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_receipt jsonb;
  v_candidate_count integer;
begin
  v_receipt:=public.sync_kwilt_household_plan_groceries(
    p_actor_person_id,p_plan_id,p_expected_version,'remove',p_candidate_ids,p_payload_hash,p_compiled_items
  );

  update public.kwilt_meal_plan_candidates
  set lifecycle_state='idea',
      sent_at=null,
      sent_by_person_id=null,
      resolved_at=null,
      resolved_by_person_id=null,
      removed_grocery_behavior=null,
      lifecycle_updated_at=now()
  where plan_id=p_plan_id
    and id=any(p_candidate_ids)
    and lifecycle_state='removed'
    and removed_grocery_behavior='removed';
  get diagnostics v_candidate_count=row_count;
  if v_candidate_count<>cardinality(p_candidate_ids) then
    raise exception 'invalid_household_plan_candidate';
  end if;

  return v_receipt||jsonb_build_object('action','return');
end;
$$;

create or replace function public.return_kwilt_personal_plan_candidate_to_ideas(
  p_actor_person_id uuid,
  p_plan_id uuid,
  p_expected_version integer,
  p_candidate_ids uuid[],
  p_payload_hash text,
  p_compiled_items jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_receipt jsonb;
  v_candidate_count integer;
begin
  v_receipt:=public.sync_kwilt_personal_plan_groceries(
    p_actor_person_id,p_plan_id,p_expected_version,'remove',p_candidate_ids,p_payload_hash,p_compiled_items,false
  );

  update public.kwilt_meal_plan_candidates
  set lifecycle_state='idea',
      sent_at=null,
      sent_by_person_id=null,
      resolved_at=null,
      resolved_by_person_id=null,
      removed_grocery_behavior=null,
      lifecycle_updated_at=now()
  where plan_id=p_plan_id
    and id=any(p_candidate_ids)
    and lifecycle_state='removed'
    and removed_grocery_behavior='removed';
  get diagnostics v_candidate_count=row_count;
  if v_candidate_count<>cardinality(p_candidate_ids) then
    raise exception 'invalid_household_plan_candidate';
  end if;

  return v_receipt||jsonb_build_object('action','return');
end;
$$;

revoke execute on function public.return_kwilt_household_plan_candidate_to_ideas(uuid,uuid,integer,uuid[],text,jsonb) from public,anon,authenticated;
grant execute on function public.return_kwilt_household_plan_candidate_to_ideas(uuid,uuid,integer,uuid[],text,jsonb) to service_role;
revoke execute on function public.return_kwilt_personal_plan_candidate_to_ideas(uuid,uuid,integer,uuid[],text,jsonb) from public,anon,authenticated;
grant execute on function public.return_kwilt_personal_plan_candidate_to_ideas(uuid,uuid,integer,uuid[],text,jsonb) to service_role;

-- Add one atomic standing agreement that requires foreground use of a saved
-- child-scoped selection before a separate target selection becomes available.
-- Apple application/category tokens and usage history remain on the child device.

create or replace function public.create_kwilt_family_screen_time_prerequisite_agreement(
  p_child_membership_id uuid,
  p_target_selection_id uuid,
  p_prerequisite_selection_id uuid,
  p_expected_policy_version bigint,
  p_rule jsonb,
  p_operation_id text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor public.kwilt_household_memberships;
  v_subject public.kwilt_family_screen_time_subjects;
  v_agreement public.kwilt_family_screen_time_agreements;
  v_prerequisite jsonb;
  v_existing jsonb;
  v_result jsonb;
begin
  v_actor := public.kwilt_family_screen_time_caregiver_for_child(p_child_membership_id);

  if jsonb_typeof(p_rule) is distinct from 'object'
  then raise exception 'invalid_family_screen_time_prerequisite_rule'; end if;

  if p_target_selection_id is null or p_prerequisite_selection_id is null
    or p_target_selection_id = p_prerequisite_selection_id
    or p_expected_policy_version is null
    or p_expected_policy_version < 0
    or nullif(trim(p_operation_id), '') is null
    or jsonb_object_length(p_rule) <> 5
    or (p_rule - 'weekdays' - 'startMinute' - 'endMinute' - 'dailyLimitMinutes' - 'prerequisiteActivity') <> '{}'::jsonb
  then raise exception 'invalid_family_screen_time_prerequisite_rule'; end if;

  v_prerequisite := p_rule->'prerequisiteActivity';
  if jsonb_typeof(p_rule->'weekdays') is distinct from 'array'
    or jsonb_typeof(v_prerequisite) is distinct from 'object'
    or jsonb_object_length(v_prerequisite) <> 3
  then raise exception 'invalid_family_screen_time_prerequisite_rule'; end if;

  if jsonb_array_length(p_rule->'weekdays') not between 1 and 7
    or exists (
      select 1 from jsonb_array_elements(p_rule->'weekdays') day
      where jsonb_typeof(day) <> 'number' or day #>> '{}' !~ '^[0-6]$'
    )
    or (select count(distinct day) from jsonb_array_elements_text(p_rule->'weekdays') day)
      <> jsonb_array_length(p_rule->'weekdays')
    or (v_prerequisite - 'selectionId' - 'thresholdMinutes' - 'reset') <> '{}'::jsonb
    or v_prerequisite->>'selectionId' <> p_prerequisite_selection_id::text
    or coalesce(v_prerequisite->>'thresholdMinutes', '') !~ '^\d{1,4}$'
    or v_prerequisite->>'reset' <> 'daily'
  then raise exception 'invalid_family_screen_time_prerequisite_rule'; end if;

  if jsonb_typeof(p_rule->'startMinute') <> 'number'
    or jsonb_typeof(p_rule->'endMinute') <> 'number'
    or jsonb_typeof(p_rule->'dailyLimitMinutes') not in ('number', 'null')
    or jsonb_typeof(v_prerequisite->'thresholdMinutes') <> 'number'
    or coalesce(p_rule->>'startMinute', '') !~ '^\d{1,4}$'
    or coalesce(p_rule->>'endMinute', '') !~ '^\d{1,4}$'
    or not (
      p_rule->'dailyLimitMinutes' = 'null'::jsonb
      or coalesce(p_rule->>'dailyLimitMinutes', '') ~ '^\d{1,4}$'
    )
  then raise exception 'invalid_family_screen_time_prerequisite_rule'; end if;

  if (p_rule->>'startMinute')::integer not between 0 and 1439
    or (p_rule->>'endMinute')::integer not between 1 and 1440
    or (p_rule->>'endMinute')::integer <= (p_rule->>'startMinute')::integer
    or (
      p_rule->'dailyLimitMinutes' <> 'null'::jsonb
      and (p_rule->>'dailyLimitMinutes')::integer not between 1 and 1440
    )
    or (v_prerequisite->>'thresholdMinutes')::integer not between 1 and 1440
  then raise exception 'invalid_family_screen_time_prerequisite_rule'; end if;

  select result into v_existing
    from public.kwilt_family_screen_time_operations
    where operation_id = p_operation_id
      and household_id = v_actor.household_id
      and actor_user_id = auth.uid();
  if v_existing is not null then return v_existing; end if;

  v_subject := public.kwilt_family_screen_time_subject_for_child(
    p_child_membership_id,
    v_actor.id
  );
  select * into v_subject
    from public.kwilt_family_screen_time_subjects
    where id = v_subject.id
    for update;

  if v_subject.desired_policy_version <> p_expected_policy_version
    then raise exception 'family_screen_time_version_mismatch'; end if;
  if not exists (
    select 1 from public.kwilt_family_screen_time_selections
    where id = p_target_selection_id and subject_id = v_subject.id and status = 'active'
  ) or not exists (
    select 1 from public.kwilt_family_screen_time_selections
    where id = p_prerequisite_selection_id and subject_id = v_subject.id and status = 'active'
  ) then raise exception 'selection_subject_mismatch'; end if;

  insert into public.kwilt_family_screen_time_agreements
    (subject_id, selection_id, rule, active, changed_by_membership_id)
  values (v_subject.id, p_target_selection_id, p_rule, true, v_actor.id)
  returning * into v_agreement;

  update public.kwilt_family_screen_time_subjects set
    desired_policy_version = desired_policy_version + 1,
    changed_by_membership_id = v_actor.id,
    updated_at = now()
    where id = v_subject.id
    returning * into v_subject;

  v_result := jsonb_build_object(
    'agreementId', v_agreement.id,
    'childMembershipId', p_child_membership_id,
    'targetSelectionId', v_agreement.selection_id,
    'prerequisiteSelectionId', p_prerequisite_selection_id,
    'rule', v_agreement.rule,
    'active', v_agreement.active,
    'version', v_agreement.version,
    'desiredPolicyVersion', v_subject.desired_policy_version,
    'operationId', p_operation_id
  );
  insert into public.kwilt_family_screen_time_operations
    (household_id, actor_membership_id, actor_user_id, operation_kind, operation_id, result)
  values (
    v_actor.household_id, v_actor.id, auth.uid(), 'agreement_set', p_operation_id, v_result
  );
  return v_result;
end;
$$;

revoke execute on function public.create_kwilt_family_screen_time_prerequisite_agreement(uuid, uuid, uuid, bigint, jsonb, text) from public, anon;
grant execute on function public.create_kwilt_family_screen_time_prerequisite_agreement(uuid, uuid, uuid, bigint, jsonb, text) to authenticated;

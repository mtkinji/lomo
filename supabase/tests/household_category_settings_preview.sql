-- Uses the category_settings_fixture in the isolated regression runner.
insert into public.budget_planning_basis_overrides(user_id,monthly_basis_cents)
  select owner_id,500000 from category_settings_fixture;
insert into public.budget_living_plan_config(user_id,promotion_enabled) select owner_id,true from category_settings_fixture;
insert into public.budget_living_plan_versions(user_id,period_id,living_percent,resource_basis_cents,target_cents,planned_cents,unassigned_cents,over_target_cents,status,evidence_hash,candidate_hash,allocator_version)
  select owner_id,'2026-11',80,500000,400000,10000,390000,0,'ready','snapshot-evidence','snapshot-candidate','living-plan-v2' from category_settings_fixture;
insert into public.budget_living_plan_components(plan_version_id,user_id,category_id,amount_cents,source)
  select id,user_id,'legacy-atomic-settings',10000,'override' from public.budget_living_plan_versions where candidate_hash='snapshot-candidate';
insert into public.budget_living_plan_receipts(user_id,plan_version_id,trigger,outcome,cause)
  select user_id,id,'category_changed','initial','Snapshot fixture' from public.budget_living_plan_versions where candidate_hash='snapshot-candidate';
insert into public.budget_active_living_plans(user_id,plan_version_id)
  select user_id,id from public.budget_living_plan_versions where candidate_hash='snapshot-candidate';
insert into public.budget_planning_income_sources(user_id,source_key,cashflow_meaning,planning_role,confidence,expected_monthly_cents,policy_version)
  select owner_id,'synthetic-source','income','recurring_planning_income','high',500000,'planning-income-v1' from category_settings_fixture;
set local role authenticated;
do $$
declare f record; actor uuid; visible_count integer; changed_count integer; table_name text;
begin
  select * into f from category_settings_fixture;
  foreach actor in array array[f.owner_id,f.adult_id,f.child_id,f.other_id] loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'is_anonymous',false)::text,true);
    assert public.budget_effective_owner_user_id() is not distinct from
      case when actor in (f.owner_id,f.adult_id) then f.owner_id when actor=f.child_id then null::uuid else actor end,
      'Snapshot owner resolution did not match authority';
    foreach table_name in array array['budget_active_living_plans','budget_living_plan_versions','budget_living_plan_components','budget_living_plan_receipts','budget_planning_income_sources'] loop
      execute format('select count(*) from public.%I where user_id=$1',table_name) into visible_count using f.owner_id;
      assert visible_count=case when actor in (f.owner_id,f.adult_id) then 1 else 0 end,
        'Snapshot projection read violated household authority: '||table_name;
    end loop;
    select count(*) into visible_count from public.budget_planning_basis_overrides where user_id=f.owner_id;
    assert visible_count=case when actor in (f.owner_id,f.adult_id) then 1 else 0 end,
      'Household preview did not respect adult read authority';
    select count(*) into visible_count from public.budget_living_plan_config where user_id=f.owner_id;
    assert visible_count=case when actor in (f.owner_id,f.adult_id) then 1 else 0 end,
      'Household preview cannot read governed config';
  end loop;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.adult_id,'is_anonymous',false)::text,true);
  update public.budget_planning_basis_overrides set monthly_basis_cents=1 where user_id=f.owner_id;
  get diagnostics changed_count=row_count;
  assert changed_count=0, 'Preview access unexpectedly granted planning-basis writes';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',true)::text,true);
  assert public.budget_effective_owner_user_id() is null, 'Anonymous account resolved a snapshot owner';
  assert not exists(select 1 from public.budget_planning_basis_overrides where user_id=f.owner_id), 'Anonymous account read basis';
  assert not exists(select 1 from public.budget_living_plan_config where user_id=f.owner_id), 'Anonymous account read config';
  perform set_config('request.jwt.claims','{}',true);
  assert public.budget_effective_owner_user_id() is null, 'Signed-out account resolved a snapshot owner';
  assert not exists(select 1 from public.budget_planning_basis_overrides), 'Signed-out account read basis';
end $$;
reset role;
update public.kwilt_household_memberships set status='removed' where person_id=(select adult_id from category_settings_fixture);
set local role authenticated;
do $$
declare f record;
begin
  select * into f from category_settings_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.adult_id,'is_anonymous',false)::text,true);
  assert public.budget_effective_owner_user_id()<>f.owner_id, 'Revoked caregiver retained the household snapshot owner';
  assert not exists(select 1 from public.budget_active_living_plans where user_id=f.owner_id), 'Revoked caregiver read active plan';
  assert not exists(select 1 from public.budget_planning_basis_overrides where user_id=f.owner_id), 'Revoked caregiver read basis';
end $$;
reset role;
rollback;
select 'Household snapshot/preview reads, unchanged write authority, and revoked/child/anonymous denial passed' as result;

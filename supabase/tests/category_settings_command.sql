-- Run on an isolated migrated database with administrative test access. All fixtures roll back.
begin;
create temporary table category_settings_fixture as select
  gen_random_uuid() owner_id, gen_random_uuid() adult_id, gen_random_uuid() child_id,
  gen_random_uuid() other_id, gen_random_uuid() household_id, gen_random_uuid() category_id,
  gen_random_uuid() request_id, gen_random_uuid() adult_request_id;
grant select on category_settings_fixture to authenticated;
insert into auth.users(id) select owner_id from category_settings_fixture union all select adult_id from category_settings_fixture
  union all select child_id from category_settings_fixture union all select other_id from category_settings_fixture;
insert into public.kwilt_people(id,display_name,kind,created_by_user_id)
  select owner_id,'Settings owner','adult',owner_id from category_settings_fixture union all
  select adult_id,'Settings adult','adult',owner_id from category_settings_fixture union all
  select child_id,'Settings child','dependent',owner_id from category_settings_fixture;
insert into public.kwilt_person_auth_bindings(person_id,user_id)
  select owner_id,owner_id from category_settings_fixture union all select adult_id,adult_id from category_settings_fixture
  union all select child_id,child_id from category_settings_fixture;
insert into public.kwilt_households(id,name,created_by_user_id) select household_id,'Settings test',owner_id from category_settings_fixture;
insert into public.kwilt_household_memberships(household_id,person_id,role)
  select household_id,owner_id,'owner' from category_settings_fixture union all
  select household_id,adult_id,'caregiver' from category_settings_fixture union all
  select household_id,child_id,'child' from category_settings_fixture;
insert into public.budget_categories(id,user_id,slug,legacy_budget_id,name,updated_at)
  select category_id,owner_id,'atomic-settings','legacy-atomic-settings','Original','2026-01-01' from category_settings_fixture;
insert into public.budget_plans(category_id,user_id,base_budget_cents,plan_role,updated_at)
  select category_id,owner_id,10000,'flexible','2026-01-01' from category_settings_fixture;

set local role authenticated;
do $$
declare f record; settings jsonb; first_receipt jsonb; replay jsonb; actor uuid; failed boolean; rejection jsonb;
begin
  select * into f from category_settings_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',false)::text,true);
  settings := jsonb_build_object('name','Saved together','budgetCents',20000,'fundingRhythm','monthly',
    'rolloverEnabled',true,'rolloverPolicy',jsonb_build_object('startMonth','2026-01','startingBalanceCents',-1000,
      'monthlyAmounts',jsonb_build_object('2026-01',10000,to_char(current_date,'YYYY-MM'),20000),'timeZone','UTC'),
    'planRole','protected','expectedNeedCents',null,'expectedNeedDueMonth',null);
  -- The session can change after the client preflight check but before dispatch.
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(p_request_id=>gen_random_uuid(),p_category_id=>f.category_id,
      p_expected_actor_user_id=>f.adult_id,p_expected_category_updated_at=>'2026-01-01',
      p_expected_plan_updated_at=>'2026-01-01',p_settings=>settings,p_governance=>null);
    failed:=rejection->>'outcome'='rejected';
  exception when insufficient_privilege then failed:=true; end;
  assert failed, 'Actor changed between preflight and dispatch';
  first_receipt := public.save_budget_category_settings(auth.uid(),f.request_id,f.category_id,'2026-01-01','2026-01-01',settings,null);
  assert first_receipt->>'categoryId'=f.category_id::text, 'Missing confirmed category';
  assert (first_receipt->'changes'->>'budgetCents')::integer=20000, 'Missing confirmed amount';
  assert (select name='Saved together' from public.budget_categories where id=f.category_id), 'Name not saved';
  assert (select base_budget_cents=20000 and rollover_enabled and plan_role='protected' from public.budget_plans where category_id=f.category_id), 'Plan not saved atomically';
  replay := public.save_budget_category_settings(auth.uid(),f.request_id,f.category_id,'2026-01-01','2026-01-01',settings,null);
  assert replay=first_receipt, 'Replay did not return original receipt';
  assert (public.get_budget_category_settings_receipt(auth.uid(),f.request_id)-'request')=first_receipt, 'Lost-response recovery failed';
  assert public.get_budget_category_settings_receipt(auth.uid(),f.request_id)->'request'->>'requestId'=f.request_id::text, 'Original request unavailable for cross-device recovery';
  assert public.get_budget_category_settings_receipt(auth.uid(),f.request_id)->'request'->'settings'=settings, 'Original settings were not retained';
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),f.request_id,f.category_id,'2026-01-01','2026-01-01',settings||'{"name":"Different request"}',null);
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Request ID reused with different input';
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,'2026-01-01','2026-01-01',settings,null);
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '40001' then failed:=true; end;
  assert failed, 'Stale editor overwrote confirmed settings';
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,
      (first_receipt->>'categoryUpdatedAt')::timestamptz,(first_receipt->>'planUpdatedAt')::timestamptz,
      settings||'{"fundingRhythm":"reserve"}',null);
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Reserve funding accepted simultaneous monthly rollover';
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,
      (first_receipt->>'categoryUpdatedAt')::timestamptz,(first_receipt->>'planUpdatedAt')::timestamptz,
      settings||'{"owner_user_id":"spoofed"}',null);
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Unknown input was silently ignored';
  foreach actor in array array[f.child_id,f.other_id,null::uuid] loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'is_anonymous',false)::text,true);
    failed:=false;
    begin
      rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,'2026-01-01','2026-01-01',settings,null);
    failed:=rejection->>'outcome'='rejected';
    exception when insufficient_privilege then failed:=true; end;
    assert failed, 'Unauthorized actor could save';
  end loop;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',true)::text,true);
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,'2026-01-01','2026-01-01',settings,null);
    failed:=rejection->>'outcome'='rejected';
  exception when insufficient_privilege then failed:=true; end;
  assert failed, 'Anonymous account could save';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.adult_id,'is_anonymous',false)::text,true);
  replay := public.save_budget_category_settings(auth.uid(),f.adult_request_id,f.category_id,
    (first_receipt->>'categoryUpdatedAt')::timestamptz,(first_receipt->>'planUpdatedAt')::timestamptz,settings||'{"name":"Adult saved"}',null);
  assert replay->'changes'->>'name'='Adult saved', 'Canonical caregiver could not save';
  assert public.get_budget_category_settings_receipt(auth.uid(),f.request_id) is null, 'Actor read another actor receipt';
end $$;
reset role;
insert into public.budget_living_plan_config(user_id,promotion_enabled) select owner_id,true from category_settings_fixture;
insert into public.budget_living_target_intents(user_id,living_percent,provenance) select owner_id,70,'settings' from category_settings_fixture;
set local role authenticated;
do $$
declare f record; settings jsonb; governance jsonb; category_version timestamptz; plan_version timestamptz;
  failed boolean; rejection jsonb; request_id uuid:=gen_random_uuid(); result jsonb;
begin
  select * into f from category_settings_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.adult_id,'is_anonymous',false)::text,true);
  select updated_at into category_version from public.budget_categories where id=f.category_id;
  select updated_at into plan_version from public.budget_plans where category_id=f.category_id;
  settings:='{"name":"Governed atomic","budgetCents":30000,"fundingRhythm":"monthly","rolloverEnabled":false,"rolloverPolicy":null,"planRole":"flexible","expectedNeedCents":null,"expectedNeedDueMonth":null}';
  governance:=jsonb_build_object('expectedActiveVersionId',null,'candidate',jsonb_build_object(
    'periodId',to_char(current_date,'YYYY-MM'),'status','ready','livingPercent',70,'resourceBasisCents',100000,
    'targetCents',70000,'plannedCents',30000,'unassignedCents',40000,'overTargetCents',0,
    'candidateHash','atomic-'||f.category_id,'evidenceHash','fixture-evidence','allocatorVersion','living-plan-v2'),
    'components',jsonb_build_array(jsonb_build_object('categoryId','legacy-atomic-settings','amountCents',30000,
      'fundingRhythm','monthly','source','override','overrideCents',30000)),
    'receipt',jsonb_build_object('trigger','category_changed','outcome','invalid-late-failure','cause','Regression'));
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),request_id,f.category_id,category_version,plan_version,settings,governance);
    failed:=rejection->>'outcome'='rejected';
  exception when check_violation then failed:=true; end;
  assert failed and rejection->>'code'='23514', 'Late governance failure was not exercised';
  assert (select name='Adult saved' from public.budget_categories where id=f.category_id), 'Name survived a failed transaction';
  assert (select base_budget_cents=20000 and rollover_enabled and plan_role='protected' from public.budget_plans where category_id=f.category_id), 'Partial plan persisted';
  assert public.get_budget_category_settings_receipt(auth.uid(),request_id)->>'outcome'='rejected', 'Failed command outcome was not retained';
  assert public.save_budget_category_settings(auth.uid(),request_id,f.category_id,category_version,plan_version,settings,governance)->>'outcome'='rejected', 'Rejected request became a new write';
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,category_version,plan_version,settings,null);
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Governed change bypassed preview';
  -- The reviewed amount and active version must both still match.
  governance:=jsonb_set(governance,'{receipt,outcome}','"material"');
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,category_version,plan_version,
      settings,jsonb_set(governance,'{components,0,amountCents}','31000'));
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Mismatched reviewed allocation was accepted';
  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,category_version,plan_version,
      settings,jsonb_set(governance,'{expectedActiveVersionId}',to_jsonb(gen_random_uuid())));
    failed:=rejection->>'outcome'='rejected';
  exception when raise_exception then
    if sqlerrm='active living plan changed' then failed:=true; else raise; end if;
  end;
  assert failed, 'Stale active version was accepted';

  failed:=false;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,category_version,plan_version,settings,
      jsonb_set(jsonb_set(jsonb_set(governance,'{components}',(governance->'components')||
        '[{"categoryId":"atomic-settings","amountCents":7000,"fundingRhythm":"monthly","source":"override"}]'),
        '{candidate,plannedCents}','37000'),'{candidate,unassignedCents}','33000'));
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Two aliases for one category bypassed the reviewed amount';
  request_id:=gen_random_uuid(); -- A corrected review is a new command.
  result:=public.save_budget_category_settings(auth.uid(),request_id,f.category_id,category_version,plan_version,settings,governance);
  assert result->>'activeVersionId' is not null, 'Governed version missing';
  assert (select base_budget_cents=30000 and not rollover_enabled and plan_role='flexible' from public.budget_plans where category_id=f.category_id), 'Governed values differ from settings';
  assert public.save_budget_category_settings(auth.uid(),request_id,f.category_id,category_version,plan_version,settings,governance)=result, 'Governed replay differs';
end $$;
reset role;
update public.budget_living_plan_config set promotion_enabled=false where user_id=(select owner_id from category_settings_fixture);
set local role authenticated;
do $$
declare f record; failed boolean:=false; rejection jsonb; category_version timestamptz; plan_version timestamptz;
begin
  select * into f from category_settings_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.owner_id,'is_anonymous',false)::text,true);
  select updated_at into category_version from public.budget_categories where id=f.category_id;
  select updated_at into plan_version from public.budget_plans where category_id=f.category_id;
  begin
    rejection := public.save_budget_category_settings(auth.uid(),gen_random_uuid(),f.category_id,category_version,plan_version,
      '{"name":"Cannot bypass active plan","budgetCents":40000,"fundingRhythm":"monthly","rolloverEnabled":false,"rolloverPolicy":null,"planRole":"flexible","expectedNeedCents":null,"expectedNeedDueMonth":null}',null);
    failed:=rejection->>'outcome'='rejected';
  exception when sqlstate '22023' then failed:=true; end;
  assert failed, 'Disabled promotion allowed settings that the active plan would overwrite';
end $$;
reset role;
do $$
declare f record;
begin
  select * into f from category_settings_fixture;
  assert (select count(*)=1 from public.budget_living_plan_versions where user_id=f.owner_id), 'Failed/replayed command created extra versions';
  assert (select count(*)=1 from public.budget_living_plan_overrides where user_id=f.owner_id), 'Canonical override missing';
  assert (select count(*)=3 from private.budget_category_settings_receipts where owner_user_id=f.owner_id and receipt->>'outcome' is null), 'Success receipt count differs';
  assert not has_table_privilege('authenticated','private.budget_category_settings_receipts','SELECT'), 'Receipts exposed directly';
  assert not has_table_privilege('anon','private.budget_category_settings_receipts','SELECT'), 'Anonymous receipt access';
  assert not has_function_privilege('anon','public.save_budget_category_settings(uuid,uuid,uuid,timestamptz,timestamptz,jsonb,jsonb)','EXECUTE'), 'Anonymous RPC access';
end $$;
update public.kwilt_household_memberships set status='removed' where person_id=(select adult_id from category_settings_fixture);
set local role authenticated;
do $$
declare f record;
begin
  select * into f from category_settings_fixture;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',f.adult_id,'is_anonymous',false)::text,true);
  assert public.get_budget_category_settings_receipt(auth.uid(),f.adult_request_id) is null, 'Revoked caregiver recovered household receipt';
end $$;
reset role;
rollback;
select 'Atomic settings, rollback, replay, governance, and actor boundaries passed' as result;

-- One category settings command, including governed allocation, with durable recovery.
-- SECURITY DEFINER is required for the RPC-only receipt store and canonical owner
-- governed tables. Every entry point checks current actor/owner authority first.
create schema if not exists private;
create table private.budget_category_settings_receipts (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  request jsonb not null,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor_user_id,request_id)
);
alter table private.budget_category_settings_receipts enable row level security;
revoke all on table private.budget_category_settings_receipts from public,anon,authenticated,service_role;

-- Share the existing promotion implementation; the public API retains its actor
-- ownership convention. The new settings RPC supplies the verified household owner.
create or replace function private.promote_budget_living_plan_for_owner(
  p_owner_id uuid,
  expected_active_version_id uuid,
  candidate jsonb,
  components jsonb,
  receipt jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := p_owner_id;
  current_id uuid;
  new_id uuid;
  component_total bigint;
begin
  if auth.uid() is null or owner_id is null
    or (owner_id is distinct from auth.uid() and owner_id is distinct from public.budget_effective_owner_user_id())
  then raise exception 'Money owner authority is required.' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('budget-plan:'||owner_id::text,0));
  if not coalesce((
    select config.promotion_enabled
    from public.budget_living_plan_config config
    where config.user_id = owner_id
  ), false) then raise exception 'living plan promotion disabled'; end if;

  select active.plan_version_id into current_id
  from public.budget_active_living_plans active
  where active.user_id = owner_id
  for update;
  if current_id is distinct from expected_active_version_id then raise exception 'active living plan changed'; end if;
  if candidate->>'status' in ('blocked', 'missing_resource') then raise exception 'candidate cannot promote'; end if;
  if nullif(candidate->>'candidateHash', '') is null
    or nullif(candidate->>'evidenceHash', '') is null
    or nullif(candidate->>'allocatorVersion', '') is null
  then raise exception 'candidate provenance missing'; end if;
  if (candidate->>'livingPercent')::integer not between 50 and 100
    or (candidate->>'livingPercent')::integer % 5 <> 0
  then raise exception 'invalid living target'; end if;
  if (candidate->>'targetCents')::bigint <> round(
    (candidate->>'resourceBasisCents')::numeric * (candidate->>'livingPercent')::integer / 100.0
  ) then raise exception 'target math mismatch'; end if;

  select coalesce(sum((row->>'amountCents')::bigint), 0)
  into component_total
  from jsonb_array_elements(components) row;
  if component_total <> (candidate->>'plannedCents')::bigint then raise exception 'component total mismatch'; end if;
  if greatest(0, (candidate->>'plannedCents')::bigint - (candidate->>'targetCents')::bigint)
    <> (candidate->>'overTargetCents')::bigint
  then raise exception 'over-target mismatch'; end if;
  if greatest(0, (candidate->>'targetCents')::bigint - (candidate->>'plannedCents')::bigint)
    <> (candidate->>'unassignedCents')::bigint
  then raise exception 'unassigned mismatch'; end if;

  insert into public.budget_living_plan_versions (
    user_id, period_id, predecessor_version_id, living_percent, resource_basis_cents,
    target_cents, planned_cents, unassigned_cents, over_target_cents, status,
    evidence_hash, candidate_hash, allocator_version
  ) values (
    owner_id, candidate->>'periodId', current_id, (candidate->>'livingPercent')::integer,
    (candidate->>'resourceBasisCents')::bigint, (candidate->>'targetCents')::bigint,
    (candidate->>'plannedCents')::bigint, (candidate->>'unassignedCents')::bigint,
    (candidate->>'overTargetCents')::bigint, candidate->>'status', candidate->>'evidenceHash',
    candidate->>'candidateHash', candidate->>'allocatorVersion'
  ) returning id into new_id;

  insert into public.budget_living_plan_components (
    plan_version_id, user_id, category_id, amount_cents, fixed_cents, override_cents,
    flexible_cents, exposure_cents, source, funding_rhythm, prior_reserve_cents,
    expected_need_cents, expected_need_due_month
  )
  select
    new_id, owner_id, row->>'categoryId', (row->>'amountCents')::bigint,
    coalesce((row->>'fixedCents')::bigint, 0), coalesce((row->>'overrideCents')::bigint, 0),
    coalesce((row->>'flexibleCents')::bigint, 0), coalesce((row->>'exposureCents')::bigint, 0),
    row->>'source', case when row->>'fundingRhythm' = 'reserve' then 'reserve' else 'monthly' end,
    coalesce((row->>'priorReserveCents')::integer, 0),
    nullif(row->'expectedNeed'->>'amountCents', '')::integer,
    nullif(row->'expectedNeed'->>'dueMonth', '')
  from jsonb_array_elements(components) row;

  insert into public.budget_living_plan_receipts (
    user_id, plan_version_id, prior_version_id, trigger, outcome, cause,
    changed_category_ids, material_reasons
  ) values (
    owner_id, new_id, current_id, receipt->>'trigger', receipt->>'outcome', receipt->>'cause',
    coalesce(receipt->'changedCategoryIds', '[]'::jsonb),
    coalesce(receipt->'materialReasons', '[]'::jsonb)
  );
  insert into public.budget_active_living_plans (user_id, plan_version_id)
  values (owner_id, new_id)
  on conflict (user_id) do update
  set plan_version_id = excluded.plan_version_id,
      updated_at = now();
  return new_id;
end;
$$;
revoke all on function private.promote_budget_living_plan_for_owner(uuid,uuid,jsonb,jsonb,jsonb)
  from public,anon,authenticated,service_role;
create or replace function public.promote_budget_living_plan(
  expected_active_version_id uuid,candidate jsonb,components jsonb,receipt jsonb
) returns uuid language sql security definer set search_path='' as $$
  select private.promote_budget_living_plan_for_owner(auth.uid(),expected_active_version_id,candidate,components,receipt);
$$;
revoke all on function public.promote_budget_living_plan(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.promote_budget_living_plan(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Older clients take the owner lock before touching plan rows too, avoiding
-- inverse lock order with the new command and the active-plan projection trigger.
create or replace function public.apply_governed_category_plan_change(
  p_plan_category_id uuid,
  p_allocation_category_id text,
  p_budget_cents integer,
  p_funding_rhythm text,
  p_expected_need_cents integer,
  p_expected_need_due_month text,
  expected_active_version_id uuid,
  candidate jsonb,
  components jsonb,
  receipt jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_version_id text;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = '42501';
  end if;
  if p_budget_cents < 0 or p_funding_rhythm not in ('monthly', 'reserve') then
    raise exception 'Invalid governed category plan change.' using errcode = '22023';
  end if;
  if (p_expected_need_cents is null) <> (p_expected_need_due_month is null) then
    raise exception 'Expected need amount and due month must be saved together.' using errcode = '22023';
  end if;
  if p_expected_need_cents is not null and (
    p_funding_rhythm <> 'reserve'
    or p_expected_need_cents <= 0
    or p_expected_need_due_month !~ '^\d{4}-(0[1-9]|1[0-2])$'
  ) then
    raise exception 'Invalid reserve expected need.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('budget-plan:'||v_user_id::text,0));

  update public.budget_plans plan
  set base_budget_cents = p_budget_cents,
      funding_rhythm = p_funding_rhythm,
      funding_policy_version = 'category-funding-v1',
      rollover_enabled = case when p_funding_rhythm = 'reserve' then false else plan.rollover_enabled end,
      expected_need_cents = case when p_funding_rhythm = 'reserve' then p_expected_need_cents else null end,
      expected_need_due_month = case when p_funding_rhythm = 'reserve' then p_expected_need_due_month else null end,
      updated_at = now()
  where plan.category_id = p_plan_category_id
    and plan.user_id = v_user_id
    and plan.status = 'active';
  if not found then
    raise exception 'The governed category plan is unavailable.' using errcode = 'P0002';
  end if;

  insert into public.budget_living_plan_overrides (
    user_id, category_id, amount_cents, active, updated_at
  ) values (
    v_user_id, trim(p_allocation_category_id), p_budget_cents, true, now()
  )
  on conflict (user_id, category_id) do update
  set amount_cents = excluded.amount_cents,
      active = true,
      updated_at = excluded.updated_at;

  select public.promote_budget_living_plan(
    expected_active_version_id,
    candidate,
    components,
    receipt
  )::text into v_version_id;

  delete from public.budget_held_living_plan_candidates held
  where held.user_id = v_user_id;

  return v_version_id;
end;
$$;

create or replace function public.save_budget_category_settings(
  p_expected_actor_user_id uuid, p_request_id uuid, p_category_id uuid,
  p_expected_category_updated_at timestamptz, p_expected_plan_updated_at timestamptz,
  p_settings jsonb, p_governance jsonb default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid:=auth.uid(); owner_id uuid:=public.budget_effective_owner_user_id();
  category public.budget_categories%rowtype; plan public.budget_plans%rowtype;
  saved private.budget_category_settings_receipts%rowtype;
  request_body jsonb; result jsonb; allocation jsonb; allocation_key text;
  amount integer; rhythm text; need integer; due_month text; policy jsonb;
  allocation_changed boolean; governed boolean; version_id uuid;
begin
  if actor_id is null or owner_id is null or actor_id is distinct from p_expected_actor_user_id then
    raise exception 'An authorized household adult is required.' using errcode='42501';
  end if;
  if p_request_id is null or p_category_id is null
    or p_expected_category_updated_at is null or p_expected_plan_updated_at is null then
    raise exception 'Request identity and category versions are required.' using errcode='22023';
  end if;
  request_body:=jsonb_build_object('categoryId',p_category_id,'categoryVersion',p_expected_category_updated_at,
    'planVersion',p_expected_plan_updated_at,'settings',p_settings,'governance',p_governance);
  -- Serialize duplicate requests even if a caller reuses the ID for another category.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('budget-settings-request:'||actor_id::text||':'||p_request_id::text,0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('budget-plan:'||owner_id::text,0));
  select * into saved from private.budget_category_settings_receipts
    where actor_user_id=actor_id and request_id=p_request_id;
  if found then
    if saved.owner_user_id<>owner_id then raise exception 'Receipt is no longer accessible.' using errcode='42501'; end if;
    if saved.request is distinct from request_body then raise exception 'This request ID already belongs to different settings.' using errcode='22023'; end if;
    return saved.receipt;
  end if;
  select * into category from public.budget_categories
    where id=p_category_id and user_id=owner_id and status='active' for update;
  if not found then raise exception 'Category is not available to this household.' using errcode='42501'; end if;
  select * into plan from public.budget_plans
    where category_id=p_category_id and user_id=owner_id and status='active' for update;
  if not found then raise exception 'Category plan is unavailable.' using errcode='42501'; end if;
  -- Roll back every setting on rejection, but durably record its outcome. A late
  -- duplicate must never turn an already rejected request into a new write.
  begin
  if category.updated_at is distinct from p_expected_category_updated_at
    or plan.updated_at is distinct from p_expected_plan_updated_at then
    raise exception 'The category changed since you reviewed it. Reopen settings and review your change.' using errcode='40001';
  end if;
  if jsonb_typeof(p_settings) is distinct from 'object'
    or not (p_settings ?& array['name','budgetCents','fundingRhythm','rolloverEnabled','rolloverPolicy','planRole','expectedNeedCents','expectedNeedDueMonth'])
    or (p_settings - array['name','budgetCents','fundingRhythm','rolloverEnabled','rolloverPolicy','planRole','expectedNeedCents','expectedNeedDueMonth'])<>'{}'::jsonb
    or jsonb_typeof(p_settings->'name') is distinct from 'string'
    or length(trim(p_settings->>'name'))=0
    or jsonb_typeof(p_settings->'budgetCents') is distinct from 'number'
    or (p_settings->>'budgetCents')::numeric not between 0 and 1000000000
    or trunc((p_settings->>'budgetCents')::numeric)<>(p_settings->>'budgetCents')::numeric
    or coalesce(p_settings->>'fundingRhythm','') not in ('monthly','reserve')
    or coalesce(p_settings->>'planRole','') not in ('protected','flexible')
    or jsonb_typeof(p_settings->'rolloverEnabled') is distinct from 'boolean' then
    raise exception 'Invalid category settings.' using errcode='22023';
  end if;
  amount:=(p_settings->>'budgetCents')::integer;
  rhythm:=p_settings->>'fundingRhythm';
  policy:=nullif(p_settings->'rolloverPolicy','null'::jsonb);
  if not public.valid_budget_rollover_policy(policy) then raise exception 'Invalid rollover policy.' using errcode='22023'; end if;
  if rhythm='reserve' and (p_settings->>'rolloverEnabled')::boolean then
    raise exception 'Reserve funding cannot also enable monthly rollover.' using errcode='22023';
  end if;
  if (p_settings->>'expectedNeedCents' is null)<>(p_settings->>'expectedNeedDueMonth' is null) then
    raise exception 'Expected need amount and due month must be saved together.' using errcode='22023';
  end if;
  if p_settings->>'expectedNeedCents' is not null then
    if rhythm<>'reserve' or jsonb_typeof(p_settings->'expectedNeedCents') is distinct from 'number'
      or (p_settings->>'expectedNeedCents')::numeric not between 1 and 1000000000
      or trunc((p_settings->>'expectedNeedCents')::numeric)<>(p_settings->>'expectedNeedCents')::numeric
      or jsonb_typeof(p_settings->'expectedNeedDueMonth') is distinct from 'string'
      or (p_settings->>'expectedNeedDueMonth')!~ '^\d{4}-(0[1-9]|1[0-2])$' then
      raise exception 'Invalid reserve expected need.' using errcode='22023';
    end if;
    need:=(p_settings->>'expectedNeedCents')::integer; due_month:=p_settings->>'expectedNeedDueMonth';
  end if;
  allocation_changed:=plan.base_budget_cents is distinct from amount or plan.funding_rhythm is distinct from rhythm
    or plan.expected_need_cents is distinct from need or plan.expected_need_due_month is distinct from due_month;
  governed:=coalesce((select promotion_enabled from public.budget_living_plan_config where user_id=owner_id),false)
    and exists(select 1 from public.budget_living_target_intents where user_id=owner_id);
  if allocation_changed and not governed
    and exists(select 1 from public.budget_active_living_plans where user_id=owner_id) then
    raise exception 'The active Money plan must be available for review before changing this amount.' using errcode='22023';
  end if;
  if allocation_changed and governed and p_governance is null then
    raise exception 'A reviewed governed plan is required for this change.' using errcode='22023';
  end if;
  if p_governance is not null then
    if not governed or jsonb_typeof(p_governance) is distinct from 'object'
      or not (p_governance ?& array['candidate','components','receipt','expectedActiveVersionId'])
      or jsonb_typeof(p_governance->'components') is distinct from 'array' then
      raise exception 'Invalid governed plan review.' using errcode='22023';
    end if;
    -- Projection accepts legacy IDs and slugs. Resolve all aliases before writing
    -- so UPDATE ... FROM can never choose between two components for one category.
    if exists (
      select 1 from jsonb_array_elements(p_governance->'components') c
      where (select count(*) from public.budget_categories target
        where target.user_id=owner_id and target.status='active'
          and (target.legacy_budget_id=c->>'categoryId' or target.slug=c->>'categoryId'))<>1
    ) or exists (
      select target.id from public.budget_categories target
      join jsonb_array_elements(p_governance->'components') c
        on target.legacy_budget_id=c->>'categoryId' or target.slug=c->>'categoryId'
      where target.user_id=owner_id and target.status='active'
      group by target.id having count(*)<>1
    ) then raise exception 'Reviewed plan has missing or ambiguous category identities.' using errcode='22023'; end if;
    allocation_key:=coalesce(nullif(category.legacy_budget_id,''),category.slug);
    if (select count(*) from jsonb_array_elements(p_governance->'components') c where c->>'categoryId'=allocation_key)<>1 then
      raise exception 'Reviewed plan must contain the category once.' using errcode='22023';
    end if;
    select c into allocation from jsonb_array_elements(p_governance->'components') c where c->>'categoryId'=allocation_key;
    if (allocation->>'amountCents')::numeric is distinct from amount::numeric
      or allocation->>'fundingRhythm' is distinct from rhythm
      or (allocation->'expectedNeed'->>'amountCents')::numeric is distinct from need::numeric
      or allocation->'expectedNeed'->>'dueMonth' is distinct from due_month then
      raise exception 'Settings no longer match the reviewed plan.' using errcode='22023';
    end if;
  end if;
  update public.budget_categories set name=trim(p_settings->>'name') where id=p_category_id;
  update public.budget_plans set base_budget_cents=amount,funding_rhythm=rhythm,
    funding_policy_version='category-funding-v1',expected_need_cents=need,expected_need_due_month=due_month,
    rollover_enabled=(p_settings->>'rolloverEnabled')::boolean,rollover_policy=policy,plan_role=p_settings->>'planRole'
    where id=plan.id;
  if p_governance is not null then
    insert into public.budget_living_plan_overrides(user_id,category_id,amount_cents,active,updated_at)
      values(owner_id,allocation_key,amount,true,now())
      on conflict(user_id,category_id) do update set amount_cents=excluded.amount_cents,active=true,updated_at=excluded.updated_at;
    version_id:=private.promote_budget_living_plan_for_owner(owner_id,
      (p_governance->>'expectedActiveVersionId')::uuid,p_governance->'candidate',p_governance->'components',p_governance->'receipt');
    delete from public.budget_held_living_plan_candidates where user_id=owner_id;
  else
    select plan_version_id into version_id from public.budget_active_living_plans where user_id=owner_id;
  end if;
  -- Read trigger-normalized values after promotion, never echo an unpersisted draft.
  select * into category from public.budget_categories where id=p_category_id;
  select * into plan from public.budget_plans where id=plan.id;
  result:=jsonb_build_object('requestId',p_request_id,'categoryId',p_category_id,'confirmedAt',now(),
    'categoryUpdatedAt',category.updated_at,'planUpdatedAt',plan.updated_at,'activeVersionId',version_id,
    'changes',jsonb_build_object('name',category.name,'budgetCents',plan.base_budget_cents,'fundingRhythm',plan.funding_rhythm,
      'rolloverEnabled',plan.rollover_enabled,'rolloverPolicy',plan.rollover_policy,'planRole',plan.plan_role,
      'expectedNeedCents',plan.expected_need_cents,'expectedNeedDueMonth',plan.expected_need_due_month));
  exception when sqlstate '22023' or check_violation or raise_exception or serialization_failure then
    result:=jsonb_build_object('outcome','rejected','requestId',p_request_id,'categoryId',p_category_id,
      'code',sqlstate,'message',sqlerrm);
  end;
  insert into private.budget_category_settings_receipts(actor_user_id,request_id,owner_user_id,category_id,request,receipt)
    values(actor_id,p_request_id,owner_id,p_category_id,request_body,result);
  return result;
end;
$$;
revoke all on function public.save_budget_category_settings(uuid,uuid,uuid,timestamptz,timestamptz,jsonb,jsonb) from public,anon,service_role;
grant execute on function public.save_budget_category_settings(uuid,uuid,uuid,timestamptz,timestamptz,jsonb,jsonb) to authenticated;

create or replace function public.get_budget_category_settings_receipt(p_expected_actor_user_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=public.budget_effective_owner_user_id(); result jsonb;
begin
  if auth.uid() is null or owner_id is null or auth.uid() is distinct from p_expected_actor_user_id then
    raise exception 'An authorized household adult is required.' using errcode='42501';
  end if;
  select receipt || jsonb_build_object('request',jsonb_build_object(
    'schemaVersion',1,'actorUserId',actor_user_id,'requestId',request_id,'categoryId',category_id,
    'expectedCategoryUpdatedAt',request->'categoryVersion','expectedPlanUpdatedAt',request->'planVersion',
    'settings',request->'settings','governance',request->'governance'))
  into result from private.budget_category_settings_receipts
    where actor_user_id=auth.uid() and request_id=p_request_id and owner_user_id=owner_id;
  return result;
end;
$$;
revoke all on function public.get_budget_category_settings_receipt(uuid,uuid) from public,anon,service_role;
grant execute on function public.get_budget_category_settings_receipt(uuid,uuid) to authenticated;

-- Reversal must use the same lock order before its projection trigger updates plans.
create or replace function public.reverse_budget_living_plan(expected_active_version_id uuid, restore_version_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); current_id uuid; restored public.budget_living_plan_versions%rowtype; new_id uuid;
begin
  if owner_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('budget-plan:'||owner_id::text,0));
  select plan_version_id into current_id from public.budget_active_living_plans where user_id = owner_id for update;
  if current_id is distinct from expected_active_version_id then raise exception 'active living plan changed'; end if;
  select * into restored from public.budget_living_plan_versions where id = restore_version_id and user_id = owner_id;
  if restored.id is null then raise exception 'restore version unavailable'; end if;
  insert into public.budget_living_plan_versions (user_id, period_id, predecessor_version_id, reversal_of_version_id, living_percent, resource_basis_cents, target_cents, planned_cents, unassigned_cents, over_target_cents, status, evidence_hash, candidate_hash, allocator_version)
  values (owner_id, restored.period_id, current_id, current_id, restored.living_percent, restored.resource_basis_cents, restored.target_cents, restored.planned_cents, restored.unassigned_cents, restored.over_target_cents, restored.status, restored.evidence_hash, restored.candidate_hash || '-reversal-' || current_id, restored.allocator_version) returning id into new_id;
  insert into public.budget_living_plan_components (plan_version_id, user_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source)
  select new_id, owner_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source from public.budget_living_plan_components where plan_version_id = restore_version_id;
  insert into public.budget_living_plan_receipts (user_id, plan_version_id, prior_version_id, trigger, outcome, cause, changed_category_ids, material_reasons)
  values (owner_id, new_id, current_id, 'user_reversal', 'reversal', 'Returned your monthly budgets to the version before the last update.', '[]', '["reversal"]');
  update public.budget_active_living_plans set plan_version_id = new_id, updated_at = now() where user_id = owner_id;
  return new_id;
end; $$;

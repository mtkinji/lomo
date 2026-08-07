-- Groceries-owned thrift evidence. Money remains authoritative for category budgets.

create table public.kwilt_food_cycle_constraints (
  id uuid primary key default gen_random_uuid(), owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  cycle_ref text not null check (char_length(btrim(cycle_ref)) between 1 and 160), target_cents bigint not null check (target_cents>=0),
  money_envelope jsonb check (money_envelope is null or jsonb_typeof(money_envelope)='object'), state text not null default 'active' check(state in ('active','superseded','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.kwilt_food_stock_observations (
  id uuid primary key default gen_random_uuid(), owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  concept text not null check(char_length(btrim(concept)) between 1 and 320), state text not null check(state in ('confirmed','likely','check_first','depleted')),
  quantity_min numeric check(quantity_min is null or quantity_min>=0), quantity_max numeric check(quantity_max is null or quantity_max>=quantity_min), unit text,
  source text not null check(source in ('already_have','manual','voice','photo','receipt','order')), confidence numeric not null check(confidence between 0 and 1),
  observed_at timestamptz not null, expires_at timestamptz, supersedes_observation_id uuid references public.kwilt_food_stock_observations(id) on delete restrict,
  corrected_at timestamptz, created_at timestamptz not null default now(), check(source not in ('receipt','order') or state<>'confirmed')
);
create index kwilt_food_stock_owner_concept_idx on public.kwilt_food_stock_observations(owner_person_id,concept,observed_at desc);
alter table public.kwilt_food_cycle_constraints enable row level security; alter table public.kwilt_food_stock_observations enable row level security;
create policy kwilt_food_cycle_owner_read on public.kwilt_food_cycle_constraints for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_food_stock_owner_read on public.kwilt_food_stock_observations for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
grant select on public.kwilt_food_cycle_constraints,public.kwilt_food_stock_observations to authenticated;
revoke insert,update,delete on public.kwilt_food_cycle_constraints,public.kwilt_food_stock_observations from public,anon,authenticated;

create or replace function public.set_kwilt_food_cycle_constraint(p_cycle_ref text,p_target_cents bigint,p_money_envelope jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id();v_row public.kwilt_food_cycle_constraints;
begin perform public.kwilt_require_permanent_user();if v_person is null or char_length(btrim(coalesce(p_cycle_ref,''))) not between 1 and 160 or p_target_cents<0 or (p_money_envelope is not null and jsonb_typeof(p_money_envelope)<>'object') then raise exception 'invalid_food_cycle_constraint';end if;update public.kwilt_food_cycle_constraints set state='superseded',updated_at=now() where owner_person_id=v_person and cycle_ref=btrim(p_cycle_ref) and state='active';insert into public.kwilt_food_cycle_constraints(owner_person_id,cycle_ref,target_cents,money_envelope)values(v_person,btrim(p_cycle_ref),p_target_cents,p_money_envelope)returning*into v_row;return jsonb_build_object('constraintId',v_row.id,'targetCents',v_row.target_cents,'state',v_row.state);end;$$;
revoke execute on function public.set_kwilt_food_cycle_constraint(text,bigint,jsonb) from public,anon;grant execute on function public.set_kwilt_food_cycle_constraint(text,bigint,jsonb) to authenticated;

create or replace function public.observe_kwilt_food_stock(p_observation jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_previous public.kwilt_food_stock_observations; v_row public.kwilt_food_stock_observations;
begin
  perform public.kwilt_require_permanent_user(); if v_person is null or jsonb_typeof(p_observation)<>'object' then raise exception 'invalid_food_stock_observation'; end if;
  if p_observation->>'state' not in ('confirmed','likely','check_first','depleted') or p_observation->>'source' not in ('already_have','manual','voice','photo','receipt','order') then raise exception 'invalid_food_stock_observation'; end if;
  if p_observation->>'source' in ('receipt','order') and p_observation->>'state'='confirmed' then raise exception 'purchase_evidence_not_confirmed_stock'; end if;
  if nullif(p_observation->>'supersedesObservationId','') is not null then select * into v_previous from public.kwilt_food_stock_observations where id=(p_observation->>'supersedesObservationId')::uuid for update; if v_previous.id is null or v_previous.owner_person_id<>v_person then raise exception 'food_stock_observation_not_owned'; end if; update public.kwilt_food_stock_observations set corrected_at=now() where id=v_previous.id; end if;
  insert into public.kwilt_food_stock_observations(owner_person_id,concept,state,quantity_min,quantity_max,unit,source,confidence,observed_at,expires_at,supersedes_observation_id)
  values(v_person,btrim(p_observation->>'concept'),p_observation->>'state',nullif(p_observation->>'quantityMin','')::numeric,nullif(p_observation->>'quantityMax','')::numeric,nullif(btrim(p_observation->>'unit'),''),p_observation->>'source',(p_observation->>'confidence')::numeric,(p_observation->>'observedAt')::timestamptz,nullif(p_observation->>'expiresAt','')::timestamptz,v_previous.id) returning * into v_row;
  return jsonb_build_object('observationId',v_row.id,'state',v_row.state,'observedAt',v_row.observed_at);
end; $$;
revoke execute on function public.observe_kwilt_food_stock(jsonb) from public,anon; grant execute on function public.observe_kwilt_food_stock(jsonb) to authenticated;

create table public.kwilt_store_opportunities (
  id uuid primary key default gen_random_uuid(), owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  concept text not null, evidence_method text not null check(evidence_method in ('provider','barcode','photo','url','voice','manual')), provider text, barcode text, artifact_ref text, source_url text, transcript text,
  retailer text not null, location_id text, package_quantity numeric not null check(package_quantity>0), package_unit text not null,
  observed_price_cents bigint not null check(observed_price_cents>=0), comparable_unit_price_cents bigint not null check(comparable_unit_price_cents>=0), comparable_unit text not null,
  confidence numeric not null check(confidence between 0 and 1), observed_at timestamptz not null, expires_at timestamptz not null,
  state text not null default 'observed' check(state in ('observed','reviewed','accepted','rejected','expired')), created_at timestamptz not null default now()
);
create table public.kwilt_food_scenarios (
  id uuid primary key, owner_person_id uuid not null references public.kwilt_people(id) on delete restrict, version integer not null check(version>0),
  baseline jsonb not null check(jsonb_typeof(baseline)='object'), opportunity_ids uuid[] not null default '{}', constraint_ids uuid[] not null default '{}',
  meal_plan_diffs jsonb not null default '[]'::jsonb check(jsonb_typeof(meal_plan_diffs)='array'), grocery_diffs jsonb not null default '[]'::jsonb check(jsonb_typeof(grocery_diffs)='array'),
  estimate_range_cents jsonb not null check(jsonb_typeof(estimate_range_cents)='object'), current_price_coverage_percent numeric not null check(current_price_coverage_percent between 0 and 100),
  evidence_observed_at timestamptz not null, assumptions jsonb not null default '[]'::jsonb check(jsonb_typeof(assumptions)='array'), lifecycle text not null check(lifecycle in ('proposed','accepted','rejected','superseded','partially_applied')),
  content_hash text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.kwilt_food_scenario_applications (
  id uuid primary key default gen_random_uuid(), scenario_id uuid not null references public.kwilt_food_scenarios(id) on delete restrict,
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  scenario_version integer not null check(scenario_version>0), baseline jsonb not null check(jsonb_typeof(baseline)='object'),
  pending_meal_plan_diffs jsonb not null default '[]'::jsonb check(jsonb_typeof(pending_meal_plan_diffs)='array'),
  pending_grocery_diffs jsonb not null default '[]'::jsonb check(jsonb_typeof(pending_grocery_diffs)='array'),
  state text not null check(state in ('recovery_required','completed','abandoned')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(scenario_id,scenario_version)
);
create index kwilt_food_scenario_applications_owner_idx on public.kwilt_food_scenario_applications(owner_person_id,created_at desc);
alter table public.kwilt_store_opportunities enable row level security; alter table public.kwilt_food_scenarios enable row level security; alter table public.kwilt_food_scenario_applications enable row level security;
create policy kwilt_store_opportunities_owner_read on public.kwilt_store_opportunities for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_food_scenarios_owner_read on public.kwilt_food_scenarios for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_food_scenario_applications_owner_read on public.kwilt_food_scenario_applications for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
grant select on public.kwilt_store_opportunities,public.kwilt_food_scenarios,public.kwilt_food_scenario_applications to authenticated; revoke insert,update,delete on public.kwilt_store_opportunities,public.kwilt_food_scenarios,public.kwilt_food_scenario_applications from public,anon,authenticated;

create or replace function public.capture_kwilt_store_opportunity(p_opportunity jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_row public.kwilt_store_opportunities;
begin perform public.kwilt_require_permanent_user(); if v_person is null or (p_opportunity->>'confidence')::numeric<0 or (p_opportunity->>'confidence')::numeric>1 then raise exception 'invalid_store_opportunity'; end if;
insert into public.kwilt_store_opportunities(owner_person_id,concept,evidence_method,provider,barcode,artifact_ref,source_url,transcript,retailer,location_id,package_quantity,package_unit,observed_price_cents,comparable_unit_price_cents,comparable_unit,confidence,observed_at,expires_at)
values(v_person,btrim(p_opportunity->>'concept'),p_opportunity->>'evidenceMethod',p_opportunity->>'provider',p_opportunity->>'barcode',p_opportunity->>'artifactRef',p_opportunity->>'sourceUrl',p_opportunity->>'transcript',btrim(p_opportunity->>'retailer'),p_opportunity->>'locationId',(p_opportunity->>'packageQuantity')::numeric,p_opportunity->>'packageUnit',(p_opportunity->>'observedPriceCents')::bigint,(p_opportunity->>'comparableUnitPriceCents')::bigint,p_opportunity->>'comparableUnit',(p_opportunity->>'confidence')::numeric,(p_opportunity->>'observedAt')::timestamptz,(p_opportunity->>'expiresAt')::timestamptz) returning * into v_row;
return jsonb_build_object('opportunityId',v_row.id,'state',v_row.state); end; $$;

create or replace function public.propose_kwilt_food_scenario(p_scenario jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_id uuid:=(p_scenario->>'id')::uuid;
begin perform public.kwilt_require_permanent_user(); if (p_scenario->>'ownerPersonId')::uuid<>v_person or p_scenario->>'lifecycle'<>'proposed' then raise exception 'invalid_food_scenario'; end if;
insert into public.kwilt_food_scenarios(id,owner_person_id,version,baseline,opportunity_ids,constraint_ids,meal_plan_diffs,grocery_diffs,estimate_range_cents,current_price_coverage_percent,evidence_observed_at,assumptions,lifecycle,content_hash)
values(v_id,v_person,(p_scenario->>'version')::integer,p_scenario->'baseline',array(select jsonb_array_elements_text(p_scenario->'opportunityIds'))::uuid[],array(select jsonb_array_elements_text(p_scenario->'constraintIds'))::uuid[],p_scenario->'mealPlanDiffs',p_scenario->'groceryDiffs',p_scenario->'estimateRangeCents',(p_scenario->>'currentPriceCoveragePercent')::numeric,(p_scenario->>'evidenceObservedAt')::timestamptz,p_scenario->'assumptions','proposed',p_scenario->>'contentHash'); return jsonb_build_object('scenarioId',v_id,'version',1); end; $$;

create or replace function public.decide_kwilt_food_scenario(p_scenario_id uuid,p_expected_version integer,p_decision text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_row public.kwilt_food_scenarios; v_application_id uuid;
begin perform public.kwilt_require_permanent_user(); select * into v_row from public.kwilt_food_scenarios where id=p_scenario_id for update; if v_row.id is null or v_row.owner_person_id<>v_person then raise exception 'food_scenario_not_owned'; end if; if v_row.version<>p_expected_version or v_row.lifecycle<>'proposed' then raise exception 'stale_food_scenario'; end if; if p_decision not in ('accept','reject') then raise exception 'invalid_food_scenario_decision'; end if;
-- Cross-capability diffs remain review receipts until the version-checked owners apply them. Never silently half-apply.
if p_decision='accept' and jsonb_array_length(v_row.meal_plan_diffs)+jsonb_array_length(v_row.grocery_diffs)>0 then
  insert into public.kwilt_food_scenario_applications(scenario_id,owner_person_id,scenario_version,baseline,pending_meal_plan_diffs,pending_grocery_diffs,state)
  values(v_row.id,v_person,v_row.version,v_row.baseline,v_row.meal_plan_diffs,v_row.grocery_diffs,'recovery_required') returning id into v_application_id;
end if;
update public.kwilt_food_scenarios set lifecycle=case when p_decision='accept' and jsonb_array_length(meal_plan_diffs)+jsonb_array_length(grocery_diffs)>0 then 'partially_applied' when p_decision='accept' then 'accepted' else 'rejected' end,version=version+1,updated_at=now() where id=p_scenario_id returning * into v_row;
return jsonb_build_object('scenarioId',v_row.id,'version',v_row.version,'lifecycle',v_row.lifecycle,'recoveryRequired',v_row.lifecycle='partially_applied','applicationId',v_application_id); end; $$;

create or replace function public.record_kwilt_store_opportunity_purchase(p_opportunity_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_opportunity public.kwilt_store_opportunities; v_observation public.kwilt_food_stock_observations;
begin
  perform public.kwilt_require_permanent_user(); select * into v_opportunity from public.kwilt_store_opportunities where id=p_opportunity_id for update;
  if v_opportunity.id is null or v_opportunity.owner_person_id<>v_person then raise exception 'store_opportunity_not_owned'; end if;
  if v_opportunity.expires_at<=now() or v_opportunity.state in ('rejected','expired') then raise exception 'stale_store_opportunity'; end if;
  insert into public.kwilt_food_stock_observations(owner_person_id,concept,state,quantity_min,quantity_max,unit,source,confidence,observed_at,expires_at)
  values(v_person,v_opportunity.concept,'likely',v_opportunity.package_quantity,v_opportunity.package_quantity,v_opportunity.package_unit,'manual',0.8,now(),now()+interval '14 days') returning * into v_observation;
  update public.kwilt_store_opportunities set state='accepted' where id=p_opportunity_id;
  return jsonb_build_object('opportunityId',p_opportunity_id,'observationId',v_observation.id,'state',v_observation.state);
end; $$;
revoke execute on function public.capture_kwilt_store_opportunity(jsonb),public.propose_kwilt_food_scenario(jsonb),public.decide_kwilt_food_scenario(uuid,integer,text),public.record_kwilt_store_opportunity_purchase(uuid) from public,anon;
grant execute on function public.capture_kwilt_store_opportunity(jsonb),public.propose_kwilt_food_scenario(jsonb),public.decide_kwilt_food_scenario(uuid,integer,text),public.record_kwilt_store_opportunity_purchase(uuid) to authenticated;

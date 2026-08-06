-- Versioned Meal Planning authority. Household membership alone exposes no plan.

insert into public.kwilt_child_capability_catalog(capability_id, display_name, available_for_activation)
values ('meal-planning', 'Meal Planning', false)
on conflict (capability_id) do update set display_name = excluded.display_name;

alter table public.kwilt_shared_deliveries
  drop constraint if exists kwilt_shared_deliveries_event_kind_check,
  drop constraint if exists kwilt_shared_deliveries_source_capability_check,
  drop constraint if exists kwilt_shared_deliveries_source_entity_type_check,
  drop constraint if exists kwilt_shared_deliveries_destination_kind;
alter table public.kwilt_shared_deliveries
  add constraint kwilt_shared_deliveries_event_kind_check check (event_kind in ('goal_invitation','game_turn','goal_checkin','meal_choice_round')),
  add constraint kwilt_shared_deliveries_source_capability_check check (source_capability in ('goals','games','meal-planning')),
  add constraint kwilt_shared_deliveries_source_entity_type_check check (source_entity_type in ('goal_invite','game_session','goal_checkin','meal_choice_round')),
  add constraint kwilt_shared_deliveries_destination_kind check (
    (event_kind='goal_invitation' and source_capability='goals' and source_entity_type='goal_invite' and destination->>'kind'='goal_invite' and nullif(btrim(destination->>'inviteCode'),'') is not null)
    or (event_kind='game_turn' and source_capability='games' and source_entity_type='game_session' and destination->>'kind'='game_room' and nullif(btrim(destination->>'sessionId'),'') is not null)
    or (event_kind='goal_checkin' and source_capability='goals' and source_entity_type='goal_checkin' and state='available' and destination->>'kind'='goal' and nullif(btrim(destination->>'goalId'),'') is not null)
    or (event_kind='meal_choice_round' and source_capability='meal-planning' and source_entity_type='meal_choice_round' and destination->>'kind'='meal_choice' and nullif(btrim(destination->>'roundId'),'') is not null)
  );

create table public.kwilt_meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.kwilt_households(id) on delete restrict,
  organizer_membership_id uuid not null references public.kwilt_household_memberships(id) on delete restrict,
  organizer_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  state text not null default 'draft' check (state in ('draft','collecting_choices','ready_to_finalize','finalized','archived')),
  horizon jsonb not null check (jsonb_typeof(horizon) = 'object'),
  organizer_note text check (organizer_note is null or char_length(organizer_note) <= 2000),
  finalization_key text unique check (finalization_key is null or char_length(finalization_key) between 1 and 200),
  finalization_content_hash text check (finalization_content_hash is null or char_length(finalization_content_hash) between 1 and 256),
  finalized_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kwilt_meal_plan_candidates (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  position integer not null check (position >= 0),
  kind text not null check (kind in ('recipe','meal_note')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  recipe_snapshot jsonb check (recipe_snapshot is null or jsonb_typeof(recipe_snapshot) = 'object'),
  suggested_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(plan_id, position),
  check ((kind = 'recipe') = (recipe_snapshot is not null))
);

create table public.kwilt_meal_choice_rounds (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  state text not null default 'open' check (state in ('open','closed','cancelled')),
  rule text not null default 'pick_up_to' check (rule = 'pick_up_to'),
  selection_limit integer not null default 3 check (selection_limit = 3),
  suggestion_limit integer not null default 240 check (suggestion_limit between 0 and 240),
  opened_at timestamptz not null default now(),
  closes_at timestamptz,
  closed_at timestamptz,
  unique(plan_id, id)
);

create table public.kwilt_meal_choice_participants (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.kwilt_meal_choice_rounds(id) on delete cascade,
  membership_id uuid not null references public.kwilt_household_memberships(id) on delete restrict,
  person_id uuid not null references public.kwilt_people(id) on delete restrict,
  state text not null default 'invited' check (state in ('invited','responded','withdrawn','removed')),
  invited_at timestamptz not null default now(),
  settled_at timestamptz,
  unique(round_id, membership_id)
);

create table public.kwilt_meal_choice_candidates (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.kwilt_meal_choice_rounds(id) on delete cascade,
  candidate_id uuid not null,
  position integer not null check (position >= 0),
  kind text not null check (kind in ('recipe','meal_note')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  participant_snapshot jsonb,
  unique(round_id,candidate_id),
  unique(round_id,position)
);

create table public.kwilt_meal_choice_responses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.kwilt_meal_choice_rounds(id) on delete cascade,
  participant_id uuid not null unique references public.kwilt_meal_choice_participants(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  state text not null default 'submitted' check (state in ('draft','submitted','withdrawn')),
  selected_candidate_ids uuid[] not null default '{}',
  passed boolean not null default false,
  suggestion text check (suggestion is null or char_length(suggestion) <= 240),
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now(),
  check (cardinality(selected_candidate_ids) <= 3),
  check (not passed or cardinality(selected_candidate_ids) = 0)
);

create table public.kwilt_meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  plan_version integer not null check (plan_version > 0),
  position integer not null check (position >= 0),
  candidate_id uuid not null references public.kwilt_meal_plan_candidates(id) on delete restrict,
  kind text not null check (kind in ('recipe','meal_note')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  recipe_snapshot jsonb check (recipe_snapshot is null or jsonb_typeof(recipe_snapshot) = 'object'),
  servings numeric check (servings is null or servings > 0),
  placement_date date,
  finalized_at timestamptz not null default now(),
  unique(plan_id, plan_version, position)
);

create index kwilt_meal_plans_household_idx on public.kwilt_meal_plans(household_id, updated_at desc);
create index kwilt_meal_rounds_plan_idx on public.kwilt_meal_choice_rounds(plan_id, opened_at desc);
create index kwilt_meal_participants_person_idx on public.kwilt_meal_choice_participants(person_id, invited_at desc);

create or replace function public.kwilt_is_meal_plan_organizer(p_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.kwilt_meal_plans plan
    join public.kwilt_household_memberships membership on membership.id = plan.organizer_membership_id
    join public.kwilt_person_auth_bindings binding on binding.person_id = membership.person_id and binding.status = 'active'
    where plan.id = p_plan_id and membership.status = 'active' and binding.user_id = auth.uid()
      and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
  )
$$;

alter table public.kwilt_meal_plans enable row level security;
alter table public.kwilt_meal_plan_candidates enable row level security;
alter table public.kwilt_meal_choice_rounds enable row level security;
alter table public.kwilt_meal_choice_participants enable row level security;
alter table public.kwilt_meal_choice_candidates enable row level security;
alter table public.kwilt_meal_choice_responses enable row level security;
alter table public.kwilt_meal_plan_entries enable row level security;

create policy kwilt_meal_plans_organizer_read on public.kwilt_meal_plans for select to authenticated using (public.kwilt_is_meal_plan_organizer(id));
create policy kwilt_meal_candidates_organizer_read on public.kwilt_meal_plan_candidates for select to authenticated using (public.kwilt_is_meal_plan_organizer(plan_id));
create policy kwilt_meal_rounds_organizer_read on public.kwilt_meal_choice_rounds for select to authenticated using (public.kwilt_is_meal_plan_organizer(plan_id));
create policy kwilt_meal_participants_organizer_read on public.kwilt_meal_choice_participants for select to authenticated using (exists(select 1 from public.kwilt_meal_choice_rounds round_row where round_row.id = round_id and public.kwilt_is_meal_plan_organizer(round_row.plan_id)));
create policy kwilt_meal_choice_candidates_organizer_read on public.kwilt_meal_choice_candidates for select to authenticated using (exists(select 1 from public.kwilt_meal_choice_rounds round_row where round_row.id = round_id and public.kwilt_is_meal_plan_organizer(round_row.plan_id)));
create policy kwilt_meal_responses_organizer_read on public.kwilt_meal_choice_responses for select to authenticated using (exists(select 1 from public.kwilt_meal_choice_rounds round_row where round_row.id = round_id and public.kwilt_is_meal_plan_organizer(round_row.plan_id)));
create policy kwilt_meal_entries_organizer_read on public.kwilt_meal_plan_entries for select to authenticated using (public.kwilt_is_meal_plan_organizer(plan_id));

create or replace function public.kwilt_validate_meal_horizon(p_horizon jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_kind text := p_horizon->>'kind';
begin
  if jsonb_typeof(p_horizon) <> 'object' or v_kind not in ('next_shop','meal_count','date_range','open') then raise exception 'invalid_meal_plan_horizon'; end if;
  if v_kind = 'meal_count' and (coalesce((p_horizon->>'count')::integer,0) not between 1 and 60) then raise exception 'invalid_meal_plan_horizon'; end if;
  if v_kind = 'date_range' and ((p_horizon->>'startsOn')::date > (p_horizon->>'endsOn')::date) then raise exception 'invalid_meal_plan_horizon'; end if;
end;
$$;

create or replace function public.kwilt_replace_meal_candidates(p_plan_id uuid, p_candidates jsonb, p_person_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_candidate jsonb; v_position bigint;
begin
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 60 then raise exception 'invalid_meal_candidates'; end if;
  delete from public.kwilt_meal_plan_candidates where plan_id = p_plan_id;
  for v_candidate, v_position in select value, ordinality from jsonb_array_elements(p_candidates) with ordinality loop
    if char_length(btrim(coalesce(v_candidate->>'title',''))) not between 1 and 160 then raise exception 'invalid_meal_candidate'; end if;
    insert into public.kwilt_meal_plan_candidates(id, plan_id, position, kind, title, recipe_snapshot, suggested_by_person_id)
    values (coalesce(nullif(v_candidate->>'id','')::uuid, gen_random_uuid()), p_plan_id, v_position - 1,
      coalesce(v_candidate->>'kind','meal_note'), btrim(v_candidate->>'title'), v_candidate->'recipeSnapshot', p_person_id);
  end loop;
end;
$$;

create or replace function public.create_kwilt_meal_plan(p_household_id uuid, p_horizon jsonb, p_candidate_snapshots jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.kwilt_require_permanent_user(); v_member public.kwilt_household_memberships; v_plan public.kwilt_meal_plans;
begin
  select membership.* into v_member from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding on binding.person_id = membership.person_id and binding.status = 'active'
  where membership.household_id = p_household_id and membership.status = 'active' and membership.role in ('owner','caregiver') and binding.user_id = v_user;
  if v_member.id is null then raise exception 'meal_plan_organizer_required'; end if;
  perform public.kwilt_validate_meal_horizon(p_horizon);
  insert into public.kwilt_meal_plans(household_id, organizer_membership_id, organizer_person_id, horizon)
    values(p_household_id, v_member.id, v_member.person_id, p_horizon) returning * into v_plan;
  perform public.kwilt_replace_meal_candidates(v_plan.id, coalesce(p_candidate_snapshots,'[]'::jsonb), v_member.person_id);
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state);
end;
$$;

create or replace function public.update_kwilt_meal_plan(p_plan_id uuid, p_expected_version integer, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan public.kwilt_meal_plans;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if v_plan.version <> p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state <> 'draft' then raise exception 'meal_plan_not_editable'; end if;
  if p_patch ? 'horizon' then perform public.kwilt_validate_meal_horizon(p_patch->'horizon'); end if;
  if p_patch ? 'candidates' then perform public.kwilt_replace_meal_candidates(p_plan_id,p_patch->'candidates',v_plan.organizer_person_id); end if;
  update public.kwilt_meal_plans set horizon=coalesce(p_patch->'horizon',horizon), version=version+1, updated_at=now() where id=p_plan_id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state);
end;
$$;

create or replace function public.open_kwilt_meal_choice_round(p_plan_id uuid, p_expected_version integer, p_participant_membership_ids uuid[], p_closes_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan public.kwilt_meal_plans; v_round public.kwilt_meal_choice_rounds; v_membership_id uuid; v_member public.kwilt_household_memberships; v_recipient_user uuid; v_actor_user uuid := auth.uid(); v_actor_name text;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if v_plan.version <> p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state not in ('draft','ready_to_finalize') or cardinality(p_participant_membership_ids) not between 1 and 20 then raise exception 'invalid_meal_choice_round'; end if;
  if p_closes_at is not null and p_closes_at <= now() then raise exception 'invalid_meal_choice_close_time'; end if;
  insert into public.kwilt_meal_choice_rounds(plan_id, closes_at) values(p_plan_id,p_closes_at) returning * into v_round;
  insert into public.kwilt_meal_choice_candidates(round_id,candidate_id,position,kind,title,participant_snapshot)
    select v_round.id,c.id,c.position,c.kind,c.title,
      case when c.kind='recipe' then jsonb_build_object('recipeVersionId',c.recipe_snapshot->>'recipeVersionId','title',c.title) else null end
    from public.kwilt_meal_plan_candidates c where c.plan_id=p_plan_id;
  select display_name into v_actor_name from public.kwilt_people where id=v_plan.organizer_person_id;
  foreach v_membership_id in array p_participant_membership_ids loop
    select * into v_member from public.kwilt_household_memberships where id=v_membership_id and household_id=v_plan.household_id and status='active';
    if v_member.id is null then raise exception 'ineligible_meal_choice_participant'; end if;
    if v_member.role = 'child' and not exists(select 1 from public.kwilt_child_capability_activations activation where activation.child_membership_id=v_member.id and activation.capability_id='meal-planning' and activation.state='active') then raise exception 'ineligible_meal_choice_participant'; end if;
    insert into public.kwilt_meal_choice_participants(round_id,membership_id,person_id) values(v_round.id,v_member.id,v_member.person_id);
    select user_id into v_recipient_user from public.kwilt_person_auth_bindings where person_id=v_member.person_id and status='active';
    if v_recipient_user is null then raise exception 'ineligible_meal_choice_participant'; end if;
    insert into public.kwilt_shared_deliveries(idempotency_key,recipient_user_id,actor_user_id,event_kind,source_capability,source_entity_type,source_entity_id,actor_display_name,title,body,destination,state,expires_at)
      values('meal_choice_round:'||v_round.id::text||':'||v_recipient_user::text,v_recipient_user,v_actor_user,'meal_choice_round','meal-planning','meal_choice_round',v_round.id::text,v_actor_name,
        'Help choose the next meals','Pick what sounds good, pass, or suggest one.',jsonb_build_object('kind','meal_choice','roundId',v_round.id),'pending',p_closes_at)
      on conflict(idempotency_key) do nothing;
  end loop;
  update public.kwilt_meal_plans set state='collecting_choices',version=version+1,updated_at=now() where id=p_plan_id returning * into v_plan;
  return jsonb_build_object('roundId',v_round.id,'roundVersion',v_round.version,'planVersion',v_plan.version,'state','open');
end;
$$;

create or replace function public.get_kwilt_meal_choice_projection(p_round_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public.kwilt_require_permanent_user(); v_person uuid; v_round public.kwilt_meal_choice_rounds; v_plan public.kwilt_meal_plans; v_participant public.kwilt_meal_choice_participants; v_response public.kwilt_meal_choice_responses; v_inviter text;
begin
  select person_id into v_person from public.kwilt_person_auth_bindings where user_id=v_user and status='active';
  select * into v_round from public.kwilt_meal_choice_rounds where id=p_round_id;
  select * into v_plan from public.kwilt_meal_plans where id=v_round.plan_id;
  select * into v_participant from public.kwilt_meal_choice_participants where round_id=p_round_id and person_id=v_person;
  if v_participant.id is null or not exists(select 1 from public.kwilt_household_memberships where id=v_participant.membership_id and status='active') then raise exception 'meal_choice_not_invited'; end if;
  select display_name into v_inviter from public.kwilt_people where id=v_plan.organizer_person_id;
  select * into v_response from public.kwilt_meal_choice_responses where participant_id=v_participant.id;
  return jsonb_build_object('roundId',v_round.id,'version',v_round.version,'state',v_round.state,'closesAt',v_round.closes_at,
    'inviterLabel',v_inviter,'rule',v_round.rule,'selectionLimit',v_round.selection_limit,'suggestionLimit',v_round.suggestion_limit,
    'candidates',(select coalesce(jsonb_agg(jsonb_build_object('id',c.candidate_id,'kind',c.kind,'title',c.title,'recipeSnapshot',c.participant_snapshot) order by c.position),'[]'::jsonb) from public.kwilt_meal_choice_candidates c where c.round_id=v_round.id),
    'myResponse',case when v_response.id is null then null else jsonb_build_object('version',v_response.version,'state',v_response.state,'selectedCandidateIds',v_response.selected_candidate_ids,'pass',v_response.passed,'suggestion',v_response.suggestion) end,
    'responseCount',case when v_round.state='closed' then (select count(*) from public.kwilt_meal_choice_responses r where r.round_id=v_round.id and r.state='submitted') else null end);
end;
$$;

create or replace function public.submit_kwilt_meal_choice_response(p_round_id uuid,p_expected_round_version integer,p_selected_candidate_ids uuid[],p_pass boolean,p_suggestion text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_person uuid; v_round public.kwilt_meal_choice_rounds; v_participant public.kwilt_meal_choice_participants; v_response public.kwilt_meal_choice_responses;
begin
  select person_id into v_person from public.kwilt_person_auth_bindings where user_id=v_user and status='active';
  select * into v_round from public.kwilt_meal_choice_rounds where id=p_round_id for update;
  if v_round.id is null or v_round.version<>p_expected_round_version then raise exception 'stale_meal_choice_round'; end if;
  if v_round.state<>'open' or (v_round.closes_at is not null and v_round.closes_at<=now()) then raise exception 'meal_choice_round_closed'; end if;
  select p.* into v_participant from public.kwilt_meal_choice_participants p join public.kwilt_household_memberships m on m.id=p.membership_id and m.status='active' where p.round_id=p_round_id and p.person_id=v_person;
  if v_participant.id is null then raise exception 'meal_choice_not_invited'; end if;
  if cardinality(p_selected_candidate_ids)>v_round.selection_limit or (p_pass and cardinality(p_selected_candidate_ids)>0) or char_length(coalesce(p_suggestion,''))>v_round.suggestion_limit then raise exception 'invalid_meal_choice_response'; end if;
  if exists(select 1 from unnest(p_selected_candidate_ids) id where not exists(select 1 from public.kwilt_meal_choice_candidates c where c.round_id=p_round_id and c.candidate_id=id)) then raise exception 'invalid_meal_choice_candidate'; end if;
  insert into public.kwilt_meal_choice_responses(round_id,participant_id,state,selected_candidate_ids,passed,suggestion,submitted_at)
    values(p_round_id,v_participant.id,'submitted',p_selected_candidate_ids,p_pass,nullif(btrim(p_suggestion),''),now())
    on conflict(participant_id) do update set version=public.kwilt_meal_choice_responses.version+1,state='submitted',selected_candidate_ids=excluded.selected_candidate_ids,passed=excluded.passed,suggestion=excluded.suggestion,submitted_at=now(),withdrawn_at=null,updated_at=now()
    returning * into v_response;
  update public.kwilt_meal_choice_participants set state='responded',settled_at=now() where id=v_participant.id;
  update public.kwilt_shared_deliveries set state='settled',settled_reason='responded',settled_at=now(),updated_at=now()
    where event_kind='meal_choice_round' and source_entity_id=p_round_id::text and recipient_user_id=v_user and state='pending';
  return jsonb_build_object('responseId',v_response.id,'version',v_response.version,'state',v_response.state);
end;
$$;

create or replace function public.withdraw_kwilt_meal_choice_response(p_round_id uuid,p_expected_round_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_person uuid; v_round public.kwilt_meal_choice_rounds; v_participant public.kwilt_meal_choice_participants;
begin
  select person_id into v_person from public.kwilt_person_auth_bindings where user_id=v_user and status='active';
  select * into v_round from public.kwilt_meal_choice_rounds where id=p_round_id for update;
  if v_round.id is null or v_round.version<>p_expected_round_version then raise exception 'stale_meal_choice_round'; end if;
  if v_round.state<>'open' or (v_round.closes_at is not null and v_round.closes_at<=now()) then raise exception 'meal_choice_round_closed'; end if;
  select * into v_participant from public.kwilt_meal_choice_participants where round_id=p_round_id and person_id=v_person;
  if v_participant.id is null then raise exception 'meal_choice_not_invited'; end if;
  update public.kwilt_meal_choice_responses set state='withdrawn',version=version+1,withdrawn_at=now(),updated_at=now() where participant_id=v_participant.id;
  update public.kwilt_meal_choice_participants set state='withdrawn',settled_at=null where id=v_participant.id;
  return jsonb_build_object('roundId',p_round_id,'state','withdrawn');
end;
$$;

create or replace function public.close_kwilt_meal_choice_round(p_round_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_round public.kwilt_meal_choice_rounds; v_plan public.kwilt_meal_plans;
begin
  perform public.kwilt_require_permanent_user(); select * into v_round from public.kwilt_meal_choice_rounds where id=p_round_id for update;
  if v_round.id is null or not public.kwilt_is_meal_plan_organizer(v_round.plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if v_round.version<>p_expected_version then raise exception 'stale_meal_choice_round'; end if;
  if v_round.state<>'open' then raise exception 'meal_choice_round_closed'; end if;
  update public.kwilt_meal_choice_rounds set state='closed',version=version+1,closed_at=now() where id=p_round_id returning * into v_round;
  update public.kwilt_shared_deliveries set state='settled',settled_reason='round_closed',settled_at=now(),updated_at=now()
    where event_kind='meal_choice_round' and source_entity_id=p_round_id::text and state='pending';
  update public.kwilt_meal_plans set state='ready_to_finalize',version=version+1,updated_at=now() where id=v_round.plan_id returning * into v_plan;
  return jsonb_build_object('roundId',v_round.id,'roundVersion',v_round.version,'planVersion',v_plan.version,'state','closed');
end;
$$;

create or replace function public.finalize_kwilt_meal_plan(p_plan_id uuid,p_expected_version integer,p_selected_candidates jsonb,p_organizer_note text,p_idempotency_key text,p_content_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan public.kwilt_meal_plans; v_selection jsonb; v_position bigint; v_candidate public.kwilt_meal_plan_candidates;
begin
  perform public.kwilt_require_permanent_user(); select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if char_length(coalesce(p_idempotency_key,'')) not between 1 and 200 or char_length(coalesce(p_content_hash,'')) not between 1 and 256 then raise exception 'invalid_meal_plan_finalization_identity'; end if;
  if v_plan.finalization_key=p_idempotency_key then
    if v_plan.finalization_content_hash<>p_content_hash then raise exception 'meal_plan_idempotency_conflict'; end if;
    return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,'entryCount',(select count(*) from public.kwilt_meal_plan_entries where plan_id=v_plan.id and plan_version=v_plan.version),'replayed',true);
  end if;
  if v_plan.version<>p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state not in ('draft','ready_to_finalize') or jsonb_typeof(p_selected_candidates)<>'array' then raise exception 'meal_plan_not_finalizable'; end if;
  update public.kwilt_meal_plans set state='finalized',version=version+1,organizer_note=nullif(btrim(p_organizer_note),''),finalization_key=p_idempotency_key,finalization_content_hash=p_content_hash,finalized_at=now(),updated_at=now() where id=p_plan_id returning * into v_plan;
  -- Prior finalized versions remain immutable evidence for Grocery provenance,
  -- Cook records, scenario baselines, and deterministic recovery.
  delete from public.kwilt_meal_plan_entries where plan_id=p_plan_id and plan_version=v_plan.version;
  for v_selection,v_position in select value,ordinality from jsonb_array_elements(p_selected_candidates) with ordinality loop
    select * into v_candidate from public.kwilt_meal_plan_candidates where plan_id=p_plan_id and id=(v_selection->>'candidateId')::uuid;
    if v_candidate.id is null then raise exception 'invalid_meal_choice_candidate'; end if;
    insert into public.kwilt_meal_plan_entries(plan_id,plan_version,position,candidate_id,kind,title,recipe_snapshot,servings,placement_date)
      values(p_plan_id,v_plan.version,v_position-1,v_candidate.id,v_candidate.kind,v_candidate.title,v_candidate.recipe_snapshot,nullif(v_selection->>'servings','')::numeric,nullif(v_selection->>'placementDate','')::date);
  end loop;
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,'entryCount',jsonb_array_length(p_selected_candidates),'replayed',false);
end;
$$;

create or replace function public.revise_kwilt_meal_plan(p_plan_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan public.kwilt_meal_plans;
begin
  perform public.kwilt_require_permanent_user(); select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  if v_plan.id is null or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'meal_plan_organizer_required'; end if;
  if v_plan.version<>p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state<>'finalized' then raise exception 'meal_plan_not_revisable'; end if;
  update public.kwilt_meal_plans set state='draft',version=version+1,finalization_key=null,finalization_content_hash=null,finalized_at=null,updated_at=now() where id=p_plan_id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state);
end;
$$;

grant select on public.kwilt_meal_plans,public.kwilt_meal_plan_candidates,public.kwilt_meal_choice_rounds,public.kwilt_meal_choice_participants,public.kwilt_meal_choice_candidates,public.kwilt_meal_choice_responses,public.kwilt_meal_plan_entries to authenticated;
revoke insert,update,delete on public.kwilt_meal_plans,public.kwilt_meal_plan_candidates,public.kwilt_meal_choice_rounds,public.kwilt_meal_choice_participants,public.kwilt_meal_choice_candidates,public.kwilt_meal_choice_responses,public.kwilt_meal_plan_entries from public,anon,authenticated;
revoke execute on function public.kwilt_replace_meal_candidates(uuid,jsonb,uuid) from public,anon,authenticated;
revoke execute on function public.kwilt_validate_meal_horizon(jsonb) from public,anon;
revoke execute on function public.kwilt_is_meal_plan_organizer(uuid) from public,anon;
grant execute on function public.kwilt_is_meal_plan_organizer(uuid) to authenticated;
grant execute on function public.create_kwilt_meal_plan(uuid,jsonb,jsonb),public.update_kwilt_meal_plan(uuid,integer,jsonb),public.open_kwilt_meal_choice_round(uuid,integer,uuid[],timestamptz),public.get_kwilt_meal_choice_projection(uuid),public.submit_kwilt_meal_choice_response(uuid,integer,uuid[],boolean,text),public.withdraw_kwilt_meal_choice_response(uuid,integer),public.close_kwilt_meal_choice_round(uuid,integer),public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text),public.revise_kwilt_meal_plan(uuid,integer) to authenticated;
revoke execute on function public.create_kwilt_meal_plan(uuid,jsonb,jsonb),public.update_kwilt_meal_plan(uuid,integer,jsonb),public.open_kwilt_meal_choice_round(uuid,integer,uuid[],timestamptz),public.get_kwilt_meal_choice_projection(uuid),public.submit_kwilt_meal_choice_response(uuid,integer,uuid[],boolean,text),public.withdraw_kwilt_meal_choice_response(uuid,integer),public.close_kwilt_meal_choice_round(uuid,integer),public.finalize_kwilt_meal_plan(uuid,integer,jsonb,text,text,text),public.revise_kwilt_meal_plan(uuid,integer) from public,anon;

do $$
declare v_table text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach v_table in array array['kwilt_meal_plans','kwilt_meal_choice_rounds','kwilt_meal_choice_participants','kwilt_meal_choice_responses'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
        execute format('alter publication supabase_realtime add table public.%I',v_table);
      end if;
    end loop;
  end if;
end $$;

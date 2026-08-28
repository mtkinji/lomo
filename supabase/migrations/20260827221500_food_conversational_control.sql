-- Versioned, idempotent household meal preferences used by native UI and conversational review.

alter table public.kwilt_meal_planner_preferences
  add column if not exists usual_diner_count integer not null default 4
    check (usual_diner_count between 1 and 24),
  add column if not exists version integer not null default 1
    check (version > 0);

alter table public.kwilt_recipe_import_drafts
  add column if not exists version integer not null default 1
    check (version > 0);

-- Native data contracts already support person-owned Meal Plans. Make that authority
-- real in Postgres while preserving Household membership checks for shared plans.
alter table public.kwilt_meal_plans
  alter column household_id drop not null,
  alter column organizer_membership_id drop not null;

do $$ begin
  alter table public.kwilt_meal_plans add constraint kwilt_meal_plan_scope_consistent check (
    (household_id is null and organizer_membership_id is null)
    or (household_id is not null and organizer_membership_id is not null)
  );
exception when duplicate_object then null;
end $$;

create or replace function public.kwilt_is_meal_plan_organizer(p_plan_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.kwilt_meal_plans plan
    join public.kwilt_person_auth_bindings binding
      on binding.person_id = plan.organizer_person_id and binding.status = 'active'
    where plan.id = p_plan_id and binding.user_id = auth.uid()
      and coalesce(auth.jwt()->>'is_anonymous','false') <> 'true'
      and (
        plan.household_id is null
        or exists (
          select 1 from public.kwilt_household_memberships membership
          where membership.id = plan.organizer_membership_id
            and membership.household_id = plan.household_id
            and membership.person_id = plan.organizer_person_id
            and membership.status = 'active'
        )
      )
  )
$$;

create or replace function public.create_kwilt_meal_plan(
  p_household_id uuid,
  p_horizon jsonb,
  p_candidate_snapshots jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_member public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
begin
  select binding.person_id into v_person_id from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user and binding.status = 'active';
  if v_person_id is null then raise exception 'person_binding_required'; end if;
  if p_household_id is not null then
    select membership.* into v_member from public.kwilt_household_memberships membership
    where membership.household_id = p_household_id and membership.person_id = v_person_id
      and membership.status = 'active' and membership.role in ('owner','caregiver');
    if v_member.id is null then raise exception 'meal_plan_organizer_required'; end if;
  end if;
  perform public.kwilt_validate_meal_horizon(p_horizon);
  insert into public.kwilt_meal_plans(household_id, organizer_membership_id, organizer_person_id, horizon)
  values(p_household_id, case when p_household_id is null then null else v_member.id end, v_person_id, p_horizon)
  returning * into v_plan;
  perform public.kwilt_replace_meal_candidates(v_plan.id, coalesce(p_candidate_snapshots,'[]'::jsonb), v_person_id);
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state);
end;
$$;

create table if not exists public.kwilt_meal_preference_action_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 8 and 200),
  operation_id text not null default 'meal_planning.preferences.update'
    check (operation_id = 'meal_planning.preferences.update'),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.kwilt_cook_session_action_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.kwilt_recipe_cook_sessions(id) on delete cascade,
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 8 and 200),
  expected_revision integer not null check (expected_revision >= 0),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.kwilt_recipe_collaboration_action_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.kwilt_recipes(id) on delete cascade,
  grantee_person_id uuid not null references public.kwilt_people(id) on delete cascade,
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 8 and 200),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.kwilt_meal_plan_action_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id text not null,
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 8 and 200),
  request_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.kwilt_meal_preference_action_receipts enable row level security;
create policy kwilt_meal_preference_receipts_owner_read
  on public.kwilt_meal_preference_action_receipts for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.kwilt_meal_preference_action_receipts to authenticated;
revoke insert, update, delete on public.kwilt_meal_preference_action_receipts from public, anon, authenticated;

alter table public.kwilt_cook_session_action_receipts enable row level security;
create policy kwilt_cook_session_action_receipts_owner_read
  on public.kwilt_cook_session_action_receipts for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.kwilt_cook_session_action_receipts to authenticated;
revoke insert, update, delete on public.kwilt_cook_session_action_receipts from public, anon, authenticated;

alter table public.kwilt_recipe_collaboration_action_receipts enable row level security;
create policy kwilt_recipe_collaboration_action_receipts_owner_read
  on public.kwilt_recipe_collaboration_action_receipts for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.kwilt_recipe_collaboration_action_receipts to authenticated;
revoke insert, update, delete on public.kwilt_recipe_collaboration_action_receipts from public, anon, authenticated;

alter table public.kwilt_meal_plan_action_receipts enable row level security;
create policy kwilt_meal_plan_action_receipts_owner_read
  on public.kwilt_meal_plan_action_receipts for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.kwilt_meal_plan_action_receipts to authenticated;
revoke insert, update, delete on public.kwilt_meal_plan_action_receipts from public, anon, authenticated;

create or replace function public.set_kwilt_meal_planner_preferences(
  p_household_id uuid,
  p_usual_diner_person_ids uuid[],
  p_usual_diner_count integer,
  p_setup_state text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_person_id uuid := public.kwilt_current_person_id();
  v_diners uuid[] := coalesce(p_usual_diner_person_ids, '{}');
  v_version integer;
begin
  perform public.kwilt_require_permanent_user();
  if not public.kwilt_can_manage_meal_preferences(p_household_id) then raise exception 'meal_preferences_authority_required'; end if;
  if p_setup_state not in ('unseen','skipped','completed') then raise exception 'invalid_meal_setup_state'; end if;
  if p_usual_diner_count is null or p_usual_diner_count not between 1 and 24
    or p_usual_diner_count < cardinality(v_diners) then raise exception 'invalid_meal_diner_count'; end if;
  if cardinality(v_diners) <> (select count(distinct diner_id) from unnest(v_diners) diner_id) then raise exception 'duplicate_meal_diner'; end if;
  if exists (
    select 1 from unnest(v_diners) diner_id
    where not exists (
      select 1 from public.kwilt_household_memberships membership
      where membership.household_id = p_household_id and membership.person_id = diner_id and membership.status = 'active'
    )
  ) then raise exception 'invalid_meal_diner'; end if;
  insert into public.kwilt_meal_planner_preferences(
    household_id, usual_diner_person_ids, usual_diner_count, setup_state, updated_by_person_id, version
  ) values (p_household_id, v_diners, p_usual_diner_count, p_setup_state, v_actor_person_id, 1)
  on conflict(household_id) do update set
    usual_diner_person_ids = excluded.usual_diner_person_ids,
    usual_diner_count = excluded.usual_diner_count,
    setup_state = excluded.setup_state,
    updated_by_person_id = excluded.updated_by_person_id,
    version = public.kwilt_meal_planner_preferences.version + 1,
    updated_at = now()
  returning version into v_version;
  return jsonb_build_object(
    'householdId', p_household_id, 'usualDinerPersonIds', v_diners,
    'usualDinerCount', p_usual_diner_count, 'setupState', p_setup_state,
    'version', v_version
  );
end;
$$;

create or replace function public.update_kwilt_meal_preferences_conversational(
  p_household_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_usual_diner_person_ids uuid[],
  p_usual_diner_count integer,
  p_setup_state text,
  p_food_need_changes jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_actor_person_id uuid := public.kwilt_current_person_id();
  v_diners uuid[] := coalesce(p_usual_diner_person_ids, '{}');
  v_current_version integer;
  v_next_version integer;
  v_change jsonb;
  v_result jsonb;
begin
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 8 and 200 then
    raise exception 'invalid_idempotency_key';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || btrim(p_idempotency_key), 0)
  );
  select receipt.result || jsonb_build_object('replayed', true) into v_result
  from public.kwilt_meal_preference_action_receipts receipt
  where receipt.user_id = v_user_id and receipt.idempotency_key = btrim(p_idempotency_key);
  if v_result is not null then return v_result; end if;
  if not public.kwilt_can_manage_meal_preferences(p_household_id) then raise exception 'meal_preferences_authority_required'; end if;
  if p_setup_state not in ('unseen','skipped','completed') then raise exception 'invalid_meal_setup_state'; end if;
  if p_usual_diner_count is null or p_usual_diner_count not between 1 and 24
    or p_usual_diner_count < cardinality(v_diners) then raise exception 'invalid_meal_diner_count'; end if;
  if cardinality(v_diners) <> (select count(distinct diner_id) from unnest(v_diners) diner_id) then raise exception 'duplicate_meal_diner'; end if;
  if exists (
    select 1 from unnest(v_diners) diner_id
    where not exists (
      select 1 from public.kwilt_household_memberships membership
      where membership.household_id = p_household_id and membership.person_id = diner_id and membership.status = 'active'
    )
  ) then raise exception 'invalid_meal_diner'; end if;
  if jsonb_typeof(coalesce(p_food_need_changes, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_food_need_changes, '[]'::jsonb)) > 100 then
    raise exception 'invalid_food_need_changes';
  end if;

  select preference.version into v_current_version
  from public.kwilt_meal_planner_preferences preference
  where preference.household_id = p_household_id
  for update;
  v_current_version := coalesce(v_current_version, 0);
  if p_expected_version is distinct from v_current_version then raise exception 'stale_meal_preferences'; end if;
  v_next_version := v_current_version + 1;

  insert into public.kwilt_meal_planner_preferences(
    household_id, usual_diner_person_ids, usual_diner_count, setup_state,
    updated_by_person_id, version
  ) values (
    p_household_id, v_diners, p_usual_diner_count, p_setup_state,
    v_actor_person_id, v_next_version
  )
  on conflict(household_id) do update set
    usual_diner_person_ids = excluded.usual_diner_person_ids,
    usual_diner_count = excluded.usual_diner_count,
    setup_state = excluded.setup_state,
    updated_by_person_id = excluded.updated_by_person_id,
    version = excluded.version,
    updated_at = now();

  for v_change in select value from jsonb_array_elements(coalesce(p_food_need_changes, '[]'::jsonb)) loop
    if jsonb_typeof(v_change) <> 'object'
      or not (v_change ? 'personId' and v_change ? 'ingredientConcept' and v_change ? 'displayLabel' and v_change ? 'present') then
      raise exception 'invalid_food_need_change';
    end if;
    perform public.set_kwilt_person_food_need(
      (v_change->>'personId')::uuid,
      v_change->>'ingredientConcept',
      v_change->>'displayLabel',
      (v_change->>'present')::boolean
    );
  end loop;

  v_result := jsonb_build_object(
    'status', 'completed', 'operationId', 'meal_planning.preferences.update',
    'householdId', p_household_id, 'version', v_next_version, 'replayed', false
  );
  insert into public.kwilt_meal_preference_action_receipts(
    user_id, household_id, idempotency_key, result
  ) values (v_user_id, p_household_id, btrim(p_idempotency_key), v_result);
  return v_result;
end;
$$;

create or replace function public.get_kwilt_agent_food_control_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_actor public.kwilt_household_memberships;
  v_preferences public.kwilt_meal_planner_preferences;
  v_member_count integer := 0;
begin
  if v_user_id <> p_user_id then raise exception 'food_snapshot_actor_mismatch'; end if;
  select binding.person_id into v_person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user_id and binding.status = 'active';
  if v_person_id is null then raise exception 'person_binding_required'; end if;

  select membership.* into v_actor
  from public.kwilt_household_memberships membership
  where membership.person_id = v_person_id and membership.status = 'active'
    and membership.role in ('owner','caregiver')
  order by membership.joined_at
  limit 1;

  if v_actor.id is not null then
    select count(*) into v_member_count from public.kwilt_household_memberships membership
    where membership.household_id = v_actor.household_id and membership.status = 'active';
    select * into v_preferences from public.kwilt_meal_planner_preferences preference
    where preference.household_id = v_actor.household_id;
  end if;

  return jsonb_build_object(
    'recipeFavorites', coalesce((select jsonb_agg(favorite.recipe_ref order by favorite.created_at)
      from public.kwilt_recipe_favorites favorite where favorite.person_id = v_person_id), '[]'::jsonb),
    'hiddenRecipes', coalesce((select jsonb_agg(hidden.recipe_ref order by hidden.created_at)
      from public.kwilt_hidden_recipes hidden where hidden.person_id = v_person_id), '[]'::jsonb),
    'recipeImportDrafts', coalesce((select jsonb_agg(jsonb_build_object(
      'id', draft.id, 'version', draft.version, 'state', draft.state,
      'sourceMethod', draft.source_method, 'sourceArtifacts', draft.source_artifact_refs,
      'extractedData', draft.extracted_data, 'evidence', draft.evidence,
      'warnings', draft.warnings, 'expiresAt', draft.expires_at,
      'createdAt', draft.created_at, 'updatedAt', draft.updated_at
    ) order by draft.updated_at desc) from (
      select candidate.* from public.kwilt_recipe_import_drafts candidate
      where candidate.owner_person_id = v_person_id
        and candidate.state in ('extracting','needs_review') and candidate.expires_at > now()
      order by candidate.updated_at desc limit 20
    ) draft), '[]'::jsonb),
    'cookSessions', coalesce((select jsonb_agg(to_jsonb(session) order by session.updated_at desc)
      from (select candidate.* from public.kwilt_recipe_cook_sessions candidate
        where candidate.owner_person_id = v_person_id
        order by candidate.updated_at desc limit 20) session), '[]'::jsonb),
    'foodStock', coalesce((select jsonb_agg(jsonb_build_object(
      'id', observation.id, 'ownerPersonId', observation.owner_person_id,
      'concept', observation.concept, 'state', observation.state,
      'quantityMin', observation.quantity_min, 'quantityMax', observation.quantity_max,
      'unit', observation.unit, 'source', observation.source, 'confidence', observation.confidence,
      'observedAt', observation.observed_at, 'expiresAt', observation.expires_at,
      'supersedesObservationId', observation.supersedes_observation_id,
      'correctedAt', observation.corrected_at
    ) order by observation.observed_at desc) from (
      select candidate.* from public.kwilt_food_stock_observations candidate
      where candidate.owner_person_id = v_person_id
      order by candidate.observed_at desc limit 500
    ) observation), '[]'::jsonb),
    'foodCycle', (select jsonb_build_object(
      'id', constraint_row.id, 'cycleRef', constraint_row.cycle_ref,
      'tripTargetCents', constraint_row.target_cents,
      'moneyEnvelope', constraint_row.money_envelope, 'updatedAt', constraint_row.updated_at
    ) from public.kwilt_food_cycle_constraints constraint_row
      where constraint_row.owner_person_id = v_person_id and constraint_row.state = 'active'
        and constraint_row.cycle_ref = 'next-shop'
      order by constraint_row.updated_at desc limit 1),
    'groceryLists', coalesce((select jsonb_agg(jsonb_build_object(
      'id', list_row.id, 'revision', list_row.revision, 'status', list_row.status,
      'sourceKind', list_row.source_kind, 'sourceHouseholdId', list_row.source_household_id,
      'sourceMealPlanId', list_row.source_meal_plan_id,
      'sourceMealPlanVersion', list_row.source_meal_plan_version,
      'sourceRecipeVersionId', list_row.source_recipe_version_id,
      'sourceTitle', list_row.source_title, 'updatedAt', list_row.updated_at,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', item.id, 'concept', item.concept, 'quantityMin', item.quantity_min,
        'quantityMax', item.quantity_max, 'unit', item.unit, 'aisle', item.aisle,
        'originalDisplayTexts', item.original_display_texts, 'reviewReason', item.review_reason,
        'state', item.state, 'note', item.note,
        'sources', coalesce((select jsonb_agg(jsonb_build_object(
          'id', source.id, 'kind', source.kind, 'recipeVersionId', source.recipe_version_id,
          'ingredientLineId', source.ingredient_line_id, 'planEntryId', source.plan_entry_id,
          'noteId', source.note_id, 'requestId', source.request_id,
          'requestedByPersonId', source.requested_by_person_id,
          'sourceSnapshot', source.source_snapshot
        ) order by source.created_at) from public.kwilt_grocery_item_sources source
          where source.grocery_item_id = item.id), '[]'::jsonb)
      ) order by item.position) from public.kwilt_grocery_items item
        where item.grocery_list_id = list_row.id), '[]'::jsonb)
    ) order by list_row.updated_at desc) from (
      select candidate.* from public.kwilt_grocery_lists candidate
      where candidate.owner_person_id = v_person_id and candidate.status <> 'archived'
      order by candidate.updated_at desc limit 50
    ) list_row), '[]'::jsonb),
    'retailerHandoffs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', handoff.id, 'groceryListId', handoff.grocery_list_id,
      'provider', handoff.provider, 'state', handoff.state,
      'expiresAt', handoff.expires_at
    ) order by handoff.updated_at desc)
      from public.kwilt_retailer_handoffs handoff
      join public.kwilt_grocery_lists list_row on list_row.id = handoff.grocery_list_id
      where list_row.owner_person_id = v_person_id
        and handoff.state = 'provider_link_created' and handoff.expires_at > now()), '[]'::jsonb),
    'actorPersonId', v_person_id,
    'recipes', coalesce((select jsonb_agg(jsonb_build_object(
      'recipeId', recipe.id, 'ownerPersonId', recipe.owner_person_id,
      'lifecycle', recipe.lifecycle, 'ownershipKind', recipe.ownership_kind,
      'updatedAt', recipe.updated_at,
      'provenance', coalesce((select jsonb_build_object(
        'method', provenance.method, 'sourceUrl', provenance.source_url,
        'sourceTitle', provenance.source_title, 'sourceAuthor', provenance.source_author,
        'sourceContentHash', provenance.source_content_hash, 'rightsBasis', provenance.rights_basis
      ) from public.kwilt_recipe_provenance provenance where provenance.recipe_version_id = version_row.id),
        jsonb_build_object('method','manual','sourceUrl',null,'sourceTitle',null,'sourceAuthor',null,'sourceContentHash',null,'rightsBasis','user_authored')),
      'credits', coalesce((select jsonb_agg(jsonb_build_object(
        'id', credit.id, 'role', credit.role, 'personId', credit.person_id,
        'publicProfileId', credit.public_profile_id, 'displayLabel', credit.display_label,
        'position', credit.position, 'publicVisible', credit.public_visible
      ) order by credit.position) from public.kwilt_recipe_credits credit
        where credit.recipe_version_id = version_row.id), '[]'::jsonb),
      'lineage', coalesce((select jsonb_agg(jsonb_build_object(
        'id', lineage.id, 'relationship', lineage.relationship, 'sourceRecipeId', lineage.source_recipe_id,
        'sourceRecipeVersionId', lineage.source_recipe_version_id, 'sourcePublicationId', lineage.source_publication_id
      )) from public.kwilt_recipe_lineage lineage where lineage.recipe_version_id = version_row.id), '[]'::jsonb),
      'version', jsonb_build_object(
        'id', version_row.id, 'version', version_row.version, 'title', version_row.title,
        'description', version_row.description, 'yieldQuantity', version_row.yield_quantity,
        'yieldUnit', version_row.yield_unit, 'scalingState', version_row.scaling_state,
        'prepMinutes', version_row.prep_minutes,
        'cookMinutes', version_row.cook_minutes, 'notes', version_row.notes,
        'contentHash', version_row.content_hash,
        'ingredients', coalesce((select jsonb_agg(jsonb_build_object(
          'id', ingredient.id, 'position', ingredient.position, 'originalText', ingredient.original_text,
          'groupLabel', ingredient.group_label, 'quantityMin', ingredient.quantity_min,
          'quantityMax', ingredient.quantity_max, 'unit', ingredient.unit,
          'ingredientConcept', ingredient.ingredient_concept, 'preparation', ingredient.preparation,
          'optional', ingredient.optional, 'parseConfidence', ingredient.parse_confidence,
          'scaleRule', ingredient.scale_rule
        ) order by ingredient.position) from public.kwilt_recipe_ingredients ingredient
          where ingredient.recipe_version_id = version_row.id), '[]'::jsonb),
        'instructions', coalesce((select jsonb_agg(jsonb_build_object(
          'id', instruction.id, 'position', instruction.position,
          'sectionLabel', instruction.section_label, 'stepText', instruction.step_text
        ) order by instruction.position) from public.kwilt_recipe_instructions instruction
          where instruction.recipe_version_id = version_row.id), '[]'::jsonb),
        'equipmentRequirements', coalesce((select jsonb_agg(jsonb_build_object(
          'id', equipment.concept_id, 'label', equipment.label, 'searchQuery', equipment.search_query,
          'necessity', equipment.necessity, 'confidence', equipment.confidence,
          'evidenceText', equipment.evidence_text, 'substitute', equipment.substitute
        ) order by equipment.position) from public.kwilt_recipe_equipment_requirements equipment
          where equipment.recipe_version_id = version_row.id), '[]'::jsonb)
      )
    ) order by recipe.updated_at desc) from public.kwilt_recipes recipe
      join public.kwilt_recipe_versions version_row on version_row.id = recipe.current_version_id
      where recipe.lifecycle <> 'deleted' and public.kwilt_can_read_recipe(recipe.id)
        and recipe.id in (select candidate.id from public.kwilt_recipes candidate
          where candidate.lifecycle <> 'deleted' and public.kwilt_can_read_recipe(candidate.id)
          order by candidate.updated_at desc limit 200)), '[]'::jsonb),
    'mealPlans', coalesce((select jsonb_agg(jsonb_build_object(
      'id', plan.id, 'householdId', plan.household_id,
      'organizerPersonId', plan.organizer_person_id, 'version', plan.version,
      'state', plan.state, 'horizon', plan.horizon, 'updatedAt', plan.updated_at,
      'candidates', coalesce((select jsonb_agg(jsonb_build_object(
        'id', candidate.id, 'kind', candidate.kind, 'title', candidate.title,
        'recipeSnapshot', candidate.recipe_snapshot, 'lifecycle', candidate.lifecycle_state,
        'createdAt', candidate.created_at, 'sentAt', candidate.sent_at
      ) order by candidate.position) from public.kwilt_meal_plan_candidates candidate
        where candidate.plan_id = plan.id), '[]'::jsonb),
      'activeRound', (select jsonb_build_object(
        'id', round_row.id, 'version', round_row.version, 'state', round_row.state,
        'closesAt', round_row.closes_at
      ) from public.kwilt_meal_choice_rounds round_row where round_row.plan_id = plan.id
        and round_row.state = 'open' order by round_row.opened_at desc limit 1)
    ) order by plan.updated_at desc) from (
      select candidate.* from public.kwilt_meal_plans candidate
      where public.kwilt_is_meal_plan_organizer(candidate.id)
      order by candidate.updated_at desc limit 50
    ) plan), '[]'::jsonb),
    'mealChoiceRounds', coalesce((select jsonb_agg(jsonb_build_object(
      'roundId', round_row.id, 'planId', round_row.plan_id, 'version', round_row.version,
      'state', round_row.state, 'closesAt', round_row.closes_at,
      'candidates', coalesce((select jsonb_agg(jsonb_build_object(
        'id', candidate.candidate_id, 'kind', candidate.kind, 'title', candidate.title,
        'recipeSnapshot', candidate.participant_snapshot
      ) order by candidate.position) from public.kwilt_meal_choice_candidates candidate
        where candidate.round_id = round_row.id), '[]'::jsonb),
      'myResponse', (select jsonb_build_object(
        'id', response.id, 'version', response.version, 'state', response.state,
        'selectedCandidateIds', response.selected_candidate_ids,
        'pass', response.passed, 'suggestion', response.suggestion
      ) from public.kwilt_meal_choice_participants participant
        join public.kwilt_meal_choice_responses response on response.participant_id = participant.id
        where participant.round_id = round_row.id and participant.person_id = v_person_id)
    ) order by round_row.opened_at desc) from (
      select candidate.* from public.kwilt_meal_choice_rounds candidate
      where public.kwilt_is_meal_plan_organizer(candidate.plan_id)
        or exists (select 1 from public.kwilt_meal_choice_participants participant
          where participant.round_id = candidate.id and participant.person_id = v_person_id)
      order by candidate.opened_at desc limit 30
    ) round_row), '[]'::jsonb),
    'mealPreferences', case when v_actor.id is null then 'null'::jsonb else jsonb_build_object(
      'householdId', v_actor.household_id,
      'version', coalesce(v_preferences.version, 0),
      'updatedAt', v_preferences.updated_at,
      'usualDinerPersonIds', coalesce(to_jsonb(v_preferences.usual_diner_person_ids),
        (select coalesce(jsonb_agg(membership.person_id order by membership.joined_at), '[]'::jsonb)
         from public.kwilt_household_memberships membership
         where membership.household_id = v_actor.household_id and membership.status = 'active')),
      'usualDinerCount', coalesce(v_preferences.usual_diner_count, greatest(v_member_count, 4)),
      'setupState', coalesce(v_preferences.setup_state, 'unseen'),
      'foodNeeds', coalesce((select jsonb_agg(jsonb_build_object(
        'id', need.id, 'personId', need.person_id, 'kind', need.kind,
        'ingredientConcept', need.ingredient_concept, 'displayLabel', need.display_label
      ) order by need.created_at) from public.kwilt_person_food_needs need
        where need.household_id = v_actor.household_id), '[]'::jsonb),
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'membershipId', membership.id, 'personId', membership.person_id,
        'displayName', person.display_name, 'role', membership.role, 'kind', person.kind
      ) order by membership.joined_at) from public.kwilt_household_memberships membership
        join public.kwilt_people person on person.id = membership.person_id
        where membership.household_id = v_actor.household_id and membership.status = 'active'), '[]'::jsonb)
    ) end,
    'observedAt', now()
  );
end;
$$;

create or replace function public.approve_kwilt_recipe_import_conversational(
  p_draft_id uuid,
  p_expected_draft_version integer,
  p_idempotency_key text,
  p_reviewed_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_draft public.kwilt_recipe_import_drafts;
  v_result jsonb;
begin
  select binding.person_id into v_person_id from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user_id and binding.status = 'active';
  if v_person_id is null then raise exception 'person_binding_required'; end if;
  select * into v_draft from public.kwilt_recipe_import_drafts draft where draft.id = p_draft_id for update;
  if v_draft.id is null or v_draft.owner_person_id <> v_person_id then raise exception 'recipe_import_not_owned'; end if;
  if v_draft.state = 'approved' and v_draft.approval_idempotency_key = p_idempotency_key then
    return public.approve_kwilt_recipe_import(p_draft_id, p_idempotency_key, p_reviewed_data);
  end if;
  if v_draft.version is distinct from p_expected_draft_version then raise exception 'recipe_import_version_conflict'; end if;
  v_result := public.approve_kwilt_recipe_import(p_draft_id, p_idempotency_key, p_reviewed_data);
  update public.kwilt_recipe_import_drafts set version = version + 1
  where id = p_draft_id and version = p_expected_draft_version;
  return v_result || jsonb_build_object('draftVersion', p_expected_draft_version + 1);
end;
$$;

create or replace function public.apply_kwilt_cook_session_conversational(
  p_idempotency_key text,
  p_expected_revision integer,
  p_session jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_session_id uuid := (p_session->>'id')::uuid;
  v_session public.kwilt_recipe_cook_sessions;
  v_result jsonb;
begin
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 8 and 200 then raise exception 'invalid_idempotency_key'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':' || btrim(p_idempotency_key), 0));
  select receipt.result || jsonb_build_object('replayed', true) into v_result
  from public.kwilt_cook_session_action_receipts receipt
  where receipt.user_id = v_user_id and receipt.idempotency_key = btrim(p_idempotency_key);
  if v_result is not null then return v_result; end if;
  perform public.sync_kwilt_recipe_cook_session(p_session, p_expected_revision);
  select * into v_session from public.kwilt_recipe_cook_sessions session where session.id = v_session_id;
  v_result := jsonb_build_object('session', to_jsonb(v_session), 'replayed', false);
  insert into public.kwilt_cook_session_action_receipts(user_id, session_id, idempotency_key, expected_revision, result)
  values (v_user_id, v_session_id, btrim(p_idempotency_key), p_expected_revision, v_result);
  return v_result;
end;
$$;

create or replace function public.invite_kwilt_recipe_collaborator_conversational(
  p_recipe_id uuid,
  p_recipient_person_id uuid,
  p_role text,
  p_expected_version integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_actor_person_id uuid := public.kwilt_current_person_id();
  v_recipe public.kwilt_recipes;
  v_current_version integer;
  v_grant public.kwilt_recipe_access_grants;
  v_result jsonb;
begin
  if v_actor_person_id is null then raise exception 'person_binding_required'; end if;
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 8 and 200 then raise exception 'invalid_idempotency_key'; end if;
  if p_role not in ('viewer','contributor','maintainer') then raise exception 'invalid_recipe_collaboration_role'; end if;
  if p_recipient_person_id is null or p_recipient_person_id = v_actor_person_id
    or not exists (select 1 from public.kwilt_people person where person.id = p_recipient_person_id) then
    raise exception 'invalid_recipe_collaborator';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':' || btrim(p_idempotency_key), 0));
  select receipt.result || jsonb_build_object('replayed', true) into v_result
  from public.kwilt_recipe_collaboration_action_receipts receipt
  where receipt.user_id = v_user_id and receipt.idempotency_key = btrim(p_idempotency_key);
  if v_result is not null then return v_result; end if;
  select * into v_recipe from public.kwilt_recipes recipe where recipe.id = p_recipe_id for update;
  if v_recipe.id is null or v_recipe.owner_person_id <> v_actor_person_id or v_recipe.lifecycle = 'deleted' then
    raise exception 'recipe_collaboration_owner_required';
  end if;
  select version.version into v_current_version from public.kwilt_recipe_versions version where version.id = v_recipe.current_version_id;
  if v_current_version is distinct from p_expected_version then raise exception 'stale_recipe_version'; end if;
  insert into public.kwilt_recipe_access_grants(
    recipe_id, grantee_person_id, role, status, granted_by_person_id, expires_at, revoked_at
  ) values (p_recipe_id, p_recipient_person_id, p_role, 'active', v_actor_person_id, null, null)
  on conflict (recipe_id, grantee_person_id) do update set
    role = excluded.role, status = 'active', granted_by_person_id = excluded.granted_by_person_id,
    expires_at = null, revoked_at = null
  returning * into v_grant;
  v_result := jsonb_build_object(
    'grantId', v_grant.id, 'recipeId', p_recipe_id, 'recipientPersonId', p_recipient_person_id,
    'role', v_grant.role, 'status', v_grant.status, 'version', p_expected_version, 'replayed', false
  );
  insert into public.kwilt_recipe_collaboration_action_receipts(
    user_id, recipe_id, grantee_person_id, idempotency_key, result
  ) values (v_user_id, p_recipe_id, p_recipient_person_id, btrim(p_idempotency_key), v_result);
  return v_result;
end;
$$;

create or replace function public.finalize_kwilt_personal_meal_plan_conversational(
  p_plan_id uuid,
  p_expected_version integer,
  p_occasions jsonb,
  p_organizer_note text,
  p_idempotency_key text,
  p_content_hash text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_person_id uuid := public.kwilt_current_person_id();
  v_plan public.kwilt_meal_plans;
  v_occasion jsonb;
  v_dish jsonb;
  v_occasion_position bigint;
  v_dish_position bigint := 0;
  v_candidate public.kwilt_meal_plan_candidates;
  v_occasion_id uuid;
  v_timing_kind text;
  v_meal_period text;
  v_coverage_dates date[];
  v_diners uuid[];
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id for update;
  if v_plan.id is null or v_plan.household_id is not null or v_plan.organizer_person_id <> v_person_id
    or not public.kwilt_is_meal_plan_organizer(p_plan_id) then raise exception 'personal_meal_plan_organizer_required'; end if;
  if char_length(coalesce(p_idempotency_key,'')) not between 1 and 200
    or char_length(coalesce(p_content_hash,'')) not between 1 and 256 then raise exception 'invalid_meal_plan_finalization_identity'; end if;
  if v_plan.finalization_key = p_idempotency_key then
    if v_plan.finalization_content_hash <> p_content_hash then raise exception 'meal_plan_idempotency_conflict'; end if;
    return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,
      'entryCount',(select count(*) from public.kwilt_meal_plan_entries where plan_id=v_plan.id and plan_version=v_plan.version),'replayed',true);
  end if;
  if v_plan.version <> p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state not in ('draft','ready_to_finalize') or jsonb_typeof(p_occasions) <> 'array'
    or jsonb_array_length(p_occasions) not between 1 and 60 then raise exception 'meal_plan_not_finalizable'; end if;
  update public.kwilt_meal_plans set state='finalized',version=version+1,
    organizer_note=nullif(btrim(p_organizer_note),''),finalization_key=p_idempotency_key,
    finalization_content_hash=p_content_hash,finalized_at=now(),updated_at=now()
  where id=p_plan_id returning * into v_plan;
  for v_occasion,v_occasion_position in select value,ordinality from jsonb_array_elements(p_occasions) with ordinality loop
    v_occasion_id := (v_occasion->>'id')::uuid;
    if jsonb_typeof(v_occasion->'dishes') <> 'array' or jsonb_array_length(v_occasion->'dishes') not between 1 and 20
      or jsonb_array_length(coalesce(v_occasion->'notEatingPersonIds','[]'::jsonb)) <> 0 then
      raise exception 'invalid_personal_meal_occasion';
    end if;
    v_timing_kind := v_occasion->'timing'->>'kind';
    v_meal_period := case when v_timing_kind = 'flexible' then null else v_occasion->'timing'->>'mealPeriod' end;
    select coalesce(array_agg(value::date order by value::date), '{}') into v_coverage_dates
    from jsonb_array_elements_text(coalesce(v_occasion->'timing'->'dates','[]'::jsonb));
    insert into public.kwilt_meal_plan_occasions(
      id,plan_id,plan_version,position,title,placement_date,not_eating_person_ids,
      timing_kind,meal_period,coverage_dates,coverage_label
    ) values(
      v_occasion_id,p_plan_id,v_plan.version,v_occasion_position-1,nullif(btrim(v_occasion->>'title'),''),
      case when v_timing_kind='occasion' then (v_occasion->'timing'->>'date')::date else null end,'{}',
      v_timing_kind,v_meal_period,v_coverage_dates,
      case when v_timing_kind='coverage' then nullif(btrim(v_occasion->'timing'->>'label'),'') else null end
    );
    for v_dish in select value from jsonb_array_elements(v_occasion->'dishes') loop
      select * into v_candidate from public.kwilt_meal_plan_candidates
      where plan_id=p_plan_id and id=(v_dish->>'candidateId')::uuid;
      select coalesce(array_agg(value::uuid), '{}') into v_diners
      from jsonb_array_elements_text(coalesce(v_dish->'dinerPersonIds','[]'::jsonb));
      if v_candidate.id is null or cardinality(v_diners) <> 1 or v_diners[1] <> v_person_id then
        raise exception 'invalid_personal_meal_dish';
      end if;
      insert into public.kwilt_meal_plan_entries(
        id,plan_id,plan_version,position,candidate_id,kind,title,recipe_snapshot,
        servings,placement_date,occasion_id,diner_person_ids
      ) values(
        (v_dish->>'id')::uuid,p_plan_id,v_plan.version,v_dish_position,v_candidate.id,
        v_candidate.kind,v_candidate.title,v_candidate.recipe_snapshot,
        nullif(v_dish->>'servings','')::numeric,
        case when v_timing_kind='occasion' then (v_occasion->'timing'->>'date')::date else null end,
        v_occasion_id,v_diners
      );
      v_dish_position := v_dish_position + 1;
    end loop;
  end loop;
  return jsonb_build_object('planId',v_plan.id,'version',v_plan.version,'state',v_plan.state,
    'entryCount',v_dish_position,'occasionCount',jsonb_array_length(p_occasions),'replayed',false);
end;
$$;

create or replace function public.apply_kwilt_meal_plan_conversational(
  p_operation_id text,
  p_plan_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_request_hash text;
  v_receipt public.kwilt_meal_plan_action_receipts;
  v_candidates jsonb;
  v_result jsonb;
  v_plan public.kwilt_meal_plans;
  v_membership_ids uuid[];
  v_candidate_ids uuid[];
begin
  if p_operation_id not in (
      'meal_planning.plan.create','meal_planning.plan.update',
      'meal_planning.candidate.add','meal_planning.candidate.remove',
      'meal_planning.round.open','meal_planning.round.close',
      'meal_planning.response.submit','meal_planning.response.withdraw',
      'meal_planning.plan.finalize','meal_planning.plan.revise'
    )
    or p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 8 and 200
    or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid_meal_plan_conversational_action'; end if;
  v_request_hash := encode(extensions.digest(
    concat_ws('|', p_operation_id, coalesce(p_plan_id::text,''), p_expected_version::text, p_payload::text), 'sha256'
  ), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':' || btrim(p_idempotency_key), 0));
  select * into v_receipt from public.kwilt_meal_plan_action_receipts receipt
  where receipt.user_id = v_user_id and receipt.idempotency_key = btrim(p_idempotency_key);
  if v_receipt.id is not null then
    if v_receipt.request_hash <> v_request_hash then raise exception 'meal_plan_idempotency_conflict'; end if;
    return v_receipt.result || jsonb_build_object('replayed', true);
  end if;
  if p_operation_id = 'meal_planning.plan.create' then
    if p_plan_id is not null or p_expected_version <> 0 then raise exception 'invalid_meal_plan_create'; end if;
    v_result := public.create_kwilt_meal_plan(
      nullif(p_payload->>'householdId','')::uuid, p_payload->'horizon', '[]'::jsonb
    );
  elsif p_operation_id = 'meal_planning.plan.update' then
    v_result := public.update_kwilt_meal_plan(p_plan_id, p_expected_version, jsonb_build_object('horizon', p_payload->'horizon'));
  elsif p_operation_id = 'meal_planning.round.open' then
    select * into v_plan from public.kwilt_meal_plans where id = p_plan_id;
    if v_plan.id is null or v_plan.household_id is null
      or jsonb_typeof(p_payload->'participantPersonIds') <> 'array'
      or jsonb_array_length(p_payload->'participantPersonIds') not between 1 and 20 then
      raise exception 'invalid_meal_choice_participants';
    end if;
    select array_agg(membership.id order by requested.ordinality) into v_membership_ids
    from jsonb_array_elements_text(p_payload->'participantPersonIds') with ordinality requested(person_id, ordinality)
    join public.kwilt_household_memberships membership
      on membership.household_id = v_plan.household_id
      and membership.person_id = requested.person_id::uuid and membership.status = 'active';
    if cardinality(v_membership_ids) <> jsonb_array_length(p_payload->'participantPersonIds')
      or cardinality(v_membership_ids) <> (select count(distinct id) from unnest(v_membership_ids) id) then
      raise exception 'invalid_meal_choice_participants';
    end if;
    v_result := public.open_kwilt_meal_choice_round(p_plan_id, p_expected_version, v_membership_ids, null);
  elsif p_operation_id = 'meal_planning.round.close' then
    v_result := public.close_kwilt_meal_choice_round(p_plan_id, p_expected_version);
  elsif p_operation_id = 'meal_planning.response.submit' then
    if jsonb_typeof(p_payload->'candidateIds') <> 'array' or jsonb_array_length(p_payload->'candidateIds') > 3
      or jsonb_typeof(p_payload->'pass') <> 'boolean' then raise exception 'invalid_meal_choice_response'; end if;
    select coalesce(array_agg(value::uuid), '{}') into v_candidate_ids
    from jsonb_array_elements_text(p_payload->'candidateIds');
    v_result := public.submit_kwilt_meal_choice_response(
      p_plan_id, p_expected_version, v_candidate_ids, (p_payload->>'pass')::boolean,
      nullif(btrim(p_payload->>'suggestion'),'')
    );
  elsif p_operation_id = 'meal_planning.response.withdraw' then
    v_result := public.withdraw_kwilt_meal_choice_response(p_plan_id, p_expected_version);
  elsif p_operation_id = 'meal_planning.plan.finalize' then
    select * into v_plan from public.kwilt_meal_plans where id = p_plan_id;
    if v_plan.id is null then raise exception 'meal_plan_not_found'; end if;
    if v_plan.household_id is null then
      v_result := public.finalize_kwilt_personal_meal_plan_conversational(
        p_plan_id, p_expected_version, p_payload->'occasions', p_payload->>'organizerNote',
        btrim(p_idempotency_key), encode(extensions.digest(p_payload::text, 'sha256'), 'hex')
      );
    else
      v_result := public.finalize_kwilt_meal_plan(
        p_plan_id, p_expected_version, p_payload->'occasions', p_payload->>'organizerNote',
        btrim(p_idempotency_key), encode(extensions.digest(p_payload::text, 'sha256'), 'hex')
      );
    end if;
  elsif p_operation_id = 'meal_planning.plan.revise' then
    v_result := public.revise_kwilt_meal_plan(p_plan_id, p_expected_version);
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', candidate.id, 'kind', candidate.kind, 'title', candidate.title, 'recipeSnapshot', candidate.recipe_snapshot
    ) order by candidate.position), '[]'::jsonb) into v_candidates
    from public.kwilt_meal_plan_candidates candidate where candidate.plan_id = p_plan_id;
    if p_operation_id = 'meal_planning.candidate.add' then
      if jsonb_typeof(p_payload->'candidate') <> 'object' then raise exception 'invalid_meal_candidate'; end if;
      if exists (
        select 1 from public.kwilt_meal_plan_candidates candidate
        where candidate.plan_id = p_plan_id and candidate.id = (p_payload->'candidate'->>'id')::uuid
      ) then raise exception 'meal_candidate_id_exists'; end if;
      if nullif(p_payload->'candidate'->'recipeSnapshot'->>'recipeVersionId','') is not null and exists (
        select 1 from public.kwilt_meal_plan_candidates candidate
        where candidate.plan_id = p_plan_id
          and candidate.recipe_snapshot->>'recipeVersionId' = p_payload->'candidate'->'recipeSnapshot'->>'recipeVersionId'
      ) then raise exception 'meal_candidate_recipe_exists'; end if;
      v_candidates := v_candidates || jsonb_build_array(p_payload->'candidate');
    else
      if not exists (
        select 1 from public.kwilt_meal_plan_candidates candidate
        where candidate.plan_id = p_plan_id and candidate.id = (p_payload->>'candidateId')::uuid
      ) then raise exception 'meal_candidate_not_found'; end if;
      select coalesce(jsonb_agg(candidate), '[]'::jsonb) into v_candidates
      from jsonb_array_elements(v_candidates) candidate where candidate->>'id' <> p_payload->>'candidateId';
    end if;
    v_result := public.update_kwilt_meal_plan(p_plan_id, p_expected_version, jsonb_build_object('candidates', v_candidates));
  end if;
  v_result := v_result || jsonb_build_object('operationId', p_operation_id, 'replayed', false);
  insert into public.kwilt_meal_plan_action_receipts(user_id, operation_id, idempotency_key, request_hash, result)
  values(v_user_id, p_operation_id, btrim(p_idempotency_key), v_request_hash, v_result);
  return v_result;
end;
$$;

create table if not exists public.kwilt_grocery_list_action_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id text not null check (operation_id in ('groceries.item.add','groceries.item.update','groceries.item.set_state')),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 160),
  request_hash text not null,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
alter table public.kwilt_grocery_list_action_receipts enable row level security;
drop policy if exists kwilt_grocery_list_receipts_owner_read on public.kwilt_grocery_list_action_receipts;
create policy kwilt_grocery_list_receipts_owner_read on public.kwilt_grocery_list_action_receipts
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.kwilt_grocery_list_action_receipts to authenticated;
revoke insert, update, delete on public.kwilt_grocery_list_action_receipts from public, anon, authenticated;

create or replace function public.apply_kwilt_grocery_list_conversational(
  p_operation_id text, p_target_id uuid, p_expected_revision integer,
  p_idempotency_key text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_person_id uuid := public.kwilt_current_person_id();
  v_receipt public.kwilt_grocery_list_action_receipts;
  v_request_hash text;
  v_result jsonb;
  v_state text;
begin
  perform public.kwilt_require_permanent_user();
  if v_user_id is null or v_person_id is null
    or p_operation_id not in ('groceries.item.add','groceries.item.update','groceries.item.set_state')
    or p_target_id is null or p_expected_revision < 1
    or char_length(btrim(coalesce(p_idempotency_key,''))) not between 1 and 160
    or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid_grocery_list_action'; end if;
  v_request_hash := encode(extensions.digest(jsonb_build_object(
    'operationId',p_operation_id,'targetId',p_target_id,'expectedRevision',p_expected_revision,'payload',p_payload
  )::text,'sha256'),'hex');
  select * into v_receipt from public.kwilt_grocery_list_action_receipts
    where user_id = v_user_id and idempotency_key = btrim(p_idempotency_key);
  if v_receipt.id is not null then
    if v_receipt.request_hash <> v_request_hash then raise exception 'grocery_list_idempotency_conflict'; end if;
    return v_receipt.result || jsonb_build_object('replayed',true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_person_id::text || ':' || p_target_id::text,0));
  if p_operation_id = 'groceries.item.add' then
    if char_length(btrim(coalesce(p_payload->>'title',''))) not between 1 and 320
      or p_payload->>'sourceKind' not in ('manual','household_request') then raise exception 'invalid_grocery_item'; end if;
    v_result := public.add_kwilt_grocery_item(p_target_id,p_expected_revision,p_payload->>'title');
    if p_payload->>'sourceKind' = 'household_request' then
      update public.kwilt_grocery_item_sources set kind='household_request', note_id=null,
        request_id=btrim(p_idempotency_key), requested_by_person_id=v_person_id,
        source_snapshot=source_snapshot || jsonb_build_object('sourceKind','household_request')
      where grocery_item_id=(v_result->>'itemId')::uuid and kind='manual';
    end if;
  elsif p_operation_id = 'groceries.item.update' then
    if jsonb_typeof(p_payload->'patch') <> 'object'
      or jsonb_object_length(p_payload->'patch') < 1 then raise exception 'invalid_grocery_item_patch'; end if;
    v_result := public.update_kwilt_grocery_item(p_target_id,p_expected_revision,p_payload->'patch',p_payload->>'reason');
  else
    v_state := p_payload->>'state';
    if v_state not in ('needed','already_have','purchased','skipped') then raise exception 'invalid_grocery_item_state'; end if;
    v_result := public.set_kwilt_grocery_item_state(p_target_id,p_expected_revision,v_state);
  end if;
  v_result := v_result || jsonb_build_object('operationId',p_operation_id,'replayed',false);
  insert into public.kwilt_grocery_list_action_receipts(user_id,operation_id,idempotency_key,request_hash,result)
  values(v_user_id,p_operation_id,btrim(p_idempotency_key),v_request_hash,v_result);
  return v_result;
end;
$$;

create table if not exists public.kwilt_food_stock_action_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id text not null check (operation_id in ('food_stock.observe','food_stock.deplete')),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 160),
  request_hash text not null,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
alter table public.kwilt_food_stock_action_receipts enable row level security;
drop policy if exists kwilt_food_stock_receipts_owner_read on public.kwilt_food_stock_action_receipts;
create policy kwilt_food_stock_receipts_owner_read on public.kwilt_food_stock_action_receipts
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.kwilt_food_stock_action_receipts to authenticated;
revoke insert, update, delete on public.kwilt_food_stock_action_receipts from public, anon, authenticated;

create or replace function public.apply_kwilt_food_stock_conversational(
  p_operation_id text,
  p_expected_observation_id uuid,
  p_idempotency_key text,
  p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_person_id uuid := public.kwilt_current_person_id();
  v_concept text;
  v_current public.kwilt_food_stock_observations;
  v_receipt public.kwilt_food_stock_action_receipts;
  v_request_hash text;
  v_observation jsonb;
  v_result jsonb;
begin
  perform public.kwilt_require_permanent_user();
  if v_user_id is null or v_person_id is null or p_operation_id not in ('food_stock.observe','food_stock.deplete')
    or char_length(btrim(coalesce(p_idempotency_key,''))) not between 1 and 160
    or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid_food_stock_action'; end if;
  v_observation := case when p_operation_id = 'food_stock.observe' then p_payload->'observation' else p_payload end;
  if jsonb_typeof(v_observation) <> 'object' then raise exception 'invalid_food_stock_observation'; end if;
  v_concept := btrim(v_observation->>'concept');
  if char_length(v_concept) not between 1 and 320 then raise exception 'invalid_food_stock_observation'; end if;
  v_request_hash := encode(extensions.digest(jsonb_build_object(
    'operationId', p_operation_id, 'expectedObservationId', p_expected_observation_id,
    'payload', p_payload
  )::text, 'sha256'), 'hex');
  select * into v_receipt from public.kwilt_food_stock_action_receipts
    where user_id = v_user_id and idempotency_key = btrim(p_idempotency_key);
  if v_receipt.id is not null then
    if v_receipt.request_hash <> v_request_hash then raise exception 'food_stock_idempotency_conflict'; end if;
    return v_receipt.result || jsonb_build_object('replayed', true);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_person_id::text || ':' || lower(v_concept), 0));
  select * into v_current from public.kwilt_food_stock_observations
    where owner_person_id = v_person_id and lower(btrim(concept)) = lower(v_concept) and corrected_at is null
    order by observed_at desc, created_at desc, id desc limit 1 for update;
  if (v_current.id is null and p_expected_observation_id is not null)
    or (v_current.id is not null and p_expected_observation_id is distinct from v_current.id) then
    raise exception 'food_stock_observation_stale';
  end if;
  if p_operation_id = 'food_stock.deplete' then
    v_observation := jsonb_build_object(
      'concept', v_concept, 'state', 'depleted', 'quantityMin', 0, 'quantityMax', 0,
      'unit', null, 'source', 'voice', 'confidence', 1,
      'observedAt', v_observation->>'observedAt', 'expiresAt', null
    );
  end if;
  v_observation := v_observation || jsonb_build_object('supersedesObservationId', v_current.id);
  v_result := public.observe_kwilt_food_stock(v_observation)
    || jsonb_build_object('operationId', p_operation_id, 'replayed', false);
  insert into public.kwilt_food_stock_action_receipts(user_id, operation_id, idempotency_key, request_hash, result)
  values(v_user_id, p_operation_id, btrim(p_idempotency_key), v_request_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.set_kwilt_meal_planner_preferences(uuid,uuid[],integer,text) from public, anon;
grant execute on function public.set_kwilt_meal_planner_preferences(uuid,uuid[],integer,text) to authenticated;
revoke all on function public.update_kwilt_meal_preferences_conversational(uuid,integer,text,uuid[],integer,text,jsonb) from public, anon;
grant execute on function public.update_kwilt_meal_preferences_conversational(uuid,integer,text,uuid[],integer,text,jsonb) to authenticated;
revoke all on function public.get_kwilt_agent_food_control_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.approve_kwilt_recipe_import_conversational(uuid,integer,text,jsonb) from public, anon;
grant execute on function public.approve_kwilt_recipe_import_conversational(uuid,integer,text,jsonb) to authenticated;
revoke all on function public.apply_kwilt_cook_session_conversational(text,integer,jsonb) from public, anon;
grant execute on function public.apply_kwilt_cook_session_conversational(text,integer,jsonb) to authenticated;
revoke all on function public.invite_kwilt_recipe_collaborator_conversational(uuid,uuid,text,integer,text) from public, anon;
grant execute on function public.invite_kwilt_recipe_collaborator_conversational(uuid,uuid,text,integer,text) to authenticated;
revoke all on function public.apply_kwilt_meal_plan_conversational(text,uuid,integer,text,jsonb) from public, anon;
grant execute on function public.apply_kwilt_meal_plan_conversational(text,uuid,integer,text,jsonb) to authenticated;
revoke all on function public.finalize_kwilt_personal_meal_plan_conversational(uuid,integer,jsonb,text,text,text) from public, anon, authenticated;
revoke all on function public.apply_kwilt_food_stock_conversational(text,uuid,text,jsonb) from public, anon;
grant execute on function public.apply_kwilt_food_stock_conversational(text,uuid,text,jsonb) to authenticated;
revoke all on function public.apply_kwilt_grocery_list_conversational(text,uuid,integer,text,jsonb) from public, anon;
grant execute on function public.apply_kwilt_grocery_list_conversational(text,uuid,integer,text,jsonb) to authenticated;

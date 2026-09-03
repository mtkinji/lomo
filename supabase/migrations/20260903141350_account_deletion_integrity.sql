-- Durable, service-role-only account deletion state. The raw user id is cleared
-- on completion; subject_hash is produced by the Edge Function with a server secret.
create table public.kwilt_account_deletion_operations (
  operation_id uuid primary key,
  user_id uuid,
  subject_hash text not null check (char_length(subject_hash) = 64),
  status text not null check (status in ('running', 'retryable_failure', 'complete')),
  completed_stages text[] not null default '{}',
  provider_outcomes jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_outcomes) = 'object'),
  last_error_code text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  check ((status = 'complete') = (completed_at is not null)),
  check (status <> 'complete' or user_id is null)
);

create unique index kwilt_account_deletion_one_active_user
  on public.kwilt_account_deletion_operations (user_id)
  where user_id is not null and status <> 'complete';

alter table public.kwilt_account_deletion_operations enable row level security;
revoke all on table public.kwilt_account_deletion_operations from public, anon, authenticated;
grant select, insert, update, delete on table public.kwilt_account_deletion_operations to service_role;

-- Apple revocation material is captured once after OAuth, encrypted by an Edge
-- Function, and readable only by service-role deletion code.
create table public.kwilt_account_deletion_provider_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'apple'),
  token_kind text not null check (token_kind = 'refresh_token'),
  token_payload jsonb not null check (jsonb_typeof(token_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.kwilt_account_deletion_provider_tokens enable row level security;
revoke all on table public.kwilt_account_deletion_provider_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.kwilt_account_deletion_provider_tokens to service_role;

create extension if not exists pg_cron with schema extensions;
do $$
begin
  perform cron.unschedule('kwilt-account-deletion-receipts-prune');
exception when others then null;
end
$$;
select cron.schedule(
  'kwilt-account-deletion-receipts-prune',
  '17 4 * * *',
  $$delete from public.kwilt_account_deletion_operations where expires_at <= now()$$
);

-- Creator and audit references must never make auth.users undeletable. The
-- preparation RPC transfers meaningful stewardship before these safety nets run.
alter table public.kwilt_people
  alter column created_by_user_id drop not null,
  drop constraint if exists kwilt_people_created_by_user_id_fkey,
  add constraint kwilt_people_created_by_user_id_fkey
    foreign key (created_by_user_id) references auth.users(id) on delete set null;

alter table public.kwilt_households
  alter column created_by_user_id drop not null,
  drop constraint if exists kwilt_households_created_by_user_id_fkey,
  add constraint kwilt_households_created_by_user_id_fkey
    foreign key (created_by_user_id) references auth.users(id) on delete set null;

alter table public.kwilt_friendships
  alter column initiated_by drop not null,
  drop constraint if exists kwilt_friendships_initiated_by_fkey,
  add constraint kwilt_friendships_initiated_by_fkey
    foreign key (initiated_by) references auth.users(id) on delete set null,
  drop constraint if exists kwilt_friendships_blocked_by_fkey,
  add constraint kwilt_friendships_blocked_by_fkey
    foreign key (blocked_by) references auth.users(id) on delete set null;

alter table public.kwilt_family_screen_time_access_requests
  alter column requested_by_user_id drop not null,
  drop constraint if exists kwilt_family_screen_time_access_requests_requested_by_user_id_fkey,
  add constraint kwilt_family_screen_time_access_requests_requested_by_user_id_fkey
    foreign key (requested_by_user_id) references auth.users(id) on delete set null;

alter table public.kwilt_family_screen_time_operations
  alter column actor_user_id drop not null,
  drop constraint if exists kwilt_family_screen_time_operations_actor_user_id_fkey,
  add constraint kwilt_family_screen_time_operations_actor_user_id_fkey
    foreign key (actor_user_id) references auth.users(id) on delete set null;

-- Household-owned Meal Plans and their derived Grocery lists have no meaning
-- after a sole-adult Household is removed, so make that ownership cascade
-- explicit instead of relying on brittle statement ordering.
alter table public.kwilt_meal_plans
  drop constraint if exists kwilt_meal_plans_household_id_fkey,
  add constraint kwilt_meal_plans_household_id_fkey
    foreign key (household_id) references public.kwilt_households(id) on delete cascade;

alter table public.kwilt_grocery_lists
  drop constraint if exists kwilt_grocery_lists_source_meal_plan_id_fkey,
  add constraint kwilt_grocery_lists_source_meal_plan_id_fkey
    foreign key (source_meal_plan_id) references public.kwilt_meal_plans(id) on delete cascade,
  drop constraint if exists kwilt_grocery_lists_source_household_id_fkey,
  add constraint kwilt_grocery_lists_source_household_id_fkey
    foreign key (source_household_id) references public.kwilt_households(id) on delete cascade;

-- Safety reports may be supplied by the independently shipped UGC migration.
-- When present, preserve the bounded moderation record while removing account
-- linkage. Keeping this conditional avoids coupling this migration to that lane.
do $$
begin
  if pg_catalog.to_regclass('public.kwilt_ugc_reports') is not null then
    execute 'alter table public.kwilt_ugc_reports alter column reporter_user_id drop not null';
    execute 'alter table public.kwilt_ugc_reports drop constraint if exists kwilt_ugc_reports_reporter_user_id_fkey';
    execute 'alter table public.kwilt_ugc_reports add constraint kwilt_ugc_reports_reporter_user_id_fkey foreign key (reporter_user_id) references auth.users(id) on delete set null';
    execute 'alter table public.kwilt_ugc_reports drop constraint if exists kwilt_ugc_reports_reported_user_id_fkey';
    execute 'alter table public.kwilt_ugc_reports add constraint kwilt_ugc_reports_reported_user_id_fkey foreign key (reported_user_id) references auth.users(id) on delete set null';
  end if;
end;
$$;

create or replace function public.prepare_kwilt_account_deletion(
  p_user_id uuid,
  p_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_membership public.kwilt_household_memberships;
  v_successor public.kwilt_household_memberships;
  v_successor_user_id uuid;
  v_transferred_households integer := 0;
  v_deleted_households integer := 0;
  v_deidentified_audit_rows integer := 0;
  v_changed_rows integer := 0;
  v_ugc_reference_remaining boolean := false;
  v_private_recipe_ids uuid[] := '{}'::uuid[];
  v_deleted_private_rows integer := 0;
  v_households_to_delete uuid[] := '{}'::uuid[];
  v_dependents_to_delete uuid[] := '{}'::uuid[];
begin
  if p_user_id is null or p_operation_id is null then
    raise exception 'invalid_account_deletion_request';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  if not exists (
    select 1 from public.kwilt_account_deletion_operations operation
    where operation.operation_id = p_operation_id
      and operation.user_id = p_user_id
      and operation.status <> 'complete'
  ) then
    raise exception 'account_deletion_operation_unavailable';
  end if;

  select binding.person_id into v_person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = p_user_id
  limit 1;

  if v_person_id is not null then
    for v_membership in
      select membership.*
      from public.kwilt_household_memberships membership
      where membership.person_id = v_person_id and membership.status = 'active'
      order by membership.joined_at, membership.id
      for update
    loop
      select candidate, binding.user_id
        into v_successor, v_successor_user_id
      from public.kwilt_household_memberships candidate
      join public.kwilt_people person on person.id = candidate.person_id and person.kind = 'adult'
      join public.kwilt_person_auth_bindings binding
        on binding.person_id = candidate.person_id and binding.status = 'active'
      where candidate.household_id = v_membership.household_id
        and candidate.id <> v_membership.id
        and candidate.status = 'active'
      order by candidate.joined_at, candidate.id
      limit 1;

      if v_successor.id is null then
        v_households_to_delete := pg_catalog.array_append(v_households_to_delete, v_membership.household_id);
        select v_dependents_to_delete || coalesce(pg_catalog.array_agg(person.id), '{}'::uuid[])
          into v_dependents_to_delete
        from public.kwilt_household_memberships member
        join public.kwilt_people person on person.id = member.person_id and person.kind = 'dependent'
        where member.household_id = v_membership.household_id;
      else
        update public.kwilt_household_memberships
          set status = 'removed', removed_at = coalesce(removed_at, now()), updated_at = now()
          where id = v_membership.id;

        if v_membership.role = 'owner' then
          update public.kwilt_household_memberships
            set role = 'owner', updated_at = now()
            where id = v_successor.id;
        end if;

        update public.kwilt_households
          set created_by_user_id = case
                when created_by_user_id = p_user_id then v_successor_user_id
                else created_by_user_id
              end,
              updated_at = now()
          where id = v_membership.household_id;

        update public.kwilt_people person
          set created_by_user_id = v_successor_user_id,
              updated_at = now()
          where person.created_by_user_id = p_user_id
            and exists (
              select 1 from public.kwilt_household_memberships retained
              where retained.household_id = v_membership.household_id
                and retained.person_id = person.id
                and retained.status = 'active'
            );

        -- Shared meal-planning artifacts remain with the surviving Household,
        -- but all live stewardship moves to the authenticated adult successor.
        update public.kwilt_meal_plans
          set organizer_membership_id = v_successor.id,
              organizer_person_id = v_successor.person_id,
              updated_at = now()
          where household_id = v_membership.household_id
            and organizer_person_id = v_person_id;

        update public.kwilt_meal_plan_candidates candidate
          set suggested_by_person_id = v_successor.person_id
          from public.kwilt_meal_plans plan
          where candidate.plan_id = plan.id
            and plan.household_id = v_membership.household_id
            and candidate.suggested_by_person_id = v_person_id;

        update public.kwilt_meal_choice_participants participant
          set state = 'removed', settled_at = coalesce(settled_at, now())
          from public.kwilt_meal_choice_rounds round_row
          join public.kwilt_meal_plans plan on plan.id = round_row.plan_id
          where participant.round_id = round_row.id
            and plan.household_id = v_membership.household_id
            and participant.person_id = v_person_id;

        delete from public.kwilt_meal_candidate_reactions reaction
          using public.kwilt_meal_plan_candidates candidate, public.kwilt_meal_plans plan
          where reaction.candidate_id = candidate.id
            and candidate.plan_id = plan.id
            and plan.household_id = v_membership.household_id
            and reaction.person_id = v_person_id;

        update public.kwilt_meal_planner_preferences
          set updated_by_person_id = v_successor.person_id, updated_at = now()
          where household_id = v_membership.household_id
            and updated_by_person_id = v_person_id;

        delete from public.kwilt_person_food_needs
          where household_id = v_membership.household_id and person_id = v_person_id;
        update public.kwilt_person_food_needs
          set created_by_person_id = v_successor.person_id, updated_at = now()
          where household_id = v_membership.household_id
            and created_by_person_id = v_person_id;

        update public.kwilt_guest_meal_feedback_invites invite
          set created_by_person_id = v_successor.person_id
          from public.kwilt_meal_plans plan
          where invite.plan_id = plan.id
            and plan.household_id = v_membership.household_id
            and invite.created_by_person_id = v_person_id;

        update public.kwilt_meal_plan_candidates candidate
          set sent_by_person_id = case when candidate.sent_by_person_id = v_person_id then v_successor.person_id else candidate.sent_by_person_id end,
              resolved_by_person_id = case when candidate.resolved_by_person_id = v_person_id then v_successor.person_id else candidate.resolved_by_person_id end
          from public.kwilt_meal_plans plan
          where candidate.plan_id = plan.id
            and plan.household_id = v_membership.household_id
            and (candidate.sent_by_person_id = v_person_id or candidate.resolved_by_person_id = v_person_id);
        v_transferred_households := v_transferred_households + 1;
      end if;

      v_successor := null;
      v_successor_user_id := null;
    end loop;

    -- Person-owned Grocery and thrift data is private, even when compiled from
    -- a shared Meal Plan. Remove dependent rows from the leaves inward.
    delete from public.kwilt_retailer_handoff_items receipt
      using public.kwilt_grocery_items item, public.kwilt_grocery_lists list
      where receipt.grocery_item_id = item.id
        and item.grocery_list_id = list.id
        and list.owner_person_id = v_person_id;
    delete from public.kwilt_retailer_handoffs handoff
      using public.kwilt_grocery_lists list
      where handoff.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_savings_outcomes outcome
      using public.kwilt_grocery_savings_plans plan
      where outcome.savings_plan_id = plan.id and plan.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_savings_outcomes outcome
      using public.kwilt_grocery_receipt_evidence receipt
      where outcome.receipt_evidence_id = receipt.id and receipt.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_savings_plans where owner_person_id = v_person_id;
    delete from public.kwilt_grocery_receipt_evidence where owner_person_id = v_person_id;
    delete from public.kwilt_grocery_price_quotes quote
      using public.kwilt_grocery_product_mappings mapping, public.kwilt_grocery_lists list
      where quote.product_mapping_id = mapping.id
        and mapping.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_offers offer
      using public.kwilt_grocery_product_mappings mapping, public.kwilt_grocery_lists list
      where offer.product_mapping_id = mapping.id
        and mapping.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_product_mappings mapping
      using public.kwilt_grocery_lists list
      where mapping.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_rebase_conflicts conflict
      using public.kwilt_grocery_lists list
      where conflict.from_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_rebase_conflicts where owner_person_id = v_person_id;
    delete from public.kwilt_grocery_item_corrections correction
      using public.kwilt_grocery_items item, public.kwilt_grocery_lists list
      where correction.grocery_item_id = item.id
        and item.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_item_sources source
      using public.kwilt_grocery_items item, public.kwilt_grocery_lists list
      where source.grocery_item_id = item.id
        and item.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    delete from public.kwilt_grocery_items item
      using public.kwilt_grocery_lists list
      where item.grocery_list_id = list.id and list.owner_person_id = v_person_id;
    update public.kwilt_grocery_lists
      set rebased_from_list_id = null, rebased_from_revision = null
      where rebased_from_list_id in (
        select id from public.kwilt_grocery_lists where owner_person_id = v_person_id
      );
    delete from public.kwilt_grocery_lists where owner_person_id = v_person_id;

    delete from public.kwilt_food_scenario_applications where owner_person_id = v_person_id;
    delete from public.kwilt_food_scenarios where owner_person_id = v_person_id;
    delete from public.kwilt_food_stock_observations where owner_person_id = v_person_id;
    delete from public.kwilt_store_opportunities where owner_person_id = v_person_id;
    delete from public.kwilt_food_cycle_constraints where owner_person_id = v_person_id;

    -- Cooking journals, imports, favorites, and hides are always private.
    delete from public.kwilt_recipe_cook_substitutions where owner_person_id = v_person_id;
    delete from public.kwilt_recipe_cook_records where owner_person_id = v_person_id;
    delete from public.kwilt_recipe_cook_sessions where owner_person_id = v_person_id;
    delete from public.kwilt_recipe_import_drafts where owner_person_id = v_person_id;
    delete from public.kwilt_recipe_access_grants where grantee_person_id = v_person_id;
    delete from public.kwilt_recipe_favorites where person_id = v_person_id;
    delete from public.kwilt_hidden_recipes where person_id = v_person_id;

    -- Delete only recipes that have no public publication, no surviving active
    -- grantee, no other person's cook history, and no downstream lineage or
    -- Grocery reference. Shared/public recipes retain a de-identified author.
    select coalesce(pg_catalog.array_agg(recipe.id), '{}'::uuid[])
      into v_private_recipe_ids
    from public.kwilt_recipes recipe
    where recipe.owner_person_id = v_person_id
      and not exists (select 1 from public.kwilt_recipe_publications publication where publication.recipe_id = recipe.id)
      and not exists (
        select 1 from public.kwilt_recipe_access_grants access_grant
        where access_grant.recipe_id = recipe.id
          and access_grant.status = 'active'
          and access_grant.grantee_person_id <> v_person_id
      )
      and not exists (
        select 1 from public.kwilt_recipe_cook_sessions cook
        where cook.recipe_id = recipe.id and cook.owner_person_id <> v_person_id
      )
      and not exists (
        select 1 from public.kwilt_recipe_lineage lineage
        join public.kwilt_recipe_versions downstream on downstream.id = lineage.recipe_version_id
        join public.kwilt_recipes downstream_recipe on downstream_recipe.id = downstream.recipe_id
        where lineage.source_recipe_id = recipe.id and downstream_recipe.owner_person_id <> v_person_id
      )
      and not exists (
        select 1 from public.kwilt_grocery_item_sources source
        join public.kwilt_recipe_versions version_row on version_row.id = source.recipe_version_id
        join public.kwilt_grocery_items item on item.id = source.grocery_item_id
        join public.kwilt_grocery_lists list on list.id = item.grocery_list_id
        where version_row.recipe_id = recipe.id and list.owner_person_id <> v_person_id
      );

    if pg_catalog.cardinality(v_private_recipe_ids) > 0 then
      delete from public.kwilt_recipe_collaboration_action_receipts where recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_access_grants where recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_import_drafts where target_recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_equipment_requirements requirement
        using public.kwilt_recipe_versions version_row
        where requirement.recipe_version_id = version_row.id and version_row.recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_lineage lineage
        using public.kwilt_recipe_versions version_row
        where lineage.recipe_version_id = version_row.id and version_row.recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_provenance provenance
        using public.kwilt_recipe_versions version_row
        where provenance.recipe_version_id = version_row.id and version_row.recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_credits credit
        using public.kwilt_recipe_versions version_row
        where credit.recipe_version_id = version_row.id and version_row.recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_instructions instruction
        using public.kwilt_recipe_versions version_row
        where instruction.recipe_version_id = version_row.id and version_row.recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_ingredients ingredient
        using public.kwilt_recipe_versions version_row
        where ingredient.recipe_version_id = version_row.id and version_row.recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_media_assets where recipe_id = any(v_private_recipe_ids);
      update public.kwilt_recipes set current_version_id = null where id = any(v_private_recipe_ids);
      delete from public.kwilt_recipe_versions where recipe_id = any(v_private_recipe_ids);
      delete from public.kwilt_recipes where id = any(v_private_recipe_ids);
      get diagnostics v_deleted_private_rows = row_count;
    end if;

    if pg_catalog.cardinality(v_households_to_delete) > 0 then
      delete from public.kwilt_households where id = any(v_households_to_delete);
      get diagnostics v_deleted_households = row_count;
    end if;
    if pg_catalog.cardinality(v_dependents_to_delete) > 0 then
      if pg_catalog.to_regclass('public.kwilt_ugc_reports') is not null then
        execute 'update public.kwilt_ugc_reports set reported_person_id = null where reported_person_id = any($1)'
          using v_dependents_to_delete;
      end if;
      delete from public.kwilt_people where id = any(v_dependents_to_delete);
    end if;

    update public.kwilt_people
      set display_name = 'Former member',
          created_by_user_id = null,
          managed_avatar_storage_path = null,
          updated_at = now()
      where id = v_person_id;

    delete from public.kwilt_person_auth_bindings where user_id = p_user_id;
  end if;

  -- Remove identity history rather than leaving a deleted account's email in
  -- the install audit table after its nullable user reference is cleared.
  delete from public.kwilt_install_identities where user_id = p_user_id;

  delete from public.kwilt_friendships
    where user_a = p_user_id or user_b = p_user_id;

  update public.kwilt_family_screen_time_access_requests
    set requested_by_user_id = null
    where requested_by_user_id = p_user_id;
  get diagnostics v_deidentified_audit_rows = row_count;

  update public.kwilt_family_screen_time_operations
    set actor_user_id = null
    where actor_user_id = p_user_id;
  get diagnostics v_changed_rows = row_count;
  v_deidentified_audit_rows := v_deidentified_audit_rows + v_changed_rows;

  if pg_catalog.to_regclass('public.kwilt_ugc_reports') is not null then
    execute 'update public.kwilt_ugc_reports set reporter_user_id = null where reporter_user_id = $1'
      using p_user_id;
    get diagnostics v_changed_rows = row_count;
    v_deidentified_audit_rows := v_deidentified_audit_rows + v_changed_rows;

    execute 'update public.kwilt_ugc_reports set reported_user_id = null where reported_user_id = $1'
      using p_user_id;
    get diagnostics v_changed_rows = row_count;
    v_deidentified_audit_rows := v_deidentified_audit_rows + v_changed_rows;

    execute 'select exists (select 1 from public.kwilt_ugc_reports where reporter_user_id = $1 or reported_user_id = $1)'
      into v_ugc_reference_remaining using p_user_id;
  end if;

  if exists (select 1 from public.kwilt_people where created_by_user_id = p_user_id)
    or exists (select 1 from public.kwilt_households where created_by_user_id = p_user_id)
    or exists (select 1 from public.kwilt_friendships where initiated_by = p_user_id or blocked_by = p_user_id)
    or exists (select 1 from public.kwilt_family_screen_time_access_requests where requested_by_user_id = p_user_id)
    or exists (select 1 from public.kwilt_family_screen_time_operations where actor_user_id = p_user_id)
    or v_ugc_reference_remaining
  then
    raise exception 'account_deletion_reference_remaining';
  end if;

  if v_person_id is not null and (
    exists (select 1 from public.kwilt_grocery_lists where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_grocery_provider_accounts where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_food_cycle_constraints where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_food_stock_observations where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_store_opportunities where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_food_scenarios where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_food_scenario_applications where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_recipe_cook_sessions where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_recipe_cook_records where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_recipe_cook_substitutions where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_recipe_import_drafts where owner_person_id = v_person_id)
    or exists (select 1 from public.kwilt_recipe_favorites where person_id = v_person_id)
    or exists (select 1 from public.kwilt_hidden_recipes where person_id = v_person_id)
  ) then
    raise exception 'account_deletion_private_data_remaining';
  end if;

  return jsonb_build_object(
    'transferredHouseholds', v_transferred_households,
    'deletedHouseholds', v_deleted_households,
    'deidentifiedAuditRows', v_deidentified_audit_rows,
    'deletedPrivateRecipes', v_deleted_private_rows
  );
end;
$$;

revoke all on function public.prepare_kwilt_account_deletion(uuid, uuid) from public, anon, authenticated;
grant execute on function public.prepare_kwilt_account_deletion(uuid, uuid) to service_role;

-- Mature the shared Meal Cart into one persistent household Plan. Historical
-- finalized plans remain readable; the Recipes Plan stays an open draft and
-- moves individual Recipe occurrences through grocery-driven lifecycle states.

alter table public.kwilt_meal_plan_candidates
  add column lifecycle_state text not null default 'idea'
    check (lifecycle_state in ('idea','sent','made','removed')),
  add column sent_at timestamptz,
  add column sent_by_person_id uuid references public.kwilt_people(id) on delete restrict,
  add column resolved_at timestamptz,
  add column resolved_by_person_id uuid references public.kwilt_people(id) on delete restrict,
  add column removed_grocery_behavior text
    check (removed_grocery_behavior is null or removed_grocery_behavior in ('removed','kept')),
  add column lifecycle_updated_at timestamptz not null default now();

alter table public.kwilt_meal_plan_candidates
  add constraint kwilt_meal_candidate_lifecycle_shape check (
    (lifecycle_state='idea' and sent_at is null and sent_by_person_id is null and resolved_at is null and resolved_by_person_id is null and removed_grocery_behavior is null)
    or (lifecycle_state='sent' and sent_at is not null and sent_by_person_id is not null and resolved_at is null and resolved_by_person_id is null and removed_grocery_behavior is null)
    or (lifecycle_state='made' and resolved_at is not null and resolved_by_person_id is not null and removed_grocery_behavior is null)
    or (lifecycle_state='removed' and resolved_at is not null and resolved_by_person_id is not null and removed_grocery_behavior is not null)
  );

create index kwilt_meal_plan_candidates_active_lifecycle_idx
  on public.kwilt_meal_plan_candidates(plan_id,lifecycle_state,lifecycle_updated_at desc);

alter table public.kwilt_grocery_lists
  add column source_household_id uuid references public.kwilt_households(id) on delete restrict;

alter table public.kwilt_grocery_lists
  drop constraint kwilt_grocery_lists_source_kind_check,
  drop constraint kwilt_grocery_lists_source_scope_check,
  add constraint kwilt_grocery_lists_source_kind_check
    check (source_kind in ('meal_plan','household_plan','recipe_version')),
  add constraint kwilt_grocery_lists_source_scope_check check (
    (source_kind='meal_plan'
      and source_household_id is null
      and source_meal_plan_id is not null
      and source_meal_plan_version is not null
      and source_recipe_id is null
      and source_recipe_version_id is null
      and source_recipe_version is null
      and source_title is null
      and source_servings is null
      and source_recipe_snapshot is null)
    or
    (source_kind='household_plan'
      and source_household_id is not null
      and source_meal_plan_id is not null
      and source_meal_plan_version is not null
      and source_recipe_id is null
      and source_recipe_version_id is null
      and source_recipe_version is null
      and source_title is null
      and source_servings is null
      and source_recipe_snapshot is null)
    or
    (source_kind='recipe_version'
      and source_household_id is null
      and source_meal_plan_id is null
      and source_meal_plan_version is null
      and source_recipe_id is not null
      and source_recipe_version_id is not null
      and source_recipe_version is not null
      and source_title is not null
      and source_servings is not null
      and source_recipe_snapshot is not null)
  );

create index kwilt_grocery_lists_household_plan_idx
  on public.kwilt_grocery_lists(source_household_id,updated_at desc)
  where source_kind='household_plan';

alter table public.kwilt_grocery_item_sources
  add column plan_candidate_id uuid references public.kwilt_meal_plan_candidates(id) on delete restrict,
  add column contribution_quantity_min numeric check (contribution_quantity_min is null or contribution_quantity_min>=0),
  add column contribution_quantity_max numeric check (contribution_quantity_max is null or contribution_quantity_max>=0),
  add column contribution_unit text check (contribution_unit is null or char_length(contribution_unit)<=80),
  add column contribution_optional boolean;

create index kwilt_grocery_item_sources_candidate_idx
  on public.kwilt_grocery_item_sources(plan_candidate_id,grocery_item_id)
  where plan_candidate_id is not null;

create or replace function public.kwilt_can_manage_household_plan(p_plan_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.kwilt_meal_plans plan
    cross join lateral public.kwilt_shared_meal_cart_membership(plan.household_id) actor
    where plan.id=p_plan_id and actor.role in ('owner','caregiver')
  )
$$;

create or replace function public.kwilt_can_read_grocery_list(p_list_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.kwilt_grocery_lists list
    where list.id=p_list_id and list.status<>'archived' and (
      list.owner_person_id=public.kwilt_current_person_id()
      or (list.source_kind='household_plan' and exists(
        select 1 from public.kwilt_shared_meal_cart_membership(list.source_household_id) actor where actor.id is not null
      ))
    )
  )
$$;

create or replace function public.add_kwilt_shared_meal_candidate(p_household_id uuid,p_candidate_id uuid,p_candidate jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_owner public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_existing public.kwilt_meal_plan_candidates; v_kind text:=coalesce(p_candidate->>'kind','meal_note'); v_title text:=btrim(coalesce(p_candidate->>'title','')); v_snapshot jsonb:=p_candidate->'recipeSnapshot'; v_position integer; v_active_count integer;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if p_candidate_id is null or jsonb_typeof(p_candidate)<>'object' or v_kind not in ('recipe','meal_note') or char_length(v_title) not between 1 and 160 or ((v_kind='recipe')<>(jsonb_typeof(v_snapshot)='object')) then raise exception 'invalid_meal_candidate'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household_id::text,2086));
  select * into v_existing from public.kwilt_meal_plan_candidates where id=p_candidate_id;
  if v_existing.id is not null then
    if v_existing.suggested_by_person_id<>v_actor.person_id or v_existing.title<>v_title or v_existing.kind<>v_kind or v_existing.recipe_snapshot is distinct from v_snapshot then raise exception 'shared_meal_candidate_idempotency_conflict'; end if;
    return jsonb_build_object('planId',v_existing.plan_id,'candidateId',v_existing.id,'replayed',true);
  end if;
  select * into v_plan from public.kwilt_meal_plans plan where plan.household_id=p_household_id and plan.state='draft' order by plan.updated_at desc,plan.created_at desc limit 1 for update;
  if v_plan.id is null then
    select * into v_owner from public.kwilt_household_memberships membership where membership.household_id=p_household_id and membership.status='active' and membership.role='owner';
    if v_owner.id is null then raise exception 'meal_plan_organizer_required'; end if;
    insert into public.kwilt_meal_plans(household_id,organizer_membership_id,organizer_person_id,horizon) values(p_household_id,v_owner.id,v_owner.person_id,jsonb_build_object('kind','open')) returning * into v_plan;
  end if;
  select count(*)::integer into v_active_count from public.kwilt_meal_plan_candidates where plan_id=v_plan.id and lifecycle_state in ('idea','sent');
  select coalesce(max(position),-1)+1 into v_position from public.kwilt_meal_plan_candidates where plan_id=v_plan.id;
  if v_active_count>=60 then raise exception 'invalid_meal_candidates'; end if;
  insert into public.kwilt_meal_plan_candidates(id,plan_id,position,kind,title,recipe_snapshot,suggested_by_person_id) values(p_candidate_id,v_plan.id,v_position,v_kind,v_title,v_snapshot,v_actor.person_id);
  insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id) values(p_candidate_id,v_actor.person_id);
  update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=v_plan.id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'candidateId',p_candidate_id,'version',v_plan.version,'replayed',false);
end;
$$;

create or replace function public.set_kwilt_shared_meal_reaction(p_candidate_id uuid,p_reacted boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_candidate public.kwilt_meal_plan_candidates;
begin
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state<>'draft' or v_candidate.lifecycle_state not in ('idea','sent') then raise exception 'meal_plan_candidate_not_active'; end if;
  if v_candidate.suggested_by_person_id=v_actor.person_id and not p_reacted then raise exception 'cannot_remove_contributor_support'; end if;
  if p_reacted then insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id) values(p_candidate_id,v_actor.person_id) on conflict(candidate_id,person_id) do nothing;
  else delete from public.kwilt_meal_candidate_reactions where candidate_id=p_candidate_id and person_id=v_actor.person_id; end if;
  return jsonb_build_object('candidateId',p_candidate_id,'reacted',p_reacted);
end;
$$;

revoke execute on function public.kwilt_can_manage_household_plan(uuid),public.kwilt_can_read_grocery_list(uuid) from public,anon,authenticated;
grant execute on function public.kwilt_can_manage_household_plan(uuid),public.kwilt_can_read_grocery_list(uuid) to authenticated;

drop policy kwilt_grocery_lists_owner_read on public.kwilt_grocery_lists;
create policy kwilt_grocery_lists_authorized_read on public.kwilt_grocery_lists
  for select to authenticated using(public.kwilt_can_read_grocery_list(id));
drop policy kwilt_grocery_items_owner_read on public.kwilt_grocery_items;
create policy kwilt_grocery_items_authorized_read on public.kwilt_grocery_items
  for select to authenticated using(public.kwilt_can_read_grocery_list(grocery_list_id));
drop policy kwilt_grocery_sources_owner_read on public.kwilt_grocery_item_sources;
create policy kwilt_grocery_sources_authorized_read on public.kwilt_grocery_item_sources
  for select to authenticated using(exists(
    select 1 from public.kwilt_grocery_items item
    where item.id=grocery_item_id and public.kwilt_can_read_grocery_list(item.grocery_list_id)
  ));
drop policy kwilt_grocery_corrections_owner_read on public.kwilt_grocery_item_corrections;
create policy kwilt_grocery_corrections_authorized_read on public.kwilt_grocery_item_corrections
  for select to authenticated using(exists(
    select 1 from public.kwilt_grocery_items item
    where item.id=grocery_item_id and public.kwilt_can_read_grocery_list(item.grocery_list_id)
  ));

create or replace function public.get_kwilt_shared_meal_cart(p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_list public.kwilt_grocery_lists;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  select * into v_plan from public.kwilt_meal_plans plan
    where plan.household_id=p_household_id and plan.state='draft'
    order by plan.updated_at desc,plan.created_at desc limit 1;
  -- A finalized legacy plan is history, not the household's active shortlist.
  -- The first new nomination creates the persistent open Plan.
  if v_plan.id is not null then
    select * into v_list from public.kwilt_grocery_lists list
      where list.source_kind='household_plan' and list.source_meal_plan_id=v_plan.id and list.status<>'stale'
      order by list.revision desc,list.updated_at desc limit 1;
  end if;
  return jsonb_build_object(
    'planId',v_plan.id,'householdId',p_household_id,'version',v_plan.version,'state',v_plan.state,
    'activeCount',case when v_plan.id is null then 0 else (select count(*) from public.kwilt_meal_plan_candidates c where c.plan_id=v_plan.id and c.lifecycle_state in ('idea','sent')) end,
    'groceryListId',v_list.id,
    'viewer',jsonb_build_object('personId',v_actor.person_id,'role',v_actor.role,'canAdd',true,'canManage',v_actor.role in ('owner','caregiver')),
    'candidates',case when v_plan.id is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(candidate_json order by group_rank,vote_count desc,created_at desc),'[]'::jsonb)
      from (
        select candidate.created_at,
          case when candidate.lifecycle_state='sent' and missing_count=0 then 0 when candidate.lifecycle_state='sent' then 1 else 2 end group_rank,
          reaction_data.vote_count,
          jsonb_build_object(
            'id',candidate.id,'kind',candidate.kind,'title',candidate.title,'recipeSnapshot',candidate.recipe_snapshot,
            'position',candidate.position,'createdAt',candidate.created_at,'lifecycle',case when candidate.lifecycle_state='idea' then 'idea' when missing_count=0 then 'ready' else 'sent' end,
            'sentAt',candidate.sent_at,'missingItemCount',case when candidate.lifecycle_state='sent' then missing_count else null end,
            'voteCount',reaction_data.vote_count,
            'contributor',jsonb_build_object('personId',contributor.id,'displayName',contributor.display_name,'avatarUrl',null),
            'supporters',reaction_data.supporters,'viewerReacted',reaction_data.viewer_reacted,
            'canReact',v_plan.state='draft','canRemove',v_plan.state='draft' and v_actor.role in ('owner','caregiver'),
            'canMarkMade',v_plan.state='draft' and candidate.lifecycle_state='sent' and v_actor.role in ('owner','caregiver')
          ) candidate_json
        from public.kwilt_meal_plan_candidates candidate
        join public.kwilt_people contributor on contributor.id=candidate.suggested_by_person_id
        cross join lateral (
          select count(*)::integer vote_count,
            coalesce(jsonb_agg(jsonb_build_object('personId',supporter.id,'displayName',supporter.display_name,'avatarUrl',null) order by reaction.created_at,supporter.display_name),'[]'::jsonb) supporters,
            coalesce(bool_or(reaction.person_id=v_actor.person_id),false) viewer_reacted
          from public.kwilt_meal_candidate_reactions reaction join public.kwilt_people supporter on supporter.id=reaction.person_id
          where reaction.candidate_id=candidate.id
        ) reaction_data
        cross join lateral (
          select count(distinct item.id)::integer missing_count
          from public.kwilt_grocery_item_sources source join public.kwilt_grocery_items item on item.id=source.grocery_item_id
          where source.plan_candidate_id=candidate.id and item.grocery_list_id=v_list.id
            and coalesce(source.contribution_optional,false)=false and item.state not in ('purchased','already_have')
        ) readiness
        where candidate.plan_id=v_plan.id and candidate.lifecycle_state in ('idea','sent')
      ) projection
    ) end
  );
end;
$$;

create or replace function public.withdraw_kwilt_shared_meal_candidate(p_candidate_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_candidate public.kwilt_meal_plan_candidates;
begin
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id for update;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id for update;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state<>'draft' or v_candidate.lifecycle_state<>'idea' then raise exception 'meal_plan_candidate_not_removable_as_idea'; end if;
  if v_actor.role not in ('owner','caregiver') then raise exception 'shared_meal_candidate_remove_forbidden'; end if;
  update public.kwilt_meal_plan_candidates set lifecycle_state='removed',resolved_at=now(),resolved_by_person_id=v_actor.person_id,removed_grocery_behavior='removed',lifecycle_updated_at=now() where id=p_candidate_id;
  update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=v_plan.id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'candidateId',p_candidate_id,'version',v_plan.version,'state','removed');
end;
$$;

create or replace function public.remove_kwilt_sent_plan_candidate_keep_groceries(p_candidate_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_candidate public.kwilt_meal_plan_candidates;
begin
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id for update;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id for update;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null or v_actor.role not in ('owner','caregiver') then raise exception 'shared_meal_candidate_remove_forbidden'; end if;
  if v_plan.state<>'draft' or v_plan.version<>p_expected_version or v_candidate.lifecycle_state<>'sent' then raise exception 'stale_plan_candidate'; end if;
  update public.kwilt_meal_plan_candidates set lifecycle_state='removed',resolved_at=now(),resolved_by_person_id=v_actor.person_id,removed_grocery_behavior='kept',lifecycle_updated_at=now() where id=p_candidate_id;
  update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=v_plan.id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'candidateId',p_candidate_id,'version',v_plan.version,'state','removed','groceryBehavior','kept');
end;
$$;

create or replace function public.mark_kwilt_plan_candidate_made(p_candidate_id uuid,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_candidate public.kwilt_meal_plan_candidates;
begin
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id for update;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id for update;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null or v_actor.role not in ('owner','caregiver') then raise exception 'shared_meal_candidate_resolve_forbidden'; end if;
  if v_plan.state<>'draft' or v_plan.version<>p_expected_version or v_candidate.lifecycle_state<>'sent' then raise exception 'stale_plan_candidate'; end if;
  update public.kwilt_meal_plan_candidates set lifecycle_state='made',resolved_at=now(),resolved_by_person_id=v_actor.person_id,lifecycle_updated_at=now() where id=p_candidate_id;
  update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=v_plan.id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'candidateId',p_candidate_id,'version',v_plan.version,'state','made');
end;
$$;

-- Server-only authority called after the grocery compiler validates immutable
-- Recipe snapshots. Every revision is preserved; only the latest remains active.
create or replace function public.sync_kwilt_household_plan_groceries(
  p_actor_person_id uuid,p_plan_id uuid,p_expected_version integer,p_action text,
  p_candidate_ids uuid[],p_payload_hash text,p_compiled_items jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_previous public.kwilt_grocery_lists; v_list public.kwilt_grocery_lists; v_candidate_id uuid; v_item jsonb; v_source jsonb; v_item_id uuid; v_position bigint; v_revision integer; v_old_item public.kwilt_grocery_items; v_old_state text; v_old_note text;
begin
  if p_action not in ('send','remove') or coalesce(cardinality(p_candidate_ids),0)<1 or char_length(coalesce(p_payload_hash,'')) not between 1 and 256 or jsonb_typeof(p_compiled_items)<>'array' or jsonb_array_length(p_compiled_items)>500 then raise exception 'invalid_household_plan_grocery_sync'; end if;
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id for update;
  select * into v_actor from public.kwilt_household_memberships where household_id=v_plan.household_id and person_id=p_actor_person_id and status='active' and role in ('owner','caregiver') limit 1;
  if v_actor.id is null then raise exception 'household_plan_grocery_manage_forbidden'; end if;
  if v_plan.state<>'draft' or v_plan.version<>p_expected_version then raise exception 'stale_household_plan'; end if;
  foreach v_candidate_id in array p_candidate_ids loop
    if not exists(select 1 from public.kwilt_meal_plan_candidates candidate where candidate.id=v_candidate_id and candidate.plan_id=p_plan_id and candidate.lifecycle_state=case when p_action='send' then 'idea' else 'sent' end) then raise exception 'invalid_household_plan_candidate'; end if;
  end loop;
  select * into v_previous from public.kwilt_grocery_lists list where list.source_kind='household_plan' and list.source_meal_plan_id=p_plan_id and list.status<>'stale' order by list.revision desc limit 1 for update;
  if p_action='send' then
    update public.kwilt_meal_plan_candidates set lifecycle_state='sent',sent_at=now(),sent_by_person_id=p_actor_person_id,lifecycle_updated_at=now() where id=any(p_candidate_ids);
  else
    update public.kwilt_meal_plan_candidates set lifecycle_state='removed',resolved_at=now(),resolved_by_person_id=p_actor_person_id,removed_grocery_behavior='removed',lifecycle_updated_at=now() where id=any(p_candidate_ids);
  end if;
  update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=p_plan_id returning * into v_plan;
  update public.kwilt_grocery_lists set status='stale',updated_at=now() where source_kind='household_plan' and source_meal_plan_id=p_plan_id and status in ('review_needed','ready');
  select coalesce(max(revision),0)+1 into v_revision from public.kwilt_grocery_lists where source_kind='household_plan' and source_meal_plan_id=p_plan_id;
  insert into public.kwilt_grocery_lists(owner_person_id,source_kind,source_household_id,source_meal_plan_id,source_meal_plan_version,revision,status,payload_hash,rebased_from_list_id,rebased_from_revision)
    values(p_actor_person_id,'household_plan',v_plan.household_id,p_plan_id,v_plan.version,v_revision,'review_needed',p_payload_hash,v_previous.id,v_previous.revision) returning * into v_list;
  for v_item,v_position in select value,ordinality from jsonb_array_elements(p_compiled_items) with ordinality loop
    if char_length(btrim(coalesce(v_item->>'concept',''))) not between 1 and 320 or jsonb_typeof(coalesce(v_item->'sources','[]'::jsonb))<>'array' then raise exception 'invalid_grocery_item'; end if;
    v_old_state:='needed'; v_old_note:=null;
    if v_previous.id is not null then
      select old_item.state,old_item.note into v_old_state,v_old_note from public.kwilt_grocery_items old_item
      where old_item.grocery_list_id=v_previous.id and old_item.concept=btrim(v_item->>'concept') and old_item.unit is not distinct from (v_item->>'unit') and old_item.preparation is not distinct from (v_item->>'preparation')
      order by case old_item.state when 'purchased' then 0 when 'already_have' then 1 else 2 end,old_item.position limit 1;
    end if;
    insert into public.kwilt_grocery_items(grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,package_unit,preparation,optional,aisle,original_display_texts,review_reason,state,note)
      values(v_list.id,v_position-1,btrim(v_item->>'concept'),nullif(v_item->>'quantityMin','')::numeric,nullif(v_item->>'quantityMax','')::numeric,v_item->>'unit',nullif(v_item->>'packageQuantity','')::numeric,v_item->>'packageUnit',v_item->>'preparation',coalesce((v_item->>'optional')::boolean,false),coalesce(v_item->>'aisle','other'),coalesce(v_item->'originalDisplayTexts','[]'::jsonb),v_item->>'reviewReason',coalesce(v_old_state,'needed'),v_old_note) returning id into v_item_id;
    for v_source in select value from jsonb_array_elements(v_item->'sources') loop
      v_candidate_id:=(v_source->>'planCandidateId')::uuid;
      if not exists(select 1 from public.kwilt_meal_plan_candidates candidate where candidate.id=v_candidate_id and candidate.plan_id=p_plan_id and (candidate.lifecycle_state='sent' or (candidate.lifecycle_state='removed' and candidate.removed_grocery_behavior='kept')) and candidate.recipe_snapshot->>'recipeVersionId'=v_source->>'recipeVersionId') then raise exception 'invalid_grocery_source'; end if;
      if v_source->>'kind'='catalog_recipe_ingredient' then
        if not exists(select 1 from public.kwilt_meal_plan_candidates candidate,jsonb_array_elements(coalesce(candidate.recipe_snapshot->'ingredients','[]'::jsonb)) ingredient where candidate.id=v_candidate_id and ingredient->>'id'=v_source->>'ingredientLineId' and ingredient->>'originalText'=v_source->>'originalText') then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,plan_candidate_id,contribution_quantity_min,contribution_quantity_max,contribution_unit,contribution_optional,source_snapshot)
          values(v_item_id,'catalog_recipe_ingredient',v_candidate_id,nullif(v_source->>'quantityMin','')::numeric,nullif(v_source->>'quantityMax','')::numeric,v_source->>'unit',coalesce((v_source->>'optional')::boolean,false),jsonb_build_object('recipeVersionId',v_source->>'recipeVersionId','ingredientLineId',v_source->>'ingredientLineId','originalText',v_source->>'originalText'));
      elsif v_source->>'kind'='recipe_ingredient' then
        if not exists(select 1 from public.kwilt_recipe_ingredients ingredient where ingredient.id=(v_source->>'ingredientLineId')::uuid and ingredient.recipe_version_id=(v_source->>'recipeVersionId')::uuid and ingredient.original_text=v_source->>'originalText') then raise exception 'invalid_grocery_source'; end if;
        insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,recipe_version_id,ingredient_line_id,plan_candidate_id,contribution_quantity_min,contribution_quantity_max,contribution_unit,contribution_optional,source_snapshot)
          values(v_item_id,'recipe_ingredient',(v_source->>'recipeVersionId')::uuid,(v_source->>'ingredientLineId')::uuid,v_candidate_id,nullif(v_source->>'quantityMin','')::numeric,nullif(v_source->>'quantityMax','')::numeric,v_source->>'unit',coalesce((v_source->>'optional')::boolean,false),jsonb_build_object('originalText',v_source->>'originalText'));
      else raise exception 'invalid_grocery_source'; end if;
    end loop;
  end loop;
  if v_previous.id is not null then
    for v_old_item in select old_item.* from public.kwilt_grocery_items old_item where old_item.grocery_list_id=v_previous.id and exists(select 1 from public.kwilt_grocery_item_sources old_source where old_source.grocery_item_id=old_item.id and old_source.kind in ('manual','household_request')) order by old_item.position loop
      select coalesce(max(position),-1)+1 into v_position from public.kwilt_grocery_items where grocery_list_id=v_list.id;
      insert into public.kwilt_grocery_items(grocery_list_id,position,concept,quantity_min,quantity_max,unit,package_quantity,package_unit,preparation,optional,aisle,original_display_texts,review_reason,state,note)
        values(v_list.id,v_position,v_old_item.concept,v_old_item.quantity_min,v_old_item.quantity_max,v_old_item.unit,v_old_item.package_quantity,v_old_item.package_unit,v_old_item.preparation,v_old_item.optional,v_old_item.aisle,v_old_item.original_display_texts,v_old_item.review_reason,v_old_item.state,v_old_item.note) returning id into v_item_id;
      insert into public.kwilt_grocery_item_sources(grocery_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot)
        select v_item_id,kind,note_id,request_id,requested_by_person_id,source_snapshot||jsonb_build_object('rebasedFromItemId',v_old_item.id) from public.kwilt_grocery_item_sources where grocery_item_id=v_old_item.id and kind in ('manual','household_request');
    end loop;
  end if;
  return jsonb_build_object('planId',p_plan_id,'version',v_plan.version,'groceryListId',v_list.id,'revision',v_list.revision,'status',v_list.status,'action',p_action);
end;
$$;

create or replace function public.set_kwilt_grocery_item_state(p_item_id uuid,p_expected_revision integer,p_state text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_item public.kwilt_grocery_items; v_list public.kwilt_grocery_lists; v_person uuid; v_before jsonb;
begin
  perform public.kwilt_require_permanent_user(); select public.kwilt_current_person_id() into v_person; select * into v_item from public.kwilt_grocery_items where id=p_item_id for update; select * into v_list from public.kwilt_grocery_lists where id=v_item.grocery_list_id for update;
  if not (v_list.owner_person_id=v_person or (v_list.source_kind='household_plan' and exists(select 1 from public.kwilt_shared_meal_cart_membership(v_list.source_household_id) actor where actor.id is not null))) then raise exception 'grocery_list_not_accessible'; end if;
  if v_list.revision<>p_expected_revision or v_list.status='stale' then raise exception 'stale_grocery_list_revision'; end if;
  if p_state not in ('needed','already_have','purchased','skipped') then raise exception 'invalid_grocery_item_state'; end if;
  if v_item.state<>p_state then v_before:=to_jsonb(v_item); update public.kwilt_grocery_items set state=p_state,updated_at=now() where id=p_item_id returning * into v_item; insert into public.kwilt_grocery_item_corrections(grocery_item_id,grocery_list_revision,corrected_by_person_id,before_value,after_value,reason) values(p_item_id,v_list.revision,v_person,v_before,to_jsonb(v_item),'state:user_elected'); end if;
  update public.kwilt_grocery_lists set revision=revision+1,updated_at=now() where id=v_list.id returning * into v_list;
  return jsonb_build_object('groceryListId',v_list.id,'revision',v_list.revision,'itemId',p_item_id,'state',p_state);
end;
$$;

revoke execute on function public.sync_kwilt_household_plan_groceries(uuid,uuid,integer,text,uuid[],text,jsonb) from public,anon,authenticated;
grant execute on function public.sync_kwilt_household_plan_groceries(uuid,uuid,integer,text,uuid[],text,jsonb) to service_role;
revoke execute on function public.remove_kwilt_sent_plan_candidate_keep_groceries(uuid,integer),public.mark_kwilt_plan_candidate_made(uuid,integer) from public,anon;
grant execute on function public.remove_kwilt_sent_plan_candidate_keep_groceries(uuid,integer),public.mark_kwilt_plan_candidate_made(uuid,integer) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kwilt_grocery_lists') then alter publication supabase_realtime add table public.kwilt_grocery_lists; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kwilt_grocery_items') then alter publication supabase_realtime add table public.kwilt_grocery_items; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kwilt_grocery_item_sources') then alter publication supabase_realtime add table public.kwilt_grocery_item_sources; end if;
  end if;
end $$;

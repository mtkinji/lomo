-- Replace implicit nomination support with one explicit positive household
-- reaction per person. Existing non-contributor support is preserved as a
-- thumbs-up; contributor rows created by the old nomination behavior are reset.

alter table public.kwilt_meal_candidate_reactions
  drop constraint if exists kwilt_meal_candidate_reactions_reaction_check;

delete from public.kwilt_meal_candidate_reactions reaction
using public.kwilt_meal_plan_candidates candidate
where candidate.id = reaction.candidate_id
  and candidate.suggested_by_person_id = reaction.person_id;

update public.kwilt_meal_candidate_reactions
set reaction = 'thumbs_up'
where reaction = 'sounds_good';

alter table public.kwilt_meal_candidate_reactions
  alter column reaction drop default,
  add constraint kwilt_meal_candidate_reactions_reaction_check
    check (reaction in ('thumbs_up','heart','yum','excited','fire'));

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
  update public.kwilt_meal_plans set version=version+1,updated_at=now() where id=v_plan.id returning * into v_plan;
  return jsonb_build_object('planId',v_plan.id,'candidateId',p_candidate_id,'version',v_plan.version,'replayed',false);
end;
$$;

drop function if exists public.set_kwilt_shared_meal_reaction(uuid,boolean);

create function public.set_kwilt_shared_meal_reaction(p_candidate_id uuid,p_reaction text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_candidate public.kwilt_meal_plan_candidates;
begin
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state<>'draft' or v_candidate.lifecycle_state not in ('idea','sent') then raise exception 'meal_plan_candidate_not_active'; end if;
  if p_reaction is not null and p_reaction not in ('thumbs_up','heart','yum','excited','fire') then raise exception 'invalid_meal_reaction'; end if;
  if p_reaction is null then
    delete from public.kwilt_meal_candidate_reactions where candidate_id=p_candidate_id and person_id=v_actor.person_id;
  else
    insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id,reaction)
      values(p_candidate_id,v_actor.person_id,p_reaction)
      on conflict(candidate_id,person_id) do update set
        reaction=excluded.reaction,
        created_at=case when public.kwilt_meal_candidate_reactions.reaction is distinct from excluded.reaction then now() else public.kwilt_meal_candidate_reactions.created_at end;
  end if;
  return jsonb_build_object('candidateId',p_candidate_id,'reaction',p_reaction);
end;
$$;

revoke execute on function public.set_kwilt_shared_meal_reaction(uuid,text) from public,anon;
grant execute on function public.set_kwilt_shared_meal_reaction(uuid,text) to authenticated;

create or replace function public.get_kwilt_shared_meal_cart(p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=public.kwilt_require_permanent_user(); v_actor public.kwilt_household_memberships; v_plan public.kwilt_meal_plans; v_list public.kwilt_grocery_lists;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  select * into v_plan from public.kwilt_meal_plans plan
    where plan.household_id=p_household_id and plan.state='draft'
    order by plan.updated_at desc,plan.created_at desc limit 1;
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
            'voteCount',reaction_data.vote_count,'reactionCounts',reaction_data.reaction_counts,
            'contributor',jsonb_build_object('personId',contributor.id,'displayName',contributor.display_name,'avatarUrl',null),
            'supporters',reaction_data.supporters,'viewerReaction',reaction_data.viewer_reaction,
            'canReact',v_plan.state='draft','canRemove',v_plan.state='draft' and v_actor.role in ('owner','caregiver'),
            'canMarkMade',v_plan.state='draft' and candidate.lifecycle_state='sent' and v_actor.role in ('owner','caregiver')
          ) candidate_json
        from public.kwilt_meal_plan_candidates candidate
        join public.kwilt_people contributor on contributor.id=candidate.suggested_by_person_id
        cross join lateral (
          select count(*)::integer vote_count,
            coalesce(jsonb_agg(jsonb_build_object('personId',supporter.id,'displayName',supporter.display_name,'avatarUrl',null,'reaction',reaction.reaction) order by reaction.created_at,supporter.display_name),'[]'::jsonb) supporters,
            max(reaction.reaction) filter(where reaction.person_id=v_actor.person_id) viewer_reaction,
            jsonb_build_object(
              'thumbs_up',count(*) filter(where reaction.reaction='thumbs_up'),
              'heart',count(*) filter(where reaction.reaction='heart'),
              'yum',count(*) filter(where reaction.reaction='yum'),
              'excited',count(*) filter(where reaction.reaction='excited'),
              'fire',count(*) filter(where reaction.reaction='fire')
            ) reaction_counts
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

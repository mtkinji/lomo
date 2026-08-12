-- Expand Plan reactions while keeping one signed response per household member.
-- Ordinary negative reactions remain informational. A hard pass requires an
-- explicit owner/caregiver acknowledgement before that candidate can move to
-- Groceries. The optional reason remains household-visible reaction context.

alter table public.kwilt_meal_candidate_reactions
  add column if not exists reason text;

alter table public.kwilt_meal_candidate_reactions
  drop constraint if exists kwilt_meal_candidate_reactions_reason_check;

alter table public.kwilt_meal_candidate_reactions
  add constraint kwilt_meal_candidate_reactions_reason_check
    check (reason is null or char_length(reason) between 1 and 140);

alter table public.kwilt_meal_candidate_reactions
  drop constraint if exists kwilt_meal_candidate_reactions_reaction_check;

alter table public.kwilt_meal_candidate_reactions
  add constraint kwilt_meal_candidate_reactions_reaction_check
    check (reaction in ('thumbs_up','heart','yum','excited','fire','downvote','uneasy','gross','nope','dislike','hard_pass'));

alter table public.kwilt_meal_plan_candidates
  add column if not exists hard_pass_overridden_at timestamptz,
  add column if not exists hard_pass_overridden_by_person_id uuid references public.kwilt_people(id) on delete set null;

drop function if exists public.set_kwilt_shared_meal_reaction(uuid,text);

create function public.set_kwilt_shared_meal_reaction(
  p_candidate_id uuid,
  p_reaction text,
  p_reason text default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
  v_candidate public.kwilt_meal_plan_candidates;
  v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  perform pg_advisory_xact_lock(hashtextextended(p_candidate_id::text,0));
  select * into v_candidate from public.kwilt_meal_plan_candidates where id=p_candidate_id;
  select * into v_plan from public.kwilt_meal_plans where id=v_candidate.plan_id;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state<>'draft' or v_candidate.lifecycle_state not in ('idea','sent') then raise exception 'meal_plan_candidate_not_active'; end if;
  if p_reaction is not null and p_reaction not in ('thumbs_up','heart','yum','excited','fire','downvote','uneasy','gross','nope','dislike','hard_pass') then raise exception 'invalid_meal_reaction'; end if;
  if char_length(p_reason)>140 then raise exception 'invalid_meal_reaction_reason'; end if;
  if p_reaction is distinct from 'hard_pass' and v_reason is not null then raise exception 'invalid_meal_reaction_reason'; end if;
  if p_reaction is null then
    delete from public.kwilt_meal_candidate_reactions where candidate_id=p_candidate_id and person_id=v_actor.person_id;
  else
    insert into public.kwilt_meal_candidate_reactions(candidate_id,person_id,reaction,reason)
      values(p_candidate_id,v_actor.person_id,p_reaction,case when p_reaction='hard_pass' then v_reason else null end)
      on conflict(candidate_id,person_id) do update set
        reaction=excluded.reaction,
        reason=excluded.reason,
        created_at=case
          when public.kwilt_meal_candidate_reactions.reaction is distinct from excluded.reaction
            or public.kwilt_meal_candidate_reactions.reason is distinct from excluded.reason
          then now()
          else public.kwilt_meal_candidate_reactions.created_at
        end;
  end if;
  return jsonb_build_object('candidateId',p_candidate_id,'reaction',p_reaction,'reason',case when p_reaction='hard_pass' then v_reason else null end);
end;
$$;

revoke execute on function public.set_kwilt_shared_meal_reaction(uuid,text,text) from public,anon;
grant execute on function public.set_kwilt_shared_meal_reaction(uuid,text,text) to authenticated;

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
      select coalesce(jsonb_agg(candidate_json order by group_rank,vote_count desc,downvote_count,created_at desc),'[]'::jsonb)
      from (
        select candidate.created_at,
          case when candidate.lifecycle_state='sent' and missing_count=0 then 0 when candidate.lifecycle_state='sent' then 1 else 2 end group_rank,
          reaction_data.vote_count,reaction_data.downvote_count,
          jsonb_build_object(
            'id',candidate.id,'kind',candidate.kind,'title',candidate.title,'recipeSnapshot',candidate.recipe_snapshot,
            'position',candidate.position,'createdAt',candidate.created_at,'lifecycle',case when candidate.lifecycle_state='idea' then 'idea' when missing_count=0 then 'ready' else 'sent' end,
            'sentAt',candidate.sent_at,'missingItemCount',case when candidate.lifecycle_state='sent' then missing_count else null end,
            'voteCount',reaction_data.vote_count,'downvoteCount',reaction_data.downvote_count,
            'hardPassCount',reaction_data.hard_pass_count,
            'requiresHardPassReview',reaction_data.hard_pass_count>0 and (candidate.hard_pass_overridden_at is null or reaction_data.latest_hard_pass_at>candidate.hard_pass_overridden_at),
            'reactionCounts',reaction_data.reaction_counts,
            'contributor',jsonb_build_object('personId',contributor.id,'displayName',contributor.display_name,'avatarUrl',null),
            'supporters',reaction_data.supporters,'viewerReaction',reaction_data.viewer_reaction,
            'viewerReactionReason',reaction_data.viewer_reaction_reason,
            'canReact',v_plan.state='draft','canRemove',v_plan.state='draft' and v_actor.role in ('owner','caregiver'),
            'canMarkMade',v_plan.state='draft' and candidate.lifecycle_state='sent' and v_actor.role in ('owner','caregiver')
          ) candidate_json
        from public.kwilt_meal_plan_candidates candidate
        join public.kwilt_people contributor on contributor.id=candidate.suggested_by_person_id
        cross join lateral (
          select count(*) filter(where reaction.reaction in ('thumbs_up','heart','yum','excited','fire'))::integer vote_count,
            count(*) filter(where reaction.reaction in ('downvote','uneasy','gross','nope','dislike'))::integer downvote_count,
            count(*) filter(where reaction.reaction = 'hard_pass')::integer hard_pass_count,
            max(reaction.created_at) filter(where reaction.reaction = 'hard_pass') latest_hard_pass_at,
            coalesce(jsonb_agg(jsonb_build_object('personId',supporter.id,'displayName',supporter.display_name,'avatarUrl',null,'reaction',reaction.reaction,'reason',reaction.reason) order by reaction.created_at,supporter.display_name),'[]'::jsonb) supporters,
            max(reaction.reaction) filter(where reaction.person_id=v_actor.person_id) viewer_reaction,
            max(reaction.reason) filter(where reaction.person_id=v_actor.person_id) viewer_reaction_reason,
            jsonb_build_object(
              'thumbs_up',count(*) filter(where reaction.reaction='thumbs_up'),
              'heart',count(*) filter(where reaction.reaction='heart'),
              'yum',count(*) filter(where reaction.reaction='yum'),
              'excited',count(*) filter(where reaction.reaction='excited'),
              'fire',count(*) filter(where reaction.reaction='fire'),
              'downvote',count(*) filter(where reaction.reaction='downvote'),
              'uneasy',count(*) filter(where reaction.reaction='uneasy'),
              'gross',count(*) filter(where reaction.reaction='gross'),
              'nope',count(*) filter(where reaction.reaction='nope'),
              'dislike',count(*) filter(where reaction.reaction='dislike'),
              'hard_pass',count(*) filter(where reaction.reaction='hard_pass')
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

revoke execute on function public.get_kwilt_shared_meal_cart(uuid) from public,anon;
grant execute on function public.get_kwilt_shared_meal_cart(uuid) to authenticated;

create function public.sync_kwilt_household_plan_groceries_with_hard_pass_review(
  p_actor_person_id uuid,
  p_plan_id uuid,
  p_expected_version integer,
  p_action text,
  p_candidate_ids uuid[],
  p_payload_hash text,
  p_compiled_items jsonb,
  p_acknowledge_hard_passes boolean default false
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
  v_candidate_id uuid;
begin
  select * into v_plan from public.kwilt_meal_plans where id=p_plan_id;
  select * into v_actor from public.kwilt_household_memberships
    where household_id=v_plan.household_id and person_id=p_actor_person_id and status='active' limit 1;
  if v_actor.id is null or v_actor.role not in ('owner','caregiver') then
    raise exception 'household_plan_grocery_manage_forbidden';
  end if;

  if p_action='send' then
    foreach v_candidate_id in array p_candidate_ids loop
      perform pg_advisory_xact_lock(hashtextextended(v_candidate_id::text,0));
    end loop;
    if exists(
      select 1
      from public.kwilt_meal_plan_candidates candidate
      join public.kwilt_meal_candidate_reactions reaction
        on reaction.candidate_id=candidate.id and reaction.reaction = 'hard_pass'
      where candidate.plan_id=p_plan_id
        and candidate.id=any(p_candidate_ids)
        and (candidate.hard_pass_overridden_at is null or reaction.created_at>candidate.hard_pass_overridden_at)
    ) then
      if not p_acknowledge_hard_passes then raise exception 'hard_pass_review_required'; end if;
      update public.kwilt_meal_plan_candidates
      set hard_pass_overridden_at=now(),hard_pass_overridden_by_person_id=p_actor_person_id
      where plan_id=p_plan_id and id=any(p_candidate_ids);
    end if;
  end if;

  return public.sync_kwilt_household_plan_groceries(
    p_actor_person_id,p_plan_id,p_expected_version,p_action,p_candidate_ids,p_payload_hash,p_compiled_items
  );
end;
$$;

revoke execute on function public.sync_kwilt_household_plan_groceries_with_hard_pass_review(uuid,uuid,integer,text,uuid[],text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.sync_kwilt_household_plan_groceries_with_hard_pass_review(uuid,uuid,integer,text,uuid[],text,jsonb,boolean) to service_role;

-- Keep Share Plan focused on inviting people. Guest input uses the Plan's
-- ordinary emoji vocabulary and joins the existing meal-row reaction stream.
-- Guest identity remains an unverified label and cannot create a hard pass.

alter table public.kwilt_guest_meal_feedback_responses
  add column candidate_reactions jsonb not null default '{}'::jsonb;

alter table public.kwilt_guest_meal_feedback_responses
  add constraint kwilt_guest_meal_feedback_responses_candidate_reactions_object
    check (jsonb_typeof(candidate_reactions) = 'object');

update public.kwilt_guest_meal_feedback_responses response
set candidate_reactions = coalesce((
  select jsonb_object_agg(candidate_id::text, 'thumbs_up')
  from unnest(response.selected_candidate_ids) candidate_id
), '{}'::jsonb)
where cardinality(response.selected_candidate_ids) > 0
  and response.candidate_reactions = '{}'::jsonb;

create or replace function public.submit_kwilt_guest_meal_reactions(
  p_token text,
  p_guest_key uuid,
  p_display_name text,
  p_candidate_reactions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.kwilt_guest_meal_feedback_invites;
  v_round public.kwilt_meal_choice_rounds;
  v_name text := nullif(btrim(coalesce(p_display_name,'')), '');
  v_reactions jsonb := coalesce(p_candidate_reactions, '{}'::jsonb);
  v_updated_at timestamptz := now();
begin
  if char_length(p_token) not between 32 and 128 then raise exception 'guest_feedback_unavailable'; end if;
  select * into v_invite
  from public.kwilt_guest_meal_feedback_invites
  where token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256')
  for update;
  if v_invite.id is null or v_invite.state <> 'active' or v_invite.expires_at <= now() then
    raise exception 'guest_feedback_unavailable';
  end if;
  select * into v_round from public.kwilt_meal_choice_rounds where id = v_invite.round_id;
  if v_round.state <> 'open' then raise exception 'guest_feedback_unavailable'; end if;
  if char_length(btrim(coalesce(p_display_name,''))) > 80 then raise exception 'invalid_guest_display_name'; end if;
  if jsonb_typeof(v_reactions) <> 'object'
    or v_reactions = '{}'::jsonb
    or (select count(*) from jsonb_each_text(v_reactions)) > 60
  then raise exception 'invalid_guest_reactions'; end if;
  if exists(
    select 1 from jsonb_each_text(v_reactions) reaction(reaction_key,reaction_value)
    where reaction_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or reaction_value not in ('thumbs_up','heart','yum','excited','fire','downvote','uneasy','gross','nope','dislike')
  ) then raise exception 'invalid_guest_reactions'; end if;
  if exists(
    select 1 from jsonb_each_text(v_reactions) reaction(reaction_key,reaction_value)
    where not exists(
      select 1 from public.kwilt_meal_choice_candidates candidate
      where candidate.round_id = v_round.id and candidate.candidate_id = reaction_key::uuid
    )
  ) then raise exception 'invalid_guest_reaction_candidate'; end if;
  if (select count(*) from public.kwilt_guest_meal_feedback_responses where invite_id = v_invite.id) >= 100
    and not exists(
      select 1 from public.kwilt_guest_meal_feedback_responses
      where invite_id = v_invite.id and guest_key = p_guest_key
    )
  then raise exception 'guest_feedback_capacity_reached'; end if;

  insert into public.kwilt_guest_meal_feedback_responses(
    invite_id,guest_key,display_name,selected_candidate_ids,passed,suggestion,candidate_reactions,updated_at
  ) values (
    v_invite.id,p_guest_key,v_name,'{}'::uuid[],false,null,v_reactions,v_updated_at
  )
  on conflict(invite_id,guest_key) do update set
    display_name=excluded.display_name,
    selected_candidate_ids='{}'::uuid[],
    passed=false,
    suggestion=null,
    candidate_reactions=excluded.candidate_reactions,
    updated_at=excluded.updated_at;
  update public.kwilt_meal_plans set updated_at=v_updated_at where id=v_invite.plan_id;
  return jsonb_build_object('ok',true,'updatedAt',v_updated_at);
end;
$$;

revoke execute on function public.submit_kwilt_guest_meal_reactions(text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_kwilt_guest_meal_reactions(text,uuid,text,jsonb) to anon, authenticated;

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
            coalesce(jsonb_agg(jsonb_build_object(
              'personId',reaction.actor_id,
              'displayName',reaction.display_name,
              'avatarUrl',null,
              'reaction',reaction.reaction,
              'reason',reaction.reason
            ) order by reaction.created_at,reaction.display_name) filter(where reaction.actor_id is not null),'[]'::jsonb) supporters,
            max(reaction.reaction) filter(where reaction.is_viewer) viewer_reaction,
            max(reaction.reason) filter(where reaction.is_viewer) viewer_reaction_reason,
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
          from (
            select household_reaction.person_id::text actor_id,
              household_supporter.display_name,
              household_reaction.reaction,
              household_reaction.reason,
              household_reaction.created_at,
              household_reaction.person_id=v_actor.person_id is_viewer
            from public.kwilt_meal_candidate_reactions household_reaction
            join public.kwilt_people household_supporter on household_supporter.id=household_reaction.person_id
            where household_reaction.candidate_id=candidate.id
            union all
            select 'guest:' || guest_response.id::text,
              coalesce(nullif(btrim(guest_response.display_name),''),'Guest') || ' · Guest',
              guest_reaction.reaction_value,
              null,
              guest_response.updated_at,
              false
            from (
              select distinct on (response.guest_key) response.*
              from public.kwilt_guest_meal_feedback_responses response
              join public.kwilt_guest_meal_feedback_invites invite on invite.id=response.invite_id
              where invite.plan_id=v_plan.id
              order by response.guest_key,response.updated_at desc
            ) guest_response
            join public.kwilt_guest_meal_feedback_invites guest_invite on guest_invite.id=guest_response.invite_id
            cross join lateral jsonb_each_text(guest_response.candidate_reactions) guest_reaction(reaction_key,reaction_value)
            where guest_invite.plan_id=v_plan.id and guest_reaction.reaction_key=candidate.id::text
          ) reaction
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

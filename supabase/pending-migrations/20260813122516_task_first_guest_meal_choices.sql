-- Make the guest page a concrete Meal Plan task: choose every meal that works
-- and optionally suggest one missing idea, without weakening expiry,
-- revocation, response capacity, or table closure.

do $$
declare v_constraint record;
begin
  for v_constraint in
    select constraint_name
    from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name in (
        select constraint_name
        from information_schema.constraint_column_usage
        where table_schema = 'public'
          and table_name = 'kwilt_guest_meal_feedback_responses'
          and column_name = 'selected_candidate_ids'
      )
  loop
    execute format(
      'alter table public.kwilt_guest_meal_feedback_responses drop constraint %I',
      v_constraint.constraint_name
    );
  end loop;
end;
$$;

alter table public.kwilt_guest_meal_feedback_responses
  add constraint kwilt_guest_meal_feedback_responses_choice_count
  check (cardinality(selected_candidate_ids) <= 60);

create or replace function public.preview_kwilt_guest_meal_feedback_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.kwilt_guest_meal_feedback_invites;
  v_round public.kwilt_meal_choice_rounds;
  v_inviter text;
begin
  if char_length(p_token) not between 32 and 128 then return null; end if;
  select * into v_invite
  from public.kwilt_guest_meal_feedback_invites
  where token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256')
    or (
      char_length(p_token) = 43
      and token_hash = extensions.digest(convert_to(p_token || '.', 'utf8'), 'sha256')
    )
  order by (token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256')) desc
  limit 1;
  if v_invite.id is null then return null; end if;
  select * into v_round from public.kwilt_meal_choice_rounds where id = v_invite.round_id;
  if v_invite.state = 'revoked' then return jsonb_build_object('state','revoked'); end if;
  if v_invite.expires_at <= now() then return jsonb_build_object('state','expired'); end if;
  if v_round.state <> 'open' then return jsonb_build_object('state','closed'); end if;

  select split_part(btrim(display_name), ' ', 1) into v_inviter
  from public.kwilt_people where id = v_invite.created_by_person_id;
  return jsonb_build_object(
    'state','active',
    'inviterLabel',coalesce(nullif(v_inviter,''),'Someone'),
    'expiresAt',v_invite.expires_at,
    'selectionLimit',(select count(*) from public.kwilt_meal_choice_candidates where round_id=v_round.id),
    'suggestionLimit',v_round.suggestion_limit,
    'candidates',coalesce((
      select jsonb_agg(
        jsonb_build_object('id',c.candidate_id,'title',c.title,'imageUrl',c.participant_snapshot->>'imageUrl')
        order by c.position
      ) from public.kwilt_meal_choice_candidates c where c.round_id = v_round.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_kwilt_guest_meal_feedback(
  p_token text,
  p_guest_key uuid,
  p_display_name text,
  p_selected_candidate_ids uuid[],
  p_pass boolean,
  p_suggestion text
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
  v_suggestion text := nullif(btrim(coalesce(p_suggestion,'')), '');
  v_selected uuid[] := coalesce(p_selected_candidate_ids, '{}'::uuid[]);
  v_updated_at timestamptz := now();
begin
  if char_length(p_token) not between 32 and 128 then raise exception 'guest_feedback_unavailable'; end if;
  select * into v_invite
  from public.kwilt_guest_meal_feedback_invites
  where token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256')
    or (
      char_length(p_token) = 43
      and token_hash = extensions.digest(convert_to(p_token || '.', 'utf8'), 'sha256')
    )
  order by (token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256')) desc
  limit 1
  for update;
  if v_invite.id is null or v_invite.state <> 'active' or v_invite.expires_at <= now() then
    raise exception 'guest_feedback_unavailable';
  end if;
  select * into v_round from public.kwilt_meal_choice_rounds where id = v_invite.round_id;
  if v_round.state <> 'open' then raise exception 'guest_feedback_unavailable'; end if;
  if char_length(btrim(coalesce(p_display_name,''))) > 80 then raise exception 'invalid_guest_display_name'; end if;
  if char_length(btrim(coalesce(p_suggestion,''))) > v_round.suggestion_limit then raise exception 'invalid_guest_suggestion'; end if;
  if coalesce(p_pass,false) then raise exception 'invalid_guest_pass'; end if;
  if cardinality(v_selected) > 60 then raise exception 'too_many_guest_selections'; end if;
  if cardinality(v_selected) <> (select count(distinct id) from unnest(v_selected) selected(id)) then
    raise exception 'duplicate_guest_selection';
  end if;
  if not (cardinality(v_selected) > 0 or v_suggestion is not null) then raise exception 'empty_guest_feedback'; end if;
  if exists(
    select 1 from unnest(v_selected) selected(id)
    where not exists(
      select 1 from public.kwilt_meal_choice_candidates c
      where c.round_id = v_round.id and c.candidate_id = selected.id
    )
  ) then raise exception 'invalid_guest_selection'; end if;
  if (select count(*) from public.kwilt_guest_meal_feedback_responses where invite_id = v_invite.id) >= 100
    and not exists(select 1 from public.kwilt_guest_meal_feedback_responses where invite_id = v_invite.id and guest_key = p_guest_key)
  then raise exception 'guest_feedback_capacity_reached'; end if;

  insert into public.kwilt_guest_meal_feedback_responses(
    invite_id,guest_key,display_name,selected_candidate_ids,passed,suggestion,updated_at
  ) values (
    v_invite.id,p_guest_key,v_name,v_selected,false,v_suggestion,v_updated_at
  )
  on conflict(invite_id,guest_key) do update set
    display_name=excluded.display_name,
    selected_candidate_ids=excluded.selected_candidate_ids,
    passed=false,
    suggestion=excluded.suggestion,
    updated_at=excluded.updated_at;
  update public.kwilt_meal_plans set updated_at=v_updated_at where id=v_invite.plan_id;
  return jsonb_build_object('ok',true,'updatedAt',v_updated_at);
end;
$$;

create or replace function public.get_kwilt_guest_meal_feedback_summary(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_plan public.kwilt_meal_plans; v_actor public.kwilt_household_memberships;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id;
  if v_plan.id is not null then
    select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  end if;
  if v_actor.id is null or v_actor.role not in ('owner','caregiver') then raise exception 'meal_plan_organizer_required'; end if;
  return jsonb_build_object(
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title) order by c.position)
      from public.kwilt_meal_plan_candidates c where c.plan_id = p_plan_id
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,
        'state',case when i.state='active' and i.expires_at <= now() then 'expired' else i.state end,
        'expiresAt',i.expires_at,
        'responseCount',(select count(*) from public.kwilt_guest_meal_feedback_responses r where r.invite_id=i.id),
        'responses',coalesce((select jsonb_agg(jsonb_build_object(
          'id',r.id,
          'displayName',r.display_name,
          'selectedCandidateIds',r.selected_candidate_ids,
          'pass',false,
          'suggestion',r.suggestion,
          'updatedAt',r.updated_at
        ) order by r.updated_at desc) from public.kwilt_guest_meal_feedback_responses r where r.invite_id=i.id), '[]'::jsonb)
      ) order by i.created_at desc)
      from public.kwilt_guest_meal_feedback_invites i where i.plan_id = p_plan_id
    ), '[]'::jsonb)
  );
end;
$$;

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
              'thumbs_up',
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
            cross join lateral unnest(guest_response.selected_candidate_ids) guest_choice(candidate_id)
            where guest_invite.plan_id=v_plan.id and guest_choice.candidate_id=candidate.id
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

revoke execute on function public.preview_kwilt_guest_meal_feedback_invite(text) from public,anon,authenticated;
revoke execute on function public.submit_kwilt_guest_meal_feedback(text,uuid,text,uuid[],boolean,text) from public,anon,authenticated;
revoke execute on function public.get_kwilt_guest_meal_feedback_summary(uuid) from public,anon,authenticated;
revoke execute on function public.get_kwilt_shared_meal_cart(uuid) from public,anon;
grant execute on function public.preview_kwilt_guest_meal_feedback_invite(text) to anon,authenticated;
grant execute on function public.submit_kwilt_guest_meal_feedback(text,uuid,text,uuid[],boolean,text) to anon,authenticated;
grant execute on function public.get_kwilt_guest_meal_feedback_summary(uuid) to authenticated;
grant execute on function public.get_kwilt_shared_meal_cart(uuid) to authenticated;

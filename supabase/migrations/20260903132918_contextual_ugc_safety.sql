create table public.kwilt_ugc_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete restrict,
  reported_user_id uuid references auth.users(id) on delete restrict,
  reported_person_id uuid references public.kwilt_people(id) on delete restrict,
  target_kind text not null check (target_kind in ('shared_delivery', 'goal_feed_event', 'user', 'household_member', 'meal_reaction', 'guest_meal_feedback')),
  target_id uuid not null,
  reason text not null check (reason in ('harassment', 'hate_or_abuse', 'sexual_content', 'violence_or_threat', 'spam_or_scam', 'privacy', 'other')),
  reporter_note text check (reporter_note is null or char_length(reporter_note) <= 500),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  status text not null default 'open' check (status in ('open', 'reviewing', 'needs_information', 'actioned', 'dismissed')),
  priority text not null default 'standard' check (priority in ('standard', 'urgent')),
  submitted_at timestamptz not null default now(),
  response_due_at timestamptz not null,
  first_reviewed_at timestamptz,
  resolved_at timestamptz,
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  source_app_version text check (source_app_version is null or char_length(source_app_version) <= 40),
  source_build_number text check (source_build_number is null or char_length(source_build_number) <= 20),
  updated_at timestamptz not null default now(),
  constraint kwilt_ugc_reports_has_subject check (
    reported_user_id is not null or reported_person_id is not null or target_kind = 'guest_meal_feedback'
  ),
  constraint kwilt_ugc_reports_no_self check (reported_user_id is null or reporter_user_id <> reported_user_id)
);

create index kwilt_ugc_reports_queue_idx
  on public.kwilt_ugc_reports(status, priority, response_due_at, submitted_at);
create index kwilt_ugc_reports_reported_user_idx
  on public.kwilt_ugc_reports(reported_user_id, submitted_at desc);
create index kwilt_ugc_reports_reported_person_idx
  on public.kwilt_ugc_reports(reported_person_id, submitted_at desc);

alter table public.kwilt_ugc_reports enable row level security;
revoke all on public.kwilt_ugc_reports from public, anon, authenticated;
grant all on public.kwilt_ugc_reports to service_role;

comment on table public.kwilt_ugc_reports is
  'Private append-only moderation intake. Client roles have no direct access; service operations preserve reporter confidentiality.';

create table public.kwilt_ugc_hidden_targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('meal_reaction', 'guest_meal_feedback')),
  target_id uuid not null,
  hidden_at timestamptz not null default now(),
  primary key (user_id, target_kind, target_id)
);

alter table public.kwilt_ugc_hidden_targets enable row level security;
revoke all on public.kwilt_ugc_hidden_targets from public, anon, authenticated;
grant all on public.kwilt_ugc_hidden_targets to service_role;

create or replace function public.hide_kwilt_ugc_target(p_target_kind text, p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_household_id uuid;
  v_target_person_id uuid;
  v_role text;
begin
  select binding.person_id into v_person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user and binding.status = 'active'
  limit 1;
  if v_person_id is null then raise exception 'ugc_hide_target_unavailable'; end if;

  if p_target_kind = 'meal_reaction' then
    select plan.household_id, reaction.person_id into v_household_id, v_target_person_id
    from public.kwilt_meal_candidate_reactions reaction
    join public.kwilt_meal_plan_candidates candidate on candidate.id = reaction.candidate_id
    join public.kwilt_meal_plans plan on plan.id = candidate.plan_id
    where reaction.id = p_target_id and reaction.reason is not null;
    if v_household_id is null or v_target_person_id = v_person_id or not exists (
      select 1 from public.kwilt_household_memberships membership
      where membership.household_id = v_household_id and membership.person_id = v_person_id and membership.status = 'active'
    ) then raise exception 'ugc_hide_target_unavailable'; end if;
  elsif p_target_kind = 'guest_meal_feedback' then
    select plan.household_id into v_household_id
    from public.kwilt_guest_meal_feedback_responses response
    join public.kwilt_guest_meal_feedback_invites invite on invite.id = response.invite_id
    join public.kwilt_meal_plans plan on plan.id = invite.plan_id
    where response.id = p_target_id and response.suggestion is not null;
    select membership.role into v_role from public.kwilt_household_memberships membership
    where membership.household_id = v_household_id and membership.person_id = v_person_id and membership.status = 'active'
    limit 1;
    if v_household_id is null or v_role not in ('owner', 'caregiver') then
      raise exception 'ugc_hide_target_unavailable';
    end if;
  else
    raise exception 'ugc_hide_target_unavailable';
  end if;

  insert into public.kwilt_ugc_hidden_targets(user_id, target_kind, target_id)
  values(v_user, p_target_kind, p_target_id)
  on conflict do nothing;
  return jsonb_build_object('targetKind', p_target_kind, 'targetId', p_target_id, 'hidden', true);
end;
$$;

revoke all on function public.hide_kwilt_ugc_target(text, uuid) from public, anon;
grant execute on function public.hide_kwilt_ugc_target(text, uuid) to authenticated;

-- Refresh the Meal Plan projection so contextual reporting receives the
-- immutable reaction id, while a viewer-hidden explanation stays out of that
-- viewer's response list without changing anyone else's reaction.
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
            coalesce(jsonb_agg(jsonb_build_object('reactionId',reaction.id,'personId',supporter.id,'displayName',supporter.display_name,'avatarUrl',null,'reaction',reaction.reaction,'reason',reaction.reason) order by reaction.created_at,supporter.display_name)
              filter (where not exists (select 1 from public.kwilt_ugc_hidden_targets hidden where hidden.user_id=v_user and hidden.target_kind='meal_reaction' and hidden.target_id=reaction.id)),'[]'::jsonb) supporters,
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

create or replace function public.get_kwilt_guest_meal_feedback_summary(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_plan public.kwilt_meal_plans; v_actor public.kwilt_household_memberships; v_user uuid:=public.kwilt_require_permanent_user();
begin
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id;
  if v_plan.id is not null then select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id); end if;
  if v_actor.id is null or v_actor.role not in ('owner','caregiver') then raise exception 'meal_plan_organizer_required'; end if;
  return jsonb_build_object(
    'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title) order by c.position) from public.kwilt_meal_plan_candidates c where c.plan_id=p_plan_id),'[]'::jsonb),
    'invites',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'state',case when i.state='active' and i.expires_at<=now() then 'expired' else i.state end,'expiresAt',i.expires_at,
      'responseCount',(select count(*) from public.kwilt_guest_meal_feedback_responses r where r.invite_id=i.id),
      'responses',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'displayName',r.display_name,'selectedCandidateIds',r.selected_candidate_ids,'pass',r.passed,'suggestion',r.suggestion,'updatedAt',r.updated_at) order by r.updated_at desc)
        from public.kwilt_guest_meal_feedback_responses r where r.invite_id=i.id and not exists (
          select 1 from public.kwilt_ugc_hidden_targets hidden where hidden.user_id=v_user and hidden.target_kind='guest_meal_feedback' and hidden.target_id=r.id
        )),'[]'::jsonb)
    ) order by i.created_at desc) from public.kwilt_guest_meal_feedback_invites i where i.plan_id=p_plan_id),'[]'::jsonb)
  );
end;
$$;

revoke execute on function public.get_kwilt_guest_meal_feedback_summary(uuid) from public,anon;
grant execute on function public.get_kwilt_guest_meal_feedback_summary(uuid) to authenticated;

create or replace function public.kwilt_users_blocked(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select first_user is not null
    and second_user is not null
    and (
      (select auth.uid()) in (first_user, second_user)
      or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    )
    and exists (
      select 1 from public.kwilt_blocks block
      where (block.blocker_id = first_user and block.blocked_id = second_user)
         or (block.blocker_id = second_user and block.blocked_id = first_user)
    );
$$;

revoke all on function public.kwilt_users_blocked(uuid, uuid) from public, anon;
grant execute on function public.kwilt_users_blocked(uuid, uuid) to authenticated, service_role;

drop policy if exists "Users can follow (insert for self)" on public.kwilt_follows;
create policy "Users can follow unblocked people"
  on public.kwilt_follows for insert to authenticated
  with check (
    (select auth.uid()) = follower_id
    and not public.kwilt_users_blocked(follower_id, followed_id)
  );

drop policy if exists "Recipients read own shared deliveries" on public.kwilt_shared_deliveries;
create policy "Recipients read own unblocked shared deliveries"
  on public.kwilt_shared_deliveries for select to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and recipient_user_id = (select auth.uid())
    and (actor_user_id is null or not public.kwilt_users_blocked(recipient_user_id, actor_user_id))
  );

drop policy if exists "goal_checkins_read_for_members" on public.goal_checkins;
create policy "goal_checkins_read_for_unblocked_members"
  on public.goal_checkins for select to authenticated
  using (
    public.kwilt_is_member('goal', goal_id, (select auth.uid()))
    and not public.kwilt_users_blocked((select auth.uid()), user_id)
  );

drop policy if exists "feed_events_read_for_members" on public.kwilt_feed_events;
create policy "feed_events_read_for_unblocked_members"
  on public.kwilt_feed_events for select to authenticated
  using (
    public.kwilt_is_member(entity_type, entity_id, (select auth.uid()))
    and (actor_id is null or not public.kwilt_users_blocked((select auth.uid()), actor_id))
  );

create or replace function public.kwilt_shared_text_allowed(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate is null or not (
    lower(candidate) ~ '\m(kill|hurt)[[:space:]]+(yourself|urself|your[[:space:]]+self)\M'
    or lower(candidate) ~ '\m(i am|i will|i''ll|we will|we''ll)[[:space:]]+(kill|hurt|shoot|stab)[[:space:]]+you\M'
    or lower(candidate) ~ '\m(sexual|nude|naked)\M.{0,32}\m(child|minor|kid)\M'
    or lower(candidate) ~ '\m(child|minor|kid)\M.{0,32}\m(sexual|nude|naked)\M'
  );
$$;

create or replace function public.enforce_kwilt_shared_text_safety()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
begin
  if tg_table_name = 'goal_checkins' then
    candidate := new.text;
  elsif tg_table_name = 'kwilt_feed_events' and new.type = 'checkin_reply' then
    candidate := new.payload ->> 'text';
  elsif tg_table_name = 'kwilt_meal_candidate_reactions' and new.reaction = 'hard_pass' then
    candidate := new.reason;
  elsif tg_table_name = 'kwilt_guest_meal_feedback_responses' then
    if not public.kwilt_shared_text_allowed(new.display_name) then
      raise exception using errcode = '22023', message = 'shared_text_not_allowed';
    end if;
    candidate := new.suggestion;
  else
    return new;
  end if;
  if not public.kwilt_shared_text_allowed(candidate) then
    raise exception using errcode = '22023', message = 'shared_text_not_allowed';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_kwilt_shared_text_safety() from public, anon, authenticated;

create trigger enforce_goal_checkin_text_safety
before insert or update of text on public.goal_checkins
for each row execute function public.enforce_kwilt_shared_text_safety();

create trigger enforce_goal_reply_text_safety
before insert or update of payload on public.kwilt_feed_events
for each row execute function public.enforce_kwilt_shared_text_safety();

create trigger enforce_meal_reaction_text_safety
before insert or update of reaction, reason on public.kwilt_meal_candidate_reactions
for each row execute function public.enforce_kwilt_shared_text_safety();

create trigger enforce_guest_meal_feedback_text_safety
before insert or update of display_name, suggestion on public.kwilt_guest_meal_feedback_responses
for each row execute function public.enforce_kwilt_shared_text_safety();

create or replace function public.enforce_kwilt_unblocked_feed_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_actor uuid;
  target_id uuid;
begin
  if new.type not in ('checkin_reply', 'reaction_added') then return new; end if;
  begin
    target_id := nullif(new.payload ->> 'targetEventId', '')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'invalid_target_event';
  end;
  select actor_id into target_actor from public.kwilt_feed_events where id = target_id;
  if target_actor is null then
    raise exception using errcode = '22023', message = 'invalid_target_event';
  end if;
  if public.kwilt_users_blocked(new.actor_id, target_actor) then
    raise exception using errcode = '42501', message = 'blocked_relationship';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_kwilt_unblocked_feed_contact() from public, anon, authenticated;

create trigger enforce_unblocked_feed_contact
before insert or update of actor_id, payload on public.kwilt_feed_events
for each row execute function public.enforce_kwilt_unblocked_feed_contact();

create or replace function public.suppress_blocked_targeted_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'kwilt_invites'
    and new.intended_recipient_user_id is not null
    and public.kwilt_users_blocked(new.created_by, new.intended_recipient_user_id) then
    raise exception using errcode = '42501', message = 'blocked_relationship';
  end if;
  if tg_table_name = 'kwilt_shared_deliveries'
    and new.actor_user_id is not null
    and public.kwilt_users_blocked(new.actor_user_id, new.recipient_user_id) then
    raise exception using errcode = '42501', message = 'blocked_relationship';
  end if;
  return new;
end;
$$;

revoke all on function public.suppress_blocked_targeted_contact() from public, anon, authenticated;

create trigger suppress_blocked_targeted_invites
before insert or update of created_by, intended_recipient_user_id on public.kwilt_invites
for each row execute function public.suppress_blocked_targeted_contact();

create trigger suppress_blocked_shared_deliveries
before insert or update of actor_user_id, recipient_user_id on public.kwilt_shared_deliveries
for each row execute function public.suppress_blocked_targeted_contact();

create or replace function public.enforce_kwilt_unblocked_relationship_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'kwilt_friendships' and new.status in ('pending', 'active')
    and public.kwilt_users_blocked(new.user_a, new.user_b) then
    raise exception using errcode = '42501', message = 'blocked_relationship';
  end if;
  if tg_table_name = 'kwilt_memberships' and new.entity_type = 'goal' and new.status = 'active'
    and exists (
      select 1 from public.kwilt_memberships member
      where member.entity_type = new.entity_type
        and member.entity_id = new.entity_id
        and member.status = 'active'
        and member.user_id <> new.user_id
        and public.kwilt_users_blocked(member.user_id, new.user_id)
    ) then
    raise exception using errcode = '42501', message = 'blocked_relationship';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_kwilt_unblocked_relationship_state() from public, anon, authenticated;

create trigger enforce_unblocked_friendship_state
before insert or update of user_a, user_b, status on public.kwilt_friendships
for each row execute function public.enforce_kwilt_unblocked_relationship_state();

create trigger enforce_unblocked_goal_membership
before insert or update of user_id, status on public.kwilt_memberships
for each row execute function public.enforce_kwilt_unblocked_relationship_state();

create or replace function public.block_kwilt_user(p_blocked_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication_required';
  end if;
  if p_blocked_user_id is null or p_blocked_user_id = v_actor then
    raise exception 'invalid_block_target';
  end if;
  if not exists (select 1 from auth.users where id = p_blocked_user_id) then
    raise exception 'block_target_not_found';
  end if;
  if exists (
    select 1
    from public.kwilt_person_auth_bindings actor_binding
    join public.kwilt_household_memberships actor_membership
      on actor_membership.person_id = actor_binding.person_id
     and actor_membership.status = 'active'
    join public.kwilt_household_memberships target_membership
      on target_membership.household_id = actor_membership.household_id
     and target_membership.status = 'active'
    join public.kwilt_person_auth_bindings target_binding
      on target_binding.person_id = target_membership.person_id
     and target_binding.status = 'active'
    where actor_binding.user_id = v_actor
      and actor_binding.status = 'active'
      and target_binding.user_id = p_blocked_user_id
  ) then
    raise exception 'household_relationship_requires_role_action';
  end if;

  insert into public.kwilt_blocks (blocker_id, blocked_id)
  values (v_actor, p_blocked_user_id)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.kwilt_follows
  where (follower_id = v_actor and followed_id = p_blocked_user_id)
     or (follower_id = p_blocked_user_id and followed_id = v_actor);

  update public.kwilt_friendships
  set status = 'blocked', blocked_by = v_actor, ended_at = now(), updated_at = now()
  where ((user_a = v_actor and user_b = p_blocked_user_id)
      or (user_a = p_blocked_user_id and user_b = v_actor))
    and status in ('pending', 'active');

  update public.kwilt_invites
  set recipient_state = 'revoked'
  where recipient_state = 'pending'
    and ((created_by = v_actor and intended_recipient_user_id = p_blocked_user_id)
      or (created_by = p_blocked_user_id and intended_recipient_user_id = v_actor));

  update public.kwilt_shared_deliveries
  set state = case when state = 'available' then 'unavailable' else 'settled' end,
      settled_reason = 'blocked_relationship', settled_at = now(), updated_at = now()
  where ((recipient_user_id = v_actor and actor_user_id = p_blocked_user_id)
      or (recipient_user_id = p_blocked_user_id and actor_user_id = v_actor))
    and state in ('pending', 'available');

  return jsonb_build_object('blockedUserId', p_blocked_user_id, 'status', 'blocked');
end;
$$;

revoke all on function public.block_kwilt_user(uuid) from public, anon;
grant execute on function public.block_kwilt_user(uuid) to authenticated;

drop policy if exists "Users can create blocks" on public.kwilt_blocks;
revoke insert on public.kwilt_blocks from authenticated;

comment on function public.block_kwilt_user(uuid) is
  'Atomically establishes the bilateral social safety boundary and ends existing targeted contact.';

create or replace function public.enforce_kwilt_peer_block_boundary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.kwilt_person_auth_bindings blocker_binding
    join public.kwilt_household_memberships blocker_membership
      on blocker_membership.person_id = blocker_binding.person_id
     and blocker_membership.status = 'active'
    join public.kwilt_household_memberships blocked_membership
      on blocked_membership.household_id = blocker_membership.household_id
     and blocked_membership.status = 'active'
    join public.kwilt_person_auth_bindings blocked_binding
      on blocked_binding.person_id = blocked_membership.person_id
     and blocked_binding.status = 'active'
    where blocker_binding.user_id = new.blocker_id
      and blocker_binding.status = 'active'
      and blocked_binding.user_id = new.blocked_id
  ) then
    raise exception 'household_relationship_requires_role_action';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_kwilt_peer_block_boundary() from public, anon, authenticated;

create trigger enforce_kwilt_peer_block_boundary_before_insert
before insert on public.kwilt_blocks
for each row execute function public.enforce_kwilt_peer_block_boundary();

create or replace function public.apply_kwilt_block_semantics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.kwilt_follows
  where (follower_id = new.blocker_id and followed_id = new.blocked_id)
     or (follower_id = new.blocked_id and followed_id = new.blocker_id);
  update public.kwilt_friendships
  set status = 'blocked', blocked_by = new.blocker_id, ended_at = now(), updated_at = now()
  where ((user_a = new.blocker_id and user_b = new.blocked_id)
      or (user_a = new.blocked_id and user_b = new.blocker_id))
    and status in ('pending', 'active');
  update public.kwilt_invites
  set recipient_state = 'revoked'
  where recipient_state = 'pending'
    and ((created_by = new.blocker_id and intended_recipient_user_id = new.blocked_id)
      or (created_by = new.blocked_id and intended_recipient_user_id = new.blocker_id));
  update public.kwilt_shared_deliveries
  set state = case when state = 'available' then 'unavailable' else 'settled' end,
      settled_reason = 'blocked_relationship', settled_at = now(), updated_at = now()
  where ((recipient_user_id = new.blocker_id and actor_user_id = new.blocked_id)
      or (recipient_user_id = new.blocked_id and actor_user_id = new.blocker_id))
    and state in ('pending', 'available');
  return new;
end;
$$;

revoke all on function public.apply_kwilt_block_semantics() from public, anon, authenticated;

create trigger apply_kwilt_block_semantics_after_insert
after insert on public.kwilt_blocks
for each row execute function public.apply_kwilt_block_semantics();

create or replace function public.sync_legacy_friendship_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'blocked' and new.blocked_by is not null
    and old.status is distinct from new.status then
    insert into public.kwilt_blocks (blocker_id, blocked_id)
    values (
      new.blocked_by,
      case when new.user_a = new.blocked_by then new.user_b else new.user_a end
    ) on conflict (blocker_id, blocked_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_legacy_friendship_block() from public, anon, authenticated;

create trigger sync_legacy_friendship_block_after_update
after update of status, blocked_by on public.kwilt_friendships
for each row execute function public.sync_legacy_friendship_block();

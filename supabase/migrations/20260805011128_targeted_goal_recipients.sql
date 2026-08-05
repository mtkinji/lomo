-- Targeted Goal invitations make existing trusted people reusable without
-- making Friendship or Household membership an access grant.

alter table public.kwilt_invites
  add column if not exists intended_recipient_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists recipient_kind text,
  add column if not exists recipient_relationship_id uuid,
  add column if not exists recipient_state text,
  add column if not exists responded_at timestamptz;

alter table public.kwilt_invites
  drop constraint if exists kwilt_invites_recipient_kind_check,
  drop constraint if exists kwilt_invites_recipient_state_check,
  drop constraint if exists kwilt_invites_recipient_shape_check;

alter table public.kwilt_invites
  add constraint kwilt_invites_recipient_kind_check
    check (recipient_kind is null or recipient_kind in ('friend', 'household')),
  add constraint kwilt_invites_recipient_state_check
    check (recipient_state is null or recipient_state in ('pending', 'accepted', 'declined', 'revoked')),
  add constraint kwilt_invites_recipient_shape_check
    check (
      (
        intended_recipient_user_id is null
        and recipient_kind is null
        and recipient_relationship_id is null
        and recipient_state is null
        and responded_at is null
      )
      or (
        intended_recipient_user_id is not null
        and recipient_kind is not null
        and recipient_relationship_id is not null
        and recipient_state is not null
      )
    );

create index if not exists kwilt_invites_targeted_recipient_idx
  on public.kwilt_invites(intended_recipient_user_id, recipient_state, created_at desc)
  where intended_recipient_user_id is not null;

create index if not exists kwilt_invites_targeted_goal_idx
  on public.kwilt_invites(created_by, entity_id, intended_recipient_user_id, created_at desc)
  where entity_type = 'goal' and intended_recipient_user_id is not null;

create or replace function public.get_kwilt_goal_share_recipients()
returns table (
  recipient_kind text,
  relationship_id uuid,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;

  return query
  with recipient_candidates as (
    select
      1 as source_priority,
      case when candidate.user_a = v_actor then candidate.user_b else candidate.user_a end as target_user_id,
      'friend'::text as candidate_kind,
      candidate.id as candidate_relationship_id,
      coalesce(
        nullif(btrim(friend_identity.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(friend_identity.raw_user_meta_data->>'name'), ''),
        'Friend'
      )::text as candidate_display_name,
      case
        when coalesce(
          nullif(btrim(friend_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(friend_identity.raw_user_meta_data->>'picture'), '')
        ) ~ '^https://'
        then coalesce(
          nullif(btrim(friend_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(friend_identity.raw_user_meta_data->>'picture'), '')
        )
        else null
      end::text as candidate_avatar_url
    from public.kwilt_friendships candidate
    left join auth.users friend_identity
      on friend_identity.id = case when candidate.user_a = v_actor then candidate.user_b else candidate.user_a end
    where candidate.status = 'active'
      and (candidate.user_a = v_actor or candidate.user_b = v_actor)

    union all

    select
      0 as source_priority,
      target_binding.user_id as target_user_id,
      'household'::text as candidate_kind,
      target_membership.id as candidate_relationship_id,
      target_person.display_name::text as candidate_display_name,
      null::text as candidate_avatar_url
    from public.kwilt_household_memberships target_membership
    join public.kwilt_people target_person
      on target_person.id = target_membership.person_id
    join public.kwilt_person_auth_bindings target_binding
      on target_binding.person_id = target_membership.person_id
     and target_binding.status = 'active'
    where target_membership.status = 'active'
      and target_binding.user_id <> v_actor
      and exists (
        select 1
        from public.kwilt_household_memberships actor_membership
        join public.kwilt_person_auth_bindings actor_binding
          on actor_binding.person_id = actor_membership.person_id
         and actor_binding.status = 'active'
        where actor_membership.household_id = target_membership.household_id
          and actor_membership.status = 'active'
          and actor_binding.user_id = v_actor
      )
  ), deduplicated as (
    select distinct on (candidate.target_user_id)
      candidate.target_user_id,
      candidate.candidate_kind,
      candidate.candidate_relationship_id,
      candidate.candidate_display_name,
      candidate.candidate_avatar_url
    from recipient_candidates candidate
    order by candidate.target_user_id, candidate.source_priority, candidate.candidate_display_name
  )
  select
    candidate.candidate_kind,
    candidate.candidate_relationship_id,
    candidate.candidate_display_name,
    candidate.candidate_avatar_url
  from deduplicated candidate
  order by candidate.candidate_display_name;
end;
$$;

create or replace function public.create_kwilt_targeted_goal_invite(
  p_entity_id text,
  p_goal_title text,
  p_goal_image_url text,
  p_recipient_kind text,
  p_relationship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
  v_code text;
  v_expires_at timestamptz := now() + interval '14 days';
  v_payload jsonb;
  v_existing public.kwilt_invites%rowtype;
begin
  if v_actor is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;
  if nullif(btrim(p_entity_id), '') is null or p_relationship_id is null then
    raise exception 'invalid_invite_request';
  end if;
  if p_recipient_kind not in ('friend', 'household') then
    raise exception 'invalid_recipient_kind';
  end if;

  if not exists (
    select 1
    from public.kwilt_memberships membership
    where membership.entity_type = 'goal'
      and membership.entity_id = btrim(p_entity_id)
      and membership.user_id = v_actor
      and membership.status = 'active'
      and membership.role = 'owner'
  ) and not exists (
    select 1
    from public.kwilt_goals goal
    where goal.user_id = v_actor
      and goal.id = btrim(p_entity_id)
  ) then
    raise exception 'goal_owner_required';
  end if;

  if p_recipient_kind = 'friend' then
    select case when candidate.user_a = v_actor then candidate.user_b else candidate.user_a end
    into v_target
    from public.kwilt_friendships candidate
    where candidate.id = p_relationship_id
      and candidate.status = 'active'
      and (candidate.user_a = v_actor or candidate.user_b = v_actor);
  else
    select target_binding.user_id
    into v_target
    from public.kwilt_household_memberships target_membership
    join public.kwilt_person_auth_bindings target_binding
      on target_binding.person_id = target_membership.person_id
     and target_binding.status = 'active'
    where target_membership.id = p_relationship_id
      and target_membership.status = 'active'
      and exists (
        select 1
        from public.kwilt_household_memberships actor_membership
        join public.kwilt_person_auth_bindings actor_binding
          on actor_binding.person_id = actor_membership.person_id
         and actor_binding.status = 'active'
        where actor_membership.household_id = target_membership.household_id
          and actor_membership.status = 'active'
          and actor_binding.user_id = v_actor
      );
  end if;

  if v_target is null or v_target = v_actor then
    raise exception 'recipient_unavailable';
  end if;
  if exists (
    select 1
    from public.kwilt_memberships membership
    where membership.entity_type = 'goal'
      and membership.entity_id = btrim(p_entity_id)
      and membership.user_id = v_target
      and membership.status = 'active'
  ) then
    raise exception 'recipient_already_has_access';
  end if;
  if (
    select count(*)
    from public.kwilt_invites invite
    where invite.created_by = v_actor
      and invite.created_at >= now() - interval '24 hours'
  ) >= 50 then
    raise exception 'invite_rate_limited';
  end if;

  select *
  into v_existing
  from public.kwilt_invites invite
  where invite.entity_type = 'goal'
    and invite.entity_id = btrim(p_entity_id)
    and invite.created_by = v_actor
    and invite.intended_recipient_user_id = v_target
    and invite.recipient_state = 'pending'
    and (invite.expires_at is null or invite.expires_at > now())
  order by invite.created_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'inviteCode', v_existing.code,
      'entityId', v_existing.entity_id,
      'payload', v_existing.payload,
      'expiresAt', v_existing.expires_at,
      'maxUses', v_existing.max_uses,
      'reused', true
    );
  end if;

  insert into public.kwilt_memberships (
    entity_type, entity_id, user_id, role, status
  ) values (
    'goal', btrim(p_entity_id), v_actor, 'owner', 'active'
  )
  on conflict (entity_type, entity_id, user_id)
  do update set
    role = case
      when exists (
        select 1
        from public.kwilt_goals goal
        where goal.user_id = v_actor
          and goal.id = btrim(p_entity_id)
      ) then 'owner'
      else public.kwilt_memberships.role
    end,
    status = 'active',
    left_at = null,
    updated_at = now();

  v_payload := jsonb_build_object(
    'kind', 'people',
    'goalTitle', nullif(left(btrim(coalesce(p_goal_title, '')), 160), ''),
    'goalImageUrl', nullif(btrim(coalesce(p_goal_image_url, '')), ''),
    'visibilityContract', 'goal-signals-v1'
  );

  loop
    v_code := pg_catalog.encode(extensions.gen_random_bytes(9), 'hex');
    begin
      insert into public.kwilt_invites (
        entity_type,
        entity_id,
        created_by,
        code,
        expires_at,
        max_uses,
        uses,
        payload,
        intended_recipient_user_id,
        recipient_kind,
        recipient_relationship_id,
        recipient_state
      ) values (
        'goal',
        btrim(p_entity_id),
        v_actor,
        v_code,
        v_expires_at,
        1,
        0,
        v_payload,
        v_target,
        p_recipient_kind,
        p_relationship_id,
        'pending'
      );
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  insert into public.kwilt_feed_events (
    entity_type, entity_id, actor_id, type, payload
  ) values (
    'goal', btrim(p_entity_id), v_actor, 'invite_created',
    jsonb_build_object('kind', 'people', 'targeted', true)
  );

  return jsonb_build_object(
    'inviteCode', v_code,
    'entityId', btrim(p_entity_id),
    'payload', v_payload,
    'expiresAt', v_expires_at,
    'maxUses', 1,
    'reused', false
  );
end;
$$;

create or replace function public.respond_to_kwilt_targeted_goal_invite(
  p_code text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  invite public.kwilt_invites%rowtype;
begin
  if v_actor is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;
  if p_action not in ('accept', 'decline') then
    raise exception 'unsupported_invite_action';
  end if;

  select *
  into invite
  from public.kwilt_invites candidate
  where candidate.code = btrim(p_code)
    and candidate.entity_type = 'goal'
    and candidate.intended_recipient_user_id is not null
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;
  if invite.intended_recipient_user_id <> v_actor then
    raise exception 'invite_unavailable';
  end if;

  if p_action = 'decline' then
    if invite.recipient_state = 'declined' then
      return jsonb_build_object(
        'entityId', invite.entity_id,
        'payload', invite.payload,
        'state', 'declined',
        'replayed', true
      );
    end if;
    if invite.recipient_state <> 'pending' then
      raise exception 'invite_unavailable';
    end if;

    update public.kwilt_invites
    set recipient_state = 'declined', responded_at = now()
    where id = invite.id;

    return jsonb_build_object(
      'entityId', invite.entity_id,
      'payload', invite.payload,
      'state', 'declined',
      'replayed', false
    );
  end if;

  if invite.recipient_state = 'accepted' and exists (
    select 1
    from public.kwilt_memberships membership
    where membership.entity_type = 'goal'
      and membership.entity_id = invite.entity_id
      and membership.user_id = v_actor
      and membership.status = 'active'
  ) then
    return jsonb_build_object(
      'entityId', invite.entity_id,
      'payload', invite.payload,
      'state', 'accepted',
      'replayed', true
    );
  end if;

  if invite.recipient_state <> 'pending' then
    raise exception 'invite_unavailable';
  end if;
  if invite.expires_at is not null and invite.expires_at <= now() then
    raise exception 'invite_expired';
  end if;
  if invite.uses >= invite.max_uses then
    raise exception 'invite_exhausted';
  end if;

  if invite.recipient_kind = 'friend' and not exists (
    select 1
    from public.kwilt_friendships friendship
    where friendship.id = invite.recipient_relationship_id
      and friendship.status = 'active'
      and (friendship.user_a = invite.created_by or friendship.user_b = invite.created_by)
      and (friendship.user_a = v_actor or friendship.user_b = v_actor)
  ) then
    raise exception 'invite_unavailable';
  end if;
  if invite.recipient_kind = 'household' and not exists (
    select 1
    from public.kwilt_household_memberships target_membership
    join public.kwilt_person_auth_bindings target_binding
      on target_binding.person_id = target_membership.person_id
     and target_binding.status = 'active'
    where target_membership.id = invite.recipient_relationship_id
      and target_membership.status = 'active'
      and target_binding.user_id = v_actor
      and exists (
        select 1
        from public.kwilt_household_memberships inviter_membership
        join public.kwilt_person_auth_bindings inviter_binding
          on inviter_binding.person_id = inviter_membership.person_id
         and inviter_binding.status = 'active'
        where inviter_membership.household_id = target_membership.household_id
          and inviter_membership.status = 'active'
          and inviter_binding.user_id = invite.created_by
      )
  ) then
    raise exception 'invite_unavailable';
  end if;

  insert into public.kwilt_memberships (
    entity_type, entity_id, user_id, role, status
  ) values (
    'goal', invite.entity_id, v_actor, 'collaborator', 'active'
  )
  on conflict (entity_type, entity_id, user_id)
  do update set
    role = 'collaborator',
    status = 'active',
    left_at = null,
    updated_at = now();

  update public.kwilt_invites
  set uses = 1, recipient_state = 'accepted', responded_at = now()
  where id = invite.id;

  insert into public.kwilt_feed_events (
    entity_type, entity_id, actor_id, type, payload
  ) values (
    'goal', invite.entity_id, v_actor, 'member_joined', '{}'::jsonb
  );

  return jsonb_build_object(
    'entityId', invite.entity_id,
    'payload', invite.payload,
    'state', 'accepted',
    'replayed', false
  );
end;
$$;

create or replace function public.get_kwilt_goal_sharing()
returns table (
  direction text,
  goal_id text,
  goal_title text,
  access_state text,
  counterpart_name text,
  counterpart_avatar_url text,
  invite_id uuid,
  invite_code text,
  counterpart_user_id uuid,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;

  return query
  with sharing_rows as (
    select
      'by_you'::text as row_direction,
      invite.entity_id::text as row_goal_id,
      coalesce(nullif(invite.payload->>'goalTitle', ''), 'Shared goal')::text as row_goal_title,
      case when invite.expires_at is not null and invite.expires_at <= now()
        then 'expired'::text else 'pending'::text end as row_access_state,
      coalesce(
        nullif(btrim(household_person.display_name), ''),
        nullif(btrim(target_identity.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(target_identity.raw_user_meta_data->>'name'), ''),
        'Someone'
      )::text as row_counterpart_name,
      case
        when coalesce(
          nullif(btrim(target_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(target_identity.raw_user_meta_data->>'picture'), '')
        ) ~ '^https://'
        then coalesce(
          nullif(btrim(target_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(target_identity.raw_user_meta_data->>'picture'), '')
        )
        else null
      end::text as row_counterpart_avatar_url,
      invite.id as row_invite_id,
      invite.code::text as row_invite_code,
      invite.intended_recipient_user_id as row_counterpart_user_id,
      invite.created_at as row_changed_at
    from public.kwilt_invites invite
    left join auth.users target_identity
      on target_identity.id = invite.intended_recipient_user_id
    left join public.kwilt_household_memberships household_membership
      on invite.recipient_kind = 'household'
     and household_membership.id = invite.recipient_relationship_id
    left join public.kwilt_people household_person
      on household_person.id = household_membership.person_id
    where invite.entity_type = 'goal'
      and invite.created_by = v_actor
      and invite.intended_recipient_user_id is not null
      and invite.recipient_state = 'pending'

    union all

    select
      'by_you'::text,
      membership.entity_id::text,
      coalesce(nullif(goal.data->>'title', ''), 'Shared goal')::text,
      'active'::text,
      coalesce(
        nullif(btrim(partner_identity.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(partner_identity.raw_user_meta_data->>'name'), ''),
        'Partner'
      )::text,
      case
        when coalesce(
          nullif(btrim(partner_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(partner_identity.raw_user_meta_data->>'picture'), '')
        ) ~ '^https://'
        then coalesce(
          nullif(btrim(partner_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(partner_identity.raw_user_meta_data->>'picture'), '')
        )
        else null
      end::text,
      null::uuid,
      null::text,
      membership.user_id,
      membership.updated_at
    from public.kwilt_memberships membership
    join public.kwilt_memberships owner_membership
      on owner_membership.entity_type = membership.entity_type
     and owner_membership.entity_id = membership.entity_id
     and owner_membership.user_id = v_actor
     and owner_membership.status = 'active'
     and owner_membership.role in ('owner', 'co_owner')
    left join public.kwilt_goals goal
      on goal.user_id = v_actor and goal.id = membership.entity_id
    left join auth.users partner_identity
      on partner_identity.id = membership.user_id
    where membership.entity_type = 'goal'
      and membership.status = 'active'
      and membership.user_id <> v_actor

    union all

    select
      'with_you'::text,
      invite.entity_id::text,
      coalesce(nullif(invite.payload->>'goalTitle', ''), 'Shared goal')::text,
      case when invite.expires_at is not null and invite.expires_at <= now()
        then 'expired'::text else 'pending'::text end,
      coalesce(
        nullif(btrim(inviter_identity.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(inviter_identity.raw_user_meta_data->>'name'), ''),
        'Someone'
      )::text,
      case
        when coalesce(
          nullif(btrim(inviter_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(inviter_identity.raw_user_meta_data->>'picture'), '')
        ) ~ '^https://'
        then coalesce(
          nullif(btrim(inviter_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(inviter_identity.raw_user_meta_data->>'picture'), '')
        )
        else null
      end::text,
      invite.id,
      invite.code::text,
      invite.created_by,
      invite.created_at
    from public.kwilt_invites invite
    left join auth.users inviter_identity
      on inviter_identity.id = invite.created_by
    where invite.entity_type = 'goal'
      and invite.intended_recipient_user_id = v_actor
      and invite.recipient_state = 'pending'

    union all

    select
      'with_you'::text,
      membership.entity_id::text,
      coalesce(nullif(owner_goal.data->>'title', ''), 'Shared goal')::text,
      'active'::text,
      coalesce(
        nullif(btrim(owner_identity.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(owner_identity.raw_user_meta_data->>'name'), ''),
        'Goal owner'
      )::text,
      case
        when coalesce(
          nullif(btrim(owner_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(owner_identity.raw_user_meta_data->>'picture'), '')
        ) ~ '^https://'
        then coalesce(
          nullif(btrim(owner_identity.raw_user_meta_data->>'avatar_url'), ''),
          nullif(btrim(owner_identity.raw_user_meta_data->>'picture'), '')
        )
        else null
      end::text,
      null::uuid,
      null::text,
      owner_membership.user_id,
      membership.updated_at
    from public.kwilt_memberships membership
    join lateral (
      select candidate.user_id
      from public.kwilt_memberships candidate
      where candidate.entity_type = membership.entity_type
        and candidate.entity_id = membership.entity_id
        and candidate.status = 'active'
        and candidate.role in ('owner', 'co_owner')
      order by case when candidate.role = 'owner' then 0 else 1 end
      limit 1
    ) owner_membership on true
    left join public.kwilt_goals owner_goal
      on owner_goal.user_id = owner_membership.user_id
     and owner_goal.id = membership.entity_id
    left join auth.users owner_identity
      on owner_identity.id = owner_membership.user_id
    where membership.entity_type = 'goal'
      and membership.user_id = v_actor
      and membership.status = 'active'
      and membership.role not in ('owner', 'co_owner')
  )
  select
    row.row_direction,
    row.row_goal_id,
    row.row_goal_title,
    row.row_access_state,
    row.row_counterpart_name,
    row.row_counterpart_avatar_url,
    row.row_invite_id,
    row.row_invite_code,
    row.row_counterpart_user_id,
    row.row_changed_at
  from sharing_rows row
  order by row.row_direction, row.row_changed_at desc;
end;
$$;

create or replace function public.revoke_kwilt_targeted_goal_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  invite public.kwilt_invites%rowtype;
begin
  if v_actor is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;

  select *
  into invite
  from public.kwilt_invites candidate
  where candidate.id = p_invite_id
    and candidate.entity_type = 'goal'
    and candidate.intended_recipient_user_id is not null
  for update;

  if not found or invite.created_by <> v_actor then
    raise exception 'invite_not_found';
  end if;
  if invite.recipient_state = 'revoked' then
    return jsonb_build_object('state', 'revoked', 'replayed', true);
  end if;
  if invite.recipient_state <> 'pending' then
    raise exception 'invite_transition_not_allowed';
  end if;

  update public.kwilt_invites
  set recipient_state = 'revoked', responded_at = now()
  where id = invite.id;

  return jsonb_build_object('state', 'revoked', 'replayed', false);
end;
$$;

revoke all on function public.get_kwilt_goal_share_recipients() from public, anon;
revoke all on function public.create_kwilt_targeted_goal_invite(text, text, text, text, uuid) from public, anon;
revoke all on function public.respond_to_kwilt_targeted_goal_invite(text, text) from public, anon;
revoke all on function public.get_kwilt_goal_sharing() from public, anon;
revoke all on function public.revoke_kwilt_targeted_goal_invite(uuid) from public, anon;

grant execute on function public.get_kwilt_goal_share_recipients() to authenticated;
grant execute on function public.create_kwilt_targeted_goal_invite(text, text, text, text, uuid) to authenticated;
grant execute on function public.respond_to_kwilt_targeted_goal_invite(text, text) to authenticated;
grant execute on function public.get_kwilt_goal_sharing() to authenticated;
grant execute on function public.revoke_kwilt_targeted_goal_invite(uuid) to authenticated;

comment on function public.get_kwilt_goal_share_recipients() is
  'Returns a deduplicated, minimum-field list of active Friends and authenticated Household members eligible for an explicit Goal invitation.';
comment on function public.create_kwilt_targeted_goal_invite(text, text, text, text, uuid) is
  'Resolves a trusted relationship server-side and creates or reuses one recipient-bound pending Goal invitation.';
comment on function public.respond_to_kwilt_targeted_goal_invite(text, text) is
  'Atomically accepts or declines a targeted Goal invitation as its intended authenticated recipient.';
comment on function public.get_kwilt_goal_sharing() is
  'Returns only the authenticated person Goal shares they created or received, with minimum fields needed for lifecycle decisions.';
comment on function public.revoke_kwilt_targeted_goal_invite(uuid) is
  'Revokes a still-pending targeted Goal invitation as its creator.';

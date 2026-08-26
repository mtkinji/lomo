-- Additive shared Meal Cart authority. Legacy organizer choice rounds remain
-- intact for released clients and historical records.

insert into public.kwilt_child_capability_catalog(capability_id, display_name, available_for_activation)
values ('meal-planning', 'Meal Planning', true)
on conflict (capability_id) do update set
  display_name = excluded.display_name,
  available_for_activation = excluded.available_for_activation;

create table public.kwilt_meal_candidate_reactions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.kwilt_meal_plan_candidates(id) on delete cascade,
  person_id uuid not null references public.kwilt_people(id) on delete restrict,
  reaction text not null default 'sounds_good' check (reaction = 'sounds_good'),
  created_at timestamptz not null default now(),
  unique(candidate_id, person_id)
);

create index kwilt_meal_candidate_reactions_candidate_idx
  on public.kwilt_meal_candidate_reactions(candidate_id, created_at);
create index kwilt_meal_candidate_reactions_person_idx
  on public.kwilt_meal_candidate_reactions(person_id);

create or replace function public.kwilt_shared_meal_cart_membership(p_household_id uuid)
returns public.kwilt_household_memberships
language sql
stable
security definer
set search_path = ''
as $$
  select membership.*
  from public.kwilt_household_memberships membership
  join public.kwilt_person_auth_bindings binding
    on binding.person_id = membership.person_id
   and binding.status = 'active'
  where membership.household_id = p_household_id
    and membership.status = 'active'
    and binding.user_id = auth.uid()
    and (
      membership.role in ('owner', 'caregiver')
      or exists (
        select 1
        from public.kwilt_child_capability_activations activation
        where activation.household_id = membership.household_id
          and activation.child_membership_id = membership.id
          and activation.capability_id = 'meal-planning'
          and activation.state = 'active'
      )
    )
  limit 1
$$;

create or replace function public.kwilt_can_access_shared_meal_cart(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_meal_plans plan
    cross join lateral public.kwilt_shared_meal_cart_membership(plan.household_id) actor
    where plan.id = p_plan_id
      and actor.id is not null
      and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
  )
$$;

alter table public.kwilt_meal_candidate_reactions enable row level security;

create policy kwilt_meal_candidate_reactions_member_read
  on public.kwilt_meal_candidate_reactions for select to authenticated
  using (exists (
    select 1
    from public.kwilt_meal_plan_candidates candidate
    where candidate.id = candidate_id
      and public.kwilt_can_access_shared_meal_cart(candidate.plan_id)
  ));

drop policy kwilt_meal_candidates_organizer_read on public.kwilt_meal_plan_candidates;
create policy kwilt_meal_candidates_authorized_read
  on public.kwilt_meal_plan_candidates for select to authenticated
  using (
    public.kwilt_is_meal_plan_organizer(plan_id)
    or public.kwilt_can_access_shared_meal_cart(plan_id)
  );

create or replace function public.get_kwilt_shared_meal_cart(p_household_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;

  select * into v_plan
  from public.kwilt_meal_plans plan
  where plan.household_id = p_household_id and plan.state = 'draft'
  order by plan.updated_at desc, plan.created_at desc
  limit 1;
  if v_plan.id is null then
    select * into v_plan
    from public.kwilt_meal_plans plan
    where plan.household_id = p_household_id and plan.state = 'finalized'
    order by plan.finalized_at desc nulls last, plan.updated_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'planId', v_plan.id,
    'householdId', p_household_id,
    'version', v_plan.version,
    'state', v_plan.state,
    'viewer', jsonb_build_object(
      'personId', v_actor.person_id,
      'role', v_actor.role,
      'canAdd', true,
      'canSettle', coalesce(v_plan.organizer_membership_id = v_actor.id and v_plan.state = 'draft', false)
    ),
    'candidates', case when v_plan.id is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', candidate.id,
        'kind', candidate.kind,
        'title', candidate.title,
        'recipeSnapshot', candidate.recipe_snapshot,
        'position', candidate.position,
        'selected', v_plan.state = 'draft' or exists (
          select 1 from public.kwilt_meal_plan_entries entry
          where entry.plan_id = v_plan.id
            and entry.plan_version = v_plan.version
            and entry.candidate_id = candidate.id
        ),
        'contributor', jsonb_build_object(
          'personId', contributor.id,
          'displayName', contributor.display_name,
          'avatarUrl', null
        ),
        'supporters', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'personId', supporter.id,
            'displayName', supporter.display_name,
            'avatarUrl', null
          ) order by reaction.created_at, supporter.display_name), '[]'::jsonb)
          from public.kwilt_meal_candidate_reactions reaction
          join public.kwilt_people supporter on supporter.id = reaction.person_id
          where reaction.candidate_id = candidate.id
        ),
        'canWithdraw', v_plan.state = 'draft' and (
          candidate.suggested_by_person_id = v_actor.person_id
          or v_plan.organizer_membership_id = v_actor.id
        )
      ) order by candidate.position), '[]'::jsonb)
      from public.kwilt_meal_plan_candidates candidate
      join public.kwilt_people contributor on contributor.id = candidate.suggested_by_person_id
      where candidate.plan_id = v_plan.id
    ) end
  );
end;
$$;

create or replace function public.add_kwilt_shared_meal_candidate(
  p_household_id uuid,
  p_candidate_id uuid,
  p_candidate jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_owner public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
  v_existing public.kwilt_meal_plan_candidates;
  v_kind text := coalesce(p_candidate->>'kind', 'meal_note');
  v_title text := btrim(coalesce(p_candidate->>'title', ''));
  v_snapshot jsonb := p_candidate->'recipeSnapshot';
  v_position integer;
begin
  select * into v_actor from public.kwilt_shared_meal_cart_membership(p_household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if p_candidate_id is null or jsonb_typeof(p_candidate) <> 'object'
    or v_kind not in ('recipe', 'meal_note')
    or char_length(v_title) not between 1 and 160
    or ((v_kind = 'recipe') <> (jsonb_typeof(v_snapshot) = 'object'))
  then raise exception 'invalid_meal_candidate'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household_id::text, 2086));

  select * into v_existing from public.kwilt_meal_plan_candidates where id = p_candidate_id;
  if v_existing.id is not null then
    if v_existing.suggested_by_person_id <> v_actor.person_id
      or v_existing.title <> v_title
      or v_existing.kind <> v_kind
      or v_existing.recipe_snapshot is distinct from v_snapshot
    then raise exception 'shared_meal_candidate_idempotency_conflict'; end if;
    return jsonb_build_object('planId', v_existing.plan_id, 'candidateId', v_existing.id, 'replayed', true);
  end if;

  select * into v_plan
  from public.kwilt_meal_plans plan
  where plan.household_id = p_household_id and plan.state = 'draft'
  order by plan.updated_at desc, plan.created_at desc
  limit 1 for update;
  if v_plan.id is null then
    select * into v_owner
    from public.kwilt_household_memberships membership
    where membership.household_id = p_household_id
      and membership.status = 'active' and membership.role = 'owner';
    if v_owner.id is null then raise exception 'meal_plan_organizer_required'; end if;
    insert into public.kwilt_meal_plans(
      household_id, organizer_membership_id, organizer_person_id, horizon
    ) values (
      p_household_id, v_owner.id, v_owner.person_id, jsonb_build_object('kind', 'open')
    ) returning * into v_plan;
  end if;
  select count(*)::integer into v_position
  from public.kwilt_meal_plan_candidates where plan_id = v_plan.id;
  if v_position >= 60 then raise exception 'invalid_meal_candidates'; end if;

  insert into public.kwilt_meal_plan_candidates(
    id, plan_id, position, kind, title, recipe_snapshot, suggested_by_person_id
  ) values (
    p_candidate_id, v_plan.id, v_position, v_kind, v_title, v_snapshot, v_actor.person_id
  );
  insert into public.kwilt_meal_candidate_reactions(candidate_id, person_id)
  values(p_candidate_id, v_actor.person_id);
  update public.kwilt_meal_plans
  set version = version + 1, updated_at = now()
  where id = v_plan.id returning * into v_plan;
  return jsonb_build_object('planId', v_plan.id, 'candidateId', p_candidate_id, 'version', v_plan.version, 'replayed', false);
end;
$$;

create or replace function public.withdraw_kwilt_shared_meal_candidate(p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
  v_candidate public.kwilt_meal_plan_candidates;
begin
  select candidate.* into v_candidate
  from public.kwilt_meal_plan_candidates candidate where candidate.id = p_candidate_id;
  select plan.* into v_plan from public.kwilt_meal_plans plan where plan.id = v_candidate.plan_id for update;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state <> 'draft' then raise exception 'meal_plan_not_editable'; end if;
  if v_candidate.suggested_by_person_id <> v_actor.person_id and v_plan.organizer_membership_id <> v_actor.id
    then raise exception 'shared_meal_candidate_withdraw_forbidden'; end if;
  delete from public.kwilt_meal_plan_candidates where id = p_candidate_id;
  with ordered as (
    select id, row_number() over(order by position, created_at, id) - 1 as next_position
    from public.kwilt_meal_plan_candidates where plan_id = v_plan.id
  )
  update public.kwilt_meal_plan_candidates candidate
  set position = ordered.next_position
  from ordered where candidate.id = ordered.id;
  update public.kwilt_meal_plans set version = version + 1, updated_at = now()
  where id = v_plan.id returning * into v_plan;
  return jsonb_build_object('planId', v_plan.id, 'candidateId', p_candidate_id, 'version', v_plan.version);
end;
$$;

create or replace function public.set_kwilt_shared_meal_reaction(p_candidate_id uuid, p_reacted boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
  v_actor public.kwilt_household_memberships;
  v_plan public.kwilt_meal_plans;
  v_candidate public.kwilt_meal_plan_candidates;
begin
  select candidate.* into v_candidate
  from public.kwilt_meal_plan_candidates candidate where candidate.id = p_candidate_id;
  select * into v_plan from public.kwilt_meal_plans where id = v_candidate.plan_id;
  select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  if v_actor.id is null then raise exception 'shared_meal_cart_access_required'; end if;
  if v_plan.state <> 'draft' then raise exception 'meal_plan_not_editable'; end if;
  if v_candidate.suggested_by_person_id = v_actor.person_id and not p_reacted
    then raise exception 'cannot_remove_contributor_support'; end if;
  if p_reacted then
    insert into public.kwilt_meal_candidate_reactions(candidate_id, person_id)
    values(p_candidate_id, v_actor.person_id) on conflict(candidate_id, person_id) do nothing;
  else
    delete from public.kwilt_meal_candidate_reactions
    where candidate_id = p_candidate_id and person_id = v_actor.person_id;
  end if;
  return jsonb_build_object('candidateId', p_candidate_id, 'reacted', p_reacted);
end;
$$;

grant select on public.kwilt_meal_candidate_reactions to authenticated;
revoke insert, update, delete on public.kwilt_meal_candidate_reactions from public, anon, authenticated;

revoke execute on function public.kwilt_shared_meal_cart_membership(uuid), public.kwilt_can_access_shared_meal_cart(uuid) from public, anon, authenticated;
grant execute on function public.kwilt_can_access_shared_meal_cart(uuid) to authenticated;
revoke execute on function public.get_kwilt_shared_meal_cart(uuid), public.add_kwilt_shared_meal_candidate(uuid,uuid,jsonb), public.withdraw_kwilt_shared_meal_candidate(uuid), public.set_kwilt_shared_meal_reaction(uuid,boolean) from public, anon;
grant execute on function public.get_kwilt_shared_meal_cart(uuid), public.add_kwilt_shared_meal_candidate(uuid,uuid,jsonb), public.withdraw_kwilt_shared_meal_candidate(uuid), public.set_kwilt_shared_meal_reaction(uuid,boolean) to authenticated;

do $$
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kwilt_meal_plan_candidates') then
      alter publication supabase_realtime add table public.kwilt_meal_plan_candidates;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kwilt_meal_candidate_reactions') then
      alter publication supabase_realtime add table public.kwilt_meal_candidate_reactions;
    end if;
  end if;
end $$;

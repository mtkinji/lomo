-- Resolve canonical Household Money access to one owner dataset. This prevents
-- Hosted migration version: 20260901040803.
-- two adults' pre-existing personal Money rows from merging into one snapshot.

create or replace function private.budget_canonical_adult_owner_user_id(p_actor_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select owner_binding.user_id
  from public.kwilt_person_auth_bindings actor_binding
  join public.kwilt_household_memberships actor_membership
    on actor_membership.person_id = actor_binding.person_id
   and actor_membership.status = 'active'
   and actor_membership.role in ('owner', 'caregiver')
  join public.kwilt_household_memberships owner_membership
    on owner_membership.household_id = actor_membership.household_id
   and owner_membership.status = 'active'
   and owner_membership.role = 'owner'
  join public.kwilt_person_auth_bindings owner_binding
    on owner_binding.person_id = owner_membership.person_id
   and owner_binding.status = 'active'
  where actor_binding.user_id = p_actor_user_id
    and actor_binding.status = 'active'
  order by actor_membership.joined_at, actor_membership.id
  limit 1;
$$;

create or replace function private.budget_actor_is_active_household_child(p_actor_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_person_auth_bindings binding
    join public.kwilt_household_memberships membership
      on membership.person_id = binding.person_id
     and membership.status = 'active'
     and membership.role = 'child'
    where binding.user_id = p_actor_user_id
      and binding.status = 'active'
  );
$$;

revoke all on function private.budget_canonical_adult_owner_user_id(uuid) from public, anon;
revoke all on function private.budget_actor_is_active_household_child(uuid) from public, anon;
grant execute on function private.budget_canonical_adult_owner_user_id(uuid) to authenticated;
grant execute on function private.budget_actor_is_active_household_child(uuid) to authenticated;

create or replace function public.can_access_budget_user(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with context as (
    select
      private.budget_canonical_adult_owner_user_id((select auth.uid())) as canonical_owner_user_id,
      private.budget_actor_is_active_household_child((select auth.uid())) as active_household_child
  )
  select (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
    and case
      when context.active_household_child then false
      when context.canonical_owner_user_id is not null
        then target_user_id = context.canonical_owner_user_id
      else target_user_id = (select auth.uid())
        or exists (
          select 1
          from public.budget_household_members viewer
          join public.budget_household_members target
            on target.household_id = viewer.household_id
          where viewer.user_id = (select auth.uid())
            and viewer.status = 'active'
            and target.user_id = target_user_id
            and target.status = 'active'
        )
    end
  from context;
$$;

create or replace function private.budget_effective_owner_user_id(p_actor_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  with legacy_owner as (
    select household.owner_user_id as user_id
    from public.budget_household_members member
    join public.budget_households household on household.id = member.household_id
    where member.user_id = p_actor_user_id
      and member.status = 'active'
    order by member.joined_at, member.id
    limit 1
  )
  select case
    when private.budget_actor_is_active_household_child(p_actor_user_id) then null
    else coalesce(
      private.budget_canonical_adult_owner_user_id(p_actor_user_id),
      (select user_id from legacy_owner),
      p_actor_user_id
    )
  end;
$$;

create or replace function public.budget_effective_owner_user_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null
      or coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is true
    then null
    else private.budget_effective_owner_user_id((select auth.uid()))
  end;
$$;

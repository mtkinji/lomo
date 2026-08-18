-- Resolve an auth provider's presentation photo when an account has not yet
-- chosen a Kwilt-managed canonical avatar. Provider metadata remains
-- presentation-only and never participates in membership or authority.

drop function public.kwilt_resolve_household_avatars(uuid);
drop function public.kwilt_resolve_self_avatar(uuid);

create function public.kwilt_resolve_self_avatar(p_actor_user_id uuid)
returns table(avatar_source text, storage_path text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  with actor as (
    select account_user.id,
      coalesce(
        nullif(trim(account_user.raw_user_meta_data->>'picture'), ''),
        nullif(trim(account_user.raw_user_meta_data->>'avatar_url'), '')
      ) as provider_avatar_url
    from auth.users account_user
    where account_user.id = public.kwilt_require_avatar_actor(p_actor_user_id)
  )
  select
    case
      when account_avatar.storage_path is not null or actor.provider_avatar_url is not null then 'account'
      else 'initials'
    end as avatar_source,
    account_avatar.storage_path,
    case when account_avatar.storage_path is null then actor.provider_avatar_url end as avatar_url
  from actor
  left join public.kwilt_account_avatars account_avatar on account_avatar.user_id = actor.id
$$;

create function public.kwilt_resolve_household_avatars(p_actor_user_id uuid)
returns table(membership_id uuid, avatar_source text, storage_path text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  with actor_membership as (
    select membership.household_id
    from public.kwilt_household_memberships membership
    join public.kwilt_person_auth_bindings binding
      on binding.person_id = membership.person_id and binding.status = 'active'
    where binding.user_id = public.kwilt_require_avatar_actor(p_actor_user_id)
      and membership.status = 'active'
    order by membership.joined_at
    limit 1
  ), household_people as (
    select
      membership.id as membership_id,
      membership.joined_at,
      person.managed_avatar_storage_path,
      account_avatar.storage_path as account_storage_path,
      coalesce(
        nullif(trim(account_user.raw_user_meta_data->>'picture'), ''),
        nullif(trim(account_user.raw_user_meta_data->>'avatar_url'), '')
      ) as provider_avatar_url
    from actor_membership actor
    join public.kwilt_household_memberships membership
      on membership.household_id = actor.household_id and membership.status = 'active'
    join public.kwilt_people person on person.id = membership.person_id
    left join public.kwilt_person_auth_bindings binding
      on binding.person_id = person.id and binding.status = 'active'
    left join auth.users account_user on account_user.id = binding.user_id
    left join public.kwilt_account_avatars account_avatar
      on account_avatar.user_id = binding.user_id
  )
  select
    person.membership_id,
    case
      when person.account_storage_path is not null or person.provider_avatar_url is not null then 'account'
      when person.managed_avatar_storage_path is not null then 'dependent'
      else 'initials'
    end as avatar_source,
    case
      when person.account_storage_path is not null then person.account_storage_path
      when person.provider_avatar_url is not null then null
      else person.managed_avatar_storage_path
    end as storage_path,
    case when person.account_storage_path is null then person.provider_avatar_url end as avatar_url
  from household_people person
  order by person.joined_at
$$;

revoke execute on function public.kwilt_resolve_household_avatars(uuid) from public, anon, authenticated;
revoke execute on function public.kwilt_resolve_self_avatar(uuid) from public, anon, authenticated;
grant execute on function public.kwilt_resolve_household_avatars(uuid) to service_role;
grant execute on function public.kwilt_resolve_self_avatar(uuid) to service_role;

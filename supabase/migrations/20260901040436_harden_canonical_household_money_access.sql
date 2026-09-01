-- Anonymous Supabase Auth users also assume the authenticated database role.
-- Hosted migration version: 20260901040436.
-- Keep Money access and shared Money writes limited to permanent accounts.

create or replace function public.can_access_budget_user(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) is false
    and (
      target_user_id = (select auth.uid())
      or private.budget_users_share_adult_household((select auth.uid()), target_user_id)
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
    );
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

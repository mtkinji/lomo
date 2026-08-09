-- Keep the RLS predicate callable by policies without exposing it as a public
-- Data API RPC.
create schema if not exists kwilt_internal;
revoke all on schema kwilt_internal from public, anon;
grant usage on schema kwilt_internal to authenticated;

create or replace function kwilt_internal.can_access_shared_meal_cart(p_plan_id uuid)
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

revoke execute on function kwilt_internal.can_access_shared_meal_cart(uuid) from public, anon;
grant execute on function kwilt_internal.can_access_shared_meal_cart(uuid) to authenticated;

drop policy kwilt_meal_candidate_reactions_member_read on public.kwilt_meal_candidate_reactions;
create policy kwilt_meal_candidate_reactions_member_read
  on public.kwilt_meal_candidate_reactions for select to authenticated
  using (exists (
    select 1
    from public.kwilt_meal_plan_candidates candidate
    where candidate.id = candidate_id
      and kwilt_internal.can_access_shared_meal_cart(candidate.plan_id)
  ));

drop policy kwilt_meal_candidates_authorized_read on public.kwilt_meal_plan_candidates;
create policy kwilt_meal_candidates_authorized_read
  on public.kwilt_meal_plan_candidates for select to authenticated
  using (
    public.kwilt_is_meal_plan_organizer(plan_id)
    or kwilt_internal.can_access_shared_meal_cart(plan_id)
  );

drop function public.kwilt_can_access_shared_meal_cart(uuid);

create index if not exists kwilt_meal_plan_candidates_suggester_idx
  on public.kwilt_meal_plan_candidates(suggested_by_person_id);

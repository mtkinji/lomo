-- Fix RLS recursion in kwilt_is_member
--
-- The previous version of kwilt_is_member was STABLE but not SECURITY DEFINER.
-- When used in an RLS policy on kwilt_memberships, it would trigger a recursive
-- check because the function itself queries kwilt_memberships, which then
-- triggers the RLS policy again.
--
-- By making it SECURITY DEFINER and setting a search_path, it runs with the
-- privileges of the creator (usually postgres) and bypasses RLS for its internal
-- query, breaking the recursion.

create or replace function public.kwilt_is_member(p_entity_type text, p_entity_id uuid, p_uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.kwilt_memberships m
    where m.entity_type = p_entity_type
      and m.entity_id = p_entity_id
      and m.user_id = p_uid
      and m.status = 'active'
  );
end;
$$;


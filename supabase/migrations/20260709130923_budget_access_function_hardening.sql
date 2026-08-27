revoke execute on function public.can_access_budget_household(uuid) from public;
revoke execute on function public.can_access_budget_household(uuid) from anon;
revoke execute on function public.can_access_budget_user(uuid) from public;
revoke execute on function public.can_access_budget_user(uuid) from anon;

grant execute on function public.can_access_budget_household(uuid) to authenticated;
grant execute on function public.can_access_budget_user(uuid) to authenticated;
;

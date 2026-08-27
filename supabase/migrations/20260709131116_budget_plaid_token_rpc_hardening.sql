revoke execute on function public.store_budget_plaid_access_token(uuid, text) from public;
revoke execute on function public.store_budget_plaid_access_token(uuid, text) from anon;
revoke execute on function public.store_budget_plaid_access_token(uuid, text) from authenticated;

revoke execute on function public.get_budget_plaid_access_token(uuid) from public;
revoke execute on function public.get_budget_plaid_access_token(uuid) from anon;
revoke execute on function public.get_budget_plaid_access_token(uuid) from authenticated;

grant execute on function public.store_budget_plaid_access_token(uuid, text) to service_role;
grant execute on function public.get_budget_plaid_access_token(uuid) to service_role;
;

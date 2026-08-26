create or replace function public.store_budget_plaid_access_token(
  p_connection_id uuid,
  p_access_token text
)
returns void
language plpgsql
security definer
set search_path = budget_private, public
as $$
begin
  insert into budget_private.budget_plaid_tokens (
    connection_id,
    access_token
  )
  values (
    p_connection_id,
    p_access_token
  )
  on conflict (connection_id)
  do update set
    access_token = excluded.access_token,
    updated_at = now();
end;
$$;

create or replace function public.get_budget_plaid_access_token(
  p_connection_id uuid
)
returns text
language sql
security definer
set search_path = budget_private, public
as $$
  select access_token
  from budget_private.budget_plaid_tokens
  where connection_id = p_connection_id;
$$;

revoke all on function public.store_budget_plaid_access_token(uuid, text) from public;
revoke all on function public.get_budget_plaid_access_token(uuid) from public;

grant execute on function public.store_budget_plaid_access_token(uuid, text) to service_role;
grant execute on function public.get_budget_plaid_access_token(uuid) to service_role;
;

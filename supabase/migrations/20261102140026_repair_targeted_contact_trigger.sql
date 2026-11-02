-- Keep table-specific NEW fields out of expressions prepared for other row
-- shapes. SQL AND is not a control-flow boundary for PL/pgSQL record fields.
-- Forward repair: preserve the historical migration and existing trigger ACL.
create or replace function public.suppress_blocked_targeted_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'kwilt_invites' then
    if new.intended_recipient_user_id is not null
      and public.kwilt_users_blocked(new.created_by, new.intended_recipient_user_id) then
      raise exception using errcode = '42501', message = 'blocked_relationship';
    end if;
  elsif tg_table_name = 'kwilt_shared_deliveries' then
    if new.actor_user_id is not null
      and public.kwilt_users_blocked(new.actor_user_id, new.recipient_user_id) then
      raise exception using errcode = '42501', message = 'blocked_relationship';
    end if;
  end if;
  return new;
end;
$$;

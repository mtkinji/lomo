-- Run after the full local migration chain. Never against production.
begin;
do $$
declare signature text;
begin
  foreach signature in array array[
    'public.get_kwilt_external_food_control_snapshot(uuid)',
    'public.list_kwilt_external_recipe_catalog_v2(uuid,text,integer)',
    'public.get_kwilt_external_meal_cart_history(uuid,uuid)',
    'public.execute_kwilt_external_food_operations(uuid,text,text,text,jsonb,jsonb)'
  ] loop
    if has_function_privilege('anon',signature,'EXECUTE') or has_function_privilege('authenticated',signature,'EXECUTE') then
      raise exception 'external actor bridge exposed: %',signature;
    end if;
    if not has_function_privilege('service_role',signature,'EXECUTE') then raise exception 'missing service bridge grant'; end if;
  end loop;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}',true);
do $$ begin
  begin
    perform public.get_kwilt_external_food_control_snapshot('00000000-0000-0000-0000-000000000002');
    raise exception 'authenticated caller impersonated another actor';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ begin
  begin
    perform public.get_kwilt_external_food_control_snapshot('00000000-0000-0000-0000-000000000002');
    raise exception 'missing actor accepted';
  exception when others then
    if sqlerrm <> 'external_food_actor_unavailable' then raise; end if;
  end;
  if auth.jwt()->>'role' <> 'service_role' then raise exception 'actor claims leaked on failure'; end if;
end $$;
rollback;

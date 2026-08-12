-- Rollback-only smoke assertions for the persistent household Plan schema.
begin;

do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='kwilt_meal_plan_candidates' and column_name='lifecycle_state') then raise exception 'Plan lifecycle missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='kwilt_grocery_item_sources' and column_name='plan_candidate_id') then raise exception 'candidate grocery provenance missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='kwilt_grocery_item_sources' and column_name='contribution_quantity_min') then raise exception 'candidate contribution quantity missing'; end if;
  if has_function_privilege('authenticated','public.sync_kwilt_household_plan_groceries(uuid,uuid,integer,text,uuid[],text,jsonb)','EXECUTE') then raise exception 'compiled household grocery authority exposed to clients'; end if;
  if not has_function_privilege('service_role','public.sync_kwilt_household_plan_groceries(uuid,uuid,integer,text,uuid[],text,jsonb)','EXECUTE') then raise exception 'compiled household grocery authority unavailable to server'; end if;
end $$;

rollback;

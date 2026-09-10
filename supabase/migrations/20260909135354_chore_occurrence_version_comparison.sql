-- Chores snapshots serialize updatedAt as ISO timestamps. Comparing them to
-- timestamp::text rejects the same instant and NULL used to bypass the guard.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.execute_kwilt_agent_chore_action(uuid,jsonb,uuid,text)'::regprocedure);
 if position('v_occurrence.updated_at::text<>v_expected' in definition)=0 then raise exception 'Chore occurrence version guard changed'; end if;
 definition:=replace(definition,'v_occurrence.updated_at::text<>v_expected','v_occurrence.updated_at is distinct from nullif(v_expected,'''')::timestamptz');
 definition:=replace(definition,'v_occurrence.updated_at::text<>(v_fields->>''expectedUpdatedAt'')','v_occurrence.updated_at is distinct from nullif(v_fields->>''expectedUpdatedAt'','''')::timestamptz');
 execute definition;
end;
$$;

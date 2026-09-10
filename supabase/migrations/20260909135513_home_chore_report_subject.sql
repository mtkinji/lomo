-- Automatic updates have a household-person subject, never a fabricated author account.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('kwilt_home_private.command(text,jsonb)'::regprocedure);
 if position('reporter_user_id,reported_user_id,target_kind' in definition)=0 then raise exception 'Home report insert changed'; end if;
 definition:=replace(definition,'reporter_user_id,reported_user_id,target_kind','reporter_user_id,reported_user_id,reported_person_id,target_kind');
 definition:=replace(definition,'values(u,target,case when args->>''kind''=''home_reply''',
 'values(u,target,case when p.kind=''chore_update'' and args->>''kind'' is distinct from ''home_reply'' then (select person_id from public.kwilt_household_memberships where id=p.chore_membership_id) else null end,case when args->>''kind''=''home_reply''');
 definition:=replace(definition,'''followup'',case when exists(select 1 from public.kwilt_households h',
 '''followup'',case when (p.kind=''chore_update'' and args->>''kind'' is distinct from ''home_reply'') or exists(select 1 from public.kwilt_households h');
 execute definition;
end;
$$;

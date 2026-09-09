-- Run inside a transaction and ROLLBACK. Requires administrative test access.
-- Compare optimized RLS with the unchanged canonical predicate for every
-- current auth actor and transaction owner, without exposing transaction data.
create temporary table money_read_test_actors as select id from auth.users;
create temporary table money_read_test_owners as
  select user_id, count(*)::bigint as rows from public.budget_transactions group by user_id;
grant select on money_read_test_actors, money_read_test_owners to authenticated;
set local role authenticated;
set local statement_timeout = '3s';
do $$
declare actor record; expected jsonb; visible jsonb; actual bigint;
begin
  for actor in select id from money_read_test_actors loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub',actor.id,'role','authenticated','is_anonymous',false)::text, true);
    select coalesce(jsonb_object_agg(user_id, rows),'{}'::jsonb) into expected from money_read_test_owners where public.can_access_budget_user(user_id);
    select coalesce(jsonb_object_agg(user_id, rows),'{}'::jsonb) into visible from (select user_id,count(*) as rows from public.budget_transactions group by user_id) q;
    if visible <> expected then raise exception 'Transaction owner/count authority differs for actor %', actor.id; end if;
  end loop;
  perform set_config('request.jwt.claims', '{"role":"authenticated","is_anonymous":false}', true);
  select count(*) into actual from public.budget_transactions;
  if actual <> 0 then raise exception 'Signed-out actor could read transactions'; end if;
  for actor in select id from money_read_test_actors loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub',actor.id,'role','authenticated','is_anonymous',true)::text, true);
    select count(*) into actual from public.budget_transactions;
    if actual <> 0 then raise exception 'Anonymous actor could read transactions'; end if;
  end loop;
end $$;
reset role;
select 'Transaction read authority matches canonical predicate; signed-out and anonymous denied' as result;

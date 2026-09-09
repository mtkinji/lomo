-- Run within a transaction and roll back. Uses an existing user only as a FK;
-- never touches existing connections or provider credentials.
do $$
declare c uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); j public.budget_plaid_jobs; stamp timestamptz;
begin
  insert into public.budget_financial_connections(id,user_id,environment,plaid_item_id,status)
    select c,id,'sandbox','test-lifecycle-'||c,'healthy' from auth.users limit 1;
  if not found then raise exception 'test requires one auth user'; end if;
  select updated_at into stamp from public.budget_financial_connections where id=c;
  if not public.acquire_budget_plaid_lease(c,t) then raise exception 'first lease not acquired'; end if;
  if public.acquire_budget_plaid_lease(c,gen_random_uuid()) then raise exception 'concurrent lease acquired'; end if;
  if public.acquire_budget_plaid_lease(c,gen_random_uuid(),true,stamp) then raise exception 'disconnect raced sync'; end if;
  perform public.enqueue_budget_plaid_sync(c);
  select * into j from public.budget_plaid_jobs where connection_id=c;
  update public.budget_plaid_jobs set lease_token=t where connection_id=c;
  perform public.enqueue_budget_plaid_sync(c);
  perform public.finish_budget_plaid_job(c,t,j.generation,null);
  if not exists(select 1 from public.budget_plaid_jobs where connection_id=c and generation=j.generation+1 and lease_token is null) then raise exception 'new webhook lost during completion'; end if;
  perform public.record_budget_plaid_event(c,'PENDING_EXPIRATION');
  perform public.finish_budget_plaid_sync(c,t,0,'cursor',1,0,0);
  if (select last_error from public.budget_financial_connections where id=c)<>'PENDING_EXPIRATION' then raise exception 'sync erased newer webhook'; end if;
  perform public.finish_budget_plaid_sync(c,t,1,null,0,0,0,false,'SYNC_FAILED');
  if (select last_error from public.budget_financial_connections where id=c)<>'PENDING_EXPIRATION' then raise exception 'sync failure erased repair warning'; end if;
  perform public.finish_budget_plaid_sync(c,t,1,'cursor',1,0,0,true);
  if (select last_error from public.budget_financial_connections where id=c) is not null then raise exception 'verified repair did not clear warning'; end if;
  select updated_at into stamp from public.budget_financial_connections where id=c;
  delete from public.budget_plaid_leases where connection_id=c;
  if not public.acquire_budget_plaid_lease(c,t,true,stamp) then raise exception 'disconnect lease unavailable'; end if;
  if (select status from public.budget_financial_connections where id=c)<>'disconnecting' then raise exception 'not reserved'; end if;
  insert into budget_private.budget_plaid_tokens(connection_id,access_token) values(c,'test-only');
  perform public.finish_budget_plaid_disconnect(c,t);
  if exists(select 1 from budget_private.budget_plaid_tokens where connection_id=c) then raise exception 'token retained'; end if;
  if exists(select 1 from public.budget_plaid_jobs where connection_id=c) then raise exception 'job retained'; end if;
  if public.acquire_budget_plaid_lease(c,t) then raise exception 'disconnected sync allowed'; end if;
  if has_function_privilege('authenticated','public.claim_budget_plaid_jobs(integer,text)','EXECUTE') then raise exception 'worker exposed'; end if;
  if has_table_privilege('anon','public.budget_plaid_jobs','SELECT') then raise exception 'jobs exposed'; end if;
  delete from public.budget_financial_connections where id=c;
end $$;

alter table public.budget_financial_connections add column if not exists webhook_registered_at timestamptz;
-- Service-only Plaid lifecycle coordination. No client may claim work or read tokens.
alter table public.budget_financial_connections drop constraint if exists budget_financial_connections_status_check;
alter table public.budget_financial_connections add constraint budget_financial_connections_status_check
  check (status in ('linked','syncing','healthy','error','disconnecting','disconnected'));

create table public.budget_plaid_leases (
  connection_id uuid primary key references public.budget_financial_connections(id) on delete cascade,
  token uuid not null,
  expires_at timestamptz not null
);
create table public.budget_plaid_jobs (
  connection_id uuid primary key references public.budget_financial_connections(id) on delete cascade,
  generation bigint not null default 1,
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.budget_plaid_leases enable row level security;
alter table public.budget_plaid_jobs enable row level security;
revoke all on public.budget_plaid_leases, public.budget_plaid_jobs from public, anon, authenticated;
grant all on public.budget_plaid_leases, public.budget_plaid_jobs to service_role;

create or replace function public.acquire_budget_plaid_lease(p_connection_id uuid, p_token uuid, p_disconnect boolean default false, p_expected_updated_at timestamptz default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.budget_financial_connections;
begin
  select * into c from public.budget_financial_connections where id=p_connection_id for update;
  if not found or c.status='disconnected' then return false; end if;
  if not p_disconnect and c.status='disconnecting' then return false; end if;
  if p_disconnect and p_expected_updated_at is distinct from c.updated_at then return false; end if;
  insert into public.budget_plaid_leases(connection_id,token,expires_at)
  values(p_connection_id,p_token,now()+interval '3 minutes')
  on conflict(connection_id) do update set token=excluded.token,expires_at=excluded.expires_at
  where public.budget_plaid_leases.expires_at<now();
  if not found then return false; end if;
  if p_disconnect then update public.budget_financial_connections set status='disconnecting' where id=p_connection_id; end if;
  return true;
end $$;

create or replace function public.renew_budget_plaid_lease(p_connection_id uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.budget_plaid_leases set expires_at=now()+interval '3 minutes'
    where connection_id=p_connection_id and token=p_token and expires_at>now();
  return found;
end $$;

create or replace function public.finish_budget_plaid_disconnect(p_connection_id uuid,p_token uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare confirmed timestamptz;
begin
  perform 1 from public.budget_plaid_leases where connection_id=p_connection_id and token=p_token and expires_at>now() for update;
  if not found then raise exception 'connection lease lost'; end if;
  update public.budget_financial_connections set status='disconnected',sync_cursor=null,last_error=null
    where id=p_connection_id and status='disconnecting' returning updated_at into confirmed;
  if confirmed is null then raise exception 'disconnect state changed'; end if;
  delete from budget_private.budget_plaid_tokens where connection_id=p_connection_id;
  delete from public.budget_plaid_jobs where connection_id=p_connection_id;
  delete from public.budget_plaid_sync_staging where connection_id=p_connection_id;
  delete from public.budget_plaid_leases where connection_id=p_connection_id and token=p_token;
  return confirmed;
end $$;

create or replace function public.enqueue_budget_plaid_sync(p_connection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.budget_financial_connections where id=p_connection_id and status not in ('disconnected','disconnecting')) then return; end if;
  insert into public.budget_plaid_jobs(connection_id) values(p_connection_id)
  on conflict(connection_id) do update set generation=public.budget_plaid_jobs.generation+1,
    available_at=least(public.budget_plaid_jobs.available_at,now()),updated_at=now();
end $$;

create or replace function public.claim_budget_plaid_jobs(p_limit integer default 3,p_environment text default 'production')
returns setof public.budget_plaid_jobs language plpgsql security definer set search_path = '' as $$
begin
  return query with candidates as (
    select j.connection_id from public.budget_plaid_jobs j join public.budget_financial_connections c on c.id=j.connection_id
    where j.available_at<=now() and (j.lease_until is null or j.lease_until<now())
      and c.status not in ('disconnected','disconnecting') and c.environment=p_environment
    order by j.available_at limit least(greatest(p_limit,1),5) for update of j skip locked
  ) update public.budget_plaid_jobs j set lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1
    from candidates c where j.connection_id=c.connection_id returning j.*;
end $$;

create or replace function public.finish_budget_plaid_job(p_connection_id uuid,p_token uuid,p_generation bigint,p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_error is null then
    delete from public.budget_plaid_jobs where connection_id=p_connection_id and lease_token=p_token and generation=p_generation;
    if found then return; end if;
  end if;
  update public.budget_plaid_jobs set lease_token=null,lease_until=null,
    available_at=case when p_error is null or p_error='SYNC_CONTINUE' then now() else now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7))::integer)) end,
    attempts=case when p_error is null then 0 else attempts end,
    last_error=case when p_error ~ '^[A-Z][A-Z0-9_]{1,79}$' then p_error when p_error is not null then 'SYNC_FAILED' else null end,
    updated_at=now()
    where connection_id=p_connection_id and lease_token=p_token;
end $$;

-- Restrict every privileged RPC, including default PUBLIC execute privileges.
revoke all on function public.acquire_budget_plaid_lease(uuid,uuid,boolean,timestamptz),
  public.renew_budget_plaid_lease(uuid,uuid),public.finish_budget_plaid_disconnect(uuid,uuid),
  public.enqueue_budget_plaid_sync(uuid),public.claim_budget_plaid_jobs(integer,text),public.finish_budget_plaid_job(uuid,uuid,bigint,text)
  from public,anon,authenticated;
grant execute on function public.acquire_budget_plaid_lease(uuid,uuid,boolean,timestamptz),
  public.renew_budget_plaid_lease(uuid,uuid),public.finish_budget_plaid_disconnect(uuid,uuid),
  public.enqueue_budget_plaid_sync(uuid),public.claim_budget_plaid_jobs(integer,text),public.finish_budget_plaid_job(uuid,uuid,bigint,text)
  to service_role;

alter table public.budget_financial_connections add column if not exists health_revision bigint not null default 0;
create or replace function public.record_budget_plaid_event(p_connection_id uuid,p_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_code !~ '^[A-Z][A-Z0-9_]{1,79}$' then raise exception 'invalid event code'; end if;
  update public.budget_financial_connections set status='error',last_error=p_code,health_revision=health_revision+1
    where id=p_connection_id and status not in ('disconnecting','disconnected');
end $$;
create or replace function public.finish_budget_plaid_sync(p_connection_id uuid,p_token uuid,p_revision bigint,p_cursor text,p_added integer,p_modified integer,p_removed integer,p_repaired boolean default false,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.budget_plaid_leases where connection_id=p_connection_id and token=p_token and expires_at>now() for update;
  if not found then return false; end if;
  if p_error is not null then
    update public.budget_financial_connections set status='error',last_error=case when p_error ~ '^[A-Z][A-Z0-9_]{1,79}$' then p_error else 'SYNC_FAILED' end
      where id=p_connection_id and health_revision=p_revision and status not in ('disconnecting','disconnected')
      and coalesce(last_error,'') not in ('PENDING_DISCONNECT','PENDING_EXPIRATION','NEW_ACCOUNTS_AVAILABLE','USER_ACCOUNT_REVOKED','USER_PERMISSION_REVOKED');
  else
    update public.budget_financial_connections set sync_cursor=p_cursor,last_synced_at=now(),
      last_sync_added=p_added,last_sync_modified=p_modified,last_sync_removed=p_removed,
      status=case when health_revision<>p_revision or (not p_repaired and coalesce(last_error,'') in ('PENDING_DISCONNECT','PENDING_EXPIRATION','NEW_ACCOUNTS_AVAILABLE','USER_ACCOUNT_REVOKED','USER_PERMISSION_REVOKED')) then status else 'healthy' end,
      last_error=case when health_revision<>p_revision or (not p_repaired and coalesce(last_error,'') in ('PENDING_DISCONNECT','PENDING_EXPIRATION','NEW_ACCOUNTS_AVAILABLE','USER_ACCOUNT_REVOKED','USER_PERMISSION_REVOKED')) then last_error else null end
      where id=p_connection_id and status not in ('disconnecting','disconnected');
  end if;
  return true;
end $$;
revoke all on function public.record_budget_plaid_event(uuid,text),public.finish_budget_plaid_sync(uuid,uuid,bigint,text,integer,integer,integer,boolean,text) from public,anon,authenticated;
grant execute on function public.record_budget_plaid_event(uuid,text),public.finish_budget_plaid_sync(uuid,uuid,bigint,text,integer,integer,integer,boolean,text) to service_role;

create table public.budget_plaid_exchange_leases (
  user_id uuid references auth.users(id) on delete cascade,
  institution_id text not null,
  token uuid not null,
  expires_at timestamptz not null,
  primary key(user_id,institution_id)
);
alter table public.budget_plaid_exchange_leases enable row level security;
revoke all on public.budget_plaid_exchange_leases from public,anon,authenticated;
grant all on public.budget_plaid_exchange_leases to service_role;
create or replace function public.acquire_budget_plaid_exchange(p_user_id uuid,p_institution_id text,p_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  insert into public.budget_plaid_exchange_leases values(p_user_id,p_institution_id,p_token,now()+interval '3 minutes')
  on conflict(user_id,institution_id) do update set token=excluded.token,expires_at=excluded.expires_at
    where public.budget_plaid_exchange_leases.expires_at<now();
  return found;
end $$;
revoke all on function public.acquire_budget_plaid_exchange(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.acquire_budget_plaid_exchange(uuid,text,uuid) to service_role;

create or replace function public.sweep_budget_plaid_jobs(p_environment text)
returns integer language plpgsql security definer set search_path='' as $$
declare queued integer;
begin
  insert into public.budget_plaid_jobs(connection_id)
    select c.id from public.budget_financial_connections c
    where c.environment=p_environment and c.status not in ('disconnecting','disconnected')
      and (c.last_synced_at is null or c.last_synced_at<now()-interval '24 hours' or c.webhook_registered_at is null)
      and not exists(select 1 from public.budget_plaid_jobs j where j.connection_id=c.id)
    order by c.last_synced_at nulls first limit 50 on conflict do nothing;
  get diagnostics queued=row_count; return queued;
end $$;
revoke all on function public.sweep_budget_plaid_jobs(text) from public,anon,authenticated;
grant execute on function public.sweep_budget_plaid_jobs(text) to service_role;

-- Checkpoint large imports across bounded worker invocations. Contains bank data;
-- explicitly deny all client access and delete after cursor commit/disconnect.
create table public.budget_plaid_sync_staging (
  connection_id uuid primary key references public.budget_financial_connections(id) on delete cascade,
  base_cursor text,
  health_revision bigint not null default 0,
  pages jsonb not null default '[]'::jsonb,
  complete boolean not null default false,
  applied_pages integer not null default 0
);
alter table public.budget_plaid_sync_staging enable row level security;
revoke all on public.budget_plaid_sync_staging from public,anon,authenticated;
grant all on public.budget_plaid_sync_staging to service_role;

create or replace function public.verify_budget_plaid_worker(p_secret text)
returns boolean language sql security definer set search_path='' as $$
  select coalesce((select extensions.digest(p_secret,'sha256')=extensions.digest(decrypted_secret,'sha256')
    from vault.decrypted_secrets where name='kwilt_plaid_worker_secret' limit 1),false);
$$;
revoke all on function public.verify_budget_plaid_worker(text) from public,anon,authenticated;
grant execute on function public.verify_budget_plaid_worker(text) to service_role;

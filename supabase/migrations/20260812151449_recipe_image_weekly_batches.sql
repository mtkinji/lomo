-- Release popularity-ranked recipe-image work in weekly waves and process each due wave in bounded workers.

alter table public.kwilt_recipe_image_jobs
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists qa_attempt_count integer not null default 0 check (qa_attempt_count between 0 and 20),
  add column if not exists qa_max_attempts integer not null default 2 check (qa_max_attempts between 1 and 10);

drop index if exists public.kwilt_recipe_image_jobs_claim_idx;
create index kwilt_recipe_image_jobs_claim_idx
  on public.kwilt_recipe_image_jobs(status, available_at, priority desc, created_at)
  where status = 'queued';

create or replace function public.claim_kwilt_recipe_image_jobs(p_limit integer default 1)
returns setof public.kwilt_recipe_image_jobs
language sql
set search_path = ''
as $$
  with recovered as (
    update public.kwilt_recipe_image_jobs
    set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
        lease_token = null, lease_expires_at = null, error_code = 'generation_lease_expired'
    where status = 'generating' and lease_expires_at < now()
    returning id
  ), claimable as (
    select id
    from public.kwilt_recipe_image_jobs
    where status = 'queued'
      and available_at <= now()
      and attempt_count < max_attempts
      and (select count(*) from recovered) >= 0
    order by priority desc, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 3))
  )
  update public.kwilt_recipe_image_jobs job
  set status = 'generating', attempt_count = job.attempt_count + 1,
      lease_token = gen_random_uuid(), lease_expires_at = now() + interval '10 minutes', error_code = null
  from claimable where job.id = claimable.id returning job.*;
$$;

create or replace function public.claim_kwilt_recipe_image_qa_jobs(p_limit integer default 1)
returns setof public.kwilt_recipe_image_jobs
language sql
set search_path = ''
as $$
  with recovered as (
    update public.kwilt_recipe_image_jobs
    set status = case when qa_attempt_count >= qa_max_attempts then 'failed' else 'generated' end,
        lease_token = null, lease_expires_at = null, error_code = 'qa_lease_expired'
    where status = 'qa_checking' and lease_expires_at < now()
    returning id
  ), claimable as (
    select id
    from public.kwilt_recipe_image_jobs
    where status = 'generated'
      and media_asset_id is not null and storage_path is not null
      and qa_attempt_count < qa_max_attempts
      and (select count(*) from recovered) >= 0
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 3))
  )
  update public.kwilt_recipe_image_jobs job
  set status = 'qa_checking', qa_attempt_count = job.qa_attempt_count + 1,
      lease_token = gen_random_uuid(), lease_expires_at = now() + interval '5 minutes', error_code = null
  from claimable where job.id = claimable.id returning job.*;
$$;

create schema if not exists recipe_private;
revoke all on schema recipe_private from public, anon, authenticated;

create table if not exists recipe_private.recipe_image_worker_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  endpoint_url text not null check (endpoint_url ~ '^https://[^/]+/functions/v1/recipe-image-admin$'),
  max_generation_concurrency integer not null default 8 check (max_generation_concurrency between 1 and 20),
  max_qa_concurrency integer not null default 8 check (max_qa_concurrency between 1 and 20),
  updated_at timestamptz not null default now()
);
revoke all on recipe_private.recipe_image_worker_config from public, anon, authenticated, service_role;

create or replace function recipe_private.tick_recipe_image_worker()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  config recipe_private.recipe_image_worker_config%rowtype;
  queued_due integer;
  generating integer;
  generated integer;
  qa_checking integer;
  generation_slots integer;
  qa_slots integer;
  worker_index integer;
  operation_token text;
  request_id bigint;
begin
  select * into config from recipe_private.recipe_image_worker_config where singleton = true;
  if not found or not config.enabled then
    return jsonb_build_object('enabled', false);
  end if;

  delete from public.kwilt_recipe_image_operation_tokens
  where expires_at < now() - interval '1 hour';

  select
    count(*) filter (where status = 'queued' and available_at <= now()),
    count(*) filter (where status = 'generating'),
    count(*) filter (where status = 'generated'),
    count(*) filter (where status = 'qa_checking')
  into queued_due, generating, generated, qa_checking
  from public.kwilt_recipe_image_jobs;

  generation_slots := greatest(0, least(queued_due, config.max_generation_concurrency - generating));
  qa_slots := greatest(0, least(generated, config.max_qa_concurrency - qa_checking));

  for worker_index in 1..generation_slots loop
    operation_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.kwilt_recipe_image_operation_tokens(token_hash, scope, uses_remaining, expires_at)
    values ('sha256:' || encode(extensions.digest(operation_token, 'sha256'), 'hex'), 'generate', 1, now() + interval '10 minutes');
    select net.http_post(
      url := config.endpoint_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-kwilt-operation-token', operation_token),
      body := jsonb_build_object('action', 'generate', 'limit', 1),
      timeout_milliseconds := 120000
    ) into request_id;
  end loop;

  for worker_index in 1..qa_slots loop
    operation_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.kwilt_recipe_image_operation_tokens(token_hash, scope, uses_remaining, expires_at)
    values ('sha256:' || encode(extensions.digest(operation_token, 'sha256'), 'hex'), 'generate', 1, now() + interval '10 minutes');
    select net.http_post(
      url := config.endpoint_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-kwilt-operation-token', operation_token),
      body := jsonb_build_object('action', 'qa', 'limit', 1),
      timeout_milliseconds := 120000
    ) into request_id;
  end loop;

  return jsonb_build_object(
    'enabled', true,
    'queuedDue', queued_due,
    'generating', generating,
    'generated', generated,
    'qaChecking', qa_checking,
    'generationWorkersStarted', generation_slots,
    'qaWorkersStarted', qa_slots
  );
end;
$$;

revoke all on function public.claim_kwilt_recipe_image_jobs(integer) from public, anon, authenticated;
revoke all on function public.claim_kwilt_recipe_image_qa_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_kwilt_recipe_image_jobs(integer) to service_role;
grant execute on function public.claim_kwilt_recipe_image_qa_jobs(integer) to service_role;
revoke all on function recipe_private.tick_recipe_image_worker() from public, anon, authenticated, service_role;

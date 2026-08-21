-- Private, bounded research queue for Recipe equipment, origin, and history drafts.
-- AI output remains researched until a separate editorial review promotes it.

create table public.kwilt_recipe_editorial_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  roster_id text not null check (roster_id ~ '^[A-Z]{2}[0-9]{3}$'),
  source_recipe_hash text not null check (source_recipe_hash ~ '^sha256:[a-f0-9]{64}$'),
  source jsonb not null check (jsonb_typeof(source) = 'object'),
  status text not null default 'queued' check (status in ('queued', 'researching', 'researched', 'failed')),
  prompt_version text not null check (char_length(prompt_version) between 1 and 120),
  model text not null check (char_length(model) between 1 and 120),
  draft jsonb check (draft is null or jsonb_typeof(draft) = 'object'),
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'),
  response_id text check (response_id is null or char_length(response_id) <= 320),
  response_usage jsonb not null default '{}'::jsonb check (jsonb_typeof(response_usage) = 'object'),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 240),
  researched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(roster_id, source_recipe_hash, prompt_version),
  check ((lease_token is null) = (lease_expires_at is null)),
  check ((status = 'researched') = (draft is not null and researched_at is not null))
);

create index kwilt_recipe_editorial_enrichment_claim_idx
  on public.kwilt_recipe_editorial_enrichment_jobs(status, created_at)
  where status = 'queued';

create table public.kwilt_recipe_editorial_enrichment_operation_tokens (
  token_hash text primary key check (char_length(token_hash) between 16 and 160),
  scope text not null check (scope in ('enqueue', 'process', 'list')),
  uses_remaining integer not null default 1 check (uses_remaining between 0 and 500),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

alter table public.kwilt_recipe_editorial_enrichment_jobs enable row level security;
alter table public.kwilt_recipe_editorial_enrichment_operation_tokens enable row level security;
revoke all on public.kwilt_recipe_editorial_enrichment_jobs,
  public.kwilt_recipe_editorial_enrichment_operation_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.kwilt_recipe_editorial_enrichment_jobs,
  public.kwilt_recipe_editorial_enrichment_operation_tokens to service_role;

create or replace function public.consume_kwilt_recipe_editorial_enrichment_operation_token(
  p_token_hash text,
  p_scope text
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare consumed boolean;
begin
  update public.kwilt_recipe_editorial_enrichment_operation_tokens
  set uses_remaining = uses_remaining - 1,
      consumed_at = case when uses_remaining = 1 then now() else consumed_at end
  where token_hash = p_token_hash
    and scope = p_scope
    and uses_remaining > 0
    and expires_at > now()
  returning true into consumed;
  return coalesce(consumed, false);
end;
$$;

create or replace function public.claim_kwilt_recipe_editorial_enrichment_jobs(p_limit integer default 1)
returns setof public.kwilt_recipe_editorial_enrichment_jobs
language sql
set search_path = ''
as $$
  with recovered as (
    update public.kwilt_recipe_editorial_enrichment_jobs
    set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
        lease_token = null,
        lease_expires_at = null,
        error_code = 'research_lease_expired',
        updated_at = now()
    where status = 'researching' and lease_expires_at < now()
    returning id
  ), claimable as (
    select id
    from public.kwilt_recipe_editorial_enrichment_jobs
    where status = 'queued'
      and attempt_count < max_attempts
      and (select count(*) from recovered) >= 0
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 3))
  )
  update public.kwilt_recipe_editorial_enrichment_jobs job
  set status = 'researching',
      attempt_count = job.attempt_count + 1,
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + interval '4 minutes',
      error_code = null,
      updated_at = now()
  from claimable
  where job.id = claimable.id
  returning job.*;
$$;

create or replace function public.complete_kwilt_recipe_editorial_enrichment_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_draft jsonb,
  p_citations jsonb,
  p_response_id text,
  p_response_usage jsonb
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare completed boolean;
begin
  update public.kwilt_recipe_editorial_enrichment_jobs
  set status = 'researched',
      draft = p_draft,
      citations = p_citations,
      response_id = p_response_id,
      response_usage = p_response_usage,
      researched_at = now(),
      lease_token = null,
      lease_expires_at = null,
      error_code = null,
      updated_at = now()
  where id = p_job_id
    and status = 'researching'
    and lease_token = p_lease_token
    and lease_expires_at > now()
    and jsonb_typeof(p_draft) = 'object'
    and jsonb_typeof(p_citations) = 'array'
    and jsonb_typeof(p_response_usage) = 'object'
  returning true into completed;
  return coalesce(completed, false);
end;
$$;

create or replace function public.fail_kwilt_recipe_editorial_enrichment_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_error_code text
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare failed boolean;
begin
  update public.kwilt_recipe_editorial_enrichment_jobs
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      lease_token = null,
      lease_expires_at = null,
      error_code = left(coalesce(nullif(p_error_code, ''), 'research_failed'), 240),
      updated_at = now()
  where id = p_job_id
    and status = 'researching'
    and lease_token = p_lease_token
  returning true into failed;
  return coalesce(failed, false);
end;
$$;

create schema if not exists recipe_private;
revoke all on schema recipe_private from public, anon, authenticated;

create table recipe_private.recipe_editorial_enrichment_worker_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  endpoint_url text not null check (endpoint_url ~ '^https://[^/]+/functions/v1/recipe-editorial-enrichment$'),
  max_concurrency integer not null default 2 check (max_concurrency between 1 and 4),
  updated_at timestamptz not null default now()
);
revoke all on recipe_private.recipe_editorial_enrichment_worker_config from public, anon, authenticated, service_role;

create or replace function recipe_private.tick_recipe_editorial_enrichment_worker()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  config recipe_private.recipe_editorial_enrichment_worker_config%rowtype;
  queued integer;
  researching integer;
  slots integer;
  worker_index integer;
  operation_token text;
  request_id bigint;
begin
  select * into config from recipe_private.recipe_editorial_enrichment_worker_config where singleton = true;
  if not found or not config.enabled then return jsonb_build_object('enabled', false); end if;

  delete from public.kwilt_recipe_editorial_enrichment_operation_tokens
  where expires_at < now() - interval '1 hour';

  select count(*) filter (where status = 'queued'), count(*) filter (where status = 'researching')
  into queued, researching
  from public.kwilt_recipe_editorial_enrichment_jobs;
  slots := greatest(0, least(queued, config.max_concurrency - researching));

  for worker_index in 1..slots loop
    operation_token := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.kwilt_recipe_editorial_enrichment_operation_tokens(token_hash, scope, uses_remaining, expires_at)
    values ('sha256:' || encode(extensions.digest(operation_token, 'sha256'), 'hex'), 'process', 1, now() + interval '5 minutes');
    select net.http_post(
      url := config.endpoint_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-kwilt-operation-token', operation_token),
      body := jsonb_build_object('action', 'process', 'limit', 1),
      timeout_milliseconds := 150000
    ) into request_id;
  end loop;

  return jsonb_build_object('enabled', true, 'queued', queued, 'researching', researching, 'workersStarted', slots);
end;
$$;

revoke all on function public.consume_kwilt_recipe_editorial_enrichment_operation_token(text, text) from public, anon, authenticated;
revoke all on function public.claim_kwilt_recipe_editorial_enrichment_jobs(integer) from public, anon, authenticated;
revoke all on function public.complete_kwilt_recipe_editorial_enrichment_job(uuid, uuid, jsonb, jsonb, text, jsonb) from public, anon, authenticated;
revoke all on function public.fail_kwilt_recipe_editorial_enrichment_job(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.consume_kwilt_recipe_editorial_enrichment_operation_token(text, text) to service_role;
grant execute on function public.claim_kwilt_recipe_editorial_enrichment_jobs(integer) to service_role;
grant execute on function public.complete_kwilt_recipe_editorial_enrichment_job(uuid, uuid, jsonb, jsonb, text, jsonb) to service_role;
grant execute on function public.fail_kwilt_recipe_editorial_enrichment_job(uuid, uuid, text) to service_role;
revoke all on function recipe_private.tick_recipe_editorial_enrichment_worker() from public, anon, authenticated, service_role;

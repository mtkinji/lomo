-- Separate slow image generation from semantic QA, with recoverable leases for each stage.

alter table public.kwilt_recipe_image_jobs drop constraint if exists kwilt_recipe_image_jobs_status_check;
alter table public.kwilt_recipe_image_jobs add constraint kwilt_recipe_image_jobs_status_check
  check (status in ('missing', 'queued', 'generating', 'generated', 'qa_checking', 'editorial_review', 'approved', 'published', 'rejected', 'failed'));

create or replace function public.kwilt_recipe_image_job_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'missing' then p_to in ('queued')
    when 'queued' then p_to in ('generating', 'rejected')
    when 'generating' then p_to in ('generated', 'queued', 'failed')
    when 'generated' then p_to in ('qa_checking', 'editorial_review', 'rejected', 'failed')
    when 'qa_checking' then p_to in ('editorial_review', 'rejected', 'generated', 'failed')
    when 'editorial_review' then p_to in ('approved', 'rejected')
    when 'approved' then p_to in ('published', 'rejected')
    when 'published' then p_to in ('rejected')
    when 'rejected' then p_to in ('queued')
    when 'failed' then p_to in ('queued')
    else false
  end;
$$;

create or replace function public.claim_kwilt_recipe_image_jobs(p_limit integer default 1)
returns setof public.kwilt_recipe_image_jobs
language sql
set search_path = ''
as $$
  with recovered as (
    update public.kwilt_recipe_image_jobs
    set status = 'queued', lease_token = null, lease_expires_at = null, error_code = 'generation_lease_expired'
    where status = 'generating' and lease_expires_at < now()
    returning id
  ), claimable as (
    select id
    from public.kwilt_recipe_image_jobs
    where status = 'queued'
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
    set status = 'generated', lease_token = null, lease_expires_at = null, error_code = 'qa_lease_expired'
    where status = 'qa_checking' and lease_expires_at < now()
    returning id
  ), claimable as (
    select id
    from public.kwilt_recipe_image_jobs
    where status = 'generated'
      and media_asset_id is not null and storage_path is not null
      and (select count(*) from recovered) >= 0
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 3))
  )
  update public.kwilt_recipe_image_jobs job
  set status = 'qa_checking', lease_token = gen_random_uuid(), lease_expires_at = now() + interval '5 minutes', error_code = null
  from claimable where job.id = claimable.id returning job.*;
$$;

revoke all on function public.claim_kwilt_recipe_image_qa_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_kwilt_recipe_image_qa_jobs(integer) to service_role;

-- Durable editorial pipeline for generated catalog Recipe media.

alter table public.kwilt_recipe_media_assets
  add column if not exists recipe_version_id uuid references public.kwilt_recipe_versions(id) on delete restrict,
  add column if not exists source_kind text check (source_kind is null or source_kind in ('ai_generated', 'commissioned', 'licensed', 'public_domain', 'user_authored', 'private_import')),
  add column if not exists content_hash text check (content_hash is null or char_length(content_hash) between 1 and 256),
  add column if not exists width integer check (width is null or width between 1 and 7680),
  add column if not exists height integer check (height is null or height between 1 and 7680),
  add column if not exists focal_point jsonb not null default '{}'::jsonb check (jsonb_typeof(focal_point) = 'object'),
  add column if not exists generation_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(generation_metadata) = 'object'),
  add column if not exists qa_result jsonb not null default '{}'::jsonb check (jsonb_typeof(qa_result) = 'object'),
  add column if not exists cost_usd_micros bigint check (cost_usd_micros is null or cost_usd_micros >= 0),
  add column if not exists supersedes_media_asset_id uuid references public.kwilt_recipe_media_assets(id) on delete restrict;

create index if not exists kwilt_recipe_media_version_idx
  on public.kwilt_recipe_media_assets(recipe_version_id)
  where lifecycle = 'active';

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'recipe-catalog-media',
  'recipe-catalog-media',
  true,
  12582912,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.kwilt_recipe_image_jobs (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.kwilt_recipe_publications(id) on delete cascade,
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  roster_id text not null check (roster_id ~ '^[A-Z]{2}[0-9]{3}$'),
  candidate_index smallint not null default 0 check (candidate_index between 0 and 9),
  status text not null default 'queued' check (status in ('missing', 'queued', 'generating', 'generated', 'editorial_review', 'approved', 'published', 'rejected', 'failed')),
  priority integer not null default 0,
  priority_breakdown jsonb not null default '{}'::jsonb check (jsonb_typeof(priority_breakdown) = 'object'),
  visual_brief jsonb not null check (jsonb_typeof(visual_brief) = 'object'),
  prompt text not null check (char_length(prompt) between 1 and 20000),
  prompt_version text not null check (char_length(prompt_version) between 1 and 120),
  model text not null check (char_length(model) between 1 and 120),
  generation_request_id text check (generation_request_id is null or char_length(generation_request_id) <= 320),
  generation_usage jsonb not null default '{}'::jsonb check (jsonb_typeof(generation_usage) = 'object'),
  qa_result jsonb not null default '{}'::jsonb check (jsonb_typeof(qa_result) = 'object'),
  storage_path text check (storage_path is null or char_length(storage_path) between 1 and 1024),
  media_asset_id uuid references public.kwilt_recipe_media_assets(id) on delete restrict,
  replaced_media_asset_id uuid references public.kwilt_recipe_media_assets(id) on delete restrict,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 160),
  rejection_reasons text[] not null default '{}',
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_by_user_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(publication_id, recipe_version_id, prompt_version, candidate_index),
  check ((lease_token is null) = (lease_expires_at is null)),
  check (cardinality(rejection_reasons) <= 20)
);

create index if not exists kwilt_recipe_image_jobs_claim_idx
  on public.kwilt_recipe_image_jobs(status, priority desc, created_at)
  where status = 'queued';
create index if not exists kwilt_recipe_image_jobs_review_idx
  on public.kwilt_recipe_image_jobs(status, roster_id, candidate_index)
  where status in ('editorial_review', 'approved', 'published');

create table if not exists public.kwilt_recipe_image_operation_tokens (
  token_hash text primary key check (char_length(token_hash) between 16 and 160),
  scope text not null check (scope in ('import', 'generate', 'review', 'list')),
  uses_remaining integer not null default 1 check (uses_remaining between 0 and 100),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

alter table public.kwilt_recipe_image_jobs enable row level security;
alter table public.kwilt_recipe_image_operation_tokens enable row level security;
revoke all on public.kwilt_recipe_image_jobs, public.kwilt_recipe_image_operation_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.kwilt_recipe_image_jobs, public.kwilt_recipe_image_operation_tokens to service_role;

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
    when 'generated' then p_to in ('editorial_review', 'rejected', 'failed')
    when 'editorial_review' then p_to in ('approved', 'rejected')
    when 'approved' then p_to in ('published', 'rejected')
    when 'published' then p_to in ('rejected')
    when 'rejected' then p_to in ('queued')
    when 'failed' then p_to in ('queued')
    else false
  end;
$$;

create or replace function public.kwilt_validate_recipe_image_job()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status <> old.status
    and not public.kwilt_recipe_image_job_transition_allowed(old.status, new.status) then
    raise exception 'invalid_recipe_image_job_transition' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.kwilt_recipe_publications publication
    where publication.id = new.publication_id
      and publication.recipe_id = new.recipe_id
      and publication.published_recipe_version_id = new.recipe_version_id
      and publication.roster_id = new.roster_id
  ) then
    raise exception 'invalid_recipe_image_job_publication' using errcode = '23514';
  end if;
  if new.media_asset_id is not null and not exists (
    select 1 from public.kwilt_recipe_media_assets media
    where media.id = new.media_asset_id
      and media.recipe_id = new.recipe_id
      and media.recipe_version_id = new.recipe_version_id
      and media.lifecycle = 'active'
      and (new.status not in ('approved', 'published') or media.public_allowed)
  ) then
    raise exception 'invalid_recipe_image_job_media' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kwilt_recipe_image_jobs_validate on public.kwilt_recipe_image_jobs;
create trigger kwilt_recipe_image_jobs_validate
before insert or update on public.kwilt_recipe_image_jobs
for each row execute function public.kwilt_validate_recipe_image_job();

create or replace function public.claim_kwilt_recipe_image_jobs(p_limit integer default 1)
returns setof public.kwilt_recipe_image_jobs
language sql
set search_path = ''
as $$
  with claimable as (
    select id
    from public.kwilt_recipe_image_jobs
    where status = 'queued'
      and attempt_count < max_attempts
    order by priority desc, created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 3))
  )
  update public.kwilt_recipe_image_jobs job
  set status = 'generating',
      attempt_count = job.attempt_count + 1,
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + interval '10 minutes',
      error_code = null
  from claimable
  where job.id = claimable.id
  returning job.*;
$$;

create or replace function public.consume_kwilt_recipe_image_operation_token(p_token_hash text, p_scope text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare consumed boolean;
begin
  update public.kwilt_recipe_image_operation_tokens
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

create or replace function public.import_kwilt_recipe_catalog_source(p_owner_person_id uuid, p_source jsonb)
returns public.kwilt_recipe_publications
language plpgsql
set search_path = ''
as $$
declare
  existing public.kwilt_recipe_publications;
  created_publication public.kwilt_recipe_publications;
  v_recipe_id uuid := gen_random_uuid();
  v_version_id uuid := gen_random_uuid();
  v_roster_id text := upper(btrim(p_source->>'rosterId'));
  v_title text := btrim(p_source->>'title');
  v_slug text := lower(btrim(p_source->>'publicSlug'));
  v_content_hash text := btrim(p_source->>'contentHash');
begin
  select * into existing from public.kwilt_recipe_publications where roster_id = v_roster_id;
  if existing.id is not null then return existing; end if;
  if not exists (select 1 from public.kwilt_people where id = p_owner_person_id)
    or v_roster_id !~ '^[A-Z]{2}[0-9]{3}$'
    or v_title is null or char_length(v_title) not between 1 and 160
    or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or v_content_hash is null or char_length(v_content_hash) not between 1 and 256
    or jsonb_typeof(p_source->'ingredients') <> 'array'
    or jsonb_array_length(p_source->'ingredients') not between 5 and 200
    or jsonb_typeof(p_source->'instructions') <> 'array'
    or jsonb_array_length(p_source->'instructions') not between 4 and 200 then
    raise exception 'invalid_recipe_catalog_source' using errcode = '22023';
  end if;
  insert into public.kwilt_recipes(id, owner_person_id) values(v_recipe_id, p_owner_person_id);
  insert into public.kwilt_recipe_versions(
    id, recipe_id, version, title, description, yield_quantity, yield_unit,
    prep_minutes, cook_minutes, notes, content_hash, created_by_person_id, mutation_idempotency_key
  ) values (
    v_version_id, v_recipe_id, 1, v_title, nullif(p_source->>'description', ''),
    nullif(p_source->>'yieldQuantity', '')::numeric, nullif(p_source->>'yieldUnit', ''),
    nullif(p_source->>'prepMinutes', '')::integer, nullif(p_source->>'cookMinutes', '')::integer,
    nullif(p_source->>'notes', ''), v_content_hash, p_owner_person_id,
    left('catalog:' || v_roster_id || ':' || v_content_hash, 200)
  );
  update public.kwilt_recipes set current_version_id = v_version_id where id = v_recipe_id;
  insert into public.kwilt_recipe_ingredients(recipe_version_id, source_line_id, position, original_text, optional)
  select v_version_id, 'catalog-ingredient-' || (ordinality - 1), ordinality - 1, btrim(value), value ~* '\\boptional\\b'
  from jsonb_array_elements_text(p_source->'ingredients') with ordinality
  where char_length(btrim(value)) between 1 and 1000;
  insert into public.kwilt_recipe_instructions(recipe_version_id, source_step_id, position, step_text)
  select v_version_id, 'catalog-step-' || (ordinality - 1), ordinality - 1, btrim(value)
  from jsonb_array_elements_text(p_source->'instructions') with ordinality
  where char_length(btrim(value)) between 1 and 8000;
  insert into public.kwilt_recipe_provenance(recipe_version_id, method, rights_basis, source_content_hash, imported_at)
  values(v_version_id, 'catalog', 'kwilt_authored', v_content_hash, now());
  insert into public.kwilt_recipe_publications(
    roster_id, public_slug, recipe_id, published_recipe_version_id, state, distribution_scopes,
    rights_attestation, editorial_metadata, content_hash, published_at
  ) values (
    v_roster_id, v_slug, v_recipe_id, v_version_id, 'published', array['kwilt_mobile'], 'original',
    jsonb_build_object('category', p_source->>'category', 'cuisine', p_source->>'cuisine', 'tier', p_source->>'tier'),
    v_content_hash, now()
  ) returning * into created_publication;
  return created_publication;
end;
$$;

create or replace function public.publish_kwilt_recipe_image_job(p_job_id uuid, p_actor_user_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  job public.kwilt_recipe_image_jobs;
  prior_media_id uuid;
begin
  select * into job
  from public.kwilt_recipe_image_jobs
  where id = p_job_id
  for update;
  if job.id is null or job.status <> 'approved' or job.media_asset_id is null then
    raise exception 'recipe_image_job_not_approved' using errcode = '23514';
  end if;
  select media_asset_id into prior_media_id
  from public.kwilt_recipe_publication_media
  where publication_id = job.publication_id and role = 'hero' and position = 0;
  insert into public.kwilt_recipe_publication_media(publication_id, media_asset_id, role, position, crop_metadata)
  values(job.publication_id, job.media_asset_id, 'hero', 0, '{"mode":"cover","focalPoint":{"x":0.5,"y":0.5}}'::jsonb)
  on conflict (publication_id, role, position) do update
    set media_asset_id = excluded.media_asset_id,
        crop_metadata = excluded.crop_metadata;
  update public.kwilt_recipe_image_jobs
  set status = 'published',
      replaced_media_asset_id = prior_media_id,
      published_by_user_id = p_actor_user_id,
      published_at = now(),
      lease_token = null,
      lease_expires_at = null
  where id = job.id;
  return job.media_asset_id;
end;
$$;

revoke all on function public.kwilt_recipe_image_job_transition_allowed(text, text) from public, anon, authenticated;
revoke all on function public.claim_kwilt_recipe_image_jobs(integer) from public, anon, authenticated;
revoke all on function public.consume_kwilt_recipe_image_operation_token(text, text) from public, anon, authenticated;
revoke all on function public.import_kwilt_recipe_catalog_source(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.publish_kwilt_recipe_image_job(uuid, uuid) from public, anon, authenticated;
grant execute on function public.kwilt_recipe_image_job_transition_allowed(text, text) to service_role;
grant execute on function public.claim_kwilt_recipe_image_jobs(integer) to service_role;
grant execute on function public.consume_kwilt_recipe_image_operation_token(text, text) to service_role;
grant execute on function public.import_kwilt_recipe_catalog_source(uuid, jsonb) to service_role;
grant execute on function public.publish_kwilt_recipe_image_job(uuid, uuid) to service_role;

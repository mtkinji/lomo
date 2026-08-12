-- Rollback-only assertions for catalog Recipe image generation and publication.
begin;

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'image-owner@example.invalid', '', now(), now());
insert into public.kwilt_people(id, display_name, kind, created_by_user_id) values
  ('92000000-0000-0000-0000-000000000001', 'Image owner', 'adult', '91000000-0000-0000-0000-000000000001');
insert into public.kwilt_recipes(id, owner_person_id) values
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001');
insert into public.kwilt_recipe_versions(id, recipe_id, version, title, content_hash, created_by_person_id, mutation_idempotency_key) values
  ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 1, 'Chilaquiles rojos', 'hash-image-v1', '92000000-0000-0000-0000-000000000001', 'image-catalog-v1');
update public.kwilt_recipes set current_version_id = '94000000-0000-0000-0000-000000000001' where id = '93000000-0000-0000-0000-000000000001';
insert into public.kwilt_recipe_provenance(recipe_version_id, method, rights_basis) values
  ('94000000-0000-0000-0000-000000000001', 'catalog', 'kwilt_authored');
insert into public.kwilt_recipe_publications(
  id, roster_id, public_slug, recipe_id, published_recipe_version_id, state,
  distribution_scopes, rights_attestation, content_hash, published_at
) values (
  '95000000-0000-0000-0000-000000000001', 'ZZ999', 'pipeline-test-chilaquiles-rojos',
  '93000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001',
  'published', array['kwilt_mobile'], 'original', 'hash-image-v1', now()
);

insert into public.kwilt_recipe_image_jobs(
  id, publication_id, recipe_id, recipe_version_id, roster_id, candidate_index,
  priority, priority_breakdown, visual_brief, prompt, prompt_version, model
) values (
  '96000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001',
  'ZZ999', 0, 2147483647, '{"artwork":2147483647}', '{"dish":"Chilaquiles rojos"}', 'prompt',
  'kwilt-recipe-hero-v1', 'gpt-image-2-2026-04-21'
);

do $$ begin
  begin
    update public.kwilt_recipe_image_jobs set status = 'published'
    where id = '96000000-0000-0000-0000-000000000001';
    raise exception 'invalid image job transition succeeded';
  exception when check_violation then null;
  end;
end $$;

do $$
declare claimed public.kwilt_recipe_image_jobs;
begin
  select * into claimed from public.claim_kwilt_recipe_image_jobs(1);
  if claimed.id <> '96000000-0000-0000-0000-000000000001' then raise exception 'queued job was not claimed'; end if;
  if claimed.status <> 'generating' or claimed.attempt_count <> 1 or claimed.lease_token is null then
    raise exception 'claim did not establish generation lease';
  end if;
end $$;

update public.kwilt_recipe_image_jobs set status = 'generated' where id = '96000000-0000-0000-0000-000000000001';
update public.kwilt_recipe_image_jobs set status = 'editorial_review' where id = '96000000-0000-0000-0000-000000000001';

insert into public.kwilt_recipe_media_assets(
  id, recipe_id, owner_person_id, storage_ref, media_type, rights_basis, attribution,
  alt_text, public_allowed, recipe_version_id, source_kind, content_hash, width, height,
  generation_metadata
) values (
  '97000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001', 'https://example.invalid/catalog/br012/hero.webp',
  'image/webp', 'kwilt_authored', 'Image created for Kwilt', 'Chilaquiles rojos served on a shallow plate',
  true, '94000000-0000-0000-0000-000000000001', 'ai_generated', 'sha256:image', 1536, 1024,
  '{"promptVersion":"kwilt-recipe-hero-v1"}'
);
update public.kwilt_recipe_image_jobs
set status = 'approved', media_asset_id = '97000000-0000-0000-0000-000000000001',
    reviewed_by_user_id = '91000000-0000-0000-0000-000000000001', reviewed_at = now()
where id = '96000000-0000-0000-0000-000000000001';

select public.publish_kwilt_recipe_image_job(
  '96000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001'
);

do $$ begin
  if not exists (
    select 1 from public.kwilt_recipe_publication_media
    where publication_id = '95000000-0000-0000-0000-000000000001'
      and media_asset_id = '97000000-0000-0000-0000-000000000001'
      and role = 'hero' and position = 0
  ) then raise exception 'approved image was not published'; end if;
  if (select status from public.kwilt_recipe_image_jobs where id = '96000000-0000-0000-0000-000000000001') <> 'published'
  then raise exception 'published job did not advance'; end if;
end $$;

insert into public.kwilt_recipe_image_operation_tokens(token_hash, scope, uses_remaining, expires_at)
values ('sha256:test-token', 'generate', 1, now() + interval '5 minutes');
do $$ begin
  if not public.consume_kwilt_recipe_image_operation_token('sha256:test-token', 'generate') then
    raise exception 'valid operation token was rejected';
  end if;
  if public.consume_kwilt_recipe_image_operation_token('sha256:test-token', 'generate') then
    raise exception 'operation token was reusable beyond its allowance';
  end if;
end $$;

rollback;

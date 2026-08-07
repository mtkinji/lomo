-- Rollback-only assertions for the global Recipe catalog projection.
begin;

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'catalog-owner@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'catalog-reader@example.invalid', '', now(), now());

insert into public.kwilt_people(id, display_name, kind, created_by_user_id) values
  ('82000000-0000-0000-0000-000000000001', 'Catalog owner', 'adult', '81000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000002', 'Catalog reader', 'adult', '81000000-0000-0000-0000-000000000002');
insert into public.kwilt_person_auth_bindings(person_id, user_id) values
  ('82000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001'),
  ('82000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000002');

insert into public.kwilt_recipes(id, owner_person_id) values
  ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001'),
  ('83000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001');
insert into public.kwilt_recipe_versions(id, recipe_id, version, title, content_hash, created_by_person_id, mutation_idempotency_key) values
  ('84000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', 1, 'Published title', 'hash-v1', '82000000-0000-0000-0000-000000000001', 'catalog-v1'),
  ('84000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000001', 2, 'Unpublished newer title', 'hash-v2', '82000000-0000-0000-0000-000000000001', 'catalog-v2'),
  ('84000000-0000-0000-0000-000000000003', '83000000-0000-0000-0000-000000000002', 1, 'Private title', 'private-hash', '82000000-0000-0000-0000-000000000001', 'private-v1');
update public.kwilt_recipes set current_version_id = case id
  when '83000000-0000-0000-0000-000000000001' then '84000000-0000-0000-0000-000000000002'::uuid
  else '84000000-0000-0000-0000-000000000003'::uuid end;
insert into public.kwilt_recipe_provenance(recipe_version_id, method, rights_basis) values
  ('84000000-0000-0000-0000-000000000001', 'catalog', 'kwilt_authored'),
  ('84000000-0000-0000-0000-000000000002', 'catalog', 'kwilt_authored'),
  ('84000000-0000-0000-0000-000000000003', 'manual', 'user_authored');
insert into public.kwilt_recipe_ingredients(recipe_version_id, source_line_id, position, original_text) values
  ('84000000-0000-0000-0000-000000000001', 'line-1', 0, '1 truthful ingredient');
insert into public.kwilt_recipe_instructions(recipe_version_id, source_step_id, position, step_text) values
  ('84000000-0000-0000-0000-000000000001', 'step-1', 0, 'Cook it carefully.');
insert into public.kwilt_recipe_publications(
  id, roster_id, public_slug, recipe_id, published_recipe_version_id, state,
  distribution_scopes, rights_attestation, content_hash, published_at
) values (
  '85000000-0000-0000-0000-000000000001', 'BR001', 'published-title',
  '83000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001',
  'published', array['kwilt_mobile'], 'original', 'hash-v1', now()
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$
declare result jsonb;
begin
  select projection into result from public.list_kwilt_recipe_catalog(null, 500);
  if result->'catalog'->>'rosterId' <> 'BR001' then raise exception 'catalog publication was not readable'; end if;
  if result->'currentVersion'->>'title' <> 'Published title' then raise exception 'projection did not pin the published version'; end if;
  if result::text like '%Unpublished newer title%' then raise exception 'projection leaked an unpublished version'; end if;
  if result::text like '%Private title%' then raise exception 'projection leaked an unrelated private recipe'; end if;
  if exists(select 1 from public.kwilt_recipes) then raise exception 'catalog projection widened private Recipe RLS'; end if;
  begin
    insert into public.kwilt_recipe_publications(roster_id, public_slug, recipe_id, published_recipe_version_id, rights_attestation, content_hash)
    values ('BR002', 'forged', '83000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'original', 'forged');
    raise exception 'authenticated client inserted a publication';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}', true);
do $$ begin
  begin
    perform public.list_kwilt_recipe_catalog(null, 500);
    raise exception 'anonymous claim read the catalog';
  exception when others then
    if sqlerrm <> 'authentication_required' then raise; end if;
  end;
end $$;

reset role;
update public.kwilt_recipe_publications set state = 'withdrawn', withdrawn_at = now(), published_at = null;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if exists(select 1 from public.list_kwilt_recipe_catalog(null, 500)) then raise exception 'withdrawn publication remained readable'; end if;
end $$;

reset role;
rollback;

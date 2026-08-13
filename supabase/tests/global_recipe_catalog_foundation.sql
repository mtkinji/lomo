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

insert into public.kwilt_recipes(id, owner_person_id, ownership_kind) values
  ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'catalog'),
  ('83000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001', 'personal');
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
insert into public.kwilt_recipe_ingredients(id, recipe_version_id, source_line_id, position, original_text) values
  ('87000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'line-1', 0, '1 truthful ingredient');
insert into public.kwilt_recipe_instructions(recipe_version_id, source_step_id, position, step_text) values
  ('84000000-0000-0000-0000-000000000001', 'step-1', 0, 'Cook it carefully.');
insert into public.kwilt_recipe_publications(
  id, roster_id, public_slug, recipe_id, published_recipe_version_id, state,
  distribution_scopes, rights_attestation, content_hash, published_at
) values (
  '85000000-0000-0000-0000-000000000001', 'ZZ997', 'published-title',
  '83000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001',
  'published', array['kwilt_mobile'], 'original', 'hash-v1', now()
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
do $$
declare
  ingredient_id uuid;
  journal_receipt jsonb;
begin
  if (select count(*) from public.kwilt_recipes) <> 1 then
    raise exception 'published catalog recipe entered personal inventory';
  end if;
  if not exists(select 1 from public.list_kwilt_recipe_catalog(null, 500)) then
    raise exception 'catalog publication was not usable through the bounded projection';
  end if;
  perform public.sync_kwilt_recipe_cook_session(
    jsonb_build_object(
      'id', '86000000-0000-0000-0000-000000000001',
      'ownerPersonId', '82000000-0000-0000-0000-000000000001',
      'recipeId', 'kwilt-recipe-zz997',
      'recipeVersionId', 'kwilt-recipe-zz997-v1',
      'recipeVersion', 1,
      'servingScale', 1,
      'status', 'active',
      'currentCueIndex', 0,
      'cueCount', 1,
      'revision', 1,
      'timers', jsonb_build_array(),
      'lastDevice', jsonb_build_object('deviceId', 'catalog-test', 'platform', 'ios', 'appVersion', 'test'),
      'startedAt', now(),
      'pausedAt', null,
      'completedAt', null,
      'updatedAt', now()
    ),
    0
  );
  if not exists(select 1 from public.kwilt_recipe_cook_sessions where id = '86000000-0000-0000-0000-000000000001') then
    raise exception 'published catalog version was not usable by a Cook session';
  end if;
  perform public.sync_kwilt_recipe_cook_session(
    jsonb_build_object(
      'id', '86000000-0000-0000-0000-000000000001',
      'ownerPersonId', '82000000-0000-0000-0000-000000000001',
      'recipeId', '83000000-0000-0000-0000-000000000001',
      'recipeVersionId', '84000000-0000-0000-0000-000000000001',
      'recipeVersion', 1,
      'servingScale', 1,
      'status', 'completed',
      'currentCueIndex', 0,
      'cueCount', 1,
      'revision', 2,
      'timers', jsonb_build_array(),
      'lastDevice', jsonb_build_object('deviceId', 'catalog-test', 'platform', 'ios', 'appVersion', 'test'),
      'startedAt', now() - interval '30 minutes',
      'pausedAt', null,
      'completedAt', now(),
      'updatedAt', now()
    ),
    1
  );
  ingredient_id := '87000000-0000-0000-0000-000000000001';
  journal_receipt := public.save_kwilt_recipe_cook_journal(
    '86000000-0000-0000-0000-000000000001',
    true,
    4,
    'More sauce next time',
    null,
    jsonb_build_array(jsonb_build_object(
      'ingredientLineId', ingredient_id,
      'usedInstead', 'oat milk',
      'resultRating', 4,
      'note', 'Use a little less'
    ))
  );
  if journal_receipt->>'cookCount' <> '1' or journal_receipt->>'substitutionCount' <> '1' then
    raise exception 'structured Cook journal receipt was incorrect';
  end if;
  if not exists(
    select 1 from public.kwilt_recipe_cook_records
    where session_id = '86000000-0000-0000-0000-000000000001'
      and outcome_rating = 4
  ) then
    raise exception 'private Cook outcome was not saved';
  end if;
  if not exists(
    select 1 from public.kwilt_recipe_cook_substitutions
    where source_ingredient_line_id = ingredient_id
      and ingredient_text = '1 truthful ingredient'
      and used_instead = 'oat milk'
  ) then
    raise exception 'structured substitution was not saved with its source snapshot';
  end if;
  perform public.save_kwilt_recipe_cook_journal(
    '86000000-0000-0000-0000-000000000001', true, 5,
    'Best version', null, '[]'::jsonb
  );
  if (select count(*) from public.kwilt_recipe_cook_records where session_id = '86000000-0000-0000-0000-000000000001') <> 1
    or exists(select 1 from public.kwilt_recipe_cook_substitutions where source_ingredient_line_id = ingredient_id)
  then
    raise exception 'Cook journal resave was not idempotent';
  end if;
  begin
    perform public.save_kwilt_recipe_cook_journal(
      '86000000-0000-0000-0000-000000000001', true, 6, null, null, '[]'::jsonb
    );
    raise exception 'invalid private outcome rating was saved';
  exception when others then
    if sqlerrm <> 'invalid_cook_learning' then raise; end if;
  end;
  begin
    perform public.save_kwilt_recipe_cook_journal(
      '86000000-0000-0000-0000-000000000001', true, 4, null, null,
      jsonb_build_array(jsonb_build_object(
        'ingredientLineId', '87000000-0000-0000-0000-000000000002',
        'usedInstead', 'not allowed'
      ))
    );
    raise exception 'substitution outside the exact Recipe version was saved';
  exception when others then
    if sqlerrm <> 'invalid_cook_learning' then raise; end if;
  end;
  begin
    perform public.sync_kwilt_recipe_cook_session(
      jsonb_build_object(
        'id', '86000000-0000-0000-0000-000000000002',
        'ownerPersonId', '82000000-0000-0000-0000-000000000001',
        'recipeId', '83000000-0000-0000-0000-000000000001',
        'recipeVersionId', '84000000-0000-0000-0000-000000000002',
        'recipeVersion', 2,
        'servingScale', 1,
        'status', 'active',
        'currentCueIndex', 0,
        'cueCount', 1,
        'revision', 1,
        'timers', jsonb_build_array(),
        'lastDevice', jsonb_build_object('deviceId', 'catalog-test', 'platform', 'ios', 'appVersion', 'test'),
        'startedAt', now(),
        'pausedAt', null,
        'completedAt', null,
        'updatedAt', now()
      ),
      0
    );
    raise exception 'unpublished catalog version was usable by a Cook session';
  exception when others then
    if sqlerrm <> 'cook_session_not_owned' then raise; end if;
  end;
  begin
    perform public.kwilt_can_use_recipe_version(
      '83000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000001'
    );
    raise exception 'internal recipe-use helper remained callable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_kwilt_recipe(
      '83000000-0000-0000-0000-000000000001',
      2,
      'catalog-forged-update',
      jsonb_build_object(
        'title', 'Forged catalog title',
        'ingredients', jsonb_build_array(),
        'instructions', jsonb_build_array()
      )
    );
    raise exception 'catalog owner changed a canonical Recipe';
  exception when others then
    if sqlerrm <> 'catalog_recipe_immutable' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$
declare result jsonb;
begin
  select projection into result from public.list_kwilt_recipe_catalog('ZZ996', 500);
  if result->'catalog'->>'rosterId' <> 'ZZ997' then raise exception 'catalog publication was not readable'; end if;
  if result->'currentVersion'->>'title' <> 'Published title' then raise exception 'projection did not pin the published version'; end if;
  if result::text like '%Unpublished newer title%' then raise exception 'projection leaked an unpublished version'; end if;
  if result::text like '%Private title%' then raise exception 'projection leaked an unrelated private recipe'; end if;
  if exists(select 1 from public.kwilt_recipes) then raise exception 'catalog projection widened private Recipe RLS'; end if;
  if exists(select 1 from public.kwilt_recipe_cook_records) then raise exception 'Cook journal leaked to another person'; end if;
  if exists(select 1 from public.kwilt_recipe_cook_substitutions) then raise exception 'Cook substitutions leaked to another person'; end if;
  perform public.sync_kwilt_recipe_cook_session(
    jsonb_build_object(
      'id', '86000000-0000-0000-0000-000000000003',
      'ownerPersonId', '82000000-0000-0000-0000-000000000001',
      'recipeId', '83000000-0000-0000-0000-000000000001',
      'recipeVersionId', '84000000-0000-0000-0000-000000000001',
      'recipeVersion', 1,
      'servingScale', 1,
      'status', 'active',
      'currentCueIndex', 0,
      'cueCount', 1,
      'revision', 1,
      'timers', jsonb_build_array(),
      'lastDevice', jsonb_build_object('deviceId', 'reader-test', 'platform', 'ios', 'appVersion', 'test'),
      'startedAt', now(),
      'pausedAt', null,
      'completedAt', null,
      'updatedAt', now()
    ),
    0
  );
  if not exists(
    select 1 from public.kwilt_recipe_cook_sessions
    where id = '86000000-0000-0000-0000-000000000003'
      and owner_person_id = '82000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'catalog Cook ownership was not derived from the authenticated person';
  end if;
  perform public.sync_kwilt_recipe_cook_session(
    jsonb_build_object(
      'id', '86000000-0000-0000-0000-000000000003',
      'ownerPersonId', 'kwilt-catalog',
      'recipeId', 'kwilt-recipe-zz997',
      'recipeVersionId', 'kwilt-recipe-zz997-v1',
      'recipeVersion', 1,
      'servingScale', 1,
      'status', 'completed',
      'currentCueIndex', 0,
      'cueCount', 1,
      'revision', 2,
      'timers', jsonb_build_array(),
      'lastDevice', jsonb_build_object('deviceId', 'reader-test', 'platform', 'ios', 'appVersion', 'test'),
      'startedAt', now() - interval '15 minutes',
      'pausedAt', null,
      'completedAt', now(),
      'updatedAt', now()
    ),
    1
  );
  result := public.save_kwilt_recipe_cook_journal(
    '86000000-0000-0000-0000-000000000003', true, 5, 'Reader learning', null,
    jsonb_build_array(jsonb_build_object(
      'ingredientLineId', 'kwilt-recipe-zz997-v1-ingredient-1',
      'usedInstead', 'oat milk',
      'resultRating', 4,
      'note', 'Worked well'
    ))
  );
  if result->>'substitutionCount' <> '1' then raise exception 'bundled substitution reference was not resolved'; end if;
  result := public.list_kwilt_recipe_cook_journal('kwilt-recipe-zz997', 6);
  if result->>'cookCount' <> '1'
    or result->'records'->0->>'recipeId' <> '83000000-0000-0000-0000-000000000001'
    or result->'records'->0->'substitutions'->0->>'ingredientLineId' <> '87000000-0000-0000-0000-000000000001'
  then
    raise exception 'bundled Cook journal did not return canonical exact-version evidence';
  end if;
  begin
    insert into public.kwilt_recipe_publications(roster_id, public_slug, recipe_id, published_recipe_version_id, rights_attestation, content_hash)
    values ('ZZ998', 'forged', '83000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'original', 'forged');
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
  if exists(select 1 from public.list_kwilt_recipe_catalog('ZZ996', 500)) then raise exception 'withdrawn publication remained readable'; end if;
end $$;

reset role;
rollback;

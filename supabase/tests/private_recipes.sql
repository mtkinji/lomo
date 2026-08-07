-- Rollback-only privacy and mutation assertions for private Recipes.
-- Run against a migrated local database using an administrative connection.

begin;

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'recipe-owner@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'recipe-household@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'recipe-stranger@example.invalid', '', now(), now());

insert into public.kwilt_people(id, display_name, kind, created_by_user_id) values
  ('62000000-0000-0000-0000-000000000001', 'Recipe owner', 'adult', '61000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', 'Household member', 'adult', '61000000-0000-0000-0000-000000000002'),
  ('62000000-0000-0000-0000-000000000003', 'Stranger', 'adult', '61000000-0000-0000-0000-000000000003');

insert into public.kwilt_person_auth_bindings(person_id, user_id) values
  ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000002'),
  ('62000000-0000-0000-0000-000000000003', '61000000-0000-0000-0000-000000000003');

insert into public.kwilt_households(id, name, created_by_user_id)
values ('63000000-0000-0000-0000-000000000001', 'Recipe test household', '61000000-0000-0000-0000-000000000001');
insert into public.kwilt_household_memberships(household_id, person_id, role) values
  ('63000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000001', 'owner'),
  ('63000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', 'caregiver');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);

do $$
declare
  first_receipt jsonb;
  retry_receipt jsonb;
begin
  first_receipt := public.save_kwilt_recipe(null, 0, 'recipe-create-1', '{
    "title":"Tomato toast",
    "description":null,
    "yieldQuantity":2,
    "yieldUnit":"servings",
    "prepMinutes":5,
    "cookMinutes":null,
    "notes":null,
    "ingredients":[{"id":"line-1","groupLabel":null,"originalText":"2 ripe tomatoes","quantityMin":2,"quantityMax":null,"unit":null,"ingredientConcept":"tomato","preparation":"ripe","optional":false,"parseConfidence":1}],
    "instructions":[{"id":"step-1","sectionLabel":null,"text":"Toast the bread."}],
    "provenance":{"method":"manual","sourceUrl":null,"sourceTitle":null,"sourceAuthor":null,"sourceContentHash":null,"rightsBasis":"user_authored"},
    "credits":[],"lineage":[]
  }'::jsonb);
  retry_receipt := public.save_kwilt_recipe(null, 0, 'recipe-create-1', '{}'::jsonb);
  if first_receipt->>'recipeVersionId' <> retry_receipt->>'recipeVersionId' or retry_receipt->>'replayed' <> 'true' then
    raise exception 'recipe retry did not return the original mutation';
  end if;
  if (select count(*) from public.kwilt_recipes) <> 1 or (select count(*) from public.kwilt_recipe_versions) <> 1 then
    raise exception 'owner could not read saved recipe';
  end if;
  begin
    perform public.save_kwilt_recipe((first_receipt->>'recipeId')::uuid, 0, 'recipe-stale-1', '{"title":"Stale"}'::jsonb);
    raise exception 'stale recipe update succeeded';
  exception when others then
    if sqlerrm <> 'stale_recipe_version' then raise; end if;
  end;
end;
$$;

-- A shared household alone confers no Recipe read permission.
select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if exists(select 1 from public.kwilt_recipes) then raise exception 'household membership leaked a private recipe'; end if;
  if exists(select 1 from public.kwilt_recipe_versions) then raise exception 'household membership leaked a recipe version'; end if;
end $$;

-- An unrelated signed-in person is also isolated.
select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if exists(select 1 from public.kwilt_recipes) then raise exception 'unrelated person read a private recipe'; end if;
end $$;

-- Even an owner-shaped anonymous claim cannot read or mutate.
select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}', true);
do $$ begin
  if exists(select 1 from public.kwilt_recipes) then raise exception 'anonymous claim read a private recipe'; end if;
  begin
    perform public.save_kwilt_recipe(null, 0, 'anonymous-forgery', '{"title":"Forged"}'::jsonb);
    raise exception 'anonymous claim saved a recipe';
  exception when others then
    if sqlerrm <> 'authentication_required' then raise; end if;
  end;
end $$;

reset role;

-- Explicit grants work independently of the household graph for each role.
insert into public.kwilt_recipe_access_grants(recipe_id, grantee_person_id, role, granted_by_person_id)
select id, '62000000-0000-0000-0000-000000000002', 'viewer', '62000000-0000-0000-0000-000000000001'
from public.kwilt_recipes;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}', true);
do $$ begin
  if (select count(*) from public.kwilt_recipes) <> 1 then raise exception 'viewer grant did not allow read'; end if;
end $$;
reset role;
update public.kwilt_recipe_access_grants set role = 'contributor';
set local role authenticated;
do $$ begin
  if (select count(*) from public.kwilt_recipes) <> 1 then raise exception 'contributor grant did not allow read'; end if;
end $$;
reset role;
update public.kwilt_recipe_access_grants set role = 'maintainer';
set local role authenticated;
do $$ begin
  if (select count(*) from public.kwilt_recipes) <> 1 then raise exception 'maintainer grant did not allow read'; end if;
  begin
    insert into public.kwilt_recipe_versions(recipe_id, version, title, content_hash, created_by_person_id, mutation_idempotency_key)
    select id, 2, 'Forged', 'forged', '62000000-0000-0000-0000-000000000002', 'forged' from public.kwilt_recipes;
    raise exception 'authenticated direct version insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Temporary import evidence is owner-only, even when the target Recipe is granted.
insert into public.kwilt_recipe_import_drafts(owner_person_id, source_method, extraction_idempotency_key, expires_at, state)
values ('62000000-0000-0000-0000-000000000001', 'photo', 'draft-1', now() + interval '1 day', 'needs_review');
set local role authenticated;
do $$ begin
  if exists(select 1 from public.kwilt_recipe_import_drafts) then raise exception 'grantee read owner import evidence'; end if;
end $$;
reset role;

-- Referenced content remains immutable, including for an administrative caller.
do $$ begin
  begin
    update public.kwilt_recipe_versions set title = 'Mutated';
    raise exception 'referenced recipe version was mutable';
  exception when others then
    if sqlerrm <> 'immutable_recipe_version' then raise; end if;
  end;
end $$;

-- Owner soft-delete removes the aggregate from all client reads without changing content history.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}', true);
do $$
declare recipe_id uuid;
begin
  select id into recipe_id from public.kwilt_recipes;
  perform public.delete_kwilt_recipe(recipe_id, 1);
  if exists(select 1 from public.kwilt_recipes) then raise exception 'soft-deleted recipe remained client-readable'; end if;
end $$;

reset role;
rollback;

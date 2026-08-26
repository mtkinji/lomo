-- Catalog Recipes share the immutable content model but are not person-owned
-- inventory. They remain readable only through bounded publication functions.

alter table public.kwilt_recipes
  add column ownership_kind text not null default 'personal'
  check (ownership_kind in ('personal', 'catalog'));

update public.kwilt_recipes recipe
set ownership_kind = 'catalog'
where exists (
  select 1
  from public.kwilt_recipe_publications publication
  where publication.recipe_id = recipe.id
);

create index kwilt_recipes_ownership_lifecycle_idx
  on public.kwilt_recipes(ownership_kind, lifecycle, updated_at desc);

create or replace function public.kwilt_can_read_recipe(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_recipes recipe
    where recipe.id = p_recipe_id
      and recipe.ownership_kind = 'personal'
      and recipe.lifecycle <> 'deleted'
      and (
        recipe.owner_person_id = public.kwilt_current_person_id()
        or exists (
          select 1
          from public.kwilt_recipe_access_grants access_grant
          where access_grant.recipe_id = recipe.id
            and access_grant.grantee_person_id = public.kwilt_current_person_id()
            and access_grant.status = 'active'
            and (access_grant.expires_at is null or access_grant.expires_at > now())
        )
      )
  )
$$;

create or replace function public.kwilt_can_use_recipe_version(
  p_recipe_id uuid,
  p_recipe_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kwilt_recipe_versions version_row
    join public.kwilt_recipes recipe on recipe.id = version_row.recipe_id
    where recipe.id = p_recipe_id
      and version_row.id = p_recipe_version_id
      and recipe.lifecycle <> 'deleted'
      and (
        (
          recipe.ownership_kind = 'personal'
          and public.kwilt_can_read_recipe(recipe.id)
        )
        or (
          recipe.ownership_kind = 'catalog'
          and exists (
            select 1
            from public.kwilt_recipe_publications publication
            where publication.recipe_id = recipe.id
              and publication.published_recipe_version_id = version_row.id
              and publication.state = 'published'
              and 'kwilt_mobile' = any(publication.distribution_scopes)
          )
        )
      )
  )
$$;

drop policy kwilt_recipe_grants_explicit_read on public.kwilt_recipe_access_grants;
create policy kwilt_recipe_grants_explicit_read
  on public.kwilt_recipe_access_grants for select to authenticated
  using (
    exists (
      select 1
      from public.kwilt_recipes recipe
      where recipe.id = kwilt_recipe_access_grants.recipe_id
        and recipe.ownership_kind = 'personal'
        and (
          kwilt_recipe_access_grants.grantee_person_id = public.kwilt_current_person_id()
          or recipe.owner_person_id = public.kwilt_current_person_id()
        )
    )
  );

create or replace function public.kwilt_reject_catalog_recipe_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.ownership_kind = 'catalog' and auth.uid() is not null then
    raise exception 'catalog_recipe_immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger kwilt_catalog_recipes_immutable_to_clients
before update or delete on public.kwilt_recipes
for each row execute function public.kwilt_reject_catalog_recipe_mutation();

create or replace function public.sync_kwilt_recipe_cook_session(p_session jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_existing public.kwilt_recipe_cook_sessions; v_id uuid:=(p_session->>'id')::uuid;
begin
  perform public.kwilt_require_permanent_user();
  if v_person is null or p_expected_revision<0 or jsonb_typeof(p_session)<>'object' then raise exception 'invalid_cook_session'; end if;
  if (p_session->>'ownerPersonId')::uuid<>v_person
    or not public.kwilt_can_use_recipe_version(
      (p_session->>'recipeId')::uuid,
      (p_session->>'recipeVersionId')::uuid
    )
  then raise exception 'cook_session_not_owned'; end if;
  select * into v_existing from public.kwilt_recipe_cook_sessions where id=v_id for update;
  if v_existing.id is not null and v_existing.revision<>p_expected_revision then raise exception 'stale_cook_session_revision'; end if;
  if v_existing.id is null and p_expected_revision<>0 then raise exception 'stale_cook_session_revision'; end if;
  insert into public.kwilt_recipe_cook_sessions(id,owner_person_id,recipe_id,recipe_version_id,recipe_version,serving_scale,status,current_cue_index,cue_count,revision,timers,last_device,started_at,paused_at,completed_at,updated_at)
  values(v_id,v_person,(p_session->>'recipeId')::uuid,(p_session->>'recipeVersionId')::uuid,(p_session->>'recipeVersion')::integer,(p_session->>'servingScale')::numeric,p_session->>'status',(p_session->>'currentCueIndex')::integer,(p_session->>'cueCount')::integer,(p_session->>'revision')::integer,coalesce(p_session->'timers','[]'::jsonb),p_session->'lastDevice',(p_session->>'startedAt')::timestamptz,nullif(p_session->>'pausedAt','')::timestamptz,nullif(p_session->>'completedAt','')::timestamptz,(p_session->>'updatedAt')::timestamptz)
  on conflict(id) do update set status=excluded.status,current_cue_index=excluded.current_cue_index,revision=excluded.revision,timers=excluded.timers,last_device=excluded.last_device,paused_at=excluded.paused_at,completed_at=excluded.completed_at,updated_at=excluded.updated_at;
  return jsonb_build_object('sessionId',v_id,'revision',(p_session->>'revision')::integer,'status',p_session->>'status');
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
  insert into public.kwilt_recipes(id, owner_person_id, ownership_kind)
  values(v_recipe_id, p_owner_person_id, 'catalog');
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

revoke all on function public.kwilt_can_use_recipe_version(uuid, uuid) from public, anon;
grant execute on function public.kwilt_can_use_recipe_version(uuid, uuid) to authenticated;

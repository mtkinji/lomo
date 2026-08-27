-- Public-to-Kwilt catalog publications pin one immutable Recipe version.
-- Base Recipe RLS remains private; clients read only through the bounded RPC.

alter table public.kwilt_recipe_versions
  add constraint kwilt_recipe_versions_recipe_id_id_unique unique (recipe_id, id);

create table public.kwilt_recipe_publications (
  id uuid primary key default gen_random_uuid(),
  roster_id text not null unique check (roster_id ~ '^[A-Z]{2}[0-9]{3}$'),
  public_slug text not null unique check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(public_slug) <= 160),
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  published_recipe_version_id uuid not null,
  state text not null default 'draft' check (state in ('draft', 'unlisted', 'published', 'withdrawn', 'moderated')),
  distribution_scopes text[] not null default '{}'::text[] check (
    distribution_scopes <@ array['kwilt_mobile', 'kwilt_desktop', 'kwilt_web', 'public_web']::text[]
    and cardinality(distribution_scopes) between 0 and 4
  ),
  rights_attestation text not null check (rights_attestation in ('original', 'authorized', 'licensed', 'public_domain')),
  license text check (license is null or char_length(license) <= 320),
  attribution_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(attribution_snapshot) = 'array'),
  editorial_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(editorial_metadata) = 'object'),
  content_hash text not null check (char_length(content_hash) between 1 and 256),
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (recipe_id, published_recipe_version_id)
    references public.kwilt_recipe_versions(recipe_id, id) on delete restrict,
  check ((state = 'published') = (published_at is not null and withdrawn_at is null)),
  check ((state = 'withdrawn') = (withdrawn_at is not null))
);

create table public.kwilt_recipe_publication_media (
  publication_id uuid not null references public.kwilt_recipe_publications(id) on delete cascade,
  media_asset_id uuid not null references public.kwilt_recipe_media_assets(id) on delete restrict,
  role text not null check (role in ('hero', 'card', 'step')),
  position integer not null check (position >= 0),
  crop_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(crop_metadata) = 'object'),
  created_at timestamptz not null default now(),
  primary key (publication_id, role, position),
  unique (publication_id, media_asset_id, role)
);

create or replace function public.kwilt_validate_recipe_publication_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.kwilt_recipe_publications publication
    join public.kwilt_recipe_media_assets media
      on media.id = new.media_asset_id
     and media.recipe_id = publication.recipe_id
     and media.public_allowed
     and media.lifecycle = 'active'
    where publication.id = new.publication_id
  ) then
    raise exception 'invalid_recipe_publication_media';
  end if;
  return new;
end;
$$;

create trigger kwilt_recipe_publication_media_validate
before insert or update on public.kwilt_recipe_publication_media
for each row execute function public.kwilt_validate_recipe_publication_media();

create index kwilt_recipe_publications_discovery_idx
  on public.kwilt_recipe_publications(state, roster_id)
  where state = 'published';
create index kwilt_recipe_publications_version_idx
  on public.kwilt_recipe_publications(published_recipe_version_id);
create index kwilt_recipe_publication_media_asset_idx
  on public.kwilt_recipe_publication_media(media_asset_id);

alter table public.kwilt_recipe_publications enable row level security;
alter table public.kwilt_recipe_publication_media enable row level security;

create policy kwilt_recipe_publications_catalog_read
  on public.kwilt_recipe_publications for select to authenticated
  using (
    state = 'published'
    and 'kwilt_mobile' = any(distribution_scopes)
    and public.kwilt_current_person_id() is not null
  );

create policy kwilt_recipe_publication_media_catalog_read
  on public.kwilt_recipe_publication_media for select to authenticated
  using (
    exists (
      select 1 from public.kwilt_recipe_publications publication
      where publication.id = publication_id
        and publication.state = 'published'
        and 'kwilt_mobile' = any(publication.distribution_scopes)
    )
  );

grant select on public.kwilt_recipe_publications, public.kwilt_recipe_publication_media to authenticated;
revoke all on public.kwilt_recipe_publications, public.kwilt_recipe_publication_media from anon;
revoke insert, update, delete on public.kwilt_recipe_publications, public.kwilt_recipe_publication_media from authenticated;

create or replace function public.list_kwilt_recipe_catalog(
  p_after_roster_id text default null,
  p_limit integer default 500
)
returns table(projection jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.kwilt_require_permanent_user();
  if public.kwilt_current_person_id() is null then
    raise exception 'person_binding_required';
  end if;
  if p_limit is null or p_limit not between 1 and 500
     or (p_after_roster_id is not null and p_after_roster_id !~ '^[A-Z]{2}[0-9]{3}$') then
    raise exception 'invalid_recipe_catalog_cursor';
  end if;

  return query
  select jsonb_build_object(
    'recipe', jsonb_build_object(
      'id', recipe.id,
      'ownerPersonId', recipe.owner_person_id,
      'currentVersionId', publication.published_recipe_version_id,
      'lifecycle', recipe.lifecycle,
      'provenance', coalesce((
        select jsonb_build_object(
          'id', provenance.id,
          'method', provenance.method,
          'sourceUrl', provenance.source_url,
          'sourceTitle', provenance.source_title,
          'sourceAuthor', provenance.source_author,
          'sourceContentHash', provenance.source_content_hash,
          'rightsBasis', provenance.rights_basis,
          'importedAt', provenance.imported_at
        ) from public.kwilt_recipe_provenance provenance
        where provenance.recipe_version_id = version_row.id
      ), '{}'::jsonb),
      'credits', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', credit.id,
          'role', credit.role,
          'personId', credit.person_id,
          'publicProfileId', credit.public_profile_id,
          'displayLabel', credit.display_label,
          'position', credit.position,
          'publicVisible', credit.public_visible
        ) order by credit.position)
        from public.kwilt_recipe_credits credit
        where credit.recipe_version_id = version_row.id and credit.public_visible
      ), '[]'::jsonb),
      'lineage', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', lineage.id,
          'relationship', lineage.relationship,
          'sourceRecipeId', lineage.source_recipe_id,
          'sourceRecipeVersionId', lineage.source_recipe_version_id,
          'sourcePublicationId', lineage.source_publication_id
        )) from public.kwilt_recipe_lineage lineage
        where lineage.recipe_version_id = version_row.id
      ), '[]'::jsonb),
      'accessGrants', '[]'::jsonb,
      'mediaAssets', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', media.id,
          'ownerPersonId', media.owner_person_id,
          'storageRef', media.storage_ref,
          'mediaType', media.media_type,
          'rightsBasis', media.rights_basis,
          'attribution', media.attribution,
          'altText', media.alt_text,
          'publicAllowed', media.public_allowed,
          'lifecycle', media.lifecycle
        ) order by publication_media.position)
        from public.kwilt_recipe_publication_media publication_media
        join public.kwilt_recipe_media_assets media on media.id = publication_media.media_asset_id
        where publication_media.publication_id = publication.id
          and media.recipe_id = recipe.id
          and media.public_allowed
          and media.lifecycle = 'active'
      ), '[]'::jsonb),
      'createdAt', recipe.created_at,
      'updatedAt', recipe.updated_at
    ),
    'currentVersion', jsonb_build_object(
      'id', version_row.id,
      'recipeId', version_row.recipe_id,
      'version', version_row.version,
      'title', version_row.title,
      'description', version_row.description,
      'yieldQuantity', version_row.yield_quantity,
      'yieldUnit', version_row.yield_unit,
      'prepMinutes', version_row.prep_minutes,
      'cookMinutes', version_row.cook_minutes,
      'notes', version_row.notes,
      'ingredients', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', ingredient.id,
          'recipeVersionId', ingredient.recipe_version_id,
          'position', ingredient.position,
          'groupLabel', ingredient.group_label,
          'originalText', ingredient.original_text,
          'quantityMin', ingredient.quantity_min,
          'quantityMax', ingredient.quantity_max,
          'unit', ingredient.unit,
          'ingredientConcept', ingredient.ingredient_concept,
          'preparation', ingredient.preparation,
          'optional', ingredient.optional,
          'parseConfidence', ingredient.parse_confidence
        ) order by ingredient.position)
        from public.kwilt_recipe_ingredients ingredient
        where ingredient.recipe_version_id = version_row.id
      ), '[]'::jsonb),
      'instructions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', instruction.id,
          'recipeVersionId', instruction.recipe_version_id,
          'position', instruction.position,
          'sectionLabel', instruction.section_label,
          'text', instruction.step_text
        ) order by instruction.position)
        from public.kwilt_recipe_instructions instruction
        where instruction.recipe_version_id = version_row.id
      ), '[]'::jsonb),
      'createdByPersonId', version_row.created_by_person_id,
      'createdAt', version_row.created_at,
      'contentHash', version_row.content_hash
    ),
    'catalog', jsonb_build_object(
      'publicationId', publication.id,
      'rosterId', publication.roster_id,
      'publicSlug', publication.public_slug,
      'editorialMetadata', publication.editorial_metadata,
      'publishedAt', publication.published_at,
      'contentHash', publication.content_hash
    )
  )
  from public.kwilt_recipe_publications publication
  join public.kwilt_recipes recipe on recipe.id = publication.recipe_id
  join public.kwilt_recipe_versions version_row on version_row.id = publication.published_recipe_version_id
  where publication.state = 'published'
    and 'kwilt_mobile' = any(publication.distribution_scopes)
    and recipe.lifecycle = 'active'
    and (p_after_roster_id is null or publication.roster_id > p_after_roster_id)
  order by publication.roster_id
  limit p_limit;
end;
$$;

revoke all on function public.list_kwilt_recipe_catalog(text, integer) from public, anon;
grant execute on function public.list_kwilt_recipe_catalog(text, integer) to authenticated;

-- Private, person-owned Recipes. Household membership never grants recipe access.
-- Content is append-only; authenticated clients mutate only through reviewed RPCs.

create extension if not exists pgcrypto;

create table public.kwilt_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  current_version_id uuid,
  lifecycle text not null default 'active' check (lifecycle in ('active', 'archived', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((lifecycle = 'deleted') = (deleted_at is not null))
);

create table public.kwilt_recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 4000),
  yield_quantity numeric check (yield_quantity is null or yield_quantity >= 0),
  yield_unit text check (yield_unit is null or char_length(yield_unit) <= 80),
  prep_minutes integer check (prep_minutes is null or prep_minutes between 0 and 100000),
  cook_minutes integer check (cook_minutes is null or cook_minutes between 0 and 100000),
  notes text check (notes is null or char_length(notes) <= 20000),
  content_hash text not null check (char_length(content_hash) between 1 and 256),
  created_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  mutation_idempotency_key text not null check (char_length(mutation_idempotency_key) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (recipe_id, version),
  unique (created_by_person_id, mutation_idempotency_key)
);

alter table public.kwilt_recipes
  add constraint kwilt_recipes_current_version_fk
  foreign key (current_version_id) references public.kwilt_recipe_versions(id) on delete restrict;

create table public.kwilt_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  source_line_id text not null check (char_length(source_line_id) between 1 and 128),
  position integer not null check (position >= 0),
  group_label text check (group_label is null or char_length(group_label) <= 160),
  original_text text not null check (char_length(btrim(original_text)) between 1 and 1000),
  quantity_min numeric check (quantity_min is null or quantity_min >= 0),
  quantity_max numeric check (quantity_max is null or quantity_max >= 0),
  unit text check (unit is null or char_length(unit) <= 80),
  ingredient_concept text check (ingredient_concept is null or char_length(ingredient_concept) <= 320),
  preparation text check (preparation is null or char_length(preparation) <= 320),
  optional boolean not null default false,
  parse_confidence numeric check (parse_confidence is null or parse_confidence between 0 and 1),
  unique (recipe_version_id, position),
  unique (recipe_version_id, source_line_id)
);

create table public.kwilt_recipe_instructions (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  source_step_id text not null check (char_length(source_step_id) between 1 and 128),
  position integer not null check (position >= 0),
  section_label text check (section_label is null or char_length(section_label) <= 160),
  step_text text not null check (char_length(btrim(step_text)) between 1 and 8000),
  unique (recipe_version_id, position),
  unique (recipe_version_id, source_step_id)
);

create table public.kwilt_recipe_provenance (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null unique references public.kwilt_recipe_versions(id) on delete restrict,
  method text not null check (method in ('manual', 'url', 'photo', 'scan', 'text', 'voice', 'email', 'copy', 'catalog')),
  source_url text check (source_url is null or char_length(source_url) <= 2048),
  source_title text check (source_title is null or char_length(source_title) <= 512),
  source_author text check (source_author is null or char_length(source_author) <= 512),
  source_content_hash text check (source_content_hash is null or char_length(source_content_hash) <= 256),
  rights_basis text not null check (rights_basis in ('user_authored', 'private_user_import', 'authorized', 'licensed', 'public_domain', 'kwilt_authored')),
  imported_at timestamptz
);

create table public.kwilt_recipe_credits (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  role text not null check (role in ('author', 'contributor', 'family_source', 'adapted_from', 'imported_from')),
  person_id uuid references public.kwilt_people(id) on delete restrict,
  public_profile_id uuid,
  display_label text check (display_label is null or char_length(display_label) <= 320),
  position integer not null check (position >= 0),
  public_visible boolean not null default false,
  unique (recipe_version_id, position)
);

create table public.kwilt_recipe_lineage (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  relationship text not null check (relationship in ('copy', 'adaptation', 'fork')),
  source_recipe_id uuid references public.kwilt_recipes(id) on delete restrict,
  source_recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  source_publication_id uuid,
  unique (recipe_version_id, source_recipe_version_id, relationship)
);

create table public.kwilt_recipe_access_grants (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  grantee_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  role text not null check (role in ('viewer', 'contributor', 'maintainer')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked', 'expired')),
  granted_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (recipe_id, grantee_person_id)
);

create table public.kwilt_recipe_media_assets (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  storage_ref text not null check (char_length(storage_ref) between 1 and 1024),
  media_type text not null check (char_length(media_type) between 1 and 128),
  rights_basis text not null check (rights_basis in ('user_authored', 'private_user_import', 'authorized', 'licensed', 'public_domain', 'kwilt_authored')),
  attribution text check (attribution is null or char_length(attribution) <= 1000),
  alt_text text check (alt_text is null or char_length(alt_text) <= 1000),
  public_allowed boolean not null default false,
  lifecycle text not null default 'active' check (lifecycle in ('active', 'deleted')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (not public_allowed or rights_basis <> 'private_user_import')
);

create table public.kwilt_recipe_import_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  target_recipe_id uuid references public.kwilt_recipes(id) on delete restrict,
  expected_version integer not null default 0 check (expected_version >= 0),
  state text not null default 'extracting' check (state in ('extracting', 'needs_review', 'approved', 'failed', 'expired', 'discarded')),
  source_method text not null check (source_method in ('url', 'photo', 'scan', 'text', 'voice', 'email')),
  source_artifact_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_artifact_refs) = 'array'),
  extracted_data jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_data) = 'object'),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  field_confidence jsonb not null default '{}'::jsonb check (jsonb_typeof(field_confidence) = 'object'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  extractor_model text,
  prompt_version text,
  extraction_idempotency_key text not null check (char_length(extraction_idempotency_key) between 1 and 200),
  approval_idempotency_key text,
  approved_recipe_version_id uuid references public.kwilt_recipe_versions(id) on delete restrict,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_person_id, extraction_idempotency_key)
);

create index kwilt_recipe_versions_recipe_idx on public.kwilt_recipe_versions(recipe_id, version desc);
create index kwilt_recipe_grants_grantee_idx on public.kwilt_recipe_access_grants(grantee_person_id, status);
create index kwilt_recipe_drafts_owner_idx on public.kwilt_recipe_import_drafts(owner_person_id, created_at desc);

create or replace function public.kwilt_current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select binding.person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = auth.uid()
    and binding.status = 'active'
    and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
  limit 1
$$;

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
      and recipe.lifecycle <> 'deleted'
      and (
        recipe.owner_person_id = public.kwilt_current_person_id()
        or exists (
          select 1 from public.kwilt_recipe_access_grants access_grant
          where access_grant.recipe_id = recipe.id
            and access_grant.grantee_person_id = public.kwilt_current_person_id()
            and access_grant.status = 'active'
            and (access_grant.expires_at is null or access_grant.expires_at > now())
        )
      )
  )
$$;

alter table public.kwilt_recipes enable row level security;
alter table public.kwilt_recipe_versions enable row level security;
alter table public.kwilt_recipe_ingredients enable row level security;
alter table public.kwilt_recipe_instructions enable row level security;
alter table public.kwilt_recipe_provenance enable row level security;
alter table public.kwilt_recipe_credits enable row level security;
alter table public.kwilt_recipe_lineage enable row level security;
alter table public.kwilt_recipe_access_grants enable row level security;
alter table public.kwilt_recipe_media_assets enable row level security;
alter table public.kwilt_recipe_import_drafts enable row level security;

create policy kwilt_recipes_explicit_read on public.kwilt_recipes for select to authenticated
  using (public.kwilt_can_read_recipe(id));
create policy kwilt_recipe_versions_explicit_read on public.kwilt_recipe_versions for select to authenticated
  using (public.kwilt_can_read_recipe(recipe_id));
create policy kwilt_recipe_ingredients_explicit_read on public.kwilt_recipe_ingredients for select to authenticated
  using (exists (select 1 from public.kwilt_recipe_versions version_row where version_row.id = recipe_version_id and public.kwilt_can_read_recipe(version_row.recipe_id)));
create policy kwilt_recipe_instructions_explicit_read on public.kwilt_recipe_instructions for select to authenticated
  using (exists (select 1 from public.kwilt_recipe_versions version_row where version_row.id = recipe_version_id and public.kwilt_can_read_recipe(version_row.recipe_id)));
create policy kwilt_recipe_provenance_explicit_read on public.kwilt_recipe_provenance for select to authenticated
  using (exists (select 1 from public.kwilt_recipe_versions version_row where version_row.id = recipe_version_id and public.kwilt_can_read_recipe(version_row.recipe_id)));
create policy kwilt_recipe_credits_explicit_read on public.kwilt_recipe_credits for select to authenticated
  using (exists (select 1 from public.kwilt_recipe_versions version_row where version_row.id = recipe_version_id and public.kwilt_can_read_recipe(version_row.recipe_id)));
create policy kwilt_recipe_lineage_explicit_read on public.kwilt_recipe_lineage for select to authenticated
  using (exists (select 1 from public.kwilt_recipe_versions version_row where version_row.id = recipe_version_id and public.kwilt_can_read_recipe(version_row.recipe_id)));
create policy kwilt_recipe_grants_explicit_read on public.kwilt_recipe_access_grants for select to authenticated
  using (
    grantee_person_id = public.kwilt_current_person_id()
    or exists(select 1 from public.kwilt_recipes recipe where recipe.id = kwilt_recipe_access_grants.recipe_id and recipe.owner_person_id = public.kwilt_current_person_id())
  );
create policy kwilt_recipe_media_explicit_read on public.kwilt_recipe_media_assets for select to authenticated
  using (lifecycle <> 'deleted' and public.kwilt_can_read_recipe(recipe_id));
create policy kwilt_recipe_drafts_owner_read on public.kwilt_recipe_import_drafts for select to authenticated
  using (owner_person_id = public.kwilt_current_person_id() and state <> 'discarded' and expires_at > now());

create or replace function public.kwilt_reject_recipe_content_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'immutable_recipe_version';
end;
$$;

create trigger kwilt_recipe_versions_immutable before update or delete on public.kwilt_recipe_versions
  for each row execute function public.kwilt_reject_recipe_content_change();
create trigger kwilt_recipe_ingredients_immutable before update or delete on public.kwilt_recipe_ingredients
  for each row execute function public.kwilt_reject_recipe_content_change();
create trigger kwilt_recipe_instructions_immutable before update or delete on public.kwilt_recipe_instructions
  for each row execute function public.kwilt_reject_recipe_content_change();
create trigger kwilt_recipe_provenance_immutable before update or delete on public.kwilt_recipe_provenance
  for each row execute function public.kwilt_reject_recipe_content_change();
create trigger kwilt_recipe_credits_immutable before update or delete on public.kwilt_recipe_credits
  for each row execute function public.kwilt_reject_recipe_content_change();
create trigger kwilt_recipe_lineage_immutable before update or delete on public.kwilt_recipe_lineage
  for each row execute function public.kwilt_reject_recipe_content_change();

create or replace function public.save_kwilt_recipe(
  p_recipe_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_reviewed_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_recipe public.kwilt_recipes;
  v_version public.kwilt_recipe_versions;
  v_next_version integer;
  v_ingredient jsonb;
  v_step jsonb;
  v_credit jsonb;
  v_lineage jsonb;
  v_ordinal bigint;
  v_allowed_keys text[] := array['title','description','yieldQuantity','yieldUnit','prepMinutes','cookMinutes','notes','ingredients','instructions','provenance','credits','lineage'];
begin
  select binding.person_id into v_person_id
  from public.kwilt_person_auth_bindings binding
  where binding.user_id = v_user_id and binding.status = 'active';
  if v_person_id is null then raise exception 'person_binding_required'; end if;
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 1 and 200 then
    raise exception 'invalid_recipe_idempotency_key';
  end if;

  select * into v_version from public.kwilt_recipe_versions
  where created_by_person_id = v_person_id and mutation_idempotency_key = btrim(p_idempotency_key);
  if v_version.id is not null then
    return jsonb_build_object('recipeId', v_version.recipe_id, 'recipeVersionId', v_version.id,
      'version', v_version.version, 'idempotencyKey', v_version.mutation_idempotency_key, 'replayed', true);
  end if;

  if jsonb_typeof(p_reviewed_data) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(p_reviewed_data) as keys(key_name)
       where not (key_name = any(v_allowed_keys))
     ) then
    raise exception 'invalid_reviewed_recipe_fields';
  end if;
  if char_length(btrim(coalesce(p_reviewed_data->>'title', ''))) not between 1 and 160 then raise exception 'invalid_recipe_title'; end if;
  if jsonb_typeof(coalesce(p_reviewed_data->'ingredients', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reviewed_data->'ingredients', '[]'::jsonb)) > 200 then raise exception 'invalid_recipe_ingredients'; end if;
  if jsonb_typeof(coalesce(p_reviewed_data->'instructions', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reviewed_data->'instructions', '[]'::jsonb)) > 200 then raise exception 'invalid_recipe_instructions'; end if;

  if p_recipe_id is null then
    if p_expected_version <> 0 then raise exception 'stale_recipe_version'; end if;
    insert into public.kwilt_recipes(owner_person_id) values (v_person_id) returning * into v_recipe;
    v_next_version := 1;
  else
    select * into v_recipe from public.kwilt_recipes where id = p_recipe_id for update;
    if v_recipe.id is null or v_recipe.owner_person_id <> v_person_id or v_recipe.lifecycle = 'deleted' then raise exception 'recipe_not_owned'; end if;
    select version into v_next_version from public.kwilt_recipe_versions where id = v_recipe.current_version_id;
    if v_next_version is distinct from p_expected_version then raise exception 'stale_recipe_version'; end if;
    v_next_version := v_next_version + 1;
  end if;

  insert into public.kwilt_recipe_versions(
    recipe_id, version, title, description, yield_quantity, yield_unit, prep_minutes,
    cook_minutes, notes, content_hash, created_by_person_id, mutation_idempotency_key
  ) values (
    v_recipe.id, v_next_version, btrim(p_reviewed_data->>'title'), p_reviewed_data->>'description',
    nullif(p_reviewed_data->>'yieldQuantity','')::numeric, p_reviewed_data->>'yieldUnit',
    nullif(p_reviewed_data->>'prepMinutes','')::integer, nullif(p_reviewed_data->>'cookMinutes','')::integer,
    p_reviewed_data->>'notes', encode(extensions.digest(p_reviewed_data::text, 'sha256'), 'hex'),
    v_person_id, btrim(p_idempotency_key)
  ) returning * into v_version;

  for v_ingredient, v_ordinal in
    select value, ordinality from jsonb_array_elements(coalesce(p_reviewed_data->'ingredients','[]'::jsonb)) with ordinality
  loop
    if jsonb_typeof(v_ingredient) <> 'object' or char_length(btrim(coalesce(v_ingredient->>'originalText',''))) not between 1 and 1000 then
      raise exception 'invalid_recipe_ingredient';
    end if;
    insert into public.kwilt_recipe_ingredients(
      recipe_version_id, source_line_id, position, group_label, original_text, quantity_min,
      quantity_max, unit, ingredient_concept, preparation, optional, parse_confidence
    ) values (
      v_version.id, coalesce(nullif(v_ingredient->>'id',''), gen_random_uuid()::text), v_ordinal - 1,
      v_ingredient->>'groupLabel', btrim(v_ingredient->>'originalText'),
      nullif(v_ingredient->>'quantityMin','')::numeric, nullif(v_ingredient->>'quantityMax','')::numeric,
      v_ingredient->>'unit', v_ingredient->>'ingredientConcept', v_ingredient->>'preparation',
      coalesce((v_ingredient->>'optional')::boolean, false), nullif(v_ingredient->>'parseConfidence','')::numeric
    );
  end loop;

  for v_step, v_ordinal in
    select value, ordinality from jsonb_array_elements(coalesce(p_reviewed_data->'instructions','[]'::jsonb)) with ordinality
  loop
    if jsonb_typeof(v_step) <> 'object' or char_length(btrim(coalesce(v_step->>'text',''))) not between 1 and 8000 then
      raise exception 'invalid_recipe_instruction';
    end if;
    insert into public.kwilt_recipe_instructions(recipe_version_id, source_step_id, position, section_label, step_text)
    values (v_version.id, coalesce(nullif(v_step->>'id',''), gen_random_uuid()::text), v_ordinal - 1,
      v_step->>'sectionLabel', btrim(v_step->>'text'));
  end loop;

  insert into public.kwilt_recipe_provenance(
    recipe_version_id, method, source_url, source_title, source_author, source_content_hash, rights_basis, imported_at
  ) values (
    v_version.id, coalesce(p_reviewed_data#>>'{provenance,method}', 'manual'),
    p_reviewed_data#>>'{provenance,sourceUrl}', p_reviewed_data#>>'{provenance,sourceTitle}',
    p_reviewed_data#>>'{provenance,sourceAuthor}', p_reviewed_data#>>'{provenance,sourceContentHash}',
    coalesce(p_reviewed_data#>>'{provenance,rightsBasis}', 'user_authored'),
    case when coalesce(p_reviewed_data#>>'{provenance,method}', 'manual') = 'manual' then null else now() end
  );

  if jsonb_typeof(coalesce(p_reviewed_data->'credits', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reviewed_data->'credits', '[]'::jsonb)) > 50 then raise exception 'invalid_recipe_credits'; end if;
  for v_credit, v_ordinal in
    select value, ordinality from jsonb_array_elements(coalesce(p_reviewed_data->'credits','[]'::jsonb)) with ordinality
  loop
    if jsonb_typeof(v_credit) <> 'object' or coalesce(v_credit->>'role','') not in ('author','contributor','family_source','adapted_from','imported_from') then
      raise exception 'invalid_recipe_credit';
    end if;
    insert into public.kwilt_recipe_credits(recipe_version_id,role,person_id,public_profile_id,display_label,position,public_visible)
    values(v_version.id,v_credit->>'role',nullif(v_credit->>'personId','')::uuid,nullif(v_credit->>'publicProfileId','')::uuid,
      nullif(btrim(v_credit->>'displayLabel'),''),v_ordinal-1,coalesce((v_credit->>'publicVisible')::boolean,false));
  end loop;

  if jsonb_typeof(coalesce(p_reviewed_data->'lineage', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reviewed_data->'lineage', '[]'::jsonb)) > 20 then raise exception 'invalid_recipe_lineage'; end if;
  for v_lineage in select value from jsonb_array_elements(coalesce(p_reviewed_data->'lineage','[]'::jsonb))
  loop
    if jsonb_typeof(v_lineage) <> 'object' or coalesce(v_lineage->>'relationship','') not in ('copy','adaptation','fork')
       or nullif(v_lineage->>'sourceRecipeVersionId','') is null then raise exception 'invalid_recipe_lineage'; end if;
    insert into public.kwilt_recipe_lineage(recipe_version_id,relationship,source_recipe_id,source_recipe_version_id,source_publication_id)
    values(v_version.id,v_lineage->>'relationship',nullif(v_lineage->>'sourceRecipeId','')::uuid,
      (v_lineage->>'sourceRecipeVersionId')::uuid,nullif(v_lineage->>'sourcePublicationId','')::uuid);
  end loop;

  update public.kwilt_recipes set current_version_id = v_version.id, updated_at = now() where id = v_recipe.id;
  return jsonb_build_object('recipeId', v_recipe.id, 'recipeVersionId', v_version.id,
    'version', v_version.version, 'provenanceId', (select id from public.kwilt_recipe_provenance where recipe_version_id = v_version.id),
    'idempotencyKey', v_version.mutation_idempotency_key, 'replayed', false);
end;
$$;

create or replace function public.approve_kwilt_recipe_import(
  p_draft_id uuid,
  p_idempotency_key text,
  p_reviewed_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_draft public.kwilt_recipe_import_drafts;
  v_result jsonb;
begin
  select person_id into v_person_id from public.kwilt_person_auth_bindings
    where user_id = v_user_id and status = 'active';
  if v_person_id is null then raise exception 'person_binding_required'; end if;
  select * into v_draft from public.kwilt_recipe_import_drafts where id = p_draft_id for update;
  if v_draft.id is null or v_draft.owner_person_id <> v_person_id then raise exception 'recipe_import_not_owned'; end if;
  if v_draft.expires_at <= now() then raise exception 'recipe_import_expired'; end if;
  if v_draft.state = 'approved' then
    if v_draft.approval_idempotency_key <> p_idempotency_key then raise exception 'recipe_import_already_approved'; end if;
    select jsonb_build_object('recipeId', recipe_id, 'recipeVersionId', id, 'version', version,
      'idempotencyKey', mutation_idempotency_key, 'replayed', true) into v_result
      from public.kwilt_recipe_versions where id = v_draft.approved_recipe_version_id;
    return v_result;
  end if;
  if v_draft.state <> 'needs_review' then raise exception 'recipe_import_not_reviewable'; end if;
  v_result := public.save_kwilt_recipe(v_draft.target_recipe_id, v_draft.expected_version, p_idempotency_key, p_reviewed_data);
  update public.kwilt_recipe_import_drafts set state = 'approved', approval_idempotency_key = p_idempotency_key,
    approved_recipe_version_id = (v_result->>'recipeVersionId')::uuid, updated_at = now() where id = p_draft_id;
  return v_result || jsonb_build_object('draftId', p_draft_id);
end;
$$;

create or replace function public.delete_kwilt_recipe(p_recipe_id uuid, p_expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.kwilt_require_permanent_user();
  v_person_id uuid;
  v_recipe public.kwilt_recipes;
  v_version integer;
begin
  select person_id into v_person_id from public.kwilt_person_auth_bindings
    where user_id = v_user_id and status = 'active';
  select * into v_recipe from public.kwilt_recipes where id = p_recipe_id for update;
  if v_person_id is null or v_recipe.id is null or v_recipe.owner_person_id <> v_person_id then raise exception 'recipe_not_owned'; end if;
  select version into v_version from public.kwilt_recipe_versions where id = v_recipe.current_version_id;
  if v_version is distinct from p_expected_version then raise exception 'stale_recipe_version'; end if;
  if v_recipe.lifecycle <> 'deleted' then
    update public.kwilt_recipes set lifecycle = 'deleted', deleted_at = now(), updated_at = now() where id = p_recipe_id;
  end if;
  return jsonb_build_object('recipeId', p_recipe_id, 'version', v_version, 'deleted', true);
end;
$$;

grant select on public.kwilt_recipes, public.kwilt_recipe_versions, public.kwilt_recipe_ingredients,
  public.kwilt_recipe_instructions, public.kwilt_recipe_provenance, public.kwilt_recipe_credits,
  public.kwilt_recipe_lineage, public.kwilt_recipe_access_grants, public.kwilt_recipe_media_assets,
  public.kwilt_recipe_import_drafts to authenticated;

revoke insert, update, delete on public.kwilt_recipes, public.kwilt_recipe_versions,
  public.kwilt_recipe_ingredients, public.kwilt_recipe_instructions, public.kwilt_recipe_provenance,
  public.kwilt_recipe_credits, public.kwilt_recipe_lineage, public.kwilt_recipe_access_grants,
  public.kwilt_recipe_media_assets, public.kwilt_recipe_import_drafts from public, anon, authenticated;

revoke execute on function public.kwilt_current_person_id() from public, anon;
revoke execute on function public.kwilt_can_read_recipe(uuid) from public, anon;
revoke execute on function public.save_kwilt_recipe(uuid, integer, text, jsonb) from public, anon;
revoke execute on function public.approve_kwilt_recipe_import(uuid, text, jsonb) from public, anon;
revoke execute on function public.delete_kwilt_recipe(uuid, integer) from public, anon;
grant execute on function public.save_kwilt_recipe(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.approve_kwilt_recipe_import(uuid, text, jsonb) to authenticated;

-- Temporary import evidence is private and person-scoped. Canonical Recipe media
-- uses a separate lifecycle; these artifacts expire with the import draft.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recipe-import-artifacts','recipe-import-artifacts',false,12582912,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy kwilt_recipe_import_artifacts_owner_read on storage.objects for select to authenticated using(bucket_id='recipe-import-artifacts' and exists(select 1 from public.kwilt_person_auth_bindings binding where binding.user_id=auth.uid() and binding.person_id::text=(storage.foldername(name))[1] and binding.status='active'));
create policy kwilt_recipe_import_artifacts_owner_insert on storage.objects for insert to authenticated with check(bucket_id='recipe-import-artifacts' and exists(select 1 from public.kwilt_person_auth_bindings binding where binding.user_id=auth.uid() and binding.person_id::text=(storage.foldername(name))[1] and binding.status='active'));
create policy kwilt_recipe_import_artifacts_owner_delete on storage.objects for delete to authenticated using(bucket_id='recipe-import-artifacts' and exists(select 1 from public.kwilt_person_auth_bindings binding where binding.user_id=auth.uid() and binding.person_id::text=(storage.foldername(name))[1] and binding.status='active'));
grant execute on function public.delete_kwilt_recipe(uuid, integer) to authenticated;
grant execute on function public.kwilt_current_person_id() to authenticated;
grant execute on function public.kwilt_can_read_recipe(uuid) to authenticated;

-- Persist reviewed, source-grounded equipment evidence with immutable Recipe versions.

create table public.kwilt_recipe_equipment_requirements (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  position integer not null check (position >= 0),
  concept_id text not null check (concept_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(concept_id) <= 80),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  search_query text not null check (char_length(btrim(search_query)) between 1 and 240),
  necessity text not null check (necessity in ('required', 'preferred')),
  confidence numeric not null check (confidence between 0 and 1),
  evidence_text text not null check (char_length(btrim(evidence_text)) between 1 and 8000),
  substitute text check (substitute is null or char_length(btrim(substitute)) between 1 and 160),
  unique (recipe_version_id, position),
  unique (recipe_version_id, concept_id, search_query)
);

create index kwilt_recipe_equipment_version_idx
  on public.kwilt_recipe_equipment_requirements(recipe_version_id, position);

alter table public.kwilt_recipe_equipment_requirements enable row level security;

create policy kwilt_recipe_equipment_explicit_read
  on public.kwilt_recipe_equipment_requirements
  for select to authenticated
  using (
    exists (
      select 1
      from public.kwilt_recipe_versions version_row
      where version_row.id = recipe_version_id
        and public.kwilt_can_read_recipe(version_row.recipe_id)
    )
  );

create trigger kwilt_recipe_equipment_immutable
  before update or delete on public.kwilt_recipe_equipment_requirements
  for each row execute function public.kwilt_reject_recipe_content_change();

grant select on public.kwilt_recipe_equipment_requirements to authenticated;
revoke insert, update, delete on public.kwilt_recipe_equipment_requirements from public, anon, authenticated;

create or replace function public.save_kwilt_recipe_with_equipment(
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
  v_result jsonb;
  v_version_id uuid;
  v_equipment jsonb;
  v_ordinal bigint;
begin
  if jsonb_typeof(p_reviewed_data) <> 'object'
     or jsonb_typeof(coalesce(p_reviewed_data->'equipmentRequirements', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_reviewed_data->'equipmentRequirements', '[]'::jsonb)) > 24 then
    raise exception 'invalid_recipe_equipment_requirements';
  end if;

  v_result := public.save_kwilt_recipe(
    p_recipe_id,
    p_expected_version,
    p_idempotency_key,
    p_reviewed_data - 'equipmentRequirements'
  );
  v_version_id := (v_result->>'recipeVersionId')::uuid;

  if coalesce((v_result->>'replayed')::boolean, false) then
    return v_result;
  end if;

  for v_equipment, v_ordinal in
    select value, ordinality
    from jsonb_array_elements(coalesce(p_reviewed_data->'equipmentRequirements', '[]'::jsonb)) with ordinality
  loop
    if jsonb_typeof(v_equipment) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(v_equipment) as keys(key_name)
         where key_name not in ('id', 'label', 'searchQuery', 'necessity', 'confidence', 'evidenceText', 'substitute')
       )
       or coalesce(v_equipment->>'id', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or char_length(v_equipment->>'id') > 80
       or char_length(btrim(coalesce(v_equipment->>'label', ''))) not between 1 and 160
       or char_length(btrim(coalesce(v_equipment->>'searchQuery', ''))) not between 1 and 240
       or coalesce(v_equipment->>'necessity', '') not in ('required', 'preferred')
       or nullif(v_equipment->>'confidence', '') is null
       or (v_equipment->>'confidence')::numeric not between 0 and 1
       or char_length(btrim(coalesce(v_equipment->>'evidenceText', ''))) not between 1 and 8000
       or (v_equipment->>'substitute' is not null and char_length(btrim(v_equipment->>'substitute')) not between 1 and 160)
       or not exists (
         select 1
         from jsonb_array_elements(coalesce(p_reviewed_data->'instructions', '[]'::jsonb)) instruction
         where position(
           lower(regexp_replace(btrim(v_equipment->>'evidenceText'), '\s+', ' ', 'g'))
           in lower(regexp_replace(btrim(instruction->>'text'), '\s+', ' ', 'g'))
         ) > 0
       ) then
      raise exception 'invalid_recipe_equipment_requirement';
    end if;

    insert into public.kwilt_recipe_equipment_requirements(
      recipe_version_id, position, concept_id, label, search_query, necessity,
      confidence, evidence_text, substitute
    ) values (
      v_version_id, v_ordinal - 1, v_equipment->>'id', btrim(v_equipment->>'label'),
      btrim(v_equipment->>'searchQuery'), v_equipment->>'necessity',
      (v_equipment->>'confidence')::numeric, btrim(v_equipment->>'evidenceText'),
      nullif(btrim(v_equipment->>'substitute'), '')
    );
  end loop;

  return v_result;
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
  v_result := public.save_kwilt_recipe_with_equipment(
    v_draft.target_recipe_id,
    v_draft.expected_version,
    p_idempotency_key,
    p_reviewed_data
  );
  update public.kwilt_recipe_import_drafts set state = 'approved', approval_idempotency_key = p_idempotency_key,
    approved_recipe_version_id = (v_result->>'recipeVersionId')::uuid, updated_at = now() where id = p_draft_id;
  return v_result || jsonb_build_object('draftId', p_draft_id);
end;
$$;

revoke execute on function public.save_kwilt_recipe_with_equipment(uuid, integer, text, jsonb) from public, anon;
revoke execute on function public.approve_kwilt_recipe_import(uuid, text, jsonb) from public, anon;
grant execute on function public.save_kwilt_recipe_with_equipment(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.approve_kwilt_recipe_import(uuid, text, jsonb) to authenticated;

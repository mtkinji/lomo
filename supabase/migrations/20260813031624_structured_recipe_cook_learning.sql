-- Private, exact-version evidence from one completed Cook attempt. This is
-- intentionally separate from later public Recipe ratings and contributions.

alter table public.kwilt_recipe_cook_records
  add column outcome_rating smallint
  check (outcome_rating is null or outcome_rating between 1 and 5);

create table public.kwilt_recipe_cook_substitutions (
  id uuid primary key default gen_random_uuid(),
  cook_record_id uuid not null references public.kwilt_recipe_cook_records(id) on delete cascade,
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  source_ingredient_line_id uuid not null references public.kwilt_recipe_ingredients(id) on delete restrict,
  ingredient_text text not null check (char_length(btrim(ingredient_text)) between 1 and 1000),
  used_instead text not null check (char_length(btrim(used_instead)) between 1 and 500),
  result_rating smallint check (result_rating is null or result_rating between 1 and 5),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cook_record_id, source_ingredient_line_id)
);

create index kwilt_recipe_cook_records_owner_recipe_completed_idx
  on public.kwilt_recipe_cook_records(owner_person_id, recipe_id, completed_at desc);
create index kwilt_recipe_cook_substitutions_owner_recipe_idx
  on public.kwilt_recipe_cook_substitutions(owner_person_id, recipe_id, created_at desc);

alter table public.kwilt_recipe_cook_substitutions enable row level security;

create policy kwilt_recipe_cook_substitutions_owner_read
  on public.kwilt_recipe_cook_substitutions
  for select
  to authenticated
  using (owner_person_id = public.kwilt_current_person_id());

grant select on public.kwilt_recipe_cook_substitutions to authenticated;
revoke insert, update, delete on public.kwilt_recipe_cook_substitutions
  from public, anon, authenticated;

create or replace function public.save_kwilt_recipe_cook_journal(
  p_session_id uuid,
  p_would_make_again boolean,
  p_outcome_rating integer,
  p_private_note text,
  p_recipe_edit_proposal jsonb,
  p_substitutions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid := public.kwilt_current_person_id();
  v_session public.kwilt_recipe_cook_sessions;
  v_record public.kwilt_recipe_cook_records;
  v_substitutions jsonb := coalesce(p_substitutions, '[]'::jsonb);
  v_substitution_count integer := 0;
  v_cook_count integer := 0;
begin
  perform public.kwilt_require_permanent_user();

  select * into v_session
  from public.kwilt_recipe_cook_sessions
  where id = p_session_id
  for update;

  if v_session.id is null or v_session.owner_person_id <> v_person then
    raise exception 'cook_session_not_owned';
  end if;
  if v_session.status <> 'completed' or v_session.completed_at is null then
    raise exception 'cook_session_not_completed';
  end if;
  if p_outcome_rating is not null and p_outcome_rating not between 1 and 5 then
    raise exception 'invalid_cook_learning';
  end if;
  if char_length(coalesce(p_private_note, '')) > 4000
    or (p_recipe_edit_proposal is not null and jsonb_typeof(p_recipe_edit_proposal) <> 'object')
    or jsonb_typeof(v_substitutions) <> 'array'
  then
    raise exception 'invalid_cook_learning';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_substitutions) as items(item)
    where jsonb_typeof(item) <> 'object'
      or coalesce(item->>'ingredientLineId', '') !~ '^[0-9a-fA-F-]{36}$'
      or char_length(btrim(coalesce(item->>'usedInstead', ''))) not between 1 and 500
      or char_length(btrim(coalesce(item->>'note', ''))) > 1000
      or (
        item->'resultRating' is not null
        and jsonb_typeof(item->'resultRating') <> 'null'
        and coalesce(item->>'resultRating', '') !~ '^[1-5]$'
      )
  ) then
    raise exception 'invalid_cook_learning';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(v_substitutions)
  ) <> (
    select count(distinct item->>'ingredientLineId')
    from jsonb_array_elements(v_substitutions) as items(item)
  ) then
    raise exception 'invalid_cook_learning';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_substitutions) as items(item)
    where not exists (
      select 1
      from public.kwilt_recipe_ingredients ingredient
      where ingredient.id = (item->>'ingredientLineId')::uuid
        and ingredient.recipe_version_id = v_session.recipe_version_id
    )
  ) then
    raise exception 'invalid_cook_learning';
  end if;

  insert into public.kwilt_recipe_cook_records(
    session_id,
    owner_person_id,
    recipe_id,
    recipe_version_id,
    serving_scale,
    completed,
    would_make_again,
    outcome_rating,
    private_note,
    recipe_edit_proposal,
    completed_at
  ) values (
    v_session.id,
    v_person,
    v_session.recipe_id,
    v_session.recipe_version_id,
    v_session.serving_scale,
    true,
    p_would_make_again,
    p_outcome_rating,
    nullif(btrim(p_private_note), ''),
    p_recipe_edit_proposal,
    v_session.completed_at
  )
  on conflict(session_id) do update set
    would_make_again = excluded.would_make_again,
    outcome_rating = excluded.outcome_rating,
    private_note = excluded.private_note,
    recipe_edit_proposal = excluded.recipe_edit_proposal
  returning * into v_record;

  delete from public.kwilt_recipe_cook_substitutions
  where cook_record_id = v_record.id;

  insert into public.kwilt_recipe_cook_substitutions(
    cook_record_id,
    owner_person_id,
    recipe_id,
    recipe_version_id,
    source_ingredient_line_id,
    ingredient_text,
    used_instead,
    result_rating,
    note
  )
  select
    v_record.id,
    v_person,
    v_session.recipe_id,
    v_session.recipe_version_id,
    ingredient.id,
    ingredient.original_text,
    btrim(item->>'usedInstead'),
    case
      when item->'resultRating' is null or jsonb_typeof(item->'resultRating') = 'null' then null
      else (item->>'resultRating')::smallint
    end,
    nullif(btrim(item->>'note'), '')
  from jsonb_array_elements(v_substitutions) as items(item)
  join public.kwilt_recipe_ingredients ingredient
    on ingredient.id = (item->>'ingredientLineId')::uuid
   and ingredient.recipe_version_id = v_session.recipe_version_id;

  get diagnostics v_substitution_count = row_count;

  select count(*) into v_cook_count
  from public.kwilt_recipe_cook_records record
  where record.owner_person_id = v_person
    and record.recipe_id = v_session.recipe_id
    and record.completed;

  return jsonb_build_object(
    'recordId', v_record.id,
    'sessionId', v_session.id,
    'recipeVersionId', v_session.recipe_version_id,
    'cookCount', v_cook_count,
    'substitutionCount', v_substitution_count
  );
end;
$$;

revoke all on function public.save_kwilt_recipe_cook_journal(uuid, boolean, integer, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_kwilt_recipe_cook_journal(uuid, boolean, integer, text, jsonb, jsonb)
  to authenticated;

-- A catalog Recipe's owner is its publisher, not the person cooking it. Derive
-- Cook ownership from auth and protect existing session IDs from cross-owner
-- updates instead of trusting ownerPersonId in the client envelope.
create or replace function public.sync_kwilt_recipe_cook_session(p_session jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_person uuid := public.kwilt_current_person_id();
  v_existing public.kwilt_recipe_cook_sessions;
  v_id uuid := (p_session->>'id')::uuid;
  v_recipe_id uuid := (p_session->>'recipeId')::uuid;
  v_recipe_version_id uuid := (p_session->>'recipeVersionId')::uuid;
begin
  perform public.kwilt_require_permanent_user();
  if v_person is null or p_expected_revision < 0 or jsonb_typeof(p_session) <> 'object' then
    raise exception 'invalid_cook_session';
  end if;
  if not public.kwilt_can_use_recipe_version(v_recipe_id, v_recipe_version_id) then
    raise exception 'cook_session_not_owned';
  end if;
  select * into v_existing
  from public.kwilt_recipe_cook_sessions
  where id = v_id
  for update;
  if v_existing.id is not null and (
    v_existing.owner_person_id <> v_person
    or v_existing.recipe_id <> v_recipe_id
    or v_existing.recipe_version_id <> v_recipe_version_id
  ) then
    raise exception 'cook_session_not_owned';
  end if;
  if v_existing.id is not null and v_existing.revision <> p_expected_revision then
    raise exception 'stale_cook_session_revision';
  end if;
  if v_existing.id is null and p_expected_revision <> 0 then
    raise exception 'stale_cook_session_revision';
  end if;
  insert into public.kwilt_recipe_cook_sessions(
    id,owner_person_id,recipe_id,recipe_version_id,recipe_version,serving_scale,status,
    current_cue_index,cue_count,revision,timers,last_device,started_at,paused_at,completed_at,updated_at
  ) values (
    v_id,v_person,v_recipe_id,v_recipe_version_id,(p_session->>'recipeVersion')::integer,
    (p_session->>'servingScale')::numeric,p_session->>'status',(p_session->>'currentCueIndex')::integer,
    (p_session->>'cueCount')::integer,(p_session->>'revision')::integer,
    coalesce(p_session->'timers','[]'::jsonb),p_session->'lastDevice',(p_session->>'startedAt')::timestamptz,
    nullif(p_session->>'pausedAt','')::timestamptz,nullif(p_session->>'completedAt','')::timestamptz,
    (p_session->>'updatedAt')::timestamptz
  )
  on conflict(id) do update set
    status=excluded.status,current_cue_index=excluded.current_cue_index,revision=excluded.revision,
    timers=excluded.timers,last_device=excluded.last_device,paused_at=excluded.paused_at,
    completed_at=excluded.completed_at,updated_at=excluded.updated_at;
  return jsonb_build_object('sessionId',v_id,'revision',(p_session->>'revision')::integer,'status',p_session->>'status');
end;
$$;

revoke all on function public.sync_kwilt_recipe_cook_session(jsonb, integer) from public, anon;
grant execute on function public.sync_kwilt_recipe_cook_session(jsonb, integer) to authenticated;

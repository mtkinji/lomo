-- Preserve stable bundled roster IDs in the app while storing Cook evidence
-- against canonical UUID Recipe, RecipeVersion, and ingredient rows.

create or replace function public.kwilt_resolve_recipe_ref(p_recipe_ref text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_recipe_id uuid;
  v_roster_id text;
begin
  begin
    v_recipe_id := p_recipe_ref::uuid;
  exception when invalid_text_representation then
    if p_recipe_ref !~ '^kwilt-recipe-[a-z]{2}[0-9]{3}$' then
      raise exception 'recipe_not_available';
    end if;
    v_roster_id := upper(substring(p_recipe_ref from '^kwilt-recipe-(.*)$'));
    select publication.recipe_id into v_recipe_id
    from public.kwilt_recipe_publications publication
    join public.kwilt_recipes recipe on recipe.id = publication.recipe_id
    where publication.roster_id = v_roster_id
      and publication.state = 'published'
      and 'kwilt_mobile' = any(publication.distribution_scopes)
      and recipe.lifecycle = 'active';
  end;
  if v_recipe_id is null then raise exception 'recipe_not_available'; end if;
  return v_recipe_id;
end;
$$;

create or replace function public.kwilt_resolve_recipe_ingredient_ref(
  p_recipe_version_id uuid,
  p_ingredient_ref text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ingredient_id uuid;
  v_position integer;
begin
  begin
    v_ingredient_id := p_ingredient_ref::uuid;
    select ingredient.id into v_ingredient_id
    from public.kwilt_recipe_ingredients ingredient
    where ingredient.id = v_ingredient_id
      and ingredient.recipe_version_id = p_recipe_version_id;
  exception when invalid_text_representation then
    if p_ingredient_ref !~ '-ingredient-[0-9]+$' then
      raise exception 'invalid_cook_learning';
    end if;
    v_position := substring(p_ingredient_ref from '-ingredient-([0-9]+)$')::integer - 1;
    select ingredient.id into v_ingredient_id
    from public.kwilt_recipe_ingredients ingredient
    where ingredient.recipe_version_id = p_recipe_version_id
      and ingredient.position = v_position;
  end;
  if v_ingredient_id is null then raise exception 'invalid_cook_learning'; end if;
  return v_ingredient_id;
end;
$$;

revoke all on function public.kwilt_resolve_recipe_ref(text) from public, anon, authenticated;
revoke all on function public.kwilt_resolve_recipe_ingredient_ref(uuid, text) from public, anon, authenticated;

create or replace function public.sync_kwilt_recipe_cook_session(p_session jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_person uuid := public.kwilt_current_person_id();
  v_existing public.kwilt_recipe_cook_sessions;
  v_id uuid := (p_session->>'id')::uuid;
  v_recipe_ref text := p_session->>'recipeId';
  v_version_ref text := p_session->>'recipeVersionId';
  v_recipe_id uuid;
  v_recipe_version_id uuid;
begin
  perform public.kwilt_require_permanent_user();
  if v_person is null or p_expected_revision < 0 or jsonb_typeof(p_session) <> 'object' then
    raise exception 'invalid_cook_session';
  end if;
  v_recipe_id := public.kwilt_resolve_recipe_ref(v_recipe_ref);
  begin
    v_recipe_version_id := v_version_ref::uuid;
  exception when invalid_text_representation then
    if v_recipe_ref !~ '^kwilt-recipe-[a-z]{2}[0-9]{3}$' then
      raise exception 'cook_session_not_owned';
    end if;
    select publication.published_recipe_version_id into v_recipe_version_id
    from public.kwilt_recipe_publications publication
    where publication.recipe_id = v_recipe_id
      and publication.state = 'published'
      and 'kwilt_mobile' = any(publication.distribution_scopes);
  end;
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
  return jsonb_build_object(
    'sessionId',v_id,'recipeId',v_recipe_id,'recipeVersionId',v_recipe_version_id,
    'revision',(p_session->>'revision')::integer,'status',p_session->>'status'
  );
end;
$$;

revoke all on function public.sync_kwilt_recipe_cook_session(jsonb, integer) from public, anon;
grant execute on function public.sync_kwilt_recipe_cook_session(jsonb, integer) to authenticated;

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
  v_item jsonb;
  v_ingredient_id uuid;
  v_substitution_count integer := 0;
  v_cook_count integer := 0;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_session from public.kwilt_recipe_cook_sessions where id = p_session_id for update;
  if v_session.id is null or v_session.owner_person_id <> v_person then raise exception 'cook_session_not_owned'; end if;
  if v_session.status <> 'completed' or v_session.completed_at is null then raise exception 'cook_session_not_completed'; end if;
  if p_outcome_rating is not null and p_outcome_rating not between 1 and 5 then raise exception 'invalid_cook_learning'; end if;
  if char_length(coalesce(p_private_note, '')) > 4000
    or (p_recipe_edit_proposal is not null and jsonb_typeof(p_recipe_edit_proposal) <> 'object')
    or jsonb_typeof(v_substitutions) <> 'array'
  then raise exception 'invalid_cook_learning'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_substitutions) as items(item)
    where jsonb_typeof(item) <> 'object'
      or char_length(btrim(coalesce(item->>'ingredientLineId', ''))) not between 1 and 300
      or char_length(btrim(coalesce(item->>'usedInstead', ''))) not between 1 and 500
      or char_length(btrim(coalesce(item->>'note', ''))) > 1000
      or (item->'resultRating' is not null and jsonb_typeof(item->'resultRating') <> 'null' and coalesce(item->>'resultRating', '') !~ '^[1-5]$')
  ) then raise exception 'invalid_cook_learning'; end if;
  if (select count(*) from jsonb_array_elements(v_substitutions)) <>
     (select count(distinct item->>'ingredientLineId') from jsonb_array_elements(v_substitutions) as items(item))
  then raise exception 'invalid_cook_learning'; end if;

  insert into public.kwilt_recipe_cook_records(
    session_id,owner_person_id,recipe_id,recipe_version_id,serving_scale,completed,
    would_make_again,outcome_rating,private_note,recipe_edit_proposal,completed_at
  ) values (
    v_session.id,v_person,v_session.recipe_id,v_session.recipe_version_id,v_session.serving_scale,true,
    p_would_make_again,p_outcome_rating,nullif(btrim(p_private_note),''),p_recipe_edit_proposal,v_session.completed_at
  )
  on conflict(session_id) do update set
    would_make_again=excluded.would_make_again,outcome_rating=excluded.outcome_rating,
    private_note=excluded.private_note,recipe_edit_proposal=excluded.recipe_edit_proposal
  returning * into v_record;

  delete from public.kwilt_recipe_cook_substitutions where cook_record_id = v_record.id;
  for v_item in select value from jsonb_array_elements(v_substitutions) loop
    v_ingredient_id := public.kwilt_resolve_recipe_ingredient_ref(
      v_session.recipe_version_id,
      v_item->>'ingredientLineId'
    );
    insert into public.kwilt_recipe_cook_substitutions(
      cook_record_id,owner_person_id,recipe_id,recipe_version_id,source_ingredient_line_id,
      ingredient_text,used_instead,result_rating,note
    )
    select
      v_record.id,v_person,v_session.recipe_id,v_session.recipe_version_id,ingredient.id,
      ingredient.original_text,btrim(v_item->>'usedInstead'),
      case when v_item->'resultRating' is null or jsonb_typeof(v_item->'resultRating')='null'
        then null else (v_item->>'resultRating')::smallint end,
      nullif(btrim(v_item->>'note'),'')
    from public.kwilt_recipe_ingredients ingredient where ingredient.id = v_ingredient_id;
    v_substitution_count := v_substitution_count + 1;
  end loop;
  select count(*) into v_cook_count from public.kwilt_recipe_cook_records record
  where record.owner_person_id=v_person and record.recipe_id=v_session.recipe_id and record.completed;
  return jsonb_build_object(
    'recordId',v_record.id,'sessionId',v_session.id,'recipeVersionId',v_session.recipe_version_id,
    'cookCount',v_cook_count,'substitutionCount',v_substitution_count
  );
end;
$$;

revoke all on function public.save_kwilt_recipe_cook_journal(uuid, boolean, integer, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_kwilt_recipe_cook_journal(uuid, boolean, integer, text, jsonb, jsonb) to authenticated;

create or replace function public.list_kwilt_recipe_cook_journal(p_recipe_ref text, p_limit integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_person uuid := public.kwilt_current_person_id();
  v_recipe_id uuid;
  v_count integer;
  v_records jsonb;
begin
  perform public.kwilt_require_permanent_user();
  if v_person is null or p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid_cook_journal_request'; end if;
  v_recipe_id := public.kwilt_resolve_recipe_ref(p_recipe_ref);
  select count(*) into v_count from public.kwilt_recipe_cook_records record
  where record.owner_person_id=v_person and record.recipe_id=v_recipe_id and record.completed;
  select coalesce(jsonb_agg(entry order by completed_at desc),'[]'::jsonb) into v_records
  from (
    select record.completed_at, jsonb_build_object(
      'id',record.id,'sessionId',record.session_id,'recipeId',record.recipe_id,
      'recipeVersionId',record.recipe_version_id,'servingScale',record.serving_scale,
      'wouldMakeAgain',record.would_make_again,'outcomeRating',record.outcome_rating,
      'privateNote',record.private_note,'completedAt',record.completed_at,
      'substitutions',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',substitution.id,'ingredientLineId',substitution.source_ingredient_line_id,
          'ingredientText',substitution.ingredient_text,'usedInstead',substitution.used_instead,
          'resultRating',substitution.result_rating,'note',substitution.note
        ) order by substitution.created_at)
        from public.kwilt_recipe_cook_substitutions substitution
        where substitution.cook_record_id=record.id and substitution.owner_person_id=v_person
      ),'[]'::jsonb)
    ) as entry
    from public.kwilt_recipe_cook_records record
    where record.owner_person_id=v_person and record.recipe_id=v_recipe_id and record.completed
    order by record.completed_at desc
    limit p_limit
  ) bounded;
  return jsonb_build_object('cookCount',v_count,'records',v_records);
end;
$$;

revoke all on function public.list_kwilt_recipe_cook_journal(text, integer) from public, anon;
grant execute on function public.list_kwilt_recipe_cook_journal(text, integer) to authenticated;

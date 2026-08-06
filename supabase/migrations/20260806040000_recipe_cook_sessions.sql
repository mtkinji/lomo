-- Owner-only, exact-version cooking progress. Generated cue prose is never authority.

create table public.kwilt_recipe_cook_sessions (
  id uuid primary key,
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  recipe_version integer not null check (recipe_version > 0),
  serving_scale numeric not null check (serving_scale > 0),
  status text not null check (status in ('active','paused','completed','abandoned')),
  current_cue_index integer not null check (current_cue_index >= 0),
  cue_count integer not null check (cue_count > 0 and current_cue_index < cue_count),
  revision integer not null check (revision > 0),
  timers jsonb not null default '[]'::jsonb check (jsonb_typeof(timers)='array'),
  last_device jsonb not null check (jsonb_typeof(last_device)='object'),
  started_at timestamptz not null,
  paused_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status in ('completed','abandoned')) = (completed_at is not null))
);
create unique index kwilt_recipe_cook_one_active_idx on public.kwilt_recipe_cook_sessions(owner_person_id,recipe_id) where status in ('active','paused');

create table public.kwilt_recipe_cook_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.kwilt_recipe_cook_sessions(id) on delete restrict,
  owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  recipe_id uuid not null references public.kwilt_recipes(id) on delete restrict,
  recipe_version_id uuid not null references public.kwilt_recipe_versions(id) on delete restrict,
  serving_scale numeric not null check (serving_scale > 0),
  completed boolean not null,
  would_make_again boolean,
  private_note text check (private_note is null or char_length(private_note)<=4000),
  recipe_edit_proposal jsonb check (recipe_edit_proposal is null or jsonb_typeof(recipe_edit_proposal)='object'),
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.kwilt_recipe_cook_sessions enable row level security;
alter table public.kwilt_recipe_cook_records enable row level security;
create policy kwilt_recipe_cook_sessions_owner_read on public.kwilt_recipe_cook_sessions for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_recipe_cook_records_owner_read on public.kwilt_recipe_cook_records for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
grant select on public.kwilt_recipe_cook_sessions,public.kwilt_recipe_cook_records to authenticated;
revoke insert,update,delete on public.kwilt_recipe_cook_sessions,public.kwilt_recipe_cook_records from public,anon,authenticated;

create or replace function public.sync_kwilt_recipe_cook_session(p_session jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_existing public.kwilt_recipe_cook_sessions; v_id uuid:=(p_session->>'id')::uuid;
begin
  perform public.kwilt_require_permanent_user();
  if v_person is null or p_expected_revision<0 or jsonb_typeof(p_session)<>'object' then raise exception 'invalid_cook_session'; end if;
  if (p_session->>'ownerPersonId')::uuid<>v_person or not public.kwilt_can_read_recipe((p_session->>'recipeId')::uuid) then raise exception 'cook_session_not_owned'; end if;
  select * into v_existing from public.kwilt_recipe_cook_sessions where id=v_id for update;
  if v_existing.id is not null and v_existing.revision<>p_expected_revision then raise exception 'stale_cook_session_revision'; end if;
  if v_existing.id is null and p_expected_revision<>0 then raise exception 'stale_cook_session_revision'; end if;
  insert into public.kwilt_recipe_cook_sessions(id,owner_person_id,recipe_id,recipe_version_id,recipe_version,serving_scale,status,current_cue_index,cue_count,revision,timers,last_device,started_at,paused_at,completed_at,updated_at)
  values(v_id,v_person,(p_session->>'recipeId')::uuid,(p_session->>'recipeVersionId')::uuid,(p_session->>'recipeVersion')::integer,(p_session->>'servingScale')::numeric,p_session->>'status',(p_session->>'currentCueIndex')::integer,(p_session->>'cueCount')::integer,(p_session->>'revision')::integer,coalesce(p_session->'timers','[]'::jsonb),p_session->'lastDevice',(p_session->>'startedAt')::timestamptz,nullif(p_session->>'pausedAt','')::timestamptz,nullif(p_session->>'completedAt','')::timestamptz,(p_session->>'updatedAt')::timestamptz)
  on conflict(id) do update set status=excluded.status,current_cue_index=excluded.current_cue_index,revision=excluded.revision,timers=excluded.timers,last_device=excluded.last_device,paused_at=excluded.paused_at,completed_at=excluded.completed_at,updated_at=excluded.updated_at;
  return jsonb_build_object('sessionId',v_id,'revision',(p_session->>'revision')::integer,'status',p_session->>'status');
end;
$$;
revoke execute on function public.sync_kwilt_recipe_cook_session(jsonb,integer) from public,anon;
grant execute on function public.sync_kwilt_recipe_cook_session(jsonb,integer) to authenticated;

create or replace function public.save_kwilt_recipe_cook_learning(p_session_id uuid,p_would_make_again boolean,p_private_note text,p_recipe_edit_proposal jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_person uuid:=public.kwilt_current_person_id(); v_session public.kwilt_recipe_cook_sessions; v_record public.kwilt_recipe_cook_records;
begin
  perform public.kwilt_require_permanent_user(); select * into v_session from public.kwilt_recipe_cook_sessions where id=p_session_id for update;
  if v_session.id is null or v_session.owner_person_id<>v_person then raise exception 'cook_session_not_owned'; end if;
  if v_session.status<>'completed' or v_session.completed_at is null then raise exception 'cook_session_not_completed'; end if;
  if char_length(coalesce(p_private_note,''))>4000 or (p_recipe_edit_proposal is not null and jsonb_typeof(p_recipe_edit_proposal)<>'object') then raise exception 'invalid_cook_learning'; end if;
  insert into public.kwilt_recipe_cook_records(session_id,owner_person_id,recipe_id,recipe_version_id,serving_scale,completed,would_make_again,private_note,recipe_edit_proposal,completed_at)
  values(v_session.id,v_person,v_session.recipe_id,v_session.recipe_version_id,v_session.serving_scale,true,p_would_make_again,nullif(btrim(p_private_note),''),p_recipe_edit_proposal,v_session.completed_at)
  on conflict(session_id) do update set would_make_again=excluded.would_make_again,private_note=excluded.private_note,recipe_edit_proposal=excluded.recipe_edit_proposal returning * into v_record;
  return jsonb_build_object('recordId',v_record.id,'sessionId',v_session.id,'recipeVersionId',v_session.recipe_version_id);
end;
$$;
revoke execute on function public.save_kwilt_recipe_cook_learning(uuid,boolean,text,jsonb) from public,anon;
grant execute on function public.save_kwilt_recipe_cook_learning(uuid,boolean,text,jsonb) to authenticated;

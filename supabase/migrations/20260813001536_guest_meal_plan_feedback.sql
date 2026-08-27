-- Purpose-limited guest participation for a Meal Plan. Possession of the
-- expiring bearer link grants only the preview and response capabilities below;
-- it never grants Household membership or direct table access.

create extension if not exists pgcrypto with schema extensions;

create table public.kwilt_guest_meal_feedback_invites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  round_id uuid not null references public.kwilt_meal_choice_rounds(id) on delete cascade,
  token_hash bytea not null unique,
  state text not null default 'active' check (state in ('active','revoked')),
  created_by_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.kwilt_guest_meal_feedback_responses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.kwilt_guest_meal_feedback_invites(id) on delete cascade,
  guest_key uuid not null,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  selected_candidate_ids uuid[] not null default '{}',
  passed boolean not null default false,
  suggestion text check (suggestion is null or char_length(suggestion) between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(invite_id, guest_key),
  check (cardinality(selected_candidate_ids) <= 3),
  check (not passed or cardinality(selected_candidate_ids) = 0)
);

create index kwilt_guest_meal_feedback_invites_plan_idx
  on public.kwilt_guest_meal_feedback_invites(plan_id, created_at desc);
create index kwilt_guest_meal_feedback_responses_invite_idx
  on public.kwilt_guest_meal_feedback_responses(invite_id, updated_at desc);

alter table public.kwilt_guest_meal_feedback_invites enable row level security;
alter table public.kwilt_guest_meal_feedback_responses enable row level security;
revoke all on table public.kwilt_guest_meal_feedback_invites from anon, authenticated;
revoke all on table public.kwilt_guest_meal_feedback_responses from anon, authenticated;

create or replace function public.create_kwilt_guest_meal_feedback_invite(
  p_plan_id uuid,
  p_expected_version integer,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.kwilt_meal_plans;
  v_actor public.kwilt_household_memberships;
  v_round public.kwilt_meal_choice_rounds;
  v_invite public.kwilt_guest_meal_feedback_invites;
  v_token text;
  v_expires_at timestamptz := least(coalesce(p_expires_at, now() + interval '7 days'), now() + interval '30 days');
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id for update;
  if v_plan.id is not null then
    select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  end if;
  if v_plan.id is null or v_actor.id is null or v_actor.role not in ('owner','caregiver') then
    raise exception 'meal_plan_organizer_required';
  end if;
  if v_plan.version <> p_expected_version then raise exception 'stale_meal_plan_version'; end if;
  if v_plan.state not in ('draft','collecting_choices','ready_to_finalize') then
    raise exception 'meal_plan_not_shareable';
  end if;
  if v_expires_at <= now() then raise exception 'invalid_guest_feedback_expiry'; end if;
  if not exists(select 1 from public.kwilt_meal_plan_candidates where plan_id = p_plan_id) then
    raise exception 'meal_plan_has_no_candidates';
  end if;

  insert into public.kwilt_meal_choice_rounds(plan_id, closes_at)
    values(p_plan_id, v_expires_at) returning * into v_round;
  insert into public.kwilt_meal_choice_candidates(round_id,candidate_id,position,kind,title,participant_snapshot)
    select v_round.id,c.id,c.position,c.kind,c.title,
      jsonb_build_object(
        'imageUrl', nullif(coalesce(
          c.recipe_snapshot #>> '{media,url}',
          c.recipe_snapshot #>> '{image,url}',
          c.recipe_snapshot ->> 'imageUrl'
        ), '')
      )
    from public.kwilt_meal_plan_candidates c
    where c.plan_id = p_plan_id
    order by c.position;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '/+=', '_-.');
  insert into public.kwilt_guest_meal_feedback_invites(
    plan_id,round_id,token_hash,created_by_person_id,expires_at
  ) values (
    p_plan_id,v_round.id,
    extensions.digest(convert_to(v_token, 'utf8'), 'sha256'),
    v_plan.organizer_person_id,v_expires_at
  ) returning * into v_invite;

  return jsonb_build_object(
    'inviteId',v_invite.id,
    'token',v_token,
    'expiresAt',v_invite.expires_at,
    'planVersion',v_plan.version
  );
end;
$$;

create or replace function public.preview_kwilt_guest_meal_feedback_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.kwilt_guest_meal_feedback_invites;
  v_round public.kwilt_meal_choice_rounds;
  v_inviter text;
begin
  if char_length(p_token) not between 32 and 128 then return null; end if;
  select * into v_invite
  from public.kwilt_guest_meal_feedback_invites
  where token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256');
  if v_invite.id is null then return null; end if;
  select * into v_round from public.kwilt_meal_choice_rounds where id = v_invite.round_id;
  if v_invite.state = 'revoked' then return jsonb_build_object('state','revoked'); end if;
  if v_invite.expires_at <= now() then return jsonb_build_object('state','expired'); end if;
  if v_round.state <> 'open' then return jsonb_build_object('state','closed'); end if;

  select split_part(btrim(display_name), ' ', 1) into v_inviter
  from public.kwilt_people where id = v_invite.created_by_person_id;
  return jsonb_build_object(
    'state','active',
    'inviterLabel',coalesce(nullif(v_inviter,''),'Someone'),
    'expiresAt',v_invite.expires_at,
    'selectionLimit',v_round.selection_limit,
    'suggestionLimit',v_round.suggestion_limit,
    'candidates',coalesce((
      select jsonb_agg(
        jsonb_build_object('id',c.candidate_id,'title',c.title,'imageUrl',c.participant_snapshot->>'imageUrl')
        order by c.position
      ) from public.kwilt_meal_choice_candidates c where c.round_id = v_round.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_kwilt_guest_meal_feedback(
  p_token text,
  p_guest_key uuid,
  p_display_name text,
  p_selected_candidate_ids uuid[],
  p_pass boolean,
  p_suggestion text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.kwilt_guest_meal_feedback_invites;
  v_round public.kwilt_meal_choice_rounds;
  v_name text := nullif(btrim(coalesce(p_display_name,'')), '');
  v_suggestion text := nullif(btrim(coalesce(p_suggestion,'')), '');
  v_selected uuid[] := coalesce(p_selected_candidate_ids, '{}'::uuid[]);
  v_updated_at timestamptz := now();
begin
  if char_length(p_token) not between 32 and 128 then raise exception 'guest_feedback_unavailable'; end if;
  select * into v_invite
  from public.kwilt_guest_meal_feedback_invites
  where token_hash = extensions.digest(convert_to(p_token, 'utf8'), 'sha256')
  for update;
  if v_invite.id is null or v_invite.state <> 'active' or v_invite.expires_at <= now() then
    raise exception 'guest_feedback_unavailable';
  end if;
  select * into v_round from public.kwilt_meal_choice_rounds where id = v_invite.round_id;
  if v_round.state <> 'open' then raise exception 'guest_feedback_unavailable'; end if;
  if char_length(btrim(coalesce(p_display_name,''))) > 80 then raise exception 'invalid_guest_display_name'; end if;
  if char_length(btrim(coalesce(p_suggestion,''))) > v_round.suggestion_limit then raise exception 'invalid_guest_suggestion'; end if;
  if cardinality(p_selected_candidate_ids) > v_round.selection_limit then raise exception 'too_many_guest_selections'; end if;
  if coalesce(p_pass,false) and cardinality(v_selected) > 0 then raise exception 'invalid_guest_pass'; end if;
  if not coalesce(p_pass,false) and cardinality(v_selected) = 0 and v_suggestion is null then raise exception 'empty_guest_feedback'; end if;
  if exists(
    select 1 from unnest(v_selected) selected(id)
    where not exists(
      select 1 from public.kwilt_meal_choice_candidates c
      where c.round_id = v_round.id and c.candidate_id = selected.id
    )
  ) then raise exception 'invalid_guest_selection'; end if;
  if (select count(*) from public.kwilt_guest_meal_feedback_responses where invite_id = v_invite.id) >= 100
    and not exists(select 1 from public.kwilt_guest_meal_feedback_responses where invite_id = v_invite.id and guest_key = p_guest_key)
  then raise exception 'guest_feedback_capacity_reached'; end if;

  insert into public.kwilt_guest_meal_feedback_responses(
    invite_id,guest_key,display_name,selected_candidate_ids,passed,suggestion,updated_at
  ) values (
    v_invite.id,p_guest_key,v_name,v_selected,coalesce(p_pass,false),v_suggestion,v_updated_at
  )
  on conflict(invite_id,guest_key) do update set
    display_name=excluded.display_name,
    selected_candidate_ids=excluded.selected_candidate_ids,
    passed=excluded.passed,
    suggestion=excluded.suggestion,
    updated_at=excluded.updated_at;
  return jsonb_build_object('ok',true,'updatedAt',v_updated_at);
end;
$$;

create or replace function public.revoke_kwilt_guest_meal_feedback_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_invite public.kwilt_guest_meal_feedback_invites; v_plan public.kwilt_meal_plans; v_actor public.kwilt_household_memberships;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_invite from public.kwilt_guest_meal_feedback_invites where id = p_invite_id for update;
  if v_invite.id is not null then
    select * into v_plan from public.kwilt_meal_plans where id = v_invite.plan_id;
    select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  end if;
  if v_invite.id is null or v_actor.id is null or v_actor.role not in ('owner','caregiver') then
    raise exception 'meal_plan_organizer_required';
  end if;
  update public.kwilt_guest_meal_feedback_invites
    set state='revoked', revoked_at=now()
    where id=p_invite_id;
  update public.kwilt_meal_choice_rounds
    set state='cancelled', version=version+1, closed_at=now()
    where id=v_invite.round_id and state='open';
  return jsonb_build_object('inviteId',p_invite_id,'state','revoked');
end;
$$;

create or replace function public.get_kwilt_guest_meal_feedback_summary(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_plan public.kwilt_meal_plans; v_actor public.kwilt_household_memberships;
begin
  perform public.kwilt_require_permanent_user();
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id;
  if v_plan.id is not null then
    select * into v_actor from public.kwilt_shared_meal_cart_membership(v_plan.household_id);
  end if;
  if v_actor.id is null or v_actor.role not in ('owner','caregiver') then raise exception 'meal_plan_organizer_required'; end if;
  return jsonb_build_object(
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title) order by c.position)
      from public.kwilt_meal_plan_candidates c where c.plan_id = p_plan_id
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,
        'state',case when i.state='active' and i.expires_at <= now() then 'expired' else i.state end,
        'expiresAt',i.expires_at,
        'responseCount',(select count(*) from public.kwilt_guest_meal_feedback_responses r where r.invite_id=i.id),
        'responses',coalesce((select jsonb_agg(jsonb_build_object(
          'id',r.id,
          'displayName',r.display_name,
          'selectedCandidateIds',r.selected_candidate_ids,
          'pass',r.passed,
          'suggestion',r.suggestion,
          'updatedAt',r.updated_at
        ) order by r.updated_at desc) from public.kwilt_guest_meal_feedback_responses r where r.invite_id=i.id), '[]'::jsonb)
      ) order by i.created_at desc)
      from public.kwilt_guest_meal_feedback_invites i where i.plan_id = p_plan_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.create_kwilt_guest_meal_feedback_invite(uuid,integer,timestamptz) from public, anon, authenticated;
revoke execute on function public.preview_kwilt_guest_meal_feedback_invite(text) from public, anon, authenticated;
revoke execute on function public.submit_kwilt_guest_meal_feedback(text,uuid,text,uuid[],boolean,text) from public, anon, authenticated;
revoke execute on function public.revoke_kwilt_guest_meal_feedback_invite(uuid) from public, anon, authenticated;
revoke execute on function public.get_kwilt_guest_meal_feedback_summary(uuid) from public, anon, authenticated;
grant execute on function public.create_kwilt_guest_meal_feedback_invite(uuid,integer,timestamptz) to authenticated;
grant execute on function public.preview_kwilt_guest_meal_feedback_invite(text) to anon, authenticated;
grant execute on function public.submit_kwilt_guest_meal_feedback(text,uuid,text,uuid[],boolean,text) to anon, authenticated;
grant execute on function public.revoke_kwilt_guest_meal_feedback_invite(uuid) to authenticated;
grant execute on function public.get_kwilt_guest_meal_feedback_summary(uuid) to authenticated;

-- Household members already share one live Meal Plan. This migration adds a
-- restrained, recipient-owned attention loop without creating an inbox item or
-- a second response authority.

create table public.kwilt_meal_plan_attention_windows (
  plan_id uuid primary key references public.kwilt_meal_plans(id) on delete cascade,
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  window_number integer not null default 1 check (window_number > 0),
  first_change_at timestamptz not null,
  last_change_at timestamptz not null,
  eligible_after timestamptz not null,
  actor_person_ids uuid[] not null default '{}',
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(actor_person_ids) between 1 and 60),
  check (first_change_at <= last_change_at and last_change_at <= eligible_after)
);

create index kwilt_meal_plan_attention_due_idx
  on public.kwilt_meal_plan_attention_windows(eligible_after, updated_at)
  where processed_at is null;

create table public.kwilt_meal_plan_member_attention (
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  person_id uuid not null references public.kwilt_people(id) on delete cascade,
  last_viewed_at timestamptz,
  last_participated_at timestamptz,
  last_notified_window integer check (last_notified_window is null or last_notified_window > 0),
  needs_attention boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(plan_id, person_id)
);

create table public.kwilt_meal_plan_push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.kwilt_meal_plan_attention_push_outbox (
  job_id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.kwilt_meal_plans(id) on delete cascade,
  window_number integer not null check (window_number > 0),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 180),
  attempts integer not null default 0 check (attempts between 0 and 10),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 160),
  created_at timestamptz not null default now(),
  unique(plan_id, window_number, recipient_user_id)
);

create index kwilt_meal_plan_attention_push_due_idx
  on public.kwilt_meal_plan_attention_push_outbox(created_at)
  where sent_at is null;

alter table public.kwilt_meal_plan_attention_windows enable row level security;
alter table public.kwilt_meal_plan_member_attention enable row level security;
alter table public.kwilt_meal_plan_push_preferences enable row level security;
alter table public.kwilt_meal_plan_attention_push_outbox enable row level security;

revoke all on public.kwilt_meal_plan_attention_windows from public, anon, authenticated;
revoke all on public.kwilt_meal_plan_member_attention from public, anon, authenticated;
revoke all on public.kwilt_meal_plan_push_preferences from public, anon, authenticated;
revoke all on public.kwilt_meal_plan_attention_push_outbox from public, anon, authenticated;

create or replace function public.kwilt_upsert_meal_plan_attention_window(
  p_plan_id uuid,
  p_actor_person_id uuid,
  p_changed_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.kwilt_meal_plans;
begin
  if p_actor_person_id is null then return; end if;
  select * into v_plan from public.kwilt_meal_plans where id = p_plan_id;
  if v_plan.id is null or v_plan.household_id is null or v_plan.state <> 'draft' then return; end if;

  insert into public.kwilt_meal_plan_attention_windows(
    plan_id, household_id, first_change_at, last_change_at, eligible_after, actor_person_ids
  ) values (
    v_plan.id, v_plan.household_id, p_changed_at, p_changed_at,
    p_changed_at + interval '30 minutes', array[p_actor_person_id]
  )
  on conflict(plan_id) do update set
    household_id = excluded.household_id,
    window_number = case
      when public.kwilt_meal_plan_attention_windows.processed_at is null
        then public.kwilt_meal_plan_attention_windows.window_number
      else public.kwilt_meal_plan_attention_windows.window_number + 1
    end,
    first_change_at = case
      when public.kwilt_meal_plan_attention_windows.processed_at is null
        then public.kwilt_meal_plan_attention_windows.first_change_at
      else excluded.first_change_at
    end,
    last_change_at = excluded.last_change_at,
    eligible_after = excluded.eligible_after,
    actor_person_ids = case
      when public.kwilt_meal_plan_attention_windows.processed_at is not null
        then excluded.actor_person_ids
      when p_actor_person_id = any(public.kwilt_meal_plan_attention_windows.actor_person_ids)
        then public.kwilt_meal_plan_attention_windows.actor_person_ids
      else array_append(public.kwilt_meal_plan_attention_windows.actor_person_ids, p_actor_person_id)
    end,
    processed_at = null,
    updated_at = p_changed_at;
end;
$$;

create or replace function public.kwilt_schedule_meal_plan_candidate_attention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.kwilt_upsert_meal_plan_attention_window(
    new.plan_id,
    new.suggested_by_person_id,
    coalesce(new.created_at, now())
  );
  return new;
end;
$$;

create trigger kwilt_meal_plan_candidate_attention_after_insert
after insert on public.kwilt_meal_plan_candidates
for each row execute function public.kwilt_schedule_meal_plan_candidate_attention();

create or replace function public.kwilt_schedule_attached_meal_plan_attention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.household_id is null and new.household_id is not null and exists (
    select 1 from public.kwilt_meal_plan_candidates candidate where candidate.plan_id = new.id
  ) then
    perform public.kwilt_upsert_meal_plan_attention_window(new.id, new.organizer_person_id, now());
  end if;
  return new;
end;
$$;

create trigger kwilt_meal_plan_attachment_attention_after_update
after update of household_id on public.kwilt_meal_plans
for each row execute function public.kwilt_schedule_attached_meal_plan_attention();

create or replace function public.kwilt_record_meal_plan_reaction_participation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
begin
  select candidate.plan_id into v_plan_id
  from public.kwilt_meal_plan_candidates candidate
  where candidate.id = new.candidate_id;
  if v_plan_id is not null then
    perform 1
    from public.kwilt_meal_plan_attention_windows attention_window
    where attention_window.plan_id = v_plan_id
    for update;
    insert into public.kwilt_meal_plan_member_attention(plan_id, person_id, last_participated_at, updated_at)
    values(v_plan_id, new.person_id, coalesce(new.created_at, now()), now())
    on conflict(plan_id, person_id) do update set
      last_participated_at = greatest(
        coalesce(public.kwilt_meal_plan_member_attention.last_participated_at, '-infinity'::timestamptz),
        excluded.last_participated_at
      ),
      updated_at = now();
  end if;
  return new;
end;
$$;

create trigger kwilt_meal_plan_reaction_attention_after_insert
after insert on public.kwilt_meal_candidate_reactions
for each row execute function public.kwilt_record_meal_plan_reaction_participation();

create or replace function public.mark_kwilt_meal_plan_viewed(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  perform public.kwilt_require_permanent_user();
  v_person := public.kwilt_current_person_id();
  if v_person is null or not public.kwilt_can_access_shared_meal_cart(p_plan_id) then
    raise exception 'shared_meal_cart_access_required';
  end if;
  perform 1
  from public.kwilt_meal_plan_attention_windows attention_window
  where attention_window.plan_id = p_plan_id
  for update;
  insert into public.kwilt_meal_plan_member_attention(plan_id, person_id, last_viewed_at, updated_at)
  values(p_plan_id, v_person, now(), now())
  on conflict(plan_id, person_id) do update set
    last_viewed_at = now(),
    needs_attention = false,
    updated_at = now();
end;
$$;

create or replace function public.get_kwilt_meal_plan_attention_status()
returns table(needs_attention boolean, plan_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  perform public.kwilt_require_permanent_user();
  v_person := public.kwilt_current_person_id();
  if v_person is null then
    return query select false, null::uuid;
    return;
  end if;

  return query
  select coalesce(member_state.needs_attention, false), plan.id
  from public.kwilt_meal_plans plan
  left join public.kwilt_meal_plan_member_attention member_state
    on member_state.plan_id = plan.id
   and member_state.person_id = v_person
  where plan.state = 'draft'
    and plan.household_id is not null
    and public.kwilt_can_access_shared_meal_cart(plan.id)
  order by plan.updated_at desc
  limit 1;

  if not found then
    return query select false, null::uuid;
  end if;
end;
$$;

create or replace function public.get_kwilt_meal_plan_push_enabled()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
begin
  return coalesce((
    select preference.enabled
    from public.kwilt_meal_plan_push_preferences preference
    where preference.user_id = v_user
  ), true);
end;
$$;

create or replace function public.set_kwilt_meal_plan_push_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.kwilt_require_permanent_user();
begin
  if p_enabled is null then raise exception 'invalid_notification_preference'; end if;
  insert into public.kwilt_meal_plan_push_preferences(user_id, enabled, updated_at)
  values(v_user, p_enabled, now())
  on conflict(user_id) do update set enabled = excluded.enabled, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.process_kwilt_meal_plan_attention(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window public.kwilt_meal_plan_attention_windows;
  v_recipient record;
  v_processed integer := 0;
begin
  update public.kwilt_meal_plan_attention_windows attention_window
  set processed_at = now(), updated_at = now()
  where attention_window.processed_at is null
    and exists (
      select 1
      from public.kwilt_meal_plans plan
      where plan.id = attention_window.plan_id
        and (plan.state <> 'draft' or plan.household_id is distinct from attention_window.household_id)
    );

  for v_window in
    select attention_window.*
    from public.kwilt_meal_plan_attention_windows attention_window
    join public.kwilt_meal_plans plan on plan.id = attention_window.plan_id
    where attention_window.processed_at is null
      and attention_window.eligible_after <= now()
      and plan.state = 'draft'
      and plan.household_id = attention_window.household_id
    order by attention_window.eligible_after, attention_window.updated_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update of attention_window skip locked
  loop
    for v_recipient in
      select distinct on (binding.user_id)
        binding.user_id,
        membership.person_id
      from public.kwilt_household_memberships membership
      join public.kwilt_person_auth_bindings binding
        on binding.person_id = membership.person_id
       and binding.status = 'active'
      left join public.kwilt_meal_plan_member_attention member_state
        on member_state.plan_id = v_window.plan_id
       and member_state.person_id = membership.person_id
      where membership.household_id = v_window.household_id
        and membership.status = 'active'
        and (
          membership.role in ('owner','caregiver')
          or exists (
            select 1
            from public.kwilt_child_capability_activations activation
            where activation.household_id = membership.household_id
              and activation.child_membership_id = membership.id
              and activation.capability_id = 'meal-planning'
              and activation.state = 'active'
          )
        )
        and not membership.person_id = any(v_window.actor_person_ids)
        and coalesce(member_state.last_viewed_at, '-infinity'::timestamptz) < v_window.last_change_at
        and coalesce(member_state.last_participated_at, '-infinity'::timestamptz) < v_window.first_change_at
      order by binding.user_id, membership.joined_at
    loop
      insert into public.kwilt_meal_plan_member_attention(
        plan_id, person_id, last_notified_window, needs_attention, updated_at
      ) values (
        v_window.plan_id, v_recipient.person_id, v_window.window_number, true, now()
      ) on conflict(plan_id, person_id) do update set
        last_notified_window = excluded.last_notified_window,
        needs_attention = true,
        updated_at = excluded.updated_at;

      if coalesce((
        select preference.enabled
        from public.kwilt_meal_plan_push_preferences preference
        where preference.user_id = v_recipient.user_id
      ), true) then
        insert into public.kwilt_meal_plan_attention_push_outbox(
          plan_id, window_number, recipient_user_id, title, body
        ) values (
          v_window.plan_id, v_window.window_number, v_recipient.user_id,
          'Meal Plan', 'There are new meal ideas in Plan.'
        ) on conflict(plan_id, window_number, recipient_user_id) do nothing;
      end if;
    end loop;

    update public.kwilt_meal_plan_attention_windows
    set processed_at = now(), updated_at = now()
    where plan_id = v_window.plan_id and window_number = v_window.window_number;
    v_processed := v_processed + 1;
  end loop;
  return v_processed;
end;
$$;

create or replace function public.claim_kwilt_meal_plan_attention_push_jobs(p_limit integer default 100)
returns table(job_id uuid, plan_id uuid, recipient_user_id uuid, title text, body text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.kwilt_meal_plan_attention_push_outbox outbox
  set sent_at = now(), last_error = 'preference_disabled'
  where outbox.sent_at is null
    and exists (
      select 1 from public.kwilt_meal_plan_push_preferences preference
      where preference.user_id = outbox.recipient_user_id and not preference.enabled
    );

  return query
  with claimable as (
    select outbox.job_id
    from public.kwilt_meal_plan_attention_push_outbox outbox
    where outbox.sent_at is null
      and outbox.attempts < 10
      and (outbox.claimed_at is null or outbox.claimed_at < now() - interval '10 minutes')
    order by outbox.created_at
    limit greatest(1, least(coalesce(p_limit, 100), 200))
    for update skip locked
  ), claimed as (
    update public.kwilt_meal_plan_attention_push_outbox outbox
    set claimed_at = now(), attempts = outbox.attempts + 1
    from claimable
    where outbox.job_id = claimable.job_id
    returning outbox.job_id, outbox.plan_id, outbox.recipient_user_id, outbox.title, outbox.body
  )
  select claimed.job_id, claimed.plan_id, claimed.recipient_user_id, claimed.title, claimed.body from claimed;
end;
$$;

create or replace function public.complete_kwilt_meal_plan_attention_push_job(
  p_job_id uuid,
  p_succeeded boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.kwilt_meal_plan_attention_push_outbox
  set sent_at = case when p_succeeded then now() else null end,
      claimed_at = case when p_succeeded then claimed_at else null end,
      last_error = left(nullif(btrim(coalesce(p_error,'')),''), 160)
  where job_id = p_job_id;
end;
$$;

revoke execute on function public.kwilt_upsert_meal_plan_attention_window(uuid,uuid,timestamptz) from public, anon, authenticated;
revoke execute on function public.kwilt_schedule_meal_plan_candidate_attention() from public, anon, authenticated;
revoke execute on function public.kwilt_schedule_attached_meal_plan_attention() from public, anon, authenticated;
revoke execute on function public.kwilt_record_meal_plan_reaction_participation() from public, anon, authenticated;
revoke execute on function public.mark_kwilt_meal_plan_viewed(uuid) from public, anon;
revoke execute on function public.get_kwilt_meal_plan_attention_status() from public, anon;
revoke execute on function public.get_kwilt_meal_plan_push_enabled() from public, anon;
revoke execute on function public.set_kwilt_meal_plan_push_enabled(boolean) from public, anon;
revoke execute on function public.process_kwilt_meal_plan_attention(integer) from public, anon, authenticated;
revoke execute on function public.claim_kwilt_meal_plan_attention_push_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_kwilt_meal_plan_attention_push_job(uuid,boolean,text) from public, anon, authenticated;

grant execute on function public.mark_kwilt_meal_plan_viewed(uuid) to authenticated;
grant execute on function public.get_kwilt_meal_plan_attention_status() to authenticated;
grant execute on function public.get_kwilt_meal_plan_push_enabled() to authenticated;
grant execute on function public.set_kwilt_meal_plan_push_enabled(boolean) to authenticated;
grant execute on function public.process_kwilt_meal_plan_attention(integer) to service_role;
grant execute on function public.claim_kwilt_meal_plan_attention_push_jobs(integer) to service_role;
grant execute on function public.complete_kwilt_meal_plan_attention_push_job(uuid,boolean,text) to service_role;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('kwilt-meal-plan-attention-every-five-minutes');
exception when others then null;
end
$$;

select cron.schedule(
  'kwilt-meal-plan-attention-every-five-minutes',
  '*/5 * * * *',
  $$
    select net.http_get(
      url := 'https://auth.kwilt.app/functions/v1/meal-plan-attention-process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-kwilt-cron', 'meal-plan-attention'
      ),
      timeout_milliseconds := 120000
    ) as request_id;
  $$
);

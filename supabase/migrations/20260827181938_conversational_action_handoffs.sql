create table public.kwilt_conversational_action_receipts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  operation_id text not null check (char_length(operation_id) between 1 and 200),
  request_id text not null check (char_length(request_id) between 1 and 200),
  source text not null check (source in ('native_ui', 'mobile_chat', 'voice', 'phone', 'mcp', 'scheduled')),
  status text not null check (status in (
    'completed', 'proposed', 'pending_client_action', 'needs_input',
    'unavailable', 'refused', 'failed'
  )),
  target_version integer null check (target_version is null or target_version >= 0),
  provider text null check (provider is null or provider in ('server', 'device', 'channel', 'connector')),
  retryable boolean not null default false,
  reason text null check (reason is null or char_length(reason) <= 500),
  candidate_summary text null check (candidate_summary is null or char_length(candidate_summary) <= 2000),
  result_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(result_refs) = 'array'),
  reversible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, operation_id, request_id)
);

create index kwilt_conversational_action_receipts_household_created_idx
  on public.kwilt_conversational_action_receipts(household_id, created_at, id);

alter table public.kwilt_conversational_action_receipts enable row level security;
revoke all on table public.kwilt_conversational_action_receipts from anon;
grant select, insert, update on table public.kwilt_conversational_action_receipts to authenticated;

create policy "kwilt_conversational_action_receipts_owner_select"
  on public.kwilt_conversational_action_receipts for select to authenticated
  using ((select auth.uid()) = actor_id);

create policy "kwilt_conversational_action_receipts_owner_insert"
  on public.kwilt_conversational_action_receipts for insert to authenticated
  with check (
    (select auth.uid()) = actor_id
    and public.kwilt_is_active_household_member(household_id)
  );

create policy "kwilt_conversational_action_receipts_owner_update"
  on public.kwilt_conversational_action_receipts for update to authenticated
  using ((select auth.uid()) = actor_id)
  with check (
    (select auth.uid()) = actor_id
    and public.kwilt_is_active_household_member(household_id)
  );

create table public.kwilt_conversational_action_handoffs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.kwilt_households(id) on delete cascade,
  operation_id text not null check (char_length(operation_id) between 1 and 200),
  request_id text not null check (char_length(request_id) between 1 and 200),
  target_version integer null check (target_version is null or target_version >= 0),
  state text not null default 'created' check (state in ('created', 'claimed', 'completed', 'cancelled', 'expired')),
  version integer not null default 1 check (version > 0),
  redacted_arguments jsonb not null default '{}'::jsonb check (jsonb_typeof(redacted_arguments) = 'object'),
  result_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(result_refs) = 'array'),
  claimed_at timestamptz null,
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  expired_at timestamptz null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, operation_id, request_id)
);

create index kwilt_conversational_action_handoffs_owner_state_idx
  on public.kwilt_conversational_action_handoffs(actor_id, state, expires_at, created_at);

alter table public.kwilt_conversational_action_handoffs enable row level security;
revoke all on table public.kwilt_conversational_action_handoffs from anon;
grant select, insert, update on table public.kwilt_conversational_action_handoffs to authenticated;

create policy "kwilt_conversational_action_handoffs_owner_select"
  on public.kwilt_conversational_action_handoffs for select to authenticated
  using ((select auth.uid()) = actor_id);

create policy "kwilt_conversational_action_handoffs_owner_insert"
  on public.kwilt_conversational_action_handoffs for insert to authenticated
  with check (
    (select auth.uid()) = actor_id
    and public.kwilt_is_active_household_member(household_id)
    and state = 'created'
    and version = 1
    and jsonb_array_length(result_refs) = 0
    and claimed_at is null and completed_at is null and cancelled_at is null and expired_at is null
  );

create policy "kwilt_conversational_action_handoffs_owner_update"
  on public.kwilt_conversational_action_handoffs for update to authenticated
  using ((select auth.uid()) = actor_id)
  with check (
    (select auth.uid()) = actor_id
    and public.kwilt_is_active_household_member(household_id)
  );

create or replace function public.validate_kwilt_conversational_action_handoff_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id <> old.id or new.actor_id <> old.actor_id or new.household_id <> old.household_id
    or new.operation_id <> old.operation_id or new.request_id <> old.request_id
    or new.target_version is distinct from old.target_version
    or new.redacted_arguments is distinct from old.redacted_arguments
    or new.created_at <> old.created_at or new.expires_at <> old.expires_at then
    raise exception 'handoff_identity_immutable';
  end if;
  if new.version <> old.version + 1 then raise exception 'handoff_version_increment_required'; end if;
  if not (
    (old.state = 'created' and new.state in ('claimed', 'cancelled', 'expired'))
    or (old.state = 'claimed' and new.state in ('completed', 'cancelled', 'expired'))
  ) then raise exception 'handoff_transition_invalid'; end if;
  if new.result_refs is distinct from old.result_refs and new.state <> 'completed' then
    raise exception 'handoff_result_refs_only_on_completion';
  end if;
  if (new.state = 'claimed' and new.claimed_at is null)
    or (new.state = 'completed' and new.completed_at is null)
    or (new.state = 'cancelled' and new.cancelled_at is null)
    or (new.state = 'expired' and new.expired_at is null) then
    raise exception 'handoff_transition_timestamp_required';
  end if;
  return new;
end;
$$;

create trigger validate_kwilt_conversational_action_handoff_transition
before update on public.kwilt_conversational_action_handoffs
for each row execute function public.validate_kwilt_conversational_action_handoff_transition();

create or replace function public.transition_kwilt_conversational_action_handoff(
  p_handoff_id uuid,
  p_from_state text,
  p_to_state text,
  p_expected_version integer,
  p_result_refs jsonb default '[]'::jsonb,
  p_occurred_at timestamptz default now()
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_handoff public.kwilt_conversational_action_handoffs%rowtype;
begin
  select * into v_handoff
  from public.kwilt_conversational_action_handoffs candidate
  where candidate.id = p_handoff_id
    and candidate.actor_id = (select auth.uid())
  for update;

  if not found then raise exception 'handoff_not_found'; end if;
  if v_handoff.version <> p_expected_version then raise exception 'handoff_version_conflict'; end if;
  if v_handoff.state <> p_from_state then raise exception 'handoff_source_state_mismatch'; end if;
  if not (
    (p_from_state = 'created' and p_to_state in ('claimed', 'cancelled', 'expired'))
    or (p_from_state = 'claimed' and p_to_state in ('completed', 'cancelled', 'expired'))
  ) then raise exception 'handoff_transition_invalid'; end if;
  if jsonb_typeof(coalesce(p_result_refs, '[]'::jsonb)) <> 'array' then
    raise exception 'handoff_result_refs_invalid';
  end if;

  update public.kwilt_conversational_action_handoffs
  set state = p_to_state,
      version = version + 1,
      result_refs = case when p_to_state = 'completed' then coalesce(p_result_refs, '[]'::jsonb) else result_refs end,
      claimed_at = case when p_to_state = 'claimed' then p_occurred_at else claimed_at end,
      completed_at = case when p_to_state = 'completed' then p_occurred_at else completed_at end,
      cancelled_at = case when p_to_state = 'cancelled' then p_occurred_at else cancelled_at end,
      expired_at = case when p_to_state = 'expired' then p_occurred_at else expired_at end,
      updated_at = p_occurred_at
  where id = v_handoff.id
  returning * into v_handoff;

  return to_jsonb(v_handoff);
end;
$$;

revoke all on function public.transition_kwilt_conversational_action_handoff(
  uuid, text, text, integer, jsonb, timestamptz
) from public, anon;
grant execute on function public.transition_kwilt_conversational_action_handoff(
  uuid, text, text, integer, jsonb, timestamptz
) to authenticated;

revoke all on function public.validate_kwilt_conversational_action_handoff_transition() from public, anon, authenticated;

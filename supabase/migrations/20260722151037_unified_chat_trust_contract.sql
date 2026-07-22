-- Durable trust records for the accepted Unified Chat contract.
-- Version aligned to the migration recorded by the linked Kwilt project.
--
-- The native Kwilt client owns these records. The hosted workbench receives a
-- credential-free projection and never queries the tables directly. All
-- records remain user-owned under RLS and reject anonymous Supabase sessions.

alter table public.kwilt_agent_threads
  add column scope_kind text not null default 'global'
    check (scope_kind in ('global', 'capability', 'object')),
  add column return_target jsonb null,
  add column version integer not null default 1 check (version > 0);

alter table public.kwilt_agent_runs
  add column request_class text null
    check (
      request_class is null
      or request_class in (
        'general',
        'general_with_kwilt_context',
        'capability_question',
        'capability_action',
        'native_control',
        'better_served_elsewhere'
      )
    ),
  add column participating_capabilities text[] not null default '{}',
  add column context_policy jsonb not null default '{}'::jsonb,
  add column version integer not null default 1 check (version > 0),
  add column stop_requested_at timestamptz null,
  add column steer_count integer not null default 0 check (steer_count >= 0);

create table public.kwilt_agent_context_refs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  capability_id text not null,
  object_type text not null,
  object_id text not null,
  label text not null check (char_length(label) between 1 and 500),
  secondary_label text null,
  source text not null check (source in ('launch', 'user_added', 'retrieved_promoted')),
  active boolean not null default true,
  return_target jsonb null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, capability_id, object_type, object_id)
);

create index kwilt_agent_context_refs_thread_active_idx
  on public.kwilt_agent_context_refs(thread_id, active, created_at, id);

create table public.kwilt_agent_run_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  run_id uuid not null references public.kwilt_agent_runs(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null,
  status text not null check (status in ('pending', 'active', 'complete', 'warning', 'failed')),
  visibility text not null default 'internal' check (visibility in ('internal', 'user')),
  label text null,
  detail text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create index kwilt_agent_run_events_thread_run_idx
  on public.kwilt_agent_run_events(thread_id, run_id, sequence);

create table public.kwilt_agent_evidence_refs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  run_id uuid not null references public.kwilt_agent_runs(id) on delete cascade,
  capability_id text not null,
  object_type text not null,
  object_id text not null,
  label text not null check (char_length(label) between 1 and 500),
  selection_status text not null check (selection_status in ('included', 'omitted')),
  authority text not null check (authority in ('authoritative', 'derived', 'user_supplied')),
  freshness_class text not null check (freshness_class in ('current', 'recent', 'stale', 'unknown')),
  observed_at timestamptz null,
  provenance jsonb not null default '{}'::jsonb,
  selection_reason text not null,
  sufficient boolean not null default false,
  omitted_count integer not null default 0 check (omitted_count >= 0),
  coverage_note text null,
  sequence integer not null check (sequence > 0),
  created_at timestamptz not null default now(),
  unique (run_id, sequence),
  unique (run_id, capability_id, object_type, object_id, selection_status)
);

create index kwilt_agent_evidence_refs_thread_run_idx
  on public.kwilt_agent_evidence_refs(thread_id, run_id, sequence);

create table public.kwilt_agent_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  run_id uuid not null references public.kwilt_agent_runs(id) on delete cascade,
  message_id uuid null references public.kwilt_agent_messages(id) on delete set null,
  capability_id text not null,
  title text not null check (char_length(title) between 1 and 500),
  body text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'edited', 'rejected', 'deferred', 'approved', 'applying', 'applied', 'failed', 'undone')),
  permission_policy jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  decided_at timestamptz null,
  applied_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kwilt_agent_proposals_thread_created_idx
  on public.kwilt_agent_proposals(thread_id, created_at, id);

create index kwilt_agent_proposals_run_idx
  on public.kwilt_agent_proposals(run_id, created_at, id);

create table public.kwilt_agent_proposal_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.kwilt_agent_proposals(id) on delete cascade,
  capability_id text not null,
  operation_type text not null,
  target_type text null,
  target_id text null,
  summary text not null check (char_length(summary) between 1 and 1000),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  sequence integer not null check (sequence > 0),
  created_at timestamptz not null default now(),
  unique (proposal_id, sequence),
  unique (user_id, capability_id, idempotency_key)
);

create table public.kwilt_agent_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.kwilt_agent_proposals(id) on delete cascade,
  action text not null check (action in ('edit', 'reject', 'defer', 'approve')),
  proposal_version integer not null check (proposal_version > 0),
  patch jsonb not null default '{}'::jsonb,
  note text null,
  created_at timestamptz not null default now()
);

create index kwilt_agent_decisions_proposal_created_idx
  on public.kwilt_agent_decisions(proposal_id, created_at, id);

create table public.kwilt_agent_mutation_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  proposal_id uuid not null references public.kwilt_agent_proposals(id) on delete cascade,
  operation_id uuid not null references public.kwilt_agent_proposal_operations(id) on delete restrict,
  capability_id text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  status text not null check (status in ('reserved', 'applied', 'failed', 'undone')),
  resulting_object_type text null,
  resulting_object_id text null,
  result_state jsonb not null default '{}'::jsonb,
  return_target jsonb null,
  undo_operation jsonb null,
  error_code text null,
  error_message text null,
  applied_at timestamptz null,
  undone_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index kwilt_agent_mutation_receipts_idempotency_idx
  on public.kwilt_agent_mutation_receipts(user_id, capability_id, idempotency_key);

create index kwilt_agent_mutation_receipts_thread_created_idx
  on public.kwilt_agent_mutation_receipts(thread_id, created_at, id);

create table public.kwilt_agent_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  run_id uuid null references public.kwilt_agent_runs(id) on delete cascade,
  message_id uuid null references public.kwilt_agent_messages(id) on delete cascade,
  proposal_id uuid null references public.kwilt_agent_proposals(id) on delete cascade,
  scope_kind text not null check (scope_kind in ('thread', 'run', 'message', 'proposal', 'capability', 'object')),
  capability_id text null,
  object_type text null,
  object_id text null,
  sentiment text null check (sentiment is null or sentiment in ('positive', 'negative')),
  reason text null,
  note text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kwilt_agent_feedback_thread_created_idx
  on public.kwilt_agent_feedback(thread_id, created_at, id);

create or replace function public.record_kwilt_agent_message_feedback(
  p_message_id uuid,
  p_sentiment text,
  p_reason text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_message public.kwilt_agent_messages%rowtype;
begin
  if p_sentiment not in ('positive', 'negative') then
    raise exception 'unsupported feedback sentiment' using errcode = '22023';
  end if;

  select * into v_message
  from public.kwilt_agent_messages
  where id = p_message_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;

  update public.kwilt_agent_messages
  set feedback = p_sentiment, updated_at = now()
  where id = v_message.id and user_id = auth.uid()
  returning * into v_message;

  update public.kwilt_agent_feedback
  set active = false, updated_at = now()
  where message_id = v_message.id and user_id = auth.uid() and active = true;

  insert into public.kwilt_agent_feedback (
    user_id, thread_id, message_id, scope_kind, sentiment, reason
  ) values (
    auth.uid(), v_message.thread_id, v_message.id, 'message', p_sentiment,
    nullif(btrim(p_reason), '')
  );

  return jsonb_build_object(
    'id', v_message.id,
    'thread_id', v_message.thread_id,
    'role', v_message.role,
    'body', v_message.body,
    'feedback', v_message.feedback,
    'created_at', v_message.created_at,
    'updated_at', v_message.updated_at
  );
end;
$$;

revoke all on function public.record_kwilt_agent_message_feedback(uuid, text, text) from public, anon;
grant execute on function public.record_kwilt_agent_message_feedback(uuid, text, text) to authenticated;

grant select, insert, update, delete
  on table public.kwilt_agent_context_refs,
    public.kwilt_agent_run_events,
    public.kwilt_agent_evidence_refs,
    public.kwilt_agent_proposals,
    public.kwilt_agent_proposal_operations,
    public.kwilt_agent_decisions,
    public.kwilt_agent_mutation_receipts,
    public.kwilt_agent_feedback
  to authenticated;

revoke all
  on table public.kwilt_agent_context_refs,
    public.kwilt_agent_run_events,
    public.kwilt_agent_evidence_refs,
    public.kwilt_agent_proposals,
    public.kwilt_agent_proposal_operations,
    public.kwilt_agent_decisions,
    public.kwilt_agent_mutation_receipts,
    public.kwilt_agent_feedback
  from anon;

alter table public.kwilt_agent_context_refs enable row level security;
alter table public.kwilt_agent_run_events enable row level security;
alter table public.kwilt_agent_evidence_refs enable row level security;
alter table public.kwilt_agent_proposals enable row level security;
alter table public.kwilt_agent_proposal_operations enable row level security;
alter table public.kwilt_agent_decisions enable row level security;
alter table public.kwilt_agent_mutation_receipts enable row level security;
alter table public.kwilt_agent_feedback enable row level security;

create policy "kwilt_agent_context_refs_owner_select"
  on public.kwilt_agent_context_refs for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_context_refs_owner_insert"
  on public.kwilt_agent_context_refs for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_threads thread
      where thread.id = thread_id and thread.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_context_refs_owner_update"
  on public.kwilt_agent_context_refs for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_threads thread
      where thread.id = thread_id and thread.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_context_refs_owner_delete"
  on public.kwilt_agent_context_refs for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_run_events_owner_select"
  on public.kwilt_agent_run_events for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_run_events_owner_insert"
  on public.kwilt_agent_run_events for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_run_events_owner_update"
  on public.kwilt_agent_run_events for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_run_events_owner_delete"
  on public.kwilt_agent_run_events for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_evidence_refs_owner_select"
  on public.kwilt_agent_evidence_refs for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_evidence_refs_owner_insert"
  on public.kwilt_agent_evidence_refs for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_evidence_refs_owner_update"
  on public.kwilt_agent_evidence_refs for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_evidence_refs_owner_delete"
  on public.kwilt_agent_evidence_refs for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_proposals_owner_select"
  on public.kwilt_agent_proposals for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_proposals_owner_insert"
  on public.kwilt_agent_proposals for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_proposals_owner_update"
  on public.kwilt_agent_proposals for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_proposals_owner_delete"
  on public.kwilt_agent_proposals for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_proposal_operations_owner_select"
  on public.kwilt_agent_proposal_operations for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_proposal_operations_owner_insert"
  on public.kwilt_agent_proposal_operations for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_proposals proposal
      where proposal.id = proposal_id and proposal.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_proposal_operations_owner_update"
  on public.kwilt_agent_proposal_operations for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_proposals proposal
      where proposal.id = proposal_id and proposal.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_proposal_operations_owner_delete"
  on public.kwilt_agent_proposal_operations for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_decisions_owner_select"
  on public.kwilt_agent_decisions for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_decisions_owner_insert"
  on public.kwilt_agent_decisions for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_proposals proposal
      where proposal.id = proposal_id and proposal.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_decisions_owner_update"
  on public.kwilt_agent_decisions for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_proposals proposal
      where proposal.id = proposal_id and proposal.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_decisions_owner_delete"
  on public.kwilt_agent_decisions for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_mutation_receipts_owner_select"
  on public.kwilt_agent_mutation_receipts for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_mutation_receipts_owner_insert"
  on public.kwilt_agent_mutation_receipts for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_proposals proposal
      join public.kwilt_agent_proposal_operations operation
        on operation.proposal_id = proposal.id
      where proposal.id = proposal_id
        and operation.id = operation_id
        and proposal.thread_id = thread_id
        and proposal.user_id = (select auth.uid())
        and operation.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_mutation_receipts_owner_update"
  on public.kwilt_agent_mutation_receipts for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_proposals proposal
      join public.kwilt_agent_proposal_operations operation
        on operation.proposal_id = proposal.id
      where proposal.id = proposal_id
        and operation.id = operation_id
        and proposal.thread_id = thread_id
        and proposal.user_id = (select auth.uid())
        and operation.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_mutation_receipts_owner_delete"
  on public.kwilt_agent_mutation_receipts for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_feedback_owner_select"
  on public.kwilt_agent_feedback for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);
create policy "kwilt_agent_feedback_owner_insert"
  on public.kwilt_agent_feedback for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_threads thread
      where thread.id = thread_id and thread.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_feedback_owner_update"
  on public.kwilt_agent_feedback for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_threads thread
      where thread.id = thread_id and thread.user_id = (select auth.uid())
    )
  );
create policy "kwilt_agent_feedback_owner_delete"
  on public.kwilt_agent_feedback for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create or replace function public.decide_kwilt_agent_proposal(
  p_proposal_id uuid,
  p_action text,
  p_expected_version integer,
  p_patch jsonb default '{}'::jsonb,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proposal public.kwilt_agent_proposals%rowtype;
  next_status text;
begin
  select * into proposal
  from public.kwilt_agent_proposals as candidate
  where candidate.id = p_proposal_id
    and candidate.user_id = (select auth.uid())
  for update;

  if not found then raise exception 'proposal_not_found'; end if;
  if proposal.version <> p_expected_version then raise exception 'stale_proposal_version'; end if;
  if p_action not in ('edit', 'reject', 'defer', 'approve') then raise exception 'invalid_proposal_action'; end if;

  next_status := case p_action
    when 'edit' then 'edited'
    when 'reject' then 'rejected'
    when 'defer' then 'deferred'
    when 'approve' then 'approved'
  end;

  if not (
    (proposal.status in ('pending', 'edited') and next_status in ('edited', 'rejected', 'deferred', 'approved'))
    or (proposal.status = 'deferred' and next_status in ('edited', 'rejected', 'approved'))
    or (proposal.status = 'failed' and next_status = 'approved')
  ) then
    raise exception 'invalid_proposal_transition';
  end if;

  if p_action = 'edit' then
    if jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
      raise exception 'empty_proposal_patch';
    end if;
    if exists (
      select 1 from jsonb_object_keys(p_patch) as patch_key
      where patch_key not in (
        'title', 'notes', 'goalId', 'type', 'status', 'tags',
        'priority', 'scheduledDate', 'estimateMinutes', 'difficulty'
      )
    ) then
      raise exception 'unsupported_proposal_patch';
    end if;
    update public.kwilt_agent_proposal_operations
    set payload = payload || p_patch
    where proposal_id = proposal.id
      and user_id = (select auth.uid());
  end if;

  insert into public.kwilt_agent_decisions (
    user_id, proposal_id, action, proposal_version, patch, note
  ) values (
    (select auth.uid()), proposal.id, p_action, proposal.version, p_patch, p_note
  );

  update public.kwilt_agent_proposals
  set status = next_status,
      version = version + 1,
      decided_at = case when p_action in ('reject', 'approve') then now() else decided_at end,
      updated_at = now()
  where id = proposal.id;

  return jsonb_build_object(
    'id', proposal.id,
    'status', next_status,
    'version', proposal.version + 1
  );
end;
$$;

revoke all on function public.decide_kwilt_agent_proposal(uuid, text, integer, jsonb, text) from public;
revoke all on function public.decide_kwilt_agent_proposal(uuid, text, integer, jsonb, text) from anon;
grant execute on function public.decide_kwilt_agent_proposal(uuid, text, integer, jsonb, text) to authenticated;

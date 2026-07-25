alter table public.kwilt_agent_runs
  add column initiator text not null default 'user'
    check (initiator in ('user', 'system')),
  add column trigger_kind text not null default 'user_message'
    check (trigger_kind in (
      'user_message', 'reminder', 'recurring_kwilt_action', 'monitor',
      'background_analysis', 'native_device_enforcement'
    )),
  add column trigger_id text null
    check (trigger_id is null or char_length(trigger_id) between 1 and 200),
  add column parent_run_id uuid null references public.kwilt_agent_runs(id) on delete set null,
  add constraint kwilt_agent_runs_trigger_initiator_check check (
    (initiator = 'user' and trigger_kind = 'user_message')
    or (initiator = 'system' and trigger_kind <> 'user_message')
  );

update public.kwilt_agent_runs as run
set trigger_id = coalesce(message.client_request_id, 'legacy') || ':' || run.id::text
from public.kwilt_agent_messages as message
where message.id = run.user_message_id
  and run.trigger_id is null;

update public.kwilt_agent_runs
set trigger_id = id::text
where trigger_id is null;

alter table public.kwilt_agent_runs alter column trigger_id set not null;

create unique index kwilt_agent_runs_user_trigger_idx
  on public.kwilt_agent_runs(user_id, trigger_kind, trigger_id);

create index kwilt_agent_runs_parent_idx
  on public.kwilt_agent_runs(parent_run_id)
  where parent_run_id is not null;

create or replace function public.enqueue_kwilt_agent_run_with_provenance(
  p_thread_id uuid,
  p_prompt text,
  p_client_request_id text,
  p_origin_channel text,
  p_channel_context jsonb default '{}'::jsonb,
  p_request_class text default 'general',
  p_participating_capabilities text[] default '{}',
  p_context_policy jsonb default '{}'::jsonb,
  p_user_id uuid default null,
  p_initiator text default 'user',
  p_trigger_kind text default 'user_message',
  p_trigger_id text default null,
  p_parent_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := case
    when coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then p_user_id
    else (select auth.uid())
  end;
  v_result jsonb;
  v_run_id uuid;
  v_existing public.kwilt_agent_runs%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' and p_initiator <> 'user' then
    raise exception 'service_role_required_for_system_trigger';
  end if;
  if p_initiator not in ('user', 'system') then raise exception 'invalid_run_initiator'; end if;
  if p_trigger_kind not in (
    'user_message', 'reminder', 'recurring_kwilt_action', 'monitor',
    'background_analysis', 'native_device_enforcement'
  ) then raise exception 'invalid_run_trigger_kind'; end if;
  if (p_initiator = 'user') <> (p_trigger_kind = 'user_message') then
    raise exception 'invalid_trigger_provenance';
  end if;
  if p_trigger_id is null or char_length(btrim(p_trigger_id)) < 1
    or char_length(p_trigger_id) > 200 then raise exception 'invalid_trigger_id'; end if;
  if p_parent_run_id is not null and not exists (
    select 1 from public.kwilt_agent_runs parent
    where parent.id = p_parent_run_id and parent.user_id = v_user_id
  ) then raise exception 'parent_run_not_found'; end if;

  select * into v_existing
  from public.kwilt_agent_runs candidate
  where candidate.user_id = v_user_id
    and candidate.trigger_kind = p_trigger_kind
    and candidate.trigger_id = btrim(p_trigger_id);
  if found then
    return jsonb_build_object(
      'threadId', v_existing.thread_id,
      'messageId', v_existing.user_message_id,
      'runId', v_existing.id,
      'status', v_existing.status,
      'version', v_existing.version,
      'replayed', true
    );
  end if;

  v_result := public.enqueue_kwilt_agent_run(
    p_thread_id, p_prompt, p_client_request_id, p_origin_channel,
    p_channel_context, p_request_class, p_participating_capabilities,
    p_context_policy, v_user_id
  );
  v_run_id := (v_result ->> 'runId')::uuid;

  update public.kwilt_agent_runs
  set initiator = p_initiator,
      trigger_kind = p_trigger_kind,
      trigger_id = btrim(p_trigger_id),
      parent_run_id = p_parent_run_id,
      updated_at = now()
  where id = v_run_id and user_id = v_user_id;

  update public.kwilt_agent_run_events
  set payload = payload || jsonb_build_object(
    'initiator', p_initiator,
    'triggerKind', p_trigger_kind,
    'triggerId', btrim(p_trigger_id),
    'parentRunId', p_parent_run_id
  )
  where run_id = v_run_id and sequence = 1;

  return v_result;
end;
$$;

revoke all on function public.enqueue_kwilt_agent_run_with_provenance(
  uuid, text, text, text, jsonb, text, text[], jsonb, uuid, text, text, text, uuid
) from public, anon;
grant execute on function public.enqueue_kwilt_agent_run_with_provenance(
  uuid, text, text, text, jsonb, text, text[], jsonb, uuid, text, text, text, uuid
) to authenticated, service_role;

create or replace function public.load_kwilt_agent_run_replay(
  p_user_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := case
    when coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then p_user_id
    else (select auth.uid())
  end;
  v_run public.kwilt_agent_runs%rowtype;
  v_answer text;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  select * into v_run
  from public.kwilt_agent_runs candidate
  where candidate.id = p_run_id and candidate.user_id = v_user_id;
  if not found then raise exception 'run_not_found'; end if;
  if v_run.status not in ('complete', 'partial') or v_run.assistant_message_id is null then
    raise exception 'run_replay_not_terminal';
  end if;
  select body into v_answer
  from public.kwilt_agent_messages message
  where message.id = v_run.assistant_message_id and message.user_id = v_user_id;
  if v_answer is null then raise exception 'run_replay_message_not_found'; end if;
  return jsonb_build_object('runId', v_run.id, 'status', v_run.status, 'answer', v_answer);
end;
$$;

revoke all on function public.load_kwilt_agent_run_replay(uuid, uuid) from public, anon;
grant execute on function public.load_kwilt_agent_run_replay(uuid, uuid) to authenticated, service_role;

create table public.kwilt_agent_work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'reminder', 'recurring_kwilt_action', 'monitor',
    'background_analysis', 'native_device_enforcement'
  )),
  capability_id text not null check (char_length(capability_id) between 1 and 80),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  target_channel text not null check (target_channel in ('mobile', 'sms', 'phone', 'desktop', 'external')),
  prompt text null check (prompt is null or char_length(prompt) between 1 and 100000),
  state text not null default 'queued'
    check (state in ('queued', 'running', 'pending_completion', 'completed', 'failed', 'cancelled')),
  thread_id uuid null references public.kwilt_agent_threads(id) on delete set null,
  run_id uuid null references public.kwilt_agent_runs(id) on delete set null,
  proposal_id uuid null references public.kwilt_agent_proposals(id) on delete set null,
  client_action_id uuid null references public.kwilt_agent_client_actions(id) on delete set null,
  receipt_id uuid null references public.kwilt_agent_mutation_receipts(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  attempts integer not null default 0 check (attempts between 0 and 10),
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index kwilt_agent_work_items_claim_idx
  on public.kwilt_agent_work_items(state, available_at, created_at)
  where state in ('queued', 'running');
create index kwilt_agent_work_items_owner_created_idx
  on public.kwilt_agent_work_items(user_id, created_at desc);

alter table public.kwilt_phone_agent_prompts
  add column work_item_id uuid null references public.kwilt_agent_work_items(id) on delete set null;

create unique index kwilt_phone_agent_prompts_work_item_idx
  on public.kwilt_phone_agent_prompts(work_item_id)
  where work_item_id is not null;

alter table public.kwilt_agent_work_items enable row level security;
grant select on table public.kwilt_agent_work_items to authenticated;
grant all on table public.kwilt_agent_work_items to service_role;
revoke all on table public.kwilt_agent_work_items from anon;

create policy "kwilt_agent_work_items_owner_select"
  on public.kwilt_agent_work_items for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.enqueue_kwilt_agent_work_item(
  p_user_id uuid,
  p_kind text,
  p_capability_id text,
  p_idempotency_key text,
  p_target_channel text,
  p_prompt text default null,
  p_thread_id uuid default null,
  p_available_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.kwilt_agent_work_items%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_user_id is null then raise exception 'user_id_required'; end if;
  if p_kind not in ('reminder', 'recurring_kwilt_action', 'monitor', 'background_analysis', 'native_device_enforcement') then
    raise exception 'invalid_work_kind';
  end if;
  if p_target_channel not in ('mobile', 'sms', 'phone', 'desktop', 'external') then raise exception 'invalid_target_channel'; end if;
  if p_thread_id is not null and not exists (
    select 1 from public.kwilt_agent_threads thread where thread.id = p_thread_id and thread.user_id = p_user_id
  ) then raise exception 'thread_not_found'; end if;
  insert into public.kwilt_agent_work_items (
    user_id, kind, capability_id, idempotency_key, target_channel, prompt, thread_id, available_at
  ) values (
    p_user_id, p_kind, btrim(p_capability_id), btrim(p_idempotency_key), p_target_channel,
    nullif(btrim(p_prompt), ''), p_thread_id, coalesce(p_available_at, now())
  )
  on conflict (user_id, idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning * into v_item;
  return to_jsonb(v_item);
end;
$$;

revoke all on function public.enqueue_kwilt_agent_work_item(uuid, text, text, text, text, text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.enqueue_kwilt_agent_work_item(uuid, text, text, text, text, text, uuid, timestamptz)
  to service_role;

create or replace function public.claim_kwilt_agent_work_items(p_limit integer default 10)
returns setof public.kwilt_agent_work_items
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  update public.kwilt_agent_work_items
  set state = 'failed', completed_at = now(), locked_at = null,
      evidence = evidence || jsonb_build_object('errorCode', 'worker_attempts_exhausted'), updated_at = now()
  where state = 'running' and attempts >= 3 and locked_at < now() - interval '5 minutes';
  return query
  with candidates as (
    select item.id from public.kwilt_agent_work_items item
    where (item.state = 'queued' and item.available_at <= now())
       or (item.state = 'running' and item.attempts < 3 and item.locked_at < now() - interval '5 minutes')
    order by item.available_at, item.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  )
  update public.kwilt_agent_work_items item
  set state = 'running', attempts = item.attempts + 1, locked_at = now(), updated_at = now()
  from candidates where item.id = candidates.id returning item.*;
end;
$$;

revoke all on function public.claim_kwilt_agent_work_items(integer) from public, anon, authenticated;
grant execute on function public.claim_kwilt_agent_work_items(integer) to service_role;

create or replace function public.claim_kwilt_agent_work_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_item public.kwilt_agent_work_items%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  select * into v_item from public.kwilt_agent_work_items where id = p_item_id for update;
  if not found then raise exception 'work_item_not_found'; end if;
  if not (
    (v_item.state = 'queued' and v_item.available_at <= now())
    or (v_item.state = 'running' and v_item.attempts < 3 and v_item.locked_at < now() - interval '5 minutes')
  ) then raise exception 'work_item_not_claimable'; end if;
  update public.kwilt_agent_work_items
  set state = 'running', attempts = attempts + 1, locked_at = now(), updated_at = now()
  where id = p_item_id returning * into v_item;
  return to_jsonb(v_item);
end;
$$;

revoke all on function public.claim_kwilt_agent_work_item(uuid) from public, anon, authenticated;
grant execute on function public.claim_kwilt_agent_work_item(uuid) to service_role;

create or replace function public.retry_kwilt_agent_work_item(
  p_item_id uuid,
  p_delay_seconds integer,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_item public.kwilt_agent_work_items%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  select * into v_item from public.kwilt_agent_work_items where id = p_item_id for update;
  if not found then raise exception 'work_item_not_found'; end if;
  if v_item.state <> 'running' then raise exception 'invalid_work_item_source_state'; end if;
  if v_item.attempts >= 3 then raise exception 'work_item_attempts_exhausted'; end if;
  update public.kwilt_agent_work_items
  set state = 'queued', available_at = now() + make_interval(secs => greatest(1, least(p_delay_seconds, 3600))),
      locked_at = null, evidence = evidence || jsonb_build_object('lastErrorCode', p_error_code), updated_at = now()
  where id = p_item_id returning * into v_item;
  return to_jsonb(v_item);
end;
$$;

revoke all on function public.retry_kwilt_agent_work_item(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.retry_kwilt_agent_work_item(uuid, integer, text) to service_role;

create or replace function public.finish_kwilt_agent_work_item(
  p_item_id uuid,
  p_state text,
  p_evidence jsonb default '{}'::jsonb,
  p_thread_id uuid default null,
  p_run_id uuid default null,
  p_proposal_id uuid default null,
  p_client_action_id uuid default null,
  p_receipt_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.kwilt_agent_work_items%rowtype;
  v_complete_allowed boolean := false;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_state not in ('pending_completion', 'completed', 'failed', 'cancelled') then raise exception 'invalid_work_item_terminal_state'; end if;
  if jsonb_typeof(coalesce(p_evidence, '{}'::jsonb)) <> 'object' then raise exception 'invalid_work_item_evidence'; end if;
  select * into v_item from public.kwilt_agent_work_items where id = p_item_id for update;
  if not found then raise exception 'work_item_not_found'; end if;
  if v_item.state not in ('running', 'pending_completion') then raise exception 'invalid_work_item_source_state'; end if;
  if coalesce(p_thread_id, v_item.thread_id) is not null and not exists (
    select 1 from public.kwilt_agent_threads thread
    where thread.id = coalesce(p_thread_id, v_item.thread_id) and thread.user_id = v_item.user_id
  ) then raise exception 'work_item_thread_owner_mismatch'; end if;
  if p_run_id is not null and not exists (
    select 1 from public.kwilt_agent_runs run where run.id = p_run_id and run.user_id = v_item.user_id
  ) then raise exception 'work_item_run_owner_mismatch'; end if;
  if p_proposal_id is not null and not exists (
    select 1 from public.kwilt_agent_proposals proposal where proposal.id = p_proposal_id and proposal.user_id = v_item.user_id
  ) then raise exception 'work_item_proposal_owner_mismatch'; end if;
  if p_client_action_id is not null and not exists (
    select 1 from public.kwilt_agent_client_actions action where action.id = p_client_action_id and action.user_id = v_item.user_id
  ) then raise exception 'work_item_client_action_owner_mismatch'; end if;
  if p_receipt_id is not null and not exists (
    select 1 from public.kwilt_agent_mutation_receipts receipt where receipt.id = p_receipt_id and receipt.user_id = v_item.user_id
  ) then raise exception 'work_item_receipt_owner_mismatch'; end if;

  if p_state = 'completed' then
    v_complete_allowed := case v_item.kind
      when 'reminder' then coalesce((p_evidence ->> 'deliveryCheckpointed')::boolean, false)
      when 'recurring_kwilt_action' then p_receipt_id is not null and exists (
        select 1 from public.kwilt_agent_mutation_receipts receipt
        where receipt.id = p_receipt_id and receipt.user_id = v_item.user_id and receipt.status = 'applied'
      )
      when 'monitor' then coalesce((p_evidence ->> 'observationPersisted')::boolean, false)
        and coalesce((p_evidence ->> 'deliveryCheckpointed')::boolean, false)
      when 'background_analysis' then p_run_id is not null and exists (
        select 1 from public.kwilt_agent_runs run
        where run.id = p_run_id and run.user_id = v_item.user_id and run.status in ('complete', 'partial')
      )
      when 'native_device_enforcement' then p_client_action_id is not null and exists (
        select 1 from public.kwilt_agent_client_actions action
        where action.id = p_client_action_id and action.user_id = v_item.user_id and action.status = 'completed'
      )
      else false
    end;
    if not v_complete_allowed then raise exception 'authoritative_completion_evidence_required'; end if;
  end if;

  update public.kwilt_agent_work_items
  set state = p_state,
      thread_id = coalesce(p_thread_id, thread_id),
      run_id = coalesce(p_run_id, run_id),
      proposal_id = coalesce(p_proposal_id, proposal_id),
      client_action_id = coalesce(p_client_action_id, client_action_id),
      receipt_id = coalesce(p_receipt_id, receipt_id),
      evidence = evidence || coalesce(p_evidence, '{}'::jsonb),
      locked_at = null,
      completed_at = case when p_state in ('completed', 'failed', 'cancelled') then now() else null end,
      updated_at = now()
  where id = p_item_id returning * into v_item;
  return to_jsonb(v_item);
end;
$$;

revoke all on function public.finish_kwilt_agent_work_item(uuid, text, jsonb, uuid, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.finish_kwilt_agent_work_item(uuid, text, jsonb, uuid, uuid, uuid, uuid, uuid)
  to service_role;

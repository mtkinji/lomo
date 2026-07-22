-- Live, rollback-only RLS and idempotency assertions for Unified Chat.
-- Run against a migrated database as an administrative connection. The fixed
-- fixture users and all child records are rolled back even when the assertions
-- pass. A failed assertion aborts the transaction.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated', 'unified-chat-a@example.invalid', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000a002', 'authenticated', 'authenticated', 'unified-chat-b@example.invalid', '', now(), now());

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated","is_anonymous":false}',
  true
);

insert into public.kwilt_agent_threads (id, user_id, title)
values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001', 'RLS fixture');

insert into public.kwilt_agent_runs (id, user_id, thread_id, status)
values (
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-00000000b001',
  'complete'
);

insert into public.kwilt_agent_runs (id, user_id, thread_id, status)
values (
  '00000000-0000-0000-0000-00000000c002',
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-00000000b001',
  'active'
);

select public.transition_kwilt_agent_run(
  '00000000-0000-0000-0000-00000000c002',
  'active',
  'complete',
  1,
  'response',
  'complete',
  'user',
  'Response ready'
);

do $$
begin
  if not exists (
    select 1 from public.kwilt_agent_runs
    where id = '00000000-0000-0000-0000-00000000c002'
      and status = 'complete'
      and version = 2
  ) then
    raise exception 'run transition was not persisted';
  end if;
  if not exists (
    select 1 from public.kwilt_agent_run_events
    where run_id = '00000000-0000-0000-0000-00000000c002'
      and sequence = 1
      and event_type = 'response'
      and status = 'complete'
  ) then
    raise exception 'run transition event was not persisted atomically';
  end if;
  begin
    perform public.transition_kwilt_agent_run(
      '00000000-0000-0000-0000-00000000c002',
      'active', 'failed', 1, 'response', 'failed', 'user', 'Replay'
    );
    raise exception 'stale run transition was accepted';
  exception when others then
    if sqlerrm = 'stale run transition was accepted' then raise; end if;
  end;
end;
$$;

insert into public.kwilt_agent_proposals (
  id, user_id, thread_id, run_id, capability_id, title
) values (
  '00000000-0000-0000-0000-00000000d001',
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-00000000b001',
  '00000000-0000-0000-0000-00000000c001',
  'todos',
  'Idempotency fixture'
);

insert into public.kwilt_agent_proposal_operations (
  id, user_id, proposal_id, capability_id, operation_type, summary,
  idempotency_key, sequence
) values (
  '00000000-0000-0000-0000-00000000e001',
  '00000000-0000-0000-0000-00000000a001',
  '00000000-0000-0000-0000-00000000d001',
  'todos',
  'create_activity',
  'Create one fixture activity',
  'unified-chat-live-duplicate',
  1
);

select public.decide_kwilt_agent_proposal(
  '00000000-0000-0000-0000-00000000d001',
  'approve',
  1
);

select public.transition_kwilt_agent_proposal(
  '00000000-0000-0000-0000-00000000d001',
  'approved',
  'applying',
  2
);

do $$
begin
  if not exists (
    select 1 from public.kwilt_agent_proposals
    where id = '00000000-0000-0000-0000-00000000d001'
      and status = 'applying'
      and version = 3
  ) then
    raise exception 'proposal transition was not persisted';
  end if;
  if (
    select array_agg((payload ->> 'toStatus') order by sequence)
    from public.kwilt_agent_run_events
    where run_id = '00000000-0000-0000-0000-00000000c001'
      and event_type = 'proposal'
  ) <> array['approved', 'applying'] then
    raise exception 'proposal transition events are missing or out of order';
  end if;
end;
$$;

select public.create_kwilt_agent_user_message(
  '00000000-0000-0000-0000-00000000b001',
  'Please read the attached plan.',
  'unified-chat-attachment-request',
  '[{"id":"attachment-1","name":"plan.md","mime_type":"text/markdown","size_bytes":18,"content":"# Plan\nCall school"}]'::jsonb
);

select public.create_kwilt_agent_user_message(
  '00000000-0000-0000-0000-00000000b001',
  'Please read the attached plan.',
  'unified-chat-attachment-request',
  '[{"id":"attachment-1","name":"plan.md","mime_type":"text/markdown","size_bytes":18,"content":"# Plan\nCall school"}]'::jsonb
);

do $$
begin
  if (select count(*) from public.kwilt_agent_messages where client_request_id = 'unified-chat-attachment-request') <> 1 then
    raise exception 'duplicate user message was created';
  end if;
  if (select count(*) from public.kwilt_agent_message_attachments where client_attachment_id = 'attachment-1') <> 1 then
    raise exception 'duplicate message attachment was created';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.kwilt_agent_proposal_operations (
      id, user_id, proposal_id, capability_id, operation_type, summary,
      idempotency_key, sequence
    ) values (
      '00000000-0000-0000-0000-00000000e002',
      '00000000-0000-0000-0000-00000000a001',
      '00000000-0000-0000-0000-00000000d001',
      'todos',
      'create_activity',
      'Duplicate fixture activity',
      'unified-chat-live-duplicate',
      2
    );
    raise exception 'duplicate idempotency key was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  if exists (
    select 1 from public.kwilt_agent_threads
    where id = '00000000-0000-0000-0000-00000000b001'
  ) then
    raise exception 'cross-user thread read was accepted';
  end if;

  if exists (
    select 1 from public.kwilt_agent_message_attachments
    where client_attachment_id = 'attachment-1'
  ) then
    raise exception 'cross-user attachment read was accepted';
  end if;

  begin
    insert into public.kwilt_agent_context_refs (
      user_id, thread_id, capability_id, object_type, object_id, label, source
    ) values (
      '00000000-0000-0000-0000-00000000a002',
      '00000000-0000-0000-0000-00000000b001',
      'goals',
      'goal',
      'cross-user-fixture',
      'Cross-user fixture',
      'user_added'
    );
    raise exception 'cross-user parent reference was accepted';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
rollback;

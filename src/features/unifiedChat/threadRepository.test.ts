import { createUnifiedChatRepository, UnifiedChatAuthError } from './threadRepository';

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

function createClient(results: Result[], userId: string | null = 'user-1') {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  class Query {
    constructor(private table: string) {}

    private record(method: string, args: unknown[]) {
      calls.push({ table: this.table, method, args });
      return this;
    }

    select(...args: unknown[]) { return this.record('select', args); }
    insert(...args: unknown[]) { return this.record('insert', args); }
    upsert(...args: unknown[]) { return this.record('upsert', args); }
    update(...args: unknown[]) { return this.record('update', args); }
    delete(...args: unknown[]) { return this.record('delete', args); }
    eq(...args: unknown[]) { return this.record('eq', args); }
    in(...args: unknown[]) { return this.record('in', args); }
    order(...args: unknown[]) { return this.record('order', args); }
    limit(...args: unknown[]) { return this.record('limit', args); }

    async single() {
      this.record('single', []);
      return results.shift() ?? { data: null, error: null };
    }

    async maybeSingle() {
      this.record('maybeSingle', []);
      return results.shift() ?? { data: null, error: null };
    }

    then(resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) {
      this.record('execute', []);
      return Promise.resolve(results.shift() ?? { data: [], error: null }).then(resolve, reject);
    }
  }

  return {
    calls,
    client: {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: userId ? { id: userId } : null },
          error: null,
        })),
      },
      rpc: jest.fn(async (_name: string, _args: unknown) => results.shift() ?? { data: null, error: null }),
      from: jest.fn((table: string) => new Query(table)),
    },
  };
}

const threadRow = {
  id: 'thread-1',
  title: 'Plan my week',
  title_source: 'default',
  status: 'active',
  archived_at: null,
  created_at: '2026-07-21T10:00:00.000Z',
  updated_at: '2026-07-21T11:00:00.000Z',
};

const messageRow = {
  id: 'message-1',
  thread_id: 'thread-1',
  role: 'user',
  body: 'What matters this week?',
  feedback: null,
  created_at: '2026-07-21T11:00:00.000Z',
  updated_at: '2026-07-21T11:00:00.000Z',
};

const runRow = {
  id: 'run-1',
  thread_id: 'thread-1',
  user_message_id: 'message-1',
  assistant_message_id: null,
  status: 'active',
  error_code: null,
  error_message: null,
  created_at: '2026-07-21T11:00:00.000Z',
  updated_at: '2026-07-21T11:00:00.000Z',
  completed_at: null,
  request_class: 'general',
  participating_capabilities: [],
  context_policy: { usePrivateContext: false, reason: 'general-answer-without-private-context' },
  version: 1,
  stop_requested_at: null,
  steer_count: 0,
};

describe('Unified Chat repository', () => {
  test('requires an authenticated user before reading or writing', async () => {
    const { client } = createClient([], null);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.listThreads()).rejects.toBeInstanceOf(UnifiedChatAuthError);
  });

  test('creates and maps a thread owned by the current user', async () => {
    const { client, calls } = createClient([{ data: threadRow, error: null }]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createThread('Plan my week')).resolves.toEqual({
      id: 'thread-1',
      title: 'Plan my week',
      titleSource: 'default',
      status: 'active',
      archivedAt: null,
      createdAt: threadRow.created_at,
      updatedAt: threadRow.updated_at,
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_threads',
      method: 'insert',
      args: [{ user_id: 'user-1', title: 'Plan my week' }],
    });
  });

  test('lists active threads by most recently updated', async () => {
    const { client, calls } = createClient([{ data: [threadRow], error: null }]);
    const repository = createUnifiedChatRepository(client as never);

    const result = await repository.listThreads();

    expect(result[0]?.id).toBe('thread-1');
    expect(calls).toContainEqual({
      table: 'kwilt_agent_threads',
      method: 'order',
      args: ['updated_at', { ascending: false }],
    });
  });

  test('loads one thread with ordered messages and runs', async () => {
    const { client, calls } = createClient([
      { data: threadRow, error: null },
      { data: [messageRow], error: null },
      { data: [{ ...runRow, participating_capabilities: ['plan'] }], error: null },
      { data: [{
        id: 'event-1', thread_id: 'thread-1', run_id: 'run-1', sequence: 4,
        event_type: 'conversation_referent', status: 'complete', visibility: 'internal',
        label: 'Plan item awaiting placement', detail: null,
        payload: { schemaVersion: 1, capabilityId: 'plan', activityId: 'activity-1' },
      }], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [{
        id: 'context-1', thread_id: 'thread-1', capability_id: 'goals',
        object_type: 'goal', object_id: 'goal-1', label: 'Read together',
        secondary_label: 'In progress', source: 'launch', active: true,
        return_target: { name: 'MainTabs' }, version: 1,
      }], error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    const aggregate = await repository.loadThread('thread-1');

    expect(aggregate.messages[0]?.body).toBe('What matters this week?');
    expect(aggregate.runs[0]?.status).toBe('active');
    expect(aggregate.runs[0]?.participatingCapabilities).toEqual(['plan']);
    expect(aggregate.events).toEqual([expect.objectContaining({
      type: 'conversation_referent',
      payload: { schemaVersion: 1, capabilityId: 'plan', activityId: 'activity-1' },
    })]);
    expect(aggregate.evidence).toEqual([]);
    expect(aggregate.proposals).toEqual([]);
    expect(aggregate.contextRefs).toEqual([
      expect.objectContaining({ id: 'context-1', objectId: 'goal-1', active: true }),
    ]);
    expect(calls).toContainEqual({
      table: 'kwilt_agent_messages',
      method: 'order',
      args: ['created_at', { ascending: true }],
    });
  });

  test('hydrates a server-staged Goal proposal through the same mobile review aggregate', async () => {
    const proposalRow = {
      id: 'proposal-server-goal', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-1',
      capability_id: 'goals', title: 'Update Calmer mornings',
      body: 'Reviews the requested Goal changes before applying them.', status: 'pending', version: 1,
      created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const operationRow = {
      id: 'operation-server-goal', proposal_id: proposalRow.id, capability_id: 'goals',
      operation_type: 'update_goal', target_type: 'goal', target_id: 'goal-1',
      summary: 'Update Goal Calmer mornings',
      payload: { title: 'Calm school mornings', expectedUpdatedAt: 'goal-v1' },
      idempotency_key: 'server:run-1:call-hash', sequence: 1,
    };
    const { client } = createClient([
      { data: threadRow, error: null },
      { data: [messageRow], error: null },
      { data: [runRow], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [proposalRow], error: null },
      { data: [operationRow], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.loadThread('thread-1')).resolves.toMatchObject({
      proposals: [{
        id: 'proposal-server-goal', capabilityId: 'goals', status: 'pending',
        operation: {
          type: 'update_goal', targetId: 'goal-1', idempotencyKey: 'server:run-1:call-hash',
          payload: { title: 'Calm school mornings', expectedUpdatedAt: 'goal-v1' },
        },
      }],
    });
  });

  test('hydrates an applied relationship correction and its authoritative receipt', async () => {
    const relationshipRun = {
      ...runRow,
      status: 'complete',
      request_class: 'capability_action',
      participating_capabilities: ['relationships'],
      context_policy: { usePrivateContext: true, reason: 'explicit-relationship-memory-mutation' },
    };
    const proposalRow = {
      id: 'proposal-relationship', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-1',
      capability_id: 'relationships', title: 'Correct event relationship record',
      body: 'Corrects only the explicitly identified saved detail.', status: 'applied', version: 1,
      created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const operationRow = {
      id: 'operation-relationship', proposal_id: proposalRow.id, capability_id: 'relationships',
      operation_type: 'correct_relationship', target_type: 'event', target_id: 'event-1',
      summary: 'Correct event relationship record',
      payload: { fields: { dateText: 'Oct 14' }, expectedUpdatedAt: '2026-07-23T11:00:00.000Z' },
      idempotency_key: 'server:run-1:correct-lily', sequence: 1,
    };
    const receiptRow = {
      id: 'receipt-relationship', proposal_id: proposalRow.id, operation_id: operationRow.id,
      capability_id: 'relationships', idempotency_key: operationRow.idempotency_key, status: 'applied',
      resulting_object_type: 'relationship_event', resulting_object_id: 'event-1',
      result_state: { recordType: 'event', recordId: 'event-1' },
      return_target: { screen: 'UnifiedChat', threadId: 'thread-1' }, undo_operation: null,
      applied_at: '2026-07-23T12:00:00.000Z', undone_at: null,
    };
    const { client } = createClient([
      { data: threadRow, error: null },
      { data: [messageRow], error: null },
      { data: [relationshipRun], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [proposalRow], error: null },
      { data: [operationRow], error: null },
      { data: [receiptRow], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.loadThread('thread-1')).resolves.toMatchObject({
      runs: [expect.objectContaining({ participatingCapabilities: ['relationships'] })],
      proposals: [expect.objectContaining({
        capabilityId: 'relationships', status: 'applied',
        operation: expect.objectContaining({ type: 'correct_relationship', targetId: 'event-1' }),
      })],
      receipts: [expect.objectContaining({
        id: 'receipt-relationship', capabilityId: 'relationships', resultingObjectId: 'event-1', canUndo: false,
      })],
    });
  });

  test('keeps core Chat readable while the additive client-action table is not yet exposed', async () => {
    const { client } = createClient([
      { data: threadRow, error: null },
      { data: [messageRow], error: null },
      { data: [runRow], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      {
        data: null,
        error: {
          code: 'PGRST205',
          message: "Could not find the table 'public.kwilt_agent_client_actions' in the schema cache",
        },
      },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.loadThread('thread-1')).resolves.toMatchObject({
      messages: [expect.objectContaining({ id: 'message-1' })],
      clientActions: [],
    });
  });

  test('does not hide permission failures for the client-action table', async () => {
    const { client } = createClient([
      { data: threadRow, error: null },
      { data: [messageRow], error: null },
      { data: [runRow], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      {
        data: null,
        error: { code: '42501', message: 'permission denied for table kwilt_agent_client_actions' },
      },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.loadThread('thread-1')).rejects.toMatchObject({ code: '42501' });
  });

  test('attaches launch context and updates the thread scope', async () => {
    const contextRow = {
      id: 'context-1', thread_id: 'thread-1', capability_id: 'goals',
      object_type: 'goal', object_id: 'goal-1', label: 'Read together',
      secondary_label: 'In progress', source: 'launch', active: true,
      return_target: { name: 'MainTabs' }, version: 1,
    };
    const { client, calls } = createClient([
      { data: contextRow, error: null },
      { data: null, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.attachContext({
      threadId: 'thread-1', capabilityId: 'goals', objectType: 'goal', objectId: 'goal-1',
      label: 'Read together', secondaryLabel: 'In progress', source: 'launch',
      returnTarget: { name: 'MainTabs' },
    })).resolves.toMatchObject({ id: 'context-1', objectId: 'goal-1' });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_context_refs', method: 'upsert',
      args: [expect.objectContaining({ active: true, object_id: 'goal-1' }), {
        onConflict: 'thread_id,capability_id,object_type,object_id',
      }],
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_threads', method: 'update',
      args: [expect.objectContaining({ scope_kind: 'object', return_target: { name: 'MainTabs' } })],
    });
  });

  test('removes context only at its expected version', async () => {
    const { client, calls } = createClient([{ data: { id: 'context-1' }, error: null }]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.removeContext('context-1', 3)).resolves.toBeUndefined();
    expect(calls).toContainEqual({
      table: 'kwilt_agent_context_refs', method: 'update',
      args: [expect.objectContaining({ active: false, version: 4 })],
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_context_refs', method: 'eq', args: ['version', 3],
    });
  });

  test('atomically inserts a user message and its explicit attachments', async () => {
    const attachedMessage = {
      ...messageRow,
      attachments: [{
        id: 'attachment-1', message_id: 'message-1', name: 'week.md',
        mime_type: 'text/markdown', size_bytes: 24, content: 'Monday: dentist',
        created_at: messageRow.created_at,
      }],
    };
    const { client } = createClient([{ data: attachedMessage, error: null }]);
    const repository = createUnifiedChatRepository(client as never);

    const message = await repository.insertMessage({
      threadId: 'thread-1',
      role: 'user',
      body: 'What matters this week?',
      clientRequestId: 'request-1',
      attachments: [{
        id: 'local-1', name: 'week.md', mimeType: 'text/markdown',
        sizeBytes: 24, content: 'Monday: dentist',
      }],
    });

    expect(message.id).toBe('message-1');
    expect(message.attachments).toEqual([
      expect.objectContaining({ id: 'attachment-1', name: 'week.md', content: 'Monday: dentist' }),
    ]);
    expect(client.rpc).toHaveBeenCalledWith('create_kwilt_agent_user_message', {
      p_thread_id: 'thread-1',
      p_body: 'What matters this week?',
      p_client_request_id: 'request-1',
      p_attachments: [{
        id: 'local-1', name: 'week.md', mime_type: 'text/markdown',
        size_bytes: 24, content: 'Monday: dentist',
      }],
    });
  });

  test('persists assistant feedback for the current user', async () => {
    const positiveMessage = { ...messageRow, role: 'assistant', feedback: 'positive' };
    const { client } = createClient([{ data: positiveMessage, error: null }]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.setMessageFeedback('message-1', 'positive', 'It used the right Goal.')).resolves.toMatchObject({
      id: 'message-1',
      feedback: 'positive',
    });
    expect(client.rpc).toHaveBeenCalledWith('record_kwilt_agent_message_feedback', {
      p_message_id: 'message-1', p_sentiment: 'positive', p_reason: 'It used the right Goal.',
    });
  });

  test('protects manual names while generating, archiving, restoring, and deleting an owned thread', async () => {
    const archived = {
      ...threadRow,
      title: 'A clearer title',
      title_source: 'user',
      status: 'archived',
      archived_at: '2026-07-21T12:00:00.000Z',
    };
    const restored = {
      ...archived,
      status: 'active',
      archived_at: null,
    };
    const generated = {
      ...threadRow,
      title: 'Planning the School Week',
      title_source: 'generated',
    };
    const { client, calls } = createClient([
      { data: { ...threadRow, title: 'A clearer title', title_source: 'user' }, error: null },
      { data: generated, error: null },
      { data: null, error: null },
      { data: archived, error: null },
      { data: restored, error: null },
      { data: null, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.renameThread('thread-1', 'A clearer title')).resolves.toMatchObject({
      title: 'A clearer title',
      titleSource: 'user',
    });
    await expect(repository.applyGeneratedThreadTitle('thread-1', 'Planning the School Week'))
      .resolves.toMatchObject({ title: 'Planning the School Week', titleSource: 'generated' });
    await expect(repository.applyGeneratedThreadTitle('thread-1', 'A Later Generated Name'))
      .resolves.toBeNull();
    expect(calls).toContainEqual({
      table: 'kwilt_agent_threads', method: 'in',
      args: ['title_source', ['default', 'generated']],
    });
    await expect(repository.archiveThread('thread-1')).resolves.toMatchObject({
      status: 'archived',
    });
    await expect(repository.restoreThread('thread-1')).resolves.toMatchObject({
      status: 'active',
      archivedAt: null,
    });
    await expect(repository.deleteThread('thread-1')).resolves.toBeUndefined();
    expect(calls).toContainEqual({
      table: 'kwilt_agent_threads', method: 'delete', args: [],
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_threads', method: 'eq', args: ['user_id', 'user-1'],
    });
  });

  test('creates and atomically completes a versioned durable run with its ordered event', async () => {
    const completeRun = {
      ...runRow,
      assistant_message_id: 'message-2',
      status: 'complete',
      completed_at: '2026-07-21T12:00:00.000Z',
    };
    const { client } = createClient([
      { data: runRow, error: null },
      { data: completeRun, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createRun({
      threadId: 'thread-1',
      userMessageId: 'message-1',
      requestClass: 'general',
      participatingCapabilities: [],
      contextPolicy: {
        usePrivateContext: false,
        reason: 'general-answer-without-private-context',
        clarification: null,
      },
    }))
      .resolves.toMatchObject({ status: 'active' });
    expect(client.from).toHaveBeenCalledWith('kwilt_agent_runs');
    await expect(repository.transitionRunStatus({
      runId: 'run-1', fromStatus: 'active', toStatus: 'complete', expectedVersion: 1,
      assistantMessageId: 'message-2',
      completedAt: '2026-07-21T12:00:00.000Z',
      event: { type: 'response', status: 'complete', visibility: 'user', label: 'Response ready' },
    })).resolves.toMatchObject({ status: 'complete' });
    expect(client.rpc).toHaveBeenCalledWith('transition_kwilt_agent_run', {
      p_run_id: 'run-1', p_from_status: 'active', p_to_status: 'complete', p_expected_version: 1,
      p_event_type: 'response', p_event_status: 'complete', p_event_visibility: 'user',
      p_event_label: 'Response ready', p_event_detail: null, p_event_payload: {},
      p_assistant_message_id: 'message-2', p_error_code: null, p_error_message: null,
      p_completed_at: '2026-07-21T12:00:00.000Z', p_stop_requested_at: null, p_steer_count: null,
    });
  });

  test('persists ordered visible run events and evidence under the authenticated owner', async () => {
    const { client, calls } = createClient([
      { data: null, error: null },
      { data: null, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await repository.appendRunEvents({
      threadId: 'thread-1',
      runId: 'run-1',
      events: [
        { sequence: 1, type: 'scope', status: 'complete', visibility: 'user', label: 'Understood the request' },
        { sequence: 2, type: 'evidence', status: 'complete', visibility: 'user', label: 'Checked 1 relevant Goal' },
      ],
    });
    await repository.persistRunEvidence({
      threadId: 'thread-1',
      runId: 'run-1',
      evidence: [{
        sequence: 1,
        capabilityId: 'goals',
        objectType: 'goal',
        objectId: 'goal-reading',
        label: 'Read together every evening',
        selectionStatus: 'included',
        authority: 'authoritative',
        freshness: 'current',
        observedAt: '2026-07-21T12:00:00.000Z',
        provenance: { source: 'goals' },
        selectionReason: 'Matched 2 material request terms.',
        sufficient: true,
        omittedCount: 0,
        coverageNote: 'Selected 1 of 1 bounded Kwilt records.',
      }],
    });

    expect(calls).toContainEqual({
      table: 'kwilt_agent_run_events',
      method: 'insert',
      args: [[
        expect.objectContaining({
          user_id: 'user-1', thread_id: 'thread-1', run_id: 'run-1', sequence: 1,
        }),
        expect.objectContaining({ sequence: 2 }),
      ]],
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_evidence_refs',
      method: 'insert',
      args: [[
        expect.objectContaining({
          user_id: 'user-1', object_id: 'goal-reading', selection_status: 'included', freshness_class: 'current',
        }),
      ]],
    });
  });

  test('persists a pending typed proposal and its idempotent capability operation', async () => {
    const proposalRow = {
      id: 'proposal-1', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'todos', title: 'Move library visit', body: 'Changes the scheduled date.',
      status: 'pending', version: 1, created_at: '2026-07-22T12:00:00.000Z', updated_at: '2026-07-22T12:00:00.000Z',
    };
    const operationRow = {
      id: 'operation-1', proposal_id: 'proposal-1', capability_id: 'todos',
      operation_type: 'update_activity', target_type: 'activity', target_id: 'activity-library',
      summary: 'Move library visit', payload: { scheduledDate: '2026-07-25' },
      idempotency_key: 'unified-chat:run-1:1', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null },
      { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1',
      runId: 'run-1',
      messageId: 'message-2',
      capabilityId: 'todos',
      title: 'Move library visit',
      body: 'Changes the scheduled date.',
      permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'update_activity',
        targetId: 'activity-library',
        expectedUpdatedAt: '2026-07-21T13:00:00.000Z',
        payload: { scheduledDate: '2026-07-25' },
        summary: 'Move library visit',
        idempotencyKey: 'unified-chat:run-1:1',
      },
    })).resolves.toMatchObject({ id: 'proposal-1', status: 'pending', operation: { id: 'operation-1' } });

    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        user_id: 'user-1', proposal_id: 'proposal-1', operation_type: 'update_activity',
        target_id: 'activity-library', idempotency_key: 'unified-chat:run-1:1',
        payload: expect.objectContaining({
          scheduledDate: '2026-07-25',
          expectedUpdatedAt: '2026-07-21T13:00:00.000Z',
        }),
      })],
    });
  });

  test('persists a pending Plan schedule proposal with provider-complete calendar context', async () => {
    const proposalRow = {
      id: 'proposal-plan', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'plan', title: 'Schedule school call', body: 'Tomorrow at 9:00 AM.',
      status: 'pending', version: 1, created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const payload = {
      activityId: 'activity-school', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
      startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
      targetDateKey: '2026-07-24',
      writeCalendarRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' },
    };
    const operationRow = {
      id: 'operation-plan', proposal_id: 'proposal-plan', capability_id: 'plan',
      operation_type: 'schedule_activity', target_type: 'activity', target_id: 'activity-school',
      summary: 'Schedule school call', payload,
      idempotency_key: 'unified-chat:run-1:plan:activity-school', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null },
      { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'plan',
      title: 'Schedule school call', body: 'Tomorrow at 9:00 AM.',
      permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'schedule_activity', targetId: 'activity-school',
        expectedUpdatedAt: '2026-07-23T10:00:00.000Z', payload,
        summary: 'Schedule school call',
        idempotencyKey: 'unified-chat:run-1:plan:activity-school',
      },
    })).resolves.toMatchObject({
      id: 'proposal-plan', capabilityId: 'plan',
      operation: { type: 'schedule_activity', capabilityId: 'plan', payload },
    });

    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        capability_id: 'plan', operation_type: 'schedule_activity', target_id: 'activity-school',
        payload,
      })],
    });
  });

  test('persists and maps one independently receipted Plan chunk proposal', async () => {
    const proposalRow = {
      id: 'proposal-chunk', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'plan', title: 'Schedule Deep work, part 1', body: 'Chunk 1 of 2.',
      status: 'pending', version: 1, created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const payload = {
      activityId: 'activity-deep-work', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
      groupId: 'plan-chunks:call-1', chunkId: 'chunk-1', title: 'Deep work, part 1',
      startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
      targetDateKey: '2026-07-24',
      writeCalendarRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' },
    };
    const operationRow = {
      id: 'operation-chunk', proposal_id: 'proposal-chunk', capability_id: 'plan',
      operation_type: 'schedule_activity_chunk', target_type: 'activity', target_id: 'activity-deep-work',
      summary: 'Schedule Deep work, part 1', payload,
      idempotency_key: 'unified-chat:run-1:plan-chunks:call-1:chunk-1', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null },
      { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'plan',
      title: proposalRow.title, body: proposalRow.body,
      permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'schedule_activity_chunk', targetId: 'activity-deep-work',
        expectedUpdatedAt: payload.expectedUpdatedAt, payload,
        summary: operationRow.summary, idempotencyKey: operationRow.idempotency_key,
      },
    })).resolves.toMatchObject({
      id: 'proposal-chunk', capabilityId: 'plan',
      operation: { type: 'schedule_activity_chunk', capabilityId: 'plan', payload },
    });

    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        capability_id: 'plan', operation_type: 'schedule_activity_chunk', target_id: 'activity-deep-work', payload,
      })],
    });
  });

  test('persists and maps a pending Goal creation proposal', async () => {
    const proposalRow = {
      id: 'proposal-goal', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'goals', title: 'Create Learn watercolor', body: 'Creates a Goal draft.',
      status: 'pending', version: 1, created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const payload = { title: 'Learn watercolor', description: 'Paint one small scene.', expectedUpdatedAt: null };
    const operationRow = {
      id: 'operation-goal', proposal_id: 'proposal-goal', capability_id: 'goals',
      operation_type: 'create_goal', target_type: 'goal', target_id: null,
      summary: 'Create Learn watercolor', payload,
      idempotency_key: 'unified-chat:run-1:goal:1', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null }, { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'goals',
      title: 'Create Learn watercolor', body: 'Creates a Goal draft.',
      permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'create_goal', targetId: null, expectedUpdatedAt: null,
        payload: { title: 'Learn watercolor', description: 'Paint one small scene.' },
        summary: 'Create Learn watercolor', idempotencyKey: 'unified-chat:run-1:goal:1',
      },
    })).resolves.toMatchObject({
      id: 'proposal-goal', capabilityId: 'goals',
      operation: { type: 'create_goal', targetId: null, payload },
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        capability_id: 'goals', operation_type: 'create_goal', target_type: 'goal', target_id: null,
        payload,
      })],
    });
  });

  test('persists and maps a pending Arc update proposal', async () => {
    const proposalRow = {
      id: 'proposal-arc', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'arcs', title: 'Update Present parent', body: 'Reviews the identity change.',
      status: 'pending', version: 1, created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const payload = { name: 'Steady parent', expectedUpdatedAt: '2026-07-22T12:00:00.000Z' };
    const operationRow = {
      id: 'operation-arc', proposal_id: 'proposal-arc', capability_id: 'arcs',
      operation_type: 'update_arc', target_type: 'arc', target_id: 'arc-parent',
      summary: 'Update Present parent', payload,
      idempotency_key: 'unified-chat:run-1:arc:1', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null }, { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'arcs',
      title: 'Update Present parent', body: 'Reviews the identity change.',
      permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'update_arc', targetId: 'arc-parent', expectedUpdatedAt: payload.expectedUpdatedAt,
        payload: { name: 'Steady parent' }, summary: 'Update Present parent',
        idempotencyKey: 'unified-chat:run-1:arc:1',
      },
    })).resolves.toMatchObject({
      id: 'proposal-arc', capabilityId: 'arcs',
      operation: { type: 'update_arc', targetId: 'arc-parent', payload },
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        capability_id: 'arcs', operation_type: 'update_arc', target_type: 'arc', target_id: 'arc-parent',
        payload,
      })],
    });
  });

  test('persists and maps a pending Profile update proposal', async () => {
    const proposalRow = {
      id: 'proposal-profile', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'profile', title: 'Update your profile', body: 'Reviews the name change.',
      status: 'pending', version: 1, created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const payload = { fullName: 'Andy', expectedUpdatedAt: '2026-07-22T12:00:00.000Z' };
    const operationRow = {
      id: 'operation-profile', proposal_id: 'proposal-profile', capability_id: 'profile',
      operation_type: 'update_profile', target_type: 'profile', target_id: 'profile-1',
      summary: 'Update your profile', payload,
      idempotency_key: 'unified-chat:run-1:profile:1', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null }, { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'profile',
      title: 'Update your profile', body: 'Reviews the name change.',
      permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'update_profile', targetId: 'profile-1', expectedUpdatedAt: payload.expectedUpdatedAt,
        payload: { fullName: 'Andy' }, summary: 'Update your profile',
        idempotencyKey: 'unified-chat:run-1:profile:1',
      },
    })).resolves.toMatchObject({
      id: 'proposal-profile', capabilityId: 'profile',
      operation: { type: 'update_profile', targetId: 'profile-1', payload },
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        capability_id: 'profile', operation_type: 'update_profile', target_type: 'profile',
        target_id: 'profile-1', payload,
      })],
    });
  });

  test('persists and maps a pending Chapter note proposal', async () => {
    const proposalRow = {
      id: 'proposal-chapter', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'chapters', title: 'Add a line', body: 'Reviews the note.', status: 'pending',
      version: 1, created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const payload = { note: 'Sleep mattered.', expectedUpdatedAt: '2026-07-22T12:00:00.000Z' };
    const operationRow = {
      id: 'operation-chapter', proposal_id: 'proposal-chapter', capability_id: 'chapters',
      operation_type: 'update_chapter_note', target_type: 'chapter', target_id: 'chapter-1',
      summary: 'Add a line', payload, idempotency_key: 'unified-chat:run-1:chapter:1', sequence: 1,
    };
    const { client, calls } = createClient([
      { data: proposalRow, error: null }, { data: operationRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createProposal({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'chapters',
      title: 'Add a line', body: 'Reviews the note.', permissionPolicy: { requiresExplicitApproval: true },
      operation: {
        type: 'update_chapter_note', targetId: 'chapter-1', expectedUpdatedAt: payload.expectedUpdatedAt,
        payload: { note: 'Sleep mattered.' }, summary: 'Add a line',
        idempotencyKey: 'unified-chat:run-1:chapter:1',
      },
    })).resolves.toMatchObject({
      id: 'proposal-chapter', capabilityId: 'chapters',
      operation: { type: 'update_chapter_note', targetId: 'chapter-1', payload },
    });
    expect(calls).toContainEqual({
      table: 'kwilt_agent_proposal_operations', method: 'insert',
      args: [expect.objectContaining({
        capability_id: 'chapters', operation_type: 'update_chapter_note',
        target_type: 'chapter', target_id: 'chapter-1', payload,
      })],
    });
  });

  test('decides a proposal through the atomic optimistic RPC', async () => {
    const { client } = createClient([{ data: { id: 'proposal-1', status: 'edited', version: 2 }, error: null }]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.decideProposal({
      proposalId: 'proposal-1', action: 'edit', expectedVersion: 1,
      patch: { scheduledDate: '2026-07-25' },
    })).resolves.toEqual({ id: 'proposal-1', status: 'edited', version: 2 });
    expect(client.rpc).toHaveBeenCalledWith('decide_kwilt_agent_proposal', {
      p_proposal_id: 'proposal-1', p_action: 'edit', p_expected_version: 1,
      p_patch: { scheduledDate: '2026-07-25' }, p_note: null,
    });
  });

  test('persists and optimistically advances a pending device action', async () => {
    const pendingRow = {
      id: 'client-action-1', thread_id: 'thread-1', run_id: 'run-1', message_id: 'message-2',
      capability_id: 'screenTime', action_type: 'configure_screen_time', target_type: null, target_id: null,
      title: 'Review Screen Time protection', consequence_summary: 'Review Apple authorization and enforcement.',
      payload: { setupIntent: 'settings_discovery' }, idempotency_key: 'run-1:client:1',
      status: 'pending_client_action', result: null, error_code: null, error_message: null,
      version: 1, presented_at: null, completed_at: null,
      created_at: '2026-07-23T12:00:00.000Z', updated_at: '2026-07-23T12:00:00.000Z',
    };
    const presentingRow = {
      ...pendingRow, status: 'presenting', version: 2, presented_at: '2026-07-23T12:01:00.000Z',
      updated_at: '2026-07-23T12:01:00.000Z',
    };
    const { client } = createClient([
      { data: pendingRow, error: null }, { data: presentingRow, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.createClientAction({
      threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'screenTime',
      actionType: 'configure_screen_time', title: 'Review Screen Time protection',
      consequenceSummary: 'Review Apple authorization and enforcement.',
      payload: { setupIntent: 'settings_discovery' }, idempotencyKey: 'run-1:client:1',
    })).resolves.toMatchObject({ id: 'client-action-1', status: 'pending_client_action', version: 1 });
    await expect(repository.transitionClientAction({
      actionId: 'client-action-1', fromStatus: 'pending_client_action', toStatus: 'presenting',
      expectedVersion: 1, presentedAt: '2026-07-23T12:01:00.000Z',
    })).resolves.toMatchObject({ status: 'presenting', version: 2 });
    expect(client.rpc).toHaveBeenCalledWith('transition_kwilt_agent_client_action', {
      p_action_id: 'client-action-1', p_from_status: 'pending_client_action',
      p_to_status: 'presenting', p_expected_version: 1, p_result: null,
      p_error_code: null, p_error_message: null,
      p_presented_at: '2026-07-23T12:01:00.000Z', p_completed_at: null,
    });
  });

  test('persists proposal apply transitions, authoritative receipt, and undo status', async () => {
    const receiptRow = {
      id: 'receipt-1', proposal_id: 'proposal-1', operation_id: 'operation-1', capability_id: 'todos',
      idempotency_key: 'unified-chat:run-1:1', status: 'applied', resulting_object_type: 'activity',
      resulting_object_id: 'activity-library', result_state: { title: 'Visit the library' },
      return_target: { name: 'MainTabs' }, undo_operation: { type: 'restore_activity' },
      applied_at: '2026-07-22T13:00:00.000Z', undone_at: null,
    };
    const { client } = createClient([
      { data: { status: 'applying', version: 3 }, error: null },
      { data: receiptRow, error: null },
      { data: { status: 'applied', version: 4 }, error: null },
      { data: { ...receiptRow, status: 'undone', undone_at: '2026-07-22T14:00:00.000Z' }, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.transitionProposalStatus({
      proposalId: 'proposal-1', fromStatus: 'approved', toStatus: 'applying', expectedVersion: 2,
    })).resolves.toEqual({ status: 'applying', version: 3 });
    expect(client.rpc).toHaveBeenCalledWith('transition_kwilt_agent_proposal', {
      p_proposal_id: 'proposal-1', p_from_status: 'approved', p_to_status: 'applying',
      p_expected_version: 2,
    });
    const receipt = await repository.persistMutationReceipt({
      threadId: 'thread-1', proposalId: 'proposal-1', operationId: 'operation-1',
      idempotencyKey: 'unified-chat:run-1:1', status: 'applied',
      resultingObjectType: 'activity', resultingObjectId: 'activity-library',
      resultState: { title: 'Visit the library' }, returnTarget: { name: 'MainTabs' },
      undoOperation: { type: 'restore_activity' }, appliedAt: '2026-07-22T13:00:00.000Z',
    });
    expect(receipt).toMatchObject({ id: 'receipt-1', canUndo: true, operationId: 'operation-1' });
    await expect(repository.transitionProposalStatus({
      proposalId: 'proposal-1', fromStatus: 'applying', toStatus: 'applied', expectedVersion: 3,
    })).resolves.toEqual({ status: 'applied', version: 4 });
    await expect(repository.markMutationReceiptUndone('receipt-1', '2026-07-22T14:00:00.000Z'))
      .resolves.toMatchObject({ status: 'undone', undoneAt: '2026-07-22T14:00:00.000Z' });
  });

  test('finalizes or fails only a previously reserved mutation receipt', async () => {
    const base = {
      id: 'receipt-1', proposal_id: 'proposal-1', operation_id: 'operation-1', capability_id: 'todos',
      idempotency_key: 'run-1:1', resulting_object_type: 'activity', resulting_object_id: 'activity-1',
      result_state: { title: 'Library' }, return_target: { name: 'MainTabs' }, undo_operation: null,
      applied_at: null, undone_at: null,
    };
    const { client, calls } = createClient([
      { data: { ...base, status: 'applied', applied_at: '2026-07-22T13:00:00.000Z' }, error: null },
      { data: { ...base, status: 'failed' }, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.finalizeMutationReceipt('receipt-1', {
      resultingObjectType: 'activity', resultingObjectId: 'activity-1',
      resultState: { title: 'Library' }, returnTarget: { name: 'MainTabs' },
      undoOperation: null, appliedAt: '2026-07-22T13:00:00.000Z',
    })).resolves.toMatchObject({ status: 'applied' });
    await expect(repository.failMutationReceipt('receipt-1', 'conflict', 'The To-do changed.'))
      .resolves.toMatchObject({ status: 'failed' });
    expect(calls.filter((call) => call.method === 'eq')).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'kwilt_agent_mutation_receipts', args: ['status', 'reserved'] }),
    ]));
  });
});

import {
  executeServerRelationshipTool,
  executeServerRelationshipUndo,
  normalizeRelationshipMemoryInput,
} from '../serverRelationshipTools';

function relationshipClient(rows: Record<string, unknown[]>) {
  const calls: Array<[string, string, ...unknown[]]> = [];
  const rpc = jest.fn(async () => ({
    data: {
      status: 'applied', personId: 'person-1', recordIds: ['memory-1', 'event-1'],
      receiptId: 'receipt-1', replayed: false,
    },
    error: null,
  }));
  return {
    calls,
    client: {
      from: jest.fn((table: string) => {
        const query: Record<string, unknown> = {};
        for (const method of ['select', 'eq', 'order']) {
          query[method] = (...args: unknown[]) => {
            calls.push([table, method, ...args]);
            return query;
          };
        }
        query.limit = async (...args: unknown[]) => {
          calls.push([table, 'limit', ...args]);
          return { data: rows[table] ?? [], error: null };
        };
        query.maybeSingle = async () => ({ data: rows[table]?.[0] ?? null, error: null });
        return query;
      }),
      rpc,
    },
  };
}

function relationshipManagementClient(result: Record<string, unknown>) {
  const rpc = jest.fn(async () => ({ data: result, error: null }));
  return { from: jest.fn(), rpc };
}

test('normalizes one-person relationship memory without accepting extra or unbounded fields', () => {
  expect(normalizeRelationshipMemoryInput({
    personName: '  Lily ', aliases: ['Lil'],
    memories: [{ kind: 'preference', text: ' likes dragons ' }],
    events: [{ kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12' }],
    cadences: [],
  })).toEqual({
    personName: 'Lily', aliases: ['Lil'],
    memories: [{ kind: 'preference', text: 'likes dragons' }],
    events: [{ kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12', startsAt: null, timeZone: null }],
    cadences: [],
  });
  expect(normalizeRelationshipMemoryInput({ personName: 'Lily', email: 'private@example.com' })).toBeNull();
  expect(normalizeRelationshipMemoryInput({ personName: 'Lily', memories: [] })).toBeNull();
});

test('reads bounded People Memory Event and Cadence records under the exact owner', async () => {
  const { client, calls } = relationshipClient({
    kwilt_phone_agent_people: [{ id: 'person-1', display_name: 'Lily', status: 'active', updated_at: 'person-v1' }],
    kwilt_phone_agent_memory_items: [{ id: 'memory-1', person_id: 'person-1', kind: 'preference', text: 'likes dragons', updated_at: 'memory-v1' }],
    kwilt_phone_agent_events: [{ id: 'event-1', person_id: 'person-1', kind: 'birthday', title: "Lily's birthday", date_text: 'Oct 12', starts_at: null, timezone: null, updated_at: 'event-v1' }],
    kwilt_phone_agent_cadences: [],
  });
  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: { id: 'read-relationships', toolId: 'relationships.read', arguments: {} },
  })).resolves.toMatchObject({
    status: 'completed',
    output: {
      people: [{ id: 'person-1', displayName: 'Lily', updatedAt: 'person-v1' }],
      memories: [{ id: 'memory-1', personId: 'person-1', personName: 'Lily', kind: 'preference', text: 'likes dragons', updatedAt: 'memory-v1' }],
      events: [{ id: 'event-1', personId: 'person-1', personName: 'Lily', kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12', startsAt: null, timeZone: null, updatedAt: 'event-v1' }],
      cadences: [],
    },
  });
  expect(calls.filter((call) => call[1] === 'eq')).toEqual(expect.arrayContaining([
    ['kwilt_phone_agent_people', 'eq', 'user_id', 'user-1'],
    ['kwilt_phone_agent_memory_items', 'eq', 'user_id', 'user-1'],
  ]));
});

test('applies explicit relationship memory through one receipt-safe service RPC', async () => {
  const { client } = relationshipClient({});
  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: {
      id: 'remember-lily', toolId: 'relationships.remember', arguments: {
        personName: 'Lily', aliases: [],
        memories: [{ kind: 'preference', text: 'likes dragons' }],
        events: [{ kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12' }],
        cadences: [],
      },
    },
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toEqual({
    status: 'completed',
    output: { personId: 'person-1', recordIds: ['memory-1', 'event-1'], replayed: false },
    receipt: { id: 'receipt-1', status: 'applied', resultingObjectType: 'relationship_memory', resultingObjectId: 'person-1' },
  });
  expect(client.rpc).toHaveBeenCalledWith('remember_kwilt_agent_relationship', {
    p_user_id: 'user-1', p_thread_id: 'thread-1', p_run_id: 'run-1',
    p_message_id: 'message-1', p_call_id: 'remember-lily',
    p_payload: {
      personName: 'Lily', aliases: [],
      memories: [{ kind: 'preference', text: 'likes dragons' }],
      events: [{ kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12', startsAt: null, timeZone: null }],
      cadences: [],
    },
  });
});

test('refuses implicit relationship persistence without a valid structured fact', async () => {
  const { client } = relationshipClient({});
  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: { id: 'remember', toolId: 'relationships.remember', arguments: { personName: 'Lily', memories: [] } },
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_relationship_memory' });
  expect(client.rpc).not.toHaveBeenCalled();
});

test('corrects one versioned relationship record through the shared receipt transaction', async () => {
  const client = relationshipManagementClient({
    status: 'applied', recordType: 'event', recordId: 'event-1', receiptId: 'receipt-2', replayed: false,
  });
  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: {
      id: 'correct-birthday', toolId: 'relationships.correct', arguments: {
        recordType: 'event', recordId: 'event-1', expectedUpdatedAt: '2026-07-23T12:00:00.000Z',
        fields: { dateText: 'Oct 14', title: "Lily's birthday" },
      },
    },
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toEqual({
    status: 'completed',
    output: { recordType: 'event', recordId: 'event-1', replayed: false },
    receipt: { id: 'receipt-2', status: 'applied', resultingObjectType: 'relationship_event', resultingObjectId: 'event-1' },
  });
  expect(client.rpc).toHaveBeenCalledWith('manage_kwilt_agent_relationship', {
    p_user_id: 'user-1', p_thread_id: 'thread-1', p_run_id: 'run-1', p_message_id: 'message-1',
    p_call_id: 'correct-birthday', p_action: 'correct', p_record_type: 'event', p_record_id: 'event-1',
    p_expected_updated_at: '2026-07-23T12:00:00.000Z',
    p_fields: { dateText: 'Oct 14', title: "Lily's birthday" },
  });
});

test('forgets a versioned relationship record without accepting an unbounded target', async () => {
  const client = relationshipManagementClient({
    status: 'applied', recordType: 'memory', recordId: 'memory-1', receiptId: 'receipt-3', replayed: false,
  });
  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: {
      id: 'forget-memory', toolId: 'relationships.forget', arguments: {
        recordType: 'memory', recordId: 'memory-1', expectedUpdatedAt: '2026-07-23T12:00:00.000Z',
      },
    },
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toMatchObject({
    status: 'completed', output: { recordType: 'memory', recordId: 'memory-1' },
  });
  expect(client.rpc).toHaveBeenCalledWith('manage_kwilt_agent_relationship', expect.objectContaining({
    p_action: 'forget', p_record_type: 'memory', p_record_id: 'memory-1', p_fields: {},
  }));

  client.rpc.mockClear();
  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: {
      id: 'forget-unknown', toolId: 'relationships.forget', arguments: {
        recordType: 'everything', recordId: 'memory-1', expectedUpdatedAt: '2026-07-23T12:00:00.000Z',
      },
    },
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_relationship_management' });
  expect(client.rpc).not.toHaveBeenCalled();

  await expect(executeServerRelationshipTool({
    client, userId: 'user-1',
    call: {
      id: 'forget-person', toolId: 'relationships.forget', arguments: {
        recordType: 'person', recordId: 'person-1', expectedUpdatedAt: '2026-07-23T12:00:00.000Z',
      },
    },
    writeContext: { threadId: 'thread-1', runId: 'run-1', messageId: 'message-1' },
  })).resolves.toMatchObject({ status: 'failed', code: 'invalid_relationship_management' });
  expect(client.rpc).not.toHaveBeenCalled();
});

test('undoes one owner-scoped relationship receipt through the atomic restore RPC', async () => {
  const client = relationshipManagementClient({
    status: 'undone', receiptId: 'receipt-3', proposalId: 'proposal-3',
    undoneAt: '2026-07-23T20:00:00.000Z', replayed: false,
  });
  await expect(executeServerRelationshipUndo({
    client, userId: 'user-1', receiptId: 'receipt-3',
  })).resolves.toEqual({
    receiptId: 'receipt-3', proposalId: 'proposal-3',
    undoneAt: '2026-07-23T20:00:00.000Z', replayed: false,
  });
  expect(client.rpc).toHaveBeenCalledWith('undo_kwilt_agent_relationship', {
    p_user_id: 'user-1', p_receipt_id: 'receipt-3',
  });
});

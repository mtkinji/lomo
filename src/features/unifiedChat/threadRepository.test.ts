import { createUnifiedChatRepository, UnifiedChatAuthError } from './threadRepository';

type Result = { data?: unknown; error?: { message: string } | null };

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
    update(...args: unknown[]) { return this.record('update', args); }
    eq(...args: unknown[]) { return this.record('eq', args); }
    order(...args: unknown[]) { return this.record('order', args); }
    limit(...args: unknown[]) { return this.record('limit', args); }

    async single() {
      this.record('single', []);
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
      from: jest.fn((table: string) => new Query(table)),
    },
  };
}

const threadRow = {
  id: 'thread-1',
  title: 'Plan my week',
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
      { data: [runRow], error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    const aggregate = await repository.loadThread('thread-1');

    expect(aggregate.messages[0]?.body).toBe('What matters this week?');
    expect(aggregate.runs[0]?.status).toBe('active');
    expect(calls).toContainEqual({
      table: 'kwilt_agent_messages',
      method: 'order',
      args: ['created_at', { ascending: true }],
    });
  });

  test('inserts a message then touches the parent thread', async () => {
    const { client, calls } = createClient([
      { data: messageRow, error: null },
      { data: null, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    const message = await repository.insertMessage({
      threadId: 'thread-1',
      role: 'user',
      body: 'What matters this week?',
      clientRequestId: 'request-1',
    });

    expect(message.id).toBe('message-1');
    expect(calls.filter((call) => call.table === 'kwilt_agent_threads')).toEqual(
      expect.arrayContaining([expect.objectContaining({ method: 'update' })]),
    );
  });

  test('renames and archives a thread with explicit status timestamps', async () => {
    const archived = {
      ...threadRow,
      title: 'A clearer title',
      status: 'archived',
      archived_at: '2026-07-21T12:00:00.000Z',
    };
    const { client } = createClient([
      { data: { ...threadRow, title: 'A clearer title' }, error: null },
      { data: archived, error: null },
    ]);
    const repository = createUnifiedChatRepository(client as never);

    await expect(repository.renameThread('thread-1', 'A clearer title')).resolves.toMatchObject({
      title: 'A clearer title',
    });
    await expect(repository.archiveThread('thread-1')).resolves.toMatchObject({
      status: 'archived',
    });
  });

  test('creates and completes a durable run', async () => {
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

    await expect(repository.createRun({ threadId: 'thread-1', userMessageId: 'message-1' }))
      .resolves.toMatchObject({ status: 'active' });
    await expect(repository.updateRun('run-1', {
      status: 'complete',
      assistantMessageId: 'message-2',
      completedAt: '2026-07-21T12:00:00.000Z',
    })).resolves.toMatchObject({ status: 'complete' });
  });
});

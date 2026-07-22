import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { UnifiedChatThreadAggregate } from './types';

const startingAggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1',
    title: 'New chat',
    status: 'active',
    archivedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
  messages: [],
  runs: [],
};

function dependencies(sender: jest.Mock = jest.fn(async () => 'A grounded answer')) {
  const order: string[] = [];
  const repository = {
    insertMessage: jest.fn(async (input: { role: 'user' | 'assistant'; body: string }) => {
      order.push(`message:${input.role}`);
      return {
        id: input.role === 'user' ? 'message-user' : 'message-assistant',
        threadId: 'thread-1',
        role: input.role,
        body: input.body,
        feedback: null,
        createdAt: '2026-07-21T11:00:00.000Z',
        updatedAt: '2026-07-21T11:00:00.000Z',
      };
    }),
    createRun: jest.fn(async () => {
      order.push('run:active');
      return {
        id: 'run-1',
        threadId: 'thread-1',
        userMessageId: 'message-user',
        assistantMessageId: null,
        status: 'active' as const,
        errorCode: null,
        errorMessage: null,
        createdAt: '2026-07-21T11:00:00.000Z',
        updatedAt: '2026-07-21T11:00:00.000Z',
        completedAt: null,
      };
    }),
    updateRun: jest.fn(async (_id: string, input: { status: string }) => {
      order.push(`run:${input.status}`);
      return {};
    }),
    loadThread: jest.fn(async () => ({
      ...startingAggregate,
      messages: [],
      runs: [],
    })),
  };
  const send = jest.fn(async (...args: unknown[]) => {
    order.push('send');
    return sender(...args);
  });
  return { order, repository, send };
}

describe('runUnifiedChatTurn', () => {
  test('persists user, run, response, and completion in order', async () => {
    const { order, repository, send } = dependencies();
    const onRunStarted = jest.fn((aggregate: UnifiedChatThreadAggregate) => {
      order.push('run:reported');
      expect(aggregate.messages).toEqual([
        expect.objectContaining({ id: 'message-user', body: 'What matters this week?' }),
      ]);
      expect(aggregate.runs).toEqual([
        expect.objectContaining({ id: 'run-1', status: 'active' }),
      ]);
    });

    await runUnifiedChatTurn(
      {
        aggregate: startingAggregate,
        prompt: 'What matters this week?',
        clientRequestId: 'request-1',
        onRunStarted,
      },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(order).toEqual([
      'message:user',
      'run:active',
      'run:reported',
      'send',
      'message:assistant',
      'run:complete',
    ]);
    expect(onRunStarted).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      [expect.objectContaining({ role: 'user', content: 'What matters this week?' })],
      expect.objectContaining({ aiJob: 'default_chat', workflowInstanceId: 'thread-1' }),
    );
  });

  test('marks the run failed while preserving the durable user message', async () => {
    const failingSender = jest.fn(async () => {
      throw new Error('network secret detail');
    });
    const { order, repository, send } = dependencies(failingSender);

    await expect(
      runUnifiedChatTurn(
        { aggregate: startingAggregate, prompt: 'Help', clientRequestId: 'request-2' },
        { repository: repository as never, sendCoachChat: send as never },
      ),
    ).rejects.toThrow('Kwilt could not finish that response.');

    expect(order).toEqual(['message:user', 'run:active', 'send', 'run:failed']);
    expect(repository.updateRun).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'failed', errorCode: 'response_failed' }),
    );
    expect(JSON.stringify(repository.updateRun.mock.calls)).not.toContain('network secret');
  });

  test('refuses a second send while a run is active', async () => {
    const { repository, send } = dependencies();
    const activeAggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      runs: [
        {
          id: 'run-active',
          threadId: 'thread-1',
          userMessageId: 'message-0',
          assistantMessageId: null,
          status: 'active',
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-07-21T10:00:00.000Z',
          updatedAt: '2026-07-21T10:00:00.000Z',
          completedAt: null,
        },
      ],
    };

    await expect(
      runUnifiedChatTurn(
        { aggregate: activeAggregate, prompt: 'Another request' },
        { repository: repository as never, sendCoachChat: send as never },
      ),
    ).rejects.toThrow('A response is already in progress.');
    expect(repository.insertMessage).not.toHaveBeenCalled();
  });
});

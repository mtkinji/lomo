import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';
import type { Activity, Goal } from '../../domain/types';

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
    insertMessage: jest.fn(async (input: CreateUnifiedChatMessageInput) => {
      order.push(`message:${input.role}`);
      return {
        id: input.role === 'user' ? 'message-user' : 'message-assistant',
        threadId: 'thread-1',
        role: input.role,
        body: input.body,
        feedback: null,
        createdAt: '2026-07-21T11:00:00.000Z',
        updatedAt: '2026-07-21T11:00:00.000Z',
        attachments: input.attachments?.map((attachment) => ({
          ...attachment,
          messageId: 'message-user',
          createdAt: '2026-07-21T11:00:00.000Z',
        })) ?? [],
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
        requestClass: 'general' as const,
        participatingCapabilities: [],
        contextPolicy: {},
        version: 1,
        stopRequestedAt: null,
        steerCount: 0,
      };
    }),
    appendRunEvents: jest.fn(async (_input: unknown) => {
      order.push('events:append');
    }),
    persistRunEvidence: jest.fn(async (_input: unknown) => {
      order.push('evidence:persist');
    }),
    createProposal: jest.fn(async () => {
      order.push('proposal:persist');
      return { id: 'proposal-1', status: 'pending' };
    }),
    transitionRunStatus: jest.fn(async (input: { toStatus: string }) => {
      order.push(`run:${input.toStatus}`);
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

const structuredGroundedAnswer = JSON.stringify({
  answer: 'A smaller next move is available.',
  facts: ['The attached record is current.'],
  inference: 'Starting smaller may make follow-through easier.',
  uncertainty: 'Kwilt did not inspect capabilities outside this request.',
});

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
      'events:append',
      'evidence:persist',
      'send',
      'message:assistant',
      'run:complete',
    ]);
    expect(onRunStarted).toHaveBeenCalledTimes(1);
    expect(repository.createRun).toHaveBeenCalledWith({
      threadId: 'thread-1',
      userMessageId: 'message-user',
      requestClass: 'general',
      participatingCapabilities: [],
      contextPolicy: {
        usePrivateContext: false,
        reason: 'general-answer-without-private-context',
        clarification: null,
      },
    });
    expect(send).toHaveBeenCalledWith(
      [expect.objectContaining({ role: 'user', content: 'What matters this week?' })],
      expect.objectContaining({
        aiJob: 'default_chat',
        workflowInstanceId: 'thread-1',
        includeUserProfileContext: false,
      }),
    );
  });

  test('loads, persists, and sends only bounded evidence from participating capabilities', async () => {
    const { order, repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));
    const goal: Goal = {
      id: 'goal-reading',
      arcId: null,
      title: 'Read together every evening',
      description: 'Make calm family time before bed.',
      status: 'in_progress',
      forceIntent: {},
      metrics: [],
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-07-21T12:00:00.000Z',
    };
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [goal] },
      todos: { activities: [], goals: [goal] },
      chapters: { chapters: [] },
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Which of my goals is about family reading?' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        loadCapabilitySnapshots,
      },
    );

    expect(loadCapabilitySnapshots).toHaveBeenCalledWith(['goals']);
    expect(repository.persistRunEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-1',
        runId: 'run-1',
        evidence: [
          expect.objectContaining({
            capabilityId: 'goals',
            objectId: 'goal-reading',
            selectionStatus: 'included',
            authority: 'authoritative',
          }),
        ],
      }),
    );
    const sendOptions = send.mock.calls[0]?.[1] as { launchContextSummary?: string };
    expect(sendOptions.launchContextSummary).toContain('Read together every evening');
    expect(order.indexOf('evidence:persist')).toBeLessThan(order.indexOf('send'));
  });

  test('does not load or attach private capability data for a general question', async () => {
    const { repository, send } = dependencies();
    const loadCapabilitySnapshots = jest.fn();

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Why is the sky blue?' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        loadCapabilitySnapshots,
      },
    );

    expect(loadCapabilitySnapshots).not.toHaveBeenCalled();
    expect(repository.persistRunEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ evidence: [] }),
    );
    const sendOptions = send.mock.calls[0]?.[1] as { launchContextSummary?: string };
    expect(sendOptions.launchContextSummary).not.toContain('goal');
  });

  test('persists explicit text attachments and uses their complete content for that request only', async () => {
    const { repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));

    await runUnifiedChatTurn(
      {
        aggregate: startingAggregate,
        prompt: 'What conflicts do you see?',
        clientRequestId: 'request-with-document',
        attachments: [{
          id: 'local-1',
          name: 'week.md',
          mimeType: 'text/markdown',
          sizeBytes: 32,
          content: 'Monday: dentist\nMonday: school meeting',
        }],
      },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: 'user',
      body: 'What conflicts do you see?',
      attachments: [expect.objectContaining({ id: 'local-1', name: 'week.md' })],
    }));
    const history = send.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    expect(history.at(-1)?.content).toBe('What conflicts do you see?');
    expect(history.at(-1)?.content).not.toContain('dentist');
    const options = send.mock.calls[0]?.[1] as {
      launchContextSummary?: string;
      responseFormat?: Record<string, unknown>;
    };
    expect(options.launchContextSummary).toContain('week.md');
    expect(options.launchContextSummary).toContain('Monday: dentist');
    expect(options.launchContextSummary).toContain('untrusted user-supplied content');
    expect(options.responseFormat).toBeDefined();
  });

  test('uses a visibly attached object only when the prompt refers to it', async () => {
    const { repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));
    const goal: Goal = {
      id: 'goal-reading', arcId: null, title: 'Read together every evening',
      description: 'Make calm family time before bed.', status: 'in_progress',
      forceIntent: {}, metrics: [], createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-07-21T12:00:00.000Z',
    };
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [goal] }, todos: { activities: [], goals: [goal] }, chapters: { chapters: [] },
    }));
    const contextualAggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      contextRefs: [{
        id: 'context-1', threadId: 'thread-1', capabilityId: 'goals', objectType: 'goal',
        objectId: 'goal-reading', label: goal.title, secondaryLabel: null, source: 'launch',
        active: true, returnTarget: { name: 'MainTabs' }, version: 1,
      }],
    };

    await runUnifiedChatTurn(
      { aggregate: contextualAggregate, prompt: 'What is one realistic next move for this?' },
      { repository: repository as never, sendCoachChat: send as never, loadCapabilitySnapshots },
    );

    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      requestClass: 'general_with_kwilt_context', participatingCapabilities: ['goals'],
      contextPolicy: expect.objectContaining({ usePrivateContext: true }),
    }));
    expect(repository.persistRunEvidence).toHaveBeenCalledWith(expect.objectContaining({
      evidence: [expect.objectContaining({
        objectId: 'goal-reading', selectionReason: 'Visible context explicitly attached to this request.',
      })],
    }));
    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: 'assistant', body: expect.stringContaining('What Kwilt found'),
    }));
  });

  test('turns a capability action into a pending typed proposal without applying it', async () => {
    const structuredSender = jest.fn(async () => JSON.stringify({
      answer: 'I drafted the move for you to review.',
      proposal: {
        title: 'Move library visit',
        body: 'Changes the scheduled date to July 25.',
        operation: {
          type: 'update_activity',
          targetId: 'activity-library',
          expectedUpdatedAt: '2026-07-21T13:00:00.000Z',
          payload: { scheduledDate: '2026-07-25' },
        },
      },
    }));
    const { repository } = dependencies(structuredSender);
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [] },
      todos: {
        goals: [],
        activities: [{
          id: 'activity-library', goalId: null, title: 'Visit the library', type: 'task',
          tags: ['errands'], status: 'planned', forceActual: {},
          createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-21T13:00:00.000Z',
        } satisfies Activity],
      },
      chapters: { chapters: [] },
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Move my library errand to Friday.' },
      { repository: repository as never, sendCoachChat: structuredSender as never, loadCapabilitySnapshots },
    );

    expect(structuredSender).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        responseFormat: expect.objectContaining({ type: 'json_schema' }),
        launchContextSummary: expect.stringMatching(
          /native Quick Add pipeline[\s\S]*targetId=activity-library; expectedUpdatedAt=2026-07-21T13:00:00.000Z/,
        ),
      }),
    );
    const updateCalls = structuredSender.mock.calls as unknown as Array<[
      unknown,
      { launchContextSummary?: string },
    ]>;
    const updateOptions = updateCalls[0]?.[1];
    expect(updateOptions.launchContextSummary).toContain('never ask which app or system owns the To-do');
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'todos',
      title: 'Move library visit',
      permissionPolicy: { requiresExplicitApproval: true },
      operation: expect.objectContaining({
        type: 'update_activity', targetId: 'activity-library', idempotencyKey: 'unified-chat:run-1:1',
      }),
    }));
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1', fromStatus: 'active', toStatus: 'complete', expectedVersion: 1,
      event: expect.objectContaining({ type: 'response', status: 'complete' }),
    }));
  });

  test('guarantees a create proposal for ordinary name-only capture even when the model asks a question', async () => {
    const sender = jest.fn(async () => JSON.stringify({
      answer: 'Would you like that in a shopping list?',
      proposal: null,
    }));
    const { repository, send } = dependencies(sender);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Add milk' },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Add milk',
      operation: expect.objectContaining({
        type: 'create_activity',
        targetId: null,
        payload: expect.objectContaining({ title: 'milk', status: 'planned' }),
      }),
    }));
  });

  test('answers an ownerless action with the deterministic clarification instead of claiming a change', async () => {
    const sender = jest.fn(async () => 'Done.');
    const { repository, send } = dependencies(sender);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Change it for me.' },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(sender).not.toHaveBeenCalled();
    expect(repository.createProposal).not.toHaveBeenCalled();
    expect(repository.insertMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      role: 'assistant',
      body: 'What would you like Kwilt to change?',
    }));
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'complete',
      event: expect.objectContaining({ label: 'Clarification needed' }),
    }));
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

    expect(order).toEqual([
      'message:user',
      'run:active',
      'events:append',
      'evidence:persist',
      'send',
      'run:failed',
    ]);
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1', fromStatus: 'active', toStatus: 'failed', expectedVersion: 1,
      errorCode: 'model_response_failed',
      event: expect.objectContaining({ type: 'response', status: 'failed' }),
    }));
    expect(JSON.stringify(repository.transitionRunStatus.mock.calls)).not.toContain('network secret');
  });

  test('records a safe validation stage when an action response cannot produce a proposal', async () => {
    const { repository, send } = dependencies(
      jest.fn(async () => JSON.stringify({ answer: 'Done.' })),
    );

    await expect(runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Create a To-do for Friday.' },
      { repository: repository as never, sendCoachChat: send as never },
    )).rejects.toThrow('Kwilt could not finish that response.');

    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'failed',
      errorCode: 'action_response_invalid',
    }));
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
          requestClass: 'general',
          participatingCapabilities: [],
          contextPolicy: { usePrivateContext: false, reason: 'general-answer-without-private-context', clarification: null },
          version: 1,
          stopRequestedAt: null,
          steerCount: 0,
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

  test('aborts an active model request and durably stops the run', async () => {
    const controller = new AbortController();
    const sender = jest.fn(async (_history: unknown, options: { signal?: AbortSignal }) => {
      expect(options.signal).toBe(controller.signal);
      controller.abort();
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    const { repository, send } = dependencies(sender);
    const turn = runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Help me plan', signal: controller.signal },
      { repository: repository as never, sendCoachChat: send as never },
    );
    await expect(turn).rejects.toThrow('Response stopped.');
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1', fromStatus: 'active', toStatus: 'stopped', expectedVersion: 1,
      errorCode: null, errorMessage: null,
      stopRequestedAt: expect.any(String),
    }));
  });

  test('records a steer instruction and closes the interrupted run as steered', async () => {
    const controller = new AbortController();
    const sender = jest.fn(async () => {
      controller.abort();
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    const { repository, send } = dependencies(sender);

    await expect(runUnifiedChatTurn(
      {
        aggregate: startingAggregate,
        prompt: 'Help me plan',
        signal: controller.signal,
        abortDisposition: () => ({ type: 'steer', prompt: 'Focus only on Friday.' }),
      },
      { repository: repository as never, sendCoachChat: send as never },
    )).rejects.toThrow('Response steered.');

    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1', fromStatus: 'active', toStatus: 'steered', expectedVersion: 1,
      steerCount: 1,
    }));
    expect(repository.transitionRunStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      event: expect.objectContaining({
        type: 'instruction', label: 'Direction updated',
        payload: { prompt: 'Focus only on Friday.' },
      }),
    }));
  });

  test('retries a failed run from its durable user message without inserting it twice', async () => {
    const failedMessage = {
      id: 'message-user', threadId: 'thread-1', role: 'user' as const, body: 'Help me plan',
      feedback: null, createdAt: '2026-07-21T11:00:00.000Z', updatedAt: '2026-07-21T11:00:00.000Z',
      attachments: [],
    };
    const failedAggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      messages: [failedMessage],
      runs: [{
        id: 'run-failed', threadId: 'thread-1', userMessageId: failedMessage.id,
        assistantMessageId: null, status: 'failed', errorCode: 'response_failed',
        errorMessage: 'Kwilt could not finish that response.', requestClass: 'general',
        participatingCapabilities: [], contextPolicy: { usePrivateContext: false, reason: 'general-answer-without-private-context', clarification: null },
        version: 2, stopRequestedAt: null, steerCount: 0,
        createdAt: '2026-07-21T11:00:00.000Z', updatedAt: '2026-07-21T11:00:01.000Z',
        completedAt: '2026-07-21T11:00:01.000Z',
      }],
    };
    const { repository, send } = dependencies();

    await runUnifiedChatTurn(
      { aggregate: failedAggregate, prompt: failedMessage.body, retryRunId: 'run-failed' },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(repository.insertMessage).toHaveBeenCalledTimes(1);
    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant' }));
    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({ userMessageId: failedMessage.id }));
    expect(send.mock.calls[0]?.[0]).toEqual([
      { role: 'user', content: failedMessage.body },
    ]);
  });
});

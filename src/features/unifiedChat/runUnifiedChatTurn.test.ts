import { buildAppControlOutcome, runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';
import type { Activity, Goal } from '../../domain/types';

const startingAggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1',
    title: 'New chat',
    titleSource: 'default',
    status: 'active',
    archivedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
  },
  messages: [],
  runs: [],
};

describe('buildAppControlOutcome', () => {
  test('normalizes a conversational turn around its authoritative result', () => {
    expect(buildAppControlOutcome({ text: 'Here is tomorrow.', proposalIds: [], receiptIds: [], clientActionIds: [] }))
      .toEqual({ type: 'answer', text: 'Here is tomorrow.' });
    expect(buildAppControlOutcome({ text: 'Ready.', proposalIds: ['proposal-1'], receiptIds: [], clientActionIds: [] }))
      .toEqual({ type: 'review', proposalIds: ['proposal-1'] });
    expect(buildAppControlOutcome({ text: 'Done.', proposalIds: [], receiptIds: ['receipt-1'], clientActionIds: [] }))
      .toEqual({ type: 'applied', receiptIds: ['receipt-1'] });
    expect(buildAppControlOutcome({ text: 'Continue.', proposalIds: [], receiptIds: [], clientActionIds: ['action-1'] }))
      .toEqual({ type: 'native_handoff', actionId: 'action-1' });
  });
});

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
    createProposal: jest.fn(async (_input: unknown) => {
      order.push('proposal:persist');
      return { id: 'proposal-1', status: 'pending' };
    }),
    createClientAction: jest.fn(async () => {
      order.push('client-action:persist');
      return { id: 'client-action-1', status: 'pending_client_action' };
    }),
    decideProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'rejected' as const, version: 2 })),
    transitionClientAction: jest.fn(async () => ({ id: 'client-action-1', status: 'declined' as const, version: 2 })),
    transitionRunStatus: jest.fn(async (input: { toStatus: string }) => {
      order.push(`run:${input.toStatus}`);
      return {};
    }),
    loadThread: jest.fn(async () => ({
      ...startingAggregate,
      messages: [],
      runs: [],
    })),
    applyGeneratedThreadTitle: jest.fn(async (_threadId: string, title: string) => ({
      ...startingAggregate.thread,
      title,
      titleSource: 'generated' as const,
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
  test('persists a confident semantic route before loading bounded evidence', async () => {
    const { repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));
    const routeRequest = jest.fn(async () => ({
      requestClass: 'capability_question' as const,
      participatingCapabilities: ['plan' as const],
      usePrivateContext: true,
      confidence: 0.93,
      reason: 'The user wants a less crowded plan tomorrow.',
    }));
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [] },
      todos: { activities: [], goals: [] },
      chapters: { chapters: [] },
      plan: {
        targetDate: '2026-07-24T18:00:00.000Z',
        writeCalendarRef: null,
        limitation: 'no_write_calendar' as const,
        recommendations: [],
      },
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Could tomorrow feel less crowded?' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        routeRequest,
        loadCapabilitySnapshots,
      },
    );

    expect(routeRequest).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'Could tomorrow feel less crowded?',
      visibleContext: [],
    }));
    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      contextPolicy: expect.objectContaining({
        usePrivateContext: true,
        reason: 'semantic-route:The user wants a less crowded plan tomorrow.',
      }),
    }));
    expect(loadCapabilitySnapshots).toHaveBeenCalledWith(
      ['plan'],
      { prompt: 'Could tomorrow feel less crowded?' },
    );
  });

  test('falls back to deterministic routing when the semantic helper is unavailable', async () => {
    const { repository, send } = dependencies();
    const routeRequest = jest.fn(async () => null);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Why is the sky blue?' },
      { repository: repository as never, sendCoachChat: send as never, routeRequest },
    );

    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      requestClass: 'general',
      participatingCapabilities: [],
      contextPolicy: expect.objectContaining({ reason: 'general-answer-without-private-context' }),
    }));
  });

  test('carries Plan scope into a short answer to the assistant scheduling clarification', async () => {
    const { repository, send } = dependencies();
    const aggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      messages: [{
        id: 'assistant-before', threadId: 'thread-1', role: 'assistant',
        body: 'Tell me how large the window should be and I’ll place it.',
        feedback: null, createdAt: '2026-07-21T10:30:00.000Z',
        updatedAt: '2026-07-21T10:30:00.000Z', attachments: [],
      }],
      runs: [{
        id: 'run-before', threadId: 'thread-1', userMessageId: 'user-before',
        assistantMessageId: 'assistant-before', status: 'complete', errorCode: null,
        errorMessage: null, createdAt: '2026-07-21T10:20:00.000Z',
        updatedAt: '2026-07-21T10:30:00.000Z', completedAt: '2026-07-21T10:30:00.000Z',
        requestClass: 'capability_question', participatingCapabilities: ['plan'],
        contextPolicy: {
          usePrivateContext: true,
          reason: 'day-plan-recommendation',
          clarification: null,
        }, version: 2,
        stopRequestedAt: null, steerCount: 0,
      }],
    };
    const routeRequest = jest.fn(async () => ({
      requestClass: 'general' as const,
      participatingCapabilities: [],
      usePrivateContext: false,
      confidence: 0.94,
      reason: 'This looks like a general response.',
    }));

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Two hours early afternoon' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        routeRequest,
        enableRuntimeTools: false,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] },
          todos: { activities: [], goals: [] },
          chapters: { chapters: [] },
          plan: {
            targetDate: '2026-07-24T18:00:00.000Z',
            writeCalendarRef: null,
            limitation: 'no_write_calendar' as const,
            recommendations: [],
          },
        }),
      },
    );

    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      requestClass: 'capability_action',
      participatingCapabilities: ['plan'],
      contextPolicy: expect.objectContaining({
        usePrivateContext: true,
        reason: 'conversation-follow-up:plan',
      }),
    }));
  });

  test('hydrates the durable conversation before routing when the visible aggregate is stale', async () => {
    const { repository, send } = dependencies();
    const durableAggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      messages: [{
        id: 'assistant-before', threadId: 'thread-1', role: 'assistant',
        body: 'For an item that still needs time, tell me the duration or window and I’ll prepare the placement.',
        feedback: null, createdAt: '2026-07-21T10:30:00.000Z',
        updatedAt: '2026-07-21T10:30:00.000Z', attachments: [],
      }],
      runs: [{
        id: 'run-before', threadId: 'thread-1', userMessageId: 'user-before',
        assistantMessageId: 'assistant-before', status: 'complete', errorCode: null,
        errorMessage: null, createdAt: '2026-07-21T10:20:00.000Z',
        updatedAt: '2026-07-21T10:30:00.000Z', completedAt: '2026-07-21T10:30:00.000Z',
        requestClass: 'capability_question', participatingCapabilities: ['plan'],
        contextPolicy: {
          usePrivateContext: true,
          reason: 'day-plan-recommendation',
          clarification: null,
        }, version: 2,
        stopRequestedAt: null, steerCount: 0,
      }],
    };
    const routeRequest = jest.fn(async () => ({
      requestClass: 'capability_action' as const,
      participatingCapabilities: [],
      usePrivateContext: false,
      confidence: 0.94,
      reason: 'The short reply looks actionable but has no independently named owner.',
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Two hours early afternoon' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        routeRequest,
        loadCurrentAggregate: async () => durableAggregate,
        enableRuntimeTools: false,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] },
          chapters: { chapters: [] },
          plan: {
            targetDate: '2026-07-24T18:00:00.000Z', writeCalendarRef: null,
            limitation: 'no_write_calendar' as const, recommendations: [],
          },
        }),
      },
    );

    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      requestClass: 'capability_action',
      participatingCapabilities: ['plan'],
      contextPolicy: expect.objectContaining({ reason: 'conversation-follow-up:plan' }),
    }));
  });

  test('uses the durable Plan referent when a follow-up model first selects an easier lower priority', async () => {
    const priorityOne: Activity = {
      id: 'priority-one', goalId: null, title: 'Finish the walnut glue-up', type: 'task', tags: [],
      status: 'planned', forceActual: {}, createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-23T10:00:00.000Z',
    };
    const priorityTwo: Activity = {
      ...priorityOne, id: 'priority-two', title: 'Draft the Places strategy',
      updatedAt: '2026-07-23T10:05:00.000Z',
    };
    const referent = {
      schemaVersion: 1 as const, capabilityId: 'plan' as const, kind: 'awaiting_placement' as const,
      activityId: priorityOne.id, expectedUpdatedAt: priorityOne.updatedAt, title: priorityOne.title,
      targetDate: '2026-07-24T12:00:00.000Z', priorityPosition: 0,
    };
    const durableAggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      messages: [{
        id: 'assistant-before', threadId: 'thread-1', role: 'assistant',
        body: 'Priority 1 still needs time. Tell me the duration or window and I’ll prepare the placement.',
        feedback: null, createdAt: '2026-07-23T10:01:00.000Z',
        updatedAt: '2026-07-23T10:01:00.000Z', attachments: [],
      }],
      runs: [{
        id: 'run-plan', threadId: 'thread-1', userMessageId: 'user-before',
        assistantMessageId: 'assistant-before', status: 'complete', errorCode: null,
        errorMessage: null, createdAt: '2026-07-23T10:00:00.000Z',
        updatedAt: '2026-07-23T10:01:00.000Z', completedAt: '2026-07-23T10:01:00.000Z',
        requestClass: 'capability_question', participatingCapabilities: ['plan'],
        contextPolicy: { usePrivateContext: true, reason: 'day-plan-recommendation', clarification: null },
        version: 2, stopRequestedAt: null, steerCount: 0,
      }],
      events: [{
        id: 'referent-event', threadId: 'thread-1', runId: 'run-plan', sequence: 4,
        type: 'conversation_referent', status: 'complete', visibility: 'internal',
        label: 'Plan item awaiting placement', detail: null, payload: referent,
      }],
    };
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      launchContextSummary?: string;
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      expect(options.launchContextSummary).toContain(`activityId=${priorityOne.id}`);
      expect(options.launchContextSummary).toContain('Do not substitute another recommendation');
      const readTool = options.runtimeTools?.find((tool) => tool.id === 'plan.read_day_context');
      const scheduleTool = options.runtimeTools?.find((tool) => tool.id === 'plan.schedule_activity');
      expect(readTool).toBeDefined();
      expect(scheduleTool).toBeDefined();
      await expect(options.executeRuntimeTool?.({
        id: 'read', toolId: 'plan.read_day_context', arguments: {},
      }, readTool)).resolves.toEqual(expect.objectContaining({
        output: expect.objectContaining({ conversationReferent: referent }),
      }));
      await expect(options.executeRuntimeTool?.({
        id: 'wrong', toolId: 'plan.schedule_activity', arguments: {
          activityId: priorityTwo.id, startDate: '2026-07-24T14:00:00.000Z',
          endDate: '2026-07-24T16:00:00.000Z', targetDateKey: '2026-07-24',
        },
      }, scheduleTool)).resolves.toEqual(expect.objectContaining({
        status: 'failed', code: 'conversation_referent_mismatch',
      }));
      await options.executeRuntimeTool?.({
        id: 'correct', toolId: 'plan.schedule_activity', arguments: {
          activityId: priorityOne.id, startDate: '2026-07-24T14:00:00.000Z',
          endDate: '2026-07-24T16:00:00.000Z', targetDateKey: '2026-07-24',
        },
      }, scheduleTool);
      return 'I prepared Priority 1 for review from 2:00–4:00 PM.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Two hours early afternoon' },
      {
        repository: repository as never, sendCoachChat: send as never,
        loadCurrentAggregate: async () => durableAggregate,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: [],
          usePrivateContext: false, confidence: 0.94, reason: 'Ownerless short action reply.',
        }),
        enableRuntimeTools: true,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [priorityOne, priorityTwo], goals: [] },
          chapters: { chapters: [] },
          plan: {
            targetDate: referent.targetDate, writeCalendarRef, limitation: null,
            recommendations: [],
          },
        }),
      },
    );

    expect(repository.createProposal).toHaveBeenCalledTimes(1);
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'plan',
      operation: expect.objectContaining({ type: 'schedule_activity', targetId: priorityOne.id }),
    }));
    expect(repository.appendRunEvents).not.toHaveBeenCalledWith(expect.objectContaining({
      events: [expect.objectContaining({ type: 'conversation_referent' })],
    }));
  });

  test('cancels the one pending proposal without asking the model to reinterpret the command', async () => {
    const { repository, send } = dependencies();
    const aggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      proposals: [{
        id: 'proposal-1', threadId: 'thread-1', runId: 'older-run', messageId: 'older-message',
        capabilityId: 'todos', title: 'Move school call', body: 'Changes the date.',
        status: 'pending', version: 1, createdAt: 'before', updatedAt: 'before',
        operation: {
          id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'todos',
          type: 'update_activity', targetId: 'activity-1', summary: 'Move school call',
          payload: { scheduledDate: '2026-07-24', expectedUpdatedAt: 'current' },
          idempotencyKey: 'older', sequence: 1,
        },
      }],
    };

    await runUnifiedChatTurn(
      { aggregate, prompt: "Never mind—don't make that change." },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(repository.decideProposal).toHaveBeenCalledWith({
      proposalId: 'proposal-1', action: 'reject', expectedVersion: 1,
      note: 'Cancelled in Chat by the user.',
    });
    expect(send).not.toHaveBeenCalled();
    expect(repository.insertMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      role: 'assistant', body: "Okay—I won't make that change.",
    }));
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'complete', event: expect.objectContaining({ label: 'Pending change cancelled' }),
    }));
  });

  test('asks which item to cancel when more than one pending action exists', async () => {
    const { repository, send } = dependencies();
    const aggregate: UnifiedChatThreadAggregate = {
      ...startingAggregate,
      clientActions: [
        { id: 'one', threadId: 'thread-1', runId: 'r1', messageId: null, capabilityId: 'account', actionType: 'open_account_settings', targetType: null, targetId: null, title: 'Account', consequenceSummary: 'Review.', payload: {}, idempotencyKey: 'one', status: 'pending_client_action', result: null, errorCode: null, errorMessage: null, version: 1, presentedAt: null, completedAt: null, createdAt: 'before', updatedAt: 'before' },
        { id: 'two', threadId: 'thread-1', runId: 'r2', messageId: null, capabilityId: 'notifications', actionType: 'configure_notifications', targetType: null, targetId: null, title: 'Notifications', consequenceSummary: 'Review.', payload: {}, idempotencyKey: 'two', status: 'pending_client_action', result: null, errorCode: null, errorMessage: null, version: 1, presentedAt: null, completedAt: null, createdAt: 'before', updatedAt: 'before' },
      ],
    };
    await runUnifiedChatTurn(
      { aggregate, prompt: 'Cancel that' },
      { repository: repository as never, sendCoachChat: send as never },
    );
    expect(repository.transitionClientAction).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(repository.insertMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      role: 'assistant', body: expect.stringContaining('more than one change waiting'),
    }));
  });

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
        conversationTitlePolicy: expect.objectContaining({
          suggestFromOpening: true,
          refreshFromSummary: true,
          onSuggestedTitle: expect.any(Function),
        }),
      }),
    );
  });

  test('persists model title suggestions without allowing automation to own manual names', async () => {
    const { repository, send } = dependencies();
    const onThreadTitleUpdated = jest.fn();

    await runUnifiedChatTurn(
      {
        aggregate: startingAggregate,
        prompt: 'Can you help plan the school week?',
        onThreadTitleUpdated,
      },
      { repository: repository as never, sendCoachChat: send as never },
    );

    const options = send.mock.calls[0]?.[1] as {
      conversationTitlePolicy?: {
        onSuggestedTitle: (title: string, source: 'opening' | 'summary') => Promise<void>;
      };
    };
    await options.conversationTitlePolicy?.onSuggestedTitle('Planning the School Week', 'opening');
    expect(repository.applyGeneratedThreadTitle).toHaveBeenCalledWith(
      'thread-1',
      'Planning the School Week',
    );
    expect(onThreadTitleUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Planning the School Week', titleSource: 'generated' }),
    );

    const manualAggregate = {
      ...startingAggregate,
      thread: { ...startingAggregate.thread, title: 'My Family Plan', titleSource: 'user' as const },
    };
    const manual = dependencies();
    await runUnifiedChatTurn(
      { aggregate: manualAggregate, prompt: 'What changed?' },
      { repository: manual.repository as never, sendCoachChat: manual.send as never },
    );
    expect(manual.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        conversationTitlePolicy: expect.objectContaining({
          suggestFromOpening: false,
          refreshFromSummary: false,
        }),
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

    expect(loadCapabilitySnapshots).toHaveBeenCalledWith(
      ['goals'],
      { prompt: 'Which of my goals is about family reading?' },
    );
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

  test('answers the tomorrow Plan prompt from real recommendations instead of asking what to change', async () => {
    const { repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [] },
      todos: { activities: [], goals: [] },
      chapters: { chapters: [] },
      plan: {
        targetDate: '2026-07-23T18:00:00.000Z',
        writeCalendarRef: null,
        limitation: 'no_write_calendar' as const,
        recommendations: [{
          activityId: 'activity-school',
          expectedUpdatedAt: '2026-07-22T12:00:00.000Z',
          title: 'Call the school',
          goalTitle: 'Get ready for school',
          priorityPosition: 0,
          placement: { status: 'unplaced' as const, reason: 'no_write_calendar' as const },
        }],
      },
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'What should I add to my plan tomorrow?' },
      { repository: repository as never, sendCoachChat: send as never, loadCapabilitySnapshots },
    );

    expect(loadCapabilitySnapshots).toHaveBeenCalledWith(
      ['plan'],
      { prompt: 'What should I add to my plan tomorrow?' },
    );
    expect(repository.createRun).toHaveBeenCalledWith(expect.objectContaining({
      userMessageId: 'message-user',
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
    }));
    expect((send.mock.calls[0]?.[1] as { launchContextSummary?: string }).launchContextSummary)
      .toContain('Call the school');
    expect(repository.insertMessage).not.toHaveBeenCalledWith(expect.objectContaining({
      role: 'assistant',
      body: 'What would you like Kwilt to change?',
    }));
    expect(repository.appendRunEvents).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1',
      events: [expect.objectContaining({
        type: 'conversation_referent',
        payload: expect.objectContaining({
          kind: 'awaiting_placement', activityId: 'activity-school', priorityPosition: 0,
        }),
      })],
    }));
  });

  test('reports what is officially on tomorrow separately from recommendations', async () => {
    const { repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: "What's officially on my Plan tomorrow?" },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
          plan: {
            targetDate: '2026-07-24T18:00:00.000Z', writeCalendarRef: null,
            limitation: 'no_write_calendar' as const,
            scheduledItems: [
              {
                activityId: 'scheduled-school', title: 'Call the school', goalTitle: null,
                placement: 'calendar' as const, startDate: '2026-07-24T15:00:00.000Z',
                endDate: '2026-07-24T15:30:00.000Z',
              },
              {
                activityId: 'planned-trash', title: 'Take out the trash', goalTitle: null,
                placement: 'day' as const, startDate: null, endDate: null,
              },
            ],
            recommendations: [{
              activityId: 'recommended-lunch', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
              title: 'Pack lunch', goalTitle: null, priorityPosition: 0,
              placement: { status: 'unplaced' as const, reason: 'no_write_calendar' as const },
            }],
          },
        }),
      },
    );

    const assistantInsert = repository.insertMessage.mock.calls.find(
      ([input]) => input.role === 'assistant',
    )?.[0] as CreateUnifiedChatMessageInput | undefined;
    expect(assistantInsert?.body).toContain('Already on your Plan for tomorrow');
    expect(assistantInsert?.body).toContain('Call the school');
    expect(assistantInsert?.body).toContain('Take out the trash');
    expect(assistantInsert?.body).toContain('Recommended next');
    expect(assistantInsert?.body).toContain('Pack lunch');
    expect(repository.createProposal).not.toHaveBeenCalled();
  });

  test('renders the capability-owned Plan order even when model prose reprioritizes it', async () => {
    const modelAnswer = JSON.stringify({
      answer: 'The Priority 2 item is the most leverage, so do that first.',
      facts: ['Priority 1 needs a larger window.'],
      inference: 'Priority 2 feels easier.',
      uncertainty: 'Timing is unclear.',
    });
    const { repository, send } = dependencies(jest.fn(async () => modelAnswer));
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'What should I add to my plan tomorrow?' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
          plan: {
            targetDate: '2026-07-24T18:00:00.000Z', writeCalendarRef, limitation: null,
            recommendations: [
              {
                activityId: 'priority-one', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
                title: 'Finish the walnut glue-up', goalTitle: 'Finish the build', priorityPosition: 0,
                placement: { status: 'unplaced' as const, reason: 'needs_larger_window' as const },
              },
              {
                activityId: 'priority-two', expectedUpdatedAt: '2026-07-23T10:05:00.000Z',
                title: 'Draft the Places strategy', goalTitle: null, priorityPosition: 1,
                placement: {
                  status: 'placed' as const, startDate: '2026-07-24T18:30:00.000Z',
                  endDate: '2026-07-24T20:30:00.000Z', calendarId: 'primary',
                },
              },
            ],
          },
        }),
      },
    );

    const assistantInsert = repository.insertMessage.mock.calls.find(
      ([input]) => input.role === 'assistant',
    )?.[0] as CreateUnifiedChatMessageInput | undefined;
    expect(assistantInsert?.body).toContain('Kwilt’s priority order for tomorrow');
    expect(assistantInsert?.body.indexOf('1. Finish the walnut glue-up'))
      .toBeLessThan(assistantInsert?.body.indexOf('2. Draft the Places strategy') ?? -1);
    expect(assistantInsert?.body).not.toContain('most leverage');
  });

  test('persists one atomic Plan proposal for every placed recommendation', async () => {
    const { repository, send } = dependencies(jest.fn(async () => structuredGroundedAnswer));
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
      plan: {
        targetDate: '2026-07-24T18:00:00.000Z', writeCalendarRef, limitation: null,
        recommendations: [
          {
            activityId: 'activity-school', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
            title: 'Call the school', goalTitle: 'Get ready for school', priorityPosition: 0,
            placement: {
              status: 'placed' as const, startDate: '2026-07-24T15:00:00.000Z',
              endDate: '2026-07-24T15:30:00.000Z', calendarId: 'primary',
            },
          },
          {
            activityId: 'activity-lunch', expectedUpdatedAt: '2026-07-23T10:05:00.000Z',
            title: 'Pack lunch', goalTitle: null, priorityPosition: 1,
            placement: {
              status: 'placed' as const, startDate: '2026-07-24T16:00:00.000Z',
              endDate: '2026-07-24T16:20:00.000Z', calendarId: 'primary',
            },
          },
        ],
      },
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'What should I add to my plan tomorrow?' },
      { repository: repository as never, sendCoachChat: send as never, loadCapabilitySnapshots },
    );

    expect(repository.createProposal).toHaveBeenCalledTimes(2);
    expect(repository.createProposal).toHaveBeenNthCalledWith(1, expect.objectContaining({
      capabilityId: 'plan', title: 'Call the school',
      operation: expect.objectContaining({
        type: 'schedule_activity', targetId: 'activity-school',
        idempotencyKey: 'unified-chat:run-1:plan:activity-school',
        payload: expect.objectContaining({ writeCalendarRef, targetDateKey: '2026-07-24' }),
      }),
    }));
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

  test('uses discovered runtime tools to stage an ordinary Activity update', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
      onRuntimeToolLoopComplete?: (result: { events: unknown[] }) => void;
    }) => {
      const updateTool = options.runtimeTools?.find((tool) => tool.id === 'activities.update');
      expect(updateTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'call-update', toolId: 'activities.update',
        arguments: { activityId: 'activity-school', fields: { title: 'Call the school office' } },
      }, updateTool);
      options.onRuntimeToolLoopComplete?.({ events: [{
        sequence: 2, type: 'tool_completed', round: 1, toolCallId: 'call-update',
        toolId: 'activities.update', resultStatus: 'proposed',
      }] });
      return 'I prepared that title change for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const activity: Activity = {
      id: 'activity-school', goalId: null, title: 'Call the school', type: 'task', tags: [],
      status: 'planned', creationSource: 'manual', forceActual: {},
      createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-22T10:00:00.000Z',
    };
    const loadCapabilitySnapshots = jest.fn(async () => ({
      goals: { goals: [] }, todos: { activities: [activity], goals: [] }, chapters: { chapters: [] },
    }));

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Change my task Call the school title to Call the school office' },
      {
        repository: repository as never, sendCoachChat: send as never,
        loadCapabilitySnapshots, enableRuntimeTools: true,
      },
    );

    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'todos', title: 'Update Call the school',
      operation: expect.objectContaining({
        type: 'update_activity', targetId: 'activity-school',
        expectedUpdatedAt: activity.updatedAt,
        payload: { title: 'Call the school office' },
      }),
    }));
    expect(repository.appendRunEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      events: [expect.objectContaining({
        type: 'tool', visibility: 'internal', label: 'Used activities.update',
        payload: expect.objectContaining({ resultStatus: 'proposed' }),
      })],
    }));
  });

  test('uses the authenticated relationship provider for in-app read and explicit memory', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
      onRuntimeToolLoopComplete?: (result: { events: unknown[] }) => void;
    }) => {
      const readTool = options.runtimeTools?.find((tool) => tool.id === 'relationships.read');
      const rememberTool = options.runtimeTools?.find((tool) => tool.id === 'relationships.remember');
      expect(readTool).toBeDefined();
      expect(rememberTool).toBeDefined();
      await options.executeRuntimeTool?.(
        { id: 'read-lily', toolId: 'relationships.read', arguments: {} }, readTool,
      );
      await options.executeRuntimeTool?.({
        id: 'remember-lily', toolId: 'relationships.remember', arguments: {
          personName: 'Lily', aliases: [], memories: [{ kind: 'preference', text: 'likes dragons' }],
          events: [{ kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12' }], cadences: [],
        },
      }, rememberTool);
      options.onRuntimeToolLoopComplete?.({ events: [
        { sequence: 2, type: 'tool_completed', round: 1, toolId: 'relationships.read', resultStatus: 'completed' },
        { sequence: 3, type: 'tool_completed', round: 1, toolId: 'relationships.remember', resultStatus: 'completed' },
      ] });
      return "I remembered Lily's birthday and that she likes dragons.";
    });
    const executeRelationshipTool = jest.fn(async (call: { toolId: string }) => (
      call.toolId === 'relationships.read'
        ? { status: 'completed' as const, output: { people: [] }, receipt: null }
        : {
            status: 'completed' as const, output: { personId: 'person-1', recordIds: ['event-1'] },
            receipt: { id: 'receipt-1', status: 'applied' },
          }
    ));
    const { repository, send } = dependencies(runtimeSender);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: "Lily's birthday is October 12 and she likes dragons." },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        executeRelationshipTool: executeRelationshipTool as never,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );

    expect(executeRelationshipTool.mock.calls.map(([call]) => call.toolId)).toEqual([
      'relationships.read', 'relationships.remember',
    ]);
    expect(repository.createProposal).not.toHaveBeenCalled();
    expect(repository.appendRunEvents).toHaveBeenLastCalledWith(expect.objectContaining({
      events: expect.arrayContaining([
        expect.objectContaining({ label: 'Used relationships.remember' }),
      ]),
    }));
  });

  test('uses the shared runtime to stage an ordinary Plan placement action', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const scheduleTool = options.runtimeTools?.find((tool) => tool.id === 'plan.schedule_activity');
      expect(scheduleTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'call-schedule', toolId: 'plan.schedule_activity', arguments: {
          activityId: 'activity-school', startDate: '2026-07-24T15:00:00.000Z',
          endDate: '2026-07-24T15:30:00.000Z', targetDateKey: '2026-07-24',
        },
      }, scheduleTool);
      return 'I prepared that Plan placement for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const activity: Activity = {
      id: 'activity-school', goalId: null, title: 'Call the school', type: 'task', tags: [],
      status: 'planned', forceActual: {}, createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
    };
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Schedule my school call tomorrow at 9.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['plan'],
          usePrivateContext: true, confidence: 0.99, reason: 'The user asked for a Plan placement.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [activity], goals: [] }, chapters: { chapters: [] },
          plan: { targetDate: '2026-07-24T12:00:00.000Z', writeCalendarRef, limitation: null, recommendations: [] },
        }),
      },
    );

    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'plan', title: 'Schedule Call the school',
      operation: expect.objectContaining({
        type: 'schedule_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
        payload: expect.objectContaining({ writeCalendarRef, targetDateKey: '2026-07-24' }),
      }),
    }));
  });

  test('persists every chunk from one interpreted tool call as a separate reviewable proposal', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const chunksTool = options.runtimeTools?.find((tool) => tool.id === 'plan.schedule_chunks');
      expect(chunksTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'call-chunks', toolId: 'plan.schedule_chunks', arguments: {
          activityId: 'activity-deep-work',
          chunks: [
            {
              title: 'Deep work, part 1', startDate: '2026-07-24T15:00:00.000Z',
              endDate: '2026-07-24T15:30:00.000Z', targetDateKey: '2026-07-24',
            },
            {
              title: 'Deep work, part 2', startDate: '2026-07-25T16:00:00.000Z',
              endDate: '2026-07-25T16:30:00.000Z', targetDateKey: '2026-07-25',
            },
          ],
        },
      }, chunksTool);
      return 'I prepared two calendar chunks for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const activity: Activity = {
      id: 'activity-deep-work', goalId: null, title: 'Deep work', type: 'task', tags: [],
      status: 'planned', forceActual: {}, createdAt: '2026-07-20T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z',
    };
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Split deep work across two calendar blocks.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['plan'],
          usePrivateContext: true, confidence: 0.99, reason: 'Chunk scheduling requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [activity], goals: [] }, chapters: { chapters: [] },
          plan: { targetDate: '2026-07-24T12:00:00.000Z', writeCalendarRef, limitation: null, recommendations: [] },
        }),
      },
    );

    expect(repository.createProposal).toHaveBeenCalledTimes(2);
    expect(repository.createProposal.mock.calls.map(([input]) => input)).toEqual([
      expect.objectContaining({
        capabilityId: 'plan', title: 'Deep work, part 1',
        operation: expect.objectContaining({
          type: 'schedule_activity_chunk', idempotencyKey: 'unified-chat:run-1:tool:1',
          payload: expect.objectContaining({ groupId: 'plan-chunks:call-chunks', chunkId: 'chunk-1' }),
        }),
      }),
      expect.objectContaining({
        capabilityId: 'plan', title: 'Deep work, part 2',
        operation: expect.objectContaining({
          type: 'schedule_activity_chunk', idempotencyKey: 'unified-chat:run-1:tool:2',
          payload: expect.objectContaining({ groupId: 'plan-chunks:call-chunks', chunkId: 'chunk-2' }),
        }),
      }),
    ]);
  });

  test('uses the shared runtime to interpret and stage an ordinary Goal update', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const goalTool = options.runtimeTools?.find((tool) => tool.id === 'goals.update');
      expect(goalTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'goal-update', toolId: 'goals.update', arguments: {
          goalId: 'goal-reading', fields: { title: 'Read together every night', status: 'in_progress' },
        },
      }, goalTool);
      return 'I prepared that Goal change for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const goal: Goal = {
      id: 'goal-reading', arcId: null, title: 'Read more', status: 'planned',
      forceIntent: {}, metrics: [], createdAt: 'before', updatedAt: 'current',
    };
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Rename my reading goal and start it.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['goals'],
          usePrivateContext: true, confidence: 0.99, reason: 'Goal update requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [goal], arcIds: [] }, todos: { activities: [], goals: [goal] },
          chapters: { chapters: [] },
        }),
      },
    );
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'goals', title: 'Update Read more',
      operation: expect.objectContaining({
        type: 'update_goal', targetId: goal.id, expectedUpdatedAt: goal.updatedAt,
      }),
    }));
  });

  test('uses the shared runtime to interpret and stage ordinary Goal creation', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const goalTool = options.runtimeTools?.find((tool) => tool.id === 'goals.create');
      expect(goalTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'goal-create', toolId: 'goals.create', arguments: {
          title: 'Learn watercolor', description: 'Paint one small scene.',
        },
      }, goalTool);
      return 'I prepared that Goal for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Make learning watercolor one of my goals.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['goals'],
          usePrivateContext: true, confidence: 0.99, reason: 'Goal creation requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [], arcIds: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'goals', title: 'Create Learn watercolor',
      operation: expect.objectContaining({
        type: 'create_goal', targetId: null, expectedUpdatedAt: null,
        payload: { title: 'Learn watercolor', description: 'Paint one small scene.' },
      }),
    }));
  });

  test('stages a bounded walking Goal with follow-through intent, not an invented Activity link', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      launchContextSummary?: string;
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      expect(options.launchContextSummary).toContain('Do not invent an Arc or call activities.capture before');
      const goalTool = options.runtimeTools?.find((tool) => tool.id === 'goals.create');
      await options.executeRuntimeTool?.({
        id: 'goal-walk', toolId: 'goals.create', arguments: {
          title: 'Walk every day for the next week',
          targetDate: '2026-07-30T23:59:59.000-06:00',
          followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
        },
      }, goalTool);
      return 'I prepared the walking Goal for review.';
    });
    const { repository, send } = dependencies(runtimeSender);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Create a goal to walk every day for the next week.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['goals'],
          usePrivateContext: true, confidence: 0.99, reason: 'Goal creation requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [], arcIds: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );

    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'goals',
      operation: expect.objectContaining({
        type: 'create_goal', targetId: null,
        payload: expect.objectContaining({
          targetDate: '2026-07-30T23:59:59.000-06:00',
          followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
        }),
      }),
    }));
    expect(repository.createProposal).toHaveBeenCalledTimes(1);
  });

  test('uses the shared runtime to interpret and stage an ordinary Arc identity update', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const arcTool = options.runtimeTools?.find((tool) => tool.id === 'arcs.update');
      expect(arcTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'arc-update', toolId: 'arcs.update', arguments: {
          arcId: 'arc-parent', fields: { name: 'Steady parent', status: 'active' },
        },
      }, arcTool);
      return 'I prepared that Arc change for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const arc = {
      id: 'arc-parent', name: 'Present parent', status: 'active' as const,
      createdAt: 'before', updatedAt: 'current',
    };
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Rename my parenting Arc to Steady parent.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['arcs'],
          usePrivateContext: true, confidence: 0.99, reason: 'Arc update requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          arcs: { arcs: [arc] }, goals: { goals: [], arcIds: [arc.id] },
          todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'arcs', title: 'Update Present parent',
      operation: expect.objectContaining({
        type: 'update_arc', targetId: arc.id, expectedUpdatedAt: arc.updatedAt,
      }),
    }));
  });

  test('uses the shared runtime to interpret and stage an ordinary Profile name update', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const profileTool = options.runtimeTools?.find((tool) => tool.id === 'profile.update');
      expect(profileTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'profile-update', toolId: 'profile.update', arguments: { fields: { fullName: 'Andy' } },
      }, profileTool);
      return 'I prepared that Profile change for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const profile = {
      id: 'profile-1', fullName: 'Andrew', createdAt: 'before', updatedAt: 'current',
      communication: {}, visuals: {},
    };
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Call me Andy from now on.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['profile'],
          usePrivateContext: true, confidence: 0.99, reason: 'Profile update requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          profile: { profile }, goals: { goals: [] }, todos: { activities: [], goals: [] },
          chapters: { chapters: [] },
        }),
      },
    );
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'profile', title: 'Update your profile',
      operation: expect.objectContaining({
        type: 'update_profile', targetId: profile.id, expectedUpdatedAt: profile.updatedAt,
        payload: { fullName: 'Andy' },
      }),
    }));
  });

  test('uses the shared runtime to interpret and stage an ordinary Chapter note', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const chapterTool = options.runtimeTools?.find((tool) => tool.id === 'chapters.note.update');
      expect(chapterTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'chapter-note', toolId: 'chapters.note.update',
        arguments: { chapterId: 'chapter-1', note: 'Sleep mattered.' },
      }, chapterTool);
      return 'I prepared that Chapter note for review.';
    });
    const { repository, send } = dependencies(runtimeSender);
    const chapter = {
      id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
      period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
      status: 'ready' as const, error: null, emailed_at: null, user_note: null, user_note_updated_at: null,
      created_at: 'before', updated_at: 'current',
    };
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Add a note to my latest Chapter that sleep mattered.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['chapters'],
          usePrivateContext: true, confidence: 0.99, reason: 'Chapter note requested.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [chapter] },
        }),
      },
    );
    expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'chapters', title: 'Add a line to your Chapter',
      operation: expect.objectContaining({
        type: 'update_chapter_note', targetId: chapter.id, expectedUpdatedAt: chapter.updated_at,
        payload: { note: 'Sleep mattered.' },
      }),
    }));
  });

  test('persists Screen Time work as a pending device action instead of model success', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const screenTimeTool = options.runtimeTools?.find((tool) => tool.id === 'screen_time.configure');
      expect(screenTimeTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'screen-time', toolId: 'screen_time.configure', arguments: {},
      }, screenTimeTool);
      return 'I prepared Screen Time setup on your phone.';
    });
    const { repository, send } = dependencies(runtimeSender);
    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Block games until reading is done.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );
    expect(repository.createClientAction).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'screenTime', actionType: 'configure_screen_time',
      consequenceSummary: expect.stringContaining('Apple authorization'),
    }));
    expect(repository.createProposal).not.toHaveBeenCalled();
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

  test('asks for the exact time before creating a vague recurring reminder', async () => {
    const sender = jest.fn(async () => 'I guessed 8 PM.');
    const { repository, send } = dependencies(sender);

    await runUnifiedChatTurn(
      {
        aggregate: startingAggregate,
        prompt: 'Create a to-do called Take out the trash, set it to be a recurring reminder every Tuesday night.',
      },
      { repository: repository as never, sendCoachChat: send as never },
    );

    expect(sender).not.toHaveBeenCalled();
    expect(repository.createProposal).not.toHaveBeenCalled();
    expect(repository.insertMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      role: 'assistant', body: 'What time Tuesday night should I remind you?',
    }));
  });

  test('prepares one atomic recurring reminder proposal from an exact natural-language request', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      launchContextSummary?: string;
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      expect(options.launchContextSummary).toContain('call activities.capture once');
      const captureTool = options.runtimeTools?.find((tool) => tool.id === 'activities.capture');
      expect(captureTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'capture-trash', toolId: 'activities.capture', arguments: {
          title: 'Take out the trash', reminderLocalTime: '20:00', repeatWeekdays: [2],
        },
      }, captureTool);
      return 'I prepared a weekly Tuesday reminder for review.';
    });
    const { repository, send } = dependencies(runtimeSender);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Create a to-do called Take out the trash and remind me every Tuesday at 8 PM.' },
      {
        repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['todos'],
          usePrivateContext: true, confidence: 0.99, reason: 'Create one recurring reminded Activity.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );

    expect(repository.createProposal).toHaveBeenCalledTimes(1);
    const operation = (repository.createProposal.mock.calls[0]?.[0] as { operation?: unknown } | undefined)?.operation;
    expect(operation).toMatchObject({
      type: 'create_activity', payload: {
        title: 'Take out the trash', repeatRule: 'custom',
        repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
        repeatBasis: 'scheduled', reminderAt: expect.any(String),
      },
    });
  });

  test('uses semantic tools to split a compound capture into separate native proposals', async () => {
    const runtimeSender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      const captureTool = options.runtimeTools?.find((tool) => tool.id === 'activities.capture');
      expect(captureTool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'capture-milk', toolId: 'activities.capture', arguments: { title: 'Buy milk' },
      }, captureTool);
      await options.executeRuntimeTool?.({
        id: 'capture-mom', toolId: 'activities.capture', arguments: { title: 'Call Mom' },
      }, captureTool);
      return 'I prepared two To-dos for review.';
    });
    const { repository, send } = dependencies(runtimeSender);

    await runUnifiedChatTurn(
      { aggregate: startingAggregate, prompt: 'Add milk and call Mom' },
      {
        repository: repository as never,
        sendCoachChat: send as never,
        enableRuntimeTools: true,
        routeRequest: async () => ({
          requestClass: 'capability_action', participatingCapabilities: ['todos'],
          usePrivateContext: true, confidence: 0.95, reason: 'This asks for two To-dos.',
        }),
        loadCapabilitySnapshots: async () => ({
          goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        }),
      },
    );

    expect(repository.createProposal).toHaveBeenCalledTimes(2);
    expect(repository.createProposal).toHaveBeenNthCalledWith(1, expect.objectContaining({
      capabilityId: 'todos', title: 'Add Buy milk',
      operation: expect.objectContaining({ type: 'create_activity', payload: expect.objectContaining({ title: 'Buy milk' }) }),
    }));
    expect(repository.createProposal).toHaveBeenNthCalledWith(2, expect.objectContaining({
      capabilityId: 'todos', title: 'Add Call Mom',
      operation: expect.objectContaining({ type: 'create_activity', payload: expect.objectContaining({ title: 'Call Mom' }) }),
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

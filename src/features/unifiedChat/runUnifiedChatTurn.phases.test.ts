import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import { materializeUnifiedChatOutcomePhase } from './turnOutcomePhase';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';

const aggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1',
    title: 'New chat',
    titleSource: 'default',
    status: 'active',
    archivedAt: null,
    createdAt: '2026-07-24T12:00:00.000Z',
    updatedAt: '2026-07-24T12:00:00.000Z',
  },
  messages: [],
  runs: [],
};

function harness() {
  const order: string[] = [];
  const repository = {
    insertMessage: jest.fn(async (input: CreateUnifiedChatMessageInput) => ({
      id: input.role === 'user' ? 'message-user' : 'message-assistant',
      threadId: 'thread-1',
      role: input.role,
      body: input.body,
      feedback: null,
      createdAt: '2026-07-24T12:01:00.000Z',
      updatedAt: '2026-07-24T12:01:00.000Z',
      attachments: [],
    })),
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
        createdAt: '2026-07-24T12:01:00.000Z',
        updatedAt: '2026-07-24T12:01:00.000Z',
        completedAt: null,
        requestClass: 'general' as const,
        participatingCapabilities: [],
        contextPolicy: { usePrivateContext: false, reason: 'test', clarification: null },
        version: 1,
        stopRequestedAt: null,
        steerCount: 0,
      };
    }),
    appendRunEvents: jest.fn(async () => undefined),
    persistRunEvidence: jest.fn(async () => undefined),
    createProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'pending' as const })),
    createClientAction: jest.fn(async () => ({ id: 'action-1', status: 'pending_client_action' as const })),
    decideProposal: jest.fn(async () => ({})),
    transitionClientAction: jest.fn(async () => ({})),
    transitionRunStatus: jest.fn(async (input: { toStatus: string }) => {
      order.push(`run:${input.toStatus}`);
      return {};
    }),
    loadThread: jest.fn(async () => aggregate),
    applyGeneratedThreadTitle: jest.fn(async () => null),
  };
  const sendCoachChat = jest.fn(async () => 'A useful answer.');
  return { order, repository, sendCoachChat };
}

describe('runUnifiedChatTurn phase failure contracts', () => {
  test('persistence failure stops before a run and hides provider details', async () => {
    const { repository, sendCoachChat } = harness();
    repository.insertMessage.mockRejectedValueOnce(new Error('database secret detail'));

    await expect(runUnifiedChatTurn(
      { aggregate, prompt: 'Help me think this through.' },
      { repository: repository as never, sendCoachChat: sendCoachChat as never },
    )).rejects.toThrow('Kwilt could not save that message.');

    expect(repository.createRun).not.toHaveBeenCalled();
    expect(sendCoachChat).not.toHaveBeenCalled();
  });

  test('planning failure creates a durable retryable failed run', async () => {
    const { order, repository, sendCoachChat } = harness();

    await expect(runUnifiedChatTurn(
      { aggregate, prompt: 'Can you help me sort this out?' },
      {
        repository: repository as never,
        sendCoachChat: sendCoachChat as never,
        routeRequest: async () => { throw new Error('router unavailable'); },
      },
    )).rejects.toThrow('Kwilt could not plan that response.');

    expect(order).toEqual(['run:active', 'run:failed']);
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: 'planning_failed',
    }));
  });

  test('context authorization failure records a bounded failed run', async () => {
    const { repository, sendCoachChat } = harness();

    await expect(runUnifiedChatTurn(
      { aggregate, prompt: 'What should I do tomorrow?' },
      {
        repository: repository as never,
        sendCoachChat: sendCoachChat as never,
        loadCapabilitySnapshots: async () => { throw new Error('private provider detail'); },
      },
    )).rejects.toThrow('Kwilt could not finish that response.');

    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: 'context_selection_failed',
    }));
    expect(sendCoachChat).not.toHaveBeenCalled();
  });

  test('outcome persistence failure preserves a recoverable failed run', async () => {
    const { repository, sendCoachChat } = harness();
    const insertMessage = repository.insertMessage.getMockImplementation()!;
    repository.insertMessage
      .mockImplementationOnce(insertMessage)
      .mockRejectedValueOnce(new Error('assistant persistence detail'));

    await expect(runUnifiedChatTurn(
      { aggregate, prompt: 'Explain tides simply.' },
      { repository: repository as never, sendCoachChat: sendCoachChat as never },
    )).rejects.toThrow('Kwilt could not finish that response.');

    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: 'assistant_persistence_failed',
    }));
  });

  test('finalization failure records the completed work as failed and retryable', async () => {
    const { repository, sendCoachChat } = harness();
    repository.transitionRunStatus.mockImplementation(async (input: { toStatus: string }) => {
      if (input.toStatus === 'complete') throw new Error('completion write unavailable');
      return {};
    });

    await expect(runUnifiedChatTurn(
      { aggregate, prompt: 'Why is the sky blue?' },
      { repository: repository as never, sendCoachChat: sendCoachChat as never },
    )).rejects.toThrow('Kwilt could not finish that response.');

    expect(repository.transitionRunStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      toStatus: 'failed',
      errorCode: 'run_completion_failed',
    }));
  });
});

test('conversation turns expose privacy-safe phase milestones in order', async () => {
  const { repository, sendCoachChat } = harness();
  const milestones: string[] = [];
  const classifications: Array<{ planningStrategy: string; requestClass: string }> = [];
  const progressCues: string[] = [];
  const requestJudgment = jest.fn(async () => null);
  const routeRequest = jest.fn(async () => null);

  await runUnifiedChatTurn(
    {
      aggregate,
      prompt: 'Why do leaves change color?',
      interactionMode: 'conversation',
      onLatencyMilestone: (milestone) => milestones.push(milestone),
      onConversationClassification: (classification) => classifications.push(classification),
      onProgressCue: (cueId) => progressCues.push(cueId),
    },
    {
      repository: repository as never,
      sendCoachChat: sendCoachChat as never,
      requestJudgment,
      routeRequest,
    },
  );

  expect(milestones).toEqual([
    'turn_started',
    'planning_complete',
    'context_ready',
    'answer_ready',
  ]);
  expect(classifications).toEqual([{ planningStrategy: 'fast_direct', requestClass: 'general' }]);
  expect(sendCoachChat).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({
      maxOutputTokens: 96,
      launchContextSummary: expect.stringContaining('Conversation mode: answer first'),
    }),
  );
  expect(requestJudgment).not.toHaveBeenCalled();
  expect(routeRequest).not.toHaveBeenCalled();
  expect(progressCues).toEqual([]);
});

test('a longer conversation turn emits one fixed progress cue before planning completes', async () => {
  const { repository, sendCoachChat } = harness();
  const order: string[] = [];

  await runUnifiedChatTurn(
    {
      aggregate,
      prompt: 'What is the weather today?',
      interactionMode: 'conversation',
      recentProgressCueIds: ['current_lookup_01', 'current_lookup_02'],
      onProgressCue: (cueId) => order.push(`cue:${cueId}`),
      onLatencyMilestone: (milestone) => order.push(milestone),
    },
    {
      repository: repository as never,
      sendCoachChat: sendCoachChat as never,
      requestJudgment: async () => null,
      routeRequest: async () => null,
    },
  );

  expect(order).toContain('cue:current_lookup_03');
  expect(order.indexOf('cue:current_lookup_03')).toBeLessThan(order.indexOf('planning_complete'));
});

test('text turns keep the existing response ceiling and prompt', async () => {
  const { repository, sendCoachChat } = harness();

  await runUnifiedChatTurn(
    { aggregate, prompt: 'Why do leaves change color?', interactionMode: 'text' },
    { repository: repository as never, sendCoachChat: sendCoachChat as never },
  );

  const calls = sendCoachChat.mock.calls as unknown as Array<[unknown, {
    maxOutputTokens?: number;
    launchContextSummary?: string;
  }]>;
  const options = calls[0]?.[1] ?? {};
  expect(options.maxOutputTokens).toBeUndefined();
  expect(options.launchContextSummary).not.toContain('Conversation mode:');
});

test('outcome phase converts completion-looking action prose into a durable clarification', async () => {
  const { repository } = harness();
  const setFailureCode = jest.fn();

  const result = await materializeUnifiedChatOutcomePhase({
    threadId: 'thread-1',
    run: await repository.createRun(),
    visibleBody: 'Done. I updated it.',
    actionResponse: null,
    toolProvider: { proposals: () => [], clientActions: () => [] } as never,
    runtimeToolEvents: [],
    requestPolicy: {
      requestClass: 'capability_action',
      participatingCapabilities: ['account'],
      usePrivateContext: false,
      policyReason: 'test-action',
      clarification: null,
    },
    snapshots: {
      goals: { goals: [] },
      todos: { activities: [], goals: [] },
      chapters: { chapters: [] },
      profile: { profile: null },
    },
    planConversationReferent: null,
    repository: repository as never,
    setFailureCode,
  });

  expect(setFailureCode).not.toHaveBeenCalledWith('action_outcome_missing');
  expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
    role: 'assistant',
    body: expect.stringMatching(/nothing was changed/i),
  }));
  expect(result.appControlOutcome).toMatchObject({
    type: 'clarification',
    question: expect.stringMatching(/nothing was changed/i),
  });
});

test('analysis-only Plan recommendations never become pending changes', async () => {
  const { repository } = harness();
  const run = await repository.createRun();

  const result = await materializeUnifiedChatOutcomePhase({
    threadId: 'thread-1',
    run,
    visibleBody: 'Here is the priority order I recommend for tomorrow.',
    actionResponse: null,
    toolProvider: { proposals: () => [], clientActions: () => [] } as never,
    runtimeToolEvents: [],
    requestPolicy: {
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      policyReason: 'day-plan-recommendation',
      clarification: null,
    },
    snapshots: {
      goals: { goals: [] },
      todos: { activities: [], goals: [] },
      chapters: { chapters: [] },
      profile: { profile: null },
      plan: {
        targetDate: '2026-08-12T18:00:00.000Z',
        scheduledItems: [],
        recommendations: [{
          activityId: 'activity-1',
          expectedUpdatedAt: '2026-08-11T16:00:00.000Z',
          title: 'Prepare the family plan',
          goalTitle: 'Family systems',
          priorityPosition: 0,
          placement: {
            status: 'placed',
            startDate: '2026-08-12T15:00:00.000Z',
            endDate: '2026-08-12T16:00:00.000Z',
            calendarId: 'primary',
          },
        }],
        writeCalendarRef: {
          provider: 'google',
          accountId: 'account-1',
          calendarId: 'primary',
        },
        limitation: null,
      },
    },
    planConversationReferent: null,
    turnContract: {
      schemaVersion: 2,
      userJob: 'Review priorities and suggest what to do tomorrow',
      desiredOutcome: 'A recommendation without changing anything',
      constraints: ['Do not change anything'],
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      authorization: 'none',
      evidenceScope: 'focused',
      responseContract: 'evidence_linked',
      action: null,
      referent: null,
    },
    repository: repository as never,
    setFailureCode: jest.fn(),
  });

  expect(repository.createProposal).not.toHaveBeenCalled();
  expect(result.appControlOutcome).toEqual({
    type: 'answer',
    text: 'Here is the priority order I recommend for tomorrow.',
  });
});

test('outcome phase persists an ordered typed referent for every staged proposal', async () => {
  const { repository } = harness();
  repository.createProposal
    .mockResolvedValueOnce({ id: 'proposal-milk', status: 'pending' as const } as never)
    .mockResolvedValueOnce({ id: 'proposal-mom', status: 'pending' as const } as never);
  const run = await repository.createRun();

  await materializeUnifiedChatOutcomePhase({
    threadId: 'thread-1',
    run,
    visibleBody: 'I prepared two To-dos for review.',
    actionResponse: null,
    toolProvider: {
      proposals: () => [{
        capabilityId: 'todos', title: 'Add Buy milk', body: 'Creates this To-do.',
        operation: {
          type: 'create_activity', targetId: null, expectedUpdatedAt: null,
          payload: { title: 'Buy milk' },
        },
      }, {
        capabilityId: 'todos', title: 'Add Call Mom', body: 'Creates this To-do.',
        operation: {
          type: 'create_activity', targetId: null, expectedUpdatedAt: null,
          payload: { title: 'Call Mom' },
        },
      }],
      clientActions: () => [],
    } as never,
    runtimeToolEvents: [
      { type: 'tool_completed', toolId: 'activities.capture', toolCallId: 'call-1', resultStatus: 'proposed' },
      { type: 'tool_completed', toolId: 'activities.capture', toolCallId: 'call-2', resultStatus: 'proposed' },
    ] as never,
    agentJudgment: {
      schemaVersion: 1, userJob: 'Capture two ordered errands', desiredOutcome: 'Both are ready for review',
      requestClass: 'capability_action', participatingCapabilities: ['todos'], usePrivateContext: true,
      informationNeed: 'stable', authorization: 'explicit_request', evidenceScope: 'focused',
      responseContract: 'evidence_linked', executionMode: 'multi_tool', constraints: [],
      steps: [
        { sequence: 1, objective: 'Read existing activities', toolId: 'activities.read', dependsOn: null },
        { sequence: 2, objective: 'Capture milk', toolId: 'activities.capture', dependsOn: 1 },
        { sequence: 3, objective: 'Capture call', toolId: 'activities.capture', dependsOn: 2 },
      ],
      clarificationQuestion: null, confidence: 0.9, reason: 'Ordered request',
    },
    requestPolicy: {
      requestClass: 'capability_action', participatingCapabilities: ['todos'],
      usePrivateContext: true, policyReason: 'semantic-route:two To-dos', clarification: null,
    },
    snapshots: {
      goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
    },
    planConversationReferent: null,
    repository: repository as never,
    setFailureCode: jest.fn(),
  });

  expect(repository.appendRunEvents).toHaveBeenCalledWith(expect.objectContaining({
    runId: run.id,
    events: [expect.objectContaining({
      type: 'conversation_referent', visibility: 'internal',
      payload: {
        schemaVersion: 2, kind: 'pending_work', items: [
          expect.objectContaining({ proposalId: 'proposal-milk', expectedVersion: 1, sequence: 1 }),
          expect.objectContaining({ proposalId: 'proposal-mom', expectedVersion: 1, sequence: 2 }),
        ],
      },
    })],
  }));
  expect(repository.createProposal).toHaveBeenNthCalledWith(1, expect.objectContaining({
    outcomeStep: { sequence: 2, dependsOnSequence: null },
  }));
  expect(repository.createProposal).toHaveBeenNthCalledWith(2, expect.objectContaining({
    outcomeStep: { sequence: 3, dependsOnSequence: 2 },
  }));
});

test('outcome phase does not persist a partial all-matching proposal batch', async () => {
  const { repository } = harness();
  await materializeUnifiedChatOutcomePhase({
    threadId: 'thread-1',
    run: await repository.createRun(),
    visibleBody: 'I could not prepare the complete target set. Nothing was changed.',
    actionResponse: null,
    toolProvider: {
      proposals: () => [{
        capabilityId: 'goals', title: 'Update one goal', body: 'Partial batch.',
        operation: {
          type: 'update_goal', targetId: 'goal-1',
          payload: { title: '★ Goal', expectedUpdatedAt: '2026-08-04T00:00:00.000Z' },
        },
      }],
      clientActions: () => [],
    } as never,
    runtimeToolEvents: [],
    requestPolicy: {
      requestClass: 'capability_action', participatingCapabilities: ['goals'],
      usePrivateContext: true, policyReason: 'test', clarification: null,
    },
    snapshots: {
      goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
    },
    planConversationReferent: null,
    actionOutcomeTruth: {
      state: 'failed', visibleBody: null, invariantCodes: ['uncovered_action_targets'],
      loadedRecordCount: 2, preparedChangeCount: 1, failedToolCount: 0,
    },
    repository: repository as never,
    setFailureCode: jest.fn(),
  });

  expect(repository.createProposal).not.toHaveBeenCalled();
});

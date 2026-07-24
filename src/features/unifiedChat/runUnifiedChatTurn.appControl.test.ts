import { buildAppControlOutcome, runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';

const aggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1', title: 'New chat', titleSource: 'default', status: 'active', archivedAt: null,
    createdAt: '2026-07-21T10:00:00.000Z', updatedAt: '2026-07-21T10:00:00.000Z',
  },
  messages: [], runs: [],
};

function harness(sender: jest.Mock) {
  const repository = {
    insertMessage: jest.fn(async (input: CreateUnifiedChatMessageInput) => ({
      id: input.role === 'user' ? 'message-user' : 'message-assistant', threadId: 'thread-1',
      role: input.role, body: input.body, feedback: null, attachments: [],
      createdAt: '2026-07-23T10:00:00.000Z', updatedAt: '2026-07-23T10:00:00.000Z',
    })),
    createRun: jest.fn(async () => ({
      id: 'run-1', threadId: 'thread-1', userMessageId: 'message-user', assistantMessageId: null,
      status: 'active' as const, errorCode: null, errorMessage: null, requestClass: 'general' as const,
      participatingCapabilities: [], contextPolicy: {}, version: 1, stopRequestedAt: null, steerCount: 0,
      createdAt: '2026-07-23T10:00:00.000Z', updatedAt: '2026-07-23T10:00:00.000Z', completedAt: null,
    })),
    appendRunEvents: jest.fn(async () => undefined), persistRunEvidence: jest.fn(async () => undefined),
    createProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'pending' })),
    createClientAction: jest.fn(async () => ({ id: 'action-1', status: 'pending_client_action' })),
    decideProposal: jest.fn(), transitionClientAction: jest.fn(), transitionRunStatus: jest.fn(async () => ({})),
    loadThread: jest.fn(async () => aggregate),
    applyGeneratedThreadTitle: jest.fn(async () => null),
  };
  const send = jest.fn((...args: unknown[]) => sender(...args));
  return { repository, send };
}

test('normalizes conversational turns around authoritative outcomes', () => {
  expect(buildAppControlOutcome({ text: 'Here is tomorrow.', proposalIds: [], receiptIds: [], clientActionIds: [] }))
    .toEqual({ type: 'answer', text: 'Here is tomorrow.' });
  expect(buildAppControlOutcome({ text: 'Ready.', proposalIds: ['proposal-1'], receiptIds: [], clientActionIds: [] }))
    .toEqual({ type: 'review', proposalIds: ['proposal-1'] });
  expect(buildAppControlOutcome({ text: 'Done.', proposalIds: [], receiptIds: ['receipt-1'], clientActionIds: [] }))
    .toEqual({ type: 'applied', receiptIds: ['receipt-1'] });
  expect(buildAppControlOutcome({ text: 'Continue.', proposalIds: [], receiptIds: [], clientActionIds: ['action-1'] }))
    .toEqual({ type: 'native_handoff', actionId: 'action-1' });
});

test('reports official tomorrow Plan items separately from recommendations', async () => {
  const { repository, send } = harness(jest.fn(async () => JSON.stringify({
    answer: 'Model prose is not authoritative.', facts: ['The Plan snapshot is current.'],
    inference: 'Nothing else is inferred.', uncertainty: 'No other capabilities were checked.',
  })));
  await runUnifiedChatTurn(
    { aggregate, prompt: "What's officially on my Plan tomorrow?" },
    {
      repository: repository as never, sendCoachChat: send as never,
      loadCapabilitySnapshots: async () => ({
        goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        plan: {
          targetDate: '2026-07-24T18:00:00.000Z', writeCalendarRef: null,
          limitation: 'no_write_calendar' as const,
          scheduledItems: [
            { activityId: 'school', title: 'Call the school', goalTitle: null, placement: 'calendar' as const, startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z' },
            { activityId: 'trash', title: 'Take out the trash', goalTitle: null, placement: 'day' as const, startDate: null, endDate: null },
          ],
          recommendations: [{
            activityId: 'lunch', expectedUpdatedAt: '2026-07-23T10:00:00.000Z', title: 'Pack lunch',
            goalTitle: null, priorityPosition: 0,
            placement: { status: 'unplaced' as const, reason: 'no_write_calendar' as const },
          }],
        },
      }),
    },
  );
  const body = repository.insertMessage.mock.calls.find(([input]) => input.role === 'assistant')?.[0].body;
  expect(body).toContain('Already on your Plan for tomorrow');
  expect(body).toContain('Call the school');
  expect(body).toContain('Take out the trash');
  expect(body).toContain('Recommended next');
  expect(body).toContain('Pack lunch');
  expect(repository.createProposal).not.toHaveBeenCalled();
});

test('stages walking follow-through without inventing an Activity Goal id', async () => {
  const runtimeSender = jest.fn(async (_history: unknown, options: {
    launchContextSummary?: string;
    runtimeTools?: Array<{ id: string }>;
    executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
  }) => {
    expect(options.launchContextSummary).toContain('Do not invent an Arc or call activities.capture before');
    const goalTool = options.runtimeTools?.find((tool) => tool.id === 'goals.create');
    await options.executeRuntimeTool?.({
      id: 'goal-walk', toolId: 'goals.create', arguments: {
        title: 'Walk every day for the next week', targetDate: '2026-07-30T23:59:59.000-06:00',
        followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
      },
    }, goalTool);
    return 'I prepared the walking Goal for review.';
  });
  const { repository, send } = harness(runtimeSender);
  await runUnifiedChatTurn(
    { aggregate, prompt: 'Create a goal to walk every day for the next week.' },
    {
      repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
      routeRequest: async () => ({
        requestClass: 'capability_action', participatingCapabilities: ['goals'], usePrivateContext: true,
        confidence: 0.99, reason: 'Goal creation requested.',
      }),
      loadCapabilitySnapshots: async () => ({
        goals: { goals: [], arcIds: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
      }),
    },
  );
  expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'goals', operation: expect.objectContaining({
      type: 'create_goal', targetId: null,
      payload: expect.objectContaining({
        targetDate: '2026-07-30T23:59:59.000-06:00',
        followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
      }),
    }),
  }));
  expect(repository.createProposal).toHaveBeenCalledTimes(1);
});

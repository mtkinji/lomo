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
    createProposal: jest.fn(async (_input: unknown) => ({ id: 'proposal-1', status: 'pending' })),
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
    answer: 'Model prose is not authoritative.',
    facts: [{ text: 'The Plan snapshot is current.', evidence: ['E1'] }],
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

test('preserves the next-week bound when the model omits the Goal target date', async () => {
  const runtimeSender = jest.fn(async (_history: unknown, options: {
    runtimeTools?: Array<{ id: string }>;
    executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
  }) => {
    const goalTool = options.runtimeTools?.find((tool) => tool.id === 'goals.create');
    await options.executeRuntimeTool?.({
      id: 'goal-walk', toolId: 'goals.create', arguments: {
        title: 'Walk every day next week', description: 'Take a walk each day next week.',
        followUpActivity: { title: 'Walk', repeatRule: 'daily' },
      },
    }, goalTool);
    return 'I prepared that Goal for review.';
  });
  const { repository, send } = harness(runtimeSender);
  await runUnifiedChatTurn(
    { aggregate, prompt: 'Create a Goal to walk every day next week.' },
    {
      repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
      now: () => new Date(2026, 6, 23, 12),
      routeRequest: async () => ({
        requestClass: 'capability_action', participatingCapabilities: ['goals'],
        usePrivateContext: true, confidence: 0.99, reason: 'Create a bounded walking Goal.',
      }),
      loadCapabilitySnapshots: async () => ({
        goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
      }),
    },
  );

  const proposal = repository.createProposal.mock.calls[0]?.[0] as {
    operation?: { payload?: { targetDate?: string; followUpActivity?: unknown } };
  };
  const target = new Date(proposal.operation?.payload?.targetDate ?? '');
  expect([target.getDay(), target.getDate(), target.getMonth()]).toEqual([0, 2, 7]);
  expect(proposal.operation?.payload?.followUpActivity).toEqual({ title: 'Walk', repeatRule: 'daily' });
});

test('stages a reviewed family Screen Time control from authorized saved-selection evidence', async () => {
  const sender = jest.fn(async (_history, options) => {
    const screenTimeTool = options.runtimeTools?.find((tool: { id: string }) => tool.id === 'screen_time.override.allow');
    await options.executeRuntimeTool?.({
      id: 'allow-brawl-stars', toolId: 'screen_time.override.allow', arguments: {
        targets: [{ childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 }],
        timeBasis: 'wall_clock', expiresAt: '2026-07-30T11:00:00.000Z',
      },
    }, screenTimeTool);
    return 'I prepared that Screen Time change for review.';
  });
  const { repository, send } = harness(sender);

  await runUnifiedChatTurn(
    { aggregate, prompt: 'Turn on Brawl Stars for Charlie.' },
    {
      repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
      now: () => new Date('2026-07-30T10:00:00.000Z'),
      loadCapabilitySnapshots: async () => ({
        goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        screenTime: { children: [{
          membershipId: 'charlie', displayName: 'Charlie', canManage: true,
          policy: {
            childMembershipId: 'charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 7,
            selections: [{ id: 'selection-charlie', label: 'Brawl Stars', selectionRef: 'opaque', status: 'active' }],
            agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
          },
        }] },
      }),
    },
  );

  expect(sender).toHaveBeenCalled();
  expect(repository.createClientAction).not.toHaveBeenCalled();
  expect(repository.createProposal).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'screenTime', title: 'Allow Brawl Stars',
    operation: expect.objectContaining({
      type: 'allow_family_screen_time_selection',
      payload: expect.objectContaining({ expiresAt: '2026-07-30T11:00:00.000Z' }),
    }),
  }));
});

test('routes a self budget-triggered app pause through Money review without child tools', async () => {
  const sender = jest.fn(async (_history, options) => {
    const toolIds = options.runtimeTools?.map((tool: { id: string }) => tool.id) ?? [];
    expect(toolIds).toContain('money.app_control.review');
    expect(toolIds).toContain('screen_time.personal.setup.open');
    expect(toolIds).not.toContain('screen_time.configure');
    expect(toolIds).not.toContain('screen_time.override.allow');
    const appControlTool = options.runtimeTools?.find(
      (tool: { id: string }) => tool.id === 'money.app_control.review',
    );
    await options.executeRuntimeTool?.({
      id: 'shopping-app-control', toolId: 'money.app_control.review', arguments: {
        subject: { kind: 'self' },
        condition: { owner: 'money', categoryId: 'shopping', preset: 'when_hot' },
        effect: {
          owner: 'screenTime', kind: 'pause_selected_apps', suggestedAppLabels: ['Amazon'],
        },
      },
    }, appControlTool);
    return 'I prepared the Shopping app control for your review.';
  });
  const { repository, send } = harness(sender);

  await runUnifiedChatTurn(
    {
      aggregate,
      prompt: 'Not for him, for me. I want to block Amazon and other shopping apps if my budgets are being spent faster than they should for this time of the month, already over budget.',
    },
    {
      repository: repository as never, sendCoachChat: send as never, enableRuntimeTools: true,
      loadCapabilitySnapshots: async () => ({
        goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
        screenTime: {
          self: { kind: 'self', deviceScope: 'current_device', authorizationStatus: 'approved' },
          children: [],
        },
        money: {
          periodLabel: 'August 2026', generatedAt: '2026-08-13T12:00:00.000Z', lastSyncedAt: null,
          totals: { plannedCents: 10000, spentCents: 11000, remainingCents: -1000, needsReviewCount: 0 },
          forecast: {
            projectedSpendCents: 15000, projectionRangeLowCents: 14000,
            projectionRangeHighCents: 16000, projectedRemainingCents: -5000,
            projectedOverageCents: 5000, confidence: 'high', atRiskCategoryCount: 1,
          },
          outsidePlan: { spentCents: 0, transactionCount: 0 },
          categories: [{
            id: 'shopping', sourceId: 'shopping', name: 'Shopping', description: null,
            accentColor: '#000000', plannedCents: 10000, spentCents: 11000,
            remainingCents: -1000, percentUsed: 110, transactionCount: 2,
            rolloverEnabled: false, fundingRhythm: 'monthly', fundingPolicyVersion: null,
            starterWeight: 1, monthlyContributionCents: 10000, reserveAvailableCents: 0,
            reserveBalanceCents: 0, reserveBalancePeriodId: null, reserveAvailabilityKnown: true,
            expectedNeed: null, fundingCoverage: 'uncovered',
            forecast: {
              projectedSpendCents: 15000, projectedRemainingCents: -5000,
              projectedOverageCents: 5000, confidence: 'high',
            },
          }],
          transactions: [], accounts: [], livingLimitAnswer: null,
        } as never,
      }),
    },
  );

  expect(repository.createClientAction).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'money', actionType: 'review_money_app_control', targetId: 'shopping',
    payload: expect.objectContaining({
      subject: { kind: 'self' }, preset: 'when_hot', suggestedAppLabels: ['Amazon'],
    }),
  }));
  expect(repository.createProposal).not.toHaveBeenCalled();
});

import { runUnifiedChatTurn } from './runUnifiedChatTurn';
import type { CreateUnifiedChatMessageInput, UnifiedChatThreadAggregate } from './types';
import type { Goal } from '../../domain/types';
import { AnalyticsEvent } from '../../services/analytics/events';

const aggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1', title: 'New chat', titleSource: 'default', status: 'active', archivedAt: null,
    createdAt: '2026-08-05T12:00:00.000Z', updatedAt: '2026-08-05T12:00:00.000Z',
  },
  messages: [],
  runs: [],
};

const goal: Goal = {
  id: 'goal-reading', arcId: null, title: 'Read more', status: 'planned',
  forceIntent: {}, metrics: [], createdAt: 'before', updatedAt: 'current',
};

const judgment = {
  schemaVersion: 1 as const,
  userJob: 'Rename the reading Goal',
  desiredOutcome: 'The Goal title is ready for review',
  requestClass: 'capability_action' as const,
  participatingCapabilities: ['goals' as const],
  usePrivateContext: true,
  informationNeed: 'stable' as const,
  authorization: 'explicit_request' as const,
  evidenceScope: 'focused' as const,
  responseContract: 'evidence_linked' as const,
  executionMode: 'single_tool' as const,
  constraints: [{
    kind: 'title' as const,
    sourceText: 'Stronger this year',
    normalizedValue: 'Stronger this year',
  }],
  steps: [{ sequence: 1, objective: 'Rename the Goal', toolId: 'goals.update', dependsOn: null }],
  clarificationQuestion: null,
  confidence: 0.98,
  reason: 'One Goal update is required.',
};

function harness(sender: jest.Mock) {
  let proposalSequence = 0;
  const repository = {
    insertMessage: jest.fn(async (input: CreateUnifiedChatMessageInput) => ({
      id: input.role === 'user' ? 'message-user' : 'message-assistant',
      threadId: 'thread-1', role: input.role, body: input.body, feedback: null,
      createdAt: '2026-08-05T12:01:00.000Z', updatedAt: '2026-08-05T12:01:00.000Z', attachments: [],
    })),
    createRun: jest.fn(async () => ({
      id: 'run-1', threadId: 'thread-1', userMessageId: 'message-user', assistantMessageId: null,
      status: 'active' as const, errorCode: null, errorMessage: null,
      createdAt: '2026-08-05T12:01:00.000Z', updatedAt: '2026-08-05T12:01:00.000Z', completedAt: null,
      requestClass: 'capability_action' as const, participatingCapabilities: ['goals' as const],
      contextPolicy: { usePrivateContext: true, reason: 'test', clarification: null },
      version: 1, stopRequestedAt: null, steerCount: 0,
    })),
    appendRunEvents: jest.fn(async () => undefined),
    persistRunEvidence: jest.fn(async () => undefined),
    createProposal: jest.fn(async () => ({
      id: `proposal-${++proposalSequence}`, status: 'pending' as const, version: 1,
    })),
    createClientAction: jest.fn(async () => ({ id: 'action-1', status: 'pending_client_action' as const })),
    decideProposal: jest.fn(async () => ({})),
    transitionClientAction: jest.fn(async () => ({})),
    transitionRunStatus: jest.fn(async () => ({})),
    loadThread: jest.fn(async () => aggregate),
    applyGeneratedThreadTitle: jest.fn(async () => null),
  };
  const sendCoachChat = jest.fn(async (...args: unknown[]) => sender(...args));
  return { repository, sendCoachChat };
}

const snapshots = async () => ({
  goals: { goals: [goal], arcIds: [] },
  todos: { activities: [], goals: [goal] },
  chapters: { chapters: [] },
});

describe('Unified Chat action reliability', () => {
  test('retries one transient model failure internally and completes the user turn', async () => {
    const transient = new Error('temporary upstream failure');
    const sender = jest.fn()
      .mockRejectedValueOnce(transient)
      .mockResolvedValueOnce('Here is a short answer.');
    const { repository, sendCoachChat } = harness(sender);

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Tell me something encouraging.' },
      {
        repository: repository as never,
        sendCoachChat: sendCoachChat as never,
        loadCapabilitySnapshots: snapshots,
      },
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[1]?.[1]).toMatchObject({
      aiJob: 'lightweight_helper',
      creditPolicy: 'internal_helper',
      conversationTitlePolicy: undefined,
    });
    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: 'assistant', body: 'Here is a short answer.',
    }));
    expect(repository.transitionRunStatus).not.toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'failed',
    }));
  });

  test('does not retry quota exhaustion as a transient failure', async () => {
    const quotaError = Object.assign(new Error('AI credits exhausted'), {
      code: 'quota_exceeded',
    });
    const sender = jest.fn().mockRejectedValue(quotaError);
    const { repository, sendCoachChat } = harness(sender);
    const captureTelemetry = jest.fn();

    await expect(runUnifiedChatTurn(
      { aggregate, prompt: 'Tell me something encouraging.' },
      {
        repository: repository as never,
        sendCoachChat: sendCoachChat as never,
        loadCapabilitySnapshots: snapshots,
        captureTelemetry,
      },
    )).rejects.toThrow('Kwilt could not finish that response.');

    expect(sender).toHaveBeenCalledTimes(1);
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'failed', errorCode: 'model_response_failed',
    }));
    expect(captureTelemetry).toHaveBeenCalledWith(
      AnalyticsEvent.UnifiedChatAgentPlanOutcome,
      expect.objectContaining({
        outcome: 'terminal_failure',
        failure_code: 'model_response_failed',
        attempt_number: 1,
        recovery_attempted: false,
        terminal_failure: true,
      }),
    );
  });

  test('repairs one malformed structured response before failing the turn', async () => {
    const sender = jest.fn()
      .mockResolvedValueOnce('{"answer":"I can do that."}')
      .mockResolvedValueOnce(JSON.stringify({
        answer: 'I prepared the To-do for review.',
        proposal: {
          title: 'Add Buy milk',
          body: 'Creates one planned To-do.',
          operation: {
            type: 'create_activity',
            targetId: null,
            expectedUpdatedAt: null,
            payload: { title: 'Buy milk', status: 'planned' },
          },
        },
      }));
    const { repository, sendCoachChat } = harness(sender);

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Create a To-do called Buy milk.' },
      {
        repository: repository as never,
        sendCoachChat: sendCoachChat as never,
        loadCapabilitySnapshots: snapshots,
      },
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[1]?.[1]).toMatchObject({
      aiJob: 'lightweight_helper',
      creditPolicy: 'internal_helper',
    });
    expect(repository.createProposal).toHaveBeenCalledTimes(1);
    expect(repository.transitionRunStatus).not.toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'failed',
    }));
  });

  test('repairs one empty visible response before failing the turn', async () => {
    const sender = jest.fn()
      .mockResolvedValueOnce('   ')
      .mockResolvedValueOnce('Here is the answer.');
    const { repository, sendCoachChat } = harness(sender);

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Tell me something useful.' },
      {
        repository: repository as never,
        sendCoachChat: sendCoachChat as never,
        loadCapabilitySnapshots: snapshots,
      },
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: 'assistant', body: 'Here is the answer.',
    }));
    expect(repository.transitionRunStatus).not.toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'failed',
    }));
  });

  test('requires the planned action tool and repairs a prose-only first response', async () => {
    let attempt = 0;
    const sender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      runtimeToolChoice?: 'auto' | 'required';
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
      aiJob?: string;
      creditPolicy?: string;
    }) => {
      attempt += 1;
      expect(options.runtimeToolChoice).toBe('required');
      if (attempt === 1) return 'Done. I updated the Goal.';

      expect(options.runtimeTools?.map((tool) => tool.id)).toEqual(['goals.update']);
      expect(options.aiJob).toBe('lightweight_helper');
      expect(options.creditPolicy).toBe('internal_helper');
      const tool = options.runtimeTools?.[0];
      await options.executeRuntimeTool?.({
        id: 'goal-update-recovery', toolId: 'goals.update',
        arguments: { goalId: goal.id, fields: { title: 'Stronger this year' } },
      }, tool);
      return 'I prepared that Goal change for review.';
    });
    const { repository, sendCoachChat } = harness(sender);

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Rename my goal to Stronger this year.' },
      {
        repository: repository as never, sendCoachChat: sendCoachChat as never,
        enableRuntimeTools: true, requestJudgment: async () => judgment,
        loadCapabilitySnapshots: snapshots,
      },
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(repository.createProposal).toHaveBeenCalledTimes(1);
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'complete',
      event: expect.objectContaining({ label: 'Prepared a change for review' }),
    }));
  });

  test('requires the personal Screen Time handoff for the dogfood wording', async () => {
    const sender = jest.fn(async (_history: unknown, options: {
      runtimeTools?: Array<{ id: string }>;
      runtimeToolChoice?: 'auto' | 'required';
      executeRuntimeTool?: (call: unknown, tool: unknown) => Promise<unknown>;
    }) => {
      expect(options.runtimeToolChoice).toBe('required');
      const tool = options.runtimeTools?.find((candidate) => candidate.id === 'screen_time.personal.limit.open');
      expect(tool).toBeDefined();
      await options.executeRuntimeTool?.({
        id: 'personal-limit', toolId: 'screen_time.personal.limit.open', arguments: {
          subject: { kind: 'self' }, suggestedAppLabel: 'Instagram', limitMinutes: 10, reset: 'daily',
        },
      }, tool);
      return 'I opened the personal Screen Time rule for review.';
    });
    const { repository, sendCoachChat } = harness(sender);

    await runUnifiedChatTurn({
      aggregate,
      prompt: 'Set a screen time rule that allows me to use Instagram for 10 minutes before I have to turn it off.',
    }, {
      repository: repository as never,
      sendCoachChat: sendCoachChat as never,
      enableRuntimeTools: true,
      loadCapabilitySnapshots: snapshots,
    });

    expect(repository.createClientAction).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'open_personal_screen_time_limit',
      targetId: 'self',
      payload: expect.objectContaining({ limitMinutes: 10, reset: 'daily' }),
    }));
  });

  test('finishes with a clarification when bounded recovery still cannot stage work', async () => {
    const sender = jest.fn(async () => 'Done. I updated the Goal.');
    const { repository, sendCoachChat } = harness(sender);

    await runUnifiedChatTurn(
      { aggregate, prompt: 'Rename my goal to Stronger this year.' },
      {
        repository: repository as never, sendCoachChat: sendCoachChat as never,
        enableRuntimeTools: true, requestJudgment: async () => judgment,
        loadCapabilitySnapshots: snapshots,
      },
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(repository.createProposal).not.toHaveBeenCalled();
    expect(repository.insertMessage).toHaveBeenCalledWith(expect.objectContaining({
      role: 'assistant', body: expect.stringMatching(/nothing was changed/i),
    }));
    expect(repository.transitionRunStatus).toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'complete',
      event: expect.objectContaining({ label: 'Clarification needed' }),
    }));
    expect(repository.transitionRunStatus).not.toHaveBeenCalledWith(expect.objectContaining({
      toStatus: 'failed',
    }));
  });
});

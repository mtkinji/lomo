import type { AgentJudgment } from './agentJudgment';
import { planUnifiedChatTurnPhase } from './turnPlanningPhase';
import type { UnifiedChatThreadAggregate } from './types';

const emptyAggregate = {
  thread: {
    id: 'thread-1', title: 'New chat', titleSource: 'default', status: 'active', archivedAt: null,
    createdAt: '2026-08-01T12:00:00.000Z', updatedAt: '2026-08-01T12:00:00.000Z',
  },
  messages: [],
  runs: [],
} as UnifiedChatThreadAggregate;

const dentistJudgment: AgentJudgment = {
  schemaVersion: 1,
  userJob: 'Remember to call the dentist on the requested date',
  desiredOutcome: 'A dated call Activity exists',
  requestClass: 'capability_action',
  participatingCapabilities: ['todos'],
  usePrivateContext: false,
  informationNeed: 'stable',
  executionMode: 'single_tool',
  constraints: [
    { kind: 'title', sourceText: 'Call the dentist', normalizedValue: 'Call the dentist' },
    { kind: 'date', sourceText: 'August 5', normalizedValue: '2026-08-05' },
  ],
  steps: [{ sequence: 1, objective: 'Capture the dated call', toolId: 'activities.capture', dependsOn: null }],
  clarificationQuestion: null,
  confidence: 0.97,
  reason: 'One dated Activity capture achieves the outcome.',
};

function plan(overrides: Partial<Parameters<typeof planUnifiedChatTurnPhase>[0]> = {}) {
  return planUnifiedChatTurnPhase({
    prompt: 'Add Call the dentist on August 5.',
    aggregate: emptyAggregate,
    activeContext: [],
    requestJudgment: async () => dentistJudgment,
    routeRequest: async () => null,
    now: new Date('2026-08-01T16:30:00.000Z'),
    timeZone: 'America/Denver',
    signal: undefined,
    ...overrides,
  });
}

describe('planUnifiedChatTurnPhase agent judgment', () => {
  it('preserves an explicit date in a successful Activity judgment', async () => {
    const result = await plan();

    expect(result.requestPolicy).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['todos'],
    });
    expect(result.agentJudgment).toMatchObject({
      userJob: 'Remember to call the dentist on the requested date',
      executionMode: 'single_tool',
      constraints: [
        expect.objectContaining({ kind: 'title', normalizedValue: 'Call the dentist' }),
        expect.objectContaining({ kind: 'date', normalizedValue: '2026-08-05' }),
      ],
    });
    expect(result.judgmentSource).toBe('model');
  });

  it.each([
    ['I need legal advice about a court order.', 'better_served_elsewhere'],
    ['Block games with Screen Time.', 'native_control'],
  ])('does not let judgment weaken the deterministic lock for %s', async (prompt, requestClass) => {
    const requestJudgment = jest.fn(async () => dentistJudgment);
    const result = await plan({ prompt, requestJudgment });

    expect(result.requestPolicy.requestClass).toBe(requestClass);
    expect(result.agentJudgment).toBeNull();
    expect(result.judgmentSource).toBe('deterministic_fallback');
    expect(requestJudgment).not.toHaveBeenCalled();
  });

  it('uses the semantic route only when judgment is unavailable', async () => {
    const routeRequest = jest.fn(async () => ({
      requestClass: 'capability_question' as const,
      participatingCapabilities: ['plan' as const],
      usePrivateContext: true,
      informationNeed: 'stable' as const,
      confidence: 0.94,
      reason: 'The user wants the current Plan for tomorrow.',
    }));
    const result = await plan({
      prompt: 'Could you tell me what tomorrow already looks like in Kwilt?',
      requestJudgment: async () => null,
      routeRequest,
    });

    expect(result.agentJudgment).toBeNull();
    expect(result.judgmentSource).toBe('semantic_fallback');
    expect(routeRequest).toHaveBeenCalledTimes(1);
    expect(result.requestPolicy.participatingCapabilities).toEqual(['plan']);
  });

  it('does not make the semantic planning call after a valid judgment', async () => {
    const routeRequest = jest.fn(async () => null);
    const result = await plan({ routeRequest });

    expect(result.judgmentSource).toBe('model');
    expect(routeRequest).not.toHaveBeenCalled();
  });

  it('grounds a short correction in pending reviewed work', async () => {
    const aggregate = {
      ...emptyAggregate,
      messages: [{
        id: 'assistant-1', threadId: 'thread-1', role: 'assistant', body: 'I prepared Call the dentist for review.',
        feedback: null, createdAt: '2026-08-01T12:01:00.000Z', updatedAt: '2026-08-01T12:01:00.000Z', attachments: [],
      }],
      runs: [{
        id: 'run-previous', threadId: 'thread-1', userMessageId: 'user-previous', assistantMessageId: 'assistant-1',
        status: 'complete', errorCode: null, errorMessage: null, createdAt: '2026-08-01T12:00:00.000Z',
        updatedAt: '2026-08-01T12:01:00.000Z', completedAt: '2026-08-01T12:01:00.000Z',
        requestClass: 'capability_action', participatingCapabilities: ['todos'],
        contextPolicy: { usePrivateContext: true, reason: 'test', clarification: null }, version: 1,
        stopRequestedAt: null, steerCount: 0,
      }],
      events: [{
        id: 'event-1', runId: 'run-previous', sequence: 1, type: 'conversation_referent', status: 'success',
        visibility: 'internal', label: 'Pending work', detail: null, createdAt: '2026-08-01T12:01:00.000Z',
        payload: {
          schemaVersion: 2, kind: 'pending_work', items: [{
            proposalId: 'private-proposal-id', expectedVersion: 1, capabilityId: 'todos',
            operationType: 'create_activity', targetId: null, expectedUpdatedAt: null,
            label: 'Call the dentist', sequence: 1,
          }],
        },
      }],
    } as UnifiedChatThreadAggregate;
    const requestJudgment = jest.fn(async () => ({
      ...dentistJudgment,
      userJob: 'Correct the pending dentist call date',
      constraints: [{ kind: 'date' as const, sourceText: 'Thursday', normalizedValue: '2026-08-06' }],
    }));

    await plan({ prompt: 'Actually, make that Thursday.', aggregate, requestJudgment });
    const judgmentPrompt = (requestJudgment.mock.calls[0] as unknown as [{ prompt: string }])[0].prompt;
    expect(judgmentPrompt).toContain('Call the dentist');
    expect(judgmentPrompt).not.toContain('private-proposal-id');
  });
});

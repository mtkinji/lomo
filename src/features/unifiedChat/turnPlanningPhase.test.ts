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
  authorization: 'explicit_request',
  evidenceScope: 'none',
  responseContract: 'direct',
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
    interactionMode: 'text',
    attachmentCount: 0,
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
  it('does not serialize a planning model call before a lightweight typed greeting', async () => {
    const requestJudgment = jest.fn(async () => null);
    const routeRequest = jest.fn(async () => null);

    const result = await plan({
      prompt: 'Yo',
      requestJudgment,
      routeRequest,
    });

    expect(result.planningStrategy).toBe('fast_direct');
    expect(result.requestPolicy).toMatchObject({
      requestClass: 'general',
      participatingCapabilities: [],
      usePrivateContext: false,
    });
    expect(requestJudgment).not.toHaveBeenCalled();
    expect(routeRequest).not.toHaveBeenCalled();
  });

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
    expect(result.turnContract).toMatchObject({
      schemaVersion: 2,
      userJob: 'Remember to call the dentist on the requested date',
      desiredOutcome: 'A dated call Activity exists',
      constraints: ['Call the dentist', 'August 5'],
      action: {
        operationIds: ['activities.capture'], targetScope: 'selected_objects',
        targetQuery: 'Add Call the dentist on August 5.',
      },
      referent: null,
    });
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

  it('uses one bounded budget across judgment and semantic fallback', async () => {
    const requestJudgment = jest.fn(({ signal }: { signal?: AbortSignal }) =>
      new Promise<null>((resolve) => signal?.addEventListener('abort', () => resolve(null), { once: true })));
    const routeRequest = jest.fn(async () => null);

    const result = await plan({
      prompt: 'What should I work on tomorrow?',
      planningBudgetMs: 10,
      requestJudgment,
      routeRequest,
    });

    expect(requestJudgment).toHaveBeenCalledTimes(1);
    expect(routeRequest).not.toHaveBeenCalled();
    expect(result.judgmentSource).toBe('deterministic_fallback');
    expect(result.requestPolicy).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
    });
  });

  it('lets a coherent read-only judgment override an action-like lexical Money guess', async () => {
    const prompt = 'Look into my budgets and transactions. What additional budgets or changes to my existing budgets might I make for a better budget system?';
    const moneyReviewJudgment: AgentJudgment = {
      ...dentistJudgment,
      userJob: 'Assess whether the current budget system fits the user’s spending patterns',
      desiredOutcome: 'Evidence-linked recommendations without changing Money records',
      requestClass: 'capability_question',
      participatingCapabilities: ['money'],
      usePrivateContext: true,
      authorization: 'none',
      evidenceScope: 'broad',
      responseContract: 'evidence_linked',
      executionMode: 'single_tool',
      constraints: [],
      steps: [{ sequence: 1, objective: 'Read the current Money system', toolId: 'money.read', dependsOn: null }],
      reason: 'The user requested analysis and recommendations, not a mutation.',
    };

    const result = await plan({ prompt, requestJudgment: async () => moneyReviewJudgment });

    expect(result.judgmentSource).toBe('model');
    expect(result.requestPolicy).toMatchObject({
      requestClass: 'capability_question', participatingCapabilities: ['money'], usePrivateContext: true,
    });
    expect(result.turnContract).toMatchObject({
      authorization: 'none', evidenceScope: 'broad', responseContract: 'evidence_linked', action: null,
    });
  });

  it('rejects a write plan that has no interpreted action authority', async () => {
    const unauthorized = { ...dentistJudgment, authorization: 'none' as const };
    const result = await plan({ requestJudgment: async () => unauthorized });

    expect(result.agentJudgment).toBeNull();
    expect(result.judgmentSource).not.toBe('model');
  });

  it('rejects an action judgment whose plan contains no write tool', async () => {
    const readOnlyActionJudgment: AgentJudgment = {
      ...dentistJudgment,
      userJob: 'Plan tomorrow',
      desiredOutcome: 'A useful plan for tomorrow',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      constraints: [{ kind: 'date', sourceText: 'tomorrow', normalizedValue: '2026-08-02' }],
      steps: [{
        sequence: 1,
        objective: 'Recommend a realistic day',
        toolId: 'plan.recommend_day',
        dependsOn: null,
      }],
    };
    const routeRequest = jest.fn(async () => null);

    const result = await plan({
      prompt: 'Plan tomorrow',
      requestJudgment: async () => readOnlyActionJudgment,
      routeRequest,
    });

    expect(result.agentJudgment).toBeNull();
    expect(result.judgmentSource).toBe('deterministic_fallback');
    expect(result.requestPolicy).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
    });
    expect(routeRequest).toHaveBeenCalledTimes(1);
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
        id: 'event-1', threadId: 'thread-1', runId: 'run-previous', sequence: 1,
        type: 'conversation_referent', status: 'complete',
        visibility: 'internal', label: 'Pending work', detail: null,
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

import type { AgentJudgment } from './agentJudgment';
import {
  buildUnifiedChatTurnContract,
  classifyTurnReference,
  parseUnifiedChatTurnContract,
  resolveLatestTurnContract,
} from './turnContract';
import type { UnifiedChatThreadAggregate } from './types';

const moneyJudgment: AgentJudgment = {
  schemaVersion: 1,
  userJob: 'Give every Money category a recognizable emoji',
  desiredOutcome: 'Every category name begins with a suitable emoji',
  requestClass: 'capability_action',
  participatingCapabilities: ['money'],
  usePrivateContext: true,
  informationNeed: 'stable',
  authorization: 'explicit_request',
  evidenceScope: 'broad',
  responseContract: 'evidence_linked',
  executionMode: 'single_tool',
  constraints: [{
    kind: 'other', sourceText: 'emoji at the beginning', normalizedValue: 'emoji_prefix',
  }],
  steps: [{
    sequence: 1, objective: 'Prepare category renames', toolId: 'money.category.rename', dependsOn: null,
  }],
  clarificationQuestion: null,
  confidence: 0.97,
  reason: 'The Money category rename tool owns this reviewed action.',
};

const moneyPolicy = {
  requestClass: 'capability_action' as const,
  participatingCapabilities: ['money' as const],
  usePrivateContext: true,
  clarification: null,
  policyReason: 'semantic-route:bulk category rename',
};

describe('Unified Chat Turn Contract', () => {
  test('derives all-matching target scope independently of capability metadata', () => {
    expect(buildUnifiedChatTurnContract({
      prompt: 'Add an emoji to every Money category that does not have one.',
      requestPolicy: moneyPolicy,
      agentJudgment: moneyJudgment,
      previous: null,
    })).toEqual({
      schemaVersion: 2,
      userJob: 'Give every Money category a recognizable emoji',
      desiredOutcome: 'Every category name begins with a suitable emoji',
      constraints: ['emoji at the beginning'],
      requestClass: 'capability_action',
      participatingCapabilities: ['money'],
      usePrivateContext: true,
      authorization: 'explicit_request',
      evidenceScope: 'broad',
      responseContract: 'evidence_linked',
      action: {
        operationIds: ['money.category.rename'],
        targetScope: 'all_matching',
        targetQuery: 'Add an emoji to every Money category that does not have one.',
      },
      referent: null,
    });
  });

  test('reads a version-one contract with safe analysis defaults', () => {
    expect(parseUnifiedChatTurnContract({
      schemaVersion: 1,
      userJob: 'Review my current plan',
      desiredOutcome: 'Explain what needs attention',
      constraints: [],
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      action: null,
      referent: null,
    })).toMatchObject({
      schemaVersion: 2,
      authorization: 'none',
      evidenceScope: 'focused',
      responseContract: 'evidence_linked',
    });
  });

  test.each([
    ['read-only turn with action authority', { authorization: 'explicit_request' }],
    ['action turn without authority', { authorization: 'none' }],
    ['private turn without evidence', { evidenceScope: 'none' }],
    ['private turn with a direct response', { responseContract: 'direct' }],
  ])('rejects an incoherent version-two contract: %s', (_label, override) => {
    const base = buildUnifiedChatTurnContract({
      prompt: 'Add an emoji to every Money category.',
      requestPolicy: moneyPolicy,
      agentJudgment: moneyJudgment,
      previous: null,
    });
    const candidate = {
      ...base,
      ...override,
      ...('authorization' in override && override.authorization === 'explicit_request'
        ? { requestClass: 'capability_question', action: null }
        : {}),
    };

    expect(parseUnifiedChatTurnContract(candidate)).toBeNull();
  });

  test.each([
    ['Update every goal so its title begins with a star.', 'goals.update'],
    ['Delete all completed activities.', 'activities.delete'],
    ['Add the same note to each chapter.', 'chapters.note.update'],
    ['Complete everything remaining in Activities.', 'activities.update'],
    ['Look through all my past-due to-dos and remove their due dates and reminders.', 'activities.update'],
    ['Archive the rest of my goals.', 'goals.update'],
  ])('gives any registered individual action generic all-matching semantics: %s', (prompt, toolId) => {
    const capability = toolId.startsWith('activities.') ? 'todos' : toolId.split('.')[0];
    const judgment = {
      ...moneyJudgment,
      userJob: prompt,
      desiredOutcome: prompt,
      participatingCapabilities: [capability],
      steps: [{ sequence: 1, objective: prompt, toolId, dependsOn: null }],
    } as AgentJudgment;

    expect(buildUnifiedChatTurnContract({
      prompt,
      requestPolicy: {
        ...moneyPolicy,
        participatingCapabilities: [capability],
      } as never,
      agentJudgment: judgment,
      previous: null,
    }).action).toEqual({
      operationIds: [toolId],
      targetScope: 'all_matching',
      targetQuery: prompt,
    });
  });

  test.each([
    ['Can you try that again?', 'retry'],
    ['Close, but put the emoji at the beginning instead of the end.', 'correction'],
    ['I meant for me, not for Charlie.', 'correction'],
    ['What is the weather?', null],
  ] as const)('classifies structural turn reference: %s', (prompt, expected) => {
    expect(classifyTurnReference(prompt)).toBe(expected);
  });

  test('preserves the prior action contract for a correction', () => {
    const previousContract = buildUnifiedChatTurnContract({
      prompt: 'Add an emoji to every Money category.',
      requestPolicy: moneyPolicy,
      agentJudgment: moneyJudgment,
      previous: null,
    });
    const contract = buildUnifiedChatTurnContract({
      prompt: 'Close, but put the emoji at the beginning instead of the end.',
      requestPolicy: moneyPolicy,
      agentJudgment: null,
      previous: { runId: 'run-money-1', contract: previousContract },
    });

    expect(contract.action).toEqual(previousContract.action);
    expect(contract.referent).toEqual({ runId: 'run-money-1', kind: 'correction' });
    expect(contract.participatingCapabilities).toEqual(['money']);
  });

  test('loads only a valid latest contract from durable scope events', () => {
    const contract = buildUnifiedChatTurnContract({
      prompt: 'Add an emoji to every Money category.',
      requestPolicy: moneyPolicy,
      agentJudgment: moneyJudgment,
      previous: null,
    });
    const aggregate = {
      thread: {
        id: 'thread-1', title: 'Money', titleSource: 'generated', status: 'active', archivedAt: null,
        createdAt: '2026-08-04T22:00:00.000Z', updatedAt: '2026-08-04T22:01:00.000Z',
      },
      messages: [],
      runs: [{
        id: 'run-money-1', threadId: 'thread-1', userMessageId: 'user-1', assistantMessageId: null,
        status: 'complete', errorCode: null, errorMessage: null,
        createdAt: '2026-08-04T22:00:00.000Z', updatedAt: '2026-08-04T22:01:00.000Z',
        completedAt: '2026-08-04T22:01:00.000Z', requestClass: 'capability_action',
        participatingCapabilities: ['money'], contextPolicy: {
          usePrivateContext: true, reason: 'test', clarification: null,
        }, version: 1, stopRequestedAt: null, steerCount: 0,
      }],
      events: [{
        id: 'event-1', threadId: 'thread-1', runId: 'run-money-1', sequence: 1,
        type: 'scope', status: 'complete', visibility: 'internal', label: null, detail: null,
        payload: { turnContract: contract },
      }],
    } as UnifiedChatThreadAggregate;

    expect(resolveLatestTurnContract(aggregate)).toEqual({ runId: 'run-money-1', contract });
  });
});

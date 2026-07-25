import {
  buildPendingWorkConversationReferent,
  formatConversationReferentGrounding,
  resolveConversationReferent,
  type PendingWorkConversationReferent,
} from './conversationReferent';
import type { UnifiedChatCapabilityId } from './requestPolicy';
import type { UnifiedChatThreadAggregate } from './types';

const capabilities: UnifiedChatCapabilityId[] = [
  'arcs', 'goals', 'todos', 'plan', 'chapters', 'profile', 'relationships',
];

const baseAggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1', title: 'Continue the work', titleSource: 'generated', status: 'active',
    archivedAt: null, createdAt: '2026-07-24T10:00:00.000Z', updatedAt: '2026-07-24T10:00:00.000Z',
  },
  messages: [],
  runs: [{
    id: 'run-1', threadId: 'thread-1', userMessageId: 'user-1', assistantMessageId: 'assistant-1',
    status: 'complete', errorCode: null, errorMessage: null,
    createdAt: '2026-07-24T10:00:00.000Z', updatedAt: '2026-07-24T10:01:00.000Z',
    completedAt: '2026-07-24T10:01:00.000Z', requestClass: 'capability_action',
    participatingCapabilities: ['todos'],
    contextPolicy: { usePrivateContext: true, reason: 'typed-capability-proposal-required', clarification: null },
    version: 2, stopRequestedAt: null, steerCount: 0,
  }],
};

describe('general conversation referents', () => {
  test.each(capabilities)('keeps exact identity and optimistic version for %s follow-up work', (capabilityId) => {
    const referent = buildPendingWorkConversationReferent([{
      proposalId: `proposal-${capabilityId}`,
      expectedVersion: 3,
      capabilityId,
      operationType: 'update_record',
      targetId: `object-${capabilityId}`,
      expectedUpdatedAt: `version-${capabilityId}`,
      label: `Change ${capabilityId}`,
      sequence: 1,
    }]);

    expect(referent).toEqual({
      schemaVersion: 2,
      kind: 'pending_work',
      items: [{
        proposalId: `proposal-${capabilityId}`,
        expectedVersion: 3,
        capabilityId,
        operationType: 'update_record',
        targetId: `object-${capabilityId}`,
        expectedUpdatedAt: `version-${capabilityId}`,
        label: `Change ${capabilityId}`,
        sequence: 1,
      }],
    });
  });

  test('preserves declared operation order and resolves it after reload', () => {
    const referent: PendingWorkConversationReferent = buildPendingWorkConversationReferent([
      {
        proposalId: 'proposal-milk', expectedVersion: 1, capabilityId: 'todos',
        operationType: 'create_activity', targetId: null, expectedUpdatedAt: null,
        label: 'Add Buy milk', sequence: 1,
      },
      {
        proposalId: 'proposal-mom', expectedVersion: 1, capabilityId: 'todos',
        operationType: 'create_activity', targetId: null, expectedUpdatedAt: null,
        label: 'Add Call Mom', sequence: 2,
      },
    ]);
    const aggregate: UnifiedChatThreadAggregate = {
      ...baseAggregate,
      events: [{
        id: 'event-1', threadId: 'thread-1', runId: 'run-1', sequence: 5,
        type: 'conversation_referent', status: 'complete', visibility: 'internal',
        label: 'Work awaiting review', detail: null, payload: referent,
      }],
    };

    expect(resolveConversationReferent(aggregate)).toEqual(referent);
    expect(resolveConversationReferent({
      ...aggregate,
      runs: [...aggregate.runs, { ...aggregate.runs[0]!, id: 'run-2' }],
    })).toBeNull();
  });

  test('rejects malformed or duplicate pending identities instead of guessing', () => {
    expect(() => buildPendingWorkConversationReferent([
      {
        proposalId: 'proposal-1', expectedVersion: 1, capabilityId: 'todos',
        operationType: 'create_activity', targetId: null, expectedUpdatedAt: null,
        label: 'First', sequence: 1,
      },
      {
        proposalId: 'proposal-1', expectedVersion: 1, capabilityId: 'todos',
        operationType: 'create_activity', targetId: null, expectedUpdatedAt: null,
        label: 'Duplicate', sequence: 2,
      },
    ])).toThrow(/duplicate/i);

    expect(resolveConversationReferent({
      ...baseAggregate,
      events: [{
        id: 'event-1', threadId: 'thread-1', runId: 'run-1', sequence: 5,
        type: 'conversation_referent', status: 'complete', visibility: 'internal',
        label: 'Work awaiting review', detail: null,
        payload: { schemaVersion: 2, kind: 'pending_work', items: [{ proposalId: 'machine-only' }] },
      }],
    })).toBeNull();
  });

  test('grounds follow-ups with exact object versions but never gives proposal ids to prose generation', () => {
    const grounding = formatConversationReferentGrounding(buildPendingWorkConversationReferent([{
      proposalId: 'proposal-machine-secret', expectedVersion: 4, capabilityId: 'goals',
      operationType: 'update_goal', targetId: 'goal-authoritative-id',
      expectedUpdatedAt: '2026-07-24T12:00:00.000Z', label: 'Move Finish the deck', sequence: 1,
    }]));

    expect(grounding).toContain('Move Finish the deck');
    expect(grounding).toContain('targetId=goal-authoritative-id');
    expect(grounding).toContain('expectedUpdatedAt=2026-07-24T12:00:00.000Z');
    expect(grounding).not.toContain('proposal-machine-secret');
    expect(grounding).toContain('Machine references are tool-only');
  });

  test('derives a typed referent from a hydrated capability proposal when an older channel omitted the event', () => {
    const aggregate: UnifiedChatThreadAggregate = {
      ...baseAggregate,
      runs: [{ ...baseAggregate.runs[0]!, participatingCapabilities: ['relationships'] }],
      proposals: [{
        id: 'proposal-relationship', threadId: 'thread-1', runId: 'run-1', messageId: 'assistant-1',
        capabilityId: 'relationships', title: 'Correct Mom’s birthday', body: 'Reviews the correction.',
        status: 'pending', version: 2, createdAt: 'before', updatedAt: 'before',
        operation: {
          id: 'operation-relationship', proposalId: 'proposal-relationship', capabilityId: 'relationships',
          type: 'correct_relationship', targetId: 'memory-authoritative', summary: 'Correct Mom’s birthday',
          payload: { expectedUpdatedAt: 'memory-version', value: 'May 3' },
          idempotencyKey: 'relationship-1', sequence: 1,
        },
      }],
    };

    expect(resolveConversationReferent(aggregate)).toEqual(expect.objectContaining({
      schemaVersion: 2,
      kind: 'pending_work',
      items: [expect.objectContaining({
        proposalId: 'proposal-relationship', capabilityId: 'relationships',
        targetId: 'memory-authoritative', expectedUpdatedAt: 'memory-version', expectedVersion: 2,
      })],
    }));
  });
});

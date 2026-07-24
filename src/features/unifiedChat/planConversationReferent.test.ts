import {
  buildPlanPlacementReferent,
  resolvePlanPlacementReferent,
  type PlanPlacementConversationReferent,
} from './planConversationReferent';
import type { UnifiedChatThreadAggregate } from './types';

const baseAggregate: UnifiedChatThreadAggregate = {
  thread: {
    id: 'thread-1', title: 'Plan tomorrow', titleSource: 'generated', status: 'active',
    archivedAt: null, createdAt: '2026-07-23T10:00:00.000Z', updatedAt: '2026-07-23T10:00:00.000Z',
  },
  messages: [],
  runs: [{
    id: 'run-plan', threadId: 'thread-1', userMessageId: 'user-1', assistantMessageId: 'assistant-1',
    status: 'complete', errorCode: null, errorMessage: null,
    createdAt: '2026-07-23T10:00:00.000Z', updatedAt: '2026-07-23T10:01:00.000Z',
    completedAt: '2026-07-23T10:01:00.000Z', requestClass: 'capability_question',
    participatingCapabilities: ['plan'],
    contextPolicy: { usePrivateContext: true, reason: 'day-plan-recommendation', clarification: null },
    version: 2, stopRequestedAt: null, steerCount: 0,
  }],
};

describe('Plan conversation referents', () => {
  test('selects the first unplaced authoritative priority instead of an easier lower priority', () => {
    expect(buildPlanPlacementReferent({
      targetDate: '2026-07-24T12:00:00.000Z',
      recommendations: [
        {
          activityId: 'priority-2', expectedUpdatedAt: 'v2', title: 'Easy lower priority',
          goalTitle: null, priorityPosition: 1,
          placement: {
            status: 'placed', startDate: '2026-07-24T14:00:00.000Z',
            endDate: '2026-07-24T15:00:00.000Z', calendarId: 'calendar-1',
          },
        },
        {
          activityId: 'priority-1', expectedUpdatedAt: 'v1', title: 'Needs a larger opening',
          goalTitle: 'Finish the build', priorityPosition: 0,
          placement: { status: 'unplaced', reason: 'needs_larger_window' },
        },
      ],
    })).toEqual({
      schemaVersion: 1,
      capabilityId: 'plan',
      kind: 'awaiting_placement',
      activityId: 'priority-1',
      expectedUpdatedAt: 'v1',
      title: 'Needs a larger opening',
      targetDate: '2026-07-24T12:00:00.000Z',
      priorityPosition: 0,
    });
  });

  test('resolves only a typed referent attached to the immediately preceding run', () => {
    const referent: PlanPlacementConversationReferent = {
      schemaVersion: 1, capabilityId: 'plan', kind: 'awaiting_placement',
      activityId: 'priority-1', expectedUpdatedAt: 'v1', title: 'Needs a larger opening',
      targetDate: '2026-07-24T12:00:00.000Z', priorityPosition: 0,
    };
    const aggregate: UnifiedChatThreadAggregate = {
      ...baseAggregate,
      events: [{
        id: 'event-1', threadId: 'thread-1', runId: 'run-plan', sequence: 4,
        type: 'conversation_referent', status: 'complete', visibility: 'internal',
        label: 'Plan item awaiting placement', detail: null, payload: referent,
      }],
    };

    expect(resolvePlanPlacementReferent(aggregate)).toEqual(referent);
    expect(resolvePlanPlacementReferent({
      ...aggregate,
      runs: [...aggregate.runs, {
        ...aggregate.runs[0], id: 'run-general', requestClass: 'general',
        participatingCapabilities: [],
        contextPolicy: { usePrivateContext: false, reason: 'general-answer-without-private-context', clarification: null },
      }],
    })).toBeNull();
  });

  test('rejects malformed event payloads rather than guessing a target', () => {
    expect(resolvePlanPlacementReferent({
      ...baseAggregate,
      events: [{
        id: 'event-1', threadId: 'thread-1', runId: 'run-plan', sequence: 4,
        type: 'conversation_referent', status: 'complete', visibility: 'internal',
        label: 'Plan item awaiting placement', detail: null,
        payload: { schemaVersion: 1, capabilityId: 'plan', activityId: 'priority-1' },
      }],
    })).toBeNull();
  });
});

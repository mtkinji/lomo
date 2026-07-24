import type { Activity } from '../../domain/types';
import type { CalendarEventRef } from '../../services/plan/calendarApi';
import type { UnifiedChatProposal } from './types';
import {
  applyApprovedPlanProposal,
  hydratePlanMutationReceipt,
  PlanMutationConflictError,
  PlanMutationUnconfirmedError,
  undoAppliedPlanProposal,
} from './planProposalExecutor';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

const eventRef: CalendarEventRef = {
  provider: 'google', accountId: 'account-1', calendarId: 'primary', eventId: 'event-1',
};

function proposal(): PlanProposal {
  return {
    id: 'proposal-plan', threadId: 'thread-1', runId: 'run-1', messageId: 'message-2',
    capabilityId: 'plan', title: 'Call school', body: 'Fri at 9:00 AM', status: 'approved', version: 2,
    createdAt: '2026-07-23T12:00:00.000Z', updatedAt: '2026-07-23T12:00:00.000Z',
    operation: {
      id: 'operation-plan', proposalId: 'proposal-plan', capabilityId: 'plan', type: 'schedule_activity',
      targetId: 'activity-school', summary: 'Add Call school to Plan',
      idempotencyKey: 'unified-chat:run-1:plan:activity-school', sequence: 1,
      payload: {
        activityId: 'activity-school', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
        startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
        targetDateKey: '2026-07-24',
        writeCalendarRef: { provider: 'google', accountId: 'account-1', calendarId: 'primary' },
      },
    },
  };
}

function chunkProposal(index: number): PlanProposal {
  const base = proposal();
  if (base.operation.type !== 'schedule_activity') throw new Error('Expected schedule fixture.');
  const startHour = 14 + index;
  return {
    ...base,
    id: `proposal-chunk-${index}`,
    title: `Chunk ${index}`,
    operation: {
      ...base.operation,
      id: `operation-chunk-${index}`,
      proposalId: `proposal-chunk-${index}`,
      type: 'schedule_activity_chunk',
      idempotencyKey: `chunk-${index}`,
      payload: {
        ...base.operation.payload,
        groupId: 'group-1', chunkId: `chunk-${index}`, title: `Chunk ${index}`,
        startDate: `2026-07-24T${startHour}:00:00.000Z`,
        endDate: `2026-07-24T${startHour}:30:00.000Z`,
      },
    },
  };
}

function harness() {
  let activities: Activity[] = [{
    id: 'activity-school', goalId: null, title: 'Call school', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: '2026-07-23T09:00:00.000Z', updatedAt: '2026-07-23T10:00:00.000Z',
  }];
  return {
    store: {
      getActivities: () => activities,
      updateActivity: jest.fn((id: string, updater: (activity: Activity) => Activity) => {
        activities = activities.map((activity) => activity.id === id ? updater(activity) : activity);
      }),
      addDailyPlanCommitment: jest.fn(),
      removeDailyPlanCommitment: jest.fn(),
    },
    get activities() { return activities; },
  };
}

describe('applyApprovedPlanProposal', () => {
  test('applies grouped chunks as independent tracked events and undoes one without erasing siblings', async () => {
    const harnessed = harness();
    let eventIndex = 0;
    const deleteEvent = jest.fn(async () => undefined);
    const calendar = {
      resolveBeforeCreate: async () => null,
      createEvent: jest.fn(async () => ({} as never)),
      resolveAfterCreate: async () => ({
        status: 'linked' as const,
        eventRef: { ...eventRef, eventId: `event-${++eventIndex}` },
      }),
      moveEvent: jest.fn(), deleteEvent,
    };
    const first = await applyApprovedPlanProposal({
      proposal: chunkProposal(1), store: harnessed.store, calendar,
      now: () => '2026-07-23T12:01:00.000Z',
    });
    const second = await applyApprovedPlanProposal({
      proposal: chunkProposal(2), store: harnessed.store, calendar,
      now: () => '2026-07-23T12:02:00.000Z',
    });

    expect(harnessed.activities[0].calendarBinding).toBeUndefined();
    expect(harnessed.activities[0].calendarChunkBindings).toEqual([
      expect.objectContaining({ groupId: 'group-1', chunkId: 'chunk-1', binding: expect.objectContaining({ eventId: 'event-1' }) }),
      expect.objectContaining({ groupId: 'group-1', chunkId: 'chunk-2', binding: expect.objectContaining({ eventId: 'event-2' }) }),
    ]);
    expect(first.undoOperation.type).toBe('delete_created_plan_chunk');
    await undoAppliedPlanProposal({
      receipt: second, store: harnessed.store, calendar,
      now: () => '2026-07-23T12:03:00.000Z',
    });
    expect(deleteEvent).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event-2' }));
    expect(harnessed.activities[0].calendarChunkBindings).toEqual([
      expect.objectContaining({ chunkId: 'chunk-1', activityUpdatedAt: '2026-07-23T12:03:00.000Z' }),
    ]);
    expect(harnessed.store.removeDailyPlanCommitment).not.toHaveBeenCalled();
  });

  test('hydrates only structurally complete chunk undo receipts', () => {
    const stored = {
      id: 'receipt-chunk', proposalId: 'proposal-chunk-1', operationId: 'operation-chunk-1',
      capabilityId: 'plan' as const, idempotencyKey: 'chunk-1', status: 'applied' as const,
      resultingObjectType: 'activity', resultingObjectId: 'activity-school',
      resultState: {
        title: 'Chunk 1', scheduledAt: '2026-07-24T15:00:00.000Z', targetDateKey: '2026-07-24',
        eventId: 'event-1', provider: 'google', accountId: 'account-1', calendarId: 'primary', updatedAt: 'applied',
      },
      returnTarget: {},
      undoOperation: {
        type: 'delete_created_plan_chunk', groupId: 'group-1', chunkId: 'chunk-1',
        eventRef, targetDateKey: '2026-07-24', expectedUpdatedAt: 'applied',
      },
      canUndo: true, appliedAt: 'applied', undoneAt: null,
    };

    expect(hydratePlanMutationReceipt(stored)).toMatchObject({
      undoOperation: { type: 'delete_created_plan_chunk', groupId: 'group-1', chunkId: 'chunk-1' },
    });
    expect(hydratePlanMutationReceipt({
      ...stored, undoOperation: { ...stored.undoOperation, eventRef: { ...eventRef, eventId: undefined } },
    })).toBeNull();
  });

  test('rejects a later group chunk if the Activity changed outside the group', async () => {
    const harnessed = harness();
    const calendar = {
      resolveBeforeCreate: async () => ({ status: 'linked' as const, eventRef }),
      createEvent: jest.fn(), resolveAfterCreate: jest.fn(), moveEvent: jest.fn(), deleteEvent: jest.fn(),
    };
    await applyApprovedPlanProposal({
      proposal: chunkProposal(1), store: harnessed.store, calendar,
      now: () => '2026-07-23T12:01:00.000Z',
    });
    harnessed.store.updateActivity('activity-school', (activity) => ({ ...activity, notes: 'Changed elsewhere', updatedAt: 'external-change' }));
    await expect(applyApprovedPlanProposal({
      proposal: chunkProposal(2), store: harnessed.store, calendar,
    })).rejects.toBeInstanceOf(PlanMutationConflictError);
  });
  test('reuses an existing provider event and commits authoritative local state', async () => {
    const { store, activities } = harness();
    const createEvent = jest.fn();
    const receipt = await applyApprovedPlanProposal({
      proposal: proposal(), store,
      calendar: {
        resolveBeforeCreate: async () => ({ status: 'linked', eventRef }),
        createEvent,
        resolveAfterCreate: jest.fn(),
        moveEvent: jest.fn(), deleteEvent: jest.fn(),
      },
      now: () => '2026-07-23T12:30:00.000Z',
    });

    expect(createEvent).not.toHaveBeenCalled();
    expect(store.updateActivity).toHaveBeenCalledTimes(1);
    expect(store.addDailyPlanCommitment).toHaveBeenCalledWith('2026-07-24', 'activity-school');
    expect(activities).toBeDefined();
    expect(receipt).toMatchObject({
      resultingObjectId: 'activity-school',
      resultState: { scheduledAt: '2026-07-24T15:00:00.000Z', eventId: 'event-1' },
      returnTarget: { capabilityId: 'plan' },
      undoOperation: { type: 'delete_created_plan_event' },
    });
  });

  test('recovers a linked event after create throws', async () => {
    const { store } = harness();
    await expect(applyApprovedPlanProposal({
      proposal: proposal(), store,
      calendar: {
        resolveBeforeCreate: async () => null,
        createEvent: async () => { throw new Error('timeout'); },
        resolveAfterCreate: async () => ({ status: 'linked', eventRef }),
        moveEvent: jest.fn(), deleteEvent: jest.fn(),
      },
    })).resolves.toMatchObject({ resultState: { eventId: 'event-1' } });
  });

  test('fails honestly when the provider side effect cannot be confirmed', async () => {
    const { store } = harness();
    await expect(applyApprovedPlanProposal({
      proposal: proposal(), store,
      calendar: {
        resolveBeforeCreate: async () => null,
        createEvent: async () => ({} as { eventRef: CalendarEventRef }),
        resolveAfterCreate: async () => ({ status: 'unconfirmed' }),
        moveEvent: jest.fn(), deleteEvent: jest.fn(),
      },
    })).rejects.toBeInstanceOf(PlanMutationUnconfirmedError);
    expect(store.updateActivity).not.toHaveBeenCalled();
  });

  test('rejects a stale Activity before touching the calendar', async () => {
    const { store } = harness();
    store.updateActivity('activity-school', (activity) => ({ ...activity, updatedAt: 'changed' }));
    const createEvent = jest.fn();
    await expect(applyApprovedPlanProposal({
      proposal: proposal(), store,
      calendar: {
        resolveBeforeCreate: jest.fn(), createEvent, resolveAfterCreate: jest.fn(),
        moveEvent: jest.fn(), deleteEvent: jest.fn(),
      },
    })).rejects.toBeInstanceOf(PlanMutationConflictError);
    expect(createEvent).not.toHaveBeenCalled();
  });

  test('moves a managed block, updates day commitments, and moves it back on undo', async () => {
    const harnessed = harness();
    harnessed.store.updateActivity('activity-school', (activity) => ({
      ...activity,
      scheduledAt: '2026-07-24T15:00:00.000Z', estimateMinutes: 30,
      calendarBinding: { kind: 'provider', ...eventRef, createdBy: 'plan' },
    }));
    const current = harnessed.activities[0];
    const moved: PlanProposal = {
      ...proposal(),
      operation: {
        ...proposal().operation,
        type: 'reschedule_activity',
        payload: {
          activityId: current.id, expectedUpdatedAt: current.updatedAt,
          startDate: '2026-07-25T16:00:00.000Z', endDate: '2026-07-25T16:30:00.000Z',
          targetDateKey: '2026-07-25', previousStartDate: '2026-07-24T15:00:00.000Z',
          previousEndDate: '2026-07-24T15:30:00.000Z', previousTargetDateKey: '2026-07-24',
        },
      },
    };
    const moveEvent = jest.fn(async () => undefined);
    const calendar = {
      resolveBeforeCreate: jest.fn(), createEvent: jest.fn(), resolveAfterCreate: jest.fn(),
      moveEvent, deleteEvent: jest.fn(),
    };
    const receipt = await applyApprovedPlanProposal({
      proposal: moved, store: harnessed.store, calendar,
      now: () => '2026-07-23T13:00:00.000Z',
    });
    expect(moveEvent).toHaveBeenCalledWith(expect.objectContaining({
      start: new Date('2026-07-25T16:00:00.000Z'),
    }));
    expect(harnessed.store.removeDailyPlanCommitment).toHaveBeenCalledWith('2026-07-24', current.id);
    expect(receipt.undoOperation.type).toBe('restore_moved_plan_event');
    const recovered = await applyApprovedPlanProposal({
      proposal: moved, store: harnessed.store, calendar, allowAlreadyApplied: true,
    });
    expect(moveEvent).toHaveBeenCalledTimes(1);
    expect(recovered.undoOperation).toMatchObject({
      type: 'restore_moved_plan_event',
      previousActivity: { scheduledAt: '2026-07-24T15:00:00.000Z' },
    });

    await undoAppliedPlanProposal({
      receipt: recovered, store: harnessed.store, calendar,
      now: () => '2026-07-23T14:00:00.000Z',
    });
    expect(moveEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      start: new Date('2026-07-24T15:00:00.000Z'),
    }));
    expect(harnessed.activities[0].scheduledAt).toBe('2026-07-24T15:00:00.000Z');
  });

  test('removes a provider block and recreates a newly linked event on undo', async () => {
    const harnessed = harness();
    harnessed.store.updateActivity('activity-school', (activity) => ({
      ...activity,
      scheduledAt: '2026-07-24T15:00:00.000Z', estimateMinutes: 30,
      calendarBinding: { kind: 'provider', ...eventRef, createdBy: 'plan' },
    }));
    const current = harnessed.activities[0];
    const removed: PlanProposal = {
      ...proposal(),
      operation: {
        ...proposal().operation,
        type: 'remove_activity_from_plan',
        payload: {
          activityId: current.id, expectedUpdatedAt: current.updatedAt,
          previousStartDate: '2026-07-24T15:00:00.000Z',
          previousEndDate: '2026-07-24T15:30:00.000Z', previousTargetDateKey: '2026-07-24',
          previousBinding: current.calendarBinding as Extract<NonNullable<Activity['calendarBinding']>, { kind: 'provider' }>,
        },
      },
    };
    const recreated = { ...eventRef, eventId: 'event-2' };
    const calendar = {
      resolveBeforeCreate: jest.fn(), createEvent: jest.fn(async () => ({ eventRef: recreated })),
      resolveAfterCreate: jest.fn(async () => ({ status: 'linked' as const, eventRef: recreated })),
      moveEvent: jest.fn(), deleteEvent: jest.fn(async () => undefined),
    };
    const receipt = await applyApprovedPlanProposal({
      proposal: removed, store: harnessed.store, calendar,
      now: () => '2026-07-23T13:00:00.000Z',
    });
    expect(calendar.deleteEvent).toHaveBeenCalledWith(current.calendarBinding);
    expect(harnessed.activities[0]).toMatchObject({ scheduledAt: null, calendarBinding: null });
    expect(receipt.undoOperation.type).toBe('recreate_removed_plan_event');
    const recovered = await applyApprovedPlanProposal({
      proposal: removed, store: harnessed.store, calendar, allowAlreadyApplied: true,
    });
    expect(calendar.deleteEvent).toHaveBeenCalledTimes(1);
    expect(recovered.undoOperation).toMatchObject({
      type: 'recreate_removed_plan_event',
      previousActivity: { scheduledAt: '2026-07-24T15:00:00.000Z' },
    });

    await undoAppliedPlanProposal({
      receipt: recovered, store: harnessed.store, calendar,
      now: () => '2026-07-23T14:00:00.000Z',
    });
    expect(harnessed.activities[0]).toMatchObject({
      scheduledAt: '2026-07-24T15:00:00.000Z',
      calendarBinding: { eventId: 'event-2' },
    });
  });
});

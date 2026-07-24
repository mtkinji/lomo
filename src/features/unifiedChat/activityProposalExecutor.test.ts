import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatProposal } from './types';
import {
  ActivityMutationConflictError,
  applyApprovedActivityProposal,
  refreshCreatedActivityReceipt,
  undoAppliedActivityProposal,
} from './activityProposalExecutor';

type TodoProposal = Extract<UnifiedChatProposal, { capabilityId: 'todos' }>;

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-library', goalId: null, title: 'Visit the library', type: 'task',
  tags: ['errands'], status: 'planned', forceActual: {},
  createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-21T13:00:00.000Z',
  ...overrides,
});

function proposal(overrides: Partial<TodoProposal> = {}): TodoProposal {
  return {
    id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-2',
    capabilityId: 'todos', title: 'Move library visit', body: 'Changes the date.',
    status: 'approved', version: 2, createdAt: '2026-07-22T12:00:00.000Z', updatedAt: '2026-07-22T12:00:00.000Z',
    operation: {
      id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'todos',
      type: 'update_activity', targetId: 'activity-library', summary: 'Move library visit',
      payload: { scheduledDate: '2026-07-25', expectedUpdatedAt: '2026-07-21T13:00:00.000Z' },
      idempotencyKey: 'unified-chat:run-1:1', sequence: 1,
    },
    ...overrides,
  };
}

function inventory(initial: Activity[] = [activity()]) {
  let activities = initial;
  return {
    getActivities: () => activities,
    getGoals: () => [] as Goal[],
    addActivity: jest.fn((next: Activity) => { activities = [...activities, next]; }),
    updateActivity: jest.fn((id: string, updater: (current: Activity) => Activity) => {
      activities = activities.map((item) => item.id === id ? updater(item) : item);
    }),
    removeActivity: jest.fn((id: string) => { activities = activities.filter((item) => item.id !== id); }),
  };
}

describe('Activity proposal capability executor', () => {
  test('applies an approved update, reloads authoritative state, and emits exact undo', () => {
    const store = inventory();
    const receipt = applyApprovedActivityProposal({
      proposal: proposal(), store, now: () => '2026-07-22T13:00:00.000Z',
    });

    expect(store.updateActivity).toHaveBeenCalledTimes(1);
    expect(receipt).toMatchObject({
      status: 'applied', resultingObjectId: 'activity-library',
      resultState: {
        title: 'Visit the library',
        scheduledDate: '2026-07-25',
        updatedAt: '2026-07-22T13:00:00.000Z',
      },
      returnTarget: { object: { type: 'activity', id: 'activity-library' } },
      undoOperation: { type: 'restore_activity', activity: { updatedAt: '2026-07-21T13:00:00.000Z' } },
    });
    expect(receipt.undoOperation.type === 'restore_activity' && receipt.undoOperation.activity.scheduledDate).toBeUndefined();

    const undo = undoAppliedActivityProposal({ receipt, store, now: () => '2026-07-22T14:00:00.000Z' });
    expect(undo.status).toBe('undone');
    expect(store.getActivities()[0]).toMatchObject({ updatedAt: '2026-07-22T14:00:00.000Z' });
    expect(store.getActivities()[0]?.scheduledDate).toBeUndefined();
  });

  test('uses a deterministic id so retrying create cannot duplicate the To-do', () => {
    const store = inventory([]);
    const createProposal = proposal({
      operation: {
        id: 'operation-create', proposalId: 'proposal-1', capabilityId: 'todos',
        type: 'create_activity', targetId: null, summary: 'Add library visit',
        payload: {
          title: 'Visit the library', status: 'planned', tags: ['errands'], estimateMinutes: 30,
          expectedUpdatedAt: null,
        },
        idempotencyKey: 'unified-chat:run-1:1', sequence: 1,
      },
    });

    const first = applyApprovedActivityProposal({ proposal: createProposal, store, now: () => '2026-07-22T13:00:00.000Z' });
    const second = applyApprovedActivityProposal({ proposal: createProposal, store, now: () => '2026-07-22T13:00:00.000Z' });

    expect(store.addActivity).toHaveBeenCalledTimes(1);
    expect(store.getActivities()).toHaveLength(1);
    expect(second.resultingObjectId).toBe(first.resultingObjectId);
    expect(first.resultState.estimateMinutes).toBe(30);

    const enriched = { ...store.getActivities()[0]!, estimateMinutes: 45, updatedAt: '2026-07-22T13:01:00.000Z' };
    const refreshed = refreshCreatedActivityReceipt(first, enriched);
    expect(refreshed).toMatchObject({
      resultState: { estimateMinutes: 45, updatedAt: '2026-07-22T13:01:00.000Z' },
      undoOperation: { type: 'remove_created_activity', expectedUpdatedAt: '2026-07-22T13:01:00.000Z' },
    });
  });

  test('creates one durable recurring reminded Activity and removes it on undo', () => {
    const store = inventory([]);
    const createProposal = proposal({
      operation: {
        id: 'operation-trash', proposalId: 'proposal-1', capabilityId: 'todos',
        type: 'create_activity', targetId: null, summary: 'Add Take out the trash',
        payload: {
          title: 'Take out the trash', status: 'planned',
          reminderAt: '2026-07-29T02:00:00.000Z', repeatRule: 'custom',
          repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
          repeatBasis: 'scheduled', expectedUpdatedAt: null,
        },
        idempotencyKey: 'unified-chat:trash', sequence: 1,
      },
    });

    const receipt = applyApprovedActivityProposal({ proposal: createProposal, store, now: () => '2026-07-23T12:00:00.000Z' });

    expect(store.getActivities()).toEqual([expect.objectContaining({
      title: 'Take out the trash', reminderAt: '2026-07-29T02:00:00.000Z',
      repeatRule: 'custom', repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
      repeatBasis: 'scheduled',
    })]);
    expect(receipt.resultState).toMatchObject({
      title: 'Take out the trash', reminderAt: '2026-07-29T02:00:00.000Z', repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
    });

    undoAppliedActivityProposal({ receipt, store, now: () => '2026-07-23T13:00:00.000Z' });
    expect(store.getActivities()).toEqual([]);
  });

  test('rejects unapproved proposals and stale updates before mutation', () => {
    const store = inventory();
    expect(() => applyApprovedActivityProposal({
      proposal: proposal({ status: 'pending' }), store,
    })).toThrow(/must be approved/i);
    expect(() => applyApprovedActivityProposal({
      proposal: proposal({
        operation: {
          id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'todos',
          type: 'update_activity', targetId: 'activity-library', summary: 'Move library visit',
          payload: { scheduledDate: '2026-07-25', expectedUpdatedAt: '2026-01-01T00:00:00.000Z' },
          idempotencyKey: 'unified-chat:run-1:1', sequence: 1,
        },
      }),
      store,
    })).toThrow(ActivityMutationConflictError);
    expect(store.updateActivity).not.toHaveBeenCalled();
  });

  test('refuses undo after the user has changed the resulting To-do', () => {
    const store = inventory();
    const receipt = applyApprovedActivityProposal({ proposal: proposal(), store, now: () => '2026-07-22T13:00:00.000Z' });
    store.updateActivity('activity-library', (current) => ({ ...current, title: 'User changed this', updatedAt: '2026-07-22T13:30:00.000Z' }));

    expect(() => undoAppliedActivityProposal({ receipt, store })).toThrow(ActivityMutationConflictError);
  });

  test('applies reminder and recurrence fields and restores the prior Activity on undo', () => {
    const store = inventory();
    const recurring = proposal({
      title: 'Repeat library visit',
      operation: {
        id: 'operation-repeat', proposalId: 'proposal-1', capabilityId: 'todos',
        type: 'update_activity', targetId: 'activity-library', summary: 'Repeat library visit',
        payload: {
          reminderAt: '2026-07-30T15:00:00.000Z', repeatRule: 'weekly',
          repeatCustom: null, repeatBasis: 'scheduled',
          expectedUpdatedAt: '2026-07-21T13:00:00.000Z',
        },
        idempotencyKey: 'repeat', sequence: 1,
      },
    });

    const receipt = applyApprovedActivityProposal({
      proposal: recurring, store, now: () => '2026-07-22T13:00:00.000Z',
    });
    expect(store.getActivities()[0]).toMatchObject({
      reminderAt: '2026-07-30T15:00:00.000Z', repeatRule: 'weekly', repeatBasis: 'scheduled',
    });
    expect(receipt.resultState).toMatchObject({
      reminderAt: '2026-07-30T15:00:00.000Z', repeatRule: 'weekly', repeatBasis: 'scheduled',
    });

    undoAppliedActivityProposal({ receipt, store, now: () => '2026-07-22T14:00:00.000Z' });
    expect(store.getActivities()[0]?.reminderAt).toBeUndefined();
    expect(store.getActivities()[0]?.repeatRule).toBeUndefined();
  });

  test('deletes only the versioned Activity and restores it on undo', () => {
    const store = inventory();
    const deletion = proposal({
      title: 'Delete library visit',
      operation: {
        id: 'operation-delete', proposalId: 'proposal-1', capabilityId: 'todos',
        type: 'delete_activity', targetId: 'activity-library', summary: 'Delete library visit',
        payload: { expectedUpdatedAt: '2026-07-21T13:00:00.000Z' },
        idempotencyKey: 'delete', sequence: 1,
      },
    });

    const receipt = applyApprovedActivityProposal({
      proposal: deletion, store, now: () => '2026-07-22T13:00:00.000Z',
    });
    expect(store.getActivities()).toEqual([]);
    expect(receipt.undoOperation).toMatchObject({
      type: 'restore_deleted_activity', activity: { id: 'activity-library' },
    });

    undoAppliedActivityProposal({ receipt, store, now: () => '2026-07-22T14:00:00.000Z' });
    expect(store.getActivities()).toEqual([expect.objectContaining({
      id: 'activity-library', title: 'Visit the library', updatedAt: '2026-07-22T14:00:00.000Z',
    })]);
  });

  test('applies stable-id step operations idempotently and preserves whole-Activity undo', () => {
    const store = inventory([activity({
      steps: [
        { id: 'step-one', title: 'Find the number', completedAt: null, orderIndex: 0 },
        { id: 'step-two', title: 'Make the call', completedAt: null, orderIndex: 1 },
      ],
    })]);
    const createStep = proposal({
      operation: {
        id: 'operation-step-create', proposalId: 'proposal-1', capabilityId: 'todos',
        type: 'create_activity_step', targetId: 'activity-library', summary: 'Add a step',
        payload: { title: 'Write down the answer', isOptional: false, expectedUpdatedAt: '2026-07-21T13:00:00.000Z' },
        idempotencyKey: 'step-create', sequence: 1,
      },
    });
    const first = applyApprovedActivityProposal({ proposal: createStep, store, now: () => '2026-07-22T13:00:00.000Z' });
    const createdStep = store.getActivities()[0].steps?.find((step) => step.title === 'Write down the answer');
    expect(createdStep?.id).toBe('step-chat-operation-step-create');
    expect(store.getActivities()[0].steps).toHaveLength(3);

    if (createStep.operation.type !== 'create_activity_step') {
      throw new Error('Expected create step operation');
    }
    const retryProposal = proposal({
      operation: {
        ...createStep.operation,
        payload: { ...createStep.operation.payload, expectedUpdatedAt: '2026-07-22T13:00:00.000Z' },
      },
    });
    applyApprovedActivityProposal({ proposal: retryProposal, store, now: () => '2026-07-22T13:00:00.000Z' });
    expect(store.getActivities()[0].steps).toHaveLength(3);

    const undone = undoAppliedActivityProposal({ receipt: first, store, now: () => '2026-07-22T14:00:00.000Z' });
    expect(undone.status).toBe('undone');
    expect(store.getActivities()[0].steps?.map((step) => step.id)).toEqual(['step-one', 'step-two']);
  });

  test('completes, deletes, and reorders only identified step ids', () => {
    const base = activity({
      steps: [
        { id: 'step-one', title: 'One', completedAt: null, orderIndex: 0 },
        { id: 'step-two', title: 'Two', completedAt: null, orderIndex: 1 },
      ],
    });
    const cases = [
      {
        type: 'complete_activity_step' as const,
        payload: { stepId: 'step-one', completed: true, expectedUpdatedAt: base.updatedAt },
        expected: (next: Activity) => expect(next.steps?.[0].completedAt).toBe('2026-07-22T13:00:00.000Z'),
      },
      {
        type: 'delete_activity_step' as const,
        payload: { stepId: 'step-one', expectedUpdatedAt: base.updatedAt },
        expected: (next: Activity) => expect(next.steps?.map((step) => step.id)).toEqual(['step-two']),
      },
      {
        type: 'reorder_activity_steps' as const,
        payload: { stepIds: ['step-two'], expectedUpdatedAt: base.updatedAt },
        expected: (next: Activity) => expect(next.steps?.map((step) => step.id)).toEqual(['step-two', 'step-one']),
      },
    ];

    for (const item of cases) {
      const store = inventory([{ ...base, steps: base.steps?.map((step) => ({ ...step })) }]);
      applyApprovedActivityProposal({
        proposal: proposal({
          operation: {
            id: `operation-${item.type}`, proposalId: 'proposal-1', capabilityId: 'todos',
            type: item.type, targetId: base.id, summary: item.type,
            payload: item.payload,
            idempotencyKey: item.type, sequence: 1,
          } as TodoProposal['operation'],
        }),
        store,
        now: () => '2026-07-22T13:00:00.000Z',
      });
      item.expected(store.getActivities()[0]);
    }
  });
});

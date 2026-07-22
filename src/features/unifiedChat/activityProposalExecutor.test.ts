import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatProposal } from './types';
import {
  ActivityMutationConflictError,
  applyApprovedActivityProposal,
  refreshCreatedActivityReceipt,
  undoAppliedActivityProposal,
} from './activityProposalExecutor';

const activity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-library', goalId: null, title: 'Visit the library', type: 'task',
  tags: ['errands'], status: 'planned', forceActual: {},
  createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-21T13:00:00.000Z',
  ...overrides,
});

function proposal(overrides: Partial<UnifiedChatProposal> = {}): UnifiedChatProposal {
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
});

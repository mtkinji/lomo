import type { Activity, Goal } from '../../domain/types';
import { recoverActivityMutations } from './recoverActivityMutations';
import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';

const prior: Activity = {
  id: 'activity-1', goalId: null, title: 'Library', type: 'task', tags: [], status: 'planned',
  forceActual: {}, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z',
};
const proposal: UnifiedChatProposal = {
  id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: null, capabilityId: 'todos',
  title: 'Move Library', body: 'Moves the date.', status: 'applying', version: 3,
  createdAt: '2026-07-22T00:00:00.000Z', updatedAt: '2026-07-22T00:00:00.000Z',
  operation: {
    id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'todos', type: 'update_activity',
    targetId: 'activity-1', summary: 'Move Library',
    payload: { scheduledDate: '2026-07-25', expectedUpdatedAt: prior.updatedAt },
    idempotencyKey: 'run-1:1', sequence: 1,
  },
};

function aggregate(activityAlreadyApplied: boolean): UnifiedChatThreadAggregate {
  const appliedAt = '2026-07-22T13:00:00.000Z';
  return {
    thread: { id: 'thread-1', title: 'Chat', status: 'active', archivedAt: null, createdAt: prior.createdAt, updatedAt: appliedAt },
    messages: [], runs: [], proposals: [proposal],
    receipts: [{
      id: 'receipt-1', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'todos', idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved', resultingObjectType: 'activity', resultingObjectId: prior.id,
      resultState: { title: prior.title, status: prior.status, goalId: null, scheduledDate: '2026-07-25', updatedAt: appliedAt },
      returnTarget: { name: 'MainTabs' },
      undoOperation: { type: 'restore_activity', activity: prior, expectedUpdatedAt: appliedAt },
      canUndo: false, appliedAt, undoneAt: null,
    }],
    ...(activityAlreadyApplied ? {} : {}),
  };
}

test.each([false, true])('recovers a reserved mutation whether the local write happened: %s', async (alreadyApplied) => {
  const appliedAt = '2026-07-22T13:00:00.000Z';
  let activities = [alreadyApplied ? { ...prior, scheduledDate: '2026-07-25', updatedAt: appliedAt } : prior];
  const store = {
    getActivities: () => activities,
    getGoals: () => [] as Goal[],
    addActivity: jest.fn(), removeActivity: jest.fn(),
    updateActivity: jest.fn((id: string, update: (activity: Activity) => Activity) => {
      activities = activities.map((activity) => activity.id === id ? update(activity) : activity);
    }),
  };
  const loaded = { ...aggregate(alreadyApplied), proposals: [{ ...proposal, status: 'applied' as const, version: 4 }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };

  await expect(recoverActivityMutations({ aggregate: aggregate(alreadyApplied), repository: repository as never, store }))
    .resolves.toBe(loaded);
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
    resultingObjectId: 'activity-1', resultState: expect.objectContaining({ scheduledDate: '2026-07-25' }),
  }));
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
  expect(activities[0]?.scheduledDate).toBe('2026-07-25');
});

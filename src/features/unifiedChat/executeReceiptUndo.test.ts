import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeReceiptUndo } from './executeReceiptUndo';

test('undoes the authoritative Activity before marking receipt and proposal undone', async () => {
  const order: string[] = [];
  const before: Activity = {
    id: 'activity-1', goalId: null, title: 'Library', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z',
  };
  let activities: Activity[] = [{ ...before, scheduledDate: '2026-07-25', updatedAt: '2026-07-22T13:00:00.000Z' }];
  const store = {
    getActivities: () => activities,
    getGoals: () => [] as Goal[],
    addActivity: jest.fn(),
    updateActivity: jest.fn((id: string, updater: (item: Activity) => Activity) => {
      order.push('store:undo'); activities = activities.map((item) => item.id === id ? updater(item) : item);
    }),
    removeActivity: jest.fn(),
  };
  const proposal = {
    id: 'proposal-1', status: 'applied', version: 4,
  } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-1', proposalId: 'proposal-1', operationId: 'operation-1', capabilityId: 'todos',
    idempotencyKey: 'run-1:1', status: 'applied', resultingObjectType: 'activity', resultingObjectId: 'activity-1',
    resultState: { title: 'Library', status: 'planned', goalId: null, scheduledDate: '2026-07-25', updatedAt: '2026-07-22T13:00:00.000Z' },
    returnTarget: { capabilityId: 'todos', object: { type: 'activity', id: 'activity-1' }, label: 'Library', route: { name: 'MainTabs', params: {} } },
    undoOperation: { type: 'restore_activity', activity: before, expectedUpdatedAt: '2026-07-22T13:00:00.000Z' },
    canUndo: true, appliedAt: '2026-07-22T13:00:00.000Z', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => { order.push('receipt:undone'); }),
    transitionProposalStatus: jest.fn(async () => { order.push('proposal:undone'); }),
  };

  await executeReceiptUndo({ receipt, proposal, repository, store, now: () => '2026-07-22T14:00:00.000Z' });
  expect(order).toEqual(['store:undo', 'receipt:undone', 'proposal:undone']);
  expect(activities[0]).toMatchObject({ updatedAt: '2026-07-22T14:00:00.000Z' });
  expect(activities[0]?.scheduledDate).toBeUndefined();
});

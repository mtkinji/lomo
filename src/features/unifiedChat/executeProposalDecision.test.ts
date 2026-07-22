import type { Activity, Goal } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal, UnifiedChatProposalDecisionResult } from './types';
import { executeProposalDecision } from './executeProposalDecision';

const baseActivity: Activity = {
  id: 'activity-1', goalId: null, title: 'Library', type: 'task', tags: [], status: 'planned',
  forceActual: {}, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z',
};

function proposal(): UnifiedChatProposal {
  return {
    id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-2', capabilityId: 'todos',
    title: 'Move Library', body: 'Moves the date.', status: 'pending', version: 1,
    createdAt: '2026-07-22T00:00:00.000Z', updatedAt: '2026-07-22T00:00:00.000Z',
    operation: {
      id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'todos', type: 'update_activity',
      targetId: 'activity-1', summary: 'Move Library',
      payload: { scheduledDate: '2026-07-25', expectedUpdatedAt: '2026-07-21T00:00:00.000Z' },
      idempotencyKey: 'run-1:1', sequence: 1,
    },
  };
}

function harness() {
  const order: string[] = [];
  let activities = [baseActivity];
  const repository = {
    decideProposal: jest.fn(async ({ action }: { action: string }): Promise<UnifiedChatProposalDecisionResult> => {
      order.push(`decide:${action}`);
      return { id: 'proposal-1', status: action === 'approve' ? 'approved' : action === 'edit' ? 'edited' : action === 'defer' ? 'deferred' : 'rejected', version: 2 };
    }),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => {
      order.push(`proposal:${toStatus}`);
      return { status: toStatus, version: expectedVersion + 1 };
    }),
    persistMutationReceipt: jest.fn(async (input: Record<string, unknown>) => {
      order.push('receipt:reserved');
      return { id: 'receipt-1', ...input } as unknown as UnifiedChatMutationReceipt;
    }),
    finalizeMutationReceipt: jest.fn(async (_id: string, input: Record<string, unknown>) => {
      order.push('receipt:applied');
      return { id: 'receipt-1', status: 'applied', ...input } as unknown as UnifiedChatMutationReceipt;
    }),
  };
  const store = {
    getActivities: () => activities,
    getGoals: () => [] as Goal[],
    addActivity: jest.fn((item: Activity) => { order.push('store:add'); activities = [...activities, item]; }),
    updateActivity: jest.fn((id: string, updater: (item: Activity) => Activity) => {
      order.push('store:update'); activities = activities.map((item) => item.id === id ? updater(item) : item);
    }),
    removeActivity: jest.fn(),
  };
  return { order, repository, store };
}

describe('executeProposalDecision', () => {
  test('persists edit reject and defer without crossing the apply boundary', async () => {
    const { repository, store } = harness();
    await executeProposalDecision({ proposal: proposal(), action: 'defer', repository, store });
    expect(repository.decideProposal).toHaveBeenCalledWith(expect.objectContaining({ action: 'defer', expectedVersion: 1 }));
    expect(store.updateActivity).not.toHaveBeenCalled();
    expect(repository.persistMutationReceipt).not.toHaveBeenCalled();
  });

  test('approves then applies and persists receipt before marking applied', async () => {
    const { order, repository, store } = harness();
    await executeProposalDecision({
      proposal: proposal(), action: 'approve', repository, store,
      now: () => '2026-07-22T13:00:00.000Z',
    });
    expect(order).toEqual(['decide:approve', 'proposal:applying', 'receipt:reserved', 'store:update', 'receipt:applied', 'proposal:applied']);
    expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-1', proposalId: 'proposal-1', operationId: 'operation-1',
      status: 'reserved',
      resultingObjectId: 'activity-1', undoOperation: expect.objectContaining({ type: 'restore_activity' }),
    }));
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectId: 'activity-1', undoOperation: expect.objectContaining({ type: 'restore_activity' }),
    }));
  });

  test('lets capability-owned enrichment refresh the receipt before finalization', async () => {
    const { order, repository, store } = harness();
    await executeProposalDecision({
      proposal: proposal(), action: 'approve', repository, store,
      now: () => '2026-07-22T13:00:00.000Z',
      afterApply: async (receipt) => {
        order.push('activity:enriched');
        return { ...receipt, resultState: { ...receipt.resultState, estimateMinutes: 45 } };
      },
    });

    expect(order).toEqual([
      'decide:approve', 'proposal:applying', 'receipt:reserved', 'store:update',
      'activity:enriched', 'receipt:applied', 'proposal:applied',
    ]);
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
      'receipt-1', expect.objectContaining({ resultState: expect.objectContaining({ estimateMinutes: 45 }) }),
    );
  });

  test('marks an approved proposal failed when capability apply conflicts', async () => {
    const { order, repository, store } = harness();
    store.updateActivity('activity-1', (item) => ({ ...item, updatedAt: '2026-07-22T12:30:00.000Z' }));
    order.length = 0;
    await expect(executeProposalDecision({ proposal: proposal(), action: 'approve', repository, store }))
      .rejects.toThrow(/changed after this proposal/i);
    expect(order).toEqual(['decide:approve', 'proposal:applying', 'proposal:failed']);
  });
});

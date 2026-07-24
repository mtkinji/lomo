import type { Arc } from '../../domain/types';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeArcProposalDecision } from './executeArcProposalDecision';

test('reserves Arc undo before authoritative apply and finalizes the receipt', async () => {
  const before: Arc = { id: 'arc-1', name: 'Present parent', status: 'active', createdAt: 'before', updatedAt: 'before' };
  let arcs = [before];
  const proposal = {
    id: 'proposal-arc', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'arcs', title: 'Update Present parent', body: 'Reviews identity changes.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-arc', proposalId: 'proposal-arc', capabilityId: 'arcs', type: 'update_arc',
      targetId: before.id, summary: 'Update Present parent', idempotencyKey: 'arc-1', sequence: 1,
      payload: { name: 'Steady parent', expectedUpdatedAt: before.updatedAt },
    },
  } as Extract<UnifiedChatProposal, { capabilityId: 'arcs' }>;
  const receipt = (status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt => ({
    id: 'receipt-arc', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'arcs', idempotencyKey: 'arc-1', status, resultingObjectType: 'arc',
    resultingObjectId: before.id, resultState: {}, returnTarget: null, undoOperation: null,
    canUndo: false, appliedAt: null, undoneAt: null,
  });
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
  };
  const store = {
    getArcs: () => arcs, getGoals: () => [], getActivities: () => [], getGoalRecommendations: () => [],
    getIsPro: () => true, addArc: jest.fn(),
    updateArc: (id: string, updater: (arc: Arc) => Arc) => { arcs = arcs.map((arc) => arc.id === id ? updater(arc) : arc); },
    removeArc: jest.fn(), restoreRemovedArc: jest.fn(),
  };

  await executeArcProposalDecision({ proposal, action: 'approve', repository, store, now: () => 'applied' });

  expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
    capabilityId: 'arcs', status: 'reserved', undoOperation: expect.objectContaining({ type: 'restore_arc' }),
  }));
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-arc', expect.objectContaining({ undoOperation: expect.objectContaining({ type: 'restore_arc' }) }),
  );
  expect(arcs[0]).toMatchObject({ name: 'Steady parent', updatedAt: 'applied' });
});

test('marks a stale Arc proposal failed before reserving a receipt', async () => {
  const current: Arc = { id: 'arc-1', name: 'Changed', status: 'active', createdAt: 'before', updatedAt: 'newer' };
  const proposal = {
    id: 'proposal-arc', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'arcs', title: 'Update Arc', body: 'Reviews identity changes.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-arc', proposalId: 'proposal-arc', capabilityId: 'arcs', type: 'update_arc',
      targetId: current.id, summary: 'Update Arc', idempotencyKey: 'arc-1', sequence: 1,
      payload: { name: 'Steady parent', expectedUpdatedAt: 'before' },
    },
  } as Extract<UnifiedChatProposal, { capabilityId: 'arcs' }>;
  const repository = {
    decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(), finalizeMutationReceipt: jest.fn(),
  };
  const store = {
    getArcs: () => [current], getGoals: () => [], getActivities: () => [], getGoalRecommendations: () => [],
    getIsPro: () => true, addArc: jest.fn(), updateArc: jest.fn(), removeArc: jest.fn(), restoreRemovedArc: jest.fn(),
  };

  await expect(executeArcProposalDecision({ proposal, action: 'approve', repository, store }))
    .rejects.toThrow('changed after this proposal');
  expect(repository.persistMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).toHaveBeenLastCalledWith({
    proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: 3,
  });
});

import type { Arc } from '../../domain/types';
import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';
import { recoverArcMutations } from './recoverArcMutations';

const before: Arc = { id: 'arc-1', name: 'Present parent', status: 'active', createdAt: 'before', updatedAt: 'before' };

function aggregate(current: Arc): UnifiedChatThreadAggregate {
  const proposal = {
    id: 'proposal-arc', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'arcs', title: 'Update Present parent', body: 'Reviews the Arc change.',
    status: 'applying', version: 3, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: 'operation-arc', proposalId: 'proposal-arc', capabilityId: 'arcs', type: 'update_arc',
      targetId: before.id, summary: 'Update Arc', idempotencyKey: 'arc-1', sequence: 1,
      payload: { name: 'Steady parent', expectedUpdatedAt: before.updatedAt },
    },
  } as UnifiedChatProposal;
  return {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal], receipts: [{
      id: 'receipt-arc', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'arcs', idempotencyKey: 'arc-1', status: 'reserved',
      resultingObjectType: 'arc', resultingObjectId: before.id,
      resultState: { name: 'Steady parent', status: 'active', updatedAt: 'applied' },
      returnTarget: { capabilityId: 'arcs' },
      undoOperation: { type: 'restore_arc', arc: before, expectedUpdatedAt: 'applied' },
      canUndo: false, appliedAt: 'applied', undoneAt: null,
    }],
  };
}

test('finalizes an already-applied Arc mutation without applying it twice', async () => {
  let arcs: Arc[] = [{ ...before, name: 'Steady parent', updatedAt: 'applied' }];
  const source = aggregate(arcs[0]);
  const loaded = { ...source, proposals: [{ ...source.proposals![0], status: 'applied' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = boundary(() => arcs, (next) => { arcs = next; });

  await expect(recoverArcMutations({ aggregate: source, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateArc).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
    'receipt-arc', expect.objectContaining({ undoOperation: expect.objectContaining({ type: 'restore_arc' }) }),
  );
});

test('fails a conflicting reserved Arc mutation and still reloads the thread', async () => {
  let arcs: Arc[] = [{ ...before, name: 'Changed elsewhere', updatedAt: 'someone-else' }];
  const source = aggregate(arcs[0]);
  const loaded = { ...source, proposals: [{ ...source.proposals![0], status: 'failed' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(async () => ({})),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = boundary(() => arcs, (next) => { arcs = next; });

  await expect(recoverArcMutations({ aggregate: source, repository: repository as never, store })).resolves.toBe(loaded);
  expect(repository.failMutationReceipt).toHaveBeenCalledWith(
    'receipt-arc', 'arc_recovery_conflict', 'The Arc changed after this proposal was prepared.',
  );
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'failed' }));
});

test('completes an applying Arc proposal whose receipt was already finalized', async () => {
  let arcs: Arc[] = [{ ...before, name: 'Steady parent', updatedAt: 'applied' }];
  const source = aggregate(arcs[0]);
  source.receipts = source.receipts?.map((receipt) => ({ ...receipt, status: 'applied' as const, canUndo: true }));
  const loaded = { ...source, proposals: [{ ...source.proposals![0], status: 'applied' as const }] };
  const repository = {
    finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(),
    transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
  };
  const store = boundary(() => arcs, (next) => { arcs = next; });

  await expect(recoverArcMutations({ aggregate: source, repository: repository as never, store })).resolves.toBe(loaded);
  expect(store.updateArc).not.toHaveBeenCalled();
  expect(repository.finalizeMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
});

function boundary(getArcs: () => Arc[], setArcs: (next: Arc[]) => void) {
  return {
    getArcs, getGoals: () => [], getActivities: () => [], getGoalRecommendations: () => [], getIsPro: () => true,
    addArc: jest.fn((arc: Arc) => setArcs([...getArcs(), arc])),
    updateArc: jest.fn((id: string, updater: (arc: Arc) => Arc) =>
      setArcs(getArcs().map((arc) => arc.id === id ? updater(arc) : arc))),
    removeArc: jest.fn(), restoreRemovedArc: jest.fn(),
  };
}

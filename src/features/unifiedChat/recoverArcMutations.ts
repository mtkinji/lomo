import {
  ArcMutationConflictError,
  recoverReservedArcProposal,
  type ArcStoreBoundary,
} from './arcProposalExecutor';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';

type Repository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'failMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

export async function recoverArcMutations({ aggregate, repository, store }: {
  aggregate: UnifiedChatThreadAggregate; repository: Repository; store: ArcStoreBoundary;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'arcs' || proposal.status !== 'applying') continue;
    const receipt = (aggregate.receipts ?? []).find(
      (candidate) => candidate.proposalId === proposal.id &&
        (candidate.status === 'reserved' || candidate.status === 'applied'),
    );
    if (!receipt) continue;
    try {
      if (receipt.status === 'reserved') {
        const recovered = recoverReservedArcProposal({ receipt, proposal, store });
        await repository.finalizeMutationReceipt(receipt.id, {
          capabilityId: 'arcs', resultingObjectType: 'arc', resultingObjectId: recovered.resultingObjectId,
          resultState: recovered.resultState, returnTarget: recovered.returnTarget,
          undoOperation: recovered.undoOperation as unknown as Record<string, unknown>, appliedAt: recovered.appliedAt,
        });
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: proposal.version,
      });
    } catch (error) {
      if (!(error instanceof ArcMutationConflictError) || receipt.status !== 'reserved') throw error;
      await repository.failMutationReceipt(receipt.id, 'arc_recovery_conflict', error.message);
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: proposal.version,
      });
    }
    changed = true;
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}

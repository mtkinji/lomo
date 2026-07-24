import {
  GoalMutationConflictError,
  recoverReservedGoalProposal,
  type GoalStoreBoundary,
} from './goalProposalExecutor';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';

type Repository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'failMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

export async function recoverGoalMutations({ aggregate, repository, store }: {
  aggregate: UnifiedChatThreadAggregate; repository: Repository; store: GoalStoreBoundary;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'goals' || proposal.status !== 'applying') continue;
    const receipt = (aggregate.receipts ?? []).find(
      (candidate) => candidate.proposalId === proposal.id &&
        (candidate.status === 'reserved' || candidate.status === 'applied'),
    );
    if (!receipt) continue;
    try {
      if (receipt.status === 'reserved') {
        const recovered = recoverReservedGoalProposal({ receipt, proposal, store });
        await repository.finalizeMutationReceipt(receipt.id, {
          capabilityId: 'goals', resultingObjectType: 'goal', resultingObjectId: recovered.resultingObjectId,
          resultState: recovered.resultState, returnTarget: recovered.returnTarget,
          undoOperation: recovered.undoOperation as unknown as Record<string, unknown>, appliedAt: recovered.appliedAt,
        });
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: proposal.version,
      });
    } catch (error) {
      if (!(error instanceof GoalMutationConflictError) || receipt.status !== 'reserved') throw error;
      await repository.failMutationReceipt(receipt.id, 'goal_recovery_conflict', error.message);
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: proposal.version,
      });
    }
    changed = true;
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}

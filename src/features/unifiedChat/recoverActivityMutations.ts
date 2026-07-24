import {
  ActivityMutationConflictError,
  recoverReservedActivityProposal,
  type ActivityStoreBoundary,
} from './activityProposalExecutor';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatThreadAggregate } from './types';

type RecoveryRepository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'failMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

export async function recoverActivityMutations({
  aggregate,
  repository,
  store,
}: {
  aggregate: UnifiedChatThreadAggregate;
  repository: RecoveryRepository;
  store: ActivityStoreBoundary;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'todos') continue;
    if (proposal.status !== 'applying') continue;
    const receipt = (aggregate.receipts ?? []).find((candidate) => candidate.proposalId === proposal.id);
    if (!receipt || (receipt.status !== 'reserved' && receipt.status !== 'applied')) continue;

    try {
      if (receipt.status === 'reserved') {
        const recovered = recoverReservedActivityProposal({ receipt, proposal, store });
        await repository.finalizeMutationReceipt(receipt.id, {
          resultingObjectType: 'activity', resultingObjectId: recovered.resultingObjectId,
          resultState: recovered.resultState,
          returnTarget: recovered.returnTarget as unknown as Record<string, unknown>,
          undoOperation: recovered.undoOperation as unknown as Record<string, unknown>,
          appliedAt: recovered.appliedAt,
        });
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id,
        fromStatus: 'applying',
        toStatus: 'applied',
        expectedVersion: proposal.version,
      });
      changed = true;
    } catch (error) {
      if (!(error instanceof ActivityMutationConflictError) || receipt.status !== 'reserved') throw error;
      await repository.failMutationReceipt(receipt.id, 'activity_recovery_conflict', error.message);
      await repository.transitionProposalStatus({
        proposalId: proposal.id,
        fromStatus: 'applying',
        toStatus: 'failed',
        expectedVersion: proposal.version,
      });
      changed = true;
    }
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}

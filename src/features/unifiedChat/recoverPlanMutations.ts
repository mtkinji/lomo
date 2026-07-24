import type { PlanMutationReceipt } from './planProposalExecutor';
import type { UnifiedChatRepository } from './threadRepository';
import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;
type RecoveryRepository = Pick<
  UnifiedChatRepository,
  'finalizeMutationReceipt' | 'failMutationReceipt' | 'transitionProposalStatus' | 'loadThread'
>;

export async function recoverPlanMutations({
  aggregate,
  repository,
  apply,
}: {
  aggregate: UnifiedChatThreadAggregate;
  repository: RecoveryRepository;
  apply: (proposal: PlanProposal, options: { allowAlreadyApplied: true }) => Promise<PlanMutationReceipt>;
}): Promise<UnifiedChatThreadAggregate> {
  let changed = false;
  for (const proposal of aggregate.proposals ?? []) {
    if (proposal.capabilityId !== 'plan' || proposal.status !== 'applying') continue;
    const receipt = (aggregate.receipts ?? []).find((candidate) => candidate.proposalId === proposal.id);
    if (!receipt || (receipt.status !== 'reserved' && receipt.status !== 'applied')) continue;

    try {
      if (receipt.status === 'reserved') {
        const recovered = await apply({ ...proposal, status: 'approved' }, { allowAlreadyApplied: true });
        await repository.finalizeMutationReceipt(receipt.id, {
          capabilityId: 'plan',
          resultingObjectType: 'activity',
          resultingObjectId: recovered.resultingObjectId,
          resultState: recovered.resultState,
          returnTarget: recovered.returnTarget,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kwilt could not confirm the calendar block.';
      if (receipt.status === 'reserved') {
        await repository.failMutationReceipt(receipt.id, 'plan_recovery_unconfirmed', message).catch(() => undefined);
      }
      await repository.transitionProposalStatus({
        proposalId: proposal.id,
        fromStatus: 'applying',
        toStatus: 'failed',
        expectedVersion: proposal.version,
      }).catch(() => undefined);
    }
    changed = true;
  }
  return changed ? repository.loadThread(aggregate.thread.id) : aggregate;
}

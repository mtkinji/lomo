import {
  applyApprovedGoalProposal,
  prepareApprovedGoalProposal,
  type GoalMutationReceipt,
  type GoalStoreBoundary,
} from './goalProposalExecutor';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

type GoalProposal = Extract<UnifiedChatProposal, { capabilityId: 'goals' }>;
type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
};

export async function executeGoalProposalDecision({ proposal, action, repository, store, now = () => new Date().toISOString() }: {
  proposal: GoalProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  store: GoalStoreBoundary;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const approved = { ...proposal, status: 'approved' as const, version: decision.version };
  let reservationPersisted = false;
  try {
    const appliedAt = now();
    const reservation = prepareApprovedGoalProposal({ proposal: approved, store, appliedAt });
    const reserved = await repository.persistMutationReceipt({
      capabilityId: 'goals', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: proposal.operation.id, idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved', resultingObjectType: 'goal', resultingObjectId: reservation.resultingObjectId,
      resultState: reservation.resultState, returnTarget: reservation.returnTarget,
      undoOperation: reservation.undoOperation as unknown as Record<string, unknown>, appliedAt,
    });
    reservationPersisted = true;
    const result: GoalMutationReceipt = applyApprovedGoalProposal({ proposal: approved, store, now: () => appliedAt });
    await repository.finalizeMutationReceipt(reserved.id, {
      resultingObjectType: 'goal', resultingObjectId: result.resultingObjectId,
      resultState: result.resultState, returnTarget: result.returnTarget,
      undoOperation: result.undoOperation as unknown as Record<string, unknown>, appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    if (reservationPersisted) throw error;
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}

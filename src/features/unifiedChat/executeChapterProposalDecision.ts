import {
  applyApprovedChapterProposal,
  prepareApprovedChapterProposal,
  type ChapterStoreBoundary,
} from './chapterProposalExecutor';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

type ChapterProposal = Extract<UnifiedChatProposal, { capabilityId: 'chapters' }>;
type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
};

export async function executeChapterProposalDecision({ proposal, action, repository, store }: {
  proposal: ChapterProposal; action: DecideUnifiedChatProposalInput['action'];
  repository: Repository; store: ChapterStoreBoundary;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const approved = { ...proposal, status: 'approved' as const, version: decision.version };
  let reservationPersisted = false;
  try {
    const reservation = await prepareApprovedChapterProposal({ proposal: approved, store });
    const reserved = await repository.persistMutationReceipt({
      capabilityId: 'chapters', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: proposal.operation.id, idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved', resultingObjectType: 'chapter', resultingObjectId: reservation.resultingObjectId,
      resultState: reservation.resultState, returnTarget: reservation.returnTarget,
      undoOperation: reservation.undoOperation as unknown as Record<string, unknown>, appliedAt: null,
    });
    reservationPersisted = true;
    const result = await applyApprovedChapterProposal({ proposal: approved, store });
    await repository.finalizeMutationReceipt(reserved.id, {
      capabilityId: 'chapters', resultingObjectType: 'chapter', resultingObjectId: result.resultingObjectId,
      resultState: result.resultState, returnTarget: result.returnTarget,
      undoOperation: result.undoOperation as unknown as Record<string, unknown>, appliedAt: result.appliedAt,
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

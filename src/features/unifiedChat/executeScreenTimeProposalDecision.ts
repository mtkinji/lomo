import type { SupabaseClient } from '@supabase/supabase-js';
import { applyApprovedScreenTimeProposal, prepareApprovedScreenTimeProposal } from './screenTimeProposalExecutor';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

type ScreenTimeProposal = Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }>;
type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
};

export async function executeScreenTimeProposalDecision(input: {
  proposal: ScreenTimeProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  client: SupabaseClient;
  now?: () => Date;
}): Promise<void> {
  const { proposal, action, repository, client } = input;
  const decision = await repository.decideProposal({
    proposalId: proposal.id, action, expectedVersion: proposal.version,
  });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  let reservationPersisted = false;
  try {
    const appliedAt = (input.now?.() ?? new Date()).toISOString();
    const reservation = prepareApprovedScreenTimeProposal(proposal);
    const reserved = await repository.persistMutationReceipt({
      capabilityId: 'screenTime', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: proposal.operation.id, idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved', resultingObjectType: reservation.resultingObjectType,
      resultingObjectId: reservation.resultingObjectId, resultState: reservation.resultState,
      returnTarget: reservation.returnTarget, undoOperation: null, appliedAt,
    });
    reservationPersisted = true;
    const result = await applyApprovedScreenTimeProposal({ proposal, client, now: new Date(appliedAt) });
    await repository.finalizeMutationReceipt(reserved.id, {
      resultingObjectType: result.resultingObjectType, resultingObjectId: result.resultingObjectId,
      resultState: result.resultState, returnTarget: result.returnTarget,
      undoOperation: null, appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    if (!reservationPersisted) {
      await repository.transitionProposalStatus({
        proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
      }).catch(() => undefined);
    }
    throw error;
  }
}

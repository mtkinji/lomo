import type { ActivityMutationPatch } from './activityProposal';
import {
  applyApprovedActivityProposal,
  prepareApprovedActivityProposal,
  type ActivityStoreBoundary,
  type ActivityMutationReceipt,
} from './activityProposalExecutor';
import { transitionProposal } from './runStateMachine';
import type {
  DecideUnifiedChatProposalInput,
  PersistUnifiedChatMutationReceiptInput,
  FinalizeUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
  UnifiedChatMutationReceipt,
} from './types';

type ProposalDecisionRepository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{
    status: UnifiedChatProposal['status'];
    version: number;
  }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (
    receiptId: string,
    input: FinalizeUnifiedChatMutationReceiptInput,
  ) => Promise<UnifiedChatMutationReceipt>;
};

export async function executeProposalDecision({
  proposal,
  action,
  patch,
  repository,
  store,
  now = () => new Date().toISOString(),
  afterApply,
}: {
  proposal: UnifiedChatProposal;
  action: DecideUnifiedChatProposalInput['action'];
  patch?: ActivityMutationPatch;
  repository: ProposalDecisionRepository;
  store: ActivityStoreBoundary;
  now?: () => string;
  afterApply?: (receipt: ActivityMutationReceipt) => Promise<ActivityMutationReceipt>;
}): Promise<void> {
  if (proposal.capabilityId !== 'todos') {
    throw new Error('This proposal is not an Activity operation.');
  }
  const decision = await repository.decideProposal({
    proposalId: proposal.id,
    action,
    expectedVersion: proposal.version,
    ...(patch ? { patch } : {}),
  });
  if (action !== 'approve') return;

  const approved = { ...proposal, status: 'approved' as const, version: decision.version };
  transitionProposal(approved, 'applying', approved.version);
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id,
    fromStatus: 'approved',
    toStatus: 'applying',
    expectedVersion: approved.version,
  });

  let reservationPersisted = false;
  try {
    const appliedAt = now();
    const reservation = prepareApprovedActivityProposal({ proposal: approved, store, appliedAt });
    const reserved = await repository.persistMutationReceipt({
      threadId: proposal.threadId,
      proposalId: proposal.id,
      operationId: proposal.operation.id,
      idempotencyKey: reservation.idempotencyKey,
      status: 'reserved',
      resultingObjectType: 'activity',
      resultingObjectId: reservation.resultingObjectId,
      resultState: reservation.resultState,
      returnTarget: reservation.returnTarget as unknown as Record<string, unknown>,
      undoOperation: reservation.undoOperation as unknown as Record<string, unknown>,
      appliedAt: reservation.appliedAt,
    });
    reservationPersisted = true;
    let receipt = applyApprovedActivityProposal({ proposal: approved, store, now: () => appliedAt });
    if (afterApply) receipt = await afterApply(receipt);
    await repository.finalizeMutationReceipt(reserved.id, {
      resultingObjectType: 'activity', resultingObjectId: receipt.resultingObjectId,
      resultState: receipt.resultState,
      returnTarget: receipt.returnTarget as unknown as Record<string, unknown>,
      undoOperation: receipt.undoOperation as unknown as Record<string, unknown>,
      appliedAt: receipt.appliedAt,
    });
    transitionProposal({ status: 'applying', version: applying.version }, 'applied', applying.version);
    await repository.transitionProposalStatus({
      proposalId: proposal.id,
      fromStatus: 'applying',
      toStatus: 'applied',
      expectedVersion: applying.version,
    });
  } catch (error) {
    if (reservationPersisted) throw error;
    transitionProposal({ status: 'applying', version: applying.version }, 'failed', applying.version);
    await repository.transitionProposalStatus({
      proposalId: proposal.id,
      fromStatus: 'applying',
      toStatus: 'failed',
      expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}

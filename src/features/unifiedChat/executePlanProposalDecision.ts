import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';
import type { PlanMutationReceipt } from './planProposalExecutor';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

type Repository = {
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
  failMutationReceipt: (
    receiptId: string,
    errorCode: string,
    errorMessage: string,
  ) => Promise<UnifiedChatMutationReceipt>;
};

export async function executePlanProposalDecision({
  proposal,
  action,
  repository,
  apply,
  now = () => new Date().toISOString(),
}: {
  proposal: PlanProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  apply: (approved: PlanProposal) => Promise<PlanMutationReceipt>;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({
    proposalId: proposal.id,
    action,
    expectedVersion: proposal.version,
  });
  if (action !== 'approve') return;

  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id,
    fromStatus: 'approved',
    toStatus: 'applying',
    expectedVersion: decision.version,
  });
  const approved = { ...proposal, status: 'approved' as const, version: decision.version };
  const reservedAt = now();
  const targetDateKey = proposal.operation.type === 'remove_activity_from_plan'
    ? proposal.operation.payload.previousTargetDateKey
    : proposal.operation.payload.targetDateKey;
  const scheduledAt = proposal.operation.type === 'remove_activity_from_plan'
    ? null
    : proposal.operation.payload.startDate;
  const reserved = await repository.persistMutationReceipt({
    capabilityId: 'plan',
    threadId: proposal.threadId,
    proposalId: proposal.id,
    operationId: proposal.operation.id,
    idempotencyKey: proposal.operation.idempotencyKey,
    status: 'reserved',
    resultingObjectType: 'activity',
    resultingObjectId: proposal.operation.payload.activityId,
    resultState: {
      title: proposal.title,
      scheduledAt,
      targetDateKey,
    },
    returnTarget: {
      capabilityId: 'plan',
      object: { type: 'plan_day', id: targetDateKey },
      label: 'Review in Plan',
      route: {
        name: 'MainTabs',
        params: { screen: 'PlanTab', params: { dateKey: targetDateKey } },
      },
    },
    undoOperation: null,
    appliedAt: reservedAt,
  });

  try {
    const result = await apply(approved);
    await repository.finalizeMutationReceipt(reserved.id, {
      resultingObjectType: 'activity',
      resultingObjectId: result.resultingObjectId,
      resultState: result.resultState,
      returnTarget: result.returnTarget,
      undoOperation: result.undoOperation as unknown as Record<string, unknown>,
      appliedAt: result.appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id,
      fromStatus: 'applying',
      toStatus: 'applied',
      expectedVersion: applying.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kwilt could not confirm the calendar block.';
    await repository.failMutationReceipt(reserved.id, 'plan_apply_unconfirmed', message).catch(() => undefined);
    await repository.transitionProposalStatus({
      proposalId: proposal.id,
      fromStatus: 'applying',
      toStatus: 'failed',
      expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}

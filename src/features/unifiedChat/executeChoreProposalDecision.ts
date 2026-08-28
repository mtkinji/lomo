import type { createChoreActions } from '../../capabilities/chores/domain/choreActions';
import type {
  DecideUnifiedChatProposalInput, FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput, TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt, UnifiedChatProposal, UnifiedChatProposalDecisionResult,
  UnifiedChatProposalOperation,
} from './types';

export type ChoreOperation = Extract<UnifiedChatProposalOperation, { capabilityId: 'chores' }>;
export type ChoreProposal = Omit<Extract<UnifiedChatProposal, { capabilityId: 'chores' }>, 'operation'> & { operation: ChoreOperation };
type Actions = ReturnType<typeof createChoreActions>;
type Repository = {
  decideProposal(input: DecideUnifiedChatProposalInput): Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt(id: string, input: FinalizeUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt(id: string, code: string, message: string): Promise<UnifiedChatMutationReceipt>;
};

function targetType(operation: ChoreOperation): string {
  if (operation.type.startsWith('chores.reward.')) return operation.type === 'chores.reward.configure' ? 'household' : 'chore_reward';
  if (operation.type.includes('occurrence') || operation.type.includes('review')) return 'chore_occurrence';
  return 'chore';
}

function fieldsRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const field = item as Record<string, unknown>;
    return typeof field.key === 'string' && 'value' in field ? [[field.key, field.value]] : [];
  }));
}

export async function applyChoreOperation(operation: ChoreOperation, actions: Actions): Promise<Record<string, unknown>> {
  const requestId = operation.idempotencyKey; const confirmed = true;
  const expectedUpdatedAt = operation.expectedUpdatedAt ?? '';
  const payload = operation.payload;
  let receipt: unknown;
  if (operation.type === 'chores.definition.create') receipt = await actions.createDefinition({ requestId, confirmed, fields: fieldsRecord(payload.fields) });
  else if (operation.type === 'chores.definition.update') receipt = await actions.updateDefinition({ requestId, confirmed, choreId: operation.targetId!, expectedUpdatedAt, scope: payload.scope as 'today' | 'this_and_future', fields: fieldsRecord(payload.fields) });
  else if (operation.type === 'chores.definition.pause') receipt = await actions.pauseDefinition({ requestId, confirmed, choreId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.definition.delete') receipt = await actions.deleteDefinition({ requestId, confirmed, choreId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.occurrence.complete') receipt = await actions.completeOccurrence({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt, evidenceRefIds: Array.isArray(payload.evidenceRefIds) ? payload.evidenceRefIds.map(String) : [] });
  else if (operation.type === 'chores.occurrence.claim') receipt = await actions.claimOccurrence({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.occurrence.release') receipt = await actions.releaseOccurrence({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.occurrence.reopen') receipt = await actions.reopenOccurrence({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.occurrence.report_earlier') receipt = await actions.reportEarlierOccurrences({ requestId, confirmed, items: Array.isArray(payload.items) ? payload.items as Array<{ occurrenceId: string; expectedUpdatedAt: string }> : [] });
  else if (operation.type === 'chores.review.approve') receipt = await actions.approveOccurrence({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.review.return') receipt = await actions.returnOccurrence({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt, note: typeof payload.note === 'string' ? payload.note : null });
  else if (operation.type === 'chores.review.leave_missed') receipt = await actions.leaveOccurrenceMissed({ requestId, confirmed, occurrenceId: operation.targetId!, expectedUpdatedAt });
  else if (operation.type === 'chores.reward.configure') receipt = await actions.configureReward({ requestId, confirmed, expectedVersion: expectedUpdatedAt, enabled: payload.enabled === true, centsPerToken: Number(payload.centsPerToken) });
  else if (operation.type === 'chores.reward.reserve') receipt = await actions.reserveReward({ requestId, confirmed, membershipId: operation.targetId!, tokenCount: Number(payload.tokenCount), expectedVersion: expectedUpdatedAt });
  else if (operation.type === 'chores.reward.cancel') receipt = await actions.cancelReward({ requestId, confirmed, reservationId: operation.targetId!, expectedUpdatedAt });
  else receipt = await actions.settleReward({ requestId, confirmed, reservationId: operation.targetId!, expectedUpdatedAt });
  return receipt as Record<string, unknown>;
}

export async function executeChoreProposalDecision({ proposal, action, repository, actions, now = () => new Date().toISOString() }: {
  proposal: ChoreProposal; action: DecideUnifiedChatProposalInput['action']; repository: Repository; actions: Actions; now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version });
  const operation = proposal.operation; let receipt: UnifiedChatMutationReceipt | null = null;
  try {
    const appliedAt = now(); const objectType = targetType(operation); const objectId = operation.targetId ?? proposal.id;
    const returnTarget = { capabilityId: 'chores', object: { type: objectType, id: objectId }, label: 'Chores', route: { name: 'Chores' } };
    receipt = await repository.persistMutationReceipt({ capabilityId: 'chores', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved', resultingObjectType: objectType,
      resultingObjectId: objectId, resultState: { expectedUpdatedAt: operation.expectedUpdatedAt, ...operation.payload }, returnTarget, undoOperation: null, appliedAt });
    const resultState = await applyChoreOperation(operation, actions);
    await repository.finalizeMutationReceipt(receipt.id, { capabilityId: 'chores', resultingObjectType: objectType, resultingObjectId: objectId,
      resultState, returnTarget, undoOperation: null, appliedAt });
    await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version });
  } catch (error) {
    if (receipt) await repository.failMutationReceipt(receipt.id, error instanceof Error ? error.message : 'chore_control_failed', 'Kwilt could not confirm the Chore change.').catch(() => undefined);
    await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version }).catch(() => undefined);
    throw error;
  }
}

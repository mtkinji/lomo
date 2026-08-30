import type { SupabaseClient } from '@supabase/supabase-js';
import { applyApprovedScreenTimeProposal, prepareApprovedScreenTimeProposal } from './screenTimeProposalExecutor';
import {
  deactivatePersonalScreenTimeRuleReviewed,
  deletePersonalScreenTimeRule,
  getPersonalScreenTimeRule,
  updatePersonalScreenTimeRule,
  type PersonalScreenTimeRuleActionBoundary,
} from '../screen-time/domain/personalScreenTimeRuleActions';
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
export type PersonalScreenTimeProposal = ScreenTimeProposal & {
  operation: Extract<ScreenTimeProposal['operation'], {
    type: 'update_personal_screen_time_rule' | 'deactivate_personal_screen_time_rule' | 'delete_personal_screen_time_rule';
  }>;
};
export function isPersonalScreenTimeProposal(proposal: ScreenTimeProposal): proposal is PersonalScreenTimeProposal {
  return proposal.operation.type === 'update_personal_screen_time_rule'
    || proposal.operation.type === 'deactivate_personal_screen_time_rule'
    || proposal.operation.type === 'delete_personal_screen_time_rule';
}
type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
};

export function preparePersonalScreenTimeProposal(
  proposal: PersonalScreenTimeProposal,
  boundary: PersonalScreenTimeRuleActionBoundary,
  appliedAt: string,
) {
  if (proposal.operation.type === 'delete_personal_screen_time_rule') return null;
  const prior = getPersonalScreenTimeRule({ ruleId: proposal.operation.targetId }, boundary).result;
  return {
    type: 'screen_time.personal_rule.update', ruleId: prior.id, expectedUpdatedAt: appliedAt,
    fields: { enabled: prior.enabled },
  };
}

export async function applyPersonalScreenTimeProposal(
  proposal: PersonalScreenTimeProposal,
  boundary: PersonalScreenTimeRuleActionBoundary,
  appliedAt: string,
) {
  const operation = proposal.operation;
  const receipt = operation.type === 'update_personal_screen_time_rule'
    ? await updatePersonalScreenTimeRule({
        ruleId: operation.targetId, expectedUpdatedAt: operation.payload.expectedUpdatedAt,
        fields: operation.payload.fields, confirmed: true,
      }, boundary, () => appliedAt)
    : operation.type === 'deactivate_personal_screen_time_rule'
      ? await deactivatePersonalScreenTimeRuleReviewed({
          ruleId: operation.targetId, expectedUpdatedAt: operation.payload.expectedUpdatedAt, confirmed: true,
        }, boundary, () => appliedAt)
      : await deletePersonalScreenTimeRule({
          ruleId: operation.targetId, expectedUpdatedAt: operation.payload.expectedUpdatedAt, confirmed: true,
        }, boundary);
  return {
    resultingObjectType: 'personal_screen_time_rule', resultingObjectId: operation.targetId,
    resultState: { enforcementState: 'applied', rule: receipt.result },
    returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
    undoOperation: receipt.undoOperation,
  };
}

export async function executeScreenTimeProposalDecision(input: {
  proposal: ScreenTimeProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  client: SupabaseClient;
  personalBoundary?: PersonalScreenTimeRuleActionBoundary;
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
    const personal = isPersonalScreenTimeProposal(proposal);
    if (personal && !input.personalBoundary) {
      throw new Error('Personal Screen Time control is unavailable on this device.');
    }
    const personalUndo = personal
      ? preparePersonalScreenTimeProposal(proposal, input.personalBoundary!, appliedAt)
      : null;
    const reservation = personal ? {
      resultingObjectType: 'personal_screen_time_rule',
      resultingObjectId: proposal.operation.targetId,
      resultState: { enforcementState: 'pending' },
      returnTarget: { capabilityId: 'screenTime', route: 'ScreenTimeProtectionSettings' },
    } : prepareApprovedScreenTimeProposal(proposal);
    const reserved = await repository.persistMutationReceipt({
      capabilityId: 'screenTime', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: proposal.operation.id, idempotencyKey: proposal.operation.idempotencyKey,
      status: 'reserved', resultingObjectType: reservation.resultingObjectType,
      resultingObjectId: reservation.resultingObjectId, resultState: reservation.resultState,
      returnTarget: reservation.returnTarget, undoOperation: personalUndo, appliedAt,
    });
    reservationPersisted = true;
    let result;
    if (personal) {
      result = await applyPersonalScreenTimeProposal(proposal, input.personalBoundary!, appliedAt);
    } else {
      result = await applyApprovedScreenTimeProposal({ proposal, client, now: new Date(appliedAt) });
    }
    await repository.finalizeMutationReceipt(reserved.id, {
      resultingObjectType: result.resultingObjectType, resultingObjectId: result.resultingObjectId,
      resultState: result.resultState, returnTarget: result.returnTarget,
      undoOperation: result.undoOperation, appliedAt,
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

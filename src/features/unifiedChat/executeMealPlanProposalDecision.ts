import { createMealPlanActionBoundary, createMealPlanActions, type MealPlanActions } from '../../capabilities/meal-planning/actions/mealPlanActions';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

export type MealPlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'meal_planning' }> & {
  operation: Extract<
    Extract<UnifiedChatProposal, { capabilityId: 'meal_planning' }>['operation'],
    { type: 'meal_planning.plan.create' | 'meal_planning.plan.update' | 'meal_planning.candidate.add' | 'meal_planning.candidate.remove'
      | 'meal_planning.round.open' | 'meal_planning.round.close' | 'meal_planning.response.submit'
      | 'meal_planning.response.withdraw' | 'meal_planning.plan.finalize' | 'meal_planning.plan.revise' }
  >;
};
type Repository = {
  decideProposal(input: DecideUnifiedChatProposalInput): Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt(id: string, input: FinalizeUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt(id: string, errorCode: string, errorMessage: string): Promise<UnifiedChatMutationReceipt>;
};

function returnTarget(objectId: string, objectType = 'meal_plan'): Record<string, unknown> {
  return {
    capabilityId: 'meal_planning', object: { type: objectType, id: objectId }, label: 'Meal Plan',
    route: { name: 'Food', params: { screen: 'RecipeLibrary', params: { openPlan: true } } },
  };
}

export async function executeMealPlanProposalDecision({
  proposal, action, repository,
  actions = createMealPlanActions(createMealPlanActionBoundary()),
  now = () => new Date().toISOString(),
}: {
  proposal: MealPlanProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  actions?: Pick<MealPlanActions, 'create' | 'update' | 'addCandidate' | 'removeCandidate' | 'openRound'
    | 'closeRound' | 'submitResponse' | 'withdrawResponse' | 'finalize' | 'revise'>;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const operation = proposal.operation;
  const isRound = operation.type === 'meal_planning.round.open' || operation.type === 'meal_planning.round.close';
  const isResponse = operation.type === 'meal_planning.response.submit' || operation.type === 'meal_planning.response.withdraw';
  const operationObjectType = isResponse ? 'meal_choice_response' : isRound ? 'meal_choice_round' : 'meal_plan';
  let reserved: UnifiedChatMutationReceipt | null = null;
  try {
    reserved = await repository.persistMutationReceipt({
      capabilityId: 'meal_planning', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: operationObjectType, resultingObjectId: operation.targetId,
      resultState: { expectedVersion: operation.expectedVersion, ...operation.payload },
      returnTarget: operation.targetId ? returnTarget(operation.targetId, operationObjectType) : null,
      undoOperation: null, appliedAt: null,
    });
    const result = operation.type === 'meal_planning.plan.create'
      ? await actions.create({ requestId: operation.idempotencyKey, confirmed: true, ...operation.payload })
      : operation.type === 'meal_planning.plan.update'
        ? await actions.update({ requestId: operation.idempotencyKey, confirmed: true,
            planId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
        : operation.type === 'meal_planning.candidate.add'
          ? await actions.addCandidate({ requestId: operation.idempotencyKey, confirmed: true,
              planId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
          : operation.type === 'meal_planning.candidate.remove'
            ? await actions.removeCandidate({ requestId: operation.idempotencyKey, confirmed: true,
                planId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
            : operation.type === 'meal_planning.round.open'
              ? await actions.openRound({ requestId: operation.idempotencyKey, confirmed: true,
                  planId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
              : operation.type === 'meal_planning.round.close'
                ? await actions.closeRound({ requestId: operation.idempotencyKey, confirmed: true,
                    roundId: operation.targetId, expectedVersion: operation.expectedVersion })
                : operation.type === 'meal_planning.response.submit'
                  ? await actions.submitResponse({ requestId: operation.idempotencyKey, confirmed: true,
                      roundId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
                  : operation.type === 'meal_planning.response.withdraw'
                    ? await actions.withdrawResponse({ requestId: operation.idempotencyKey, confirmed: true,
                        roundId: operation.targetId, expectedVersion: operation.expectedVersion })
                    : operation.type === 'meal_planning.plan.finalize'
                      ? await actions.finalize({ requestId: operation.idempotencyKey, confirmed: true,
                          planId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
                      : await actions.revise({ requestId: operation.idempotencyKey, confirmed: true,
                          planId: operation.targetId, expectedVersion: operation.expectedVersion });
    const resultingObjectType = isResponse ? 'meal_choice_response' : isRound ? 'meal_choice_round' : 'meal_plan';
    const resultingObjectId = isResponse || isRound
      ? result.roundId ?? operation.targetId
      : result.planId ?? operation.targetId;
    if (!resultingObjectId) throw new Error('meal_plan_result_identity_missing');
    const target = returnTarget(resultingObjectId, resultingObjectType);
    await repository.finalizeMutationReceipt(reserved.id, {
      capabilityId: 'meal_planning', resultingObjectType, resultingObjectId,
      resultState: result, returnTarget: target, undoOperation: null, appliedAt: now(),
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Meal Plan change could not be applied.';
    if (reserved) await repository.failMutationReceipt(reserved.id, 'meal_plan_mutation_failed', message).catch(() => undefined);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}

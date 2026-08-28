import { createMealPreferenceActions, type MealPreferenceActions } from '../../capabilities/meal-planning/actions/mealPreferenceActions';
import { createHouseholdMealPreferencesRepository } from '../household-food/data/householdMealPreferencesRepository';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

export type MealPreferenceProposal = Extract<UnifiedChatProposal, { capabilityId: 'meal_planning' }> & {
  operation: Extract<
    Extract<UnifiedChatProposal, { capabilityId: 'meal_planning' }>['operation'],
    { type: 'meal_planning.preferences.update' }
  >;
};
type Repository = {
  decideProposal(input: DecideUnifiedChatProposalInput): Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt(id: string, input: FinalizeUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt(id: string, errorCode: string, errorMessage: string): Promise<UnifiedChatMutationReceipt>;
};

function returnTarget(): Record<string, unknown> {
  return { capabilityId: 'meal_planning', object: { type: 'household_meal_preferences' }, label: 'Meal preferences', route: { name: 'Food' } };
}

export async function executeMealPreferenceProposalDecision({
  proposal, action, repository,
  actions = createMealPreferenceActions(createHouseholdMealPreferencesRepository()),
  now = () => new Date().toISOString(),
}: {
  proposal: MealPreferenceProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  actions?: Pick<MealPreferenceActions, 'update'>;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const operation = proposal.operation;
  let reserved: UnifiedChatMutationReceipt | null = null;
  try {
    reserved = await repository.persistMutationReceipt({
      capabilityId: 'meal_planning', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: 'household_meal_preferences', resultingObjectId: operation.targetId,
      resultState: { expectedVersion: operation.expectedVersion, patch: operation.payload.patch },
      returnTarget: returnTarget(), undoOperation: null, appliedAt: null,
    });
    const result = await actions.update({ requestId: operation.idempotencyKey, confirmed: true,
      expectedVersion: operation.expectedVersion, patch: operation.payload.patch });
    await repository.finalizeMutationReceipt(reserved.id, {
      capabilityId: 'meal_planning', resultingObjectType: 'household_meal_preferences', resultingObjectId: operation.targetId,
      resultState: result as Record<string, unknown>, returnTarget: returnTarget(), undoOperation: null, appliedAt: now(),
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The meal preference change could not be applied.';
    if (reserved) await repository.failMutationReceipt(reserved.id, 'meal_preference_mutation_failed', message).catch(() => undefined);
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}

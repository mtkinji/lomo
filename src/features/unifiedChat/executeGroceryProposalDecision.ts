import { createFoodStockActionBoundary, createFoodStockActions, type FoodStockActions } from '../../capabilities/groceries/actions/foodStockActions';
import { createGroceryListActionBoundary, createGroceryListActions, type GroceryListActions } from '../../capabilities/groceries/actions/groceryListActions';
import type { DecideUnifiedChatProposalInput, FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput, TransitionUnifiedChatProposalInput, UnifiedChatMutationReceipt,
  UnifiedChatProposal, UnifiedChatProposalDecisionResult } from './types';

export type GroceryProposal = Extract<UnifiedChatProposal, { capabilityId: 'groceries' }>;
type Repository = {
  decideProposal(input: DecideUnifiedChatProposalInput): Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus(input: TransitionUnifiedChatProposalInput): Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt(input: PersistUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt(id: string, input: FinalizeUnifiedChatMutationReceiptInput): Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt(id: string, errorCode: string, errorMessage: string): Promise<UnifiedChatMutationReceipt>;
};
const returnTarget = (objectId: string | null, objectType = 'food_stock_observation') => ({ capabilityId: 'groceries',
  object: { type: objectType, id: objectId }, label: objectType === 'food_stock_observation' ? 'Food stock' : 'Grocery list', route: { name: 'Food' } });

export async function executeGroceryProposalDecision({ proposal, action, repository,
  actions, listActions, now = () => new Date().toISOString() }: {
  proposal: GroceryProposal; action: DecideUnifiedChatProposalInput['action']; repository: Repository;
  actions?: Pick<FoodStockActions, 'observe' | 'deplete'>; now?: () => string;
  listActions?: Pick<GroceryListActions, 'compile' | 'addItem' | 'updateItem' | 'setItemState'>;
}): Promise<void> {
  const decision = await repository.decideProposal({ proposalId: proposal.id, action, expectedVersion: proposal.version });
  if (action !== 'approve') return;
  const applying = await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'approved',
    toStatus: 'applying', expectedVersion: decision.version });
  const operation = proposal.operation;
  const objectType = operation.type.startsWith('food_stock.') ? 'food_stock_observation'
    : operation.type === 'groceries.compile' || operation.type === 'groceries.item.add' ? 'grocery_list' : 'grocery_item';
  let reserved: UnifiedChatMutationReceipt | null = null;
  try {
    reserved = await repository.persistMutationReceipt({ capabilityId: 'groceries', threadId: proposal.threadId,
      proposalId: proposal.id, operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: objectType, resultingObjectId: operation.targetId,
      resultState: { ...('expectedObservationId' in operation ? { expectedObservationId: operation.expectedObservationId } : { expectedVersion: operation.expectedVersion }), ...operation.payload },
      returnTarget: returnTarget(operation.targetId, objectType), undoOperation: null, appliedAt: null });
    const stockBoundary = operation.type.startsWith('food_stock.')
      ? actions ?? createFoodStockActions(createFoodStockActionBoundary()) : null;
    const groceryBoundary = operation.type.startsWith('groceries.')
      ? listActions ?? createGroceryListActions(createGroceryListActionBoundary()) : null;
    const result = operation.type === 'food_stock.observe'
      ? await stockBoundary!.observe({ requestId: operation.idempotencyKey, confirmed: true,
        expectedObservationId: operation.expectedObservationId, observation: operation.payload.observation })
      : operation.type === 'food_stock.deplete'
      ? await stockBoundary!.deplete({ requestId: operation.idempotencyKey, confirmed: true,
        expectedObservationId: operation.expectedObservationId, concept: operation.payload.concept,
        observedAt: operation.payload.observedAt })
      : operation.type === 'groceries.compile'
        ? await groceryBoundary!.compile({ requestId: operation.idempotencyKey, confirmed: true,
          mealPlanId: operation.targetId, mealPlanVersion: operation.expectedVersion })
        : operation.type === 'groceries.item.add'
          ? await groceryBoundary!.addItem({ requestId: operation.idempotencyKey, confirmed: true,
            groceryListId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
          : operation.type === 'groceries.item.update'
            ? await groceryBoundary!.updateItem({ requestId: operation.idempotencyKey, confirmed: true,
              groceryItemId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload })
            : await groceryBoundary!.setItemState({ requestId: operation.idempotencyKey, confirmed: true,
              groceryItemId: operation.targetId, expectedVersion: operation.expectedVersion, ...operation.payload });
    const resultRecord = result as unknown as Record<string, unknown>;
    const resultingObjectId = String(resultRecord.observationId ?? resultRecord.itemId ?? resultRecord.groceryListId ?? operation.targetId);
    await repository.finalizeMutationReceipt(reserved.id, { capabilityId: 'groceries',
      resultingObjectType: objectType, resultingObjectId,
      resultState: resultRecord, returnTarget: returnTarget(resultingObjectId, objectType),
      undoOperation: null, appliedAt: now() });
    await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Food Stock change could not be applied.';
    if (reserved) await repository.failMutationReceipt(reserved.id, 'food_stock_mutation_failed', message).catch(() => undefined);
    await repository.transitionProposalStatus({ proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version }).catch(() => undefined);
    throw error;
  }
}

import type { RecipeMutationReceipt, SaveRecipeInput } from '../../capabilities/recipes/data/recipeRepository';
import type {
  DecideUnifiedChatProposalInput,
  FinalizeUnifiedChatMutationReceiptInput,
  PersistUnifiedChatMutationReceiptInput,
  TransitionUnifiedChatProposalInput,
  UnifiedChatMutationReceipt,
  UnifiedChatProposal,
  UnifiedChatProposalDecisionResult,
} from './types';

type RecipeProposal = Extract<UnifiedChatProposal, { capabilityId: 'recipes' }>;

type Repository = {
  decideProposal: (input: DecideUnifiedChatProposalInput) => Promise<UnifiedChatProposalDecisionResult>;
  transitionProposalStatus: (input: TransitionUnifiedChatProposalInput) => Promise<{ status: UnifiedChatProposal['status']; version: number }>;
  persistMutationReceipt: (input: PersistUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  finalizeMutationReceipt: (id: string, input: FinalizeUnifiedChatMutationReceiptInput) => Promise<UnifiedChatMutationReceipt>;
  failMutationReceipt: (id: string, errorCode: string, errorMessage: string) => Promise<UnifiedChatMutationReceipt>;
};

export type RecipeMutationBoundary = {
  save(input: SaveRecipeInput): Promise<RecipeMutationReceipt>;
  delete(recipeId: string, expectedVersion: number): Promise<RecipeMutationReceipt>;
  refresh(): Promise<void>;
};

function recipeReturnTarget(recipeId: string, title: string): Record<string, unknown> {
  return {
    capabilityId: 'recipes',
    object: { type: 'recipe', id: recipeId },
    label: title,
    route: { name: 'Food', params: { screen: 'RecipeHome', params: { recipeId } } },
  };
}

function errorDetails(error: unknown): { code: string; message: string } {
  const code = typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
    ? (error as { code: string }).code
    : 'recipe_mutation_failed';
  return { code, message: error instanceof Error ? error.message : 'The Recipe change could not be applied.' };
}

export async function executeRecipeProposalDecision({
  proposal,
  action,
  repository,
  recipes,
  now = () => new Date().toISOString(),
}: {
  proposal: RecipeProposal;
  action: DecideUnifiedChatProposalInput['action'];
  repository: Repository;
  recipes: RecipeMutationBoundary;
  now?: () => string;
}): Promise<void> {
  const decision = await repository.decideProposal({
    proposalId: proposal.id, action, expectedVersion: proposal.version,
  });
  if (action !== 'approve') return;

  const applying = await repository.transitionProposalStatus({
    proposalId: proposal.id, fromStatus: 'approved', toStatus: 'applying', expectedVersion: decision.version,
  });
  const operation = proposal.operation;
  const reviewedData = operation.type === 'delete_recipe' ? null : operation.payload.reviewedData;
  const title = reviewedData?.title ?? proposal.title.replace(/^Delete\s+/i, '');
  const appliedAt = now();
  let reservedReceipt: UnifiedChatMutationReceipt | null = null;

  try {
    reservedReceipt = await repository.persistMutationReceipt({
      capabilityId: 'recipes', threadId: proposal.threadId, proposalId: proposal.id,
      operationId: operation.id, idempotencyKey: operation.idempotencyKey, status: 'reserved',
      resultingObjectType: 'recipe', resultingObjectId: operation.targetId,
      resultState: { title, expectedVersion: operation.expectedVersion, deleted: operation.type === 'delete_recipe' },
      returnTarget: operation.targetId && operation.type !== 'delete_recipe'
        ? recipeReturnTarget(operation.targetId, title)
        : null,
      undoOperation: null,
      appliedAt: null,
    });

    const result = operation.type === 'delete_recipe'
      ? await recipes.delete(operation.targetId, operation.expectedVersion)
      : await recipes.save({
          recipeId: operation.targetId,
          expectedVersion: operation.expectedVersion,
          idempotencyKey: operation.idempotencyKey,
          reviewedData: operation.payload.reviewedData,
        });
    await recipes.refresh();

    const deleted = operation.type === 'delete_recipe' || result.deleted === true;
    await repository.finalizeMutationReceipt(reservedReceipt.id, {
      capabilityId: 'recipes', resultingObjectType: 'recipe', resultingObjectId: result.recipeId,
      resultState: {
        title, version: result.version, recipeVersionId: result.recipeVersionId ?? null,
        deleted,
      },
      returnTarget: deleted ? null : recipeReturnTarget(result.recipeId, title),
      undoOperation: null,
      appliedAt,
    });
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'applied', expectedVersion: applying.version,
    });
  } catch (error) {
    const details = errorDetails(error);
    if (reservedReceipt) {
      await repository.failMutationReceipt(reservedReceipt.id, details.code, details.message).catch(() => undefined);
    }
    await repository.transitionProposalStatus({
      proposalId: proposal.id, fromStatus: 'applying', toStatus: 'failed', expectedVersion: applying.version,
    }).catch(() => undefined);
    throw error;
  }
}

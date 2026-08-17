import { buildReviewedRecipeCreate } from './recipeProposal';
import { executeRecipeProposalDecision } from './executeRecipeProposalDecision';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type RecipeProposal = Extract<UnifiedChatProposal, { capabilityId: 'recipes' }>;

const reviewedData = buildReviewedRecipeCreate({
  title: 'Potato Mochi', ingredients: ['2 potatoes', 'cheese'],
  instructions: ['Mash the potatoes.', 'Fill and pan-fry.'],
})!;

function proposal(type: 'create_recipe' | 'update_recipe' | 'delete_recipe'): RecipeProposal {
  const targetId = type === 'create_recipe' ? null : 'recipe-1';
  return {
    id: `proposal-${type}`, threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'recipes', title: 'Potato Mochi', body: 'Review this Recipe change.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: `operation-${type}`, proposalId: `proposal-${type}`, capabilityId: 'recipes',
      type, targetId, expectedVersion: type === 'create_recipe' ? 0 : 2,
      payload: type === 'delete_recipe'
        ? {}
        : type === 'update_recipe'
          ? { reviewedData, changedFields: ['notes'] }
          : { reviewedData },
      summary: 'Recipe change', idempotencyKey: `recipe-${type}`, sequence: 1,
    } as RecipeProposal['operation'],
  };
}

function receipt(status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt {
  return {
    id: 'receipt-1', proposalId: 'proposal', operationId: 'operation', capabilityId: 'recipes',
    idempotencyKey: 'recipe-change', status, resultingObjectType: 'recipe', resultingObjectId: null,
    resultState: {}, returnTarget: null, undoOperation: null, canUndo: false,
    appliedAt: status === 'applied' ? '2026-08-16T12:00:00.000Z' : null, undoneAt: null,
  };
}

function boundaries() {
  const repository = {
    decideProposal: jest.fn(async (): Promise<{ id: string; status: 'approved' | 'rejected'; version: number }> => (
      { id: 'decision-1', status: 'approved', version: 2 }
    )),
    transitionProposalStatus: jest.fn(async (input) => ({ status: input.toStatus, version: input.expectedVersion + 1 })),
    persistMutationReceipt: jest.fn(async () => receipt('reserved')),
    finalizeMutationReceipt: jest.fn(async () => receipt('applied')),
    failMutationReceipt: jest.fn(async () => receipt('failed')),
  };
  const recipes = {
    save: jest.fn(async () => ({ recipeId: 'recipe-created', recipeVersionId: 'version-1', version: 1 })),
    delete: jest.fn(async () => ({ recipeId: 'recipe-1', version: 2, deleted: true })),
    refresh: jest.fn(async () => undefined),
  };
  return { repository, recipes };
}

describe('executeRecipeProposalDecision', () => {
  test('applies an approved create through Recipe authority and finalizes a return receipt', async () => {
    const { repository, recipes } = boundaries();
    await executeRecipeProposalDecision({
      proposal: proposal('create_recipe'), action: 'approve', repository, recipes,
      now: () => '2026-08-16T12:00:00.000Z',
    });

    expect(recipes.save).toHaveBeenCalledWith({
      recipeId: null, expectedVersion: 0, idempotencyKey: 'recipe-create_recipe', reviewedData,
    });
    expect(recipes.refresh).toHaveBeenCalled();
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      capabilityId: 'recipes', resultingObjectId: 'recipe-created',
      resultState: expect.objectContaining({ title: 'Potato Mochi', version: 1, deleted: false }),
      returnTarget: expect.objectContaining({ route: { name: 'Food', params: { screen: 'RecipeHome', params: { recipeId: 'recipe-created' } } } }),
    }));
  });

  test('applies an approved delete without offering an invalid open or undo', async () => {
    const { repository, recipes } = boundaries();
    await executeRecipeProposalDecision({
      proposal: proposal('delete_recipe'), action: 'approve', repository, recipes,
    });

    expect(recipes.delete).toHaveBeenCalledWith('recipe-1', 2);
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectId: 'recipe-1', returnTarget: null, undoOperation: null,
      resultState: expect.objectContaining({ deleted: true }),
    }));
  });

  test('rejects without touching Recipe persistence', async () => {
    const { repository, recipes } = boundaries();
    repository.decideProposal.mockResolvedValueOnce({ id: 'decision-1', status: 'rejected', version: 2 });
    await executeRecipeProposalDecision({ proposal: proposal('update_recipe'), action: 'reject', repository, recipes });
    expect(recipes.save).not.toHaveBeenCalled();
    expect(recipes.delete).not.toHaveBeenCalled();
    expect(repository.persistMutationReceipt).not.toHaveBeenCalled();
  });
});

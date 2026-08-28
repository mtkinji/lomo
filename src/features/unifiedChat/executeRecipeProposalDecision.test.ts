import { buildReviewedRecipeCreate } from './recipeProposal';
import { executeRecipeProposalDecision } from './executeRecipeProposalDecision';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

type RecipeProposal = Extract<UnifiedChatProposal, { capabilityId: 'recipes' }>;

const reviewedData = buildReviewedRecipeCreate({
  title: 'Potato Mochi', ingredients: ['2 potatoes', 'cheese'],
  instructions: ['Mash the potatoes.', 'Fill and pan-fry.'],
})!;

function proposal(type: 'create_recipe' | 'update_recipe' | 'delete_recipe' | 'recipes.import.approve' | 'recipes.favorite.update' | 'cook_session.start' | 'cook_session.complete' | 'recipes.fork' | 'recipes.collaborator.invite'): RecipeProposal {
  const targetId = type === 'create_recipe' ? null : 'recipe-1';
  return {
    id: `proposal-${type}`, threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'recipes', title: 'Potato Mochi', body: 'Review this Recipe change.',
    status: 'pending', version: 1, createdAt: 'now', updatedAt: 'now',
    operation: {
      id: `operation-${type}`, proposalId: `proposal-${type}`, capabilityId: 'recipes',
      type, targetId, expectedVersion: type === 'create_recipe' ? 0 : 2,
      payload: type === 'recipes.favorite.update'
        ? { favorite: true }
        : type === 'cook_session.start'
        ? { recipeScaleMultiplier: 2 }
        : type === 'cook_session.complete'
        ? { outcome: 'completed' }
        : type === 'recipes.fork'
        ? { sourceRecipeId: 'source-recipe-1', reviewedData }
        : type === 'recipes.collaborator.invite'
        ? { recipientPersonId: 'person-2', role: 'contributor' }
        : type === 'recipes.import.approve'
        ? { reviewedData: { ...reviewedData, provenance: { ...reviewedData.provenance, method: 'photo', rightsBasis: 'private_user_import' } }, approvalIdempotencyKey: 'import-approval-1' }
        : type === 'delete_recipe'
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

  test('applies an attributed fork as a new independent Recipe', async () => {
    const { repository, recipes } = boundaries();
    await executeRecipeProposalDecision({ proposal: proposal('recipes.fork'), action: 'approve', repository, recipes });
    expect(recipes.save).toHaveBeenCalledWith({
      recipeId: null, expectedVersion: 0, idempotencyKey: 'recipe-recipes.fork', reviewedData,
    });
    expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
      resultingObjectType: 'recipe', resultingObjectId: null, returnTarget: null,
    }));
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectId: 'recipe-created', returnTarget: expect.objectContaining({ object: { type: 'recipe', id: 'recipe-created' } }),
    }));
  });

  test('applies a reviewed collaborator grant through Recipe authority', async () => {
    const { repository, recipes } = boundaries();
    const collaboration = { invite: jest.fn(async () => ({ grantId: 'grant-1', recipeId: 'recipe-1',
      recipientPersonId: 'person-2', role: 'contributor' as const, status: 'active' as const, version: 2, replayed: false })) };
    await executeRecipeProposalDecision({ proposal: proposal('recipes.collaborator.invite'), action: 'approve',
      repository, recipes, collaboration });
    expect(collaboration.invite).toHaveBeenCalledWith({ requestId: 'recipe-recipes.collaborator.invite',
      confirmed: true, recipeId: 'recipe-1', expectedVersion: 2,
      recipientPersonId: 'person-2', role: 'contributor' });
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType: 'recipe_access_grant', resultingObjectId: 'grant-1',
    }));
    expect(recipes.save).not.toHaveBeenCalled();
  });

  test('applies an approved import through exact draft-version authority', async () => {
    const { repository, recipes } = boundaries();
    const imports = { approve: jest.fn(async () => ({ recipeId: 'recipe-imported', recipeVersionId: 'version-imported', version: 1 })) };
    await executeRecipeProposalDecision({
      proposal: proposal('recipes.import.approve'), action: 'approve', repository, recipes, imports,
    });
    expect(imports.approve).toHaveBeenCalledWith(expect.objectContaining({
      draftId: 'recipe-1', expectedDraftVersion: 2, idempotencyKey: 'import-approval-1',
      reviewedData: expect.objectContaining({ title: 'Potato Mochi' }),
    }));
    expect(recipes.save).not.toHaveBeenCalled();
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectId: 'recipe-imported', resultState: expect.objectContaining({ recipeVersionId: 'version-imported' }),
    }));
  });

  test('applies reviewed Cook start and completion through Cook authority', async () => {
    const startBoundaries = boundaries();
    const cook = {
      start: jest.fn(async () => ({ status: 'completed' as const, replayed: false, session: {
        id: 'session-created', recipeId: 'recipe-1', recipeVersionId: 'recipe-1', revision: 1, status: 'active',
      } as never })),
      complete: jest.fn(async () => ({ status: 'completed' as const, replayed: false, session: {
        id: 'recipe-1', recipeId: 'recipe-1', recipeVersionId: 'version-1', revision: 3, status: 'completed',
      } as never })),
    };
    const recipeProjection = { ...reviewedData, recipeId: 'recipe-1' };
    await executeRecipeProposalDecision({ proposal: proposal('cook_session.start'), action: 'approve',
      repository: startBoundaries.repository, recipes: startBoundaries.recipes, cook, resolveCookRecipe: () => ({
        ownerPersonId: 'person-1', recipeId: 'recipe-1', recipeVersionId: 'recipe-1', recipeVersion: 2, cueCount: 2,
      }) });
    expect(cook.start).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, recipeScaleMultiplier: 2 }));
    expect(startBoundaries.repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType: 'cook_session', resultingObjectId: 'session-created',
    }));

    const completeBoundaries = boundaries();
    await executeRecipeProposalDecision({ proposal: proposal('cook_session.complete'), action: 'approve',
      repository: completeBoundaries.repository, recipes: completeBoundaries.recipes, cook, resolveCookRecipe: () => recipeProjection as never });
    expect(cook.complete).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, sessionId: 'recipe-1', expectedRevision: 2, outcome: 'completed' }));
    expect(completeBoundaries.repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType: 'cook_session', resultingObjectId: 'recipe-1',
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

  test('applies a reviewed favorite through the same native action and receipt lifecycle', async () => {
    const { repository, recipes } = boundaries();
    const controls = { setFavorite: jest.fn(async () => ({ status: 'completed' as const,
      operationId: 'recipes.favorite.update' as const, resourceId: 'recipe-1',
      beforeVersion: 0 as const, effectiveVersion: 1 as const })), setVisibility: jest.fn() };
    const favorite = proposal('recipes.favorite.update');
    favorite.operation.expectedVersion = 0;
    await executeRecipeProposalDecision({ proposal: favorite, action: 'approve', repository, recipes, controls });
    expect(controls.setFavorite).toHaveBeenCalledWith({
      requestId: 'recipe-recipes.favorite.update', confirmed: true, recipeId: 'recipe-1', expectedVersion: 0, favorite: true,
    });
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultingObjectType: 'recipe_preference', resultingObjectId: 'recipe-1',
    }));
    expect(recipes.save).not.toHaveBeenCalled();
  });
});

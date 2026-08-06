import { createRecipeImportProposalExecutor } from './recipeImportProposalExecutor';

describe('Recipe import proposal executor', () => {
  it('sends only reviewed data to the approval RPC and is retry-keyed', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { recipeId: 'recipe-1', recipeVersionId: 'version-1', version: 1 }, error: null });
    const executor = createRecipeImportProposalExecutor({ rpc } as never);
    await executor.approve({ draftId: 'draft-1', idempotencyKey: 'approval-1', reviewedData: { title: 'Soup' } });
    expect(rpc).toHaveBeenCalledWith('approve_kwilt_recipe_import', {
      p_draft_id: 'draft-1', p_idempotency_key: 'approval-1',
      p_reviewed_data: expect.objectContaining({ title: 'Soup', ingredients: [], instructions: [] }),
    });
  });

  it('rejects unreviewed model-only fields before the mutation boundary', async () => {
    const rpc = jest.fn();
    await expect(createRecipeImportProposalExecutor({ rpc } as never).approve({
      draftId: 'draft-1', idempotencyKey: 'approval-1', reviewedData: { title: 'Soup', coupon: 'invented' },
    })).rejects.toThrow('reviewedRecipe.coupon is not supported');
    expect(rpc).not.toHaveBeenCalled();
  });
});

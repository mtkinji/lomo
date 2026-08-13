import { createRecipeCookRepository } from './recipeCookRepository';

function chain() { const value: any = { select: jest.fn(), eq: jest.fn(), order: jest.fn(), limit: jest.fn(), maybeSingle: jest.fn() }; value.select.mockReturnValue(value); value.eq.mockReturnValue(value); value.order.mockReturnValue(value); return value; }

describe('Recipe Cook record projection', () => {
  it('saves private outcomes and normalized substitutions through the journal RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { cookCount: 2 }, error: null });
    const learning = {
      record: {
        id: 'record-1', sessionId: 'session-1', ownerPersonId: 'person-1', recipeId: 'recipe-1', recipeVersionId: 'version-2',
        servingScale: 1, completed: true, wouldMakeAgain: true, outcomeRating: 4, privateNote: 'More sauce', completedAt: '2026-08-05T12:00:00.000Z',
        provenance: 'cook_session' as const,
        substitutions: [{ ingredientLineId: 'ingredient-1', ingredientText: '1 cup milk', usedInstead: 'oat milk', resultRating: 4, note: 'Use less' }],
      },
      recipeEditProposal: null,
    };
    await createRecipeCookRepository({ rpc } as never).saveLearning(learning);
    expect(rpc).toHaveBeenCalledWith('save_kwilt_recipe_cook_journal', {
      p_session_id: 'session-1',
      p_would_make_again: true,
      p_outcome_rating: 4,
      p_private_note: 'More sauce',
      p_recipe_edit_proposal: null,
      p_substitutions: [{ ingredientLineId: 'ingredient-1', usedInstead: 'oat milk', resultRating: 4, note: 'Use less' }],
    });
  });

  it('returns bounded recent private learnings without Recipe text', async () => {
    const rows = [{ id: 'record-1', session_id: 'session-1', recipe_id: 'recipe-1', recipe_version_id: 'version-2', serving_scale: '1.5', would_make_again: true, outcome_rating: 4, private_note: 'More sauce', completed_at: '2026-08-05T12:00:00.000Z', kwilt_recipe_cook_substitutions: [{ id: 'sub-1', source_ingredient_line_id: 'ingredient-1', ingredient_text: '1 cup milk', used_instead: 'oat milk', result_rating: 4, note: 'Use less' }] }];
    const records = chain(); records.limit.mockResolvedValue({ data: rows, error: null, count: 1 });
    await expect(createRecipeCookRepository({ from: jest.fn(() => records) } as never).listRecent(100)).resolves.toEqual([{ id: 'record-1', sessionId: 'session-1', recipeId: 'recipe-1', recipeVersionId: 'version-2', servingScale: 1.5, wouldMakeAgain: true, outcomeRating: 4, privateNote: 'More sauce', completedAt: '2026-08-05T12:00:00.000Z', substitutions: [{ id: 'sub-1', ingredientLineId: 'ingredient-1', ingredientText: '1 cup milk', usedInstead: 'oat milk', resultRating: 4, note: 'Use less' }] }]);
    expect(records.limit).toHaveBeenCalledWith(20);
  });

  it('returns bounded newest-first history and an exact Cook count for one Recipe', async () => {
    const data = { cookCount: 3, records: [{ id: 'record-2', sessionId: 'session-2', recipeId: 'canonical-recipe-1', recipeVersionId: 'canonical-version-3', servingScale: 1, wouldMakeAgain: null, outcomeRating: 5, privateNote: null, completedAt: '2026-08-06T12:00:00.000Z', substitutions: [] }] };
    const rpc = jest.fn().mockResolvedValue({ data, error: null });
    await expect(createRecipeCookRepository({ rpc } as never).historyForRecipe('kwilt-recipe-br001', 100)).resolves.toMatchObject({ cookCount: 3, records: [{ id: 'record-2', recipeVersionId: 'canonical-version-3', outcomeRating: 5, substitutions: [] }] });
    expect(rpc).toHaveBeenCalledWith('list_kwilt_recipe_cook_journal', { p_recipe_ref: 'kwilt-recipe-br001', p_limit: 20 });
  });
});

import { recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import type { RecipeUpdateDraft } from '../domain/recipeUpdateDraft';
import { createRecipeUpdateSuggestionRepository } from './recipeUpdateSuggestionRepository';

const draft: RecipeUpdateDraft = {
  title: 'Cake', description: '', yieldQuantity: '8', yieldUnit: 'servings', sourceTitle: '', sourceAuthor: '', notes: '',
  ingredients: [{ id: 'ingredient-2', originalText: '2 eggs' }],
  instructions: [{ id: 'step-1', text: 'Bake it.' }],
};

describe('Recipe update suggestion repository', () => {
  it('returns a validated capability-owned suggestion from the transport', async () => {
    const transport = jest.fn().mockResolvedValue({
      summary: 'Use four eggs.',
      operations: [{ kind: 'replace_ingredient', lineId: 'ingredient-2', value: '4 eggs' }],
    });
    const repository = createRecipeUpdateSuggestionRepository(transport);
    await expect(repository.suggest({ version: recipeVersionContractFixture(), draft, instruction: 'Double the eggs.' })).resolves.toMatchObject({
      summary: 'Use four eggs.',
    });
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ schemaName: 'recipe_update_suggestion_v1' }));
  });

  it('reports unavailable AI without changing the draft', async () => {
    const repository = createRecipeUpdateSuggestionRepository(jest.fn().mockResolvedValue(null));
    await expect(repository.suggest({ version: recipeVersionContractFixture(), draft, instruction: 'Double it.' })).rejects.toThrow('recipe_update.ai_unavailable');
    expect(draft.ingredients[0].originalText).toBe('2 eggs');
  });
});

import { recipeContractFixture, recipeVersionContractFixture } from '../../capabilities/recipes/domain/recipeContractFixtures';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

const projection = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};

const snapshots = {
  goals: { goals: [] },
  todos: { activities: [], goals: [] },
  chapters: { chapters: [] },
  recipes: { recipes: [projection] },
};

function tool(id: string) {
  const found = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Recipe tool ${id}`);
  return found;
}

describe('Unified Chat Recipe tools', () => {
  test('stages a complete private Recipe create for explicit review', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute({
      id: 'create-recipe',
      toolId: 'recipes.create',
      arguments: {
        recipe: {
          title: 'Hokkaido Cheese Potato Mochi',
          yieldQuantity: 6,
          yieldUnit: 'pieces',
          ingredients: ['2 potatoes', '6 cubes mozzarella', '2 tbsp potato starch'],
          instructions: ['Mash the cooked potatoes.', 'Wrap around cheese.', 'Pan-fry until golden.'],
        },
        idempotencyKey: 'recipe-create-1',
      },
    }, tool('recipes.create'));

    expect(result.status).toBe('proposed');
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes',
      title: 'Create Hokkaido Cheese Potato Mochi',
      operation: expect.objectContaining({
        type: 'create_recipe',
        targetId: null,
        expectedVersion: 0,
        payload: expect.objectContaining({ reviewedData: expect.objectContaining({
          title: 'Hokkaido Cheese Potato Mochi',
        }) }),
      }),
    })]);
  });

  test('stages a version-safe patch without dropping current content', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await provider.execute({
      id: 'update-recipe',
      toolId: 'recipes.update',
      arguments: {
        recipeId: projection.recipe.id,
        expectedVersion: projection.currentVersion.version,
        reviewedVersion: { notes: 'Double the glaze.' },
        idempotencyKey: 'recipe-update-1',
      },
    }, tool('recipes.update'));

    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes',
      title: `Update ${projection.currentVersion.title}`,
      operation: expect.objectContaining({
        type: 'update_recipe',
        targetId: projection.recipe.id,
        expectedVersion: projection.currentVersion.version,
        payload: expect.objectContaining({ changedFields: ['notes'], reviewedData: expect.objectContaining({
          title: projection.currentVersion.title,
          notes: 'Double the glaze.',
          ingredients: expect.arrayContaining([
            expect.objectContaining({ originalText: projection.currentVersion.ingredients[0].originalText }),
          ]),
        }) }),
      }),
    })]);
  });

  test('stages an explicit destructive delete and rejects a stale version', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const stale = await provider.execute({
      id: 'delete-stale', toolId: 'recipes.delete',
      arguments: { recipeId: projection.recipe.id, expectedVersion: projection.currentVersion.version - 1 },
    }, tool('recipes.delete'));
    expect(stale).toMatchObject({ status: 'failed', code: 'recipe_version_stale', retryable: true });

    await provider.execute({
      id: 'delete-recipe', toolId: 'recipes.delete',
      arguments: { recipeId: projection.recipe.id, expectedVersion: projection.currentVersion.version },
    }, tool('recipes.delete'));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes',
      title: `Delete ${projection.currentVersion.title}`,
      body: expect.stringContaining('removes this private Recipe'),
      operation: expect.objectContaining({ type: 'delete_recipe', targetId: projection.recipe.id }),
    })]);
  });
});

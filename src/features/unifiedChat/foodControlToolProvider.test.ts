import { createFoodControlToolProvider } from './foodControlToolProvider';

const tool = (id: string) => ({ id, capabilityId: id.startsWith('recipes.') ? 'recipes' : 'meal_planning' }) as never;
const call = (toolId: string, args: Record<string, unknown> = {}) => ({ id: `call-${toolId}`, toolId, arguments: args }) as never;

describe('foodControlToolProvider', () => {
  const state = { recipeId: 'recipe-1', favorite: false, visibility: 'visible' as const };
  const projection = {
    householdId: 'household-1', version: 3, updatedAt: '2026-08-27T00:00:00.000Z',
    usualDinerCount: 4, usualDinerPersonIds: ['person-1'], setupState: 'completed' as const,
    foodNeeds: [], members: [{ id: 'member-1', personId: 'person-1', displayName: 'Andrew', role: 'owner', kind: 'adult', updatedAt: 'now' }],
  };
  const recipeActions = { readPreferenceState: jest.fn().mockResolvedValue(state) };
  const mealActions = { read: jest.fn().mockResolvedValue({ status: 'completed', operationId: 'meal_planning.preferences.read', result: projection }) };

  beforeEach(() => jest.clearAllMocks());

  it('reads the bounded household meal preference projection directly', async () => {
    const provider = createFoodControlToolProvider({ recipeActions: recipeActions as never, mealActions: mealActions as never });
    await expect(provider.execute(call('meal_planning.preferences.read'), tool('meal_planning.preferences.read')))
      .resolves.toEqual({ status: 'completed', output: projection, receipt: null });
  });

  it.each([
    ['recipes.favorite.update', { recipeId: 'recipe-1', expectedVersion: 0, favorite: true }, 'Favorite recipe'],
    ['recipes.visibility.update', { recipeId: 'recipe-1', expectedVersion: 0, visibility: 'hidden' }, 'Hide recipe'],
  ])('stages a reviewed exact-state recipe proposal for %s', async (toolId, args, title) => {
    const provider = createFoodControlToolProvider({ recipeActions: recipeActions as never, mealActions: mealActions as never });
    const result = await provider.execute(call(toolId, args), tool(toolId));
    expect(result).toEqual(expect.objectContaining({ status: 'proposed', proposal: expect.objectContaining({ capabilityId: 'recipes', title }) }));
    expect(provider.proposals()).toEqual([expect.objectContaining({ operation: expect.objectContaining({ type: toolId, targetId: 'recipe-1', expectedVersion: 0 }) })]);
  });

  it('rejects stale recipe preference state before review', async () => {
    const provider = createFoodControlToolProvider({ recipeActions: recipeActions as never, mealActions: mealActions as never });
    await expect(provider.execute(call('recipes.favorite.update', { recipeId: 'recipe-1', expectedVersion: 1, favorite: true }), tool('recipes.favorite.update')))
      .resolves.toEqual(expect.objectContaining({ status: 'failed', code: 'recipe_preference_stale', retryable: true }));
  });

  it('stages one exact-version meal preference patch', async () => {
    const provider = createFoodControlToolProvider({ recipeActions: recipeActions as never, mealActions: mealActions as never });
    const result = await provider.execute(call('meal_planning.preferences.update', {
      expectedVersion: 3,
      fields: { usualDinerCount: 5, setupState: 'completed' },
    }), tool('meal_planning.preferences.update'));
    expect(result).toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'meal_planning',
      operation: expect.objectContaining({ type: 'meal_planning.preferences.update', targetId: 'household-1', expectedVersion: 3 }),
    })]);
  });

  it('rejects invalid and stale meal preference updates', async () => {
    const provider = createFoodControlToolProvider({ recipeActions: recipeActions as never, mealActions: mealActions as never });
    await expect(provider.execute(call('meal_planning.preferences.update', { expectedVersion: 2, fields: { usualDinerCount: 5 } }), tool('meal_planning.preferences.update')))
      .resolves.toEqual(expect.objectContaining({ status: 'failed', code: 'meal_preferences_stale', retryable: true }));
    await expect(provider.execute(call('meal_planning.preferences.update', { expectedVersion: 3, fields: {} }), tool('meal_planning.preferences.update')))
      .resolves.toEqual(expect.objectContaining({ status: 'failed', code: 'invalid_meal_preferences' }));
  });
});

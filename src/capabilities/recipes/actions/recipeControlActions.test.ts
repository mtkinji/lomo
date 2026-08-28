import type { HiddenRecipeRepository } from '../data/hiddenRecipeRepository';
import type { RecipeFavoriteRepository } from '../data/recipeFavoriteRepository';
import { RecipePreferenceStaleError, createRecipeControlActions } from './recipeControlActions';

function repositories(input: { favorites?: string[]; hidden?: string[] } = {}) {
  const favorite: jest.Mocked<RecipeFavoriteRepository> = {
    list: jest.fn(async () => input.favorites ?? []),
    set: jest.fn(async (_recipeRef: string, _favorite: boolean) => undefined),
  };
  const hidden: jest.Mocked<HiddenRecipeRepository> = {
    list: jest.fn(async () => input.hidden ?? []),
    set: jest.fn(async (_recipeRef: string, _hidden: boolean) => undefined),
  };
  return { favorite, hidden };
}

describe('recipe preference control actions', () => {
  it('sets favorite and visibility through the existing person-scoped repositories', async () => {
    const stores = repositories({ favorites: [], hidden: ['recipe-1'] });
    const actions = createRecipeControlActions(stores);

    await expect(actions.setFavorite({
      requestId: 'favorite-request', confirmed: true, recipeId: 'recipe-1', expectedVersion: 0, favorite: true,
    })).resolves.toMatchObject({ status: 'completed', operationId: 'recipes.favorite.update', effectiveVersion: 1 });
    await expect(actions.setVisibility({
      requestId: 'visibility-request', confirmed: true, recipeId: 'recipe-1', expectedVersion: 1, visibility: 'visible',
    })).resolves.toMatchObject({ status: 'completed', operationId: 'recipes.visibility.update', effectiveVersion: 0 });

    expect(stores.favorite.set).toHaveBeenCalledWith('recipe-1', true);
    expect(stores.hidden.set).toHaveBeenCalledWith('recipe-1', false);
  });

  it('rejects stale state and coalesces duplicate request IDs', async () => {
    const stores = repositories({ favorites: ['recipe-1'] });
    const actions = createRecipeControlActions(stores);
    await expect(actions.setFavorite({
      requestId: 'stale-request', confirmed: true, recipeId: 'recipe-1', expectedVersion: 0, favorite: false,
    })).rejects.toBeInstanceOf(RecipePreferenceStaleError);

    stores.favorite.list.mockResolvedValue([]);
    const input = { requestId: 'same-request', confirmed: true, recipeId: 'recipe-1', expectedVersion: 0, favorite: true } as const;
    const [first, second] = await Promise.all([actions.setFavorite(input), actions.setFavorite(input)]);
    expect(second).toBe(first);
    expect(stores.favorite.set).toHaveBeenCalledTimes(1);
  });
});

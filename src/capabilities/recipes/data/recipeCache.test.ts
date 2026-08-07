import { createRecipeCache, recipeCacheKey } from './recipeCache';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

describe('Recipe cache', () => {
  const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };

  it('uses an account-scoped key and round-trips validated projections', async () => {
    const values = new Map<string, string>();
    const cache = createRecipeCache({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });
    expect(recipeCacheKey('user-a')).toBe('kwilt.recipes.v1.user-a');
    await cache.write('user-a', [projection]);
    await expect(cache.read('user-a')).resolves.toEqual([projection]);
    await expect(cache.read('user-b')).resolves.toEqual([]);
  });

  it('rejects and removes malformed cached data', async () => {
    let removed = false;
    const cache = createRecipeCache({
      getItem: async () => '{"recipes":[{"recipe":{"id":"bad"}}]}',
      setItem: async () => undefined,
      removeItem: async () => { removed = true; },
    });
    await expect(cache.read('user-a')).resolves.toEqual([]);
    expect(removed).toBe(true);
  });
});

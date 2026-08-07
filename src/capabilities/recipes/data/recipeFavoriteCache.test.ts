import { createRecipeFavoriteCache, recipeFavoriteCacheKey } from './recipeFavoriteCache';

describe('Recipe favorite cache', () => {
  it('round-trips a deduplicated account-scoped list', async () => {
    const values = new Map<string, string>();
    const cache = createRecipeFavoriteCache({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });

    expect(recipeFavoriteCacheKey('user-a')).toBe('kwilt.recipe-favorites.v1.user-a');
    await cache.write('user-a', ['meal-1', 'meal-1', 'meal-2']);
    await expect(cache.read('user-a')).resolves.toEqual(['meal-1', 'meal-2']);
    await expect(cache.read('user-b')).resolves.toEqual([]);
  });

  it('removes malformed cached data', async () => {
    const removeItem = jest.fn().mockResolvedValue(undefined);
    const cache = createRecipeFavoriteCache({
      getItem: async () => '{"recipeIds":[42]}',
      setItem: async () => undefined,
      removeItem,
    });

    await expect(cache.read('user-a')).resolves.toEqual([]);
    expect(removeItem).toHaveBeenCalledWith(recipeFavoriteCacheKey('user-a'));
  });
});

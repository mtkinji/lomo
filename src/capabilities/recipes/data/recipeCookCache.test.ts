import { createRecipeCookCache, recipeCookCacheKey } from './recipeCookCache';
import { session } from '../domain/recipeCookContracts.test';

describe('Recipe Cook cache', () => {
  it('is user-keyed and restores the exact active cue', async () => {
    const values = new Map<string, string>();
    const storage = { getItem: jest.fn(async (key: string) => values.get(key) ?? null), setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }), removeItem: jest.fn(async (key: string) => { values.delete(key); }) };
    const cache = createRecipeCookCache(storage);
    await cache.write('user-1', { ...session(), currentCueIndex: 1 });
    expect(recipeCookCacheKey('user-1')).not.toBe(recipeCookCacheKey('user-2'));
    await expect(cache.read('user-1')).resolves.toMatchObject({ currentCueIndex: 1, recipeVersionId: 'version-3' });
    await expect(cache.read('user-2')).resolves.toBeNull();
  });

  it('clears malformed progress instead of leaking it to another session', async () => {
    const storage = { getItem: jest.fn(async () => '{"bad":true}'), setItem: jest.fn(), removeItem: jest.fn(async () => undefined) };
    await expect(createRecipeCookCache(storage).read('user-1')).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalled();
  });
});

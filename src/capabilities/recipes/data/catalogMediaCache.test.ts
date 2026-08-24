import { createCatalogMediaCache } from './catalogMediaCache';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

const baseRecipe = recipeContractFixture();
const projection = {
  recipe: {
    ...baseRecipe,
    provenance: {
      ...baseRecipe.provenance,
      method: 'catalog' as const,
      rightsBasis: 'kwilt_authored' as const,
    },
    lineage: [],
  },
  currentVersion: recipeVersionContractFixture(),
  catalog: {
    publicationId: 'publication-br012',
    rosterId: 'BR012',
    publicSlug: 'chilaquiles-rojos-br012',
    editorialMetadata: {
      category: 'Breakfast & brunch',
      cuisine: 'Mexican',
      tier: 'household-anchor',
    },
    publishedAt: '2026-08-24T12:00:00.000Z',
    contentHash: 'sha256:br012',
  },
};

describe('catalog media cache', () => {
  it('keeps the last-known-good complete catalog when a refresh is empty', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { values.delete(key); }),
    };
    const cache = createCatalogMediaCache(storage);
    await cache.write('user-1', [projection]);
    await cache.write('user-1', []);
    expect(await cache.read('user-1')).toEqual([projection]);
  });
});

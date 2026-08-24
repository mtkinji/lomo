import { createCatalogMediaRepository } from './catalogMediaRepository';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

function row(rosterId: string) {
  const recipe = recipeContractFixture();
  return {
    projection: {
      recipe: {
        ...recipe,
        provenance: {
          ...recipe.provenance,
          method: 'catalog',
          rightsBasis: 'kwilt_authored',
        },
        lineage: [],
      },
      currentVersion: recipeVersionContractFixture(),
      catalog: {
        publicationId: `publication-${rosterId}`,
        rosterId,
        publicSlug: `recipe-${rosterId.toLowerCase()}`,
        editorialMetadata: {
          category: 'Dinner',
          cuisine: 'American',
          tier: 'household-anchor',
        },
        publishedAt: '2026-08-24T12:00:00.000Z',
        contentHash: `sha256:${rosterId.toLowerCase()}`,
      },
    },
  };
}

describe('catalog media repository', () => {
  it('pages past the hosted RPC limit so catalogs larger than 500 are complete', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => row(`AA${String(index).padStart(3, '0')}`));
    const secondPage = Array.from({ length: 100 }, (_, index) => row(`AB${String(index).padStart(3, '0')}`));
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null });

    const repository = createCatalogMediaRepository({ rpc } as never);
    const catalog = await repository.list();

    expect(catalog).toHaveLength(600);
    expect(catalog[0].catalog?.rosterId).toBe('AA000');
    expect(catalog[0].recipe.id).toBe('kwilt-recipe-aa000');
    expect(catalog[0].currentVersion.id).toBe('kwilt-recipe-aa000-v1');
    expect(catalog[599].catalog?.rosterId).toBe('AB099');

    expect(rpc).toHaveBeenNthCalledWith(1, 'list_kwilt_recipe_catalog_v2', {
      p_after_roster_id: null,
      p_limit: 500,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'list_kwilt_recipe_catalog_v2', {
      p_after_roster_id: 'AA499',
      p_limit: 500,
    });
  });

  it('rejects the entire refresh when hosted editorial metadata is unsupported', async () => {
    const malformed = row('DI999');
    malformed.projection.catalog.editorialMetadata.category = 'Unknown';
    const rpc = jest.fn().mockResolvedValue({ data: [row('DI998'), malformed], error: null });
    const repository = createCatalogMediaRepository({ rpc } as never);

    await expect(repository.list()).rejects.toThrow('Invalid Recipe catalog publication');
  });
});

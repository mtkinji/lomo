import { createRecipeRepository, RecipeRepositoryError } from './recipeRepository';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';

describe('Recipe repository', () => {
  it('uses reviewed RPCs for save and delete', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: { recipeId: 'recipe-1', recipeVersionId: 'version-1', version: 1, idempotencyKey: 'save-1', replayed: false }, error: null })
      .mockResolvedValueOnce({ data: { recipeId: 'recipe-1', version: 1, deleted: true }, error: null });
    const repository = createRecipeRepository({ rpc } as never);
    await repository.save({ recipeId: null, expectedVersion: 0, idempotencyKey: 'save-1', reviewedData: { title: 'Toast' } });
    await repository.delete('recipe-1', 1);
    expect(rpc).toHaveBeenNthCalledWith(1, 'save_kwilt_recipe_with_equipment', expect.objectContaining({ p_expected_version: 0, p_idempotency_key: 'save-1' }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'delete_kwilt_recipe', { p_recipe_id: 'recipe-1', p_expected_version: 1 });
  });

  it('maps stale-version failures to a stable repository code', async () => {
    const repository = createRecipeRepository({ rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'stale_recipe_version' } }) } as never);
    await expect(repository.save({ recipeId: 'recipe-1', expectedVersion: 1, idempotencyKey: 'save-2', reviewedData: { title: 'Toast' } }))
      .rejects.toEqual(expect.objectContaining<Partial<RecipeRepositoryError>>({ code: 'stale_recipe_version' }));
  });

  it('rejects malformed server projections', async () => {
    const query = { select: () => query, order: jest.fn().mockResolvedValue({ data: [{ id: 'bad' }], error: null }) };
    await expect(createRecipeRepository({ from: () => query } as never).list()).rejects.toThrow('Invalid Recipe projection');
  });

  it('disambiguates the owned-version lineage relationship in the PostgREST projection', async () => {
    let selection = '';
    type QueryDouble = {
      select(value: string): QueryDouble;
      order: jest.Mock;
    };
    const query: QueryDouble = {
      select(value: string): QueryDouble {
        selection = value;
        return query;
      },
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    await createRecipeRepository({ from: () => query } as never).list();

    expect(selection).toContain(
      'lineage:kwilt_recipe_lineage!kwilt_recipe_lineage_recipe_version_id_fkey(*)',
    );
    expect(selection).toContain('equipment_requirements:kwilt_recipe_equipment_requirements(*)');
  });

  it('accepts already-normalized projections from a typed boundary', async () => {
    const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const repository = createRecipeRepository({} as never, { loadRows: async () => [projection] });
    await expect(repository.list()).resolves.toEqual([projection]);
  });
});

import { createRecipeFavoriteRepository } from './recipeFavoriteRepository';

describe('Recipe favorite repository', () => {
  it('lists personal recipe references and uses one idempotent mutation RPC', async () => {
    const query: { select: jest.Mock; order: jest.Mock } = { select: jest.fn(), order: jest.fn() };
    query.select.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [{ recipe_ref: 'meal-1' }, { recipe_ref: 'meal-2' }], error: null });
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const repository = createRecipeFavoriteRepository({ from: jest.fn(() => query), rpc } as never);

    await expect(repository.list()).resolves.toEqual(['meal-1', 'meal-2']);
    await repository.set('meal-1', false);

    expect(rpc).toHaveBeenCalledWith('set_kwilt_recipe_favorite', {
      p_recipe_ref: 'meal-1',
      p_favorite: false,
    });
  });

  it('rejects malformed rows instead of leaking them into UI state', async () => {
    const query: { select: jest.Mock; order: jest.Mock } = { select: jest.fn(), order: jest.fn() };
    query.select.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [{ recipe_ref: '' }], error: null });
    const repository = createRecipeFavoriteRepository({ from: jest.fn(() => query) } as never);
    await expect(repository.list()).rejects.toThrow('Invalid recipe favorite');
  });
});

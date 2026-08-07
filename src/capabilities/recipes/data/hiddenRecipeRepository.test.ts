import { createHiddenRecipeRepository } from './hiddenRecipeRepository';

describe('Hidden recipe repository', () => {
  it('lists the current person hidden recipe refs in creation order', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ recipe_ref: 'meal-1' }, { recipe_ref: 'meal-2' }],
      error: null,
    });
    const select = jest.fn(() => ({ order }));
    const from = jest.fn(() => ({ select }));
    const repository = createHiddenRecipeRepository({ from } as never);

    await expect(repository.list()).resolves.toEqual(['meal-1', 'meal-2']);
    expect(from).toHaveBeenCalledWith('kwilt_hidden_recipes');
    expect(select).toHaveBeenCalledWith('recipe_ref');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('uses the person-scoped mutation RPC for hide and restore', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    const repository = createHiddenRecipeRepository({ rpc } as never);

    await repository.set(' meal-1 ', true);
    await repository.set('meal-1', false);

    expect(rpc).toHaveBeenNthCalledWith(1, 'set_kwilt_recipe_hidden', {
      p_recipe_ref: 'meal-1',
      p_hidden: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_kwilt_recipe_hidden', {
      p_recipe_ref: 'meal-1',
      p_hidden: false,
    });
  });

  it('rejects an empty recipe ref before calling the backend', async () => {
    const rpc = jest.fn();
    const repository = createHiddenRecipeRepository({ rpc } as never);

    await expect(repository.set(' ', true)).rejects.toThrow('Invalid hidden recipe');
    expect(rpc).not.toHaveBeenCalled();
  });
});

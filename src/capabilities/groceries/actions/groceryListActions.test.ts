import { createGroceryListActions, type GroceryListActionBoundary } from './groceryListActions';

describe('Grocery List actions', () => {
  const boundary: GroceryListActionBoundary = {
    compile: jest.fn(async () => ({ groceryListId: 'list-1', revision: 1, status: 'review_needed' as const, replayed: false })),
    addItem: jest.fn(async () => ({ groceryListId: 'list-1', itemId: 'item-1', revision: 2 })),
    updateItem: jest.fn(async () => ({ groceryListId: 'list-1', itemId: 'item-1', revision: 3 })),
    setItemState: jest.fn(async () => ({ groceryListId: 'list-1', itemId: 'item-1', revision: 4, state: 'skipped' as const })),
    markReviewed: jest.fn(async () => ({ groceryListId: 'list-1', revision: 4, status: 'ready' as const })),
  };
  test('requires confirmation, exact positive versions, and stable request keys', async () => {
    const actions = createGroceryListActions(boundary);
    await expect(actions.compile({ requestId: '', confirmed: true, mealPlanId: 'plan-1', mealPlanVersion: 2 }))
      .rejects.toThrow('grocery.request_invalid');
    await expect(actions.addItem({ requestId: 'add-1', confirmed: false, groceryListId: 'list-1', expectedVersion: 1,
      title: 'Milk', sourceKind: 'manual' })).rejects.toThrow('grocery.confirmation_required');
    await expect(actions.review({ requestId: 'review-1', confirmed: true, groceryListId: 'list-1', expectedVersion: 0 }))
      .rejects.toThrow('grocery.version_invalid');
  });
  test('applies compile, manual add, structured correction, canonical state, and final review', async () => {
    const actions = createGroceryListActions(boundary);
    await actions.compile({ requestId: 'compile-1', confirmed: true, mealPlanId: 'plan-1', mealPlanVersion: 2 });
    await actions.addItem({ requestId: 'add-1', confirmed: true, groceryListId: 'list-1', expectedVersion: 1,
      title: 'Milk', sourceKind: 'household_request' });
    await actions.updateItem({ requestId: 'update-1', confirmed: true, groceryItemId: 'item-1', expectedVersion: 2,
      patch: { quantityMin: 1, quantityMax: 2, unit: 'gallons' }, reason: 'Need enough for breakfast' });
    const state = await actions.setItemState({ requestId: 'state-1', confirmed: true, groceryItemId: 'item-1',
      expectedVersion: 3, state: 'removed' });
    await actions.review({ requestId: 'review-1', confirmed: true, groceryListId: 'list-1', expectedVersion: 4 });
    expect(boundary.compile).toHaveBeenCalledWith('plan-1', 2, 'compile-1');
    expect(boundary.setItemState).toHaveBeenCalledWith('item-1', 3, 'skipped', 'state-1');
    expect(state).toMatchObject({ state: 'removed' });
  });
  test('rejects empty and inverted item patches before persistence', async () => {
    const actions = createGroceryListActions(boundary);
    await expect(actions.updateItem({ requestId: 'update-1', confirmed: true, groceryItemId: 'item-1', expectedVersion: 2,
      patch: {}, reason: null })).rejects.toThrow('grocery.patch_invalid');
    await expect(actions.updateItem({ requestId: 'update-1', confirmed: true, groceryItemId: 'item-1', expectedVersion: 2,
      patch: { quantityMin: 3, quantityMax: 1 }, reason: null })).rejects.toThrow('grocery.quantity_invalid');
  });
});

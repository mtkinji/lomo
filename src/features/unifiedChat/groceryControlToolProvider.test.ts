import type { FoodStockObservation } from '../../capabilities/groceries/domain/foodStockContracts';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { createGroceryControlToolProvider } from './groceryControlToolProvider';

function tool(id: string) {
  const definition = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Missing Grocery tool ${id}`);
  return definition;
}
const observation: FoodStockObservation = {
  id: 'stock-1', ownerPersonId: 'person-1', concept: 'Beans', state: 'confirmed',
  quantityMin: 2, quantityMax: 3, unit: 'cans', source: 'manual', confidence: 1,
  observedAt: '2026-08-27T12:00:00.000Z', expiresAt: '2026-09-03T12:00:00.000Z',
  supersedesObservationId: null, correctedAt: null,
};

describe('Grocery control tool provider', () => {
  test('reads the latest owner stock by requested concept with effective freshness', async () => {
    const provider = createGroceryControlToolProvider({ stock: { list: jest.fn(async () => [
      observation, { ...observation, id: 'corrected', observedAt: '2026-08-28T12:00:00.000Z', correctedAt: '2026-08-28T13:00:00.000Z' },
    ]) }, cycle: { current: jest.fn() }, now: () => '2026-08-29T12:00:00.000Z' });
    await expect(provider.execute({ id: 'stock-read', toolId: 'food_stock.read', arguments: { concepts: ['beans'] } }, tool('food_stock.read')))
      .resolves.toMatchObject({ status: 'completed', output: { observations: [{ id: 'stock-1', effectiveState: 'confirmed' }] } });
  });

  test('reads only the active trip target and bounded Money envelope without cash-safety claims', async () => {
    const provider = createGroceryControlToolProvider({ stock: { list: jest.fn() }, cycle: { current: jest.fn(async () => ({
      id: 'cycle-1', cycleRef: 'next-shop', targetCents: 6500,
      moneyEnvelope: { sourcePlanVersionId: 'plan-v4', categoryIds: ['food'], remainingCents: 8000,
        observedAt: '2026-08-27T12:00:00.000Z', assumptions: ['Food category only'] },
      state: 'active' as const, updatedAt: '2026-08-27T12:00:00.000Z',
    })) } });
    const result = await provider.execute({ id: 'budget-read', toolId: 'food_budget.read', arguments: {} }, tool('food_budget.read'));
    expect(result).toMatchObject({ status: 'completed', output: { tripTargetCents: 6500,
      moneyEnvelope: { sourcePlanVersionId: 'plan-v4' }, limitation: expect.stringContaining('not a claim') } });
    expect(JSON.stringify(result)).not.toContain('cashSafe');
  });

  test('stages exact reviewed observation and depletion proposals', async () => {
    const staged: unknown[] = [];
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] },
      cycle: { current: async () => null }, stageProposal: (proposal) => staged.push(proposal) });
    const observe = await provider.execute({ id: 'observe', toolId: 'food_stock.observe', arguments: {
      observation: { concept: 'Rice', state: 'confirmed', quantityMin: 1, quantityMax: 2, unit: 'bags',
        source: 'voice', confidence: 0.9, observedAt: '2026-08-27T12:00:00.000Z', expiresAt: null },
      expectedObservationId: 'stock-1', idempotencyKey: 'observe-1',
    } }, tool('food_stock.observe'));
    const deplete = await provider.execute({ id: 'deplete', toolId: 'food_stock.deplete', arguments: {
      concept: 'Rice', expectedObservationId: 'stock-2', observedAt: '2026-08-28T12:00:00.000Z', idempotencyKey: 'deplete-1',
    } }, tool('food_stock.deplete'));
    expect(observe).toMatchObject({ status: 'proposed', proposal: { operation: {
      type: 'food_stock.observe', expectedObservationId: 'stock-1' } } });
    expect(deplete).toMatchObject({ status: 'proposed', proposal: { operation: {
      type: 'food_stock.deplete', expectedObservationId: 'stock-2' } } });
    expect(staged).toHaveLength(2);
  });

  test('rejects invalid confirmed receipt evidence before staging', async () => {
    const staged: unknown[] = [];
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] },
      cycle: { current: async () => null }, stageProposal: (proposal) => staged.push(proposal) });
    const result = await provider.execute({ id: 'observe', toolId: 'food_stock.observe', arguments: {
      observation: { concept: 'Milk', state: 'confirmed', quantityMin: 1, quantityMax: 1, unit: 'gallon',
        source: 'receipt', confidence: 1, observedAt: '2026-08-27T12:00:00.000Z', expiresAt: null },
      expectedObservationId: null, idempotencyKey: 'observe-1',
    } }, tool('food_stock.observe'));
    expect(result).toMatchObject({ status: 'failed', code: 'food_stock_observation_invalid' });
    expect(staged).toEqual([]);
  });

  test('reads one Grocery list and stages exact compile and item changes', async () => {
    const staged: unknown[] = [];
    const list = { id: 'list-1', revision: 3, status: 'review_needed' as const, sourceKind: 'meal_plan' as const,
      sourceHouseholdId: null, sourceMealPlanId: 'plan-1', sourceMealPlanVersion: 4, sourceRecipeVersionId: null,
      sourceTitle: null, updatedAt: 'now', items: [{ id: 'item-1', concept: 'milk', quantityMin: 1, quantityMax: 1,
        unit: 'gallon', aisle: 'dairy', originalDisplayTexts: ['1 gallon milk'], reviewReason: null,
        state: 'needed' as const, note: null, sources: [] }] };
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] }, cycle: { current: async () => null },
      lists: { list: async () => [list] }, mealPlans: { list: async () => [{ id: 'plan-1', version: 4, state: 'finalized' }] },
      stageProposal: (proposal) => staged.push(proposal) });
    await expect(provider.execute({ id: 'read', toolId: 'groceries.list.review', arguments: { groceryListId: 'list-1' } }, tool('groceries.list.review')))
      .resolves.toMatchObject({ status: 'completed', output: { groceryList: { id: 'list-1', revision: 3 } } });
    await provider.execute({ id: 'compile', toolId: 'groceries.compile', arguments: {
      mealPlanId: 'plan-1', mealPlanVersion: 4, idempotencyKey: 'compile-1',
    } }, tool('groceries.compile'));
    await provider.execute({ id: 'add', toolId: 'groceries.item.add', arguments: {
      groceryListId: 'list-1', expectedVersion: 3, title: 'Eggs', sourceKind: 'manual', idempotencyKey: 'add-1',
    } }, tool('groceries.item.add'));
    await provider.execute({ id: 'update', toolId: 'groceries.item.update', arguments: {
      groceryItemId: 'item-1', expectedVersion: 3, patch: { quantityMin: 2 }, reason: null, idempotencyKey: 'update-1',
    } }, tool('groceries.item.update'));
    await provider.execute({ id: 'state', toolId: 'groceries.item.set_state', arguments: {
      groceryItemId: 'item-1', expectedVersion: 3, state: 'already_have', idempotencyKey: 'state-1',
    } }, tool('groceries.item.set_state'));
    expect(staged).toEqual([
      expect.objectContaining({ operation: expect.objectContaining({ type: 'groceries.compile', expectedVersion: 4 }) }),
      expect.objectContaining({ operation: expect.objectContaining({ type: 'groceries.item.add', expectedVersion: 3 }) }),
      expect.objectContaining({ operation: expect.objectContaining({ type: 'groceries.item.update', targetId: 'item-1' }) }),
      expect.objectContaining({ operation: expect.objectContaining({ type: 'groceries.item.set_state', payload: { state: 'already_have' } }) }),
    ]);
  });

  test('rejects stale Grocery mutations before staging', async () => {
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] }, cycle: { current: async () => null },
      lists: { list: async () => [{ id: 'list-1', revision: 3, items: [] } as never] } });
    await expect(provider.execute({ id: 'add', toolId: 'groceries.item.add', arguments: {
      groceryListId: 'list-1', expectedVersion: 2, title: 'Eggs', sourceKind: 'manual', idempotencyKey: 'add-1',
    } }, tool('groceries.item.add'))).resolves.toMatchObject({ status: 'failed', code: 'grocery_version_stale', retryable: true });
  });

  test('stages exact native retailer review for product matching and handoff preparation', async () => {
    const list = { id: 'list-1', revision: 3, status: 'ready' as const, items: [
      { id: 'item-1', concept: 'milk', state: 'needed' as const },
    ] } as never;
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] }, cycle: { current: async () => null },
      lists: { list: async () => [list] } });

    await expect(provider.execute({ id: 'match', toolId: 'groceries.product_match.prepare', arguments: {
      groceryItemId: 'item-1', provider: 'kroger', locationId: 'store-1',
    } }, tool('groceries.product_match.prepare'))).resolves.toMatchObject({
      status: 'pending_client_action', request: { actionType: 'open_grocery_product_match',
        targetId: 'item-1', payload: { groceryListId: 'list-1', provider: 'kroger', locationId: 'store-1' } },
    });
    await expect(provider.execute({ id: 'confirm', toolId: 'groceries.product_match.confirm', arguments: {
      groceryItemId: 'item-1', provider: 'kroger', retailerProductId: 'upc-1',
      evidenceObservedAt: '2026-08-27T20:00:00.000Z',
    } }, tool('groceries.product_match.confirm'))).resolves.toMatchObject({
      status: 'pending_client_action', request: { actionType: 'open_grocery_product_match', targetId: 'item-1' },
    });
    await expect(provider.execute({ id: 'handoff', toolId: 'groceries.handoff.prepare', arguments: {
      groceryListId: 'list-1', provider: 'instacart', idempotencyKey: 'handoff-1',
    } }, tool('groceries.handoff.prepare'))).resolves.toMatchObject({
      status: 'pending_client_action', request: { actionType: 'open_grocery_handoff',
        targetId: 'list-1', payload: { provider: 'instacart', expectedVersion: 3 } },
    });
    expect(provider.actions()).toHaveLength(3);
  });

  test('resolves a retailer handoff to its exact Grocery list before opening it', async () => {
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] }, cycle: { current: async () => null },
      handoffs: { resolve: async (handoffId) => handoffId === 'handoff-1' ? {
        id: handoffId, groceryListId: 'list-1', provider: 'instacart', state: 'provider_link_created',
        expiresAt: '2026-08-28T20:00:00.000Z',
      } : null }, now: () => '2026-08-28T19:00:00.000Z' });

    await expect(provider.execute({ id: 'open', toolId: 'groceries.handoff.open', arguments: {
      retailerHandoffId: 'handoff-1',
    } }, tool('groceries.handoff.open'))).resolves.toMatchObject({
      status: 'pending_client_action', request: { actionType: 'open_grocery_handoff',
        targetType: 'grocery_list', targetId: 'list-1', payload: { retailerHandoffId: 'handoff-1', provider: 'instacart' } },
    });
    expect(provider.actions()).toHaveLength(1);
  });

  test('refuses an unknown or expired retailer handoff instead of routing inexactly', async () => {
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] }, cycle: { current: async () => null },
      handoffs: { resolve: async () => null } });
    await expect(provider.execute({ id: 'open', toolId: 'groceries.handoff.open', arguments: {
      retailerHandoffId: 'missing',
    } }, tool('groceries.handoff.open'))).resolves.toMatchObject({ status: 'failed', code: 'grocery_handoff_not_found' });
  });

  test('refuses unsupported retailer providers and unknown exact targets', async () => {
    const provider = createGroceryControlToolProvider({ stock: { list: async () => [] }, cycle: { current: async () => null },
      lists: { list: async () => [] } });
    await expect(provider.execute({ id: 'match', toolId: 'groceries.product_match.prepare', arguments: {
      groceryItemId: 'missing', provider: 'amazon', locationId: 'store-1',
    } }, tool('groceries.product_match.prepare'))).resolves.toMatchObject({ status: 'failed', code: 'grocery_item_not_found' });
  });
});

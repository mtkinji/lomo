import { createFoodStockActions, type FoodStockActionBoundary } from './foodStockActions';

describe('Food Stock actions', () => {
  const receipt = { observationId: 'stock-2', operationId: 'food_stock.observe' as const, replayed: false };

  test('requires reviewed confirmation and a stable idempotency key', async () => {
    const boundary: FoodStockActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createFoodStockActions(boundary);
    await expect(actions.observe({ requestId: 'observe-1', confirmed: false, expectedObservationId: null,
      observation: { concept: 'rice', state: 'confirmed', quantityMin: 1, quantityMax: 2, unit: 'bags',
        source: 'voice', confidence: 1, observedAt: '2026-08-27T12:00:00.000Z', expiresAt: null } }))
      .rejects.toThrow('food_stock.confirmation_required');
    await expect(actions.deplete({ requestId: '', confirmed: true, concept: 'rice', expectedObservationId: 'stock-1',
      observedAt: '2026-08-27T12:00:00.000Z' })).rejects.toThrow('food_stock.request_invalid');
    expect(boundary.apply).not.toHaveBeenCalled();
  });

  test('applies exact reviewed observations and depletion evidence through one boundary', async () => {
    const boundary: FoodStockActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createFoodStockActions(boundary);
    await actions.observe({ requestId: 'observe-1', confirmed: true, expectedObservationId: 'stock-1',
      observation: { concept: 'rice', state: 'confirmed', quantityMin: 1, quantityMax: 2, unit: 'bags',
        source: 'voice', confidence: 0.9, observedAt: '2026-08-27T12:00:00.000Z', expiresAt: null } });
    await actions.deplete({ requestId: 'deplete-1', confirmed: true, concept: 'rice', expectedObservationId: 'stock-2',
      observedAt: '2026-08-28T12:00:00.000Z' });
    expect(boundary.apply).toHaveBeenNthCalledWith(1, expect.objectContaining({ operationId: 'food_stock.observe',
      expectedObservationId: 'stock-1', payload: { observation: expect.objectContaining({ concept: 'rice', state: 'confirmed' }) } }));
    expect(boundary.apply).toHaveBeenNthCalledWith(2, expect.objectContaining({ operationId: 'food_stock.deplete',
      expectedObservationId: 'stock-2', payload: expect.objectContaining({ concept: 'rice', state: 'depleted' }) }));
  });

  test('does not allow receipt or order evidence to become confirmed stock', async () => {
    const boundary: FoodStockActionBoundary = { apply: jest.fn(async () => receipt) };
    const actions = createFoodStockActions(boundary);
    await expect(actions.observe({ requestId: 'observe-1', confirmed: true, expectedObservationId: null,
      observation: { concept: 'milk', state: 'confirmed', quantityMin: 1, quantityMax: 1, unit: 'gallon',
        source: 'receipt', confidence: 1, observedAt: '2026-08-27T12:00:00.000Z', expiresAt: null } }))
      .rejects.toThrow('Purchase evidence begins as likely stock');
    expect(boundary.apply).not.toHaveBeenCalled();
  });
});

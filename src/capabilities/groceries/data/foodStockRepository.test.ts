import { createFoodStockRepository } from './foodStockRepository';

describe('Food stock repository', () => {
  it('reads only through owner-RLS tables and writes through authority RPCs', async () => {
    const chain: any = { select: jest.fn(), order: jest.fn(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }; chain.select.mockReturnValue(chain); chain.order.mockReturnValue(chain);
    const from = jest.fn(() => chain); const rpc = jest.fn().mockResolvedValue({ data: {}, error: null }); const repository = createFoodStockRepository({ from, rpc } as never);
    await repository.list(); await repository.observe({ concept: 'rice', state: 'confirmed', quantityMin: 1, quantityMax: null, unit: 'bag', source: 'manual', confidence: 1, observedAt: '2026-08-05T12:00:00.000Z', expiresAt: null, supersedesObservationId: null });
    expect(from).toHaveBeenCalledWith('kwilt_food_stock_observations');
    expect(rpc).toHaveBeenCalledWith('observe_kwilt_food_stock', expect.objectContaining({ p_observation: expect.objectContaining({ concept: 'rice' }) }));
  });
});

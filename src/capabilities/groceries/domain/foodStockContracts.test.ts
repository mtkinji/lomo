import { effectiveFoodStockState, parseFoodCycleSpendingConstraint, parseFoodStockObservation } from './foodStockContracts';

describe('Food stock contracts', () => {
  const observation = { id: 'stock-1', ownerPersonId: 'person-1', concept: 'black beans', state: 'confirmed' as const, quantityMin: 2, quantityMax: 3, unit: 'can', source: 'already_have' as const, confidence: 1, observedAt: '2026-08-05T12:00:00.000Z', expiresAt: '2026-08-12T12:00:00.000Z', supersedesObservationId: null, correctedAt: null };
  it('preserves explicit confidence, range, source, and supersession', () => expect(parseFoodStockObservation(observation)).toEqual(observation));
  it('decays old evidence to check-first without claiming consumption or safety', () => {
    expect(effectiveFoodStockState(observation, '2026-08-13T00:00:00.000Z')).toBe('check_first');
    expect(effectiveFoodStockState({ ...observation, state: 'depleted' }, '2026-08-13T00:00:00.000Z')).toBe('depleted');
  });
  it('keeps a manual trip target complete and preserves optional Money assumptions separately', () => {
    expect(parseFoodCycleSpendingConstraint({ id: 'constraint-1', ownerPersonId: 'person-1', cycleRef: 'next-shop', targetCents: 6500, moneyEnvelope: null, createdAt: '2026-08-05T12:00:00.000Z' })).toMatchObject({ targetCents: 6500, moneyEnvelope: null });
    expect(parseFoodCycleSpendingConstraint({ id: 'constraint-2', ownerPersonId: 'person-1', cycleRef: 'next-shop', targetCents: 6500, moneyEnvelope: { sourcePlanVersionId: 'money-v4', categoryIds: ['food'], remainingCents: 9200, observedAt: '2026-08-05T12:00:00.000Z', assumptions: ['One more shop this period'] }, createdAt: '2026-08-05T12:00:00.000Z' }).moneyEnvelope?.remainingCents).toBe(9200);
  });
  it('rejects inverted ranges and receipt lines promoted directly to confirmed', () => {
    expect(() => parseFoodStockObservation({ ...observation, quantityMin: 4, quantityMax: 2 })).toThrow(expect.objectContaining({ code: 'food_stock.range_invalid' }));
    expect(() => parseFoodStockObservation({ ...observation, source: 'receipt' })).toThrow(expect.objectContaining({ code: 'food_stock.receipt_not_confirmed' }));
  });
});

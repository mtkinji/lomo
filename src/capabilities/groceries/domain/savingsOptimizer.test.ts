import { optimizeSavings } from './savingsOptimizer';

const now = '2026-08-05T12:00:00.000Z';
describe('savings optimizer', () => {
  it('compares equivalent quantity, net fees, waste, activation and extra-store burden', () => {
    const options = optimizeSavings({ now, tripTargetCents: 6500, hasMemberships: ['kroger'], items: [{ groceryItemId: 'milk', neededBaseUnits: 100, confirmedStockBaseUnits: 0, likelyUseBaseUnits: 100, storageBaseUnits: 220, candidates: [
      { id: 'current', title: 'Current milk', productId: 'a', store: 'Primary', packageBaseUnits: 100, packagePriceCents: 800, feeCents: 0, evidence: [] },
      { id: 'deal', title: 'Member milk', productId: 'b', store: 'Kroger', packageBaseUnits: 200, packagePriceCents: 700, feeCents: 50, evidence: [{ id: 'm', kind: 'member_price', state: 'eligible', provider: 'kroger', productId: 'b', amountCents: 200, memberRequired: true, activationRequired: false, observedAt: now, expiresAt: '2026-08-06T12:00:00.000Z' }] },
    ] }] });
    expect(options[0]).toEqual(expect.objectContaining({ id: 'deal', predictedSavingsCents: 250 }));
    expect(options[0].assumptions).toContain('Includes 50¢ in fees');
  });

  it('rejects ineligible/stale evidence and can recommend no purchase from stock', () => {
    const options = optimizeSavings({ now, tripTargetCents: null, hasMemberships: [], items: [{ groceryItemId: 'beans', neededBaseUnits: 2, confirmedStockBaseUnits: 3, likelyUseBaseUnits: 2, storageBaseUnits: 5, candidates: [{ id: 'member', title: 'Beans', productId: 'b', store: 'Kroger', packageBaseUnits: 2, packagePriceCents: 300, feeCents: 0, evidence: [{ id: 'm', kind: 'member_price', state: 'eligible', provider: 'kroger', productId: 'b', amountCents: 100, memberRequired: true, activationRequired: false, observedAt: now, expiresAt: '2026-08-06T12:00:00.000Z' }] }] }] });
    expect(options[0]).toEqual(expect.objectContaining({ id: 'no_purchase:beans', netCents: 0 }));
    expect(options.some((option) => option.id === 'member')).toBe(false);
  });

  it('caps presented options at three', () => {
    const options = optimizeSavings({ now, tripTargetCents: null, hasMemberships: [], items: [{ groceryItemId: 'x', neededBaseUnits: 1, confirmedStockBaseUnits: 0, likelyUseBaseUnits: 1, storageBaseUnits: 10, candidates: Array.from({ length: 5 }, (_, index) => ({ id: String(index), title: 'Item', productId: String(index), store: 'Store', packageBaseUnits: 1, packagePriceCents: 500 - index * 10, feeCents: 0, evidence: [] })) }] });
    expect(options).toHaveLength(3);
  });
});

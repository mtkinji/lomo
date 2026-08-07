import { optimizeFoodScenarios } from './foodScenarioOptimizer';

describe('Food scenario optimizer', () => {
  it('offers a family-compatible swap near target with explicit waste and burden', () => {
    const options = optimizeFoodScenarios({ baselineEstimateCents: { min: 5800, max: 6600 }, tripTargetCents: 6500, stockUseCount: 2, opportunities: [{ id: 'opp-1', concept: 'chicken thighs', currentUnitPriceCents: 149, baselineComparableUnitPriceCents: 349, quantity: 2, expectedUseQuantity: 2, storageCapacityQuantity: 4, familyAccepted: true, replacement: { entryId: 'salmon-meal', recipeVersionId: 'chicken-recipe', groceryItemId: 'salmon', replacementConcept: 'chicken thighs' }, extraTripBurdenCents: 0 }] });
    expect(options[0]).toMatchObject({ kind: 'accept_opportunity', opportunityId: 'opp-1', estimateRangeCents: { min: 5400, max: 6200 }, expectedWasteQuantity: 0, staysNearTarget: true });
    expect(options).toHaveLength(2);
  });
  it('returns do-not-buy for bulk waste, family mismatch, or burden that erases savings', () => {
    const options = optimizeFoodScenarios({ baselineEstimateCents: { min: 5000, max: 6000 }, tripTargetCents: 6500, stockUseCount: 0, opportunities: [{ id: 'opp-bulk', concept: 'beef', currentUnitPriceCents: 200, baselineComparableUnitPriceCents: 300, quantity: 10, expectedUseQuantity: 2, storageCapacityQuantity: 3, familyAccepted: false, replacement: null, extraTripBurdenCents: 900 }] });
    expect(options[0]).toMatchObject({ kind: 'do_not_buy', opportunityId: 'opp-bulk' });
  });
});

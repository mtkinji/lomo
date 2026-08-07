import { parseFoodScenario, parseStoreOpportunity } from './foodScenarioContracts';

describe('Food scenario contracts', () => {
  it('keeps store evidence immutable and confidence-labeled', () => {
    expect(parseStoreOpportunity(opportunity())).toMatchObject({ observedPriceCents: 149, comparableUnitPriceCents: 149, evidenceMethod: 'photo', state: 'observed' });
    expect(() => parseStoreOpportunity({ ...opportunity(), confidence: 1.2 })).toThrow(expect.objectContaining({ code: 'food_scenario.confidence_invalid' }));
  });
  it('pins an immutable baseline and typed plan/list diffs', () => {
    expect(parseFoodScenario({ id: 'scenario-1', ownerPersonId: 'person-1', version: 1, baseline: { mealPlanId: 'plan-1', mealPlanVersion: 4, groceryListId: 'list-1', groceryListVersion: 2, contentHash: 'sha256:base' }, opportunityIds: ['opp-1'], constraintIds: ['target-1'], mealPlanDiffs: [{ kind: 'replace_meal', entryId: 'entry-1', replacementRecipeVersionId: 'rv-chicken' }], groceryDiffs: [{ kind: 'replace_item', itemId: 'salmon', replacementConcept: 'chicken thighs' }], estimateRangeCents: { min: 5100, max: 5800 }, currentPriceCoveragePercent: 82, evidenceObservedAt: '2026-08-05T12:00:00.000Z', assumptions: ['Same serving count'], lifecycle: 'proposed', contentHash: 'sha256:scenario' })).toMatchObject({ baseline: { mealPlanVersion: 4 }, lifecycle: 'proposed' });
  });
});

function opportunity() { return { id: 'opp-1', ownerPersonId: 'person-1', concept: 'chicken thighs', evidenceMethod: 'photo' as const, provider: null, barcode: null, artifactRef: 'photo-1', sourceUrl: null, transcript: null, retailer: "Smith's", locationId: 'store-1', packageQuantity: 1, packageUnit: 'pound', observedPriceCents: 149, comparableUnitPriceCents: 149, comparableUnit: 'pound', confidence: 0.92, observedAt: '2026-08-05T12:00:00.000Z', expiresAt: '2026-08-06T12:00:00.000Z', state: 'observed' as const }; }

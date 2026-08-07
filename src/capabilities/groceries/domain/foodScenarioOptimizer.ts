export type FoodScenarioOption = {
  kind: 'accept_opportunity'|'do_not_buy'|'keep_baseline'; opportunityId: string | null; reason: string;
  estimateRangeCents: { min: number; max: number }; expectedWasteQuantity: number; staysNearTarget: boolean;
  mealPlanDiff: { entryId: string; recipeVersionId: string } | null; groceryDiff: { itemId: string; replacementConcept: string } | null;
};
export function optimizeFoodScenarios(input: {
  baselineEstimateCents: { min: number; max: number }; tripTargetCents: number | null; stockUseCount: number;
  opportunities: Array<{ id: string; concept: string; currentUnitPriceCents: number; baselineComparableUnitPriceCents: number; quantity: number; expectedUseQuantity: number; storageCapacityQuantity: number; familyAccepted: boolean; replacement: { entryId: string; recipeVersionId: string; groceryItemId: string; replacementConcept: string } | null; extraTripBurdenCents: number }>;
}): FoodScenarioOption[] {
  const evaluated = input.opportunities.map((opportunity): FoodScenarioOption => {
    const usefulQuantity = Math.min(opportunity.quantity, opportunity.expectedUseQuantity, opportunity.storageCapacityQuantity);
    const expectedWasteQuantity = Math.max(0, opportunity.quantity - Math.min(opportunity.expectedUseQuantity, opportunity.storageCapacityQuantity));
    const grossSavings = Math.max(0, (opportunity.baselineComparableUnitPriceCents - opportunity.currentUnitPriceCents) * usefulQuantity);
    const netSavings = Math.max(0, Math.round(grossSavings - opportunity.extraTripBurdenCents));
    const eligible = opportunity.familyAccepted && Boolean(opportunity.replacement) && netSavings > 0 && expectedWasteQuantity <= Math.max(1, opportunity.expectedUseQuantity);
    const estimateRangeCents = eligible ? { min: Math.max(0, input.baselineEstimateCents.min - netSavings), max: Math.max(0, input.baselineEstimateCents.max - netSavings) } : { ...input.baselineEstimateCents };
    return { kind: eligible ? 'accept_opportunity' : 'do_not_buy', opportunityId: opportunity.id, reason: eligible ? `Uses a current comparable price and saves about $${(netSavings / 100).toFixed(0)} before checkout.` : !opportunity.familyAccepted ? 'Skip: this change does not preserve the household meal choice.' : expectedWasteQuantity > 0 ? 'Skip: the package is likely to exceed expected use or storage.' : 'Skip: burden or evidence does not improve the household outcome.', estimateRangeCents, expectedWasteQuantity, staysNearTarget: input.tripTargetCents === null || estimateRangeCents.max <= input.tripTargetCents, mealPlanDiff: eligible && opportunity.replacement ? { entryId: opportunity.replacement.entryId, recipeVersionId: opportunity.replacement.recipeVersionId } : null, groceryDiff: eligible && opportunity.replacement ? { itemId: opportunity.replacement.groceryItemId, replacementConcept: opportunity.replacement.replacementConcept } : null };
  }).sort((a, b) => Number(b.kind === 'accept_opportunity') - Number(a.kind === 'accept_opportunity') || a.estimateRangeCents.max - b.estimateRangeCents.max).slice(0, 2);
  if (evaluated.some((item) => item.kind === 'accept_opportunity')) evaluated.push({ kind: 'keep_baseline', opportunityId: null, reason: `Keep the current plan and its ${input.stockUseCount} stock-supported item${input.stockUseCount === 1 ? '' : 's'}.`, estimateRangeCents: { ...input.baselineEstimateCents }, expectedWasteQuantity: 0, staysNearTarget: input.tripTargetCents === null || input.baselineEstimateCents.max <= input.tripTargetCents, mealPlanDiff: null, groceryDiff: null });
  return evaluated.slice(0, 3);
}

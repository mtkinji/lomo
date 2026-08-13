import type { CartSavingsCandidate, CartSavingsSuggestion } from './savingsContracts';

export function generateCartSavingsSuggestions(candidates: CartSavingsCandidate[], input: { now: string; fulfillmentMode: 'pickup' | 'delivery' }): CartSavingsSuggestion[] {
  const now = Date.parse(input.now);
  return candidates.flatMap((candidate): CartSavingsSuggestion[] => {
    if (candidate.fulfillmentMode !== input.fulfillmentMode || candidate.includesFees || (candidate.expiresAt && Date.parse(candidate.expiresAt) <= now) || (candidate.memberOnly && candidate.membershipConfirmed !== true)) return [];
    let savingsCents = 0;
    let decisionChanges = 0;
    if (candidate.kind === 'selected_promotion') {
      savingsCents = (candidate.regularPriceCents - candidate.promoPriceCents) * candidate.retailQuantity;
    } else {
      if (!candidate.baseUnit || candidate.baseUnit !== candidate.alternativeBaseUnit || candidate.requiredBaseUnits !== candidate.alternativeRequiredBaseUnits) return [];
      savingsCents = candidate.selectedTotalCents - candidate.alternativeTotalCents;
      decisionChanges = candidate.kind === 'reviewed_alternative' ? 1 : 0;
    }
    if (!Number.isSafeInteger(savingsCents) || savingsCents <= 0) return [];
    return [{ id: candidate.id, kind: candidate.kind, productId: candidate.productId, savingsCents, decisionChanges, observedAt: candidate.observedAt, expiresAt: candidate.expiresAt, coverageItemCount: candidate.coverageItemCount, totalCartItemCount: candidate.totalCartItemCount, merchandiseOnly: true }];
  }).sort((left, right) => right.savingsCents - left.savingsCents || left.decisionChanges - right.decisionChanges || left.id.localeCompare(right.id)).slice(0, 3);
}

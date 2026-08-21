export type PostCategorySelectionOutcome = 'offer_rule' | 'return_to_summary' | 'stay';

export function getPersistedMerchantRuleOfferCategoryId(input: {
  direction: 'inflow' | 'outflow';
  categoryId: string | null | undefined;
  matchSource: string | null | undefined;
  existingRuleCategoryId: string | null | undefined;
}): string | null {
  const categoryId = input.categoryId?.trim();
  if (input.direction !== 'outflow' || !categoryId || input.matchSource !== 'corrected') return null;
  return input.existingRuleCategoryId === categoryId ? null : categoryId;
}

export function getPostCategorySelectionOutcome(input: {
  direction: 'inflow' | 'outflow';
  economicRoleReview: boolean;
  existingRuleCategoryId: string | null | undefined;
  selectedCategoryId: string;
}): PostCategorySelectionOutcome {
  if (input.direction === 'outflow' && input.existingRuleCategoryId !== input.selectedCategoryId) {
    return 'offer_rule';
  }
  return input.economicRoleReview ? 'return_to_summary' : 'stay';
}

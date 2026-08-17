export type PostCategorySelectionOutcome = 'offer_rule' | 'return_to_summary' | 'stay';

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

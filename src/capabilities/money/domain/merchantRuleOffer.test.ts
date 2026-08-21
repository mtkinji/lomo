import { getPersistedMerchantRuleOfferCategoryId, getPostCategorySelectionOutcome } from './merchantRuleOffer';

describe('getPostCategorySelectionOutcome', () => {
  it('keeps review-queue transactions open so a changed outflow category can offer a merchant rule', () => {
    expect(getPostCategorySelectionOutcome({
      direction: 'outflow',
      economicRoleReview: true,
      existingRuleCategoryId: null,
      selectedCategoryId: 'shopping',
    })).toBe('offer_rule');
  });

  it('returns to the review summary when the selected category already has the merchant rule', () => {
    expect(getPostCategorySelectionOutcome({
      direction: 'outflow',
      economicRoleReview: true,
      existingRuleCategoryId: 'shopping',
      selectedCategoryId: 'shopping',
    })).toBe('return_to_summary');
  });

  it('stays on an ordinary transaction after a category change when no rule offer is needed', () => {
    expect(getPostCategorySelectionOutcome({
      direction: 'inflow',
      economicRoleReview: false,
      existingRuleCategoryId: null,
      selectedCategoryId: 'income',
    })).toBe('stay');
  });
});

describe('getPersistedMerchantRuleOfferCategoryId', () => {
  it('restores the rule offer after a confirmed category correction survives a refresh', () => {
    expect(getPersistedMerchantRuleOfferCategoryId({
      direction: 'outflow',
      categoryId: 'cars-and-transportation',
      matchSource: 'corrected',
      existingRuleCategoryId: null,
    })).toBe('cars-and-transportation');
  });

  it('does not offer a duplicate rule when the merchant already targets that category', () => {
    expect(getPersistedMerchantRuleOfferCategoryId({
      direction: 'outflow',
      categoryId: 'cars-and-transportation',
      matchSource: 'corrected',
      existingRuleCategoryId: 'cars-and-transportation',
    })).toBeNull();
  });

  it('does not turn an automated category assignment into a user-authored rule offer', () => {
    expect(getPersistedMerchantRuleOfferCategoryId({
      direction: 'outflow',
      categoryId: 'cars-and-transportation',
      matchSource: 'merchant_rule',
      existingRuleCategoryId: null,
    })).toBeNull();
  });
});

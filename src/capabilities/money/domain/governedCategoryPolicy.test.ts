import {
  GOVERNED_STARTER_CATEGORIES,
  resolveGovernedAssignment,
} from './governedCategoryPolicy';

describe('governed starter category policy', () => {
  it('uses one versioned broad template with a governed reserve default', () => {
    expect(GOVERNED_STARTER_CATEGORIES.map(({ slug, fundingRhythm }) => [slug, fundingRhythm])).toEqual([
      ['housing', 'monthly'],
      ['food', 'monthly'],
      ['transportation', 'monthly'],
      ['utilities', 'monthly'],
      ['health', 'monthly'],
      ['family', 'monthly'],
      ['gifts-occasions', 'reserve'],
      ['personal', 'monthly'],
      ['fun', 'monthly'],
      ['debt-fees', 'monthly'],
      ['other', 'monthly'],
    ]);
    expect(GOVERNED_STARTER_CATEGORIES.reduce((sum, category) => sum + category.starterWeight, 0))
      .toBeCloseTo(1, 8);
  });
});

describe('resolveGovernedAssignment', () => {
  it('preserves the first governed authority before provider inference', () => {
    expect(resolveGovernedAssignment({
      splitCategoryId: 'split-category',
      correctedCategoryId: 'corrected-category',
      merchantRuleCategoryId: 'rule-category',
      providerPrimary: 'FOOD_AND_DRINK',
      providerDetailed: 'FOOD_AND_DRINK_GROCERIES',
      providerConfidence: 'VERY_HIGH',
    })).toEqual({ categorySlug: 'split-category', source: 'split', governed: true });

    expect(resolveGovernedAssignment({
      excluded: true,
      merchantRuleCategoryId: 'rule-category',
      providerPrimary: 'FOOD_AND_DRINK',
      providerConfidence: 'VERY_HIGH',
    })).toEqual({ source: 'exclusion', governed: true, excluded: true });

    expect(resolveGovernedAssignment({
      merchantRuleCategoryId: 'rule-category',
      providerPrimary: 'FOOD_AND_DRINK',
      providerConfidence: 'VERY_HIGH',
    })).toEqual({ categorySlug: 'rule-category', source: 'merchant_rule', governed: true });
  });

  it('maps phone into Utilities without creating a Phone category', () => {
    expect(resolveGovernedAssignment({
      providerPrimary: 'RENT_AND_UTILITIES',
      providerDetailed: 'RENT_AND_UTILITIES_TELEPHONE',
      providerConfidence: 'HIGH',
    })).toEqual({ categorySlug: 'utilities', source: 'provider_policy', governed: false });
  });

  it('uses Other conservatively only for supported spending evidence', () => {
    expect(resolveGovernedAssignment({
      providerPrimary: 'GENERAL_MERCHANDISE',
      providerDetailed: 'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE',
      providerConfidence: 'HIGH',
    })).toEqual({ categorySlug: 'personal', source: 'provider_policy', governed: false });

    expect(resolveGovernedAssignment({
      providerPrimary: 'UNKNOWN',
      providerConfidence: 'MEDIUM',
    })).toEqual({ source: 'needs_review', governed: false });
  });
});

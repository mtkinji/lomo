import {
  GOVERNED_CATEGORY_POLICY_VERSION,
  GOVERNED_STARTER_CATEGORIES,
  resolveGovernedAssignment,
  selectGovernedStarterCategories,
} from './governedCategoryPolicy';

describe('governed starter category policy', () => {
  it('uses one versioned canonical core set with a governed reserve default', () => {
    expect(GOVERNED_CATEGORY_POLICY_VERSION).toBe('governed-category-v2');
    expect(GOVERNED_STARTER_CATEGORIES.map(({ slug, fundingRhythm, activation }) => [slug, fundingRhythm, activation])).toEqual([
      ['housing', 'monthly', 'core'],
      ['utilities', 'monthly', 'core'],
      ['groceries', 'monthly', 'core'],
      ['dining', 'monthly', 'core'],
      ['transportation', 'monthly', 'core'],
      ['health-insurance', 'monthly', 'core'],
      ['family-care', 'monthly', 'core'],
      ['shopping-personal', 'monthly', 'core'],
      ['entertainment-subscriptions', 'monthly', 'core'],
      ['travel-gifts-occasions', 'reserve', 'core'],
      ['debt-fees', 'monthly', 'core'],
      ['other-spending', 'monthly', 'core'],
      ['work-business', 'monthly', 'conditional'],
    ]);
    expect(GOVERNED_STARTER_CATEGORIES
      .filter((category) => category.activation === 'core')
      .reduce((sum, category) => sum + category.starterWeight, 0))
      .toBeCloseTo(1, 8);
  });

  it('activates Work & business only from high-confidence business evidence', () => {
    const ordinary = selectGovernedStarterCategories([{
      providerPrimary: 'GENERAL_MERCHANDISE',
      providerDetailed: 'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE',
      providerConfidence: 'VERY_HIGH',
    }]);
    expect(ordinary.some((category) => category.slug === 'work-business')).toBe(false);

    const business = selectGovernedStarterCategories([{
      providerPrimary: 'GENERAL_SERVICES',
      providerDetailed: 'GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING',
      providerConfidence: 'HIGH',
    }]);
    expect(business.some((category) => category.slug === 'work-business')).toBe(true);

    const weakBusiness = selectGovernedStarterCategories([{
      providerPrimary: 'GENERAL_SERVICES',
      providerDetailed: 'GENERAL_SERVICES_BUSINESS_SERVICES',
      providerConfidence: 'MEDIUM',
    }]);
    expect(weakBusiness.some((category) => category.slug === 'work-business')).toBe(false);
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

  it('distinguishes groceries, dining, and work expenses inside the canonical set', () => {
    expect(resolveGovernedAssignment({
      providerPrimary: 'FOOD_AND_DRINK',
      providerDetailed: 'FOOD_AND_DRINK_GROCERIES',
      providerConfidence: 'HIGH',
    })).toMatchObject({ categorySlug: 'groceries' });
    expect(resolveGovernedAssignment({
      providerPrimary: 'FOOD_AND_DRINK',
      providerDetailed: 'FOOD_AND_DRINK_RESTAURANT',
      providerConfidence: 'HIGH',
    })).toMatchObject({ categorySlug: 'dining' });
    expect(resolveGovernedAssignment({
      providerPrimary: 'GENERAL_SERVICES',
      providerDetailed: 'GENERAL_SERVICES_BUSINESS_SERVICES',
      providerConfidence: 'VERY_HIGH',
    })).toMatchObject({ categorySlug: 'work-business' });
  });

  it('uses Other conservatively only for supported spending evidence', () => {
    expect(resolveGovernedAssignment({
      providerPrimary: 'GENERAL_MERCHANDISE',
      providerDetailed: 'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE',
      providerConfidence: 'HIGH',
    })).toEqual({ categorySlug: 'shopping-personal', source: 'provider_policy', governed: false });

    expect(resolveGovernedAssignment({
      providerPrimary: 'UNKNOWN',
      providerConfidence: 'MEDIUM',
    })).toEqual({ source: 'needs_review', governed: false });
  });
});

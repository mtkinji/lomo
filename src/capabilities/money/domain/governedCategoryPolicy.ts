import type { CategoryFundingRhythm } from './categoryFunding';

export const GOVERNED_CATEGORY_POLICY_VERSION = 'governed-category-v2';

export type GovernedCategoryActivation = 'core' | 'conditional';

export type GovernedStarterCategory = {
  slug: string;
  name: string;
  starterWeight: number;
  fundingRhythm: CategoryFundingRhythm;
  activation: GovernedCategoryActivation;
  mappingTags: readonly string[];
};

export const GOVERNED_STARTER_CATEGORIES: readonly GovernedStarterCategory[] = [
  { slug: 'housing', name: 'Housing', starterWeight: 0.26, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['housing'] },
  { slug: 'utilities', name: 'Utilities', starterWeight: 0.09, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['utilities', 'connectivity'] },
  { slug: 'groceries', name: 'Groceries', starterWeight: 0.14, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['food_at_home'] },
  { slug: 'dining', name: 'Dining', starterWeight: 0.06, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['food_away'] },
  { slug: 'transportation', name: 'Transportation', starterWeight: 0.11, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['transportation'] },
  { slug: 'health-insurance', name: 'Health & insurance', starterWeight: 0.08, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['health', 'insurance'] },
  { slug: 'family-care', name: 'Family & care', starterWeight: 0.07, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['family', 'childcare', 'education'] },
  { slug: 'shopping-personal', name: 'Shopping & personal', starterWeight: 0.06, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['shopping', 'personal'] },
  { slug: 'entertainment-subscriptions', name: 'Entertainment & subscriptions', starterWeight: 0.04, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['entertainment', 'subscriptions'] },
  { slug: 'travel-gifts-occasions', name: 'Travel, gifts & occasions', starterWeight: 0.04, fundingRhythm: 'reserve', activation: 'core', mappingTags: ['travel', 'gifts', 'holidays'] },
  { slug: 'debt-fees', name: 'Debt & fees', starterWeight: 0.03, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['debt', 'fees'] },
  { slug: 'other-spending', name: 'Other spending', starterWeight: 0.02, fundingRhythm: 'monthly', activation: 'core', mappingTags: ['other_spending'] },
  { slug: 'work-business', name: 'Work & business', starterWeight: 0.05, fundingRhythm: 'monthly', activation: 'conditional', mappingTags: ['work_business'] },
] as const;

type ProviderCategoryEvidence = {
  providerPrimary?: string | null;
  providerDetailed?: string | null;
  providerConfidence?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | null;
};

export function selectGovernedStarterCategories(
  evidence: readonly ProviderCategoryEvidence[],
): readonly GovernedStarterCategory[] {
  const hasSupportedBusinessSpend = evidence.some((item) =>
    (item.providerConfidence === 'HIGH' || item.providerConfidence === 'VERY_HIGH')
    && providerMappingTag(item.providerPrimary, item.providerDetailed) === 'work_business'
  );
  return GOVERNED_STARTER_CATEGORIES.filter((category) =>
    category.activation === 'core' || (category.slug === 'work-business' && hasSupportedBusinessSpend)
  );
}

export type GovernedAssignment =
  | { categorySlug: string; source: 'split' | 'correction' | 'merchant_rule' | 'household_mapping' | 'confirmed_chain'; governed: true }
  | { source: 'exclusion' | 'canonical_relationship'; governed: true; excluded: true }
  | { categorySlug: string; source: 'provider_policy'; governed: false }
  | { source: 'needs_review'; governed: false };

export function resolveGovernedAssignment(input: {
  splitCategoryId?: string | null;
  correctedCategoryId?: string | null;
  excluded?: boolean;
  merchantRuleCategoryId?: string | null;
  householdMappingCategoryId?: string | null;
  confirmedCategoryId?: string | null;
  canonicalRelationship?: 'transfer' | 'refund' | 'pending_settled' | null;
  providerPrimary?: string | null;
  providerDetailed?: string | null;
  providerConfidence?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | null;
}): GovernedAssignment {
  const split = clean(input.splitCategoryId);
  if (split) return { categorySlug: split, source: 'split', governed: true };
  const corrected = clean(input.correctedCategoryId);
  if (corrected) return { categorySlug: corrected, source: 'correction', governed: true };
  if (input.excluded) return { source: 'exclusion', governed: true, excluded: true };
  const merchantRule = clean(input.merchantRuleCategoryId);
  if (merchantRule) return { categorySlug: merchantRule, source: 'merchant_rule', governed: true };
  const householdMapping = clean(input.householdMappingCategoryId);
  if (householdMapping) return { categorySlug: householdMapping, source: 'household_mapping', governed: true };
  const confirmed = clean(input.confirmedCategoryId);
  if (confirmed) return { categorySlug: confirmed, source: 'confirmed_chain', governed: true };
  if (input.canonicalRelationship) {
    return { source: 'canonical_relationship', governed: true, excluded: true };
  }
  if (input.providerConfidence !== 'HIGH' && input.providerConfidence !== 'VERY_HIGH') {
    return { source: 'needs_review', governed: false };
  }
  return {
    categorySlug: mapProviderCategory(input.providerPrimary, input.providerDetailed),
    source: 'provider_policy',
    governed: false,
  };
}

function mapProviderCategory(primary: string | null | undefined, detailed: string | null | undefined): string {
  const tag = providerMappingTag(primary, detailed);
  if (tag === 'food_at_home') return 'groceries';
  if (tag === 'food_away') return 'dining';
  if (tag === 'health' || tag === 'insurance') return 'health-insurance';
  if (tag === 'family' || tag === 'childcare' || tag === 'education') return 'family-care';
  if (tag === 'shopping' || tag === 'personal') return 'shopping-personal';
  if (tag === 'entertainment' || tag === 'subscriptions') return 'entertainment-subscriptions';
  if (tag === 'travel' || tag === 'gifts') return 'travel-gifts-occasions';
  if (tag === 'debt') return 'debt-fees';
  if (tag === 'work_business') return 'work-business';
  if (tag) return tag;
  return 'other-spending';
}

function providerMappingTag(primary: string | null | undefined, detailed: string | null | undefined): string | null {
  const value = `${primary ?? ''} ${detailed ?? ''}`.toUpperCase();
  const detailedValue = `${detailed ?? ''}`.toUpperCase();
  if (/BUSINESS_SERVICES|OFFICE_SUPPLIES|ACCOUNTING_AND_FINANCIAL_PLANNING|ADVERTISING_AND_MARKETING/.test(value)) return 'work_business';
  if (/GAS_STATION|PARKING|PUBLIC_TRANSIT|TRANSPORT|AUTOMOTIVE/.test(value)) return 'transportation';
  if (/TELEPHONE|INTERNET|CABLE|ELECTRIC|GAS|UTILIT/.test(detailedValue)) return 'utilities';
  if (/RENT|MORTGAGE|HOME_IMPROVEMENT/.test(value)) return 'housing';
  if (/GROCER/.test(value)) return 'food_at_home';
  if (/RESTAURANT|COFFEE|FAST_FOOD|FOOD_AND_DRINK/.test(value)) return 'food_away';
  if (/MEDICAL|HEALTH|PHARMAC/.test(value)) return 'health';
  if (/INSURANCE/.test(value)) return 'insurance';
  if (/CHILDCARE/.test(value)) return 'childcare';
  if (/EDUCATION/.test(value)) return 'education';
  if (/GIFT|DONATION/.test(value)) return 'gifts';
  if (/TRAVEL/.test(value)) return 'travel';
  if (/SUBSCRIPTION/.test(value)) return 'subscriptions';
  if (/ENTERTAINMENT|RECREATION/.test(value)) return 'entertainment';
  if (/GENERAL_MERCHANDISE|PERSONAL_CARE|CLOTHING/.test(value)) return 'shopping';
  if (/LOAN|DEBT|BANK_FEES|INTEREST/.test(value)) return 'debt';
  return null;
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

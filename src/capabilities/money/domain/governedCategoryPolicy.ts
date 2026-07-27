import type { CategoryFundingRhythm } from './categoryFunding';

export const GOVERNED_CATEGORY_POLICY_VERSION = 'governed-category-v1';

export type GovernedStarterCategory = {
  slug: string;
  name: string;
  starterWeight: number;
  fundingRhythm: CategoryFundingRhythm;
};

export const GOVERNED_STARTER_CATEGORIES: readonly GovernedStarterCategory[] = [
  { slug: 'housing', name: 'Housing', starterWeight: 0.28, fundingRhythm: 'monthly' },
  { slug: 'food', name: 'Food', starterWeight: 0.18, fundingRhythm: 'monthly' },
  { slug: 'transportation', name: 'Transportation', starterWeight: 0.12, fundingRhythm: 'monthly' },
  { slug: 'utilities', name: 'Utilities', starterWeight: 0.1, fundingRhythm: 'monthly' },
  { slug: 'health', name: 'Health', starterWeight: 0.08, fundingRhythm: 'monthly' },
  { slug: 'family', name: 'Family', starterWeight: 0.07, fundingRhythm: 'monthly' },
  { slug: 'gifts-occasions', name: 'Gifts and occasions', starterWeight: 0.05, fundingRhythm: 'reserve' },
  { slug: 'personal', name: 'Personal', starterWeight: 0.04, fundingRhythm: 'monthly' },
  { slug: 'fun', name: 'Fun', starterWeight: 0.04, fundingRhythm: 'monthly' },
  { slug: 'debt-fees', name: 'Debt and fees', starterWeight: 0.02, fundingRhythm: 'monthly' },
  { slug: 'other', name: 'Other', starterWeight: 0.02, fundingRhythm: 'monthly' },
] as const;

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
  const value = `${primary ?? ''} ${detailed ?? ''}`.toUpperCase();
  if (/TELEPHONE|INTERNET|CABLE|ELECTRIC|GAS|UTILIT/.test(value)) return 'utilities';
  if (/RENT|MORTGAGE|HOME_IMPROVEMENT/.test(value)) return 'housing';
  if (/GROCER|FOOD_AND_DRINK|RESTAURANT/.test(value)) return 'food';
  if (/TRANSPORT|AUTOMOTIVE|GAS_STATION|PARKING|PUBLIC_TRANSIT/.test(value)) return 'transportation';
  if (/MEDICAL|HEALTH|PHARMAC/.test(value)) return 'health';
  if (/CHILDCARE|EDUCATION/.test(value)) return 'family';
  if (/GIFT|DONATION/.test(value)) return 'gifts-occasions';
  if (/GENERAL_MERCHANDISE|PERSONAL_CARE|CLOTHING/.test(value)) return 'personal';
  if (/ENTERTAINMENT|RECREATION|TRAVEL/.test(value)) return 'fun';
  if (/LOAN|DEBT|BANK_FEES|INTEREST/.test(value)) return 'debt-fees';
  return 'other';
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

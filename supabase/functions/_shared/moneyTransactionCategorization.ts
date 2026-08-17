export type DeterministicCategory = {
  id: string;
  aliases: string[];
  mappingTags: string[];
};

export type DeterministicCategoryCandidate = {
  merchant: string;
  providerPrimary: string | null;
  providerDetailed: string | null;
  providerConfidence: string | null;
};

export type DeterministicCategoryHistory = {
  merchant: string;
  categoryId: string;
  pending: boolean;
};

export type DeterministicCategoryDecision =
  | {
      outcome: 'assigned';
      categoryId: string;
      source: 'provider_policy' | 'merchant_history';
      confidence: 'high';
      reasonCode: 'high_confidence_provider_mapping' | 'consistent_household_history';
    }
  | { outcome: 'unresolved'; reasonCode: 'insufficient_evidence' };

export function resolveDeterministicMoneyCategory(input: {
  candidate: DeterministicCategoryCandidate;
  categories: DeterministicCategory[];
  history: DeterministicCategoryHistory[];
}): DeterministicCategoryDecision {
  const providerTag = providerMappingTag(input.candidate);
  if (providerTag) {
    const category = input.categories.find((row) =>
      [...row.mappingTags, ...row.aliases].some((value) => normalizeTag(value) === providerTag)
    );
    if (category) {
      return {
        outcome: 'assigned',
        categoryId: category.id,
        source: 'provider_policy',
        confidence: 'high',
        reasonCode: 'high_confidence_provider_mapping',
      };
    }
  }

  const activeCategoryIds = new Set(input.categories.map((row) => row.id));
  const merchantKey = normalizeMerchantForCategorization(input.candidate.merchant);
  const matchingHistory = input.history.filter((row) =>
    !row.pending
    && activeCategoryIds.has(row.categoryId)
    && normalizeMerchantForCategorization(row.merchant) === merchantKey
  );
  const categoryIds = new Set(matchingHistory.map((row) => row.categoryId));
  if (merchantKey && matchingHistory.length >= 2 && categoryIds.size === 1) {
    return {
      outcome: 'assigned',
      categoryId: matchingHistory[0].categoryId,
      source: 'merchant_history',
      confidence: 'high',
      reasonCode: 'consistent_household_history',
    };
  }

  return { outcome: 'unresolved', reasonCode: 'insufficient_evidence' };
}

export function normalizeMerchantForCategorization(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bamzn\b/g, 'amazon')
    .replace(/\bmktp\b/g, 'marketplace')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((part) => part && part !== 'us' && !/^[a-z]*\d+[a-z0-9]*$/.test(part))
    .slice(0, 3)
    .join(' ')
    .trim();
}

export function nextMoneyClassificationRetryIso(
  nowIso: string,
  attemptCount: number,
  outcome: 'unresolved' | 'retryable_failure',
): string {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) throw new Error('Classification retry time is invalid.');
  const delayMs = outcome === 'unresolved'
    ? 7 * 24 * 60 * 60 * 1000
    : Math.min(24, Math.max(1, 2 ** Math.max(0, Math.floor(attemptCount) - 1))) * 60 * 60 * 1000;
  return new Date(nowMs + delayMs).toISOString();
}

function providerMappingTag(candidate: DeterministicCategoryCandidate): string | null {
  if (candidate.providerConfidence !== 'HIGH' && candidate.providerConfidence !== 'VERY_HIGH') return null;
  const evidence = `${candidate.providerPrimary ?? ''} ${candidate.providerDetailed ?? ''}`.toUpperCase();
  if (/(TELEPHONE|INTERNET|CABLE|ELECTRIC|GAS|UTILIT)/.test(evidence)) return 'utilities';
  if (/(RENT|MORTGAGE|HOME_IMPROVEMENT)/.test(evidence)) return 'housing';
  if (/(GROCER|FOOD_AND_DRINK|RESTAURANT)/.test(evidence)) return 'food_at_home';
  if (/(TRANSPORT|AUTOMOTIVE|GAS_STATION|PARKING|PUBLIC_TRANSIT)/.test(evidence)) return 'transportation';
  if (/(MEDICAL|HEALTH|PHARMAC)/.test(evidence)) return 'health';
  if (/(CHILDCARE|EDUCATION)/.test(evidence)) return 'family';
  if (/(GIFT|DONATION)/.test(evidence)) return 'gifts';
  if (/(GENERAL_MERCHANDISE|PERSONAL_CARE|CLOTHING)/.test(evidence)) return 'shopping';
  if (/(ENTERTAINMENT|RECREATION|TRAVEL)/.test(evidence)) return 'entertainment';
  if (/(LOAN|DEBT|BANK_FEES|INTEREST)/.test(evidence)) return 'debt';
  return null;
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

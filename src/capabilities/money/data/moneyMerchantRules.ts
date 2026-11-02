import type { MoneyRuleRow } from './moneySnapshot';

/** One matcher per snapshot: rule preparation and repeated merchant names are reused,
 * but edits or a different household can never inherit a previous snapshot's matches. */
export function createMerchantRuleMatcher(rules: MoneyRuleRow[]): (merchant: string, description?: string, name?: string, direction?: 'inflow' | 'outflow') => MoneyRuleRow | undefined {
  if (!rules.length) return () => undefined;
  const prepared = [...rules].sort((left, right) =>
    Number(right.merchant_match_mode === 'exact') - Number(left.merchant_match_mode === 'exact')
    || (right.updated_at ?? '').localeCompare(left.updated_at ?? '')
    || right.id.localeCompare(left.id)).map((rule) => ({
    rule,
    exact: rule.merchant_match_mode === 'exact',
    full: rule.match_version === 'contains_v2',
    key: rule.merchant_match_mode === 'exact' || rule.match_version === 'contains_v2'
      ? normalizeMerchant(rule.merchant_contains)
      : partialMerchantKey(normalizeMerchant(rule.merchant_contains)),
  }));
  const matches = new Map<string, MoneyRuleRow | undefined>();
  const usesDescriptions = prepared.some(({ exact, full }) => !exact && full);
  return (merchant, description, name, direction = 'outflow') => {
    const cacheKey = usesDescriptions ? JSON.stringify([merchant, description, name, direction]) : `${direction}:${merchant}`;
    if (matches.has(cacheKey)) return matches.get(cacheKey);
    const normalized = normalizeMerchant(merchant);
    const partial = partialMerchantKey(normalized);
    const descriptions = usesDescriptions ? [normalized, normalizeMerchant(description ?? ''), normalizeMerchant(name ?? '')] : [];
    // Match the server's exact/recency precedence and direction eligibility.
    const match = prepared.find(({ rule, exact, full, key }) =>
      (direction === 'outflow' || rule.rule_kind === 'transfer') && (exact
        ? key === normalized
        : Boolean(key && (full ? descriptions.some((value) => value.includes(key)) : partial.includes(key)))))?.rule;
    matches.set(cacheKey, match);
    return match;
  };
}

function normalizeMerchant(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const GENERIC_MERCHANT_WORDS = new Set(['co', 'company', 'food', 'foods', 'inc', 'llc', 'market', 'marketplace', 'mktpl', 'store', 'the']);

function partialMerchantKey(normalized: string): string {
  return normalized.split(' ')
    .filter((word) => word && !/^[0-9]+$/.test(word) && !GENERIC_MERCHANT_WORDS.has(word))
    .slice(0, 2)
    .join(' ');
}

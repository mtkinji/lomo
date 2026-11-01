import type { MoneyRuleRow } from './moneySnapshot';

/** One matcher per snapshot: rule preparation and repeated merchant names are reused,
 * but edits or a different household can never inherit a previous snapshot's matches. */
export function createMerchantRuleMatcher(rules: MoneyRuleRow[]): (merchant: string) => MoneyRuleRow | undefined {
  if (!rules.length) return () => undefined;
  const prepared = rules.map((rule) => ({
    rule,
    exact: rule.merchant_match_mode === 'exact',
    key: rule.merchant_match_mode === 'exact'
      ? normalizeMerchant(rule.merchant_contains)
      : partialMerchantKey(normalizeMerchant(rule.merchant_contains)),
  }));
  const matches = new Map<string, MoneyRuleRow | undefined>();
  return (merchant) => {
    if (matches.has(merchant)) return matches.get(merchant);
    const normalized = normalizeMerchant(merchant);
    const partial = partialMerchantKey(normalized);
    // Preserve server order across exact and partial rules, including unmatched
    // category references. Preferring exact matches would change existing behavior.
    const match = prepared.find(({ exact, key }) => exact
      ? key === normalized
      : Boolean(key && partial && partial.includes(key)))?.rule;
    matches.set(merchant, match);
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

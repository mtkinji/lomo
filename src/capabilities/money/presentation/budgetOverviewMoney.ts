import { formatMoney } from '../data/moneySnapshot';

/**
 * Budget overview values are glanceable estimates. Transaction and audit
 * surfaces continue to use exact cents through formatMoney directly.
 */
export function formatBudgetOverviewMoney(cents: number, currencyCode = 'USD'): string {
  return formatMoney(Math.round(cents / 100) * 100, currencyCode);
}

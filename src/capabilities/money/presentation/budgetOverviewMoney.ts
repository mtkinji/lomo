import { formatMoney } from '../data/moneySnapshot';

/**
 * Budget overview values are glanceable estimates. Transaction and audit
 * surfaces continue to use exact cents through formatMoney directly.
 */
export function formatBudgetOverviewMoney(cents: number, currencyCode = 'USD'): string {
  return formatMoney(Math.round(cents / 100) * 100, currencyCode);
}

export function formatIncomeSpendingDifference(
  incomeReceivedCents: number,
  totalSpendingCents: number,
  currencyCode = 'USD',
): string {
  const differenceCents = Math.round(incomeReceivedCents) - Math.round(totalSpendingCents);
  return formatBudgetOverviewMoney(differenceCents, currencyCode);
}

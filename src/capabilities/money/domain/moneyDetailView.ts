import type { MoneyTransaction } from '../data/moneySnapshot';
import { normalizeExactMerchant, normalizePartialMerchant } from '../data/moneyMutations';

export type MoneySpendPoint = { xPercent: number; valueCents: number };
export type MoneyTransactionDateGroup = { dateIso: string; label: string; transactions: MoneyTransaction[] };

export function buildCumulativeSpendSeries(
  transactions: MoneyTransaction[],
  periodStartIso: string,
  periodEndIso: string,
): MoneySpendPoint[] {
  const start = parseDay(periodStartIso);
  const end = parseDay(periodEndIso);
  if (!start || !end || end <= start) return [];
  const span = end.getTime() - start.getTime();
  let cumulative = 0;

  return transactions
    .filter((transaction) => !transaction.pending && transaction.date >= periodStartIso && transaction.date <= periodEndIso)
    .sort((left, right) => left.date.localeCompare(right.date))
    .flatMap((transaction) => {
      const delta = transaction.direction === 'outflow' && transaction.moneyMeaning !== 'not_counted' && transaction.moneyMeaning !== 'transfer'
        ? transaction.amountCents
        : transaction.direction === 'inflow' && transaction.moneyMeaning === 'category_credit'
          ? -transaction.amountCents
          : 0;
      if (delta === 0) return [];
      cumulative = Math.max(0, cumulative + delta);
      const date = parseDay(transaction.date);
      if (!date) return [];
      return [{
        xPercent: Math.round(Math.max(0, Math.min(100, ((date.getTime() - start.getTime()) / span) * 100)) * 100) / 100,
        valueCents: cumulative,
      }];
    });
}

export function groupMoneyTransactionsByDate(transactions: MoneyTransaction[]): MoneyTransactionDateGroup[] {
  const byDate = new Map<string, MoneyTransaction[]>();
  transactions
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .forEach((transaction) => byDate.set(transaction.date, [...(byDate.get(transaction.date) ?? []), transaction]));
  return [...byDate.entries()].map(([dateIso, rows]) => ({
    dateIso,
    label: formatActivityDate(dateIso),
    transactions: rows,
  }));
}

export function getSimilarMerchantTransactions(
  transactions: MoneyTransaction[],
  selected: MoneyTransaction,
  mode: 'exact' | 'partial',
): MoneyTransaction[] {
  const target = mode === 'exact'
    ? normalizeExactMerchant(selected.merchantName)
    : normalizePartialMerchant(selected.merchantName);
  if (!target) return [];
  return transactions.filter((transaction) => {
    if (transaction.id === selected.id) return false;
    const candidate = mode === 'exact'
      ? normalizeExactMerchant(transaction.merchantName)
      : normalizePartialMerchant(transaction.merchantName);
    return mode === 'exact' ? candidate === target : Boolean(candidate && candidate.includes(target));
  });
}

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatActivityDate(dateIso: string): string {
  const date = parseDay(dateIso);
  return date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : dateIso;
}

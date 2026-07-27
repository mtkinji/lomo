import type { MoneyTransaction } from '../data/moneySnapshot';
import { normalizeExactMerchant, normalizePartialMerchant } from '../data/moneyMutations';

export type MoneySpendPoint = { xPercent: number; valueCents: number };
export type HistoricalAverageSpend = { monthsUsed: number; series: MoneySpendPoint[] };
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
      const delta = getCountedSpendDeltaCents(transaction);
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

export function buildHistoricalAverageSpendSeries(input: {
  transactions: MoneyTransaction[];
  periodStartIso: string;
  periodEndIso: string;
  maxMonths?: number;
}): HistoricalAverageSpend {
  const periodStart = parseDay(input.periodStartIso);
  const periodEnd = parseDay(input.periodEndIso);
  if (!periodStart || !periodEnd || periodEnd <= periodStart) return { monthsUsed: 0, series: [] };

  const maxMonths = Number.isFinite(input.maxMonths)
    ? Math.max(1, Math.floor(input.maxMonths ?? 12))
    : 12;
  const currentMonthStart = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1));
  const earliestMonthStart = new Date(Date.UTC(
    currentMonthStart.getUTCFullYear(),
    currentMonthStart.getUTCMonth() - maxMonths,
    1,
  ));
  const earliestMonthKey = formatMonthKey(earliestMonthStart);
  const currentMonthKey = formatMonthKey(currentMonthStart);
  const rowsByMonth = new Map<string, MoneyTransaction[]>();

  input.transactions.forEach((transaction) => {
    if (transaction.pending || getCountedSpendDeltaCents(transaction) === 0) return;
    const date = parseDay(transaction.date);
    if (!date) return;
    const monthKey = transaction.date.slice(0, 7);
    if (monthKey < earliestMonthKey || monthKey >= currentMonthKey) return;
    rowsByMonth.set(monthKey, [...(rowsByMonth.get(monthKey) ?? []), transaction]);
  });

  const monthSeries = [...rowsByMonth.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, transactions]) => buildHistoricalMonthSeries(monthKey, transactions))
    .filter((series) => series.length > 0);
  if (monthSeries.length === 0) return { monthsUsed: 0, series: [] };

  const displayedDayCount = differenceInUtcDays(periodStart, periodEnd) + 1;
  if (displayedDayCount < 2) return { monthsUsed: 0, series: [] };
  const series = Array.from({ length: displayedDayCount }, (_, dayIndex) => {
    const xPercent = roundPercent(dayIndex / (displayedDayCount - 1) * 100);
    const averageValueCents = monthSeries.reduce(
      (total, historicalSeries) => total + interpolateSpendValue(historicalSeries, xPercent),
      0,
    ) / monthSeries.length;
    return { xPercent, valueCents: Math.max(0, Math.round(averageValueCents)) };
  });

  return { monthsUsed: monthSeries.length, series };
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

function getCountedSpendDeltaCents(transaction: MoneyTransaction): number {
  if (transaction.direction === 'outflow' && transaction.moneyMeaning !== 'not_counted' && transaction.moneyMeaning !== 'transfer') {
    return transaction.amountCents;
  }
  return transaction.direction === 'inflow' && transaction.moneyMeaning === 'category_credit'
    ? -transaction.amountCents
    : 0;
}

function buildHistoricalMonthSeries(monthKey: string, transactions: MoneyTransaction[]): MoneySpendPoint[] {
  const monthStart = parseDay(`${monthKey}-01`);
  if (!monthStart) return [];
  const dayCount = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const deltasByDay = new Map<number, number>();
  transactions.forEach((transaction) => {
    const date = parseDay(transaction.date);
    if (!date) return;
    const dayIndex = date.getUTCDate() - 1;
    deltasByDay.set(dayIndex, (deltasByDay.get(dayIndex) ?? 0) + getCountedSpendDeltaCents(transaction));
  });
  let cumulativeCents = 0;
  return Array.from({ length: dayCount }, (_, dayIndex) => {
    cumulativeCents = Math.max(0, cumulativeCents + (deltasByDay.get(dayIndex) ?? 0));
    return {
      xPercent: roundPercent(dayIndex / Math.max(1, dayCount - 1) * 100),
      valueCents: cumulativeCents,
    };
  });
}

function interpolateSpendValue(series: MoneySpendPoint[], xPercent: number): number {
  if (series.length === 0) return 0;
  if (xPercent <= series[0].xPercent) return series[0].valueCents;
  for (let index = 1; index < series.length; index += 1) {
    const right = series[index];
    if (xPercent > right.xPercent) continue;
    const left = series[index - 1];
    const span = Math.max(0.0001, right.xPercent - left.xPercent);
    const progress = (xPercent - left.xPercent) / span;
    return left.valueCents + (right.valueCents - left.valueCents) * progress;
  }
  return series[series.length - 1].valueCents;
}

function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function differenceInUtcDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatActivityDate(dateIso: string): string {
  const date = parseDay(dateIso);
  return date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : dateIso;
}

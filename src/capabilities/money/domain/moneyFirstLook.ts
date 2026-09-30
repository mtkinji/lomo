import type { MoneyTransaction } from '../data/moneySnapshot';
import { isPostedOutflow } from './transactionCounting';

export type MoneyFirstLook = {
  amountCents: number;
  currencyCode: string;
  transactionIds: string[];
  startDate: string;
  endDate: string;
};

/** A gross posted-outflow observation, not net spending, savings or a cash forecast. */
export function buildMoneyFirstLook(transactions: MoneyTransaction[], accountIds: string[]): MoneyFirstLook | null {
  const accounts = new Set(accountIds);
  const seen = new Set<string>();
  const eligible = transactions.filter((transaction) => {
    if (!transaction.accountId || !accounts.has(transaction.accountId) || seen.has(transaction.id)
      || !isPostedOutflow(transaction) || !Number.isSafeInteger(transaction.amountCents) || transaction.amountCents <= 0
      || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
      || !Number.isFinite(Date.parse(`${transaction.date}T12:00:00Z`))) return false;
    seen.add(transaction.id);
    return true;
  });
  if (!eligible.length) return null;
  const currencies = new Set(eligible.map(({ currencyCode }) => currencyCode));
  if (currencies.size !== 1 || !/^[A-Z]{3}$/.test(eligible[0].currencyCode)) return null;
  const amountCents = eligible.reduce((total, transaction) => total + transaction.amountCents, 0);
  if (!Number.isSafeInteger(amountCents)) return null;
  const dates = eligible.map(({ date }) => date).sort();
  return { amountCents, currencyCode: eligible[0].currencyCode, transactionIds: eligible.map(({ id }) => id), startDate: dates[0], endDate: dates[dates.length - 1] };
}

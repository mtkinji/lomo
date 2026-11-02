import { isCommittedOutflow, type CountableMoneyTransaction } from './transactionCounting';

type ReserveTransaction = CountableMoneyTransaction & {
  date: string; categoryId: string | null; amountCents: number; savedResourceCents?: number | null;
  allocations?: Array<{ sourceCategoryId: string; amountCents: number }>;
};
const cents = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

/** Keep signed credits across the whole anchor period; clamp only the final net spend. */
export function countedReserveSpend<T>(input: {
  transactions: T[]; read: (transaction: T) => ReserveTransaction;
  categoryId: string; categorySourceId: string; startPeriodId: string; endPeriodId: string;
}): number {
  let net = 0;
  for (const row of input.transactions) {
    const transaction = input.read(row);
    const period = transaction.date.slice(0, 7);
    if (period < input.startPeriodId || period > input.endPeriodId) continue;
    const amount = cents(transaction.amountCents);
    const covered = isCommittedOutflow(transaction) ? Math.max(0, amount - cents(transaction.savedResourceCents ?? 0)) : amount;
    const direct = transaction.categoryId === input.categoryId || transaction.categoryId === input.categorySourceId;
    if (direct) {
      if (isCommittedOutflow(transaction)) net += covered;
      if (!transaction.pending && transaction.direction === 'inflow' && transaction.moneyMeaning === 'category_credit') net -= amount;
    }
    const allocation = transaction.allocations?.find((part) => part.sourceCategoryId === input.categorySourceId);
    if (allocation) {
      const total = transaction.allocations!.reduce((sum, part) => sum + part.amountCents, 0);
      if (total > 0) net += Math.floor(covered * allocation.amountCents / total);
    }
  }
  return Math.max(0, net);
}

import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { reconcileMoneyEconomicRoles } from './moneyEconomicRole';

export type MoneyPlanAudit = {
  protectedCategories: Array<{
    categoryId: string;
    name: string;
    plannedCents: number;
  }>;
  committedTransactionIds: string[];
  committedSpendingCents: number;
  flexibleTransactionIds: string[];
  flexibleSpendingCents: number;
  unclearTransactionIds: string[];
  unclearSpendingCents: number;
  outsidePlanTransactionIds: string[];
  outsidePlanSpendingCents: number;
  nonSpendingTransactionIds: string[];
  nonSpendingCents: number;
  incomeReceivedCents: number;
  totalSpendingCents: number;
  savedResourceSpendingCents: number;
  countedFlexibleSpendCents: number;
  notCountedTransactionIds: string[];
  notCountedCents: number;
  isComplete: boolean;
};

export function projectMoneyPlanAudit(input: {
  periodId: string;
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
}): MoneyPlanAudit {
  const periodTransactions = input.transactions.filter((transaction) => transaction.date.slice(0, 7) === input.periodId);
  const roleByCategoryId = new Map<string, 'protected_spending' | 'flexible_spending'>();
  input.categories.forEach((category) => {
    const role = category.planRole === 'protected' ? 'protected_spending' : 'flexible_spending';
    roleByCategoryId.set(category.id, role);
    roleByCategoryId.set(category.sourceId, role);
  });

  const reconciliation = reconcileMoneyEconomicRoles({
    transactions: periodTransactions,
    allocations: [],
    roleByCategoryId,
  });
  const committedRows = reconciliation.rows.filter((row) => row.disposition === 'protected_spending');
  const flexibleRows = reconciliation.rows.filter((row) => row.disposition === 'flexible_spending');
  const unclearRows = reconciliation.rows.filter((row) => row.disposition === 'unresolved');
  const outsidePlanRows = reconciliation.rows.filter((row) => row.disposition === 'outside_plan');
  const nonSpendingRows = reconciliation.rows.filter((row) => row.disposition === 'not_spending');
  const totalSpendingCents = reconciliation.totals.protectedSpendingCents
    + reconciliation.totals.flexibleSpendingCents
    + reconciliation.totals.unresolvedInScopeCents
    + reconciliation.totals.outsidePlanCents
    + reconciliation.totals.savedResourceSpendingCents;
  const incomeReceivedCents = periodTransactions
    .filter(isPostedIncome)
    .reduce((total, transaction) => total + transaction.amountCents, 0);

  return {
    protectedCategories: input.categories
      .filter((category) => category.planRole === 'protected')
      .map((category) => ({
        categoryId: category.sourceId,
        name: category.name,
        plannedCents: category.plannedCents,
      })),
    committedTransactionIds: committedRows.map((row) => row.transactionId),
    committedSpendingCents: reconciliation.totals.protectedSpendingCents,
    flexibleTransactionIds: flexibleRows.map((row) => row.transactionId),
    flexibleSpendingCents: reconciliation.totals.flexibleSpendingCents,
    unclearTransactionIds: unclearRows.map((row) => row.transactionId),
    unclearSpendingCents: reconciliation.totals.unresolvedInScopeCents,
    outsidePlanTransactionIds: outsidePlanRows.map((row) => row.transactionId),
    outsidePlanSpendingCents: reconciliation.totals.outsidePlanCents,
    nonSpendingTransactionIds: nonSpendingRows.map((row) => row.transactionId),
    nonSpendingCents: reconciliation.totals.neutralCents,
    incomeReceivedCents,
    totalSpendingCents,
    savedResourceSpendingCents: reconciliation.totals.savedResourceSpendingCents,
    countedFlexibleSpendCents: reconciliation.totals.flexibleSpendingCents
      + reconciliation.totals.unresolvedInScopeCents,
    notCountedTransactionIds: [...nonSpendingRows, ...outsidePlanRows].map((row) => row.transactionId),
    notCountedCents: reconciliation.totals.neutralCents + reconciliation.totals.outsidePlanCents,
    isComplete: reconciliation.invariant.valid,
  };
}

function isPostedIncome(transaction: MoneyTransaction): boolean {
  if (transaction.direction !== 'inflow' || transaction.pending) return false;
  if (transaction.moneyMeaning === 'income') return true;
  return transaction.moneyMeaning == null
    && /^INCOME(?:_|$)/.test(transaction.providerCategoryPrimary ?? '');
}

import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { reconcileMoneyEconomicRoles } from './moneyEconomicRole';

export type MoneyPlanAudit = {
  protectedCategories: Array<{
    categoryId: string;
    name: string;
    plannedCents: number;
  }>;
  flexibleTransactionIds: string[];
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
  const roleByCategoryId = new Map<string, 'protected_spending' | 'flexible_spending'>();
  input.categories.forEach((category) => {
    const role = category.planRole === 'protected' ? 'protected_spending' : 'flexible_spending';
    roleByCategoryId.set(category.id, role);
    roleByCategoryId.set(category.sourceId, role);
  });

  const reconciliation = reconcileMoneyEconomicRoles({
    transactions: input.transactions.filter((transaction) => transaction.date.slice(0, 7) === input.periodId),
    allocations: [],
    roleByCategoryId,
  });
  const flexibleRows = reconciliation.rows.filter((row) => (
    row.disposition === 'flexible_spending' || row.disposition === 'unresolved'
  ));
  const notCountedRows = reconciliation.rows.filter((row) => (
    row.disposition === 'not_spending' || row.disposition === 'outside_plan'
  ));

  return {
    protectedCategories: input.categories
      .filter((category) => category.planRole === 'protected')
      .map((category) => ({
        categoryId: category.sourceId,
        name: category.name,
        plannedCents: category.plannedCents,
      })),
    flexibleTransactionIds: flexibleRows.map((row) => row.transactionId),
    countedFlexibleSpendCents: reconciliation.totals.flexibleSpendingCents
      + reconciliation.totals.unresolvedInScopeCents,
    notCountedTransactionIds: notCountedRows.map((row) => row.transactionId),
    notCountedCents: reconciliation.totals.neutralCents + reconciliation.totals.outsidePlanCents,
    isComplete: reconciliation.invariant.valid,
  };
}

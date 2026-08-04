import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';

export type TransactionPlanTreatment = {
  kind: 'protected' | 'flexible' | 'mixed' | 'outside' | 'income' | 'transfer' | 'unassigned';
  label: string;
};

export function getTransactionPlanTreatment(
  transaction: MoneyTransaction,
  categories: MoneyCategory[],
): TransactionPlanTreatment {
  if (transaction.reviewState === 'not_counted' || transaction.moneyMeaning === 'not_counted') {
    return { kind: 'outside', label: 'Outside the plan' };
  }
  if (transaction.moneyMeaning === 'income') return { kind: 'income', label: 'Income' };
  if (transaction.moneyMeaning === 'transfer') return { kind: 'transfer', label: 'Internal transfer' };

  if (!transaction.allocations?.length && transaction.categoryId && transaction.planRoleOverride) {
    return transaction.planRoleOverride === 'protected'
      ? { kind: 'protected', label: 'Committed spending' }
      : { kind: 'flexible', label: 'Flexible spending' };
  }

  if (transaction.allocations?.length) {
    const roles = new Set(transaction.allocations.flatMap((allocation) => {
      const category = findCategory(categories, allocation.categoryId, allocation.sourceCategoryId);
      return category?.planRole ? [category.planRole] : [];
    }));
    if (roles.has('protected') && roles.has('flexible')) {
      return { kind: 'mixed', label: 'Split across committed and flexible' };
    }
    if (roles.has('protected')) return { kind: 'protected', label: 'Committed across split categories' };
    if (roles.has('flexible')) return { kind: 'flexible', label: 'Flexible across split categories' };
  }

  const category = transaction.categoryId
    ? findCategory(categories, transaction.categoryId, transaction.categoryId)
    : undefined;
  if (category?.planRole === 'protected') return { kind: 'protected', label: 'Committed spending' };
  if (category?.planRole === 'flexible') return { kind: 'flexible', label: 'Flexible spending' };
  return { kind: 'unassigned', label: 'Choose how this affects your plan' };
}

function findCategory(categories: MoneyCategory[], id: string, sourceId: string): MoneyCategory | undefined {
  return categories.find((category) => (
    category.id === id
    || category.sourceId === id
    || category.id === sourceId
    || category.sourceId === sourceId
  ));
}

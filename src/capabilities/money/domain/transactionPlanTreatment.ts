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

  if (transaction.allocations?.length) {
    const roles = new Set(transaction.allocations.flatMap((allocation) => {
      const category = findCategory(categories, allocation.categoryId, allocation.sourceCategoryId);
      return category?.planRole ? [category.planRole] : [];
    }));
    if (roles.has('protected') && roles.has('flexible')) {
      return { kind: 'mixed', label: 'Split across protected and flexible' };
    }
    if (roles.has('protected')) return { kind: 'protected', label: 'Protected across split categories' };
    if (roles.has('flexible')) return { kind: 'flexible', label: 'Flexible across split categories' };
  }

  const category = transaction.categoryId
    ? findCategory(categories, transaction.categoryId, transaction.categoryId)
    : undefined;
  if (category?.planRole === 'protected') return { kind: 'protected', label: `Protected via ${category.name}` };
  if (category?.planRole === 'flexible') return { kind: 'flexible', label: `Flexible via ${category.name}` };
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

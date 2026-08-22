import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';

export type BudgetOverageReviewGroup = {
  categoryId: string;
  categoryName: string;
  overageCents: number;
  transactions: MoneyTransaction[];
};

export function projectBudgetOverageReview(input: {
  periodId: string;
  flexibleRoomCents: number;
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
}): { groups: BudgetOverageReviewGroup[]; offsetCents: number } {
  const eligible = input.transactions.filter((transaction) => transaction.date.slice(0, 7) === input.periodId
    && transaction.direction === 'outflow'
    && !transaction.pending
    && transaction.reviewState === 'assigned'
    && transaction.moneyMeaning !== 'transfer'
    && transaction.moneyMeaning !== 'not_counted');
  const groups = input.categories
    .filter((category) => category.planRole !== 'protected')
    .map((category): BudgetOverageReviewGroup => {
      const transactions = eligible
        .filter((transaction) => transaction.categoryId === category.id || transaction.categoryId === category.sourceId)
        .sort((left, right) => right.amountCents - left.amountCents);
      const savedResourceCents = transactions.reduce((sum, transaction) => (
        sum + Math.min(transaction.amountCents, Math.max(0, transaction.savedResourceCents ?? 0))
      ), 0);
      // Category spentCents already includes credits and exact allocation truth. Coverage
      // changes only the portion charged to the monthly plan.
      const planCoveredSpendCents = Math.max(0, category.spentCents - savedResourceCents);
      return {
        categoryId: category.id,
        categoryName: category.name,
        overageCents: Math.max(0, planCoveredSpendCents - category.plannedCents),
        transactions,
      };
    })
    .filter((group) => group.overageCents > 0 && group.transactions.length > 0)
    .sort((left, right) => right.overageCents - left.overageCents);
  const grossOverageCents = groups.reduce((sum, group) => sum + group.overageCents, 0);
  return {
    groups,
    offsetCents: Math.max(0, grossOverageCents - Math.max(0, Math.abs(Math.min(0, input.flexibleRoomCents)))),
  };
}

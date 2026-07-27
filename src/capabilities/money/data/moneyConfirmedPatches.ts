import type { MoneySnapshot, MoneyTransaction } from './moneySnapshot';

export type ConfirmedTransactionPatch = {
  transactionId: string;
  categoryId: string | null;
  categoryName: string;
  reviewState: MoneyTransaction['reviewState'];
  moneyMeaning: MoneyTransaction['moneyMeaning'];
};

export type ConfirmedCategoryPatch = {
  categorySourceId: string;
  name?: string;
  rolloverEnabled?: boolean;
};

export function applyConfirmedTransactionPatch(
  snapshot: MoneySnapshot,
  patch: ConfirmedTransactionPatch,
): MoneySnapshot {
  const previous = snapshot.transactions.find((transaction) => transaction.id === patch.transactionId);
  if (!previous) return snapshot;
  const previousNeedsReview = previous.reviewState === 'needs_review';
  const nextNeedsReview = patch.reviewState === 'needs_review';
  const needsReviewDelta = Number(nextNeedsReview) - Number(previousNeedsReview);
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    totals: {
      ...snapshot.totals,
      needsReviewCount: Math.max(0, snapshot.totals.needsReviewCount + needsReviewDelta),
    },
    transactions: snapshot.transactions.map((transaction) => transaction.id === patch.transactionId
      ? {
          ...transaction,
          categoryId: patch.categoryId,
          categoryName: patch.categoryName,
          reviewState: patch.reviewState,
          moneyMeaning: patch.moneyMeaning,
        }
      : transaction),
  };
}

export function applyConfirmedCategoryPatch(
  snapshot: MoneySnapshot,
  patch: ConfirmedCategoryPatch,
): MoneySnapshot {
  if (!snapshot.categories.some((category) => category.sourceId === patch.categorySourceId)) return snapshot;
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    categories: snapshot.categories.map((category) => category.sourceId === patch.categorySourceId
      ? {
          ...category,
          ...(patch.name != null ? { name: patch.name } : null),
          ...(patch.rolloverEnabled != null ? { rolloverEnabled: patch.rolloverEnabled } : null),
        }
      : category),
  };
}

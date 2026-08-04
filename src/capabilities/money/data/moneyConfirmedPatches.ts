import type { MoneySnapshot, MoneyTransaction } from './moneySnapshot';
import type { MoneyCategoryCover } from '../domain/moneyCategoryCover';
import type { MoneyCategoryPlanRole } from '../domain/moneyCategoryPlanRole';

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
  coverImage?: MoneyCategoryCover | null;
};

export type ConfirmedTransactionPlanRolePatch = {
  transactionId: string;
  planRoleOverride: MoneyCategoryPlanRole | null;
};

export type ConfirmedMerchantRulePatch = {
  transactionId: string;
  categoryId: string | null;
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
          planRoleOverride: null,
        }
      : transaction),
  };
}

export function applyConfirmedTransactionPlanRolePatch(
  snapshot: MoneySnapshot,
  patch: ConfirmedTransactionPlanRolePatch,
): MoneySnapshot {
  if (!snapshot.transactions.some((transaction) => transaction.id === patch.transactionId)) return snapshot;
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    transactions: snapshot.transactions.map((transaction) => transaction.id === patch.transactionId
      ? { ...transaction, planRoleOverride: patch.planRoleOverride }
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
          ...('coverImage' in patch ? { coverImage: patch.coverImage ?? null } : null),
        }
      : category),
  };
}

export function applyConfirmedMerchantRulePatch(
  snapshot: MoneySnapshot,
  patch: ConfirmedMerchantRulePatch,
): MoneySnapshot {
  if (!patch.categoryId || !snapshot.transactions.some((transaction) => transaction.id === patch.transactionId)) {
    return snapshot;
  }
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    transactions: snapshot.transactions.map((transaction) => transaction.id === patch.transactionId
      ? { ...transaction, merchantRuleCategoryId: patch.categoryId }
      : transaction),
  };
}

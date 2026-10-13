import { projectCategoryForecast } from '../domain/moneyForecast';
import { applyCategoryRollover, type RolloverPolicy } from '../domain/categoryRollover';
import { getLocalMoneyPeriodId } from '../domain/moneyCalendar';
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
  rolloverPolicy?: RolloverPolicy | null;
  fundingRhythm?: MoneySnapshot['categories'][number]['fundingRhythm'];
  coverImage?: MoneyCategoryCover | null;
};

export type ConfirmedTransactionPlanRolePatch = {
  transactionId: string;
  planRoleOverride: MoneyCategoryPlanRole | null;
};

export type ConfirmedTransactionNotePatch = {
  transactionId: string;
  note: string | null;
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

export function applyConfirmedTransactionNotePatch(
  snapshot: MoneySnapshot,
  patch: ConfirmedTransactionNotePatch,
): MoneySnapshot {
  if (!snapshot.transactions.some((transaction) => transaction.id === patch.transactionId)) return snapshot;
  return {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    transactions: snapshot.transactions.map((transaction) => transaction.id === patch.transactionId
      ? { ...transaction, userNote: patch.note }
      : transaction),
  };
}

export function applyConfirmedCategoryPatch(
  snapshot: MoneySnapshot,
  patch: ConfirmedCategoryPatch,
): MoneySnapshot {
  if (!snapshot.categories.some((category) => category.sourceId === patch.categorySourceId)) return snapshot;
  const result = {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    categories: snapshot.categories.map((category) => category.sourceId === patch.categorySourceId
      ? {
          ...category,
          ...(patch.name != null ? { name: patch.name } : null),
          ...(patch.fundingRhythm != null ? { fundingRhythm: patch.fundingRhythm } : null),
          ...(patch.fundingRhythm === 'monthly' ? { reserveAvailableCents: 0, reserveAvailabilityKnown: false, expectedNeed: null, fundingCoverage: { status: 'none' as const } } : null),
          ...(patch.rolloverEnabled != null ? { rolloverEnabled: patch.rolloverEnabled } : null),
          ...('rolloverPolicy' in patch ? { rolloverPolicy: patch.rolloverPolicy ?? null } : null),
          ...('coverImage' in patch ? { coverImage: patch.coverImage ?? null } : null),
        }
      : category),
  };
  if ('rolloverPolicy' in patch || patch.rolloverEnabled != null || patch.fundingRhythm != null) {
    result.categories = result.categories.map((category) => {
      if (category.sourceId !== patch.categorySourceId) return category;
      const now = new Date();
      const month = getLocalMoneyPeriodId(now);
      const base = {
        ...category, remainingCents: category.plannedCents - category.spentCents, rolloverCarriedInCents: 0,
        forecast: projectCategoryForecast({
          periodStartIso: `${month}-01`, periodEndIso: `${month}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
          todayIso: `${month}-${String(now.getDate()).padStart(2, '0')}`,
          plannedCents: category.plannedCents, spentCents: category.spentCents,
          mode: category.forecastSettings?.mode ?? category.forecast.mode,
          manualProjectedSpendCents: category.forecastSettings?.manualProjectedSpendCents,
          scheduledAmountCents: category.forecastSettings?.scheduledAmountCents,
          scheduledDueDay: category.forecastSettings?.scheduledDueDay,
          fundingRhythm: category.fundingRhythm, reserveAvailableCents: category.reserveAvailableCents,
          fundingCoverage: category.fundingCoverage,
        }),
      };
      return applyCategoryRollover(base, result.transactions, getLocalMoneyPeriodId(new Date()));
    });
    result.totals = { ...result.totals, remainingCents: result.categories.reduce((sum, category) => sum + category.remainingCents, 0) };
    // The governed answer is refreshed from evidence; never retain its old balance after a policy edit.
    result.livingLimitAnswer = null;
  }
  return result;
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

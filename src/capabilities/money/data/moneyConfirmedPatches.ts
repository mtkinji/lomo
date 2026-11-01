import { countedReserveSpend } from '../domain/reserveSpending';
import { projectCategoryFunding, projectReserveAvailabilityFromAnchor } from '../domain/categoryFunding';
import { projectCategoryForecast } from '../domain/moneyForecast';
import { applyCategoryRollover, type RolloverPolicy } from '../domain/categoryRollover';
import { getLocalMoneyPeriodId } from '../domain/moneyCalendar';
import { projectSnapshotForecast, type MoneySnapshot, type MoneyTransaction } from './moneySnapshot';
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
  expectedCategoryUpdatedAt?: string;
  expectedPlanUpdatedAt?: string;
  budgetCents?: number;
  planRole?: MoneyCategoryPlanRole;
  expectedNeed?: MoneySnapshot['categories'][number]['expectedNeed'];
  categoryUpdatedAt?: string;
  planUpdatedAt?: string;
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
  const current = snapshot.categories.find((category) => category.sourceId === patch.categorySourceId);
  if (!current) return snapshot;
  // A recovered receipt confirms that save, not that it is still the newest state.
  if ((patch.expectedCategoryUpdatedAt && current.categoryUpdatedAt !== patch.expectedCategoryUpdatedAt && current.categoryUpdatedAt !== patch.categoryUpdatedAt)
    || (patch.expectedPlanUpdatedAt && current.planUpdatedAt !== patch.expectedPlanUpdatedAt && current.planUpdatedAt !== patch.planUpdatedAt)) return snapshot;
  const result = {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    categories: snapshot.categories.map((category) => category.sourceId === patch.categorySourceId
      ? {
          ...category,
          ...(patch.name != null ? { name: patch.name } : null),
          ...(patch.budgetCents != null ? { plannedCents: patch.budgetCents, monthlyContributionCents: patch.budgetCents,
            percentUsed: patch.budgetCents > 0 ? Math.round(category.spentCents / patch.budgetCents * 100) : 0 } : null),
          ...(patch.planRole != null ? { planRole: patch.planRole, planRoleOverride: patch.planRole } : null),
          ...(patch.categoryUpdatedAt ? { categoryUpdatedAt: patch.categoryUpdatedAt } : null),
          ...(patch.planUpdatedAt ? { planUpdatedAt: patch.planUpdatedAt, updatedAt: patch.planUpdatedAt } : null),
          ...(patch.fundingRhythm != null ? { fundingRhythm: patch.fundingRhythm } : null),
          ...(patch.fundingRhythm === 'monthly' ? { reserveAvailableCents: 0, reserveAvailabilityKnown: false, expectedNeed: null, fundingCoverage: { status: 'none' as const } } : null),
          ...(patch.rolloverEnabled != null ? { rolloverEnabled: patch.rolloverEnabled } : null),
          ...('rolloverPolicy' in patch ? { rolloverPolicy: patch.rolloverPolicy ?? null } : null),
          ...('coverImage' in patch ? { coverImage: patch.coverImage ?? null } : null),
          ...('expectedNeed' in patch ? { expectedNeed: patch.expectedNeed ?? null } : null),
        }
      : category),
  };
  if ('rolloverPolicy' in patch || patch.rolloverEnabled != null || patch.fundingRhythm != null
    || patch.budgetCents != null || 'expectedNeed' in patch || patch.planRole != null) {
    result.categories = result.categories.map((category) => {
      if (category.sourceId !== patch.categorySourceId) return category;
      const now = new Date();
      const month = getLocalMoneyPeriodId(now);
      const anchor = category.reserveBalancePeriodId ?? month;
      const countedSpend = countedReserveSpend({ transactions: result.transactions, read: (transaction) => transaction,
        categoryId: category.id, categorySourceId: category.sourceId, startPeriodId: anchor, endPeriodId: month });
      const projectedReserve = projectReserveAvailabilityFromAnchor({ anchorPeriodId: anchor,
        anchorBalanceCents: category.reserveBalanceCents, targetPeriodId: month,
        monthlyContributionCents: category.plannedCents,
        countedSpendSinceAnchorCents: countedSpend });
      const funding = projectCategoryFunding({ rhythm: category.fundingRhythm, monthlyContributionCents: category.plannedCents,
        priorReserveCents: projectedReserve == null ? 0 : projectedReserve - category.plannedCents + category.spentCents, countedSpendCents: category.spentCents,
        periodId: month, expectedNeed: category.expectedNeed });
      const base = {
        ...category, remainingCents: funding.availableCents, rolloverCarriedInCents: 0,
        reserveAvailableCents: category.fundingRhythm === 'reserve' ? funding.availableCents : 0,
        fundingCoverage: funding.coverage,
        forecast: projectCategoryForecast({
          periodStartIso: `${month}-01`, periodEndIso: `${month}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
          todayIso: `${month}-${String(now.getDate()).padStart(2, '0')}`,
          plannedCents: category.plannedCents, spentCents: category.spentCents,
          mode: category.forecastSettings?.mode ?? category.forecast.mode,
          manualProjectedSpendCents: category.forecastSettings?.manualProjectedSpendCents,
          scheduledAmountCents: category.forecastSettings?.scheduledAmountCents,
          scheduledDueDay: category.forecastSettings?.scheduledDueDay,
          fundingRhythm: category.fundingRhythm, reserveAvailableCents: funding.availableCents,
          fundingCoverage: funding.coverage,
        }),
      };
      return applyCategoryRollover(base, result.transactions, getLocalMoneyPeriodId(new Date()));
    });
    result.totals = { ...result.totals, plannedCents: result.categories.reduce((sum, category) => sum + category.plannedCents, 0), remainingCents: result.categories.reduce((sum, category) => sum + category.remainingCents, 0) };
    // The governed answer is refreshed from evidence; never retain its old balance after a policy edit.
    result.livingLimitAnswer = null;
    result.monthlyPlan = undefined;
    result.forecast = projectSnapshotForecast(result.categories);
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

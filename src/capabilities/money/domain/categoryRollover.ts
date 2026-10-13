import { projectCategoryFunding } from './categoryFunding';
import { projectCategoryForecast } from './moneyForecast';
import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { projectCategoryRollover } from './categoryRolloverMath';
export * from './categoryRolloverMath';

/** Shared by initial load, governed-plan refresh, history and draft preview. */
export function applyCategoryRollover(category: MoneyCategory, transactions: MoneyTransaction[], month: string): MoneyCategory {
  if (!category.rolloverPolicy || (!category.rolloverEnabled && category.fundingRhythm !== 'reserve')) return category;
  const rollover = projectCategoryRollover(category, category.rolloverPolicy, transactions, month, category.spentCents);
  if (!rollover) return { ...category, rolloverCarriedInCents: 0 };
  const funding = projectCategoryFunding({ rhythm: category.fundingRhythm, monthlyContributionCents: category.plannedCents, priorReserveCents: rollover.carriedInCents, countedSpendCents: category.spentCents, periodId: month, expectedNeed: category.expectedNeed });
  const availableBudget = category.plannedCents + rollover.carriedInCents;
  const overage = Math.max(0, category.forecast.projectedSpendCents - availableBudget);
  return {
    ...category,
    remainingCents: rollover.availableCents,
    rolloverCarriedInCents: rollover.carriedInCents,
    ...(category.fundingRhythm === 'reserve' ? { reserveAvailableCents: rollover.availableCents, reserveAvailabilityKnown: true } : {}),
    fundingCoverage: funding.coverage,
    forecast: category.fundingRhythm === 'reserve' ? projectCategoryForecast({ periodStartIso: `${month}-01`, periodEndIso: `${month}-01`, todayIso: `${month}-01`, plannedCents: category.plannedCents, spentCents: category.spentCents, fundingRhythm: 'reserve', reserveAvailableCents: rollover.availableCents, fundingCoverage: funding.coverage }) : {
      ...category.forecast,
      projectedRemainingCents: Math.max(0, availableBudget - category.forecast.projectedSpendCents),
      projectedOverageCents: overage,
      status: overage > 0 ? 'over' : category.forecast.projectionRangeHighCents > availableBudget ? 'watch' : 'steady',
    },
  };
}

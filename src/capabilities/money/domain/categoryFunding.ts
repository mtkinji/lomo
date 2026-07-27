export type CategoryFundingRhythm = 'monthly' | 'reserve';

export type CategoryExpectedNeed = {
  amountCents: number;
  dueMonth: string;
};

export type CategoryFundingCoverage =
  | { status: 'none' }
  | {
      status: 'covered' | 'shortfall' | 'past_due';
      dueMonth: string;
      needCents: number;
      projectedAvailableCents: number;
      shortfallCents: number;
      requiredMonthlyContributionCents: number;
      catchUpContributionCents: number;
    };

export type CategoryFundingProjection = {
  rhythm: CategoryFundingRhythm;
  carriedInCents: number;
  contributionCents: number;
  countedSpendCents: number;
  availableCents: number;
  coverage: CategoryFundingCoverage;
};

export const CATEGORY_FUNDING_POLICY_VERSION = 'category-funding-v1';

export function projectCategoryFunding(input: {
  rhythm: CategoryFundingRhythm;
  monthlyContributionCents: number;
  priorReserveCents: number;
  countedSpendCents: number;
  periodId: string;
  expectedNeed?: CategoryExpectedNeed | null;
}): CategoryFundingProjection {
  const contributionCents = cents(input.monthlyContributionCents);
  const countedSpendCents = cents(input.countedSpendCents);
  const carriedInCents = input.rhythm === 'reserve' ? cents(input.priorReserveCents) : 0;
  const availableCents = carriedInCents + contributionCents - countedSpendCents;

  return {
    rhythm: input.rhythm,
    carriedInCents,
    contributionCents,
    countedSpendCents,
    availableCents,
    coverage: input.rhythm === 'reserve'
      ? projectExpectedNeed({
          periodId: input.periodId,
          carriedInCents,
          contributionCents,
          countedSpendCents,
          availableCents,
          expectedNeed: input.expectedNeed,
        })
      : { status: 'none' },
  };
}

export type ReserveFundingEvidence =
  | {
      posture: 'exposure_only';
      confidence: 'low';
      reason: 'insufficient_history' | 'no_concentration' | 'single_concentration';
      concentratedMonths?: number[];
      completedPeriodCount: number;
    }
  | {
      posture: 'suggest_reserve';
      confidence: 'high';
      reason: 'repeated_month_of_year_concentration';
      concentratedMonths: number[];
      completedPeriodCount: number;
    };

export function assessReserveFundingEvidence(
  periods: Array<{ periodId: string; spentCents: number }>,
): ReserveFundingEvidence {
  const completed = periods
    .filter((period) => /^\d{4}-(0[1-9]|1[0-2])$/.test(period.periodId))
    .map((period) => ({ ...period, spentCents: cents(period.spentCents) }))
    .sort((left, right) => left.periodId.localeCompare(right.periodId));
  if (completed.length < 12) {
    return {
      posture: 'exposure_only',
      confidence: 'low',
      reason: 'insufficient_history',
      completedPeriodCount: completed.length,
    };
  }

  const center = median(completed.map((period) => period.spentCents));
  const concentrationFloor = Math.max(center * 2, center + 10_000);
  const concentrated = completed.filter((period) => period.spentCents >= concentrationFloor);
  if (concentrated.length === 0) {
    return {
      posture: 'exposure_only',
      confidence: 'low',
      reason: 'no_concentration',
      completedPeriodCount: completed.length,
    };
  }

  const countByMonth = new Map<number, number>();
  concentrated.forEach((period) => {
    const month = Number(period.periodId.slice(5, 7));
    countByMonth.set(month, (countByMonth.get(month) ?? 0) + 1);
  });
  const repeatedMonths = [...countByMonth.entries()]
    .filter(([, count]) => count >= 2)
    .map(([month]) => month)
    .sort((left, right) => left - right);
  if (repeatedMonths.length === 0) {
    return {
      posture: 'exposure_only',
      confidence: 'low',
      reason: 'single_concentration',
      completedPeriodCount: completed.length,
    };
  }
  return {
    posture: 'suggest_reserve',
    confidence: 'high',
    reason: 'repeated_month_of_year_concentration',
    concentratedMonths: repeatedMonths,
    completedPeriodCount: completed.length,
  };
}

export function projectReserveAvailabilityFromAnchor(input: {
  anchorPeriodId: string;
  anchorBalanceCents: number;
  targetPeriodId: string;
  monthlyContributionCents: number;
  countedSpendSinceAnchorCents: number;
}): number | null {
  const periodDistance = monthDistance(input.anchorPeriodId, input.targetPeriodId);
  if (periodDistance < 0) return null;
  return cents(input.anchorBalanceCents)
    + (periodDistance + 1) * cents(input.monthlyContributionCents)
    - cents(input.countedSpendSinceAnchorCents);
}

function projectExpectedNeed(input: {
  periodId: string;
  carriedInCents: number;
  contributionCents: number;
  countedSpendCents: number;
  availableCents: number;
  expectedNeed?: CategoryExpectedNeed | null;
}): CategoryFundingCoverage {
  if (!input.expectedNeed || !isPeriodId(input.expectedNeed.dueMonth)) return { status: 'none' };
  const needCents = cents(input.expectedNeed.amountCents);
  const monthsAfterCurrent = monthDistance(input.periodId, input.expectedNeed.dueMonth);
  const contributionOpportunities = Math.max(1, monthsAfterCurrent + 1);
  const projectedAvailableCents = input.availableCents
    + Math.max(0, monthsAfterCurrent) * input.contributionCents;
  const shortfallCents = Math.max(0, needCents - projectedAvailableCents);
  const requiredMonthlyContributionCents = Math.max(0, Math.ceil(
    (needCents - input.carriedInCents + input.countedSpendCents) / contributionOpportunities,
  ));
  const catchUpContributionCents = Math.max(0, requiredMonthlyContributionCents - input.contributionCents);
  return {
    status: monthsAfterCurrent < 0 ? 'past_due' : shortfallCents > 0 ? 'shortfall' : 'covered',
    dueMonth: input.expectedNeed.dueMonth,
    needCents,
    projectedAvailableCents,
    shortfallCents,
    requiredMonthlyContributionCents,
    catchUpContributionCents,
  };
}

function monthDistance(from: string, to: string): number {
  if (!isPeriodId(from) || !isPeriodId(to)) return -1;
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

function isPeriodId(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function cents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

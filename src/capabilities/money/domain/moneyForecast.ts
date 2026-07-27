export type MoneyForecastMode = 'paced' | 'scheduled' | 'hybrid' | 'manual';
export type MoneyForecastConfidence = 'low' | 'medium' | 'high';
export type MoneyForecastStatus = 'steady' | 'watch' | 'over';

export type MoneyCategoryForecast = {
  mode: MoneyForecastMode;
  claim: 'monthly_range' | 'reserve_coverage' | 'exposure';
  confidence: MoneyForecastConfidence;
  expectedSpendCents: number;
  projectedSpendCents: number;
  projectionRangeLowCents: number;
  projectionRangeHighCents: number;
  projectedRemainingCents: number;
  projectedOverageCents: number;
  status: MoneyForecastStatus;
  reserveCoverage?: CategoryFundingCoverage;
};

export function projectCategoryForecast(input: {
  periodStartIso: string;
  periodEndIso: string;
  todayIso: string;
  plannedCents: number;
  spentCents: number;
  mode?: MoneyForecastMode | null;
  manualProjectedSpendCents?: number | null;
  scheduledAmountCents?: number | null;
  scheduledDueDay?: number | null;
  fundingRhythm?: CategoryFundingRhythm;
  reserveAvailableCents?: number;
  fundingCoverage?: CategoryFundingCoverage;
}): MoneyCategoryForecast {
  const plannedCents = cents(input.plannedCents);
  const spentCents = cents(input.spentCents);
  const mode = input.mode ?? 'paced';
  if (input.fundingRhythm === 'reserve') {
    const reserveAvailableCents = signedCents(input.reserveAvailableCents ?? 0);
    const coverage = input.fundingCoverage ?? { status: 'none' };
    const hasExpectedNeed = coverage.status !== 'none';
    return {
      mode,
      claim: hasExpectedNeed ? 'reserve_coverage' : 'exposure',
      confidence: hasExpectedNeed ? 'high' : 'low',
      expectedSpendCents: spentCents,
      projectedSpendCents: spentCents,
      projectionRangeLowCents: spentCents,
      projectionRangeHighCents: spentCents,
      projectedRemainingCents: reserveAvailableCents,
      projectedOverageCents: 0,
      status: coverage.status === 'past_due' ? 'over' : coverage.status === 'shortfall' ? 'watch' : 'steady',
      reserveCoverage: coverage,
    };
  }
  const periodStart = parseDay(input.periodStartIso);
  const periodEnd = parseDay(input.periodEndIso);
  const today = parseDay(input.todayIso);
  const totalDays = periodStart && periodEnd ? Math.max(1, daysBetween(periodStart, periodEnd) + 1) : 1;
  const elapsedDays = periodStart && periodEnd && today
    ? Math.min(totalDays, Math.max(0, daysBetween(periodStart, today) + 1))
    : totalDays;
  const elapsedFraction = elapsedDays / totalDays;
  const expectedSpendCents = Math.round(plannedCents * elapsedFraction);
  const pacedProjection = elapsedDays >= totalDays
    ? spentCents
    : Math.max(spentCents, Math.round(spentCents / Math.max(elapsedFraction, 1 / totalDays)));
  const scheduledAmountCents = cents(input.scheduledAmountCents ?? 0);
  const currentDay = today?.getUTCDate() ?? totalDays;
  const scheduledDueDay = integerInRange(input.scheduledDueDay, 1, 31);
  const scheduledRemainingCents = scheduledDueDay != null && scheduledDueDay > currentDay
    ? scheduledAmountCents
    : 0;

  let projectedSpendCents: number;
  let confidence: MoneyForecastConfidence;
  if (mode === 'manual') {
    projectedSpendCents = Math.max(spentCents, cents(input.manualProjectedSpendCents ?? spentCents));
    confidence = input.manualProjectedSpendCents == null ? 'low' : 'high';
  } else if (mode === 'scheduled') {
    projectedSpendCents = spentCents + scheduledRemainingCents;
    confidence = scheduledDueDay != null && scheduledAmountCents > 0 ? 'high' : 'low';
  } else if (mode === 'hybrid') {
    projectedSpendCents = pacedProjection + scheduledRemainingCents;
    confidence = scheduledDueDay != null && scheduledAmountCents > 0 ? 'medium' : 'low';
  } else {
    projectedSpendCents = pacedProjection;
    confidence = elapsedDays > 0 ? 'medium' : 'low';
  }

  const rangePercent = confidence === 'high' ? 0 : confidence === 'medium' ? 0.1 : 0.2;
  const projectionRangeLowCents = Math.max(spentCents, Math.round(projectedSpendCents * (1 - rangePercent)));
  const projectionRangeHighCents = Math.max(projectedSpendCents, Math.round(projectedSpendCents * (1 + rangePercent)));
  const projectedOverageCents = Math.max(0, projectedSpendCents - plannedCents);
  const projectedRemainingCents = Math.max(0, plannedCents - projectedSpendCents);
  const status: MoneyForecastStatus = projectedOverageCents > 0
    ? 'over'
    : projectionRangeHighCents > plannedCents || (plannedCents > 0 && projectedSpendCents / plannedCents >= 0.9)
      ? 'watch'
      : 'steady';

  return {
    mode,
    claim: 'monthly_range',
    confidence,
    expectedSpendCents,
    projectedSpendCents,
    projectionRangeLowCents,
    projectionRangeHighCents,
    projectedRemainingCents,
    projectedOverageCents,
    status,
  };
}

function cents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function signedCents(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function integerInRange(value: number | null | undefined, min: number, max: number): number | null {
  return Number.isInteger(value) && value != null && value >= min && value <= max ? value : null;
}

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}
import type { CategoryFundingCoverage, CategoryFundingRhythm } from './categoryFunding';

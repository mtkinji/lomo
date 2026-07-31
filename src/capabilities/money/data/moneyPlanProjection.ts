import type { SupabaseClient } from '@supabase/supabase-js';
import { projectCategoryFunding } from '../domain/categoryFunding';
import { projectCategoryForecast, type MoneyForecastConfidence } from '../domain/moneyForecast';
import { reconcileMoneyEconomicRoles } from '../domain/moneyEconomicRole';
import { projectMoneyPlanLimitAnswer } from '../domain/moneyPlanLimitAnswer';
import { getActiveLivingPlan, type ActiveLivingPlan, type LivingPlanReceipt } from './livingPlanRepository';
import { getMoneyPlanLimitEvidence, type MoneyPlanLimitEvidence } from './moneyPlanLimitEvidence';
import type { MoneyCategory, MoneySnapshot } from './moneySnapshot';

export type MoneyPlanProjection = {
  snapshot: MoneySnapshot;
  versionId: string;
  receipt: LivingPlanReceipt | null;
};

export async function loadMoneyPlanProjection(
  client: SupabaseClient,
  snapshot: MoneySnapshot,
  expectedVersionId?: string,
): Promise<MoneyPlanProjection | null> {
  const active = await getActiveLivingPlan(client);
  if (!active) return null;
  if (expectedVersionId && active.versionId !== expectedVersionId) {
    throw new Error('The Money plan changed somewhere else. Refresh before making another change.');
  }
  const evidence = await getMoneyPlanLimitEvidence(client, active);
  return projectMoneyPlanProjection(snapshot, active, evidence);
}

export function projectMoneyPlanProjection(
  snapshot: MoneySnapshot,
  active: ActiveLivingPlan,
  evidence: MoneyPlanLimitEvidence,
  now = new Date(),
): MoneyPlanProjection {
  const allocationByCategoryId = new Map(active.allocations.map((allocation) => [allocation.categoryId, allocation]));
  const periodStartIso = `${active.periodId}-01`;
  const periodEndIso = lastDayOfPeriod(active.periodId);
  const todayIso = now.toISOString().slice(0, 10);
  const categories = snapshot.categories.map((category): MoneyCategory => {
    const allocation = allocationByCategoryId.get(category.id);
    if (!allocation) return category;
    const funding = projectCategoryFunding({
      rhythm: allocation.fundingRhythm,
      monthlyContributionCents: allocation.amountCents,
      priorReserveCents: allocation.priorReserveCents,
      countedSpendCents: category.spentCents,
      periodId: active.periodId,
      expectedNeed: allocation.expectedNeed,
    });
    const forecastSettings = category.forecastSettings ?? {
      mode: 'paced' as const,
      manualProjectedSpendCents: null,
      scheduledAmountCents: null,
      scheduledDueDay: null,
    };
    const forecast = projectCategoryForecast({
      periodStartIso,
      periodEndIso,
      todayIso,
      plannedCents: allocation.amountCents,
      spentCents: category.spentCents,
      mode: forecastSettings.mode,
      manualProjectedSpendCents: forecastSettings.manualProjectedSpendCents,
      scheduledAmountCents: forecastSettings.scheduledAmountCents,
      scheduledDueDay: forecastSettings.scheduledDueDay,
      fundingRhythm: allocation.fundingRhythm,
      reserveAvailableCents: funding.availableCents,
      fundingCoverage: funding.coverage,
    });
    return {
      ...category,
      planRole: allocation.fixedCents > 0 || allocation.overrideCents > 0 ? 'protected' : 'flexible',
      plannedCents: allocation.amountCents,
      remainingCents: funding.availableCents,
      percentUsed: allocation.amountCents > 0 ? Math.round(category.spentCents / allocation.amountCents * 100) : 0,
      fundingRhythm: allocation.fundingRhythm,
      monthlyContributionCents: allocation.amountCents,
      reserveAvailableCents: allocation.fundingRhythm === 'reserve' ? funding.availableCents : 0,
      reserveBalanceCents: allocation.fundingRhythm === 'reserve' ? allocation.priorReserveCents : 0,
      reserveBalancePeriodId: allocation.fundingRhythm === 'reserve' ? active.periodId : null,
      expectedNeed: allocation.expectedNeed,
      fundingCoverage: funding.coverage,
      forecast,
    };
  });
  const plannedCents = categories.reduce((sum, category) => sum + category.plannedCents, 0);
  const spentCents = categories.reduce((sum, category) => sum + category.spentCents, 0);
  const projectedSpendCents = categories.reduce((sum, category) => sum + category.forecast.projectedSpendCents, 0);
  const projectionRangeLowCents = categories.reduce((sum, category) => sum + category.forecast.projectionRangeLowCents, 0);
  const projectionRangeHighCents = categories.reduce((sum, category) => sum + category.forecast.projectionRangeHighCents, 0);
  const currentTransactions = snapshot.transactions.filter((transaction) => transaction.date.slice(0, 7) === active.periodId);
  const reconciliation = reconcileMoneyEconomicRoles({ transactions: currentTransactions, allocations: active.allocations });
  const freshness = isFresh(snapshot.lastSyncedAt, now) && active.status !== 'blocked' ? 'fresh' : 'stale';
  const livingLimitAnswer = projectMoneyPlanLimitAnswer({ active, evidence, reconciliation, freshness });
  return {
    versionId: active.versionId,
    receipt: active.receipt,
    snapshot: {
      ...snapshot,
      generatedAt: now.toISOString(),
      livingLimitAnswer,
      categories,
      totals: { ...snapshot.totals, plannedCents, spentCents, remainingCents: plannedCents - spentCents },
      forecast: {
        ...snapshot.forecast,
        projectedSpendCents,
        projectionRangeLowCents,
        projectionRangeHighCents,
        projectedRemainingCents: Math.max(0, plannedCents - projectedSpendCents),
        projectedOverageCents: Math.max(0, projectedSpendCents - plannedCents),
        confidence: lowestConfidence(categories.map((category) => category.forecast.confidence)),
        atRiskCategoryCount: categories.filter((category) => category.forecast.status !== 'steady').length,
      },
    },
  };
}

function isFresh(lastSyncedAtIso: string | null, now: Date): boolean {
  if (!lastSyncedAtIso) return false;
  const ageMs = now.getTime() - new Date(lastSyncedAtIso).getTime();
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 72 * 60 * 60 * 1000;
}

function lastDayOfPeriod(periodId: string): string {
  const [year, month] = periodId.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return `${periodId}-28`;
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function lowestConfidence(values: MoneyForecastConfidence[]): MoneyForecastConfidence {
  if (values.includes('low')) return 'low';
  if (values.includes('medium')) return 'medium';
  return 'high';
}

import type { LivingPlanAllocation } from '../domain/living-plan';
import type { ActiveLivingPlan } from './livingPlanRepository';
import type { MoneyCategory, MoneySnapshot } from './moneySnapshot';
import { projectMoneyPlanProjection } from './moneyPlanProjection';

describe('projectMoneyPlanProjection', () => {
  it('atomically projects every authoritative allocation and receipt without transaction history', () => {
    const snapshot = {
      periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: null,
      totals: { plannedCents: 30000, spentCents: 10000, remainingCents: 20000, needsReviewCount: 0 },
      forecast: { projectedSpendCents: 10000, projectionRangeLowCents: 10000, projectionRangeHighCents: 10000, projectedRemainingCents: 20000, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
      outsidePlan: { spentCents: 0, transactionCount: 0 },
      categories: [category('housing', 20000, 8000), category('food', 10000, 2000)], transactions: [], accounts: [],
    } as MoneySnapshot;
    const active = {
      versionId: 'version-2', predecessorVersionId: 'version-1', periodId: '2026-07', livingPercent: 60,
      allocatorVersion: 'living-plan-v2', evidenceHash: 'evidence', candidateHash: 'candidate', status: 'ready',
      resourceBasisCents: 100000, targetCents: 60000, plannedCents: 60000, unassignedCents: 0, overTargetCents: 0,
      allocations: [allocation('housing', 35000), allocation('food', 25000)],
      receipt: { id: 'receipt-2', planVersionId: 'version-2', priorVersionId: 'version-1', trigger: 'category_changed', outcome: 'material', cause: 'override', changedCategoryIds: ['housing', 'food'], materialReasons: ['allocation_changed'], seenAtIso: null },
    } as ActiveLivingPlan;

    const result = projectMoneyPlanProjection(snapshot, active, new Date('2026-07-24T12:00:00Z'));

    expect(result.versionId).toBe('version-2');
    expect(result.receipt?.id).toBe('receipt-2');
    expect(result.snapshot.categories.map(({ id, plannedCents }) => ({ id, plannedCents }))).toEqual([
      { id: 'housing', plannedCents: 35000 },
      { id: 'food', plannedCents: 25000 },
    ]);
    expect(result.snapshot.totals.plannedCents).toBe(60000);
  });
});

function category(id: string, plannedCents: number, spentCents: number): MoneyCategory {
  return {
    id, sourceId: `${id}-uuid`, name: id, description: null, accentColor: '#315545', plannedCents, spentCents,
    remainingCents: plannedCents - spentCents, percentUsed: Math.round((spentCents / plannedCents) * 100), transactionCount: 1,
    rolloverEnabled: false, fundingRhythm: 'monthly', fundingPolicyVersion: null, starterWeight: 1,
    monthlyContributionCents: plannedCents, reserveAvailableCents: 0, reserveBalanceCents: 0,
    reserveBalancePeriodId: null, reserveAvailabilityKnown: true, expectedNeed: null,
    fundingCoverage: { status: 'none' },
    forecastSettings: { mode: 'paced', manualProjectedSpendCents: null, scheduledAmountCents: null, scheduledDueDay: null },
    forecast: { mode: 'paced', claim: 'monthly_range', expectedSpendCents: spentCents, projectedSpendCents: spentCents, projectionRangeLowCents: spentCents, projectionRangeHighCents: spentCents, projectedRemainingCents: plannedCents - spentCents, projectedOverageCents: 0, confidence: 'high', status: 'steady' },
  };
}

function allocation(categoryId: string, amountCents: number): LivingPlanAllocation {
  return { categoryId, amountCents, fixedCents: 0, overrideCents: amountCents, flexibleCents: 0, exposureCents: 0, source: 'user_override', fundingRhythm: 'monthly', priorReserveCents: 0, expectedNeed: null };
}

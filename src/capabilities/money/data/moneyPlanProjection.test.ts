import type { SupabaseClient } from '@supabase/supabase-js';
import type { LivingPlanAllocation } from '../domain/living-plan';
import type { ActiveLivingPlan } from './livingPlanRepository';
import { getActiveLivingPlan } from './livingPlanRepository';
import { getMoneyPlanLimitEvidence } from './moneyPlanLimitEvidence';
import type { MoneyCategory, MoneySnapshot } from './moneySnapshot';
import { loadMoneyPlanProjection, projectMoneyPlanProjection } from './moneyPlanProjection';

jest.mock('./livingPlanRepository', () => ({
  ...jest.requireActual('./livingPlanRepository'),
  getActiveLivingPlan: jest.fn(),
}));
jest.mock('./moneyPlanLimitEvidence', () => ({
  getMoneyPlanLimitEvidence: jest.fn(),
}));

const evidence = {
  resourceBasisKind: 'detected_income' as const,
  resourceBasisUpdatedAtIso: '2026-07-24T10:00:00Z',
};

describe('projectMoneyPlanProjection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atomically projects every authoritative allocation and receipt without transaction history', () => {
    const snapshot = {
      periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: '2026-07-24T10:00:00Z',
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

    const result = projectMoneyPlanProjection(snapshot, active, evidence, new Date('2026-07-24T12:00:00Z'));

    expect(result.versionId).toBe('version-2');
    expect(result.receipt?.id).toBe('receipt-2');
    expect(result.snapshot.categories.map(({ id, plannedCents }) => ({ id, plannedCents }))).toEqual([
      { id: 'housing', plannedCents: 35000 },
      { id: 'food', plannedCents: 25000 },
    ]);
    expect(result.snapshot.totals.plannedCents).toBe(60000);
    expect(result.snapshot.livingLimitAnswer).toMatchObject({
      state: 'supported',
      facts: { planVersionId: 'version-2', livingLimitCents: 60000, protectedPlanCents: 35000 },
    });
  });

  it('counts only current-plan-period transactions in the living-limit answer', () => {
    const snapshot = {
      periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: '2026-07-24T10:00:00Z',
      totals: { plannedCents: 60000, spentCents: 0, remainingCents: 60000, needsReviewCount: 0 },
      forecast: { projectedSpendCents: 0, projectionRangeLowCents: 0, projectionRangeHighCents: 0, projectedRemainingCents: 60000, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
      outsidePlan: { spentCents: 0, transactionCount: 0 },
      categories: [category('housing', 20000, 0), category('food', 40000, 0)], accounts: [],
      transactions: [
        moneyTransaction('current', '2026-07-20', 10000),
        moneyTransaction('historical', '2026-06-20', 50000),
      ],
    } as MoneySnapshot;
    const plan = {
      ...activePlan(),
      allocations: [
        { ...allocation('housing', 20000), fixedCents: 20000, overrideCents: 0, source: 'fixed' as const },
        { ...allocation('food', 40000), overrideCents: 0, flexibleCents: 40000, source: 'recent_spending' as const },
      ],
    };

    const result = projectMoneyPlanProjection(snapshot, plan, evidence, new Date('2026-07-24T12:00:00Z'));

    expect(result.snapshot.livingLimitAnswer).toMatchObject({
      state: 'supported',
      headlineAmountCents: 30000,
      facts: { countedFlexibleSpendCents: 10000 },
    });
  });

  it('uses category meaning, not a manual amount, to separate protected and flexible money', () => {
    const snapshot = {
      periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: '2026-07-24T10:00:00Z',
      totals: { plannedCents: 60000, spentCents: 15000, remainingCents: 45000, needsReviewCount: 0 },
      forecast: { projectedSpendCents: 15000, projectionRangeLowCents: 15000, projectionRangeHighCents: 15000, projectedRemainingCents: 45000, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
      outsidePlan: { spentCents: 0, transactionCount: 0 },
      categories: [
        { ...category('housing', 40000, 10000), mappingTags: ['housing'] },
        { ...category('shopping', 20000, 5000), mappingTags: ['shopping'] },
      ],
      accounts: [],
      transactions: [
        { ...moneyTransaction('rent', '2026-07-20', 10000), categoryId: 'housing' },
        { ...moneyTransaction('store', '2026-07-20', 5000), categoryId: 'shopping' },
      ],
    } as MoneySnapshot;
    const plan = {
      ...activePlan(),
      allocations: [allocation('housing', 40000), allocation('shopping', 20000)],
    };

    const result = projectMoneyPlanProjection(snapshot, plan, evidence, new Date('2026-07-24T12:00:00Z'));

    expect(result.snapshot.categories.map(({ id, planRole }) => ({ id, planRole }))).toEqual([
      { id: 'housing', planRole: 'protected' },
      { id: 'shopping', planRole: 'flexible' },
    ]);
    expect(result.snapshot.livingLimitAnswer).toMatchObject({
      state: 'supported',
      headlineAmountCents: 15000,
      facts: {
        protectedPlanCents: 40000,
        flexibleCapacityCents: 20000,
        countedFlexibleSpendCents: 5000,
      },
    });
  });

  it('rejects an active projection that is not the version returned by the commit', async () => {
    jest.mocked(getActiveLivingPlan).mockResolvedValue({ versionId: 'version-other' } as ActiveLivingPlan);

    await expect(loadMoneyPlanProjection({} as SupabaseClient, {} as MoneySnapshot, 'version-committed'))
      .rejects.toThrow('changed somewhere else');
  });

  it('loads evidence for the same active version only once', async () => {
    const plan = activePlan();
    jest.mocked(getActiveLivingPlan).mockResolvedValue(plan);
    jest.mocked(getMoneyPlanLimitEvidence).mockResolvedValue(evidence);
    const snapshot = {
      periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: '2026-07-24T10:00:00Z',
      totals: { plannedCents: 60000, spentCents: 0, remainingCents: 60000, needsReviewCount: 0 },
      forecast: { projectedSpendCents: 0, projectionRangeLowCents: 0, projectionRangeHighCents: 0, projectedRemainingCents: 60000, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
      outsidePlan: { spentCents: 0, transactionCount: 0 }, categories: [], transactions: [], accounts: [],
    } as MoneySnapshot;

    await loadMoneyPlanProjection({} as SupabaseClient, snapshot);

    expect(getActiveLivingPlan).toHaveBeenCalledTimes(1);
    expect(getMoneyPlanLimitEvidence).toHaveBeenCalledWith(expect.anything(), plan);
  });
});

function activePlan(): ActiveLivingPlan {
  return {
    versionId: 'version-1', predecessorVersionId: null, periodId: '2026-07', livingPercent: 60,
    allocatorVersion: 'living-plan-v2', evidenceHash: 'evidence', candidateHash: 'candidate', status: 'ready',
    resourceBasisCents: 100000, targetCents: 60000, plannedCents: 60000, unassignedCents: 0, overTargetCents: 0,
    allocations: [allocation('housing', 20000), allocation('food', 40000)], receipt: null,
  };
}

function moneyTransaction(id: string, date: string, amountCents: number): MoneySnapshot['transactions'][number] {
  return {
    id, accountId: null, accountName: 'Checking', institutionName: 'Bank', merchantName: id,
    amountCents, direction: 'outflow', date, pending: false, currencyCode: 'USD', categoryId: 'food',
    categoryName: 'Food', reviewState: 'assigned', moneyMeaning: null,
  };
}

function category(id: string, plannedCents: number, spentCents: number): MoneyCategory {
  return {
    id, sourceId: `${id}-uuid`, name: id, description: null, accentColor: '#315545', plannedCents, spentCents,
    remainingCents: plannedCents - spentCents, percentUsed: Math.round((spentCents / plannedCents) * 100), transactionCount: 1,
    rolloverEnabled: false, fundingRhythm: 'monthly', fundingPolicyVersion: null, starterWeight: 1,
    monthlyContributionCents: plannedCents, reserveAvailableCents: 0, reserveBalanceCents: 0,
    reserveBalancePeriodId: null, reserveAvailabilityKnown: true, expectedNeed: null,
    fundingCoverage: { status: 'none' },
    mappingTags: id === 'housing' ? ['housing'] : [],
    forecastSettings: { mode: 'paced', manualProjectedSpendCents: null, scheduledAmountCents: null, scheduledDueDay: null },
    forecast: { mode: 'paced', claim: 'monthly_range', expectedSpendCents: spentCents, projectedSpendCents: spentCents, projectionRangeLowCents: spentCents, projectionRangeHighCents: spentCents, projectedRemainingCents: plannedCents - spentCents, projectedOverageCents: 0, confidence: 'high', status: 'steady' },
  };
}

function allocation(categoryId: string, amountCents: number): LivingPlanAllocation {
  return { categoryId, amountCents, fixedCents: 0, overrideCents: amountCents, flexibleCents: 0, exposureCents: 0, source: 'user_override', fundingRhythm: 'monthly', priorReserveCents: 0, expectedNeed: null };
}

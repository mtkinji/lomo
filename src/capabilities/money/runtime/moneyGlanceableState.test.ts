import type { MoneySnapshot } from '../data/moneySnapshot';
import { buildMoneyGlanceableSnapshot } from './moneyGlanceableState';

function snapshot(): MoneySnapshot {
  return {
    periodLabel: 'July 2026',
    generatedAt: '2026-07-23T18:00:00.000Z',
    lastSyncedAt: '2026-07-23T17:00:00.000Z',
    totals: {
      plannedCents: 100_000,
      spentCents: 64_000,
      remainingCents: 36_000,
      needsReviewCount: 3,
    },
    forecast: {
      projectedSpendCents: 105_000, projectionRangeLowCents: 95_000, projectionRangeHighCents: 115_000,
      projectedRemainingCents: 0, projectedOverageCents: 5_000, confidence: 'medium', atRiskCategoryCount: 1,
    },
    outsidePlan: { spentCents: 0, transactionCount: 0 },
    categories: [
      {
        id: 'groceries',
        sourceId: 'category-groceries',
        name: 'Groceries',
        description: null,
        accentColor: '#315545',
        plannedCents: 40_000,
        spentCents: 32_000,
        remainingCents: 8_000,
        percentUsed: 80,
        transactionCount: 8,
        rolloverEnabled: false,
        fundingRhythm: 'monthly', fundingPolicyVersion: null, starterWeight: 0,
        monthlyContributionCents: 40_000, reserveAvailableCents: 0, reserveBalanceCents: 0,
        reserveBalancePeriodId: null, reserveAvailabilityKnown: true,
        expectedNeed: null, fundingCoverage: { status: 'none' },
        forecast: {
          mode: 'paced', claim: 'monthly_range', confidence: 'medium', expectedSpendCents: 30_000,
          projectedSpendCents: 40_000, projectionRangeLowCents: 36_000,
          projectionRangeHighCents: 44_000, projectedRemainingCents: 0,
          projectedOverageCents: 0, status: 'watch',
        },
      },
      {
        id: 'fun',
        sourceId: 'category-fun',
        name: 'Fun',
        description: null,
        accentColor: '#315545',
        plannedCents: 10_000,
        spentCents: 13_000,
        remainingCents: -3_000,
        percentUsed: 130,
        transactionCount: 4,
        rolloverEnabled: false,
        fundingRhythm: 'monthly', fundingPolicyVersion: null, starterWeight: 0,
        monthlyContributionCents: 10_000, reserveAvailableCents: 0, reserveBalanceCents: 0,
        reserveBalancePeriodId: null, reserveAvailabilityKnown: true,
        expectedNeed: null, fundingCoverage: { status: 'none' },
        forecast: {
          mode: 'paced', claim: 'monthly_range', confidence: 'medium', expectedSpendCents: 8_000,
          projectedSpendCents: 13_000, projectionRangeLowCents: 13_000,
          projectionRangeHighCents: 14_300, projectedRemainingCents: 0,
          projectedOverageCents: 3_000, status: 'over',
        },
      },
    ],
    transactions: [],
    accounts: [],
    livingLimitAnswer: {
      state: 'supported',
      headlineAmountCents: 34_296,
      limitLine: { livingPercent: 70, livingLimitCents: 336_000 },
      qualification: null,
      recoveryAction: null,
      reviewTransactionIds: [],
      facts: {
        periodId: '2026-07', planVersionId: 'version-1', policyVersion: 'money-plan-limit-v3',
        resourceBasisCents: 480_000, resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: '2026-07-24T12:00:00Z',
        livingPercent: 70, livingLimitCents: 336_000, protectedPlanCents: 200_000, protectedOverageCents: 0,
        flexibleCapacityCents: 136_000, countedFlexibleSpendCents: 101_704,
        flexibleRoomCents: 34_296, flexibleRoomLowCents: 34_296, flexibleRoomHighCents: 34_296,
        unresolvedInScopeCents: 0, plannedCents: 336_000, unassignedCents: 0,
        overLimitCents: 0, freshness: 'fresh', confidence: 'supported', qualificationReason: null,
      },
    },
  };
}

describe('buildMoneyGlanceableSnapshot', () => {
  it('publishes the same forecast-based meter status used by the app', () => {
    const source = snapshot();
    source.categories[0] = {
      ...source.categories[0],
      percentUsed: 57,
      remainingCents: 17_200,
      forecast: {
        ...source.categories[0].forecast,
        status: 'watch',
      },
    };

    const result = buildMoneyGlanceableSnapshot(source, new Date(2026, 6, 24));

    expect(result.categories.find((category) => category.id === 'groceries')?.status).toBe('near_limit');
  });

  it('keeps a projected overage in warning state until the category is actually over budget', () => {
    const source = snapshot();
    source.categories[0] = {
      ...source.categories[0],
      percentUsed: 95,
      remainingCents: 2_000,
      forecast: {
        ...source.categories[0].forecast,
        projectedOverageCents: 5_000,
        status: 'over',
      },
    };

    const result = buildMoneyGlanceableSnapshot(source, new Date(2026, 6, 24));

    expect(result.categories.find((category) => category.id === 'groceries')?.status).toBe('near_limit');
  });

  it('publishes exact display-safe flexible and category facts without transaction or account details', () => {
    const result = buildMoneyGlanceableSnapshot(snapshot(), new Date(2026, 6, 24));

    expect(result).toEqual({
      periodLabel: 'July 2026',
      percentUsed: 64,
      needsReviewCount: 3,
      flexibleMoney: {
        state: 'left',
        amountCents: 34_296,
        flexibleCapacityCents: 136_000,
        countedFlexibleSpendCents: 101_704,
        deepLink: 'kwilt://money?source=widget',
      },
      categories: [
        {
          id: 'fun',
          name: 'Fun',
          paceSentiment: 'over',
          percentUsed: 130,
          periodElapsedPercent: 77,
          status: 'over',
          plannedCents: 10_000,
          spentCents: 13_000,
          remainingCents: -3_000,
          deepLink: 'kwilt://money/category/fun?source=widget',
        },
        {
          id: 'groceries',
          name: 'Groceries',
          paceSentiment: 'on-track',
          percentUsed: 80,
          periodElapsedPercent: 77,
          status: 'near_limit',
          plannedCents: 40_000,
          spentCents: 32_000,
          remainingCents: 8_000,
          deepLink: 'kwilt://money/category/groceries?source=widget',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/merchant|account|transaction/i);
  });

  it('publishes exact over and unavailable states without inventing zero', () => {
    const over = snapshot();
    over.livingLimitAnswer = {
      ...over.livingLimitAnswer!,
      state: 'over_flexible_room',
      headlineAmountCents: 8_400,
      facts: { ...over.livingLimitAnswer!.facts, flexibleRoomCents: -8_400 },
    };
    expect(buildMoneyGlanceableSnapshot(over).flexibleMoney).toMatchObject({
      state: 'over', amountCents: 8_400,
    });

    const unavailable = snapshot();
    unavailable.livingLimitAnswer = {
      ...unavailable.livingLimitAnswer!,
      state: 'missing_income_basis',
      headlineAmountCents: null,
      limitLine: null,
    };
    expect(buildMoneyGlanceableSnapshot(unavailable).flexibleMoney).toEqual({
      state: 'unavailable',
      amountCents: null,
      flexibleCapacityCents: 136_000,
      countedFlexibleSpendCents: 101_704,
      deepLink: 'kwilt://money?source=widget',
    });
  });

  it('caps invalid percentages and publishes every category for widget configuration', () => {
    const input = snapshot();
    input.categories = [
      ...input.categories,
      { ...input.categories[0], id: 'one', name: 'One', percentUsed: -10 },
      { ...input.categories[0], id: 'two', name: 'Two', percentUsed: Number.NaN },
    ];

    const result = buildMoneyGlanceableSnapshot(input, new Date(2026, 6, 24));

    expect(result.categories).toHaveLength(4);
    expect(result.categories.every((category) => category.percentUsed >= 0 && category.percentUsed <= 999)).toBe(true);
  });
});

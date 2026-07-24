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
        forecast: {
          mode: 'paced', confidence: 'medium', expectedSpendCents: 30_000,
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
        forecast: {
          mode: 'paced', confidence: 'medium', expectedSpendCents: 8_000,
          projectedSpendCents: 13_000, projectionRangeLowCents: 13_000,
          projectionRangeHighCents: 14_300, projectedRemainingCents: 0,
          projectedOverageCents: 3_000, status: 'over',
        },
      },
    ],
    transactions: [],
    accounts: [],
  };
}

describe('buildMoneyGlanceableSnapshot', () => {
  it('publishes progress without dollar amounts, merchants, or account details', () => {
    const result = buildMoneyGlanceableSnapshot(snapshot());

    expect(result).toEqual({
      periodLabel: 'July 2026',
      percentUsed: 64,
      needsReviewCount: 3,
      categories: [
        {
          id: 'fun',
          name: 'Fun',
          percentUsed: 130,
          status: 'over',
          deepLink: 'kwilt://money/category/fun?source=widget',
        },
        {
          id: 'groceries',
          name: 'Groceries',
          percentUsed: 80,
          status: 'on_track',
          deepLink: 'kwilt://money/category/groceries?source=widget',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/64000|36000|merchant|account/i);
  });

  it('caps invalid percentages and limits the widget to three categories', () => {
    const input = snapshot();
    input.categories = [
      ...input.categories,
      { ...input.categories[0], id: 'one', name: 'One', percentUsed: -10 },
      { ...input.categories[0], id: 'two', name: 'Two', percentUsed: Number.NaN },
    ];

    const result = buildMoneyGlanceableSnapshot(input);

    expect(result.categories).toHaveLength(3);
    expect(result.categories.every((category) => category.percentUsed >= 0 && category.percentUsed <= 999)).toBe(true);
  });
});

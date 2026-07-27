import type { MoneySnapshot } from './moneySnapshot';
import {
  applyConfirmedCategoryPatch,
  applyConfirmedTransactionPatch,
} from './moneyConfirmedPatches';

const snapshot = {
  periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: null,
  totals: { plannedCents: 10000, spentCents: 2500, remainingCents: 7500, needsReviewCount: 1 },
  forecast: { projectedSpendCents: 2500, projectionRangeLowCents: 2500, projectionRangeHighCents: 2500, projectedRemainingCents: 7500, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0 },
  outsidePlan: { spentCents: 0, transactionCount: 0 },
  categories: [{
    id: 'groceries', sourceId: 'category-uuid', name: 'Groceries', description: null, accentColor: '#315545',
    plannedCents: 10000, spentCents: 2500, remainingCents: 7500, percentUsed: 25, transactionCount: 1,
    rolloverEnabled: false, fundingRhythm: 'monthly', fundingPolicyVersion: null, starterWeight: 1,
    monthlyContributionCents: 10000, reserveAvailableCents: 0, reserveBalanceCents: 0,
    reserveBalancePeriodId: null, reserveAvailabilityKnown: true, expectedNeed: null,
    fundingCoverage: { status: 'none' },
    forecast: { mode: 'paced', claim: 'monthly_range', expectedSpendCents: 2500, projectedSpendCents: 2500, projectionRangeLowCents: 2500, projectionRangeHighCents: 2500, projectedRemainingCents: 7500, projectedOverageCents: 0, confidence: 'high', status: 'steady' },
  }],
  transactions: [{
    id: 'transaction-1', accountId: 'account-1', accountName: 'Checking', institutionName: 'Chase',
    merchantName: 'Store', amountCents: 2500, direction: 'outflow', date: '2026-07-24', pending: false,
    currencyCode: 'USD', categoryId: null, categoryName: 'Needs review', reviewState: 'needs_review', moneyMeaning: null,
  }],
  accounts: [],
} as MoneySnapshot;

describe('confirmed Money patches', () => {
  it('updates a confirmed transaction category without replacing the snapshot', () => {
    const result = applyConfirmedTransactionPatch(snapshot, {
      transactionId: 'transaction-1', categoryId: 'groceries', categoryName: 'Groceries',
      reviewState: 'assigned', moneyMeaning: null,
    });

    expect(result.transactions[0]).toMatchObject({ categoryId: 'groceries', categoryName: 'Groceries', reviewState: 'assigned' });
    expect(result.totals.needsReviewCount).toBe(0);
  });

  it.each([
    ['transfer' as const, 'Internal transfer'],
    ['not_counted' as const, 'Outside the plan'],
  ])('updates a confirmed %s meaning', (moneyMeaning, categoryName) => {
    const result = applyConfirmedTransactionPatch(snapshot, {
      transactionId: 'transaction-1', categoryId: null, categoryName,
      reviewState: 'not_counted', moneyMeaning,
    });

    expect(result.transactions[0]).toMatchObject({ categoryId: null, categoryName, reviewState: 'not_counted', moneyMeaning });
  });

  it('limits a confirmed category patch to bounded identity and rollover fields', () => {
    const result = applyConfirmedCategoryPatch(snapshot, {
      categorySourceId: 'category-uuid', name: 'Food at home', rolloverEnabled: true,
    });

    expect(result.categories[0]).toMatchObject({ name: 'Food at home', rolloverEnabled: true, plannedCents: 10000 });
  });
});

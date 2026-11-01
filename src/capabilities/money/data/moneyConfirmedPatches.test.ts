import type { MoneySnapshot } from './moneySnapshot';
import {
  applyConfirmedCategoryPatch,
  applyConfirmedMerchantRulePatch,
  applyConfirmedTransactionPlanRolePatch,
  applyConfirmedTransactionNotePatch,
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
  it('applies all confirmed settings and their server versions before a refresh', () => {
    const result = applyConfirmedCategoryPatch({ ...snapshot, livingLimitAnswer: {}, transactions: [{ ...snapshot.transactions[0], categoryId: 'groceries', date: new Date().toISOString().slice(0, 10) }] } as MoneySnapshot, {
      categorySourceId: 'category-uuid', name: 'Household', budgetCents: 20000,
      fundingRhythm: 'reserve', expectedNeed: { amountCents: 50000, dueMonth: '2026-12' },
      planRole: 'protected', rolloverEnabled: false, rolloverPolicy: null,
      categoryUpdatedAt: '2026-11-01T10:01:00Z', planUpdatedAt: '2026-11-01T10:02:00Z',
    });
    expect(result.categories[0]).toMatchObject({
      name: 'Household', plannedCents: 20000, monthlyContributionCents: 20000, remainingCents: 17500,
      fundingRhythm: 'reserve', expectedNeed: { amountCents: 50000, dueMonth: '2026-12' },
      planRole: 'protected', planRoleOverride: 'protected',
      categoryUpdatedAt: '2026-11-01T10:01:00Z', planUpdatedAt: '2026-11-01T10:02:00Z', updatedAt: '2026-11-01T10:02:00Z',
    });
    expect(result.totals).toMatchObject({ plannedCents: 20000, remainingCents: 17500 });
    expect(result.livingLimitAnswer).toBeNull();
  });

  it('retains reserve accumulation from an older anchor when changing its role', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-15T12:00:00Z'));
    try {
      const prior = { ...snapshot, categories: [{ ...snapshot.categories[0], fundingRhythm: 'reserve' as const,
        spentCents: 0, remainingCents: 65000, reserveAvailableCents: 65000,
        reserveBalanceCents: 30000, reserveBalancePeriodId: '2026-08', rolloverPolicy: null }],
        transactions: [{ ...snapshot.transactions[0], date: '2026-09-15', categoryId: 'groceries', amountCents: 5000 }] };
      const result = applyConfirmedCategoryPatch(prior, { categorySourceId: 'category-uuid', planRole: 'protected' });
      expect(result.categories[0]).toMatchObject({ remainingCents: 65000, reserveAvailableCents: 65000 });
      expect(result.totals.remainingCents).toBe(65000);
    } finally { jest.useRealTimers(); }
  });

  it('lets current-month refunds offset older reserve spending before clamping', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-15T12:00:00Z'));
    try {
      const prior = { ...snapshot, categories: [{ ...snapshot.categories[0], fundingRhythm: 'reserve' as const,
        spentCents: 0, remainingCents: 65000, reserveAvailableCents: 65000,
        reserveBalanceCents: 30000, reserveBalancePeriodId: '2026-08', rolloverPolicy: null }],
        transactions: [
          { ...snapshot.transactions[0], date: '2026-09-15', categoryId: 'groceries', amountCents: 10000 },
          { ...snapshot.transactions[0], id: 'refund', date: '2026-11-02', categoryId: 'groceries', amountCents: 5000,
            direction: 'inflow' as const, moneyMeaning: 'category_credit' as const },
        ] };
      expect(applyConfirmedCategoryPatch(prior, { categorySourceId: 'category-uuid', planRole: 'protected' })
        .categories[0].reserveAvailableCents).toBe(65000);
    } finally { jest.useRealTimers(); }
  });

  it('does not overwrite a newer snapshot with a recovered older receipt', () => {
    const prior = { ...snapshot, categories: [{ ...snapshot.categories[0], name: 'Newer edit',
      categoryUpdatedAt: '2026-11-01T11:00:00Z', planUpdatedAt: '2026-11-01T11:00:00Z' }] };
    const result = applyConfirmedCategoryPatch(prior, { categorySourceId: 'category-uuid', name: 'Old save',
      expectedCategoryUpdatedAt: '2026-11-01T09:00:00Z', expectedPlanUpdatedAt: '2026-11-01T09:00:00Z',
      categoryUpdatedAt: '2026-11-01T10:00:00Z', planUpdatedAt: '2026-11-01T10:00:00Z' });
    expect(result.categories[0].name).toBe('Newer edit');
  });

  it('refreshes the aggregate forecast after a changed amount', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:00:00Z'));
    try {
      const result = applyConfirmedCategoryPatch(snapshot, { categorySourceId: 'category-uuid', budgetCents: 20000 });
      expect(result.forecast.projectedRemainingCents).toBe(17500);
      expect(result.forecast.projectedRemainingCents).not.toBe(snapshot.forecast.projectedRemainingCents);
    } finally { jest.useRealTimers(); }
  });

  it('applies a confirmed household note without changing financial truth', () => {
    const result = applyConfirmedTransactionNotePatch(snapshot, {
      transactionId: 'transaction-1',
      note: 'Family pictures',
    });

    expect(result.transactions[0]).toMatchObject({ userNote: 'Family pictures', categoryName: 'Needs review' });
    expect(result.totals).toEqual(snapshot.totals);
    expect(result.categories).toBe(snapshot.categories);
  });

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
    const cover = {
      source: 'unsplash' as const, photoId: 'cover', imageUrl: 'https://images.unsplash.com/photo-cover',
      photographerName: 'Maya', photographerUrl: 'https://unsplash.com/@maya',
      sourceUrl: 'https://unsplash.com/photos/cover', color: null,
    };
    const result = applyConfirmedCategoryPatch(snapshot, {
      categorySourceId: 'category-uuid', name: 'Food at home', rolloverEnabled: true, coverImage: cover,
    });

    expect(result.categories[0]).toMatchObject({ name: 'Food at home', rolloverEnabled: true, coverImage: cover, plannedCents: 10000 });
  });

  it('marks the source transaction rule as confirmed without projecting unverified history', () => {
    const result = applyConfirmedMerchantRulePatch(snapshot, {
      transactionId: 'transaction-1',
      categoryId: 'groceries',
    });

    expect(result.transactions[0]).toMatchObject({
      id: 'transaction-1',
      merchantRuleCategoryId: 'groceries',
    });
    expect(result.totals).toEqual(snapshot.totals);
    expect(result.categories).toBe(snapshot.categories);
  });

  it('applies a confirmed transaction plan-role override without changing its category', () => {
    const categorized = {
      ...snapshot,
      transactions: [{ ...snapshot.transactions[0], categoryId: 'groceries', categoryName: 'Groceries', reviewState: 'assigned' as const }],
    };

    const result = applyConfirmedTransactionPlanRolePatch(categorized, {
      transactionId: 'transaction-1',
      planRoleOverride: 'protected',
    });

    expect(result.transactions[0]).toMatchObject({
      categoryId: 'groceries',
      categoryName: 'Groceries',
      planRoleOverride: 'protected',
    });
  });
});

it('removes carried money and its forecast immediately when rollover is disabled', () => {
  const prior = { ...snapshot, categories: [{ ...snapshot.categories[0], rolloverEnabled: true, rolloverCarriedInCents: 90000,
    rolloverPolicy: { startMonth: '2026-01', startingBalanceCents: 90000, monthlyAmounts: { '2026-01': 10000 }, timeZone: 'America/Denver' },
    forecast: { ...snapshot.categories[0].forecast, projectedRemainingCents: 97500 },
  }] };
  const result = applyConfirmedCategoryPatch(prior, { categorySourceId: 'category-uuid', rolloverEnabled: false, rolloverPolicy: null });
  expect(result.categories[0]).toMatchObject({ remainingCents: 7500, rolloverCarriedInCents: 0 });
  expect(result.categories[0].forecast.projectedRemainingCents).toBeLessThanOrEqual(10000);
});

 it('clears reserve display after a confirmed switch to monthly even if refresh fails', () => {
  const prior = { ...snapshot, categories: [{ ...snapshot.categories[0], fundingRhythm: 'reserve' as const, reserveAvailableCents: 97500, reserveAvailabilityKnown: true }] };
  const result = applyConfirmedCategoryPatch(prior, { categorySourceId: 'category-uuid', fundingRhythm: 'monthly' });
  expect(result.categories[0]).toMatchObject({ fundingRhythm: 'monthly', remainingCents: 7500, reserveAvailableCents: 0, fundingCoverage: { status: 'none' } });
  expect(result.categories[0].forecast.projectedRemainingCents).toBeLessThanOrEqual(10000);
});

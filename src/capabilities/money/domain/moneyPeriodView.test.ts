import type { MoneySnapshot } from '../data/moneySnapshot';
import { buildCumulativeSpendSeries } from './moneyDetailView';
import { projectMoneyCategoryPeriodView, projectMoneyPeriodView } from './moneyPeriodView';

const snapshot: MoneySnapshot = {
  periodLabel: 'July 2026',
  generatedAt: '2026-07-24T12:00:00.000Z',
  lastSyncedAt: '2026-07-24T11:00:00.000Z',
  totals: { plannedCents: 50000, spentCents: 12500, remainingCents: 37500, needsReviewCount: 0 },
  forecast: {
    projectedSpendCents: 15000,
    projectionRangeLowCents: 13000,
    projectionRangeHighCents: 18000,
    projectedRemainingCents: 35000,
    projectedOverageCents: 0,
    confidence: 'high',
    atRiskCategoryCount: 0,
  },
  outsidePlan: { spentCents: 0, transactionCount: 0 },
  categories: [{
    id: 'groceries',
    sourceId: 'category-1',
    name: 'Groceries',
    description: null,
    accentColor: '#315545',
    plannedCents: 50000,
    spentCents: 12500,
    remainingCents: 37500,
    percentUsed: 25,
    transactionCount: 1,
    rolloverEnabled: false,
    fundingRhythm: 'monthly',
    fundingPolicyVersion: null,
    starterWeight: 0,
    monthlyContributionCents: 50000,
    reserveAvailableCents: 0,
    reserveBalanceCents: 0,
    reserveBalancePeriodId: null,
    reserveAvailabilityKnown: true,
    expectedNeed: null,
    fundingCoverage: { status: 'none' },
    forecast: {
      mode: 'paced',
      claim: 'monthly_range',
      expectedSpendCents: 12000,
      projectedSpendCents: 15000,
      projectionRangeLowCents: 13000,
      projectionRangeHighCents: 18000,
      projectedRemainingCents: 35000,
      projectedOverageCents: 0,
      confidence: 'high',
      status: 'steady',
    },
  }],
  transactions: [
    {
      id: 'july', accountId: 'account', accountName: 'Checking', institutionName: 'Bank',
      merchantName: 'Market', amountCents: 12500, direction: 'outflow', date: '2026-07-10',
      pending: false, currencyCode: 'USD', categoryId: 'groceries', categoryName: 'Groceries',
      reviewState: 'assigned', moneyMeaning: null,
    },
    {
      id: 'june', accountId: 'account', accountName: 'Checking', institutionName: 'Bank',
      merchantName: 'Market', amountCents: 20000, direction: 'outflow', date: '2026-06-10',
      pending: false, currencyCode: 'USD', categoryId: 'groceries', categoryName: 'Groceries',
      reviewState: 'assigned', moneyMeaning: null,
    },
  ],
  accounts: [],
};

describe('projectMoneyPeriodView', () => {
  it('keeps the authoritative current-month projection intact', () => {
    const view = projectMoneyPeriodView(snapshot, 0, new Date(2026, 6, 24));

    expect(view.periodLabel).toBe('July 2026');
    expect(view.categories[0]).toMatchObject({ spentCents: 12500, percentUsed: 25 });
    expect(view.periodElapsedPercent).toBe(77);
  });

  it('reprojects the same categories from the selected month transaction evidence', () => {
    const view = projectMoneyPeriodView(snapshot, -1, new Date(2026, 6, 24));

    expect(view.periodLabel).toBe('June 2026');
    expect(view.categories[0]).toMatchObject({
      spentCents: 20000,
      remainingCents: 30000,
      percentUsed: 40,
      transactionCount: 1,
    });
    expect(view.periodElapsedPercent).toBe(100);
  });

  it('removes saved-money coverage from historical category plan usage', () => {
    const historicalSavedMoneySnapshot: MoneySnapshot = {
      ...snapshot,
      transactions: snapshot.transactions.map((transaction) => transaction.id === 'june'
        ? { ...transaction, savedResourceCents: transaction.amountCents }
        : transaction),
    };

    const view = projectMoneyPeriodView(historicalSavedMoneySnapshot, -1, new Date(2026, 6, 24));

    expect(view.categories[0]).toMatchObject({
      spentCents: 0,
      remainingCents: 50000,
      percentUsed: 0,
    });
  });
});

describe('projectMoneyCategoryPeriodView', () => {
  it('scopes category truth and activity to the selected month', () => {
    const view = projectMoneyCategoryPeriodView(snapshot, 'groceries', -1, new Date(2026, 6, 24));

    expect(view).toMatchObject({
      periodLabel: 'June 2026',
      periodStartIso: '2026-06-01',
      periodEndIso: '2026-06-30',
      periodElapsedPercent: 100,
      category: { spentCents: 20000, remainingCents: 30000, transactionCount: 1 },
    });
    expect(view?.transactions.map((transaction) => transaction.id)).toEqual(['june']);
    expect(view?.historicalTransactions.map((transaction) => transaction.id)).toEqual(['july', 'june']);
  });

  it('resolves either the public category id or authoritative source id', () => {
    expect(projectMoneyCategoryPeriodView(snapshot, 'category-1', 0, new Date(2026, 6, 24))?.category.id)
      .toBe('groceries');
  });

  it('shows a split transaction once at this category share and includes it in historical totals', () => {
    const splitSnapshot: MoneySnapshot = {
      ...snapshot,
      transactions: [
        ...snapshot.transactions,
        {
          id: 'mixed-june', accountId: 'account', accountName: 'Checking', institutionName: 'Bank',
          merchantName: 'Warehouse', amountCents: 9497, direction: 'outflow', date: '2026-06-20',
          pending: false, currencyCode: 'USD', categoryId: null, categoryName: 'Split across categories',
          reviewState: 'assigned', moneyMeaning: null,
          allocations: [
            {
              categoryId: 'groceries', sourceCategoryId: 'category-1',
              categoryName: 'Groceries', amountCents: 7000,
            },
            {
              categoryId: 'shopping', sourceCategoryId: 'category-2',
              categoryName: 'Shopping', amountCents: 2497,
            },
          ],
        },
      ],
    };

    const view = projectMoneyCategoryPeriodView(splitSnapshot, 'groceries', -1, new Date(2026, 6, 24));

    expect(view?.category).toMatchObject({ spentCents: 27000, transactionCount: 2 });
    expect(view?.transactions.map(({ id, amountCents }) => [id, amountCents])).toEqual([
      ['june', 20000],
      ['mixed-june', 7000],
    ]);
    expect(view?.historicalTransactions.find(({ id }) => id === 'mixed-june')?.amountCents).toBe(7000);
  });

  it('keeps a saved-money split on the same plan-covered basis as category spending', () => {
    const splitSnapshot: MoneySnapshot = {
      ...snapshot,
      transactions: [
        ...snapshot.transactions,
        {
          id: 'saved-split', accountId: 'account', accountName: 'Checking', institutionName: 'Bank',
          merchantName: 'Warehouse', amountCents: 9497, savedResourceCents: 3000,
          direction: 'outflow', date: '2026-06-20', pending: false, currencyCode: 'USD',
          categoryId: null, categoryName: 'Split across categories', reviewState: 'assigned', moneyMeaning: null,
          allocations: [
            { categoryId: 'groceries', sourceCategoryId: 'category-1', categoryName: 'Groceries', amountCents: 7000 },
            { categoryId: 'shopping', sourceCategoryId: 'category-2', categoryName: 'Shopping', amountCents: 2497 },
          ],
        },
      ],
    };

    const view = projectMoneyCategoryPeriodView(splitSnapshot, 'groceries', -1, new Date(2026, 6, 24));
    const chartSeries = buildCumulativeSpendSeries(
      view?.transactions ?? [],
      view?.periodStartIso ?? '',
      view?.periodEndIso ?? '',
    );

    expect(chartSeries.at(-1)?.valueCents).toBe(view?.category.spentCents);
  });

  it('returns null when the category is not in the authoritative snapshot', () => {
    expect(projectMoneyCategoryPeriodView(snapshot, 'missing', 0, new Date(2026, 6, 24))).toBeNull();
  });
});

import { initialMoneyDataState, moneyDataReducer } from './moneyDataState';

const snapshot = {
  periodLabel: 'July 2026',
  generatedAt: '2026-07-23T18:00:00.000Z',
  lastSyncedAt: null,
  totals: { plannedCents: 0, spentCents: 0, remainingCents: 0, needsReviewCount: 0 },
  forecast: {
    projectedSpendCents: 0, projectionRangeLowCents: 0, projectionRangeHighCents: 0,
    projectedRemainingCents: 0, projectedOverageCents: 0, confidence: 'high' as const,
    atRiskCategoryCount: 0,
  },
  outsidePlan: { spentCents: 0, transactionCount: 0 },
  categories: [],
  transactions: [],
  accounts: [],
};

describe('moneyDataReducer', () => {
  it('loads an initial snapshot', () => {
    const loading = moneyDataReducer(initialMoneyDataState, { type: 'load' });
    expect(loading).toEqual({
      status: 'loading', snapshot: null, error: null, refreshing: false, stale: false,
      planVersionId: null, planReceiptId: null,
    });
    expect(moneyDataReducer(loading, { type: 'success', snapshot })).toEqual({
      status: 'ready',
      snapshot,
      error: null,
      refreshing: false,
      stale: false,
      planVersionId: null,
      planReceiptId: null,
    });
  });

  it('shows a cached snapshot as usable but stale while refresh happens silently', () => {
    expect(moneyDataReducer(initialMoneyDataState, { type: 'cached_snapshot', snapshot })).toEqual({
      ...initialMoneyDataState,
      status: 'ready',
      snapshot,
      refreshing: false,
      stale: true,
    });
  });

  it('retains known-good financial data when refresh fails', () => {
    const ready = moneyDataReducer(initialMoneyDataState, { type: 'success', snapshot });
    const refreshing = moneyDataReducer(ready, { type: 'load' });
    expect(refreshing.snapshot).toBe(snapshot);
    expect(refreshing.refreshing).toBe(true);

    const failed = moneyDataReducer(refreshing, { type: 'failure', message: 'Network unavailable' });
    expect(failed).toEqual({
      status: 'ready',
      snapshot,
      error: 'Network unavailable',
      refreshing: false,
      stale: false,
      planVersionId: null,
      planReceiptId: null,
    });
  });

  it('keeps a confirmed patch when a background refresh fails', () => {
    const ready = moneyDataReducer(initialMoneyDataState, { type: 'success', snapshot });
    const patched = moneyDataReducer(ready, {
      type: 'confirmed_category_patch',
      patch: { categorySourceId: 'missing', name: 'Confirmed' },
    });
    const failed = moneyDataReducer(patched, { type: 'background_failure', message: 'Refresh later' });

    expect(failed.snapshot).toBe(snapshot);
    expect(failed.status).toBe('ready');
    expect(failed.stale).toBe(true);
  });

  it('accepts a confirmed merchant-rule receipt while marking broader Money truth stale', () => {
    const withTransaction = {
      ...snapshot,
      transactions: [{ id: 'transaction-1', merchantRuleCategoryId: null }],
    } as typeof snapshot;
    const ready = moneyDataReducer(initialMoneyDataState, { type: 'success', snapshot: withTransaction });
    const patched = moneyDataReducer(ready, {
      type: 'confirmed_merchant_rule_patch',
      patch: { transactionId: 'transaction-1', categoryId: 'groceries' },
    } as never);

    expect(patched.snapshot?.transactions[0]).toMatchObject({ merchantRuleCategoryId: 'groceries' });
    expect(patched.status).toBe('ready');
    expect(patched.stale).toBe(true);
  });

  it('accepts an authoritative governed-plan projection atomically', () => {
    const ready = moneyDataReducer(initialMoneyDataState, { type: 'success', snapshot });
    const projected = { ...snapshot, generatedAt: 'plan-projection' };
    const result = moneyDataReducer(ready, {
      type: 'authoritative_plan_projection',
      snapshot: projected,
      versionId: 'version-2',
      receiptId: 'receipt-2',
    });

    expect(result.snapshot).toBe(projected);
    expect(result.planVersionId).toBe('version-2');
    expect(result.planReceiptId).toBe('receipt-2');
  });

  it('applies a server-confirmed category order without changing category data', () => {
    const categorySnapshot = {
      ...snapshot,
      categories: [
        { id: 'health', sourceId: 'category-1', name: 'Health' },
        { id: 'shopping', sourceId: 'category-2', name: 'Shopping' },
      ],
    } as typeof snapshot;
    const ready = moneyDataReducer(initialMoneyDataState, { type: 'success', snapshot: categorySnapshot });
    const result = moneyDataReducer(ready, {
      type: 'confirmed_category_order',
      categorySourceIds: ['category-2', 'category-1'],
    });

    expect(result.snapshot?.categories.map((category) => category.name)).toEqual(['Shopping', 'Health']);
    expect(result.snapshot?.categories[0]).toBe(categorySnapshot.categories[1]);
    expect(result.stale).toBe(true);
  });
});

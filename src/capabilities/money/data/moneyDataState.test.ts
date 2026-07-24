import { initialMoneyDataState, moneyDataReducer } from './moneyDataState';

const snapshot = {
  periodLabel: 'July 2026',
  generatedAt: '2026-07-23T18:00:00.000Z',
  lastSyncedAt: null,
  totals: { plannedCents: 0, spentCents: 0, remainingCents: 0, needsReviewCount: 0 },
  categories: [],
  transactions: [],
  accounts: [],
};

describe('moneyDataReducer', () => {
  it('loads an initial snapshot', () => {
    const loading = moneyDataReducer(initialMoneyDataState, { type: 'load' });
    expect(loading).toEqual({ status: 'loading', snapshot: null, error: null, refreshing: false });
    expect(moneyDataReducer(loading, { type: 'success', snapshot })).toEqual({
      status: 'ready',
      snapshot,
      error: null,
      refreshing: false,
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
    });
  });
});

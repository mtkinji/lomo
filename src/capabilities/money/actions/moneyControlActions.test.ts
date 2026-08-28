import type { MoneySnapshot } from '../data/moneySnapshot';
import {
  MoneyAuthenticationRequiredError,
  MoneyConfirmationRequiredError,
  MoneyTargetStaleError,
  createMoneyControlActions,
  type MoneyControlActionBoundary,
} from './moneyControlActions';

const snapshot = {
  periodLabel: 'August 2026', generatedAt: '2026-08-27T12:00:00.000Z', lastSyncedAt: '2026-08-27T12:00:00.000Z',
  totals: { plannedCents: 90_000, spentCents: 31_000, remainingCents: 59_000, needsReviewCount: 1 },
  forecast: {
    projectedSpendCents: 40_000, projectionRangeLowCents: 35_000,
    projectionRangeHighCents: 45_000, projectedRemainingCents: 50_000,
    projectedOverageCents: 0, confidence: 'medium', atRiskCategoryCount: 0,
  },
  outsidePlan: { spentCents: 2_000, transactionCount: 1 },
  categories: [{
    id: 'groceries', sourceId: 'category-groceries', name: 'Groceries', description: null,
    accentColor: '#315545', plannedCents: 50_000, spentCents: 20_000, remainingCents: 30_000,
    percentUsed: 40, transactionCount: 2, rolloverEnabled: false, fundingRhythm: 'monthly',
    fundingPolicyVersion: null, starterWeight: 1, monthlyContributionCents: 50_000,
    reserveAvailableCents: 0, reserveBalanceCents: 0, reserveBalancePeriodId: null,
    reserveAvailabilityKnown: true, expectedNeed: null,
    fundingCoverage: { status: 'on_track', targetCents: 50_000, fundedCents: 50_000, gapCents: 0 },
    forecast: {
      mode: 'pace', projectedSpendCents: 40_000, projectionRangeLowCents: 35_000,
      projectionRangeHighCents: 45_000, projectedRemainingCents: 10_000,
      projectedOverageCents: 0, confidence: 'medium', pacePercent: 40,
    },
    updatedAt: 'budget-v1',
  }],
  transactions: [
    {
      id: 'payroll-1', accountId: 'checking-1', accountName: 'Private checking', institutionName: 'Private bank',
      merchantName: 'Employer Payroll', amountCents: 300_000, direction: 'inflow', date: '2026-08-25',
      pending: false, currencyCode: 'USD', categoryId: null, categoryName: 'Income or transfer',
      reviewState: 'needs_review', moneyMeaning: null, providerCategoryPrimary: 'INCOME_WAGES',
      updatedAt: 'payroll-v1',
    },
    {
      id: 'checking-payment', accountId: 'checking-1', accountName: 'Private checking', institutionName: 'Private bank',
      merchantName: 'Card payment', amountCents: 35_000, direction: 'outflow', date: '2026-08-24',
      pending: false, currencyCode: 'USD', categoryId: null, categoryName: 'Internal transfer',
      reviewState: 'not_counted', moneyMeaning: 'transfer', updatedAt: 'transfer-v1',
      transferPair: {
        counterpartTransactionId: 'card-credit', sourceAccountName: 'Private checking',
        destinationAccountName: 'Private credit card',
      },
    },
    {
      id: 'card-credit', accountId: 'card-1', accountName: 'Private credit card', institutionName: 'Private bank',
      merchantName: 'Payment received', amountCents: 35_000, direction: 'inflow', date: '2026-08-25',
      pending: false, currencyCode: 'USD', categoryId: null, categoryName: 'Internal transfer',
      reviewState: 'not_counted', moneyMeaning: 'transfer', updatedAt: 'transfer-v2',
      transferPair: {
        counterpartTransactionId: 'checking-payment', sourceAccountName: 'Private checking',
        destinationAccountName: 'Private credit card',
      },
    },
  ],
  accounts: [], connections: [{
    id: 'connection-1', institutionName: 'Private bank', status: 'error', lastSyncedAt: null,
    accountCount: 2, updatedAt: 'connection-v1',
  }],
} as unknown as MoneySnapshot;

function boundary(): jest.Mocked<MoneyControlActionBoundary> {
  return {
    loadSnapshot: jest.fn(async () => snapshot),
    requireFreshAuthentication: jest.fn(async () => true),
    updateCategoryPlan: jest.fn(async (..._args: Parameters<MoneyControlActionBoundary['updateCategoryPlan']>) => ({ confirmedAt: 'budget-v2' })),
    reviewTransactionMeaning: jest.fn(async (..._args: Parameters<MoneyControlActionBoundary['reviewTransactionMeaning']>) => ({ confirmedAt: 'meaning-v2' })),
    setTransactionPlanRoleOverride: jest.fn(async (..._args: Parameters<MoneyControlActionBoundary['setTransactionPlanRoleOverride']>) => ({ confirmedAt: 'treatment-v2' })),
    reviewTransferPair: jest.fn(async (..._args: Parameters<MoneyControlActionBoundary['reviewTransferPair']>) => ({ confirmedAt: 'transfer-v3' })),
    disconnectConnection: jest.fn(async (..._args: Parameters<MoneyControlActionBoundary['disconnectConnection']>) => ({ confirmedAt: 'connection-v2', disconnectedAccountCount: 2 })),
  };
}

describe('moneyControlActions', () => {
  it('reads the explicit monthly plan without leaking account or transaction detail', async () => {
    const actions = createMoneyControlActions(boundary());
    const result = await actions.readBudget();
    expect(result.result).toEqual({
      month: '2026-08', periodLabel: 'August 2026', plannedCents: 90_000,
      categories: [{ id: 'category-groceries', name: 'Groceries', plannedCents: 50_000, updatedAt: 'budget-v1' }],
      observedAt: '2026-08-27T12:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toMatch(/Private|merchantName|accountName|cash.?flow|saved money/i);
  });

  it('rejects a stale budget diff before writing', async () => {
    const store = boundary();
    const actions = createMoneyControlActions(store);
    await expect(actions.updateBudget({
      requestId: 'budget-1', confirmed: true, month: '2026-08', categoryId: 'category-groceries',
      expectedUpdatedAt: 'budget-old', plannedCents: 55_000,
    })).rejects.toBeInstanceOf(MoneyTargetStaleError);
    expect(store.updateCategoryPlan).not.toHaveBeenCalled();
  });

  it('keeps provider payroll inference distinct from an explicit user meaning', async () => {
    const store = boundary();
    const actions = createMoneyControlActions(store);
    const before = await actions.getTransaction({ transactionId: 'payroll-1' });
    expect(before.result).toMatchObject({
      sourceClassification: { providerPrimary: 'INCOME_WAGES' },
      meaning: { explicit: null, effective: 'income', basis: 'provider_inference' },
    });
    await actions.updateTransactionMeaning({
      requestId: 'meaning-1', confirmed: true, transactionId: 'payroll-1',
      expectedUpdatedAt: 'payroll-v1', meaning: 'not_counted',
    });
    expect(store.reviewTransactionMeaning).toHaveBeenCalledWith(
      'payroll-1', { meaning: 'not_counted' }, { expectedUpdatedAt: 'payroll-v1' },
    );
    expect(store.setTransactionPlanRoleOverride).not.toHaveBeenCalled();
  });

  it('updates plan treatment without rewriting transaction meaning', async () => {
    const store = boundary();
    const actions = createMoneyControlActions(store);
    await actions.updateTransactionPlanTreatment({
      requestId: 'treatment-1', confirmed: true, transactionId: 'payroll-1',
      expectedUpdatedAt: 'payroll-v1', treatment: 'protected',
    });
    expect(store.setTransactionPlanRoleOverride).toHaveBeenCalledWith(
      'payroll-1', 'protected', { expectedUpdatedAt: 'payroll-v1' },
    );
    expect(store.reviewTransactionMeaning).not.toHaveBeenCalled();
  });

  it('lists each transfer pair once and reviews the exact two current transactions', async () => {
    const store = boundary();
    const actions = createMoneyControlActions(store);
    const listed = await actions.listTransfers();
    expect(listed.result).toEqual([expect.objectContaining({
      id: 'card-credit:checking-payment', transactionIds: ['card-credit', 'checking-payment'],
      amountCents: 35_000, meaning: 'transfer', updatedAt: 'transfer-v2',
    })]);
    await actions.reviewTransfer({
      requestId: 'transfer-1', confirmed: true, transferId: 'card-credit:checking-payment',
      expectedUpdatedAt: 'transfer-v2', decision: 'confirm_pair',
    });
    expect(store.reviewTransferPair).toHaveBeenCalledWith({
      transactionIds: ['card-credit', 'checking-payment'], expectedUpdatedAt: 'transfer-v2',
      decision: 'confirm_pair',
    });
  });

  it('requires fresh native authentication and explicit confirmation for writes', async () => {
    const store = boundary();
    store.requireFreshAuthentication.mockResolvedValue(false);
    const actions = createMoneyControlActions(store);
    await expect(actions.updateBudget({
      requestId: 'budget-auth', confirmed: true, month: '2026-08', categoryId: 'category-groceries',
      expectedUpdatedAt: 'budget-v1', plannedCents: 55_000,
    })).rejects.toBeInstanceOf(MoneyAuthenticationRequiredError);
    await expect(createMoneyControlActions(boundary()).updateBudget({
      requestId: 'budget-confirm', confirmed: false, month: '2026-08', categoryId: 'category-groceries',
      expectedUpdatedAt: 'budget-v1', plannedCents: 55_000,
    })).rejects.toBeInstanceOf(MoneyConfirmationRequiredError);
  });

  it('deduplicates a repeated request id and never turns a failed disconnect into success', async () => {
    const store = boundary();
    const actions = createMoneyControlActions(store);
    const input = {
      requestId: 'disconnect-1', confirmed: true, connectionId: 'connection-1',
      expectedUpdatedAt: 'connection-v1',
    };
    const [first, duplicate] = await Promise.all([
      actions.disconnectConnection(input), actions.disconnectConnection(input),
    ]);
    expect(duplicate).toBe(first);
    expect(store.disconnectConnection).toHaveBeenCalledTimes(1);

    const failedStore = boundary();
    failedStore.disconnectConnection.mockRejectedValue(new Error('provider_disconnect_failed'));
    await expect(createMoneyControlActions(failedStore).disconnectConnection({
      ...input, requestId: 'disconnect-failed',
    })).rejects.toThrow('provider_disconnect_failed');
  });
});

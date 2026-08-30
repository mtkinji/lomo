import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoneyDataProvider, useMoneyData } from './MoneyDataContext';
import type { MoneyRepository } from './moneyRepository';
import type { MoneySnapshot } from './moneySnapshot';
import type { MoneySnapshotCache } from '../runtime/moneySnapshotCache';
import { reconcileConnectedMoneyActivity } from '../runtime/reconcileConnectedMoneyActivity';

jest.mock('../runtime/moneyGlanceableState', () => ({ syncMoneyGlanceableState: jest.fn() }));
jest.mock('../runtime/reconcileConnectedMoneyActivity', () => ({ reconcileConnectedMoneyActivity: jest.fn() }));
jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: jest.fn(() => ({})) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

const snapshot = {
  periodLabel: 'July 2026', generatedAt: 'before', lastSyncedAt: null,
  totals: { plannedCents: 0, spentCents: 0, remainingCents: 0, needsReviewCount: 0 },
  forecast: {
    projectedSpendCents: 0, projectionRangeLowCents: 0, projectionRangeHighCents: 0,
    projectedRemainingCents: 0, projectedOverageCents: 0, confidence: 'high', atRiskCategoryCount: 0,
  },
  outsidePlan: { spentCents: 0, transactionCount: 0 },
  categories: [{ id: 'groceries', sourceId: 'category-1', name: 'Groceries' }],
  transactions: [{ id: 'transaction-1', merchantRuleCategoryId: null }],
  accounts: [],
} as unknown as MoneySnapshot;

function SaveRuleProbe() {
  const { reviewingTransactionId, saveMerchantRule, snapshot: currentSnapshot, stale, status } = useMoneyData();
  const [completed, setCompleted] = useState(false);
  return (
    <View>
      <Text>{status}</Text>
      <Text>{stale ? 'stale' : 'current'}</Text>
      <Text>{currentSnapshot?.generatedAt ?? 'no-snapshot'}</Text>
      <Text>{reviewingTransactionId ? 'saving' : completed ? 'done' : 'idle'}</Text>
      <Text>{currentSnapshot?.transactions[0]?.merchantRuleCategoryId ?? 'no-rule'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void saveMerchantRule({
            transactionId: 'transaction-1', merchantName: 'Costco', categoryId: 'category-1',
            categoryName: 'Groceries', matchMode: 'exact',
          }).then(() => setCompleted(true));
        }}
      >
        <Text>Save rule</Text>
      </Pressable>
    </View>
  );
}

function ReorderProbe() {
  const { reorderCategories, savingCategoryOrder, snapshot: currentSnapshot } = useMoneyData();
  return (
    <View>
      <Text>{savingCategoryOrder ? 'reordering' : 'order-ready'}</Text>
      <Text>{currentSnapshot?.categories.map((category) => category.name).join(',') ?? 'no-categories'}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void reorderCategories(['category-2', 'category-1']); }}>
        <Text>Reorder</Text>
      </Pressable>
    </View>
  );
}

function ConnectedRefreshProbe() {
  const { error, reconcileConnectedActivity: refreshConnectedActivity, snapshot: currentSnapshot } = useMoneyData();
  return (
    <View>
      <Text>{currentSnapshot?.generatedAt ?? 'no-snapshot'}</Text>
      <Text>{error ?? 'no-error'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => { void refreshConnectedActivity({ trigger: 'manual_sync', sync: true }).catch(() => undefined); }}
      >
        <Text>Refresh connected activity</Text>
      </Pressable>
    </View>
  );
}

function snapshotCache(cached: MoneySnapshot | null): MoneySnapshotCache {
  return {
    load: jest.fn(async () => cached),
    save: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
  };
}

describe('MoneyDataProvider merchant-rule confirmation', () => {
  beforeEach(() => jest.mocked(reconcileConnectedMoneyActivity).mockReset());

  it('reconciles the governed plan after a persisted transaction review', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, 'MoneyDataContext.tsx'), 'utf8');
    const reviewBoundedTransaction = source.slice(
      source.indexOf('const reviewBoundedTransaction = useCallback'),
      source.indexOf('const reviewBroadTransaction = useCallback'),
    );

    expect(reviewBoundedTransaction).toContain("reconcileLivingPlan(getSupabaseClient(), 'transaction_review_changed')");
  });

  it('keeps the last snapshot visible and surfaces a connected-refresh failure', async () => {
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValue(snapshot),
      classifyUnresolvedTransactions: jest.fn().mockResolvedValue({
        policyVersion: 'money-category-v2', consideredCount: 0, assignedCount: 0,
        deterministicAssignedCount: 0, aiAssignedCount: 0, unresolvedCount: 0, retryableCount: 0,
      }),
    } as unknown as MoneyRepository;
    jest.mocked(reconcileConnectedMoneyActivity).mockRejectedValue(new Error('Unable to check connected accounts.'));
    const screen = render(
      <MoneyDataProvider repository={repository}>
        <ConnectedRefreshProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('before');
    fireEvent.press(screen.getByRole('button', { name: 'Refresh connected activity' }));

    await screen.findByText('Unable to check connected accounts.');
    expect(screen.getByText('before')).toBeTruthy();
  });

  it('applies a confirmed category order immediately and refreshes broader Money truth in the background', async () => {
    const orderedSnapshot = {
      ...snapshot,
      categories: [
        { id: 'groceries', sourceId: 'category-1', name: 'Groceries' },
        { id: 'shopping', sourceId: 'category-2', name: 'Shopping' },
      ],
    } as unknown as MoneySnapshot;
    const backgroundRefresh = deferred<MoneySnapshot>();
    const repository = {
      loadSnapshot: jest.fn()
        .mockResolvedValueOnce(orderedSnapshot)
        .mockImplementationOnce(() => backgroundRefresh.promise),
      reorderCategories: jest.fn().mockResolvedValue({
        categoryIds: ['category-2', 'category-1'],
        confirmedAt: '2026-08-05T01:00:00.000Z',
      }),
    } as unknown as MoneyRepository;
    const screen = render(
      <MoneyDataProvider repository={repository}>
        <ReorderProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('Groceries,Shopping');
    fireEvent.press(screen.getByRole('button', { name: 'Reorder' }));

    await screen.findByText('Shopping,Groceries');
    expect(screen.getByText('order-ready')).toBeTruthy();
    expect(repository.reorderCategories).toHaveBeenCalledWith(['category-2', 'category-1']);
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);

  });

  it('renders the last trustworthy snapshot while the authoritative refresh remains in flight', async () => {
    const refresh = deferred<MoneySnapshot>();
    const cached = { ...snapshot, generatedAt: 'cached' } as MoneySnapshot;
    const cache = snapshotCache(cached);
    const repository = {
      loadSnapshot: jest.fn(() => refresh.promise),
      classifyUnresolvedTransactions: jest.fn().mockResolvedValue({
        policyVersion: 'money-category-v2', consideredCount: 0, assignedCount: 0,
        deterministicAssignedCount: 0, aiAssignedCount: 0, unresolvedCount: 0, retryableCount: 0,
      }),
    } as unknown as MoneyRepository;
    const screen = render(
      <MoneyDataProvider repository={repository} snapshotCache={cache} userId="user-a">
        <SaveRuleProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('ready');
    expect(screen.getByText('stale')).toBeTruthy();
    expect(screen.getByText('cached')).toBeTruthy();
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);

    refresh.resolve({ ...snapshot, generatedAt: 'fresh' });
    await screen.findByText('fresh');
    expect(screen.getByText('current')).toBeTruthy();
    expect(cache.save).toHaveBeenCalledWith('user-a', expect.objectContaining({ generatedAt: 'fresh' }));
  });

  it('keeps a cached snapshot visible when the authoritative refresh fails', async () => {
    const cached = { ...snapshot, generatedAt: 'offline-cache' } as MoneySnapshot;
    const cache = snapshotCache(cached);
    const repository = {
      loadSnapshot: jest.fn().mockRejectedValue(new Error('Network unavailable')),
    } as unknown as MoneyRepository;
    const screen = render(
      <MoneyDataProvider repository={repository} snapshotCache={cache} userId="user-a">
        <SaveRuleProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('offline-cache');
    expect(screen.getByText('ready')).toBeTruthy();
    expect(screen.getByText('stale')).toBeTruthy();
  });

  it('finishes the save after confirmation while the full refresh remains in flight', async () => {
    const backgroundRefresh = deferred<MoneySnapshot>();
    const refreshedSnapshot = {
      ...snapshot,
      generatedAt: 'after',
      transactions: [{ ...snapshot.transactions[0], merchantRuleCategoryId: 'groceries' }],
    } as MoneySnapshot;
    const repository = {
      loadSnapshot: jest.fn()
        .mockResolvedValueOnce(snapshot)
        .mockImplementationOnce(() => backgroundRefresh.promise),
      saveMerchantRule: jest.fn().mockResolvedValue({
        confirmedAt: '2026-07-29T12:00:00.000Z', ruleId: 'rule-1', transactionId: 'transaction-1',
        appliedTransactionCount: 12, merchantKey: 'costco', matchMode: 'exact', categorySourceId: 'category-1',
      }),
    } as unknown as MoneyRepository;
    const screen = render(
      <MoneyDataProvider repository={repository}>
        <SaveRuleProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('ready');
    fireEvent.press(screen.getByRole('button'));

    await screen.findByText('done');
    expect(screen.getByText('groceries')).toBeTruthy();
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
    expect(repository.saveMerchantRule).toHaveBeenCalledTimes(1);

    backgroundRefresh.resolve(refreshedSnapshot);
    await waitFor(() => expect(screen.getByText('groceries')).toBeTruthy());
  });

  it('renders deterministic Money first, then refreshes only when background classification assigns rows', async () => {
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ ...snapshot, generatedAt: 'classified' }),
      classifyUnresolvedTransactions: jest.fn().mockResolvedValue({
        policyVersion: 'money-category-v2', consideredCount: 2, assignedCount: 1,
        deterministicAssignedCount: 1, aiAssignedCount: 0, unresolvedCount: 1, retryableCount: 0,
      }),
    } as unknown as MoneyRepository;
    const screen = render(
      <MoneyDataProvider repository={repository}>
        <SaveRuleProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('ready');
    expect(screen.getByText('no-rule')).toBeTruthy();
    await waitFor(() => expect(repository.loadSnapshot).toHaveBeenCalledTimes(2));
    expect(repository.classifyUnresolvedTransactions).toHaveBeenCalledTimes(1);
  });

  it('keeps Money ready when optional background classification fails', async () => {
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValue(snapshot),
      classifyUnresolvedTransactions: jest.fn().mockRejectedValue(new Error('optional failure')),
    } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><SaveRuleProbe /></MoneyDataProvider>);

    await screen.findByText('ready');
    expect(screen.queryByText('error')).toBeNull();
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
  });
});

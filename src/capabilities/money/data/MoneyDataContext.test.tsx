import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoneyDataProvider, useMoneyData } from './MoneyDataContext';
import type { MoneyRepository } from './moneyRepository';
import { createMoneyRepository, MoneyTransactionUnavailableError } from './moneyRepository';
import type { MoneySnapshot } from './moneySnapshot';
import type { MoneySnapshotCache } from '../runtime/moneySnapshotCache';
import { reconcileConnectedMoneyActivity } from '../runtime/reconcileConnectedMoneyActivity';
import { reconcileLivingPlan } from '../runtime/livingPlanReconciliation';
import { setProEntitlement } from '../../../test/storeFixtures';

jest.mock('./moneyRepository', () => ({ ...jest.requireActual('./moneyRepository'), createMoneyRepository: jest.fn() }));
jest.mock('../runtime/livingPlanReconciliation', () => ({ ...jest.requireActual('../runtime/livingPlanReconciliation'), reconcileLivingPlan: jest.fn() }));
jest.mock('../runtime/moneyGlanceableState', () => ({ syncMoneyGlanceableState: jest.fn() }));
jest.mock('../runtime/reconcileConnectedMoneyActivity', () => ({ reconcileConnectedMoneyActivity: jest.fn() }));
jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: jest.fn(() => ({})) }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject; });
  return { promise, resolve, reject };
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

function CategoryRecoveryProbe() {
  const { assignTransactionCategory, snapshot: current, reviewingTransactionId, error } = useMoneyData();
  const [outcome, setOutcome] = useState('idle');
  return <View>
    <Text>{current?.transactions.map((transaction) => transaction.id).join(',')}</Text>
    <Text>{reviewingTransactionId ? 'saving' : outcome}</Text>
    <Text>{error ?? 'no-error'}</Text>
    <Pressable onPress={() => {
      void assignTransactionCategory('transaction-1', 'category-1')
        .then(() => setOutcome('saved'), () => setOutcome('not-saved'));
    }}><Text>Assign category</Text></Pressable>
  </View>;
}

function NoteProbe() {
  const { reviewingTransactionId, setTransactionNote, snapshot: currentSnapshot } = useMoneyData();
  return (
    <View>
      <Text>{reviewingTransactionId ? 'saving-note' : 'note-ready'}</Text>
      <Text>{currentSnapshot?.transactions[0]?.userNote ?? 'no-note'}</Text>
      <Pressable accessibilityRole="button" onPress={() => { void setTransactionNote('transaction-1', 'Family pictures'); }}>
        <Text>Save note</Text>
      </Pressable>
    </View>
  );
}

function ReadLifecycleProbe() {
  const { refresh, error, snapshot: current, stale, setTransactionNote, disconnectConnection, reconcileConnectedActivity } = useMoneyData();
  return <View>
    <Text>{current?.generatedAt ?? 'no-snapshot'}</Text>
    <Text>{current?.transactions[0]?.userNote ?? 'no-note'}</Text>
    <Text>{error ?? 'no-error'}</Text>
    <Text>{stale ? 'stale' : 'current'}</Text>
    <Pressable onPress={() => { void refresh(); }}><Text>Reload</Text></Pressable>
    <Pressable onPress={() => {
      void reconcileConnectedActivity({ trigger: 'account_connected', sync: false }).then(() => refresh());
    }}><Text>Reconcile and reload</Text></Pressable>
    <Pressable onPress={() => { void disconnectConnection('connection-1'); }}><Text>Disconnect</Text></Pressable>
    <Pressable onPress={() => { void refresh({ afterMutation: true }); }}><Text>Reload after write</Text></Pressable>
    <Pressable onPress={() => { void setTransactionNote('transaction-1', 'Confirmed note'); }}><Text>Edit note</Text></Pressable>
  </View>;
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
  beforeEach(() => {
    jest.mocked(reconcileConnectedMoneyActivity).mockReset();
    jest.mocked(createMoneyRepository).mockReset();
    jest.mocked(reconcileLivingPlan).mockReset();
    setProEntitlement(true);
  });

  it('does not replace an authoritative refresh with a delayed device cache read', async () => {
    const cached = deferred<MoneySnapshot | null>();
    const initial = deferred<MoneySnapshot>();
    const cache = snapshotCache(null);
    jest.mocked(cache.load).mockReturnValue(cached.promise);
    const repository = { loadSnapshot: jest.fn().mockResolvedValueOnce({ ...snapshot, generatedAt: 'fresh' }).mockReturnValueOnce(initial.promise) } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository} snapshotCache={cache} userId="user-a"><ReadLifecycleProbe /></MoneyDataProvider>);
    fireEvent.press(screen.getByText('Reload'));
    await screen.findByText('fresh');
    await act(async () => cached.resolve({ ...snapshot, generatedAt: 'old-cache' }));
    expect(screen.getByText('fresh')).toBeTruthy();
    expect(screen.queryByText('old-cache')).toBeNull();
    await act(async () => initial.resolve({ ...snapshot, generatedAt: 'latest' }));
  });

  it('starts a fresh read after governed promotion instead of sharing a pre-promotion refresh', async () => {
    const foundation = deferred<void>();
    const manual = deferred<MoneySnapshot>();
    const promoted = deferred<MoneySnapshot>();
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(manual.promise).mockReturnValueOnce(promoted.promise),
      ensureGovernedPlanFoundation: jest.fn(() => foundation.promise),
    } as unknown as MoneyRepository;
    jest.mocked(createMoneyRepository).mockReturnValue(repository);
    jest.mocked(reconcileLivingPlan).mockResolvedValue({ outcome: 'promoted', versionId: 'v2' });
    const screen = render(<MoneyDataProvider><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Reload'));
    await act(async () => foundation.resolve());
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(3);
    await act(async () => promoted.resolve({ ...snapshot, generatedAt: 'promoted' }));
    await act(async () => manual.resolve({ ...snapshot, generatedAt: 'obsolete' }));
    expect(screen.getByText('promoted')).toBeTruthy();
    expect(screen.queryByText('obsolete')).toBeNull();
  });

  it('protects confirmed edits during governed initialization too', async () => {
    const initial = deferred<MoneySnapshot>();
    const background = deferred<MoneySnapshot>();
    const repository = {
      loadSnapshot: jest.fn().mockReturnValueOnce(initial.promise).mockReturnValueOnce(background.promise),
      ensureGovernedPlanFoundation: jest.fn().mockResolvedValue(undefined),
      setTransactionNote: jest.fn().mockResolvedValue({ transactionId: 'transaction-1', note: 'Confirmed note' }),
    } as unknown as MoneyRepository;
    jest.mocked(createMoneyRepository).mockReturnValue(repository);
    jest.mocked(reconcileLivingPlan).mockResolvedValue({ outcome: 'no_op' });
    const screen = render(<MoneyDataProvider snapshotCache={snapshotCache(snapshot)} userId="user-a"><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Edit note'));
    await screen.findByText('Confirmed note');
    await act(async () => initial.resolve({ ...snapshot, generatedAt: 'obsolete' }));
    expect(screen.getByText('Confirmed note')).toBeTruthy();
    expect(screen.queryByText('obsolete')).toBeNull();
    await act(async () => background.resolve({ ...snapshot, generatedAt: 'confirmed', transactions: [{ ...snapshot.transactions[0], userNote: 'Confirmed note' }] }));
  });

  it('does not start a reload when initialization classification completes after unmount', async () => {
    const classification = deferred<{ assignedCount: number }>();
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValue(snapshot),
      classifyUnresolvedTransactions: jest.fn(() => classification.promise),
    } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    screen.unmount();
    await act(async () => classification.resolve({ assignedCount: 1 }));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it.each(['resolve', 'reject'] as const)('ignores an initial read that %ss after a confirmed edit', async (outcome) => {
    const initial = deferred<MoneySnapshot>();
    const background = deferred<MoneySnapshot>();
    const cache = snapshotCache(snapshot);
    const repository = {
      loadSnapshot: jest.fn().mockReturnValueOnce(initial.promise).mockReturnValueOnce(background.promise),
      setTransactionNote: jest.fn().mockResolvedValue({ transactionId: 'transaction-1', note: 'Confirmed note' }),
    } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository} snapshotCache={cache} userId="user-a"><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Edit note'));
    await screen.findByText('Confirmed note');
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (outcome === 'resolve') initial.resolve({ ...snapshot, generatedAt: 'obsolete' });
      else initial.reject(new Error('Obsolete failure'));
    });
    expect(screen.getByText('Confirmed note')).toBeTruthy();
    expect(screen.getByText('no-error')).toBeTruthy();
    expect(screen.queryByText('obsolete')).toBeNull();
    expect(cache.save).not.toHaveBeenCalled();
    await act(async () => background.resolve({ ...snapshot, generatedAt: 'confirmed', transactions: [{ ...snapshot.transactions[0], userNote: 'Confirmed note' }] }));
    expect(screen.getByText('confirmed')).toBeTruthy();
  });

  it('does not share a read from before account reconciliation with its final refresh', async () => {
    const reconciliation = deferred<Awaited<ReturnType<typeof reconcileConnectedMoneyActivity>>>();
    const stale = deferred<MoneySnapshot>();
    const final = deferred<MoneySnapshot>();
    jest.mocked(reconcileConnectedMoneyActivity).mockReturnValue(reconciliation.promise);
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(stale.promise).mockReturnValueOnce(final.promise),
    } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Reconcile and reload'));
    fireEvent.press(screen.getByText('Reload'));
    await act(async () => reconciliation.resolve({
      snapshot: { ...snapshot, generatedAt: 'reconciled' }, syncResult: null, classification: { outcome: 'failed' },
    }));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(3);
    await act(async () => stale.resolve({ ...snapshot, generatedAt: 'obsolete' }));
    expect(screen.getByText('reconciled')).toBeTruthy();
    await act(async () => final.resolve({ ...snapshot, generatedAt: 'latest' }));
    expect(screen.getByText('latest')).toBeTruthy();
  });

  it('does not reuse a pre-disconnect read after the disconnect receipt is confirmed', async () => {
    const connected = {
      ...snapshot,
      connections: [{ id: 'connection-1', updatedAt: '2026-11-01T10:00:00Z', institutionName: 'Bank' }],
    } as MoneySnapshot;
    const stale = deferred<MoneySnapshot>();
    const afterDisconnect = deferred<MoneySnapshot>();
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValueOnce(connected).mockReturnValueOnce(stale.promise)
        .mockResolvedValueOnce(connected).mockReturnValueOnce(afterDisconnect.promise),
      disconnectConnection: jest.fn().mockResolvedValue({ connectionId: 'connection-1', disconnectedAccountCount: 1, confirmedAt: '2026-11-01T10:01:00Z' }),
    } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Reload'));
    fireEvent.press(screen.getByText('Disconnect'));
    await waitFor(() => expect(repository.disconnectConnection).toHaveBeenCalledTimes(1));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(4);
    await act(async () => afterDisconnect.resolve({ ...snapshot, generatedAt: 'disconnected', connections: [] }));
    await act(async () => stale.resolve({ ...connected, generatedAt: 'obsolete' }));
    expect(screen.getByText('disconnected')).toBeTruthy();
    expect(screen.queryByText('obsolete')).toBeNull();
  });

  it('starts a new read after an external confirmed write even when an earlier refresh is pending', async () => {
    const beforeWrite = deferred<MoneySnapshot>();
    const afterWrite = deferred<MoneySnapshot>();
    const repository = { loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(beforeWrite.promise).mockReturnValueOnce(afterWrite.promise) } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Reload'));
    fireEvent.press(screen.getByText('Reload after write'));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(3);
    await act(async () => afterWrite.resolve({ ...snapshot, generatedAt: 'after-write' }));
    await act(async () => beforeWrite.resolve({ ...snapshot, generatedAt: 'obsolete' }));
    expect(screen.getByText('after-write')).toBeTruthy();
    expect(screen.queryByText('obsolete')).toBeNull();
  });

  it('shares overlapping manual refreshes without reusing a settled result', async () => {
    const pending = deferred<MoneySnapshot>();
    const repository = { loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ...snapshot, generatedAt: 'later' }) } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Reload'));
    fireEvent.press(screen.getByText('Reload'));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve({ ...snapshot, generatedAt: 'refreshed' }));
    expect(screen.getByText('refreshed')).toBeTruthy();
    fireEvent.press(screen.getByText('Reload'));
    await screen.findByText('later');
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(3);
  });

  it('shares a confirmed edit refresh but isolates it from older reads', async () => {
    const oldRead = deferred<MoneySnapshot>();
    const afterEdit = deferred<MoneySnapshot>();
    const repository = {
      loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(afterEdit.promise),
      setTransactionNote: jest.fn().mockResolvedValue({ transactionId: 'transaction-1', note: 'Confirmed note' }),
    } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    fireEvent.press(screen.getByText('Reload'));
    fireEvent.press(screen.getByText('Edit note'));
    await screen.findByText('Confirmed note');
    fireEvent.press(screen.getByText('Reload'));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(3);
    await act(async () => oldRead.resolve({ ...snapshot, generatedAt: 'obsolete' }));
    expect(screen.getByText('Confirmed note')).toBeTruthy();
    expect(screen.queryByText('obsolete')).toBeNull();
    await act(async () => afterEdit.resolve({ ...snapshot, generatedAt: 'confirmed', transactions: [{ ...snapshot.transactions[0], userNote: 'Confirmed note' }] }));
    expect(screen.getByText('confirmed')).toBeTruthy();
  });

  it('does not persist an outstanding refresh after the provider unmounts', async () => {
    const pending = deferred<MoneySnapshot>();
    const cache = snapshotCache(null);
    const repository = { loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(pending.promise) } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository} snapshotCache={cache} userId="user-a"><ReadLifecycleProbe /></MoneyDataProvider>);
    await screen.findByText('before');
    jest.mocked(cache.save).mockClear();
    fireEvent.press(screen.getByText('Reload'));
    screen.unmount();
    await act(async () => pending.resolve({ ...snapshot, generatedAt: 'obsolete' }));
    expect(cache.save).not.toHaveBeenCalled();
  });

  it.each([false, true])('refreshes after a removed pending transaction without claiming a save (refresh fails: %s)', async (refreshFails) => {
    const loadSnapshot = jest.fn().mockResolvedValueOnce(snapshot);
    if (refreshFails) loadSnapshot.mockRejectedValueOnce(new Error('Offline'));
    else loadSnapshot.mockResolvedValueOnce({ ...snapshot, transactions: [{ id: 'posted-transaction' }] });
    const assignTransactionCategory = jest.fn().mockRejectedValue(new MoneyTransactionUnavailableError());
    const repository = { loadSnapshot, assignTransactionCategory } as unknown as MoneyRepository;
    const screen = render(<MoneyDataProvider repository={repository}><CategoryRecoveryProbe /></MoneyDataProvider>);
    await screen.findByText('transaction-1');
    fireEvent.press(screen.getByText('Assign category'));
    await screen.findByText('not-saved');
    expect(loadSnapshot).toHaveBeenCalledTimes(2);
    expect(assignTransactionCategory).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('saved')).toBeNull();
    expect(screen.getByText(refreshFails ? 'transaction-1' : 'posted-transaction')).toBeTruthy();
    expect(screen.getByText(new MoneyTransactionUnavailableError().message)).toBeTruthy();
  });

  it('finishes a persisted transaction review before the governed-plan reconciliation completes', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, 'MoneyDataContext.tsx'), 'utf8');
    const reviewBoundedTransaction = source.slice(
      source.indexOf('const reviewBoundedTransaction = useCallback'),
      source.indexOf('const reviewBroadTransaction = useCallback'),
    );

    expect(reviewBoundedTransaction).toContain("void reconcileLivingPlan(getSupabaseClient(), 'transaction_review_changed')");
    expect(reviewBoundedTransaction).not.toContain("await reconcileLivingPlan(getSupabaseClient(), 'transaction_review_changed')");
    expect(reviewBoundedTransaction).toContain('.finally(() => refreshInBackground(version))');
  });

  it('shows a confirmed household note before the broader snapshot refresh finishes', async () => {
    const backgroundRefresh = deferred<MoneySnapshot>();
    const repository = {
      loadSnapshot: jest.fn()
        .mockResolvedValueOnce(snapshot)
        .mockImplementationOnce(() => backgroundRefresh.promise),
      setTransactionNote: jest.fn().mockResolvedValue({
        confirmedAt: '2026-08-31T20:00:00.000Z',
        transactionId: 'transaction-1',
        note: 'Family pictures',
      }),
    } as unknown as MoneyRepository;
    const screen = render(
      <MoneyDataProvider repository={repository}>
        <NoteProbe />
      </MoneyDataProvider>,
    );

    await screen.findByText('no-note');
    fireEvent.press(screen.getByRole('button', { name: 'Save note' }));

    await screen.findByText('Family pictures');
    expect(screen.getByText('note-ready')).toBeTruthy();
    expect(repository.setTransactionNote).toHaveBeenCalledWith('transaction-1', 'Family pictures');

    await act(async () => {
      backgroundRefresh.resolve({
        ...snapshot,
        transactions: [{ ...snapshot.transactions[0], userNote: 'Family pictures' }],
      });
    });
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

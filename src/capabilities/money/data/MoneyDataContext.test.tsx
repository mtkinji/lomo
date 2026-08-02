import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoneyDataProvider, useMoneyData } from './MoneyDataContext';
import type { MoneyRepository } from './moneyRepository';
import type { MoneySnapshot } from './moneySnapshot';

jest.mock('../runtime/moneyGlanceableState', () => ({ syncMoneyGlanceableState: jest.fn() }));
jest.mock('../runtime/moneyAppControlRuntime', () => ({ reconcileMoneyAppControls: jest.fn() }));

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
  const { reviewingTransactionId, saveMerchantRule, snapshot: currentSnapshot, status } = useMoneyData();
  const [completed, setCompleted] = useState(false);
  return (
    <View>
      <Text>{status}</Text>
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

describe('MoneyDataProvider merchant-rule confirmation', () => {
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
      classifyUnresolvedTransactions: jest.fn().mockResolvedValue({ consideredCount: 2, assignedCount: 1, unresolvedCount: 1 }),
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

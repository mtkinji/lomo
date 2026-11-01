import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MoneyDataProvider, useMoneyData } from './MoneyDataContext';
import type { MoneyRepository } from './moneyRepository';
import { projectMoneySnapshot, type MoneySnapshot } from './moneySnapshot';
import type { CategorySettingsOutcome, CategorySettingsRequest } from '../domain/categorySettingsCommand';
import { setProEntitlement } from '../../../test/storeFixtures';

jest.mock('../runtime/moneyGlanceableState', () => ({ syncMoneyGlanceableState: jest.fn() }));
jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: jest.fn(() => ({})) }));
const actor = '10000000-0000-4000-8000-000000000001';
const category = '10000000-0000-4000-8000-000000000002';
const before = '2026-11-01T10:00:00Z';
const after = '2026-11-01T10:01:00Z';
const request: CategorySettingsRequest = {
  schemaVersion: 1, actorUserId: actor, requestId: '10000000-0000-4000-8000-000000000003', categoryId: category,
  expectedCategoryUpdatedAt: before, expectedPlanUpdatedAt: before, governance: null,
  settings: { name: 'Saved household', budgetCents: 50000, fundingRhythm: 'monthly', rolloverEnabled: false,
    rolloverPolicy: null, planRole: 'protected', expectedNeedCents: null, expectedNeedDueMonth: null },
};
const confirmed: CategorySettingsOutcome = { outcome: 'confirmed', receipt: {
  requestId: request.requestId, categoryId: category, confirmedAt: after, categoryUpdatedAt: after, planUpdatedAt: after,
  activeVersionId: null, changes: request.settings,
} };
const snapshot = projectMoneySnapshot({
  categories: [{ id: category, slug: 'household', legacy_budget_id: null, name: 'Household', description: null,
    accent_color: null, sort_order: 0, updated_at: before }],
  plans: [{ category_id: category, base_budget_cents: 10000, rollover_enabled: false, updated_at: before }],
  transactions: [], accounts: [], connections: [],
}, new Date('2026-11-01T10:00:00Z'));
const cache = { load: jest.fn(async () => null), save: jest.fn(async () => undefined), remove: jest.fn(async () => undefined) };
function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function Probe() {
  const { saveCategorySettingsRequest, snapshot: current, savingCategory, error } = useMoneyData();
  const [outcome, setOutcome] = useState('idle');
  return <View><Text>{current?.categories[0]?.name}</Text><Text>{current?.categories[0]?.planUpdatedAt}</Text>
    <Text>{current?.categories[0]?.plannedCents}</Text><Text>{outcome}</Text><Text>{savingCategory ? 'saving' : 'available'}</Text>
    <Text>{current?.monthlyPlan ? 'governed-summary' : 'summary-awaiting-refresh'}</Text><Text>{error ?? 'no-error'}</Text><Pressable onPress={() => {
      void saveCategorySettingsRequest(request).then((result) => setOutcome(result.outcome));
    }}><Text>Save settings</Text></Pressable></View>;
}
describe('atomic settings provider integration', () => {
  beforeEach(() => setProEntitlement(true));
  it('confirms every setting before refresh and keeps confirmation when that refresh fails', async () => {
    const refresh = deferred<MoneySnapshot>();
    const governed = { ...snapshot, monthlyPlan: { periodId: '2026-11', regularPlanCents: 10000, committedPlanCents: 0, flexiblePlanCents: 10000, additionCents: 0, plannedOutflowCents: 10000, derivation: 'user_set' as const } };
    const repository = { loadSnapshot: jest.fn().mockResolvedValueOnce(governed).mockReturnValueOnce(refresh.promise) } as unknown as MoneyRepository;
    const command = { loadPending: jest.fn().mockResolvedValue(null), execute: jest.fn().mockResolvedValue(confirmed) };
    const screen = render(<MoneyDataProvider userId={actor} repository={repository} snapshotCache={cache} categorySettingsCommand={command}><Probe /></MoneyDataProvider>);
    await screen.findByText('Household');
    fireEvent.press(screen.getByText('Save settings'));
    await screen.findByText('confirmed');
    expect(screen.getByText('Saved household')).toBeTruthy();
    expect(screen.getByText('50000')).toBeTruthy();
    expect(screen.getByText(after)).toBeTruthy();
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
    await act(async () => refresh.reject(new Error('Offline')));
    expect(screen.queryByText('governed-summary')).toBeNull();
    expect(screen.getByText('summary-awaiting-refresh')).toBeTruthy();
    expect(screen.getByText('confirmed')).toBeTruthy();
    expect(screen.getByText('Saved household')).toBeTruthy();
  });
  it('reconciles a shared identical submission only once', async () => {
    const pending = deferred<CategorySettingsOutcome>();
    const refresh = deferred<MoneySnapshot>();
    const repository = { loadSnapshot: jest.fn().mockResolvedValueOnce(snapshot).mockReturnValue(refresh.promise) } as unknown as MoneyRepository;
    const command = { loadPending: jest.fn().mockResolvedValue(null), execute: jest.fn(() => pending.promise) };
    const screen = render(<MoneyDataProvider userId={actor} repository={repository} snapshotCache={cache} categorySettingsCommand={command}><Probe /></MoneyDataProvider>);
    await screen.findByText('Household');
    fireEvent.press(screen.getByText('Save settings')); fireEvent.press(screen.getByText('Save settings'));
    await act(async () => pending.resolve(confirmed));
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
    await act(async () => refresh.resolve(snapshot));
  });
  it.each(['unknown', 'rejected'] as const)('does not patch or refresh after %s', async (outcome) => {
    const repository = { loadSnapshot: jest.fn().mockResolvedValue(snapshot) } as unknown as MoneyRepository;
    const command = { loadPending: jest.fn().mockResolvedValue(null), execute: jest.fn().mockResolvedValue({ outcome, message: 'Check again' }) };
    const screen = render(<MoneyDataProvider userId={actor} repository={repository} snapshotCache={cache} categorySettingsCommand={command}><Probe /></MoneyDataProvider>);
    await screen.findByText('Household'); fireEvent.press(screen.getByText('Save settings'));
    await screen.findByText(outcome);
    expect(screen.getByText('Household')).toBeTruthy();
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByText('no-error')).toBeTruthy();
  });
  it('does not apply the previous account receipt after switching accounts', async () => {
    const pending = deferred<CategorySettingsOutcome>();
    const repository = { loadSnapshot: jest.fn().mockResolvedValue(snapshot) } as unknown as MoneyRepository;
    const command = { loadPending: jest.fn().mockResolvedValue(null), execute: jest.fn(() => pending.promise) };
    const tree = (userId: string) => <MoneyDataProvider userId={userId} repository={repository} snapshotCache={cache} categorySettingsCommand={command}><Probe /></MoneyDataProvider>;
    const screen = render(tree(actor)); await screen.findByText('Household');
    fireEvent.press(screen.getByText('Save settings')); await screen.findByText('saving');
    screen.rerender(tree('10000000-0000-4000-8000-000000000004'));
    await waitFor(() => expect(repository.loadSnapshot).toHaveBeenCalledTimes(2));
    await act(async () => pending.resolve(confirmed));
    expect(screen.queryByText('Saved household')).toBeNull();
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
  });
});

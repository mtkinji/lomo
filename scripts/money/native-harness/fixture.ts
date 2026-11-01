import { useSyncExternalStore } from 'react';
import { projectMoneySnapshot, type MoneySnapshot } from '../../../src/capabilities/money/data/moneySnapshot';
import { snapshotPerformanceFixture } from '../snapshot-performance-fixture';

type State = { snapshot: MoneySnapshot | null; status: 'ready' | 'loading' | 'error'; error: string | null; refreshes: number };
const listeners = new Set<() => void>();
let state: State = { snapshot: null, status: 'loading', error: null, refreshes: 0 };
function update(next: Partial<State>) { state = { ...state, ...next }; listeners.forEach((listener) => listener()); }
export function selectFixture(count: number, mode = 'ready') {
  const now = new Date();
  const rows = snapshotPerformanceFixture(count);
  // Stress the default month, not just the all-history option. Preserve some
  // older rows to exercise date scope, credits, transfers and split assignments.
  rows.transactions.forEach((row, index) => {
    if (index < Math.ceil(count * 0.9)) row.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(index % Math.max(1, now.getDate()) + 1).padStart(2, '0')}`;
    if (index === 1) row.name = 'Synthetic merchant with a very long name for accessibility layout review';
  });
  const snapshot = projectMoneySnapshot(rows, now);
  update({ snapshot: mode === 'error' || mode === 'loading' ? null : snapshot,
    status: mode === 'error' ? 'error' : mode === 'loading' ? 'loading' : 'ready',
    error: mode === 'stale' || mode === 'error' ? 'Synthetic offline fixture. Pull to retry.' : null, refreshes: 0 });
}
async function refresh() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (!state.snapshot) selectFixture(4000);
  update({ error: null, status: 'ready', refreshes: state.refreshes + 1 });
  console.info('[Budget fixture] refresh completed', state.refreshes);
}
async function blockedWrite(): Promise<never> { throw new Error('Read-only native fixture: edits are disabled.'); }
export function useMoneyData() {
  const value = useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state);
  return { ...value, refresh, reconcileConnectedActivity: refresh,
    reviewingTransactionId: null, savingCategory: false,
    assignTransactionCategory: blockedWrite, createCategory: blockedWrite,
    markTransactionNotCounted: blockedWrite, reviewTransactionMeaning: blockedWrite,
    setTransactionPlanRoleOverride: blockedWrite, setTransactionPlanCoverage: blockedWrite,
    setTransactionNote: blockedWrite, saveMerchantRule: blockedWrite, splitTransaction: blockedWrite };
}

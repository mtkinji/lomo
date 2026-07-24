import { AppState, Linking, type AppStateStatus } from 'react-native';
import { consumePendingScreenTimeReviewRequest } from '../../../services/appleEcosystem/screenTimeProtection';
import { isFreshMoneyReviewHandoff } from '../domain/moneyAppControl';

let started = false;
let lastKnownState: AppStateStatus = AppState.currentState;
let subscription: { remove: () => void } | null = null;
let pendingHandoffAtMs: number | null = null;
const listeners = new Set<() => void>();

async function captureHandoff(): Promise<void> {
  const requestedAtMs = await consumePendingScreenTimeReviewRequest();
  if (!requestedAtMs || !isFreshMoneyReviewHandoff(requestedAtMs, Date.now())) return;
  pendingHandoffAtMs = requestedAtMs;
  listeners.forEach((listener) => listener());
  await Linking.openURL('kwilt://money?source=screen-time').catch(() => undefined);
}

export function startMoneyAppControlForegroundSync(): void {
  if (started) return;
  started = true;
  lastKnownState = AppState.currentState;
  void captureHandoff();
  subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && lastKnownState !== 'active') void captureHandoff();
    lastKnownState = nextState;
  });
}

export function claimPendingMoneyReviewHandoff(): boolean {
  if (!pendingHandoffAtMs || !isFreshMoneyReviewHandoff(pendingHandoffAtMs, Date.now())) {
    pendingHandoffAtMs = null;
    return false;
  }
  pendingHandoffAtMs = null;
  return true;
}

export function subscribeToMoneyReviewHandoff(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function stopMoneyAppControlForegroundSyncForTests(): void {
  subscription?.remove();
  subscription = null;
  pendingHandoffAtMs = null;
  started = false;
  lastKnownState = AppState.currentState;
  listeners.clear();
}

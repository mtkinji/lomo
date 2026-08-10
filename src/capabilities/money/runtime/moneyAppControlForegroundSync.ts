import { AppState, Linking, type AppStateStatus } from 'react-native';
import { consumePendingScreenTimeShieldHandoff } from '../../../services/appleEcosystem/screenTimeProtection';
import { routeForScreenTimeShieldReason } from '../../../services/screenTimeShieldHandoff';
import { isFreshMoneyReviewHandoff } from '../domain/moneyAppControl';

let started = false;
let lastKnownState: AppStateStatus = AppState.currentState;
let subscription: { remove: () => void } | null = null;
let pendingHandoffAtMs: number | null = null;
const listeners = new Set<() => void>();

async function captureHandoff(): Promise<void> {
  const handoff = await consumePendingScreenTimeShieldHandoff();
  if (!handoff || !isFreshMoneyReviewHandoff(handoff.requestedAtMs, Date.now())) return;
  if (handoff.reason?.startsWith('money_')) {
    pendingHandoffAtMs = handoff.requestedAtMs;
    listeners.forEach((listener) => listener());
  }
  await Linking.openURL(routeForScreenTimeShieldReason(handoff.reason)).catch(() => undefined);
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

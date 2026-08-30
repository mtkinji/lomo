import { AppState, type AppStateStatus } from 'react-native';
import { useFocusSessionStore } from '../features/activities/focusSessionStore';
import { useAppStore } from '../store/useAppStore';
import { reconcileScreenTimeRestrictions } from './screenTimeProtectionRuntime';
import { ensureCurrentScreenTimeRuleSystem } from '../features/screen-time/runtime/screenTimeRuleSystemCleanupRuntime';

let started = false;
let lastKnownState: AppStateStatus = AppState.currentState;
let subscription: { remove: () => void } | null = null;
let hydrationSubscriptions: Array<() => void> = [];

async function reconcileCurrentProtectionState(): Promise<void> {
  if (!await ensureCurrentScreenTimeRuleSystem()) return;
  const focusSessionActive = useFocusSessionStore.getState().activeSession?.mode === 'running';
  await reconcileScreenTimeRestrictions({ focusSessionActive }).catch(() => undefined);
}

function reconcileAfterHydration(): void {
  if (useAppStore.persist.hasHydrated() && useFocusSessionStore.persist.hasHydrated()) {
    hydrationSubscriptions.forEach((unsubscribe) => unsubscribe());
    hydrationSubscriptions = [];
    void reconcileCurrentProtectionState();
    return;
  }
  if (hydrationSubscriptions.length > 0) return;
  const retry = () => reconcileAfterHydration();
  hydrationSubscriptions = [
    useAppStore.persist.onFinishHydration(retry),
    useFocusSessionStore.persist.onFinishHydration(retry),
  ];
}

export function startScreenTimeProtectionForegroundSync(): void {
  if (started) return;
  started = true;
  lastKnownState = AppState.currentState;

  reconcileAfterHydration();

  subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && lastKnownState !== 'active') {
      reconcileAfterHydration();
    }
    lastKnownState = nextState;
  });
}

export function stopScreenTimeProtectionForegroundSyncForTests(): void {
  subscription?.remove();
  hydrationSubscriptions.forEach((unsubscribe) => unsubscribe());
  hydrationSubscriptions = [];
  subscription = null;
  started = false;
  lastKnownState = AppState.currentState;
}

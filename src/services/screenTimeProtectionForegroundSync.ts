import { AppState, type AppStateStatus } from 'react-native';
import { applyMeaningfulFirstRestrictionsIfLocked } from './screenTimeProtectionRuntime';

let started = false;
let lastKnownState: AppStateStatus = AppState.currentState;
let subscription: { remove: () => void } | null = null;

export function startScreenTimeProtectionForegroundSync(): void {
  if (started) return;
  started = true;
  lastKnownState = AppState.currentState;

  applyMeaningfulFirstRestrictionsIfLocked().catch(() => undefined);

  subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && lastKnownState !== 'active') {
      applyMeaningfulFirstRestrictionsIfLocked().catch(() => undefined);
    }
    lastKnownState = nextState;
  });
}

export function stopScreenTimeProtectionForegroundSyncForTests(): void {
  subscription?.remove();
  subscription = null;
  started = false;
  lastKnownState = AppState.currentState;
}

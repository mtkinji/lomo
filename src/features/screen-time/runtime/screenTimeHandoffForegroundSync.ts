import { AppState, type AppStateStatus } from 'react-native';
import { consumePendingScreenTimeShieldHandoff } from '../../../services/appleEcosystem/screenTimeProtection';
import { useScreenTimeHandoffStore } from './screenTimeHandoffStore';

let started = false;
let lastKnownState: AppStateStatus = AppState.currentState;
let subscription: { remove: () => void } | null = null;

async function capturePendingHandoff(): Promise<void> {
  const handoff = await consumePendingScreenTimeShieldHandoff();
  if (!handoff) return;
  useScreenTimeHandoffStore.getState().capture(handoff);
}

export function startScreenTimeHandoffForegroundSync(): void {
  if (started) return;
  started = true;
  lastKnownState = AppState.currentState;
  void capturePendingHandoff();
  subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && lastKnownState !== 'active') void capturePendingHandoff();
    lastKnownState = nextState;
  });
}

export function stopScreenTimeHandoffForegroundSyncForTests(): void {
  subscription?.remove();
  subscription = null;
  started = false;
  lastKnownState = AppState.currentState;
}


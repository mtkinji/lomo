import { AppState, type AppStateStatus } from 'react-native';
import { consumePendingScreenTimeShieldHandoff } from '../../../services/appleEcosystem/screenTimeProtection';
import { useScreenTimeHandoffStore } from './screenTimeHandoffStore';

let started = false;
let lastKnownState: AppStateStatus = AppState.currentState;
let subscription: { remove: () => void } | null = null;
let foregroundCheckId = 0;
const pendingHandoffReads = new Set<number>();

async function capturePendingHandoff(): Promise<void> {
  const checkId = ++foregroundCheckId;
  pendingHandoffReads.add(checkId);
  useScreenTimeHandoffStore.getState().beginForegroundCheck();
  try {
    const handoff = await consumePendingScreenTimeShieldHandoff();
    // Preserve a fresh consumed handoff even if another foreground read began.
    if (pendingHandoffReads.has(checkId) && handoff) useScreenTimeHandoffStore.getState().capture(handoff);
  } catch {
    // An unavailable native bridge must not hold ordinary launch prompts forever.
  } finally {
    const wasPending = pendingHandoffReads.delete(checkId);
    if (wasPending && started && pendingHandoffReads.size === 0 && lastKnownState === 'active') {
      useScreenTimeHandoffStore.getState().finishForegroundCheck();
    }
  }
}

export function startScreenTimeHandoffForegroundSync(): void {
  if (started) return;
  started = true;
  lastKnownState = AppState.currentState;
  void capturePendingHandoff();
  subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && lastKnownState !== 'active') {
      void capturePendingHandoff();
    } else if (nextState !== 'active') {
      // Gate prompts before foreground listeners run, regardless of their order.
      useScreenTimeHandoffStore.getState().beginForegroundCheck();
    }
    lastKnownState = nextState;
  });
}

export function stopScreenTimeHandoffForegroundSyncForTests(): void {
  subscription?.remove();
  subscription = null;
  started = false;
  pendingHandoffReads.clear();
  lastKnownState = AppState.currentState;
}

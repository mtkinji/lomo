import {
  startScreenTimeHandoffForegroundSync,
  stopScreenTimeHandoffForegroundSyncForTests,
} from '../../../features/screen-time/runtime/screenTimeHandoffForegroundSync';

/** @deprecated Screen Time shield handoffs are now coordinated at the app root. */
export const startMoneyAppControlForegroundSync = startScreenTimeHandoffForegroundSync;

/** @deprecated Money no longer claims or forces navigation for shield handoffs. */
export function claimPendingMoneyReviewHandoff(): boolean {
  return false;
}

/** @deprecated The root Screen Time handoff store owns subscriptions. */
export function subscribeToMoneyReviewHandoff(): () => void {
  return () => undefined;
}

export { stopScreenTimeHandoffForegroundSyncForTests as stopMoneyAppControlForegroundSyncForTests };

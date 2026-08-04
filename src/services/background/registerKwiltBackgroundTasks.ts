import { registerHealthDailySyncTask } from '../health/healthBackgroundTask';
import { registerNotificationReconcileTask } from '../notifications/notificationBackgroundTask';

/**
 * Expo BackgroundTask multiplexes all JS tasks through one native worker, and
 * the final registration controls that worker's minimum interval. Keep health
 * first so notification reconciliation retains its 15-minute best-effort cadence.
 */
export async function registerKwiltBackgroundTasks(): Promise<void> {
  let healthError: unknown;
  try {
    await registerHealthDailySyncTask();
  } catch (error) {
    healthError = error;
  }
  await registerNotificationReconcileTask();
  if (healthError) throw healthError;
}

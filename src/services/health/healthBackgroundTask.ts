import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { syncYesterdayHealthDailyToSupabase } from './healthKit';

export const HEALTH_DAILY_SYNC_TASK = 'kwilt-health-daily-sync-v1';
const HEALTH_BACKGROUND_LAST_ATTEMPT_KEY = 'kwilt.health.background.lastAttemptAt.v1';
const HEALTH_BACKGROUND_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

async function claimHealthBackgroundAttempt(nowMs: number): Promise<boolean> {
  const raw = await AsyncStorage.getItem(HEALTH_BACKGROUND_LAST_ATTEMPT_KEY).catch(() => null);
  const lastAttemptMs = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(lastAttemptMs) && nowMs - lastAttemptMs < HEALTH_BACKGROUND_MIN_INTERVAL_MS) {
    return false;
  }
  await AsyncStorage.setItem(HEALTH_BACKGROUND_LAST_ATTEMPT_KEY, String(nowMs));
  return true;
}

TaskManager.defineTask(HEALTH_DAILY_SYNC_TASK, async () => {
  try {
    const claimed = await claimHealthBackgroundAttempt(Date.now());
    if (!claimed) return BackgroundTask.BackgroundTaskResult.Success;
    const result = await syncYesterdayHealthDailyToSupabase();
    return result.status === 'synced' || result.status === 'skipped'
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerHealthDailySyncTask(): Promise<void> {
  let status: BackgroundTask.BackgroundTaskStatus | null;
  try {
    status = await BackgroundTask.getStatusAsync();
  } catch {
    return;
  }
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_DAILY_SYNC_TASK);
  if (alreadyRegistered) return;
  await BackgroundTask.registerTaskAsync(HEALTH_DAILY_SYNC_TASK, {
    minimumInterval: 12 * 60,
  });
}

export async function unregisterHealthDailySyncTask(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(HEALTH_DAILY_SYNC_TASK).catch(() => false);
  if (!registered) return;
  await BackgroundTask.unregisterTaskAsync(HEALTH_DAILY_SYNC_TASK);
}

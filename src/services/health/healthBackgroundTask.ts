import * as TaskManager from 'expo-task-manager';
import { syncYesterdayHealthDailyToSupabase } from './healthKit';

export const HEALTH_DAILY_SYNC_TASK = 'kwilt-health-daily-sync-v1';

TaskManager.defineTask(HEALTH_DAILY_SYNC_TASK, async () => {
  // Lazy-load deprecated module to avoid startup warning noise.
  const BackgroundFetch = await import('expo-background-fetch');
  try {
    const result = await syncYesterdayHealthDailyToSupabase();
    return result.status === 'synced'
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerHealthDailySyncTask(): Promise<void> {
  const BackgroundFetch = await import('expo-background-fetch');
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_DAILY_SYNC_TASK);
  if (alreadyRegistered) return;
  await BackgroundFetch.registerTaskAsync(HEALTH_DAILY_SYNC_TASK, {
    minimumInterval: 12 * 60 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toLocalDateKey } from '../../services/plan/planDates';

const LAUNCH_SCREEN_LAST_FULL_DATE_KEY = 'kwilt.launch-screen.last-full-date-v1';

export const FULL_LAUNCH_SCREEN_DURATION_MS = 2500;
export const COMPACT_LAUNCH_SCREEN_DURATION_MS = 900;

export function resolveLaunchScreenDuration(
  lastFullDateKey: string | null | undefined,
  todayDateKey: string
): number {
  return lastFullDateKey === todayDateKey
    ? COMPACT_LAUNCH_SCREEN_DURATION_MS
    : FULL_LAUNCH_SCREEN_DURATION_MS;
}

export async function resolveLaunchScreenDurationForToday(now = new Date()): Promise<number> {
  const todayDateKey = toLocalDateKey(now);
  const lastFullDateKey = await AsyncStorage.getItem(LAUNCH_SCREEN_LAST_FULL_DATE_KEY).catch(() => null);
  const duration = resolveLaunchScreenDuration(lastFullDateKey, todayDateKey);
  if (lastFullDateKey !== todayDateKey) {
    await AsyncStorage.setItem(LAUNCH_SCREEN_LAST_FULL_DATE_KEY, todayDateKey).catch(() => undefined);
  }
  return duration;
}

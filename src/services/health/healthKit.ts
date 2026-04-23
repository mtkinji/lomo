import { Platform } from 'react-native';
import { getSupabaseClient } from '../backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import type {
  AuthorizationRequestStatus,
  AuthorizationStatus,
  QueryStatisticsResponse,
} from '@kingstinct/react-native-healthkit';

export type HealthPermissionStatus =
  | 'notRequested'
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'unavailable';

export type HealthSyncResult =
  | { status: 'synced'; localDate: string }
  | { status: 'skipped'; reason: 'disabled' | 'not_ios' | 'unavailable' | 'unauthorized' | 'no_data' | 'no_user' };

type HealthDailyTotals = {
  localDate: string;
  timezone: string;
  stepsCount: number | null;
  activeMinutes: number | null;
  workoutsCount: number | null;
  sleepHours: number | null;
  mindfulnessMinutes: number | null;
};

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

const HEALTH_READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierAppleExerciseTime',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKCategoryTypeIdentifierMindfulSession',
  'HKWorkoutTypeIdentifier',
] as const;

function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function formatLocalDate(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDayExclusive(date: Date): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

async function loadHealthKitModule(): Promise<HealthKitModule | null> {
  try {
    const mod = await import('@kingstinct/react-native-healthkit');
    return mod;
  } catch {
    return null;
  }
}

function mapAuthorizationStatus(status: AuthorizationStatus | number | null | undefined): HealthPermissionStatus {
  if (status === 2) return 'authorized';
  if (status === 1) return 'denied';
  return 'notRequested';
}

function mapRequestStatus(status: AuthorizationRequestStatus | number | null | undefined): HealthPermissionStatus {
  // unknown=0, shouldRequest=1, unnecessary=2
  if (status === 2) return 'authorized';
  if (status === 1) return 'notRequested';
  return 'notRequested';
}

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function toRoundedHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampWindow(start: Date, end: Date, windowStart: Date, windowEnd: Date): number {
  const s = Math.max(start.getTime(), windowStart.getTime());
  const e = Math.min(end.getTime(), windowEnd.getTime());
  return Math.max(0, e - s);
}

async function queryCumulativeQuantity(
  HealthKit: HealthKitModule,
  identifier: 'HKQuantityTypeIdentifierStepCount' | 'HKQuantityTypeIdentifierAppleExerciseTime',
  unit: string,
  startDate: Date,
  endDate: Date,
): Promise<number | null> {
  let stats: QueryStatisticsResponse | null = null;
  try {
    stats = await HealthKit.queryStatisticsForQuantity(identifier, ['cumulativeSum'], {
      unit: unit as any,
      filter: {
        date: {
          startDate,
          endDate,
          strictStartDate: true,
          strictEndDate: true,
        },
      },
    });
  } catch {
    return null;
  }
  const quantity = stats?.sumQuantity?.quantity;
  return typeof quantity === 'number' && Number.isFinite(quantity) ? quantity : null;
}

async function queryWorkoutsCount(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<number | null> {
  try {
    const workouts = await HealthKit.queryWorkoutSamples({
      limit: 0,
      filter: {
        date: {
          startDate,
          endDate,
          strictStartDate: true,
          strictEndDate: true,
        },
      },
    });
    return workouts.length;
  } catch {
    return null;
  }
}

async function queryMindfulnessMinutes(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<number | null> {
  try {
    const sessions = await HealthKit.queryCategorySamples(
      'HKCategoryTypeIdentifierMindfulSession',
      {
        limit: 0,
        filter: {
          date: {
            startDate,
            endDate,
            strictStartDate: true,
            strictEndDate: true,
          },
        },
      },
    );
    let totalMinutes = 0;
    for (const session of sessions) {
      const durMs = clampWindow(session.startDate, session.endDate, startDate, endDate);
      totalMinutes += durMs / (1000 * 60);
    }
    return Math.round(totalMinutes);
  } catch {
    return null;
  }
}

async function querySleepHours(
  HealthKit: HealthKitModule,
  startDate: Date,
  endDate: Date,
): Promise<number | null> {
  try {
    const entries = await HealthKit.queryCategorySamples(
      'HKCategoryTypeIdentifierSleepAnalysis',
      {
        limit: 0,
        filter: {
          date: {
            startDate,
            endDate,
            strictStartDate: false,
            strictEndDate: false,
          },
        },
      },
    );
    // Approximation for weekly storytelling:
    // sum clipped overlaps in the local day window across all sleep-analysis entries.
    // This intentionally trades precision for resilience and avoids missing value-mode variants.
    let totalMs = 0;
    for (const entry of entries) {
      totalMs += clampWindow(entry.startDate, entry.endDate, startDate, endDate);
    }
    if (totalMs <= 0) return null;
    return toRoundedHours(totalMs / (1000 * 60 * 60));
  } catch {
    return null;
  }
}

export async function getHealthKitAvailability(): Promise<{
  available: boolean;
  permissionStatus: HealthPermissionStatus;
}> {
  if (Platform.OS !== 'ios') {
    return { available: false, permissionStatus: 'unavailable' };
  }

  const HealthKit = await loadHealthKitModule();
  if (!HealthKit) return { available: false, permissionStatus: 'unavailable' };

  const available = await HealthKit.isHealthDataAvailableAsync().catch(() => false);
  if (!available) {
    return { available: false, permissionStatus: 'unavailable' };
  }

  // Use request-status first to avoid inferring from a single-type auth value.
  const reqStatus = await HealthKit.getRequestStatusForAuthorization({
    toRead: [...HEALTH_READ_TYPES],
  }).catch(() => null);

  let permissionStatus = mapRequestStatus(reqStatus ?? null);
  if (permissionStatus === 'notRequested') {
    // If request-status is inconclusive, fall back to one representative type.
    const status = HealthKit.authorizationStatusFor('HKQuantityTypeIdentifierStepCount');
    permissionStatus = mapAuthorizationStatus(status);
  }
  return { available: true, permissionStatus };
}

export async function requestHealthKitReadPermission(): Promise<{
  granted: boolean;
  permissionStatus: HealthPermissionStatus;
}> {
  if (Platform.OS !== 'ios') {
    return { granted: false, permissionStatus: 'unavailable' };
  }

  const HealthKit = await loadHealthKitModule();
  if (!HealthKit) return { granted: false, permissionStatus: 'unavailable' };

  const available = await HealthKit.isHealthDataAvailableAsync().catch(() => false);
  if (!available) return { granted: false, permissionStatus: 'unavailable' };

  const granted = await HealthKit.requestAuthorization({
    toRead: [...HEALTH_READ_TYPES],
  }).catch(() => false);
  if (granted) {
    return { granted: true, permissionStatus: 'authorized' };
  }

  const status = HealthKit.authorizationStatusFor('HKQuantityTypeIdentifierStepCount');
  return { granted: false, permissionStatus: mapAuthorizationStatus(status) };
}

async function readYesterdayHealthTotals(): Promise<HealthDailyTotals | null> {
  if (Platform.OS !== 'ios') return null;

  const HealthKit = await loadHealthKitModule();
  if (!HealthKit) return null;

  const available = await HealthKit.isHealthDataAvailableAsync().catch(() => false);
  if (!available) return null;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const startDate = startOfLocalDay(yesterday);
  const endDate = endOfLocalDayExclusive(yesterday);

  const [stepsRaw, activeMinutesRaw, workoutsRaw, sleepHoursRaw, mindfulnessRaw] =
    await Promise.all([
      queryCumulativeQuantity(
        HealthKit,
        'HKQuantityTypeIdentifierStepCount',
        'count',
        startDate,
        endDate,
      ),
      queryCumulativeQuantity(
        HealthKit,
        'HKQuantityTypeIdentifierAppleExerciseTime',
        'min',
        startDate,
        endDate,
      ),
      queryWorkoutsCount(HealthKit, startDate, endDate),
      querySleepHours(HealthKit, startDate, endDate),
      queryMindfulnessMinutes(HealthKit, startDate, endDate),
    ]);

  const stepsCount = toNonNegativeInt(stepsRaw);
  const activeMinutes = toNonNegativeInt(activeMinutesRaw);
  const workoutsCount = toNonNegativeInt(workoutsRaw);
  const mindfulnessMinutes = toNonNegativeInt(mindfulnessRaw);
  const sleepHours =
    typeof sleepHoursRaw === 'number' && Number.isFinite(sleepHoursRaw) && sleepHoursRaw > 0
      ? sleepHoursRaw
      : null;

  if (
    stepsCount == null &&
    activeMinutes == null &&
    workoutsCount == null &&
    sleepHours == null &&
    mindfulnessMinutes == null
  ) {
    return null;
  }

  return {
    localDate: formatLocalDate(startDate),
    timezone: getTimezone(),
    stepsCount,
    activeMinutes,
    workoutsCount,
    sleepHours,
    mindfulnessMinutes,
  };
}

export async function syncYesterdayHealthDailyToSupabase(): Promise<HealthSyncResult> {
  const { healthPreferences, setHealthPreferences } = useAppStore.getState();
  if (!healthPreferences.enabled) {
    return { status: 'skipped', reason: 'disabled' };
  }
  if (Platform.OS !== 'ios') {
    return { status: 'skipped', reason: 'not_ios' };
  }
  if (healthPreferences.osPermissionStatus !== 'authorized') {
    return { status: 'skipped', reason: 'unauthorized' };
  }

  const supabase = getSupabaseClient();
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id ?? null;
  if (!userId) {
    return { status: 'skipped', reason: 'no_user' };
  }

  const daily = await readYesterdayHealthTotals();
  if (!daily) {
    return { status: 'skipped', reason: 'no_data' };
  }

  const { error } = await supabase.from('kwilt_health_daily').upsert(
    {
      user_id: userId,
      local_date: daily.localDate,
      timezone: daily.timezone || getTimezone(),
      steps_count: daily.stepsCount,
      active_minutes: daily.activeMinutes,
      workouts_count: daily.workoutsCount,
      sleep_hours: daily.sleepHours,
      mindfulness_minutes: daily.mindfulnessMinutes,
      source: 'healthkit',
    },
    { onConflict: 'user_id,local_date' },
  );
  if (error) {
    return { status: 'skipped', reason: 'unavailable' };
  }

  setHealthPreferences((current) => ({
    ...current,
    lastDailySyncDate: daily.localDate,
    lastSyncAtIso: new Date().toISOString(),
  }));
  return { status: 'synced', localDate: daily.localDate };
}

export function buildDefaultHealthDailySeed(): HealthDailyTotals {
  return {
    localDate: getYesterdayLocalDate(),
    timezone: getTimezone(),
    stepsCount: null,
    activeMinutes: null,
    workoutsCount: null,
    sleepHours: null,
    mindfulnessMinutes: null,
  };
}

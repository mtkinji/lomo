import type { UserProfile } from '../../../domain/types';
import {
  resolvePlanAvailability,
  type PlanAvailabilityByWeekday,
  type PlanMode,
  type PlanTimeWindow,
} from '../../../services/plan/planAvailability';

export type PlanAvailabilityWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PlanAvailabilityWindow = {
  weekday: PlanAvailabilityWeekday;
  mode: PlanMode;
  startLocalTime: string;
  endLocalTime: string;
};
export type PlanAvailabilitySnapshot = {
  version: number;
  timeZone: string;
  windows: PlanAvailabilityWindow[];
};
export type PlanAvailabilityReceipt = {
  operationId: 'plan.availability.update';
  previousVersion: number;
  version: number;
  previousTimeZone: string;
  timeZone: string;
  affectedWeekdays: PlanAvailabilityWeekday[];
};

const WEEKDAYS = [
  [1, 'mon'], [2, 'tue'], [3, 'wed'], [4, 'thu'], [5, 'fri'], [6, 'sat'], [7, 'sun'],
] as const satisfies readonly (readonly [PlanAvailabilityWeekday, keyof PlanAvailabilityByWeekday])[];
const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class PlanPreferenceConflictError extends Error {
  readonly code = 'plan_availability_version_stale';
}

function currentVersion(profile: UserProfile): number {
  const value = profile.preferences?.plan?.availabilityVersion;
  return Number.isInteger(value) && (value ?? -1) >= 0 ? value! : 0;
}

function currentTimeZone(profile: UserProfile): string {
  return profile.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
  } catch {
    throw new Error('plan availability time zone is invalid');
  }
}

function minutes(value: string): number {
  if (!LOCAL_TIME.test(value)) throw new Error('plan availability local time is invalid');
  const [hours, minute] = value.split(':').map(Number);
  return hours * 60 + minute;
}

function validateWindows(windows: readonly PlanAvailabilityWindow[]): void {
  if (windows.length > 28) throw new Error('plan availability supports at most 28 windows');
  const grouped = new Map<string, Array<{ start: number; end: number }>>();
  for (const window of windows) {
    if (!Number.isInteger(window.weekday) || window.weekday < 1 || window.weekday > 7) {
      throw new Error('plan availability weekday is invalid');
    }
    if (window.mode !== 'work' && window.mode !== 'personal') {
      throw new Error('plan availability mode is invalid');
    }
    const start = minutes(window.startLocalTime);
    const end = minutes(window.endLocalTime);
    if (end <= start) throw new Error('plan availability window must end after it starts');
    const key = `${window.weekday}:${window.mode}`;
    grouped.set(key, [...(grouped.get(key) ?? []), { start, end }]);
  }
  for (const values of grouped.values()) {
    const sorted = [...values].sort((left, right) => left.start - right.start);
    if (sorted.some((value, index) => index > 0 && value.start < sorted[index - 1]!.end)) {
      throw new Error('plan availability windows cannot overlap within one mode');
    }
  }
}

function cloneWindow(window: PlanTimeWindow): PlanTimeWindow {
  return { start: window.start, end: window.end };
}

function cloneAvailability(availability: PlanAvailabilityByWeekday): PlanAvailabilityByWeekday {
  return Object.fromEntries(WEEKDAYS.map(([, key]) => [key, {
    enabled: availability[key].enabled,
    windows: {
      work: availability[key].windows.work.map(cloneWindow),
      personal: availability[key].windows.personal.map(cloneWindow),
    },
  }])) as PlanAvailabilityByWeekday;
}

function windowsFromAvailability(availability: PlanAvailabilityByWeekday): PlanAvailabilityWindow[] {
  return WEEKDAYS.flatMap(([weekday, key]) => {
    const day = availability[key];
    if (!day.enabled) return [];
    return (['work', 'personal'] as const).flatMap((mode) => day.windows[mode].map((window) => ({
      weekday,
      mode,
      startLocalTime: window.start,
      endLocalTime: window.end,
    })));
  });
}

function availabilityFromWindows(windows: readonly PlanAvailabilityWindow[]): PlanAvailabilityByWeekday {
  validateWindows(windows);
  const emptyDay = () => ({
    enabled: false,
    windows: { work: [] as PlanTimeWindow[], personal: [] as PlanTimeWindow[] },
  });
  const availability: PlanAvailabilityByWeekday = {
    mon: emptyDay(), tue: emptyDay(), wed: emptyDay(), thu: emptyDay(),
    fri: emptyDay(), sat: emptyDay(), sun: emptyDay(),
  };
  for (const window of windows) {
    const key = WEEKDAYS.find(([weekday]) => weekday === window.weekday)![1];
    availability[key].enabled = true;
    availability[key].windows[window.mode].push({ start: window.startLocalTime, end: window.endLocalTime });
  }
  return availability;
}

function affectedWeekdays(
  previous: PlanAvailabilityByWeekday,
  next: PlanAvailabilityByWeekday,
): PlanAvailabilityWeekday[] {
  return WEEKDAYS.flatMap(([weekday, key]) => (
    JSON.stringify(previous[key]) === JSON.stringify(next[key]) ? [] : [weekday]
  ));
}

export function readPlanAvailability(profile: UserProfile): PlanAvailabilitySnapshot {
  const availability = resolvePlanAvailability(profile);
  return {
    version: currentVersion(profile),
    timeZone: currentTimeZone(profile),
    windows: windowsFromAvailability(availability),
  };
}

export function applyPlanAvailabilityState(
  profile: UserProfile,
  input: {
    expectedVersion: number;
    timeZone: string;
    availability: PlanAvailabilityByWeekday;
  },
): { profile: UserProfile; receipt: PlanAvailabilityReceipt } {
  const previousVersion = currentVersion(profile);
  if (input.expectedVersion !== previousVersion) {
    throw new PlanPreferenceConflictError(`Plan availability changed from version ${input.expectedVersion} to ${previousVersion}.`);
  }
  const timeZone = input.timeZone.trim();
  assertTimeZone(timeZone);
  const previousAvailability = resolvePlanAvailability(profile);
  const availability = cloneAvailability(input.availability);
  validateWindows(windowsFromAvailability(availability));
  const previousTimeZone = currentTimeZone(profile);
  const version = previousVersion + 1;
  return {
    profile: {
      ...profile,
      timezone: timeZone,
      preferences: {
        ...(profile.preferences ?? {}),
        plan: {
          ...(profile.preferences?.plan ?? {}),
          availability,
          availabilityVersion: version,
        },
      },
    },
    receipt: {
      operationId: 'plan.availability.update',
      previousVersion,
      version,
      previousTimeZone,
      timeZone,
      affectedWeekdays: affectedWeekdays(previousAvailability, availability),
    },
  };
}

export function applyPlanAvailabilityUpdate(
  profile: UserProfile,
  input: {
    expectedVersion: number;
    timeZone: string;
    windows: readonly PlanAvailabilityWindow[];
  },
): { profile: UserProfile; receipt: PlanAvailabilityReceipt } {
  return applyPlanAvailabilityState(profile, {
    expectedVersion: input.expectedVersion,
    timeZone: input.timeZone,
    availability: availabilityFromWindows(input.windows),
  });
}

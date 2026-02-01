import type { UserProfile } from '../../domain/types';
import { getWeekdayKey } from './planDates';

export type PlanMode = 'work' | 'personal';
export type PlanTimeWindow = { start: string; end: string };
export type PlanDayAvailability = {
  enabled: boolean;
  windows: {
    work: PlanTimeWindow[];
    personal: PlanTimeWindow[];
  };
};

export type PlanAvailabilityByWeekday = {
  sun: PlanDayAvailability;
  mon: PlanDayAvailability;
  tue: PlanDayAvailability;
  wed: PlanDayAvailability;
  thu: PlanDayAvailability;
  fri: PlanDayAvailability;
  sat: PlanDayAvailability;
};

export function getDefaultPlanAvailability(): PlanAvailabilityByWeekday {
  const base: PlanDayAvailability = {
    enabled: true,
    windows: {
      work: [{ start: '09:00', end: '17:00' }],
      personal: [{ start: '17:00', end: '21:00' }],
    },
  };
  return {
    sun: { ...base, enabled: false },
    mon: { ...base },
    tue: { ...base },
    wed: { ...base },
    thu: { ...base },
    fri: { ...base },
    sat: { ...base },
  };
}

export function resolvePlanAvailability(userProfile: UserProfile | null): PlanAvailabilityByWeekday {
  const stored = userProfile?.preferences?.plan?.availability;
  if (!stored) return getDefaultPlanAvailability();
  const fallback = getDefaultPlanAvailability();
  return {
    sun: stored.sun ?? fallback.sun,
    mon: stored.mon ?? fallback.mon,
    tue: stored.tue ?? fallback.tue,
    wed: stored.wed ?? fallback.wed,
    thu: stored.thu ?? fallback.thu,
    fri: stored.fri ?? fallback.fri,
    sat: stored.sat ?? fallback.sat,
  };
}

export function getAvailabilityForDate(userProfile: UserProfile | null, date: Date): PlanDayAvailability {
  const all = resolvePlanAvailability(userProfile);
  const key = getWeekdayKey(date);
  return all[key];
}

export function getWindowsForMode(day: PlanDayAvailability, mode: PlanMode): PlanTimeWindow[] {
  return day.windows?.[mode] ?? [];
}






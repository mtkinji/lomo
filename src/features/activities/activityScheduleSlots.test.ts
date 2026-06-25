import type { Activity, ActivityArea, UserProfile } from '../../domain/types';
import { resolveManualScheduleSlot } from './activityScheduleSlots';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    goalId: null,
    title: 'Buy groceries',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    estimateMinutes: 30,
    ...overrides,
  } as Activity;
}

function profileForMonday(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    preferences: {
      plan: {
        availability: {
          mon: {
            enabled: true,
            windows: {
              work: [{ start: '09:00', end: '10:00' }],
              personal: [{ start: '10:00', end: '12:00' }],
            },
          },
        },
      },
    },
    ...overrides,
  } as UserProfile;
}

describe('activityScheduleSlots', () => {
  it('accepts a free manual slot inside the activity availability window', () => {
    const start = new Date(2026, 5, 22, 10, 30);

    const result = resolveManualScheduleSlot({
      activity: activity(),
      activityAreas: [],
      goals: [],
      userProfile: profileForMonday(),
      date: start,
      durationMinutes: 30,
      busyIntervals: [],
      now: new Date(2026, 5, 21, 12, 0),
    });

    expect(result).toEqual({
      ok: true,
      slot: {
        startDate: start.toISOString(),
        endDate: new Date(2026, 5, 22, 11, 0).toISOString(),
      },
    });
  });

  it('uses the activity Area scheduling mode before keyword inference', () => {
    const workAreas: ActivityArea[] = [
      {
        id: 'area-work',
        label: 'Work',
        order: 0,
        scheduling: { fallbackMode: 'work' },
      },
    ];

    const result = resolveManualScheduleSlot({
      activity: activity({ areaId: 'area-work' }),
      activityAreas: workAreas,
      goals: [],
      userProfile: profileForMonday(),
      date: new Date(2026, 5, 22, 9, 15),
      durationMinutes: 30,
      busyIntervals: [],
      now: new Date(2026, 5, 21, 12, 0),
    });

    expect(result.ok).toBe(true);
  });

  it('rejects slots that cross the end of the selected day', () => {
    const result = resolveManualScheduleSlot({
      activity: activity(),
      activityAreas: [],
      goals: [],
      userProfile: profileForMonday(),
      date: new Date(2026, 5, 22, 23, 45),
      durationMinutes: 30,
      busyIntervals: [],
      now: new Date(2026, 5, 21, 12, 0),
    });

    expect(result).toEqual({
      ok: false,
      reason: 'end-of-day',
      toast: { message: 'Not enough time before the end of day.', durationMs: 2200 },
    });
  });

  it('rejects past slots on the current day', () => {
    const result = resolveManualScheduleSlot({
      activity: activity(),
      activityAreas: [],
      goals: [],
      userProfile: profileForMonday(),
      date: new Date(2026, 5, 22, 10, 0),
      durationMinutes: 30,
      busyIntervals: [],
      now: new Date(2026, 5, 22, 10, 2),
    });

    expect(result).toEqual({
      ok: false,
      reason: 'past-today',
      toast: { message: 'Pick a time later today.', durationMs: 2200 },
    });
  });

  it('rejects slots outside availability or overlapping busy intervals', () => {
    const outsideWindow = resolveManualScheduleSlot({
      activity: activity(),
      activityAreas: [],
      goals: [],
      userProfile: profileForMonday(),
      date: new Date(2026, 5, 22, 13, 0),
      durationMinutes: 30,
      busyIntervals: [],
      now: new Date(2026, 5, 21, 12, 0),
    });

    expect(outsideWindow).toEqual({
      ok: false,
      reason: 'outside-window',
      toast: { message: 'That time is outside your availability.', durationMs: 2400 },
    });

    const busy = resolveManualScheduleSlot({
      activity: activity(),
      activityAreas: [],
      goals: [],
      userProfile: profileForMonday(),
      date: new Date(2026, 5, 22, 10, 30),
      durationMinutes: 30,
      busyIntervals: [{ start: new Date(2026, 5, 22, 10, 45), end: new Date(2026, 5, 22, 11, 15) }],
      now: new Date(2026, 5, 21, 12, 0),
    });

    expect(busy).toEqual({
      ok: false,
      reason: 'busy',
      toast: { message: 'That time is busy.', durationMs: 2200 },
    });
  });
});

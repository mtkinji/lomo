import type { UserProfile } from '../../../domain/types';
import { getDefaultPlanAvailability } from '../../../services/plan/planAvailability';
import {
  applyPlanAvailabilityState,
  applyPlanAvailabilityUpdate,
  PlanPreferenceConflictError,
  readPlanAvailability,
} from './planPreferenceActions';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'profile-1',
  fullName: 'Andrew',
  timezone: 'America/Denver',
  preferences: {
    plan: {
      availability: getDefaultPlanAvailability(),
      availabilityVersion: 3,
    },
  },
  communication: {},
  visuals: {},
  ...overrides,
} as UserProfile);

describe('planPreferenceActions', () => {
  it('reads mode-preserving weekly windows and the current time zone', () => {
    const result = readPlanAvailability(profile());

    expect(result.version).toBe(3);
    expect(result.timeZone).toBe('America/Denver');
    expect(result.windows).toEqual(expect.arrayContaining([
      { weekday: 1, mode: 'work', startLocalTime: '09:00', endLocalTime: '17:00' },
      { weekday: 1, mode: 'personal', startLocalTime: '17:00', endLocalTime: '21:00' },
    ]));
    expect(result.windows.some((window) => window.weekday === 7)).toBe(false);
  });

  it('applies a full reviewed week, changes time zone, and reports exact affected days', () => {
    const result = applyPlanAvailabilityUpdate(profile(), {
      expectedVersion: 3,
      timeZone: 'America/Chicago',
      windows: [
        { weekday: 1, mode: 'work', startLocalTime: '08:00', endLocalTime: '16:00' },
        { weekday: 6, mode: 'personal', startLocalTime: '10:00', endLocalTime: '14:00' },
      ],
    });

    expect(result.profile.timezone).toBe('America/Chicago');
    expect(result.profile.preferences?.plan?.availabilityVersion).toBe(4);
    expect(result.profile.preferences?.plan?.availability?.mon).toEqual({
      enabled: true,
      windows: { work: [{ start: '08:00', end: '16:00' }], personal: [] },
    });
    expect(result.profile.preferences?.plan?.availability?.tue?.enabled).toBe(false);
    expect(result.profile.preferences?.plan?.availability?.sat?.windows.personal)
      .toEqual([{ start: '10:00', end: '14:00' }]);
    expect(result.receipt).toMatchObject({
      operationId: 'plan.availability.update',
      previousVersion: 3,
      version: 4,
      previousTimeZone: 'America/Denver',
      timeZone: 'America/Chicago',
    });
    expect(result.receipt.affectedWeekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('rejects stale updates and overlapping same-mode windows', () => {
    expect(() => applyPlanAvailabilityUpdate(profile(), {
      expectedVersion: 2,
      timeZone: 'America/Denver',
      windows: [],
    })).toThrow(PlanPreferenceConflictError);

    expect(() => applyPlanAvailabilityUpdate(profile(), {
      expectedVersion: 3,
      timeZone: 'America/Denver',
      windows: [
        { weekday: 1, mode: 'work', startLocalTime: '09:00', endLocalTime: '12:00' },
        { weekday: 1, mode: 'work', startLocalTime: '11:00', endLocalTime: '13:00' },
      ],
    })).toThrow('overlap');
  });

  it('lets the native screen use the same versioned action without losing either mode', () => {
    const availability = getDefaultPlanAvailability();
    availability.sun = {
      enabled: true,
      windows: { work: [], personal: [{ start: '12:00', end: '16:00' }] },
    };

    const result = applyPlanAvailabilityState(profile(), {
      expectedVersion: 3,
      timeZone: 'America/Denver',
      availability,
    });

    expect(result.profile.preferences?.plan?.availability?.sun).toEqual(availability.sun);
    expect(result.receipt.affectedWeekdays).toEqual([7]);
  });
});

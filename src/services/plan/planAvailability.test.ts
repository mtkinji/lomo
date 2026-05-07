import {
  getAvailabilityForDate,
  getDefaultPlanAvailability,
  getWindowsForMode,
  resolvePlanAvailability,
} from './planAvailability';
import type { UserProfile } from '../../domain/types';

const FIXED_ISO = '2026-01-01T12:00:00.000Z';

function userProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    ...overrides,
  } as UserProfile;
}

describe('getDefaultPlanAvailability', () => {
  it('disables Sunday by default', () => {
    const a = getDefaultPlanAvailability();
    expect(a.sun.enabled).toBe(false);
  });

  it('enables Monday-Saturday by default', () => {
    const a = getDefaultPlanAvailability();
    (['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).forEach((key) => {
      expect(a[key].enabled).toBe(true);
    });
  });

  it('provides default work and personal windows for enabled days', () => {
    const a = getDefaultPlanAvailability();
    expect(a.mon.windows.work).toEqual([{ start: '09:00', end: '17:00' }]);
    expect(a.mon.windows.personal).toEqual([{ start: '17:00', end: '21:00' }]);
  });
});

describe('resolvePlanAvailability', () => {
  it('returns the default availability when no profile is provided', () => {
    expect(resolvePlanAvailability(null)).toEqual(getDefaultPlanAvailability());
  });

  it('returns default availability when profile has no plan preferences', () => {
    expect(resolvePlanAvailability(userProfile())).toEqual(
      getDefaultPlanAvailability(),
    );
  });

  it('overlays stored availability per weekday and falls back to defaults for missing keys', () => {
    const stored = {
      mon: {
        enabled: true,
        windows: {
          work: [{ start: '08:00', end: '12:00' }],
          personal: [{ start: '12:00', end: '14:00' }],
        },
      },
    } as any;
    const profile = userProfile({
      preferences: {
        plan: { availability: stored },
      },
    } as any);
    const result = resolvePlanAvailability(profile);
    expect(result.mon.windows.work).toEqual([{ start: '08:00', end: '12:00' }]);
    expect(result.tue).toEqual(getDefaultPlanAvailability().tue);
  });
});

describe('getAvailabilityForDate', () => {
  it('returns the entry for the corresponding weekday', () => {
    const wed = getAvailabilityForDate(null, new Date(2026, 3, 15));
    expect(wed.enabled).toBe(true);
    expect(wed.windows.work).toEqual([{ start: '09:00', end: '17:00' }]);
  });

  it('returns the disabled Sunday entry by default', () => {
    const sun = getAvailabilityForDate(null, new Date(2026, 3, 12));
    expect(sun.enabled).toBe(false);
  });
});

describe('getWindowsForMode', () => {
  it('returns the windows for the requested mode', () => {
    const day = getDefaultPlanAvailability().mon;
    expect(getWindowsForMode(day, 'work')).toEqual([{ start: '09:00', end: '17:00' }]);
    expect(getWindowsForMode(day, 'personal')).toEqual([{ start: '17:00', end: '21:00' }]);
  });

  it('returns an empty array when windows are missing for the mode', () => {
    const day = { enabled: true, windows: {} as any };
    expect(getWindowsForMode(day as any, 'work')).toEqual([]);
  });
});

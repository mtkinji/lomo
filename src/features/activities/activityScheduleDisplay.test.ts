import {
  formatScheduleSlotTimeRange,
  getScheduleDurationOptions,
  resolveScheduleDurationMinutes,
} from './activityScheduleDisplay';

describe('activityScheduleDisplay', () => {
  it('builds 15-minute duration options up to four hours', () => {
    expect(getScheduleDurationOptions()).toEqual([
      15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240,
    ]);
  });

  it('snaps schedule duration drafts to the nearest 15 minutes inside bounds', () => {
    expect(resolveScheduleDurationMinutes({ draft: '44', fallbackEstimateMinutes: 30 })).toBe(45);
    expect(resolveScheduleDurationMinutes({ draft: '7', fallbackEstimateMinutes: 30 })).toBe(15);
    expect(resolveScheduleDurationMinutes({ draft: '999', fallbackEstimateMinutes: 30 })).toBe(240);
  });

  it('falls back to the activity estimate when the draft is not usable', () => {
    expect(resolveScheduleDurationMinutes({ draft: 'later', fallbackEstimateMinutes: 50 })).toBe(45);
    expect(resolveScheduleDurationMinutes({ draft: '', fallbackEstimateMinutes: undefined })).toBe(30);
  });

  it('formats schedule slot time ranges with the requested separator', () => {
    const slot = {
      startDate: new Date(2026, 6, 7, 9, 0).toISOString(),
      endDate: new Date(2026, 6, 7, 9, 45).toISOString(),
    };

    expect(formatScheduleSlotTimeRange(slot, { locale: 'en-US' })).toBe('9:00 AM-9:45 AM');
    expect(formatScheduleSlotTimeRange(slot, { locale: 'en-US', separator: '–' })).toBe('9:00 AM–9:45 AM');
  });

  it('returns null for invalid schedule slot dates', () => {
    expect(
      formatScheduleSlotTimeRange({
        startDate: 'not-a-date',
        endDate: new Date(2026, 6, 7, 9, 45).toISOString(),
      }),
    ).toBeNull();
  });
});

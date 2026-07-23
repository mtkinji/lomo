import {
  formatScheduleSlotTimeRange,
  resolveSelectedScheduleSlot,
} from './activityScheduleSelection';

const firstSlot = {
  startDate: new Date(2026, 6, 10, 9, 0).toISOString(),
  endDate: new Date(2026, 6, 10, 9, 30).toISOString(),
};

const secondSlot = {
  startDate: new Date(2026, 6, 10, 10, 0).toISOString(),
  endDate: new Date(2026, 6, 10, 10, 45).toISOString(),
};

describe('activityScheduleSelection', () => {
  it('uses a manual schedule slot before suggested slots', () => {
    const manualSlot = {
      startDate: new Date(2026, 6, 10, 11, 0).toISOString(),
      endDate: new Date(2026, 6, 10, 11, 30).toISOString(),
    };

    expect(resolveSelectedScheduleSlot({
      manualScheduleSlot: manualSlot,
      scheduleSlots: [firstSlot, secondSlot],
      selectedSlotIndex: 1,
    })).toEqual(manualSlot);
  });

  it('falls back to the selected suggested slot when there is no manual slot', () => {
    expect(resolveSelectedScheduleSlot({
      manualScheduleSlot: null,
      scheduleSlots: [firstSlot, secondSlot],
      selectedSlotIndex: 1,
    })).toEqual(secondSlot);
  });

  it('returns null when the selected suggested slot is missing', () => {
    expect(resolveSelectedScheduleSlot({
      manualScheduleSlot: null,
      scheduleSlots: [firstSlot],
      selectedSlotIndex: -1,
    })).toBeNull();
  });

  it('formats schedule slot time ranges with the requested separator', () => {
    expect(formatScheduleSlotTimeRange(firstSlot, { locale: 'en-US' })).toBe('9:00 AM-9:30 AM');
    expect(formatScheduleSlotTimeRange(firstSlot, { locale: 'en-US', separator: '–' })).toBe('9:00 AM–9:30 AM');
  });

  it('returns null when a schedule slot has invalid dates', () => {
    expect(formatScheduleSlotTimeRange({
      startDate: 'not-a-date',
      endDate: secondSlot.endDate,
    })).toBeNull();
  });
});

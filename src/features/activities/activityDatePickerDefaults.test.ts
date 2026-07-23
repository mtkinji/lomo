import {
  resolveInitialDueDateForPicker,
  resolveInitialReminderDateTimeForPicker,
} from './activityDatePickerDefaults';

const fixedNow = new Date('2026-07-05T10:24:30.000Z');

describe('activity date picker defaults', () => {
  it('uses an existing reminder timestamp when present', () => {
    expect(
      resolveInitialReminderDateTimeForPicker({
        reminderAt: '2026-07-07T09:15:00.000Z',
        now: fixedNow,
      }).toISOString(),
    ).toBe('2026-07-07T09:15:00.000Z');
  });

  it('defaults missing reminders to the next hour boundary', () => {
    expect(
      resolveInitialReminderDateTimeForPicker({
        reminderAt: null,
        now: fixedNow,
      }).toISOString(),
    ).toBe('2026-07-05T11:00:00.000Z');
  });

  it('uses a valid existing due date when present', () => {
    expect(
      resolveInitialDueDateForPicker({
        scheduledDate: '2026-07-08T23:00:00.000Z',
        now: fixedNow,
      }).toISOString(),
    ).toBe('2026-07-08T23:00:00.000Z');
  });

  it('falls back to now for missing or invalid due dates, including quick-add state', () => {
    expect(
      resolveInitialDueDateForPicker({
        scheduledDate: null,
        now: fixedNow,
      }).toISOString(),
    ).toBe(fixedNow.toISOString());

    expect(
      resolveInitialDueDateForPicker({
        scheduledDate: 'not-a-date',
        now: fixedNow,
      }).toISOString(),
    ).toBe(fixedNow.toISOString());
  });
});

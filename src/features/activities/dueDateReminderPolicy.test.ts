import type { Activity } from '../../domain/types';
import {
  applyDueDateReminderPolicy,
  getDefaultReminderAtForDueDate,
  REMINDER_SOURCE_DUE_DATE_DEFAULT,
} from './dueDateReminderPolicy';

const baseActivity = (overrides: Partial<Activity> = {}): Activity =>
  ({
    id: 'activity-1',
    goalId: null,
    title: 'Follow up',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    reminderAt: null,
    scheduledDate: null,
    ...overrides,
  }) as Activity;

describe('dueDateReminderPolicy', () => {
  it('derives a 9 AM local reminder for a future due date', () => {
    const reminderAt = getDefaultReminderAtForDueDate(
      new Date(2026, 6, 8, 23, 0).toISOString(),
      new Date(2026, 6, 6, 12, 0),
    );

    expect(reminderAt).toBe(new Date(2026, 6, 8, 9, 0, 0, 0).toISOString());
  });

  it('uses a same-day evening fallback when morning has passed', () => {
    const reminderAt = getDefaultReminderAtForDueDate(
      new Date(2026, 6, 6, 23, 0).toISOString(),
      new Date(2026, 6, 6, 12, 0),
    );

    expect(reminderAt).toBe(new Date(2026, 6, 6, 18, 0, 0, 0).toISOString());
  });

  it('does not create a same-day reminder when the fallback is too soon', () => {
    const reminderAt = getDefaultReminderAtForDueDate(
      new Date(2026, 6, 6, 23, 0).toISOString(),
      new Date(2026, 6, 6, 17, 45),
    );

    expect(reminderAt).toBeNull();
  });

  it('creates a derived reminder when setting a due date without an existing reminder', () => {
    const patch = applyDueDateReminderPolicy({
      activity: baseActivity(),
      nextScheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
      now: new Date(2026, 6, 6, 12, 0),
    });

    expect(patch).toEqual({
      scheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
      reminderAt: new Date(2026, 6, 8, 9, 0, 0, 0).toISOString(),
      reminderSource: REMINDER_SOURCE_DUE_DATE_DEFAULT,
    });
  });

  it('preserves manual reminders when changing a due date', () => {
    const manualReminderAt = new Date(2026, 6, 7, 18, 0).toISOString();
    const patch = applyDueDateReminderPolicy({
      activity: baseActivity({
        reminderAt: manualReminderAt,
        reminderSource: 'manual',
      }),
      nextScheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
      now: new Date(2026, 6, 6, 12, 0),
    });

    expect(patch).toEqual({
      scheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
    });
  });

  it('treats legacy reminders without provenance as manual', () => {
    const legacyReminderAt = new Date(2026, 6, 7, 18, 0).toISOString();
    const patch = applyDueDateReminderPolicy({
      activity: baseActivity({ reminderAt: legacyReminderAt }),
      nextScheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
      now: new Date(2026, 6, 6, 12, 0),
    });

    expect(patch).toEqual({
      scheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
    });
  });

  it('moves a derived reminder when changing a derived due date', () => {
    const patch = applyDueDateReminderPolicy({
      activity: baseActivity({
        scheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
        reminderAt: new Date(2026, 6, 8, 9, 0).toISOString(),
        reminderSource: REMINDER_SOURCE_DUE_DATE_DEFAULT,
      }),
      nextScheduledDate: new Date(2026, 6, 9, 23, 0).toISOString(),
      now: new Date(2026, 6, 6, 12, 0),
    });

    expect(patch).toEqual({
      scheduledDate: new Date(2026, 6, 9, 23, 0).toISOString(),
      reminderAt: new Date(2026, 6, 9, 9, 0, 0, 0).toISOString(),
      reminderSource: REMINDER_SOURCE_DUE_DATE_DEFAULT,
    });
  });

  it('clears only due-date-derived reminders when clearing a due date', () => {
    const patch = applyDueDateReminderPolicy({
      activity: baseActivity({
        scheduledDate: new Date(2026, 6, 8, 23, 0).toISOString(),
        reminderAt: new Date(2026, 6, 8, 9, 0).toISOString(),
        reminderSource: REMINDER_SOURCE_DUE_DATE_DEFAULT,
      }),
      nextScheduledDate: null,
      now: new Date(2026, 6, 6, 12, 0),
    });

    expect(patch).toEqual({
      scheduledDate: null,
      reminderAt: null,
      reminderSource: undefined,
    });
  });
});

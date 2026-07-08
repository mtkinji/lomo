import {
  getCalendarCommitAlertForError,
  hasBindableCalendarEventRef,
  resolveCalendarEventRefBeforeCreate,
  resolveCalendarEventRefAfterCreate,
} from './calendarEventCommit';
import type { CalendarEventRef, CalendarRef } from './calendarApi';

const writeRef: CalendarRef = {
  provider: 'google',
  accountId: 'acct-1',
  calendarId: 'cal-1',
};

const block = {
  startDate: '2026-07-08T15:30:00.000Z',
  endDate: '2026-07-08T16:30:00.000Z',
};

const eventRef: CalendarEventRef = {
  ...writeRef,
  eventId: 'event-1',
};

describe('calendarEventCommit', () => {
  it('accepts a bindable event ref from a normal create response', () => {
    expect(hasBindableCalendarEventRef(eventRef)).toBe(true);
    expect(hasBindableCalendarEventRef({ ...eventRef, eventId: '' })).toBe(false);
  });

  it('recovers the event ref when create succeeds without a JSON eventRef payload', async () => {
    const result = await resolveCalendarEventRefAfterCreate({
      createResult: {},
      block,
      writeRef,
      verifyLikelySucceeded: jest.fn(async () => true),
      findEventRef: jest.fn(async () => eventRef),
    });

    expect(result).toEqual({ status: 'linked', eventRef });
  });

  it('links an existing matching calendar event before creating another duplicate', async () => {
    const result = await resolveCalendarEventRefBeforeCreate({
      block,
      writeRef,
      findEventRef: jest.fn(async () => eventRef),
    });

    expect(result).toEqual({ status: 'linked', eventRef });
  });

  it('keeps uncertain calendar writes unconfirmed when the block cannot be verified', async () => {
    const findEventRef = jest.fn(async () => eventRef);

    const result = await resolveCalendarEventRefAfterCreate({
      createResult: {},
      block,
      writeRef,
      verifyLikelySucceeded: jest.fn(async () => false),
      findEventRef,
    });

    expect(result).toEqual({ status: 'unconfirmed' });
    expect(findEventRef).not.toHaveBeenCalled();
  });

  it('uses calendar-specific permission copy for provider write denials', () => {
    expect(getCalendarCommitAlertForError(new Error('Request failed (403)'))).toEqual({
      title: 'Calendar access denied',
      message:
        'Kwilt can’t write to that calendar. Try picking a different write calendar or reconnecting your calendar account in Settings.',
    });
  });
});

import type { Activity, ActivityScheduleSession } from '../../domain/types';
import {
  cancelActivityScheduleSession,
  findMatchingActivityScheduleSession,
  getActiveActivityScheduleSessions,
  moveActivityScheduleSession,
  upsertActivityScheduleSession,
} from './activityScheduleSessions';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1', goalId: null, title: 'Draft family story center', type: 'task', tags: [],
    status: 'planned', forceActual: {}, createdAt: '2026-08-11T12:00:00.000Z',
    updatedAt: '2026-08-11T12:00:00.000Z', ...overrides,
  };
}

function session(id: string, start: string, end: string, eventId = id): ActivityScheduleSession {
  return {
    id, activityId: 'activity-1', start, end,
    calendarBinding: { kind: 'provider', provider: 'google', accountId: 'account-1', calendarId: 'calendar-1', eventId, createdBy: 'plan' },
    source: 'plan', status: 'scheduled', createdAt: '2026-08-11T12:00:00.000Z', updatedAt: '2026-08-11T12:00:00.000Z',
  };
}

describe('activityScheduleSessions', () => {
  it('keeps multiple active sessions ordered and derives the next legacy binding', () => {
    const later = session('later', '2026-08-12T20:00:00.000Z', '2026-08-12T21:00:00.000Z');
    const sooner = session('sooner', '2026-08-11T20:00:00.000Z', '2026-08-11T21:00:00.000Z');
    const withLater = upsertActivityScheduleSession(activity(), later, new Date('2026-08-11T18:00:00.000Z'));
    const withBoth = upsertActivityScheduleSession(withLater, sooner, new Date('2026-08-11T18:00:00.000Z'));

    expect(getActiveActivityScheduleSessions(withBoth).map((item) => item.id)).toEqual(['sooner', 'later']);
    expect(withBoth.scheduledAt).toBe(sooner.start);
    expect(withBoth.calendarBinding).toEqual(sooner.calendarBinding);
  });

  it('matches the same provider-calendar window but allows a different time', () => {
    const existing = session('existing', '2026-08-11T20:00:00.000Z', '2026-08-11T21:00:00.000Z');
    const scheduled = activity({ scheduleSessions: [existing] });

    expect(findMatchingActivityScheduleSession(scheduled, { start: existing.start, end: existing.end, calendarBinding: existing.calendarBinding })?.id).toBe('existing');
    expect(findMatchingActivityScheduleSession(scheduled, { start: '2026-08-11T22:00:00.000Z', end: '2026-08-11T23:00:00.000Z', calendarBinding: existing.calendarBinding })).toBeNull();
  });

  it('moves and cancels only the selected session', () => {
    const first = session('first', '2026-08-11T20:00:00.000Z', '2026-08-11T21:00:00.000Z');
    const second = session('second', '2026-08-12T20:00:00.000Z', '2026-08-12T21:00:00.000Z');
    const scheduled = activity({ scheduleSessions: [first, second] });
    const moved = moveActivityScheduleSession(scheduled, 'second', { start: '2026-08-12T22:00:00.000Z', end: '2026-08-12T23:00:00.000Z', updatedAt: '2026-08-11T13:00:00.000Z' });
    const cancelled = cancelActivityScheduleSession(moved, 'first', '2026-08-11T14:00:00.000Z', new Date('2026-08-11T18:00:00.000Z'));

    expect(cancelled.scheduleSessions?.find((item) => item.id === 'first')?.status).toBe('cancelled');
    expect(cancelled.scheduleSessions?.find((item) => item.id === 'second')?.start).toBe('2026-08-12T22:00:00.000Z');
    expect(cancelled.scheduledAt).toBe('2026-08-12T22:00:00.000Z');
  });

  it('updates both edges of only the selected session when its duration changes', () => {
    const first = session('first', '2026-08-11T20:00:00.000Z', '2026-08-11T21:00:00.000Z');
    const second = session('second', '2026-08-12T20:00:00.000Z', '2026-08-12T21:00:00.000Z');
    const scheduled = activity({ scheduleSessions: [first, second] });

    const updated = moveActivityScheduleSession(scheduled, 'second', {
      start: '2026-08-12T20:30:00.000Z',
      end: '2026-08-12T22:15:00.000Z',
      updatedAt: '2026-08-11T13:00:00.000Z',
    });

    expect(updated.scheduleSessions?.find((item) => item.id === 'first')).toEqual(first);
    expect(updated.scheduleSessions?.find((item) => item.id === 'second')).toMatchObject({
      start: '2026-08-12T20:30:00.000Z',
      end: '2026-08-12T22:15:00.000Z',
    });
  });
});

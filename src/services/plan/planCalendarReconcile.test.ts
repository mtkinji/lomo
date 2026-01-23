import { reconcilePlanCalendarEvents } from './planCalendarReconcile';

function mkExternalEvent(args: {
  provider?: 'google' | 'microsoft';
  accountId?: string;
  calendarId?: string;
  eventId?: string;
  title?: string | null;
  start: string;
  end: string;
  isAllDay?: boolean;
}) {
  return {
    provider: args.provider ?? 'google',
    accountId: args.accountId ?? 'acct',
    calendarId: args.calendarId ?? 'cal',
    eventId: args.eventId ?? 'evt',
    title: args.title ?? null,
    start: args.start,
    end: args.end,
    isAllDay: args.isAllDay,
  };
}

describe('reconcilePlanCalendarEvents', () => {
  test('removes external event that matches Activity scheduledProvider* ids', () => {
    const external = [
      mkExternalEvent({
        provider: 'google',
        accountId: 'a1',
        calendarId: 'c1',
        eventId: 'e1',
        title: 'Standup',
        start: '2026-01-22T10:30:00.000Z',
        end: '2026-01-22T11:00:00.000Z',
      }),
    ];
    const kwiltBlocks = [
      {
        activity: {
          id: 'act1',
          goalId: null,
          title: 'Standup',
          type: 'task',
          tags: [],
          scheduledAt: '2026-01-22T10:30:00.000Z',
          estimateMinutes: 30,
          status: 'planned',
          forceActual: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          scheduledProvider: 'google',
          scheduledProviderAccountId: 'a1',
          scheduledProviderCalendarId: 'c1',
          scheduledProviderEventId: 'e1',
        } as any,
        start: new Date('2026-01-22T10:30:00.000Z'),
        end: new Date('2026-01-22T11:00:00.000Z'),
      },
    ];

    const res = reconcilePlanCalendarEvents({ externalEvents: external as any, kwiltBlocks });
    expect(res.externalEvents).toHaveLength(0);
    expect(res.matchedExternalEventKeys.has('google:a1:c1:e1')).toBe(true);
  });

  test('removes external event via heuristic (time + title similarity)', () => {
    const external = [
      mkExternalEvent({
        provider: 'google',
        accountId: 'a1',
        calendarId: 'c1',
        eventId: 'official1',
        title: 'Update dialog and bug bash',
        start: '2026-01-22T18:30:00.000Z',
        end: '2026-01-22T19:30:00.000Z',
      }),
    ];
    const kwiltBlocks = [
      {
        activity: {
          id: 'act1',
          goalId: null,
          title: 'Update dialog and bug bash',
          type: 'task',
          tags: [],
          scheduledAt: '2026-01-22T18:30:00.000Z',
          estimateMinutes: 60,
          status: 'planned',
          forceActual: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          scheduledProvider: null,
          scheduledProviderAccountId: null,
          scheduledProviderCalendarId: null,
          scheduledProviderEventId: null,
        } as any,
        start: new Date('2026-01-22T18:30:00.000Z'),
        end: new Date('2026-01-22T19:30:00.000Z'),
      },
    ];

    const res = reconcilePlanCalendarEvents({ externalEvents: external as any, kwiltBlocks });
    expect(res.externalEvents).toHaveLength(0);
    expect(res.matchedExternalEventKeys.has('google:a1:c1:official1')).toBe(true);
  });
});



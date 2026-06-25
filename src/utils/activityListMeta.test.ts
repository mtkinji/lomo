import type { Activity } from '../domain/types';
import { buildActivityListMeta, isDateToday } from './activityListMeta';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: null,
    title: 'Update attachment previews',
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
    ...overrides,
  } as Activity;
}

describe('activity list metadata', () => {
  it('formats date-only due dates as local calendar dates', () => {
    const { meta } = buildActivityListMeta({
      activity: activity({ scheduledDate: '2026-06-25' }),
      now: new Date(2026, 5, 20, 12),
    });

    expect(meta).toContain('Jun 25');
  });

  it('keeps estimated duration separate from due-date metadata', () => {
    const { meta, estimateMeta } = buildActivityListMeta({
      activity: activity({ scheduledDate: '2026-06-25', estimateMinutes: 90 }),
      now: new Date(2026, 5, 20, 12),
    });

    expect(meta).toBe('Jun 25');
    expect(estimateMeta).toBe('~90 min');
  });

  it('formats list estimates compactly to preserve row space', () => {
    expect(buildActivityListMeta({ activity: activity({ estimateMinutes: 45 }) }).estimateMeta).toBe('~45 min');
    expect(buildActivityListMeta({ activity: activity({ estimateMinutes: 60 }) }).estimateMeta).toBe('~1 hr');
    expect(buildActivityListMeta({ activity: activity({ estimateMinutes: 75 }) }).estimateMeta).toBe('~75 min');
    expect(buildActivityListMeta({ activity: activity({ estimateMinutes: 90 }) }).estimateMeta).toBe('~90 min');
    expect(buildActivityListMeta({ activity: activity({ estimateMinutes: 120 }) }).estimateMeta).toBe('~120 min');
    expect(buildActivityListMeta({ activity: activity({ estimateMinutes: 150 }) }).estimateMeta).toBe('~2.5 hr');
  });

  it('omits goal names, phases, repeat rules, and attachment indicators from list metadata', () => {
    const result = buildActivityListMeta({
      activity: activity({
        scheduledDate: '2026-06-25',
        phase: 'Define and prioritize',
        repeatRule: 'weekly',
        attachments: [{ id: 'att-1' }] as any,
      }),
      goalTitle: 'Family logistics',
      now: new Date(2026, 5, 20, 12),
    });

    expect(result.meta).toBe('Jun 25');
    expect(result.metaLeadingIconName).toBeUndefined();
    expect(result.metaLeadingIconNames).toBeUndefined();
  });

  it('uses decision timing labels for nearby due dates', () => {
    const now = new Date(2026, 5, 24, 12);

    expect(buildActivityListMeta({ activity: activity({ scheduledDate: '2026-06-23' }), now })).toMatchObject({
      meta: 'Past due',
      metaTone: 'urgent',
    });
    expect(buildActivityListMeta({ activity: activity({ scheduledDate: '2026-06-24' }), now })).toMatchObject({
      meta: 'Today',
      metaTone: 'today',
    });
    expect(buildActivityListMeta({ activity: activity({ scheduledDate: '2026-06-25' }), now })).toMatchObject({
      meta: 'Tomorrow',
      metaTone: 'tomorrow',
    });
  });

  it('omits exact reminder time from the decision timing signal', () => {
    const { meta } = buildActivityListMeta({
      activity: activity({
        scheduledDate: '2026-06-24',
        reminderAt: new Date(2026, 5, 24, 10).toISOString(),
      }),
      now: new Date(2026, 5, 24, 8),
    });

    expect(meta).toBe('Today');
  });

  it('checks date-only due dates against the local calendar day', () => {
    const now = new Date(2026, 5, 24, 12);

    expect(isDateToday('2026-06-24', now)).toBe(true);
    expect(isDateToday('2026-06-25', now)).toBe(false);
  });
});

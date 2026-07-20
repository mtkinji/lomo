import type { Activity, ActivityArea, Goal, UserProfile } from '../../domain/types';
import { proposeDailyPlan, proposeSlotsForActivity } from './planScheduling';

const TARGET_DATE = new Date('2026-06-22T12:00:00.000Z');

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: null,
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: null,
    title: 'Activity',
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
    estimateMinutes: 30,
    ...overrides,
  } as Activity;
}

function profile(): UserProfile {
  return {
    planAvailability: {
      days: {
        1: {
          enabled: true,
          windows: [{ start: '09:00', end: '12:00', mode: 'personal' }],
        },
      },
    },
  } as unknown as UserProfile;
}

describe('planScheduling', () => {
  it('recovers an unfinished activity after its scheduled block has passed', () => {
    const result = proposeDailyPlan({
      activities: [
        activity({
          id: 'stale-schedule',
          title: 'Still needs doing',
          scheduledAt: '2026-06-21T09:00:00.000Z',
          priority: 1,
        }),
      ],
      goals: [goal()],
      arcs: [],
      userProfile: profile(),
      targetDate: TARGET_DATE,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      maxItems: 1,
    });

    expect(result.proposals.map((proposal) => proposal.activityId)).toEqual(['stale-schedule']);
  });

  it('filters ineligible high-ranked activities before limiting the candidate pool', () => {
    const alreadyScheduled = Array.from({ length: 12 }, (_, index) =>
      activity({
        id: `scheduled-${index}`,
        title: `Already scheduled ${index}`,
        priority: 1,
        scheduledAt: '2099-06-22T09:00:00.000Z',
      }),
    );
    const result = proposeDailyPlan({
      activities: [
        ...alreadyScheduled,
        activity({ id: 'eligible-next', title: 'Eligible next', priority: 2 }),
      ],
      goals: [goal()],
      arcs: [],
      userProfile: profile(),
      targetDate: TARGET_DATE,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      maxItems: 1,
    });

    expect(result.proposals.map((proposal) => proposal.activityId)).toEqual(['eligible-next']);
  });

  it('keeps the highest-ranked activity visible even when it cannot fit', () => {
    const tooLong = Array.from({ length: 12 }, (_, index) =>
      activity({
        id: `too-long-${index}`,
        title: `Too long ${index}`,
        priority: 1,
        estimateMinutes: 600,
      }),
    );
    const result = proposeDailyPlan({
      activities: [
        ...tooLong,
        activity({ id: 'short-enough', title: 'Short enough', priority: 2, estimateMinutes: 30 }),
      ],
      goals: [goal()],
      arcs: [],
      userProfile: profile(),
      targetDate: TARGET_DATE,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      maxItems: 1,
    });

    expect(result.proposals).toEqual([]);
    expect(result.unplacedPriorityCandidates[0]).toEqual({
      activityId: 'too-long-0',
      reason: 'needs_larger_window',
      durationMinutes: 600,
      mode: 'personal',
      priorityPosition: 0,
    });
    expect(result.unplacedPriorityCandidates.map((candidate) => candidate.activityId)).toEqual(['too-long-0']);
  });

  it('preserves priority positions across timed and needs-time candidates', () => {
    const result = proposeDailyPlan({
      activities: [
        activity({ id: 'important-long', priority: 1, estimateMinutes: 600 }),
        activity({ id: 'next-short', priority: 2, estimateMinutes: 30 }),
      ],
      goals: [goal()],
      arcs: [],
      userProfile: profile(),
      targetDate: TARGET_DATE,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      maxItems: 2,
    });

    expect(result.unplacedPriorityCandidates[0]?.priorityPosition).toBe(0);
    expect(result.proposals[0]?.activityId).toBe('next-short');
    expect(result.proposals[0]?.priorityPosition).toBe(1);
  });

  it('never proposes skipped activities', () => {
    const result = proposeDailyPlan({
      activities: [activity({ id: 'skipped', status: 'skipped', priority: 1 })],
      goals: [goal()],
      arcs: [],
      userProfile: profile(),
      targetDate: TARGET_DATE,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      maxItems: 1,
    });

    expect(result.proposals).toEqual([]);
  });

  it('uses the shared priority state before proposing plan slots', () => {
    const result = proposeDailyPlan({
      activities: [
        activity({
          id: 'waiting-due',
          title: 'Waiting but due today',
          scheduledDate: '2026-06-22',
          priority: 1,
          priorityState: 'waiting',
        }),
        activity({
          id: 'active-next',
          title: 'Active next thing',
          priority: 2,
          priorityState: 'active',
        }),
      ],
      goals: [goal()],
      arcs: [],
      userProfile: profile(),
      targetDate: TARGET_DATE,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      maxItems: 2,
    });

    expect(result.proposals.map((proposal) => proposal.activityId)).toEqual(['active-next']);
    expect(result.unplacedDueActivityIds).toEqual([]);
  });

  it('uses an explicit Area before keyword scheduling inference', () => {
    const targetDate = new Date(2026, 5, 22, 12, 0, 0, 0);
    const areas: ActivityArea[] = [
      {
        id: 'area-work',
        label: 'Work',
        order: 0,
        scheduling: { fallbackMode: 'work' },
      },
    ];

    const proposals = proposeSlotsForActivity({
      activity: activity({
        id: 'area-backed',
        title: 'Buy groceries',
        areaId: 'area-work',
        estimateMinutes: 30,
      }),
      goals: [],
      userProfile: {
        preferences: {
          plan: {
            availability: {
              mon: {
                enabled: true,
                windows: {
                  work: [{ start: '09:00', end: '10:00' }],
                  personal: [{ start: '19:00', end: '20:00' }],
                },
              },
            },
          },
        },
      } as unknown as UserProfile,
      targetDate,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      activityAreas: areas,
      limit: 1,
    });

    expect(new Date(proposals[0]?.startDate).getHours()).toBe(9);
    expect(proposals[0]?.domain).toBe('work');
  });

  it('falls back to existing inference when no Area is set', () => {
    const targetDate = new Date(2026, 5, 22, 12, 0, 0, 0);

    const proposals = proposeSlotsForActivity({
      activity: activity({
        id: 'inferred',
        title: 'Prepare work presentation',
        estimateMinutes: 30,
      }),
      goals: [],
      userProfile: {
        preferences: {
          plan: {
            availability: {
              mon: {
                enabled: true,
                windows: {
                  work: [{ start: '09:00', end: '10:00' }],
                  personal: [{ start: '19:00', end: '20:00' }],
                },
              },
            },
          },
        },
      } as unknown as UserProfile,
      targetDate,
      busyIntervals: [],
      writeCalendarId: 'calendar-1',
      activityAreas: [],
      limit: 1,
    });

    expect(new Date(proposals[0]?.startDate).getHours()).toBe(9);
    expect(proposals[0]?.domain).toBe('work');
  });
});

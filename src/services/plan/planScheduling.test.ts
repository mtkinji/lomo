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

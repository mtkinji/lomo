import type { Activity, Arc, Goal } from '../domain/types';
import { normalizeDomainSnapshot } from './domainPersistence';

const NOW_ISO = '2026-06-25T12:00:00.000Z';

function arc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 'arc-1',
    name: 'Arc',
    status: 'active',
    startDate: NOW_ISO,
    endDate: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('domainPersistence', () => {
  it('normalizes insecure thumbnail URLs on loaded domain objects', () => {
    const result = normalizeDomainSnapshot(
      {
        arcs: [arc({ thumbnailUrl: 'http://example.com/arc.jpg' } as Partial<Arc>)],
        goals: [goal({ thumbnailUrl: 'http://example.com/goal.jpg' } as Partial<Goal>)],
        activities: [activity({ thumbnailUrl: 'http://example.com/activity.jpg' } as Partial<Activity>)],
      },
      NOW_ISO,
    );

    expect(result.arcs?.[0]?.thumbnailUrl).toBe('https://example.com/arc.jpg');
    expect(result.goals?.[0]?.thumbnailUrl).toBe('https://example.com/goal.jpg');
    expect(result.activities?.[0]?.thumbnailUrl).toBe('https://example.com/activity.jpg');
  });

  it('normalizes stored activities through the domain activity normalizer', () => {
    const result = normalizeDomainSnapshot(
      {
        activities: [
          activity({
            steps: [
              { title: 'No id yet' },
              { id: 'step-duplicate', title: 'First duplicate' },
              { id: 'step-duplicate', title: 'Second duplicate' },
            ] as Activity['steps'],
            updatedAt: '2026-06-01T12:00:00.000Z',
          }),
        ],
      },
      NOW_ISO,
    );

    const steps = result.activities?.[0]?.steps ?? [];
    expect(result.activities?.[0]?.updatedAt).toBe(NOW_ISO);
    expect(steps).toHaveLength(3);
    expect(new Set(steps.map((step) => step.id)).size).toBe(3);
    expect(steps[0]?.id).toMatch(/^step-act-1-0-/);
    expect(steps[1]?.id).toBe('step-duplicate');
    expect(steps[2]?.id).toMatch(/^step-act-1-2-/);
  });

  it('keeps tag history while ignoring malformed domain arrays', () => {
    const tagHistory = {
      home: {
        tag: 'home',
        firstUsedAt: NOW_ISO,
        lastUsedAt: NOW_ISO,
        totalUses: 1,
        recentUses: [],
      },
    };

    const result = normalizeDomainSnapshot({
      arcs: 'not-an-array',
      goals: null,
      activities: undefined,
      activityTagHistory: tagHistory,
    });

    expect(result).toEqual({ activityTagHistory: tagHistory });
  });
});

import { getSuggestedNextStep, hasAnyActivitiesScheduledForToday } from './nextStep';
import type { Activity, Goal } from '../../domain/types';

function goal(overrides: Partial<Goal> = {}): Goal {
  const nowIso = new Date('2026-01-01T12:00:00.000Z').toISOString();
  return {
    id: 'goal-1',
    arcId: null,
    title: 'Test goal',
    status: 'in_progress',
    startDate: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    metrics: [],
    forceIntent: {},
    ...overrides,
  } as Goal;
}

function activity(overrides: Partial<Activity> = {}): Activity {
  const nowIso = new Date('2026-01-01T12:00:00.000Z').toISOString();
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Test activity',
    status: 'planned',
    priority: 2,
    estimateMinutes: 30,
    createdAt: nowIso,
    updatedAt: nowIso,
    reminderAt: null,
    repeatRule: null,
    scheduledAt: null,
    scheduledDate: null,
    ...overrides,
  } as Activity;
}

describe('nextStep recommendations', () => {
  it('returns setup(no_goals) when user has no goals', () => {
    const now = new Date('2026-01-01T09:00:00.000');
    expect(
      getSuggestedNextStep({ arcs: [], goals: [], activities: [], now }),
    ).toEqual({ kind: 'setup', reason: 'no_goals' });
  });

  it('returns setup(no_activities) when goals exist but no activities', () => {
    const now = new Date('2026-01-01T09:00:00.000');
    expect(
      getSuggestedNextStep({ arcs: [], goals: [goal()], activities: [], now }),
    ).toEqual({ kind: 'setup', reason: 'no_activities' });
  });

  it('returns an activity suggestion, preferring scheduled-today items', () => {
    const now = new Date('2026-01-01T09:00:00.000');
    const a1 = activity({ id: 'a1', scheduledAt: null, scheduledDate: null, priority: 1 });
    const a2 = activity({ id: 'a2', scheduledAt: '2026-01-01T08:00:00.000', priority: 2 });

    const suggested = getSuggestedNextStep({
      arcs: [],
      goals: [goal({ id: 'goal-1' })],
      activities: [a1, a2],
      now,
    });

    expect(suggested).toEqual({ kind: 'activity', activityId: 'a2', goalId: 'goal-1' });
  });

  it('hasAnyActivitiesScheduledForToday ignores done/cancelled', () => {
    const now = new Date('2026-01-01T09:00:00.000');
    const doneToday = activity({ status: 'done', scheduledAt: '2026-01-01T08:00:00.000' });
    const plannedTomorrow = activity({ status: 'planned', scheduledAt: '2026-01-02T08:00:00.000' });

    expect(
      hasAnyActivitiesScheduledForToday({ activities: [doneToday, plannedTomorrow], now }),
    ).toBe(false);
  });
});



import { colors } from '../../theme';
import type { Activity, Goal } from '../../domain/types';
import { buildGoalProgressSignalSummaries } from './goalProgressSignals';

const baseNow = new Date('2026-07-03T12:00:00.000Z');

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Ship the thing',
    status: 'in_progress',
    forceIntent: {},
    metrics: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  } as Goal;
}

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: overrides.id ?? 'activity-1',
    goalId: 'goal-1',
    title: 'Step',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  } as Activity;
}

describe('buildGoalProgressSignalSummaries', () => {
  it('builds completion, momentum, target, and next scheduled signals', () => {
    const signals = buildGoalProgressSignalSummaries({
      goal: goal({ targetDate: '2026-07-10T12:00:00.000Z' }),
      goalActivities: [
        activity({ id: 'done-recent', status: 'done', completedAt: '2026-07-02T12:00:00.000Z' }),
        activity({ id: 'done-old', status: 'done', completedAt: '2026-06-01T12:00:00.000Z' }),
        activity({ id: 'next', scheduledDate: '2026-07-04' }),
      ],
      completedGoalActivities: [
        activity({ id: 'done-recent', status: 'done', completedAt: '2026-07-02T12:00:00.000Z' }),
        activity({ id: 'done-old', status: 'done', completedAt: '2026-06-01T12:00:00.000Z' }),
      ],
      now: baseNow,
    });

    expect(signals.map((signal) => [signal.id, signal.value, signal.label])).toEqual([
      ['goal-signal-plan', '2/3', 'Done'],
      ['goal-signal-momentum', '1', 'This week'],
      ['goal-signal-target', '7d left', 'Finish by'],
      ['goal-signal-next', 'Tomorrow', 'Next'],
    ]);
    expect(signals[1].valueColor).toBe(colors.indigo600);
    expect(signals[2].valueColor).toBe(colors.indigo600);
  });

  it('marks all-done goals and overdue target dates with the expected colors', () => {
    const done = activity({ id: 'done', status: 'done', completedAt: '2026-07-02T12:00:00.000Z' });
    const signals = buildGoalProgressSignalSummaries({
      goal: goal({ targetDate: '2026-07-01T12:00:00.000Z' }),
      goalActivities: [done],
      completedGoalActivities: [done],
      now: baseNow,
    });

    expect(signals[0]).toMatchObject({
      value: '1/1',
      valueColor: colors.indigo600,
    });
    expect(signals[2]).toMatchObject({
      value: '2d overdue',
      valueColor: colors.destructive,
    });
  });

  it('uses neutral target and momentum colors when there is no target date or recent completion', () => {
    const signals = buildGoalProgressSignalSummaries({
      goal: goal(),
      goalActivities: [activity({ id: 'planned' })],
      completedGoalActivities: [],
      now: baseNow,
    });

    expect(signals).toHaveLength(3);
    expect(signals[1]).toMatchObject({
      value: '0',
      valueColor: colors.gray600,
    });
    expect(signals[2]).toMatchObject({
      value: 'No date',
      valueColor: colors.gray600,
    });
  });
});

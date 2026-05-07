import { inferSchedulingDomain } from './inferSchedulingDomain';
import type { Activity, Goal } from '../../domain/types';

const FIXED_ISO = '2026-01-01T12:00:00.000Z';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: null,
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    reminderAt: null,
    ...overrides,
  } as Activity;
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    ...overrides,
  };
}

describe('inferSchedulingDomain', () => {
  it('returns the explicit schedulingDomain if already set', () => {
    expect(
      inferSchedulingDomain(
        activity({ schedulingDomain: 'work' }),
        [],
      ),
    ).toBe('work');
    expect(
      inferSchedulingDomain(
        activity({ schedulingDomain: 'personal' }),
        [],
      ),
    ).toBe('personal');
  });

  it('classifies as work when activity title contains a work keyword', () => {
    expect(
      inferSchedulingDomain(
        activity({ title: 'Sync with team about roadmap' }),
        [],
      ),
    ).toBe('work');
  });

  it('classifies as work when linked goal title contains a work keyword', () => {
    const linkedGoal = goal({ title: 'Q2 marketing planning' });
    expect(
      inferSchedulingDomain(
        activity({ title: 'Read up', goalId: linkedGoal.id }),
        [linkedGoal],
      ),
    ).toBe('work');
  });

  it('matches keywords case-insensitively', () => {
    expect(
      inferSchedulingDomain(
        activity({ title: 'STANDUP at noon' }),
        [],
      ),
    ).toBe('work');
  });

  it('falls back to personal when neither title nor goal contain work keywords', () => {
    expect(
      inferSchedulingDomain(
        activity({ title: 'Walk the dog' }),
        [],
      ),
    ).toBe('personal');
  });

  it('does not consider unrelated goals when goalId does not match', () => {
    const otherGoal = goal({ id: 'goal-other', title: 'Quarterly meeting' });
    expect(
      inferSchedulingDomain(
        activity({ title: 'Walk the dog', goalId: 'goal-1' }),
        [otherGoal],
      ),
    ).toBe('personal');
  });

  it('treats null/undefined goalId without throwing', () => {
    expect(
      inferSchedulingDomain(
        activity({ title: 'Walk the dog', goalId: null }),
        [goal()],
      ),
    ).toBe('personal');
  });
});

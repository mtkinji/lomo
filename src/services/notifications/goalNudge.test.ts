import {
  buildGoalNudgeContent,
  localDateKey,
  pickGoalNudgeCandidate,
} from './goalNudge';
import type { Activity, Arc, Goal } from '../../domain/types';

const FIXED_ISO = '2026-01-01T12:00:00.000Z';

function arc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 'arc-1',
    name: 'Arc 1',
    status: 'active',
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
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
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
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
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    reminderAt: null,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('localDateKey', () => {
  it('returns YYYY-MM-DD using local components', () => {
    expect(localDateKey(new Date(2026, 4, 9, 7, 30))).toBe('2026-05-09');
  });
});

describe('pickGoalNudgeCandidate', () => {
  const NOW = new Date(2026, 3, 15, 10, 0, 0);

  it('returns null when there are no active arcs', () => {
    const candidate = pickGoalNudgeCandidate({
      arcs: [arc({ status: 'paused' })],
      goals: [],
      activities: [],
      now: NOW,
    });
    expect(candidate).toBeNull();
  });

  it('returns null when there are no incomplete activities for active goals', () => {
    const candidate = pickGoalNudgeCandidate({
      arcs: [arc()],
      goals: [goal()],
      activities: [activity({ status: 'done' })],
      now: NOW,
    });
    expect(candidate).toBeNull();
  });

  it('skips goals on archived/paused arcs', () => {
    const candidate = pickGoalNudgeCandidate({
      arcs: [arc({ id: 'arc-paused', status: 'paused' })],
      goals: [goal({ arcId: 'arc-paused' })],
      activities: [activity({ goalId: 'goal-1' })],
      now: NOW,
    });
    expect(candidate).toBeNull();
  });

  it('prefers a goal with an activity scheduled for today', () => {
    const today = localDateKey(NOW);
    const candidate = pickGoalNudgeCandidate({
      arcs: [arc()],
      goals: [
        goal({ id: 'goal-1', title: 'Today goal' }),
        goal({ id: 'goal-2', title: 'Other goal' }),
      ],
      activities: [
        activity({ id: 'a1', goalId: 'goal-2' }),
        activity({ id: 'a2', goalId: 'goal-2' }),
        activity({ id: 'a3', goalId: 'goal-1', scheduledDate: today }),
      ],
      now: NOW,
    });
    expect(candidate?.goalId).toBe('goal-1');
    expect(candidate?.goalTitle).toBe('Today goal');
    expect(candidate?.arcName).toBe('Arc 1');
  });

  it('falls back to the goal with the most incomplete activities when none scheduled for today', () => {
    const candidate = pickGoalNudgeCandidate({
      arcs: [arc()],
      goals: [
        goal({ id: 'goal-1', title: 'Few' }),
        goal({ id: 'goal-2', title: 'Many' }),
      ],
      activities: [
        activity({ id: 'a1', goalId: 'goal-2' }),
        activity({ id: 'a2', goalId: 'goal-2' }),
        activity({ id: 'a3', goalId: 'goal-2' }),
        activity({ id: 'a4', goalId: 'goal-1' }),
      ],
      now: NOW,
    });
    expect(candidate?.goalId).toBe('goal-2');
  });

  it('uses scheduledAt to detect today when scheduledDate is missing', () => {
    const candidate = pickGoalNudgeCandidate({
      arcs: [arc()],
      goals: [goal()],
      activities: [
        activity({
          scheduledAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 14, 0).toISOString(),
        }),
      ],
      now: NOW,
    });
    expect(candidate?.goalId).toBe('goal-1');
  });
});

describe('buildGoalNudgeContent', () => {
  it('includes the goal title in the notification title', () => {
    const content = buildGoalNudgeContent({ goalTitle: 'Run 5K' });
    expect(content.title).toBe('Tiny step for: Run 5K');
  });

  it('mentions the arc name when provided', () => {
    const content = buildGoalNudgeContent({
      goalTitle: 'Run 5K',
      arcName: 'Health',
    });
    expect(content.body).toContain('Run 5K');
    expect(content.body).toContain('Health');
  });

  it('uses the generic body when no arc name is provided', () => {
    const content = buildGoalNudgeContent({ goalTitle: 'Run 5K' });
    expect(content.body).toMatch(/momentum/i);
  });

  it('treats whitespace-only arc names as missing', () => {
    const content = buildGoalNudgeContent({
      goalTitle: 'Run 5K',
      arcName: '   ',
    });
    expect(content.body).toMatch(/momentum/i);
  });
});

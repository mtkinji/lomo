import { normalizeActivity, normalizeActivitySteps } from './normalizeActivity';
import type { Activity, ActivityStep } from './types';

const FIXED_NOW = '2026-04-15T16:00:00.000Z';

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

describe('normalizeActivitySteps', () => {
  it('returns empty array and changed=false for missing steps', () => {
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps: undefined,
      nowIso: FIXED_NOW,
    });
    expect(result.steps).toEqual([]);
    expect(result.changed).toBe(false);
  });

  it('returns empty array and changed=true for non-array steps', () => {
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps: 'not-an-array' as unknown,
      nowIso: FIXED_NOW,
    });
    expect(result.steps).toEqual([]);
    expect(result.changed).toBe(true);
  });

  it('preserves step ids and titles when valid', () => {
    const steps: ActivityStep[] = [
      { id: 'step-a', title: 'First' },
      { id: 'step-b', title: 'Second' },
    ];
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps,
      nowIso: FIXED_NOW,
    });
    expect(result.changed).toBe(false);
    expect(result.steps[0]?.id).toBe('step-a');
    expect(result.steps[1]?.id).toBe('step-b');
  });

  it('generates ids for steps missing an id and flags changed=true', () => {
    const steps = [
      { title: 'No id' },
      { id: '', title: 'Empty id' },
    ];
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps,
      nowIso: FIXED_NOW,
    });
    expect(result.changed).toBe(true);
    result.steps.forEach((s) => {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
    });
    expect(result.steps[0]?.id).not.toEqual(result.steps[1]?.id);
  });

  it('rewrites duplicate ids to unique fallback ids', () => {
    const steps = [
      { id: 'dup', title: 'A' },
      { id: 'dup', title: 'B' },
    ];
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps,
      nowIso: FIXED_NOW,
    });
    expect(result.changed).toBe(true);
    const ids = result.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('coerces non-object step entries into step shape with changed=true', () => {
    const steps = ['raw step text', 42];
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps: steps as unknown,
      nowIso: FIXED_NOW,
    });
    expect(result.changed).toBe(true);
    expect(result.steps).toHaveLength(2);
    result.steps.forEach((step) => {
      expect(typeof step.id).toBe('string');
      expect(step.id.length).toBeGreaterThan(0);
    });
  });

  it('preserves optional metadata (linkedActivityId, isOptional, completedAt, orderIndex)', () => {
    const steps = [
      {
        id: 'step-a',
        title: 'A',
        linkedActivityId: 'linked-1',
        linkedAt: '2026-04-01T00:00:00.000Z',
        isOptional: true,
        completedAt: '2026-04-02T00:00:00.000Z',
        orderIndex: 3,
      },
    ];
    const result = normalizeActivitySteps({
      activityId: 'act-1',
      steps,
      nowIso: FIXED_NOW,
    });
    expect(result.steps[0]).toMatchObject({
      id: 'step-a',
      title: 'A',
      linkedActivityId: 'linked-1',
      linkedAt: '2026-04-01T00:00:00.000Z',
      isOptional: true,
      completedAt: '2026-04-02T00:00:00.000Z',
      orderIndex: 3,
    });
  });
});

describe('normalizeActivity', () => {
  it('returns the same activity instance when nothing changes', () => {
    const a = activity({
      steps: [
        { id: 'step-a', title: 'First' },
        { id: 'step-b', title: 'Second' },
      ],
    });
    const result = normalizeActivity({ activity: a, nowIso: FIXED_NOW });
    expect(result).toBe(a);
    expect(result.updatedAt).toBe(a.updatedAt);
  });

  it('returns a new activity with bumped updatedAt when steps change', () => {
    const a = activity({
      steps: [
        { id: 'dup', title: 'A' },
        { id: 'dup', title: 'B' },
      ],
    });
    const result = normalizeActivity({ activity: a, nowIso: FIXED_NOW });
    expect(result).not.toBe(a);
    expect(result.updatedAt).toBe(FIXED_NOW);
    const ids = (result.steps ?? []).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produces deterministic step ids based on activityId, index, and title', () => {
    const a = activity({
      id: 'act-known',
      steps: [
        { id: '', title: 'Stable' },
        { id: '', title: 'Stable' },
      ],
    });
    const b = activity({
      id: 'act-known',
      steps: [
        { id: '', title: 'Stable' },
        { id: '', title: 'Stable' },
      ],
    });
    const ra = normalizeActivity({ activity: a, nowIso: FIXED_NOW });
    const rb = normalizeActivity({ activity: b, nowIso: FIXED_NOW });
    expect(ra.steps?.map((s) => s.id)).toEqual(rb.steps?.map((s) => s.id));
  });
});

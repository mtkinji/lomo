import type { Activity } from '../../domain/types';
import {
  applyQuickAddAiEnrichment,
  consumeQuickAddAiActionCredits,
  inferQuickAddTriggerDefaults,
  resolveQuickAddLocationTriggerEnrichment,
} from './useQuickAddDockController';
import { toLocalDateKey } from '../../services/plan/planDates';

const baseActivity = (overrides: Partial<Activity> = {}): Activity =>
  ({
    id: 'activity-1',
    goalId: null,
    areaId: null,
    title: 'Draft the launch email',
    type: 'task',
    tags: [],
    notes: undefined,
    steps: [],
    reminderAt: null,
    priority: undefined,
    estimateMinutes: null,
    difficulty: undefined,
    creationSource: 'manual',
    planGroupId: null,
    scheduledDate: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    orderIndex: 0,
    phase: null,
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {},
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    ...overrides,
  }) as Activity;

const enrichment = {
  notes: 'Clarify the promise and send a concise draft.',
  tags: ['launch', 'email'],
  goalId: 'goal-2',
  areaId: 'area-work',
  type: 'checklist',
  reminderAt: '2026-05-14T16:00:00.000Z',
  scheduledDate: '2026-05-15',
  repeatRule: 'weekly',
  steps: [{ title: 'Outline the message' }, { title: 'Write the draft' }],
  estimateMinutes: 30,
  priority: 2,
  difficulty: 'medium',
};

describe('applyQuickAddAiEnrichment', () => {
  it('applies only the selected AI actions', () => {
    const result = applyQuickAddAiEnrichment(baseActivity(), enrichment, {
      activityId: 'activity-1',
      selectedActions: ['steps'],
      timestamp: '2026-05-13T12:00:00.000Z',
    });

    expect(result.steps).toEqual([
      {
        id: 'step-activity-1-0',
        title: 'Outline the message',
        orderIndex: 0,
        completedAt: null,
      },
      {
        id: 'step-activity-1-1',
        title: 'Write the draft',
        orderIndex: 1,
        completedAt: null,
      },
    ]);
    expect(result.notes).toBeUndefined();
    expect(result.tags).toEqual([]);
    expect(result.goalId).toBeNull();
    expect(result.areaId).toBeNull();
    expect(result.type).toBe('task');
    expect(result.estimateMinutes).toBeNull();
    expect(result.priority).toBeUndefined();
    expect(result.aiPlanning).toBeUndefined();
  });

  it('fills all details when Details is selected', () => {
    const result = applyQuickAddAiEnrichment(baseActivity(), enrichment, {
      activityId: 'activity-1',
      selectedActions: ['details'],
      timestamp: '2026-05-13T12:00:00.000Z',
    });

    expect(result.notes).toBe('Clarify the promise and send a concise draft.');
    expect(result.tags).toEqual(['launch', 'email']);
    expect(result.goalId).toBe('goal-2');
    expect(result.areaId).toBe('area-work');
    expect(result.type).toBe('checklist');
    expect(result.estimateMinutes).toBe(30);
    expect(result.difficulty).toBe('medium');
    expect(result.reminderAt).toBeNull();
    expect(result.scheduledDate).toBeNull();
    expect(result.repeatRule).toBeUndefined();
    expect(result.steps).toEqual([]);
    expect(result.priority).toBeUndefined();
  });

  it('applies trigger metadata only when Triggers is selected', () => {
    const result = applyQuickAddAiEnrichment(baseActivity(), enrichment, {
      activityId: 'activity-1',
      selectedActions: ['triggers'],
      timestamp: '2026-05-13T12:00:00.000Z',
    });

    expect(result.reminderAt).toBe('2026-05-14T16:00:00.000Z');
    expect(result.scheduledDate).toBe('2026-05-15');
    expect(result.repeatRule).toBe('weekly');
    expect(result.estimateMinutes).toBeNull();
    expect(result.priority).toBeUndefined();
    expect(result.aiPlanning).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.tags).toEqual([]);
    expect(result.areaId).toBeNull();
    expect(result.steps).toEqual([]);
  });

  it('fills missing trigger fields without inventing recurrence for one-off to-dos', () => {
    const result = applyQuickAddAiEnrichment(
      baseActivity({ title: 'Cancel the massage luxe membership' }),
      {
        location: {
          label: 'Current location',
          latitude: 40.7128,
          longitude: -74.006,
          trigger: 'leave',
          radiusM: 150,
        },
      },
      {
        activityId: 'activity-1',
        selectedActions: ['triggers'],
        timestamp: '2026-05-22T18:00:00.000Z',
      },
    );

    expect(result.reminderAt).toEqual(expect.any(String));
    expect(result.scheduledDate).toEqual(expect.any(String));
    expect(result.repeatRule).toBeUndefined();
    expect(toLocalDateKey(new Date(result.reminderAt!))).toBe(result.scheduledDate);
    expect(result.location).toEqual({
      label: 'Current location',
      latitude: 40.7128,
      longitude: -74.006,
      trigger: 'leave',
      radiusM: 150,
    });
  });

  it('respects an explicit AI no-repeat answer instead of falling back to weekly', () => {
    const result = applyQuickAddAiEnrichment(
      baseActivity({ title: 'Cancel the massage luxe membership' }),
      {
        reminderAt: '2026-05-23T16:00:00.000Z',
        scheduledDate: '2026-05-23',
        repeatRule: null,
      },
      {
        activityId: 'activity-1',
        selectedActions: ['triggers'],
        timestamp: '2026-05-22T18:00:00.000Z',
      },
    );

    expect(result.reminderAt).toBe('2026-05-23T16:00:00.000Z');
    expect(result.scheduledDate).toBe('2026-05-23');
    expect(result.repeatRule).toBeUndefined();
  });

  it('leaves the activity untouched when no AI actions are selected', () => {
    const activity = baseActivity();
    const result = applyQuickAddAiEnrichment(activity, enrichment, {
      activityId: 'activity-1',
      selectedActions: [],
      timestamp: '2026-05-13T12:00:00.000Z',
    });

    expect(result).toBe(activity);
  });

  it('does not overwrite user-entered fields', () => {
    const result = applyQuickAddAiEnrichment(
      baseActivity({
        notes: 'Already captured by the user.',
        tags: ['existing'],
        steps: [{ id: 'manual-step', title: 'Manual step', orderIndex: 0, completedAt: null }],
        goalId: 'goal-existing',
        areaId: 'area-personal',
        type: 'instructions',
        estimateMinutes: 45,
        priority: 1,
        difficulty: 'hard',
        reminderAt: '2026-05-14T09:00:00.000Z',
        scheduledDate: '2026-05-20',
        repeatRule: 'daily',
      }),
      enrichment,
      {
        activityId: 'activity-1',
        selectedActions: ['steps', 'triggers', 'details'],
        timestamp: '2026-05-13T12:00:00.000Z',
      },
    );

    expect(result.notes).toBe('Already captured by the user.');
    expect(result.tags).toEqual(['existing']);
    expect(result.steps).toEqual([
      { id: 'manual-step', title: 'Manual step', orderIndex: 0, completedAt: null },
    ]);
    expect(result.goalId).toBe('goal-existing');
    expect(result.areaId).toBe('area-personal');
    expect(result.type).toBe('instructions');
    expect(result.estimateMinutes).toBe(45);
    expect(result.priority).toBe(1);
    expect(result.difficulty).toBe('hard');
    expect(result.reminderAt).toBe('2026-05-14T09:00:00.000Z');
    expect(result.scheduledDate).toBe('2026-05-20');
    expect(result.repeatRule).toBe('daily');
    expect(result.aiPlanning).toBeUndefined();
  });
});

describe('resolveQuickAddLocationTriggerEnrichment', () => {
  const location = {
    label: 'This location',
    latitude: 40.7128,
    longitude: -74.006,
    trigger: 'leave' as const,
    radiusM: 150,
  };

  it('keeps an AI location trigger pending when location triggers are not enabled', () => {
    const result = resolveQuickAddLocationTriggerEnrichment({
      enrichment: { location, reminderAt: '2026-05-14T16:00:00.000Z' },
      locationTriggersEnabled: false,
    });

    expect(result.recommendation).toEqual(location);
    expect(result.enrichment.location).toBeUndefined();
    expect(result.enrichment.reminderAt).toBe('2026-05-14T16:00:00.000Z');
  });

  it('applies an AI location trigger when location triggers are already enabled', () => {
    const result = resolveQuickAddLocationTriggerEnrichment({
      enrichment: { location },
      locationTriggersEnabled: true,
    });

    expect(result.recommendation).toBeNull();
    expect(result.enrichment.location).toEqual(location);
  });

  it('does not invent a current-location trigger when location triggers are disabled', () => {
    const result = resolveQuickAddLocationTriggerEnrichment({
      enrichment: {},
      currentLocation: { latitude: 40.7128, longitude: -74.006 },
      locationTriggersEnabled: false,
    });

    expect(result.recommendation).toBeNull();
    expect(result.enrichment.location).toBeUndefined();
  });
});

describe('inferQuickAddTriggerDefaults', () => {
  it('uses tomorrow at roughly the same time without repeat as the generic trigger default', () => {
    const nowIso = new Date(2026, 4, 22, 18, 17).toISOString();
    const result = inferQuickAddTriggerDefaults(
      { title: 'Update the Orchard book writing system' },
      {},
      nowIso,
    );
    const reminder = new Date(result.reminderAt);

    expect(reminder.getHours()).toBe(18);
    expect(reminder.getMinutes()).toBe(15);
    expect(toLocalDateKey(reminder)).toBe(result.scheduledDate);
    expect(result.repeatRule).toBeUndefined();
  });

  it('infers weekly repetition from routine language without explicit cadence', () => {
    const result = inferQuickAddTriggerDefaults(
      { title: 'Review weekly planning routine' },
      {},
      '2026-05-22T18:00:00.000Z',
    );

    expect(result.repeatRule).toBe('weekly');
  });

  it('infers weekday repetition from weekday language', () => {
    const result = inferQuickAddTriggerDefaults(
      { title: 'Review submissions every weekday morning' },
      {},
      '2026-05-22T18:00:00.000Z',
    );

    expect(new Date(result.reminderAt).getHours()).toBe(9);
    expect(result.repeatRule).toBe('weekdays');
  });

  it('uses a near goal target date to increase urgency', () => {
    const now = new Date(2026, 4, 22, 18, 17);
    const result = inferQuickAddTriggerDefaults(
      { title: 'Update the launch plan' },
      {},
      now.toISOString(),
      { id: 'goal-1', targetDate: new Date(2026, 4, 24, 12, 0).toISOString(), priority: 1 },
    );

    expect(result.scheduledDate).toBe('2026-05-23');
    expect(result.repeatRule).toBe('daily');
  });

  it('pulls an overdue goal target to today', () => {
    const now = new Date(2026, 4, 22, 18, 17);
    const result = inferQuickAddTriggerDefaults(
      { title: 'Send a progress update' },
      {},
      now.toISOString(),
      { id: 'goal-1', targetDate: new Date(2026, 4, 20, 12, 0).toISOString(), priority: 2 },
    );
    const reminder = new Date(result.reminderAt);

    expect(result.scheduledDate).toBe('2026-05-22');
    expect(result.repeatRule).toBe('daily');
    expect(reminder.getTime()).toBeGreaterThan(now.getTime());
  });

  it('preserves valid AI trigger fields when present', () => {
    const result = inferQuickAddTriggerDefaults(
      { title: 'Call the school tomorrow afternoon' },
      {
        reminderAt: '2026-05-23T19:30:00.000Z',
        scheduledDate: '2026-05-23',
        repeatRule: 'monthly',
      },
      '2026-05-22T18:00:00.000Z',
    );

    expect(result.reminderAt).toBe('2026-05-23T19:30:00.000Z');
    expect(result.scheduledDate).toBe('2026-05-23');
    expect(result.repeatRule).toBe('monthly');
  });
});

describe('consumeQuickAddAiActionCredits', () => {
  it('consumes one credit per selected AI action', () => {
    const consume = jest.fn(() => ({ ok: true, remaining: 47, limit: 50 }));

    const ok = consumeQuickAddAiActionCredits(['steps', 'triggers', 'details', 'cover_image'], {
      tier: 'free',
      tryConsumeGenerativeCredit: consume,
    });

    expect(ok).toBe(true);
    expect(consume).toHaveBeenCalledWith({ tier: 'free', amount: 4 });
  });

  it('does not partially consume when the credit gate rejects the requested action count', () => {
    const consume = jest.fn(() => ({ ok: false, remaining: 2, limit: 50 }));

    const ok = consumeQuickAddAiActionCredits(['steps', 'triggers', 'details'], {
      tier: 'free',
      tryConsumeGenerativeCredit: consume,
    });

    expect(ok).toBe(false);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledWith({ tier: 'free', amount: 3 });
  });
});

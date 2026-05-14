import type { Activity } from '../../domain/types';
import { applyQuickAddAiEnrichment, consumeQuickAddAiActionCredits } from './useQuickAddDockController';

const baseActivity = (overrides: Partial<Activity> = {}): Activity =>
  ({
    id: 'activity-1',
    goalId: null,
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
    expect(result.steps).toEqual([]);
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

describe('consumeQuickAddAiActionCredits', () => {
  it('consumes one credit per selected AI action', () => {
    const consume = jest.fn(() => ({ ok: true, remaining: 47, limit: 50 }));

    const ok = consumeQuickAddAiActionCredits(['steps', 'triggers', 'details'], {
      tier: 'free',
      tryConsumeGenerativeCredit: consume,
    });

    expect(ok).toBe(true);
    expect(consume).toHaveBeenCalledWith({ tier: 'free', amount: 3 });
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

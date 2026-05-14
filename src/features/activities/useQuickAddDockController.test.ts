import type { Activity } from '../../domain/types';
import { applyQuickAddAiEnrichment } from './useQuickAddDockController';

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
    expect(result.estimateMinutes).toBeNull();
    expect(result.priority).toBeUndefined();
    expect(result.aiPlanning).toBeUndefined();
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
        estimateMinutes: 45,
        priority: 1,
      }),
      enrichment,
      {
        activityId: 'activity-1',
        selectedActions: ['details', 'steps', 'estimate'],
        timestamp: '2026-05-13T12:00:00.000Z',
      },
    );

    expect(result.notes).toBe('Already captured by the user.');
    expect(result.tags).toEqual(['existing']);
    expect(result.steps).toEqual([
      { id: 'manual-step', title: 'Manual step', orderIndex: 0, completedAt: null },
    ]);
    expect(result.estimateMinutes).toBe(45);
    expect(result.priority).toBe(1);
    expect(result.aiPlanning?.difficulty).toBe('medium');
  });
});

import type { Activity } from '../../domain/types';
import { activityFixture } from '../../test/storeFixtures';
import {
  applyPlanActivityCompletionAction,
  getPlanActivityCompletionAction,
} from './planActivityCompletion';

const baseActivity: Activity = activityFixture({
  id: 'activity-1',
  title: 'Test activity',
  goalId: null,
  steps: [],
  status: 'planned',
  completedAt: null,
});

const timestamp = '2026-07-09T18:00:00.000Z';

describe('planActivityCompletion', () => {
  it('marks a no-step activity complete from Plan', () => {
    expect(getPlanActivityCompletionAction(baseActivity).label).toBe('Mark complete');

    const next = applyPlanActivityCompletionAction(baseActivity, timestamp);

    expect(next.status).toBe('done');
    expect(next.completedAt).toBe(timestamp);
    expect(next.updatedAt).toBe(timestamp);
  });

  it('finishes unchecked steps before marking the activity done', () => {
    const activity: Activity = {
      ...baseActivity,
      steps: [
        { id: 'step-1', title: 'One', completedAt: '2026-07-09T17:00:00.000Z' },
        { id: 'step-2', title: 'Two', completedAt: null },
      ],
    };

    expect(getPlanActivityCompletionAction(activity)).toMatchObject({
      label: 'Finish remaining',
      meta: '1/2 steps checked',
    });

    const next = applyPlanActivityCompletionAction(activity, timestamp);

    expect(next.steps?.map((step) => step.completedAt)).toEqual([
      '2026-07-09T17:00:00.000Z',
      timestamp,
    ]);
    expect(next.status).toBe('done');
    expect(next.completedAt).toBe(timestamp);
  });

  it('marks the activity complete when all steps are already checked', () => {
    const activity: Activity = {
      ...baseActivity,
      status: 'in_progress',
      steps: [{ id: 'step-1', title: 'One', completedAt: '2026-07-09T17:00:00.000Z' }],
    };

    expect(getPlanActivityCompletionAction(activity)).toMatchObject({
      label: 'Mark complete',
      meta: '1/1 steps checked',
    });

    const next = applyPlanActivityCompletionAction(activity, timestamp);

    expect(next.status).toBe('done');
    expect(next.completedAt).toBe(timestamp);
    expect(next.steps?.[0]?.completedAt).toBe('2026-07-09T17:00:00.000Z');
  });

  it('undoes activity completion without clearing checked steps', () => {
    const activity: Activity = {
      ...baseActivity,
      status: 'done',
      completedAt: '2026-07-09T17:30:00.000Z',
      steps: [{ id: 'step-1', title: 'One', completedAt: '2026-07-09T17:00:00.000Z' }],
    };

    expect(getPlanActivityCompletionAction(activity)).toMatchObject({
      label: 'Undo completion',
      meta: '1/1 steps checked',
    });

    const next = applyPlanActivityCompletionAction(activity, timestamp);

    expect(next.status).toBe('in_progress');
    expect(next.completedAt).toBeNull();
    expect(next.steps?.[0]?.completedAt).toBe('2026-07-09T17:00:00.000Z');
  });
});

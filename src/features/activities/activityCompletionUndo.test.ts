import type { Activity } from '../../domain/types';
import {
  buildActivityCompletionUndoSnapshot,
  restoreActivityCompletionFromSnapshot,
} from './activityCompletionUndo';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    title: 'Call the dentist',
    status: 'planned',
    completedAt: null,
    createdAt: '2026-07-10T15:00:00.000Z',
    updatedAt: '2026-07-10T15:00:00.000Z',
    ...overrides,
  } as Activity;
}

describe('activity completion Undo', () => {
  it('captures the completion fields that should be restored', () => {
    const activity = makeActivity({
      status: 'in_progress',
      completedAt: '2026-07-09T15:00:00.000Z',
    });

    expect(buildActivityCompletionUndoSnapshot(activity)).toEqual({
      status: 'in_progress',
      completedAt: '2026-07-09T15:00:00.000Z',
      stepCompletedAtById: {},
    });
  });

  it('restores the prior completion state while preserving unrelated later edits', () => {
    const completionStamp = '2026-07-10T16:00:00.000Z';
    const snapshot = buildActivityCompletionUndoSnapshot(
      makeActivity({ status: 'in_progress', completedAt: null }),
    );
    const completed = makeActivity({
      title: 'Call the dentist and pharmacy',
      status: 'done',
      completedAt: completionStamp,
      updatedAt: '2026-07-10T16:01:00.000Z',
    });

    const result = restoreActivityCompletionFromSnapshot({
      activity: completed,
      snapshot,
      representedCompletedAt: completionStamp,
      restoredAt: '2026-07-10T16:02:00.000Z',
    });

    expect(result.didRestore).toBe(true);
    expect(result.activity).toMatchObject({
      title: 'Call the dentist and pharmacy',
      status: 'in_progress',
      completedAt: null,
      updatedAt: '2026-07-10T16:02:00.000Z',
    });
  });

  it('refuses to overwrite a later completion', () => {
    const snapshot = buildActivityCompletionUndoSnapshot(makeActivity());
    const recompleted = makeActivity({
      status: 'done',
      completedAt: '2026-07-10T17:00:00.000Z',
    });

    const result = restoreActivityCompletionFromSnapshot({
      activity: recompleted,
      snapshot,
      representedCompletedAt: '2026-07-10T16:00:00.000Z',
      restoredAt: '2026-07-10T17:01:00.000Z',
    });

    expect(result).toEqual({ activity: recompleted, didRestore: false });
  });

  it('restores only step checkmarks created by the represented completion', () => {
    const completionStamp = '2026-07-10T16:00:00.000Z';
    const snapshot = buildActivityCompletionUndoSnapshot(
      makeActivity({
        status: 'in_progress',
        steps: [
          { id: 'step-1', title: 'Already done', completedAt: '2026-07-09T12:00:00.000Z' },
          { id: 'step-2', title: 'Finish me', completedAt: null },
          { id: 'step-3', title: 'Changed later', completedAt: null },
        ],
      }),
    );
    const completed = makeActivity({
      status: 'done',
      completedAt: completionStamp,
      steps: [
        { id: 'step-1', title: 'Already done', completedAt: '2026-07-09T12:00:00.000Z' },
        { id: 'step-2', title: 'Finish me', completedAt: completionStamp },
        { id: 'step-3', title: 'Changed later', completedAt: '2026-07-10T16:01:00.000Z' },
      ],
    });

    const result = restoreActivityCompletionFromSnapshot({
      activity: completed,
      snapshot,
      representedCompletedAt: completionStamp,
      restoredAt: '2026-07-10T16:02:00.000Z',
    });

    expect(result.activity.steps?.map((step) => step.completedAt)).toEqual([
      '2026-07-09T12:00:00.000Z',
      null,
      '2026-07-10T16:01:00.000Z',
    ]);
  });

  it('does nothing when the activity is no longer complete', () => {
    const snapshot = buildActivityCompletionUndoSnapshot(makeActivity());
    const alreadyUndone = makeActivity({ status: 'planned', completedAt: null });

    const result = restoreActivityCompletionFromSnapshot({
      activity: alreadyUndone,
      snapshot,
      representedCompletedAt: '2026-07-10T16:00:00.000Z',
      restoredAt: '2026-07-10T16:01:00.000Z',
    });

    expect(result).toEqual({ activity: alreadyUndone, didRestore: false });
  });
});

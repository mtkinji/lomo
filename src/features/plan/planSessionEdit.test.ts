import {
  createPlanSessionEdit,
  formatPlanSessionDuration,
  getPlanSessionEditConflict,
  isPlanSessionEditDirty,
  updatePlanSessionEditDraft,
} from './planSessionEdit';

const start = new Date(2026, 7, 11, 13, 0);
const end = new Date(2026, 7, 11, 17, 0);

describe('planSessionEdit', () => {
  it('creates an edit that preserves the original session', () => {
    const edit = createPlanSessionEdit({
      activityId: 'activity-1',
      sessionId: 'session-1',
      start,
      end,
    });

    expect(edit.original).toEqual({ start, end });
    expect(edit.draft).toEqual({ start, end });
    expect(isPlanSessionEditDirty(edit)).toBe(false);
  });

  it('marks changed start or end values dirty without mutating the original', () => {
    const original = createPlanSessionEdit({
      activityId: 'activity-1',
      sessionId: 'session-1',
      start,
      end,
    });
    const movedStart = new Date(2026, 7, 11, 13, 30);
    const movedEnd = new Date(2026, 7, 11, 16, 45);

    const edit = updatePlanSessionEditDraft(original, {
      start: movedStart,
      end: movedEnd,
    });

    expect(edit.original).toEqual({ start, end });
    expect(edit.draft).toEqual({ start: movedStart, end: movedEnd });
    expect(isPlanSessionEditDirty(edit)).toBe(true);
  });

  it('ignores the original calendar interval but detects another overlap', () => {
    const edit = updatePlanSessionEditDraft(
      createPlanSessionEdit({
        activityId: 'activity-1',
        sessionId: 'session-1',
        start,
        end,
      }),
      {
        start: new Date(2026, 7, 11, 14, 0),
        end: new Date(2026, 7, 11, 15, 0),
      },
    );

    expect(getPlanSessionEditConflict({
      edit,
      busyIntervals: [{ start, end }],
    })).toBe(false);

    expect(getPlanSessionEditConflict({
      edit,
      busyIntervals: [
        { start, end },
        {
          start: new Date(2026, 7, 11, 14, 30),
          end: new Date(2026, 7, 11, 15, 30),
        },
      ],
    })).toBe(true);
  });

  it('formats compact durations for the drawer receipt', () => {
    expect(formatPlanSessionDuration(start, end)).toBe('4 hrs');
    expect(formatPlanSessionDuration(start, new Date(2026, 7, 11, 14, 0))).toBe('1 hr');
    expect(formatPlanSessionDuration(start, new Date(2026, 7, 11, 14, 15))).toBe('1 hr 15 min');
    expect(formatPlanSessionDuration(start, new Date(2026, 7, 11, 13, 30))).toBe('30 min');
  });
});

import { spacing } from '../../theme/spacing';
import {
  ACTIVITY_LIST_BASE_ROW_GAP,
  ACTIVITY_LIST_TOP_PRIORITY_BREAK_GAP,
  ACTIVITY_LIST_TOP_PRIORITY_BAND_LAST_LABEL,
  getActivityListRowGap,
  getActivityListRowOuterGap,
} from './activityListSpacing';

describe('activity list spacing', () => {
  it('uses the normal dense row gap for ordinary rows', () => {
    expect(
      getActivityListRowGap({
        isPrioritySort: true,
        priorityIndicator: { label: '#2' },
        hasNextItem: true,
      }),
    ).toBe(spacing.xs / 2);
    expect(ACTIVITY_LIST_BASE_ROW_GAP).toBe(spacing.xs / 2);
  });

  it('keeps the row gap inside the gray band compact', () => {
    expect(
      getActivityListRowGap({
        isPrioritySort: true,
        priorityIndicator: { label: '#3' },
        hasNextItem: true,
      }),
    ).toBe(spacing.xs / 2);
  });

  it('adds outside whitespace after the third priority row in Priority sort', () => {
    expect(
      getActivityListRowOuterGap({
        isPrioritySort: true,
        priorityIndicator: { label: '#3' },
        hasNextItem: true,
      }),
    ).toBe(spacing.sm);
    expect(ACTIVITY_LIST_TOP_PRIORITY_BREAK_GAP).toBe(spacing.sm);
    expect(ACTIVITY_LIST_TOP_PRIORITY_BAND_LAST_LABEL).toBe('#3');
  });

  it('keeps the base gap after the third row outside Priority sort', () => {
    expect(
      getActivityListRowOuterGap({
        isPrioritySort: false,
        priorityIndicator: { label: '#3' },
        hasNextItem: true,
      }),
    ).toBe(0);
  });

  it('skips outside whitespace when the third priority row is the final row', () => {
    expect(
      getActivityListRowOuterGap({
        isPrioritySort: true,
        priorityIndicator: { label: '#3' },
        hasNextItem: false,
      }),
    ).toBe(0);
  });
});

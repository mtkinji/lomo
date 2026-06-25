import { spacing } from '../../theme/spacing';
import type { ActivityPriorityIndicator } from '../../ui/ActivityListItem';

export const ACTIVITY_LIST_BASE_ROW_GAP = spacing.xs / 2;
export const ACTIVITY_LIST_TOP_PRIORITY_BREAK_GAP = spacing.sm;
export const ACTIVITY_LIST_TOP_PRIORITY_BAND_LAST_LABEL = '#3';

export function getActivityListRowGap(params: {
  isPrioritySort: boolean;
  priorityIndicator?: Pick<ActivityPriorityIndicator, 'label'> | null;
  hasNextItem: boolean;
}): number {
  return ACTIVITY_LIST_BASE_ROW_GAP;
}

export function getActivityListRowOuterGap(params: {
  isPrioritySort: boolean;
  priorityIndicator?: Pick<ActivityPriorityIndicator, 'label'> | null;
  hasNextItem: boolean;
}): number {
  if (
    params.isPrioritySort &&
    params.hasNextItem &&
    params.priorityIndicator?.label === ACTIVITY_LIST_TOP_PRIORITY_BAND_LAST_LABEL
  ) {
    return ACTIVITY_LIST_TOP_PRIORITY_BREAK_GAP;
  }

  return 0;
}

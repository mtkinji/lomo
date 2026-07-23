import React from 'react';
import { View } from 'react-native';
import type { Activity } from '../../domain/types';
import {
  ActivityListItem,
  type ActivityPriorityIndicator,
} from '../../ui/ActivityListItem';
import type { ActivityMetaTone } from '../../utils/activityListMeta';
import { colors } from '../../theme/colors';
import { styles } from './activitiesScreenStyles';

type ActivityInventoryRowProps = {
  activity: Activity;
  meta?: string;
  estimateMeta?: string;
  metaTone?: ActivityMetaTone;
  priorityIndicator?: ActivityPriorityIndicator;
  metaLoading: boolean;
  isDueToday: boolean;
  rowGap: number;
  rowOuterGap: number;
  isDragging: boolean;
  isGhost: boolean;
  onToggleComplete: (activityId: string) => void;
  onTogglePriority: (activityId: string) => void;
  onStartFocus: (activityId: string) => void;
  onSchedule: (activityId: string) => void;
  onPressActivity: (activityId: string) => void;
  onDeleteActivity: (activity: Activity) => void;
};

function getTopPriorityBandRowStyle(indicator?: ActivityPriorityIndicator) {
  if (indicator?.label !== '#1' && indicator?.label !== '#2' && indicator?.label !== '#3') {
    return null;
  }

  return [
    styles.topPriorityBandRow,
    indicator.label === '#1' ? styles.topPriorityBandFirstRow : null,
    indicator.label === '#3' ? styles.topPriorityBandLastRow : null,
  ];
}

export const ActivityInventoryRow = React.memo(function ActivityInventoryRow({
  activity,
  meta,
  estimateMeta,
  metaTone,
  priorityIndicator,
  metaLoading,
  isDueToday,
  rowGap,
  rowOuterGap,
  isDragging,
  isGhost,
  onToggleComplete,
  onTogglePriority,
  onStartFocus,
  onSchedule,
  onPressActivity,
  onDeleteActivity,
}: ActivityInventoryRowProps) {
  return (
    <View
      style={[
        { paddingBottom: rowGap },
        rowOuterGap > 0 ? { marginBottom: rowOuterGap } : null,
        getTopPriorityBandRowStyle(priorityIndicator),
        isDragging
          ? {
              opacity: 0.9,
              shadowColor: colors.textPrimary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            }
          : null,
      ]}
    >
      <ActivityListItem
        title={activity.title}
        meta={meta}
        estimateMeta={estimateMeta}
        metaTone={metaTone}
        priorityIndicator={priorityIndicator}
        metaLoading={metaLoading}
        isCompleted={activity.status === 'done'}
        onToggleComplete={isDragging ? undefined : () => onToggleComplete(activity.id)}
        isPriorityOne={activity.priority === 1}
        onTogglePriority={isDragging ? undefined : () => onTogglePriority(activity.id)}
        onStartFocus={isDragging ? undefined : () => onStartFocus(activity.id)}
        onSchedule={isDragging ? undefined : () => onSchedule(activity.id)}
        onPress={isDragging ? undefined : () => onPressActivity(activity.id)}
        onDelete={isDragging ? undefined : () => onDeleteActivity(activity)}
        isDueToday={isDueToday}
        isGhost={isGhost}
      />
    </View>
  );
});

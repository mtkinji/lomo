import React from 'react';
import { Platform, Pressable, UIManager, View } from 'react-native';
import { VStack, HStack, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import { QueryService } from '../../services/QueryService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './activitiesScreenStyles';
import type { Activity, ActivityView, FilterGroup } from '../../domain/types';

export type CompletedActivitySectionProps = {
  activities: Activity[];
  goalTitleById: Record<string, string>;
  onToggleComplete: (activityId: string) => void;
  onTogglePriority: (activityId: string) => void;
  onPressActivity: (activityId: string) => void;
  isMetaLoading?: (activityId: string) => boolean;
  /** Set of activity IDs created during this session (for ghost detection) */
  sessionCreatedIds: Set<string>;
  /** Current filter groups applied to the view */
  filterGroups: FilterGroup[];
  /** The active view (used for filterGroupLogic) */
  activeView: ActivityView | undefined;
};

export function CompletedActivitySection({
  activities,
  goalTitleById,
  onToggleComplete,
  onTogglePriority,
  onPressActivity,
  isMetaLoading,
  sessionCreatedIds,
  filterGroups,
  activeView,
}: CompletedActivitySectionProps) {
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  return (
    <VStack space="xs" style={styles.completedSection}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={styles.completedToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide completed activities' : 'Show completed activities'}
      >
        <HStack alignItems="center" space="xs">
          <Text style={styles.completedToggleLabel}>Completed</Text>
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.completedCountLabel}>({activities.length})</Text>
        </HStack>
      </Pressable>

      {expanded && (
        <VStack space="xs">
          {activities.map((activity, idx) => {
            const goalTitle = activity.goalId ? goalTitleById[activity.goalId] : undefined;
            const { meta, metaLeadingIconName, metaLeadingIconNames, isDueToday } = buildActivityListMeta({ activity, goalTitle });
            const metaLoading = Boolean(isMetaLoading?.(activity.id)) && !meta;

            return (
              <View
                key={activity.id}
                style={idx === activities.length - 1 ? undefined : { marginBottom: spacing.xs / 2 }}
              >
                <ActivityListItem
                  title={activity.title}
                  meta={meta}
                  metaLeadingIconName={metaLeadingIconName}
                  metaLeadingIconNames={metaLeadingIconNames}
                  metaLoading={metaLoading}
                  isCompleted={activity.status === 'done'}
                  onToggleComplete={() => onToggleComplete(activity.id)}
                  isPriorityOne={activity.priority === 1}
                  onTogglePriority={() => onTogglePriority(activity.id)}
                  onPress={() => onPressActivity(activity.id)}
                  isDueToday={isDueToday}
                  isGhost={
                    sessionCreatedIds.has(activity.id) &&
                    QueryService.applyActivityFilters(
                      [activity],
                      filterGroups,
                      activeView?.filterGroupLogic ?? 'or',
                    ).length === 0
                  }
                />
              </View>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}


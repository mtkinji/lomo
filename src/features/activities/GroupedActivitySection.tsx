import React from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  UIManager,
  View,
} from 'react-native';
import { HStack, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import { QueryService } from '../../services/QueryService';
import { colors } from '../../theme/colors';
import { styles } from './activitiesScreenStyles';
import type { Activity, ActivityView, FilterGroup } from '../../domain/types';

export type GroupedActivitySectionProps = {
  groupKey: string;
  label: string;
  activities: Activity[];
  collapsed: boolean;
  goalTitleById: Record<string, string>;
  onToggleCollapsed: (groupKey: string, collapsed: boolean) => void;
  onToggleComplete: (activityId: string) => void;
  onTogglePriority: (activityId: string) => void;
  onStartFocus?: (activityId: string) => void;
  onSchedule?: (activityId: string) => void;
  onPressActivity: (activityId: string) => void;
  onDeleteActivity?: (activity: Activity) => void;
  isMetaLoading?: (activityId: string) => boolean;
  sessionCreatedIds: Set<string>;
  filterGroups: FilterGroup[];
  activeView: ActivityView | undefined;
};

export function GroupedActivitySection({
  groupKey,
  label,
  activities,
  collapsed,
  onToggleCollapsed,
  onToggleComplete,
  onTogglePriority,
  onStartFocus,
  onSchedule,
  onPressActivity,
  onDeleteActivity,
  isMetaLoading,
  sessionCreatedIds,
  filterGroups,
  activeView,
}: GroupedActivitySectionProps) {
  const rotation = React.useRef(new Animated.Value(collapsed ? 0 : 1)).current;

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  React.useEffect(() => {
    Animated.timing(rotation, {
      toValue: collapsed ? 0 : 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [collapsed, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleCollapsed(groupKey, !collapsed);
  };

  return (
    <VStack space="xs" style={styles.groupedSection}>
      <Pressable
        onPress={handleToggle}
        style={styles.groupedSectionHeader}
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} ${label} group`}
        accessibilityState={{ expanded: !collapsed }}
      >
        <HStack alignItems="center" space="xs">
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="chevronRight" size={14} color={colors.textSecondary} />
          </Animated.View>
          <Text style={styles.groupedSectionLabel}>{label}</Text>
          <Text style={styles.groupedSectionCount}>({activities.length})</Text>
        </HStack>
      </Pressable>

      {!collapsed ? (
        <View>
          {activities.map((activity, idx) => {
            const { meta, metaTone, estimateMeta, isDueToday } =
              buildActivityListMeta({ activity });
            const metaLoading = Boolean(isMetaLoading?.(activity.id)) && !meta;

            return (
              <View key={activity.id}>
                <ActivityListItem
                  title={activity.title}
                  meta={meta}
                  estimateMeta={estimateMeta}
                  metaTone={metaTone}
                  metaLoading={metaLoading}
                  isCompleted={activity.status === 'done'}
                  onToggleComplete={() => onToggleComplete(activity.id)}
                  isPriorityOne={activity.priority === 1}
                  onTogglePriority={() => onTogglePriority(activity.id)}
                  onStartFocus={onStartFocus ? () => onStartFocus(activity.id) : undefined}
                  onSchedule={onSchedule ? () => onSchedule(activity.id) : undefined}
                  onPress={() => onPressActivity(activity.id)}
                  onDelete={onDeleteActivity ? () => onDeleteActivity(activity) : undefined}
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
                {idx < activities.length - 1 ? <View style={styles.activityItemSeparator} /> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </VStack>
  );
}

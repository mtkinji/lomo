import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Activity } from '../../domain/types';
import { ActivityListItem, type ActivityPriorityIndicator } from '../../ui/ActivityListItem';
import { HStack, Text } from '../../ui/primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import type { RankedActivity } from './activityPriority';

type Props = {
  recommendations: RankedActivity[];
  goalTitleById: Record<string, string>;
  isMetaLoading: (activityId: string) => boolean;
  onPressActivity: (activityId: string) => void;
  onToggleComplete: (activityId: string) => void;
  onTogglePriority: (activityId: string) => void;
  onStartFocus?: (activityId: string) => void;
  onSchedule?: (activityId: string) => void;
  onDeleteActivity?: (activity: Activity) => void;
  priorityIndicatorByActivityId?: Map<string, ActivityPriorityIndicator>;
};

export function RecommendedActivitiesSection({
  recommendations,
  isMetaLoading,
  onPressActivity,
  onToggleComplete,
  onTogglePriority,
  onStartFocus,
  onSchedule,
  onDeleteActivity,
  priorityIndicatorByActivityId,
}: Props) {
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.container} testID="activities.recommendedSection">
      <HStack alignItems="center" space="xs" style={styles.header}>
        <Text style={styles.title}>RECOMMENDED</Text>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Why these to-dos are recommended"
              hitSlop={8}
              style={({ pressed }) => [styles.infoButton, pressed ? styles.infoButtonPressed : null]}
            >
              <Icon name="info" size={13} color={colors.formLabel} />
            </Pressable>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" sideOffset={6} align="start" style={styles.infoPopover}>
            <Text style={styles.infoTitle}>Why these?</Text>
            <Text style={styles.infoBody}>
              Kwilt picks up to three active to-dos that look ready or important based on signals like
              dates, reminders, starred items, goal priority, and recent activity.
            </Text>
          </DropdownMenuContent>
        </DropdownMenu>
      </HStack>
      <View>
        {recommendations.map(({ activity }) => {
          const { meta, metaTone, estimateMeta, isDueToday } = buildActivityListMeta({
            activity,
          });

          return (
            <View key={activity.id} style={styles.itemWrapper}>
              <ActivityListItem
                title={activity.title}
                meta={meta}
                estimateMeta={estimateMeta}
                metaTone={metaTone}
                priorityIndicator={priorityIndicatorByActivityId?.get(activity.id)}
                metaLoading={isMetaLoading(activity.id)}
                isCompleted={activity.status === 'done'}
                onToggleComplete={() => onToggleComplete(activity.id)}
                isPriorityOne={activity.priority === 1}
                onTogglePriority={() => onTogglePriority(activity.id)}
                onStartFocus={onStartFocus ? () => onStartFocus(activity.id) : undefined}
                onSchedule={onSchedule ? () => onSchedule(activity.id) : undefined}
                onPress={() => onPressActivity(activity.id)}
                onDelete={onDeleteActivity ? () => onDeleteActivity(activity) : undefined}
                isDueToday={isDueToday}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    color: colors.formLabel,
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonPressed: {
    opacity: 0.65,
  },
  infoPopover: {
    width: 284,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  itemWrapper: {
    paddingBottom: spacing.xs / 2,
  },
});

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { VStack, HStack, Text } from '../../ui/primitives';
import { Icon, type IconName } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import type { Activity } from '../../domain/types';

export type KanbanCardField = 'goal' | 'steps' | 'attachments' | 'dueDate' | 'priority' | 'estimate';

export type KanbanCardProps = {
  activity: Activity;
  /**
   * Goal title for display in metadata.
   */
  goalTitle?: string;
  /**
   * Which fields should be visible on the card.
   * Color should only appear when its corresponding field is visible (e.g. goal chip).
   */
  visibleFields?: ReadonlySet<KanbanCardField>;
  /**
   * Handler for toggling completion.
   */
  onToggleComplete?: () => void;
  /**
   * Handler for tapping the card.
   */
  onPress?: () => void;
  /**
   * Whether card is in loading/enriching state.
   */
  isLoading?: boolean;
};

/**
 * Whether the card is due today.
 */

export function KanbanCard({
  activity,
  goalTitle,
  visibleFields,
  onToggleComplete,
  onPress,
  isLoading = false,
}: KanbanCardProps) {
  const isCompleted = activity.status === 'done';
  const hasAttachments = (activity.attachments?.length ?? 0) > 0;
  const hasSteps = (activity.steps?.length ?? 0) > 0;
  const completedSteps = activity.steps?.filter((s) => s.completedAt).length ?? 0;
  const totalSteps = activity.steps?.length ?? 0;

  const isFieldVisible = React.useCallback(
    (field: KanbanCardField) => (visibleFields ? visibleFields.has(field) : true),
    [visibleFields],
  );

  return (
    <View style={styles.cardWrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardInner, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={activity.title}
      >
        <VStack space="xs" style={styles.cardContent}>
          {/* Goal badge */}
          {goalTitle && isFieldVisible('goal') && (
            <View style={styles.goalPill}>
              <HStack alignItems="center" space="xs">
                <Icon name="goals" size={12} color={colors.textSecondary} />
                <Text style={styles.goalPillText} numberOfLines={1}>
                  {goalTitle}
                </Text>
              </HStack>
            </View>
          )}

        {/* Title row with checkbox */}
        <HStack alignItems="flex-start" space="sm">
          {onToggleComplete && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleComplete();
              }}
              hitSlop={8}
              style={styles.checkboxHitArea}
            >
              <View
                style={[
                  styles.checkbox,
                  isCompleted && styles.checkboxCompleted,
                ]}
              >
                {isCompleted && (
                  <Icon name="check" size={12} color={colors.canvas} />
                )}
              </View>
            </Pressable>
          )}
          <Text
            style={[
              styles.title,
              isCompleted && styles.titleCompleted,
            ]}
            numberOfLines={3}
          >
            {activity.title}
          </Text>
        </HStack>

        {/* Metadata row */}
        <HStack
          alignItems="center"
          justifyContent="space-between"
          style={styles.metaRow}
        >
          <HStack alignItems="center" space="sm">
            {/* Steps progress */}
            {isFieldVisible('steps') && hasSteps && (
              <HStack alignItems="center" space={4}>
                <Icon name="checklist" size={12} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {completedSteps}/{totalSteps}
                </Text>
              </HStack>
            )}

            {/* Attachments */}
            {isFieldVisible('attachments') && hasAttachments && (
              <HStack alignItems="center" space={4}>
                <Icon name="paperclip" size={12} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {activity.attachments?.length}
                </Text>
              </HStack>
            )}

            {/* Due date indicator */}
            {isFieldVisible('dueDate') && activity.scheduledDate && (
              <HStack alignItems="center" space={4}>
                <Icon
                  name="calendar"
                  size={12}
                  color={isDueToday(activity.scheduledDate) ? colors.destructive : colors.textSecondary}
                />
              </HStack>
            )}

            {/* Priority star */}
            {isFieldVisible('priority') && activity.priority === 1 && (
              <Icon name="starFilled" size={12} color={colors.turmeric} />
            )}
          </HStack>

          {/* Estimate badge if present */}
          {isFieldVisible('estimate') && activity.estimateMinutes && activity.estimateMinutes > 0 && (
            <Text style={styles.estimateBadge}>
              {formatEstimate(activity.estimateMinutes)}
            </Text>
          )}
        </HStack>
        </VStack>
      </Pressable>
    </View>
  );
}

function isDueToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const styles = StyleSheet.create({
  // Outer wrapper carries shadow/elevation (can't have overflow hidden or shadow clips on iOS).
  cardWrapper: {
    marginBottom: spacing.sm,
    // Slight elevation so cards lift off the column surface.
    ...Platform.select({
      ios: {
        shadowColor: colors.sumi900,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  // Inner surface holds radius + clipping.
  cardInner: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardContent: {
    padding: spacing.sm,
  },
  goalPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 2,
    backgroundColor: colors.shellAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  goalPillText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  checkboxHitArea: {
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  title: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    flex: 1,
  },
  titleCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
  },
  estimateBadge: {
    ...typography.bodySm,
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});


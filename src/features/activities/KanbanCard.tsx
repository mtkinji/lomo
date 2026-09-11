import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { VStack, HStack, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { GoalPill } from '../../ui/GoalPill';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Activity } from '../../domain/types';
import { buildActivityListMeta } from '../../utils/activityListMeta';

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
  /** Alternative non-drag path for assistive technologies. */
  onRequestMove?: () => void;
  /**
   * Whether card is in loading/enriching state.
   */
  isLoading?: boolean;
  /** Keeps the completion indicator visible in a non-interactive card preview. */
  showCompletionControl?: boolean;
};

function CompletionCircle({ isCompleted }: { isCompleted: boolean }) {
  return (
    <View
      testID="kanban-card-completion-control"
      style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
    >
      {isCompleted ? <Icon name="check" size={12} color={colors.canvas} /> : null}
    </View>
  );
}

/**
 * Whether the card is due today.
 */

export function KanbanCard({
  activity,
  goalTitle,
  visibleFields,
  onToggleComplete,
  onPress,
  onRequestMove,
  isLoading = false,
  showCompletionControl,
}: KanbanCardProps) {
  const isCompleted = activity.status === 'done';
  const hasAttachments = (activity.attachments?.length ?? 0) > 0;
  const hasSteps = (activity.steps?.length ?? 0) > 0;
  const completedSteps = activity.steps?.filter((s) => s.completedAt).length ?? 0;
  const totalSteps = activity.steps?.length ?? 0;
  const { meta, metaTone, estimateMeta } = buildActivityListMeta({ activity });

  const isFieldVisible = React.useCallback(
    (field: KanbanCardField) => (visibleFields ? visibleFields.has(field) : true),
    [visibleFields],
  );
  const showSteps = isFieldVisible('steps') && hasSteps;
  const showAttachments = isFieldVisible('attachments') && hasAttachments;
  const showTiming = isFieldVisible('dueDate') && Boolean(meta);
  const showPriority = isFieldVisible('priority') && activity.priority === 1;
  const showEstimate = isFieldVisible('estimate') && Boolean(estimateMeta);
  const showMetaRow = showSteps || showAttachments || showTiming || showPriority || showEstimate;
  const shouldShowCompletionControl = showCompletionControl ?? Boolean(onToggleComplete);

  return (
    <View style={styles.cardWrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardInner, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={activity.title}
        accessibilityHint={onRequestMove ? 'Double tap to open. Touch and hold to move.' : undefined}
        accessibilityActions={onRequestMove ? [{ name: 'move', label: 'Move' }] : undefined}
        onAccessibilityAction={onRequestMove ? (event) => {
          if (event.nativeEvent.actionName === 'move') onRequestMove();
        } : undefined}
      >
        <VStack space="xs" style={styles.cardContent}>
          {/* Goal badge */}
          {goalTitle && isFieldVisible('goal') && (
            <GoalPill title={goalTitle} style={styles.goalPill} textStyle={styles.goalPillText} />
          )}

          {/* Title and metadata share the same text column as the standard list card. */}
          <HStack alignItems="flex-start" space="sm">
            {shouldShowCompletionControl && onToggleComplete ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={isCompleted ? 'Mark to-do as not done' : 'Mark to-do as done'}
                accessibilityState={{ checked: isCompleted }}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onToggleComplete();
                }}
                hitSlop={8}
                style={styles.checkboxHitArea}
                testID="kanban-card-leading-control"
              >
                <View style={styles.leadingControl}>
                  <CompletionCircle isCompleted={isCompleted} />
                </View>
              </Pressable>
            ) : shouldShowCompletionControl ? (
              <View
                testID="kanban-card-leading-control"
                style={styles.leadingControl}
              >
                <CompletionCircle isCompleted={isCompleted} />
              </View>
            ) : null}
            <VStack style={styles.textBlock} space="xs">
              <Text
                style={[
                  styles.title,
                  isCompleted && styles.titleCompleted,
                ]}
                numberOfLines={3}
              >
                {activity.title}
              </Text>

              {showMetaRow ? (
                <HStack alignItems="center" space={8} style={styles.metaRow}>
                  {showTiming ? (
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.metaText,
                        styles.metaPill,
                        metaTone === 'urgent' ? styles.metaPillUrgent : null,
                        metaTone === 'today' ? styles.metaPillToday : null,
                        metaTone === 'tomorrow' ? styles.metaPillTomorrow : null,
                        metaTone === 'future' ? styles.metaPillFuture : null,
                      ]}
                    >
                      {meta}
                    </Text>
                  ) : null}

                  {showEstimate ? (
                    <Text numberOfLines={1} style={[styles.metaText, styles.estimatePill]}>
                      {estimateMeta}
                    </Text>
                  ) : null}

                  {showPriority ? (
                    <Icon name="starFilled" size={14} color={colors.turmeric} />
                  ) : null}

                  {showSteps ? (
                    <HStack alignItems="center" space={4}>
                      <Icon name="checklist" size={12} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {completedSteps}/{totalSteps}
                      </Text>
                    </HStack>
                  ) : null}

                  {showAttachments ? (
                    <HStack alignItems="center" space={4}>
                      <Icon name="paperclip" size={12} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {activity.attachments?.length}
                      </Text>
                    </HStack>
                  ) : null}
                </HStack>
              ) : null}
            </VStack>
          </HStack>
        </VStack>
      </Pressable>
    </View>
  );
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
    marginBottom: 2,
  },
  goalPillText: {
    // Keep Kanban's label slightly tighter without diverging pill visuals.
    ...typography.bodyXs,
  },
  checkboxHitArea: {
    marginTop: 2,
  },
  leadingControl: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  titleCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    maxWidth: '100%',
    minWidth: 0,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  metaPill: {
    minHeight: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  metaPillUrgent: {
    backgroundColor: colors.destructiveForeground,
    borderColor: colors.destructiveForeground,
    color: colors.destructive,
  },
  metaPillToday: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
    color: colors.gray800,
  },
  metaPillTomorrow: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray100,
    color: colors.gray600,
  },
  metaPillFuture: {
    backgroundColor: colors.canvas,
    borderColor: colors.gray200,
    color: colors.gray600,
  },
  estimatePill: {
    minHeight: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
  },
});

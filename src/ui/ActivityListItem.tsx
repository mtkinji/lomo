import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableProps,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Card } from './Card';
import { HStack, VStack, Text } from './primitives';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './DropdownMenu';
import { Icon } from './Icon';
import { cardSurfaceStyle, colors, spacing, typography } from '../theme';
import { fonts } from '../theme/typography';
import type { ActivityMetaTone } from '../utils/activityListMeta';

export type ActivityPriorityIndicator = {
  label: string;
  tone: 'top' | 'high';
  accessibilityLabel: string;
  reasons?: string[];
};

type ActivityListItemProps = {
  /** Use the shared card shell or a quiet, divider-owned list row. */
  surface?: 'card' | 'flat';
  /**
   * Visual density / information level.
   * - compact: single-row card (default)
   * - full: richer card with optional notes preview
   */
  variant?: 'compact' | 'full';
  title: string;
  /**
   * Optional secondary line shown under the title. Typically used for the
   * parent goal name, phase, or light metadata.
   */
  meta?: string;
  /**
   * Optional lower-emphasis time estimate shown as plain metadata after due timing.
   */
  estimateMeta?: string;
  /**
   * Optional tone for decision-row timing metadata. When present, metadata renders as a pill.
   */
  metaTone?: ActivityMetaTone;
  /**
   * Optional direct-edit action for the visible timing metadata. Only provide
   * this when the metadata has a single, unambiguous source such as a due date.
   */
  onMetaPress?: () => void;
  metaAccessibilityLabel?: string;
  /** Optional direct-edit action for the visible duration estimate. */
  onEstimatePress?: () => void;
  estimateAccessibilityLabel?: string;
  /**
   * Optional notes/body preview shown only in `variant="full"`.
   */
  notes?: string;
  /**
   * Optional leading icon for the metadata row. Typically used for a tiny
   * due-date calendar icon.
   */
  metaLeadingIconName?: import('./Icon').IconName;
  /**
   * Preferred multi-icon support for the meta row (e.g. calendar/bell + paperclip).
   */
  metaLeadingIconNames?: Array<import('./Icon').IconName>;
  /** Optional size override for capability-owned metadata iconography. */
  metaLeadingIconSize?: number;
  /** Optional capability-owned identity or status presented before metadata text. */
  metaLeadingAccessory?: React.ReactNode;
  /**
   * Optional compact action rendered at the trailing edge of the metadata line.
   * Use for quiet row-scoped actions that should not compete with the title.
   */
  metaAccessory?: React.ReactNode;
  /**
   * Low-noise priority position indicator for Priority-ordered lists.
   * Reasons stay inspectable behind an info affordance instead of being inline metadata.
   */
  priorityIndicator?: ActivityPriorityIndicator;
  /**
   * When true and `meta` is still empty, renders a lightweight animated skeleton
   * placeholder in the metadata row space. Useful while AI enrichment is running.
   */
  metaLoading?: boolean;
  /**
   * When true, renders the item as completed with a filled check and muted
   * text styling.
   */
  isCompleted?: boolean;
  /**
   * Optional handler for toggling completion when the left control is tapped.
   */
  onToggleComplete?: () => void;
  /**
   * When true, visually emphasizes the right-side star as a "Starred" flag.
   */
  isPriorityOne?: boolean;
  /**
   * Optional handler for toggling the "Starred" flag. Exposed as a swipe action;
   * starred rows also show a compact filled-star state marker.
   */
  onTogglePriority?: () => void;
  /**
   * Optional swipe-right action for opening Focus mode for this to-do.
   */
  onStartFocus?: () => void;
  /**
   * Optional swipe-right action for opening Plan / scheduling for this to-do.
   */
  onSchedule?: () => void;
  /**
   * Optional right-side accessory. When provided, this is rendered instead of the
   * priority/star control. Useful for contextual actions like “Add to schedule”.
   */
  rightAccessory?: React.ReactNode;
  /**
   * Whether to enable the priority/star swipe action and starred state marker.
   * Defaults to true. Useful for preview cards that should avoid extra controls.
   */
  showPriorityControl?: boolean;
  /**
   * Whether to show the checkbox/completion control. Defaults to true.
   * When false, the checkbox is completely hidden.
   */
  showCheckbox?: boolean;
  /** Optional capability-owned state shown in the checkbox position. */
  leadingAccessory?: React.ReactNode;
  /** Capability-owned label for the completion control. */
  completionAccessibilityLabel?: string;
  /**
   * Optional handler for tapping anywhere on the row (excluding the checkbox).
   */
  onPress?: () => void;
  /** Capability-owned label for opening the row. Defaults to the title. */
  rowAccessibilityLabel?: string;
  /**
   * Optional handler for long-pressing the row. Used by DraggableActivityListItem
   * to initiate drag-and-drop.
   */
  onLongPress?: () => void;
  /**
   * Optional destructive row action. When provided, swiping left
   * reveals a Delete affordance; the parent owns removal and undo.
   */
  onDelete?: () => void;
  /**
   * When true, highlights the meta row (text + leading icons) in a warning/red color
   * to indicate the activity is due today (Microsoft Outlook–style).
   */
  isDueToday?: boolean;
  /**
   * When true, renders a subtle background and border to indicate the item
   * is a "ghost" (temporarily visible despite filters).
   */
  isGhost?: boolean;
};

export function ActivityListItem({
  surface = 'card',
  variant = 'compact',
  title,
  meta,
  estimateMeta,
  metaTone,
  onMetaPress,
  metaAccessibilityLabel,
  onEstimatePress,
  estimateAccessibilityLabel,
  notes,
  metaLeadingIconName,
  metaLeadingIconNames,
  metaLeadingIconSize = 13,
  metaLeadingAccessory,
  metaAccessory,
  priorityIndicator,
  metaLoading = false,
  isCompleted = false,
  onToggleComplete,
  isPriorityOne = false,
  onTogglePriority,
  onStartFocus,
  onSchedule,
  rightAccessory,
  showPriorityControl = true,
  showCheckbox = true,
  leadingAccessory,
  completionAccessibilityLabel,
  onPress,
  rowAccessibilityLabel,
  onLongPress,
  onDelete,
  isDueToday = false,
  isGhost = false,
}: ActivityListItemProps) {
  const completionAnim = React.useRef(new Animated.Value(0)).current;
  const [isAnimatingComplete, setIsAnimatingComplete] = React.useState(false);
  const metaPulseAnim = React.useRef(new Animated.Value(0.4)).current;
  const metaPulseLoopRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    const shouldAnimate = Boolean(metaLoading && !meta);
    if (!shouldAnimate) {
      metaPulseLoopRef.current?.stop();
      metaPulseLoopRef.current = null;
      metaPulseAnim.setValue(0.4);
      return;
    }

    metaPulseLoopRef.current?.stop();
    metaPulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(metaPulseAnim, {
          toValue: 0.75,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(metaPulseAnim, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    metaPulseLoopRef.current.start();

    return () => {
      metaPulseLoopRef.current?.stop();
      metaPulseLoopRef.current = null;
    };
  }, [meta, metaLoading, metaPulseAnim]);

  const handlePressComplete = () => {
    if (!onToggleComplete) {
      return;
    }

    // When marking as done, play a quick "burst" animation before we
    // hand control back to the list (which will move the item into
    // the Completed section).
    if (!isCompleted) {
      setIsAnimatingComplete(true);
      completionAnim.setValue(0);
      Animated.timing(completionAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        // Give the burst a brief moment to settle before the
        // list reflows into the Completed section.
        setTimeout(() => {
          setIsAnimatingComplete(false);
          onToggleComplete();
        }, 80);
      });
      return;
    }

    // For un-completing, just toggle immediately without the burst.
    onToggleComplete();
  };

  const completionScale = completionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const showNotes = variant === 'full' && Boolean(notes && notes.trim().length > 0);
  const resolvedMetaLeadingIconNames = metaLeadingIconNames
    ?? (metaLeadingIconName ? [metaLeadingIconName] : []);
  const priorityReasons = priorityIndicator?.reasons?.filter(Boolean) ?? [];
  const hasPriorityReasons = priorityReasons.length > 0;
  const showStarredMeta = Boolean(showPriorityControl && onTogglePriority && isPriorityOne);
  const showMetaRow = Boolean(
    meta || estimateMeta || priorityIndicator || showStarredMeta || metaLeadingAccessory || metaAccessory,
  );

  // Determine the meta color: due today shows in red (destructive), completed is muted, otherwise secondary
  const metaColor = isCompleted
    ? colors.muted
    : isDueToday
      ? colors.destructive
      : colors.textSecondary;

  const renderDeleteAction: NonNullable<SwipeableProps['renderRightActions']> = React.useCallback(
    (_progress, _dragX, swipeable) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${title}`}
        onPress={() => {
          swipeable.close();
          onDelete?.();
        }}
        style={({ pressed }) => [
          styles.swipeDeleteAction,
          pressed && styles.swipeDeleteActionPressed,
        ]}
      >
        <Icon name="trash" size={18} color={colors.primaryForeground} />
        <Text style={styles.swipeDeleteLabel}>Delete</Text>
      </Pressable>
    ),
    [onDelete, title],
  );

  const renderPrimaryActions: NonNullable<SwipeableProps['renderLeftActions']> = React.useCallback(
    (_progress, _dragX, swipeable) => {
      const actions: Array<{
        key: string;
        label: string;
        accessibilityLabel: string;
        iconName: import('./Icon').IconName;
        onPress: () => void;
        style: any;
      }> = [];

      if (onStartFocus) {
        actions.push({
          key: 'focus',
          label: 'Focus',
          accessibilityLabel: `Start Focus for ${title}`,
          iconName: 'focus',
          onPress: onStartFocus,
          style: styles.swipeFocusAction,
        });
      }

      if (onSchedule) {
        actions.push({
          key: 'plan',
          label: 'Plan',
          accessibilityLabel: `Plan ${title}`,
          iconName: 'plan',
          onPress: onSchedule,
          style: styles.swipePlanAction,
        });
      }

      if (showPriorityControl && onTogglePriority) {
        actions.push({
          key: 'star',
          label: isPriorityOne ? 'Unstar' : 'Star',
          accessibilityLabel: isPriorityOne ? `Unstar ${title}` : `Star ${title}`,
          iconName: isPriorityOne ? 'star' : 'starFilled',
          onPress: onTogglePriority,
          style: styles.swipeFavoriteAction,
        });
      }

      if (actions.length === 0) return null;

      return (
        <View style={styles.swipePrimaryRail}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              onPress={() => {
                swipeable.close();
                action.onPress();
              }}
              style={({ pressed }) => [
                styles.swipePrimaryAction,
                action.style,
                pressed && styles.swipePrimaryActionPressed,
              ]}
            >
              <Icon name={action.iconName} size={18} color={colors.primaryForeground} />
              <Text style={styles.swipePrimaryLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
    [isPriorityOne, onSchedule, onStartFocus, onTogglePriority, showPriorityControl, title],
  );

  const completionLabel = completionAccessibilityLabel
    ?? (isCompleted ? 'Mark to-do as not done' : 'Mark to-do as done');

  const activityContent = (
      <HStack
        space="md"
        alignItems={variant === 'full' ? 'flex-start' : 'center'}
        justifyContent="space-between"
      >
        <HStack
          space="md"
          alignItems={variant === 'full' ? 'flex-start' : 'center'}
          style={[
            styles.leftCluster,
            !showCheckbox && !leadingAccessory && styles.leftClusterNoCheckbox,
          ]}
        >
          {leadingAccessory}
          {showCheckbox ? (
            <View style={styles.checkboxWrapper}>
              {onToggleComplete ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={completionLabel}
                  accessibilityState={{ checked: isCompleted }}
                  hitSlop={8}
                  onPress={handlePressComplete}
                >
                  <View
                    testID="activity-completion-indicator"
                    style={[
                      styles.checkboxBase,
                      isCompleted ? styles.checkboxCompleted : styles.checkboxPlanned,
                      isGhost && styles.ghostCheckbox,
                    ]}
                  >
                    {isCompleted ? (
                      <Icon name="check" size={14} color={colors.primaryForeground} />
                    ) : null}
                  </View>
                </Pressable>
              ) : (
                <View
                  accessible
                  accessibilityRole="checkbox"
                  accessibilityLabel={completionLabel}
                  accessibilityState={{ checked: isCompleted }}
                  testID="activity-completion-indicator"
                  style={[
                    styles.checkboxBase,
                    isCompleted ? styles.checkboxCompleted : styles.checkboxPlanned,
                    isGhost && styles.ghostCheckbox,
                  ]}
                >
                  {isCompleted ? (
                    <Icon name="check" size={14} color={colors.primaryForeground} />
                  ) : null}
                </View>
              )}

              {isAnimatingComplete && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.completionBurst,
                    {
                      transform: [{ scale: completionScale }],
                    },
                  ]}
                >
                  <View style={styles.completionBurstInner}>
                    <Icon name="check" size={12} color={colors.primaryForeground} />
                  </View>
                </Animated.View>
              )}
            </View>
          ) : null}

          <VStack style={styles.textBlock} space="xs">
            <Text
              testID="activity-title"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[styles.title, isCompleted && styles.titleCompleted]}
            >
              {title}
            </Text>
            {showMetaRow ? (
              <HStack
                testID="activity-meta-row"
                accessible={Boolean(metaAccessibilityLabel && !onMetaPress && !metaAccessory)}
                accessibilityLabel={!onMetaPress && !metaAccessory ? metaAccessibilityLabel : undefined}
                space={8}
                alignItems="center"
                style={styles.metaRow}
              >
                {priorityIndicator ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={priorityIndicator.accessibilityLabel}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.priorityIndicator,
                          priorityIndicator.tone === 'top'
                            ? styles.priorityIndicatorTop
                            : styles.priorityIndicatorHigh,
                          pressed ? styles.priorityIndicatorPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityIndicatorText,
                            priorityIndicator.tone === 'top'
                              ? styles.priorityIndicatorTextTop
                              : styles.priorityIndicatorTextHigh,
                          ]}
                        >
                          {priorityIndicator.label}
                        </Text>
                      </Pressable>
                    </DropdownMenuTrigger>
                    {hasPriorityReasons ? (
                      <DropdownMenuContent side="bottom" sideOffset={6} align="start" style={styles.priorityPopover}>
                        <Text style={styles.priorityPopoverTitle}>Why this priority?</Text>
                        <VStack space="xs">
                          {priorityReasons.map((reason) => (
                            <Text key={reason} style={styles.priorityPopoverReason}>
                              {reason}
                            </Text>
                          ))}
                        </VStack>
                      </DropdownMenuContent>
                    ) : null}
                  </DropdownMenu>
                ) : null}
                {metaLeadingAccessory}
                {resolvedMetaLeadingIconNames.map((iconName) => (
                  <Icon key={iconName} name={iconName} size={metaLeadingIconSize} color={metaColor} />
                ))}
                {meta ? (
                  onMetaPress ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={metaAccessibilityLabel ?? `Edit timing, currently ${meta}`}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      onPress={onMetaPress}
                      style={({ pressed }) => pressed ? styles.metaPressablePressed : null}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.meta,
                          metaTone ? styles.metaPill : null,
                          metaTone === 'urgent' ? styles.metaPillUrgent : null,
                          metaTone === 'today' ? styles.metaPillToday : null,
                          metaTone === 'tomorrow' ? styles.metaPillTomorrow : null,
                          metaTone === 'future' ? styles.metaPillFuture : null,
                          !metaTone ? { color: metaColor } : null,
                        ]}
                      >
                        {meta}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text
                      accessible={Boolean(metaAccessory && metaAccessibilityLabel)}
                      accessibilityLabel={metaAccessory ? metaAccessibilityLabel : undefined}
                      numberOfLines={1}
                      style={[
                        styles.meta,
                        metaTone ? styles.metaPill : null,
                        metaTone === 'urgent' ? styles.metaPillUrgent : null,
                        metaTone === 'today' ? styles.metaPillToday : null,
                        metaTone === 'tomorrow' ? styles.metaPillTomorrow : null,
                        metaTone === 'future' ? styles.metaPillFuture : null,
                        !metaTone ? { color: metaColor } : null,
                      ]}
                    >
                      {meta}
                    </Text>
                  )
                ) : null}
                {estimateMeta ? (
                  onEstimatePress ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={estimateAccessibilityLabel ?? `Edit duration, currently ${estimateMeta}`}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      onPress={onEstimatePress}
                      style={({ pressed }) => pressed ? styles.metaPressablePressed : null}
                    >
                      <Text numberOfLines={1} style={[styles.estimateMeta, styles.estimatePill]}>
                        {estimateMeta}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text numberOfLines={1} style={styles.estimateMeta}>
                      {estimateMeta}
                    </Text>
                  )
                ) : null}
                {showStarredMeta ? (
                  <Icon
                    name="starFilled"
                    size={14}
                    color={colors.turmeric}
                  />
                ) : null}
                {metaAccessory ? <View style={styles.metaAccessory}>{metaAccessory}</View> : null}
              </HStack>
            ) : metaLoading ? (
              <HStack space={4} alignItems="center">
                <Animated.View
                  style={[
                    styles.metaSkeleton,
                    {
                      opacity: metaPulseAnim,
                    },
                  ]}
                />
              </HStack>
            ) : null}
            {showNotes ? (
              <Text
                numberOfLines={2}
                style={[styles.notes, isCompleted && styles.notesCompleted]}
              >
                {notes?.trim()}
              </Text>
            ) : null}
          </VStack>
        </HStack>

        {rightAccessory ? rightAccessory : null}
      </HStack>
  );

  const content = surface === 'flat' ? (
    <View
      testID="activity-list-item-surface"
      style={[
        styles.card,
        styles.flatSurface,
        variant === 'full' && styles.cardFull,
        isGhost && styles.ghostCard,
      ]}
    >
      {activityContent}
    </View>
  ) : (
    <Card
      style={[
        styles.card,
        variant === 'full' && styles.cardFull,
        isCompleted && styles.cardCompleted,
        isGhost && styles.ghostCard,
      ]}
    >
      {activityContent}
    </Card>
  );

  const rowContent = !onPress && !onLongPress ? content : (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={rowAccessibilityLabel ?? title}
      accessibilityActions={[
        ...(onMetaPress ? [{ name: 'editDueDate', label: 'Edit due date' }] : []),
        ...(onEstimatePress ? [{ name: 'editDuration', label: 'Edit duration' }] : []),
      ]}
      onAccessibilityAction={
        onMetaPress || onEstimatePress
          ? (event) => {
              if (event.nativeEvent.actionName === 'editDueDate') {
                onMetaPress?.();
              }
              if (event.nativeEvent.actionName === 'editDuration') {
                onEstimatePress?.();
              }
            }
          : undefined
      }
      style={styles.pressable}
    >
      {content}
    </Pressable>
  );

  const canSwipePrimaryActions = Boolean(onStartFocus || onSchedule || (showPriorityControl && onTogglePriority));

  if (!onDelete && !canSwipePrimaryActions) {
    return rowContent;
  }

  return (
    <ReanimatedSwipeable
      friction={1.5}
      leftThreshold={36}
      rightThreshold={36}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={canSwipePrimaryActions ? renderPrimaryActions : undefined}
      renderRightActions={onDelete ? renderDeleteAction : undefined}
      containerStyle={styles.swipeContainer}
    >
      {rowContent}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  swipeContainer: {
    width: '100%',
  },
  swipeDeleteAction: {
    width: 96,
    marginLeft: spacing.sm,
    marginVertical: 0,
    borderRadius: cardSurfaceStyle.borderRadius,
    borderWidth: cardSurfaceStyle.borderWidth,
    borderColor: colors.destructive,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  swipeDeleteActionPressed: {
    opacity: 0.85,
  },
  swipeDeleteLabel: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.primaryForeground,
  },
  swipePrimaryRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  swipePrimaryAction: {
    width: 72,
    borderRadius: cardSurfaceStyle.borderRadius,
    borderWidth: cardSurfaceStyle.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeFocusAction: {
    borderColor: colors.gray800,
    backgroundColor: colors.gray800,
  },
  swipePlanAction: {
    borderColor: colors.gray700,
    backgroundColor: colors.gray700,
  },
  swipeFavoriteAction: {
    borderColor: colors.turmeric,
    backgroundColor: colors.turmeric,
  },
  swipePrimaryActionPressed: {
    opacity: 0.85,
  },
  swipePrimaryLabel: {
    ...typography.bodySm,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.semibold,
    color: colors.primaryForeground,
  },
  metaPressablePressed: {
    opacity: 0.72,
  },
  card: {
    marginHorizontal: 0,
    marginVertical: 0,
    // Match the outer padding used on Goal cards so Activities share the same
    // density and shell rhythm.
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardFull: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  flatSurface: {
    minHeight: 68,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: colors.canvas,
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },
  cardCompleted: {
    backgroundColor: colors.shellAlt,
  },
  metaSkeleton: {
    height: 10,
    width: 132,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  leftCluster: {
    flex: 1,
  },
  leftClusterNoCheckbox: {
    paddingLeft: spacing.xs,
  },
  checkboxWrapper: {
    position: 'relative',
  },
  checkboxBase: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPlanned: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  checkboxCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  completionBurst: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionBurstInner: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textPrimary,
    // Slightly tighter line height so the metadata row tucks closer
    // to multi-line titles without feeling cramped.
    lineHeight: 22,
  },
  titleCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  meta: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    flexShrink: 1,
    minWidth: 0,
  },
  metaPill: {
    minHeight: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.xs,
    lineHeight: 16,
    fontFamily: fonts.regular,
    flexShrink: 0,
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
  metaRow: {
    maxWidth: '100%',
    minWidth: 0,
  },
  metaAccessory: {
    marginLeft: 'auto',
    flexShrink: 0,
  },
  estimateMeta: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    flexShrink: 0,
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
  priorityIndicator: {
    minHeight: 20,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityIndicatorTop: {
    backgroundColor: colors.gray800,
  },
  priorityIndicatorHigh: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  priorityIndicatorPressed: {
    opacity: 0.72,
  },
  priorityIndicatorText: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.semibold,
  },
  priorityIndicatorTextTop: {
    color: colors.gray50,
  },
  priorityIndicatorTextHigh: {
    color: colors.gray700,
  },
  priorityPopover: {
    width: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  priorityPopoverTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  priorityPopoverReason: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  metaCompleted: {
    color: colors.muted,
  },
  notes: {
    ...typography.bodySm,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  notesCompleted: {
    color: colors.muted,
  },
  ghostCard: {
    backgroundColor: colors.turmeric50,
    borderColor: colors.turmeric200,
    borderWidth: 1,
  },
  ghostCheckbox: {
    borderColor: colors.turmeric300,
  },
});

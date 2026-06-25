import React from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
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
  /**
   * Optional handler for tapping anywhere on the row (excluding the checkbox).
   */
  onPress?: () => void;
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
  variant = 'compact',
  title,
  meta,
  estimateMeta,
  metaTone,
  notes,
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
  onPress,
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
  const priorityReasons = priorityIndicator?.reasons?.filter(Boolean) ?? [];
  const hasPriorityReasons = priorityReasons.length > 0;
  const showStarredMeta = Boolean(showPriorityControl && onTogglePriority && isPriorityOne);
  const showMetaRow = Boolean(meta || estimateMeta || priorityIndicator || showStarredMeta);

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

  const content = (
    <Card
      style={[
        styles.card,
        variant === 'full' && styles.cardFull,
        isCompleted && styles.cardCompleted,
        isGhost && styles.ghostCard,
      ]}
    >
      <HStack
        space="md"
        alignItems={variant === 'full' ? 'flex-start' : 'center'}
        justifyContent="space-between"
      >
        <HStack
          space="md"
          alignItems={variant === 'full' ? 'flex-start' : 'center'}
          style={[styles.leftCluster, !showCheckbox && styles.leftClusterNoCheckbox]}
        >
          {showCheckbox ? (
            <View style={styles.checkboxWrapper}>
              {onToggleComplete ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isCompleted ? 'Mark to-do as not done' : 'Mark to-do as done'}
                  hitSlop={8}
                  onPress={handlePressComplete}
                >
                  <View
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
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[styles.title, isCompleted && styles.titleCompleted]}
            >
              {title}
            </Text>
            {showMetaRow ? (
              <HStack space={8} alignItems="center" style={styles.metaRow}>
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
                {meta ? (
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
                ) : null}
                {estimateMeta ? (
                  <Text numberOfLines={1} style={styles.estimateMeta}>
                    {estimateMeta}
                  </Text>
                ) : null}
                {showStarredMeta ? (
                  <Icon
                    name="starFilled"
                    size={12}
                    color={colors.turmeric}
                  />
                ) : null}
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
    </Card>
  );

  const rowContent = !onPress && !onLongPress ? content : (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={title}
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
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPlanned: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  checkboxCompleted: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
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
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.success,
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
    minHeight: 18,
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
  estimateMeta: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  priorityIndicator: {
    minHeight: 18,
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

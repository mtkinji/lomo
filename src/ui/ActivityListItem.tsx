import React from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { HStack, VStack, Text } from './primitives';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { colors, spacing, typography } from '../theme';
import { fonts } from '../theme/typography';

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
   * Optional handler for toggling the "Starred" flag.
   */
  onTogglePriority?: () => void;
  /**
   * Optional right-side accessory. When provided, this is rendered instead of the
   * priority/star control. Useful for contextual actions like “Add to schedule”.
   */
  rightAccessory?: React.ReactNode;
  /**
   * Whether to show the priority/star affordance. Defaults to true.
   * Useful for "preview" cards (e.g. suggestions) that should look like a list item
   * but avoid extra controls.
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
  notes,
  metaLeadingIconName,
  metaLeadingIconNames,
  metaLoading = false,
  isCompleted = false,
  onToggleComplete,
  isPriorityOne = false,
  onTogglePriority,
  rightAccessory,
  showPriorityControl = true,
  showCheckbox = true,
  onPress,
  onLongPress,
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
  const resolvedMetaLeadingIcons =
    Array.isArray(metaLeadingIconNames) && metaLeadingIconNames.length > 0
      ? metaLeadingIconNames
      : metaLeadingIconName
        ? [metaLeadingIconName]
        : [];

  // Determine the meta color: due today shows in red (destructive), completed is muted, otherwise secondary
  const metaColor = isCompleted
    ? colors.muted
    : isDueToday
      ? colors.destructive
      : colors.textSecondary;

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
                  accessibilityLabel={isCompleted ? 'Mark activity as not done' : 'Mark activity as done'}
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
            {meta ? (
              <HStack space={4} alignItems="center">
                {resolvedMetaLeadingIcons.length > 0
                  ? resolvedMetaLeadingIcons.map((iconName) => (
                      <Icon
                        key={iconName}
                        name={iconName}
                        size={10}
                        color={metaColor}
                      />
                    ))
                  : null}
                <Text numberOfLines={1} style={[styles.meta, { color: metaColor }]}>
                  {meta}
                </Text>
              </HStack>
            ) : metaLoading ? (
              <HStack space={4} alignItems="center">
                {resolvedMetaLeadingIcons.length > 0
                  ? resolvedMetaLeadingIcons.map((iconName) => (
                      <Icon
                        key={iconName}
                        name={iconName}
                        size={10}
                        color={metaColor}
                      />
                    ))
                  : null}
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

        {/* Right-side accessory (custom) OR importance / priority affordance */}
        {rightAccessory
          ? rightAccessory
          : showPriorityControl && onTogglePriority
            ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPriorityOne ? 'Remove star from activity' : 'Star this activity'}
                  hitSlop={8}
                  onPress={onTogglePriority}
                >
                  <Icon
                    name={isPriorityOne ? 'starFilled' : 'star'}
                    size={18}
                    color={isPriorityOne ? colors.turmeric : colors.textSecondary}
                  />
                </Pressable>
              )
            : null}
      </HStack>
    </Card>
  );

  if (!onPress && !onLongPress) {
    return content;
  }

  return (
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
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
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



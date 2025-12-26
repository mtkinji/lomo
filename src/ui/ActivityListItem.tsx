import React from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { HStack, VStack, Text } from './primitives';
import { Icon } from './Icon';
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
   * When true, visually emphasizes the right-side star as a Priority 1 flag.
   */
  isPriorityOne?: boolean;
  /**
   * Optional handler for toggling the Priority 1 flag.
   */
  onTogglePriority?: () => void;
  /**
   * Whether to show the priority/star affordance. Defaults to true.
   * Useful for "preview" cards (e.g. suggestions) that should look like a list item
   * but avoid extra controls.
   */
  showPriorityControl?: boolean;
  /**
   * Optional handler for tapping anywhere on the row (excluding the checkbox).
   */
  onPress?: () => void;
};

export function ActivityListItem({
  variant = 'compact',
  title,
  meta,
  notes,
  metaLeadingIconName,
  metaLoading = false,
  isCompleted = false,
  onToggleComplete,
  isPriorityOne = false,
  onTogglePriority,
  showPriorityControl = true,
  onPress,
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

  const content = (
    <Card style={[styles.card, variant === 'full' && styles.cardFull]}>
      <HStack
        space="md"
        alignItems={variant === 'full' ? 'flex-start' : 'center'}
        justifyContent="space-between"
      >
        <HStack
          space="md"
          alignItems={variant === 'full' ? 'flex-start' : 'center'}
          style={styles.leftCluster}
        >
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

          <VStack style={styles.textBlock} space="xs">
            <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
              {title}
            </Text>
            {meta ? (
              <HStack space={4} alignItems="center">
                {metaLeadingIconName ? (
                  <Icon
                    name={metaLeadingIconName}
                    size={10}
                    color={isCompleted ? colors.muted : colors.textSecondary}
                  />
                ) : null}
                <Text numberOfLines={1} style={[styles.meta, isCompleted && styles.metaCompleted]}>
                  {meta}
                </Text>
              </HStack>
            ) : metaLoading ? (
              <HStack space={4} alignItems="center">
                {metaLeadingIconName ? (
                  <Icon
                    name={metaLeadingIconName}
                    size={10}
                    color={isCompleted ? colors.muted : colors.textSecondary}
                  />
                ) : null}
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

        {/* Importance / priority affordance */}
        {showPriorityControl && onTogglePriority ? (
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
        ) : null}
      </HStack>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
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
  metaSkeleton: {
    height: 10,
    width: 132,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  leftCluster: {
    flex: 1,
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
});



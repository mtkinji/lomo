import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { HStack, VStack, Text } from './primitives';
import { Icon } from './Icon';
import { colors, spacing, typography } from '../theme';

type ActivityListItemProps = {
  title: string;
  /**
   * Optional secondary line shown under the title. Typically used for the
   * parent goal name, phase, or light metadata.
   */
  meta?: string;
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
   * Optional handler for tapping anywhere on the row (excluding the checkbox).
   */
  onPress?: () => void;
};

export function ActivityListItem({
  title,
  meta,
  isCompleted = false,
  onToggleComplete,
  isPriorityOne = false,
  onTogglePriority,
  onPress,
}: ActivityListItemProps) {
  const content = (
    <Card style={styles.card}>
      <HStack space="md" alignItems="center" justifyContent="space-between">
        <HStack space="md" alignItems="center" style={styles.leftCluster}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isCompleted ? 'Mark activity as not done' : 'Mark activity as done'}
            hitSlop={8}
            onPress={onToggleComplete}
          >
            <View
              style={[
                styles.checkboxBase,
                isCompleted ? styles.checkboxCompleted : styles.checkboxPlanned,
              ]}
            >
              {isCompleted ? <Icon name="check" size={14} color={colors.primaryForeground} /> : null}
            </View>
          </Pressable>

          <VStack style={styles.textBlock} space="xs">
            <Text
              style={[styles.title, isCompleted && styles.titleCompleted]}
            >
              {title}
            </Text>
            {meta ? (
              <Text
                numberOfLines={1}
                style={[styles.meta, isCompleted && styles.metaCompleted]}
              >
                {meta}
              </Text>
            ) : null}
          </VStack>
        </HStack>

        {/* Importance / priority affordance */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isPriorityOne ? 'Remove Priority 1 flag from activity' : 'Mark activity as Priority 1'
          }
          hitSlop={8}
          onPress={onTogglePriority}
        >
          <Icon
            name="star"
            size={18}
            color={isPriorityOne ? colors.accent : colors.textSecondary}
          />
        </Pressable>
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
  leftCluster: {
    flex: 1,
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
  textBlock: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  titleCompleted: {
    color: colors.textSecondary,
  },
  meta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  metaCompleted: {
    color: colors.muted,
  },
});



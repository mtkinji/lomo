import React from 'react';
import type { RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VStack, HStack, Text } from '../../ui/primitives';
import { KanbanCard, type KanbanCardField } from './KanbanCard';
import { Icon, type IconName } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import type { Activity } from '../../domain/types';

export type KanbanColumnProps = {
  /**
   * Title displayed at the top of the column header.
   */
  title: string;
  /**
   * Optional leading icon for the column header.
   */
  iconName?: IconName;
  /**
   * Optional accent color for the column header indicator.
   */
  accentColor?: string;
  /**
   * Activities to display in this column.
   */
  activities: Activity[];
  /**
   * Which fields should be visible on each card.
   */
  cardVisibleFields?: ReadonlySet<KanbanCardField>;
  /**
   * Lookup from goalId to goal title for metadata display.
   */
  goalTitleById: Record<string, string>;
  /**
   * Set of activity IDs currently being enriched (show loading state).
   */
  enrichingActivityIds?: Set<string>;
  /**
   * Handler for toggling activity completion.
   */
  onToggleComplete: (activityId: string) => void;
  /**
   * Handler for toggling activity priority.
   */
  onTogglePriority: (activityId: string) => void;
  /**
   * Handler for pressing an activity to navigate to details.
   */
  onPressActivity: (activityId: string) => void;
  /**
   * Handler for adding a new card to this column.
   */
  onAddCard?: () => void;
  /**
   * Optional anchor ref for the "Add card" row (used for coachmarks/education).
   * We anchor a wrapping View instead of the Pressable to avoid ref typing issues across RN versions.
   */
  addCardAnchorRef?: RefObject<any>;
  /**
   * Column width. Defaults to 280.
   */
  width?: number;
  /**
   * Whether to show in expanded mode (full card details) or compact mode.
   */
  isExpanded?: boolean;
};

export function KanbanColumn({
  title,
  iconName,
  accentColor: _accentColor = colors.accent,
  activities,
  cardVisibleFields,
  goalTitleById,
  enrichingActivityIds,
  onToggleComplete,
  onTogglePriority,
  onPressActivity,
  onAddCard,
  addCardAnchorRef,
  width,
  isExpanded: _isExpanded = true,
}: KanbanColumnProps) {
  return (
    <View style={[styles.wrapper, width != null ? { width } : null]}>
      {/* Floating label (like a filled field label) */}
      <HStack style={styles.floatingLabelRow} alignItems="center" justifyContent="space-between" space="sm">
        <HStack alignItems="center" space="xs" style={{ flex: 1 }}>
          <Text style={styles.floatingLabelText} numberOfLines={1}>{title}</Text>
        </HStack>
        <Text style={styles.countText}>{activities.length}</Text>
      </HStack>

      {/* Filled surface (like a filled input) */}
      <View style={styles.surface}>
        {/* Cards list */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {activities.map((activity) => {
            const goalTitle = activity.goalId
              ? goalTitleById[activity.goalId]
              : undefined;
            const isLoading = enrichingActivityIds?.has(activity.id);

            return (
              <KanbanCard
                key={activity.id}
                activity={activity}
                goalTitle={goalTitle}
                visibleFields={cardVisibleFields}
                onToggleComplete={() => onToggleComplete(activity.id)}
                onPress={() => onPressActivity(activity.id)}
                isLoading={isLoading}
              />
            );
          })}

          {activities.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={24} color={colors.gray300} />
              <Text style={styles.emptyText}>No activities</Text>
            </View>
          )}
        </ScrollView>

        {/* Add card row */}
        {onAddCard && (
          <View ref={addCardAnchorRef} collapsable={false}>
            <Pressable
              style={styles.addCardButton}
              onPress={onAddCard}
              accessibilityRole="button"
              accessibilityLabel="Add card"
            >
              <HStack alignItems="center" space="xs">
                <Icon name="plus" size={14} color={colors.textSecondary} />
                <Text style={styles.addCardText}>Add card</Text>
              </HStack>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Width is typically controlled by the parent (KanbanBoard) so this column can
    // fill the animated wrapper. A caller may still override via the `width` prop.
    width: '100%',
    maxHeight: '100%',
    height: '100%',
  },
  floatingLabelRow: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  floatingLabelText: {
    ...typography.bodySm,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  countText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  surface: {
    flex: 1,
    backgroundColor: colors.fieldFill,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.sm,
    paddingBottom: spacing.sm,
  },
  emptyState: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  addCardButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.fieldFill,
  },
  addCardText: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.textSecondary,
  },
});


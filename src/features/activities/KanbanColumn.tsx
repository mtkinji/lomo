import React from 'react';
import type { RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HStack, Text } from '../../ui/primitives';
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
  /**
   * When true, disable vertical scrolling in the column so drag gestures win.
   */
  isDragging?: boolean;
  /**
   * Activity id to visually hide (keeps layout stable while an overlay is rendered by the board).
   */
  hiddenActivityId?: string | null;
  /**
   * Whether this column is currently the hovered drop target.
   */
  isDropTarget?: boolean;
  /**
   * Shared drag state from the board.
   */
  draggingId?: SharedValue<string | null>;
  dragTranslateX?: SharedValue<number>;
  dragTranslateY?: SharedValue<number>;
  hoveredColumnId?: SharedValue<string | null>;
  containerX?: SharedValue<number>;
  scrollX?: SharedValue<number>;
  columnIds?: SharedValue<string[]>;
  expandedProgress?: SharedValue<number>;
  compactColumnWidth?: number;
  expandedColumnWidth?: number;
  columnGap?: number;
  contentPadding?: number;
  onBeginDrag?: (activityId: string, cardLayout: { x: number; y: number; width: number; height: number }) => void;
  onEndDrag?: (activityId: string, dropColumnId: string | null) => void;
  /**
   * Native gesture wrapper from the horizontal board scroll view. When provided,
   * card drags can run simultaneously with horizontal page swipes.
   */
  scrollableGesture?: ReturnType<typeof Gesture.Native> | null;
};

function DraggableKanbanCard({
  activity,
  goalTitle,
  visibleFields,
  isLoading,
  isDragging,
  hidden,
  draggingId,
  dragTranslateX,
  dragTranslateY,
  hoveredColumnId,
  containerX,
  scrollX,
  columnIds,
  expandedProgress,
  compactColumnWidth,
  expandedColumnWidth,
  columnGap,
  contentPadding,
  onBeginDrag,
  onEndDrag,
  scrollableGesture,
  onToggleComplete,
  onPress,
}: {
  activity: Activity;
  goalTitle?: string;
  visibleFields?: ReadonlySet<KanbanCardField>;
  isLoading: boolean;
  isDragging: boolean;
  hidden: boolean;
  draggingId?: SharedValue<string | null>;
  dragTranslateX?: SharedValue<number>;
  dragTranslateY?: SharedValue<number>;
  hoveredColumnId?: SharedValue<string | null>;
  containerX?: SharedValue<number>;
  scrollX?: SharedValue<number>;
  columnIds?: SharedValue<string[]>;
  expandedProgress?: SharedValue<number>;
  compactColumnWidth?: number;
  expandedColumnWidth?: number;
  columnGap?: number;
  contentPadding?: number;
  onBeginDrag?: (activityId: string, cardLayout: { x: number; y: number; width: number; height: number }) => void;
  onEndDrag?: (activityId: string, dropColumnId: string | null) => void;
  scrollableGesture?: ReturnType<typeof Gesture.Native> | null;
  onToggleComplete: () => void;
  onPress: () => void;
}) {
  const containerRef = React.useRef<View>(null);

  const beginDrag = React.useCallback(() => {
    if (!onBeginDrag) return;
    const node = containerRef.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      onBeginDrag(activity.id, { x, y, width, height });
    });
  }, [activity.id, onBeginDrag]);

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = draggingId?.value === activity.id;
    return {
      opacity: hidden || isActive ? 0 : 1,
    };
  }, [activity.id, draggingId, hidden]);

  const gesture = React.useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(280)
      .maxDistance(24)
      .onStart(() => {
        runOnJS(beginDrag)();
      });

    let pan = Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((_e, stateManager) => {
        if (draggingId?.value === activity.id) {
          stateManager.activate();
        } else {
          stateManager.fail();
        }
      })
      .onUpdate((e) => {
        if (draggingId?.value !== activity.id) return;
        if (!dragTranslateX || !dragTranslateY) return;

        dragTranslateX.value = e.translationX;
        dragTranslateY.value = e.translationY;

        if (!hoveredColumnId || !containerX || !scrollX || !columnIds || !expandedProgress) return;
        const ids = columnIds.value ?? [];
        if (ids.length === 0) return;

        const w = interpolate(
          expandedProgress.value,
          [0, 1],
          [compactColumnWidth ?? 0, expandedColumnWidth ?? 0]
        );
        const stride = w + (columnGap ?? 0);

        // Convert finger absoluteX into the ScrollView content coordinate space.
        const localX =
          (e.absoluteX - containerX.value) +
          scrollX.value -
          (contentPadding ?? 0);

        const idx = Math.floor(localX / Math.max(1, stride));
        if (idx < 0 || idx >= ids.length) {
          hoveredColumnId.value = null;
        } else {
          hoveredColumnId.value = ids[idx] ?? null;
        }
      })
      .onEnd(() => {
        if (draggingId?.value !== activity.id) return;
        const dropId = hoveredColumnId?.value ?? null;
        if (onEndDrag) {
          runOnJS(onEndDrag)(activity.id, dropId);
        }
      });

    if (scrollableGesture) {
      pan = pan.simultaneousWithExternalGesture(scrollableGesture);
    }

    return Gesture.Simultaneous(longPress, pan);
  }, [
    activity.id,
    beginDrag,
    dragTranslateX,
    dragTranslateY,
    draggingId,
    hoveredColumnId,
    onEndDrag,
    scrollableGesture,
  ]);

  return (
    <View ref={containerRef} collapsable={false}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <KanbanCard
            activity={activity}
            goalTitle={goalTitle}
            visibleFields={visibleFields}
            onToggleComplete={isDragging ? undefined : onToggleComplete}
            onPress={isDragging ? undefined : onPress}
            isLoading={isLoading}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function KanbanColumn({
  title,
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
  isDragging = false,
  hiddenActivityId = null,
  isDropTarget = false,
  draggingId,
  dragTranslateX,
  dragTranslateY,
  hoveredColumnId,
  containerX,
  scrollX,
  columnIds,
  expandedProgress,
  compactColumnWidth,
  expandedColumnWidth,
  columnGap,
  contentPadding,
  onBeginDrag,
  onEndDrag,
  scrollableGesture,
}: KanbanColumnProps) {
  return (
    <View style={[styles.wrapper, width != null ? { width } : null]}>
      {/* Filled surface (like a filled input) */}
      <View style={[styles.surface, isDropTarget ? styles.surfaceDropTarget : null]}>
        {/* Column header (inside the column surface) */}
        <HStack style={styles.columnHeaderRow} alignItems="center" space="xs">
          <Text style={styles.columnHeaderText} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{activities.length}</Text>
          </View>
        </HStack>

        {/* Cards list */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled={!isDragging}
        >
          {activities.map((activity) => {
            const goalTitle = activity.goalId
              ? goalTitleById[activity.goalId]
              : undefined;
            const isLoading = enrichingActivityIds?.has(activity.id);
            const hidden = hiddenActivityId === activity.id;

            return (
              <DraggableKanbanCard
                key={activity.id}
                activity={activity}
                goalTitle={goalTitle}
                visibleFields={cardVisibleFields}
                isLoading={Boolean(isLoading)}
                isDragging={isDragging}
                hidden={hidden}
                draggingId={draggingId}
                dragTranslateX={dragTranslateX}
                dragTranslateY={dragTranslateY}
                hoveredColumnId={hoveredColumnId}
                containerX={containerX}
                scrollX={scrollX}
                columnIds={columnIds}
                expandedProgress={expandedProgress}
                compactColumnWidth={compactColumnWidth}
                expandedColumnWidth={expandedColumnWidth}
                columnGap={columnGap}
                contentPadding={contentPadding}
                onBeginDrag={onBeginDrag}
                onEndDrag={onEndDrag}
                scrollableGesture={scrollableGesture}
                onToggleComplete={() => onToggleComplete(activity.id)}
                onPress={() => onPressActivity(activity.id)}
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
  surface: {
    flex: 1,
    backgroundColor: colors.fieldFill,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  columnHeaderRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  columnHeaderText: {
    ...typography.bodySm,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    flex: 0,
    maxWidth: '70%',
  },
  countPill: {
    marginLeft: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countPillText: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  surfaceDropTarget: {
    borderColor: colors.accent,
    borderWidth: 2,
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
    borderTopWidth: 0,
    backgroundColor: colors.fieldFill,
  },
  addCardText: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.textSecondary,
  },
});


import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import type { RefObject } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HStack, Text } from '../../ui/primitives';
import { KanbanCard, type KanbanCardField } from './KanbanCard';
import { Icon, type IconName } from '../../ui/Icon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import type { Activity } from '../../domain/types';
import {
  getKanbanAutoScrollDelta,
  getKanbanDestinationStripIndex,
  type KanbanDropZoneMeasurement,
} from './kanbanInteraction';

export type KanbanColumnDragScroller = {
  setPointerY: (absoluteY: number | null) => void;
  remeasure: () => void;
};

export type KanbanColumnProps = {
  /** Stable id represented by this column. */
  columnId?: string;
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
  /** Opens the explicit destination picker for a card. */
  onRequestMove?: (activityId: string) => void;
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
  destinationStripX?: SharedValue<number>;
  destinationStripY?: SharedValue<number>;
  destinationStripWidth?: SharedValue<number>;
  destinationStripHeight?: SharedValue<number>;
  /** Exact card before which the transient insertion marker is rendered; null appends. */
  dropIndicatorBeforeActivityId?: string | null;
  /** Height of the lifted card, used to open a true card-sized insertion slot. */
  dropIndicatorHeight?: number;
  onDropZoneMeasurement?: (measurement: KanbanDropZoneMeasurement) => void;
  onDragScrollerChange?: (
    columnId: string,
    scroller: KanbanColumnDragScroller | null,
  ) => void;
  onDragMove?: (
    activityId: string,
    absoluteX: number,
    absoluteY: number,
  ) => void;
  onBeginDrag?: (
    activityId: string,
    cardLayout: { x: number; y: number; width: number; height: number },
  ) => void;
  onEndDrag?: (activityId: string, dropColumnId: string | null) => void;
};

function DraggableKanbanCard({
  activity,
  goalTitle,
  visibleFields,
  isLoading,
  isDragging,
  hidden,
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
  destinationStripX,
  destinationStripY,
  destinationStripWidth,
  destinationStripHeight,
  onCardNodeChange,
  onDragMove,
  onBeginDrag,
  onEndDrag,
  onToggleComplete,
  onPress,
  onRequestMove,
}: {
  activity: Activity;
  goalTitle?: string;
  visibleFields?: ReadonlySet<KanbanCardField>;
  isLoading: boolean;
  isDragging: boolean;
  hidden: boolean;
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
  destinationStripX?: SharedValue<number>;
  destinationStripY?: SharedValue<number>;
  destinationStripWidth?: SharedValue<number>;
  destinationStripHeight?: SharedValue<number>;
  onCardNodeChange?: (activityId: string, node: View | null) => void;
  onDragMove?: (
    activityId: string,
    absoluteX: number,
    absoluteY: number,
  ) => void;
  onBeginDrag?: (
    activityId: string,
    cardLayout: { x: number; y: number; width: number; height: number },
  ) => void;
  onEndDrag?: (activityId: string, dropColumnId: string | null) => void;
  onToggleComplete: () => void;
  onPress: () => void;
  onRequestMove?: () => void;
}) {
  const containerRef = React.useRef<View>(null);
  const dragArmed = useSharedValue(false);
  const dragMoved = useSharedValue(false);
  const dragTerminalHandled = useSharedValue(false);
  const dragAttemptRef = React.useRef(0);

  const setContainerNode = React.useCallback(
    (node: View | null) => {
      containerRef.current = node;
      onCardNodeChange?.(activity.id, node);
    },
    [activity.id, onCardNodeChange],
  );

  React.useEffect(
    () => () => {
      onCardNodeChange?.(activity.id, null);
    },
    [activity.id, onCardNodeChange],
  );

  const beginDrag = React.useCallback(() => {
    if (!onBeginDrag) return;
    const attempt = dragAttemptRef.current + 1;
    dragAttemptRef.current = attempt;
    const node = containerRef.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((x, y, width, height) => {
      if (dragAttemptRef.current !== attempt) return;
      onBeginDrag(activity.id, { x, y, width, height });
    });
  }, [activity.id, onBeginDrag]);

  const finishDrag = React.useCallback(
    (dropColumnId: string | null) => {
      // A native gesture can finalize before either measurement callback returns.
      // Invalidating the pending attempt prevents a released card from entering
      // drag mode a frame later with no gesture left to end it.
      dragAttemptRef.current += 1;
      onEndDrag?.(activity.id, dropColumnId);
    },
    [activity.id, onEndDrag],
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      // The React-owned `hidden` flag is committed in the same render that mounts
      // the lifted overlay. Hiding from the shared gesture value races ahead of
      // that render and leaves a visible blank where the card was.
      opacity: hidden ? 0 : 1,
      // Once the overlay exists, close the old source slot so the only gap on
      // the board is the live destination slot following the finger.
      height: hidden ? 0 : undefined,
      overflow: hidden ? 'hidden' : 'visible',
    };
  }, [hidden]);

  const gesture = React.useMemo(() => {
    return Gesture.Pan()
      .withTestId(`kanban-card-drag-${activity.id}`)
      .activateAfterLongPress(300)
      .onStart(() => {
        'worklet';
        // One delayed pan creates a clean fork: movement before the hold fails
        // this recognizer and scrolls normally; movement after it owns the card.
        dragArmed.value = true;
        dragMoved.value = false;
        dragTerminalHandled.value = false;
        runOnJS(beginDrag)();
      })
      .onUpdate((e) => {
        'worklet';
        if (!dragTranslateX || !dragTranslateY) return;

        dragTranslateX.value = e.translationX;
        dragTranslateY.value = e.translationY;
        if (Math.hypot(e.translationX, e.translationY) >= 8) {
          dragMoved.value = true;
        }
        if (onDragMove) {
          runOnJS(onDragMove)(activity.id, e.absoluteX, e.absoluteY);
        }

        if (
          !hoveredColumnId ||
          !containerX ||
          !scrollX ||
          !columnIds ||
          !expandedProgress
        )
          return;
        const ids = columnIds.value ?? [];
        if (ids.length === 0) return;

        const stripWidth = destinationStripWidth?.value ?? 0;
        const stripHeight = destinationStripHeight?.value ?? 0;
        const stripX = destinationStripX?.value ?? 0;
        const stripY = destinationStripY?.value ?? 0;
        const stripIndex = getKanbanDestinationStripIndex({
          absoluteX: e.absoluteX,
          absoluteY: e.absoluteY,
          stripX,
          stripY,
          stripWidth,
          stripHeight,
          destinationCount: ids.length,
        });

        if (stripIndex !== null) {
          hoveredColumnId.value = ids[stripIndex] ?? null;
          return;
        }

        const w = interpolate(
          expandedProgress.value,
          [0, 1],
          [compactColumnWidth ?? 0, expandedColumnWidth ?? 0],
        );
        const stride = w + (columnGap ?? 0);

        // Convert finger absoluteX into the ScrollView content coordinate space.
        const localX =
          e.absoluteX -
          containerX.value +
          scrollX.value -
          (contentPadding ?? 0);

        const idx = Math.floor(localX / Math.max(1, stride));
        if (idx < 0 || idx >= ids.length) {
          hoveredColumnId.value = null;
        } else {
          hoveredColumnId.value = ids[idx] ?? null;
        }
      })
      .onEnd((_event, success) => {
        'worklet';
        if (!dragArmed.value) return;
        dragTerminalHandled.value = true;
        const dropId =
          success && dragMoved.value ? (hoveredColumnId?.value ?? null) : null;
        runOnJS(finishDrag)(dropId);
      })
      .onFinalize(() => {
        'worklet';
        // onEnd is skipped when a recognizer fails before becoming ACTIVE.
        // Once a card has lifted, however, every terminal native state must
        // tear down board drag mode or the entire board remains disabled.
        if (dragArmed.value && !dragTerminalHandled.value) {
          runOnJS(finishDrag)(null);
        }
        dragArmed.value = false;
        dragMoved.value = false;
        dragTerminalHandled.value = false;
      });
  }, [
    activity.id,
    beginDrag,
    destinationStripHeight,
    destinationStripWidth,
    destinationStripX,
    destinationStripY,
    dragArmed,
    dragMoved,
    dragTerminalHandled,
    dragTranslateX,
    dragTranslateY,
    finishDrag,
    hoveredColumnId,
    onDragMove,
  ]);

  return (
    <View ref={setContainerNode} collapsable={false}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          testID={`kanban-card-source-${activity.id}`}
          style={animatedStyle}
        >
          <KanbanCard
            activity={activity}
            goalTitle={goalTitle}
            visibleFields={visibleFields}
            onToggleComplete={isDragging ? undefined : onToggleComplete}
            onPress={isDragging ? undefined : onPress}
            onRequestMove={onRequestMove}
            isLoading={isLoading}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function DropInsertionMarker({
  testID,
  height,
}: {
  testID: string;
  height: number;
}) {
  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.dropIndicator, { height }]}
      entering={FadeIn.duration(90).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(90).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(130).reduceMotion(ReduceMotion.System)}
    >
      <View style={styles.dropIndicatorLine} />
      <View style={styles.dropIndicatorLabelPill}>
        <Text style={styles.dropIndicatorLabel}>Drop here</Text>
      </View>
      <View style={styles.dropIndicatorLine} />
    </Animated.View>
  );
}

function measureNodeInWindow(
  node: View | null,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!node?.measureInWindow) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) =>
      resolve({ x, y, width, height }),
    );
  });
}

export function KanbanColumn({
  columnId,
  title,
  accentColor: _accentColor = colors.accent,
  activities,
  cardVisibleFields,
  goalTitleById,
  enrichingActivityIds,
  onToggleComplete,
  onTogglePriority,
  onPressActivity,
  onRequestMove,
  onAddCard,
  addCardAnchorRef,
  width,
  isExpanded: _isExpanded = true,
  isDragging = false,
  hiddenActivityId = null,
  isDropTarget = false,
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
  destinationStripX,
  destinationStripY,
  destinationStripWidth,
  destinationStripHeight,
  dropIndicatorBeforeActivityId,
  dropIndicatorHeight = 72,
  onDropZoneMeasurement,
  onDragScrollerChange,
  onDragMove,
  onBeginDrag,
  onEndDrag,
}: KanbanColumnProps) {
  const surfaceRef = React.useRef<View>(null);
  const scrollViewportRef = React.useRef<View>(null);
  const listRef = React.useRef<FlatList<Activity>>(null);
  const cardNodeByIdRef = React.useRef(new Map<string, View>());
  const resolvedColumnId = columnId ?? title;
  const scrollOffsetRef = React.useRef(0);
  const contentHeightRef = React.useRef(0);
  const viewportHeightRef = React.useRef(0);
  const viewportTopRef = React.useRef(0);
  const dragPointerYRef = React.useRef<number | null>(null);
  const autoScrollFrameRef = React.useRef<number | null>(null);
  const measurementFrameRef = React.useRef<number | null>(null);
  const measurementInFlightRef = React.useRef(false);
  const measurementPendingRef = React.useRef(false);
  const resolvedDropIndicatorHeight = Math.max(56, dropIndicatorHeight);

  const handleCardNodeChange = React.useCallback(
    (activityId: string, node: View | null) => {
      if (node) cardNodeByIdRef.current.set(activityId, node);
      else cardNodeByIdRef.current.delete(activityId);
    },
    [],
  );

  const measureDropZone = React.useCallback(async () => {
    if (!onDropZoneMeasurement) return;
    const [surface, content] = await Promise.all([
      measureNodeInWindow(surfaceRef.current),
      measureNodeInWindow(scrollViewportRef.current),
    ]);
    if (!surface || !content) return;
    viewportTopRef.current = content.y;
    viewportHeightRef.current = content.height;
    const measuredItems = await Promise.all(
      activities.map(async (activity) => {
        const layout = await measureNodeInWindow(
          cardNodeByIdRef.current.get(activity.id) ?? null,
        );
        const hasIndicatorBefore =
          dropIndicatorBeforeActivityId === activity.id;
        const indicatorExtent = hasIndicatorBefore
          ? resolvedDropIndicatorHeight + spacing.sm
          : 0;
        return layout
          ? {
              activityId: activity.id,
              x: layout.x,
              width: layout.width,
              // The marker is a sibling before the card inside the same row.
              // Remove its temporary extent so placement and settle coordinates
              // describe the final list after the marker disappears.
              top: layout.y - indicatorExtent,
              bottom: layout.y + layout.height - indicatorExtent,
            }
          : null;
      }),
    );
    onDropZoneMeasurement({
      columnId: resolvedColumnId,
      ...surface,
      contentX: content.x,
      contentY: content.y,
      contentWidth: content.width,
      contentHeight: content.height,
      items: measuredItems.filter((item): item is NonNullable<typeof item> =>
        Boolean(item),
      ),
    });
  }, [
    activities,
    dropIndicatorBeforeActivityId,
    onDropZoneMeasurement,
    resolvedColumnId,
    resolvedDropIndicatorHeight,
  ]);

  const scheduleDropZoneMeasurement = React.useCallback(
    function scheduleDropZoneMeasurement() {
      if (!isDragging || measurementFrameRef.current !== null) return;
      if (measurementInFlightRef.current) {
        measurementPendingRef.current = true;
        return;
      }
      measurementFrameRef.current = requestAnimationFrame(() => {
        measurementFrameRef.current = null;
        measurementInFlightRef.current = true;
        void measureDropZone().finally(() => {
          measurementInFlightRef.current = false;
          if (!measurementPendingRef.current) return;
          measurementPendingRef.current = false;
          scheduleDropZoneMeasurement();
        });
      });
    },
    [isDragging, measureDropZone],
  );

  const runAutoScrollFrame = React.useCallback(
    function runAutoScrollFrame() {
      autoScrollFrameRef.current = null;
      const pointerY = dragPointerYRef.current;
      if (!isDragging || pointerY === null) return;

      const delta = getKanbanAutoScrollDelta({
        pointer: pointerY,
        viewportStart: viewportTopRef.current,
        viewportEnd: viewportTopRef.current + viewportHeightRef.current,
        edgeSize: 72,
        maxStep: 18,
      });
      const maxOffset = Math.max(
        0,
        contentHeightRef.current - viewportHeightRef.current,
      );
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, scrollOffsetRef.current + delta),
      );
      if (Math.abs(nextOffset - scrollOffsetRef.current) >= 0.5) {
        scrollOffsetRef.current = nextOffset;
        listRef.current?.scrollToOffset({
          offset: nextOffset,
          animated: false,
        });
        scheduleDropZoneMeasurement();
      }
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollFrame);
    },
    [isDragging, scheduleDropZoneMeasurement],
  );

  const setDragPointerY = React.useCallback(
    (absoluteY: number | null) => {
      dragPointerYRef.current = absoluteY;
      if (absoluteY === null) {
        if (autoScrollFrameRef.current !== null) {
          cancelAnimationFrame(autoScrollFrameRef.current);
          autoScrollFrameRef.current = null;
        }
        return;
      }
      if (autoScrollFrameRef.current === null) {
        autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollFrame);
      }
    },
    [runAutoScrollFrame],
  );

  const dragScroller = React.useMemo<KanbanColumnDragScroller>(
    () => ({
      setPointerY: setDragPointerY,
      remeasure: scheduleDropZoneMeasurement,
    }),
    [scheduleDropZoneMeasurement, setDragPointerY],
  );

  React.useEffect(() => {
    onDragScrollerChange?.(resolvedColumnId, dragScroller);
    return () => onDragScrollerChange?.(resolvedColumnId, null);
  }, [dragScroller, onDragScrollerChange, resolvedColumnId]);

  React.useEffect(() => {
    if (isDragging) scheduleDropZoneMeasurement();
    else setDragPointerY(null);
    return () => {
      setDragPointerY(null);
      measurementPendingRef.current = false;
      if (measurementFrameRef.current !== null) {
        cancelAnimationFrame(measurementFrameRef.current);
        measurementFrameRef.current = null;
      }
    };
  }, [isDragging, scheduleDropZoneMeasurement, setDragPointerY]);

  const handleListLayout = React.useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
    requestAnimationFrame(() => {
      void measureNodeInWindow(scrollViewportRef.current).then((layout) => {
        if (!layout) return;
        viewportTopRef.current = layout.y;
        viewportHeightRef.current = layout.height;
      });
    });
  }, []);

  const handleListScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      scheduleDropZoneMeasurement();
    },
    [scheduleDropZoneMeasurement],
  );

  const hasDropIndicator = dropIndicatorBeforeActivityId !== undefined;

  return (
    <View style={[styles.wrapper, width != null ? { width } : null]}>
      {/* Filled surface (like a filled input) */}
      <View
        ref={surfaceRef}
        collapsable={false}
        style={[styles.surface, isDropTarget ? styles.surfaceDropTarget : null]}
      >
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
        <View
          ref={scrollViewportRef}
          collapsable={false}
          style={styles.scrollArea}
          onLayout={handleListLayout}
        >
          <FlatList
            ref={listRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEnabled={!isDragging}
            scrollEventThrottle={16}
            onScroll={handleListScroll}
            onContentSizeChange={(_width, height) => {
              contentHeightRef.current = height;
            }}
            data={activities}
            keyExtractor={(activity) => activity.id}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            renderItem={({ item: activity }) => {
              const goalTitle = activity.goalId
                ? goalTitleById[activity.goalId]
                : undefined;
              const isLoading = enrichingActivityIds?.has(activity.id);
              const hidden = hiddenActivityId === activity.id;

              return (
                <Animated.View
                  layout={LinearTransition.duration(130).reduceMotion(
                    ReduceMotion.System,
                  )}
                >
                  {dropIndicatorBeforeActivityId === activity.id ? (
                    <DropInsertionMarker
                      testID={`kanban-drop-indicator-before-${activity.id}`}
                      height={resolvedDropIndicatorHeight}
                    />
                  ) : null}
                  <DraggableKanbanCard
                    activity={activity}
                    goalTitle={goalTitle}
                    visibleFields={cardVisibleFields}
                    isLoading={Boolean(isLoading)}
                    isDragging={isDragging}
                    hidden={hidden}
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
                    destinationStripX={destinationStripX}
                    destinationStripY={destinationStripY}
                    destinationStripWidth={destinationStripWidth}
                    destinationStripHeight={destinationStripHeight}
                    onCardNodeChange={handleCardNodeChange}
                    onDragMove={onDragMove}
                    onBeginDrag={onBeginDrag}
                    onEndDrag={onEndDrag}
                    onToggleComplete={() => onToggleComplete(activity.id)}
                    onPress={() => onPressActivity(activity.id)}
                    onRequestMove={
                      onRequestMove
                        ? () => onRequestMove(activity.id)
                        : undefined
                    }
                  />
                </Animated.View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                {hasDropIndicator ? (
                  <DropInsertionMarker
                    testID="kanban-drop-indicator-empty"
                    height={resolvedDropIndicatorHeight}
                  />
                ) : (
                  <>
                    <Icon name="inbox" size={24} color={colors.gray300} />
                    <Text style={styles.emptyText}>No to-dos</Text>
                  </>
                )}
              </View>
            }
            ListFooterComponent={
              activities.length > 0 &&
              dropIndicatorBeforeActivityId === null ? (
                <DropInsertionMarker
                  testID="kanban-drop-indicator-append"
                  height={resolvedDropIndicatorHeight}
                />
              ) : null
            }
          />
        </View>

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
    borderWidth: 1,
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
  dropIndicator: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.quiltBlue,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  dropIndicatorLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.quiltBlue,
  },
  dropIndicatorLabelPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.quiltBlue,
  },
  dropIndicatorLabel: {
    ...typography.bodySm,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.semibold,
    color: colors.canvas,
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

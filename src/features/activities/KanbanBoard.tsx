import React from 'react';
import type { RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KanbanColumn } from './KanbanColumn';
import { Icon, type IconName } from '../../ui/Icon';
import { HStack, Text } from '../../ui/primitives';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import type { Activity, Goal, KanbanGroupBy } from '../../domain/types';
import { KanbanCard, type KanbanCardField } from './KanbanCard';

export type KanbanBoardProps = {
  /**
   * Activities to display in the board.
   */
  activities: Activity[];
  /**
   * Goals for grouping and metadata.
   */
  goals: Goal[];
  /**
   * How to group activities into columns.
   */
  groupBy: KanbanGroupBy;
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
   * Handler for moving an activity to a different Kanban column (based on groupBy).
   * The board computes the destination column id; the caller applies the mutation.
   */
  onMoveActivity?: (activityId: string, params: { groupBy: KanbanGroupBy; toColumnId: string }) => void;
  /**
   * Handler for adding a new activity.
   */
  onAddActivity?: () => void;
  /**
   * Optional anchor ref for the first visible "Add card" row.
   * Used by ActivitiesScreen coachmarks when Kanban is active and the workspace is empty.
   */
  addCardAnchorRef?: RefObject<any>;
  /**
   * Which fields should be visible on each card.
   */
  cardVisibleFields?: ReadonlySet<KanbanCardField>;
  /**
   * Optional extra bottom padding for scroll content.
   */
  extraBottomPadding?: number;
  /**
   * Optional controlled expanded state. When provided, the board will use this
   * value instead of its internal state.
   */
  isExpanded?: boolean;
  /**
   * Called whenever the board toggles expanded/collapsed.
   */
  onExpandedChange?: (isExpanded: boolean) => void;
};

type ColumnConfig = {
  id: string;
  title: string;
  iconName?: IconName;
  accentColor: string;
  activities: Activity[];
};

function measureInWindowAsync(node: any): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const n = node?.getNode?.() ?? node;
    if (!n?.measureInWindow) {
      resolve(null);
      return;
    }
    n.measureInWindow((x: number, y: number, width: number, height: number) => {
      resolve({ x, y, width, height });
    });
  });
}

/**
 * Status-based column configuration.
 */
const STATUS_COLUMNS: Array<{
  id: string;
  title: string;
  iconName?: IconName;
  accentColor: string;
  statusValues: string[];
}> = [
  {
    id: 'planned',
    title: 'To Do',
    iconName: 'checklist',
    accentColor: colors.quiltBlue,
    statusValues: ['planned'],
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    iconName: 'play',
    accentColor: colors.turmeric,
    statusValues: ['in_progress'],
  },
  {
    id: 'done',
    title: 'Done',
    iconName: 'check',
    accentColor: colors.success,
    statusValues: ['done'],
  },
  {
    id: 'skipped',
    title: 'Skipped',
    iconName: 'pause',
    accentColor: colors.gray400,
    statusValues: ['skipped'],
  },
  {
    id: 'cancelled',
    title: 'Cancelled',
    iconName: 'close',
    accentColor: colors.gray400,
    statusValues: ['cancelled'],
  },
];

/**
 * Priority-based column configuration.
 */
const PRIORITY_COLUMNS: Array<{
  id: string;
  title: string;
  iconName?: IconName;
  accentColor: string;
  priorityMatch: (priority: number | null | undefined) => boolean;
}> = [
  {
    id: 'starred',
    title: 'Starred',
    iconName: 'starFilled',
    accentColor: colors.turmeric,
    priorityMatch: (p) => p === 1,
  },
  {
    id: 'normal',
    title: 'Normal',
    iconName: 'star',
    accentColor: colors.quiltBlue,
    priorityMatch: (p) => p !== 1,
  },
];

function groupByStatus(activities: Activity[]): ColumnConfig[] {
  return STATUS_COLUMNS.map((col) => ({
    id: col.id,
    title: col.title,
    iconName: col.iconName,
    accentColor: col.accentColor,
    activities: activities.filter((a) => col.statusValues.includes(a.status)),
  }));
}

function groupByPriority(activities: Activity[]): ColumnConfig[] {
  return PRIORITY_COLUMNS.map((col) => ({
    id: col.id,
    title: col.title,
    iconName: col.iconName,
    accentColor: col.accentColor,
    activities: activities.filter((a) => col.priorityMatch(a.priority)),
  }));
}

function groupByGoal(activities: Activity[], goals: Goal[]): ColumnConfig[] {
  // Create a column for each goal that has activities
  const goalIds = new Set(activities.map((a) => a.goalId).filter(Boolean));
  const goalColumns: ColumnConfig[] = [];

  // Add columns for goals with activities
  goals.forEach((goal) => {
    if (goalIds.has(goal.id)) {
      goalColumns.push({
        id: goal.id,
        title: goal.title,
        iconName: 'target',
        // Goals don't have semantic colors; keep the accent neutral.
        accentColor: colors.gray300,
        activities: activities.filter((a) => a.goalId === goal.id),
      });
    }
  });

  // Add "No Goal" column for unlinked activities
  const unlinkedActivities = activities.filter((a) => !a.goalId);
  if (unlinkedActivities.length > 0) {
    goalColumns.push({
      id: 'no-goal',
      title: 'No Goal',
      iconName: 'inbox',
      accentColor: colors.gray400,
      activities: unlinkedActivities,
    });
  }

  return goalColumns;
}

function groupByPhase(activities: Activity[]): ColumnConfig[] {
  // Collect unique phases
  const phaseSet = new Set<string | null>();
  activities.forEach((a) => {
    phaseSet.add(a.phase ?? null);
  });

  const columns: ColumnConfig[] = [];
  const phases = Array.from(phaseSet).sort((a, b) => {
    // Null/empty phases go last
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });

  phases.forEach((phase, index) => {
    const phaseColors = [
      colors.quiltBlue,
      colors.turmeric,
      colors.madder,
      colors.moss,
      colors.accent,
    ];

    columns.push({
      id: phase ?? 'no-phase',
      title: phase || 'No Phase',
      iconName: phase ? 'layers' : 'inbox',
      accentColor: phaseColors[index % phaseColors.length],
      activities: activities.filter((a) =>
        phase === null ? !a.phase : a.phase === phase
      ),
    });
  });

  return columns;
}

export function KanbanBoard({
  activities,
  goals,
  groupBy,
  enrichingActivityIds,
  onToggleComplete,
  onTogglePriority,
  onPressActivity,
  onMoveActivity,
  onAddActivity,
  addCardAnchorRef,
  cardVisibleFields,
  extraBottomPadding = 0,
  isExpanded: controlledExpanded,
  onExpandedChange,
}: KanbanBoardProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const containerRef = React.useRef<View>(null);
  
  // Expanded = single column fills most of screen, Compact = multiple columns visible
  const [uncontrolledExpanded, setUncontrolledExpanded] = React.useState(false);
  const isExpanded = controlledExpanded ?? uncontrolledExpanded;
  const setExpanded = React.useCallback(
    (next: boolean) => {
      // Only update internal state when uncontrolled.
      if (controlledExpanded === undefined) {
        setUncontrolledExpanded(next);
      }
      onExpandedChange?.(next);
    },
    [controlledExpanded, onExpandedChange],
  );
  // Paging/snap behavior is staged so width can animate smoothly without ScrollView jumping.
  const [pagingEnabled, setPagingEnabled] = React.useState(false);
  const expandedProgress = useSharedValue(0);

  // Drag state (cross-column)
  const draggingId = useSharedValue<string | null>(null);
  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const dragWidth = useSharedValue(0);
  const hoveredColumnId = useSharedValue<string | null>(null);
  const containerX = useSharedValue(0);
  const containerY = useSharedValue(0);
  const scrollX = useSharedValue(0);
  const columnIds = useSharedValue<string[]>([]);

  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedActivityId, setDraggedActivityId] = React.useState<string | null>(null);
  const [hoveredColumnIdState, setHoveredColumnIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  
  // Calculate column width based on view mode
  // Expanded: ~90% screen width for single-column focus
  // Compact: ~280px for multi-column overview (like Tasku)
  const compactColumnWidth = Math.min(300, screenWidth * 0.8);
  const expandedColumnWidth = screenWidth - spacing.lg * 2;
  const columnWidth = isExpanded ? expandedColumnWidth : compactColumnWidth;

  const columnWidthAnimatedStyle = useAnimatedStyle(() => {
    const w = interpolate(expandedProgress.value, [0, 1], [compactColumnWidth, expandedColumnWidth]);
    return { width: w };
  }, [compactColumnWidth, expandedColumnWidth]);

  // Build goal lookup for metadata
  const goalTitleById = React.useMemo(() => {
    const lookup: Record<string, string> = {};
    goals.forEach((g) => {
      lookup[g.id] = g.title;
    });
    return lookup;
  }, [goals]);

  const activityById = React.useMemo(() => {
    const map = new Map<string, Activity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  // Group activities into columns
  const columns = React.useMemo(() => {
    switch (groupBy) {
      case 'status':
        return groupByStatus(activities);
      case 'priority':
        return groupByPriority(activities);
      case 'goal':
        return groupByGoal(activities, goals);
      case 'phase':
        return groupByPhase(activities);
      default:
        return groupByStatus(activities);
    }
  }, [activities, goals, groupBy]);

  // Pagination dots for expanded view
  const [activeColumnIndex, setActiveColumnIndex] = React.useState(0);
  const scrollViewRef = React.useRef<any>(null);

  // Allow the board's horizontal ScrollView gesture to run simultaneously with
  // the per-card drag gesture so users can swipe/page while dragging.
  const nativeScrollGesture = React.useMemo(() => Gesture.Native(), []);

  React.useEffect(() => {
    columnIds.value = columns.map((c) => c.id);
  }, [columns, columnIds]);

  const startDrag = React.useCallback(
    async (activityId: string, cardLayout: { x: number; y: number; width: number; height: number }) => {
      // Mark dragging immediately for scroll disabling.
      setIsDragging(true);
      setDraggedActivityId(activityId);
      draggingId.value = activityId;
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      hoveredColumnId.value = null;
      setHoveredColumnIdState(null);

      // Measure container once; drop target hit-testing uses scroll offset + column width math (no per-column measuring).
      requestAnimationFrame(async () => {
        const containerLayout = await measureInWindowAsync(containerRef.current);
        if (!containerLayout) return;
        containerX.value = containerLayout.x;
        containerY.value = containerLayout.y;
        dragStartX.value = cardLayout.x - containerLayout.x;
        dragStartY.value = cardLayout.y - containerLayout.y;
        dragWidth.value = cardLayout.width;
      });
    },
    [
      containerX,
      containerY,
      draggingId,
      dragStartX,
      dragStartY,
      dragTranslateX,
      dragTranslateY,
      dragWidth,
      hoveredColumnId,
      hoveredColumnIdState,
    ],
  );

  const endDrag = React.useCallback(() => {
    setIsDragging(false);
    setDraggedActivityId(null);
    setHoveredColumnIdState(null);
    draggingId.value = null;
    hoveredColumnId.value = null;
  }, [draggingId, hoveredColumnId]);

  const handleDrop = React.useCallback(
    (activityId: string, toColumnId: string | null) => {
      if (toColumnId) {
        onMoveActivity?.(activityId, { groupBy, toColumnId });
      }
      endDrag();
    },
    [endDrag, groupBy, onMoveActivity],
  );

  useAnimatedReaction(
    () => hoveredColumnId.value,
    (next, prev) => {
      if (next === prev) return;
      runOnJS(setHoveredColumnIdState)(next ?? null);
    },
    [hoveredColumnId],
  );

  const toggleExpanded = React.useCallback(() => {
    const next = !isExpanded;
    const ANIM_MS = 260;

    // Always disable paging during the width tween so snap math doesn't fight the animation.
    setPagingEnabled(false);

    // Animate the explicit width value (LayoutAnimation is unreliable inside horizontal ScrollView).
    expandedProgress.value = withTiming(next ? 1 : 0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });

    setExpanded(next);

    if (next) {
      // Enable paging after the width tween settles, then snap to active column.
      setTimeout(() => {
        setPagingEnabled(true);
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({
            x: activeColumnIndex * (expandedColumnWidth + spacing.md),
            animated: true,
          });
        });
      }, ANIM_MS + 30);
    }
  }, [activeColumnIndex, expandedColumnWidth, isExpanded, expandedProgress, setExpanded]);

  const handleScroll = React.useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    if (pagingEnabled) {
      const index = Math.round(offsetX / columnWidth);
      setActiveColumnIndex(Math.max(0, Math.min(index, columns.length - 1)));
    }
  }, [pagingEnabled, columnWidth, columns.length, scrollX]);

  const dragOverlayAnimatedStyle = useAnimatedStyle(() => {
    if (!draggingId.value) return { opacity: 0 };
    return {
      opacity: 1,
      transform: [
        { translateX: dragStartX.value + dragTranslateX.value },
        { translateY: dragStartY.value + dragTranslateY.value },
        { scale: 1.02 },
      ],
    };
  }, [draggingId, dragStartX, dragStartY, dragTranslateX, dragTranslateY]);

  const dragOverlaySizeStyle = useAnimatedStyle(() => {
    return { width: dragWidth.value };
  }, [dragWidth]);

  const draggedActivity = draggedActivityId ? activityById.get(draggedActivityId) ?? null : null;
  const draggedGoalTitle = draggedActivity?.goalId ? goalTitleById[draggedActivity.goalId] : undefined;
  const draggedIsLoading = draggedActivity?.id ? Boolean(enrichingActivityIds?.has(draggedActivity.id)) : false;

  return (
    <View ref={containerRef} collapsable={false} style={styles.container}>
      {/* Kanban columns */}
      <GestureDetector gesture={nativeScrollGesture}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: extraBottomPadding + insets.bottom + spacing.lg }, // space for safe area + overlays
          ]}
          showsHorizontalScrollIndicator={false}
          // Keep horizontal paging/swiping enabled while dragging; drag gesture is configured
          // to run simultaneously with this native scroll gesture.
          scrollEnabled
          pagingEnabled={pagingEnabled}
          snapToInterval={pagingEnabled ? columnWidth + spacing.md : undefined}
          decelerationRate={pagingEnabled ? 'fast' : 'normal'}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {columns.map((column, idx) => (
            <Animated.View
              // eslint-disable-next-line react/no-array-index-key
              key={`kanban-col-wrap-${column.id}`}
              style={[styles.columnWrapper, columnWidthAnimatedStyle] as any}
            >
              <KanbanColumn
                key={column.id}
                title={column.title}
                iconName={column.iconName}
                accentColor={column.accentColor}
                activities={column.activities}
                goalTitleById={goalTitleById}
                enrichingActivityIds={enrichingActivityIds}
                onToggleComplete={onToggleComplete}
                onTogglePriority={onTogglePriority}
                onPressActivity={onPressActivity}
                onAddCard={onAddActivity}
                addCardAnchorRef={idx === 0 ? addCardAnchorRef : undefined}
                cardVisibleFields={cardVisibleFields}
                width={undefined}
                isExpanded={isExpanded}
                isDragging={isDragging}
                hiddenActivityId={draggedActivityId}
                isDropTarget={isDragging && hoveredColumnIdState === column.id}
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
                columnGap={spacing.md}
                contentPadding={spacing.md}
                onBeginDrag={startDrag}
                onEndDrag={handleDrop}
                scrollableGesture={nativeScrollGesture}
              />
            </Animated.View>
          ))}
        </Animated.ScrollView>
      </GestureDetector>

      {/* Drag overlay */}
      {draggedActivity && (
        <Animated.View
          pointerEvents="none"
          style={[styles.dragOverlay, dragOverlaySizeStyle, dragOverlayAnimatedStyle] as any}
        >
          <View style={styles.dragOverlayInner}>
            <KanbanCard
              activity={draggedActivity}
              goalTitle={draggedGoalTitle}
              visibleFields={cardVisibleFields}
              onToggleComplete={undefined}
              onPress={undefined}
              isLoading={draggedIsLoading}
            />
          </View>
        </Animated.View>
      )}

      {/* Pagination dots (minimal overlay) */}
      {pagingEnabled && columns.length > 1 && (
        <View style={[styles.paginationOverlay, { bottom: insets.bottom + spacing.xs }]}>
          <HStack alignItems="center" justifyContent="center" style={styles.pagination}>
            {columns.map((col, index) => (
              <View
                key={col.id}
                style={[
                  styles.paginationDot,
                  index === activeColumnIndex && styles.paginationDotActive,
                  // Keep dots neutral in expanded view (no per-column accent colors).
                  { backgroundColor: index === activeColumnIndex ? colors.gray600 : colors.gray300 },
                ]}
              />
            ))}
          </HStack>
        </View>
      )}

      {/* Expand/collapse FAB */}
      <Pressable
        style={[
          styles.expandFab,
          {
            bottom: insets.bottom + spacing.lg,
            right: spacing.lg,
          },
        ]}
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Switch to compact view' : 'Switch to expanded view'}
      >
        <Icon name={isExpanded ? 'collapse' : 'expand'} size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingRight: spacing.lg,
    minHeight: '100%',
    alignItems: 'stretch',
  },
  columnWrapper: {
    marginRight: spacing.md,
    height: '100%',
    alignSelf: 'stretch',
  },
  dragOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 999,
    elevation: 20,
  },
  dragOverlayInner: {
    flex: 1,
  },
  paginationOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pagination: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: colors.textPrimary,
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paginationDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expandFab: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.textPrimary,
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
});


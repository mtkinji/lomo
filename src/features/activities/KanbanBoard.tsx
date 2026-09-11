import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import type { RefObject } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KanbanColumn, type KanbanColumnDragScroller } from './KanbanColumn';
import { Icon, type IconName } from '../../ui/Icon';
import { HStack, Text } from '../../ui/primitives';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, fonts } from '../../theme/typography';
import type { Activity, Goal, KanbanGroupBy } from '../../domain/types';
import { KanbanCard, type KanbanCardField } from './KanbanCard';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { HapticsService } from '../../services/HapticsService';
import {
  getAccessibleAnimationDuration,
  useAccessibilityPreferences,
} from '../../ui/hooks/useAccessibilityPreferences';
import {
  getKanbanAutoScrollDelta,
  getKanbanDestinationStripIndex,
  getKanbanDropMode,
  resolveKanbanDropCommitColumnId,
  resolveKanbanDropPlacement,
  resolveKanbanDropSettleTarget,
  type KanbanDropPlacement,
  type KanbanDropZoneMeasurement,
} from './kanbanInteraction';

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
  onMoveActivity?: (
    activityId: string,
    params: {
      groupBy: KanbanGroupBy;
      toColumnId: string;
      toColumnTitle?: string;
      /** Exact manual-order slot; null appends and undefined leaves active sorting in control. */
      beforeActivityId?: string | null;
    },
  ) => void;
  /** Whether the current view is using manual order rather than an explicit sort. */
  canReorder?: boolean;
  /** Explains why a same-column drag cannot reorder while an explicit sort is active. */
  onReorderUnavailable?: () => void;
  /**
   * Handler for adding a new activity.
   */
  onAddActivity?: (params: {
    groupBy: KanbanGroupBy;
    toColumnId: string;
    toColumnTitle: string;
  }) => void;
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

function measureInWindowAsync(
  node: any,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
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
        phase === null ? !a.phase : a.phase === phase,
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
  canReorder = true,
  onReorderUnavailable,
  onAddActivity,
  addCardAnchorRef,
  cardVisibleFields,
  extraBottomPadding = 0,
  isExpanded: controlledExpanded,
  onExpandedChange,
}: KanbanBoardProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { reduceMotionEnabled } = useAccessibilityPreferences();
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
  const dragLiftProgress = useSharedValue(0);
  const dragSettleOpacity = useSharedValue(1);
  const hoveredColumnId = useSharedValue<string | null>(null);
  const containerX = useSharedValue(0);
  const containerY = useSharedValue(0);
  const scrollX = useSharedValue(0);
  const columnIds = useSharedValue<string[]>([]);
  const destinationStripX = useSharedValue(0);
  const destinationStripY = useSharedValue(0);
  const destinationStripWidth = useSharedValue(0);
  const destinationStripHeight = useSharedValue(0);

  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedActivityId, setDraggedActivityId] = React.useState<
    string | null
  >(null);
  const [draggedSourceColumnId, setDraggedSourceColumnId] = React.useState<
    string | null
  >(null);
  const [draggedCardHeight, setDraggedCardHeight] = React.useState(72);
  const [hoveredColumnIdState, setHoveredColumnIdState] = React.useState<
    string | null
  >(null);
  const [movePickerActivityId, setMovePickerActivityId] = React.useState<
    string | null
  >(null);
  const destinationStripRef = React.useRef<View>(null);
  const dragSessionRef = React.useRef(0);
  const dropMeasurementsRef = React.useRef(
    new Map<string, KanbanDropZoneMeasurement>(),
  );
  const dragScrollerByColumnRef = React.useRef(
    new Map<string, KanbanColumnDragScroller>(),
  );
  const dragPointerRef = React.useRef<{
    activityId: string;
    absoluteX: number;
    absoluteY: number;
  } | null>(null);
  const dragActiveRef = React.useRef(false);
  const settlingRef = React.useRef(false);
  const containerLayoutRef = React.useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const boardContentWidthRef = React.useRef(0);
  const boardScrollOffsetRef = React.useRef(0);
  const boardAutoScrollFrameRef = React.useRef<number | null>(null);
  const dropPlacementRef = React.useRef<KanbanDropPlacement | null>(null);
  const [dropPlacement, setDropPlacement] =
    React.useState<KanbanDropPlacement | null>(null);

  const updateDropPlacement = React.useCallback(
    (next: KanbanDropPlacement | null) => {
      const previous = dropPlacementRef.current;
      if (
        previous?.columnId === next?.columnId &&
        previous?.beforeActivityId === next?.beforeActivityId
      )
        return;
      dropPlacementRef.current = next;
      setDropPlacement(next);
    },
    [],
  );

  React.useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
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
    const w = interpolate(
      expandedProgress.value,
      [0, 1],
      [compactColumnWidth, expandedColumnWidth],
    );
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

  const dropColumns = React.useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        activityIds: column.activities.map((activity) => activity.id),
      })),
    [columns],
  );

  // Pagination dots for expanded view
  const [activeColumnIndex, setActiveColumnIndex] = React.useState(0);
  const scrollViewRef = React.useRef<any>(null);

  const stopColumnAutoScroll = React.useCallback(() => {
    dragScrollerByColumnRef.current.forEach((scroller) =>
      scroller.setPointerY(null),
    );
  }, []);

  const handleDragScrollerChange = React.useCallback(
    (columnId: string, scroller: KanbanColumnDragScroller | null) => {
      if (scroller) dragScrollerByColumnRef.current.set(columnId, scroller);
      else dragScrollerByColumnRef.current.delete(columnId);
    },
    [],
  );

  const resolveDropAtPointer = React.useCallback(
    (pointer: { activityId: string; absoluteX: number; absoluteY: number }) => {
      const strip =
        destinationStripWidth.value > 0 && destinationStripHeight.value > 0
          ? {
              x: destinationStripX.value,
              y: destinationStripY.value,
              width: destinationStripWidth.value,
              height: destinationStripHeight.value,
            }
          : null;
      const stripIndex = strip
        ? getKanbanDestinationStripIndex({
            absoluteX: pointer.absoluteX,
            absoluteY: pointer.absoluteY,
            stripX: strip.x,
            stripY: strip.y,
            stripWidth: strip.width,
            stripHeight: strip.height,
            destinationCount: dropColumns.length,
          })
        : null;
      const next = resolveKanbanDropPlacement({
        absoluteX: pointer.absoluteX,
        absoluteY: pointer.absoluteY,
        activityId: pointer.activityId,
        canReorder,
        columns: dropColumns,
        measurements: Array.from(dropMeasurementsRef.current.values()),
        destinationStrip: strip,
      });
      hoveredColumnId.value = next?.columnId ?? null;
      updateDropPlacement(next);
      dragScrollerByColumnRef.current.forEach((scroller, columnId) => {
        scroller.setPointerY(
          stripIndex === null && next?.columnId === columnId
            ? pointer.absoluteY
            : null,
        );
      });
    },
    [
      canReorder,
      destinationStripHeight,
      destinationStripWidth,
      destinationStripX,
      destinationStripY,
      dropColumns,
      hoveredColumnId,
      updateDropPlacement,
    ],
  );

  const shiftDropMeasurementsHorizontally = React.useCallback(
    (scrollDelta: number) => {
      if (scrollDelta === 0) return;
      dropMeasurementsRef.current.forEach((measurement, columnId) => {
        dropMeasurementsRef.current.set(columnId, {
          ...measurement,
          x: measurement.x - scrollDelta,
          contentX:
            measurement.contentX === undefined
              ? undefined
              : measurement.contentX - scrollDelta,
          items: measurement.items.map((item) => ({
            ...item,
            x: item.x === undefined ? undefined : item.x - scrollDelta,
          })),
        });
      });
    },
    [],
  );

  const runBoardAutoScrollFrame = React.useCallback(
    function runBoardAutoScrollFrame() {
      boardAutoScrollFrameRef.current = null;
      const pointer = dragPointerRef.current;
      const containerLayout = containerLayoutRef.current;
      if (
        !dragActiveRef.current ||
        settlingRef.current ||
        !pointer ||
        !containerLayout
      )
        return;

      const delta = getKanbanAutoScrollDelta({
        pointer: pointer.absoluteX,
        viewportStart: containerLayout.x,
        viewportEnd: containerLayout.x + containerLayout.width,
        edgeSize: 52,
        maxStep: 16,
      });
      const maxOffset = Math.max(
        0,
        boardContentWidthRef.current - containerLayout.width,
      );
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, boardScrollOffsetRef.current + delta),
      );
      const scrollDelta = nextOffset - boardScrollOffsetRef.current;
      if (Math.abs(scrollDelta) >= 0.5) {
        boardScrollOffsetRef.current = nextOffset;
        scrollX.value = nextOffset;
        shiftDropMeasurementsHorizontally(scrollDelta);
        scrollViewRef.current?.scrollTo({ x: nextOffset, animated: false });
        resolveDropAtPointer(pointer);
      }
      boardAutoScrollFrameRef.current = requestAnimationFrame(
        runBoardAutoScrollFrame,
      );
    },
    [resolveDropAtPointer, scrollX, shiftDropMeasurementsHorizontally],
  );

  const ensureBoardAutoScroll = React.useCallback(() => {
    if (boardAutoScrollFrameRef.current === null) {
      boardAutoScrollFrameRef.current = requestAnimationFrame(
        runBoardAutoScrollFrame,
      );
    }
  }, [runBoardAutoScrollFrame]);

  React.useEffect(() => {
    columnIds.value = columns.map((c) => c.id);
  }, [columns, columnIds]);

  const startDrag = React.useCallback(
    async (
      activityId: string,
      cardLayout: { x: number; y: number; width: number; height: number },
    ) => {
      const session = dragSessionRef.current + 1;
      dragSessionRef.current = session;
      dragActiveRef.current = false;
      settlingRef.current = false;
      dragPointerRef.current = null;
      stopColumnAutoScroll();
      dragTranslateX.value = 0;
      dragTranslateY.value = 0;
      dragLiftProgress.value = 0;
      dragSettleOpacity.value = 1;
      hoveredColumnId.value = null;
      setHoveredColumnIdState(null);
      dropMeasurementsRef.current.clear();
      updateDropPlacement(null);
      void HapticsService.trigger('canvas.drag.pickup');

      // Resolve every overlay coordinate before swapping the source card for its
      // lifted copy. Otherwise the source disappears while the overlay is still
      // waiting at its default origin for a later measurement frame.
      const containerLayout = await measureInWindowAsync(containerRef.current);
      if (!containerLayout || dragSessionRef.current !== session) return;

      containerLayoutRef.current = containerLayout;
      containerX.value = containerLayout.x;
      containerY.value = containerLayout.y;
      dragStartX.value = cardLayout.x - containerLayout.x;
      dragStartY.value = cardLayout.y - containerLayout.y;
      dragWidth.value = cardLayout.width;
      draggingId.value = activityId;
      dragActiveRef.current = true;
      dragLiftProgress.value = withTiming(1, {
        duration: getAccessibleAnimationDuration(140, reduceMotionEnabled),
        easing: Easing.out(Easing.cubic),
      });
      setDraggedCardHeight(cardLayout.height);
      setDraggedSourceColumnId(
        columns.find((column) =>
          column.activities.some((activity) => activity.id === activityId),
        )?.id ?? null,
      );
      setDraggedActivityId(activityId);
      setIsDragging(true);
      if (dragPointerRef.current) ensureBoardAutoScroll();
    },
    [
      columns,
      containerX,
      containerY,
      draggingId,
      dragStartX,
      dragStartY,
      dragTranslateX,
      dragTranslateY,
      dragWidth,
      ensureBoardAutoScroll,
      dragLiftProgress,
      dragSettleOpacity,
      hoveredColumnId,
      hoveredColumnIdState,
      reduceMotionEnabled,
      stopColumnAutoScroll,
      updateDropPlacement,
    ],
  );

  const endDrag = React.useCallback(() => {
    dragSessionRef.current += 1;
    dragActiveRef.current = false;
    settlingRef.current = false;
    dragPointerRef.current = null;
    stopColumnAutoScroll();
    if (boardAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(boardAutoScrollFrameRef.current);
      boardAutoScrollFrameRef.current = null;
    }
    cancelAnimation(dragLiftProgress);
    cancelAnimation(dragTranslateX);
    cancelAnimation(dragTranslateY);
    cancelAnimation(dragWidth);
    cancelAnimation(dragSettleOpacity);
    setIsDragging(false);
    setDraggedActivityId(null);
    setDraggedSourceColumnId(null);
    setHoveredColumnIdState(null);
    draggingId.value = null;
    dragLiftProgress.value = 0;
    dragSettleOpacity.value = 1;
    hoveredColumnId.value = null;
    dropMeasurementsRef.current.clear();
    updateDropPlacement(null);
  }, [
    dragLiftProgress,
    dragSettleOpacity,
    draggingId,
    dragTranslateX,
    dragTranslateY,
    dragWidth,
    hoveredColumnId,
    stopColumnAutoScroll,
    updateDropPlacement,
  ]);

  const handleDropZoneMeasurement = React.useCallback(
    (measurement: KanbanDropZoneMeasurement) => {
      dropMeasurementsRef.current.set(measurement.columnId, measurement);
      const pointer = dragPointerRef.current;
      if (pointer) resolveDropAtPointer(pointer);
    },
    [resolveDropAtPointer],
  );

  const handleDragMove = React.useCallback(
    (activityId: string, absoluteX: number, absoluteY: number) => {
      const pointer = { activityId, absoluteX, absoluteY };
      dragPointerRef.current = pointer;
      resolveDropAtPointer(pointer);
      ensureBoardAutoScroll();
    },
    [ensureBoardAutoScroll, resolveDropAtPointer],
  );

  React.useEffect(() => {
    if (!isDragging) {
      destinationStripWidth.value = 0;
      destinationStripHeight.value = 0;
      return;
    }

    let secondFrame: number | null = null;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(async () => {
        const layout = await measureInWindowAsync(destinationStripRef.current);
        if (!layout) return;
        destinationStripX.value = layout.x;
        destinationStripY.value = layout.y;
        destinationStripWidth.value = layout.width;
        destinationStripHeight.value = layout.height;
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [
    destinationStripHeight,
    destinationStripWidth,
    destinationStripX,
    destinationStripY,
    isDragging,
  ]);

  const commitDrop = React.useCallback(
    (
      activityId: string,
      resolvedColumnId: string,
      toColumnTitle: string | null,
      hasExactPlacement: boolean,
      beforeActivityId: string | null,
      endAfterCommit = true,
    ) => {
      onMoveActivity?.(activityId, {
        groupBy,
        toColumnId: resolvedColumnId,
        toColumnTitle: toColumnTitle ?? undefined,
        beforeActivityId: hasExactPlacement ? beforeActivityId : undefined,
      });
      void HapticsService.trigger('canvas.selection');
      if (endAfterCommit) requestAnimationFrame(endDrag);
    },
    [endDrag, groupBy, onMoveActivity],
  );

  const handleDrop = React.useCallback(
    (activityId: string, toColumnId: string | null) => {
      if (settlingRef.current) return;
      settlingRef.current = true;
      stopColumnAutoScroll();
      const measuredPlacement = dropPlacementRef.current;
      const resolvedColumnId = resolveKanbanDropCommitColumnId({
        measuredPlacement,
        gestureColumnId: toColumnId,
      });
      const duration = getAccessibleAnimationDuration(170, reduceMotionEnabled);

      if (!resolvedColumnId) {
        dragLiftProgress.value = withTiming(0, { duration });
        dragTranslateX.value = withTiming(0, { duration });
        dragTranslateY.value = withTiming(0, { duration }, (finished) => {
          if (finished) runOnJS(endDrag)();
        });
        return;
      }

      const destination = columns.find(
        (column) => column.id === resolvedColumnId,
      );
      const sourceColumnId =
        draggedSourceColumnId ??
        columns.find((column) =>
          column.activities.some((activity) => activity.id === activityId),
        )?.id ??
        null;
      const dropMode = getKanbanDropMode({
        canReorder,
        sourceColumnId,
        destinationColumnId: resolvedColumnId,
      });

      if (dropMode === 'reorder-unavailable') {
        onReorderUnavailable?.();
        dragLiftProgress.value = withTiming(0, { duration });
        dragTranslateX.value = withTiming(0, { duration });
        dragTranslateY.value = withTiming(0, { duration }, (finished) => {
          if (finished) runOnJS(endDrag)();
        });
        return;
      }

      if (dropMode === 'sorted-column-move') {
        commitDrop(
          activityId,
          resolvedColumnId,
          destination?.title ?? null,
          false,
          null,
          false,
        );
        dragLiftProgress.value = withTiming(0, { duration });
        dragSettleOpacity.value = withTiming(0, { duration }, (finished) => {
          if (finished) runOnJS(endDrag)();
        });
        return;
      }

      const settleTarget = resolveKanbanDropSettleTarget({
        placement: measuredPlacement ?? { columnId: resolvedColumnId },
        measurements: Array.from(dropMeasurementsRef.current.values()),
        itemGap: spacing.sm,
      });
      const hasExactPlacement = Boolean(
        canReorder && measuredPlacement?.columnId === resolvedColumnId,
      );
      const beforeActivityId = hasExactPlacement
        ? (measuredPlacement?.beforeActivityId ?? null)
        : null;

      dragLiftProgress.value = withTiming(0, { duration });
      if (settleTarget && containerLayoutRef.current) {
        dragWidth.value = withTiming(settleTarget.width, { duration });
        dragTranslateX.value = withTiming(
          settleTarget.x - containerLayoutRef.current.x - dragStartX.value,
          { duration, easing: Easing.out(Easing.cubic) },
        );
        dragTranslateY.value = withTiming(
          settleTarget.y - containerLayoutRef.current.y - dragStartY.value,
          { duration, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(commitDrop)(
                activityId,
                resolvedColumnId,
                destination?.title ?? null,
                hasExactPlacement,
                beforeActivityId,
              );
            }
          },
        );
      } else {
        commitDrop(
          activityId,
          resolvedColumnId,
          destination?.title ?? null,
          hasExactPlacement,
          beforeActivityId,
        );
      }
    },
    [
      canReorder,
      columns,
      commitDrop,
      dragLiftProgress,
      dragSettleOpacity,
      dragStartX,
      dragStartY,
      dragTranslateX,
      dragTranslateY,
      dragWidth,
      endDrag,
      draggedSourceColumnId,
      onReorderUnavailable,
      reduceMotionEnabled,
      stopColumnAutoScroll,
    ],
  );

  const movePickerActivity = movePickerActivityId
    ? (activityById.get(movePickerActivityId) ?? null)
    : null;
  const movePickerCurrentColumnId = movePickerActivity
    ? columns.find((column) =>
        column.activities.some(
          (activity) => activity.id === movePickerActivity.id,
        ),
      )?.id
    : undefined;

  const handleChooseMoveDestination = React.useCallback(
    (toColumnId: string, toColumnTitle: string) => {
      if (!movePickerActivityId || toColumnId === movePickerCurrentColumnId) {
        setMovePickerActivityId(null);
        return;
      }
      void HapticsService.trigger('canvas.selection');
      onMoveActivity?.(movePickerActivityId, {
        groupBy,
        toColumnId,
        toColumnTitle,
      });
      setMovePickerActivityId(null);
    },
    [groupBy, movePickerActivityId, movePickerCurrentColumnId, onMoveActivity],
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
  }, [
    activeColumnIndex,
    expandedColumnWidth,
    isExpanded,
    expandedProgress,
    setExpanded,
  ]);

  const handleScroll = React.useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const scrollDelta = offsetX - boardScrollOffsetRef.current;
      boardScrollOffsetRef.current = offsetX;
      scrollX.value = offsetX;
      if (dragActiveRef.current && Math.abs(scrollDelta) >= 0.5) {
        shiftDropMeasurementsHorizontally(scrollDelta);
        const pointer = dragPointerRef.current;
        if (pointer) resolveDropAtPointer(pointer);
      }
      const index = Math.round(offsetX / (columnWidth + spacing.md));
      setActiveColumnIndex(Math.max(0, Math.min(index, columns.length - 1)));
    },
    [
      columnWidth,
      columns.length,
      resolveDropAtPointer,
      scrollX,
      shiftDropMeasurementsHorizontally,
    ],
  );

  const handleSelectColumn = React.useCallback(
    (index: number) => {
      setActiveColumnIndex(index);
      void HapticsService.trigger('canvas.selection');
      scrollViewRef.current?.scrollTo({
        x: index * (columnWidth + spacing.md),
        animated: true,
      });
    },
    [columnWidth],
  );

  const dragOverlayAnimatedStyle = useAnimatedStyle(() => {
    if (!draggingId.value) return { opacity: 0 };
    return {
      opacity: dragSettleOpacity.value,
      shadowOpacity: interpolate(dragLiftProgress.value, [0, 1], [0.05, 0.22]),
      shadowRadius: interpolate(dragLiftProgress.value, [0, 1], [4, 14]),
      elevation: interpolate(dragLiftProgress.value, [0, 1], [2, 16]),
      transform: [
        { translateX: dragStartX.value + dragTranslateX.value },
        { translateY: dragStartY.value + dragTranslateY.value },
        { scale: interpolate(dragLiftProgress.value, [0, 1], [1, 1.025]) },
      ],
    };
  }, [
    dragLiftProgress,
    dragSettleOpacity,
    draggingId,
    dragStartX,
    dragStartY,
    dragTranslateX,
    dragTranslateY,
  ]);

  const dragOverlaySizeStyle = useAnimatedStyle(() => {
    return { width: dragWidth.value };
  }, [dragWidth]);

  const draggedActivity = draggedActivityId
    ? (activityById.get(draggedActivityId) ?? null)
    : null;
  const draggedGoalTitle = draggedActivity?.goalId
    ? goalTitleById[draggedActivity.goalId]
    : undefined;
  const draggedIsLoading = draggedActivity?.id
    ? Boolean(enrichingActivityIds?.has(draggedActivity.id))
    : false;

  return (
    <View ref={containerRef} collapsable={false} style={styles.container}>
      {/* Kanban columns */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: extraBottomPadding + insets.bottom + spacing.lg }, // space for safe area + overlays
        ]}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isDragging}
        pagingEnabled={pagingEnabled}
        snapToInterval={pagingEnabled ? columnWidth + spacing.md : undefined}
        decelerationRate={pagingEnabled ? 'fast' : 'normal'}
        onScroll={handleScroll}
        onContentSizeChange={(width) => {
          boardContentWidthRef.current = width;
        }}
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
              columnId={column.id}
              title={column.title}
              iconName={column.iconName}
              accentColor={column.accentColor}
              activities={column.activities}
              goalTitleById={goalTitleById}
              enrichingActivityIds={enrichingActivityIds}
              onToggleComplete={onToggleComplete}
              onTogglePriority={onTogglePriority}
              onPressActivity={onPressActivity}
              onRequestMove={
                onMoveActivity ? setMovePickerActivityId : undefined
              }
              onAddCard={
                onAddActivity
                  ? () =>
                      onAddActivity({
                        groupBy,
                        toColumnId: column.id,
                        toColumnTitle: column.title,
                      })
                  : undefined
              }
              addCardAnchorRef={idx === 0 ? addCardAnchorRef : undefined}
              cardVisibleFields={cardVisibleFields}
              width={undefined}
              isExpanded={isExpanded}
              isDragging={isDragging}
              hiddenActivityId={
                column.id === draggedSourceColumnId ? draggedActivityId : null
              }
              isDropTarget={isDragging && hoveredColumnIdState === column.id}
              dropIndicatorBeforeActivityId={
                isDragging &&
                canReorder &&
                dropPlacement?.columnId === column.id
                  ? dropPlacement.beforeActivityId
                  : undefined
              }
              dropIndicatorHeight={draggedCardHeight}
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
              destinationStripX={destinationStripX}
              destinationStripY={destinationStripY}
              destinationStripWidth={destinationStripWidth}
              destinationStripHeight={destinationStripHeight}
              onDropZoneMeasurement={handleDropZoneMeasurement}
              onDragScrollerChange={handleDragScrollerChange}
              onDragMove={handleDragMove}
              onBeginDrag={startDrag}
              onEndDrag={handleDrop}
            />
          </Animated.View>
        ))}
      </Animated.ScrollView>

      {/* Drag overlay */}
      {draggedActivity && (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={
            [
              styles.dragOverlay,
              dragOverlaySizeStyle,
              dragOverlayAnimatedStyle,
            ] as any
          }
        >
          <View style={styles.dragOverlayInner}>
            <KanbanCard
              activity={draggedActivity}
              goalTitle={draggedGoalTitle}
              visibleFields={cardVisibleFields}
              onToggleComplete={undefined}
              onPress={undefined}
              isLoading={draggedIsLoading}
              showCompletionControl
            />
          </View>
        </Animated.View>
      )}

      {isDragging ? (
        <View
          ref={destinationStripRef}
          collapsable={false}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.dragDestinationStrip,
            { bottom: insets.bottom + spacing.sm },
          ]}
        >
          <Text style={styles.dragDestinationLabel}>Move to</Text>
          <View style={styles.dragDestinationOptions}>
            {columns.map((column) => {
              const isHovered = hoveredColumnIdState === column.id;
              return (
                <View
                  key={column.id}
                  style={[
                    styles.dragDestinationOption,
                    isHovered ? styles.dragDestinationOptionHovered : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.dragDestinationOptionText,
                      isHovered
                        ? styles.dragDestinationOptionTextHovered
                        : null,
                    ]}
                  >
                    {column.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Pagination dots (minimal overlay) */}
      {!isDragging && columns.length > 1 && (
        <View
          style={[
            styles.paginationOverlay,
            { bottom: insets.bottom + spacing.xs },
          ]}
        >
          <HStack
            alignItems="center"
            justifyContent="center"
            style={styles.pagination}
          >
            {columns.map((col, index) => (
              <Pressable
                key={col.id}
                accessibilityRole="button"
                accessibilityLabel={`Show ${col.title} column`}
                accessibilityState={{ selected: index === activeColumnIndex }}
                hitSlop={4}
                onPress={() => handleSelectColumn(index)}
                style={styles.paginationDotButton}
              >
                <View
                  style={[
                    styles.paginationDot,
                    index === activeColumnIndex && styles.paginationDotActive,
                    {
                      backgroundColor:
                        index === activeColumnIndex
                          ? colors.gray600
                          : colors.gray300,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </HStack>
        </View>
      )}

      {/* Expand/collapse FAB */}
      {!isDragging ? (
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
          accessibilityLabel={
            isExpanded ? 'Switch to compact view' : 'Switch to expanded view'
          }
        >
          <Icon
            name={isExpanded ? 'collapse' : 'expand'}
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
      ) : null}

      <BottomDrawer
        visible={Boolean(movePickerActivity)}
        onClose={() => setMovePickerActivityId(null)}
        snapPoints={['58%']}
      >
        <BottomDrawerScrollView
          contentContainerStyle={styles.movePickerContent}
        >
          <BottomDrawerHeader
            variant="withClose"
            title="Move to"
            subtitle={movePickerActivity?.title}
            onClose={() => setMovePickerActivityId(null)}
            closeAccessibilityLabel="Close move picker"
          />
          <View style={styles.moveDestinationList}>
            {columns.map((column) => {
              const isCurrent = column.id === movePickerCurrentColumnId;
              return (
                <Pressable
                  key={column.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isCurrent
                      ? `${column.title}, current column`
                      : `Move to ${column.title}`
                  }
                  accessibilityState={{
                    selected: isCurrent,
                    disabled: isCurrent,
                  }}
                  disabled={isCurrent}
                  onPress={() =>
                    handleChooseMoveDestination(column.id, column.title)
                  }
                  style={({ pressed }) => [
                    styles.moveDestinationRow,
                    isCurrent ? styles.moveDestinationRowCurrent : null,
                    pressed ? styles.moveDestinationRowPressed : null,
                  ]}
                >
                  <Text style={styles.moveDestinationTitle}>
                    {column.title}
                  </Text>
                  <HStack alignItems="center" space="sm">
                    <Text style={styles.moveDestinationCount}>
                      {String(column.activities.length)}
                    </Text>
                    {isCurrent ? (
                      <Icon name="check" size={18} color={colors.accent} /> /* @kwilt-brand-moment: green confirms the one current move destination. */
                    ) : null}
                  </HStack>
                </Pressable>
              );
            })}
          </View>
        </BottomDrawerScrollView>
      </BottomDrawer>
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
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
  },
  dragOverlayInner: {
    flex: 1,
  },
  dragDestinationStrip: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    padding: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.textPrimary,
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dragDestinationLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
    paddingBottom: 4,
  },
  dragDestinationOptions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
  },
  dragDestinationOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fieldFill,
  },
  dragDestinationOptionHovered: {
    backgroundColor: colors.gray800,
  },
  dragDestinationOptionText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
  },
  dragDestinationOptionTextHovered: {
    color: colors.canvas,
    fontFamily: fonts.semibold,
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
  paginationDotButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  movePickerContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  moveDestinationList: {
    gap: spacing.xs,
  },
  moveDestinationRow: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.fieldFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moveDestinationRowCurrent: {
    backgroundColor: colors.gray100,
  },
  moveDestinationRowPressed: {
    opacity: 0.72,
  },
  moveDestinationTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  moveDestinationCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

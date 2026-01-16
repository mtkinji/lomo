import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HapticsService } from '../services/HapticsService';

// ─────────────────────────────────────────────────────────────────────────────
// DraggableList - Generic drag-and-drop reorderable list
// - Long press initiates drag mode
// - Other items animate their translateY to make room
// - On drag end, we commit the new order to data and reset transforms
// ─────────────────────────────────────────────────────────────────────────────

type DraggableRowProps<T extends { id: string }> = {
  item: T;
  itemId: string;
  index: number;
  activeId: SharedValue<string | null>;
  activeIndex: SharedValue<number>;
  currentIndex: SharedValue<number>;
  dragTranslateY: SharedValue<number>;
  itemHeights: SharedValue<Record<string, number>>;
  orderedIds: SharedValue<string[]>;
  pendingReset: SharedValue<boolean>;
  onReorderWithPendingReset: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  triggerDragHaptic: () => void;
  scrollRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  scrollY: SharedValue<number>;
  containerHeight: SharedValue<number>;
  containerTop: SharedValue<number>;
  renderContent: (item: T, isDragging: boolean) => React.ReactNode;
};

function DraggableRow<T extends { id: string }>({
  item,
  itemId,
  index,
  activeId,
  activeIndex,
  currentIndex,
  dragTranslateY,
  itemHeights,
  orderedIds,
  pendingReset,
  onReorderWithPendingReset,
  onDragStart,
  onDragEnd,
  triggerDragHaptic,
  scrollRef,
  scrollY,
  containerHeight,
  containerTop,
  renderContent,
}: DraggableRowProps<T>) {
  const clamp = (v: number, min: number, max: number) => {
    'worklet';
    return Math.max(min, Math.min(max, v));
  };

  // Track if this row is currently being dragged (for rendering purposes)
  const [isDragging, setIsDragging] = React.useState(false);
  const setDraggingTrue = React.useCallback(() => setIsDragging(true), []);
  const setDraggingFalse = React.useCallback(() => setIsDragging(false), []);

  // Track start scroll position for scroll compensation
  const startScrollY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeId.value === itemId;

    if (isActive) {
      // The dragged item moves by dragTranslateY
      return {
        transform: [{ translateY: dragTranslateY.value }, { scale: 1.02 }],
        zIndex: 100,
        elevation: 10,
      };
    }

    // Non-dragged items: animate to make room for the dragged item
    const draggedFromIndex = activeIndex.value;
    const draggedCurrentIndex = currentIndex.value;

    if (activeId.value === null || draggedFromIndex < 0) {
      // No active drag - no offset
      return {
        transform: [{ translateY: withTiming(0, { duration: 150 }) }, { scale: 1 }],
        zIndex: 0,
        elevation: 0,
      };
    }

    // Calculate offset: if dragged item moved past us, we need to shift
    let offset = 0;
    const myIndex = index;
    const draggedId = activeId.value;
    const draggedHeight = itemHeights.value[draggedId] ?? 72;

    if (draggedFromIndex < myIndex && draggedCurrentIndex >= myIndex) {
      // Dragged item was above us and moved past/to us - shift up
      offset = -draggedHeight;
    } else if (draggedFromIndex > myIndex && draggedCurrentIndex <= myIndex) {
      // Dragged item was below us and moved past/to us - shift down
      offset = draggedHeight;
    }

    return {
      transform: [{ translateY: withTiming(offset, { duration: 150 }) }, { scale: 1 }],
      zIndex: 0,
      elevation: 0,
    };
  }, [index, itemId]);

  const gesture = React.useMemo(() => {
    const maybeAutoScroll = (absoluteY: number) => {
      'worklet';
      // Convert absolute screen Y to position relative to container
      const yInContainer = absoluteY - containerTop.value;
      
      const edgeZone = 100; // Size of the auto-scroll trigger zone at top/bottom
      const minSpeed = 4; // Minimum scroll speed (at edge of zone)
      const maxSpeed = 24; // Maximum scroll speed (at screen edge)
      const maxScrollPos = 100000; // Large number, will be clamped by actual content

      // Check if near top edge of container
      if (yInContainer < edgeZone && yInContainer >= 0) {
        // Calculate velocity: closer to edge = faster scroll
        // At yInContainer = 0, velocity = maxSpeed
        // At yInContainer = edgeZone, velocity = minSpeed
        const distanceFromEdge = yInContainer;
        const velocity = maxSpeed - (distanceFromEdge / edgeZone) * (maxSpeed - minSpeed);
        const next = clamp(scrollY.value - velocity, 0, maxScrollPos);
        scrollTo(scrollRef, 0, next, false);
        // Update scrollY to track the programmatic scroll
        scrollY.value = next;
      } 
      // Check if near bottom edge of container
      else if (yInContainer > containerHeight.value - edgeZone && yInContainer <= containerHeight.value) {
        // Calculate velocity: closer to edge = faster scroll
        const distanceFromEdge = containerHeight.value - yInContainer;
        const velocity = maxSpeed - (distanceFromEdge / edgeZone) * (maxSpeed - minSpeed);
        const next = clamp(scrollY.value + velocity, 0, maxScrollPos);
        scrollTo(scrollRef, 0, next, false);
        // Update scrollY to track the programmatic scroll
        scrollY.value = next;
      }
    };

    const longPress = Gesture.LongPress()
      .minDuration(300)
      .maxDistance(24)
      .onStart(() => {
        activeId.value = itemId;
        activeIndex.value = index;
        currentIndex.value = index;
        dragTranslateY.value = 0;
        startScrollY.value = scrollY.value;
        runOnJS(triggerDragHaptic)();
        runOnJS(setDraggingTrue)();
        runOnJS(onDragStart)();
      });

    const pan = Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((e, stateManager) => {
        // Only activate the pan gesture when we're in drag mode
        // This allows scroll to work normally when not dragging
        if (activeId.value === itemId) {
          stateManager.activate();
        } else {
          stateManager.fail();
        }
      })
      .onUpdate((e) => {
        if (activeId.value !== itemId) return;

        // Update drag position with scroll compensation
        const scrollDelta = scrollY.value - startScrollY.value;
        dragTranslateY.value = e.translationY + scrollDelta;

        maybeAutoScroll(e.absoluteY);

        // Calculate which index we're hovering over based on cumulative heights
        const fromIdx = activeIndex.value;
        const ids = orderedIds.value;
        const dragOffset = dragTranslateY.value;

        let newIndex = fromIdx;

        if (dragOffset > 0) {
          // Dragging down
          let accumulatedHeight = 0;
          for (let i = fromIdx + 1; i < ids.length; i++) {
            const itemH = itemHeights.value[ids[i]] ?? 72;
            accumulatedHeight += itemH;
            if (dragOffset > accumulatedHeight - itemH / 2) {
              newIndex = i;
            } else {
              break;
            }
          }
        } else if (dragOffset < 0) {
          // Dragging up
          let accumulatedHeight = 0;
          for (let i = fromIdx - 1; i >= 0; i--) {
            const itemH = itemHeights.value[ids[i]] ?? 72;
            accumulatedHeight -= itemH;
            if (dragOffset < accumulatedHeight + itemH / 2) {
              newIndex = i;
            } else {
              break;
            }
          }
        }

        if (newIndex !== currentIndex.value) {
          currentIndex.value = newIndex;
        }
      })
      .onEnd(() => {
        if (activeId.value !== itemId) return;

        const fromIdx = activeIndex.value;
        const toIdx = currentIndex.value;

        runOnJS(setDraggingFalse)();
        runOnJS(onDragEnd)();

        if (fromIdx !== toIdx) {
          // DON'T reset state yet - keep transforms in place while data reorders
          // Signal that we're waiting for the data to update
          pendingReset.value = true;
          runOnJS(onReorderWithPendingReset)(fromIdx, toIdx);
        } else {
          // No reorder - safe to reset immediately
          dragTranslateY.value = withTiming(0, { duration: 150 });
          activeId.value = null;
          activeIndex.value = -1;
          currentIndex.value = -1;
        }
      })
      .onFinalize(() => {
        // Only reset if not pending (i.e., drag was cancelled, not completed with reorder)
        if (activeId.value === itemId && !pendingReset.value) {
          dragTranslateY.value = withTiming(0, { duration: 150 });
          activeId.value = null;
          activeIndex.value = -1;
          currentIndex.value = -1;
          runOnJS(setDraggingFalse)();
          runOnJS(onDragEnd)();
        }
      });

    return Gesture.Simultaneous(longPress, pan);
  }, [
    activeId,
    activeIndex,
    currentIndex,
    containerHeight,
    containerTop,
    dragTranslateY,
    index,
    itemHeights,
    itemId,
    onDragEnd,
    onDragStart,
    onReorderWithPendingReset,
    orderedIds,
    pendingReset,
    scrollRef,
    scrollY,
    setDraggingFalse,
    setDraggingTrue,
    startScrollY,
    triggerDragHaptic,
  ]);

  const handleLayout = React.useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      // Store in shared heights map for other items to reference
      itemHeights.value = { ...itemHeights.value, [itemId]: h };
    },
    [itemId, itemHeights],
  );

  return (
    <Animated.View style={animatedStyle} onLayout={handleLayout}>
      <GestureDetector gesture={gesture}>
        <View>{renderContent(item, isDragging)}</View>
      </GestureDetector>
    </Animated.View>
  );
}

export type DraggableListProps<T extends { id: string }> = {
  items: T[];
  onOrderChange: (orderedIds: string[]) => void;
  renderItem: (item: T, isDragging: boolean) => React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraBottomPadding?: number;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DraggableList<T extends { id: string }>({
  items,
  onOrderChange,
  renderItem,
  contentContainerStyle,
  extraBottomPadding = 0,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  style,
}: DraggableListProps<T>) {
  const triggerDragHaptic = React.useCallback(() => {
    void HapticsService.trigger('canvas.selection');
  }, []);

  // Shared values for drag state
  const activeId = useSharedValue<string | null>(null);
  const activeIndex = useSharedValue(-1);
  const currentIndex = useSharedValue(-1);
  const dragTranslateY = useSharedValue(0);
  const itemHeights = useSharedValue<Record<string, number>>({});
  // Keep ordered IDs in sync for worklet access
  const orderedIds = useSharedValue<string[]>(items.map((item) => item.id));
  // Track when we're waiting for data to reorder before resetting animation state
  const pendingReset = useSharedValue(false);
  // Track previous item IDs to detect when reorder completes
  const prevItemIdsRef = React.useRef<string[]>(items.map((item) => item.id));

  // Update orderedIds when items change
  React.useEffect(() => {
    orderedIds.value = items.map((item) => item.id);
  }, [items, orderedIds]);

  // Detect when items array changes (reorder completed) and trigger animation reset
  React.useLayoutEffect(() => {
    const currentIds = items.map((item) => item.id);
    const prevIds = prevItemIdsRef.current;
    
    // Check if order actually changed
    const orderChanged = currentIds.some((id, idx) => prevIds[idx] !== id);
    
    if (orderChanged && pendingReset.value) {
      // Data has reordered - now animate the reset
      // Use requestAnimationFrame to ensure this happens after the layout update
      requestAnimationFrame(() => {
        dragTranslateY.value = withTiming(0, { duration: 150 });
        activeId.value = null;
        activeIndex.value = -1;
        currentIndex.value = -1;
        pendingReset.value = false;
      });
    }
    
    prevItemIdsRef.current = currentIds;
  }, [items, activeId, activeIndex, currentIndex, dragTranslateY, pendingReset]);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const containerTop = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Handle reorder - called when drag ends with position change
  // This triggers the data update; animation reset happens after re-render
  const handleReorderWithPendingReset = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      const newOrder = [...items];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      onOrderChange(newOrder.map((item) => item.id));
    },
    [items, onOrderChange],
  );

  // Callbacks for drag start/end (no-ops now that Pan manualActivation handles scroll blocking)
  const handleDragStart = React.useCallback(() => {
    // Pan gesture's manualActivation handles blocking scroll during drag
  }, []);
  const handleDragEnd = React.useCallback(() => {
    // No action needed
  }, []);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onLayout={(e) => {
        containerHeight.value = e.nativeEvent.layout.height;
        // Measure absolute position on screen using the native ref
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const node = (scrollRef.current as any)?.getNode?.() ?? scrollRef.current;
        if (node?.measure) {
          (node as any).measure((_x: number, _y: number, _w: number, _h: number, _pageX: number, pageY: number) => {
            containerTop.value = pageY;
          });
        }
      }}
    >
      {ListHeaderComponent}

      {items.length > 0 ? (
        <View>
          {items.map((item, index) => (
            <DraggableRow
              key={item.id}
              item={item}
              itemId={item.id}
              index={index}
              activeId={activeId}
              activeIndex={activeIndex}
              currentIndex={currentIndex}
              dragTranslateY={dragTranslateY}
              itemHeights={itemHeights}
              orderedIds={orderedIds}
              pendingReset={pendingReset}
              onReorderWithPendingReset={handleReorderWithPendingReset}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              triggerDragHaptic={triggerDragHaptic}
              scrollRef={scrollRef}
              scrollY={scrollY}
              containerHeight={containerHeight}
              containerTop={containerTop}
              renderContent={renderItem}
            />
          ))}
        </View>
      ) : ListEmptyComponent ? (
        ListEmptyComponent
      ) : null}

      {ListFooterComponent}

      {extraBottomPadding > 0 ? <View style={{ height: extraBottomPadding }} /> : null}
    </Animated.ScrollView>
  );
}


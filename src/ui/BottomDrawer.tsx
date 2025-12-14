import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatListProps, ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, scrims, spacing, type ScrimToken } from '../theme';

export type BottomDrawerSnapPoint = number | `${number}%`;

type Presentation = 'modal' | 'inline';

type BottomDrawerProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;

  /**
   * Snap points expressed as either:
   * - numbers (pixel height of the drawer)
   * - percent strings (e.g. '35%') of the available height (windowHeight - topInset)
   */
  snapPoints?: BottomDrawerSnapPoint[];

  /**
   * Initial snap index when opening (defaults to last / largest snap point).
   * Ignored when `snapIndex` is provided (controlled mode).
   */
  initialSnapIndex?: number;

  /**
   * Controlled snap index. When provided, the drawer will animate to this index
   * whenever `visible` is true.
   */
  snapIndex?: number;
  onSnapIndexChange?: (index: number) => void;

  /**
   * Whether the drawer can be dismissed by dragging down, tapping backdrop, or back button.
   */
  dismissable?: boolean;
  dismissOnBackdropPress?: boolean;
  /**
   * How far the user must drag down (as a ratio of the min snap height) before the drawer dismisses.
   * Lower values make it easier to dismiss. Defaults to 0.35.
   */
  dismissDragThresholdRatio?: number;

  /**
   * When true, removes the backdrop scrim entirely.
   * For `presentation="inline"`, this also allows the underlying canvas to remain interactive.
   */
  hideBackdrop?: boolean;
  backdropMaxOpacity?: number;
  /**
   * Tokenized scrim selection. Uses theme scrim tokens (color + max opacity)
   * so overlays stay consistent across the app.
   */
  scrimToken?: ScrimToken;

  /**
   * Default: 'modal' for maximum reliability.
   * Use 'inline' when you want a non-blocking overlay inside the current canvas (e.g. BottomGuide).
   */
  presentation?: Presentation;

  /**
   * Visual overrides for the drawer surface and handle region.
   */
  sheetStyle?: StyleProp<ViewStyle>;
  handleContainerStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;

  /**
   * When true, allows dragging from the content area in addition to the handle.
   * When enabled, nested scroll views should use BottomDrawerScrollView/FlatList so
   * gestures cooperate.
   */
  enableContentPanningGesture?: boolean;

  /**
   * When true, the drawer will shrink-to-fit its rendered content (up to the
   * maximum height implied by `snapPoints`). This is useful for lightweight
   * guides where content height can vary (e.g. GIFs).
   *
   * Implementation note: the drawer initially opens at the max snap height so
   * content can lay out, then animates down to the measured content height.
   */
  dynamicSizing?: boolean;
};

type BottomDrawerContextValue = {
  scrollY: SharedValue<number>;
  setScrollableGesture: (gesture: ReturnType<typeof Gesture.Native> | null) => void;
};

const BottomDrawerContext = createContext<BottomDrawerContextValue | null>(null);

function useBottomDrawerContext() {
  const ctx = useContext(BottomDrawerContext);
  if (!ctx) {
    throw new Error('BottomDrawerScrollView/FlatList must be used inside BottomDrawer.');
  }
  return ctx;
}

const DEFAULT_SNAP_POINTS: BottomDrawerSnapPoint[] = ['85%'];
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

function parseSnapPoint(args: {
  point: BottomDrawerSnapPoint;
  availableHeight: number;
}) {
  const { point, availableHeight } = args;
  if (typeof point === 'number') {
    return clamp(point, 0, availableHeight);
  }
  const trimmed = point.trim();
  if (trimmed.endsWith('%')) {
    const raw = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(raw)) return 0;
    return clamp((raw / 100) * availableHeight, 0, availableHeight);
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return 0;
  return clamp(numeric, 0, availableHeight);
}

function getClosestIndex(args: { snapY: number; snapYs: number[] }) {
  'worklet';
  const { snapY, snapYs } = args;
  let closest = 0;
  let closestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < snapYs.length; i += 1) {
    const d = Math.abs(snapYs[i] - snapY);
    if (d < closestDist) {
      closestDist = d;
      closest = i;
    }
  }
  return closest;
}

export function BottomDrawer({
  visible,
  onClose,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
  initialSnapIndex,
  snapIndex,
  onSnapIndexChange,
  dismissable = true,
  dismissOnBackdropPress = true,
  dismissDragThresholdRatio = 0.35,
  hideBackdrop = false,
  backdropMaxOpacity,
  scrimToken = 'default',
  presentation = 'modal',
  sheetStyle,
  handleContainerStyle,
  handleStyle,
  enableContentPanningGesture = false,
  dynamicSizing = false,
}: BottomDrawerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Available height excludes the top safe-area so a 100% snap doesn't tuck under the notch.
  const availableHeight = Math.max(windowHeight - insets.top, 0);

  const parsedSnapHeights = useMemo(() => {
    const parsed = snapPoints.map((point) => parseSnapPoint({ point, availableHeight }));
    // Ensure all snap points are within range. Keep caller ordering stable.
    return parsed.map((h) => clamp(h, 0, availableHeight));
  }, [availableHeight, snapPoints]);

  const maxAllowedHeight = useMemo(() => Math.max(...parsedSnapHeights, 0), [parsedSnapHeights]);

  const [dynamicTargetHeight, setDynamicTargetHeight] = useState<number | null>(null);
  const hasDynamicTarget = dynamicSizing && dynamicTargetHeight !== null;

  const snapHeights = useMemo(() => {
    if (!hasDynamicTarget) return parsedSnapHeights;
    if (dynamicTargetHeight === null) return parsedSnapHeights;

    const compact = clamp(dynamicTargetHeight, 0, maxAllowedHeight);
    const expanded = clamp(maxAllowedHeight, 0, availableHeight);
    // Keep ordering stable: compact first, optional expanded second.
    if (expanded - compact < 2) return [compact];
    return [compact, expanded];
  }, [
    availableHeight,
    dynamicTargetHeight,
    hasDynamicTarget,
    maxAllowedHeight,
    parsedSnapHeights,
  ]);

  const maxSnapHeight = useMemo(() => Math.max(...snapHeights, 0), [snapHeights]);
  const minSnapHeight = useMemo(
    () => Math.min(...snapHeights, availableHeight),
    [snapHeights, availableHeight]
  );
  const closedOffset = maxSnapHeight + 24; // move the whole drawer down by at least its max height.

  const scrimConfig = scrims[scrimToken] ?? scrims.default;
  const scrimMaxOpacity = backdropMaxOpacity ?? scrimConfig.maxOpacity;

  const [mounted, setMounted] = useState<boolean>(visible);
  const [scrollableGesture, setScrollableGestureState] =
    useState<ReturnType<typeof Gesture.Native> | null>(null);

  const scrollY = useSharedValue(0);
  // Height drives snap points. The drawer itself is bottom-anchored; we avoid
  // animating to absolute "screen Y" positions which can be fragile when layout changes.
  const sheetHeight = useSharedValue(0);
  // translateY is used only for the close animation (slide down off-screen).
  const translateY = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const setScrollableGesture = (gesture: ReturnType<typeof Gesture.Native> | null) => {
    setScrollableGestureState(gesture);
  };

  const openToIndex = useMemo(() => {
    const maxIndex = Math.max(snapHeights.length - 1, 0);
    if (typeof snapIndex === 'number') {
      return clamp(Math.floor(snapIndex), 0, maxIndex);
    }
    if (typeof initialSnapIndex === 'number') {
      return clamp(Math.floor(initialSnapIndex), 0, maxIndex);
    }
    // In dynamic sizing mode, once we've measured content, default to the compact height.
    if (hasDynamicTarget) {
      return 0;
    }
    return maxIndex;
  }, [hasDynamicTarget, initialSnapIndex, snapIndex, snapHeights.length]);

  useEffect(() => {
    if (visible) {
      if (!mounted) setMounted(true);
      return;
    }
    // Close animation for both modal + inline; unmount after.
    if (!mounted) return;
    isAnimating.value = true;
    translateY.value = withTiming(closedOffset, { duration: 220 }, (finished) => {
      isAnimating.value = false;
      if (finished) {
        runOnJS(setMounted)(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (!visible) return;
    isAnimating.value = true;
    // Animate from off-screen to reinforce the "drawer slides up" mental model.
    translateY.value = closedOffset;
    const targetHeight = snapHeights[openToIndex] ?? maxSnapHeight;
    sheetHeight.value = targetHeight;
    translateY.value = withTiming(0, { duration: 240 }, (finished) => {
      isAnimating.value = false;
      if (finished && onSnapIndexChange) runOnJS(onSnapIndexChange)(openToIndex);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, visible, openToIndex, maxSnapHeight, snapHeights.join('|')]);

  useEffect(() => {
    if (!dynamicSizing) return;
    if (!mounted || !visible) return;
    if (dynamicTargetHeight === null) return;
    // Once content has laid out, animate down to the measured compact height.
    sheetHeight.value = withTiming(clamp(dynamicTargetHeight, 0, maxSnapHeight), { duration: 220 }, (finished) => {
      if (finished && onSnapIndexChange) {
        runOnJS(onSnapIndexChange)(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicSizing, dynamicTargetHeight, mounted, visible, maxSnapHeight]);

  const progress = useDerivedValue(() => {
    // 0=open, 1=closed.
    return clamp(translateY.value / Math.max(closedOffset, 1), 0, 1);
  }, [closedOffset]);

  const backdropOpacity = useDerivedValue(() => {
    // Keep fully opaque through most of the gesture; fade during the last ~25% close.
    const t = clamp((progress.value - 0.75) / 0.25, 0, 1);
    return hideBackdrop ? 0 : scrimMaxOpacity * (1 - t);
  }, [hideBackdrop, scrimMaxOpacity]);

  const scrimStyle = useAnimatedStyle(() => {
    return { opacity: backdropOpacity.value };
  });

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: sheetHeight.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const closeIfAllowed = () => {
    if (!dismissable) return;
    onClose();
  };

  const panStartY = useSharedValue(0);
  const panStartHeight = useSharedValue(0);
  const panGesture = useMemo(() => {
    const base = Gesture.Pan()
      .onBegin(() => {
        panStartY.value = translateY.value;
        panStartHeight.value = sheetHeight.value;
      })
      .onUpdate((event) => {
        // If content is scrollable and not at top, avoid stealing downward drags.
        if (enableContentPanningGesture && scrollY.value > 0 && event.translationY > 0) {
          return;
        }
        // Dragging down reduces height; dragging up increases height.
        // When the user drags below the minimum snap height, keep height pinned
        // at min and start translating the drawer down so it can be dismissed.
        const rawHeight = panStartHeight.value - event.translationY;
        const nextHeight = clamp(rawHeight, minSnapHeight, maxSnapHeight);
        sheetHeight.value = nextHeight;

        if (rawHeight < minSnapHeight) {
          const extraDrag = minSnapHeight - rawHeight;
          translateY.value = clamp(extraDrag, 0, closedOffset);
        } else {
          // Keep any prior close translation cleared while snapping between heights.
          translateY.value = 0;
        }
      })
      .onEnd((event) => {
        if (isAnimating.value) return;

        const vY = event.velocityY;
        const currentHeight = sheetHeight.value;
        const currentTranslate = translateY.value;

        // Dismiss when the user drags down past the minimum snap point or flings downward.
        const shouldDismiss =
          dismissable &&
          (vY > 1200 || currentTranslate > minSnapHeight * dismissDragThresholdRatio);

        if (shouldDismiss) {
          isAnimating.value = true;
          translateY.value = withTiming(closedOffset, { duration: 200 }, (finished) => {
            isAnimating.value = false;
            if (finished) {
              runOnJS(closeIfAllowed)();
            }
          });
          return;
        }

        // Ensure we settle back to the base position (no close translation).
        if (currentTranslate !== 0) {
          translateY.value = withTiming(0, { duration: 180 });
        }

        const projectedHeight = clamp(currentHeight - vY * 0.15, minSnapHeight, maxSnapHeight);
        const idx = getClosestIndex({ snapY: projectedHeight, snapYs: snapHeights });
        isAnimating.value = true;
        sheetHeight.value = withTiming(snapHeights[idx] ?? maxSnapHeight, { duration: 220 }, (finished) => {
          isAnimating.value = false;
          if (finished && onSnapIndexChange) {
            runOnJS(onSnapIndexChange)(idx);
          }
        });
      });

    // If a nested scroll gesture is registered, run simultaneously to reduce conflicts.
    if (scrollableGesture) {
      return base.simultaneousWithExternalGesture(scrollableGesture);
    }
    return base;
  }, [
    closeIfAllowed,
    closedOffset,
    dismissable,
    dismissDragThresholdRatio,
    enableContentPanningGesture,
    maxSnapHeight,
    minSnapHeight,
    onSnapIndexChange,
    scrollableGesture,
    scrollY,
    snapHeights,
    sheetHeight,
    isAnimating,
    panStartY,
    panStartHeight,
  ]);

  const handlePanGesture = useMemo(() => {
    // Always allow dragging from the handle.
    return panGesture;
  }, [panGesture]);

  const contentPanGesture = useMemo(() => {
    return enableContentPanningGesture ? panGesture : Gesture.Pan().enabled(false);
  }, [enableContentPanningGesture, panGesture]);

  if (!mounted) return null;

  const body = (
    <BottomDrawerContext.Provider value={{ scrollY, setScrollableGesture }}>
      <Animated.View
        style={styles.overlay}
        pointerEvents={presentation === 'inline' && hideBackdrop ? 'box-none' : 'auto'}
      >
        {!hideBackdrop && (
          <Animated.View
            style={[
              styles.scrim,
              { backgroundColor: scrimConfig.color },
              scrimStyle,
            ]}
            pointerEvents="none"
          />
        )}
        {!hideBackdrop && dismissable && dismissOnBackdropPress && (
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        )}
        <GestureDetector gesture={contentPanGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom,
                // Max height is the safe-area-aware available height.
                maxHeight: availableHeight,
              },
              sheetAnimatedStyle,
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={handlePanGesture}>
              <View style={[styles.handleGrabRegion, handleContainerStyle]}>
                <View style={[styles.handle, handleStyle]} />
              </View>
            </GestureDetector>
            {dynamicSizing ? (
              <View
                onLayout={(event) => {
                  const { y, height } = event.nativeEvent.layout;
                  const next = clamp(y + height + insets.bottom, 0, maxAllowedHeight);
                  setDynamicTargetHeight((prev) => (prev !== next ? next : prev));
                }}
              >
                {children}
              </View>
            ) : (
              children
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </BottomDrawerContext.Provider>
  );

  if (presentation === 'inline') {
    return body;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={dismissable ? onClose : undefined}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {body}
    </Modal>
  );
}

export function BottomDrawerScrollView(props: ScrollViewProps) {
  const { scrollY, setScrollableGesture } = useBottomDrawerContext();

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  useEffect(() => {
    setScrollableGesture(nativeGesture);
    return () => setScrollableGesture(null);
  }, [nativeGesture, setScrollableGesture]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <GestureDetector gesture={nativeGesture}>
      <Animated.ScrollView {...props} onScroll={onScroll} scrollEventThrottle={16} />
    </GestureDetector>
  );
}

export function BottomDrawerFlatList<ItemT>(props: FlatListProps<ItemT>) {
  const { scrollY, setScrollableGesture } = useBottomDrawerContext();

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  useEffect(() => {
    setScrollableGesture(nativeGesture);
    return () => setScrollableGesture(null);
  }, [nativeGesture, setScrollableGesture]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <GestureDetector gesture={nativeGesture}>
      <AnimatedFlatList {...(props as unknown as FlatListProps<unknown>)} onScroll={onScroll} scrollEventThrottle={16} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    // Inline drawers must win stacking against the rest of the canvas.
    // `Modal` presentation doesn't rely on zIndex, but keeping this here is harmless.
    zIndex: 999,
    elevation: 999,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.shell,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // Elevate the drawer above the canvas.
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  handleGrabRegion: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  handle: {
    backgroundColor: colors.border,
    width: 64,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
  },
});



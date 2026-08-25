import { Pressable } from '@/src/ui/HapticPressable';
import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FlatListProps,
  GestureResponderEvent,
  ScrollViewProps,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
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
import { Portal } from '@rn-primitives/portal';
import { bottomDockGeometry, cardElevation, colors, scrims, spacing, type ScrimToken } from '../theme';
import { BUTTON_SIZE_TOKENS } from './buttonTokens';
import {
  getAccessibleAnimationDuration,
  useAccessibilityPreferences,
} from './hooks/useAccessibilityPreferences';
import { bottomDrawerChromeTokens } from './drawerTokens';
import {
  resolveDrawerActionBottomInset,
  resolveDrawerActionInlinePadding,
  resolveDrawerFloatingActionBottomInset,
  resolveDrawerFloatingActionContentInset,
  resolveDrawerFloatingActionInlinePadding,
} from './layout/bottomDockGeometry';
import {
  BottomDrawerSemanticFooter,
  type BottomDrawerFooterConfig,
} from './layout/BottomDrawerSemanticFooter';

export type BottomDrawerSnapPoint = number | `${number}%`;

type Presentation = 'modal' | 'inline';
type BottomDrawerContentLayout = 'inset' | 'edgeToEdge';
export type BottomDrawerKeyboardBehavior = 'lift' | 'extend' | 'resize';

export type BottomDrawerSnapChange = {
  previousIndex: number | null;
  direction: 'initial' | 'up' | 'down' | 'same';
};

export function shouldDismissKeyboardOnSnapChange({
  previousIndex,
  nextIndex,
  enabled,
}: {
  previousIndex: number | null;
  nextIndex: number;
  enabled: boolean;
}) {
  return enabled && previousIndex !== null && nextIndex < previousIndex;
}

export function isBottomDrawerAccessibilityModal(
  presentation: Presentation,
  hideBackdrop: boolean,
): boolean {
  return presentation === 'modal' || !hideBackdrop;
}

export function shouldAnimateBottomDrawerOnHide(
  presentation: Presentation,
  animateOnHide: boolean,
): boolean {
  return presentation === 'inline' || animateOnHide;
}

export function isBottomDrawerHandleTouchY(y: number): boolean {
  'worklet';
  return y >= 0 && y <= bottomDrawerChromeTokens.standard.handleTouchTargetHeight;
}

export function shouldBottomDrawerLiftAboveKeyboard(args: {
  keyboardBehavior: BottomDrawerKeyboardBehavior;
  keyboardAvoidanceEnabled?: boolean;
}): boolean {
  return args.keyboardAvoidanceEnabled ?? args.keyboardBehavior === 'lift';
}

export function shouldBottomDrawerResizeContents(
  keyboardBehavior: BottomDrawerKeyboardBehavior,
): boolean {
  return keyboardBehavior === 'resize';
}

type BottomDrawerProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Controls how the sheet surface relates to the software keyboard.
   *
   * - `lift` (default): move the whole sheet above the keyboard.
   * - `extend`: keep the sheet bottom-anchored so the keyboard covers its lower
   *   continuation. Pair this with `BottomDrawerScrollView` and
   *   `automaticallyAdjustKeyboardInsets` so focused fields remain reachable.
   * - `resize`: keep the sheet fixed while reducing its internal content area
   *   above the keyboard. Use for full-height task drawers with a fixed footer.
   */
  keyboardBehavior?: BottomDrawerKeyboardBehavior;

  /**
   * Legacy low-level override for keyboard avoidance.
   *
   * Turn this off for special-case surfaces that already implement their own
   * keyboard strategy (e.g. Agent chat / AiChatScreen) to avoid double offsets.
   *
   * See: `docs/keyboard-input-safety-implementation.md`
   */
  keyboardAvoidanceEnabled?: boolean;

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
  onSnapIndexChange?: (index: number, change: BottomDrawerSnapChange) => void;

  /** Dismiss the keyboard after a settled downward snap or drawer close. Defaults to true. */
  dismissKeyboardOnSnapDown?: boolean;

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
   * Controls only the horizontal content gutter. Edge-to-edge content keeps
   * the standard rounded sheet and in-flow handle anatomy.
   */
  contentLayout?: BottomDrawerContentLayout;

  /**
   * Visual overrides for the drawer surface and handle region.
   */
  sheetStyle?: StyleProp<ViewStyle>;
  handleContainerStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;

  /** Optional fixed bottom region that owns the drawer's bottom safe-area inset. */
  bottomAccessory?: ReactNode;
  /** Semantic completion actions for a bounded drawer task. */
  footer?: BottomDrawerFooterConfig;
  /** Persistent contextual actions for an ongoing drawer workspace. */
  actionDock?: ReactNode;
  /** Use the tighter optical placement of the phone Action Dock for a floating pill action. */
  bottomAccessoryPlacement?: 'drawer' | 'phoneFloating';
  /** Draw a quiet divider between scroll content and the fixed action region. */
  bottomAccessoryShowTopBorder?: boolean;

  /**
   * When true, the sheet surface extends through the bottom safe-area instead of
   * reserving that inset inside its fixed snap height. The hosted scroll content
   * must provide its own end padding so the final control can clear the home indicator.
   */
  contentExtendsIntoBottomSafeArea?: boolean;

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
  /**
   * Retain the native modal host while the sheet animates down after
   * `visible` becomes false. Opt in only when the caller keeps its closing
   * content mounted; otherwise the surface would animate away empty.
   */
  animateOnHide?: boolean;
};

type BottomDrawerContextValue = {
  scrollY: SharedValue<number>;
  expansionProgress: SharedValue<number>;
  setScrollableGesture: (
    gesture: ReturnType<typeof Gesture.Native> | null,
    contentUnderlapsHandle?: boolean,
  ) => void;
  scrollContentTopInset: number;
  parentActionInsets: { inline: number; bottom: number };
};

const BottomDrawerContext = createContext<BottomDrawerContextValue | null>(null);

function useBottomDrawerContext() {
  const ctx = useContext(BottomDrawerContext);
  if (!ctx) {
    throw new Error('BottomDrawerScrollView/FlatList must be used inside BottomDrawer.');
  }
  return ctx;
}

export function useBottomDrawerParentActionInsets() {
  return useBottomDrawerContext().parentActionInsets;
}

export function useBottomDrawerActionDockClearance() {
  const insets = useSafeAreaInsets();
  return resolveDrawerFloatingActionContentInset(
    insets.bottom,
    BUTTON_SIZE_TOKENS.md.height,
  );
}

export function getBottomDrawerExpansionOpacity({
  progress,
  from,
  to,
  minimumOpacity = 0,
}: {
  progress: number;
  from: number;
  to: number;
  minimumOpacity?: number;
}): number {
  'worklet';
  const floor = Math.min(1, Math.max(0, minimumOpacity));
  if (to <= from) return progress >= to ? 1 : floor;
  const revealProgress = Math.min(1, Math.max(0, (progress - from) / (to - from)));
  return floor + revealProgress * (1 - floor);
}

export function BottomDrawerExpansionFade({
  children,
  hidden = false,
  from = 0.09,
  to = 0.28,
  minimumOpacity = 0,
  style,
}: {
  children: ReactNode;
  hidden?: boolean;
  from?: number;
  to?: number;
  minimumOpacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { expansionProgress } = useBottomDrawerContext();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: getBottomDrawerExpansionOpacity({
      progress: expansionProgress.value,
      from,
      to,
      minimumOpacity,
    }),
  }), [from, minimumOpacity, to]);

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

const DEFAULT_SNAP_POINTS: BottomDrawerSnapPoint[] = ['85%'];
const standardChrome = bottomDrawerChromeTokens.standard;
const standardHandleLayoutHeight = standardChrome.handleRegionPaddingTop
  + standardChrome.handleHeight
  + standardChrome.handleRegionPaddingBottom;
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
  keyboardBehavior = 'lift',
  keyboardAvoidanceEnabled,
  snapPoints = DEFAULT_SNAP_POINTS,
  initialSnapIndex,
  snapIndex,
  onSnapIndexChange,
  dismissKeyboardOnSnapDown = true,
  dismissable = true,
  dismissOnBackdropPress = true,
  dismissDragThresholdRatio = 0.35,
  hideBackdrop = false,
  backdropMaxOpacity,
  scrimToken = 'default',
  presentation = 'modal',
  contentLayout = 'inset',
  sheetStyle,
  handleContainerStyle,
  handleStyle,
  bottomAccessory,
  footer,
  actionDock,
  bottomAccessoryPlacement = 'drawer',
  bottomAccessoryShowTopBorder = false,
  contentExtendsIntoBottomSafeArea = false,
  enableContentPanningGesture = false,
  dynamicSizing = false,
  animateOnHide = false,
}: BottomDrawerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const portalNameRef = useRef(`bottom-drawer-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const accessibilityModal = isBottomDrawerAccessibilityModal(presentation, hideBackdrop);
  const shouldLiftAboveKeyboard = shouldBottomDrawerLiftAboveKeyboard({
    keyboardBehavior,
    keyboardAvoidanceEnabled,
  });
  const shouldResizeContents = shouldBottomDrawerResizeContents(keyboardBehavior);
  const motionDuration = useCallback(
    (durationMs: number) => getAccessibleAnimationDuration(durationMs, reduceMotionEnabled),
    [reduceMotionEnabled],
  );

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
  const dynamicMeasurementPending = dynamicSizing && dynamicTargetHeight === null;

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
  const [scrollContentUnderlapsHandle, setScrollContentUnderlapsHandle] = useState(false);
  const scrollContentTopInset = handleContainerStyle || handleStyle
    ? 0
    : standardHandleLayoutHeight;

  const scrollY = useSharedValue(0);
  // Height drives snap points. The drawer itself is bottom-anchored; we avoid
  // animating to absolute "screen Y" positions which can be fragile when layout changes.
  const sheetHeight = useSharedValue(0);
  const expansionProgress = useDerivedValue(() => {
    const range = Math.max(maxSnapHeight - minSnapHeight, 1);
    return clamp((sheetHeight.value - minSnapHeight) / range, 0, 1);
  }, [maxSnapHeight, minSnapHeight]);
  // translateY is used only for the close animation (slide down off-screen).
  const translateY = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const hasRunOpenAnimationRef = useRef(false);
  const webDragStartYRef = useRef<number | null>(null);
  const [webDragOffset, setWebDragOffset] = useState(0);
  const settledSnapIndexRef = useRef<number | null>(null);

  const closeIfAllowed = useCallback(() => {
    if (!dismissable) return;
    if (dismissKeyboardOnSnapDown) Keyboard.dismiss();
    onClose();
  }, [dismissable, dismissKeyboardOnSnapDown, onClose]);

  const notifySnapIndexChange = useCallback((nextIndex: number) => {
    const previousIndex = settledSnapIndexRef.current;
    const direction: BottomDrawerSnapChange['direction'] = previousIndex === null
      ? 'initial'
      : nextIndex < previousIndex
        ? 'down'
        : nextIndex > previousIndex
          ? 'up'
          : 'same';
    if (shouldDismissKeyboardOnSnapChange({
      previousIndex,
      nextIndex,
      enabled: dismissKeyboardOnSnapDown,
    })) {
      Keyboard.dismiss();
    }
    settledSnapIndexRef.current = nextIndex;
    onSnapIndexChange?.(nextIndex, { previousIndex, direction });
  }, [dismissKeyboardOnSnapDown, onSnapIndexChange]);

  const requestCloseAnimated = useCallback(() => {
    if (!dismissable) return;
    // Prevent double-dismiss (e.g. rapid backdrop taps while an animation is in flight).
    if (isAnimating.value) return;
    // If we're not actually visible, there's nothing meaningful to animate.
    if (!mounted || !visible) return;

    isAnimating.value = true;
    translateY.value = withTiming(closedOffset, { duration: motionDuration(260) }, (finished) => {
      isAnimating.value = false;
      if (finished) {
        runOnJS(closeIfAllowed)();
      }
    });
  }, [
    closedOffset,
    dismissable,
    isAnimating,
    mounted,
    motionDuration,
    closeIfAllowed,
    translateY,
    visible,
  ]);

  // Safety: if the modal ever remains mounted after `visible` becomes false (e.g. an interrupted
  // animation completion callback), ensure it cannot block taps on the underlying canvas.
  const overlayPointerEvents = useMemo<'auto' | 'none' | 'box-none'>(() => {
    if (dynamicMeasurementPending) return 'none';
    // Inline drawers can optionally be "non-blocking" to allow interaction with the canvas.
    if (presentation === 'inline' && hideBackdrop) return 'box-none';
    // For modal presentation, treat `visible=false` as fully transparent to touch input.
    return visible ? 'auto' : 'none';
  }, [dynamicMeasurementPending, hideBackdrop, presentation, visible]);

  const setScrollableGesture = useCallback((
    gesture: ReturnType<typeof Gesture.Native> | null,
    contentUnderlapsHandle = false,
  ) => {
    setScrollableGestureState(gesture);
    setScrollContentUnderlapsHandle(Boolean(gesture) && contentUnderlapsHandle);
  }, []);

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
    if (!visible) {
      hasRunOpenAnimationRef.current = false;
      settledSnapIndexRef.current = null;
    }

    if (visible) {
      if (!mounted) setMounted(true);
      return;
    }

    // Close behavior:
    // - For `presentation="modal"`, prioritize correctness: unmount immediately so an
    //   invisible transparent Modal can never linger and intercept touches (an iOS
    //   edge-case we’ve observed when stacking/dismissing modal overlays quickly).
    // - For `presentation="inline"`, keep the close animation and unmount after.
    if (!mounted) return;

    if (!shouldAnimateBottomDrawerOnHide(presentation, animateOnHide)) {
      setMounted(false);
      return;
    }

    isAnimating.value = true;
    translateY.value = withTiming(closedOffset, { duration: motionDuration(280) }, (finished) => {
      isAnimating.value = false;
      if (finished) {
        runOnJS(setMounted)(false);
      }
    });

    const fallbackUnmountMs = motionDuration(360); // slightly > duration to avoid cutting off the close animation
    const timeoutId = setTimeout(() => {
      setMounted(false);
    }, fallbackUnmountMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [animateOnHide, closedOffset, mounted, motionDuration, presentation, visible, isAnimating, translateY]);

  useEffect(() => {
    if (!mounted) return;
    if (!visible) return;
    // Measure dynamic content before starting the entrance so the opening
    // transform never competes with a layout-affecting height animation.
    if (dynamicMeasurementPending) return;
    const targetHeight = snapHeights[openToIndex] ?? maxSnapHeight;

    if (!hasRunOpenAnimationRef.current) {
      hasRunOpenAnimationRef.current = true;
      isAnimating.value = true;
      // Commit the final height once, then animate only the transform.
      sheetHeight.value = targetHeight;
      translateY.value = targetHeight + 24;
      translateY.value = withTiming(0, { duration: motionDuration(320) }, (finished) => {
        isAnimating.value = false;
        if (finished) runOnJS(notifySnapIndexChange)(openToIndex);
      });
      return;
    }

    // Snap-height changes while open should resize the sheet in place. Replaying
    // the entrance animation here makes under-keyboard composers appear to close
    // and reopen whenever their content grows by a line.
    sheetHeight.value = withTiming(targetHeight, { duration: motionDuration(180) }, (finished) => {
      if (finished) runOnJS(notifySnapIndexChange)(openToIndex);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicMeasurementPending, mounted, visible, openToIndex, maxSnapHeight, motionDuration, snapHeights.join('|')]);

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
  const webSheetStaticStyle = useMemo<ViewStyle | null>(() => {
    if (Platform.OS !== 'web') return null;
    return {
      height: snapHeights[openToIndex] ?? maxSnapHeight,
      transform: [{ translateY: webDragOffset }],
    };
  }, [maxSnapHeight, openToIndex, snapHeights, webDragOffset]);

  const panStartY = useSharedValue(0);
  const panStartHeight = useSharedValue(0);
  const makePanGesture = useMemo(() => {
    return (opts: {
      ignoreScrollLock: boolean;
      coordinateWithScrollableGesture?: boolean;
      excludeTopEdge?: boolean;
    }) => {
      const {
        ignoreScrollLock,
        coordinateWithScrollableGesture = true,
        excludeTopEdge = false,
      } = opts;
      const base = Platform.OS === 'web' ? Gesture.Pan().runOnJS(true) : Gesture.Pan();
      if (excludeTopEdge) {
        base.onTouchesDown((event, stateManager) => {
          const touchY = event.allTouches[0]?.y;
          if (typeof touchY === 'number' && isBottomDrawerHandleTouchY(touchY)) {
            stateManager.fail();
          }
        });
      }
      base
      .onBegin(() => {
        panStartY.value = translateY.value;
        panStartHeight.value = sheetHeight.value;
      })
      .onUpdate((event) => {
        // If content is scrollable and not at top, avoid stealing downward drags.
        // Note: dragging from the handle should always work, even when nested
        // content is scrolled.
        if (
          !ignoreScrollLock &&
          enableContentPanningGesture &&
          scrollY.value > 0 &&
          event.translationY > 0
        ) {
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
          translateY.value = withTiming(closedOffset, { duration: motionDuration(260) }, (finished) => {
            isAnimating.value = false;
            if (finished) {
              runOnJS(closeIfAllowed)();
            }
          });
          return;
        }

        // Ensure we settle back to the base position (no close translation).
        if (currentTranslate !== 0) {
          translateY.value = withTiming(0, { duration: motionDuration(220) });
        }

        const projectedHeight = clamp(currentHeight - vY * 0.15, minSnapHeight, maxSnapHeight);
        const idx = getClosestIndex({ snapY: projectedHeight, snapYs: snapHeights });
        isAnimating.value = true;
        sheetHeight.value = withTiming(snapHeights[idx] ?? maxSnapHeight, { duration: motionDuration(260) }, (finished) => {
          isAnimating.value = false;
          if (finished) runOnJS(notifySnapIndexChange)(idx);
        });
      });

      // If a nested scroll gesture is registered, run simultaneously to reduce conflicts.
      if (scrollableGesture && coordinateWithScrollableGesture) {
        return base.simultaneousWithExternalGesture(scrollableGesture);
      }
      return base;
    };
  }, [
    closeIfAllowed,
    closedOffset,
    dismissable,
    dismissDragThresholdRatio,
    enableContentPanningGesture,
    maxSnapHeight,
    minSnapHeight,
    motionDuration,
    notifySnapIndexChange,
    scrollableGesture,
    scrollY,
    snapHeights,
    sheetHeight,
    isAnimating,
    panStartY,
    panStartHeight,
    translateY,
  ]);

  const webHandleResponderProps = useMemo<Partial<Pick<
    ViewProps,
    | 'onMoveShouldSetResponder'
    | 'onResponderGrant'
    | 'onResponderMove'
    | 'onResponderRelease'
    | 'onResponderTerminate'
    | 'onStartShouldSetResponder'
  >>>(() => {
    if (Platform.OS !== 'web') return {};

    const getPageY = (event: GestureResponderEvent) => event.nativeEvent.pageY;
    const resetDrag = () => {
      webDragStartYRef.current = null;
      setWebDragOffset(0);
    };

    return {
      onStartShouldSetResponder: () => dismissable,
      onMoveShouldSetResponder: () => dismissable,
      onResponderGrant: (event) => {
        webDragStartYRef.current = getPageY(event);
        setWebDragOffset(0);
      },
      onResponderMove: (event) => {
        const startY = webDragStartYRef.current;
        if (startY === null) return;
        const nextOffset = clamp(getPageY(event) - startY, 0, closedOffset);
        setWebDragOffset(nextOffset);
      },
      onResponderRelease: (event) => {
        const startY = webDragStartYRef.current;
        if (startY === null) return;
        const nextOffset = clamp(getPageY(event) - startY, 0, closedOffset);
        const shouldDismiss =
          dismissable && nextOffset > minSnapHeight * dismissDragThresholdRatio;

        resetDrag();
        if (shouldDismiss) {
          requestCloseAnimated();
        }
      },
      onResponderTerminate: resetDrag,
    };
  }, [closedOffset, dismissDragThresholdRatio, dismissable, minSnapHeight, requestCloseAnimated]);

  const surfacePanGesture = useMemo(
    () => makePanGesture({ ignoreScrollLock: false, excludeTopEdge: true }),
    [makePanGesture],
  );

  const topEdgePanGesture = useMemo(() => {
    return makePanGesture({
      ignoreScrollLock: true,
      coordinateWithScrollableGesture: false,
    });
  }, [makePanGesture]);

  if (!mounted) return null;

  const inFlowBottomRegion = footer
    ? <BottomDrawerSemanticFooter {...footer} />
    : actionDock
      ? null
      : bottomAccessory;
  const inFlowBottomRegionKind = footer ? 'footer' : 'accessory';
  const hasInFlowBottomRegion = Boolean(inFlowBottomRegion);
  const hasBottomRegion = Boolean(inFlowBottomRegion || actionDock);
  const resolvedShowTopBorder = footer?.showTopBorder ?? bottomAccessoryShowTopBorder;

  const inFlowRenderedChildren = hasInFlowBottomRegion ? (
    <View style={dynamicSizing ? undefined : styles.accessoryLayout}>
      <View style={dynamicSizing ? undefined : styles.accessoryContent}>{children}</View>
      <View
        testID={inFlowBottomRegionKind === 'footer'
          ? 'bottom-drawer.footer'
          : 'bottom-drawer.bottom-accessory'}
        style={[
          styles.bottomAccessory,
          {
            marginHorizontal: inFlowBottomRegionKind === 'footer' && contentLayout !== 'edgeToEdge'
              ? -spacing.lg
              : 0,
            paddingHorizontal: inFlowBottomRegionKind === 'footer'
              ? resolveDrawerActionInlinePadding(0)
              : bottomAccessoryPlacement === 'phoneFloating'
                ? resolveDrawerFloatingActionInlinePadding(
                    contentLayout === 'edgeToEdge' ? 0 : spacing.lg,
                  )
                : resolveDrawerActionInlinePadding(
                    contentLayout === 'edgeToEdge' ? 0 : spacing.lg,
                  ),
            paddingTop: bottomAccessoryPlacement === 'phoneFloating'
              ? bottomDockGeometry.drawerFloatingAction.contentGap
              : bottomDockGeometry.drawerAction.contentGap,
            paddingBottom: bottomAccessoryPlacement === 'phoneFloating'
              ? resolveDrawerFloatingActionBottomInset(insets.bottom)
              : resolveDrawerActionBottomInset(insets.bottom),
          },
          inFlowBottomRegionKind === 'footer' ? styles.semanticFooterSurface : null,
          resolvedShowTopBorder ? styles.bottomAccessoryBorder : null,
        ]}
      >
        {inFlowBottomRegion}
      </View>
    </View>
  ) : children;

  const renderedChildren = actionDock ? (
    <View style={dynamicSizing ? styles.actionDockLayout : styles.actionDockFillLayout}>
      <View style={dynamicSizing ? undefined : styles.actionDockContent}>
        {inFlowRenderedChildren}
      </View>
      <View
        pointerEvents="box-none"
        testID="bottom-drawer.action-dock"
        style={[
          styles.actionDockHost,
          {
            bottom: resolveDrawerFloatingActionBottomInset(insets.bottom),
            paddingHorizontal: resolveDrawerFloatingActionInlinePadding(
              contentLayout === 'edgeToEdge' ? 0 : spacing.lg,
            ),
          },
        ]}
      >
        {actionDock}
      </View>
    </View>
  ) : inFlowRenderedChildren;

  const sheetChildren = dynamicSizing ? (
    <View
      testID="bottom-drawer.dynamic-measurement"
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        const safeAreaHeight = hasBottomRegion || contentExtendsIntoBottomSafeArea ? 0 : insets.bottom;
        const next = clamp(y + height + safeAreaHeight, 0, maxAllowedHeight);
        setDynamicTargetHeight((prev) => (prev !== next ? next : prev));
      }}
    >
      {renderedChildren}
    </View>
  ) : renderedChildren;

  const keyboardManagedSheetChildren = shouldResizeContents ? (
    <KeyboardAvoidingView
      testID="bottom-drawer.keyboard-resized-content"
      style={styles.keyboardResizedContent}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {sheetChildren}
    </KeyboardAvoidingView>
  ) : sheetChildren;

  const drawerSurface = (
    <Animated.View
      testID="bottom-drawer.surface"
      pointerEvents={dynamicMeasurementPending ? 'none' : 'auto'}
      accessibilityViewIsModal={!dynamicMeasurementPending && accessibilityModal}
      importantForAccessibility="yes"
      onAccessibilityEscape={!dynamicMeasurementPending && dismissable ? requestCloseAnimated : undefined}
      style={[
        styles.sheet,
        {
          paddingBottom: hasBottomRegion || contentExtendsIntoBottomSafeArea ? 0 : insets.bottom,
          maxHeight: availableHeight,
        },
        sheetAnimatedStyle,
        dynamicMeasurementPending ? styles.measurementPending : null,
        webSheetStaticStyle,
        contentLayout === 'edgeToEdge' ? styles.edgeToEdgeSheet : null,
        sheetStyle,
      ]}
    >
      {(!scrollContentUnderlapsHandle || scrollContentTopInset === 0) && (
        <View
          testID="bottom-drawer.handle-layout-spacer"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.handleGrabRegion,
            handleContainerStyle,
          ]}
        >
          <View
            style={[
              styles.handle,
              handleStyle,
              styles.invisibleHandleSpacer,
            ]}
          />
        </View>
      )}
      {keyboardManagedSheetChildren}
      <GestureDetector gesture={topEdgePanGesture}>
        <View
          {...webHandleResponderProps}
          testID="bottom-drawer.handle-touch-target"
          pointerEvents="box-only"
          accessible={false}
          importantForAccessibility="no"
          style={styles.handleTouchTarget}
        >
          <View
            testID="bottom-drawer.handle-region"
            pointerEvents="none"
            style={[
              styles.handleGrabRegion,
              handleContainerStyle,
            ]}
          >
            <View
              testID="bottom-drawer.handle"
              style={[
                styles.handle,
                handleStyle,
              ]}
            />
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );

  const gestureManagedDrawerSurface = enableContentPanningGesture ? (
    <GestureDetector gesture={surfacePanGesture}>
      {drawerSurface}
    </GestureDetector>
  ) : drawerSurface;

  // Keyboard behavior guidance:
  // - `docs/keyboard-input-safety-implementation.md`
  const body = (
    <BottomDrawerContext.Provider
      value={{
        scrollY,
        expansionProgress,
        setScrollableGesture,
        scrollContentTopInset,
        parentActionInsets: {
          inline: contentLayout === 'edgeToEdge' ? 0 : spacing.lg,
          bottom: hasBottomRegion || contentExtendsIntoBottomSafeArea ? 0 : insets.bottom,
        },
      }}
    >
      {shouldLiftAboveKeyboard ? (
        <KeyboardAvoidingView
          // Important: BottomDrawer hosts inputs inside a modal-like overlay.
          // KeyboardAvoidingView at the overlay level is the most reliable way to
          // lift the entire sheet above the keyboard without fighting the sheet's
          // own height/transform animations.
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
          pointerEvents={overlayPointerEvents}
        >
          <Animated.View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
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
              <Pressable
                testID="bottom-drawer.backdrop"
                accessible={false}
                importantForAccessibility="no"
                style={StyleSheet.absoluteFill}
                onPress={requestCloseAnimated}
              />
            )}
          </Animated.View>
          {gestureManagedDrawerSurface}
        </KeyboardAvoidingView>
      ) : (
        <View
          style={styles.overlay}
          pointerEvents={overlayPointerEvents}
        >
          <Animated.View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
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
              <Pressable
                testID="bottom-drawer.backdrop"
                accessible={false}
                importantForAccessibility="no"
                style={StyleSheet.absoluteFill}
                onPress={requestCloseAnimated}
              />
            )}
          </Animated.View>
          {gestureManagedDrawerSurface}
        </View>
      )}
    </BottomDrawerContext.Provider>
  );

  if (presentation === 'inline') {
    // Render inline drawers through a Portal so they can reliably layer above
    // navigator-managed surfaces like the bottom tab bar.
    return <Portal name={portalNameRef.current}>{body}</Portal>;
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={dismissable ? requestCloseAnimated : undefined}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {body}
    </Modal>
  );
}

export function BottomDrawerScrollView(props: ScrollViewProps) {
  const { scrollY, scrollContentTopInset, setScrollableGesture } = useBottomDrawerContext();

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  useLayoutEffect(() => {
    setScrollableGesture(nativeGesture, true);
    return () => setScrollableGesture(null);
  }, [nativeGesture, setScrollableGesture]);

  const contentContainerStyle = useMemo(() => {
    const flattened = StyleSheet.flatten(props.contentContainerStyle);
    const existingPaddingTop = typeof flattened?.paddingTop === 'number'
      ? flattened.paddingTop
      : 0;
    return [
      props.contentContainerStyle,
      { paddingTop: existingPaddingTop + scrollContentTopInset },
    ];
  }, [props.contentContainerStyle, scrollContentTopInset]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <GestureDetector gesture={nativeGesture}>
      <Animated.ScrollView
        {...props}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </GestureDetector>
  );
}

export function BottomDrawerFlatList<ItemT>(props: FlatListProps<ItemT>) {
  const { scrollY, scrollContentTopInset, setScrollableGesture } = useBottomDrawerContext();

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  useLayoutEffect(() => {
    setScrollableGesture(nativeGesture, true);
    return () => setScrollableGesture(null);
  }, [nativeGesture, setScrollableGesture]);

  const contentContainerStyle = useMemo(() => {
    const flattened = StyleSheet.flatten(props.contentContainerStyle);
    const existingPaddingTop = typeof flattened?.paddingTop === 'number'
      ? flattened.paddingTop
      : 0;
    return [
      props.contentContainerStyle,
      { paddingTop: existingPaddingTop + scrollContentTopInset },
    ];
  }, [props.contentContainerStyle, scrollContentTopInset]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <GestureDetector gesture={nativeGesture}>
      <AnimatedFlatList
        {...(props as unknown as FlatListProps<unknown>)}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </GestureDetector>
  );
}

/**
 * Wrap arbitrary content (e.g. a `MapView`) so its native gestures can run simultaneously
 * with the BottomDrawer's swipe-to-dismiss gesture.
 *
 * Useful for pinch-to-zoom/scroll inside maps embedded in drawers.
 */
export function BottomDrawerNativeGestureView(props: ViewProps) {
  const { setScrollableGesture } = useBottomDrawerContext();
  const nativeGesture = useMemo(() => Gesture.Native(), []);

  useEffect(() => {
    setScrollableGesture(nativeGesture);
    return () => setScrollableGesture(null);
  }, [nativeGesture, setScrollableGesture]);

  return (
    <GestureDetector gesture={nativeGesture}>
      <View {...props} />
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
    // Note: `KwiltBottomBar` uses a very high zIndex/elevation (1000) so it stays tappable
    // above absolute-positioned screen overlays. BottomDrawer must sit above the bar whenever
    // both are present so drawer CTAs are never obscured by the bottom bar.
    zIndex: 2000,
    elevation: 2000,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.shell,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    // Allow in-sheet cards to cast shadows into the horizontal gutter without being clipped
    // by the sheet's rounded corners. Content is already inset by padding, so it should not
    // visually bleed past the corner radii in normal layouts.
    overflow: 'visible',
    paddingHorizontal: spacing.lg,
    paddingTop: standardChrome.surfacePaddingTop,
    // Elevate the drawer above the canvas.
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  measurementPending: {
    opacity: 0,
  },
  handleGrabRegion: {
    position: 'relative',
    paddingTop: standardChrome.handleRegionPaddingTop,
    paddingBottom: standardChrome.handleRegionPaddingBottom,
  },
  handleTouchTarget: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: standardChrome.handleTouchTargetHeight,
    zIndex: 2,
  },
  invisibleHandleSpacer: {
    opacity: 0,
  },
  handle: {
    backgroundColor: colors.border,
    position: 'relative',
    top: standardChrome.handleVisualOffsetY,
    width: standardChrome.handleWidth,
    height: standardChrome.handleHeight,
    borderRadius: standardChrome.handleRadius,
    alignSelf: 'center',
  },
  edgeToEdgeSheet: {
    overflow: 'hidden',
    paddingHorizontal: 0,
  },
  accessoryLayout: {
    flex: 1,
    minHeight: 0,
  },
  accessoryContent: {
    flex: 1,
    minHeight: 0,
  },
  keyboardResizedContent: {
    flex: 1,
    minHeight: 0,
  },
  bottomAccessory: {
    flexShrink: 0,
  },
  semanticFooterSurface: {
    zIndex: 1,
    backgroundColor: colors.canvas,
    ...cardElevation.drawerFooter,
  },
  actionDockLayout: {
    position: 'relative',
  },
  actionDockFillLayout: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
  },
  actionDockContent: {
    flex: 1,
    minHeight: 0,
  },
  actionDockHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 60,
  },
  bottomAccessoryBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

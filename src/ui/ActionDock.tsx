import type { RefObject } from 'react';
import React from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography, fonts } from '../theme';
import { HStack, VStack } from './primitives';
import { Icon, type IconName } from './Icon';
import Svg, { Circle } from 'react-native-svg';
import Reanimated, {
  Easing as ReanimatedEasing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { HapticsService } from '../services/HapticsService';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const AnimatedView = Reanimated.createAnimatedComponent(View);

const CONFETTI_GAP_PX = 6;
const CONFETTI_TRAVEL_PX = 26;
const CONFETTI_PILL_W = 10;
const CONFETTI_PILL_H = 4;
const CONFETTI_OVERFLOW_PX = CONFETTI_GAP_PX + CONFETTI_TRAVEL_PX + 10;

type ConfettiPillProps = {
  dx: number;
  dy: number;
  rotateDeg: number;
  color: string;
  ringSize: number;
  confettiT: SharedValue<number>;
};

function ConfettiPill({ dx, dy, rotateDeg, color, ringSize, confettiT }: ConfettiPillProps) {
  const style = useAnimatedStyle(() => {
    const t = confettiT.value;
    // Start just outside the ring, then travel outward and fade.
    const startDist = ringSize / 2 + CONFETTI_GAP_PX;
    const dist = startDist + CONFETTI_TRAVEL_PX * t;
    // Keep hidden until the animation starts (t is set to 0 before withTiming begins).
    const opacity = t === 0 ? 0 : 1 - t;
    return {
      opacity,
      transform: [
        { translateX: dx * dist },
        { translateY: dy * dist },
        { rotate: `${rotateDeg}deg` },
        { scale: 1 - 0.12 * t },
      ],
    };
  });

  return <AnimatedView style={[styles.confettiPill, { backgroundColor: color }, style]} />;
}

function withAlpha(hex: string, alpha: number) {
  // Supports #RRGGBB. Falls back to the original string if format is unexpected.
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (![r, g, b].every(Number.isFinite)) return hex;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

export type ActionDockItem = {
  id: string;
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
  /**
   * Optional label rendered under the icon (used in expanded mode when desired).
   */
  label?: string;
  /**
   * Optional icon/text tint override.
   */
  color?: string;
};

type Props = {
  /**
   * Left dock (multi-action pill).
   */
  leftItems: ActionDockItem[];
  /**
   * Optional ref target for coachmarks/tutorials to spotlight the *entire* left dock pill.
   * Note: target wrapper should be `collapsable={false}` so `measureInWindow` works on Android.
   */
  leftDockTargetRef?: RefObject<View | null>;
  /**
   * Optional single right-side dock button (Notes-style compose).
   */
  rightItem?: ActionDockItem;
  /**
   * Optional ref target for coachmarks/tutorials to spotlight the right-side primary action button.
   * Note: target wrapper should be `collapsable={false}` so `measureInWindow` works on Android.
   */
  rightDockTargetRef?: RefObject<View | null>;
  /**
   * Optional progress value (0..1) to render an inset ring inside the right-side dock button.
   * When omitted, no ring is rendered.
   */
  rightItemProgress?: number;
  /**
   * Optional ring color override for the right-side progress ring.
   */
  rightItemRingColor?: string;
  /**
   * Optional background color override for the right-side dock button.
   * When provided, a solid fill is drawn on top of the BlurView.
   */
  rightItemBackgroundColor?: string;
  /**
   * Monotonic key that triggers a staged completion celebration sequence
   * (ring -> fill -> confetti + haptic).
   */
  rightItemCelebrateKey?: number;
  /**
   * Optional callback fired on the JS thread after the staged celebration animation completes.
   *
   * The celebration animation runs on the UI thread (reanimated). This callback is scheduled from
   * the same effect that triggers the animation so callers can reliably show follow-up UI (e.g. a toast)
   * *after* the celebration finishes.
   */
  onRightItemCelebrateComplete?: () => void;
  /**
   * Optional center label (e.g. "2/4") shown temporarily on step toggles.
   */
  rightItemCenterLabel?: string;
  /**
   * Monotonic key that triggers a brief center-label pulse
   * (checkmark fades out -> label fades in -> label fades out -> checkmark returns).
   */
  rightItemCenterLabelPulseKey?: number;
  /**
   * Extra items to show when the keyboard is open (Notes-style “expanded dock”).
   */
  keyboardExpandedLeftItems?: ActionDockItem[];
  /**
   * Horizontal inset from the canvas edges. Use to “nestle” into corners while
   * keeping equal distance left/right.
   */
  insetX?: number;
  /**
   * Minimum bottom inset from the canvas edge (safe-area still applies).
   */
  insetBottom?: number;
  /**
   * How much of the bottom safe-area inset (home indicator) to apply when positioning.
   *
   * Notes-style “corner nesting” typically feels better with a partial lift instead
   * of the full safe-area inset.
   */
  safeAreaLift?: 'none' | 'half' | 'full';
  /**
   * When true, show small labels under icons (primarily useful in expanded mode).
   */
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional layout callback so screens can measure dock geometry (e.g. for scroll fades).
   */
  onLayout?: ViewProps['onLayout'];
};

const DEFAULT_KEYBOARD_GUESS_PX = 320;
// Slightly larger than the initial Notes-style sizing for better tap targets:
// 44px inner button + 6px padding top/bottom = 56px.
const DOCK_PADDING_Y = 6;
const DOCK_PADDING_X = 8;
const DOCK_RADIUS = 99;
const DOCK_ICON_SIZE = 22;
const LEFT_ITEM_SIZE = 44;
const RIGHT_ITEM_SIZE = 56;

export function ActionDock({
  leftItems,
  leftDockTargetRef,
  rightItem,
  rightDockTargetRef,
  rightItemProgress,
  rightItemRingColor,
  rightItemBackgroundColor,
  rightItemCelebrateKey,
  onRightItemCelebrateComplete,
  rightItemCenterLabel,
  rightItemCenterLabelPulseKey,
  keyboardExpandedLeftItems,
  insetX = spacing.lg,
  insetBottom = spacing.xs,
  safeAreaLift = 'half',
  showLabels = false,
  style,
  onLayout,
}: Props) {
  const insets = useSafeAreaInsets();

  const translateY = React.useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(DEFAULT_KEYBOARD_GUESS_PX);

  const setTo = React.useCallback(
    (nextHeight: number, duration?: number) => {
      // iOS `endCoordinates.height` typically includes the home-indicator safe area.
      // Since we already respect `insets.bottom` in layout, subtract it to avoid double-lift.
      const adjusted =
        Platform.OS === 'ios' ? Math.max(0, nextHeight - insets.bottom) : Math.max(0, nextHeight);
      setKeyboardHeight(adjusted);
      if (adjusted > 0) lastKnownKeyboardHeightRef.current = adjusted;
      Animated.timing(translateY, {
        toValue: adjusted > 0 ? -adjusted : 0,
        duration: typeof duration === 'number' ? duration : 220,
        useNativeDriver: true,
      }).start();
    },
    [insets.bottom, translateY],
  );

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', (e: any) => {
        setTo(e?.endCoordinates?.height ?? 0, e?.duration);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', (e: any) => {
        setTo(0, e?.duration);
      });
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        setTo(e?.endCoordinates?.height ?? 0, e?.duration);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
        frameSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      setTo(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setTo(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [setTo]);

  // Android: begin with a best-guess height while waiting for keyboardDidShow.
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (keyboardHeight > 0) return;
    // No-op until keyboard opens; but keep the ref warmed for later.
  }, [keyboardHeight]);

  const expanded = keyboardHeight > 0;
  const effectiveLeftItems =
    expanded && keyboardExpandedLeftItems?.length ? [...leftItems, ...keyboardExpandedLeftItems] : leftItems;

  const clampedRightProgress =
    typeof rightItemProgress === 'number' && Number.isFinite(rightItemProgress)
      ? Math.max(0, Math.min(1, rightItemProgress))
      : null;
  const shouldShowRightRing = rightItem != null && clampedRightProgress != null;

  const ringSize = RIGHT_ITEM_SIZE;
  const ringStrokeWidth = 3;
  // Inset the ring so it never changes the visible button diameter.
  const ringInsetPx = 1;
  const ringRadius = ringSize / 2 - ringStrokeWidth / 2 - ringInsetPx;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const resolvedRingColor =
    rightItemRingColor ?? rightItem?.color ?? colors.accent;
  const resolvedTrackColor = withAlpha(resolvedRingColor, 0.18);

  // Smooth ring + background transitions on the UI thread.
  const ringProgress = useSharedValue(0);
  const bgOpacity = useSharedValue(0);
  const confettiT = useSharedValue(0);
  const centerLabelT = useSharedValue(0);
  const lastBgColorRef = React.useRef<string | null>(null);
  if (rightItemBackgroundColor) lastBgColorRef.current = rightItemBackgroundColor;
  const effectiveBgColor = lastBgColorRef.current;
  const prevCelebrateKeyRef = React.useRef<number | null>(null);
  const prevBgDefinedRef = React.useRef<boolean>(Boolean(rightItemBackgroundColor));
  const hapticTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrateCompleteTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCenterLabelPulseKeyRef = React.useRef<number | null>(null);

  // Initialize fill state so already-complete activities render correctly on first paint.
  React.useEffect(() => {
    bgOpacity.value = rightItemBackgroundColor ? 1 : 0;
    prevBgDefinedRef.current = Boolean(rightItemBackgroundColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (shouldShowRightRing) {
      ringProgress.value = withTiming(clampedRightProgress ?? 0, {
        duration: 420,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
    } else {
      ringProgress.value = withTiming(0, {
        duration: 260,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
    }
  }, [clampedRightProgress, ringProgress, shouldShowRightRing]);

  // Background fill: immediate on mount or uncomplete; delayed when celebration triggers.
  React.useEffect(() => {
    const bgDefined = Boolean(rightItemBackgroundColor);
    const becameDefined = !prevBgDefinedRef.current && bgDefined;
    const becameUndefined = prevBgDefinedRef.current && !bgDefined;
    const prevKey = prevCelebrateKeyRef.current;
    const nextKey =
      typeof rightItemCelebrateKey === 'number' && Number.isFinite(rightItemCelebrateKey)
        ? rightItemCelebrateKey
        : null;
    const celebrateKeyChanged = nextKey != null && prevKey != null && nextKey !== prevKey;

    if (becameUndefined) {
      bgOpacity.value = withTiming(0, { duration: 220, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
    } else if (becameDefined) {
      // If the fill appeared as part of a celebration, the celebration effect will fade it in.
      if (!celebrateKeyChanged) {
        bgOpacity.value = withTiming(1, { duration: 200, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
      } else {
        bgOpacity.value = 0;
      }
    }

    prevBgDefinedRef.current = bgDefined;
  }, [bgOpacity, rightItemBackgroundColor, rightItemCelebrateKey]);

  // Staged completion sequence: ring -> fill -> confetti/haptic (triggered via celebrateKey).
  React.useEffect(() => {
    const nextKey =
      typeof rightItemCelebrateKey === 'number' && Number.isFinite(rightItemCelebrateKey)
        ? rightItemCelebrateKey
        : null;
    if (nextKey == null) return;

    // First non-null key just initializes; don’t celebrate.
    if (prevCelebrateKeyRef.current == null) {
      prevCelebrateKeyRef.current = nextKey;
      return;
    }
    if (nextKey === prevCelebrateKeyRef.current) return;
    prevCelebrateKeyRef.current = nextKey;

    // Cancel any pending haptic from a previous celebration.
    if (hapticTimeoutRef.current) {
      clearTimeout(hapticTimeoutRef.current);
      hapticTimeoutRef.current = null;
    }
    // Cancel any pending completion callback from a previous celebration.
    if (celebrateCompleteTimeoutRef.current) {
      clearTimeout(celebrateCompleteTimeoutRef.current);
      celebrateCompleteTimeoutRef.current = null;
    }

    // Staged sequence:
    // 1) Force ring to full
    // 2) After ring finishes, fade in fill + launch confetti
    const ringMs = 420;
    const fillMs = 240;
    const confettiMs = 450;
    // Small buffer so JS-driven follow-ups never overlap the last confetti frames
    // (and to account for render/effect scheduling before the animation actually starts).
    const completeBufferMs = 240;

    ringProgress.value = withTiming(1, { duration: ringMs, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });

    // Fill is purely visual; it only matters if a fill color exists.
    if (rightItemBackgroundColor) {
      bgOpacity.value = 0;
      bgOpacity.value = withDelay(
        ringMs,
        withTiming(1, { duration: fillMs, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
      );
    }

    confettiT.value = 0;
    confettiT.value = withDelay(
      ringMs,
      withTiming(1, { duration: confettiMs, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
    );

    // Trigger haptic on JS thread when the fill completes (ring 420ms + fill 240ms).
    hapticTimeoutRef.current = setTimeout(() => {
      void HapticsService.trigger('outcome.success');
    }, ringMs + fillMs);

    // Notify on JS thread after the celebration should be fully finished.
    if (onRightItemCelebrateComplete) {
      celebrateCompleteTimeoutRef.current = setTimeout(() => {
        onRightItemCelebrateComplete();
      }, ringMs + confettiMs + completeBufferMs);
    }
  }, [
    bgOpacity,
    confettiT,
    ringProgress,
    rightItemBackgroundColor,
    rightItemCelebrateKey,
    onRightItemCelebrateComplete,
  ]);

  React.useEffect(() => {
    return () => {
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
        hapticTimeoutRef.current = null;
      }
      if (celebrateCompleteTimeoutRef.current) {
        clearTimeout(celebrateCompleteTimeoutRef.current);
        celebrateCompleteTimeoutRef.current = null;
      }
    };
  }, []);

  // Briefly show the center label on demand (e.g. when a step is toggled).
  React.useEffect(() => {
    const nextKey =
      typeof rightItemCenterLabelPulseKey === 'number' && Number.isFinite(rightItemCenterLabelPulseKey)
        ? rightItemCenterLabelPulseKey
        : null;
    if (nextKey == null) return;
    if (prevCenterLabelPulseKeyRef.current == null) {
      prevCenterLabelPulseKeyRef.current = nextKey;
      return;
    }
    if (nextKey === prevCenterLabelPulseKeyRef.current) return;
    prevCenterLabelPulseKeyRef.current = nextKey;

    // Only pulse when we actually have a label to show.
    if (!rightItemCenterLabel || rightItemCenterLabel.trim().length === 0) return;

    centerLabelT.value = 0;
    centerLabelT.value = withSequence(
      withTiming(1, { duration: 160, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
      withDelay(
        850,
        withTiming(0, { duration: 160, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
      ),
    );
  }, [centerLabelT, rightItemCenterLabel, rightItemCenterLabelPulseKey]);

  const centerCheckStyle = useAnimatedStyle(() => {
    return { opacity: 1 - centerLabelT.value };
  });
  const centerLabelStyle = useAnimatedStyle(() => {
    return { opacity: centerLabelT.value };
  });

  const animatedRingProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: ringCircumference * (1 - ringProgress.value),
    } as any;
  });

  const animatedBgStyle = React.useMemo(
    () => ({
      opacity: bgOpacity,
    }),
    [bgOpacity],
  );

  const confettiItems = React.useMemo(() => {
    // 5-way radial burst: evenly spaced around the circle (every 72 degrees).
    // Screen coords: +x right, +y down.
    const colorsList = [
      colors.pine700,
      colors.turmeric500,
      colors.madder600,
      colors.quiltBlue400,
      colors.accentRoseStrong,
    ];
    const startAngleDeg = -90; // start at 12:00 for a pleasant “pop” direction
    const stepDeg = 360 / colorsList.length;
    return colorsList.map((color, idx) => {
      const angleDeg = startAngleDeg + idx * stepDeg;
      const rad = (angleDeg * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      return {
        id: `c${idx}`,
        dx,
        dy,
        color,
        // Slight rotation bias so pills aren’t perfectly axis-aligned.
        rotateDeg: angleDeg + (idx % 2 === 0 ? 14 : -10),
      };
    });
  }, []);

  return (
    <Animated.View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[
        styles.host,
        {
          paddingHorizontal: insetX,
          // Position the dock using an explicit bottom offset (more predictable than paddingBottom).
          bottom:
            (safeAreaLift === 'full'
              ? insets.bottom
              : safeAreaLift === 'half'
                ? Math.round(insets.bottom * 0.5)
                : 0) + insetBottom,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <HStack alignItems="center" justifyContent="space-between">
        <View style={styles.dockShadow}>
          <View
            ref={leftDockTargetRef}
            collapsable={false}
            style={styles.dock}
          >
            <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
            <View pointerEvents="none" style={styles.dockTint} />
            <HStack alignItems="center" justifyContent="space-between" style={styles.row}>
              {effectiveLeftItems.map((item) => {
              const tint = item.color ?? colors.textPrimary;
              return (
                <Pressable
                  key={item.id}
                  testID={item.testID}
                  accessibilityRole="button"
                  accessibilityLabel={item.accessibilityLabel}
                  hitSlop={10}
                  onPress={item.onPress}
                  style={({ pressed }) => [
                    styles.item,
                    pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                  ]}
                >
                  <VStack alignItems="center" space="xs">
                    <Icon name={item.icon} size={DOCK_ICON_SIZE} color={tint} />
                    {showLabels && item.label ? (
                      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    ) : null}
                  </VStack>
                </Pressable>
              );
            })}
            </HStack>
          </View>
        </View>

        {rightItem ? (
          <View style={styles.dockShadow}>
            <View
              ref={rightDockTargetRef}
              collapsable={false}
              pointerEvents="box-none"
              style={styles.rightButtonWrap}
            >
              <Pressable
                testID={rightItem.testID}
                accessibilityRole="button"
                accessibilityLabel={rightItem.accessibilityLabel}
                hitSlop={12}
                onPress={rightItem.onPress}
                style={({ pressed }) => [
                  styles.rightButton,
                  rightItemBackgroundColor ? { borderColor: withAlpha(rightItemBackgroundColor, 0.45) } : null,
                  pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                ]}
              >
                {/* Decorative layers (do not affect tap target or layout). */}
                <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
                <View pointerEvents="none" style={styles.dockTint} />
                {effectiveBgColor ? (
                  <AnimatedView
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFillObject,
                      { backgroundColor: effectiveBgColor },
                      animatedBgStyle as any,
                    ]}
                  />
                ) : null}
                {shouldShowRightRing ? (
                  <View pointerEvents="none" style={styles.rightRing}>
                    <Svg width={ringSize} height={ringSize}>
                      <Circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        stroke={resolvedTrackColor}
                        strokeWidth={ringStrokeWidth}
                        fill="none"
                      />
                      <AnimatedCircle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={ringRadius}
                        stroke={resolvedRingColor}
                        strokeWidth={ringStrokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                        animatedProps={animatedRingProps}
                        // Start progress at 6:00 (bottom) instead of 12:00.
                        rotation={90}
                        originX={ringSize / 2}
                        originY={ringSize / 2}
                        fill="none"
                      />
                    </Svg>
                  </View>
                ) : null}
                <View pointerEvents="none" style={styles.rightCenterOverlay}>
                  <AnimatedView style={centerCheckStyle}>
                    <Icon
                      name={rightItem.icon}
                      size={DOCK_ICON_SIZE}
                      color={rightItem.color ?? colors.textPrimary}
                    />
                  </AnimatedView>
                  {rightItemCenterLabel ? (
                    <AnimatedView style={[styles.rightCenterLabelWrap, centerLabelStyle]}>
                      <Text style={styles.rightCenterLabel} numberOfLines={1}>
                        {rightItemCenterLabel}
                      </Text>
                    </AnimatedView>
                  ) : null}
                </View>
              </Pressable>

              {/* Confetti burst (outside the clipped circle). */}
              <View pointerEvents="none" style={styles.confettiHost}>
                {confettiItems.map((item) => {
                  return (
                    <ConfettiPill
                      key={item.id}
                      dx={item.dx}
                      dy={item.dy}
                      rotateDeg={item.rotateDeg}
                      color={item.color}
                      ringSize={ringSize}
                      confettiT={confettiT}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}
      </HStack>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingTop: spacing.sm,
  },
  dockShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  dock: {
    borderRadius: DOCK_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  dockTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  row: {
    paddingHorizontal: DOCK_PADDING_X,
    paddingVertical: DOCK_PADDING_Y,
  },
  item: {
    width: LEFT_ITEM_SIZE,
    height: LEFT_ITEM_SIZE,
    borderRadius: LEFT_ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButton: {
    width: RIGHT_ITEM_SIZE,
    height: RIGHT_ITEM_SIZE,
    borderRadius: RIGHT_ITEM_SIZE / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButtonWrap: {
    // Anchor for ring + confetti layers.
    position: 'relative',
    width: RIGHT_ITEM_SIZE,
    height: RIGHT_ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightRing: {
    ...StyleSheet.absoluteFillObject,
  },
  rightCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCenterLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCenterLabel: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 14,
    color: colors.textPrimary,
  },
  confettiHost: {
    // Render outside the clipped circle: this sits *next to* the Pressable, not inside it.
    position: 'absolute',
    left: -CONFETTI_OVERFLOW_PX,
    top: -CONFETTI_OVERFLOW_PX,
    width: RIGHT_ITEM_SIZE + CONFETTI_OVERFLOW_PX * 2,
    height: RIGHT_ITEM_SIZE + CONFETTI_OVERFLOW_PX * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiPill: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: CONFETTI_PILL_W,
    height: CONFETTI_PILL_H,
    marginLeft: -CONFETTI_PILL_W / 2,
    marginTop: -CONFETTI_PILL_H / 2,
    borderRadius: 999,
  },
  label: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
});



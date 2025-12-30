import type { ReactNode, RefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Portal } from '@rn-primitives/portal';
import Svg, { Defs, Mask, Rect as SvgRect } from 'react-native-svg';
import { colors, scrims, spacing, type ScrimToken } from '../theme';
import { Button } from './Button';
import { Text } from './Typography';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useToastStore } from '../store/useToastStore';

type Rect = { x: number; y: number; width: number; height: number };

type Placement = 'auto' | 'above' | 'below';

type Spotlight = 'none' | 'hole' | 'ring';

const ARROW_SIZE = 10;

export type CoachmarkProps = {
  visible: boolean;
  targetRef: RefObject<View | null>;
  /**
   * Optional explicit re-measure trigger. When this value changes while visible,
   * the coachmark will re-run `measureInWindow` once on the next frame.
   *
   * This is intended for callers who programmatically scroll the target into view
   * (or otherwise change layout) and want a single re-measure after things settle.
   */
  remeasureKey?: string | number;
  onDismiss: () => void;
  onAction?: (actionId: string) => void;
  title?: ReactNode;
  body: ReactNode;
  media?: ReactNode;
  /**
   * Optional footer actions.
   * - When omitted (`undefined`), a single "Got it" affordance is rendered.
   * - When provided as an empty array (`[]`), no footer actions are rendered (useful
   *   for flows that require tapping the highlighted target to proceed).
   * Keep these small so the coachmark doesn't compete with the highlighted target.
   */
  actions?: Array<{
    id: string;
    label: string;
    variant?: 'outline' | 'accent';
  }>;
  /**
   * Optional progress indicator label, e.g. "1 of 3".
   */
  progressLabel?: string;
  /**
   * We render a visual scrim behind the coachmark to increase salience, but we do NOT
   * intercept touches so the user can tap the highlighted target directly.
   */
  scrimToken?: ScrimToken;
  spotlight?: Spotlight;
  /**
   * Padding around the highlighted element (applies to hole + ring).
   * Defaults to XS spacing.
   */
  spotlightPadding?: number;
  /**
   * Corner radius for the spotlight hole/ring.
   */
  spotlightRadius?: number;
  /**
   * Brand color used for the spotlight ring + ripple. Defaults to the app accent.
   */
  highlightColor?: string;
  /**
   * Brand color used for coachmark action buttons (e.g. "Got it").
   * Defaults to `highlightColor`.
   */
  actionColor?: string;
  /**
   * When true, pulses a spotlight ring (even when using a hole) a few times to draw attention.
   * The pulse stops automatically; it should never run forever.
   */
  attentionPulse?: boolean;
  attentionPulseDelayMs?: number;
  /**
   * How long the attention pulse should run before stopping (ms). Defaults to 15 seconds.
   */
  attentionPulseDurationMs?: number;
  respectReduceMotion?: boolean;
  placement?: Placement;
  /**
   * Gap between the arrow tip and the highlighted target. Defaults to XS.
   */
  offset?: number;
  maxWidth?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

const DEFAULT_MAX_WIDTH = 320;

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function parseProgressLabel(progressLabel?: string) {
  if (!progressLabel) return null;
  const match = progressLabel.trim().match(/^(\d+)\s+of\s+(\d+)$/i);
  if (!match) return null;
  const current = Number.parseInt(match[1] ?? '', 10);
  const total = Number.parseInt(match[2] ?? '', 10);
  if (!Number.isFinite(current) || !Number.isFinite(total)) return null;
  if (total <= 0) return null;
  return { current, total };
}

export function Coachmark({
  visible,
  targetRef,
  remeasureKey,
  onDismiss,
  onAction,
  title,
  body,
  media,
  actions,
  progressLabel,
  scrimToken = 'subtle',
  spotlight = 'hole',
  spotlightPadding = spacing.xs,
  spotlightRadius = 14,
  highlightColor = colors.accent,
  actionColor,
  attentionPulse = false,
  attentionPulseDelayMs = 3000,
  attentionPulseDurationMs = 15000,
  respectReduceMotion = true,
  placement = 'auto',
  offset = spacing.xs,
  maxWidth = DEFAULT_MAX_WIDTH,
  containerStyle,
}: CoachmarkProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const suppressionKeyRef = React.useRef(
    `coachmark-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [bubbleSize, setBubbleSize] = useState<{ width: number; height: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const resolvedActionColor = actionColor ?? highlightColor;


  const scrim = scrims[scrimToken] ?? scrims.subtle;
  const ripple = useSharedValue(0);
  const spotlightW = useSharedValue(0);
  const spotlightH = useSharedValue(0);

  useEffect(() => {
    const key = suppressionKeyRef.current;
    useToastStore.getState().setToastsSuppressed({ key, suppressed: visible });
    return () => {
      useToastStore.getState().setToastsSuppressed({ key, suppressed: false });
    };
  }, [visible]);

  const measureTarget = useCallback(() => {
    const node = targetRef.current;
    if (!node) return;
    // measureInWindow works for both modal + inline overlays. For Android, the
    // target wrapper should be `collapsable={false}`.
    node.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every((v) => Number.isFinite(v))) return;
      setTargetRect({ x, y, width, height });
    });
  }, [targetRef]);

  useEffect(() => {
    if (!visible) return;
    // Measure on the next frame so layout settles.
    // Then re-measure a couple more times shortly after showing to handle:
    // - animated scroll-to positioning (target moves after initial frame)
    // - late layout shifts (e.g. async content, font load, etc.)
    const raf = requestAnimationFrame(() => measureTarget());
    const t1 = setTimeout(() => measureTarget(), 120);
    const t2 = setTimeout(() => measureTarget(), 420);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible, measureTarget, remeasureKey]);

  useEffect(() => {
    if (!visible) return;
    if (!respectReduceMotion) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!alive) return;
        setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [respectReduceMotion, visible]);

  useEffect(() => {
    if (!visible) return;
    // Re-measure on dimension changes (rotation, split view, etc.).
    measureTarget();
  }, [visible, measureTarget, windowWidth, windowHeight]);

  const handleBubbleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    setBubbleSize({ width, height });
  }, []);

  const layout = useMemo(() => {
    if (!visible || !targetRect || !bubbleSize) return null;

    const sidePadding = spacing.lg;
    const topLimit = insets.top + spacing.lg;
    const bottomLimit = windowHeight - insets.bottom - spacing.lg;

    const bubbleWidth = Math.min(bubbleSize.width, maxWidth);
    const bubbleHeight = bubbleSize.height;

    const anchorX = targetRect.x + targetRect.width / 2;
    const left = clampNumber(anchorX - bubbleWidth / 2, sidePadding, windowWidth - sidePadding - bubbleWidth);

    const roomAbove = targetRect.y - topLimit;
    const roomBelow = bottomLimit - (targetRect.y + targetRect.height);

    const requiredRoom = bubbleHeight + ARROW_SIZE + offset;

    // Even when a caller requests an explicit placement, keep the coachmark usable:
    // if there isn't enough room on that side, flip to the other side.
    const resolvedPlacement: 'above' | 'below' = (() => {
      if (placement === 'above') {
        if (roomAbove >= requiredRoom) return 'above';
        return roomBelow >= requiredRoom || roomBelow >= roomAbove ? 'below' : 'above';
      }
      if (placement === 'below') {
        if (roomBelow >= requiredRoom) return 'below';
        return roomAbove >= requiredRoom || roomAbove >= roomBelow ? 'above' : 'below';
      }
      // Auto: pick the side that fits, otherwise prefer the side with more room.
      return roomBelow >= requiredRoom || roomBelow >= roomAbove ? 'below' : 'above';
    })();

    const top =
      resolvedPlacement === 'below'
        // Arrow tip sits `offset` below the target. Since the arrow extends upward
        // by ARROW_SIZE, we move the bubble down by ARROW_SIZE + offset.
        ? clampNumber(
            targetRect.y + targetRect.height + ARROW_SIZE + offset,
            topLimit,
            bottomLimit - bubbleHeight,
          )
        // Arrow tip sits `offset` above the target. Since the arrow extends downward
        // by ARROW_SIZE, we move the bubble up by ARROW_SIZE + offset.
        : clampNumber(
            targetRect.y - bubbleHeight - ARROW_SIZE - offset,
            topLimit,
            bottomLimit - bubbleHeight,
          );

    const arrowLeft = clampNumber(anchorX - left - 10, 16, bubbleWidth - 16);

    return { left, top, resolvedPlacement, arrowLeft, bubbleWidth };
  }, [visible, targetRect, bubbleSize, insets.bottom, insets.top, maxWidth, offset, placement, windowHeight, windowWidth]);

  const footerActions = useMemo(() => {
    const baseActions =
      actions !== undefined
        ? actions
        : [
            {
              id: 'dismiss',
              label: 'Got it',
              variant: 'outline' as const,
            },
          ];

    // Coachmark guides typically show "Skip" on intermediate steps, but not on the final step.
    // We infer "final step" from the standard progressLabel format ("X of Y").
    const progress = parseProgressLabel(progressLabel);
    const isFinalStep = Boolean(progress && progress.current >= progress.total);
    if (!isFinalStep) return baseActions;

    const withoutSkip = baseActions.filter((action) => action.id !== 'skip');
    // Never remove the *only* action.
    return withoutSkip.length > 0 ? withoutSkip : baseActions;
  }, [actions, progressLabel]);

  const spotlightRect = targetRect
    ? {
        x: Math.max(targetRect.x - spotlightPadding, 0),
        y: Math.max(targetRect.y - spotlightPadding, 0),
        width: Math.max(targetRect.width + spotlightPadding * 2, 0),
        height: Math.max(targetRect.height + spotlightPadding * 2, 0),
      }
    : null;

  const shouldShowRing = Boolean(spotlightRect && (spotlight === 'ring' || attentionPulse));
  const ringRect = spotlightRect;

  useEffect(() => {
    if (!visible) return;
    if (!ringRect) return;
    spotlightW.value = ringRect.width;
    spotlightH.value = ringRect.height;
  }, [ringRect, spotlightH, spotlightW, visible]);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(ripple);
      ripple.value = 0;
      return;
    }
    if (!attentionPulse || !shouldShowRing) {
      cancelAnimation(ripple);
      ripple.value = 0;
      return;
    }
    if (reduceMotion) {
      cancelAnimation(ripple);
      ripple.value = 0;
      return;
    }

    // Ripple that expands outward and fades to 0. Runs for a bounded duration.
    cancelAnimation(ripple);
    ripple.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520 }),
        withDelay(attentionPulseDelayMs, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );

    const timeoutId = setTimeout(() => {
      cancelAnimation(ripple);
      ripple.value = 0;
    }, Math.max(0, attentionPulseDurationMs));

    return () => {
      clearTimeout(timeoutId);
      cancelAnimation(ripple);
      ripple.value = 0;
    };
  }, [
    attentionPulse,
    attentionPulseDelayMs,
    attentionPulseDurationMs,
    ripple,
    reduceMotion,
    shouldShowRing,
    visible,
  ]);

  const rippleAnimatedStyle = useAnimatedStyle(() => {
    const t = ripple.value;
    // Expand outward from the target, and fade quickly to 0.
    // Use non-uniform scale so the ripple expands by a constant pixel outset on
    // all sides (even growth), regardless of target aspect ratio.
    const baseW = Math.max(spotlightW.value, 1);
    const baseH = Math.max(spotlightH.value, 1);
    const outset = 14 * t; // px outward on each side at peak
    const scaleX = 1 + (2 * outset) / baseW;
    const scaleY = 1 + (2 * outset) / baseH;
    const opacity = Math.max(0, 0.55 * (1 - t) * (1 - t));
    return {
      opacity,
      transform: [{ scaleX }, { scaleY }],
    };
  }, []);

  if (!visible) return null;

  return (
    <Portal name="coachmark">
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Visual-only scrim (doesn't block taps). */}
        {spotlight === 'hole' && spotlightRect ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <Svg width="100%" height="100%">
              <Defs>
                <Mask id="coachmarkMask">
                  {/* White reveals, black cuts out */}
                  <SvgRect x="0" y="0" width="100%" height="100%" fill="#FFFFFF" />
                  <SvgRect
                    x={spotlightRect.x}
                    y={spotlightRect.y}
                    width={spotlightRect.width}
                    height={spotlightRect.height}
                    rx={spotlightRadius}
                    ry={spotlightRadius}
                    fill="#000000"
                  />
                </Mask>
              </Defs>
              <SvgRect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill={scrim.color}
                opacity={scrim.maxOpacity}
                mask="url(#coachmarkMask)"
              />
            </Svg>
          </View>
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: scrim.color, opacity: scrim.maxOpacity },
            ]}
          />
        )}

        {/* Optional spotlight ring (visual only). */}
        {shouldShowRing && ringRect ? (
          <>
            {/* Ripple wave behind the main ring */}
            {attentionPulse ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.rippleRing,
                  {
                    left: ringRect.x,
                    top: ringRect.y,
                    width: ringRect.width,
                    height: ringRect.height,
                    borderRadius: spotlightRadius,
                  },
                  { borderColor: highlightColor },
                  rippleAnimatedStyle,
                ]}
              />
            ) : null}
            {/* Main ring stays crisp to mark the target */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  left: ringRect.x,
                  top: ringRect.y,
                  width: ringRect.width,
                  height: ringRect.height,
                  borderRadius: spotlightRadius,
                },
                { borderColor: highlightColor },
              ]}
            />
          </>
        ) : null}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View
            onLayout={handleBubbleLayout}
            style={[
              styles.bubble,
              containerStyle,
              layout
                ? {
                    left: layout.left,
                    top: layout.top,
                    maxWidth,
                  }
                : { left: spacing.lg, top: insets.top + spacing.lg, maxWidth },
            ]}
          >
            {/* Arrow */}
            {layout ? (
              <View
                pointerEvents="none"
                style={[
                  styles.arrow,
                  layout.resolvedPlacement === 'below' ? styles.arrowUp : styles.arrowDown,
                  { left: layout.arrowLeft },
                ]}
              />
            ) : null}

            <View style={styles.headerRow}>
              {title ? <View style={styles.titleRow}>{title}</View> : null}
              {progressLabel ? (
                <Text style={styles.progressLabel}>{progressLabel}</Text>
              ) : null}
            </View>
            {media ? <View style={styles.mediaRow}>{media}</View> : null}
            <View style={[styles.bodyRow, footerActions.length === 0 ? styles.bodyRowNoFooter : null]}>
              {body}
            </View>
            {footerActions.length > 0 ? (
              <View style={styles.footerRow}>
                {footerActions.map((action) => {
                  const variant = action.variant ?? 'outline';
                  const handlePress = () => {
                    if (action.id === 'dismiss') {
                      onDismiss();
                      return;
                    }
                    onAction?.(action.id);
                  };
                  const buttonStyle =
                    variant === 'accent'
                      ? { backgroundColor: resolvedActionColor, borderColor: resolvedActionColor }
                      : { borderColor: resolvedActionColor };
                  const labelStyle =
                    variant === 'accent'
                      ? styles.actionLabelInverse
                      : { color: resolvedActionColor };
                  return (
                    <Button
                      key={action.id}
                      variant={variant}
                      size="small"
                      onPress={handlePress}
                      style={buttonStyle}
                    >
                      <Text style={labelStyle}>{action.label}</Text>
                    </Button>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: colors.canvas,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: {
    top: -ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderBottomColor: colors.canvas,
  },
  arrowDown: {
    bottom: -ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderTopColor: colors.canvas,
  },
  titleRow: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    columnGap: spacing.sm,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  mediaRow: {
    marginBottom: spacing.sm,
  },
  bodyRow: {
    marginBottom: spacing.md,
  },
  bodyRowNoFooter: {
    marginBottom: 0,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: spacing.sm,
  },
  actionLabel: {
    color: colors.textPrimary,
  },
  actionLabelInverse: {
    color: colors.canvas,
  },
});



import * as React from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { blurs } from '../../theme/overlays';
import { colors, spacing } from '../../theme';
import { HStack } from '../primitives';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Default height of the header bar below the safe area inset (not including inset).
 *
 * Design target: 36px action pills + ~12px bottom breathing room => 48px.
 */
export const OBJECT_PAGE_HEADER_BAR_HEIGHT = 48;

export type ObjectPageHeaderProps = {
  /**
   * Height of the header bar below the safe area inset (not including inset).
   * Defaults to 48 (36px pill + ~12px bottom breathing room).
   */
  barHeight?: number;
  /**
   * Scroll-linked background opacity progress (0..1).
   * When omitted, the background is rendered fully opaque.
   */
  backgroundOpacity?: Animated.AnimatedInterpolation<number> | Animated.Value;
  /**
   * Opacity for the blurred action pill material.
   * When omitted and `backgroundOpacity` is provided, it defaults to a 1→0.2 fade.
   * When neither is provided, defaults to 1.
   */
  actionPillOpacity?: Animated.AnimatedInterpolation<number> | Animated.Value;
  /**
   * Optional background color for the header bar when `backgroundOpacity` is 1.
   */
  backgroundColor?: string;
  /**
   * Left-side element (usually a back pill).
   */
  left?: React.ReactNode;
  /**
   * Center element (usually object type label).
   */
  center?: React.ReactNode;
  /**
   * Right-side element(s) (usually share + menu pills).
   */
  right?: React.ReactNode;
  /**
   * Optional spacer width for side slots (left/right).
   * Arc uses flexible right cluster; many pages use ~44.
   */
  sideSlotWidth?: number;
  /**
   * Additional style for the fixed overlay wrapper.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Override for the safe-area top inset used by the header.
   *
   * Default behavior uses `useSafeAreaInsets().top` (full-screen headers).
   * For screens rendered inside an already-safe-area-padded canvas (e.g. AppShell),
   * pass `0` to avoid double-counting and pushing the header down.
   */
  safeAreaTopInset?: number;
  /**
   * Horizontal padding inside the header row.
   *
   * Defaults to `spacing.xl` (Arc/Goal full-bleed layouts). For screens already
   * padded by an AppShell canvas, pass `0` (or a smaller value).
   */
  horizontalPadding?: number;
  /**
   * When true, renders a blurred header background material (in addition to the
   * action pill blur). Defaults to false to preserve existing Arc/Goal headers.
   */
  blurBackground?: boolean;
};

export function ObjectPageHeader({
  barHeight = OBJECT_PAGE_HEADER_BAR_HEIGHT,
  backgroundOpacity,
  actionPillOpacity,
  backgroundColor = colors.canvas,
  left,
  center,
  right,
  sideSlotWidth,
  style,
  safeAreaTopInset,
  horizontalPadding = spacing.xl,
  blurBackground = false,
}: ObjectPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const resolvedTopInset = typeof safeAreaTopInset === 'number' ? safeAreaTopInset : insets.top;
  const totalHeight = resolvedTopInset + barHeight;

  const resolvedBgOpacity =
    backgroundOpacity ?? new Animated.Value(1);

  const resolvedPillOpacity =
    actionPillOpacity ??
    (backgroundOpacity
      ? (resolvedBgOpacity as Animated.AnimatedInterpolation<number>).interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.2],
          extrapolate: 'clamp',
        })
      : new Animated.Value(1));

  return (
    <View pointerEvents="box-none" style={[styles.fixedHeaderOverlay, { height: totalHeight }, style]}>
      {blurBackground ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { opacity: resolvedBgOpacity as any }]}
        >
          <BlurView
            intensity={blurs.headerAction.intensity}
            tint={blurs.headerAction.tint}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerBlurTint} />
        </Animated.View>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fixedHeaderBackground,
          {
            opacity: resolvedBgOpacity as any,
            backgroundColor: blurBackground ? 'transparent' : backgroundColor,
          },
        ]}
      />
      <View
        style={[
          styles.fixedHeaderRow,
          {
            paddingTop: resolvedTopInset,
            height: totalHeight,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={[styles.sideSlot, sideSlotWidth ? { width: sideSlotWidth } : null]}>{left}</View>
        <View style={styles.centerSlot}>{center}</View>
        <View style={[styles.sideSlotRight, sideSlotWidth ? { width: sideSlotWidth } : null]}>{right}</View>
      </View>

      {/* Provide opacity via context-less prop pass-through by cloning pills isn't worth it.
          Instead, consumers should pass `materialOpacity={resolvedPillOpacity}` into pills. */}
      {/* This component exposes the computed opacity via return value pattern is awkward,
          so we keep the resolved default logic in `HeaderActionPill` too. */}
    </View>
  );
}

export type HeaderActionPillProps = {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  /**
   * Which material token to use for the frosted background.
   * - default: tuned for dark/hero imagery (lighter border).
   * - onLight: tuned for white canvas (darker border so the pill reads).
   */
  materialVariant?: 'default' | 'onLight';
  /**
   * Diameter of the circular pill in px.
   * Defaults to 36 (Arc header).
   */
  size?: number;
  /**
   * Opacity for the frosted material background.
   */
  materialOpacity?: Animated.AnimatedInterpolation<number> | Animated.Value;
  /**
   * When true, renders the material background (BlurView + tint overlay).
   * Defaults to true.
   */
  material?: boolean;
  /**
   * Optional override for hitSlop.
   */
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function HeaderActionPill({
  children,
  onPress,
  accessibilityLabel,
  materialVariant = 'default',
  size = 36,
  materialOpacity,
  material = true,
  hitSlop = 10,
  style,
  disabled,
}: HeaderActionPillProps) {
  const resolvedOpacity = materialOpacity ?? new Animated.Value(1);
  const materialToken = materialVariant === 'onLight' ? blurs.headerActionOnLight : blurs.headerAction;

  return (
    <AnimatedPressable
      style={[
        styles.headerActionCircle,
        { width: size, height: size, borderRadius: size / 2 },
        { borderColor: materialToken.borderColor },
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled ? { disabled: true } : undefined}
      hitSlop={hitSlop}
      disabled={disabled}
    >
      {material ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.headerActionCircleBg, { opacity: resolvedOpacity as any }]}
        >
          <BlurView
            intensity={materialToken.intensity}
            tint={materialToken.tint}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.headerActionCircleTint, { backgroundColor: materialToken.overlayColor }]} />
        </Animated.View>
      ) : null}
      <HStack alignItems="center" justifyContent="center">
        {children}
      </HStack>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fixedHeaderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
  },
  fixedHeaderBackground: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray300,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fixedHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    // Keep controls closer to the safe area instead of vertically centering within the bar.
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  sideSlot: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sideSlotRight: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  headerActionCircle: {
    // Slightly smaller than the previous 40px to reduce visual weight.
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerActionCircleBg: {
    ...StyleSheet.absoluteFillObject,
  },
  headerActionCircleTint: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor set via `materialVariant` (default/onLight) at render-time.
  },
  headerBlurTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: blurs.headerAction.overlayColor,
  },
});



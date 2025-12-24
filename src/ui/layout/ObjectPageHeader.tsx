import * as React from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { blurs } from '../../theme/overlays';
import { colors, spacing } from '../../theme';
import { HStack } from '../primitives';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ObjectPageHeaderProps = {
  /**
   * Height of the header bar below the safe area inset (not including inset).
   * Arc uses 52 (36px pill + ~16px bottom breathing room).
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
};

export function ObjectPageHeader({
  barHeight = 52,
  backgroundOpacity,
  actionPillOpacity,
  backgroundColor = colors.canvas,
  left,
  center,
  right,
  sideSlotWidth,
  style,
}: ObjectPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const totalHeight = insets.top + barHeight;

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
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fixedHeaderBackground,
          {
            opacity: resolvedBgOpacity as any,
            backgroundColor,
          },
        ]}
      />
      <View style={[styles.fixedHeaderRow, { paddingTop: insets.top, height: totalHeight }]}>
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
  materialOpacity,
  material = true,
  hitSlop = 10,
  style,
  disabled,
}: HeaderActionPillProps) {
  const resolvedOpacity = materialOpacity ?? new Animated.Value(1);

  return (
    <AnimatedPressable
      style={[styles.headerActionCircle, style]}
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
            intensity={blurs.headerAction.intensity}
            tint={blurs.headerAction.tint}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerActionCircleTint} />
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
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: blurs.headerAction.borderColor,
  },
  headerActionCircleBg: {
    ...StyleSheet.absoluteFillObject,
  },
  headerActionCircleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: blurs.headerAction.overlayColor,
  },
});



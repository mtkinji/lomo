import type { ReactNode, Ref } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii } from '../../theme';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';

export type ObjectDetailMediaVariant = 'immersive' | 'standard' | 'compact';

export type ObjectDetailMediaGeometry = {
  heroHeight: number;
  overlap: number;
  sheetRadius: number;
  parallaxFactor: number;
  fadeHold: number;
  fadeLead: number;
};

const GEOMETRY: Record<ObjectDetailMediaVariant, ObjectDetailMediaGeometry> = {
  immersive: {
    heroHeight: 320,
    overlap: 28,
    sheetRadius: radii.sheet,
    parallaxFactor: 0.5,
    fadeHold: 60,
    fadeLead: 180,
  },
  standard: {
    heroHeight: 240,
    overlap: 20,
    sheetRadius: radii.sheet,
    parallaxFactor: 0.5,
    fadeHold: 50,
    fadeLead: 160,
  },
  compact: {
    heroHeight: 168,
    overlap: 16,
    sheetRadius: radii.panel,
    parallaxFactor: 0.35,
    fadeHold: 24,
    fadeLead: 64,
  },
};

export function resolveObjectDetailMediaGeometry(
  variant: ObjectDetailMediaVariant,
): ObjectDetailMediaGeometry {
  return GEOMETRY[variant];
}

export function buildObjectDetailMediaMotionRange({
  heroHeight,
  overlap,
  headerBoundary,
  fadeHold,
  fadeLead,
}: {
  heroHeight: number;
  overlap: number;
  headerBoundary: number;
  fadeHold: number;
  fadeLead: number;
}): { start: number; end: number } {
  const end = Math.max(1, heroHeight - overlap - Math.max(0, headerBoundary));
  const start = Math.min(Math.max(0, fadeHold, end - fadeLead), end - 1);
  return { start, end };
}

type Props = {
  variant: ObjectDetailMediaVariant;
  scrollY: Animated.Value;
  headerBoundary: number;
  hero: ReactNode;
  children: ReactNode;
  heroStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  sheetInnerStyle?: StyleProp<ViewStyle>;
  sheetRef?: Ref<View>;
  onSheetLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
};

type HeroProps = {
  variant: ObjectDetailMediaVariant;
  scrollY: Animated.Value;
  headerBoundary: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ObjectDetailMediaHero({
  variant,
  scrollY,
  headerBoundary,
  children,
  style,
}: HeroProps) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const geometry = resolveObjectDetailMediaGeometry(variant);
  const fade = buildObjectDetailMediaMotionRange({
    heroHeight: geometry.heroHeight,
    overlap: geometry.overlap,
    headerBoundary,
    fadeHold: geometry.fadeHold,
    fadeLead: geometry.fadeLead,
  });
  const opacity = reduceMotionEnabled
    ? 1
    : scrollY.interpolate({
        inputRange: [0, fade.start, fade.end],
        outputRange: [1, 1, 0],
        extrapolate: 'clamp',
      });
  const translateY = reduceMotionEnabled
    ? null
    : Animated.multiply(scrollY, geometry.parallaxFactor);

  return (
    <View
      testID="object-detail-media-hero"
      style={[styles.hero, { height: geometry.heroHeight }, style]}
    >
      <Animated.View
        testID="object-detail-media-animated-hero"
        pointerEvents="box-none"
        style={[
          styles.heroLayer,
          { opacity },
          translateY ? { transform: [{ translateY }] } : null,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

type SheetProps = {
  variant: ObjectDetailMediaVariant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  sheetRef?: Ref<View>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function ObjectDetailMediaSheet({
  variant,
  children,
  style,
  sheetRef,
  onLayout,
}: SheetProps) {
  const geometry = resolveObjectDetailMediaGeometry(variant);
  return (
    <View
      ref={sheetRef}
      collapsable={false}
      testID="object-detail-media-sheet"
      onLayout={onLayout}
      style={[
        styles.sheet,
        {
          marginTop: -geometry.overlap,
          borderTopLeftRadius: geometry.sheetRadius,
          borderTopRightRadius: geometry.sheetRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ObjectDetailMediaShell({
  variant,
  scrollY,
  headerBoundary,
  hero,
  children,
  heroStyle,
  sheetStyle,
  sheetInnerStyle,
  sheetRef,
  onSheetLayout,
  testID,
}: Props) {
  return (
    <View testID={testID} style={styles.root}>
      <ObjectDetailMediaHero
        variant={variant}
        scrollY={scrollY}
        headerBoundary={headerBoundary}
        style={heroStyle}
      >
        {hero}
      </ObjectDetailMediaHero>
      <ObjectDetailMediaSheet
        variant={variant}
        sheetRef={sheetRef}
        onLayout={onSheetLayout}
        style={sheetStyle}
      >
        <View style={sheetInnerStyle}>{children}</View>
      </ObjectDetailMediaSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    minHeight: 1,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});

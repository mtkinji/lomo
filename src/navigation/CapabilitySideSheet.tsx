import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { useCapabilityMenuState } from './CapabilityMenuStateContext';
import {
  CAPABILITY_SIDE_SHEET_DURATION_MS,
  CAPABILITY_SIDE_SHEET_RADIUS,
  CAPABILITY_SIDE_SHEET_WIDTH_RATIO,
  getCapabilitySideSheetDuration,
  resolveCapabilitySideSheetSettle,
} from './capabilitySideSheetMotion';

type CapabilitySideSheetProps = {
  menu: ReactNode;
  children: ReactNode;
};

function useReduceMotionEnabled(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(Boolean(enabled));
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

export function CapabilitySideSheet({ menu, children }: CapabilitySideSheetProps) {
  const { width } = useWindowDimensions();
  const { menuOpen, openMenu, coverMenu } = useCapabilityMenuState();
  const reduceMotion = useReduceMotionEnabled();
  const drawerWidth = width * CAPABILITY_SIDE_SHEET_WIDTH_RATIO;
  const progress = useSharedValue(menuOpen ? 1 : 0);
  const dragStart = useSharedValue(menuOpen ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(menuOpen ? 1 : 0, {
      duration: getCapabilitySideSheetDuration(reduceMotion),
      easing: Easing.out(Easing.cubic),
    });
  }, [menuOpen, progress, reduceMotion]);

  const closeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(menuOpen && !reduceMotion)
        .activeOffsetX([-8, 8])
        .failOffsetY([-14, 14])
        .onBegin(() => {
          dragStart.value = progress.value;
        })
        .onUpdate((event) => {
          progress.value = Math.max(0, Math.min(1, dragStart.value + event.translationX / drawerWidth));
        })
        .onEnd((event) => {
          const nextOpen = resolveCapabilitySideSheetSettle({
            progress: progress.value,
            velocityX: event.velocityX,
          });
          progress.value = withTiming(nextOpen ? 1 : 0, {
            duration: CAPABILITY_SIDE_SHEET_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          }, (finished) => {
            if (!finished) return;
            if (nextOpen) runOnJS(openMenu)();
            else runOnJS(coverMenu)();
          });
        }),
    [coverMenu, dragStart, drawerWidth, menuOpen, openMenu, progress, reduceMotion],
  );

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerWidth * progress.value }],
  }));
  const ambientShadowStyle = useAnimatedStyle(() => ({
    borderRadius: CAPABILITY_SIDE_SHEET_RADIUS * progress.value,
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.1]),
  }));
  const contactShadowStyle = useAnimatedStyle(() => ({
    borderRadius: CAPABILITY_SIDE_SHEET_RADIUS * progress.value,
    shadowOpacity: interpolate(progress.value, [0, 1], [0, 0.16]),
  }));
  const surfaceStyle = useAnimatedStyle(() => ({
    borderRadius: CAPABILITY_SIDE_SHEET_RADIUS * progress.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0.94]),
  }));

  return (
    <View style={styles.root}>
      <View
        accessibilityElementsHidden={!menuOpen}
        importantForAccessibility={menuOpen ? 'yes' : 'no-hide-descendants'}
        pointerEvents={menuOpen ? 'auto' : 'none'}
        style={[styles.menuUnderlay, { width: drawerWidth }]}
      >
        {menu}
      </View>

      <GestureDetector gesture={closeGesture}>
        <Animated.View style={[styles.motionLayer, motionStyle]}>
          <Animated.View style={[styles.ambientShadow, ambientShadowStyle]}>
            <Animated.View style={[styles.contactShadow, contactShadowStyle]}>
              <Animated.View
                testID="capability.foreground-sheet"
                style={[styles.foregroundSurface, surfaceStyle]}
              >
                <Animated.View
                  accessibilityElementsHidden={menuOpen}
                  importantForAccessibility={menuOpen ? 'no-hide-descendants' : 'auto'}
                  style={[styles.foregroundContent, contentStyle]}
                >
                  {children}
                </Animated.View>
                {menuOpen ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close navigation menu"
                    testID="capability.menu.cover"
                    onPress={coverMenu}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  menuUnderlay: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
    backgroundColor: colors.canvas,
  },
  motionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientShadow: {
    flex: 1,
    backgroundColor: colors.canvas,
    shadowColor: colors.sumi900,
    shadowOffset: { width: -4, height: 0 },
    shadowRadius: 16,
    elevation: 12,
  },
  contactShadow: {
    flex: 1,
    backgroundColor: colors.canvas,
    shadowColor: colors.sumi900,
    shadowOffset: { width: -1, height: 0 },
    shadowRadius: 3,
  },
  foregroundSurface: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  foregroundContent: {
    flex: 1,
  },
});

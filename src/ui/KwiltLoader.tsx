import { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type ActivityIndicatorProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme';
import { Logo } from './Logo';
import { useAccessibilityPreferences } from './hooks/useAccessibilityPreferences';

export type KwiltLoaderPhase = 'idle' | 'loading' | 'completing';

type KwiltLoaderProps = {
  accessible?: boolean;
  accessibilityLabel?: string;
  color?: string;
  phase?: KwiltLoaderPhase;
  resolvedOpacity?: number;
  size?: ActivityIndicatorProps['size'];
  style?: StyleProp<ViewStyle>;
};

const CANVAS_SIZE = 50;
const MORPH_MS = 180;
const ACCELERATION_MS = 360;
const CRUISE_TURN_MS = 200;
const CRUISE_TURNS_PER_CYCLE = 2;
const CRUISE_MS = CRUISE_TURN_MS * CRUISE_TURNS_PER_CYCLE;
const DECELERATION_MS = 360;
const LOGO_DWELL_MS = 240;
const DECELERATION_START_MS = MORPH_MS + ACCELERATION_MS + CRUISE_MS;
const ORIGINAL_RETURN_DELAY_MS = DECELERATION_START_MS + 90 - MORPH_MS;

export const KWILT_REFRESH_MINIMUM_MS = 940;
export const KWILT_REFRESH_COMPLETION_MS = 440;

export function KwiltLoader({
  accessible = false,
  accessibilityLabel = 'Loading',
  color,
  phase,
  resolvedOpacity = 0.16,
  size = 'small',
  style,
}: KwiltLoaderProps) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const indeterminate = phase === undefined;
  const resolvedPhase = phase ?? 'loading';
  const rotation = useSharedValue(0);
  const orbitScale = useSharedValue(1);
  const markOpacity = useSharedValue(resolvedOpacity);
  const originalOpacity = useSharedValue(1);
  const originalScale = useSharedValue(1);
  const pebbleOpacity = useSharedValue(0);
  const pebbleScale = useSharedValue(0.35);
  const pebbleColor = useSharedValue(0);
  const resolvedSize = typeof size === 'number' ? size : size === 'large' ? 40 : 18;
  const resolvedColor = color ?? colors.pine700; // @kwilt-brand-moment: the Kwilt mark is the canonical progress indicator.
  const initialPebbleColor = color ?? colors.pine400; // @kwilt-brand-moment: the Kwilt mark is the canonical progress indicator.

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: resolvedSize / CANVAS_SIZE }],
  }));
  const originalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: originalOpacity.value,
    transform: [{ scale: originalScale.value }],
  }));
  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pebbleOpacity.value,
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: pebbleScale.value * orbitScale.value },
    ],
  }));
  const pebbleAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pebbleColor.value,
      [0, 1],
      [initialPebbleColor, resolvedColor],
    ),
  }));

  useEffect(() => {
    const cancelAll = () => {
      cancelAnimation(rotation);
      cancelAnimation(orbitScale);
      cancelAnimation(markOpacity);
      cancelAnimation(originalOpacity);
      cancelAnimation(originalScale);
      cancelAnimation(pebbleOpacity);
      cancelAnimation(pebbleScale);
      cancelAnimation(pebbleColor);
    };
    const showLogo = (opacity: number) => {
      rotation.value = 0;
      orbitScale.value = 1;
      markOpacity.value = opacity;
      originalOpacity.value = 1;
      originalScale.value = 1;
      pebbleOpacity.value = 0;
      pebbleScale.value = 0.35;
      pebbleColor.value = 0;
    };

    cancelAll();

    if (resolvedPhase === 'idle') {
      showLogo(resolvedOpacity);
      return cancelAll;
    }

    if (reduceMotionEnabled) {
      showLogo(resolvedPhase === 'loading' ? 1 : resolvedOpacity);
      return cancelAll;
    }

    if (resolvedPhase === 'loading' && indeterminate) {
      showLogo(resolvedOpacity);

      rotation.value = withRepeat(
        withSequence(
          withDelay(MORPH_MS, withTiming(360, {
            duration: ACCELERATION_MS,
            easing: Easing.bezier(0.45, 0, 0.75, 0.72),
          })),
          withTiming(360 + (360 * CRUISE_TURNS_PER_CYCLE), {
            duration: CRUISE_MS,
            easing: Easing.linear,
          }),
          withTiming(720 + (360 * CRUISE_TURNS_PER_CYCLE), {
            duration: DECELERATION_MS,
            easing: Easing.bezier(0.25, 0.45, 0.55, 1),
          }),
          withDelay(LOGO_DWELL_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
      orbitScale.value = withRepeat(
        withSequence(
          withDelay(DECELERATION_START_MS, withTiming(0.82, {
            duration: DECELERATION_MS,
            easing: Easing.bezier(0.25, 0.45, 0.55, 1),
          })),
          withDelay(LOGO_DWELL_MS, withTiming(1, { duration: 0 })),
        ),
        -1,
        false,
      );
      markOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: ACCELERATION_MS, easing: Easing.out(Easing.quad) }),
          withDelay(MORPH_MS + CRUISE_MS, withTiming(resolvedOpacity, {
            duration: DECELERATION_MS,
            easing: Easing.out(Easing.quad),
          })),
          withDelay(LOGO_DWELL_MS, withTiming(resolvedOpacity, { duration: 0 })),
        ),
        -1,
        false,
      );
      originalOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: MORPH_MS, easing: Easing.inOut(Easing.quad) }),
          withDelay(ORIGINAL_RETURN_DELAY_MS, withTiming(1, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          })),
          withDelay(DECELERATION_MS - 90 - 220 + LOGO_DWELL_MS, withTiming(1, { duration: 0 })),
        ),
        -1,
        false,
      );
      originalScale.value = withRepeat(
        withSequence(
          withTiming(0.32, { duration: MORPH_MS, easing: Easing.inOut(Easing.quad) }),
          withDelay(ORIGINAL_RETURN_DELAY_MS, withTiming(1.06, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          })),
          withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
          withDelay(DECELERATION_MS - 90 - 220 - 60 + LOGO_DWELL_MS, withTiming(1, { duration: 0 })),
        ),
        -1,
        false,
      );
      pebbleOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: MORPH_MS, easing: Easing.inOut(Easing.quad) }),
          withDelay(ORIGINAL_RETURN_DELAY_MS, withTiming(0, {
            duration: 270,
            easing: Easing.out(Easing.quad),
          })),
          withDelay(DECELERATION_MS - 90 - 270 + LOGO_DWELL_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
      pebbleScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: MORPH_MS, easing: Easing.inOut(Easing.quad) }),
          withDelay(ORIGINAL_RETURN_DELAY_MS, withTiming(0.45, {
            duration: 270,
            easing: Easing.out(Easing.quad),
          })),
          withDelay(DECELERATION_MS - 90 - 270 + LOGO_DWELL_MS, withTiming(0.35, { duration: 0 })),
        ),
        -1,
        false,
      );
      pebbleColor.value = withRepeat(
        withSequence(
          withDelay(140, withTiming(1, {
            duration: ACCELERATION_MS,
            easing: Easing.out(Easing.quad),
          })),
          withDelay(DECELERATION_START_MS - 140 - ACCELERATION_MS, withTiming(0, {
            duration: 320,
            easing: Easing.out(Easing.quad),
          })),
          withDelay(DECELERATION_MS - 320 + LOGO_DWELL_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      );
      return cancelAll;
    }

    if (resolvedPhase === 'loading') {
      showLogo(resolvedOpacity);
      markOpacity.value = withTiming(1, {
        duration: ACCELERATION_MS,
        easing: Easing.out(Easing.quad),
      });
      originalOpacity.value = withTiming(0, {
        duration: MORPH_MS,
        easing: Easing.inOut(Easing.quad),
      });
      originalScale.value = withTiming(0.32, {
        duration: MORPH_MS,
        easing: Easing.inOut(Easing.quad),
      });
      pebbleOpacity.value = withTiming(1, {
        duration: MORPH_MS,
        easing: Easing.inOut(Easing.quad),
      });
      pebbleScale.value = withTiming(1, {
        duration: MORPH_MS,
        easing: Easing.inOut(Easing.quad),
      });
      pebbleColor.value = withDelay(140, withTiming(1, {
        duration: ACCELERATION_MS,
        easing: Easing.out(Easing.quad),
      }));
      rotation.value = withSequence(
        withDelay(MORPH_MS, withTiming(360, {
          duration: ACCELERATION_MS,
          easing: Easing.bezier(0.45, 0, 0.75, 0.72),
        })),
        withRepeat(
          withTiming(720, { duration: CRUISE_TURN_MS, easing: Easing.linear }),
          -1,
          false,
        ),
      );
      return cancelAll;
    }

    rotation.value = withTiming(rotation.value + 360, {
      duration: DECELERATION_MS,
      easing: Easing.bezier(0.25, 0.45, 0.55, 1),
    });
    orbitScale.value = withTiming(0.82, {
      duration: DECELERATION_MS,
      easing: Easing.bezier(0.25, 0.45, 0.55, 1),
    });
    pebbleOpacity.value = withDelay(90, withTiming(0, {
      duration: 270,
      easing: Easing.out(Easing.quad),
    }));
    pebbleScale.value = withDelay(90, withTiming(0.45, {
      duration: 270,
      easing: Easing.out(Easing.quad),
    }));
    pebbleColor.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.quad),
    });
    originalOpacity.value = withDelay(90, withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    }));
    originalScale.value = withSequence(
      withDelay(90, withTiming(1.06, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      })),
      withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
    );
    markOpacity.value = withTiming(resolvedOpacity, {
      duration: KWILT_REFRESH_COMPLETION_MS,
      easing: Easing.out(Easing.quad),
    });
    return cancelAll;
  }, [
    indeterminate,
    markOpacity,
    orbitScale,
    originalOpacity,
    originalScale,
    pebbleColor,
    pebbleOpacity,
    pebbleScale,
    reduceMotionEnabled,
    resolvedOpacity,
    resolvedPhase,
    rotation,
  ]);

  return (
    <View
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      accessibilityRole={accessible ? 'progressbar' : undefined}
      accessible={accessible}
      pointerEvents="none"
      style={[{ width: resolvedSize, height: resolvedSize }, style]}
    >
      <Animated.View style={[styles.canvas, canvasAnimatedStyle]}>
        <Animated.View style={[styles.layer, originalAnimatedStyle]}>
          <Logo color={resolvedColor} size={32} />
        </Animated.View>
        <Animated.View style={[styles.layer, orbitAnimatedStyle]}>
          <Animated.View style={[styles.pebble, styles.pebbleTop, pebbleAnimatedStyle]} />
          <Animated.View style={[styles.pebble, styles.pebbleRight, pebbleAnimatedStyle]} />
          <Animated.View style={[styles.pebble, styles.pebbleLeft, pebbleAnimatedStyle]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'top left',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pebble: { position: 'absolute', borderRadius: 999 },
  pebbleTop: { top: 13.8, left: 22.1, width: 5.8, height: 7 },
  pebbleRight: { top: 27.2, left: 27.2, width: 7, height: 5.8, transform: [{ rotate: '24deg' }] },
  pebbleLeft: { top: 27.2, left: 15.7, width: 7, height: 5.8, transform: [{ rotate: '-24deg' }] },
});

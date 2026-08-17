import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ActivityIndicatorProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '../theme';
import { Logo } from './Logo';
import { useAccessibilityPreferences } from './hooks/useAccessibilityPreferences';

export type KwiltLoaderPhase = 'idle' | 'loading' | 'completing';

type KwiltLoaderProps = {
  accessible?: boolean;
  accessibilityLabel?: string;
  color?: string;
  phase?: KwiltLoaderPhase;
  size?: ActivityIndicatorProps['size'];
  style?: StyleProp<ViewStyle>;
};

const CANVAS_SIZE = 50;
const ACCELERATION_MS = 360;
const CRUISE_TURN_MS = 200;
const DECELERATION_MS = 360;

export const KWILT_REFRESH_MINIMUM_MS = 940;
export const KWILT_REFRESH_COMPLETION_MS = 440;

export function KwiltLoader({
  accessible = false,
  accessibilityLabel = 'Loading',
  color,
  phase = 'loading',
  size = 'small',
  style,
}: KwiltLoaderProps) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const animationsDisabled = reduceMotionEnabled || process.env.NODE_ENV === 'test';
  const phaseRef = useRef(phase);
  const accelerationRef = useRef<Animated.CompositeAnimation | null>(null);
  const cruiseRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const orbitScale = useRef(new Animated.Value(1)).current;
  const markOpacity = useRef(new Animated.Value(0.16)).current;
  const originalOpacity = useRef(new Animated.Value(1)).current;
  const originalScale = useRef(new Animated.Value(1)).current;
  const pebbleOpacity = useRef(new Animated.Value(0)).current;
  const pebbleScale = useRef(new Animated.Value(0.35)).current;
  const pebbleColor = useRef(new Animated.Value(0)).current;
  const resolvedSize = typeof size === 'number' ? size : size === 'large' ? 40 : 18;
  const resolvedColor = color ?? colors.pine700; // @kwilt-brand-moment: the Kwilt mark is the canonical progress indicator.
  const initialPebbleColor = color ?? colors.pine400; // @kwilt-brand-moment: the Kwilt mark is the canonical progress indicator.

  const rotationDegrees = rotation.interpolate({
    inputRange: [0, 720],
    outputRange: ['0deg', '720deg'],
  });
  const pebbleBackgroundColor = pebbleColor.interpolate({
    inputRange: [0, 1],
    outputRange: [initialPebbleColor, resolvedColor], // @kwilt-brand-moment: the Kwilt mark is the canonical progress indicator.
  });

  useEffect(() => {
    phaseRef.current = phase;

    if (phase === 'idle') {
      accelerationRef.current?.stop();
      cruiseRef.current?.stop();
      rotation.stopAnimation();
      rotation.setValue(0);
      orbitScale.setValue(1);
      markOpacity.setValue(0.16);
      originalOpacity.setValue(1);
      originalScale.setValue(1);
      pebbleOpacity.setValue(0);
      pebbleScale.setValue(0.35);
      pebbleColor.setValue(0);
      return;
    }

    if (phase === 'loading') {
      accelerationRef.current?.stop();
      cruiseRef.current?.stop();
      rotation.stopAnimation();
      rotation.setValue(0);
      orbitScale.setValue(1);

      if (animationsDisabled) {
        markOpacity.setValue(1);
        originalOpacity.setValue(0);
        originalScale.setValue(0.32);
        pebbleOpacity.setValue(1);
        pebbleScale.setValue(1);
        pebbleColor.setValue(1);
        return;
      }

      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: ACCELERATION_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(originalOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(originalScale, {
          toValue: 0.32,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pebbleOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pebbleScale, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(140),
          Animated.timing(pebbleColor, {
            toValue: 1,
            duration: ACCELERATION_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ]).start();

      const acceleration = Animated.sequence([
        Animated.delay(180),
        Animated.timing(rotation, {
          toValue: 360,
          duration: ACCELERATION_MS,
          easing: Easing.bezier(0.45, 0, 0.75, 0.72),
          useNativeDriver: true,
        }),
      ]);
      accelerationRef.current = acceleration;
      acceleration.start(({ finished }) => {
        if (!finished || phaseRef.current !== 'loading') return;
        rotation.setValue(0);
        const cruise = Animated.loop(
          Animated.timing(rotation, {
            toValue: 360,
            duration: CRUISE_TURN_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        cruiseRef.current = cruise;
        cruise.start();
      });
      return;
    }

    accelerationRef.current?.stop();
    cruiseRef.current?.stop();

    if (animationsDisabled) {
      rotation.stopAnimation();
      markOpacity.setValue(0.16);
      originalOpacity.setValue(1);
      originalScale.setValue(1);
      pebbleOpacity.setValue(0);
      pebbleScale.setValue(0.45);
      pebbleColor.setValue(0);
      return;
    }

    rotation.stopAnimation((currentRotation) => {
      Animated.parallel([
        Animated.timing(rotation, {
          toValue: currentRotation + 360,
          duration: DECELERATION_MS,
          easing: Easing.bezier(0.25, 0.45, 0.55, 1),
          useNativeDriver: true,
        }),
        Animated.timing(orbitScale, {
          toValue: 0.82,
          duration: DECELERATION_MS,
          easing: Easing.bezier(0.25, 0.45, 0.55, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(pebbleOpacity, {
            toValue: 0,
            duration: 270,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(pebbleScale, {
            toValue: 0.45,
            duration: 270,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(pebbleColor, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(originalOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(90),
          Animated.timing(originalScale, {
            toValue: 1.06,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(originalScale, {
            toValue: 1,
            duration: 60,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(markOpacity, {
          toValue: 0.16,
          duration: KWILT_REFRESH_COMPLETION_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [animationsDisabled, markOpacity, orbitScale, originalOpacity, originalScale, pebbleColor, pebbleOpacity, pebbleScale, phase, rotation]);

  useEffect(() => () => {
    accelerationRef.current?.stop();
    cruiseRef.current?.stop();
    rotation.stopAnimation();
  }, [rotation]);

  return (
    <View
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      accessibilityRole={accessible ? 'progressbar' : undefined}
      accessible={accessible}
      pointerEvents="none"
      style={[{ width: resolvedSize, height: resolvedSize }, style]}
    >
      <Animated.View
        style={[
          styles.canvas,
          {
            opacity: markOpacity,
            transform: [{ scale: resolvedSize / CANVAS_SIZE }],
          },
        ]}
      >
        <Animated.View style={[styles.layer, { opacity: originalOpacity, transform: [{ scale: originalScale }] }]}>
          <Logo color={resolvedColor} size={32} />
        </Animated.View>
        <Animated.View
          style={[
            styles.layer,
            {
              opacity: pebbleOpacity,
              transform: [
                { rotate: rotationDegrees },
                { scale: Animated.multiply(pebbleScale, orbitScale) },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.pebble, styles.pebbleTop, { backgroundColor: pebbleBackgroundColor }]} />
          <Animated.View style={[styles.pebble, styles.pebbleRight, { backgroundColor: pebbleBackgroundColor }]} />
          <Animated.View style={[styles.pebble, styles.pebbleLeft, { backgroundColor: pebbleBackgroundColor }]} />
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

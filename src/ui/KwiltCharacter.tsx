import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

type KwiltCharacterMood = 'calm' | 'happy' | 'focused';

type KwiltCharacterProps = {
  size?: number;
  mood?: KwiltCharacterMood;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const MOOD_EYES: Record<KwiltCharacterMood, { left: ViewStyle; right: ViewStyle }> = {
  calm: {
    left: { width: 10, height: 3, borderRadius: 999 },
    right: { width: 10, height: 3, borderRadius: 999 },
  },
  happy: {
    left: {
      width: 10,
      height: 6,
      borderBottomWidth: 3,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderRadius: 999,
      backgroundColor: 'transparent',
    },
    right: {
      width: 10,
      height: 6,
      borderBottomWidth: 3,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderRadius: 999,
      backgroundColor: 'transparent',
    },
  },
  focused: {
    left: { width: 4, height: 7, borderRadius: 999 },
    right: { width: 4, height: 7, borderRadius: 999 },
  },
};

export function KwiltCharacter({
  size = 88,
  mood = 'calm',
  animated = false,
  style,
  accessibilityLabel = 'Kwilt character',
}: KwiltCharacterProps) {
  const bodyMotion = useRef(new Animated.Value(0)).current;
  const blinkMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) {
      bodyMotion.setValue(0);
      blinkMotion.setValue(1);
      return;
    }

    const bodyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bodyMotion, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bodyMotion, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(blinkMotion, {
          toValue: 0.12,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blinkMotion, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2400),
      ])
    );

    bodyLoop.start();
    blinkLoop.start();

    return () => {
      bodyLoop.stop();
      blinkLoop.stop();
    };
  }, [animated, blinkMotion, bodyMotion]);

  const characterStyle = useMemo(
    () => ({
      width: size,
      height: size * 1.08,
    }),
    [size]
  );

  const bodyTranslateY = bodyMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.035],
  });
  const bodyScale = bodyMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });
  const footScaleY = bodyMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.86],
  });
  const eyeScaleY = animated ? blinkMotion : 1;
  const eyeStyle = MOOD_EYES[mood];

  return (
    <View
      style={[styles.root, characterStyle, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.body,
          {
            transform: [{ translateY: bodyTranslateY }, { scale: bodyScale }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 96 96">
          <Defs>
            <ClipPath id="kwilt-character-body">
              <Rect x={9} y={7} width={78} height={78} rx={20} />
            </ClipPath>
          </Defs>

          <Rect x={9} y={7} width={78} height={78} rx={20} fill={colors.pine700} />
          <G clipPath="url(#kwilt-character-body)">
            <Path
              d="M-2 34C16 20 35 20 49 35C63 50 78 52 99 37"
              stroke={colors.parchment}
              strokeWidth={8.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M-1 61C17 43 35 39 52 55C67 69 79 73 99 61"
              stroke={colors.parchment}
              strokeWidth={8.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M24 3C18 24 18 47 28 65"
              stroke={colors.parchment}
              strokeWidth={7.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M72 2C55 14 43 29 37 46"
              stroke={colors.parchment}
              strokeWidth={7.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M63 93C60 73 51 58 35 46"
              stroke={colors.parchment}
              strokeWidth={7.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M88 20C71 22 59 30 47 43"
              stroke={colors.pine500}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              opacity={0.5}
            />
            <Path
              d="M8 74C26 82 42 81 57 70"
              stroke={colors.pine500}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              opacity={0.46}
            />
          </G>
          <Rect
            x={9}
            y={7}
            width={78}
            height={78}
            rx={20}
            fill="none"
            stroke={colors.pine800}
            strokeWidth={2.4}
            opacity={0.55}
          />
        </Svg>

        <View pointerEvents="none" style={styles.face}>
          <Animated.View
            style={[
              styles.eye,
              styles.eyeLeft,
              eyeStyle.left,
              { transform: [{ scaleY: eyeScaleY }] },
            ]}
          />
          <Animated.View
            style={[
              styles.eye,
              styles.eyeRight,
              eyeStyle.right,
              { transform: [{ scaleY: eyeScaleY }] },
            ]}
          />
          <View style={[styles.cheek, styles.cheekLeft]} />
          <View style={[styles.cheek, styles.cheekRight]} />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.foot,
          styles.footLeft,
          {
            width: size * 0.18,
            height: size * 0.08,
            borderRadius: size * 0.04,
            transform: [{ scaleY: footScaleY }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.foot,
          styles.footRight,
          {
            width: size * 0.18,
            height: size * 0.08,
            borderRadius: size * 0.04,
            transform: [{ scaleY: footScaleY }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  body: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 1,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
  },
  eye: {
    position: 'absolute',
    top: '48%',
    backgroundColor: colors.sumi900,
    borderColor: colors.sumi900,
  },
  eyeLeft: {
    left: '34%',
  },
  eyeRight: {
    right: '34%',
  },
  cheek: {
    position: 'absolute',
    top: '56%',
    width: 9,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.madder300,
    opacity: 0.72,
  },
  cheekLeft: {
    left: '25%',
  },
  cheekRight: {
    right: '25%',
  },
  foot: {
    position: 'absolute',
    bottom: 1,
    backgroundColor: colors.pine900,
    opacity: 0.86,
  },
  footLeft: {
    left: '28%',
  },
  footRight: {
    right: '28%',
  },
});

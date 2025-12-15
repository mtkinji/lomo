import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../../ui/Logo';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';

interface LaunchScreenProps {
  onAnimationComplete?: () => void;
}

export function LaunchScreen({ onAnimationComplete }: LaunchScreenProps) {
  // Keep this aligned with the desired "launch screen" duration in App.
  const TOTAL_DURATION_MS = 2500;
  const INTRO_DURATION_MS = 420;
  const EXIT_DURATION_MS = 280;

  const insets = useSafeAreaInsets();
  const introAnim = React.useRef(new Animated.Value(0)).current;
  const exitAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: INTRO_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  React.useEffect(() => {
    // Start exit animation so it *finishes* at TOTAL_DURATION_MS.
    // Make it snappier and less linear: a strong ease-in (slow start → fast end).
    const exitDelayMs = Math.max(0, TOTAL_DURATION_MS - EXIT_DURATION_MS);
    const exitTimeout = setTimeout(() => {
      Animated.timing(exitAnim, {
        toValue: 0,
        duration: EXIT_DURATION_MS,
        easing: Easing.bezier(0.78, 0, 1, 1),
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete?.();
      });
    }, exitDelayMs);

    return () => clearTimeout(exitTimeout);
  }, [EXIT_DURATION_MS, TOTAL_DURATION_MS, exitAnim, onAnimationComplete]);

  // Opacity combines both animations - fades in, then fades out
  const opacity = Animated.multiply(introAnim, exitAnim);
  
  // Intro: translate from 10px down to 0
  const introTranslateY = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  
  // Exit: translate from 0 to -30px up (moves upward while fading)
  const exitTranslateY = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 0],
  });
  
  // Exit: scale from 1 to 0.85 (slight shrink effect)
  const scale = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  // Combine translateY values: intro brings it up, exit moves it further up
  const translateY = Animated.add(introTranslateY, exitTranslateY);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.heroSurface}>
        <Animated.View
          style={[
            styles.brandLockup,
            {
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <Logo size={72} />
          <Text style={styles.wordmark}>kwilt</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.pine400,
  },
  heroSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  brandLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: spacing.sm,
  },
  wordmark: {
    ...typography.brand,
    color: colors.pine700,
    fontSize: 36,
    // Sriracha has tall ascenders; give it a touch of extra vertical room so
    // iOS doesn't clip the very top pixels on certain rasterization passes.
    lineHeight: 46,
    paddingTop: 2,
    paddingBottom: 2,
    textShadowColor: colors.pine800,
    textShadowOffset: { width: 0.4, height: 0.4 },
    textShadowRadius: 1,
  },
});



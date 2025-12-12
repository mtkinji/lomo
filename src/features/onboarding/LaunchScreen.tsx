import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '../../ui/Logo';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';

export function LaunchScreen() {
  const insets = useSafeAreaInsets();
  const introAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  const opacity = introAnim;
  const translateY = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <LinearGradient
      colors={[colors.pine200, colors.pine300, colors.pine400]}
      style={[
        styles.shell,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.heroSurface}>
        <Animated.View style={[styles.brandLockup, { opacity, transform: [{ translateY }] }]}>
          <Logo size={72} />
          <Text style={styles.wordmark}>kwilt</Text>
          <Text style={styles.tagline}>Design your future self—then live it in tiny steps.</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
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
    lineHeight: 42,
    textShadowColor: colors.pine800,
    textShadowOffset: { width: 0.4, height: 0.4 },
    textShadowRadius: 1,
  },
  tagline: {
    ...typography.bodySm,
    color: colors.pine900,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
  },
});



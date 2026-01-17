import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Portal } from '@rn-primitives/portal';
import { colors, spacing, typography } from '../theme';
import { Text, Heading } from './Typography';
import { Button } from './Button';
import { CelebrationGif } from './CelebrationGif';
import { useCelebrationStore, type CelebrationMoment } from '../store/useCelebrationStore';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { HapticsService } from '../services/HapticsService';

const CONFETTI_COUNT = 24;

/**
 * A single confetti piece that falls and rotates
 */
function ConfettiPiece({
  delay,
  startX,
  color,
}: {
  delay: number;
  startX: number;
  color: string;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fallDuration = 2800 + Math.random() * 1200;
    const driftAmount = (Math.random() - 0.5) * 120;

    Animated.parallel([
      Animated.timing(fall, {
        toValue: 1,
        duration: fallDuration,
        delay,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 1,
        duration: fallDuration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: driftAmount,
        duration: fallDuration,
        delay,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, drift, fall, rotation]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 900],
  });

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${360 + Math.random() * 720}deg`],
  });

  const opacity = fall.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = fall.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 1, 0.6],
  });

  const size = 8 + Math.random() * 10;
  const shape = Math.random() > 0.5 ? size : size / 3;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: startX,
          width: size,
          height: shape,
          backgroundColor: color,
          borderRadius: Math.random() > 0.6 ? size / 2 : 2,
          opacity,
          transform: [{ translateY }, { translateX: drift }, { rotate }, { scale }],
        },
      ]}
    />
  );
}

/**
 * Confetti burst animation layer
 */
function ConfettiBurst() {
  const confettiColors = [
    colors.turmeric400,
    colors.turmeric500,
    colors.pine400,
    colors.pine500,
    colors.madder400,
    colors.quiltBlue400,
    colors.accentRose,
    '#FFD93D', // bright yellow
    '#6BCB77', // fresh green
    '#4D96FF', // sky blue
  ];

  const pieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    delay: Math.random() * 400,
    startX: Math.random() * 100 + '%',
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          startX={parseFloat(piece.startX) * 3.6} // Convert % to approx px
          color={piece.color}
        />
      ))}
    </View>
  );
}

/**
 * Host component that renders the celebration interstitial when active.
 * Mount this once at the app root level.
 */
export function CelebrationInterstitialHost() {
  const activeCelebration = useCelebrationStore((s) => s.activeCelebration);
  const dismiss = useCelebrationStore((s) => s.dismiss);
  const showCelebrations = useAppStore(
    (s) => s.userProfile?.preferences?.showCelebrationMedia ?? true,
  );

  if (!showCelebrations || !activeCelebration) {
    return null;
  }

  return (
    <CelebrationInterstitialContent
      celebration={activeCelebration}
      onDismiss={dismiss}
    />
  );
}

type CelebrationInterstitialContentProps = {
  celebration: CelebrationMoment;
  onDismiss: () => void;
};

function CelebrationInterstitialContent({
  celebration,
  onDismiss,
}: CelebrationInterstitialContentProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const hapticFired = useRef(false);
  const suppressionKeyRef = useRef(
    `celebrationInterstitial-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );

  // Suppress toasts while the celebration is visible
  useEffect(() => {
    const key = suppressionKeyRef.current;
    useToastStore.getState().setToastsSuppressed({ key, suppressed: true });
    return () => {
      useToastStore.getState().setToastsSuppressed({ key, suppressed: false });
    };
  }, []);

  // Fire haptic on mount
  useEffect(() => {
    if (!hapticFired.current) {
      hapticFired.current = true;
      void HapticsService.trigger('outcome.bigSuccess');
    }
  }, []);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!celebration.autoDismissMs || celebration.autoDismissMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      handleDismiss();
    }, celebration.autoDismissMs);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration.autoDismissMs]);

  const handleDismiss = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const ageRange = useAppStore((s) => s.userProfile?.ageRange);

  return (
    <Portal name="celebration-interstitial">
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        {/* Background gradient */}
        <LinearGradient
          colors={[colors.pine700, colors.pine800, colors.sumi900]}
          style={StyleSheet.absoluteFill}
        />

        {/* Confetti layer */}
        <ConfettiBurst />

        {/* Content - use Pressable as full-screen tap target for auto-dismiss */}
        <Pressable
          style={styles.contentOuter}
          onPress={celebration.autoDismissMs ? handleDismiss : undefined}
          disabled={!celebration.autoDismissMs}
        >
          {/* Safe area spacer - pushes content to true visual center */}
          <View style={{ height: insets.top }} />

          <Animated.View
            style={[
              styles.content,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            {/* GIF Section */}
            <View style={styles.gifContainer}>
              <CelebrationGif
                role="celebration"
                kind={celebration.kind}
                ageRange={ageRange}
                size="md"
                showControls={true}
                variant="dark"
                maxHeight={220}
              />
            </View>

            {/* Text Section */}
            <View style={styles.textContainer}>
              <Heading variant="lg" style={styles.headline}>
                {celebration.headline}
              </Heading>
              {celebration.subheadline ? (
                <Text style={styles.subheadline}>{celebration.subheadline}</Text>
              ) : null}
            </View>

            {/* CTA Section */}
            <View style={styles.ctaContainer}>
              {celebration.autoDismissMs ? (
                // Auto-dismiss mode: show a subtle tap-anywhere affordance
                <View style={styles.tapToDismiss}>
                  <Text style={styles.tapToDismissText}>Tap anywhere to continue</Text>
                </View>
              ) : (
                // Manual dismiss mode: show a button
                <Button
                  variant="turmeric"
                  size="lg"
                  onPress={handleDismiss}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaLabel}>
                    {celebration.ctaLabel ?? 'Continue'}
                  </Text>
                </Button>
              )}
            </View>
          </Animated.View>

          {/* Safe area spacer - matches top for true centering */}
          <View style={{ height: insets.top }} />
        </Pressable>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
  contentOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 400,
  },
  gifContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  headline: {
    color: colors.parchment,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subheadline: {
    ...typography.body,
    color: colors.pine200,
    textAlign: 'center',
    opacity: 0.9,
    maxWidth: 300,
  },
  ctaContainer: {
    alignItems: 'center',
    width: '100%',
  },
  ctaButton: {
    minWidth: 200,
  },
  ctaLabel: {
    ...typography.body,
    fontFamily: typography.bodyBold.fontFamily,
    color: colors.sumi900,
  },
  tapToDismiss: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  tapToDismissText: {
    ...typography.bodySm,
    color: colors.pine300,
    opacity: 0.8,
  },
});


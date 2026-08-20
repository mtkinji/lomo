import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { FullScreenInterstitial } from '../../../ui/FullScreenInterstitial';
import { Logo } from '../../../ui/Logo';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';
import { Text } from '../../../ui/primitives';
import { OnboardingPageIndicator } from '../../capability-onboarding/OnboardingPageIndicator';
import {
  FOOD_ONBOARDING_MOMENTS,
  createFoodOnboardingState,
  reduceFoodOnboarding,
  type FoodOnboardingMomentId,
} from './foodOnboardingModel';

type Props = {
  initialMomentId?: FoodOnboardingMomentId | null;
  onCheckpoint: (momentId: FoodOnboardingMomentId) => void;
  onChooseAnotherPath: () => void;
  onStartChoosing: () => void;
};

export function FoodOnboardingFlow({
  initialMomentId = null,
  onCheckpoint,
  onChooseAnotherPath,
  onStartChoosing,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const [state, setState] = useState(() => createFoodOnboardingState(initialMomentId));
  const momentAnimation = useRef(new Animated.Value(1)).current;
  const checkpointRef = useRef(onCheckpoint);
  const moment = FOOD_ONBOARDING_MOMENTS[state.index];
  const isLast = state.index === FOOD_ONBOARDING_MOMENTS.length - 1;
  const illustrationWidth = Math.min(300, width - spacing.xl * 2);
  const illustrationHeight = Math.min(300, Math.round(height * 0.35));

  useEffect(() => {
    checkpointRef.current = onCheckpoint;
  }, [onCheckpoint]);

  useEffect(() => {
    checkpointRef.current(moment.id);
  }, [moment.id]);

  useEffect(() => {
    if (reduceMotionEnabled) {
      momentAnimation.setValue(1);
      return;
    }
    momentAnimation.setValue(0);
    Animated.timing(momentAnimation, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [moment.id, momentAnimation, reduceMotionEnabled]);

  const selectMoment = (nextIndex: number) => {
    if (nextIndex === state.index) return;
    setState((current) => reduceFoodOnboarding(current, {
      type: nextIndex > current.index ? 'next' : 'back',
    }));
  };

  return (
    <FullScreenInterstitial
      backgroundColor="parchment"
      contentStyle={styles.host}
      progression="button"
      transition={reduceMotionEnabled ? 'none' : 'fade'}
      visible
      withinModal
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Logo size={22} />
          <OnboardingPageIndicator
            count={FOOD_ONBOARDING_MOMENTS.length}
            currentIndex={state.index}
            onSelectPage={selectMoment}
          />
        </View>

        <Animated.View
          style={[
            styles.moment,
            {
              opacity: momentAnimation,
              transform: [{
                translateY: momentAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              }],
            },
          ]}
        >
          <View
            accessibilityLabel={moment.illustrationLabel}
            accessibilityRole="image"
            style={styles.illustrationSlot}
          >
            <Image
              fadeDuration={0}
              resizeMode="contain"
              source={require('../../../../assets/illustrations/capability-onboarding/meals.png')}
              style={{ width: illustrationWidth, height: illustrationHeight }}
            />
          </View>

          <View style={styles.copy}>
            <Text accessibilityRole="header" style={styles.title}>{moment.title}</Text>
            <Text style={styles.body}>{moment.body}</Text>
          </View>
        </Animated.View>

        <View style={styles.actions}>
          <Button
            onPress={state.index > 0
              ? () => setState((current) => reduceFoodOnboarding(current, { type: 'back' }))
              : onChooseAnotherPath}
            style={styles.quietAction}
            variant="ghost"
          >
            {state.index > 0 ? 'Back' : 'Change path'}
          </Button>
          <Button
            onPress={() => {
              if (isLast) onStartChoosing();
              else setState((current) => reduceFoodOnboarding(current, { type: 'next' }));
            }}
            style={styles.primaryAction}
          >
            {isLast ? 'Browse recipes' : 'Next'}
          </Button>
        </View>
      </View>
    </FullScreenInterstitial>
  );
}

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.parchment,
  },
  brandRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moment: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  illustrationSlot: {
    flexGrow: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    maxWidth: 440,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quietAction: {
    flex: 0.42,
  },
  primaryAction: {
    flex: 1,
  },
});

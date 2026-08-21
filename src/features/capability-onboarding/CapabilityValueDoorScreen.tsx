import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ButtonLabel } from '../../ui/Typography';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import { Text } from '../../ui/primitives';
import type { CapabilityOnboardingContract } from './capabilityOnboardingContracts';
import { CAPABILITY_ONBOARDING_ILLUSTRATIONS } from './capabilityOnboardingIllustrations';
import { shouldEnableVerticalOnboardingScroll } from './capabilityOnboardingPagerModel';

export function CapabilityValueDoorScreen({
  bottomAccessoryHeight = 76,
  door,
  onStart,
}: {
  bottomAccessoryHeight?: number;
  door: CapabilityOnboardingContract;
  onStart: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const arrowOffset = useRef(new Animated.Value(0)).current;
  const needsVerticalScroll = shouldEnableVerticalOnboardingScroll(fontScale);
  const illustrationWidth = Math.min(300, width - spacing.xl * 2);
  const illustrationHeight = Math.min(300, Math.round(height * 0.35));

  const animateArrow = useCallback((toValue: number, duration: number) => {
    arrowOffset.stopAnimation();
    if (reduceMotionEnabled) {
      arrowOffset.setValue(0);
      return;
    }
    Animated.timing(arrowOffset, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [arrowOffset, reduceMotionEnabled]);

  return (
    <ScrollView
      bounces={false}
      directionalLockEnabled
      contentContainerStyle={[
        styles.content,
        {
          minHeight: height,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + bottomAccessoryHeight,
        },
      ]}
      nestedScrollEnabled
      scrollEnabled={needsVerticalScroll}
      showsVerticalScrollIndicator={false}
      testID={`capabilityOnboarding.door.${door.id}`}
    >
      <View
        accessibilityLabel={door.story.illustrationLabel}
        accessibilityRole="image"
        style={styles.illustrationSlot}
      >
        {door.story.illustrationKey ? (
          <Image
            fadeDuration={0}
            resizeMode="contain"
            source={CAPABILITY_ONBOARDING_ILLUSTRATIONS[door.story.illustrationKey]}
            style={{ width: illustrationWidth, height: illustrationHeight }}
          />
        ) : (
          <View style={styles.iconMoment}>
            <Icon color={colors.pine700} name={door.icon} size={72} /> {/* @kwilt-brand-moment: capability onboarding illustration fallback */}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            {door.story.headline}
          </Text>
          <Text style={styles.body}>{door.story.body}</Text>
        </View>
        <View style={styles.actions}>
          <Button
            onPress={onStart}
            onPressIn={() => animateArrow(4, 90)}
            onPressOut={() => animateArrow(0, 140)}
            style={styles.primaryAction}
          >
            <View pointerEvents="none" style={styles.primaryActionContent}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                testID={`capabilityOnboarding.primaryActionIcon.${door.id}`}
              >
                <Icon color={colors.canvas} name={door.icon} size={17} />
              </View>
              <ButtonLabel tone="inverse">{door.story.actionLabel}</ButtonLabel>
              <Animated.View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ transform: [{ translateX: arrowOffset }] }}
                testID="capabilityOnboarding.primaryActionArrow"
              >
                <Icon color={colors.canvas} name="arrowRight" size={18} />
              </Animated.View>
            </View>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.parchment,
  },
  illustrationSlot: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  iconMoment: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine50, // @kwilt-brand-moment: capability onboarding illustration fallback
  },
  footer: {
    gap: spacing.sm,
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
    alignItems: 'flex-start',
  },
  primaryAction: {
    alignSelf: 'flex-start',
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});

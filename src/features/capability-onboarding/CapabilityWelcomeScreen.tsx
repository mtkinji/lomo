import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';
import { Logo } from '../../ui/Logo';
import { Text } from '../../ui/primitives';
import { shouldEnableVerticalOnboardingScroll } from './capabilityOnboardingPagerModel';

export function CapabilityWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const needsVerticalScroll = shouldEnableVerticalOnboardingScroll(fontScale);
  const illustrationWidth = Math.min(300, width - spacing.xl * 2);
  const illustrationHeight = Math.min(300, Math.round(height * 0.35));

  return (
    <ScrollView
      bounces={false}
      directionalLockEnabled
      contentContainerStyle={[
        styles.content,
        {
          minHeight: height,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + 76,
        },
      ]}
      nestedScrollEnabled
      scrollEnabled={needsVerticalScroll}
      showsVerticalScrollIndicator={false}
      testID="capabilityOnboarding.welcomePage"
    >
      <View style={styles.brandRow}>
        <Logo size={22} />
      </View>

      <View
        accessibilityLabel="A warm Kwilt welcome"
        accessibilityRole="image"
        style={styles.illustrationSlot}
      >
        <Image
          fadeDuration={0}
          resizeMode="contain"
          source={require('../../../assets/illustrations/welcome.png')}
          style={{ width: illustrationWidth, height: illustrationHeight }}
        />
      </View>

      <View style={styles.footerCopy}>
        <Text accessibilityRole="header" style={styles.title}>
          Welcome to Kwilt
        </Text>
        <Text style={styles.body}>
          Life has a lot of moving parts. Kwilt helps you set goals, manage money, plan meals,
          share chores, and make time to play. See a few ways to start, then choose what would help
          most today.
        </Text>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  illustrationSlot: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  footerCopy: {
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
});

import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { VStack, Heading, Text } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import type { PaywallReason, PaywallSource } from '../../services/paywall';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { LinearGradient } from 'expo-linear-gradient';
import { paywallTheme } from './paywallTheme';

type ScreenRouteProp = RouteProp<SettingsStackParamList, 'SettingsPaywall'>;
type ScreenNavProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsPaywall'>;

function getPaywallCopy(reason: PaywallReason, source: PaywallSource) {
  // Keep messaging value-oriented and context-specific.
  switch (reason) {
    case 'generative_quota_exceeded':
      return {
        title: 'Unlock more AI credits',
        subtitle:
          'You’ve used all AI credits for this period. Upgrade to Pro for a much larger monthly budget.',
        bullets: ['More AI credits', 'Unlimited arcs + goals', 'Pro tools (trial available)'],
      };
    case 'limit_goals_per_arc':
      return {
        title: 'Unlock more goals',
        subtitle: 'Free is limited to 3 goals per Arc. Pro removes limits so you can scale your arc without deleting progress.',
        bullets: ['Unlimited goals per Arc', 'Unlimited arcs', 'Pro tools (trial available)'],
      };
    case 'limit_arcs_total':
      return {
        title: 'Unlock more arcs',
        subtitle: 'Free is limited to 1 Arc. Pro removes limits so you can grow multiple identity directions.',
        bullets: ['Unlimited arcs', 'Unlimited goals', 'Pro tools (trial available)'],
      };
    case 'pro_only_unsplash_banners':
      return {
        title: 'Upgrade for Unsplash banners',
        subtitle: 'Use curated banners for free. Pro unlocks Unsplash search so your arcs can look exactly right.',
        bullets: ['Unsplash image search', 'Unlimited arcs + goals', 'Pro tools (trial available)'],
      };
    case 'pro_only_focus_mode':
      return {
        title: 'Unlock longer focus sessions',
        subtitle: 'Free focus sessions are capped at 10 minutes. Pro unlocks longer sessions for deeper work.',
        bullets: ['Longer focus sessions', 'Unlimited arcs + goals', 'Pro tools (trial available)'],
      };
    case 'pro_only_calendar_export':
      return {
        title: 'Unlock calendar export',
        subtitle: 'Pro Tools unlocks adding activities to your calendar so your plan shows up where your life happens.',
        bullets: ['Add to calendar (ICS)', 'AI scheduling tools', 'Unlimited arcs + goals (Pro)'],
      };
    case 'pro_only_ai_scheduling':
      return {
        title: 'Unlock AI scheduling',
        subtitle: 'Pro Tools unlocks scheduling help so you can turn intent into a realistic plan.',
        bullets: ['AI scheduling', 'Calendar export', 'Unlimited arcs + goals (Pro)'],
      };
    default:
      return {
        title: 'Upgrade to Pro',
        subtitle: 'Unlock Pro tools and remove limits.',
        bullets: ['Unlimited arcs + goals', 'Pro tools trial', 'Family plan available'],
      };
  }
}

export function PaywallInterstitialScreen() {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { reason, source } = route.params;

  const copy = useMemo(() => getPaywallCopy(reason, source), [reason, source]);

  return (
    <AppShell>
      <PageHeader title="Kwilt Pro" onPressMenu={() => navigation.goBack()} menuOpen={false} />
      <LinearGradient colors={paywallTheme.gradientColors} style={styles.hero}>
        <View style={styles.heroInner}>
          <VStack space="xs">
            <Text style={styles.kicker}>Kwilt Pro</Text>
            <Heading style={styles.title}>{copy.title}</Heading>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </VStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
            onPress={() => openPaywallPurchaseEntry()}
            style={styles.primaryCta}
          >
            <Text style={styles.primaryCtaLabel}>Upgrade</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={() => navigation.goBack()}
            style={styles.secondaryCta}
          >
            <Text style={styles.secondaryCtaLabel}>Not now</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.container}>
        <VStack space="sm" style={styles.bullets}>
          {copy.bullets.map((item) => (
            <Text key={item} style={styles.bullet}>
              {`• ${item}`}
            </Text>
          ))}
        </VStack>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.lg,
  },
  heroInner: {
    borderRadius: paywallTheme.cornerRadius,
    padding: paywallTheme.padding,
    borderWidth: 1,
    borderColor: paywallTheme.surfaceBorder,
  },
  kicker: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: paywallTheme.foreground,
  },
  subtitle: {
    ...typography.body,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
  bullets: {
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bullet: {
    ...typography.body,
    color: colors.text,
  },
  primaryCta: {
    marginTop: spacing.md,
    backgroundColor: paywallTheme.ctaBackground,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryCtaLabel: {
    ...typography.bodyBold,
    color: paywallTheme.ctaForeground,
  },
  secondaryCta: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: paywallTheme.ctaBorder,
    alignItems: 'center',
  },
  secondaryCtaLabel: {
    ...typography.body,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
});



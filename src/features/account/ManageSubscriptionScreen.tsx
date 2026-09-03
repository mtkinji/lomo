import React from 'react';
import { Alert, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { openManageSubscription } from '../../services/entitlements';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../../domain/generativeCredits';
import { getProUpgradeInvitation } from '../../domain/proAccessPolicy';
import { isAdvancedScreenTimePaywallEnabled } from '../screen-time/runtime/screenTimeMonetizationFlag';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Badge, HStack, Heading, Text, VStack } from '../../ui/primitives';
import { paywallTheme } from '../paywall/paywallTheme';
import { SubscriptionLegalLinks } from '../paywall/SubscriptionLegalLinks';

export function ManageSubscriptionScreen() {
  const proUpgradeInvitation = getProUpgradeInvitation(isAdvancedScreenTimePaywallEnabled());
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const isPro = useEntitlementsStore((state) => state.isPro);
  const isRefreshing = useEntitlementsStore((state) => state.isRefreshing);
  const restore = useEntitlementsStore((state) => state.restore);
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const bonusGenerativeCredits = useAppStore((state) => state.bonusGenerativeCredits);
  const { capture } = useAnalytics();

  const currentKey = getMonthKey(new Date());
  const baseMonthlyLimit = isPro
    ? PRO_GENERATIVE_CREDITS_PER_MONTH
    : FREE_GENERATIVE_CREDITS_PER_MONTH;
  const bonusRaw = bonusGenerativeCredits?.monthKey === currentKey
    ? Number(bonusGenerativeCredits.bonusThisMonth ?? 0)
    : 0;
  const bonusThisMonth = Number.isFinite(bonusRaw) ? Math.max(0, Math.floor(bonusRaw)) : 0;
  const monthlyLimit = baseMonthlyLimit + bonusThisMonth;
  const usedThisMonth = generativeCredits?.monthKey === currentKey
    ? Math.max(0, generativeCredits.usedThisMonth ?? 0)
    : 0;
  const remainingCredits = Math.max(0, monthlyLimit - usedThisMonth);

  const handleBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'SettingsHome' }] });
  }, [navigation]);

  return (
    <AppShell>
      <PageHeader title="Subscriptions" onPressBack={handleBack} />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <VStack space="lg">
            <VStack space="sm">
              <Text style={styles.sectionLabel}>Current tier</Text>
              {isPro ? (
                <LinearGradient colors={paywallTheme.gradientColors} style={styles.planGradient}>
                  <VStack space="xs">
                    <Heading style={styles.planTitle}>Kwilt Pro</Heading>
                    <Text style={styles.planSubtitle}>
                      Connected Money, advanced Screen Time, and advanced AI. Manage billing in the App Store.
                    </Text>
                  </VStack>
                </LinearGradient>
              ) : (
                <View style={styles.tierCard}>
                  <VStack space="sm">
                    <HStack style={styles.tierHeaderRow}>
                      <Badge variant="default" style={styles.freeBadge} textStyle={styles.freeBadgeText}>
                        Free
                      </Badge>
                      <Text style={styles.freeTierLabel}>Starter plan</Text>
                    </HStack>
                    <VStack space="xs">
                      <Text style={styles.tierBullet}>• Arcs, Goals, planning, Focus, and attachments</Text>
                      <Text style={styles.tierBullet}>• Basic one-condition Screen Time rules</Text>
                      <Text style={styles.tierBullet}>
                        <RNText style={styles.tierBulletStrong}>{`• ${monthlyLimit}`}</RNText>
                        {` AI credits / month`}
                      </Text>
                    </VStack>
                    <View style={styles.tierDivider} />
                    <VStack space="xs">
                      <Text style={styles.tierCreditsLabel}>AI credits remaining</Text>
                      <Heading
                        accessibilityLabel={`AI credits: ${remainingCredits} of ${monthlyLimit} remaining`}
                        style={styles.tierCreditsValue}
                      >
                        <RNText style={styles.creditsValueRemaining}>{remainingCredits}</RNText>
                        <RNText style={styles.creditsValueTotal}>{` / ${monthlyLimit}`}</RNText>
                      </Heading>
                      <Text style={styles.tierCreditsSubtitle}>Resets monthly</Text>
                    </VStack>
                  </VStack>
                </View>
              )}
            </VStack>

            {isPro ? (
              <VStack space="sm">
                <Text style={styles.sectionLabel}>AI credits</Text>
                <View style={styles.creditsCard}>
                  <VStack space="xs">
                    <Heading
                      accessibilityLabel={`AI credits: ${remainingCredits} of ${monthlyLimit} remaining`}
                      style={styles.creditsValue}
                    >
                      <RNText style={styles.creditsValueRemaining}>{remainingCredits}</RNText>
                      <RNText style={styles.creditsValueTotal}>{` / ${monthlyLimit}`}</RNText>
                    </Heading>
                    <Text style={styles.creditsSubtitle}>Pro monthly budget • resets monthly</Text>
                    {usedThisMonth > 0 ? (
                      <Text style={styles.creditsFootnote}>{`Used this month: ${usedThisMonth}`}</Text>
                    ) : null}
                  </VStack>
                </View>
              </VStack>
            ) : null}

            <VStack space="sm">
              {!isPro ? (
                <>
                  <Text style={styles.sectionLabel}>Kwilt Pro</Text>
                  <LinearGradient colors={paywallTheme.gradientColors} style={styles.upgradeCard}>
                    <VStack space="xs">
                      <Text style={styles.upgradeKicker}>Kwilt Pro</Text>
                      <Heading style={styles.upgradeTitle}>{proUpgradeInvitation.title}</Heading>
                      <Text style={styles.upgradeBody}>{proUpgradeInvitation.body}</Text>
                    </VStack>
                    <Button
                      accessibilityLabel="Choose a Pro plan"
                      fullWidth
                      onPress={openPaywallPurchaseEntry}
                      style={styles.upgradeCta}
                      variant="inverse"
                    >
                      Choose a Pro plan
                    </Button>
                  </LinearGradient>
                </>
              ) : (
                <>
                  <Button
                    disabled={isRefreshing}
                    onPress={() => {
                      openManageSubscription().catch(() => {
                        Alert.alert('Unable to open', 'Please open Apple subscription settings to manage your plan.');
                      });
                    }}
                    variant="outline"
                  >
                    Manage subscription
                  </Button>
                  <Button
                    disabled={isRefreshing}
                    onPress={() => {
                      openManageSubscription().catch(() => {
                        Alert.alert('Unable to open', 'Please open Apple subscription settings to change your plan.');
                      });
                    }}
                    variant="outline"
                  >
                    Change plan
                  </Button>
                </>
              )}

              <Button
                disabled={isRefreshing}
                onPress={() => {
                  capture(AnalyticsEvent.RestoreStarted);
                  restore()
                    .then(() => {
                      capture(AnalyticsEvent.RestoreSucceeded);
                      Alert.alert('Restored', 'We refreshed your subscription status.');
                    })
                    .catch((error: unknown) => {
                      const message = (error as { message?: string } | null)?.message
                        ?? 'We could not restore purchases right now.';
                      capture(AnalyticsEvent.RestoreFailed, { error: message });
                      Alert.alert('Restore failed', message);
                    })
                    .finally(() => {
                      refreshEntitlements({ force: true }).catch(() => undefined);
                    });
                }}
                variant="outline"
              >
                Restore purchases
              </Button>
            </VStack>

            <VStack space="xs">
              <Text style={styles.footnote}>Subscriptions are managed by Apple.</Text>
              <SubscriptionLegalLinks variant="footer" />
            </VStack>
          </VStack>
        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['2xl'] },
  sectionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  planGradient: {
    borderRadius: paywallTheme.cornerRadius,
    padding: paywallTheme.padding,
    borderWidth: 1,
    borderColor: paywallTheme.surfaceBorder,
  },
  planTitle: { ...typography.titleLg, color: paywallTheme.foreground },
  planSubtitle: { ...typography.bodySm, color: paywallTheme.foreground, opacity: 0.92 },
  tierCard: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  tierHeaderRow: { alignItems: 'center', justifyContent: 'space-between' },
  freeBadge: { borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  freeBadgeText: { fontFamily: typography.label.fontFamily, letterSpacing: 0.4 },
  freeTierLabel: { ...typography.bodySm, color: colors.textSecondary },
  tierBullet: { ...typography.bodySm, color: colors.textSecondary },
  tierBulletStrong: { color: colors.accent, fontFamily: typography.titleSm.fontFamily },
  tierDivider: { height: 1, backgroundColor: colors.border, opacity: 0.9 },
  tierCreditsLabel: { ...typography.bodySm, color: colors.textSecondary },
  tierCreditsValue: { ...typography.titleMd, color: colors.textPrimary },
  tierCreditsSubtitle: { ...typography.bodySm, color: colors.textSecondary },
  creditsCard: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  creditsValue: { ...typography.titleLg, color: colors.textPrimary },
  creditsValueRemaining: { color: colors.accent },
  creditsValueTotal: { color: colors.muted },
  creditsSubtitle: { ...typography.bodySm, color: colors.textSecondary },
  creditsFootnote: { ...typography.bodySm, color: colors.textSecondary, opacity: 0.92 },
  upgradeCard: {
    borderRadius: paywallTheme.cornerRadius,
    padding: paywallTheme.padding,
    borderWidth: 1,
    borderColor: paywallTheme.surfaceBorder,
    marginBottom: spacing.xs,
  },
  upgradeKicker: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  upgradeTitle: { ...typography.titleMd, color: paywallTheme.foreground },
  upgradeBody: { ...typography.bodySm, color: paywallTheme.foreground, opacity: 0.92 },
  upgradeCta: { marginTop: spacing.md },
  footnote: { ...typography.bodySm, color: colors.textSecondary },
});

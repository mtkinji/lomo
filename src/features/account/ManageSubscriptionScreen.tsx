import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { Badge, HStack, VStack, Heading, Text } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { paywallTheme } from '../paywall/paywallTheme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { getProSku, getProSkuPricing, openManageSubscription } from '../../services/entitlements';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useAppStore } from '../../store/useAppStore';
import { FREE_MAX_ACTIVE_GOALS_PER_ARC, FREE_MAX_ARCS_TOTAL } from '../../domain/limits';
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../../domain/generativeCredits';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

type BillingCadence = 'annual' | 'monthly';
type ProPlan = 'individual' | 'family';

const ANNUAL_NUDGE_STREAK_THRESHOLD = 3;

const PLAN_PRICING: Record<ProPlan, { monthly: number; annual: number }> = {
  individual: { monthly: 4.99, annual: 44.99 },
  family: { monthly: 9.99, annual: 89.99 },
};

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPriceLabel(plan: ProPlan, cadence: BillingCadence): string {
  const pricing = PLAN_PRICING[plan];
  const amount = cadence === 'annual' ? pricing.annual : pricing.monthly;
  return cadence === 'annual' ? `${formatMoney(amount)}/yr` : `${formatMoney(amount)}/mo`;
}

function formatPriceLabelWithRevenueCat(params: {
  plan: ProPlan;
  cadence: BillingCadence;
  skuPricing: Record<string, { priceString?: string }> | null;
}): string {
  const sku = getProSku(params.plan, params.cadence);
  const priceString = params.skuPricing?.[sku]?.priceString;
  if (typeof priceString === 'string' && priceString.length > 0) {
    return params.cadence === 'annual' ? `${priceString}/yr` : `${priceString}/mo`;
  }
  return formatPriceLabel(params.plan, params.cadence);
}

function PlanRow({
  title,
  subtitle,
  priceLabel,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Select plan ${title}`}
      onPress={onPress}
      style={[styles.planRow, selected && styles.planRowSelected]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.planRowTitle}>{title}</Text>
        <Text style={styles.planRowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.planRowRight}>
        <Text style={styles.planRowPrice}>{priceLabel}</Text>
        <Text style={styles.planRowCheck}>{selected ? '✓' : ''}</Text>
      </View>
    </Pressable>
  );
}

export function ManageSubscriptionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'SettingsManageSubscription'>>();
  const isPro = useEntitlementsStore((state) => state.isPro);
  const isRefreshing = useEntitlementsStore((state) => state.isRefreshing);
  const purchase = useEntitlementsStore((state) => state.purchase);
  const restore = useEntitlementsStore((state) => state.restore);
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);
  const { capture } = useAnalytics();
  const currentShowUpStreak = useAppStore((state) => state.currentShowUpStreak);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const bonusGenerativeCredits = useAppStore((state) => state.bonusGenerativeCredits);
  const [pricingDrawerVisible, setPricingDrawerVisible] = React.useState(false);
  const [skuPricing, setSkuPricing] = React.useState<Record<string, { priceString?: string }> | null>(null);

  // Habit-formation optimized defaults: lower-commitment entry point.
  const [billingCadence, setBillingCadence] = React.useState<BillingCadence>('monthly');
  const [plan, setPlan] = React.useState<ProPlan>('individual');
  const pendingOpenDrawerRef = React.useRef(false);

  const shouldNudgeAnnual =
    (currentShowUpStreak ?? 0) >= ANNUAL_NUDGE_STREAK_THRESHOLD && billingCadence === 'monthly';

  const currentKey = getMonthKey(new Date());
  const baseMonthlyLimit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
  const bonusRaw =
    bonusGenerativeCredits?.monthKey === currentKey
      ? Number(bonusGenerativeCredits.bonusThisMonth ?? 0)
      : 0;
  const bonusThisMonth = Number.isFinite(bonusRaw) ? Math.max(0, Math.floor(bonusRaw)) : 0;
  const monthlyLimit = baseMonthlyLimit + bonusThisMonth;
  const usedThisMonth =
    generativeCredits?.monthKey === currentKey ? Math.max(0, generativeCredits.usedThisMonth ?? 0) : 0;
  const remainingCredits = Math.max(0, monthlyLimit - usedThisMonth);

  React.useEffect(() => {
    // Best-effort: fetch live pricing from RevenueCat offerings (fallback to hardcoded values).
    getProSkuPricing()
      .then((next) => setSkuPricing(next))
      .catch(() => setSkuPricing(null));
  }, []);

  React.useEffect(() => {
    // Record intent to open; we’ll actually open when the screen is focused to avoid
    // iOS modal/backdrop edge cases during navigation transitions.
    const shouldOpen =
      !!route.params?.openPricingDrawer || typeof route.params?.openPricingDrawerNonce === 'number';
    if (isPro || !shouldOpen) return;
    pendingOpenDrawerRef.current = true;
    // Consume params so a back/forward or re-render doesn't keep re-triggering.
    navigation.setParams({ openPricingDrawer: undefined, openPricingDrawerNonce: undefined } as any);
  }, [isPro, navigation, route.params?.openPricingDrawer, route.params?.openPricingDrawerNonce]);

  useFocusEffect(
    React.useCallback(() => {
      if (isPro) return;
      if (!pendingOpenDrawerRef.current) return;
      pendingOpenDrawerRef.current = false;

      // Defer to the next frame so layout + window dims settle before we mount a Modal.
      requestAnimationFrame(() => {
        setPricingDrawerVisible(true);
      });
    }, [isPro]),
  );

  return (
    <AppShell>
      <PageHeader title="Subscriptions" onPressBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="lg">
            {/* Tier status (single source of truth). */}
            <VStack space="sm">
              <Text style={styles.sectionLabel}>Current tier</Text>
              {isPro ? (
                <LinearGradient colors={paywallTheme.gradientColors} style={styles.planGradient}>
                  <VStack space="xs">
                    <Heading style={styles.planTitle}>Kwilt Pro</Heading>
                    <Text style={styles.planSubtitle}>
                      Unlimited arcs + goals. Manage billing and plan changes in the App Store.
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
                      <Text style={styles.tierBullet}>
                        <RNText style={styles.tierBulletStrong}>{`• ${FREE_MAX_ARCS_TOTAL}`}</RNText>
                        {` Arc`}
                        {FREE_MAX_ARCS_TOTAL === 1 ? '' : 's'}
                      </Text>
                      <Text style={styles.tierBullet}>
                        <RNText style={styles.tierBulletStrong}>{`• ${FREE_MAX_ACTIVE_GOALS_PER_ARC}`}</RNText>
                        {` active goals per Arc`}
                      </Text>
                      <Text style={styles.tierBullet}>
                        <RNText style={styles.tierBulletStrong}>{`• ${monthlyLimit}`}</RNText>
                        {` AI credits / month`}
                      </Text>
                    </VStack>

                    <View style={styles.tierDivider} />

                    <VStack space="xs">
                      <Text style={styles.tierCreditsLabel}>AI credits remaining</Text>
                      <Heading
                        style={styles.tierCreditsValue}
                        accessibilityLabel={`AI credits: ${remainingCredits} of ${monthlyLimit} remaining`}
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

            {/* AI credits (budget). */}
            {isPro ? (
              <VStack space="sm">
                <Text style={styles.sectionLabel}>AI credits</Text>
                <View style={styles.creditsCard}>
                  <VStack space="xs">
                    <Heading
                      style={styles.creditsValue}
                      accessibilityLabel={`AI credits: ${remainingCredits} of ${monthlyLimit} remaining`}
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

            {/* Upgrade CTA (Free) or Manage actions (Pro). */}
            <VStack space="sm">
              {!isPro ? (
                <>
                  <Text style={styles.sectionLabel}>Upgrade to Kwilt Pro</Text>
                  <LinearGradient colors={paywallTheme.gradientColors} style={styles.upgradeCard}>
                    <VStack space="xs">
                      <Text style={styles.upgradeKicker}>Kwilt Pro</Text>
                      <Heading style={styles.upgradeTitle}>Scale your progress</Heading>
                      <Text style={styles.upgradeBody}>
                        Unlimited arcs + goals, family plans, longer focus sessions, searchable banner images, and a larger monthly AI budget.
                      </Text>
                    </VStack>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View plans and pricing"
                      onPress={() => setPricingDrawerVisible(true)}
                      style={styles.upgradeCta}
                    >
                      <Text style={styles.upgradeCtaLabel}>Upgrade to Kwilt Pro</Text>
                    </Pressable>
                  </LinearGradient>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={isRefreshing}
                    onPress={() => {
                      openManageSubscription().catch(() => {
                        Alert.alert(
                          'Unable to open',
                          'Please open Apple subscription settings to manage your plan.',
                        );
                      });
                    }}
                  >
                    <Text style={styles.buttonLabel}>Manage subscription</Text>
                  </Button>

                  <Button
                    variant="outline"
                    disabled={isRefreshing}
                    onPress={() => {
                      openManageSubscription().catch(() => {
                        Alert.alert(
                          'Unable to open',
                          'Please open Apple subscription settings to change your plan.',
                        );
                      });
                    }}
                  >
                    <Text style={styles.buttonLabel}>Change plan</Text>
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                disabled={isRefreshing}
                onPress={() => {
                  capture(AnalyticsEvent.RestoreStarted);
                  restore()
                    .then(() => {
                      capture(AnalyticsEvent.RestoreSucceeded);
                      Alert.alert('Restored', 'We refreshed your subscription status.');
                    })
                    .catch((e: any) => {
                      const message =
                        typeof e?.message === 'string'
                          ? e.message
                          : 'We could not restore purchases right now.';
                      capture(AnalyticsEvent.RestoreFailed, { error: message });
                      Alert.alert('Restore failed', message);
                    })
                    .finally(() => {
                      refreshEntitlements({ force: true }).catch(() => undefined);
                    });
                }}
              >
                <Text style={styles.buttonLabel}>Restore purchases</Text>
              </Button>
            </VStack>

            <Text style={styles.footnote}>Subscriptions are managed by Apple.</Text>
          </VStack>
        </ScrollView>
      </View>

      {/* Pricing + plan picker in a drawer (Free only). */}
      <BottomDrawer
        visible={!isPro && pricingDrawerVisible}
        onClose={() => setPricingDrawerVisible(false)}
        snapPoints={['90%']}
        enableContentPanningGesture
      >
        <BottomDrawerScrollView
          contentContainerStyle={styles.pricingDrawerContent}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="md">
            <Heading style={styles.drawerTitle}>Choose your plan</Heading>

            <View style={styles.segmentRow}>
              <SegmentedControl<BillingCadence>
                value={billingCadence}
                onChange={setBillingCadence}
                options={[
                  { value: 'annual', label: 'Annual' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </View>

            {shouldNudgeAnnual ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See annual pricing"
                onPress={() => setBillingCadence('annual')}
                style={styles.annualNudge}
              >
                <Text style={styles.annualNudgeText}>
                  {`Best value: Annual saves 25% (${formatPriceLabelWithRevenueCat({
                    plan,
                    cadence: 'annual',
                    skuPricing,
                  })})`}
                </Text>
              </Pressable>
            ) : null}

            <VStack space="sm">
              <PlanRow
                title="Individual"
                subtitle="Kwilt Pro for one person"
                priceLabel={formatPriceLabelWithRevenueCat({
                  plan: 'individual',
                  cadence: billingCadence,
                  skuPricing,
                })}
                selected={plan === 'individual'}
                onPress={() => setPlan('individual')}
              />
              <PlanRow
                title="Family"
                subtitle="Family Sharing enabled (up to 6 people)"
                priceLabel={formatPriceLabelWithRevenueCat({
                  plan: 'family',
                  cadence: billingCadence,
                  skuPricing,
                })}
                selected={plan === 'family'}
                onPress={() => setPlan('family')}
              />
            </VStack>

            <Button
              disabled={isRefreshing}
              onPress={() => {
                capture(AnalyticsEvent.PurchaseStarted, {
                  plan,
                  cadence: billingCadence,
                  sku: getProSku(plan, billingCadence),
                });
                purchase({ plan, cadence: billingCadence })
                  .then(() => {
                    capture(AnalyticsEvent.PurchaseSucceeded, {
                      plan,
                      cadence: billingCadence,
                      sku: getProSku(plan, billingCadence),
                    });
                    setPricingDrawerVisible(false);
                    Alert.alert('Welcome to Pro', 'Your subscription is now active.');
                  })
                  .catch((e: any) => {
                    const message = typeof e?.message === 'string' ? e.message : 'Purchase failed';
                    capture(AnalyticsEvent.PurchaseFailed, {
                      plan,
                      cadence: billingCadence,
                      sku: getProSku(plan, billingCadence),
                      error: message,
                    });
                    Alert.alert('Purchase failed', message);
                  })
                  .finally(() => {
                    refreshEntitlements({ force: true }).catch(() => undefined);
                  });
              }}
            >
              <Text style={styles.buttonLabelOnCta}>
                {isRefreshing ? 'Working…' : 'Upgrade to Kwilt Pro'}
              </Text>
            </Button>
          </VStack>
        </BottomDrawerScrollView>
      </BottomDrawer>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
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
  planTitle: {
    ...typography.titleLg,
    color: paywallTheme.foreground,
  },
  planSubtitle: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
  tierCard: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  tierHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freeBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  freeBadgeText: {
    fontFamily: typography.label.fontFamily,
    letterSpacing: 0.4,
  },
  freeTierLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tierBullet: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tierBulletStrong: {
    color: colors.accent,
    fontFamily: typography.titleSm.fontFamily,
  },
  tierDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.9,
  },
  tierCreditsLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tierCreditsValue: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  tierCreditsSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
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
  upgradeTitle: {
    ...typography.titleMd,
    color: paywallTheme.foreground,
  },
  upgradeBody: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
  upgradeCta: {
    marginTop: spacing.md,
    backgroundColor: paywallTheme.ctaBackground,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
  },
  upgradeCtaLabel: {
    ...typography.body,
    color: paywallTheme.ctaForeground,
    fontFamily: typography.titleSm.fontFamily,
  },
  creditsCard: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  creditsValue: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  creditsValueRemaining: {
    color: colors.accent,
  },
  creditsValueTotal: {
    color: colors.muted,
  },
  creditsSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  creditsFootnote: {
    ...typography.bodySm,
    color: colors.textSecondary,
    opacity: 0.92,
  },
  buttonLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  buttonLabelOnCta: {
    ...typography.body,
    // The default Button variant uses a filled background; ensure contrast.
    color: colors.canvas,
  },
  footnote: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planRow: {
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planRowSelected: {
    borderColor: colors.accent,
  },
  planRowTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  planRowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  planRowPrice: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  planRowCheck: {
    ...typography.bodyBold,
    color: colors.accent,
    minWidth: 18,
    textAlign: 'right',
  },
  annualNudge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  annualNudgeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  pricingDrawerContent: {
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
  drawerTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  drawerSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});



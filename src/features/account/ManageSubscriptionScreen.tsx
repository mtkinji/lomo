import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
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
import {
  SUBSCRIPTION_PACKAGES_UNAVAILABLE_CODE,
  getActiveBillingCadence,
  getProSku,
  getProSkuPricing,
  openManageSubscription,
} from '../../services/entitlements';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useAppStore } from '../../store/useAppStore';
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../../domain/generativeCredits';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import {
  getUpgradeResumeDestination,
  usePaywallStore,
  type PaywallResumeIntent,
} from '../../store/usePaywallStore';
import { SubscriptionLegalLinks } from '../paywall/SubscriptionLegalLinks';
import { formatStorePriceLabel, type SubscriptionPlan } from './subscriptionPricing';
import { PRO_UPGRADE_INVITATION } from '../../domain/proAccessPolicy';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { KwiltLoader } from '../../ui/KwiltLoader';

type BillingCadence = 'annual' | 'monthly';
type ProPlan = SubscriptionPlan;

const ANNUAL_NUDGE_STREAK_THRESHOLD = 3;

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
  const identifiedAppUserID = useEntitlementsStore((state) => state.identifiedAppUserID);
  const { capture } = useAnalytics();
  const currentShowUpStreak = useAppStore((state) => state.currentShowUpStreak);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const bonusGenerativeCredits = useAppStore((state) => state.bonusGenerativeCredits);
  const firstOpenedAtMs = useAppStore((state) => state.firstOpenedAtMs);
  const [pricingDrawerVisible, setPricingDrawerVisible] = React.useState(false);
  const [skuPricing, setSkuPricing] = React.useState<Record<string, { priceString?: string; introPrice?: { priceString: string; type?: string; periodNumberOfUnits?: number; periodUnit?: string } }> | null>(null);
  const [pricingLoadState, setPricingLoadState] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');

  // Habit-formation optimized defaults: lower-commitment entry point.
  const [billingCadence, setBillingCadence] = React.useState<BillingCadence>('monthly');
  const [plan, setPlan] = React.useState<ProPlan>('individual');
  const [actualBillingCadence, setActualBillingCadence] = React.useState<BillingCadence | null>(null);
  const pendingOpenDrawerRef = React.useRef(false);

  const returnToPaidIntent = React.useCallback((resumeIntent: PaywallResumeIntent | null) => {
    if (!resumeIntent) return;
    requestAnimationFrame(() => {
      if (getUpgradeResumeDestination(resumeIntent) === 'money') {
        if (rootNavigationRef.isReady()) rootNavigationRef.navigate('Money');
        return;
      }
      if (navigation.canGoBack()) navigation.goBack();
    });
  }, [navigation]);

  const completeUpgrade = React.useCallback((snapshot: { isPro: boolean }) => {
    if (!snapshot.isPro) return null;
    const resumeIntent = usePaywallStore.getState().completeUpgrade();
    returnToPaidIntent(resumeIntent);
    return resumeIntent;
  }, [returnToPaidIntent]);

  const handleBack = React.useCallback(() => {
    // If this screen was opened as the root of a stack (e.g. from a paywall overlay),
    // `goBack()` will jump out to whatever drawer tab is underneath (can feel random).
    // Ensure the back affordance always lands on the Settings home canvas.
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'SettingsHome' as const }],
    });
  }, [navigation]);

  // Determine whether the user is on a monthly plan (actual subscription or UI selector for non-Pro users).
  const effectiveBillingCadence = isPro && actualBillingCadence ? actualBillingCadence : billingCadence;
  const accountAgeDays = firstOpenedAtMs ? Math.floor((Date.now() - firstOpenedAtMs) / (24 * 60 * 60 * 1000)) : 0;

  const shouldNudgeAnnual =
    (currentShowUpStreak ?? 0) >= ANNUAL_NUDGE_STREAK_THRESHOLD &&
    effectiveBillingCadence === 'monthly' &&
    Boolean(skuPricing?.[getProSku(plan, 'annual')]?.priceString);

  const individualPriceLabel = formatStorePriceLabel(
    skuPricing?.[getProSku('individual', billingCadence)]?.priceString,
    billingCadence,
  );
  const familyPriceLabel = formatStorePriceLabel(
    skuPricing?.[getProSku('family', billingCadence)]?.priceString,
    billingCadence,
  );
  const pricesReadyForCadence = Boolean(individualPriceLabel && familyPriceLabel);

  // Tenure-based nudge messaging: 30-day and 90-day milestones get more impactful copy.
  const annualNudgeCopy = React.useMemo(() => {
    const savingsLabel = formatStorePriceLabel(
      skuPricing?.[getProSku(plan, 'annual')]?.priceString,
      'annual',
    );
    if (!savingsLabel) return 'See annual pricing.';
    if (accountAgeDays >= 90) {
      return `You\u2019ve been using Kwilt for ${accountAgeDays} days. See the annual option (${savingsLabel}).`;
    }
    if (accountAgeDays >= 30) {
      return `One month in and still going. See the annual option (${savingsLabel}).`;
    }
    return `See the annual option (${savingsLabel}).`;
  }, [accountAgeDays, plan, skuPricing]);

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

  const loadPricing = React.useCallback(async () => {
    setPricingLoadState('loading');
    try {
      const next = await getProSkuPricing(identifiedAppUserID);
      setSkuPricing(next);
      setPricingLoadState(
        Object.values(next).some((entry) => Boolean(entry.priceString)) ? 'ready' : 'unavailable',
      );
    } catch {
      setSkuPricing(null);
      setPricingLoadState('unavailable');
    }
  }, [identifiedAppUserID]);

  React.useEffect(() => {
    // Store pricing is the only customer-facing price truth.
    void loadPricing();
    getActiveBillingCadence(identifiedAppUserID)
      .then((cadence) => setActualBillingCadence(cadence))
      .catch(() => setActualBillingCadence(null));
  }, [identifiedAppUserID, loadPricing]);

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
      <PageHeader title="Subscriptions" onPressBack={handleBack} />
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
                  <Text style={styles.sectionLabel}>Kwilt Pro</Text>
                  <LinearGradient colors={paywallTheme.gradientColors} style={styles.upgradeCard}>
                    <VStack space="xs">
                      <Text style={styles.upgradeKicker}>Kwilt Pro</Text>
                      <Heading style={styles.upgradeTitle}>{PRO_UPGRADE_INVITATION.title}</Heading>
                      <Text style={styles.upgradeBody}>{PRO_UPGRADE_INVITATION.body}</Text>
                    </VStack>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="View plans and pricing"
                      onPress={() => setPricingDrawerVisible(true)}
                      style={styles.upgradeCta}
                    >
                      <Text style={styles.upgradeCtaLabel}>View plans and pricing</Text>
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
                    .then((snapshot) => {
                      capture(AnalyticsEvent.RestoreSucceeded);
                      completeUpgrade(snapshot);
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

            <VStack space="xs">
              <Text style={styles.footnote}>Subscriptions are managed by Apple.</Text>
              <SubscriptionLegalLinks variant="footer" />
            </VStack>
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
            {pricingLoadState === 'loading' ? (
              <View style={styles.pricingState}>
                <KwiltLoader accessible accessibilityLabel="Loading prices from Apple" size="large" />
                <Text style={[styles.drawerSubtitle, styles.pricingStateText]}>Loading prices from Apple…</Text>
              </View>
            ) : pricingLoadState === 'unavailable' || !pricesReadyForCadence ? (
              <VStack space="sm" style={styles.pricingState}>
                <Heading variant="sm">Plans aren’t available right now</Heading>
                <Text style={[styles.drawerSubtitle, styles.pricingStateText]}>
                  Kwilt couldn’t load current prices from Apple. Check your connection and try again.
                </Text>
                <Button variant="outline" onPress={() => void loadPricing()}>
                  <Text style={styles.buttonLabel}>Try again</Text>
                </Button>
              </VStack>
            ) : (
              <>
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
                      {annualNudgeCopy}
                    </Text>
                  </Pressable>
                ) : null}

                <VStack space="sm">
                  <PlanRow
                    title="Individual"
                    subtitle="Kwilt Pro for one person"
                    priceLabel={individualPriceLabel as string}
                    selected={plan === 'individual'}
                    onPress={() => setPlan('individual')}
                  />
                  <PlanRow
                    title="Family"
                    subtitle="Family Sharing enabled (up to 6 people)"
                    priceLabel={familyPriceLabel as string}
                    selected={plan === 'family'}
                    onPress={() => setPlan('family')}
                  />
                </VStack>

                <Button
              disabled={isRefreshing}
              onPress={() => {
                const purchaseSku = getProSku(plan, billingCadence);
                const introOffer = skuPricing?.[purchaseSku]?.introPrice;
                const isTrial = introOffer?.type === 'FREE_TRIAL' || introOffer?.priceString === '$0.00';
                // Upsell attribution: read the paywall reason/source that the
                // user was in when they tapped Upgrade on the interstitial.
                // Null when entry was direct (e.g. Settings → Subscriptions) or
                // when the intent signal is older than 30 min (stale session).
                const upsellState = usePaywallStore.getState();
                const upsellFresh =
                  upsellState.upsellTappedAtMs != null &&
                  Date.now() - upsellState.upsellTappedAtMs <= 30 * 60 * 1000;
                const upsellReason = upsellFresh ? upsellState.upsellReason : null;
                const upsellSource = upsellFresh ? upsellState.upsellSource : null;
                const upgradeEntrySource = upsellFresh ? upsellState.directEntrySource : null;
                const purchaseProps = {
                  plan,
                  cadence: billingCadence,
                  sku: purchaseSku,
                  paywall_reason: upsellReason,
                  paywall_source: upsellSource,
                  upgrade_entry_source: upgradeEntrySource,
                };
                capture(AnalyticsEvent.PurchaseStarted, {
                  ...purchaseProps,
                  is_trial: isTrial,
                });
                purchase({ plan, cadence: billingCadence })
                  .then((snapshot) => {
                    capture(AnalyticsEvent.PurchaseSucceeded, purchaseProps);
                    if (isTrial) {
                      capture(AnalyticsEvent.FreeTrialStarted, purchaseProps);
                    }
                    completeUpgrade(snapshot);
                    setPricingDrawerVisible(false);
                    Alert.alert(
                      isTrial ? 'Trial started' : 'Welcome to Pro',
                      isTrial
                        ? 'Your free trial is now active. Enjoy all Pro features!'
                        : 'Your subscription is now active.',
                    );
                  })
                  .catch((e: any) => {
                    const isSubscriptionConfigError =
                      e?.code === SUBSCRIPTION_PACKAGES_UNAVAILABLE_CODE;
                    const message = isSubscriptionConfigError
                      ? 'Subscriptions are not available yet. Please try again in a moment or contact support if this keeps happening.'
                      : typeof e?.message === 'string'
                        ? e.message
                        : 'Purchase failed';
                    capture(AnalyticsEvent.PurchaseFailed, {
                      ...purchaseProps,
                      error: message,
                      error_code: isSubscriptionConfigError ? e.code : undefined,
                      revenuecat_details: isSubscriptionConfigError ? e.details : undefined,
                    });
                    Alert.alert('Purchase failed', message);
                  })
                  .finally(() => {
                    refreshEntitlements({ force: true }).catch(() => undefined);
                  });
              }}
                >
                  <Text style={styles.buttonLabelOnCta}>
                    {isRefreshing
                      ? 'Working\u2026'
                      : (() => {
                          const sku = getProSku(plan, billingCadence);
                          const intro = skuPricing?.[sku]?.introPrice;
                          if (intro?.type === 'FREE_TRIAL' || intro?.priceString === '$0.00') {
                            const n = intro.periodNumberOfUnits ?? 7;
                            const unit = (intro.periodUnit ?? 'DAY').toLowerCase();
                            return `Start ${n}-${unit} free trial`;
                          }
                          return 'Upgrade to Kwilt Pro';
                        })()}
                  </Text>
                </Button>
              </>
            )}
            <SubscriptionLegalLinks />
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
  pricingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  pricingStateText: {
    textAlign: 'center',
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

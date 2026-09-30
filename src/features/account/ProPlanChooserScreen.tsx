import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import {
  SUBSCRIPTION_PACKAGES_UNAVAILABLE_CODE,
  getProSku,
  PRO_LIFETIME_SKU,
  isRevenueCatPurchaseCancelled,
} from '../../services/entitlements';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import {
  getUpgradeResumeDestination,
  usePaywallStore,
  type PaywallResumeIntent,
} from '../../store/usePaywallStore';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import {
  FullWidthActionDock,
  useFullWidthActionDockClearance,
} from '../../ui/FullWidthActionDock';
import { KwiltLoader } from '../../ui/KwiltLoader';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Heading, Text, VStack } from '../../ui/primitives';
import { SubscriptionLegalLinks } from '../paywall/SubscriptionLegalLinks';
import {
  buildSelectedPlanOffer,
  formatStorePriceLabel,
  type SubscriptionCadence,
  type SubscriptionPlan,
} from './subscriptionPricing';
import { useProStoreOffer } from './useProStoreOffer';
import { FoundingLifetimeOffer } from '../paywall/FoundingLifetimeOffer';

function PlanRow({
  title,
  subtitle,
  priceLabel,
  savingsLabel,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  savingsLabel?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Select ${title}, ${priceLabel}${savingsLabel ? `, ${savingsLabel}` : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.planRow}
    >
      {selected ? <View pointerEvents="none" style={styles.planRowSelectionRing} /> : null}
      <View style={styles.planRowCopy}>
        <Text style={styles.planRowTitle}>{title}</Text>
        <Text style={styles.planRowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.planRowRight}>
        <Text style={styles.planRowPrice}>{priceLabel}</Text>
        {savingsLabel ? <Text style={styles.planRowSavings}>{savingsLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

export function ProPlanChooserScreen() {
  const navigation = useNavigation<NavigationProp<RootDrawerParamList, 'ProPlanChooser'>>();
  const actionClearance = useFullWidthActionDockClearance();
  const storeOffer = useProStoreOffer();
  const proAccessType = useEntitlementsStore((state) => state.proAccessType);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const isRefreshing = useEntitlementsStore((state) => state.isRefreshing);
  const purchase = useEntitlementsStore((state) => state.purchase);
  const restore = useEntitlementsStore((state) => state.restore);
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);
  const { capture } = useAnalytics();
  const [cadence, setCadence] = React.useState<SubscriptionCadence>('annual');
  const [plan, setPlan] = React.useState<SubscriptionPlan>('individual');
  const [showOtherPlans, setShowOtherPlans] = React.useState(false);
  const hasFocusedOnceRef = React.useRef(false);
  const isDevelopmentOfferPreview =
    __DEV__ && storeOffer.snapshot?.source === 'development_fixture';

  const handleBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (rootNavigationRef.isReady()) {
      rootNavigationRef.navigate('Settings', { screen: 'SettingsManageSubscription' });
    }
  }, [navigation]);

  const returnToPaidIntent = React.useCallback((resumeIntent: PaywallResumeIntent | null) => {
    requestAnimationFrame(() => {
      if (resumeIntent && getUpgradeResumeDestination(resumeIntent) === 'money') {
        if (rootNavigationRef.isReady()) rootNavigationRef.navigate('Money');
        return;
      }
      handleBack();
    });
  }, [handleBack]);

  useFocusEffect(
    React.useCallback(() => {
      if (hasFocusedOnceRef.current) storeOffer.retry();
      else hasFocusedOnceRef.current = true;
    }, [storeOffer.retry]),
  );

  const individualPriceLabel = formatStorePriceLabel(
    storeOffer.snapshot?.products[getProSku('individual', cadence)]?.priceString,
    cadence,
  );
  const familyPriceLabel = formatStorePriceLabel(
    storeOffer.snapshot?.products[getProSku('family', cadence)]?.priceString,
    cadence,
  );
  const pricesReady = Boolean(individualPriceLabel && familyPriceLabel);
  const selectedOffer = React.useMemo(
    () => buildSelectedPlanOffer({
      snapshot: storeOffer.snapshot ?? { status: 'unavailable', products: {} },
      plan,
      cadence,
    }),
    [cadence, plan, storeOffer.snapshot],
  );
  const individualOffer = React.useMemo(
    () => buildSelectedPlanOffer({
      snapshot: storeOffer.snapshot ?? { status: 'unavailable', products: {} },
      plan: 'individual',
      cadence,
    }),
    [cadence, storeOffer.snapshot],
  );
  const familyOffer = React.useMemo(
    () => buildSelectedPlanOffer({
      snapshot: storeOffer.snapshot ?? { status: 'unavailable', products: {} },
      plan: 'family',
      cadence,
    }),
    [cadence, storeOffer.snapshot],
  );

  const startPurchase = React.useCallback(() => {
    if (isDevelopmentOfferPreview) {
      Alert.alert(
        'Simulator offer preview',
        'This previews the planned offer. Choose Live Apple in Dev Tools to test the real purchase sheet.',
      );
      return;
    }
    const productId = getProSku(plan, cadence);
    const upsellState = usePaywallStore.getState();
    const upsellFresh =
      upsellState.upsellTappedAtMs != null &&
      Date.now() - upsellState.upsellTappedAtMs <= 30 * 60 * 1000;
    const upsellReason = upsellFresh ? upsellState.upsellReason : null;
    const purchaseProps = {
      plan,
      cadence,
      product_id: productId,
      paywall_reason: upsellReason,
      paywall_source: upsellFresh ? upsellState.upsellSource : null,
      upgrade_entry_source: upsellFresh ? upsellState.directEntrySource : null,
      variant: upsellReason === 'pro_money_budgets'
        ? 'money_contextual_template_v1'
        : 'plan_chooser_v1',
      offer_state: selectedOffer.expectsTrial ? 'trial_merchandised' : 'standard',
    };
    capture(AnalyticsEvent.PurchaseStarted, {
      ...purchaseProps,
      trial_merchandised: selectedOffer.expectsTrial,
    });
    purchase({ plan, cadence })
      .then((snapshot) => {
        if (!snapshot.isPro) {
          Alert.alert('Purchase pending', 'Pro access has not been confirmed yet. You can restore purchases after Apple completes the purchase.');
          return;
        }
        const trialStarted = snapshot.isPro && snapshot.proPeriodType === 'trial';
        capture(AnalyticsEvent.PurchaseSucceeded, {
          ...purchaseProps,
          offer_state: trialStarted ? 'trial' : 'standard',
        });
        if (trialStarted) {
          capture(AnalyticsEvent.FreeTrialStarted, {
            ...purchaseProps,
            offer_state: 'trial',
          });
        }
        const resumeIntent = snapshot.isPro
          ? usePaywallStore.getState().completeUpgrade()
          : null;
        returnToPaidIntent(resumeIntent);
        Alert.alert(
          trialStarted ? 'Your free month has started' : 'Welcome to Pro',
          trialStarted ? 'Kwilt Pro is ready.' : 'Your subscription is active.',
        );
      })
      .catch((error: unknown) => {
        if (isRevenueCatPurchaseCancelled(error)) return;
        const code = (error as { code?: string } | null)?.code;
        const isConfigurationError = code === SUBSCRIPTION_PACKAGES_UNAVAILABLE_CODE;
        capture(AnalyticsEvent.PurchaseFailed, {
          ...purchaseProps,
          error_code: isConfigurationError ? code : 'purchase_failed',
        });
        Alert.alert(
          'Purchase failed',
          isConfigurationError
            ? 'Subscriptions are not available yet. Please try again in a moment or contact support if this keeps happening.'
            : 'We couldn’t complete the purchase. Please try again.',
        );
      })
      .finally(() => {
        refreshEntitlements({ force: true }).catch(() => undefined);
      });
  }, [cadence, capture, isDevelopmentOfferPreview, plan, purchase, refreshEntitlements, returnToPaidIntent, selectedOffer.expectsTrial]);

  const lifetime = storeOffer.snapshot?.products[PRO_LIFETIME_SKU];
  const lifetimeReady = Boolean(lifetime?.priceString && lifetime.price && lifetime.price > 0 && proAccessType !== 'lifetime');
  const startLifetimePurchase = async () => {
    if (isRefreshing || !lifetimeReady) return;
    if (isDevelopmentOfferPreview) {
      Alert.alert('Simulator offer preview', 'Choose Live Apple in Dev Tools to test the real purchase sheet.');
      return;
    }
    capture(AnalyticsEvent.PurchaseStarted, { product_id: PRO_LIFETIME_SKU, variant: 'founders', offer_state: 'lifetime' });
    try {
      const snapshot = await purchase({ lifetime: true });
      if (!snapshot.isPro || snapshot.proAccessType !== 'lifetime') {
        Alert.alert('Purchase pending', 'Pro access has not been confirmed yet. You can restore purchases after Apple completes the purchase.');
        return;
      }
      capture(AnalyticsEvent.PurchaseSucceeded, { product_id: PRO_LIFETIME_SKU, variant: 'founders', offer_state: 'lifetime' });
      const resumeIntent = usePaywallStore.getState().completeUpgrade();
      returnToPaidIntent(resumeIntent);
      Alert.alert('Welcome to lifetime Pro', 'Your Pro access is ready. This purchase does not renew.');
    } catch (error) {
      if (isRevenueCatPurchaseCancelled(error)) return;
      capture(AnalyticsEvent.PurchaseFailed, { product_id: PRO_LIFETIME_SKU, variant: 'founders', error_code: 'purchase_failed' });
      Alert.alert('Purchase unavailable', 'We couldn’t complete the purchase. Refresh the offers and try again.');
      storeOffer.retry();
    } finally {
      refreshEntitlements({ force: true }).catch(() => undefined);
    }
  };

  const showPurchaseAction = storeOffer.status === 'ready' && pricesReady;
  const annualProduct = storeOffer.snapshot?.products[getProSku('individual', 'annual')];
  const annualReady = Boolean(annualProduct?.priceString && annualProduct.price && annualProduct.price > 0);
  const annualOffer = buildSelectedPlanOffer({ snapshot: storeOffer.snapshot ?? { status: 'unavailable', products: {} }, plan: 'individual', cadence: 'annual' });

  // Existing subscribers retain the management-oriented chooser and its warning
  // about independently cancelling renewals. Unavailable offers use its retry UI.
  if (storeOffer.status === 'ready' && lifetimeReady && !isPro && !showOtherPlans) {
    return <FoundingLifetimeOffer price={lifetime!.priceString!} busy={isRefreshing}
      annual={annualReady ? { price: annualProduct!.priceString!, trial: annualOffer.expectsTrial } : undefined}
      onAnnualPurchase={plan === 'individual' && cadence === 'annual' ? startPurchase : undefined}
      onPurchase={startLifetimePurchase} onClose={handleBack}
      onOtherPlans={() => setShowOtherPlans(true)}
      onRestore={async () => {
        if (isRefreshing) return;
        capture(AnalyticsEvent.RestoreStarted);
        try {
          const snapshot = await restore();
          capture(AnalyticsEvent.RestoreSucceeded);
          if (snapshot.isPro) {
            returnToPaidIntent(usePaywallStore.getState().completeUpgrade());
          } else {
            Alert.alert('No Pro purchase found', 'No active Pro purchase was found for this store account.');
          }
        } catch {
          capture(AnalyticsEvent.RestoreFailed);
          Alert.alert('Restore failed', 'We couldn’t restore purchases right now. Please try again.');
        }
      }} />;
  }

  return (
    <AppShell>
      <PageHeader
        title="Choose your plan"
        onPressBack={showOtherPlans && lifetimeReady && !isPro
          ? () => { setPlan('individual'); setCadence('annual'); setShowOtherPlans(false); }
          : handleBack}
      />
      <View style={styles.viewport}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: actionClearance }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentBody}>
            <VStack space="xl">
              {storeOffer.status === 'loading' ? (
                <View style={styles.pricingState}>
                  <KwiltLoader accessible accessibilityLabel="Loading prices from Apple" size="large" />
                  <Text style={styles.pricingStateCopy}>Loading prices from Apple…</Text>
                </View>
              ) : storeOffer.status === 'unavailable' || !pricesReady ? (
                <VStack space="sm" style={styles.pricingState}>
                  <Heading variant="sm">Plans aren’t available right now</Heading>
                  <Text style={styles.pricingStateCopy}>
                    Kwilt couldn’t load current prices from Apple. Check your connection and try again.
                  </Text>
                  <Button variant="outline" onPress={storeOffer.retry}>Try again</Button>
                </VStack>
              ) : (
                <>
                <SegmentedControl<SubscriptionCadence>
                  accessibilityLabel="Billing period"
                  fullWidth
                  value={cadence}
                  onChange={setCadence}
                  options={[
                    { value: 'annual', label: 'Annual' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />

                <VStack space="md">
                  <PlanRow
                    title="Individual"
                    subtitle="Pro for you"
                    priceLabel={individualPriceLabel as string}
                    savingsLabel={individualOffer.savingsLabel}
                    selected={plan === 'individual'}
                    onPress={() => setPlan('individual')}
                  />
                  <PlanRow
                    title="Family"
                    subtitle="You + 5 family members"
                    priceLabel={familyPriceLabel as string}
                    savingsLabel={familyOffer.savingsLabel}
                    selected={plan === 'family'}
                    onPress={() => setPlan('family')}
                  />
                </VStack>

                {selectedOffer.purchaseDisclosure ? (
                  <View style={styles.offerDisclosure}>
                    <Text style={styles.purchaseDisclosure}>{selectedOffer.purchaseDisclosure}</Text>
                  </View>
                ) : null}
                </>
              )}
              {lifetimeReady ? (
                <VStack space="sm" style={styles.offerDisclosure}>
                  <Heading variant="sm">Founding Lifetime</Heading>
                  <Text style={styles.purchaseDisclosure}>All Pro features. One payment. No renewal.</Text>
                  {isPro ? <Text style={styles.purchaseDisclosure}>Buying lifetime access does not cancel an existing subscription. Manage it in the App Store to stop renewals.</Text> : null}
                  <Button loading={isRefreshing} onPress={startLifetimePurchase}>
                    {`Get lifetime Pro — ${lifetime?.priceString}`}
                  </Button>
                  <SubscriptionLegalLinks variant="purchase" />
                </VStack>
              ) : null}
            </VStack>

            {showPurchaseAction ? (
              <SubscriptionLegalLinks variant="purchase" style={styles.legal} />
            ) : null}
          </View>
        </ScrollView>

        {showPurchaseAction ? (
          <FullWidthActionDock dockTestID="proPlanChooser.actionDock">
            <Button
              fullWidth
              loading={isRefreshing}
              loadingLabel="Working…"
              onPress={startPurchase}
              size="lg"
              variant="primary"
            >
              {selectedOffer.cta}
            </Button>
          </FullWidthActionDock>
        ) : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  contentBody: {
    flexGrow: 1,
  },
  pricingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  pricingStateCopy: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  planRow: {
    minHeight: 112,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planRowSelectionRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderColor: colors.accent, // @kwilt-brand-moment: the selected paid plan needs one calm, unmistakable state.
    borderWidth: 2,
  },
  planRowCopy: {
    flex: 1,
  },
  planRowTitle: {
    ...typography.titleSm,
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
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  planRowSavings: {
    ...typography.bodySm,
    color: colors.accent, // @kwilt-brand-moment: verified annual savings supports the selected offer.
  },
  offerDisclosure: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  purchaseDisclosure: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  legal: {
    marginTop: 'auto',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
  },
});

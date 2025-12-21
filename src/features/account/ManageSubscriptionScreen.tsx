import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { VStack, Heading, Text } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { paywallTheme } from '../paywall/paywallTheme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { openManageSubscription } from '../../services/entitlements';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { useAppStore } from '../../store/useAppStore';

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
  const isPro = useEntitlementsStore((state) => state.isPro);
  const lastError = useEntitlementsStore((state) => state.lastError);
  const isRefreshing = useEntitlementsStore((state) => state.isRefreshing);
  const purchase = useEntitlementsStore((state) => state.purchase);
  const restore = useEntitlementsStore((state) => state.restore);
  const refreshEntitlements = useEntitlementsStore((state) => state.refreshEntitlements);
  const currentShowUpStreak = useAppStore((state) => state.currentShowUpStreak);

  // Habit-formation optimized defaults: lower-commitment entry point.
  const [billingCadence, setBillingCadence] = React.useState<BillingCadence>('monthly');
  const [plan, setPlan] = React.useState<ProPlan>('individual');

  const shouldNudgeAnnual =
    (currentShowUpStreak ?? 0) >= ANNUAL_NUDGE_STREAK_THRESHOLD && billingCadence === 'monthly';

  // Placeholder display fields until we wire real RevenueCat product metadata.
  const planName = 'Kwilt Pro';
  const planTerm = 'Active subscription';
  const nextBillingDate = 'Managed by Apple';

  return (
    <AppShell>
      <PageHeader title="Subscriptions" onPressBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <VStack space="lg">
          <VStack space="sm">
            <Text style={styles.sectionLabel}>{isPro ? 'Current plan' : 'Kwilt Pro'}</Text>
            <LinearGradient colors={paywallTheme.gradientColors} style={styles.planGradient}>
              <VStack space="xs">
                <Heading style={styles.planTitle}>{planName}</Heading>
                <Text style={styles.planSubtitle}>
                  {isPro
                    ? `${planTerm} • ${nextBillingDate}`
                    : 'Unlimited arcs + goals, family plans, longer focus sessions, Unsplash banners, and a larger monthly AI budget.'}
                </Text>
              </VStack>
            </LinearGradient>
          </VStack>

          <VStack space="sm">
            {!isPro ? (
              <>
                <Text style={styles.sectionLabel}>Choose plan</Text>
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
                      {`Best value: Annual saves 25% (${formatPriceLabel(plan, 'annual')})`}
                    </Text>
                  </Pressable>
                ) : null}

                <VStack space="sm">
                  <PlanRow
                    title="Individual"
                    subtitle="Kwilt Pro for one person"
                    priceLabel={formatPriceLabel('individual', billingCadence)}
                    selected={plan === 'individual'}
                    onPress={() => setPlan('individual')}
                  />
                  <PlanRow
                    title="Family"
                    subtitle="Family Sharing enabled (up to ~6)"
                    priceLabel={formatPriceLabel('family', billingCadence)}
                    selected={plan === 'family'}
                    onPress={() => setPlan('family')}
                  />
                </VStack>

                <Button
                  disabled={isRefreshing}
                  onPress={() => {
                    purchase({ plan, cadence: billingCadence })
                      .then(() => {
                        Alert.alert('Welcome to Pro', 'Your subscription is now active.');
                      })
                      .catch((e: any) => {
                        const message = typeof e?.message === 'string' ? e.message : 'Purchase failed';
                        Alert.alert('Purchase failed', message);
                      })
                      .finally(() => {
                        refreshEntitlements({ force: true }).catch(() => undefined);
                      });
                  }}
                >
                  <Text style={styles.buttonLabel}>{isRefreshing ? 'Working…' : 'Subscribe'}</Text>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                disabled={isRefreshing}
                onPress={() => {
                  openManageSubscription().catch(() => {
                    Alert.alert('Unable to open', 'Please open Apple subscription settings to manage your plan.');
                  });
                }}
              >
                <Text style={styles.buttonLabel}>Manage in App Store</Text>
              </Button>
            )}

            <Button
              variant="outline"
              disabled={isRefreshing}
              onPress={() => {
                restore()
                  .then(() => {
                    Alert.alert('Restored', 'We refreshed your subscription status.');
                  })
                  .catch((e: any) => {
                    const message =
                      typeof e?.message === 'string' ? e.message : 'We could not restore purchases right now.';
                    Alert.alert('Restore failed', message);
                  })
                  .finally(() => {
                    refreshEntitlements({ force: true }).catch(() => undefined);
                  });
              }}
            >
              <Text style={styles.buttonLabel}>Restore purchases</Text>
            </Button>

            <Button
              variant="outline"
              disabled={isRefreshing}
              onPress={() => {
                refreshEntitlements({ force: true }).catch(() => {
                  Alert.alert('Refresh failed', 'Unable to refresh subscription status right now.');
                });
              }}
            >
              <Text style={styles.buttonLabel}>Refresh status</Text>
            </Button>
          </VStack>

          <Text style={styles.footnote}>
            {lastError
              ? `Status: ${lastError}`
              : 'Tip: purchases can take a moment to reflect—tap “Refresh status” if things look stale.'}
          </Text>
        </VStack>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
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
  buttonLabel: {
    ...typography.body,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  annualNudgeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});



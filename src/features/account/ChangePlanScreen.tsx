import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { paywallTheme } from '../paywall/paywallTheme';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { VStack, Text } from '../../ui/primitives';
import { spacing, typography, colors } from '../../theme';
import { hexToRgba } from '../../theme/colorUtils';
import { SegmentedControl } from '../../ui/SegmentedControl';

type BillingCadence = 'annual' | 'monthly';
type PlanId = 'family' | 'individual';

type PlanOption = {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  badge?: 'current' | 'most_popular';
};

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatMonthly(amount: number): string {
  return `${formatMoney(amount)} / mo`;
}

function formatYearly(amount: number): string {
  return `${formatMoney(amount)} / yr`;
}

function buildAnnualSubcopy(monthly: number): string {
  const monthlyEquivalent = monthly * 0.75;
  return `Equivalent to ${formatMoney(monthlyEquivalent)}/mo • Save 25%`;
}

function PlanCard({
  plan,
  selected,
  onPress,
  billingCadence,
}: {
  plan: PlanOption;
  selected: boolean;
  onPress: () => void;
  billingCadence: BillingCadence;
}) {
  const priceLabel = billingCadence === 'annual'
    ? formatYearly(plan.annualPrice)
    : formatMonthly(plan.monthlyPrice);
  const subcopy = billingCadence === 'annual' ? buildAnnualSubcopy(plan.monthlyPrice) : ' ';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select plan ${plan.name}`}
      onPress={onPress}
      style={[styles.planCard, selected && styles.planCardSelected]}
    >
      {plan.badge ? (
        <View style={[styles.badge, plan.badge === 'current' ? styles.badgeCurrent : styles.badgePopular]}>
          <Text style={styles.badgeLabel}>
            {plan.badge === 'current' ? 'Current' : 'Most popular'}
          </Text>
        </View>
      ) : null}

      <View style={styles.planRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planSubcopy}>{subcopy}</Text>
        </View>
        <Text style={styles.planPrice}>{priceLabel}</Text>
      </View>
    </Pressable>
  );
}

export function ChangePlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  // TODO(entitlements): Replace with RevenueCat products + current subscription.
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('annual');
  const plans: PlanOption[] = [
    {
      id: 'family',
      name: 'Family Plan',
      monthlyPrice: 9.99,
      annualPrice: 89.99,
      badge: 'current',
    },
    {
      id: 'individual',
      name: 'Individual',
      monthlyPrice: 4.99,
      annualPrice: 44.99,
      badge: 'most_popular',
    },
  ];

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('family');

  return (
    <AppShell>
      <LinearGradient
        colors={paywallTheme.gradientColors}
        style={[StyleSheet.absoluteFill, styles.gradientBleed]}
      />
      <PageHeader title="Change Plan" variant="inverse" onPressBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <VStack space="md">
          <Text style={styles.subtitle}>Your new plan will apply starting Jan 16, 2026</Text>
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

          <VStack space="sm">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlanId === plan.id}
                billingCadence={billingCadence}
                onPress={() => setSelectedPlanId(plan.id)}
              />
            ))}
          </VStack>
        </VStack>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        >
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel subscription"
          onPress={() => {
            Alert.alert(
              'Cancel subscription',
              'Subscription cancellation will be wired once RevenueCat is integrated.',
            );
          }}
          style={styles.cancelLink}
        >
          <Text style={styles.cancelLabel}>Cancel subscription</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  gradientBleed: {
    // AppShell adds horizontal padding; extend the gradient to the true edges.
    left: -spacing.sm,
    right: -spacing.sm,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: paywallTheme.foreground,
    opacity: 0.92,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  segmentRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planCard: {
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: hexToRgba(colors.aiForeground, 0.18),
    backgroundColor: hexToRgba(colors.primary, 0.14),
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: hexToRgba(colors.aiForeground, 0.42),
    backgroundColor: hexToRgba(colors.primary, 0.18),
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  badgeCurrent: {
    backgroundColor: hexToRgba(colors.aiForeground, 0.16),
    borderWidth: 1,
    borderColor: hexToRgba(colors.aiForeground, 0.22),
  },
  badgePopular: {
    backgroundColor: hexToRgba(colors.turmeric500, 0.35),
    borderWidth: 1,
    borderColor: hexToRgba(colors.aiForeground, 0.18),
  },
  badgeLabel: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  planName: {
    ...typography.titleMd,
    color: paywallTheme.foreground,
  },
  planSubcopy: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.78,
    marginTop: 2,
  },
  planPrice: {
    ...typography.titleMd,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  doneButton: {
    backgroundColor: paywallTheme.ctaBackground,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneLabel: {
    ...typography.bodyBold,
    color: paywallTheme.ctaForeground,
  },
  cancelLink: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.body,
    color: paywallTheme.foreground,
    opacity: 0.92,
    textDecorationLine: 'underline',
  },
});



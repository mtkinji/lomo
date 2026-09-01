import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PaywallReason, PaywallSource } from '../../services/paywall';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/Button';
import { VStack, Heading, Text } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import { BrandLockup } from '../../ui/BrandLockup';
import { paywallTheme } from './paywallTheme';
import { usePaywallStore } from '../../store/usePaywallStore';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useToastStore } from '../../store/useToastStore';
import { SubscriptionLegalLinks } from './SubscriptionLegalLinks';

type PaywallBenefit = { title: string };

const PRO_VALUE_ATTAINMENTS: PaywallBenefit[] = [
  {
    title: 'Connected budgets and transaction insights',
  },
  {
    title: 'Advanced Screen Time rules with multiple conditions',
  },
  {
    title: 'Family Screen Time coordination',
  },
  {
    title: 'More AI capacity and advanced AI actions',
  },
  {
    title: 'External agent access',
  },
];

function getPaywallCopy(reason: PaywallReason, source: PaywallSource) {
  // Keep messaging value-oriented and context-specific.
  switch (reason) {
    case 'generative_quota_exceeded':
      return {
        title: 'You’re out of AI credits',
        subtitle:
          'Upgrade to Pro for more monthly AI credits so you can keep shaping goals in Kwilt.',
      };
    case 'ai_quota_exceeded':
      return {
        title: 'AI is temporarily unavailable',
        subtitle:
          'Upgrade to Pro for more AI capacity and keep shaping goals with Kwilt Coach.',
      };
    case 'pro_money_budgets':
      return {
        title: 'Build a budget from your real accounts',
        subtitle: 'Pro connects your financial accounts so you can plan, review transactions, and keep your household budget current.',
      };
    case 'pro_advanced_screen_time_rules':
      return {
        title: 'Make Screen Time fit the rule you actually need',
        subtitle: 'Pro combines time, app use, real-life steps, and budget conditions into one clear rule.',
      };
    case 'pro_family_screen_time':
      return {
        title: 'Coordinate Screen Time across your household',
        subtitle: 'Pro lets caregivers create and manage Screen Time agreements for family members.',
      };
    case 'pro_advanced_cloud_ai':
      return {
        title: 'Give Kwilt more room to help',
        subtitle: 'Pro adds more AI capacity for planning, reviewing, and working through the details.',
      };
    case 'pro_ai_attachment_analysis':
      return {
        title: 'Ask Kwilt to work from your files',
        subtitle: 'Pro can analyze supported attachments and use them as context for your next step.',
      };
    case 'pro_ai_scheduling':
      return {
        title: 'Turn the plan into real calendar time',
        subtitle: 'Pro helps place the work into your week so the next step has somewhere to happen.',
      };
    case 'pro_background_ai':
      return {
        title: 'Let Kwilt keep useful work moving',
        subtitle: 'Pro can run supported AI work in the background and bring the result back when it is ready.',
      };
    case 'pro_external_agent':
      return {
        title: 'Connect Kwilt to your other AI tools',
        subtitle: 'Pro lets approved external agents work with your Kwilt data under your control.',
      };
    case 'limit_goals_per_arc':
      return {
        title: 'Make room for the goals that matter right now',
        subtitle:
          'Life isn’t three goals at a time. Pro removes the cap so you can keep building—without deleting progress or constantly shuffling.',
      };
    case 'limit_arcs_total':
      return {
        title: 'Make room for more than one direction',
        subtitle:
          'Your life can hold more than one meaningful thread. Pro lets you run multiple arcs so your goals don’t have to compete for space.',
      };
    case 'pro_only_unsplash_banners':
      return {
        title: 'Make your arcs feel unmistakably yours',
        subtitle:
          'Pro adds a wider banner library and search so each arc has a visual that pulls you back in.',
      };
    case 'pro_only_focus_mode':
      return {
        title: 'Go deep when it’s time to work',
        subtitle:
          'Pro adds longer focus sessions so you can do real work, not just get started. Protect your attention and finish what you begin.',
      };
    case 'pro_only_attachments':
      return {
        title: 'Keep everything for a to-do in one place',
        subtitle:
          'Attachments are part of Pro Tools—add photos, documents, and recordings right on the to-do so execution stays frictionless.',
      };
    case 'pro_only_calendar_export':
      return {
        title: 'Make your plan show up in your real life',
        subtitle:
          'Get your to-dos into your calendar so your intentions become commitments—and your days feel aligned instead of reactive.',
      };
    case 'pro_only_views_filters':
      return {
        title: 'Turn your to-dos list into a tool',
        subtitle:
          'Pro Tools adds saved views plus filtering and sorting so you can focus on what matters right now without losing your place.',
      };
    case 'pro_only_ai_scheduling':
      return {
        title: 'Turn motivation into a realistic weekly plan',
        subtitle:
          'Pro Tools helps you schedule to-dos into your life so progress doesn’t depend on willpower or perfect timing.',
      };
    case 'pro_only_streak_shields':
      return {
        title: 'Grace for the weeks that get away',
        subtitle:
          'Upgrade and we\u2019ll bring your streak back. Pro also adds Streak Shields for the weeks when life gets crowded.',
      };
    case 'pro_only_additional_financial_institution':
      return {
        title: 'See more of your financial life',
        subtitle:
          'Your first institution is included. Pro lets Kwilt connect additional institutions so your plan can reflect more of your household money.',
      };
    default:
      return {
        title: 'Build a system you’ll actually stick with',
        subtitle:
          'Pro removes limits and adds tools that make follow-through easier, even when life gets busy.',
      };
  }
}

export function PaywallContent(props: {
  reason: PaywallReason;
  source: PaywallSource;
  onClose: () => void;
  onUpgrade?: () => void;
  showHeader?: boolean;
}) {
  const { reason, source, onClose, onUpgrade, showHeader = true } = props;
  const { capture } = useAnalytics();
  const isPro = useEntitlementsStore((s) => s.isPro);
  const generativeCredits = useAppStore((s) => s.generativeCredits);
  const bonusGenerativeCredits = useAppStore((s) => s.bonusGenerativeCredits);
  const copy = useMemo(() => getPaywallCopy(reason, source), [reason, source]);

  const quotaSubtitle = useMemo(() => {
    const currentKey = getMonthKey(new Date());
    const baseLimit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
    const bonusRaw =
      bonusGenerativeCredits?.monthKey === currentKey
        ? Number((bonusGenerativeCredits as any).bonusThisMonth ?? 0)
        : 0;
    const bonusThisMonth = Number.isFinite(bonusRaw) ? Math.max(0, Math.floor(bonusRaw)) : 0;
    const limit = baseLimit + bonusThisMonth;
    const usedRaw =
      generativeCredits?.monthKey === currentKey ? Number((generativeCredits as any).usedThisMonth ?? 0) : 0;
    const usedThisMonth = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
    // If we hit the quota paywall, remaining is 0. Still, be defensive in copy.
    const displayedUsed = Math.min(Math.max(usedThisMonth, limit), limit);
    return `You’ve used all ${limit} AI credits for this month (${displayedUsed}/${limit}).`;
  }, [
    bonusGenerativeCredits?.bonusThisMonth,
    bonusGenerativeCredits?.monthKey,
    generativeCredits?.monthKey,
    generativeCredits?.usedThisMonth,
    isPro,
  ]);

  useEffect(() => {
    capture(AnalyticsEvent.PaywallViewed, { reason, source });
  }, [capture, reason, source]);

  return (
    <View style={styles.surface}>
      {showHeader ? (
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <BrandLockup
            logoSize={26}
            wordmarkSize="sm"
            color={colors.textPrimary}
            style={styles.brandLockup}
          />
          <Text style={styles.brandSeparator}>|</Text>
          <Text style={styles.brandPro}>Pro</Text>
        </View>
        <IconButton accessibilityLabel="Close paywall" variant="outline" onPress={onClose}>
          <Icon name="close" size={18} color={colors.textPrimary} />
        </IconButton>
      </View>
      ) : null}

      {/* Hero card = the full-color moment */}
      <LinearGradient colors={paywallTheme.gradientColors} style={styles.heroGradient}>
        <View style={styles.heroCard}>
          <VStack space="xs">
            <Heading style={styles.title}>{copy.title}</Heading>
            {reason === 'generative_quota_exceeded' && !isPro ? (
              <>
                <View style={styles.creditExhaustionBlock}>
                  <View style={styles.creditProgressRow}>
                    <View style={styles.creditProgressBarBg}>
                      <View style={[styles.creditProgressBarFill, { width: '100%' }]} />
                    </View>
                    <Text style={styles.creditProgressLabel}>{quotaSubtitle}</Text>
                  </View>
                  <View style={styles.creditComparisonRow}>
                    <View style={styles.creditComparisonItem}>
                      <Text style={styles.creditComparisonValue}>
                        {(() => {
                          const currentKey = getMonthKey(new Date());
                          const usedRaw = generativeCredits?.monthKey === currentKey
                            ? Number((generativeCredits as any).usedThisMonth ?? 0) : 0;
                          return Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
                        })()}
                      </Text>
                      <Text style={styles.creditComparisonLabel}>AI interactions{'\n'}this month</Text>
                    </View>
                    <View style={styles.creditComparisonDivider} />
                    <View style={styles.creditComparisonItem}>
                      <Text style={styles.creditComparisonValuePro}>{PRO_GENERATIVE_CREDITS_PER_MONTH.toLocaleString()}</Text>
                      <Text style={styles.creditComparisonLabel}>credits/month{'\n'}with Pro</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.subtitle}>{copy.subtitle}</Text>
              </>
            ) : reason === 'generative_quota_exceeded' ? (
              <>
                <Text style={styles.subtitle}>{quotaSubtitle}</Text>
              </>
            ) : (
              <Text style={styles.subtitle}>{copy.subtitle}</Text>
            )}
          </VStack>

          {!isPro ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upgrade to Pro"
                onPress={() => {
                  capture(AnalyticsEvent.PaywallUpgradeCtaTapped, { reason, source });
                  // Stash upsell context so ManageSubscriptionScreen can stamp
                  // `paywall_reason` / `paywall_source` onto the downstream
                  // purchase_started / purchase_succeeded / free_trial_started
                  // events for per-feature conversion attribution.
                  usePaywallStore.getState().setUpsellContext({ reason, source });
                  if (onUpgrade) {
                    onUpgrade();
                    return;
                  }
                  onClose();
                  // Avoid stacking two Modal-based BottomDrawers (paywall closing + pricing opening)
                  // which can leave an invisible backdrop intercepting touches on iOS.
                  setTimeout(() => openPaywallPurchaseEntry(), 340);
                }}
                style={styles.primaryCta}
              >
                <Text style={styles.primaryCtaLabel}>Upgrade</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                onPress={onClose}
                style={styles.secondaryCta}
              >
                <Text style={styles.secondaryCtaLabel}>Not now</Text>
              </Pressable>
              <SubscriptionLegalLinks tone="inverse" style={styles.legalLinks} />
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.primaryCta}
            >
              <Text style={styles.primaryCtaLabel}>Close</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Pro value units (consistent across paywall reasons) - only show for non-pro users */}
      {!isPro ? (
        <View style={styles.valueSection}>
          <Text style={styles.sectionLabel}>What Pro adds</Text>
          <VStack space="sm">
            {PRO_VALUE_ATTAINMENTS.map((benefit) => (
              <View key={benefit.title} style={styles.valueRow}>
                <Icon name="check" size={18} color={colors.accent} />
                <Text style={styles.valueText}>{benefit.title}</Text>
              </View>
            ))}
          </VStack>
        </View>
      ) : null}
    </View>
  );
}

export function PaywallDrawerHost() {
  const visible = usePaywallStore((s) => s.visible);
  const reason = usePaywallStore((s) => s.reason);
  const source = usePaywallStore((s) => s.source);
  const close = usePaywallStore((s) => s.close);
  const setToastsSuppressed = useToastStore((s) => s.setToastsSuppressed);

  // While the paywall interstitial is up, suppress toasts so we don't stack
  // transient UI over an interstitial.
  useEffect(() => {
    setToastsSuppressed({ key: 'paywall_interstitial', suppressed: visible });
    return () => setToastsSuppressed({ key: 'paywall_interstitial', suppressed: false });
  }, [setToastsSuppressed, visible]);

  if (!reason || !source) {
    return (
      <BottomDrawer
        visible={visible}
        onClose={close}
        snapPoints={['100%']}
        dismissable
        enableContentPanningGesture
        sheetStyle={styles.sheet}
        handleContainerStyle={styles.paywallHandleContainer}
        handleStyle={styles.paywallHandle}
      >
        <View style={{ flex: 1, backgroundColor: colors.canvas }} />
      </BottomDrawer>
    );
  }

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.paywallHandleContainer}
      handleStyle={styles.paywallHandle}
    >
      <PaywallContent reason={reason} source={source} onClose={close} />
    </BottomDrawer>
  );
}

export function PaywallDrawerScreenFallback(props: {
  reason: PaywallReason;
  source: PaywallSource;
  onClose: () => void;
}) {
  const { reason, source, onClose } = props;
  return (
    <BottomDrawer
      visible
      onClose={onClose}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.paywallHandleContainer}
      handleStyle={styles.paywallHandle}
    >
      <PaywallContent reason={reason} source={source} onClose={onClose} />
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
  },
  // Keep a small grab region so dismiss-drag works reliably.
  paywallHandleContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  paywallHandle: {
    opacity: 0.55,
  },
  surface: {
    flex: 1,
    padding: spacing.xs,
    backgroundColor: colors.canvas,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLockup: {
    // Keep the lockup compact for a drawer header.
    gap: spacing.xs,
  },
  brandSeparator: {
    ...typography.bodySm,
    color: colors.muted,
  },
  brandPro: {
    fontFamily: fonts.logo,
    fontSize: 22,
    lineHeight: 32,
    includeFontPadding: false,
    color: colors.accent,
  },
  heroGradient: {
    borderRadius: paywallTheme.cornerRadius,
    borderWidth: 1,
    borderColor: paywallTheme.surfaceBorder,
    overflow: 'hidden',
  },
  heroCard: {
    padding: paywallTheme.padding,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    ...typography.titleLg,
    color: paywallTheme.foreground,
  },
  subtitle: {
    ...typography.body,
    color: paywallTheme.foreground,
    opacity: 0.92,
  },
  primaryCta: {
    marginTop: spacing.md,
    backgroundColor: paywallTheme.ctaBackground,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryCtaLabel: {
    ...typography.body,
    fontFamily: fonts.semibold,
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
  legalLinks: {
    marginTop: spacing.md,
  },
  valueSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  sectionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  valueText: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  creditExhaustionBlock: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  creditProgressRow: {
    gap: 6,
  },
  creditProgressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  creditProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: paywallTheme.ctaBackground,
  },
  creditProgressLabel: {
    ...typography.bodySm,
    color: paywallTheme.foreground,
    opacity: 0.85,
  },
  creditComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  creditComparisonItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  creditComparisonValue: {
    ...typography.titleLg,
    fontFamily: fonts.bold,
    color: paywallTheme.foreground,
  },
  creditComparisonValuePro: {
    ...typography.titleLg,
    fontFamily: fonts.bold,
    color: paywallTheme.ctaBackground,
  },
  creditComparisonLabel: {
    ...typography.caption,
    color: paywallTheme.foreground,
    opacity: 0.75,
    textAlign: 'center',
  },
  creditComparisonDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

type PaywallBenefit = { title: string };

const PRO_VALUE_ATTAINMENTS: PaywallBenefit[] = [
  {
    title: '1,000 AI credits / month',
  },
  {
    title: 'Unlimited arcs + goals',
  },
  {
    title: 'Focus sessions up to 180 minutes',
  },
  {
    title: 'Saved views + advanced filters for activities',
  },
  {
    title: 'More banner images + search',
  },
  {
    title: 'AI scheduling + calendar export',
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
    case 'limit_goals_per_arc':
      return {
        title: 'Make room for the goals that matter right now',
        subtitle:
          'Life isn’t three goals at a time. Pro removes the cap so you can keep building—without deleting progress or constantly shuffling.',
      };
    case 'limit_arcs_total':
      return {
        title: 'Grow into more than one version of yourself',
        subtitle:
          'You can be ambitious in multiple directions. Pro lets you run multiple arcs so your goals don’t have to compete for space.',
      };
    case 'pro_only_unsplash_banners':
      return {
        title: 'Make your arcs feel unmistakably yours',
        subtitle:
          'Unlock a wider banner library and search so each arc has a visual that pulls you back in—every time you open the app.',
      };
    case 'pro_only_focus_mode':
      return {
        title: 'Go deep when it’s time to work',
        subtitle:
          'Pro unlocks longer focus sessions so you can do real work—not just get started. Protect your attention and finish what you begin.',
      };
    case 'pro_only_calendar_export':
      return {
        title: 'Make your plan show up in your real life',
        subtitle:
          'Get your activities into your calendar so your intentions become commitments—and your days feel aligned instead of reactive.',
      };
    case 'pro_only_views_filters':
      return {
        title: 'Turn your Activities list into a tool',
        subtitle:
          'Pro Tools unlocks saved views plus filtering and sorting—so you can focus on what matters right now without losing your place.',
      };
    case 'pro_only_ai_scheduling':
      return {
        title: 'Turn motivation into a realistic weekly plan',
        subtitle:
          'Pro Tools helps you schedule activities into your life so progress doesn’t depend on willpower or perfect timing.',
      };
    default:
      return {
        title: 'Build a system you’ll actually stick with',
        subtitle:
          'Pro removes limits and unlocks tools that make follow-through easier—so you keep showing up, even when life gets busy.',
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
        <IconButton accessibilityLabel="Close paywall" onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={18} color={colors.textPrimary} />
        </IconButton>
      </View>
      ) : null}

      {/* Hero card = the full-color moment */}
      <LinearGradient colors={[...paywallTheme.gradientColors]} style={styles.heroGradient}>
        <View style={styles.heroCard}>
          <VStack space="xs">
            <Heading style={styles.title}>{copy.title}</Heading>
            {reason === 'generative_quota_exceeded' ? (
              <>
                <Text style={styles.subtitle}>{quotaSubtitle}</Text>
                <Text style={styles.subtitle}>{copy.subtitle}</Text>
              </>
            ) : (
              <Text style={styles.subtitle}>{copy.subtitle}</Text>
            )}
          </VStack>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
            onPress={() => {
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
        </View>
      </LinearGradient>

      {/* Pro value units (consistent across paywall reasons) */}
      <View style={styles.valueSection}>
        <Text style={styles.sectionLabel}>What you unlock</Text>
        <VStack space="sm">
          {PRO_VALUE_ATTAINMENTS.map((benefit) => (
            <View key={benefit.title} style={styles.valueRow}>
              <Icon name="check" size={18} color={colors.accent} />
              <Text style={styles.valueText}>{benefit.title}</Text>
            </View>
          ))}
        </VStack>
      </View>
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
});



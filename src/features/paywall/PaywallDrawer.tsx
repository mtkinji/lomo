import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PaywallReason, PaywallSource } from '../../services/paywall';
import { isRetiredPaywallReason, openPaywallPurchaseEntry } from '../../services/paywall';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { VStack, Heading, Text } from '../../ui/primitives';
import { cardElevation, colors, fonts, spacing, typography } from '../../theme';
import { BrandLockup } from '../../ui/BrandLockup';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { paywallTheme } from './paywallTheme';
import { usePaywallStore } from '../../store/usePaywallStore';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useToastStore } from '../../store/useToastStore';
import { getProUpgradeInvitation } from '../../domain/proAccessPolicy';
import { isAdvancedScreenTimePaywallEnabled } from '../screen-time/runtime/screenTimeMonetizationFlag';
import { useProStoreOffer } from '../account/useProStoreOffer';
import {
  buildContextualCommercialOffer,
  type ContextualCommercialOffer,
} from '../account/subscriptionPricing';

const MONEY_HERO_COLORS = [colors.accent, colors.accent, colors.accent] as [string, string, string]; // @kwilt-brand-moment: the Money upgrade invitation uses one continuous field of official Kwilt Pine.
const MONEY_UPGRADE_CTA_LABEL = 'Upgrade to Pro';
const MONEY_OFFER_VARIANT = 'money_contextual_template_v1';

type PaywallCopy = {
  title: string;
  subtitle: string;
  benefits?: readonly string[];
};

type PaywallCapture = ReturnType<typeof useAnalytics>['capture'];

function runPaywallUpgrade(args: {
  reason: PaywallReason;
  source: PaywallSource;
  capture: PaywallCapture;
  onClose: () => void;
  onUpgrade?: () => void;
  offerState?: ContextualCommercialOffer['offerState'];
}) {
  const { reason, source, capture, onClose, onUpgrade, offerState } = args;
  capture(AnalyticsEvent.PaywallUpgradeCtaTapped, {
    reason,
    source,
    ...(reason === 'pro_money_budgets'
      ? { variant: MONEY_OFFER_VARIANT, offer_state: offerState ?? 'standard' }
      : {}),
  });
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
}

function getPaywallCopy(reason: PaywallReason, advancedScreenTimePaywallEnabled: boolean): PaywallCopy | null {
  // A retired boundary is part of the complete Free product. Even if an old
  // caller mounts this component directly, it must not turn into an offer.
  if (isRetiredPaywallReason(reason)) return null;
  if (reason === 'pro_advanced_screen_time_rules' && !advancedScreenTimePaywallEnabled) return null;

  // Keep messaging value-oriented and context-specific.
  switch (reason) {
    case 'generative_quota_exceeded':
      return {
        title: 'You’re out of AI credits',
        subtitle:
          'Pro includes 1,000 AI credits each month for planning, scheduling, and file analysis.',
        benefits: [
          'Get 1,000 AI credits each month',
          'Move from an idea to a workable plan',
          'Ask Kwilt to work from supported files',
        ],
      };
    case 'ai_quota_exceeded':
      return {
        title: 'AI is temporarily unavailable',
        subtitle:
          'Pro includes 1,000 AI credits each month for planning, scheduling, and file analysis.',
        benefits: [
          'Get 1,000 AI credits each month',
          'Move from an idea to a workable plan',
          'Ask Kwilt to work from supported files',
        ],
      };
    case 'pro_money_budgets':
      return {
        title: 'Know what’s left. Stay in control.',
        subtitle: 'Kwilt keeps your plan current and can pause selected spending apps until you decide.',
        benefits: [
          'Real transactions keep your plan up to date',
          'Selected apps wait for a budget check',
          'You decide whether to continue',
        ],
      };
    case 'pro_advanced_screen_time_rules':
      return {
        title: 'Make Screen Time fit the rule you need',
        subtitle: 'Add schedules or combine conditions so selected apps respond to the rule you chose.',
        benefits: [
          'Schedule when selected apps pause or open',
          'Combine Focus and daily app use when one condition is not enough',
          'Require a completed step or budget review',
        ],
      };
    case 'pro_family_screen_time':
      return {
        title: 'Make Screen Time a family agreement',
        subtitle: 'Set clear rules for a child and make caregiver changes without losing track of what each device received.',
        benefits: [
          'Set schedules and daily app limits',
          'Put responsibilities before selected apps',
          'See whether each device received the latest rule',
        ],
      };
    case 'pro_advanced_cloud_ai':
      return {
        title: 'Plan across more than one part of life',
        subtitle: 'Let Kwilt work across goals, calendar, Money, and other context you choose.',
        benefits: [
          'Work through complicated tradeoffs',
          'Turn the plan into next steps',
          'Get 1,000 cloud AI credits each month',
        ],
      };
    case 'pro_ai_attachment_analysis':
      return {
        title: 'Turn this file into a useful next step',
        subtitle: 'Let Kwilt read a supported attachment and use it with the context you choose.',
        benefits: [
          'Pull useful details from supported files',
          'Use them in planning or scheduling',
          'Review the result before anything changes',
        ],
      };
    case 'pro_ai_scheduling':
      return {
        title: 'Give this work a place in your week',
        subtitle: 'Kwilt finds workable calendar time. You review the plan before it is saved.',
        benefits: [
          'Work around existing commitments',
          'Place next steps into open time',
          'Approve the schedule before it is saved',
        ],
      };
    case 'pro_background_ai':
      return {
        title: 'Let Kwilt finish while you move on',
        subtitle: 'Leave this screen. Kwilt brings the result back when it is ready.',
        benefits: [
          'Keep using Kwilt while the work runs',
          'Return to the finished result',
          'Review the result before anything changes',
        ],
      };
    case 'pro_external_agent':
      return {
        title: 'Bring Kwilt into the AI tools you use',
        subtitle: 'Let a supported tool work with the Kwilt context and permissions you choose.',
        benefits: [
          'Choose what the tool can access',
          'Let it read or propose changes',
          'Review changes before they are applied',
        ],
      };
    default:
      return {
        title: 'This action requires Kwilt Pro',
        subtitle: 'Open plans to see the current Pro features and price.',
      };
  }
}

export function PaywallContent(props: {
  reason: PaywallReason;
  source: PaywallSource;
  onClose: () => void;
  onUpgrade?: () => void;
  showHeader?: boolean;
  showAction?: boolean;
  moneyCommercialOffer?: ContextualCommercialOffer | null;
  moneyOfferResolved?: boolean;
}) {
  const {
    reason,
    source,
    onClose,
    onUpgrade,
    showHeader = true,
    showAction = true,
    moneyCommercialOffer = null,
    moneyOfferResolved = true,
  } = props;
  const { capture } = useAnalytics();
  const isPro = useEntitlementsStore((s) => s.isPro);
  const generativeCredits = useAppStore((s) => s.generativeCredits);
  const bonusGenerativeCredits = useAppStore((s) => s.bonusGenerativeCredits);
  const advancedScreenTimePaywallEnabled = isAdvancedScreenTimePaywallEnabled();
  const proUpgradeInvitation = getProUpgradeInvitation(advancedScreenTimePaywallEnabled);
  const copy = useMemo(
    () => getPaywallCopy(reason, advancedScreenTimePaywallEnabled),
    [advancedScreenTimePaywallEnabled, reason],
  );
  const isMoneyHero = reason === 'pro_money_budgets';
  const upgradeCtaLabel = isMoneyHero
    ? moneyCommercialOffer?.cta ?? MONEY_UPGRADE_CTA_LABEL
    : 'View Pro plans';
  const valueAttainments = useMemo(
    () => (copy?.benefits ?? proUpgradeInvitation.benefits).map((title) => ({ title })),
    [copy?.benefits, proUpgradeInvitation.benefits],
  );
  const capturedViewKeyRef = useRef<string | null>(null);

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
    if (isRetiredPaywallReason(reason)) return;
    if (isMoneyHero && !moneyOfferResolved) return;
    const viewKey = `${reason}:${source}`;
    if (capturedViewKeyRef.current === viewKey) return;
    capturedViewKeyRef.current = viewKey;
    capture(AnalyticsEvent.PaywallViewed, {
      reason,
      source,
      ...(isMoneyHero
        ? {
            variant: MONEY_OFFER_VARIANT,
            offer_state: moneyCommercialOffer?.offerState ?? 'standard',
          }
        : {}),
    });
  }, [capture, isMoneyHero, moneyCommercialOffer?.offerState, moneyOfferResolved, reason, source]);

  if (!copy) return null;

  const handleUpgrade = () => runPaywallUpgrade({
    reason,
    source,
    capture,
    onClose,
    onUpgrade,
    offerState: moneyCommercialOffer?.offerState,
  });

  return (
    <View style={[styles.surface, isMoneyHero ? styles.moneySurface : null]}>
      {showHeader ? (
        <BottomDrawerHeader
          variant="withClose"
          onClose={onClose}
          closeAccessibilityLabel="Close paywall"
          closeTone={isMoneyHero ? 'inverse' : 'default'}
          containerStyle={[styles.paywallHeader, isMoneyHero ? styles.moneyHeader : null]}
          title={(
            <View style={styles.brandRow}>
              <BrandLockup
                logoSize={26}
                wordmarkSize="sm"
                color={isMoneyHero ? colors.parchment : colors.textPrimary}
                logoVariant={isMoneyHero ? 'parchment' : 'default'}
                style={styles.brandLockup}
              />
              <Text style={[styles.brandSeparator, isMoneyHero ? styles.moneyHeaderText : null]}>|</Text>
              <Text style={[styles.brandPro, isMoneyHero ? styles.moneyHeaderText : null]}>Pro</Text>
            </View>
          )}
        />
      ) : null}

      {/* Hero card = the full-color moment */}
      <LinearGradient
        colors={isMoneyHero ? MONEY_HERO_COLORS : paywallTheme.gradientColors}
        style={[styles.heroGradient, isMoneyHero ? styles.moneyHeroGradient : null]}
      >
        {isMoneyHero ? (
          <View style={styles.moneyVisual}>
            <Image
              source={require('../../../assets/images/paywall/money-control-hero-v1.jpg')}
              resizeMode="cover"
              style={styles.moneyVisualImage}
              accessible
              accessibilityLabel="A parent checking their phone before a household purchase"
            />
            <View
              style={styles.moneyProofCard}
              accessible
              accessibilityLabel="Spending app paused"
            >
              <View style={styles.moneyProofIcon}>
                <Icon name="pause" size={18} color={colors.parchment} />
              </View>
              <View style={styles.moneyProofCopy}>
                <Text style={styles.moneyProofTitle}>Spending app paused</Text>
              </View>
            </View>
          </View>
        ) : null}
        <View style={[styles.heroCard, isMoneyHero ? styles.moneyHeroCard : null]}>
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
            {isMoneyHero && moneyCommercialOffer ? (
              <Text style={styles.moneyCommercialOffer}>{moneyCommercialOffer.text}</Text>
            ) : null}
          </VStack>

          {showAction ? (!isPro ? (
            isMoneyHero ? (
              <View style={styles.moneyPrimaryAction}>
                <Button
                  accessibilityLabel={upgradeCtaLabel}
                  variant="inverse"
                  size="lg"
                  fullWidth
                  onPress={handleUpgrade}
                >
                  {upgradeCtaLabel}
                </Button>
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={upgradeCtaLabel}
                  onPress={handleUpgrade}
                  style={styles.primaryCta}
                >
                  <Text style={styles.primaryCtaLabel}>{upgradeCtaLabel}</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Not now"
                  onPress={onClose}
                  style={styles.secondaryCta}
                >
                  <Text style={styles.secondaryCtaLabel}>Not now</Text>
                </Pressable>
              </>
            )
          ) : (
            isMoneyHero ? (
              <View style={styles.moneyPrimaryAction}>
                <Button
                  accessibilityLabel="Close"
                  variant="inverse"
                  size="lg"
                  fullWidth
                  onPress={onClose}
                >
                  Close
                </Button>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={styles.primaryCta}
              >
                <Text style={styles.primaryCtaLabel}>Close</Text>
              </Pressable>
            )
          )) : null}
        </View>
      </LinearGradient>

      {/* Pro value units (consistent across paywall reasons) - only show for non-pro users */}
      {!isPro && !isMoneyHero ? (
        <View style={styles.valueSection}>
          <Text style={styles.sectionLabel}>With Pro</Text>
          <VStack space="sm">
            {valueAttainments.map((benefit) => (
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
  const isPro = useEntitlementsStore((s) => s.isPro);
  const { capture } = useAnalytics();
  const storeOffer = useProStoreOffer();
  const moneyCommercialOffer = useMemo(
    () => storeOffer.status === 'ready'
      ? buildContextualCommercialOffer(storeOffer.snapshot)
      : null,
    [storeOffer.snapshot, storeOffer.status],
  );
  const moneyCtaLabel = moneyCommercialOffer?.cta ?? MONEY_UPGRADE_CTA_LABEL;

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

  const isMoneyHero = reason === 'pro_money_budgets';
  const handleMoneyFooterAction = () => {
    if (isPro) {
      close();
      return;
    }
    runPaywallUpgrade({
      reason,
      source,
      capture,
      onClose: close,
      offerState: moneyCommercialOffer?.offerState,
    });
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      contentLayout={isMoneyHero ? 'edgeToEdge' : 'inset'}
      bottomAccessory={isMoneyHero ? (
        <Button
          accessibilityLabel={isPro ? 'Close' : moneyCtaLabel}
          fullWidth
          size="lg"
          variant="inverse"
          onPress={handleMoneyFooterAction}
        >
          {isPro ? 'Close' : moneyCtaLabel}
        </Button>
      ) : undefined}
      bottomAccessoryPlacement="phoneFloating"
      sheetStyle={[styles.sheet, isMoneyHero ? styles.moneySheet : null]}
      handleContainerStyle={styles.paywallHandleContainer}
      handleStyle={[styles.paywallHandle, isMoneyHero ? styles.moneyPaywallHandle : null]}
    >
      <PaywallContent
        reason={reason}
        source={source}
        onClose={close}
        showAction={!isMoneyHero}
        moneyCommercialOffer={moneyCommercialOffer}
        moneyOfferResolved={storeOffer.status !== 'loading'}
      />
    </BottomDrawer>
  );
}

export function PaywallDrawerScreenFallback(props: {
  reason: PaywallReason;
  source: PaywallSource;
  onClose: () => void;
}) {
  const { reason, source, onClose } = props;
  const isPro = useEntitlementsStore((s) => s.isPro);
  const { capture } = useAnalytics();
  const isMoneyHero = reason === 'pro_money_budgets';
  const storeOffer = useProStoreOffer();
  const moneyCommercialOffer = useMemo(
    () => storeOffer.status === 'ready'
      ? buildContextualCommercialOffer(storeOffer.snapshot)
      : null,
    [storeOffer.snapshot, storeOffer.status],
  );
  const moneyCtaLabel = moneyCommercialOffer?.cta ?? MONEY_UPGRADE_CTA_LABEL;
  const handleMoneyFooterAction = () => {
    if (isPro) {
      onClose();
      return;
    }
    runPaywallUpgrade({
      reason,
      source,
      capture,
      onClose,
      offerState: moneyCommercialOffer?.offerState,
    });
  };

  return (
    <BottomDrawer
      visible
      onClose={onClose}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      contentLayout={isMoneyHero ? 'edgeToEdge' : 'inset'}
      bottomAccessory={isMoneyHero ? (
        <Button
          accessibilityLabel={isPro ? 'Close' : moneyCtaLabel}
          fullWidth
          size="lg"
          variant="inverse"
          onPress={handleMoneyFooterAction}
        >
          {isPro ? 'Close' : moneyCtaLabel}
        </Button>
      ) : undefined}
      bottomAccessoryPlacement="phoneFloating"
      sheetStyle={[styles.sheet, isMoneyHero ? styles.moneySheet : null]}
      handleContainerStyle={styles.paywallHandleContainer}
      handleStyle={[styles.paywallHandle, isMoneyHero ? styles.moneyPaywallHandle : null]}
    >
      <PaywallContent
        reason={reason}
        source={source}
        onClose={onClose}
        showAction={!isMoneyHero}
        moneyCommercialOffer={moneyCommercialOffer}
        moneyOfferResolved={storeOffer.status !== 'loading'}
      />
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
  },
  moneySheet: {
    backgroundColor: colors.accent, // @kwilt-brand-moment: the Money upgrade invitation is an immersive Pro brand moment.
  },
  // Keep a small grab region so dismiss-drag works reliably.
  paywallHandleContainer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  paywallHandle: {
    opacity: 0.55,
  },
  moneyPaywallHandle: {
    backgroundColor: colors.parchment,
  },
  surface: {
    flex: 1,
    padding: spacing.xs,
    backgroundColor: colors.canvas,
  },
  moneySurface: {
    padding: 0,
    backgroundColor: colors.accent, // @kwilt-brand-moment: the Money upgrade invitation is an immersive Pro brand moment.
  },
  paywallHeader: {
    marginBottom: spacing.lg,
  },
  moneyHeader: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
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
  moneyHeaderText: {
    color: colors.parchment,
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
  moneyHeroGradient: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: colors.accent, // @kwilt-brand-moment: the Money upgrade invitation is an immersive Pro brand moment.
  },
  moneyHeroCard: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  moneyVisual: {
    height: 352,
    marginHorizontal: spacing.lg,
    borderRadius: paywallTheme.cornerRadius,
    backgroundColor: colors.parchment,
    overflow: 'hidden',
    position: 'relative',
  },
  moneyVisualImage: {
    width: '100%',
    height: '100%',
  },
  moneyProofCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.parchment,
    ...cardElevation.overlay,
  },
  moneyProofIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent, // @kwilt-brand-moment: the pause mark makes Kwilt's spending control concrete.
  },
  moneyProofCopy: {
    flex: 1,
    gap: 1,
  },
  moneyProofTitle: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  moneyPrimaryAction: {
    marginTop: spacing.md,
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
  moneyCommercialOffer: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: paywallTheme.foreground,
    marginTop: spacing.sm,
  },
  primaryCta: {
    marginTop: spacing.md,
    backgroundColor: paywallTheme.ctaBackground,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryCtaLabel: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: paywallTheme.ctaForeground,
    textAlign: 'center',
  },
  secondaryCta: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
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

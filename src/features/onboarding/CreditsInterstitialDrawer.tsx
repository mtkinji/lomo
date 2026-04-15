import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCreditsInterstitialStore } from '../../store/useCreditsInterstitialStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAppStore } from '../../store/useAppStore';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { colors, spacing, typography } from '../../theme';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';

function useCreditStats() {
  const isPro = useEntitlementsStore((s) => s.isPro);
  const generativeCredits = useAppStore((s) => s.generativeCredits);
  const bonusGenerativeCredits = useAppStore((s) => s.bonusGenerativeCredits);

  return useMemo(() => {
    const currentKey = getMonthKey(new Date());
    const base = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
    const bonusRaw =
      bonusGenerativeCredits?.monthKey === currentKey
        ? Number((bonusGenerativeCredits as any).bonusThisMonth ?? 0)
        : 0;
    const bonus = Number.isFinite(bonusRaw) ? Math.max(0, Math.floor(bonusRaw)) : 0;
    const limit = base + bonus;
    const usedRaw =
      generativeCredits?.monthKey === currentKey ? Number((generativeCredits as any).usedThisMonth ?? 0) : 0;
    const used = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
    const remaining = Math.max(0, limit - used);
    return { isPro, base, bonus, limit, used, remaining };
  }, [bonusGenerativeCredits?.monthKey, bonusGenerativeCredits?.bonusThisMonth, generativeCredits?.monthKey, generativeCredits?.usedThisMonth, isPro]);
}

export function CreditsInterstitialDrawerHost() {
  const visible = useCreditsInterstitialStore((s) => s.visible);
  const kind = useCreditsInterstitialStore((s) => s.kind);
  const close = useCreditsInterstitialStore((s) => s.close);
  const stats = useCreditStats();

  const isCompletion = kind === 'completion';
  const isReward = kind === 'reward';

  const title = isCompletion
    ? 'You\u2019re all set'
    : isReward
    ? 'You earned AI credits'
    : 'AI credits';

  const subtitle = isCompletion
    ? `Kwilt AI coaching runs on credits. You\u2019re starting with ${stats.remaining} this month.`
    : isReward
    ? `You have ${stats.remaining}/${stats.limit} AI credits available this month.`
    : `You\u2019re currently on ${stats.isPro ? 'Pro' : 'Free'}. You get ${stats.base} credits per month.`;

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['55%']}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <View style={styles.surface}>
        <View style={styles.titleRow}>
          {isCompletion ? (
            <View style={styles.iconBadge}>
              <Icon name="checkCircle" size={20} color={colors.pine50} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {isCompletion ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroValue}>{stats.remaining}</Text>
              <Text style={styles.heroLabel}>AI credits</Text>
            </View>

            <View style={styles.body}>
              <Text style={styles.bullet}>{'\u2022'} Ask your coach anything {'\u2014'} each conversation uses one credit.</Text>
              <Text style={styles.bullet}>{'\u2022'} Credits refresh at the start of every month.</Text>
              {stats.bonus > 0 ? (
                <Text style={styles.bullet}>{'\u2022'} Bonus credits this month: +{stats.bonus}.</Text>
              ) : null}
            </View>
          </>
        ) : null}

        <View style={styles.ctaGroup}>
          <Pressable accessibilityRole="button" onPress={close} style={styles.primaryCta}>
            <Text style={styles.primaryCtaLabel}>{isCompletion ? 'Start exploring' : 'Continue'}</Text>
          </Pressable>

          {isCompletion && !stats.isPro ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                close();
                setTimeout(() => openPaywallPurchaseEntry(), 340);
              }}
              style={styles.secondaryCta}
            >
              <Text style={styles.secondaryCtaLabel}>Want more? See Pro plans</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.canvas,
  },
  handleContainer: {
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
  },
  handle: {
    backgroundColor: colors.border,
  },
  surface: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.pine700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  heroValue: {
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    fontFamily: typography.titleXl.fontFamily,
    color: colors.pine700,
  },
  heroLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  bullet: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  ctaGroup: {
    marginTop: 'auto',
    gap: spacing.sm,
  },
  primaryCta: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaLabel: {
    ...typography.bodyBold,
    color: colors.primaryForeground,
  },
  secondaryCta: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaLabel: {
    ...typography.bodySm,
    color: colors.accent,
  },
});

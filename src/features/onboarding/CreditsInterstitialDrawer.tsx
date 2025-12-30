import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCreditsInterstitialStore } from '../../store/useCreditsInterstitialStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAppStore } from '../../store/useAppStore';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
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
  const spentCredits = useCreditsInterstitialStore((s) => s.spentCredits);
  const close = useCreditsInterstitialStore((s) => s.close);
  const stats = useCreditStats();

  const title =
    kind === 'completion'
      ? 'You’re topped up'
      : kind === 'reward'
      ? 'You earned AI credits'
      : 'AI credits';

  const subtitle =
    kind === 'completion'
      ? `You now have ${stats.remaining}/${stats.limit} AI credits available this month.`
      : kind === 'reward'
      ? `You have ${stats.remaining}/${stats.limit} AI credits available this month.`
      : `You’re currently on ${stats.isPro ? 'Pro' : 'Free'}. You get ${stats.base} credits per month.`;

  const hero =
    kind === 'education' && spentCredits && spentCredits > 0
      ? { value: String(spentCredits), label: 'AI credit used' }
      : kind === 'completion'
      ? { value: String(stats.base), label: 'AI credits available' }
      : null;

  return (
    <BottomDrawer
      visible={visible}
      onClose={close}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <View style={styles.surface}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          <IconButton accessibilityLabel="Close" onPress={close}>
            <Icon name="close" size={18} color={colors.textPrimary} />
          </IconButton>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>

        {hero ? (
          <View style={styles.hero}>
            <Text style={styles.heroValue}>{hero.value}</Text>
            <Text style={styles.heroLabel}>{hero.label}</Text>
          </View>
        ) : null}

        {kind === 'education' ? (
          <View style={styles.body}>
            <Text style={styles.bullet}>• Credits refresh monthly.</Text>
            <Text style={styles.bullet}>• During onboarding, AI help is included (fair-use limits).</Text>
            <Text style={styles.bullet}>• Finish onboarding to start with a full {stats.base}/{stats.base} this month.</Text>
          </View>
        ) : null}

        {kind === 'completion' ? (
          <View style={styles.body}>
            <Text style={styles.bullet}>• Your monthly credits are ready for exploring AI across the app.</Text>
            {stats.bonus > 0 ? (
              <Text style={styles.bullet}>• Bonus credits this month: +{stats.bonus}.</Text>
            ) : null}
          </View>
        ) : null}

        <Pressable accessibilityRole="button" onPress={close} style={styles.primaryCta}>
          <Text style={styles.primaryCtaLabel}>Continue</Text>
        </Pressable>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  body: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroValue: {
    fontSize: 72,
    lineHeight: 72,
    letterSpacing: -2,
    color: colors.textPrimary,
    ...(typography.titleMd as any),
  },
  heroLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bullet: {
    ...typography.body,
    color: colors.textPrimary,
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
});



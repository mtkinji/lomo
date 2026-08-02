import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney } from '../data/moneySnapshot';
import { getLivingPlanSettings, saveLivingPlanPromotionEnabled, saveLivingTargetIntent } from '../data/livingPlanRepository';
import { buildMoneyOnboardingTarget, getMoneyOnboardingCompletionDecision, shouldOfferMoneyOnboarding } from '../domain/moneyOnboarding';
import { startMoneyPlaidLink } from '../native/moneyPlaidLink';
import type { MoneyStackParamList } from '../navigation/types';
import { reconcileLivingPlan } from '../runtime/livingPlanReconciliation';
import { completeMoneyOnboarding, loadMoneyOnboardingState } from '../runtime/moneyOnboardingStorage';
import { MoneyScreenFrame } from './MoneyScreenFrame';

type SetupStep = 'welcome' | 'target' | 'account' | 'build' | 'complete';

export function MoneySetupScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneySetup'>) {
  const { reconcileGovernedPlanFoundation, refresh, snapshot } = useMoneyData();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [livingPercent, setLivingPercent] = useState(70);
  const [userId, setUserId] = useState<string | null>(null);
  const [skippedAccount, setSkippedAccount] = useState(false);
  const [linkedDuringSetup, setLinkedDuringSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error('Sign in to set up Money.');
        const [local, settings] = await Promise.all([
          loadMoneyOnboardingState(data.user.id),
          getLivingPlanSettings(client),
        ]);
        if (cancelled) return;
        setUserId(data.user.id);
        setLivingPercent(local.target?.livingPercent ?? settings.target?.livingPercent ?? 70);
        if (!shouldOfferMoneyOnboarding({
          localCompletedAt: local.completedAt,
          hasLivingTarget: Boolean(settings.target),
          hasActiveLivingPlan: Boolean(settings.active),
          hasLinkedAccount: Boolean(snapshot?.accounts.length),
        })) setStep('complete');
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Money setup could not be loaded.');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [snapshot?.accounts.length]);

  const target = useMemo(() => buildMoneyOnboardingTarget(livingPercent, new Date().toISOString()), [livingPercent]);

  const connectAccount = async () => {
    if (busy) return;
    if (snapshot?.accounts.length || linkedDuringSetup) {
      setStep('build');
      return;
    }
    setBusy(true);
    setMessage('Opening a secure Plaid connection…');
    try {
      const result = await startMoneyPlaidLink();
      if (result.status === 'cancelled') {
        setMessage('Account connection closed without changes.');
        return;
      }
      setLinkedDuringSetup(true);
      setSkippedAccount(false);
      await reconcileGovernedPlanFoundation();
      setMessage(`${result.exchange.institutionName} connected and synced.`);
      setStep('build');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The account could not be connected.');
    } finally {
      setBusy(false);
    }
  };

  const buildPlan = async () => {
    if (busy || !userId) return;
    setBusy(true);
    setMessage('Building your Money plan from current account evidence…');
    try {
      const client = getSupabaseClient();
      await reconcileGovernedPlanFoundation();
      await saveLivingPlanPromotionEnabled(client, true);
      await saveLivingTargetIntent(client, target);
      const decision = getMoneyOnboardingCompletionDecision(await reconcileLivingPlan(client, 'initial_sync'), skippedAccount);
      if (!decision.complete) {
        setMessage(decision.message ?? 'Kwilt could not build a usable Money plan yet.');
        return;
      }
      await completeMoneyOnboarding(userId, target, { skippedAccountConnection: skippedAccount });
      await refresh();
      setMessage(null);
      setStep('complete');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kwilt could not finish Money setup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MoneyScreenFrame
      title="Set up Money"
    >
      <View style={styles.progress} accessibilityLabel={`Money setup step ${stepNumber(step)} of 4`}>
        {[1, 2, 3, 4].map((index) => <View key={index} style={[styles.progressSegment, index <= stepNumber(step) ? styles.progressSegmentActive : null]} />)}
      </View>

      <View style={styles.card}>
        {step === 'welcome' ? <>
          <Text variant="label" tone="secondary">First-time setup</Text>
          <Heading variant="lg">Make money decisions from the life you mean to live.</Heading>
          <Text tone="secondary">Kwilt Money keeps spending, saving, and the rest of your plan together inside Kwilt.</Text>
          <Button fullWidth onPress={() => setStep('target')} variant="primary">Choose a living target</Button>
        </> : null}

        {step === 'target' ? <>
          <Text variant="label" tone="secondary">Monthly living target</Text>
          <Heading variant="xl">{livingPercent}%</Heading>
          <Text tone="secondary">Kwilt will fit category plans to this share of reliable monthly income, fixed costs first.</Text>
          <View style={styles.targetOptions}>
            {[50, 60, 70, 80, 90, 100].map((value) => (
              <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: value === livingPercent }} onPress={() => setLivingPercent(value)} style={[styles.targetOption, value === livingPercent ? styles.targetOptionSelected : null]}>
                <Text variant="label" tone={value === livingPercent ? 'accent' : 'secondary'}>{value}%</Text>
              </Pressable>
            ))}
          </View>
          <Button fullWidth onPress={() => setStep('account')} variant="primary">Use this target</Button>
        </> : null}

        {step === 'account' ? <>
          <Text variant="label" tone="secondary">Account evidence</Text>
          <Heading variant="lg">Connect the accounts that matter.</Heading>
          <Text tone="secondary">Kwilt reads transaction history through Plaid so the plan reflects real income and spending.</Text>
          <Button disabled={busy} fullWidth onPress={() => void connectAccount()} variant="primary">
            {busy ? 'Connecting…' : snapshot?.accounts.length || linkedDuringSetup ? 'Continue with connected account' : 'Connect account'}
          </Button>
          <Button disabled={busy} fullWidth onPress={() => { setSkippedAccount(true); setStep('build'); setMessage(null); }} variant="ghost">Connect later</Button>
        </> : null}

        {step === 'build' ? <>
          <Text variant="label" tone="secondary">Ready to build</Text>
          <Heading variant="lg">Start with a {livingPercent}% living target.</Heading>
          <Text tone="secondary">{skippedAccount ? 'You can save the target now, but Kwilt needs usable account history before setup can finish.' : 'Kwilt will create a versioned plan from current evidence. Every later automatic change remains reviewable and reversible.'}</Text>
          <Button disabled={busy || !userId} fullWidth onPress={() => void buildPlan()} variant="primary">{busy ? 'Building…' : 'Build my Money plan'}</Button>
          {skippedAccount ? <Button disabled={busy} fullWidth onPress={() => { setSkippedAccount(false); setStep('account'); }} variant="outline">Connect an account</Button> : null}
        </> : null}

        {step === 'complete' ? <>
          <Text variant="label" tone="secondary">Money is ready</Text>
          <Heading variant="lg">Your monthly plan</Heading>
          {snapshot?.livingLimitAnswer?.facts.livingLimitCents != null
            && snapshot.livingLimitAnswer.facts.protectedPlanCents != null
            && snapshot.livingLimitAnswer.facts.flexibleCapacityCents != null ? (
              <View style={styles.planFacts}>
                <SetupPlanRow label="You plan to use" value={formatMoney(snapshot.livingLimitAnswer.facts.livingLimitCents)} />
                <SetupPlanRow label="Protected costs" value={`−${formatMoney(snapshot.livingLimitAnswer.facts.protectedPlanCents)}`} />
                <View style={styles.planDivider} />
                <SetupPlanRow emphasized label="Flexible money" value={formatMoney(snapshot.livingLimitAnswer.facts.flexibleCapacityCents)} />
              </View>
            ) : (
              <Text tone="secondary">Kwilt will keep your monthly plan current and tell you what is left.</Text>
            )}
          <Text tone="secondary">Kwilt will keep this plan current and tell you what is left for flexible spending.</Text>
          <Button fullWidth onPress={() => navigation.navigate('MoneySummary')} variant="primary">Use this plan</Button>
          <Button fullWidth onPress={() => navigation.navigate('MoneyLivingPlan')} variant="outline">Change plan</Button>
        </> : null}
      </View>

      {message ? <Text accessibilityRole="alert" tone="secondary" style={styles.message}>{message}</Text> : null}
    </MoneyScreenFrame>
  );
}

function SetupPlanRow({ emphasized = false, label, value }: { emphasized?: boolean; label: string; value: string }) {
  return (
    <View style={styles.planRow}>
      <Text variant="body" tone={emphasized ? 'default' : 'secondary'} style={emphasized ? styles.planEmphasis : undefined}>{label}</Text>
      <Text variant="body" style={emphasized ? styles.planEmphasis : undefined}>{value}</Text>
    </View>
  );
}

function stepNumber(step: SetupStep): number {
  if (step === 'welcome') return 1;
  if (step === 'target') return 2;
  if (step === 'account') return 3;
  return 4;
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: spacing.xs },
  progressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  progressSegmentActive: { backgroundColor: colors.accent },
  card: { gap: spacing.md, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  targetOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  targetOption: { minWidth: 64, alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.fieldFill },
  targetOptionSelected: { borderColor: colors.accent, backgroundColor: colors.card },
  planFacts: { gap: spacing.sm, paddingVertical: spacing.xs },
  planRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  planDivider: { height: 1, backgroundColor: colors.border },
  planEmphasis: { fontWeight: '700' },
  message: { textAlign: 'center', paddingHorizontal: spacing.md },
});

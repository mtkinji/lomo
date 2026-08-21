import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { openPaywallInterstitial } from '../../../services/paywall';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing, typography } from '../../../theme';
import { Button, IconButton } from '../../../ui/Button';
import { Icon, type IconName } from '../../../ui/Icon';
import { FullWidthActionDock } from '../../../ui/FullWidthActionDock';
import { FullScreenInterstitial } from '../../../ui/FullScreenInterstitial';
import {
  KWILT_REFRESH_COMPLETION_MS,
  KwiltLoader,
  type KwiltLoaderPhase,
} from '../../../ui/KwiltLoader';
import { Logo } from '../../../ui/Logo';
import { ButtonLabel, Heading, Text } from '../../../ui/Typography';
import {
  CAPABILITY_ONBOARDING_STEP_GEOMETRY,
  CapabilityOnboardingStepScreen,
} from '../../../features/capability-onboarding/CapabilityOnboardingStepScreen';
import { CapabilityValueDoorScreen } from '../../../features/capability-onboarding/CapabilityValueDoorScreen';
import { getHouseholdSnapshot } from '../../../features/household/data/household';
import { CAPABILITY_ONBOARDING_PATHS } from '../../../features/capability-onboarding/capabilityOnboardingContracts';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney, type MoneySnapshot } from '../data/moneySnapshot';
import { getLivingPlanSettings, saveLivingPlanPromotionEnabled, saveLivingTargetIntent } from '../data/livingPlanRepository';
import {
  buildMoneyOnboardingTarget,
  getMoneyEntryDecision,
  getMoneyOnboardingInitialStep,
  getMoneyOnboardingCompletionDecision,
  type MoneyEntryMode,
  type MoneyEntrySource,
  type MoneyOnboardingCheckpoint,
  type MoneyOnboardingStep,
  type MoneyPlaceRouteName,
} from '../domain/moneyOnboarding';
import {
  buildMoneyOnboardingFollowThrough,
  type MoneyOnboardingFollowThrough,
} from '../domain/moneyOnboardingFollowThrough';
import type { MoneyOnboardingHandoffReceipt } from '../domain/moneyOnboardingHandoff';
import {
  buildMoneyOnboardingAssessment,
  buildMoneyOnboardingTargetGuidance,
  getAdditionalInstitutionDecision,
  getMoneyInstitutionCoverage,
  MONEY_ONBOARDING_DEMO_EVIDENCE,
  type MoneyOnboardingAssessment,
  type MoneyOnboardingCoverageConfidence,
  type MoneyOnboardingEvidenceSet,
  type MoneyOnboardingTargetGuidance,
  type MoneyPlanningIntent,
} from '../domain/moneyOnboardingAssessment';
import {
  getMoneyConnectionOnboardingPresentation,
  type MoneyConnectionOnboardingPhase,
} from '../domain/moneyConnectionOnboarding';
import { prepareMoneyPlaidLink } from '../native/moneyPlaidLink';
import type { MoneyPlaidLinkSession } from '../native/moneyPlaidLinkTypes';
import type { MoneyStackParamList } from '../navigation/types';
import { reconcileLivingPlan } from '../runtime/livingPlanReconciliation';
import { MoneyScreenFrame } from './MoneyScreenFrame';
import {
  completeMoneyOnboarding,
  loadMoneyOnboardingState,
  recordMoneyOnboardingHandoff,
  recordMoneyOnboardingIntroduction,
  recordMoneyOnboardingCheckpoint,
  recordMoneyOnboardingDecision,
} from '../runtime/moneyOnboardingStorage';

type SetupStep = MoneyOnboardingStep;

const MIN_LIVING_PERCENT = 50;
const MAX_LIVING_PERCENT = 100;
const LIVING_PERCENT_STEP = 5;
const MONEY_CONNECT_ILLUSTRATION = require('../../../../assets/illustrations/capability-onboarding/money-connect.png');
export type MoneyAnalysisPhase = 'accounts' | 'transfers' | 'commitments' | 'recommendation';
const MONEY_ANALYSIS_MESSAGES: Record<MoneyAnalysisPhase, string> = {
  accounts: 'Reading the accounts you chose',
  transfers: 'Separating transfers from everyday spending',
  commitments: 'Recognizing income and recurring commitments',
  recommendation: 'Building a monthly plan around your real rhythm',
};
export const MONEY_ANALYSIS_LOGO_DWELL_MS = 360;
export const MONEY_ANALYSIS_SPIN_MS = 1_200;
export type MoneyPlanBuildPhase = 'plan' | 'budgets' | 'goal' | 'todos';
const MONEY_PLAN_BUILD_MESSAGES: Record<MoneyPlanBuildPhase, string> = {
  plan: 'Saving your monthly plan',
  budgets: 'Building budgets around your real spending',
  goal: 'Creating your Spend Less goal',
  todos: 'Adding two practical first steps',
};
const MONEY_BUILD_PHASE_MINIMUM_MS = 650;

const MONEY_ONBOARDING_DOOR = CAPABILITY_ONBOARDING_PATHS.find(
  ({ id }) => id === 'budget-app-controls',
)!;

export function MoneySetupScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneySetup'>) {
  return (
    <MoneySetupExperience
      mode="setup"
      navigation={navigation}
      requestedPlace={route.params?.requestedPlace ?? 'MoneySummary'}
      source="direct"
      demoScenario={route.params?.demoScenario}
    />
  );
}

export function MoneySetupExperience({
  mode,
  navigation,
  requestedPlace,
  source,
  demoScenario,
}: {
  mode: MoneyEntryMode;
  navigation: NativeStackNavigationProp<MoneyStackParamList>;
  requestedPlace: MoneyPlaceRouteName;
  source: MoneyEntrySource;
  demoScenario?: 'connected-household';
}) {
  const insets = useSafeAreaInsets();
  const { reconcileConnectedActivity, refresh, snapshot, status } = useMoneyData();
  const entitlementIsPro = useEntitlementsStore((state) => state.isPro);
  const isProMember = demoScenario ? false : entitlementIsPro;
  const [step, setStep] = useState<SetupStep>(() => getMoneyOnboardingInitialStep(source, null));
  const [livingPercent, setLivingPercent] = useState(70);
  const [householdSize, setHouseholdSize] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionPhase, setConnectionPhase] = useState<MoneyConnectionOnboardingPhase>('unprepared');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedInstitutionName, setConnectedInstitutionName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<MoneyAnalysisPhase>('accounts');
  const [buildPhase, setBuildPhase] = useState<MoneyPlanBuildPhase>('plan');
  const [assessment, setAssessment] = useState<MoneyOnboardingAssessment | null>(null);
  const [coverageConfidence, setCoverageConfidence] = useState<MoneyOnboardingCoverageConfidence | null>(null);
  const [planningIntent, setPlanningIntent] = useState<MoneyPlanningIntent | null>(null);
  const [followThrough, setFollowThrough] = useState<MoneyOnboardingFollowThrough | null>(null);
  const [demoConnected, setDemoConnected] = useState(false);
  const [entryDecisionResolved, setEntryDecisionResolved] = useState(mode === 'setup');
  const entryResolved = useRef(false);
  const experienceMounted = useRef(true);
  const snapshotAccountCount = useRef(snapshot?.accounts.length ?? 0);
  const accountAutoAdvanceStarted = useRef(false);
  const analysisStartRequested = useRef(false);
  const connectionOpenStarted = useRef(false);
  const plaidSessionRef = useRef<MoneyPlaidLinkSession | null>(null);
  const plaidPreparationRef = useRef<Promise<MoneyPlaidLinkSession> | null>(null);

  snapshotAccountCount.current = snapshot?.accounts.length ?? 0;

  useEffect(() => () => {
    experienceMounted.current = false;
  }, []);

  useEffect(() => {
    const load = async () => {
      if (entryResolved.current || status === 'idle' || status === 'loading') return;
      entryResolved.current = true;
      if (__DEV__ && demoScenario) {
        setUserId('money-onboarding-demo');
        setHouseholdSize(MONEY_ONBOARDING_DEMO_EVIDENCE.householdSize);
        setStep('account');
        setEntryDecisionResolved(true);
        return;
      }
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error('Sign in to set up Money.');
        const [local, settings, household] = await Promise.all([
          loadMoneyOnboardingState(data.user.id),
          getLivingPlanSettings(client),
          getHouseholdSnapshot(client).catch(() => null),
        ]);
        if (!experienceMounted.current) return;
        setUserId(data.user.id);
        setLivingPercent(local.target?.livingPercent ?? settings.target?.livingPercent ?? 70);
        setHouseholdSize(household?.members.length ?? null);
        const resumedCoverage = local.coverageConfidence
          ?? (local.checkpoint === 'intent' || local.checkpoint === 'target' || local.checkpoint === 'assessment' ? 'partial' : null);
        const resumedIntent = local.planningIntent
          ?? (local.checkpoint === 'target' || local.checkpoint === 'assessment' ? 'recommend' : null);
        setCoverageConfidence(resumedCoverage);
        setPlanningIntent(resumedIntent);
        const decision = getMoneyEntryDecision({
          evidence: {
            localCompletedAt: local.completedAt,
            hasLivingTarget: Boolean(settings.target),
            hasActiveLivingPlan: Boolean(settings.active),
            hasLinkedAccount: snapshotAccountCount.current > 0,
          },
          introductionSeenAt: local.introductionSeenAt,
          checkpoint: local.checkpoint,
          requestedPlace,
          mode,
        });
        if (decision.kind === 'destination') {
          navigation.replace(decision.requestedPlace);
          return;
        }
        await recordMoneyOnboardingIntroduction(data.user.id, requestedPlace);
        const initialStep = getMoneyOnboardingInitialStep(source, local.checkpoint);
        if (initialStep === 'intent' || initialStep === 'target' || initialStep === 'assessment') {
          const recoveredAssessment = buildMoneyOnboardingAssessment(
            buildEvidenceFromSnapshot(snapshot, local.target?.livingPercent ?? settings.target?.livingPercent ?? 70, household?.members.length ?? null),
          );
          setAssessment(recoveredAssessment);
          if ((initialStep === 'target' || initialStep === 'assessment') && resumedCoverage && resumedIntent) {
            const guidance = buildMoneyOnboardingTargetGuidance(recoveredAssessment, resumedCoverage, resumedIntent);
            if (guidance) setLivingPercent(guidance.percent);
          }
        }
        setStep(initialStep);
        setEntryDecisionResolved(true);
      } catch (error) {
        if (!experienceMounted.current) return;
        if (mode === 'automatic') {
          navigation.replace(requestedPlace);
          return;
        }
        setMessage(error instanceof Error ? error.message : 'Money setup could not be loaded.');
      }
    };
    void load();
  }, [demoScenario, mode, navigation, requestedPlace, source, status]);

  const leaveSetup = () => {
    if (userId) void recordMoneyOnboardingCheckpoint(userId, requestedPlace, null);
    navigation.replace(requestedPlace);
  };

  const advanceTo = (next: MoneyOnboardingCheckpoint) => {
    setStep(next);
    if (userId && !demoScenario) void recordMoneyOnboardingCheckpoint(userId, requestedPlace, next);
  };

  const beginAnalysis = (confidence: MoneyOnboardingCoverageConfidence = 'partial') => {
    setCoverageConfidence(confidence);
    if (userId && !demoScenario) {
      void recordMoneyOnboardingDecision(userId, requestedPlace, { coverageConfidence: confidence });
    }
    analysisStartRequested.current = true;
    advanceTo('analyze');
  };

  const prepareConnection = useCallback(async () => {
    if (plaidSessionRef.current) return plaidSessionRef.current;
    if (plaidPreparationRef.current) return plaidPreparationRef.current;

    setConnectionError(null);
    setConnectionPhase('preparing');
    const preparation = prepareMoneyPlaidLink();
    plaidPreparationRef.current = preparation;
    try {
      const session = await preparation;
      plaidSessionRef.current = session;
      setConnectionPhase('ready');
      return session;
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'The secure account connection could not be prepared.');
      setConnectionPhase('error');
      throw error;
    } finally {
      plaidPreparationRef.current = null;
    }
  }, []);

  async function analyzeAccounts() {
    if (busy || !userId) return;
    setBusy(true);
    setMessage(null);
    advanceTo('analyze');
    try {
      if (__DEV__ && demoScenario) {
        for (const phase of ['accounts', 'transfers', 'commitments', 'recommendation'] as const) {
          setAnalysisPhase(phase);
          await delay(1_650);
        }
        const demoAssessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);
        setAssessment(demoAssessment);
        setLivingPercent(demoAssessment.recommendedLivingPercent ?? 70);
        advanceTo('intent');
        return;
      }
      setAnalysisPhase('accounts');
      await reconcileConnectedActivity({ trigger: 'manual_sync', sync: false });
      setAnalysisPhase('transfers');
      await refresh();
      setAnalysisPhase('commitments');
      setAnalysisPhase('recommendation');
      const liveAssessment = buildMoneyOnboardingAssessment(evidence);
      setAssessment(liveAssessment);
      setLivingPercent(liveAssessment.recommendedLivingPercent ?? 70);
      setMessage(null);
      advanceTo('intent');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kwilt could not finish building your budgets.');
        advanceTo('coverage');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step !== 'analyze' || !analysisStartRequested.current || busy || !userId) return;
    analysisStartRequested.current = false;
    void analyzeAccounts();
  }, [busy, step, userId]);

  useEffect(() => {
    if (demoScenario || step !== 'account' || !userId || snapshot?.accounts.length || connectionPhase !== 'unprepared') return;
    void prepareConnection().catch(() => undefined);
  }, [connectionPhase, demoScenario, prepareConnection, snapshot?.accounts.length, step, userId]);

  useEffect(() => {
    if (demoScenario || step !== 'account' || !userId || !snapshot?.accounts.length || accountAutoAdvanceStarted.current) return;
    accountAutoAdvanceStarted.current = true;
    beginAnalysis();
  }, [demoScenario, snapshot?.accounts.length, step, userId]);

  const connectAccount = async () => {
    if (!userId || connectionOpenStarted.current || connectionPhase === 'presented' || connectionPhase === 'exchanging') return;
    connectionOpenStarted.current = true;
    setConnectionError(null);
    try {
      if (__DEV__ && demoScenario) {
        setConnectionPhase('exchanging');
        await delay(900);
        setConnectedInstitutionName('Chase');
        setDemoConnected(true);
        setConnectionPhase('ready');
        connectionOpenStarted.current = false;
        beginAnalysis();
        return;
      }
      if (connectionPhase === 'cancelled' || connectionPhase === 'error') {
        plaidSessionRef.current = null;
        setConnectionPhase('unprepared');
      }
      const session = await prepareConnection();
      const result = await session.open({ onPhaseChange: setConnectionPhase });
      plaidSessionRef.current = null;
      if (result.status === 'cancelled') {
        connectionOpenStarted.current = false;
        setConnectionPhase('cancelled');
        return;
      }
      setConnectedInstitutionName(result.exchange.institutionName);
      await reconcileConnectedActivity({ trigger: 'account_connected', sync: false });
      await refresh();
      connectionOpenStarted.current = false;
      beginAnalysis();
    } catch (error) {
      connectionOpenStarted.current = false;
      plaidSessionRef.current = null;
      setConnectionError(error instanceof Error ? error.message : 'The account could not be connected.');
      setConnectionPhase('error');
    }
  };

  const evidence = useMemo<MoneyOnboardingEvidenceSet>(() => (
    __DEV__ && demoScenario && demoConnected
      ? MONEY_ONBOARDING_DEMO_EVIDENCE
      : buildEvidenceFromSnapshot(snapshot, livingPercent, householdSize)
  ), [demoConnected, demoScenario, householdSize, livingPercent, snapshot]);
  const institutions = useMemo(() => getMoneyInstitutionCoverage(evidence.accounts), [evidence.accounts]);
  const targetGuidance = useMemo(() => (
    assessment && coverageConfidence && planningIntent
      ? buildMoneyOnboardingTargetGuidance(assessment, coverageConfidence, planningIntent)
      : null
  ), [assessment, coverageConfidence, planningIntent]);

  const chooseCoverage = (choice: MoneyOnboardingCoverageConfidence) => {
    setCoverageConfidence(choice);
  };

  const continueFromCoverage = async () => {
    if (!coverageConfidence) return;
    beginAnalysis(coverageConfidence);
  };

  const choosePlanningIntent = (intent: MoneyPlanningIntent) => {
    if (!assessment || !coverageConfidence) return;
    const guidance = buildMoneyOnboardingTargetGuidance(assessment, coverageConfidence, intent);
    if (!guidance) {
      setMessage('Kwilt needs dependable income before it can suggest a monthly target.');
      return;
    }
    setPlanningIntent(intent);
    if (userId && !demoScenario) {
      void recordMoneyOnboardingDecision(userId, requestedPlace, { planningIntent: intent });
    }
    setLivingPercent(guidance.percent);
    advanceTo('target');
  };

  const exploreSpending = () => {
    if (userId && !demoScenario) void recordMoneyOnboardingCheckpoint(userId, requestedPlace, null);
    navigation.replace('MoneySummary', {
      ...(__DEV__ && demoScenario ? { devBudgetState: 'onboarding-sample' as const } : {}),
    });
  };

  const addInstitution = () => {
    if (getAdditionalInstitutionDecision(isProMember) === 'offer_pro') {
      openPaywallInterstitial({
        reason: 'pro_only_additional_financial_institution',
        source: 'money_onboarding_add_institution',
      });
      return;
    }
    connectionOpenStarted.current = false;
    plaidSessionRef.current = null;
    setConnectionPhase('unprepared');
    void connectAccount();
  };

  const acceptPlan = async () => {
    if (!userId || busy || !assessment || !coverageConfidence || !planningIntent) return;
    setBusy(true);
    setMessage(null);
    setStep('complete');
    const selectedPlanCents = Math.round((assessment.monthlyIncomeCents ?? 0) * livingPercent / 100);
    try {
      const acceptedTarget = buildMoneyOnboardingTarget(livingPercent, new Date().toISOString());
      if (__DEV__ && demoScenario) {
        await runBuildPhase(setBuildPhase, 'plan');
        await runBuildPhase(setBuildPhase, 'budgets');
      } else {
        const client = getSupabaseClient();
        await runBuildPhase(setBuildPhase, 'plan', async () => {
          await saveLivingPlanPromotionEnabled(client, true);
          await saveLivingTargetIntent(client, acceptedTarget);
        });
        const decision = await runBuildPhase(setBuildPhase, 'budgets', async () => (
          getMoneyOnboardingCompletionDecision(await reconcileLivingPlan(client, 'target_changed'), false)
        ));
        if (!decision?.complete) {
          setMessage(decision?.message ?? 'Kwilt needs fresh account activity before it can build trustworthy budgets.');
          setStep('target');
          return;
        }
      }

      let createdFollowThrough: MoneyOnboardingFollowThrough | null = null;
      if (planningIntent === 'reduce') {
        const nextFollowThrough = buildMoneyOnboardingFollowThrough({
          createdAtIso: new Date().toISOString(),
          evidenceScope: coverageConfidence === 'complete' ? 'household' : 'connected_accounts',
          observedMonthlySpendingCents: assessment.observedMonthlySpendingCents,
          selectedPlanCents,
        });
        createdFollowThrough = nextFollowThrough;
        setFollowThrough(nextFollowThrough);
        await runBuildPhase(setBuildPhase, 'goal', async () => {
          const store = useAppStore.getState();
          if (!store.goals.some(({ id }) => id === nextFollowThrough.goal.id)) {
            store.addGoal(nextFollowThrough.goal);
            store.dismissPostGoalPlanGuideForGoal(nextFollowThrough.goal.id);
          }
        });
        await runBuildPhase(setBuildPhase, 'todos', async () => {
          const store = useAppStore.getState();
          nextFollowThrough.activities.forEach((activity) => {
            if (!store.activities.some(({ id }) => id === activity.id)) store.addActivity(activity);
          });
        });
      }

      const handoff: MoneyOnboardingHandoffReceipt = {
        createdAtIso: new Date().toISOString(),
        selectedPlanCents,
        goalId: createdFollowThrough?.goal.id ?? null,
        goalTitle: createdFollowThrough?.goal.title ?? null,
        savingsCents: createdFollowThrough?.savingsCents ?? 0,
        todoCount: createdFollowThrough?.activities.length ?? 0,
      };
      await completeMoneyOnboarding(userId, acceptedTarget, { skippedAccountConnection: false });
      await recordMoneyOnboardingHandoff(userId, handoff);
      setFollowThrough(createdFollowThrough);
      navigation.replace('MoneySummary', {
        onboardingHandoff: handoff,
        ...(__DEV__ && demoScenario ? { devBudgetState: 'onboarding-sample' as const } : {}),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kwilt could not save this plan.');
      setStep('target');
    } finally {
      setBusy(false);
    }
  };

  if (!entryDecisionResolved) {
    return (
      <MoneyScreenFrame title={requestedPlace === 'MoneySummary' ? 'Budget' : requestedPlace === 'MoneyTransactions' ? 'Transactions' : 'Accounts'}>
        <View accessibilityLabel={`Opening ${requestedPlace === 'MoneySummary' ? 'Budget' : requestedPlace === 'MoneyTransactions' ? 'Transactions' : 'Accounts'}`} style={styles.entryResolution}>
          <KwiltLoader color={colors.accent} size="small" />
        </View>
      </MoneyScreenFrame>
    );
  }

  if (step === 'welcome') {
    return (
      <MoneySetupIntroduction
        onNotNow={leaveSetup}
        onStart={() => advanceTo('account')}
      />
    );
  }

  if (step === 'account') {
    const connectionPresentation = getMoneyConnectionOnboardingPresentation(connectionPhase, connectionError);
    const connectionInFlight = connectionPhase === 'presented' || connectionPhase === 'exchanging';
    return (
      <MoneySetupStepInterstitial
        action={connectionPresentation.actionLabel ? (
          <Button
            disabled={!userId || connectionPhase === 'preparing'}
            fullWidth
            loading={connectionPhase === 'preparing'}
            loadingLabel={connectionPresentation.loadingActionLabel ?? undefined}
            onPress={() => void connectAccount()}
            size="lg"
            variant="primary"
          >
            {connectionPresentation.actionLabel}
          </Button>
        ) : undefined}
        currentStep={2}
        onNotNow={leaveSetup}
        title={connectionPhase === 'unprepared' || connectionPhase === 'ready' ? 'Connect your first institution' : connectionPresentation.title}
        visual={<MoneySetupIllustration accessibilityLabel="Securely connecting a financial account" source={MONEY_CONNECT_ILLUSTRATION} />}
      >
        {connectionInFlight ? <KwiltLoader accessibilityLabel="Finishing account connection" accessible phase="loading" size="small" /> : null}
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole={connectionPhase === 'error' ? 'alert' : undefined}
          style={styles.setupBodyCopy}
          tone="secondary"
        >
          {connectionPresentation.body}
        </Text>
      </MoneySetupStepInterstitial>
    );
  }

  if (step === 'coverage') {
    const primaryInstitution = institutions[0];
    return (
      <View style={styles.resultRoot} testID="moneyOnboarding.coverage">
        <View style={[styles.resultChrome, { paddingTop: insets.top + spacing.lg }]}>
          <Logo size={22} />
          <Text accessibilityLabel="Money setup step 3 of 4" style={styles.resultStepCounter} tone="secondary" variant="label">3 of 4</Text>
          <IconButton accessibilityLabel="Close Money setup" onPress={leaveSetup} variant="ghost">
            <Icon color={colors.textPrimary} name="close" size={20} />
          </IconButton>
        </View>
        <ScrollView contentContainerStyle={[styles.coverageContent, { paddingBottom: insets.bottom + 150 }]}>
          <Heading variant="xl" style={styles.resultTitle}>
            {primaryInstitution ? `We found ${primaryInstitution.accountCount} accounts at ${primaryInstitution.institutionName}` : 'Choose what Kwilt should include'}
          </Heading>
          <Text style={styles.coverageIntro} tone="secondary">Kwilt will only use these accounts. You can add more later.</Text>
          <View style={styles.accountList}>
            {evidence.accounts.map((account) => (
              <View key={account.id} style={styles.accountRow}>
                <Text style={styles.accountName}>{account.name}{account.mask ? `  •••• ${account.mask}` : ''}</Text>
                <Text style={styles.includedLabel}>Included</Text>
              </View>
            ))}
          </View>
          <Heading variant="lg" style={styles.coverageQuestion}>Is anything important missing?</Heading>
          <View accessibilityRole="radiogroup" style={styles.coverageChoices}>
            <MoneyDecisionRow
              description="Use these as the household view."
              label="No—use these accounts"
              onPress={() => chooseCoverage('complete')}
              selected={coverageConfidence === 'complete'}
            />
            <MoneyDecisionRow
              description="Base this plan only on these accounts."
              label="Continue with these for now"
              onPress={() => chooseCoverage('partial')}
              selected={coverageConfidence === 'partial'}
            />
          </View>
          <MoneyDecisionRow
            description={isProMember ? 'Add another before Kwilt analyzes.' : 'Add another with Kwilt Pro.'}
            label="Yes—connect another institution"
            onPress={addInstitution}
            role="button"
          />
          {message ? <Text accessibilityRole="alert" style={styles.message} tone="secondary">{message}</Text> : null}
        </ScrollView>
        <FullWidthActionDock dockTestID="moneyOnboarding.coverage.actionDock">
          <Button disabled={!evidence.accounts.length || !coverageConfidence} fullWidth onPress={() => void continueFromCoverage()} size="lg" variant="primary">
            Analyze these accounts
          </Button>
        </FullWidthActionDock>
      </View>
    );
  }

  if (step === 'analyze') {
    return <MoneyFocusedAnalysis phase={analysisPhase} />;
  }

  if (step === 'complete') {
    return <MoneyFocusedPlanBuild followThrough={followThrough} phase={buildPhase} />;
  }

  if (step === 'intent' && assessment && coverageConfidence) {
    return (
      <MoneyPlanningIntentScreen
        assessment={assessment}
        coverageConfidence={coverageConfidence}
        onAddInstitution={addInstitution}
        onChoose={choosePlanningIntent}
        onClose={leaveSetup}
        onExploreSpending={exploreSpending}
      />
    );
  }

  if ((step === 'target' || step === 'assessment') && assessment && coverageConfidence && planningIntent && targetGuidance) {
    return (
      <MoneyTargetScreen
        assessment={assessment}
        busy={busy}
        coverageConfidence={coverageConfidence}
        guidance={targetGuidance}
        message={message}
        onAccept={() => void acceptPlan()}
        onChangeGoal={() => advanceTo('intent')}
        onClose={leaveSetup}
        onLivingPercentChange={setLivingPercent}
        planningIntent={planningIntent}
        selectedLivingPercent={livingPercent}
      />
    );
  }

  return <MoneyFocusedAnalysis phase={analysisPhase} />;
}

export function MoneySetupIntroduction({ onNotNow, onStart }: { onNotNow: () => void; onStart: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.introductionRoot}>
      <FullScreenInterstitial backgroundColor="parchment" contentStyle={styles.introductionHost} progression="button" visible withinModal>
        <View style={styles.introductionViewport}>
          <View style={[styles.introductionChrome, { top: insets.top + spacing.lg }]}>
            <Logo size={22} />
            <Button accessibilityLabel="Leave Money setup for now" onPress={onNotNow} size="inline" variant="link">Not now</Button>
          </View>
          <CapabilityValueDoorScreen bottomAccessoryHeight={spacing.lg} door={MONEY_ONBOARDING_DOOR} onStart={onStart} />
        </View>
      </FullScreenInterstitial>
    </View>
  );
}

export function MoneySetupStepInterstitial({
  action,
  children,
  currentStep,
  onNotNow,
  title,
  visual,
}: {
  action?: ReactNode;
  children: ReactNode;
  currentStep?: 2 | 3 | 4;
  onNotNow?: () => void;
  title: string;
  visual: ReactNode;
}) {
  return (
    <CapabilityOnboardingStepScreen
      action={action}
      closeAccessibilityLabel="Close Money setup"
      currentStep={currentStep}
      illustration={visual}
      onClose={onNotNow}
      progressAccessibilityLabel={currentStep ? `Money setup step ${currentStep} of 4` : undefined}
      title={title}
      totalSteps={4}
    >
      {children}
    </CapabilityOnboardingStepScreen>
  );
}

export function MoneyLivingTargetSlider({
  value,
  onChange,
  recommendedValue,
  recommendationLabel = 'recommended',
  referenceLabel,
  referenceValue,
  showCurrentLabel = true,
}: {
  value: number;
  onChange: (value: number) => void;
  recommendedValue?: number;
  recommendationLabel?: string;
  referenceLabel?: string;
  referenceValue?: number;
  showCurrentLabel?: boolean;
}) {
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const trackRef = useRef<View>(null);
  const sliderProgress = (value - MIN_LIVING_PERCENT) / (MAX_LIVING_PERCENT - MIN_LIVING_PERCENT);
  const animatedProgress = useRef(new Animated.Value(sliderProgress)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animatedProgress, { toValue: sliderProgress, speed: 28, bounciness: 0, useNativeDriver: false }).start();
  }, [animatedProgress, sliderProgress]);

  const animateThumb = (toValue: number) => {
    Animated.spring(thumbScale, { toValue, speed: 32, bounciness: 6, useNativeDriver: false }).start();
  };
  const updateFromGesture = (event: GestureResponderEvent) => {
    const trackWidth = trackWidthRef.current;
    if (trackWidth <= 0) return;
    const gestureX = trackPageXRef.current > 0
      ? event.nativeEvent.pageX - trackPageXRef.current
      : event.nativeEvent.locationX;
    const locationX = Math.max(0, Math.min(trackWidth, gestureX));
    const rawValue = MIN_LIVING_PERCENT + (locationX / trackWidth) * (MAX_LIVING_PERCENT - MIN_LIVING_PERCENT);
    onChange(clampLivingPercent(rawValue));
  };
  const measureTrack = () => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      trackWidthRef.current = width;
      trackPageXRef.current = pageX;
    });
  };
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (event) => {
        animateThumb(1.18);
        measureTrack();
        updateFromGesture(event);
      },
      onPanResponderMove: updateFromGesture,
      onPanResponderRelease: () => animateThumb(1),
      onPanResponderTerminate: () => animateThumb(1),
    }),
  ).current;
  const animatedWidth = animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const animatedLeft = animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const sliderPercent = sliderProgress * 100;
  const recommendedPercent = recommendedValue == null
    ? null
    : ((recommendedValue - MIN_LIVING_PERCENT) / (MAX_LIVING_PERCENT - MIN_LIVING_PERCENT)) * 100;
  const referencePercent = referenceValue == null
    ? null
    : ((referenceValue - MIN_LIVING_PERCENT) / (MAX_LIVING_PERCENT - MIN_LIVING_PERCENT)) * 100;

  return (
    <View style={styles.sliderBlock}>
      <View
        accessible
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityHint="Swipe up or down to adjust in five percent increments"
        accessibilityLabel="Monthly living target"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: MIN_LIVING_PERCENT, max: MAX_LIVING_PERCENT, now: value, text: `${value}%` }}
        hitSlop={8}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onChange(clampLivingPercent(value + LIVING_PERCENT_STEP));
          if (event.nativeEvent.actionName === 'decrement') onChange(clampLivingPercent(value - LIVING_PERCENT_STEP));
        }}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
          measureTrack();
        }}
        style={styles.sliderTouchArea}
        {...panResponder.panHandlers}
      >
        <View ref={trackRef} style={styles.sliderTrack}>
          <Animated.View style={[styles.sliderFill, { width: animatedWidth }]} />
          {recommendedPercent != null ? (
            <View accessibilityLabel={`${recommendedValue}% ${recommendationLabel}`} style={[styles.recommendedMarker, { left: `${recommendedPercent}%` }]} />
          ) : null}
          {referencePercent != null && referenceLabel ? (
            <View
              accessibilityLabel={referenceLabel}
              style={[styles.referenceMarker, { left: `${Math.max(0, Math.min(100, referencePercent))}%` }]}
            >
              <Text style={styles.referenceMarkerLabel}>{referenceLabel}</Text>
            </View>
          ) : null}
          <Animated.View style={[styles.sliderThumb, { left: animatedLeft, transform: [{ scale: thumbScale }] }]} />
        </View>
      </View>
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderLabel, styles.sliderLabelMinimum]}>{MIN_LIVING_PERCENT}%</Text>
        {showCurrentLabel && value > MIN_LIVING_PERCENT && value < MAX_LIVING_PERCENT ? (
          <Text style={[styles.sliderLabel, styles.sliderLabelCurrent, { left: `${sliderPercent}%` }]}>{value}%</Text>
        ) : null}
        <Text style={[styles.sliderLabel, styles.sliderLabelMaximum]}>{MAX_LIVING_PERCENT}%</Text>
      </View>
    </View>
  );
}

export function MoneyAnalysisStatus({ phase }: { phase: MoneyAnalysisPhase }) {
  return (
    <MoneyProcessingStatus
      accessibilityLabel="Analyzing your money"
      message={MONEY_ANALYSIS_MESSAGES[phase]}
      resetKey={phase}
    />
  );
}

export function MoneyPlanBuildStatus({
  followThrough,
  phase,
}: {
  followThrough?: MoneyOnboardingFollowThrough | null;
  phase: MoneyPlanBuildPhase;
}) {
  const message = phase === 'goal' && followThrough?.savingsCents
    ? `Creating your goal to spend ${formatMoney(followThrough.savingsCents)} less each month`
    : MONEY_PLAN_BUILD_MESSAGES[phase];
  return (
    <MoneyProcessingStatus
      accessibilityLabel="Building your Money plan"
      message={message}
      resetKey={phase}
    />
  );
}

function MoneyProcessingStatus({
  accessibilityLabel,
  message,
  resetKey,
}: {
  accessibilityLabel: string;
  message: string;
  resetKey: string;
}) {
  const [loaderPhase, setLoaderPhase] = useState<KwiltLoaderPhase>('idle');

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    setLoaderPhase('idle');
    const runCycle = () => timers.push(setTimeout(() => {
      setLoaderPhase('loading');
      timers.push(setTimeout(() => {
        setLoaderPhase('completing');
        timers.push(setTimeout(() => {
          setLoaderPhase('idle');
          runCycle();
        }, KWILT_REFRESH_COMPLETION_MS));
      }, MONEY_ANALYSIS_SPIN_MS));
    }, MONEY_ANALYSIS_LOGO_DWELL_MS));
    runCycle();

    return () => timers.forEach(clearTimeout);
  }, [resetKey]);

  return (
    <View accessibilityLiveRegion="polite" style={styles.analysisStatus}>
      <KwiltLoader accessibilityLabel={accessibilityLabel} accessible phase={loaderPhase} resolvedOpacity={1} size={64} />
      <Heading variant="xl" style={styles.analysisMessage}>{message}</Heading>
    </View>
  );
}

export function MoneyFocusedAnalysis({ phase }: { phase: MoneyAnalysisPhase }) {
  return (
    <View style={styles.focusedRoot} testID="moneyOnboarding.analysis">
      <FullScreenInterstitial backgroundColor="parchment" contentStyle={styles.focusedContent} progression="button" visible withinModal>
        <MoneyAnalysisStatus phase={phase} />
      </FullScreenInterstitial>
    </View>
  );
}

export function MoneyFocusedPlanBuild({
  followThrough = null,
  phase,
}: {
  followThrough?: MoneyOnboardingFollowThrough | null;
  phase: MoneyPlanBuildPhase;
}) {
  return (
    <View style={styles.focusedRoot} testID="moneyOnboarding.build">
      <FullScreenInterstitial backgroundColor="parchment" contentStyle={styles.focusedContent} progression="button" visible withinModal>
        <MoneyPlanBuildStatus followThrough={followThrough} phase={phase} />
      </FullScreenInterstitial>
    </View>
  );
}

export function MoneyPlanningIntentScreen({
  assessment,
  onAddInstitution,
  onChoose,
  onClose,
  onExploreSpending,
}: {
  assessment: MoneyOnboardingAssessment;
  coverageConfidence: MoneyOnboardingCoverageConfidence;
  onAddInstitution: () => void;
  onChoose: (intent: MoneyPlanningIntent) => void;
  onClose: () => void;
  onExploreSpending: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [accountScope, coverageScope] = assessment.evidenceLabel.split(' · ');
  const connectedAccountScope = accountScope.replace(/^(\d+)\s+/, '$1 connected ');
  return (
    <View style={styles.resultRoot} testID="moneyOnboarding.intent">
      <View style={[styles.resultChrome, { paddingTop: insets.top + spacing.lg }]}>
        <Logo size={22} />
        <IconButton accessibilityLabel="Close Money setup" onPress={onClose} variant="ghost">
          <Icon color={colors.textPrimary} name="close" size={20} />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={[styles.goalContent, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.spendingReceipt}>
          <Text style={styles.spendingReceiptEyebrow} variant="bodySm">YOUR RECENT SPENDING</Text>
          <Heading variant="xl" style={styles.recentPaceAmount}>
            {assessment.observedMonthlySpendingCents == null ? '—' : `${formatMoney(assessment.observedMonthlySpendingCents)} a month`}
          </Heading>
          <Text tone="secondary" style={styles.recentPaceLabel} variant="bodySm">
            {coverageScope
              ? `Average from ${coverageScope} across ${connectedAccountScope}`
              : `Average across ${connectedAccountScope}`}
          </Text>
        </View>
        <Heading variant="lg" style={styles.intentQuestion}>
          Now that we have a picture of your spending, which of these would you like to prioritize?
        </Heading>
        <View style={styles.goalChoices}>
          <MoneyGoalChoice
            description="See your spending broken down by category."
            icon="viewList"
            label="See where your money is going"
            onPress={onExploreSpending}
          />
          <MoneyGoalChoice
            description="See realistic changes and how much they could save."
            icon="trendDown"
            label="Find ways to save money"
            onPress={() => onChoose('reduce')}
          />
          <MoneyGoalChoice
            description="Start with suggested categories and monthly amounts."
            icon="sparkles"
            label="Get a suggested budget"
            onPress={() => onChoose('recommend')}
          />
        </View>
        <View style={styles.accountScopeFooter}>
          <Button accessibilityLabel="Connect more accounts" onPress={onAddInstitution} size="inline" variant="ghost">
            Connect more accounts
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

export function MoneyTargetScreen({
  assessment,
  busy,
  coverageConfidence,
  message,
  onAccept,
  onChangeGoal,
  onClose,
  onLivingPercentChange,
  planningIntent,
  selectedLivingPercent,
}: {
  assessment: MoneyOnboardingAssessment;
  busy: boolean;
  coverageConfidence: MoneyOnboardingCoverageConfidence;
  guidance: MoneyOnboardingTargetGuidance;
  message: string | null;
  onAccept: () => void;
  onChangeGoal: () => void;
  onClose: () => void;
  onLivingPercentChange: (value: number) => void;
  planningIntent: MoneyPlanningIntent;
  selectedLivingPercent: number;
}) {
  const insets = useSafeAreaInsets();
  const [showExplanation, setShowExplanation] = useState(false);
  const monthlyIncomeCents = assessment.monthlyIncomeCents ?? 0;
  const selectedPlanCents = Math.round(monthlyIncomeCents * selectedLivingPercent / 100);
  const outsidePlanCents = Math.max(0, monthlyIncomeCents - selectedPlanCents);
  const selectedFlexibleCents = assessment.committedPlanCents == null
    ? null
    : Math.max(0, selectedPlanCents - assessment.committedPlanCents);
  const difference = assessment.observedMonthlySpendingCents == null
    ? null
    : selectedPlanCents - assessment.observedMonthlySpendingCents;
  const observedPercent = assessment.observedMonthlySpendingCents == null || monthlyIncomeCents <= 0
    ? undefined
    : assessment.observedMonthlySpendingCents / monthlyIncomeCents * 100;
  const goalLabel = planningIntent === 'reduce'
    ? 'Save money'
    : planningIntent === 'current'
      ? 'Stay near this pace'
      : 'Suggested budget';
  const goalIcon: IconName = planningIntent === 'reduce'
    ? 'trendDown'
    : planningIntent === 'current'
      ? 'gauge'
      : 'sparkles';
  const targetHeading = planningIntent === 'reduce' && difference != null && difference < 0
    ? 'A realistic first step'
    : planningIntent === 'current'
      ? 'Stay near your recent pace'
      : planningIntent === 'recommend'
        ? 'Kwilt’s starting point'
        : 'Choose your monthly target';
  const buildActionLabel = `Build a ${formatMoney(selectedPlanCents)} plan`;
  const scopeSuffix = coverageConfidence === 'partial' ? ' in these accounts' : '';

  return (
    <View style={styles.resultRoot} testID="moneyOnboarding.target">
      <View style={[styles.resultChrome, { paddingTop: insets.top + spacing.lg }]}>
        <Logo size={22} />
        <IconButton accessibilityLabel="Close Money setup" onPress={onClose} variant="ghost">
          <Icon color={colors.textPrimary} name="close" size={20} />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={[styles.targetContent, { paddingBottom: insets.bottom + 150 }]}>
        <View style={styles.goalContextRow}>
          <View style={styles.goalContextIdentity}>
            <Icon color={colors.textPrimary} name={goalIcon} size={20} />
            <Heading variant="md" style={styles.goalContextLabel}>{goalLabel}</Heading>
          </View>
          <Button accessibilityLabel="Change planning goal" onPress={onChangeGoal} size="sm" variant="outline">Change</Button>
        </View>
        <Heading variant="xl" style={styles.resultTitle}>{targetHeading}</Heading>
        <View style={styles.planAmountHero}>
          <Heading style={styles.planAmount}>{formatMoney(selectedPlanCents)}</Heading>
          <Text tone="secondary" style={styles.planAmountCadence}>per month</Text>
          {assessment.committedPlanCents != null && selectedFlexibleCents != null ? (
            <Text tone="secondary" style={styles.planComposition}>
              {formatMoney(assessment.committedPlanCents)} committed · {formatMoney(selectedFlexibleCents)} flexible
            </Text>
          ) : null}
        </View>
        <View style={styles.targetControl}>
          <MoneyLivingTargetSlider
            onChange={onLivingPercentChange}
            referenceLabel={assessment.observedMonthlySpendingCents == null ? undefined : `Recent ${formatMoney(assessment.observedMonthlySpendingCents)}`}
            referenceValue={observedPercent}
            showCurrentLabel={false}
            value={selectedLivingPercent}
          />
        </View>
        {difference == null ? null : (
          <Text style={styles.targetConsequence}>{formatSpendingDifference(difference, scopeSuffix)}</Text>
        )}
        {planningIntent === 'reduce' ? (
          <Text style={styles.followThroughDisclosure} tone="secondary" variant="bodySm">
            Kwilt will build your budgets and turn this into a goal with two first steps.
          </Text>
        ) : null}
        <Button
          accessibilityState={{ expanded: showExplanation }}
          onPress={() => setShowExplanation((visible) => !visible)}
          size="inline"
          variant="ghost"
        >
          {showExplanation ? 'Hide details' : 'How we got this'}
        </Button>
        {showExplanation ? (
          <Text tone="secondary" variant="bodySm" style={styles.targetExplanation}>
            {selectedLivingPercent}% of {formatMoney(monthlyIncomeCents)} dependable income · {formatMoney(outsidePlanCents)} remains outside the plan
          </Text>
        ) : null}
        {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
      </ScrollView>
      <FullWidthActionDock dockTestID="moneyOnboarding.target.actionDock">
        <Button fullWidth loading={busy} onPress={onAccept} size="lg" variant="primary">{buildActionLabel}</Button>
      </FullWidthActionDock>
    </View>
  );
}

function MoneyGoalChoice({
  description,
  icon,
  label,
  onPress,
}: {
  description: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.goalChoiceCard, pressed ? styles.goalChoiceCardPressed : null]}
    >
      <View style={styles.goalChoiceIcon}>
        <Icon color={colors.textPrimary} name={icon} size={22} />
      </View>
      <View style={styles.goalChoiceCopy}>
        <Text style={styles.goalChoiceLabel}>{label}</Text>
        <Text tone="secondary" variant="bodySm">{description}</Text>
      </View>
      <Icon color={colors.textSecondary} name="arrowRight" size={17} />
    </Pressable>
  );
}

function MoneyDecisionRow({
  description,
  label,
  onPress,
  role = 'radio',
  selected = false,
}: {
  description: string;
  label: string;
  onPress: () => void;
  role?: 'button' | 'radio';
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.decisionRow,
        selected ? styles.decisionRowSelected : null,
        pressed ? styles.decisionRowPressed : null,
      ]}
    >
      <View style={styles.decisionRowCopy}>
        <Text style={styles.decisionRowLabel}>{label}</Text>
        <Text tone="secondary" variant="bodySm">{description}</Text>
      </View>
      {selected ? <Icon color={colors.accent} name="check" size={20} /> : null} {/* @kwilt-brand-moment: green confirms the person’s one active planning decision. */}
    </Pressable>
  );
}

function formatSpendingDifference(differenceCents: number, scopeSuffix: string): string {
  if (differenceCents === 0) return `Matches your recent pace${scopeSuffix}`;
  return `${formatMoney(Math.abs(differenceCents))} ${differenceCents < 0 ? 'below' : 'above'} your recent pace${scopeSuffix}`;
}


function MoneySetupIllustration({ accessibilityLabel, source }: { accessibilityLabel: string; source: number }) {
  return (
    <Image accessibilityLabel={accessibilityLabel} accessibilityRole="image" resizeMode="contain" source={source} style={styles.illustration} />
  );
}

function buildEvidenceFromSnapshot(snapshot: MoneySnapshot | null, livingPercent: number, householdSize: number | null): MoneyOnboardingEvidenceSet {
  const accounts = (snapshot?.accounts ?? []).map((account) => ({
    id: account.id,
    institutionName: account.institutionName || 'Connected institution',
    name: account.name,
    mask: account.mask,
  }));
  const dates = (snapshot?.transactions ?? []).map((transaction) => transaction.date).filter(Boolean).sort();
  const incomeByMonth = new Map<string, number>();
  (snapshot?.transactions ?? []).forEach((transaction) => {
    const isIncome = transaction.direction === 'inflow'
      && (transaction.moneyMeaning === 'income' || transaction.categoryName.toLowerCase() === 'income');
    if (!isIncome) return;
    const month = transaction.date.slice(0, 7);
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + transaction.amountCents);
  });
  const detectedIncome = incomeByMonth.size
    ? Math.round([...incomeByMonth.values()].reduce((sum, value) => sum + value, 0) / incomeByMonth.size)
    : null;
  const income = snapshot?.monthlyPlan?.regularPlanCents
    ? Math.round(snapshot.monthlyPlan.regularPlanCents / Math.max(0.01, livingPercent / 100))
    : snapshot?.livingLimitAnswer?.facts.resourceBasisCents ?? detectedIncome;
  const detectedCommitted = (snapshot?.categories ?? [])
    .filter((category) => category.planRole === 'protected')
    .reduce((sum, category) => sum + Math.max(0, category.plannedCents), 0) || null;
  return {
    accounts,
    coverageLabel: formatCoverageLabel(dates),
    dependableMonthlyIncomeCents: income,
    committedMonthlyCents: snapshot?.monthlyPlan?.committedPlanCents ?? detectedCommitted,
    typicalFlexibleMonthlyCents: snapshot?.monthlyPlan?.flexiblePlanCents ?? null,
    householdSize,
  };
}

function formatCoverageLabel(sortedDates: string[]): string {
  if (!sortedDates.length) return 'Connected activity';
  const format = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const first = format(sortedDates[0]);
  const last = format(sortedDates[sortedDates.length - 1]);
  return first === last ? first : `${first}–${last}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function runBuildPhase<T>(
  setPhase: (phase: MoneyPlanBuildPhase) => void,
  phase: MoneyPlanBuildPhase,
  work?: () => Promise<T> | T,
): Promise<T | undefined> {
  setPhase(phase);
  const startedAt = Date.now();
  const result = await work?.();
  const remainingMs = MONEY_BUILD_PHASE_MINIMUM_MS - (Date.now() - startedAt);
  if (remainingMs > 0) await delay(remainingMs);
  return result;
}

function clampLivingPercent(value: number) {
  if (!Number.isFinite(value)) return MIN_LIVING_PERCENT;
  return Math.max(MIN_LIVING_PERCENT, Math.min(MAX_LIVING_PERCENT, Math.round(value / LIVING_PERCENT_STEP) * LIVING_PERCENT_STEP));
}

const styles = StyleSheet.create({
  entryResolution: { alignItems: 'center', justifyContent: 'center', minHeight: 240 },
  introductionRoot: { flex: 1, backgroundColor: colors.parchment },
  introductionHost: { paddingHorizontal: 0, paddingVertical: 0 },
  introductionViewport: { flex: 1, overflow: 'hidden', backgroundColor: colors.parchment },
  introductionChrome: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  illustration: {
    width: CAPABILITY_ONBOARDING_STEP_GEOMETRY.illustrationSize,
    height: CAPABILITY_ONBOARDING_STEP_GEOMETRY.illustrationSize,
  },
  setupBodyCopy: { textAlign: 'center' },
  targetDecision: { gap: spacing.xs, width: '100%' },
  targetValue: { textAlign: 'center' },
  sliderBlock: { gap: 2 },
  sliderTouchArea: { justifyContent: 'center', minHeight: 32 },
  sliderTrack: { backgroundColor: colors.border, borderRadius: 999, height: 6, justifyContent: 'center' },
  sliderFill: { backgroundColor: colors.sumi900, borderRadius: 999, height: 6 },
  recommendedMarker: {
    backgroundColor: colors.accent, // @kwilt-brand-moment: a single green tick marks Kwilt's evidence-backed recommendation.
    borderRadius: 2,
    height: 18,
    marginLeft: -1,
    position: 'absolute',
    width: 2,
  },
  referenceMarker: {
    backgroundColor: colors.textSecondary,
    height: 34,
    marginLeft: -0.5,
    position: 'absolute',
    top: -22,
    width: 1,
  },
  referenceMarkerLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    left: -42,
    position: 'absolute',
    textAlign: 'center',
    top: -14,
    width: 84,
  },
  sliderThumb: {
    backgroundColor: colors.canvas,
    borderColor: colors.sumi900,
    borderRadius: 999,
    borderWidth: 2,
    elevation: 3,
    height: 24,
    marginLeft: -12,
    position: 'absolute',
    shadowColor: colors.sumi900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: 24,
  },
  sliderLabels: { height: 24, position: 'relative' },
  sliderLabel: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '700' },
  sliderLabelMinimum: { left: 0, position: 'absolute' },
  sliderLabelCurrent: { marginLeft: -24, position: 'absolute', textAlign: 'center', width: 48 },
  sliderLabelMaximum: { position: 'absolute', right: 0 },
  analysisStatus: { minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  analysisMessage: { fontSize: 28, lineHeight: 34, maxWidth: 340, textAlign: 'center' },
  message: { textAlign: 'center', paddingHorizontal: spacing.md },
  accountList: { gap: spacing.sm, width: '100%' },
  accountRow: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accountRowCopy: { flex: 1, gap: 2 },
  accountName: { flex: 1, fontWeight: '700' },
  includedLabel: { color: colors.textSecondary, fontWeight: '700' },
  coverageChoices: { gap: spacing.sm, width: '100%' },
  coverageContent: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'] },
  coverageIntro: { marginTop: -spacing.sm, textAlign: 'center' },
  coverageQuestion: { paddingTop: spacing.sm, textAlign: 'center' },
  coverageScopeNote: { paddingHorizontal: spacing.xs, textAlign: 'center' },
  focusedRoot: { flex: 1, backgroundColor: colors.parchment },
  focusedContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  resultRoot: { flex: 1, backgroundColor: colors.parchment },
  resultChrome: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  resultStepCounter: { left: 72, position: 'absolute', right: 72, textAlign: 'center' },
  resultContent: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  resultTitle: { maxWidth: 350, textAlign: 'center' },
  resultEvidence: { textAlign: 'center' },
  goalContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  spendingReceipt: {
    backgroundColor: colors.sumi50,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  spendingReceiptEyebrow: { color: colors.textSecondary, fontWeight: '800', letterSpacing: 0.8 },
  recentPaceAmount: { fontSize: 38, lineHeight: 44, marginTop: spacing.xs },
  recentPaceLabel: { marginTop: spacing.xs },
  intentQuestion: { marginTop: spacing.xl, maxWidth: 390 },
  goalChoices: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  goalChoiceCard: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radii.compactCard,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
  },
  goalChoiceCardPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  goalChoiceIcon: {
    alignItems: 'center',
    backgroundColor: colors.sumi50,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  goalChoiceCopy: { flex: 1, gap: 2 },
  goalChoiceLabel: { fontSize: 16, fontWeight: '700' },
  accountScopeFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  intentChoices: { gap: spacing.sm, width: '100%' },
  proofRow: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  decisionRow: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
  },
  decisionRowSelected: { backgroundColor: colors.pine50, borderColor: colors.accent, borderWidth: 2 }, // @kwilt-brand-moment: the selected decision is the one green interaction state.
  decisionRowPressed: { opacity: 0.86 },
  decisionRowCopy: { flex: 1, gap: spacing.xs },
  decisionRowLabel: { ...typography.bodyBold },
  targetContent: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  goalContextRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  goalContextIdentity: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  goalContextLabel: { color: colors.textPrimary },
  planAmountHero: { alignItems: 'center', marginTop: spacing['3xl'] },
  planAmount: { fontSize: 64, lineHeight: 68, textAlign: 'center' },
  planAmountCadence: { marginTop: spacing.xs, textAlign: 'center' },
  planComposition: { marginTop: spacing.md, textAlign: 'center' },
  targetConsequence: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: spacing.xl, textAlign: 'center' },
  targetExplanation: { marginTop: spacing.sm, maxWidth: 340, textAlign: 'center' },
  followThroughDisclosure: { marginTop: spacing.md, maxWidth: 340, textAlign: 'center' },
  targetSupport: { maxWidth: 350, textAlign: 'center' },
  linkedTargetHero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, width: '100%' },
  targetPercent: { fontSize: 54, lineHeight: 60, textAlign: 'center' },
  targetDollar: { textAlign: 'center' },
  guidanceLabel: { color: colors.accent, fontWeight: '700', textAlign: 'center' }, // @kwilt-brand-moment: green distinguishes Kwilt's evidence scope from user-entered amounts.
  targetFacts: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  targetFactRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 40 },
  targetFactText: { flex: 1 },
  recommendationReason: { marginTop: -spacing.md, textAlign: 'center' },
  recommendationHero: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    width: '100%',
  },
  recommendationLabel: { fontWeight: '700', textAlign: 'center' },
  recommendationAmount: { color: colors.textPrimary, textAlign: 'center' },
  targetControl: { marginTop: spacing['3xl'], width: '100%' },
  targetHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  recommendedTag: { color: colors.accent, fontWeight: '800' }, // @kwilt-brand-moment: recommendation is the one branded signal in the decision.
  targetMeaningRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  targetMeaningRight: { maxWidth: '48%', textAlign: 'right' },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  breakdownDivider: { backgroundColor: colors.border, height: 48, width: 1 },
  metric: { alignItems: 'center', flex: 1, gap: 2 },
  outsidePlanRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    width: '100%',
  },
  outsidePlanValue: { fontWeight: '800' },
});

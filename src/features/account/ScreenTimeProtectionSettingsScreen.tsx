import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { HStack, Text, VStack } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import {
  getScreenTimeAuthorizationStatus,
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '../../services/appleEcosystem/screenTimeProtection';
import {
  getScreenTimeSetupDefaults,
  getScreenTimeSetupRecoveryStep,
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeSetupIntent,
  type ScreenTimeSetupOfferSurface,
} from '../../services/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsScreenTimeProtection'>;
type Route = RouteProp<SettingsStackParamList, 'SettingsScreenTimeProtection'>;

type SetupStep = 'idle' | 'permission' | 'selection';
type SetupPhase = 'intro' | 'permission' | 'apps' | 'rules' | 'done' | 'manage';
type RuleDraft = {
  realStep: boolean;
  focusSession: boolean;
};

function statusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Allowed';
    case 'denied':
    case 'revoked':
      return 'Blocked';
    case 'unavailable':
      return 'Unavailable';
    case 'notDetermined':
    default:
      return 'Not set up';
  }
}

function setupCopy(params: {
  setupIntent: ScreenTimeSetupIntent;
  entrySurface: ScreenTimeSetupOfferSurface;
}): { title: string; body: string } {
  if (params.setupIntent === 'focus_sessions') {
    return {
      title: 'Fewer distractions during Focus.',
      body: 'Block distracting apps while Focus runs.',
    };
  }
  if (params.setupIntent === 'meaningful_first_pattern_building') {
    return {
      title: 'Build the pattern you want.',
      body: 'Block distracting apps until you take a real step.',
    };
  }
  if (params.setupIntent === 'meaningful_first_parent_guided') {
    return {
      title: 'Help them start with what matters.',
      body: 'Block distracting apps until a real step is done.',
    };
  }
  if (params.entrySurface === 'scheduled_activity') {
    return {
      title: 'Start with this first.',
      body: 'Block distracting apps until a real step is done.',
    };
  }
  return {
    title: 'Do what matters first.',
    body: 'Block distracting apps until you take a real step.',
  };
}

function setupPhaseIndex(phase: SetupPhase): number {
  switch (phase) {
    case 'permission':
      return 2;
    case 'apps':
      return 3;
    case 'rules':
      return 4;
    case 'done':
      return 5;
    case 'intro':
    default:
      return 1;
  }
}

function initialRuleDraft(params: {
  focusEnabled: boolean;
  meaningfulFirstEnabled: boolean;
  setupIntent: ScreenTimeSetupIntent;
}): RuleDraft {
  if (params.focusEnabled || params.meaningfulFirstEnabled) {
    return {
      realStep: params.meaningfulFirstEnabled,
      focusSession: params.focusEnabled,
    };
  }
  const defaults = getScreenTimeSetupDefaults(params.setupIntent);
  return {
    realStep: defaults.realStep,
    focusSession: defaults.focusSession,
  };
}

function doneBodyForRules(rules: RuleDraft): string {
  if (rules.realStep && rules.focusSession) {
    return 'Selected apps will stay blocked until you take a real step or while Focus is running.';
  }
  if (rules.focusSession) {
    return 'Selected apps will stay blocked while Focus is running.';
  }
  return 'Selected apps will stay blocked until you take a real step.';
}

function setupStepCopy(params: {
  phase: SetupPhase;
  introCopy: { title: string; body: string };
  hasTargets: boolean;
  targetCount: number;
  isScreenTimeUnavailable: boolean;
  rules: RuleDraft;
}): { eyebrow: string; title: string; body: string } {
  switch (params.phase) {
    case 'permission':
      return {
        eyebrow: 'Allow Screen Time',
        title: 'Choose what Kwilt can block.',
        body: params.isScreenTimeUnavailable
          ? 'Screen Time is not available in this build. Use an iOS build with the Screen Time entitlement to continue.'
          : 'Kwilt uses Screen Time to block only the apps you choose. Your choices stay on this device.',
      };
    case 'apps':
      return {
        eyebrow: 'Choose apps',
        title: 'Choose apps to block.',
        body: params.hasTargets
          ? `${params.targetCount} apps or categories selected. You can change this anytime.`
          : 'Pick apps or categories that tend to pull you away.',
      };
    case 'rules':
      return {
        eyebrow: 'Blocking rules',
        title: 'What should come first?',
        body: 'Choose when selected apps should wait.',
      };
    case 'done':
      return {
        eyebrow: "You're set",
        title: 'Screen Time Controls are on.',
        body: doneBodyForRules(params.rules),
      };
    case 'intro':
    case 'manage':
    default:
      return {
        eyebrow: 'Screen Time Controls',
        title: params.introCopy.title,
        body: params.introCopy.body,
      };
  }
}

export function ScreenTimeProtectionSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { capture } = useAnalytics();
  const settings = useAppStore((state) => state.screenTimeProtection);
  const setSettings = useAppStore((state) => state.setScreenTimeProtection);
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const startedKeyRef = useRef<string | null>(null);

  const normalized = useMemo(() => normalizeScreenTimeProtectionSettings(settings), [settings]);
  const setupIntent = route.params?.setupIntent ?? 'settings_discovery';
  const entrySurface = route.params?.entrySurface ?? 'settings';
  const introCopy = useMemo(
    () => setupCopy({ setupIntent, entrySurface }),
    [entrySurface, setupIntent],
  );
  const recoveryStep = getScreenTimeSetupRecoveryStep(normalized);
  const targetCount = normalized.selectedApps.length + normalized.selectedCategories.length;
  const hasTargets = targetCount > 0;
  const isApproved = normalized.authorizationStatus === 'approved';
  const focusEnabled = normalized.focusProtection.enabled;
  const meaningfulFirstEnabled = normalized.meaningfulFirst.enabled;
  const anyRuleEnabled = focusEnabled || meaningfulFirstEnabled;
  const setupCompleted = isApproved && hasTargets && anyRuleEnabled;
  const [setupPhase, setSetupPhase] = useState<SetupPhase>(() => (setupCompleted ? 'manage' : 'intro'));
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(() =>
    initialRuleDraft({ focusEnabled, meaningfulFirstEnabled, setupIntent }),
  );

  useEffect(() => {
    if (setupPhase !== 'rules') return;
    setRuleDraft(initialRuleDraft({ focusEnabled, meaningfulFirstEnabled, setupIntent }));
  }, [focusEnabled, meaningfulFirstEnabled, setupIntent, setupPhase]);

  useEffect(() => {
    if (setupPhase === 'manage') return;
    const key = `${setupIntent}:${entrySurface}`;
    if (startedKeyRef.current === key) return;
    startedKeyRef.current = key;
    capture(AnalyticsEvent.ScreenTimeSetupStarted, {
      setup_intent: setupIntent,
      surface: entrySurface,
      recovery_step: recoveryStep,
    });
  }, [capture, entrySurface, recoveryStep, setupIntent]);

  const reconcileAfterSettingsChange = useCallback(() => {
    reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
  }, []);

  const syncAuthorization = useCallback(() => {
    void getScreenTimeAuthorizationStatus().then((authorizationStatus) => {
      setSettings((current) => ({
        ...current,
        authorizationStatus,
      }));
      reconcileAfterSettingsChange();
    });
  }, [reconcileAfterSettingsChange, setSettings]);

  useFocusEffect(
    useCallback(() => {
      syncAuthorization();
    }, [syncAuthorization]),
  );

  const handleRequestPermission = async () => {
    setSetupStep('permission');
    const authorizationStatus = await requestScreenTimeAuthorization();
    setSettings((current) => ({
      ...current,
      authorizationStatus,
      lastUpdated: new Date().toISOString(),
    }));
    reconcileAfterSettingsChange();
    setSetupStep('idle');

    if (authorizationStatus === 'unavailable') {
      Alert.alert(
        'Screen Time unavailable',
        'This build cannot access Screen Time yet. Use an iOS build with the Screen Time entitlement.',
      );
    }
    if (authorizationStatus === 'denied' || authorizationStatus === 'revoked') {
      Alert.alert('Screen Time access needed', 'Screen Time access is needed to block apps.');
    }
    return authorizationStatus;
  };

  const continueFromIntro = () => {
    if (!isApproved) {
      setSetupPhase('permission');
      return;
    }
    if (!hasTargets) {
      setSetupPhase('apps');
      return;
    }
    setSetupPhase('rules');
  };

  const continueFromPermission = async () => {
    if (isApproved) {
      setSetupPhase('apps');
      return;
    }
    const authorizationStatus = await handleRequestPermission();
    if (authorizationStatus === 'approved') {
      setSetupPhase('apps');
    }
  };

  const handleChooseTargets = async (mode: 'setup' | 'manage' = 'setup') => {
    if (!isApproved) {
      const authorizationStatus = await handleRequestPermission();
      if (useAppStore.getState().screenTimeProtection.authorizationStatus !== 'approved') {
        if (authorizationStatus === 'approved') {
          setSetupPhase('apps');
        }
        return;
      }
    }

    setSetupStep('selection');
    const selection = await presentScreenTimeActivityPicker(useAppStore.getState().screenTimeProtection);
    setSetupStep('idle');
    if (!selection) return;

    const nowIso = new Date().toISOString();
    setSettings((current) => ({
      ...current,
      selectedApps: selection.selectedApps ?? current.selectedApps,
      selectedCategories: selection.selectedCategories ?? current.selectedCategories,
      focusProtection: {
        ...current.focusProtection,
        setupCompleted: current.focusProtection.setupCompleted || mode === 'manage',
        lastUpdated: nowIso,
      },
      meaningfulFirst: {
        ...current.meaningfulFirst,
        setupCompleted: current.meaningfulFirst.setupCompleted || mode === 'manage',
        lastUpdated: nowIso,
      },
      lastUpdated: nowIso,
    }));
    if (mode === 'setup') {
      setSetupPhase('rules');
    }
    reconcileAfterSettingsChange();
  };

  const completeSetupRules = () => {
    if (!ruleDraft.realStep && !ruleDraft.focusSession) {
      Alert.alert('Choose when apps are blocked', 'Pick at least one rule to finish setup.');
      return;
    }
    const nowIso = new Date().toISOString();
    setSettings((current) => ({
      ...current,
      focusProtection: {
        ...current.focusProtection,
        enabled: ruleDraft.focusSession,
        setupCompleted: true,
        lastUpdated: nowIso,
      },
      meaningfulFirst: {
        ...current.meaningfulFirst,
        enabled: ruleDraft.realStep,
        setupCompleted: true,
        lastUpdated: nowIso,
      },
      lastUpdated: nowIso,
    }));
    capture(AnalyticsEvent.ScreenTimeSetupCompleted, {
      setup_intent: setupIntent,
      surface: entrySurface,
      default_focus_rule: getScreenTimeSetupDefaults(setupIntent).focusSession,
      default_real_step_rule: getScreenTimeSetupDefaults(setupIntent).realStep,
      focus_rule_enabled: ruleDraft.focusSession,
      real_step_rule_enabled: ruleDraft.realStep,
    });
    reconcileAfterSettingsChange();
    setSetupPhase('done');
  };

  const handleToggleFocus = (enabled: boolean) => {
    const nowIso = new Date().toISOString();
    setSettings((current) => ({
      ...current,
      focusProtection: {
        ...current.focusProtection,
        enabled,
        setupCompleted: enabled ? current.focusProtection.setupCompleted || hasTargets : current.focusProtection.setupCompleted,
        lastUpdated: nowIso,
      },
      lastUpdated: nowIso,
    }));
    if (enabled) {
      capture(AnalyticsEvent.ScreenTimeSetupCompleted, {
        setup_intent: setupIntent,
        surface: entrySurface,
        rule: 'focus_session',
      });
    }
    reconcileAfterSettingsChange();
  };

  const handleToggleMeaningfulFirst = (enabled: boolean) => {
    const nowIso = new Date().toISOString();
    setSettings((current) => ({
      ...current,
      meaningfulFirst: {
        ...current.meaningfulFirst,
        enabled,
        setupCompleted: enabled ? current.meaningfulFirst.setupCompleted || hasTargets : current.meaningfulFirst.setupCompleted,
        lastUpdated: nowIso,
      },
      lastUpdated: nowIso,
    }));
    if (enabled) {
      capture(AnalyticsEvent.ScreenTimeSetupCompleted, {
        setup_intent: setupIntent,
        surface: entrySurface,
        rule: 'real_step',
      });
    }
    reconcileAfterSettingsChange();
  };

  const canUseProtection = isApproved && hasTargets;
  const isBusy = setupStep !== 'idle';
  const progressStep = setupPhaseIndex(setupPhase);
  const isScreenTimeUnavailable = normalized.authorizationStatus === 'unavailable';
  const managementTitle = !isApproved
    ? 'Screen Time access is needed.'
    : !hasTargets
      ? 'Choose apps to turn controls on.'
      : anyRuleEnabled
        ? 'Screen Time Controls are on.'
        : 'Screen Time Controls are off.';
  const managementSubtitle = hasTargets
    ? `${targetCount} apps or categories selected.`
    : 'Choose apps to start blocking distractions.';
  const setupButtonLabel =
    setupPhase === 'permission'
      ? isScreenTimeUnavailable
        ? 'Unavailable'
        : 'Continue'
      : setupPhase === 'apps'
        ? hasTargets
          ? 'Continue'
          : 'Choose Apps'
        : setupPhase === 'rules'
          ? 'Done'
          : setupPhase === 'done'
            ? 'Done'
            : 'Set Up';
  const setupPrimaryDisabled =
    setupPhase === 'permission'
      ? isBusy || isScreenTimeUnavailable
      : setupPhase === 'apps'
        ? isBusy || normalized.authorizationStatus === 'unavailable'
        : setupPhase === 'rules'
          ? !ruleDraft.realStep && !ruleDraft.focusSession
          : false;
  const setupContent = setupStepCopy({
    phase: setupPhase,
    introCopy,
    hasTargets,
    targetCount,
    isScreenTimeUnavailable,
    rules: ruleDraft,
  });
  const setupSecondaryLabel =
    setupPhase === 'apps' && hasTargets
      ? 'Edit selection'
      : setupPhase === 'done'
        ? 'Change apps'
        : null;

  const handleSetupPrimaryPress = () => {
    if (setupPhase === 'intro') {
      continueFromIntro();
      return;
    }
    if (setupPhase === 'permission') {
      void continueFromPermission();
      return;
    }
    if (setupPhase === 'apps') {
      if (hasTargets) {
        setSetupPhase('rules');
        return;
      }
      void handleChooseTargets('setup');
      return;
    }
    if (setupPhase === 'rules') {
      completeSetupRules();
      return;
    }
    if (setupPhase === 'done') {
      setSetupPhase('manage');
    }
  };

  const handleSetupSecondaryPress = () => {
    if (setupPhase === 'apps' && hasTargets) {
      void handleChooseTargets('setup');
      return;
    }
    if (setupPhase === 'done') {
      setSetupPhase('apps');
    }
  };

  const handleCloseSetupDrawer = () => {
    setSetupPhase('manage');
  };

  const managementContent = (
    <>
      <View style={styles.managementHero}>
        <HStack alignItems="center" space="sm">
          <View style={styles.iconWrap}>
            <Icon name="shield" size={20} color={colors.textPrimary} />
          </View>
          <VStack flex={1} space={0}>
            <Text style={styles.title}>{managementTitle}</Text>
            <Text style={styles.subtitle}>{managementSubtitle}</Text>
          </VStack>
          <View style={[styles.statusPill, isApproved ? styles.statusPillOn : null]}>
            <Text style={[styles.statusText, isApproved ? styles.statusTextOn : null]}>
              {statusLabel(normalized.authorizationStatus)}
            </Text>
          </View>
        </HStack>
      </View>

      <View style={styles.card}>
        <VStack space="sm">
          <Text style={styles.cardTitle}>Blocked apps</Text>
          <ManageRow
            title={hasTargets ? `${targetCount} selected` : 'No apps selected'}
            subtitle={
              hasTargets
                ? 'Change the apps or categories Kwilt blocks.'
                : 'Choose the apps or categories that tend to pull you away.'
            }
            actionLabel={hasTargets ? 'Edit' : 'Choose'}
            disabled={isBusy || normalized.authorizationStatus === 'unavailable'}
            onPress={() => void handleChooseTargets('manage')}
          />
        </VStack>
      </View>

      <View style={styles.card}>
        <VStack space="sm">
          <Text style={styles.cardTitle}>What should come first?</Text>
          <ToggleRow
            title="A real step"
            subtitle="Complete a to-do, record progress, or finish Focus."
            value={meaningfulFirstEnabled}
            disabled={!canUseProtection}
            onValueChange={handleToggleMeaningfulFirst}
          />
          <ToggleRow
            title="Focus"
            subtitle="Block selected apps while Focus is running."
            value={focusEnabled}
            disabled={!canUseProtection}
            onValueChange={handleToggleFocus}
          />
          {!canUseProtection ? (
            <Text style={styles.bodyMuted}>
              Allow Screen Time and choose apps before turning on rules.
            </Text>
          ) : null}
        </VStack>
      </View>
    </>
  );

  const setupDrawer = setupPhase !== 'manage' ? (
    <BottomDrawer
      visible
      onClose={handleCloseSetupDrawer}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      keyboardAvoidanceEnabled={false}
      sheetStyle={styles.setupDrawerSheet}
      handleContainerStyle={styles.setupDrawerHandleContainer}
      handleStyle={styles.setupDrawerHandle}
    >
      <View style={styles.setupDrawerContent}>
        <View style={styles.ftueSetupLayout}>
          <View style={styles.ftueSetupHeader}>
            <HStack alignItems="center" justifyContent="space-between">
              <View style={styles.ftueProgressTrack}>
                <View style={[styles.ftueProgressFill, { width: `${Math.round((progressStep / 5) * 100)}%` }]} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Screen Time Controls setup"
                onPress={handleCloseSetupDrawer}
                style={styles.ftueCloseButton}
              >
                <Icon name="close" size={20} color={colors.parchment} />
              </Pressable>
            </HStack>
          </View>

          <View style={styles.ftueSetupBody}>
            <VStack space="sm">
              <Text style={styles.ftueTitle}>{setupContent.title}</Text>
              <Text style={styles.ftueBody}>{setupContent.body}</Text>

              {setupPhase === 'rules' ? (
                <View style={styles.ftueRuleList}>
                  <RuleDraftRow
                    title="A real step"
                    subtitle="Complete a to-do, record progress, or finish Focus."
                    value={ruleDraft.realStep}
                    onValueChange={(value) => setRuleDraft((current) => ({ ...current, realStep: value }))}
                    tone="ftue"
                  />
                  <RuleDraftRow
                    title="Focus"
                    subtitle="Block selected apps while Focus is running."
                    value={ruleDraft.focusSession}
                    onValueChange={(value) => setRuleDraft((current) => ({ ...current, focusSession: value }))}
                    tone="ftue"
                  />
                </View>
              ) : null}

              {recoveryStep === 'permission_denied' ? (
                <Text style={styles.ftueNotice}>Screen Time access is needed to block apps.</Text>
              ) : null}
            </VStack>
            {setupPhase === 'rules' ? null : (
              <View style={styles.ftueVisualSlot}>
                <SetupVisual phase={setupPhase} />
              </View>
            )}
          </View>

          <View style={styles.ftueSetupFooter}>
            {setupPhase === 'permission' ? (
              <View style={styles.ftuePermissionPanel}>
                <Text style={styles.ftuePermissionLabel}>Screen Time</Text>
                <Text style={styles.ftuePermissionValue}>{statusLabel(normalized.authorizationStatus)}</Text>
              </View>
            ) : null}

            <Button
              variant="accent"
              fullWidth
              disabled={setupPrimaryDisabled}
              style={[
                styles.ftuePrimaryButton,
                setupPrimaryDisabled ? styles.ftuePrimaryButtonDisabled : null,
              ]}
              onPress={handleSetupPrimaryPress}
            >
              <Text style={styles.ftuePrimaryButtonLabel}>{setupButtonLabel}</Text>
            </Button>

            <View style={styles.ftueSecondarySlot}>
              {setupSecondaryLabel ? (
                <Button variant="ghost" fullWidth onPress={handleSetupSecondaryPress}>
                  <Text style={styles.ftueSecondaryButtonLabel}>{setupSecondaryLabel}</Text>
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </BottomDrawer>
  ) : null;

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Screen Time Controls" onPressBack={() => navigation.goBack()} />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {managementContent}
        </ScrollView>
      </View>
      {setupDrawer}
    </AppShell>
  );
}

function SetupVisual(props: { phase: SetupPhase }) {
  const isDone = props.phase === 'done';
  return (
    <View style={styles.setupVisual}>
      <View style={styles.setupPhone}>
        <View style={styles.setupPhoneSpeaker} />
        <View style={styles.setupAppGrid}>
          <View style={styles.setupBlockedApp} />
          <View style={[styles.setupKwiltApp, isDone ? styles.setupKwiltAppDone : null]}>
            <Icon name={isDone ? 'check' : 'shield'} size={22} color={colors.pine700} />
          </View>
          <View style={styles.setupBlockedApp} />
          <View style={styles.setupBlockedApp} />
          <View style={styles.setupBlockedApp} />
          <View style={styles.setupBlockedApp} />
        </View>
      </View>
    </View>
  );
}

function RuleDraftRow(props: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  tone?: 'default' | 'ftue';
}) {
  const isFtue = props.tone === 'ftue';
  return (
    <View style={[styles.ruleDraftRow, isFtue ? styles.ftueRuleDraftRow : null]}>
      <VStack flex={1} space={0}>
        <Text style={[styles.rowTitle, isFtue ? styles.ftueRuleTitle : null]}>{props.title}</Text>
        <Text style={[styles.rowSubtitle, isFtue ? styles.ftueRuleSubtitle : null]}>{props.subtitle}</Text>
      </VStack>
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        trackColor={{
          false: isFtue ? 'rgba(250,247,237,0.18)' : colors.shellAlt,
          true: isFtue ? colors.parchment : colors.pine700,
        }}
        thumbColor={isFtue ? colors.pine700 : colors.canvas}
      />
    </View>
  );
}

function ManageRow(props: {
  title: string;
  subtitle: string;
  actionLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.manageRow}>
      <VStack flex={1} space={0}>
        <Text style={styles.rowTitle}>{props.title}</Text>
        <Text style={styles.rowSubtitle}>{props.subtitle}</Text>
      </VStack>
      <Button size="sm" variant="secondary" disabled={props.disabled} onPress={props.onPress}>
        {props.actionLabel}
      </Button>
    </View>
  );
}

function ToggleRow(props: {
  title: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <VStack flex={1} space={0}>
        <Text style={[styles.rowTitle, props.disabled ? styles.disabledText : null]}>{props.title}</Text>
        <Text style={styles.rowSubtitle}>{props.subtitle}</Text>
      </VStack>
      <Switch
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        trackColor={{ false: colors.shellAlt, true: colors.accent }}
        thumbColor={colors.canvas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  setupDrawerSheet: {
    backgroundColor: colors.pine700,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  setupDrawerHandleContainer: {
    backgroundColor: colors.pine700,
    paddingTop: spacing.sm,
  },
  setupDrawerHandle: {
    backgroundColor: 'rgba(250,247,237,0.38)',
  },
  setupDrawerContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  ftueSetupLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ftueSetupHeader: {
    rowGap: spacing.md,
  },
  ftueCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  ftueProgressLabel: {
    ...typography.label,
    color: colors.parchment,
    opacity: 0.82,
  },
  ftueProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(250,247,237,0.22)',
    overflow: 'hidden',
  },
  ftueProgressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.parchment,
  },
  ftueSetupBody: {
    flex: 1,
    justifyContent: 'flex-start',
    rowGap: spacing.md,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.sm,
  },
  ftueVisualSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ftueSetupFooter: {
    rowGap: spacing.sm,
    paddingBottom: spacing.md,
  },
  ftueTitle: {
    ...typography.titleMd,
    color: colors.parchment,
  },
  ftueBody: {
    ...typography.body,
    color: colors.parchment,
    opacity: 0.86,
  },
  ftuePermissionPanel: {
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(250,247,237,0.18)',
    backgroundColor: 'rgba(250,247,237,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
  },
  ftuePermissionLabel: {
    ...typography.bodySm,
    color: colors.parchment,
    opacity: 0.82,
  },
  ftuePermissionValue: {
    ...typography.bodySm,
    color: colors.parchment,
    fontWeight: '700',
  },
  ftueRuleList: {
    marginTop: spacing.xs,
    rowGap: spacing.sm,
  },
  ftueNotice: {
    ...typography.bodySm,
    color: colors.parchment,
    opacity: 0.82,
  },
  ftuePrimaryButton: {
    backgroundColor: colors.parchment,
    borderColor: colors.parchment,
  },
  ftuePrimaryButtonDisabled: {
    opacity: 0.48,
  },
  ftuePrimaryButtonLabel: {
    ...typography.body,
    color: colors.pine700,
    fontWeight: '600',
  },
  ftueSecondarySlot: {
    minHeight: 44,
  },
  ftueSecondaryButtonLabel: {
    ...typography.body,
    color: colors.parchment,
    fontWeight: '600',
  },
  setupVisual: {
    alignItems: 'center',
  },
  setupPhone: {
    width: 184,
    height: 218,
    borderRadius: 34,
    borderWidth: 8,
    borderColor: 'rgba(250,247,237,0.22)',
    backgroundColor: 'rgba(250,247,237,0.10)',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  setupPhoneSpeaker: {
    width: 42,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(250,247,237,0.18)',
    marginBottom: spacing.lg,
  },
  setupAppGrid: {
    width: 124,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  setupBlockedApp: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.parchment,
    opacity: 0.22,
  },
  setupKwiltApp: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.parchment,
  },
  setupKwiltAppDone: {
    backgroundColor: colors.parchment,
  },
  managementHero: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    padding: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.shellAlt,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.shellAlt,
  },
  statusPillOn: {
    backgroundColor: colors.accentMuted,
  },
  statusText: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    fontFamily: typography.titleSm.fontFamily,
  },
  statusTextOn: {
    color: colors.textPrimary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingVertical: spacing.xs,
  },
  ruleDraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvas,
  },
  ftueRuleDraftRow: {
    borderColor: 'rgba(250,247,237,0.18)',
    backgroundColor: 'rgba(250,247,237,0.10)',
  },
  ftueRuleTitle: {
    color: colors.parchment,
  },
  ftueRuleSubtitle: {
    color: colors.parchment,
    opacity: 0.75,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingVertical: spacing.xs,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  bodyMuted: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

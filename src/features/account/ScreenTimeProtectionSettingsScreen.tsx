import { Pressable } from '@/src/ui/HapticPressable';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { HStack, Text, VStack } from '../../ui/primitives';
import type { RootDrawerParamList, SettingsStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import {
  getScreenTimeAuthorizationStatus,
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '../../services/appleEcosystem/screenTimeProtection';
import {
  createPersonalScreenTimeRule,
  getPersonalScreenTimeRuleById,
  getScreenTimeSetupDefaults,
  getScreenTimeSetupRecoveryStep,
  normalizeScreenTimeProtectionSettings,
  replacePersonalScreenTimeRule,
  type PersonalScreenTimeRuleKind,
  type ScreenTimeSetupIntent,
  type ScreenTimeSetupOfferSurface,
} from '../../services/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { useMoneyAppControlSettings } from '../../capabilities/money/runtime/moneyAppControlStorage';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
  SettingsToggle,
} from '../../ui/SettingsSurface';
import {
  getHouseholdSnapshot,
  type HouseholdSnapshot,
} from '../household/data/household';
import { buildFamilyScreenTimeOverviewRows } from './screenTimeOverview';
import {
  buildMyScreenTimeRuleInventory,
  type ScreenTimeRuleInventoryRow,
} from '../screen-time/domain/screenTimeRuleInventory';
import { openPersonalScreenTimeRuleBuilder } from '../screen-time/rule-builder/usePersonalRuleBuilderDrawerStore';

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
      body: 'Block distracting apps until you complete a to-do, record progress, or finish Focus.',
    };
  }
  if (params.setupIntent === 'meaningful_first_parent_guided') {
    return {
      title: 'Help them start with what matters.',
      body: 'Block distracting apps until they complete a to-do, record progress, or finish Focus.',
    };
  }
  if (params.entrySurface === 'scheduled_activity') {
    return {
      title: 'Start with this first.',
      body: 'Block distracting apps until you complete a to-do, record progress, or finish Focus.',
    };
  }
  return {
    title: 'Do what matters first.',
    body: 'Block distracting apps until you complete a to-do, record progress, or finish Focus.',
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
    return 'You created two rules. Each blocks its selected apps when that rule applies.';
  }
  if (rules.focusSession) {
    return 'Selected apps will stay blocked while Focus is running.';
  }
  return 'Selected apps will stay blocked until you complete a to-do, record progress, or finish Focus.';
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
          ? 'Screen Time is unavailable in this build. Reinstall an entitlement-enabled development build to continue.'
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
  const rootNavigation = navigation.getParent<NavigationProp<RootDrawerParamList>>();
  const { capture } = useAnalytics();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const settings = useAppStore((state) => state.screenTimeProtection);
  const setSettings = useAppStore((state) => state.setScreenTimeProtection);
  const moneyAppControls = useMoneyAppControlSettings();
  const [householdSnapshot, setHouseholdSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [householdLoadState, setHouseholdLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const startedKeyRef = useRef<string | null>(null);

  const normalized = useMemo(() => normalizeScreenTimeProtectionSettings(settings), [settings]);
  const setupIntent = route.params?.setupIntent ?? 'settings_discovery';
  const entrySurface = route.params?.entrySurface ?? 'settings';
  const returnToActivityId = route.params?.returnToActivityId;
  const introCopy = useMemo(
    () => setupCopy({ setupIntent, entrySurface }),
    [entrySurface, setupIntent],
  );
  const recoveryStep = getScreenTimeSetupRecoveryStep(normalized);
  const targetCount = normalized.selectedApps.length + normalized.selectedCategories.length;
  const hasTargets = targetCount > 0;
  const isApproved = normalized.authorizationStatus === 'approved';
  const focusEnabled = normalized.personalRules.some((rule) => rule.kind === 'focus' && rule.enabled);
  const meaningfulFirstEnabled = normalized.personalRules.some((rule) => rule.kind === 'real_step' && rule.enabled);
  const hasCompletedRulesSetup = normalized.personalRules.some((rule) => rule.setupCompleted);
  const setupCompleted = isApproved && hasTargets && hasCompletedRulesSetup;
  const [setupPhase, setSetupPhase] = useState<SetupPhase>(() => (setupCompleted ? 'manage' : 'intro'));
  const previousAuthorizationApprovedRef = useRef(isApproved);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(() =>
    initialRuleDraft({ focusEnabled, meaningfulFirstEnabled, setupIntent }),
  );

  useEffect(() => {
    const wasAuthorizationApproved = previousAuthorizationApprovedRef.current;
    previousAuthorizationApprovedRef.current = isApproved;
    if (wasAuthorizationApproved && !isApproved && setupPhase === 'manage') {
      setSetupPhase('intro');
    }
  }, [isApproved, setupPhase]);

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
      if (!setupCompleted) {
        setSetupPhase('intro');
      }
    }, [entrySurface, returnToActivityId, setupCompleted, setupIntent]),
  );

  useFocusEffect(
    useCallback(() => {
      syncAuthorization();
    }, [syncAuthorization]),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!authIdentity?.userId) {
        setHouseholdSnapshot(null);
        setHouseholdLoadState('idle');
        return undefined;
      }
      setHouseholdLoadState('loading');
      void getHouseholdSnapshot(getSupabaseClient())
        .then((snapshot) => {
          if (cancelled) return;
          setHouseholdSnapshot(snapshot);
          setHouseholdLoadState('loaded');
        })
        .catch(() => {
          if (cancelled) return;
          setHouseholdSnapshot(null);
          setHouseholdLoadState('error');
        });
      return () => { cancelled = true; };
    }, [authIdentity?.userId]),
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

    if (authorizationStatus === 'denied' || authorizationStatus === 'revoked') {
      Alert.alert('Screen Time access needed', 'Screen Time access is needed to block apps.');
    }
    return authorizationStatus;
  };

  const openSetupRuleBuilder = () => {
    const defaults = getScreenTimeSetupDefaults(setupIntent);
    const suggestedKind: PersonalScreenTimeRuleKind | undefined = defaults.focusSession
      ? 'focus'
      : defaults.realStep
        ? 'real_step'
        : undefined;
    setSetupPhase('manage');
    const builderParams = {
      entry: setupIntent === 'settings_discovery' ? 'inventory' : 'contextual',
      suggestedKind,
      setupIntent,
      entrySurface,
    } as const;

    if (returnToActivityId && builderParams.entry === 'contextual') {
      rootNavigation?.goBack();
      openPersonalScreenTimeRuleBuilder(builderParams);
      return;
    }

    navigation.navigate('SettingsScreenTimeRuleBuilder', builderParams);
  };

  const continueFromIntro = () => {
    if (!isApproved) {
      setSetupPhase('permission');
      return;
    }
    openSetupRuleBuilder();
  };

  const continueFromPermission = async () => {
    if (isApproved) {
      openSetupRuleBuilder();
      return;
    }
    const authorizationStatus = await handleRequestPermission();
    if (authorizationStatus === 'approved') {
      openSetupRuleBuilder();
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
    const selection = await presentScreenTimeActivityPicker(
      useAppStore.getState().screenTimeProtection,
      { selectionId: 'personal_setup_staging' },
    );
    setSetupStep('idle');
    if (!selection) return;

    const nowIso = new Date().toISOString();
    setSettings((current) => ({
      ...current,
      selectedApps: selection.selectedApps ?? current.selectedApps,
      selectedCategories: selection.selectedCategories ?? current.selectedCategories,
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
    setSettings((current) => {
      const rules = [];
      if (ruleDraft.realStep) {
        rules.push(createPersonalScreenTimeRule({
          kind: 'real_step',
          selectedApps: current.selectedApps,
          selectedCategories: current.selectedCategories,
          enabled: true,
          setupCompleted: true,
          nowIso,
        }));
      }
      if (ruleDraft.focusSession) {
        rules.push(createPersonalScreenTimeRule({
          kind: 'focus',
          selectedApps: current.selectedApps,
          selectedCategories: current.selectedCategories,
          enabled: true,
          setupCompleted: true,
          nowIso,
        }));
      }
      return normalizeScreenTimeProtectionSettings({
        ...current,
        personalRules: rules,
        lastUpdated: nowIso,
      });
    });
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

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    const nowIso = new Date().toISOString();
    const ruleKind = getPersonalScreenTimeRuleById(
      normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection),
      ruleId,
    )?.kind;
    setSettings((current) => {
      const existing = getPersonalScreenTimeRuleById(current, ruleId);
      if (!existing) return current;
      return replacePersonalScreenTimeRule(current, {
        ...existing,
        enabled,
        setupCompleted: true,
        lastUpdated: nowIso,
      });
    });
    if (enabled && ruleKind) {
      capture(AnalyticsEvent.ScreenTimeSetupCompleted, {
        setup_intent: setupIntent,
        surface: entrySurface,
        rule: ruleKind === 'focus'
          ? 'focus_session'
          : ruleKind === 'daily_limit'
            ? 'daily_limit'
            : 'real_step',
      });
    }
    reconcileAfterSettingsChange();
  };

  const handleChooseRuleTargets = async (ruleId: string) => {
    const rule = getPersonalScreenTimeRuleById(
      normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection),
      ruleId,
    );
    if (!rule) return;
    setSetupStep('selection');
    const selection = await presentScreenTimeActivityPicker({
      selectedApps: rule.selectedApps,
      selectedCategories: rule.selectedCategories,
    }, { selectionId: rule.selectionId });
    setSetupStep('idle');
    if (!selection) return;
    const nowIso = new Date().toISOString();
    setSettings((current) => {
      const currentRule = getPersonalScreenTimeRuleById(current, ruleId);
      if (!currentRule) return current;
      return replacePersonalScreenTimeRule(current, {
        ...currentRule,
        selectedApps: selection.selectedApps ?? currentRule.selectedApps,
        selectedCategories: selection.selectedCategories ?? currentRule.selectedCategories,
        needsSelectionReview: false,
        lastUpdated: nowIso,
      });
    });
    reconcileAfterSettingsChange();
  };

  const beginPersonalRuleDraft = () => {
    if (!isApproved) return;
    navigation.navigate('SettingsScreenTimeRuleBuilder', { entry: 'inventory' });
  };

  const isBusy = setupStep !== 'idle';
  const progressStep = setupPhaseIndex(setupPhase);
  const isScreenTimeUnavailable = normalized.authorizationStatus === 'unavailable';
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
  const familyRows = buildFamilyScreenTimeOverviewRows(householdSnapshot);
  const myRuleRows = buildMyScreenTimeRuleInventory({
    personalSettings: normalized,
    moneySettings: moneyAppControls.settings,
  });
  const openRule = (row: ScreenTimeRuleInventoryRow) => {
    if (row.destination.kind === 'money') {
      rootNavigation?.navigate('Money', {
        screen: 'MoneyAppControl',
        params: { categoryId: row.destination.categorySourceId },
      });
      return;
    }
    void handleChooseRuleTargets(row.destination.ruleId);
  };

  const toggleInventoryRule = (row: ScreenTimeRuleInventoryRow) => {
    if (row.destination.kind !== 'personal') {
      openRule(row);
      return;
    }
    handleToggleRule(row.destination.ruleId, !row.enabled);
  };

  const openHouseholdRuleBuilder = () => {
    if (familyRows.length === 1 && householdSnapshot?.household?.id) {
      const row = familyRows[0];
      navigation.navigate('SettingsFamilyScreenTime', {
        householdId: householdSnapshot.household.id,
        childMembershipId: row.childMembershipId,
        childDisplayName: row.displayName,
      });
      return;
    }
    navigation.navigate('SettingsHousehold');
  };

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
      <SettingsGroup>
        <SettingsRow
          title="Screen Time access"
          value={statusLabel(normalized.authorizationStatus)}
          showsDisclosureIndicator={false}
        />
      </SettingsGroup>

      <RuleInventoryGroup
        title={`My rules · ${myRuleRows.length}`}
        addAccessibilityLabel="Add My rule"
        addDisabled={!isApproved}
        onAdd={beginPersonalRuleDraft}
        emptyCopy="No personal rules yet."
        isEmpty={myRuleRows.length === 0}
      >
        {myRuleRows.map((row, index) => (
          <Fragment key={row.id}>
            {index > 0 ? <SettingsDivider /> : null}
            <RuleInventoryRow
              row={row}
              disabled={isBusy || normalized.authorizationStatus === 'unavailable'}
              onPress={() => openRule(row)}
              onToggle={() => toggleInventoryRule(row)}
            />
          </Fragment>
        ))}
      </RuleInventoryGroup>

      <RuleInventoryGroup
        title="Household rules · 0"
        addAccessibilityLabel="Add Household rule"
        onAdd={openHouseholdRuleBuilder}
        emptyCopy="Shared rules will appear here after they are created."
        isEmpty
      />

      {householdLoadState === 'loading' ? (
        <SettingsGroup title="Household setup">
          <SettingsRow disabled title="Household" value="Loading…" />
        </SettingsGroup>
      ) : householdLoadState === 'error' ? (
        <SettingsGroup title="Household setup">
          <SettingsRow onPress={() => navigation.navigate('SettingsHousehold')} title="Household" value="Unavailable" />
        </SettingsGroup>
      ) : familyRows.length > 0 && householdSnapshot?.household?.id ? (
        <SettingsGroup title="Household setup">
          {familyRows.map((row, index) => (
            <Fragment key={row.childMembershipId}>
              {index > 0 ? <SettingsDivider /> : null}
              <SettingsRow
                onPress={() => navigation.navigate('SettingsFamilyScreenTime', {
                  householdId: householdSnapshot.household!.id,
                  childMembershipId: row.childMembershipId,
                  childDisplayName: row.displayName,
                })}
                title={row.displayName}
                value={row.value}
              />
            </Fragment>
          ))}
        </SettingsGroup>
      ) : null}
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
                    title="Complete a to-do, record progress, or finish Focus"
                    subtitle="Unlock selected apps afterward."
                    value={ruleDraft.realStep}
                    onValueChange={(value) => setRuleDraft((current) => ({ ...current, realStep: value }))}
                  />
                  <RuleDraftRow
                    title="Pause until Focus ends"
                    subtitle="Keep selected apps blocked while Focus is running."
                    value={ruleDraft.focusSession}
                    onValueChange={(value) => setRuleDraft((current) => ({ ...current, focusSession: value }))}
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
              variant="inverse"
              fullWidth
              disabled={setupPrimaryDisabled}
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
        <PageHeader title="Screen Time" onPressBack={() => navigation.goBack()} />
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
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={props.title}
      accessibilityState={{ checked: props.value }}
      onPress={() => props.onValueChange(!props.value)}
      style={({ pressed }) => [
        styles.ruleDraftRow,
        styles.ftueRuleDraftRow,
        props.value ? styles.ftueRuleDraftRowSelected : null,
        pressed ? styles.ruleDraftRowPressed : null,
      ]}
    >
      <VStack flex={1} space={0}>
        <Text style={[styles.rowTitle, styles.ftueRuleTitle]}>{props.title}</Text>
        <Text style={[styles.rowSubtitle, styles.ftueRuleSubtitle]}>{props.subtitle}</Text>
      </VStack>
      <View style={[styles.ruleCheck, props.value ? styles.ruleCheckSelected : null]}>
        {props.value ? <Icon name="check" size={16} color={colors.textPrimary} /> : null}
      </View>
    </Pressable>
  );
}

function RuleInventoryGroup(props: {
  title: string;
  addAccessibilityLabel: string;
  addDisabled?: boolean;
  emptyCopy: string;
  isEmpty?: boolean;
  onAdd: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.ruleGroupBlock}>
      <HStack alignItems="center" justifyContent="space-between">
        <Text style={styles.ruleGroupLabel}>{props.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.addAccessibilityLabel}
          accessibilityState={{ disabled: props.addDisabled }}
          disabled={props.addDisabled}
          onPress={props.onAdd}
          style={({ pressed }) => [styles.addRuleButton, props.addDisabled ? styles.addRuleButtonDisabled : null, pressed ? styles.ruleDraftRowPressed : null]}
        >
          <Icon name="plus" size={16} color={colors.textPrimary} />
          <Text style={styles.addRuleButtonText}>Add rule</Text>
        </Pressable>
      </HStack>
      <View style={styles.ruleGroupSurface}>
        {props.isEmpty ? <Text style={styles.ruleGroupEmpty}>{props.emptyCopy}</Text> : props.children}
      </View>
    </View>
  );
}

function RuleInventoryRow(props: {
  row: ScreenTimeRuleInventoryRow;
  disabled?: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const copy = (
    <VStack flex={1} space={0}>
      <Text style={[styles.rowTitle, props.disabled ? styles.disabledText : null]}>{props.row.title}</Text>
      <Text style={styles.rowSubtitle}>{props.row.detail}</Text>
      {props.row.contextLabel ? <Text style={styles.ruleOwnerCopy}>{props.row.contextLabel}</Text> : null}
    </VStack>
  );
  if (props.row.domain === 'personal') {
    return (
      <View style={[styles.inventoryRow, !props.row.enabled ? styles.ruleCardDisabled : null]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${props.row.title}. ${props.row.detail}`}
          disabled={props.disabled}
          onPress={props.onPress}
          style={({ pressed }) => [styles.inventoryRowMain, pressed ? styles.ruleDraftRowPressed : null]}
        >
          {copy}
        </Pressable>
        <SettingsToggle
          accessibilityLabel={`${props.row.title} ${props.row.enabled ? 'on' : 'off'}`}
          disabled={props.disabled}
          value={props.row.enabled}
          onPress={props.onToggle}
        />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.row.title}. ${props.row.detail}${props.row.contextLabel ? `. ${props.row.contextLabel}` : ''}`}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [styles.inventoryRow, !props.row.enabled ? styles.ruleCardDisabled : null, pressed ? styles.ruleDraftRowPressed : null]}
    >
      {copy}
      <Icon name="chevronRight" size={17} color={colors.textSecondary} />
    </Pressable>
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
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  setupDrawerSheet: {
    backgroundColor: colors.pine700,
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
    borderColor: 'rgba(250,247,237,0.32)',
    backgroundColor: 'rgba(250,247,237,0.10)',
  },
  ftueRuleDraftRowSelected: {
    borderColor: colors.parchment,
    backgroundColor: 'rgba(250,247,237,0.18)',
  },
  ruleDraftRowPressed: {
    opacity: 0.78,
  },
  ftueRuleTitle: {
    color: colors.parchment,
  },
  ftueRuleSubtitle: {
    color: colors.parchment,
    opacity: 0.75,
  },
  ruleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250,247,237,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleCheckSelected: {
    borderColor: colors.parchment,
    backgroundColor: colors.parchment,
  },
  ruleCardDisabled: {
    opacity: 0.72,
  },
  ruleStatus: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.shellAlt,
  },
  ruleStatusOn: {
    backgroundColor: colors.cardMuted,
  },
  ruleStatusText: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    fontFamily: typography.titleSm.fontFamily,
  },
  ruleTargetCopy: {
    ...typography.bodyXs,
    color: colors.textSecondary,
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
  ruleGroupBlock: {
    rowGap: spacing.sm,
  },
  ruleGroupLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
  },
  addRuleButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
  },
  addRuleButtonDisabled: {
    opacity: 0.42,
  },
  addRuleButtonText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  ruleGroupSurface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.canvas,
  },
  ruleGroupEmpty: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  inventoryRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inventoryRowMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    justifyContent: 'center',
  },
  ruleOwnerCopy: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

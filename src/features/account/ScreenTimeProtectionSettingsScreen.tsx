import { Pressable } from '@/src/ui/HapticPressable';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableProps } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { HStack, Text, VStack } from '../../ui/primitives';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import {
  getScreenTimeAuthorizationStatus,
  requestScreenTimeAuthorization,
} from '../../services/appleEcosystem/screenTimeProtection';
import {
  getScreenTimeSetupDefaults,
  getScreenTimeSetupRecoveryStep,
  normalizeScreenTimeProtectionSettings,
  type PersonalScreenTimeRuleKind,
  type ScreenTimeSetupIntent,
  type ScreenTimeSetupOfferSurface,
} from '../../services/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { ensureCurrentScreenTimeRuleSystem } from '../screen-time/runtime/screenTimeRuleSystemCleanupRuntime';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import {
  SettingsDivider,
  SettingsDetailRow,
  SettingsDetailToggleRow,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
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
import {
  deletePersonalCompositeScreenTimeRule,
  savePersonalCompositeScreenTimeRule,
} from '../screen-time/domain/personalCompositeRuleActions';
import {
  createPersonalCompositeRuleActionBoundary,
} from '../screen-time/runtime/personalScreenTimeRuleActionBoundary';
import { openPaywallInterstitial } from '../../services/paywall';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsScreenTimeProtection'>;
type Route = RouteProp<SettingsStackParamList, 'SettingsScreenTimeProtection'>;

type SetupStep = 'idle' | 'permission';
type SetupPhase = 'intro' | 'permission' | 'manage';
type ScreenTimeAuthorizationMember = 'individual' | 'child';
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
    title: 'Set rules that fit real life.',
    body: 'Start with a simple Focus or daily-use rule. Pro adds schedules, combined conditions, completed to-dos, and Money. You’ll approve Screen Time before creating a rule.',
  };
}

function setupPhaseIndex(phase: SetupPhase): number {
  switch (phase) {
    case 'permission':
      return 2;
    case 'intro':
    default:
      return 1;
  }
}

function setupStepCopy(params: {
  phase: SetupPhase;
  introCopy: { title: string; body: string };
  isScreenTimeUnavailable: boolean;
  authorizationMember: ScreenTimeAuthorizationMember;
}): { eyebrow: string; title: string; body: string } {
  switch (params.phase) {
    case 'permission':
      if (params.authorizationMember === 'child') {
        return {
          eyebrow: 'Allow Screen Time',
          title: 'Set up rules on this child’s iPhone.',
          body: params.isScreenTimeUnavailable
            ? 'Screen Time is unavailable in this build. Reinstall an entitlement-enabled development build to continue.'
            : 'Keep this iPhone with you while iOS asks for approval. The app choices and simple rules stay on this iPhone. It won’t connect this device to your Kwilt Household.',
        };
      }
      return {
        eyebrow: 'Allow Screen Time',
        title: 'Allow Kwilt to use Screen Time.',
        body: params.isScreenTimeUnavailable
          ? 'Screen Time is unavailable in this build. Reinstall an entitlement-enabled development build to continue.'
          : 'iOS will ask you to approve Screen Time. Then choose the apps for your first rule; those choices stay on this iPhone.',
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
  const authIdentity = useAppStore((state) => state.authIdentity);
  const settings = useAppStore((state) => state.screenTimeProtection);
  const setSettings = useAppStore((state) => state.setScreenTimeProtection);
  const [householdSnapshot, setHouseholdSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [householdLoadState, setHouseholdLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [authorizationMember, setAuthorizationMember] = useState<ScreenTimeAuthorizationMember>('individual');
  const [pendingPersonalRuleId, setPendingPersonalRuleId] = useState<string | null>(null);
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
  const isApproved = normalized.authorizationStatus === 'approved';
  // Apple approval completes the one-time setup. Creating a first rule is a
  // separate job and a failed save must not send Settings through onboarding
  // again. Contextual offers may still introduce their specific rule outcome.
  const hasCompletedRulesSetup = normalized.personalCompositeRules.some((rule) => rule.setupCompleted);
  const setupCompleted = isApproved
    && (setupIntent === 'settings_discovery' || hasCompletedRulesSetup);
  const [setupPhase, setSetupPhase] = useState<SetupPhase>(() => (setupCompleted ? 'manage' : 'intro'));
  const [authorizationChecked, setAuthorizationChecked] = useState(isApproved);
  const previousAuthorizationApprovedRef = useRef(isApproved);

  useEffect(() => {
    const wasAuthorizationApproved = previousAuthorizationApprovedRef.current;
    previousAuthorizationApprovedRef.current = isApproved;
    if (wasAuthorizationApproved && !isApproved && setupPhase === 'manage') {
      setSetupPhase('intro');
    }
  }, [isApproved, setupPhase]);

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
        // iOS can transiently report notDetermined after a previously
        // successful individual authorization. Keep the successful receipt;
        // explicit denial or revocation still replaces it.
        authorizationStatus: current.authorizationStatus === 'approved'
          && authorizationStatus === 'notDetermined'
          ? 'approved'
          : authorizationStatus,
      }));
      reconcileAfterSettingsChange();
    }).finally(() => setAuthorizationChecked(true));
  }, [reconcileAfterSettingsChange, setSettings]);

  useEffect(() => {
    if (setupCompleted) {
      setSetupPhase('manage');
    } else if (authorizationChecked) {
      setSetupPhase('intro');
    }
  }, [authorizationChecked, entrySurface, returnToActivityId, setupCompleted, setupIntent]);

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

  const handleRequestPermission = async (member: ScreenTimeAuthorizationMember = authorizationMember) => {
    setSetupStep('permission');
    const authorizationStatus = await requestScreenTimeAuthorization(member);
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
      ...(authorizationMember === 'child' ? { authorizationMember } : {}),
    } as const;

    navigation.navigate('SettingsScreenTimeRuleBuilder', builderParams);
  };

  const continueFromIntro = () => {
    setAuthorizationMember('individual');
    if (!isApproved) {
      setSetupPhase('permission');
      return;
    }
    openSetupRuleBuilder();
  };

  const continueAsLocalChildSetup = () => {
    setAuthorizationMember('child');
    setSetupPhase('permission');
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
        : 'Allow Screen Time'
      : 'Continue';
  const setupPrimaryDisabled =
    setupPhase === 'permission'
      ? isBusy || isScreenTimeUnavailable
      : false;
  const setupContent = setupStepCopy({
    phase: setupPhase,
    introCopy,
    isScreenTimeUnavailable,
    authorizationMember,
  });
  const familyRows = buildFamilyScreenTimeOverviewRows(householdSnapshot);
  const myRuleRows = buildMyScreenTimeRuleInventory({
    personalSettings: normalized,
  });
  const togglePersonalRule = async (row: ScreenTimeRuleInventoryRow) => {
    if (pendingPersonalRuleId) return;
    const ruleId = row.destination.ruleId;
    const rule = normalized.personalCompositeRules.find((candidate) => candidate.id === ruleId);
    if (!rule) return;
    setPendingPersonalRuleId(ruleId);
    try {
      await savePersonalCompositeScreenTimeRule({
        rule: { ...rule, enabled: !rule.enabled, lastUpdated: new Date().toISOString() },
        expectedUpdatedAt: rule.lastUpdated ?? 'unversioned',
        confirmed: true,
      }, createPersonalCompositeRuleActionBoundary());
      await reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
    } catch (error) {
      if (error instanceof Error && error.message === 'screen_time_advanced_rule_pro_required') {
        openPaywallInterstitial({
          reason: 'pro_advanced_screen_time_rules',
          source: 'screen_time_rule_builder',
          resumeIntent: { kind: 'screen_time_review_rule' },
        });
        return;
      }
      Alert.alert(
        row.enabled ? 'Couldn’t turn off this rule' : 'Couldn’t turn on this rule',
        'Kwilt did not receive confirmation from Screen Time. Nothing was changed.',
      );
    } finally {
      setPendingPersonalRuleId(null);
    }
  };
  const confirmDeletePersonalRule = (row: ScreenTimeRuleInventoryRow) => {
    if (pendingPersonalRuleId) return;
    const ruleId = row.destination.ruleId;
    const rule = normalized.personalCompositeRules.find((candidate) => candidate.id === ruleId);
    if (!rule) return;
    Alert.alert('Delete this rule?', 'These apps will no longer be controlled by this rule.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete rule', style: 'destructive', onPress: () => void (async () => {
        setPendingPersonalRuleId(ruleId);
        try {
          await deletePersonalCompositeScreenTimeRule({
            ruleId: rule.id,
            expectedUpdatedAt: rule.lastUpdated ?? 'unversioned',
            confirmed: true,
          }, createPersonalCompositeRuleActionBoundary());
          await reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
        } catch {
          Alert.alert('Couldn’t delete this rule', 'Kwilt could not turn off its Screen Time restriction. Nothing was changed.');
        } finally {
          setPendingPersonalRuleId(null);
        }
      })() },
    ]);
  };
  const openRule = (row: ScreenTimeRuleInventoryRow) => {
    navigation.navigate('SettingsScreenTimeRuleBuilder', {
      entry: 'inventory',
      ruleId: row.destination.ruleId,
    });
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

      {normalized.ruleSystemCleanupStatus === 'needs_attention' ? (
        <SettingsGroup footer="Kwilt couldn't finish removing older Screen Time controls on this iPhone. Keep Kwilt installed and try again.">
          <SettingsRow
            onPress={() => void ensureCurrentScreenTimeRuleSystem()}
            title="Finish updating Screen Time rules"
            value="Try again"
          />
        </SettingsGroup>
      ) : null}

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
              disabled={isBusy || pendingPersonalRuleId !== null || normalized.authorizationStatus === 'unavailable'}
              onDelete={() => confirmDeletePersonalRule(row)}
              onPress={() => openRule(row)}
              onToggle={() => void togglePersonalRule(row)}
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

  const setupDrawer = authorizationChecked && setupPhase !== 'manage' ? (
    <BottomDrawer
      visible
      onClose={handleCloseSetupDrawer}
      snapPoints={['100%']}
      dismissable
      enableContentPanningGesture
      keyboardAvoidanceEnabled={false}
      sheetStyle={styles.setupDrawerSheet}
      handleStyle={styles.setupDrawerHandle}
    >
      <View style={styles.setupDrawerContent}>
        <View style={styles.ftueSetupLayout}>
          <View style={styles.ftueSetupHeader}>
            <HStack alignItems="center" justifyContent="space-between">
              <View style={styles.ftueProgressTrack}>
                <View style={[styles.ftueProgressFill, { width: `${Math.round((progressStep / 2) * 100)}%` }]} />
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

              {recoveryStep === 'permission_denied' ? (
                <Text style={styles.ftueNotice}>Screen Time access is needed to block apps.</Text>
              ) : null}
            </VStack>
            <View style={styles.ftueVisualSlot}>
              <SetupVisual />
            </View>
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
              {setupPhase === 'intro' ? (
                <Button
                  fullWidth
                  onPress={continueAsLocalChildSetup}
                  variant="ghost"
                >
                  <Text style={styles.ftueSecondaryButtonLabel}>Set up for a child</Text>
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </BottomDrawer>
  ) : null;

  return (
    <>
      <SettingsPage title="Screen Time" onBack={() => navigation.goBack()}>
        {authorizationChecked ? managementContent : null}
      </SettingsPage>
      {setupDrawer}
    </>
  );
}

function SetupVisual() {
  return (
    <View style={styles.setupVisual}>
      <View style={styles.setupPhone}>
        <View style={styles.setupPhoneSpeaker} />
        <View style={styles.setupAppGrid}>
          <View style={styles.setupBlockedApp} />
          <View style={styles.setupKwiltApp}>
            <Icon name="shield" size={22} color={colors.pine700} />
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
    <SettingsGroup
      title={props.title}
      headerAction={(
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
      )}
    >
      {props.isEmpty ? <SettingsRow multiline title={props.emptyCopy} /> : props.children}
    </SettingsGroup>
  );
}

function RuleInventoryRow(props: {
  row: ScreenTimeRuleInventoryRow;
  disabled?: boolean;
  onDelete?: () => void;
  onPress: () => void;
  onToggle?: () => void;
}) {
  const row = props.onToggle ? (
    <SettingsDetailToggleRow
      context={props.row.contextLabel ?? undefined}
      description={props.row.detail}
      disabled={props.disabled}
      enabled={props.row.enabled}
      onPress={props.onPress}
      onToggle={props.onToggle}
      title={props.row.title}
    />
  ) : (
    <SettingsDetailRow
      context={props.row.contextLabel ?? undefined}
      description={props.row.detail}
      disabled={props.disabled}
      onPress={props.onPress}
      state={props.row.enabled ? 'On' : 'Off'}
      title={props.row.title}
    />
  );
  if (!props.onDelete) return row;
  const renderDeleteAction: NonNullable<SwipeableProps['renderRightActions']> = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete ${props.row.title} rule`}
      disabled={props.disabled}
      onPress={props.onDelete}
      style={({ pressed }) => [styles.swipeDeleteAction, pressed ? styles.ruleDraftRowPressed : null]}
    >
      <Icon name="trash" size={19} color={colors.primaryForeground} />
      <Text style={styles.swipeDeleteLabel}>Delete</Text>
    </Pressable>
  );
  return (
    <ReanimatedSwipeable overshootRight={false} renderRightActions={renderDeleteAction} rightThreshold={44}>
      {row}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  setupDrawerSheet: {
    backgroundColor: colors.pine700,
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
  swipeDeleteAction: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.destructive,
  },
  swipeDeleteLabel: {
    ...typography.bodyXs,
    color: colors.primaryForeground,
    fontFamily: typography.titleSm.fontFamily,
  },
});

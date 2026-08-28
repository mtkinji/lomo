import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';
import { useAppStore } from '../../../store/useAppStore';
import {
  getPersonalCompositeScreenTimeRuleById,
  normalizeScreenTimeProtectionSettings,
  type ScreenTimeToken,
} from '../../../services/screenTimeProtection';
import {
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
  transferScreenTimeActivitySelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../../services/screenTimeProtectionRuntime';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { Button } from '../../../ui/Button';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { KwiltSwitch } from '../../../ui/KwiltSwitch';
import { Pressable } from '../../../ui/HapticPressable';
import { Text } from '../../../ui/Typography';
import { SettingsChoiceRow, SettingsDivider, SettingsGroup, SettingsPage } from '../../../ui/SettingsSurface';
import { colors, fonts, radii, spacing, typography } from '../../../theme';
import { DurationPicker } from '../../activities/DurationPicker';
import {
  deletePersonalCompositeScreenTimeRule,
  savePersonalCompositeScreenTimeRule,
} from '../domain/personalCompositeRuleActions';
import {
  migrateLegacyPersonalRule,
  type PersonalCompositeScreenTimeRule,
  type PersonalRuleCondition,
  type PersonalRuleConnector,
  type PersonalRuleOutcome,
} from '../domain/personalCompositeScreenTimeRule';
import { createPersonalCompositeRuleActionBoundary } from '../runtime/personalScreenTimeRuleActionBoundary';
import { PersonalRuleConditionRow } from './PersonalRuleConditionRow';
import type { PersonalScreenTimeRuleBuilderParams } from './personalRuleBuilderLaunch';
import { saveMoneyAppControlSettings } from '../../../capabilities/money/runtime/moneyAppControlStorage';
import { reconcileLatestMoneyAppControls } from '../../../capabilities/money/runtime/moneyAppControlRuntime';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsScreenTimeRuleBuilder'>;
type Route = RouteProp<SettingsStackParamList, 'SettingsScreenTimeRuleBuilder'>;
type RuleTargets = { selectedApps: ScreenTimeToken[]; selectedCategories: ScreenTimeToken[] };
type Drawer = 'condition' | 'connector' | 'outcome' | 'operator' | 'duration' | 'time' | null;

const MINUTE_OPTIONS = Array.from({ length: 288 }, (_, index) => (index + 1) * 5);

function targetLabel(targets: RuleTargets): string {
  const all = [...targets.selectedApps, ...targets.selectedCategories];
  if (!all.length) return 'Choose apps and categories';
  const first = all[0]?.label?.trim();
  if (all.length === 1) return first || '1 app or category';
  return first ? `${first} + ${all.length - 1}` : `${all.length} apps or categories`;
}

function conditionDefault(type: PersonalRuleCondition['type'], id: string): PersonalRuleCondition {
  if (type === 'real_step_complete') return { id, type };
  if (type === 'focus_active') return { id, type, operator: 'is', value: true };
  if (type === 'daily_usage') return { id, type, operator: 'below', minutes: 15 };
  return { id, type, operator: 'after', minuteOfDay: 17 * 60 };
}

function suggestedDraft(params: PersonalScreenTimeRuleBuilderParams, id: string) {
  if (params.suggestedKind === 'focus') {
    return { outcome: 'pause' as const, conditions: [{ id: `${id}:focus`, type: 'focus_active' as const, operator: 'is' as const, value: true as const }] };
  }
  if (params.suggestedKind === 'real_step') {
    return { outcome: 'available' as const, conditions: [{ id: `${id}:real-step`, type: 'real_step_complete' as const }] };
  }
  if (params.suggestedKind === 'daily_limit') {
    const minutes = Number.isInteger(params.suggestedLimitMinutes) ? Number(params.suggestedLimitMinutes) : 10;
    return { outcome: 'pause' as const, conditions: [{ id: `${id}:usage`, type: 'daily_usage' as const, operator: 'reaches' as const, minutes }] };
  }
  return { outcome: 'available' as const, conditions: [] as PersonalRuleCondition[] };
}

export function PersonalScreenTimeRuleBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  return <PersonalScreenTimeRuleBuilderDrawer params={route.params} onClose={() => navigation.goBack()} />;
}

export function PersonalScreenTimeRuleBuilderDrawer(props: { params: PersonalScreenTimeRuleBuilderParams; onClose: () => void }) {
  const { capture } = useAnalytics();
  const settings = useAppStore((state) => state.screenTimeProtection);
  const setSettings = useAppStore((state) => state.setScreenTimeProtection);
  const normalized = useMemo(() => normalizeScreenTimeProtectionSettings(settings), [settings]);
  const existingRule = useMemo(() => {
    if (!props.params.ruleId) return null;
    const composite = getPersonalCompositeScreenTimeRuleById(normalized, props.params.ruleId);
    if (composite) return composite;
    const legacy = normalized.personalRules.find((rule) => rule.id === props.params.ruleId);
    return legacy ? migrateLegacyPersonalRule(legacy) : null;
  }, [normalized, props.params.ruleId]);
  const isEditing = !!existingRule;
  const isReplacingMoney = !!props.params.replacingMoneyCategoryId;
  const [draftRuleId] = useState(() => existingRule?.id ?? `personal_rule_${Crypto.randomUUID()}`);
  const suggestion = useMemo(() => suggestedDraft(props.params, draftRuleId), [draftRuleId, props.params]);
  const [targets, setTargets] = useState<RuleTargets>({
    selectedApps: existingRule?.selectedApps ?? props.params.selectedApps ?? [],
    selectedCategories: existingRule?.selectedCategories ?? props.params.selectedCategories ?? [],
  });
  const [appsConfirmed, setAppsConfirmed] = useState(!!existingRule || isReplacingMoney);
  const [enabled, setEnabled] = useState(existingRule?.enabled ?? true);
  const [connector, setConnector] = useState<PersonalRuleConnector>(existingRule?.connector ?? 'all');
  const [outcome, setOutcome] = useState<PersonalRuleOutcome>(existingRule?.outcome ?? suggestion.outcome);
  const [conditions, setConditions] = useState<PersonalRuleCondition[]>(existingRule?.conditions ?? suggestion.conditions);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [activeConditionId, setActiveConditionId] = useState<string | null>(null);
  const [durationDraft, setDurationDraft] = useState(15);
  const [timeDraft, setTimeDraft] = useState(() => new Date(2026, 0, 1, 17, 0));
  const [choosingApps, setChoosingApps] = useState(false);
  const [saving, setSaving] = useState(false);

  const count = targets.selectedApps.length + targets.selectedCategories.length;
  const label = targetLabel(targets);
  const showComposer = appsConfirmed && count > 0;
  const activeCondition = conditions.find((condition) => condition.id === activeConditionId) ?? null;
  const valid = showComposer && conditions.length > 0;

  const goBack = () => {
    if (showComposer && !isEditing && !isReplacingMoney) {
      setAppsConfirmed(false);
      return;
    }
    props.onClose();
  };

  const chooseApps = async () => {
    setChoosingApps(true);
    if (normalized.authorizationStatus !== 'approved') {
      const authorizationStatus = await requestScreenTimeAuthorization();
      setSettings((current) => ({ ...current, authorizationStatus, lastUpdated: new Date().toISOString() }));
      if (authorizationStatus !== 'approved') {
        setChoosingApps(false);
        Alert.alert('Screen Time access needed', 'Allow Screen Time access to choose apps for this rule.');
        return;
      }
    }
    const selection = await presentScreenTimeActivityPicker(targets, { selectionId: draftRuleId });
    setChoosingApps(false);
    if (!selection) return;
    const next = {
      selectedApps: selection.selectedApps ?? targets.selectedApps,
      selectedCategories: selection.selectedCategories ?? targets.selectedCategories,
    };
    setTargets(next);
    setAppsConfirmed(next.selectedApps.length + next.selectedCategories.length > 0);
  };

  const openCondition = (conditionId?: string) => {
    setActiveConditionId(conditionId ?? null);
    setDrawer('condition');
  };

  const chooseConditionType = (type: PersonalRuleCondition['type']) => {
    if (activeConditionId) {
      setConditions((current) => current.map((condition) => condition.id === activeConditionId
        ? conditionDefault(type, condition.id)
        : condition));
    } else {
      const id = `${draftRuleId}:condition:${conditions.length}:${Crypto.randomUUID()}`;
      setConditions((current) => [...current, conditionDefault(type, id)]);
    }
    setDrawer(null);
    setActiveConditionId(null);
  };

  const removeCondition = () => {
    if (!activeConditionId) return;
    setConditions((current) => current.filter((condition) => condition.id !== activeConditionId));
    setActiveConditionId(null);
    setDrawer(null);
  };

  const openOperator = (condition: PersonalRuleCondition) => {
    setActiveConditionId(condition.id);
    setDrawer('operator');
  };

  const setOperator = (operator: string) => {
    if (!activeConditionId) return;
    setConditions((current) => current.map((condition) => {
      if (condition.id !== activeConditionId) return condition;
      if (condition.type === 'focus_active') return { ...condition, operator: operator as 'is' | 'is_not' };
      if (condition.type === 'daily_usage') return { ...condition, operator: operator as 'below' | 'reaches' };
      if (condition.type === 'time_of_day') return { ...condition, operator: operator as 'after' | 'before' };
      return condition;
    }));
    setDrawer(null);
  };

  const openValue = (condition: PersonalRuleCondition) => {
    setActiveConditionId(condition.id);
    if (condition.type === 'daily_usage') {
      setDurationDraft(condition.minutes);
      setDrawer('duration');
    } else if (condition.type === 'time_of_day') {
      setTimeDraft(new Date(2026, 0, 1, Math.floor(condition.minuteOfDay / 60), condition.minuteOfDay % 60));
      setDrawer('time');
    }
  };

  const commitValue = () => {
    if (!activeConditionId) return;
    setConditions((current) => current.map((condition) => {
      if (condition.id !== activeConditionId) return condition;
      if (condition.type === 'daily_usage') return { ...condition, minutes: durationDraft };
      if (condition.type === 'time_of_day') return { ...condition, minuteOfDay: timeDraft.getHours() * 60 + timeDraft.getMinutes() };
      return condition;
    }));
    setDrawer(null);
  };

  const saveRule = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const rule: PersonalCompositeScreenTimeRule = {
      id: draftRuleId, selectionId: draftRuleId,
      selectedApps: targets.selectedApps, selectedCategories: targets.selectedCategories,
      enabled, setupCompleted: true, connector, outcome, conditions,
      lastUpdated: new Date().toISOString(),
    };
    if (props.params.sourceSelectionId && props.params.sourceSelectionId !== draftRuleId) {
      const transferred = await transferScreenTimeActivitySelection({
        sourceSelectionId: props.params.sourceSelectionId, targetSelectionId: draftRuleId,
      });
      if (!transferred) {
        setSaving(false);
        Alert.alert('Couldn’t carry over the selected apps', 'Return to the previous rule and try again.');
        return;
      }
    }
    try {
      await savePersonalCompositeScreenTimeRule({
        rule, expectedUpdatedAt: existingRule?.lastUpdated ?? null, confirmed: true,
      }, createPersonalCompositeRuleActionBoundary());
      if (props.params.replacingMoneyCategoryId) {
        await saveMoneyAppControlSettings((current) => {
          const policies = { ...current.policies };
          delete policies[props.params.replacingMoneyCategoryId!];
          return { ...current, policies };
        });
        await reconcileLatestMoneyAppControls();
      }
    } catch (error) {
      setSaving(false);
      if (!Device.isDevice) {
        Alert.alert('A physical device is required', 'The Simulator can preview this rule, but Apple Screen Time can only enforce it in an entitlement-enabled build on a physical iPhone.');
        return;
      }
      Alert.alert(isEditing ? 'Couldn’t update this rule' : 'Couldn’t turn on this rule',
        error instanceof Error && error.message === 'duplicate_personal_screen_time_rule'
          ? 'The same apps and conditions are already saved.'
          : 'Kwilt did not receive confirmation from Screen Time. Try again before leaving setup.');
      return;
    }
    capture(AnalyticsEvent.ScreenTimeSetupCompleted, {
      setup_intent: props.params.setupIntent ?? 'settings_discovery',
      surface: props.params.entrySurface ?? 'settings',
      rule: 'composite',
    });
    await reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
    props.onClose();
  };

  const deleteRule = () => {
    if (!existingRule?.lastUpdated) return;
    Alert.alert('Delete this rule?', 'These apps will no longer be controlled by this rule.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete rule', style: 'destructive', onPress: () => void (async () => {
        setSaving(true);
        try {
          await deletePersonalCompositeScreenTimeRule({
            ruleId: existingRule.id, expectedUpdatedAt: existingRule.lastUpdated!, confirmed: true,
          }, createPersonalCompositeRuleActionBoundary());
        } catch {
          setSaving(false);
          Alert.alert('Couldn’t delete this rule', 'Kwilt could not turn off its Screen Time restriction. Nothing was changed.');
          return;
        }
        props.onClose();
      })() },
    ]);
  };

  const conditionTypes: Array<{ type: PersonalRuleCondition['type']; label: string }> = [
    { type: 'time_of_day', label: 'Time of day' },
    { type: 'daily_usage', label: 'Daily use' },
    { type: 'focus_active', label: 'Focus' },
    { type: 'real_step_complete', label: 'Real step' },
  ];

  return (
    <SettingsPage onBack={goBack} title={isEditing || isReplacingMoney ? 'Edit rule' : 'Add rule'} contentStyle={styles.content}>
      {!showComposer ? (
        <View style={styles.intro}>
          <Text style={styles.question}>Which apps should this rule manage?</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Apps and categories" disabled={choosingApps}
            onPress={() => void chooseApps()} style={({ pressed }) => [styles.targetPicker, pressed ? styles.pressed : null]}>
            <Text style={styles.targetPickerText}>{choosingApps ? 'Opening…' : label}</Text>
            <Text aria-hidden style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={`Change apps and categories. ${label}`} onPress={() => void chooseApps()}>
            <Text style={styles.question}>Rule for {label}</Text>
          </Pressable>
          {isEditing ? (
            <View style={styles.enabledRow}>
              <Text style={styles.enabledLabel}>Rule enabled</Text>
              <KwiltSwitch style={styles.switchTarget} tone="neutral" accessibilityLabel="Rule enabled" value={enabled} onPress={() => setEnabled((value) => !value)} />
            </View>
          ) : null}

          <View style={styles.builderSection}>
            <Text style={styles.sectionTitle}>When</Text>
            <View style={styles.conditionStack}>
              {conditions.map((condition, index) => (
                <View key={condition.id}>
                  {index > 0 ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Change ${connector === 'all' ? 'AND' : 'OR'} connector`}
                      onPress={() => setDrawer('connector')} style={styles.connector}>
                      <Text style={styles.connectorText}>{connector === 'all' ? 'AND' : 'OR'}  ⌄</Text>
                    </Pressable>
                  ) : null}
                  <PersonalRuleConditionRow condition={condition} onEditField={() => openCondition(condition.id)}
                    onEditOperator={() => openOperator(condition)} onEditValue={() => openValue(condition)} />
                </View>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => openCondition()} style={styles.addCondition}>
              <Text style={styles.addConditionText}>＋ Add condition</Text>
            </Pressable>
          </View>

          <View style={styles.builderSection}>
            <Text style={styles.sectionTitle}>Then</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Change outcome" onPress={() => setDrawer('outcome')}
              style={({ pressed }) => [styles.outcome, pressed ? styles.pressed : null]}>
              <Text style={styles.outcomeText}>{outcome === 'available' ? `Make ${label} available` : `Pause ${label}`}</Text>
              <Text aria-hidden style={styles.chevron}>›</Text>
            </Pressable>
          </View>

          <View style={styles.action}>
            <Button fullWidth size="lg" variant="primary" disabled={!valid} loading={saving} loadingLabel="Saving…" onPress={() => void saveRule()}>
              {isEditing || isReplacingMoney ? 'Save changes' : 'Add rule'}
            </Button>
          </View>
          {isEditing ? (
            <Pressable accessibilityRole="button" disabled={saving} onPress={deleteRule} style={styles.deleteAction}>
              <Text style={styles.deleteText}>Delete rule</Text>
            </Pressable>
          ) : null}
        </>
      )}

      <BottomDrawer visible={drawer !== null} onClose={() => setDrawer(null)}
        snapPoints={[drawer === 'duration' || drawer === 'time' ? '54%' : '48%']} keyboardAvoidanceEnabled={false}
        footer={drawer === 'duration' || drawer === 'time' ? { primaryAction: { label: 'Done', onPress: commitValue } } : undefined}>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader title={drawer === 'condition' ? (activeConditionId ? 'Condition' : 'Add condition')
            : drawer === 'connector' ? 'Match conditions' : drawer === 'outcome' ? 'Then'
              : drawer === 'operator' ? 'Operator' : drawer === 'duration' ? 'Daily use' : 'Time of day'}
            variant="withClose" onClose={() => setDrawer(null)} closeAccessibilityLabel="Close" />
          {drawer === 'condition' ? (
            <SettingsGroup>
              {conditionTypes.map((item, index) => {
                const selected = activeCondition?.type === item.type;
                const alreadyUsed = !selected && conditions.some((condition) => condition.type === item.type);
                return <View key={item.type}>{index > 0 ? <SettingsDivider /> : null}
                  <SettingsChoiceRow disabled={alreadyUsed} selected={selected} title={item.label} onPress={() => chooseConditionType(item.type)} />
                </View>;
              })}
              {activeConditionId ? <><SettingsDivider /><Pressable accessibilityRole="button" onPress={removeCondition} style={styles.drawerDestructive}><Text style={styles.deleteText}>Remove condition</Text></Pressable></> : null}
            </SettingsGroup>
          ) : drawer === 'connector' ? (
            <SettingsGroup>
              <SettingsChoiceRow selected={connector === 'all'} title="All conditions (AND)" onPress={() => { setConnector('all'); setDrawer(null); }} />
              <SettingsDivider /><SettingsChoiceRow selected={connector === 'any'} title="Any condition (OR)" onPress={() => { setConnector('any'); setDrawer(null); }} />
            </SettingsGroup>
          ) : drawer === 'outcome' ? (
            <SettingsGroup>
              <SettingsChoiceRow selected={outcome === 'available'} title={`Make ${label} available`} onPress={() => { setOutcome('available'); setDrawer(null); }} />
              <SettingsDivider /><SettingsChoiceRow selected={outcome === 'pause'} title={`Pause ${label}`} onPress={() => { setOutcome('pause'); setDrawer(null); }} />
            </SettingsGroup>
          ) : drawer === 'operator' && activeCondition?.type === 'focus_active' ? (
            <SettingsGroup><SettingsChoiceRow selected={activeCondition.operator === 'is'} title="is" onPress={() => setOperator('is')} />
              <SettingsDivider /><SettingsChoiceRow selected={activeCondition.operator === 'is_not'} title="is not" onPress={() => setOperator('is_not')} /></SettingsGroup>
          ) : drawer === 'operator' && activeCondition?.type === 'daily_usage' ? (
            <SettingsGroup><SettingsChoiceRow selected={activeCondition.operator === 'below'} title="is below" onPress={() => setOperator('below')} />
              <SettingsDivider /><SettingsChoiceRow selected={activeCondition.operator === 'reaches'} title="reaches" onPress={() => setOperator('reaches')} /></SettingsGroup>
          ) : drawer === 'operator' && activeCondition?.type === 'time_of_day' ? (
            <SettingsGroup><SettingsChoiceRow selected={activeCondition.operator === 'after'} title="is after" onPress={() => setOperator('after')} />
              <SettingsDivider /><SettingsChoiceRow selected={activeCondition.operator === 'before'} title="is before" onPress={() => setOperator('before')} /></SettingsGroup>
          ) : drawer === 'duration' ? (
            <DurationPicker valueMinutes={durationDraft} onChangeMinutes={setDurationDraft} optionsMinutes={MINUTE_OPTIONS}
              accessibilityLabel="Select daily use" iosWheelHeight={180} showHelperText={false} iosUseEdgeFades={false} />
          ) : drawer === 'time' ? (
            <DateTimePicker value={timeDraft} mode="time" display="spinner" onChange={(_event, date) => date && setTimeDraft(date)} />
          ) : null}
        </BottomDrawerScrollView>
      </BottomDrawer>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  intro: { gap: spacing.lg },
  question: { ...typography.titleLg, color: colors.textPrimary, letterSpacing: -0.7 },
  targetPicker: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.canvas },
  targetPickerText: { ...typography.body, fontFamily: fonts.semibold, color: colors.textPrimary },
  chevron: { color: colors.textSecondary, fontSize: 24 },
  enabledRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  enabledLabel: { ...typography.bodySm, color: colors.textSecondary },
  switchTarget: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  builderSection: { marginTop: spacing.xl },
  sectionTitle: { ...typography.titleSm, color: colors.textPrimary, marginBottom: spacing.sm },
  conditionStack: { gap: 0 },
  connector: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  connectorText: { ...typography.caption, fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 0.5 },
  addCondition: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.xs },
  addConditionText: { ...typography.bodySm, fontFamily: fonts.semibold, color: colors.textPrimary },
  outcome: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radii.input, backgroundColor: colors.canvas },
  outcomeText: { ...typography.body, fontFamily: fonts.semibold, color: colors.textPrimary },
  action: { marginTop: spacing.xl },
  deleteAction: { minHeight: 48, justifyContent: 'center', marginTop: spacing['2xl'], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  deleteText: { ...typography.body, color: colors.destructive },
  pressed: { opacity: 0.65 },
  drawerContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  drawerDestructive: { minHeight: 54, justifyContent: 'center', paddingHorizontal: spacing.md },
});

import { useMemo, useRef, useState } from 'react';
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
} from '../../../services/appleEcosystem/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../../services/screenTimeProtectionRuntime';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { Button } from '../../../ui/Button';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Pressable } from '../../../ui/HapticPressable';
import { Text } from '../../../ui/Typography';
import { SettingsChoiceRow, SettingsDivider, SettingsGroup, SettingsPage } from '../../../ui/SettingsSurface';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { colors, fonts, radii, spacing, typography } from '../../../theme';
import { DurationPicker } from '../../activities/DurationPicker';
import {
  deletePersonalCompositeScreenTimeRule,
  savePersonalCompositeScreenTimeRule,
} from '../domain/personalCompositeRuleActions';
import {
  type PersonalCompositeScreenTimeRule,
  type PersonalRuleCondition,
  type PersonalRuleConnector,
  type PersonalRuleOutcome,
} from '../domain/personalCompositeScreenTimeRule';
import { createPersonalCompositeRuleActionBoundary } from '../runtime/personalScreenTimeRuleActionBoundary';
import { PersonalRuleConditionRow } from './PersonalRuleConditionRow';
import { RuleSentencePickerField } from './RuleSentencePickerField';
import type { PersonalScreenTimeRuleBuilderParams } from './personalRuleBuilderLaunch';
import { createMoneyRepository } from '../../../capabilities/money/data/moneyRepository';
import type { MoneyCategory } from '../../../capabilities/money/data/moneySnapshot';
import type { MoneyAppControlPreset } from '../../../capabilities/money/domain/moneyAppControl';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsScreenTimeRuleBuilder'>;
type Route = RouteProp<SettingsStackParamList, 'SettingsScreenTimeRuleBuilder'>;
type RuleTargets = { selectedApps: ScreenTimeToken[]; selectedCategories: ScreenTimeToken[] };
type Drawer = 'condition' | 'budget' | 'budgetPreset' | 'connector' | 'outcome' | 'operator' | 'duration' | 'time' | null;

const MINUTE_OPTIONS = Array.from({ length: 288 }, (_, index) => (index + 1) * 5);

function targetLabel(targets: RuleTargets): string {
  const all = [...targets.selectedApps, ...targets.selectedCategories];
  if (!all.length) return 'Choose apps and categories';
  const labels = all.map((target) => target.label?.trim()).filter((label): label is string => !!label);
  if (labels.length === all.length) {
    if (labels.length === 1) return labels[0];
    if (labels.every((label) => /^\d+\s+(apps?|categor(?:y|ies))$/i.test(label))) return labels.join(' + ');
    return `${labels[0]} + ${labels.length - 1}`;
  }
  const appCount = targets.selectedApps.length;
  const categoryCount = targets.selectedCategories.length;
  if (appCount && categoryCount) return `${appCount} app${appCount === 1 ? '' : 's'} + ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`;
  if (categoryCount) return `${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`;
  return `${appCount} app${appCount === 1 ? '' : 's'}`;
}

function conditionDefault(type: PersonalRuleCondition['type'], id: string): PersonalRuleCondition {
  if (type === 'real_step_complete') return { id, type, operator: 'is' };
  if (type === 'focus_active') return { id, type, operator: 'is', value: true };
  if (type === 'daily_usage') return { id, type, operator: 'below', minutes: 15 };
  if (type === 'time_of_day') return { id, type, operator: 'after', minuteOfDay: 17 * 60 };
  throw new Error('A budget condition requires a selected budget.');
}

function suggestedDraft(params: PersonalScreenTimeRuleBuilderParams, id: string) {
  if (params.suggestedBudgetCondition) {
    return {
      outcome: 'pause' as const,
      conditions: [{
        id: `${id}:budget`,
        type: 'budget' as const,
        categorySourceId: params.suggestedBudgetCondition.categorySourceId,
        categoryName: params.suggestedBudgetCondition.categoryName,
        preset: params.suggestedBudgetCondition.preset ?? 'when_over',
      }],
    };
  }
  if (params.suggestedKind === 'focus') {
    return { outcome: 'pause' as const, conditions: [{ id: `${id}:focus`, type: 'focus_active' as const, operator: 'is' as const, value: true as const }] };
  }
  if (params.suggestedKind === 'real_step') {
    return { outcome: 'available' as const, conditions: [{ id: `${id}:real-step`, type: 'real_step_complete' as const, operator: 'is' as const }] };
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
    return getPersonalCompositeScreenTimeRuleById(normalized, props.params.ruleId);
  }, [normalized, props.params.ruleId]);
  const isEditing = !!existingRule;
  const [draftRuleId] = useState(() => existingRule?.id ?? `personal_rule_${Crypto.randomUUID()}`);
  const suggestion = useMemo(() => suggestedDraft(props.params, draftRuleId), [draftRuleId, props.params]);
  const [targets, setTargets] = useState<RuleTargets>({
    selectedApps: existingRule?.selectedApps ?? props.params.selectedApps ?? [],
    selectedCategories: existingRule?.selectedCategories ?? props.params.selectedCategories ?? [],
  });
  const [appsConfirmed, setAppsConfirmed] = useState(!!existingRule);
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
  const [budgets, setBudgets] = useState<MoneyCategory[]>([]);
  const [budgetDraft, setBudgetDraft] = useState<Pick<Extract<PersonalRuleCondition, { type: 'budget' }>, 'categorySourceId' | 'categoryName'> | null>(null);
  const authorizationConfirmedRef = useRef(false);

  const count = targets.selectedApps.length + targets.selectedCategories.length;
  const label = targetLabel(targets);
  const showComposer = appsConfirmed && count > 0;
  const activeCondition = conditions.find((condition) => condition.id === activeConditionId) ?? null;
  const valid = showComposer && conditions.length > 0;

  const goBack = () => {
    if (showComposer && !isEditing) {
      setAppsConfirmed(false);
      return;
    }
    props.onClose();
  };

  const confirmAuthorization = async () => {
    if (authorizationConfirmedRef.current) return 'approved' as const;
    const authorizationStatus = await requestScreenTimeAuthorization();
    setSettings((current) => ({ ...current, authorizationStatus, lastUpdated: new Date().toISOString() }));
    authorizationConfirmedRef.current = authorizationStatus === 'approved';
    return authorizationStatus;
  };

  const chooseApps = async () => {
    setChoosingApps(true);
    const authorizationStatus = await confirmAuthorization();
    if (authorizationStatus !== 'approved') {
      setChoosingApps(false);
      Alert.alert('Screen Time access needed', 'Allow Screen Time access to choose apps for this rule.');
      return;
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

  const openConditionField = async (condition: PersonalRuleCondition) => {
    setActiveConditionId(condition.id);
    if (condition.type !== 'budget') {
      setDrawer('condition');
      return;
    }
    const snapshot = await createMoneyRepository().loadSnapshot().catch(() => null);
    setBudgets(snapshot?.categories.filter((category) => category.planRole !== 'protected') ?? []);
    setDrawer('budget');
  };

  const chooseConditionType = async (type: PersonalRuleCondition['type']) => {
    if (type === 'budget') {
      const snapshot = await createMoneyRepository().loadSnapshot().catch(() => null);
      setBudgets(snapshot?.categories.filter((category) => category.planRole !== 'protected') ?? []);
      setDrawer('budget');
      return;
    }
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

  const chooseBudget = (category: MoneyCategory) => {
    setBudgetDraft({ categorySourceId: category.sourceId, categoryName: category.name });
    setDrawer('budgetPreset');
  };

  const chooseBudgetPreset = (preset: MoneyAppControlPreset) => {
    if (!budgetDraft) return;
    const id = activeConditionId ?? `${draftRuleId}:condition:${conditions.length}:${Crypto.randomUUID()}`;
    const condition: PersonalRuleCondition = { id, type: 'budget', ...budgetDraft, preset };
    setConditions((current) => activeConditionId
      ? current.map((candidate) => candidate.id === activeConditionId ? condition : candidate)
      : [...current, condition]);
    setBudgetDraft(null);
    setActiveConditionId(null);
    setDrawer(null);
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
      if (condition.type === 'real_step_complete') return { ...condition, operator: operator as 'is' | 'is_not' };
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
    } else if (condition.type === 'budget') {
      setBudgetDraft({ categorySourceId: condition.categorySourceId, categoryName: condition.categoryName });
      setDrawer('budgetPreset');
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
      temporaryOpenUntilIso: existingRule?.temporaryOpenUntilIso ?? null,
      lastUpdated: new Date().toISOString(),
    };
    try {
      // Revalidate at the user-initiated write boundary. A cached approval can
      // outlive AuthorizationCenter's in-process status across app launches.
      const authorizationStatus = await confirmAuthorization();
      if (authorizationStatus !== 'approved') {
        throw new Error('screen_time_rule_authorization_required');
      }
      await savePersonalCompositeScreenTimeRule({
        rule,
        expectedUpdatedAt: existingRule ? existingRule.lastUpdated ?? 'unversioned' : null,
        confirmed: true,
      }, createPersonalCompositeRuleActionBoundary());
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
    if (!existingRule) return;
    Alert.alert('Delete this rule?', 'These apps will no longer be controlled by this rule.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete rule', style: 'destructive', onPress: () => void (async () => {
        setSaving(true);
        try {
          await deletePersonalCompositeScreenTimeRule({
            ruleId: existingRule.id,
            expectedUpdatedAt: existingRule.lastUpdated ?? 'unversioned',
            confirmed: true,
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

  const setRuleEnabledImmediately = async (nextEnabled: boolean) => {
    if (!existingRule || saving || existingRule.enabled === nextEnabled) return;
    setSaving(true);
    const nextRule: PersonalCompositeScreenTimeRule = {
      ...existingRule,
      enabled: nextEnabled,
      lastUpdated: new Date().toISOString(),
    };
    try {
      await savePersonalCompositeScreenTimeRule({
        rule: nextRule,
        expectedUpdatedAt: existingRule.lastUpdated ?? 'unversioned',
        confirmed: true,
      }, createPersonalCompositeRuleActionBoundary());
      setEnabled(nextEnabled);
      await reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
    } catch {
      Alert.alert(
        nextEnabled ? 'Couldn’t turn on this rule' : 'Couldn’t turn off this rule',
        'Kwilt did not receive confirmation from Screen Time. Nothing was changed.',
      );
    } finally {
      setSaving(false);
    }
  };

  const lifecycleMenu = isEditing ? (
    <DropdownMenu>
      <DropdownMenuTrigger accessibilityLabel="Rule actions">
        <View pointerEvents="none" style={styles.headerMenuTrigger}>
          <Icon name="navMore" size={22} color={colors.textPrimary} />
        </View>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuItem
          disabled={saving}
          icon={enabled ? 'pause' : 'play'}
          label={enabled ? 'Turn off rule' : 'Turn on rule'}
          onPress={() => void setRuleEnabledImmediately(!enabled)}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={saving} icon="trash" label="Delete rule" onPress={deleteRule} variant="destructive" />
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const conditionTypes: Array<{ type: PersonalRuleCondition['type']; label: string }> = [
    { type: 'time_of_day', label: 'Time of day' },
    { type: 'daily_usage', label: 'Daily use' },
    { type: 'focus_active', label: 'Focus' },
    { type: 'real_step_complete', label: 'Real step' },
    { type: 'budget', label: 'Budget' },
  ];

  const budgetPresets: Array<{ preset: MoneyAppControlPreset; label: string }> = [
    { preset: 'always_review', label: 'This budget needs review' },
    { preset: 'when_hot', label: 'Spending is ahead of the month' },
    { preset: 'at_95_percent', label: '95% of this budget is used' },
    { preset: 'when_over', label: 'This budget is fully used' },
    { preset: 'needs_review', label: 'Transactions need review' },
  ];

  return (
    <SettingsPage onBack={goBack} title={isEditing ? 'Edit rule' : 'Add rule'}
      headerAction={isEditing ? lifecycleMenu : <Text style={styles.stepCount}>{showComposer ? '2 of 2' : '1 of 2'}</Text>}
      contentStyle={styles.content}>
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
          <View style={styles.builderSection}>
            <Text style={styles.sectionTitle}>Rule behavior</Text>
            <View style={styles.behaviorWell}>
              <RuleSentencePickerField accessibilityLabel={`Rule outcome: ${outcome === 'available' ? 'Allow access' : 'Pause access'}`}
                onPress={() => setDrawer('outcome')} value={outcome === 'available' ? 'Allow access' : 'Pause access'} style={styles.behaviorField} />
              <Text style={styles.sentenceText}>to</Text>
              <RuleSentencePickerField accessibilityLabel={`Change apps and categories. ${label}`}
                onPress={() => void chooseApps()} value={label} style={styles.targetField} />
            </View>
          </View>

          <View style={styles.conditionsSection}>
            <Text style={styles.sectionTitle}>When</Text>
            <View style={styles.conditionWell}>
              <View testID="rule-conditions" style={styles.conditionsStack}>
                {conditions.map((condition, index) => (
                  <View key={condition.id} style={styles.conditionBlock}>
                    {index > 0 ? <RuleSentencePickerField accessibilityLabel={`Change ${connector === 'all' ? 'AND' : 'OR'} connector`}
                      onPress={() => setDrawer('connector')} value={connector === 'all' ? 'AND' : 'OR'} style={styles.connectorField} /> : null}
                    <PersonalRuleConditionRow condition={condition} onEditField={() => void openConditionField(condition)}
                      onEditOperator={() => openOperator(condition)} onEditValue={() => openValue(condition)} />
                  </View>
                ))}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="＋ Add condition" onPress={() => openCondition()} style={styles.addCondition}>
                <Text style={styles.addConditionText}>＋ Add condition</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.action}>
            <Button fullWidth size="lg" variant="primary" disabled={!valid} loading={saving} loadingLabel="Saving…" onPress={() => void saveRule()}>
              {isEditing ? 'Save changes' : 'Add rule'}
            </Button>
          </View>
        </>
      )}

      <BottomDrawer visible={drawer !== null} onClose={() => setDrawer(null)}
        snapPoints={[drawer === 'duration' || drawer === 'time' ? '54%' : '48%']} keyboardAvoidanceEnabled={false}
        footer={drawer === 'duration' || drawer === 'time' ? { primaryAction: { label: 'Done', onPress: commitValue } } : undefined}>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader title={drawer === 'condition' ? (activeConditionId ? 'Condition' : 'Add condition')
            : drawer === 'budget' ? 'Choose a budget' : drawer === 'budgetPreset' ? 'Budget condition'
              : drawer === 'connector' ? 'Match conditions' : drawer === 'outcome' ? 'Access'
              : drawer === 'operator' ? 'Operator' : drawer === 'duration' ? 'Daily use' : 'Time of day'}
            variant="withClose" onClose={() => setDrawer(null)} closeAccessibilityLabel="Close" />
          {drawer === 'condition' ? (
            <SettingsGroup>
              {conditionTypes.map((item) => {
                const selected = activeCondition?.type === item.type;
                const alreadyUsed = item.type !== 'budget' && !selected && conditions.some((condition) => condition.type === item.type);
                return <View key={item.type}>
                  <SettingsChoiceRow disabled={alreadyUsed} selected={selected} title={item.label} onPress={() => void chooseConditionType(item.type)} />
                </View>;
              })}
              {activeConditionId ? <><SettingsDivider /><Pressable accessibilityRole="button" onPress={removeCondition} style={styles.drawerDestructive}><Text style={styles.deleteText}>Remove condition</Text></Pressable></> : null}
            </SettingsGroup>
          ) : drawer === 'budget' ? (
            <SettingsGroup>
              {budgets.map((category) => <SettingsChoiceRow key={category.sourceId} selected={activeCondition?.type === 'budget' && activeCondition.categorySourceId === category.sourceId}
                title={category.name} onPress={() => chooseBudget(category)} />)}
            </SettingsGroup>
          ) : drawer === 'budgetPreset' ? (
            <SettingsGroup>
              {budgetPresets.map((item) => <SettingsChoiceRow key={item.preset} selected={activeCondition?.type === 'budget' && activeCondition.preset === item.preset}
                title={item.label} onPress={() => chooseBudgetPreset(item.preset)} />)}
            </SettingsGroup>
          ) : drawer === 'connector' ? (
            <SettingsGroup>
              <SettingsChoiceRow selected={connector === 'all'} title="All conditions (AND)" onPress={() => { setConnector('all'); setDrawer(null); }} />
              <SettingsDivider /><SettingsChoiceRow selected={connector === 'any'} title="Any condition (OR)" onPress={() => { setConnector('any'); setDrawer(null); }} />
            </SettingsGroup>
          ) : drawer === 'outcome' ? (
            <SettingsGroup>
              <SettingsChoiceRow selected={outcome === 'available'} title="Allow access" onPress={() => { setOutcome('available'); setDrawer(null); }} />
              <SettingsDivider /><SettingsChoiceRow selected={outcome === 'pause'} title="Pause access" onPress={() => { setOutcome('pause'); setDrawer(null); }} />
            </SettingsGroup>
          ) : drawer === 'operator' && (activeCondition?.type === 'real_step_complete' || activeCondition?.type === 'focus_active') ? (
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
  stepCount: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textSecondary },
  targetPicker: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.canvas },
  targetPickerText: { ...typography.body, fontFamily: fonts.semibold, color: colors.textPrimary },
  chevron: { color: colors.textSecondary, fontSize: 24 },
  headerMenuTrigger: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  builderSection: { marginTop: spacing.md },
  conditionsSection: { marginTop: spacing.lg },
  sectionTitle: { ...typography.titleSm, color: colors.textPrimary, marginBottom: spacing.sm },
  behaviorWell: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.sm, borderRadius: radii.card, backgroundColor: colors.canvas, padding: spacing.md },
  behaviorField: { flex: 1.1, minWidth: 0 },
  targetField: { flex: 1, minWidth: 0 },
  conditionWell: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.canvas, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sentenceText: { ...typography.body, color: colors.textPrimary },
  conditionsStack: { gap: spacing.sm },
  conditionBlock: { gap: spacing.sm },
  connectorField: { width: 92 },
  addCondition: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.xs },
  addConditionText: { ...typography.bodySm, fontFamily: fonts.semibold, color: colors.textPrimary },
  action: { marginTop: spacing.xl },
  deleteText: { ...typography.body, color: colors.destructive },
  pressed: { opacity: 0.65 },
  drawerContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  drawerDestructive: { minHeight: 54, justifyContent: 'center', paddingHorizontal: spacing.md },
});

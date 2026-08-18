import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';
import { useAppStore } from '../../../store/useAppStore';
import {
  addPersonalScreenTimeRule,
  createPersonalScreenTimeRule,
  getAvailablePersonalScreenTimeRuleKinds,
  normalizeScreenTimeProtectionSettings,
  type PersonalScreenTimeRuleKind,
  type ScreenTimeToken,
} from '../../../services/screenTimeProtection';
import {
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../../services/screenTimeProtectionRuntime';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon, type IconName } from '../../../ui/Icon';
import { Text } from '../../../ui/primitives';
import { colors, spacing, typography } from '../../../theme';
import {
  getPersonalRuleBuilderCopy,
  getPersonalRuleBuilderStep,
  personalRuleBehaviorLabel,
  personalRuleSentence,
} from './personalRuleBuilderModel';
import type { PersonalScreenTimeRuleBuilderParams } from './personalRuleBuilderLaunch';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsScreenTimeRuleBuilder'>;
type Route = RouteProp<SettingsStackParamList, 'SettingsScreenTimeRuleBuilder'>;

type RuleTargets = {
  selectedApps: ScreenTimeToken[];
  selectedCategories: ScreenTimeToken[];
};

function targetLabel(targets: RuleTargets): string {
  const allTargets = [...targets.selectedApps, ...targets.selectedCategories];
  if (allTargets.length === 0) return 'Not chosen';
  const firstLabel = allTargets[0]?.label?.trim();
  if (allTargets.length === 1) return firstLabel || '1 app or category';
  return firstLabel
    ? `${firstLabel} + ${allTargets.length - 1}`
    : `${allTargets.length} apps or categories`;
}

export function PersonalScreenTimeRuleBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  return (
    <PersonalScreenTimeRuleBuilderDrawer
      params={route.params}
      onClose={() => navigation.goBack()}
    />
  );
}

export function PersonalScreenTimeRuleBuilderDrawer(props: {
  params: PersonalScreenTimeRuleBuilderParams;
  onClose: () => void;
}) {
  const { capture } = useAnalytics();
  const settings = useAppStore((state) => state.screenTimeProtection);
  const setSettings = useAppStore((state) => state.setScreenTimeProtection);
  const normalized = useMemo(() => normalizeScreenTimeProtectionSettings(settings), [settings]);
  const availableKinds = useMemo(
    () => getAvailablePersonalScreenTimeRuleKinds(normalized),
    [normalized],
  );
  const entry = props.params.entry;
  const suggestedKind = props.params.suggestedKind;
  const suggestedLimitMinutes = Number.isInteger(props.params.suggestedLimitMinutes)
    && Number(props.params.suggestedLimitMinutes) >= 1
    && Number(props.params.suggestedLimitMinutes) <= 1440
    ? Number(props.params.suggestedLimitMinutes)
    : 10;
  const [draftRuleId] = useState(() => `personal_rule_${Crypto.randomUUID()}`);
  const [kind, setKind] = useState<PersonalScreenTimeRuleKind | null>(() => (
    suggestedKind && availableKinds.includes(suggestedKind) ? suggestedKind : null
  ));
  const [targets, setTargets] = useState<RuleTargets>({ selectedApps: [], selectedCategories: [] });
  const [appsConfirmed, setAppsConfirmed] = useState(false);
  const [choosingApps, setChoosingApps] = useState(false);
  const [saving, setSaving] = useState(false);
  const count = targets.selectedApps.length + targets.selectedCategories.length;
  const targetsLabel = targetLabel(targets);
  const step = getPersonalRuleBuilderStep({ kind, targetCount: count, appsConfirmed });
  const copy = getPersonalRuleBuilderCopy({
    entry,
    kind,
    step,
    targetLabel: appsConfirmed && count > 0 ? targetsLabel : undefined,
    limitMinutes: suggestedLimitMinutes,
    suggestedAppLabel: props.params.suggestedAppLabel,
  });
  const isContextualFlow = entry === 'contextual' && Boolean(suggestedKind);
  const totalSteps = isContextualFlow ? 2 : 3;
  const progressStep = step === 'apps' ? 1 : step === 'behavior' ? 2 : totalSteps;

  const chooseApps = async () => {
    setChoosingApps(true);
    if (normalized.authorizationStatus !== 'approved') {
      const authorizationStatus = await requestScreenTimeAuthorization();
      setSettings((current) => ({
        ...current,
        authorizationStatus,
        lastUpdated: new Date().toISOString(),
      }));
      if (authorizationStatus !== 'approved') {
        setChoosingApps(false);
        Alert.alert('Screen Time access needed', 'Allow Screen Time access to choose apps for this rule.');
        return;
      }
    }
    const selection = await presentScreenTimeActivityPicker(targets, { selectionId: draftRuleId });
    setChoosingApps(false);
    if (!selection) return;
    const nextTargets = {
      selectedApps: selection.selectedApps ?? targets.selectedApps,
      selectedCategories: selection.selectedCategories ?? targets.selectedCategories,
    };
    setTargets(nextTargets);
    setAppsConfirmed(nextTargets.selectedApps.length + nextTargets.selectedCategories.length > 0);
  };

  const saveRule = async () => {
    if (!kind || count === 0 || saving) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const result = addPersonalScreenTimeRule(
      normalizeScreenTimeProtectionSettings(useAppStore.getState().screenTimeProtection),
      createPersonalScreenTimeRule({
        id: draftRuleId,
        selectionId: draftRuleId,
        kind,
        selectedApps: targets.selectedApps,
        selectedCategories: targets.selectedCategories,
        enabled: true,
        setupCompleted: true,
        limitMinutes: kind === 'daily_limit' ? suggestedLimitMinutes : undefined,
        nowIso,
      }),
    );
    if (result.status === 'duplicate_rule') {
      setSaving(false);
      Alert.alert('Rule already exists', 'The same apps and condition are already saved.');
      return;
    }
    setSettings(result.settings);
    capture(AnalyticsEvent.ScreenTimeSetupCompleted, {
      setup_intent: props.params.setupIntent ?? 'settings_discovery',
      surface: props.params.entrySurface ?? 'settings',
      rule: kind === 'focus' ? 'focus_session' : kind === 'daily_limit' ? 'daily_limit' : 'real_step',
    });
    await reconcileScreenTimeRestrictions({ focusSessionActive: false }).catch(() => undefined);
    props.onClose();
  };

  const addRuleAction = step === 'review' ? (
    <View style={styles.footer}>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={saving}
        loadingLabel="Adding…"
        onPress={() => void saveRule()}
      >
        Add rule
      </Button>
    </View>
  ) : undefined;

  return (
    <BottomDrawer
      visible
      onClose={props.onClose}
      snapPoints={['82%']}
      presentation="modal"
      dismissable
      dismissOnBackdropPress
      enableContentPanningGesture
      bottomAccessory={addRuleAction}
    >
        <View style={styles.header}>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Rule setup progress"
            accessibilityValue={{ min: 1, max: totalSteps, now: progressStep }}
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((progressStep / totalSteps) * 100)}%` },
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close rule setup"
            onPress={props.onClose}
            style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
          >
            <Icon name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <BottomDrawerScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.promptBlock}>
            <Text accessibilityRole="header" style={styles.question}>{copy.question}</Text>
            {copy.support ? <Text style={styles.support}>{copy.support}</Text> : null}
          </View>

          {step === 'apps' ? (
            <View style={styles.choiceStack}>
              <GuidedChoice
                accessibilityLabel="Apps and categories"
                accessibilityHint={count > 0
                  ? `${targetsLabel} currently selected. Opens the Screen Time picker.`
                  : 'Opens the Screen Time picker.'}
                icon="layers"
                label={choosingApps ? 'Opening picker…' : 'Apps and categories'}
                disabled={choosingApps}
                onPress={() => void chooseApps()}
              />
            </View>
          ) : null}

          {step === 'behavior' ? (
            <View style={styles.choiceStack}>
              {availableKinds.includes('real_step') ? (
                <GuidedChoice
                  accessibilityHint="Apps unlock when you complete any one of these in Kwilt."
                  icon="checklist"
                  label="After a to-do, progress update, or Focus"
                  onPress={() => setKind('real_step')}
                />
              ) : null}
              {availableKinds.includes('focus') ? (
                <GuidedChoice
                  accessibilityHint="Apps stay paused while Focus is running."
                  icon="focus"
                  label="After Focus ends"
                  onPress={() => setKind('focus')}
                />
              ) : null}
              {availableKinds.includes('daily_limit') ? (
                <GuidedChoice
                  accessibilityHint="Apps pause after the chosen amount of use each day."
                  icon="clock"
                  label="After a daily time limit"
                  onPress={() => setKind('daily_limit')}
                />
              ) : null}
            </View>
          ) : null}

          {step === 'review' && kind ? (
            <View style={styles.receipt}>
              <Text style={styles.receiptSentence}>
                {personalRuleSentence(kind, targetsLabel, suggestedLimitMinutes)}
              </Text>
            </View>
          ) : null}

          {step !== 'apps' ? (
            <View style={styles.answerSection}>
              <Text style={styles.answerSectionLabel}>Your choices</Text>
              <AnswerSummary
                label="Apps"
                value={targetsLabel}
                accessibilityLabel="Change apps"
                onPress={() => void chooseApps()}
              />
              {step === 'review' && kind ? (
                <AnswerSummary
                  label="Rule behavior"
                  value={personalRuleBehaviorLabel(kind, suggestedLimitMinutes)}
                  accessibilityLabel={isContextualFlow ? undefined : 'Change rule behavior'}
                  onPress={isContextualFlow ? undefined : () => setKind(null)}
                />
              ) : null}
            </View>
          ) : null}
        </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

function GuidedChoice(props: {
  accessibilityLabel?: string;
  accessibilityHint: string;
  icon: IconName;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ disabled: props.disabled, busy: props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        props.disabled ? styles.disabled : null,
        pressed ? styles.choiceCardPressed : null,
      ]}
    >
      <View
        testID={`rule-choice-icon-${props.icon}`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.choiceIcon}
      >
        <Icon name={props.icon} size={24} color={colors.textPrimary} />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceLabel}>{props.label}</Text>
      </View>
      <Icon name="chevronRight" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

function AnswerSummary(props: {
  label: string;
  value: string;
  accessibilityLabel?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.answerCopy}>
        <Text style={styles.answerLabel}>{props.label}</Text>
        <Text style={styles.answerValue}>{props.value}</Text>
      </View>
      {props.onPress ? <Icon name="chevronRight" size={18} color={colors.textSecondary} /> : null}
    </>
  );

  if (!props.onPress) {
    return <View style={styles.answerRow}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      style={({ pressed }) => [styles.answerRow, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  promptBlock: {
    rowGap: spacing.sm,
  },
  question: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  support: {
    ...typography.body,
    color: colors.textSecondary,
  },
  choiceStack: {
    rowGap: spacing.sm,
    marginTop: spacing['2xl'],
  },
  choiceCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  choiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLabel: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  choiceCardPressed: {
    backgroundColor: colors.shellAlt,
    transform: [{ scale: 0.985 }],
  },
  pressed: {
    opacity: 0.74,
  },
  disabled: {
    opacity: 0.52,
  },
  receipt: {
    marginTop: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    padding: spacing.lg,
  },
  receiptSentence: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  answerSection: {
    marginTop: spacing['2xl'],
  },
  answerSectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingBottom: spacing.xs,
  },
  answerRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  answerCopy: {
    flex: 1,
    minWidth: 0,
    rowGap: 2,
  },
  answerLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  answerValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  footer: {
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
  },
});

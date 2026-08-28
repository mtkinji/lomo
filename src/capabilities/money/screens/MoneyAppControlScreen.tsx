import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import {
  SettingsDivider,
  SettingsChoiceRow,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsToggleRow,
} from '../../../ui/SettingsSurface';
import {
  getScreenTimeAuthorizationStatus,
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { useMoneyData } from '../data/MoneyDataContext';
import {
  getMoneyAppControlPresetCopy,
  moneyAppControlSelectionId,
  type MoneyAppControlPolicy,
  type MoneyAppControlPreset,
} from '../domain/moneyAppControl';
import type { MoneyStackParamList } from '../navigation/types';
import { reconcileMoneyAppControls } from '../runtime/moneyAppControlRuntime';
import { useMoneyAppControlSettings } from '../runtime/moneyAppControlStorage';
import { isMoneyAppControlOnboardingComplete } from '../domain/moneyAppControlOnboarding';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { useAppStore } from '../../../store/useAppStore';
import { useCapabilityOnboardingStore } from '../../../features/capability-onboarding/useCapabilityOnboardingStore';
import { spacing } from '../../../theme';
import { navigateWhenReady } from '../../../navigation/rootNavigationRef';
import type { PersonalScreenTimeRuleKind } from '../../../services/screenTimeProtection';

const PRESETS: MoneyAppControlPreset[] = [
  'always_review',
  'when_hot',
  'at_95_percent',
  'when_over',
  'needs_review',
];

const DEFAULT_POLICY: MoneyAppControlPolicy = {
  enabled: false,
  preset: 'always_review',
  unlockWindowMinutes: 20,
  selectedApps: [],
  selectedCategories: [],
  lastReview: null,
};

export function MoneyAppControlScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyAppControl'>) {
  const { snapshot } = useMoneyData();
  const { settings, loaded, save } = useMoneyAppControlSettings();
  const [saving, setSaving] = useState(false);
  const [presetDrawerOpen, setPresetDrawerOpen] = useState(false);
  const [behaviorDrawerOpen, setBehaviorDrawerOpen] = useState(false);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const { capture } = useAnalytics();
  const category = snapshot?.categories.find((item) => item.id === route.params.categoryId || item.sourceId === route.params.categoryId);
  const suggestedPreset = route.params.suggestedPreset;
  const policy = category ? settings.policies[category.sourceId] ?? {
    ...DEFAULT_POLICY,
    ...(suggestedPreset ? { preset: suggestedPreset } : {}),
  } : DEFAULT_POLICY;
  const targetCount = policy.selectedApps.length + policy.selectedCategories.length;

  useEffect(() => {
    void getScreenTimeAuthorizationStatus().then((authorizationStatus) => {
      if (authorizationStatus === settings.authorizationStatus) return;
      void save((current) => ({ ...current, authorizationStatus }));
    });
  }, [save, settings.authorizationStatus]);

  const status = useMemo(() => {
    if (settings.authorizationStatus === 'approved') return targetCount > 0 ? `${targetCount} selected` : 'Choose apps';
    if (settings.authorizationStatus === 'denied' || settings.authorizationStatus === 'revoked') return 'Access blocked';
    if (settings.authorizationStatus === 'unavailable') return 'Unavailable in this build';
    return 'Permission needed';
  }, [settings.authorizationStatus, targetCount]);

  const persist = async (nextPolicy: MoneyAppControlPolicy) => {
    if (!category || !snapshot) return;
    const next = await save((current) => ({
      ...current,
      policies: { ...current.policies, [category.sourceId]: nextPolicy },
    }));
    await reconcileMoneyAppControls(snapshot, next);
    if (
      route.params.source === 'capability-onboarding' &&
      userId &&
      isMoneyAppControlOnboardingComplete(next.authorizationStatus, nextPolicy)
    ) {
      const onboardingStore = useCapabilityOnboardingStore.getState();
      const alreadyCompleted = onboardingStore.recordForUser(userId)
        .completedPaths['budget-app-controls'];
      if (!alreadyCompleted) {
        const completedAt = Date.now();
        onboardingStore.dispatch(userId, {
          type: 'complete-path',
          pathId: 'budget-app-controls',
          receiptId: `money-app-control:${category.sourceId}:${completedAt}`,
          now: completedAt,
        });
        capture(AnalyticsEvent.CapabilityOnboardingPathCompleted, {
          path_id: 'budget-app-controls',
          category_id: category.sourceId,
          preset: nextPolicy.preset,
          selected_target_count:
            nextPolicy.selectedApps.length + nextPolicy.selectedCategories.length,
        });
      }
    }
  };

  const chooseApps = async () => {
    if (!category || saving) return;
    setSaving(true);
    try {
      let authorizationStatus = await getScreenTimeAuthorizationStatus();
      if (authorizationStatus !== 'approved') authorizationStatus = await requestScreenTimeAuthorization();
      const authorized = await save((current) => ({ ...current, authorizationStatus }));
      if (authorizationStatus !== 'approved') {
        Alert.alert('Screen Time access needed', 'Allow Screen Time access to choose apps for this category.');
        return;
      }
      const currentPolicy = authorized.policies[category.sourceId] ?? policy;
      const selection = await presentScreenTimeActivityPicker(currentPolicy, {
        selectionId: moneyAppControlSelectionId(category.sourceId),
      });
      if (!selection) return;
      await persist({
        ...currentPolicy,
        selectedApps: selection.selectedApps ?? [],
        selectedCategories: selection.selectedCategories ?? [],
        enabled: (selection.selectedApps?.length ?? 0) + (selection.selectedCategories?.length ?? 0) > 0,
      });
    } catch (error) {
      Alert.alert('Unable to update app controls', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const choosePreset = async (preset: MoneyAppControlPreset) => {
    setSaving(true);
    try {
      await persist({ ...policy, preset });
      setPresetDrawerOpen(false);
    } catch (error) {
      Alert.alert('Unable to update this rule', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const chooseBehavior = (kind: PersonalScreenTimeRuleKind) => {
    Alert.alert(
      'Replace this rule behavior?',
      'The budget condition will be removed. Your selected apps will carry into the new rule for review before anything changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            setBehaviorDrawerOpen(false);
            navigateWhenReady('Settings', {
              screen: 'SettingsScreenTimeRuleBuilder',
              params: {
                entry: 'inventory',
                suggestedKind: kind,
                sourceSelectionId: moneyAppControlSelectionId(category!.sourceId),
                selectedApps: policy.selectedApps,
                selectedCategories: policy.selectedCategories,
                replacingMoneyCategoryId: category!.sourceId,
              },
            });
          },
        },
      ],
    );
  };

  const deleteRule = () => {
    Alert.alert(
      'Delete this rule?',
      'The selected apps will no longer pause because of this budget rule.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete rule',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!snapshot) return;
              setSaving(true);
              try {
                const next = await save((current) => {
                  const policies = { ...current.policies };
                  delete policies[category!.sourceId];
                  return { ...current, policies };
                });
                await reconcileMoneyAppControls(snapshot, next);
                navigation.goBack();
              } catch (error) {
                Alert.alert('Unable to delete this rule', error instanceof Error ? error.message : 'Please try again.');
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!category) {
    return (
      <SettingsPage onBack={() => navigation.goBack()} title="App controls">
        <SettingsGroup footer="This category may have changed since the last successful Money sync.">
          <SettingsRow title="Category unavailable" />
        </SettingsGroup>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Edit rule">
      {route.params.suggestedAppLabels?.length ? (
        <SettingsGroup footer="Choose the actual apps in Apple’s private picker. Kwilt does not convert these labels into app identities." title="From Chat">
          <SettingsRow title="Apps you mentioned" value={route.params.suggestedAppLabels.join(', ')} />
        </SettingsGroup>
      ) : null}
      <SettingsGroup title="Rule status">
        <SettingsToggleRow
          disabled={!loaded || saving || targetCount === 0 || settings.authorizationStatus !== 'approved'}
          enabled={policy.enabled}
          onPress={() => void persist({ ...policy, enabled: !policy.enabled })}
          title="Rule enabled"
        />
      </SettingsGroup>
      <SettingsGroup
        footer="Kwilt uses Apple's private Screen Time picker. App identities stay opaque to JavaScript and on this device."
        title="Rule details"
      >
        <SettingsRow disabled={saving} onPress={() => void chooseApps()} title="Apps and categories" value={status} />
        <SettingsDivider />
        <SettingsRow onPress={() => setBehaviorDrawerOpen(true)} title="Rule behavior" value="Based on a budget" />
        <SettingsDivider />
        <SettingsRow
          onPress={() => navigation.navigate('MoneyAppControlBudgetPicker', {
            sourceSelectionId: moneyAppControlSelectionId(category.sourceId),
            selectedApps: policy.selectedApps,
            selectedCategories: policy.selectedCategories,
            replacingMoneyCategoryId: category.sourceId,
          })}
          title="Budget"
          value={category.name}
        />
        <SettingsDivider />
        <SettingsRow
          disabled={saving}
          onPress={() => setPresetDrawerOpen(true)}
          title="When to pause"
          value={getMoneyAppControlPresetCopy(policy.preset).title}
        />
      </SettingsGroup>

      <SettingsGroup title="What will happen">
        <SettingsRow
          multiline
          title={`${targetCount > 0 ? `${targetCount} selected app${targetCount === 1 ? '' : 's'} or categor${targetCount === 1 ? 'y' : 'ies'}` : 'Selected apps and categories'} will pause based on ${category.name}: ${getMoneyAppControlPresetCopy(policy.preset).title.toLowerCase()}.`}
        />
      </SettingsGroup>

      <SettingsGroup title="Rule management">
        <SettingsRow destructive disabled={saving} onPress={deleteRule} showsDisclosureIndicator={false} title="Delete rule" />
      </SettingsGroup>

      <BottomDrawer
        visible={behaviorDrawerOpen}
        onClose={() => setBehaviorDrawerOpen(false)}
        snapPoints={['54%']}
        keyboardAvoidanceEnabled={false}
      >
        <BottomDrawerScrollView contentContainerStyle={styles.presetDrawerContent}>
          <BottomDrawerHeader
            title="Rule behavior"
            subtitle="Choose what controls access to these apps."
            variant="withClose"
            onClose={() => setBehaviorDrawerOpen(false)}
            closeAccessibilityLabel="Close Rule behavior"
          />
          <SettingsGroup>
            <SettingsChoiceRow
              description="Pause according to this budget and its condition."
              onPress={() => setBehaviorDrawerOpen(false)}
              selected
              title="Based on a budget"
            />
            <SettingsDivider />
            <SettingsChoiceRow
              description="Unlock after a to-do, progress update, or Focus."
              onPress={() => chooseBehavior('real_step')}
              selected={false}
              title="After a real step"
            />
            <SettingsDivider />
            <SettingsChoiceRow
              description="Pause only while Focus is running."
              onPress={() => chooseBehavior('focus')}
              selected={false}
              title="During Focus"
            />
            <SettingsDivider />
            <SettingsChoiceRow
              description="Pause after a chosen amount of use each day."
              onPress={() => chooseBehavior('daily_limit')}
              selected={false}
              title="After a daily time limit"
            />
          </SettingsGroup>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={presetDrawerOpen}
        onClose={() => setPresetDrawerOpen(false)}
        snapPoints={['58%']}
        keyboardAvoidanceEnabled={false}
      >
        <BottomDrawerScrollView contentContainerStyle={styles.presetDrawerContent}>
          <BottomDrawerHeader
            title="When to pause"
            subtitle="Choose the budget condition that pauses these apps."
            variant="withClose"
            onClose={() => setPresetDrawerOpen(false)}
            closeAccessibilityLabel="Close When to pause"
          />
          <SettingsGroup>
            {PRESETS.map((preset, index) => {
              const copy = getMoneyAppControlPresetCopy(preset);
              return (
                <Fragment key={preset}>
                  <SettingsChoiceRow
                    description={copy.detail}
                    multilineTitle
                    onPress={() => void choosePreset(preset)}
                    selected={policy.preset === preset}
                    title={copy.title}
                  />
                  {index < PRESETS.length - 1 ? <SettingsDivider /> : null}
                </Fragment>
              );
            })}
          </SettingsGroup>
        </BottomDrawerScrollView>
      </BottomDrawer>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  presetDrawerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});

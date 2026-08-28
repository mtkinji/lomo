import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Fragment, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
} from '../../../ui/SettingsSurface';
import { transferScreenTimeActivitySelection } from '../../../services/appleEcosystem/screenTimeProtection';
import { useMoneyData } from '../data/MoneyDataContext';
import {
  moneyAppControlSelectionId,
  type MoneyAppControlPolicy,
} from '../domain/moneyAppControl';
import type { MoneyStackParamList } from '../navigation/types';
import { useMoneyAppControlSettings } from '../runtime/moneyAppControlStorage';
import { useAppStore } from '../../../store/useAppStore';
import {
  getPersonalScreenTimeRuleById,
  normalizeScreenTimeProtectionSettings,
  removePersonalScreenTimeRule,
} from '../../../services/screenTimeProtection';
import { deactivatePersonalScreenTimeRule } from '../../../services/screenTimeProtectionRuntime';

const DEFAULT_POLICY: MoneyAppControlPolicy = {
  enabled: false,
  preset: 'always_review',
  unlockWindowMinutes: 20,
  selectedApps: [],
  selectedCategories: [],
  lastReview: null,
};

export function MoneyAppControlBudgetPickerScreen({
  navigation,
  route,
}: NativeStackScreenProps<MoneyStackParamList, 'MoneyAppControlBudgetPicker'>) {
  const { snapshot, status } = useMoneyData();
  const { save } = useMoneyAppControlSettings();
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const budgets = useMemo(
    () => snapshot?.categories.filter((category) => category.planRole !== 'protected') ?? [],
    [snapshot],
  );

  const chooseBudget = async (category: (typeof budgets)[number]) => {
    if (savingCategoryId) return;
    setSavingCategoryId(category.id);
    try {
      const targetSelectionId = moneyAppControlSelectionId(category.sourceId);
      const transferred = await transferScreenTimeActivitySelection({
        sourceSelectionId: route.params.sourceSelectionId,
        targetSelectionId,
      });
      if (!transferred) {
        Alert.alert(
          'Couldn’t carry over the selected apps',
          'Return to Add rule and choose the apps again before selecting a budget.',
        );
        return;
      }
      await save((current) => {
        const policies = { ...current.policies };
        const replacingCategoryId = route.params.replacingMoneyCategoryId;
        if (replacingCategoryId && replacingCategoryId !== category.sourceId) {
          delete policies[replacingCategoryId];
        }
        policies[category.sourceId] = {
          ...(policies[category.sourceId] ?? DEFAULT_POLICY),
          enabled: false,
          selectedApps: route.params.selectedApps,
          selectedCategories: route.params.selectedCategories,
          lastReview: null,
        };
        return { ...current, policies };
      });
      if (route.params.replacingPersonalRuleId) {
        const currentSettings = normalizeScreenTimeProtectionSettings(
          useAppStore.getState().screenTimeProtection,
        );
        const previousRule = getPersonalScreenTimeRuleById(
          currentSettings,
          route.params.replacingPersonalRuleId,
        );
        if (previousRule) {
          const deactivated = await deactivatePersonalScreenTimeRule(previousRule);
          if (!deactivated) {
            Alert.alert(
              'Couldn’t replace the previous rule',
              'The budget rule was saved off. Return to Screen Time and try turning off the previous rule before enabling this one.',
            );
            return;
          }
          useAppStore.getState().setScreenTimeProtection((settings) => (
            removePersonalScreenTimeRule(settings, previousRule.id)
          ));
        }
      }
      navigation.navigate('MoneyAppControl', {
        categoryId: category.id,
        source: 'screen-time-rule-builder',
      });
    } catch (error) {
      Alert.alert(
        'Unable to choose this budget',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSavingCategoryId(null);
    }
  };

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Choose a budget">
      <SettingsGroup
        title="Budget boundary"
        footer="Your selected apps stay off until you review the condition and turn the rule on."
      >
        {status === 'loading' || status === 'idle' ? (
          <SettingsRow title="Loading budgets…" />
        ) : budgets.length === 0 ? (
          <>
            <SettingsRow title="No flexible budgets yet" />
            <SettingsDivider />
            <SettingsRow title="Create a budget" onPress={() => navigation.navigate('MoneyCategoryCreate')} />
          </>
        ) : budgets.map((category, index) => (
          <Fragment key={category.sourceId}>
            {index > 0 ? <SettingsDivider /> : null}
            <SettingsRow
              disabled={savingCategoryId !== null}
              title={category.name}
              value={savingCategoryId === category.id ? 'Opening…' : undefined}
              onPress={() => void chooseBudget(category)}
            />
          </Fragment>
        ))}
      </SettingsGroup>
    </SettingsPage>
  );
}

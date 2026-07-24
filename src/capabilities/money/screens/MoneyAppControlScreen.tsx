import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  SettingsDivider,
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
  const category = snapshot?.categories.find((item) => item.id === route.params.categoryId || item.sourceId === route.params.categoryId);
  const policy = category ? settings.policies[category.sourceId] ?? DEFAULT_POLICY : DEFAULT_POLICY;
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
    <SettingsPage onBack={() => navigation.goBack()} title={`${category.name} app controls`}>
      <SettingsGroup footer="Kwilt uses Apple's Screen Time picker. Your app choices stay opaque to JavaScript and on this device." title="Selected apps">
        <SettingsRow disabled={saving} onPress={() => void chooseApps()} title="Apps to pause" value={status} />
        <SettingsDivider />
        <SettingsToggleRow
          disabled={!loaded || saving || targetCount === 0 || settings.authorizationStatus !== 'approved'}
          enabled={policy.enabled}
          onPress={() => void persist({ ...policy, enabled: !policy.enabled })}
          title="Pause selected apps"
        />
      </SettingsGroup>

      <SettingsGroup
        footer={`${getMoneyAppControlPresetCopy(policy.preset).detail} A review opens access for 20 minutes; Keep blocked leaves the pause in place.`}
        title="When to pause"
      >
        {PRESETS.map((preset, index) => {
          const copy = getMoneyAppControlPresetCopy(preset);
          return (
            <MemoPresetRow
              key={preset}
              divider={index > 0}
              onPress={() => void persist({ ...policy, preset })}
              selected={policy.preset === preset}
              title={copy.title}
            />
          );
        })}
      </SettingsGroup>
    </SettingsPage>
  );
}

function MemoPresetRow({ divider, onPress, selected, title }: {
  divider: boolean;
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <>
      {divider ? <SettingsDivider /> : null}
      <SettingsRow onPress={onPress} title={title} value={selected ? 'Selected' : undefined} />
    </>
  );
}

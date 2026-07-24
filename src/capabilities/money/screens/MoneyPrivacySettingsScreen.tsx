import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { SettingsStackParamList } from '../../../navigation/RootNavigator';
import { SettingsGroup, SettingsPage, SettingsToggleRow } from '../../../ui/SettingsSurface';
import {
  authenticateMoneyPrivacyLock,
  getMoneyPrivacyLockAvailability,
  useMoneyPrivacyLockSettings,
} from '../runtime/moneyPrivacyLock';

export function MoneyPrivacySettingsScreen({
  navigation,
}: NativeStackScreenProps<SettingsStackParamList, 'SettingsMoneyPrivacy'>) {
  const { settings, loaded, save } = useMoneyPrivacyLockSettings();
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('device authentication');

  useEffect(() => {
    let mounted = true;
    void getMoneyPrivacyLockAvailability().then((availability) => {
      if (mounted) setLabel(availability.label);
    });
    return () => { mounted = false; };
  }, []);

  const toggle = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (settings.enabled) {
        await save(false);
        return;
      }
      const availability = await getMoneyPrivacyLockAvailability();
      setLabel(availability.label);
      if (!availability.available) {
        Alert.alert('Privacy lock unavailable', availability.reason ?? `Set up ${availability.label} first.`);
        return;
      }
      const result = await authenticateMoneyPrivacyLock();
      if (result.success) await save(true);
      else if (!['user_cancel', 'system_cancel', 'app_cancel'].includes(result.error)) {
        Alert.alert('Unable to turn on privacy lock', `Kwilt Money could not confirm ${availability.label}.`);
      }
    } catch (error) {
      Alert.alert('Unable to update privacy lock', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Money privacy">
      <SettingsGroup footer={`Require ${label} when Money opens or returns after 30 seconds in the background.`}>
        <SettingsToggleRow
          disabled={!loaded || saving}
          enabled={settings.enabled}
          onPress={() => void toggle()}
          title="Privacy lock"
        />
      </SettingsGroup>
    </SettingsPage>
  );
}

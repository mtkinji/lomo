import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';
import { HapticsService } from '../../services/HapticsService';
import { SettingsGroup, SettingsPage, SettingsToggleRow } from '../../ui/SettingsSurface';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHaptics'>;

export function HapticsSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const enabled = useAppStore((s) => s.hapticsEnabled);
  const setEnabled = useAppStore((s) => s.setHapticsEnabled);

  const subtitle = enabled
    ? 'Haptics are on. You’ll feel subtle feedback for key moments (success, error, focus, selections).'
    : 'Haptics are off. Kwilt will stay silent even on success/error moments.';

  return (
    <SettingsPage title="Haptics" onBack={() => navigation.goBack()}>
      <SettingsGroup footer={subtitle}>
        <SettingsToggleRow
          enabled={enabled}
          title="Enable haptics"
          onPress={() => {
            const next = !enabled;
            setEnabled(next);
            HapticsService.setEnabled(next);
            if (next) {
              void HapticsService.trigger('outcome.success');
            }
          }}
        />
      </SettingsGroup>
    </SettingsPage>
  );
}


import { Fragment } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HapticsService } from '../../services/HapticsService';
import { KWILT_LAB_CAPABILITIES } from '../../labs/kwiltLabs';
import { useKwiltLabsStore } from '../../labs/useKwiltLabsStore';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsToggleRow,
} from '../../ui/SettingsSurface';

export function KwiltLabsSettingsScreen({
  navigation,
}: NativeStackScreenProps<SettingsStackParamList, 'SettingsKwiltLabs'>) {
  return <KwiltLabsSettingsSurface onBack={() => navigation.goBack()} />;
}

export function KwiltLabsSettingsSurface({ onBack }: { onBack: () => void }) {
  const enabledCapabilities = useKwiltLabsStore((state) => state.enabledCapabilities);
  const setEnabled = useKwiltLabsStore((state) => state.setEnabled);

  return (
    <SettingsPage title="Kwilt Labs" onBack={onBack}>
      <SettingsGroup
        title="CAPABILITIES"
        footer="Labs are works in progress. Turning one off hides it and stops its background work without deleting its data."
      >
        {KWILT_LAB_CAPABILITIES.map((capability, index) => {
          const enabled = enabledCapabilities.includes(capability.id);
          return (
            <Fragment key={capability.id}>
              {index > 0 ? <SettingsDivider /> : null}
              <SettingsToggleRow
                title={capability.title}
                description={capability.description}
                enabled={enabled}
                onPress={() => {
                  setEnabled(capability.id, !enabled);
                  void HapticsService.trigger(enabled ? 'canvas.toggle.off' : 'canvas.toggle.on');
                }}
              />
            </Fragment>
          );
        })}
      </SettingsGroup>
    </SettingsPage>
  );
}

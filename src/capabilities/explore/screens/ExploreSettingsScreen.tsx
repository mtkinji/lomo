import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RootDrawerParamList, SettingsStackParamList } from '../../../navigation/RootNavigator';
import { colors, fonts, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsToggleRow,
} from '../../../ui/SettingsSurface';
import type { ExploreMapStyle, ExplorePreferences, ExploreSharingLevel } from '../domain/types';
import { useExploreRecorder } from '../runtime/useExploreRecorder';
import { useExploreStore } from '../runtime/useExploreStore';

const SHARING_OPTIONS: Array<{ value: ExploreSharingLevel; label: string; detail: string }> = [
  { value: 'private', label: 'Private', detail: 'Only you' },
  { value: 'territory', label: 'Territory', detail: 'Cleared areas' },
  { value: 'completed-paths', label: 'Paths', detail: 'Finished adventures' },
  { value: 'live', label: 'Live', detail: 'Current location' },
];

const MAP_STYLE_OPTIONS: Array<{ value: ExploreMapStyle; label: string; detail: string }> = [
  { value: 'satellite', label: 'Satellite', detail: 'Aerial imagery without street labels' },
  { value: 'hybrid', label: 'Hybrid', detail: 'Aerial imagery with street labels' },
  { value: 'standard', label: 'Standard', detail: 'Apple’s illustrated map' },
];

export function ExploreSettingsScreen({
  navigation,
  route,
}: NativeStackScreenProps<SettingsStackParamList, 'SettingsExplore'>) {
  const preferences = useExploreStore((state) => state.preferences);
  const sessions = useExploreStore((state) => state.sessions);
  const activeSession = useExploreStore((state) => state.activeSession);
  const places = useExploreStore((state) => state.places);
  const updatePreferences = useExploreStore((state) => state.updatePreferences);
  const clearHistory = useExploreStore((state) => state.clearHistory);
  const loadPreviewAdventure = useExploreStore((state) => state.loadPreviewAdventure);
  const recorder = useExploreRecorder();
  const rootNavigation = navigation.getParent<NavigationProp<RootDrawerParamList>>();
  const hasHistory = Boolean(activeSession || sessions.length || Object.keys(places).length);

  const setRecordingMode = (mode: ExplorePreferences['recording']) => {
    void recorder.setRecordingMode(mode);
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear Explore history?',
      'This removes local adventures, explored territory, and collected Place visits from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear history', style: 'destructive', onPress: clearHistory },
      ],
    );
  };

  const goBack = () => {
    if (route.params?.entrySurface === 'explore-map') {
      rootNavigation?.navigate('Explore', { screen: 'ExploreMap' });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    rootNavigation?.navigate('Explore', { screen: 'ExploreMap' });
  };

  return (
    <SettingsPage onBack={goBack} title="Explore">
      <SettingsGroup
        footer="These choices change what appears in Explore without changing what you share."
        title="Map"
      >
        <SettingsToggleRow
          enabled={preferences.showFog}
          onPress={() => updatePreferences({ showFog: !preferences.showFog })}
          title="Fog"
        />
        <SettingsDivider />
        <SettingsToggleRow
          enabled={preferences.showMyPath}
          onPress={() => updatePreferences({ showMyPath: !preferences.showMyPath })}
          title="My path"
        />
        <SettingsDivider />
        <SettingsToggleRow
          enabled={preferences.showFamilyTerritory}
          onPress={() => updatePreferences({ showFamilyTerritory: !preferences.showFamilyTerritory })}
          title="Family territory"
        />
      </SettingsGroup>

      <SettingsGroup title="Map style">
        {MAP_STYLE_OPTIONS.map((option, index) => (
          <View key={option.value}>
            {index > 0 ? <SettingsDivider /> : null}
            <ChoiceRow
              detail={option.detail}
              label={option.label}
              onPress={() => updatePreferences({ mapStyle: option.value })}
              selected={preferences.mapStyle === option.value}
            />
          </View>
        ))}
      </SettingsGroup>

      <SettingsGroup
        footer="Always Exploring adapts location sampling to movement and rests when you are still."
        title="Tracking"
      >
        <ChoiceRow
          detail="Remember trips without starting each one"
          label="Always Exploring"
          onPress={() => setRecordingMode('automatic')}
          selected={preferences.recording === 'automatic'}
        />
        <SettingsDivider />
        <ChoiceRow
          detail="Record only after you begin an outing"
          label="Only when I start"
          onPress={() => setRecordingMode('manual')}
          selected={preferences.recording === 'manual'}
        />
      </SettingsGroup>

      <SettingsGroup title="Recaps">
        <SettingsToggleRow
          enabled={preferences.recapNotifications}
          onPress={() => updatePreferences({ recapNotifications: !preferences.recapNotifications })}
          title="One recap notification"
        />
      </SettingsGroup>

      <SettingsGroup
        footer="Your choice is saved locally. Family delivery is not enabled yet."
        title="Sharing"
      >
        {SHARING_OPTIONS.map((option, index) => (
          <View key={option.value}>
            {index > 0 ? <SettingsDivider /> : null}
            <ChoiceRow
              detail={option.detail}
              label={option.label}
              onPress={() => updatePreferences({ sharing: option.value })}
              selected={preferences.sharing === option.value}
              accessibilityLabel={`Share ${option.label}`}
            />
          </View>
        ))}
      </SettingsGroup>

      {hasHistory ? (
        <SettingsGroup title="History">
          <SettingsRow destructive onPress={confirmClear} title="Clear Explore history" />
        </SettingsGroup>
      ) : null}

      {__DEV__ ? (
        <SettingsGroup title="Internal">
          <SettingsRow onPress={loadPreviewAdventure} title="Load preview walk" />
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}

function ChoiceRow({
  accessibilityLabel,
  detail,
  label,
  onPress,
  selected,
}: {
  accessibilityLabel?: string;
  detail: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choiceRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={styles.choiceDetail}>{detail}</Text>
      </View>
      {selected ? <Icon name="check" size={18} color={colors.pine700} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choiceRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceCopy: { flex: 1 },
  choiceLabel: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  choiceDetail: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 1 },
  pressed: { opacity: 0.72 },
});

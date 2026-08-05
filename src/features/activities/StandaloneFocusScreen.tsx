import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { PortalHost } from '@rn-primitives/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useCanUseProTools } from '../../store/proToolsAccess';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing, typography } from '../../theme';
import { BrandLockup } from '../../ui/BrandLockup';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { HStack, VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import type { FocusAudioSelection } from './FocusSetupContent';
import { FocusSetupContent } from './FocusSetupContent';
import {
  buildFocusCustomMinuteOptions,
  clampFocusMinutes,
  FOCUS_PRESET_MINUTES,
} from './focusSessionPresentation';
import { StandaloneFocusExperience } from './StandaloneFocusExperience';
import { useStandaloneFocusController } from './useStandaloneFocusController';

const portalHostName = 'standalone-focus-setup';

export function StandaloneFocusScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList, 'StandaloneFocus'>>();
  const insets = useSafeAreaInsets();
  const canUseFocus = useCanUseProTools('focus_mode');
  const maxMinutes = canUseFocus ? 180 : 10;
  const lastFocusMinutes = useAppStore((state) => state.lastFocusMinutes);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const soundscapeTrackId = useAppStore((state) => state.soundscapeTrackId);
  const setSoundscapeEnabled = useAppStore((state) => state.setSoundscapeEnabled);
  const setSoundscapeTrackId = useAppStore((state) => state.setSoundscapeTrackId);
  const controller = useStandaloneFocusController({ maxMinutes, soundscapeTrackId });
  const [minutes, setMinutes] = useState(25);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [audio, setAudio] = useState<FocusAudioSelection>('default');
  const [starting, setStarting] = useState(false);
  const customOptions = useMemo(() => buildFocusCustomMinuteOptions(maxMinutes), [maxMinutes]);
  const isCustomValue = !FOCUS_PRESET_MINUTES.includes(minutes as (typeof FOCUS_PRESET_MINUTES)[number]);

  useEffect(() => {
    setMinutes(clampFocusMinutes(lastFocusMinutes ?? 25, maxMinutes));
    setCustomExpanded(false);
    setAudio(soundscapeEnabled ? soundscapeTrackId : 'none');
    setStarting(false);
  }, [lastFocusMinutes, maxMinutes, soundscapeEnabled, soundscapeTrackId]);

  const close = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs');
  };

  const start = async () => {
    if (starting) return;
    setStarting(true);
    const started = await controller.start(minutes, audio);
    setStarting(false);
    if (started) {
      setSoundscapeEnabled(audio !== 'none');
      if (audio !== 'none') setSoundscapeTrackId(audio);
    }
  };

  return (
    <View style={[pageStyles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <PortalHost name={portalHostName} />
      <HStack alignItems="center" justifyContent="space-between" style={pageStyles.header}>
        <BrandLockup logoSize={28} wordmarkSize="sm" color={colors.textPrimary} />
        <IconButton accessibilityLabel="Close Focus" onPress={close} variant="ghost">
          <Icon name="close" size={18} color={colors.textPrimary} />
        </IconButton>
      </HStack>
      <VStack space="xs" style={pageStyles.intro}>
        <Text style={pageStyles.title}>Focus</Text>
        <Text style={pageStyles.description}>Choose how long and what you want to hear.</Text>
      </VStack>
      <FocusSetupContent
        minutes={minutes}
        presets={FOCUS_PRESET_MINUTES}
        customOptions={customOptions}
        customExpanded={customExpanded}
        isCustomValue={isCustomValue}
        onMinutesChange={(next) => setMinutes(clampFocusMinutes(next, maxMinutes))}
        onCustomExpandedChange={setCustomExpanded}
        audio={audio}
        onAudioChange={setAudio}
        allowNoAudio
        portalHostName={portalHostName}
        onStart={() => void start()}
        starting={starting}
      />
      <StandaloneFocusExperience
        controller={controller}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const pageStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.md,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

import { Pressable, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { BrandLockup } from '../../ui/BrandLockup';
import { Icon } from '../../ui/Icon';
import { HeaderActionPill } from '../../ui/layout/ObjectPageHeader';
import { HStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { useAppStore } from '../../store/useAppStore';
import { FOCUS_OVERLAY_COLOR_KEYS } from './focusOverlayPalette';
import { formatFocusTimer } from './focusSessionPresentation';
import { styles } from './activityDetailStyles';
import type { StandaloneFocusController } from './useStandaloneFocusController';
import { FocusEnvironmentBackdrop } from './FocusEnvironmentBackdrop';
import { FocusSessionOverlay } from './FocusSessionOverlay';

const palette = [
  colors.pine700,
  colors.madder700,
  colors.orange700,
  colors.turmeric700,
  colors.quiltBlue600,
  colors.indigo900,
  colors.violet700,
] as const;

export function StandaloneFocusExperience(props: {
  controller: StandaloneFocusController;
  topInset: number;
  bottomInset: number;
}) {
  const colorIndex = useAppStore((state) => state.focusOverlayColorIndex);
  const setColorIndex = useAppStore((state) => state.setFocusOverlayColorIndex);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const focusVideoEnvironmentId = useAppStore((state) => state.focusVideoEnvironmentId);
  const setSoundscapeEnabled = useAppStore((state) => state.setSoundscapeEnabled);
  const normalizedColorIndex = Math.floor(Math.max(0, colorIndex)) % palette.length;
  const session = props.controller.session;
  const videoEnvironmentActive = focusVideoEnvironmentId != null;

  if (!session) return null;

  return (
    <FocusSessionOverlay
      onRequestClose={() => props.controller.end().catch(() => undefined)}
    >
          <Pressable
            accessibilityRole={videoEnvironmentActive ? 'image' : 'button'}
            accessibilityLabel={videoEnvironmentActive ? 'Canyon Spring Focus environment' : 'Focus color'}
            accessibilityHint={videoEnvironmentActive ? undefined : 'Double tap to shift focus background color'}
            onPress={videoEnvironmentActive
              ? undefined
              : () => setColorIndex((normalizedColorIndex + 1) % FOCUS_OVERLAY_COLOR_KEYS.length)}
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.focusOverlay,
                {
                  backgroundColor: palette[normalizedColorIndex],
                  paddingTop: props.topInset + spacing.lg,
                  paddingBottom: props.bottomInset + spacing.lg,
                },
              ]}
            >
              {videoEnvironmentActive ? (
                <FocusEnvironmentBackdrop
                  soundscapeId={focusVideoEnvironmentId}
                  running={session.mode === 'running'}
                />
              ) : null}
              <View style={styles.focusTopBar}>
                <BrandLockup logoSize={28} wordmarkSize="sm" logoVariant="parchment" color={colors.parchment} />
              </View>
              <View style={styles.focusCenter}>
                <Text
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.4}
                  minimumFontScale={0.6}
                  numberOfLines={1}
                  style={styles.focusTimer}
                >
                  {formatFocusTimer(props.controller.remainingMs)}
                </Text>
                <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.focusActivityTitle}>
                  Focus
                </Text>
              </View>
              <HStack space="sm" style={styles.focusBottomBar}>
                <HeaderActionPill
                  size={56}
                  accessibilityLabel="End focus session"
                  style={styles.focusActionIconButton}
                  onPress={() => props.controller.end().catch(() => undefined)}
                >
                  <Icon name="stop" size={22} color={colors.parchment} />
                </HeaderActionPill>
                <HeaderActionPill
                  size={56}
                  accessibilityLabel={session.mode === 'paused' ? 'Resume focus session' : 'Pause focus session'}
                  style={styles.focusActionIconButton}
                  onPress={() => props.controller.pauseOrResume().catch(() => undefined)}
                >
                  <Icon name={session.mode === 'paused' ? 'play' : 'pause'} size={22} color={colors.parchment} />
                </HeaderActionPill>
                <HeaderActionPill
                  size={56}
                  accessibilityLabel={soundscapeEnabled ? 'Turn Focus soundscape off' : 'Turn Focus soundscape on'}
                  style={styles.focusActionIconButton}
                  onPress={() => setSoundscapeEnabled(!soundscapeEnabled)}
                >
                  <Icon name={soundscapeEnabled ? 'sound' : 'soundOff'} size={22} color={colors.parchment} />
                </HeaderActionPill>
              </HStack>
            </View>
          </Pressable>
    </FocusSessionOverlay>
  );
}

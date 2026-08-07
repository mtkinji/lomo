import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';
import type { CookVoiceState } from '../voice/cookVoiceContracts';

type Props = {
  voiceState: CookVoiceState;
  voiceLevel: number;
  errorMessage: string | null;
  onFinishSpeaking: () => void;
  onRetry: () => void;
};

function statusLabel(state: CookVoiceState, errorMessage: string | null): string {
  if (errorMessage) {
    return /transcrib|recording/i.test(errorMessage) ? 'Didn’t catch that' : 'Voice unavailable';
  }
  if (state === 'listening') return 'Listening';
  if (state === 'thinking') return 'Working…';
  if (state === 'speaking') return 'Speaking';
  if (state === 'paused') return 'Paused';
  return 'Getting ready…';
}

export function CookVoiceStatus({
  voiceState,
  voiceLevel,
  errorMessage,
  onFinishSpeaking,
  onRetry,
}: Props) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const pulse = useRef(new Animated.Value(0)).current;
  const level = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(level, {
      toValue: voiceState === 'listening' ? voiceLevel : 0,
      duration: reduceMotionEnabled ? 0 : 100,
      useNativeDriver: true,
    }).start();
  }, [level, reduceMotionEnabled, voiceLevel, voiceState]);

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (voiceState !== 'listening' || reduceMotionEnabled) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotionEnabled, voiceState]);

  const haloScale = Animated.add(pulse, level).interpolate({
    inputRange: [0, 2],
    outputRange: [1, 1.16],
    extrapolate: 'clamp',
  });
  const interactive = voiceState === 'listening';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={interactive ? 'Finish speaking' : statusLabel(voiceState, errorMessage)}
        accessibilityHint={interactive ? 'Stops listening and handles your command' : undefined}
        disabled={!interactive}
        onPress={onFinishSpeaking}
        style={styles.voiceTarget}
      >
        <Animated.View style={[styles.halo, { transform: [{ scale: haloScale }] }]} />
        <View style={styles.voiceCore}>
          {voiceState === 'thinking' ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Icon
              name={voiceState === 'speaking' ? 'sound' : errorMessage ? 'soundOff' : 'mic'}
              size={24}
              color={colors.textPrimary}
            />
          )}
        </View>
      </Pressable>
      <View style={styles.copy}>
        <Text variant="body" style={styles.status}>{statusLabel(voiceState, errorMessage)}</Text>
        {errorMessage ? (
          <>
            <Text tone="secondary" numberOfLines={2}>{errorMessage}</Text>
            <Button size="sm" variant="outline" onPress={onRetry}>Try voice again</Button>
          </>
        ) : (
          <Text tone="secondary">Say “Next,” “Repeat,” or “Start a timer.”</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  voiceTarget: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(31,36,32,0.16)',
  },
  voiceCore: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  copy: { flex: 1, gap: spacing.xs },
  status: { fontWeight: '600' },
});

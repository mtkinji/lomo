import { forwardRef, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { colors, spacing } from "../../../theme";
import { Text } from "../../../ui/Typography";
import { useAccessibilityPreferences } from "../../../ui/hooks/useAccessibilityPreferences";
import type { CookVoiceState } from "../voice/cookVoiceContracts";

type Props = {
  voiceState: CookVoiceState;
  voiceLevel: number;
  errorMessage: string | null;
  onFinishSpeaking: () => void;
  onRetry: () => void;
};

function statusLabel(
  state: CookVoiceState,
  errorMessage: string | null,
): string {
  if (errorMessage) {
    return /transcrib|recording/i.test(errorMessage)
      ? "Didn’t catch that"
      : "Voice unavailable";
  }
  if (state === "listening") return "Listening";
  if (state === "thinking") return "Thinking…";
  if (state === "speaking") return "Speaking";
  if (state === "paused") return "Paused";
  return "Getting ready…";
}

export const CookVoiceStatus = forwardRef<React.ElementRef<typeof View>, Props>(
  function CookVoiceStatus(
    { voiceState, voiceLevel, errorMessage, onFinishSpeaking, onRetry }: Props,
    ref,
  ) {
    const { reduceMotionEnabled } = useAccessibilityPreferences();
    const pulse = useRef(new Animated.Value(0)).current;
    const level = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(level, {
        toValue: voiceState === "listening" ? voiceLevel : 0,
        duration: reduceMotionEnabled ? 0 : 100,
        useNativeDriver: true,
      }).start();
    }, [level, reduceMotionEnabled, voiceLevel, voiceState]);

    useEffect(() => {
      pulse.stopAnimation();
      pulse.setValue(0);
      if (
        (voiceState !== "listening" && voiceState !== "thinking") ||
        reduceMotionEnabled
      )
        return;
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }, [pulse, reduceMotionEnabled, voiceState]);

    const waveformEnergy = Animated.add(pulse, level);
    const centerBarScale = waveformEnergy.interpolate({
      inputRange: [0, 2],
      outputRange: [0.35, 1.45],
      extrapolate: "clamp",
    });
    const outerBarScale = waveformEnergy.interpolate({
      inputRange: [0, 2],
      outputRange: [0.45, 1.5],
      extrapolate: "clamp",
    });
    const glistenOpacity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.62, 1],
    });
    const interactive = voiceState === "listening" || Boolean(errorMessage);
    const label = statusLabel(voiceState, errorMessage);
    const thinking = voiceState === "thinking";

    return (
      <View ref={ref} collapsable={false} style={styles.wrap}>
        <Pressable
          accessibilityRole={interactive ? "button" : "text"}
          accessibilityState={{ busy: thinking, disabled: !interactive }}
          accessibilityLabel={
            errorMessage ? `${label}. Try voice again` : label
          }
          accessibilityHint={
            voiceState === "listening"
              ? "Stops listening and handles your command"
              : (errorMessage ?? undefined)
          }
          disabled={!interactive}
          onPress={errorMessage ? onRetry : onFinishSpeaking}
          style={({ pressed }) => [
            styles.voiceTarget,
            pressed && styles.pressed,
          ]}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.waveform}
          >
            <Animated.View
              style={[
                styles.waveformBar,
                styles.outerBar,
                { transform: [{ scaleY: outerBarScale }] },
              ]}
            />
            <Animated.View
              style={[
                styles.waveformBar,
                styles.centerBar,
                { transform: [{ scaleY: centerBarScale }] },
              ]}
            />
            <Animated.View
              style={[
                styles.waveformBar,
                styles.outerBar,
                { transform: [{ scaleY: outerBarScale }] },
              ]}
            />
          </View>
          <Animated.View
            style={{
              opacity:
                voiceState === "listening" && !reduceMotionEnabled
                  ? glistenOpacity
                  : 1,
            }}
          >
            <Text
              accessibilityLiveRegion="polite"
              variant="body"
              numberOfLines={1}
              style={styles.status}
            >
              {label}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: { minWidth: 0 },
  voiceTarget: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  pressed: { opacity: 0.72 },
  waveform: {
    width: 22,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  outerBar: { height: 9 },
  centerBar: { height: 15 },
  status: { minWidth: 0, fontWeight: "600" },
});

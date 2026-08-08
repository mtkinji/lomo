import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

export type KwiltSwitchProps = {
  accessible?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'inverse' | 'neutral';
  value: boolean;
};

const switchAnimationDurationMs = 160;

export function KwiltSwitch({
  accessible = true,
  accessibilityLabel,
  disabled = false,
  onPress,
  style,
  tone = 'default',
  value,
}: KwiltSwitchProps) {
  const animation = useRef(new Animated.Value(value ? 1 : 0)).current;
  const thumbTranslateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });
  const enabledTrackColor = tone === 'neutral' ? colors.primary : colors.pine700;
  const trackBackgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: tone === 'inverse'
      ? ['rgba(250,247,237,0.14)', colors.parchment]
      : ['#DDE1DC', enabledTrackColor],
  });
  const trackBorderColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: tone === 'inverse'
      ? ['rgba(250,247,237,0.72)', colors.parchment]
      : ['#C9CEC8', enabledTrackColor],
  });
  const thumbBackgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: tone === 'inverse'
      ? [colors.parchment, colors.pine700]
      : [colors.canvas, colors.canvas],
  });

  useEffect(() => {
    Animated.timing(animation, {
      toValue: value ? 1 : 0,
      duration: switchAnimationDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animation, value]);

  const visual = (
    <Animated.View
      style={[
        styles.track,
        {
          backgroundColor: trackBackgroundColor,
          borderColor: trackBorderColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: thumbBackgroundColor, transform: [{ translateX: thumbTranslateX }] },
        ]}
      />
    </Animated.View>
  );

  if (!accessible) {
    return <View style={[styles.pressable, disabled ? styles.disabled : null, style]}>{visual}</View>;
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, disabled ? styles.disabled : null, pressed ? styles.pressed : null, style]}
    >
      {visual}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 999,
  },
  track: {
    width: 38,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C9CEC8',
    backgroundColor: '#DDE1DC',
    padding: 1,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
});

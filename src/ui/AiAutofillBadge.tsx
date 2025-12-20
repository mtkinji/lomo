import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { Icon } from './Icon';

type Props = {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Visual size of the badge (width/height). Defaults to 26 to fit neatly
   * inside 44px-tall inputs.
   */
  size?: number;
  /**
   * When true, shows a spinner and disables taps.
   */
  loading?: boolean;
  disabled?: boolean;
};

export function AiAutofillBadge({
  accessibilityLabel,
  onPress,
  style,
  size = 26,
  loading,
  disabled,
}: Props) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: isDisabled ? 0.8 : 1,
        },
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[colors.aiGradientStart, colors.aiGradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.aiForeground} />
      ) : (
        <Icon name="sparkles" size={14} color={colors.aiForeground} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.aiBorder,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});



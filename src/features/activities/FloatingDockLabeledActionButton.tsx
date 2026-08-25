import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '../../theme';
import { Pressable } from '../../ui/HapticPressable';
import { Icon, type IconName } from '../../ui/Icon';
import { ButtonLabel } from '../../ui/Typography';
import {
  FloatingControlSurface,
  type FloatingControlSurfaceVariant,
} from './FloatingControlSurface';

type FloatingDockLabeledActionButtonProps = {
  accessibilityLabel: string;
  accessibilityHint: string;
  disabled?: boolean;
  height: number;
  icon: IconName;
  iconSize?: number;
  isProminent: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  surfaceVariant?: FloatingControlSurfaceVariant;
  testID?: string;
};

/** Compact intrinsic-width companion to the circular floating dock action. */
export function FloatingDockLabeledActionButton({
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  height,
  icon,
  iconSize = 22,
  isProminent,
  label,
  onPress,
  style,
  surfaceStyle,
  surfaceVariant = 'floating',
  testID,
}: FloatingDockLabeledActionButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height },
        style,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <FloatingControlSurface
        testID={testID ? `${testID}.surface` : undefined}
        borderRadius={height / 2}
        isProminent={isProminent}
        variant={surfaceVariant}
        style={[styles.floatingSurface, { height }]}
        surfaceStyle={[styles.surface, { height }, surfaceStyle]}
      >
        <View style={styles.content}>
          <Icon name={icon} size={iconSize} color={colors.textPrimary} />
          <ButtonLabel numberOfLines={1}>{label}</ButtonLabel>
        </View>
      </FloatingControlSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
  },
  floatingSurface: {
    alignSelf: 'flex-start',
  },
  surface: {
    width: 'auto',
  },
  content: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
});

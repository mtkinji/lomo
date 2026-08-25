import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { HapticsService } from '../../services/HapticsService';
import { Icon, type IconName } from '../../ui/Icon';
import {
  FloatingControlSurface,
  type FloatingControlSurfaceVariant,
} from './FloatingControlSurface';

type FloatingDockActionButtonProps = {
  accessibilityLabel: string;
  accessibilityHint: string;
  disabled?: boolean;
  icon: IconName;
  isProminent: boolean;
  onPress: () => void;
  size: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  surfaceVariant?: FloatingControlSurfaceVariant;
  testID?: string;
  iconTestID?: string;
};

export function FloatingDockActionButton({
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  icon,
  isProminent,
  onPress,
  size,
  iconSize = 19,
  style,
  surfaceStyle,
  surfaceVariant = 'floating',
  testID,
  iconTestID,
}: FloatingDockActionButtonProps) {
  const handlePress = React.useCallback(() => {
    if (disabled) return;
    void HapticsService.trigger('canvas.selection');
    onPress();
  }, [disabled, onPress]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        style,
        disabled ? styles.buttonDisabled : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <FloatingControlSurface
        testID={testID ? `${testID}.surface` : undefined}
        borderRadius={size / 2}
        isProminent={isProminent}
        variant={surfaceVariant}
        style={{ width: size, height: size }}
        surfaceStyle={[styles.surface, surfaceStyle]}
      >
        <View testID={iconTestID} style={styles.content}>
          <Icon name={icon} size={iconSize} color={colors.textPrimary} />
        </View>
      </FloatingControlSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  buttonDisabled: { opacity: 0.45 },
  surface: {
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

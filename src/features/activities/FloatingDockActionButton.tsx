import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
    void HapticsService.trigger('canvas.selection');
    onPress();
  }, [onPress]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        style,
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
  surface: {
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

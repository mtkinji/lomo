import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Icon } from './Icon';

type Props = {
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
};

/**
 * Quiet trailing clear action for optional values inside pressable field rows.
 * The row remains the edit target; this button clears the current value in one tap.
 */
export function InlineClearButton({ accessibilityLabel, onPress, testID }: Props) {
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <Icon name="close" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  pressed: {
    backgroundColor: colors.fieldFillPressed,
  },
});

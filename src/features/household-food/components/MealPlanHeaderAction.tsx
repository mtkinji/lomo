import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';

export const MealPlanHeaderAction = forwardRef<View, {
  needsAttention: boolean;
  onPress(): void;
}>(function MealPlanHeaderAction({
  needsAttention,
  onPress,
}, ref) {
  return (
    <Pressable
      ref={ref}
      testID="meal-plan-header-action"
      accessibilityRole="button"
      accessibilityLabel={needsAttention ? 'Ideas, new meal ideas' : 'Ideas'}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon name="meal" size={15} color={colors.textPrimary} />
      <Text variant="label" style={styles.label}>
        Ideas
      </Text>
      {needsAttention ? <View testID="meal-plan-header-attention" style={styles.attention} /> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  action: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.fieldFill,
  },
  label: { color: colors.textPrimary },
  attention: {
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.actionAttention,
  },
  pressed: { opacity: 0.64 },
});

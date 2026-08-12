import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';
import { MealPlanAttentionBadge } from './MealPlanAttentionBadge';

export const MealPlanHeaderAction = forwardRef<View, {
  count: number;
  onPress(): void;
}>(function MealPlanHeaderAction({
  count,
  onPress,
}, ref) {
  return (
    <Pressable
      ref={ref}
      testID="meal-plan-header-action"
      accessibilityRole="button"
      accessibilityLabel={count ? `Plan, ${count} meals` : 'Plan'}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon name="meal" size={15} color={colors.textPrimary} />
      <Text variant="label" style={styles.label}>
        Plan
      </Text>
      <MealPlanAttentionBadge count={count} testID="meal-plan-header-count" />
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
  pressed: { opacity: 0.64 },
});

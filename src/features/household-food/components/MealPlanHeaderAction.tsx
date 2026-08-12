import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';

export const MealPlanHeaderAction = forwardRef<View, {
  count: number;
  onPress(): void;
}>(function MealPlanHeaderAction({
  count,
  onPress,
}, ref) {
  const countLabel = count > 99 ? '99+' : String(count);
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
      {count ? (
        <View testID="meal-plan-header-count" style={styles.countBadge}>
          <Text variant="label" style={styles.countText}>
            {countLabel}
          </Text>
        </View>
      ) : null}
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
  countBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sumi900,
  },
  countText: {
    color: colors.primaryForeground,
    fontSize: 10,
    lineHeight: 12,
  },
  pressed: { opacity: 0.64 },
});

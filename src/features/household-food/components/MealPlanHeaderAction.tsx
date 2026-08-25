import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { Badge } from '../../../ui/Badge';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';

export const MealPlanHeaderAction = forwardRef<View, {
  count?: number;
  needsAttention?: boolean;
  onPress(): void;
}>(function MealPlanHeaderAction({
  count = 0,
  needsAttention = false,
  onPress,
}, ref) {
  const countLabel = count === 1 ? '1 idea' : `${count} ideas`;
  const accessibilityLabel = [
    'Ideas',
    count > 0 ? countLabel : null,
    needsAttention ? 'new meal ideas' : null,
  ].filter(Boolean).join(', ');

  return (
    <Pressable
      ref={ref}
      testID="meal-plan-header-action"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Icon name="meal" size={15} color={colors.textPrimary} />
      <Text variant="label" style={styles.label}>
        Ideas
      </Text>
      {count > 0 ? (
        <Badge
          testID="meal-plan-header-count"
          style={styles.countBadge}
          textStyle={styles.countText}
        >
          {count > 99 ? '99+' : count}
        </Badge>
      ) : needsAttention ? (
        <View testID="meal-plan-header-attention" style={styles.attention} />
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
    paddingVertical: 0,
    borderRadius: radii.pill,
    alignSelf: 'center',
    backgroundColor: colors.actionAttention,
  },
  countText: {
    color: colors.actionAttentionForeground,
    fontSize: 10,
    lineHeight: 12,
  },
  attention: {
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.actionAttention,
  },
  pressed: { opacity: 0.64 },
});

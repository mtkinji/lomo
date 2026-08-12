import { StyleSheet } from 'react-native';

import { colors, radii } from '../../../theme';
import { Badge } from '../../../ui/Badge';

type MealPlanAttentionBadgeProps = {
  count: number;
  testID?: string;
};

/**
 * Shared action-attention treatment for meals that still need attention.
 */
export function MealPlanAttentionBadge({ count, testID }: MealPlanAttentionBadgeProps) {
  if (count <= 0) return null;

  return (
    <Badge
      testID={testID}
      style={styles.badge}
      textStyle={styles.text}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    paddingVertical: 0,
    borderRadius: radii.pill,
    alignSelf: 'center',
    backgroundColor: colors.actionAttention,
  },
  text: {
    color: colors.actionAttentionForeground,
    fontSize: 10,
    lineHeight: 12,
  },
});

import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Heading, Text } from '../../../ui/Typography';

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

type Fact = {
  label: string;
  value: string;
  icon: ComponentProps<typeof Icon>['name'];
};

export function RecipeSummaryBar({
  prepMinutes,
  cookMinutes,
  inactiveMinutes = 0,
  yieldQuantity,
  servings,
  onServingsChange,
}: {
  prepMinutes: number | null;
  cookMinutes: number | null;
  inactiveMinutes?: number;
  yieldQuantity: number | null;
  servings: number;
  onServingsChange(value: number): void;
}) {
  const totalMinutes =
    prepMinutes === null && cookMinutes === null
      ? null
      : (prepMinutes ?? 0) + (cookMinutes ?? 0) + inactiveMinutes;
  const items: Fact[] = [];

  if (totalMinutes !== null) {
    items.push({ label: 'Total', value: duration(totalMinutes), icon: 'clock' });
  }
  if (prepMinutes !== null) {
    items.push({ label: 'Prep', value: duration(prepMinutes), icon: 'estimate' });
  }
  if (cookMinutes !== null) {
    items.push({ label: 'Cook', value: duration(cookMinutes), icon: 'flame' });
  }
  if (inactiveMinutes > 0) {
    items.push({ label: 'Waiting', value: duration(inactiveMinutes), icon: 'clock' });
  }
  if (!items.length && yieldQuantity === null) return null;

  return (
    <View accessibilityLabel="What this recipe takes" style={styles.section}>
      <Heading variant="sm">What this recipe takes</Heading>
      <View style={styles.list}>
        {items.length ? (
          <View style={styles.facts}>
            {items.map((item) => (
              <View key={item.label} style={styles.row}>
                <View style={styles.icon}>
                  <Icon name={item.icon} size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {yieldQuantity !== null ? (
          <View style={items.length ? styles.servingsSeparated : undefined}>
            {items.length ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              <View style={styles.icon}>
                <Icon name="users" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.label}>Servings</Text>
              <View style={styles.servingsControl}>
                <View style={styles.servingsButtons}>
                  <Button
                    accessibilityLabel="Decrease servings"
                    accessibilityState={{ disabled: servings <= 1 }}
                    disabled={servings <= 1}
                    hitSlop={8}
                    size="icon"
                    iconButtonSize={28}
                    variant="outline"
                    onPress={() => onServingsChange(Math.max(1, servings - 1))}
                  >
                    −
                  </Button>
                  <Button
                    accessibilityLabel="Increase servings"
                    hitSlop={8}
                    size="icon"
                    iconButtonSize={28}
                    variant="outline"
                    onPress={() => onServingsChange(servings + 1)}
                  >
                    +
                  </Button>
                </View>
                <Text
                  accessibilityLabel={`${servings} servings`}
                  accessibilityLiveRegion="polite"
                  style={styles.servingsCount}
                >
                  {servings}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  facts: {
    gap: spacing.lg,
  },
  row: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  value: {
    color: colors.textSecondary,
    textAlign: 'right',
  },
  servingsSeparated: {
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  servingsButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  servingsCount: {
    minWidth: 24,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});

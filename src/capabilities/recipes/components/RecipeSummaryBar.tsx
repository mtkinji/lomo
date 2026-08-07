import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
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
  yieldUnit,
}: {
  prepMinutes: number | null;
  cookMinutes: number | null;
  inactiveMinutes?: number;
  yieldQuantity: number | null;
  yieldUnit: string | null;
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
  if (yieldQuantity !== null) {
    items.push({
      label: 'Makes',
      value: `${yieldQuantity} ${yieldUnit ?? 'servings'}`,
      icon: 'meal',
    });
  }

  if (!items.length) return null;

  return (
    <View accessibilityLabel="What this recipe takes" style={styles.section}>
      <Heading variant="sm">What this recipe takes</Heading>
      <View style={styles.list}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  list: {
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
});

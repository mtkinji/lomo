import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Heading, Text } from '../../../ui/Typography';
import {
  formatScaledRecipeYield,
  RECIPE_SCALE_MULTIPLIERS,
  type RecipeScaleMultiplier,
} from '../domain/recipeScaling';

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
  multiplier,
  scalingAvailable,
  onMultiplierChange,
}: {
  prepMinutes: number | null;
  cookMinutes: number | null;
  inactiveMinutes?: number;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  multiplier: RecipeScaleMultiplier;
  scalingAvailable: boolean;
  onMultiplierChange(value: RecipeScaleMultiplier): void;
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
  const scaledYield = yieldQuantity !== null && yieldUnit?.trim()
    ? formatScaledRecipeYield({ yieldQuantity, yieldUnit, multiplier })
    : null;
  const multiplierIndex = RECIPE_SCALE_MULTIPLIERS.indexOf(multiplier);
  const previousMultiplier = RECIPE_SCALE_MULTIPLIERS[multiplierIndex - 1];
  const nextMultiplier = RECIPE_SCALE_MULTIPLIERS[multiplierIndex + 1];

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
              <Icon name="layers" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.label}>Recipe size</Text>
              <View style={styles.servingsControl}>
                {scalingAvailable ? <View style={styles.servingsButtons}>
                  <Button
                    accessibilityLabel="Decrease recipe size"
                    accessibilityState={{ disabled: previousMultiplier === undefined }}
                    disabled={previousMultiplier === undefined}
                    hitSlop={8}
                    size="icon"
                    iconButtonSize={28}
                    variant="outline"
                    onPress={() => previousMultiplier && onMultiplierChange(previousMultiplier)}
                  >
                    −
                  </Button>
                  <Button
                    accessibilityLabel="Increase recipe size"
                    accessibilityState={{ disabled: nextMultiplier === undefined }}
                    disabled={nextMultiplier === undefined}
                    hitSlop={8}
                    size="icon"
                    iconButtonSize={28}
                    variant="outline"
                    onPress={() => nextMultiplier && onMultiplierChange(nextMultiplier)}
                  >
                    +
                  </Button>
                </View> : null}
                <Text
                  accessibilityLabel={`${multiplier} times${scaledYield ? `. Makes ${scaledYield}` : ''}`}
                  accessibilityLiveRegion="polite"
                  style={styles.servingsCount}
                >
                  {multiplier}×
                </Text>
              </View>
            </View>
            {scaledYield ? <Text tone="secondary" style={styles.yieldCopy}>Makes {scaledYield}</Text> : null}
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
  yieldCopy: {
    marginLeft: 44,
  },
});

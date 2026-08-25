import { Pressable } from '@/src/ui/HapticPressable';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, radii, spacing } from '../../../theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
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
  const multiplierAccessibilityValue = `${multiplier} ${multiplier === 1 ? 'time' : 'times'}`;

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
          <View style={items.length ? styles.yieldSection : undefined}>
            {items.length ? <View style={styles.divider} /> : null}
            <View style={styles.yieldRows}>
              {scalingAvailable ? (
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Icon name="recipeScale" size={20} color={colors.textSecondary} />
                  </View>
                  <Text accessible={false} style={styles.label}>Scale</Text>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      {...({ asChild: true } as const)}
                      accessibilityLabel={`Scale recipe, currently ${multiplierAccessibilityValue}`}
                    >
                      <Pressable
                        accessibilityHint="Choose one, two, or three times the recipe"
                        accessibilityLabel={`Scale recipe, currently ${multiplierAccessibilityValue}`}
                        accessibilityRole="button"
                        hitSlop={6}
                        testID="recipe-scale-trigger"
                        style={({ pressed }) => [
                          styles.scaleTrigger,
                          pressed ? styles.scaleTriggerPressed : null,
                        ]}
                      >
                        <Text style={styles.scaleTriggerText}>{`${multiplier}X`}</Text>
                        <Icon
                          color={colors.textSecondary}
                          name="chevronDown"
                          size={14}
                          testID="recipe-scale-chevron"
                        />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end">
                      {RECIPE_SCALE_MULTIPLIERS.map((option) => (
                        <DropdownMenuItem
                          key={option}
                          label={`${option}X · Makes ${formatScaledRecipeYield({ yieldQuantity, yieldUnit: yieldUnit ?? '', multiplier: option })}`}
                          selected={option === multiplier}
                          onPress={() => onMultiplierChange(option)}
                        />
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>
              ) : null}
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Icon name="recipeYield" size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.label}>Makes</Text>
                <Text
                  accessibilityLabel={`Makes ${scaledYield}`}
                  accessibilityLiveRegion="polite"
                  style={styles.yieldValue}
                >
                  {scaledYield}
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
  yieldSection: {
    gap: spacing.md,
  },
  yieldRows: {
    gap: spacing.lg,
  },
  scaleTrigger: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.shellAlt,
    paddingHorizontal: spacing.sm,
  },
  scaleTriggerPressed: {
    opacity: 0.7,
  },
  scaleTriggerText: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  yieldValue: {
    flexShrink: 1,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});

import { parseIngredientLine } from "@kwilt/food-core";
import type { RefObject } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts, spacing } from "../../../theme";
import { Icon } from "../../../ui/Icon";
import { Heading, Text } from "../../../ui/Typography";
import type { RecipeIngredientLine } from "../domain/recipeContracts";
import {
  scaledIngredientDisplay,
  type RecipeScaleMultiplier,
} from "../domain/recipeScaling";

export { scaledIngredientDisplay } from "../domain/recipeScaling";

export function ingredientDisplayParts(
  line: RecipeIngredientLine,
  multiplier: RecipeScaleMultiplier,
): {
  amount: string | null;
  ingredient: string;
  qualifier: string | null;
  display: string;
} {
  const display = scaledIngredientDisplay(line, multiplier);
  return ingredientDisplayPartsFromText(display);
}

function ingredientDisplayPartsFromText(display: string): {
  amount: string | null;
  ingredient: string;
  qualifier: string | null;
  display: string;
} {
  const parsed = parseIngredientLine(display);
  const parsedConcept = parsed.concept.trim();
  if (!parsedConcept)
    return { amount: null, ingredient: display, qualifier: null, display };

  const ingredientStart = display
    .toLocaleLowerCase()
    .indexOf(parsedConcept.toLocaleLowerCase());
  if (ingredientStart < 0)
    return { amount: null, ingredient: display, qualifier: null, display };

  const parenthetical = /\([^)]*\)\s*$/.exec(
    display.slice(0, ingredientStart),
  );
  const displayIngredientStart = parenthetical?.index ?? ingredientStart;
  const ingredient = display.slice(
    displayIngredientStart,
    ingredientStart + parsedConcept.length,
  );
  const amount = display.slice(0, displayIngredientStart).trim() || null;
  const qualifier = display.slice(displayIngredientStart + ingredient.length) || null;
  return { amount, ingredient, qualifier, display };
}

export type RecipeIngredientChecklistItem = {
  id: string;
  display: string;
  groupLabel?: string | null;
  supportingText?: string | null;
};

export function RecipeIngredientChecklist({
  items,
  checked,
  onToggle,
  onLongPress,
  firstItemTargetRef,
  targetItemId,
  disabled = false,
  accessibilityHint,
}: {
  items: RecipeIngredientChecklistItem[];
  checked: Set<string>;
  onToggle(id: string): void;
  onLongPress?(id: string): void;
  firstItemTargetRef?: RefObject<View | null>;
  targetItemId?: string | null;
  disabled?: boolean;
  accessibilityHint?(item: RecipeIngredientChecklistItem, checked: boolean): string;
}) {
  return (
    <View testID="ingredient-list" style={styles.list}>
      {items.map((item, index) => {
        const active = checked.has(item.id);
        const isTarget = Boolean(
          firstItemTargetRef && (targetItemId ? item.id === targetItemId : index === 0),
        );
        const parts = ingredientDisplayPartsFromText(item.display);
        const showGroup =
          Boolean(item.groupLabel) &&
          item.groupLabel !== items[index - 1]?.groupLabel;
        return (
          <View
            key={item.id}
            ref={isTarget ? firstItemTargetRef : undefined}
            collapsable={!isTarget}
            testID={isTarget ? 'ingredient-coachmark-target' : undefined}
            style={styles.groupedLine}
          >
            {showGroup ? (
              <Text variant="label" tone="secondary" style={styles.groupLabel}>
                {item.groupLabel}
              </Text>
            ) : null}
            <Pressable
              {...(disabled ? { disabled: true } : {})}
              accessibilityRole="checkbox"
              accessibilityLabel={parts.display}
              accessibilityHint={accessibilityHint?.(item, active)}
              accessibilityState={
                disabled ? { checked: active, disabled: true } : { checked: active }
              }
              onPress={() => onToggle(item.id)}
              onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
              style={({ pressed }) => [
                styles.line,
                pressed && styles.linePressed,
              ]}
            >
              <View
                testID={`ingredient-check-${item.id}`}
                style={[styles.check, active && styles.checkActive]}
              >
                {active ? (
                  <Icon
                    name="check"
                    size={14}
                    color={colors.primaryForeground}
                  />
                ) : null}
              </View>
              <View style={styles.lineCopy}>
                <Text style={[styles.lineText, active && styles.done]}>
                  {parts.amount ? (
                  <>
                    <Text
                      testID={`ingredient-amount-${item.id}`}
                      style={styles.amount}
                    >
                      {parts.amount}
                    </Text>{" "}
                  </>
                ) : null}
                <Text
                  testID={`ingredient-name-${item.id}`}
                  style={styles.ingredient}
                >
                  {parts.ingredient}
                </Text>
                {parts.qualifier ? (
                  <Text
                    testID={`ingredient-qualifier-${item.id}`}
                    style={styles.qualifier}
                  >
                    {parts.qualifier}
                  </Text>
                  ) : null}
                </Text>
                {item.supportingText ? (
                  <Text variant="bodySm" tone="secondary">{item.supportingText}</Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function RecipeIngredientList({
  lines,
  multiplier,
  checked,
  onToggle,
}: {
  lines: RecipeIngredientLine[];
  multiplier: RecipeScaleMultiplier;
  checked: Set<string>;
  onToggle(id: string): void;
}) {
  const scalingBlocked = multiplier > 1 && lines.some((line) => line.scaleRule.kind === 'review_required');
  const effectiveMultiplier: RecipeScaleMultiplier = scalingBlocked ? 1 : multiplier;
  return (
    <View style={styles.section}>
      <Heading variant="md">Ingredients</Heading>
      {scalingBlocked ? (
        <Text tone="secondary">Recipe scaling is unavailable for these ingredients.</Text>
      ) : null}
      {lines.length ? (
        <RecipeIngredientChecklist
          items={lines.map((line) => ({
            id: line.id,
            display: scaledIngredientDisplay(line, effectiveMultiplier),
            groupLabel: line.groupLabel,
          }))}
          checked={checked}
          onToggle={onToggle}
        />
      ) : (
        <Text tone="secondary">No ingredients added yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  list: { gap: 0 },
  groupedLine: { gap: spacing.xs },
  groupLabel: { marginTop: spacing.sm },
  line: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linePressed: { opacity: 0.72 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  lineCopy: { flex: 1, gap: 2 },
  lineText: { flex: 1 },
  amount: { fontFamily: fonts.medium },
  ingredient: { fontFamily: fonts.regular },
  qualifier: { fontFamily: fonts.regular, color: colors.textSecondary },
  done: { textDecorationLine: "line-through", color: colors.textSecondary },
});

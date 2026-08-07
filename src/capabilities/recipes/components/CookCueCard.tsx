import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../../../theme";
import { Heading, Text } from "../../../ui/Typography";
import type { CookCue } from "../domain/recipeCookContracts";

export function CookIngredientList({
  ingredients,
  columns = 2,
}: {
  ingredients: CookCue["ingredientReferences"];
  columns?: 1 | 2;
}) {
  if (!ingredients.length) return null;
  return (
    <View
      style={[
        styles.ingredients,
        columns === 1 && styles.singleColumnIngredients,
      ]}
    >
      {ingredients.map((item) => (
        <View
          key={item.ingredientLineId}
          accessible
          accessibilityLabel={`${item.displayAmount ? `${item.displayAmount} ` : ""}${item.concept}`}
          style={[
            styles.ingredient,
            columns === 1 && styles.singleColumnIngredient,
          ]}
        >
          <Text tone="secondary" numberOfLines={1} style={styles.amount}>
            {item.displayAmount ?? ""}
          </Text>
          <Text tone="secondary" style={styles.ingredientName}>
            {item.concept}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function CookCueCard({
  cue,
  showStepLabel = true,
  showIngredients = true,
  align = "center",
}: {
  cue: CookCue;
  showStepLabel?: boolean;
  showIngredients?: boolean;
  align?: "center" | "top";
}) {
  const actionText = cue.actionText || cue.displayText;
  const ingredientDense = cue.ingredientReferences.length > 4;
  const actionVariant =
    cue.ingredientReferences.length > 6 ? "md" : ingredientDense ? "lg" : "xl";
  return (
    <View
      accessible
      accessibilityLabel={cue.accessibilityLabel}
      style={[
        styles.card,
        align === "top" && styles.topAlignedCard,
        ingredientDense && styles.ingredientDenseCard,
      ]}
    >
      {showStepLabel ? (
        <Text variant="label" style={styles.step}>
          {getCookCuePositionLabel(cue)}
        </Text>
      ) : null}
      <Heading variant={actionVariant}>{actionText}</Heading>
      {cue.supportingCue ? (
        <View style={styles.supporting}>
          <Text variant="label" style={styles.supportingLabel}>
            Ready when
          </Text>
          <Text variant="body">{cue.supportingCue.text}</Text>
        </View>
      ) : null}
      {showIngredients ? (
        <CookIngredientList ingredients={cue.ingredientReferences} />
      ) : null}
    </View>
  );
}

export function getCookCuePositionLabel(cue: CookCue): string {
  const phase = `Phase ${cue.phasePosition + 1} of ${cue.phaseCount}`;
  return cue.cueCountInPhase > 1
    ? `${phase} · Action ${cue.cuePositionInPhase + 1} of ${cue.cueCountInPhase}`
    : phase;
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 300,
    paddingVertical: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  topAlignedCard: { justifyContent: "flex-start", paddingTop: spacing.md },
  ingredientDenseCard: { paddingVertical: spacing.sm, gap: spacing.sm },
  step: {
    color: colors.textPrimary,
    opacity: 0.68,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  supporting: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(31,36,32,0.24)",
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  supportingLabel: {
    color: colors.textPrimary,
    opacity: 0.68,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ingredients: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  singleColumnIngredients: {
    flexDirection: "column",
    flexWrap: "nowrap",
    gap: spacing.sm,
  },
  ingredient: {
    width: "48%",
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  singleColumnIngredient: { width: "100%" },
  amount: { width: 132, flexShrink: 0, fontVariant: ["tabular-nums"] },
  ingredientName: { flex: 1, minWidth: 0 },
});

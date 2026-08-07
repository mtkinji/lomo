import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeIngredientLine } from '../domain/recipeContracts';
import { formatKitchenQuantity, scaleRecipeQuantity } from '../domain/recipeScaling';

export function scaledIngredientDisplay(line: RecipeIngredientLine, fromYield: number | null, toYield: number): string {
  if (!fromYield || line.quantityMin === null || !line.ingredientConcept || (line.parseConfidence ?? 0) < 0.8) return line.originalText;
  const scaled = scaleRecipeQuantity({ quantity: line.quantityMin, quantityMax: line.quantityMax, fromYield, toYield });
  if (scaled.quantity === null) return line.originalText;
  const amount = `${formatKitchenQuantity(scaled.quantity)}${scaled.quantityMax === null ? '' : `–${formatKitchenQuantity(scaled.quantityMax)}`}${line.unit ? ` ${line.unit}` : ''}`;
  const preparation = line.preparation ? `, ${line.preparation}` : '';
  return `${amount} ${line.ingredientConcept}${preparation}${line.optional ? ' (optional)' : ''}`;
}

export function RecipeIngredientList({ lines, fromYield, toYield }: {
  lines: RecipeIngredientLine[]; fromYield: number | null; toYield: number;
}) {
  return <View style={styles.section}><Heading variant="md">Ingredients</Heading>{lines.length ? lines.map((line, index) => {
    const showGroup = Boolean(line.groupLabel) && line.groupLabel !== lines[index - 1]?.groupLabel;
    return <View key={line.id} style={styles.groupedLine}>
      {showGroup ? <Text variant="label" tone="secondary" style={styles.groupLabel}>{line.groupLabel}</Text> : null}
      <Text style={styles.line}>{scaledIngredientDisplay(line, fromYield, toYield)}</Text>
    </View>;
  }) : <Text tone="secondary">No ingredients added yet.</Text>}</View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm }, groupedLine: { gap: spacing.xs }, groupLabel: { marginTop: spacing.sm }, line: { paddingVertical: spacing.xs },
});

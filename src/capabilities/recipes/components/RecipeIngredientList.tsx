import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { colors, spacing } from '../../../theme';
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

export function RecipeIngredientList({ lines, fromYield, toYield, checked, onToggle }: {
  lines: RecipeIngredientLine[]; fromYield: number | null; toYield: number; checked: Set<string>; onToggle(id: string): void;
}) {
  return <View style={styles.section}><Heading variant="md">Ingredients</Heading>{lines.length ? lines.map((line) => {
    const active = checked.has(line.id);
    return <Pressable key={line.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(line.id)} style={styles.line}>
      <View style={[styles.check, active && styles.checkActive]}>{active ? <Check size={14} color={colors.primaryForeground} /> : null}</View>
      <Text style={active ? styles.done : undefined}>{scaledIngredientDisplay(line, fromYield, toYield)}</Text>
    </Pressable>;
  }) : <Text tone="secondary">No ingredients added yet.</Text>}</View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm }, line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: colors.pine700, borderColor: colors.pine700 }, done: { textDecorationLine: 'line-through', color: colors.textSecondary },
});

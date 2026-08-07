import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Text } from '../../../ui/Typography';
import type { FoodBudgetProjection } from '../../money/domain/foodBudgetProjection';

function money(cents: number) { return `$${Math.abs(cents / 100).toFixed(0)}`; }
export function FoodRealityStrip({ budget, tripTargetCents, relevantStockCount, priceEvidence, onBudget, onStock, onPrices }: {
  budget: FoodBudgetProjection | null; tripTargetCents: number | null; relevantStockCount: number; priceEvidence: { retailer: string; observedAt: string; coveragePercent: number } | null;
  onBudget(): void; onStock(): void; onPrices(): void;
}) {
  return <View accessibilityLabel="Food planning reality" style={styles.strip}>
    <Pressable onPress={onBudget} style={styles.fact}><Text variant="label" tone="secondary">THIS SHOP</Text><Text>{tripTargetCents === null ? 'Set a trip target' : `Aim for ${money(tripTargetCents)}`}</Text>{budget?.remainingCents !== null && budget?.remainingCents !== undefined ? <Text tone="secondary">{money(budget.remainingCents)} left in Food · {budget.state}</Text> : null}</Pressable>
    <Pressable onPress={onStock} style={styles.fact}><Text variant="label" tone="secondary">ON HAND</Text><Text>{relevantStockCount ? `${relevantStockCount} relevant ingredients` : 'Confirm what matters'}</Text></Pressable>
    <Pressable onPress={onPrices} style={styles.fact}><Text variant="label" tone="secondary">PRICES</Text><Text>{priceEvidence ? `${priceEvidence.retailer} · ${priceEvidence.coveragePercent}% covered` : 'No current prices'}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ strip: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, backgroundColor: colors.card, overflow: 'hidden' }, fact: { padding: spacing.md, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } });

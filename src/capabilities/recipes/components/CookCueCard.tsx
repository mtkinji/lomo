import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import type { CookCue } from '../domain/recipeCookContracts';

export function CookCueCard({ cue }: { cue: CookCue }) {
  return <View accessible accessibilityLabel={cue.accessibilityLabel} style={styles.card}>{cue.section ? <Text variant="label" tone="secondary">{cue.section.toUpperCase()}</Text> : null}<Heading variant="lg">{cue.displayText}</Heading>{cue.ingredientReferences.length ? <View style={styles.ingredients}>{cue.ingredientReferences.map((item) => <Text key={item.ingredientLineId} tone="secondary">{item.displayAmount ? `${item.displayAmount} ` : ''}{item.concept}</Text>)}</View> : null}</View>;
}
const styles = StyleSheet.create({ card: { flex: 1, minHeight: 280, borderRadius: 28, padding: spacing.lg, justifyContent: 'center', gap: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }, ingredients: { gap: spacing.xs } });

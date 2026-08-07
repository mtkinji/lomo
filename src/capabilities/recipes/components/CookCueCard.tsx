import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import type { CookCue } from '../domain/recipeCookContracts';

export function CookCueCard({ cue, current, total }: { cue: CookCue; current: number; total: number }) {
  const actionText = cue.actionText || cue.displayText;
  return <View accessible accessibilityLabel={cue.accessibilityLabel} style={styles.card}>
    <Text variant="label" style={styles.step}>Step {current} of {total}</Text>
    <Heading variant="xl">{actionText}</Heading>
    {cue.supportingCue ? <View style={styles.supporting}>
      <Text variant="label" style={styles.supportingLabel}>Ready when</Text>
      <Text variant="body">{cue.supportingCue.text}</Text>
    </View> : null}
    {cue.ingredientReferences.length ? <View style={styles.ingredients}>{cue.ingredientReferences.map((item) => <Text key={item.ingredientLineId} tone="secondary">{item.displayAmount ? `${item.displayAmount} ` : ''}{item.concept}</Text>)}</View> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 300, paddingVertical: spacing.xl, justifyContent: 'center', gap: spacing.md },
  step: { color: colors.textPrimary, opacity: 0.68, textTransform: 'uppercase', letterSpacing: 0.5 },
  supporting: { borderLeftWidth: 2, borderLeftColor: 'rgba(31,36,32,0.24)', paddingLeft: spacing.md, gap: spacing.xs },
  supportingLabel: { color: colors.textPrimary, opacity: 0.68, textTransform: 'uppercase', letterSpacing: 0.5 },
  ingredients: { gap: spacing.xs },
});

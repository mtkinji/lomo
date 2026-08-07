import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeInstructionStep } from '../domain/recipeContracts';

export function RecipeMethodPreview({ steps }: { steps: RecipeInstructionStep[] }) {
  return <View style={styles.section}><Heading variant="md">Method</Heading>{steps.length ? steps.map((step, index) => <View key={step.id} style={styles.groupedStep}>
    {step.sectionLabel && step.sectionLabel !== steps[index - 1]?.sectionLabel ? <Text variant="label" tone="secondary" style={styles.sectionLabel}>{step.sectionLabel}</Text> : null}
    <View style={styles.step}><Text variant="label" tone="secondary">{step.position + 1}</Text><Text style={styles.text}>{step.text}</Text></View>
  </View>) : <Text tone="secondary">No method added yet.</Text>}</View>;
}
const styles = StyleSheet.create({ section: { gap: spacing.sm }, groupedStep: { gap: spacing.xs }, sectionLabel: { marginTop: spacing.sm }, step: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs }, text: { flex: 1 } });

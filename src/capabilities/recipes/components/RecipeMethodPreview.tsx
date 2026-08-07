import { StyleSheet, View } from 'react-native';

import { colors, fonts, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeInstructionStep } from '../domain/recipeContracts';
import { buildRecipeInstructionPhases } from '../domain/recipeInstructionPhases';

function isMeaningfulSectionLabel(
  sectionLabel: string | null,
  previousSectionLabel: string | null | undefined,
) {
  if (!sectionLabel || sectionLabel === previousSectionLabel) return false;
  return sectionLabel.trim().toLowerCase() !== 'cook';
}

export function RecipeMethodPreview({ steps }: { steps: RecipeInstructionStep[] }) {
  const phases = buildRecipeInstructionPhases(steps);
  return (
    <View style={styles.section}>
      <Heading variant="md">Instructions</Heading>
      {phases.length ? (
        phases.map((phase, index) => (
          <View key={phase.id} style={styles.groupedStep}>
            {isMeaningfulSectionLabel(
              phase.title,
              phases[index - 1]?.title,
            ) ? (
              <Text variant="label" tone="secondary" style={styles.sectionLabel}>
                {phase.title}
              </Text>
            ) : null}
            <View
              accessible
              accessibilityLabel={`Phase ${phase.position + 1}. ${phase.cues.map((cue) => cue.text).join(' ')}`}
              style={styles.step}
            >
              <View
                testID={`recipe-instruction-number-${phase.position + 1}`}
                style={styles.stepNumber}
              >
                <Text style={styles.stepNumberText}>{phase.position + 1}</Text>
              </View>
              <View style={styles.cueList}>
                {phase.cues.map((cue) => (
                  <Text key={cue.id} style={styles.text}>{cue.text}</Text>
                ))}
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text tone="secondary">No instructions added yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  groupedStep: { gap: spacing.xs },
  sectionLabel: { marginTop: spacing.sm },
  step: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexShrink: 0,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepNumberText: {
    color: colors.primaryForeground,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  cueList: { flex: 1, gap: spacing.xs },
  text: { flex: 1 },
});

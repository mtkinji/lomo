import { StyleSheet, View } from 'react-native';

import type { MealFitResult } from '../../../features/household-food/domain/householdMealFit';
import { colors, radii, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/Typography';

export type MealFitCalloutProps = {
  fit: MealFitResult;
  personLabelsById: Record<string, string>;
  canRevealPersonLabels: boolean;
  onMakeForOthers(): void;
  onChooseAnother(): void;
  onReviewIngredients(): void;
};

export function MealFitCallout(props: MealFitCalloutProps) {
  if (props.fit.status === 'no_recorded_conflict') return null;
  if (props.fit.status === 'not_checked') return (
    <View style={styles.unknown}>
      <Text variant="label">Not checked against food needs.</Text>
      <Text tone="secondary">Some ingredients do not have enough structured evidence yet.</Text>
      <Button size="sm" variant="ghost" onPress={props.onReviewIngredients}>Review ingredients</Button>
    </View>
  );
  const first = props.fit.conflicts[0];
  const person = props.personLabelsById[first.personId];
  const message = props.canRevealPersonLabels && person
    ? `${first.displayLabel} conflict with ${person}'s food needs.`
    : `This meal conflicts with ${props.fit.conflicts.length} recorded food ${props.fit.conflicts.length === 1 ? 'need' : 'needs'}.`;
  return (
    <View style={styles.conflict}>
      <Text>{message}</Text>
      <Text tone="secondary">This is based on recorded ingredients and household entries. Review the recipe and labels.</Text>
      <View style={styles.actions}>
        <Button size="sm" variant="outline" onPress={props.onMakeForOthers}>Make for everyone else</Button>
        <Button size="sm" variant="ghost" onPress={props.onChooseAnother}>Choose another meal</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conflict: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.input, backgroundColor: 'rgba(249, 115, 22, 0.10)' },
  unknown: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.input, backgroundColor: colors.fieldFill },
  actions: { alignItems: 'flex-start', gap: spacing.xs },
});

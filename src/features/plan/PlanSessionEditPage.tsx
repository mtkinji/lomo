import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { colors, spacing } from '../../theme';
import { Heading, Text, VStack } from '../../ui/primitives';
import { formatTimeRange } from '../../services/plan/planDates';
import { formatPlanSessionDuration } from './planSessionEdit';

export type PlanSessionEditModel = {
  title: string;
  start: Date;
  end: Date;
  isSaving: boolean;
};

export function PlanSessionEditPage({
  title,
  start,
  end,
  isSaving,
  onDone,
}: PlanSessionEditModel & { onDone?: () => void }) {
  const timing = `${formatTimeRange(start, end)} · ${formatPlanSessionDuration(start, end)}`;

  return (
    <View style={styles.container}>
      <VStack space={spacing.xs}>
        <Heading variant="sm" numberOfLines={2}>{title}</Heading>
        <Text style={styles.timing}>{timing}</Text>
      </VStack>
      {onDone ? (
        <Button onPress={onDone} disabled={isSaving} style={styles.doneButton}>
          {isSaving ? 'Saving…' : 'Done'}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  doneButton: { marginTop: spacing.md },
  timing: {
    color: colors.textSecondary,
  },
});

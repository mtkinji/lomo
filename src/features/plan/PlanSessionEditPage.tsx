import React from 'react';
import { StyleSheet, View } from 'react-native';
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
}: PlanSessionEditModel) {
  const timing = `${formatTimeRange(start, end)} · ${formatPlanSessionDuration(start, end)}`;

  return (
    <View style={styles.container}>
      <VStack space={spacing.xs}>
        <Heading variant="sm" numberOfLines={2}>{title}</Heading>
        <Text style={styles.timing}>{timing}</Text>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  timing: {
    color: colors.textSecondary,
  },
});

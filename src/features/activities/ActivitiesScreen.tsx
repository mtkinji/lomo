import { StyleSheet } from 'react-native';
import { VStack } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, typography } from '../../theme';

export function ActivitiesScreen() {
  return (
    <AppShell>
      <PageHeader
        title="Activities"
        subtitle="Capture, prioritize, and schedule the moves that bring your arcs to life."
      />
      <VStack space="sm">
        {/* Placeholder body copy while the workspace is under construction */}
      </VStack>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});



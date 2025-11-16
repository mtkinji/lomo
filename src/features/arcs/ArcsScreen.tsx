import { StyleSheet } from 'react-native';
import { VStack, Heading, Text } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography } from '../../theme';

export function ArcsScreen() {
  return (
    <AppShell>
      <VStack space="lg">
        <VStack space="xs" style={styles.header}>
          <Heading style={styles.title}>Arcs</Heading>
          <Text style={styles.subtitle}>Who you&apos;re becoming</Text>
        </VStack>
        <VStack space="sm" style={styles.emptyState}>
          <Heading style={styles.emptyTitle}>No arcs yet</Heading>
          <Text style={styles.emptyBody}>
            Arcs are long-horizon identity directions like Discipleship, Family Stewardship, or
            Making &amp; Embodied Creativity. We&apos;ll use AI to help you define them.
          </Text>
        </VStack>
      </VStack>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});



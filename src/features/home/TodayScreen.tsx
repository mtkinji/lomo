import { StyleSheet } from 'react-native';
import { VStack, Heading, Text } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, typography, spacing } from '../../theme';

export function TodayScreen() {
  return (
    <AppShell>
      <VStack space="lg">
        <VStack space="xs" style={styles.header}>
          <Heading style={styles.title}>LOMO</Heading>
          <Text style={styles.subtitle}>Today&apos;s Activities</Text>
        </VStack>
        <VStack space="sm" style={styles.emptyState}>
          <Heading style={styles.emptyTitle}>No activities yet</Heading>
          <Text style={styles.emptyBody}>
            Start by creating an Arc, then a Goal, then the Activities that will shape this chapter
            of your life.
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



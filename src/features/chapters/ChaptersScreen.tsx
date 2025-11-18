import { StyleSheet } from 'react-native';
import { VStack, Heading, Text } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';

export function ChaptersScreen() {
  return (
    <AppShell>
      <PageHeader title="Chapters" subtitle="AI-generated lookbacks" />
      <VStack space="lg">
        <VStack space="sm" style={styles.emptyState}>
          <Heading style={styles.emptyTitle}>No chapters yet</Heading>
          <Text style={styles.emptyBody}>
            Chapters are narrative summaries of a chosen period in your life. Once you&apos;ve
            logged some Activities, we&apos;ll use AI to help you generate your first Chapter.
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



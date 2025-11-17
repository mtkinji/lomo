import { StyleSheet } from 'react-native';
import { VStack, Heading, Text } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, typography } from '../../theme';

export function ActivitiesScreen() {
  return (
    <AppShell>
      <VStack space="sm">
        <Heading style={styles.title}>Activities</Heading>
        <Text style={styles.subtitle}>
          Capture, prioritize, and schedule the moves that bring your arcs to life. This workspace is
          under construction.
        </Text>
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



import { useEffect, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { VStack, Heading, Text, HStack, Badge } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, typography, spacing } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

export function TodayScreen() {
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const goalLookup = goals.reduce<Record<string, string>>((acc, goal) => {
    acc[goal.id] = goal.title;
    return acc;
  }, {});
  const [networkCheck, setNetworkCheck] = useState<string>('pending');

  useEffect(() => {
    console.log('running network check');
    fetch('https://jsonplaceholder.typicode.com/todos/1')
      .then((res) => res.json())
      .then(() => {
        console.log('network check success');
        setNetworkCheck('success');
      })
      .catch((err) => {
        console.error('network check failed', err);
        setNetworkCheck(`failed: ${err?.message ?? 'unknown'}`);
      });
  }, []);
  const isEmpty = activities.length === 0;

  return (
    <AppShell>
      <VStack space="lg">
        <VStack space="xs" style={styles.header}>
          <Heading style={styles.title}>LOMO</Heading>
          <Text style={styles.subtitle}>Today&apos;s Activities</Text>
        {networkCheck !== 'success' && (
          <Text style={styles.networkText}>
            Network check: {networkCheck === 'pending' ? 'checking…' : networkCheck}
          </Text>
        )}
        </VStack>
        {isEmpty ? (
          <VStack space="sm" style={styles.emptyState}>
            <Heading style={styles.emptyTitle}>No activities yet</Heading>
            <Text style={styles.emptyBody}>
              Start by creating an Arc, then a Goal, then the Activities that will shape this chapter
              of your life.
            </Text>
          </VStack>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <VStack style={styles.separator} />}
            renderItem={({ item }) => (
              <VStack space="sm" style={styles.activityCard}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Heading style={styles.activityTitle}>{item.title}</Heading>
                  <Badge variant="solid" action={item.status === 'done' ? 'success' : 'muted'}>
                    <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
                  </Badge>
                </HStack>
                {goalLookup[item.goalId ?? ''] && (
                  <Text style={styles.goalLabel}>{goalLookup[item.goalId ?? '']}</Text>
                )}
                <HStack justifyContent="space-between">
                  <Text style={styles.metaText}>
                    Estimate: {Math.round((item.estimateMinutes ?? 0) / 60)}h
                  </Text>
                  {item.phase && <Text style={styles.metaText}>{item.phase}</Text>}
                </HStack>
              </VStack>
            )}
          />
        )}
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
  networkText: {
    marginTop: spacing.xs,
    ...typography.bodySm,
    color: colors.warning,
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
  activityCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  badgeText: {
    ...typography.bodySm,
    color: '#0f172a',
  },
  goalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
});



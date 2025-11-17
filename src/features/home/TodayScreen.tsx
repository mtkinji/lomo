import { useEffect, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { VStack, Heading, Text, HStack, Badge } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, typography, spacing } from '../../theme';
import { useAppStore } from '../../store/useAppStore';

const NETWORK_CHECK_URL = 'https://jsonplaceholder.typicode.com/todos/1';

export function TodayScreen() {
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const goalLookup = goals.reduce<Record<string, string>>((acc, goal) => {
    acc[goal.id] = goal.title;
    return acc;
  }, {});
  const [networkCheck, setNetworkCheck] = useState<string>('pending');

  useEffect(() => {
    let cancelled = false;
    const runNetworkCheck = async () => {
      const start = Date.now();
      if (__DEV__) {
        console.log('[today][network-check] starting', {
          url: NETWORK_CHECK_URL,
          timestamp: new Date(start).toISOString(),
        });
      }
      try {
        const response = await fetch(NETWORK_CHECK_URL);
        const duration = Date.now() - start;
        if (__DEV__) {
          console.log('[today][network-check] response', {
            status: response.status,
            ok: response.ok,
            durationMs: duration,
          });
        }
        const text = await response.text();
        if (__DEV__) {
          console.log('[today][network-check] payload', {
            preview: text.slice(0, 120),
          });
        }
        if (cancelled) {
          if (__DEV__) {
            console.log('[today][network-check] cancelled before completion');
          }
          return;
        }
        setNetworkCheck('success');
      } catch (err) {
        const duration = Date.now() - start;
        console.error('network check failed', err);
        if (__DEV__) {
          console.warn('[today][network-check] failure details', {
            durationMs: duration,
            message: err instanceof Error ? err.message : String(err),
            name: err instanceof Error ? err.name : undefined,
          });
        }
        if (!cancelled) {
          setNetworkCheck(`failed: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    };

    runNetworkCheck();

    return () => {
      cancelled = true;
    };
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



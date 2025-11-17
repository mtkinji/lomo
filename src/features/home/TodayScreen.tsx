import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { VStack, Heading, Text, HStack } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, typography, spacing } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Logo } from '../../ui/Logo';

const NETWORK_CHECK_URL = 'https://jsonplaceholder.typicode.com/todos/1';

export function TodayScreen() {
  const insets = useSafeAreaInsets();
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const goalLookup = goals.reduce<Record<string, string>>((acc, goal) => {
    acc[goal.id] = goal.title;
    return acc;
  }, {});
  const [networkCheck, setNetworkCheck] = useState<string>('pending');
  const today = useMemo(() => new Date(), []);
  const greeting = useMemo(
    () =>
      today.toLocaleDateString(undefined, {
        weekday: 'long',
      }),
    [today]
  );
  const prettyDate = useMemo(
    () =>
      today.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      }),
    [today]
  );

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
  const renderActivity = ({ item, index }: { item: typeof activities[number]; index: number }) => {
    const scheduledDate = item.scheduledDate ? new Date(item.scheduledDate) : null;
    const timeLabel = scheduledDate
      ? scheduledDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : 'Anytime';
    const goalTitle = goalLookup[item.goalId ?? ''];
    return (
      <VStack style={styles.scheduleCard}>
        <HStack justifyContent="space-between" alignItems="center">
          <Text style={styles.scheduleTime}>{timeLabel}</Text>
          {item.phase && <Badge variant="secondary">{item.phase}</Badge>}
        </HStack>
        <Text style={styles.scheduleTitle}>{item.title}</Text>
        {goalTitle ? <Text style={styles.scheduleGoal}>{goalTitle}</Text> : null}
        <HStack justifyContent="space-between">
            <Text style={styles.scheduleMeta}>
              Estimate {Math.round((item.estimateMinutes ?? 0) / 60)}h · {item.status.replace('_', ' ')}
            </Text>
          {item.forceActual && (
            <Text style={styles.scheduleMeta}>Focus {item.forceActual['force-activity'] ?? 0}/3</Text>
          )}
        </HStack>
      </VStack>
    );
  };

  return (
    <AppShell>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: spacing.lg + insets.bottom },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderActivity}
        ListHeaderComponent={
          <VStack space="lg">
            <HStack alignItems="center" space="sm">
              <Logo size={32} />
              <VStack space="xs">
                <Heading style={styles.brand}>Lomo</Heading>
                <Text style={styles.subtitle}>
                  Planner · {greeting} · {prettyDate}
                </Text>
              </VStack>
            </HStack>

            <VStack space="md" style={styles.heroCard}>
              <Text style={styles.heroTitle}>Today&apos;s focus</Text>
              <Text style={styles.heroBody}>
                Track your arcs, review goal drafts, and keep the day grounded in meaningful work.
              </Text>
              <Button style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>Create New Task</Text>
              </Button>
              {networkCheck !== 'success' && (
                <Text style={styles.networkText}>
                  Network check: {networkCheck === 'pending' ? 'checking…' : networkCheck}
                </Text>
              )}
            </VStack>

            <Text style={styles.sectionTitle}>Schedule</Text>
          </VStack>
        }
        ListEmptyComponent={
          <VStack space="sm" style={styles.emptyState}>
            <Heading style={styles.emptyTitle}>No activities yet</Heading>
            <Text style={styles.emptyBody}>
              Start by creating an Arc, then a Goal, then the Activities that will shape this chapter of
              your life.
            </Text>
          </VStack>
        }
        showsVerticalScrollIndicator={false}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textSecondary,
  },
  salutation: {
    ...typography.bodySm,
    color: colors.muted,
  },
  brand: {
    ...typography.brand,
    color: colors.textPrimary,
  },
  heroCard: {
    ...cardSurfaceStyle,
    padding: spacing.xl,
  },
  heroTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  heroBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primaryAction: {
    marginTop: spacing.sm,
  },
  primaryActionText: {
    ...typography.body,
    color: '#FFFFFF',
    fontFamily: typography.body.fontFamily,
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
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  scheduleCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  scheduleTime: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  scheduleTitle: {
    marginTop: spacing.sm,
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  scheduleGoal: {
    marginTop: spacing.xs / 2,
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  scheduleMeta: {
    marginTop: spacing.md,
    ...typography.bodySm,
    color: colors.muted,
  },
  separator: {
    height: spacing.md,
  },
});



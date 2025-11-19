import { StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { VStack, Heading, Text, HStack } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Card } from '../../ui/Card';
import { colors, spacing, typography } from '../../theme';
import type { RootDrawerParamList, ArcsStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';

export function GoalsScreen() {
  const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  const goals = useAppStore((state) => state.goals);
  const arcs = useAppStore((state) => state.arcs);

  const arcLookup = arcs.reduce<Record<string, string>>((acc, arc) => {
    acc[arc.id] = arc.name;
    return acc;
  }, {});

  const hasGoals = goals.length > 0;

  return (
    <AppShell>
      <PageHeader
        title="Goals"
        iconName="goals"
        subtitle="Concrete outcomes inside your arcs."
        menuOpen={menuOpen}
        onPressMenu={() => drawerNavigation.dispatch(DrawerActions.openDrawer())}
      />
      {hasGoals ? (
        <VStack space="md">
          {goals.map((goal) => {
            const arcName = arcLookup[goal.arcId];
            return (
              <TouchableOpacity
                key={goal.id}
                activeOpacity={0.8}
                // For now we only show the list; we'll wire this into the Arc/Goal stack shortly.
                onPress={() =>
                  drawerNavigation.navigate('ArcsStack', {
                    // @ts-expect-error nested navigator params
                    screen: 'GoalDetail' satisfies keyof ArcsStackParamList,
                    params: { goalId: goal.id },
                  })
                }
              >
                <Card style={styles.goalCard}>
                  <VStack space="xs">
                    <Heading style={styles.goalTitle}>{goal.title}</Heading>
                    {arcName ? <Text style={styles.arcName}>{arcName}</Text> : null}
                    {goal.description ? (
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    ) : null}
                    <HStack space="sm" style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        Status: {goal.status.replace('_', ' ')}
                      </Text>
                    </HStack>
                  </VStack>
                </Card>
              </TouchableOpacity>
            );
          })}
        </VStack>
      ) : (
        <VStack space="sm" style={styles.emptyState}>
          <Heading style={styles.emptyTitle}>No goals yet</Heading>
          <Text style={styles.emptyBody}>
            Goals live inside your arcs and express concrete progress. Start by creating an Arc,
            then let Lomo help you design a few goals.
          </Text>
        </VStack>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  goalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  arcName: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  metaRow: {
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
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



import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, FlatList } from 'react-native';
import { VStack, Heading, Text, Badge, HStack, Button } from '@gluestack-ui/themed';
import { useMemo } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { ArcsStackParamList } from '../../navigation/RootNavigator';

type ArcDetailRouteProp = RouteProp<ArcsStackParamList, 'ArcDetail'>;

export function ArcDetailScreen() {
  const route = useRoute<ArcDetailRouteProp>();
  const navigation = useNavigation();
  const { arcId } = route.params;
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);

  const arc = useMemo(() => arcs.find((item) => item.id === arcId), [arcs, arcId]);
  const arcGoals = useMemo(() => goals.filter((goal) => goal.arcId === arcId), [goals, arcId]);

  if (!arc) {
    return (
      <AppShell>
        <Text style={styles.emptyBody}>Arc not found.</Text>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <VStack space="lg">
        <Button variant="link" alignSelf="flex-start" onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back to Arcs</Text>
        </Button>
        <VStack space="sm">
          <Heading style={styles.arcTitle}>{arc.name}</Heading>
          {arc.northStar && <Text style={styles.northStar}>{arc.northStar}</Text>}
          {arc.narrative && <Text style={styles.arcNarrative}>{arc.narrative}</Text>}
          <Badge variant="outline" action="info" alignSelf="flex-start">
            <Text style={styles.badgeText}>{arc.status}</Text>
          </Badge>
        </VStack>

        <VStack space="md">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading style={styles.sectionTitle}>
              Goals <Text style={styles.goalCount}>({arcGoals.length})</Text>
            </Heading>
            <Button variant="link">
              <Text style={styles.linkText}>New Goal</Text>
            </Button>
          </HStack>

          {arcGoals.length === 0 ? (
            <Text style={styles.emptyBody}>No goals yet for this Arc.</Text>
          ) : (
            <FlatList
              data={arcGoals}
              keyExtractor={(goal) => goal.id}
              ItemSeparatorComponent={() => <VStack style={styles.separator} />}
              renderItem={({ item }) => (
                <VStack style={styles.goalCard}>
                  <Heading style={styles.goalTitle}>{item.title}</Heading>
                  {item.description && <Text style={styles.goalDescription}>{item.description}</Text>}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.metaText}>{item.status}</Text>
                    <Text style={styles.metaText}>
                      Intent: {item.forceIntent['force-activity'] ?? 0}/
                      {item.forceIntent['force-mastery'] ?? 0} etc.
                    </Text>
                  </HStack>
                </VStack>
              )}
            />
          )}
        </VStack>
      </VStack>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  goalCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  northStar: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  badgeText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  linkText: {
    ...typography.body,
    color: colors.accent,
  },
  goalCard: {
    backgroundColor: '#0f172a',
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});



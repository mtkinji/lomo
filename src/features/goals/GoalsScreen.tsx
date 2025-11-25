import React from 'react';
import { Alert, StyleSheet, View, ScrollView, StyleProp, ViewStyle, Pressable } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { GoalListCard } from '../../ui/GoalListCard';
import { Card } from '@/components/ui/card';
import { colors, spacing, typography } from '../../theme';
import type { RootDrawerParamList, GoalsStackParamList } from '../../navigation/RootNavigator';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import type { Arc, Goal, GoalDraft, ThumbnailStyle } from '../../domain/types';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { TakadoBottomSheet } from '../../ui/BottomSheet';
import { VStack, Heading, Text, HStack } from '../../ui/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type GoalDraftEntry = {
  arcId: string;
  arcName: string;
  draft: GoalDraft;
};

export function GoalsScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<GoalsStackParamList, 'GoalsList'> &
        DrawerNavigationProp<RootDrawerParamList>
    >();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  const goals = useAppStore((state) => state.goals);
  const arcs = useAppStore((state) => state.arcs);
  const activities = useAppStore((state) => state.activities);
  const goalRecommendations = useAppStore((state) => state.goalRecommendations);
  const addGoal = useAppStore((state) => state.addGoal);
  const dismissGoalRecommendation = useAppStore((state) => state.dismissGoalRecommendation);

  const arcLookup = arcs.reduce<Record<string, string>>((acc, arc) => {
    acc[arc.id] = arc.name;
    return acc;
  }, {});

  const hasGoals = goals.length > 0;
  const [arcPickerVisible, setArcPickerVisible] = React.useState(false);

  const activityCountByGoal = React.useMemo(
    () =>
      activities.reduce<Record<string, number>>((acc, activity) => {
        if (!activity.goalId) return acc;
        acc[activity.goalId] = (acc[activity.goalId] ?? 0) + 1;
        return acc;
      }, {}),
    [activities],
  );

  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const thumbnailStyles = React.useMemo<ThumbnailStyle[]>(() => {
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    // Use a shared constant array so React's external store snapshot
    // remains referentially stable when nothing has changed.
    return ['topographyDots'];
  }, [visuals]);

  const draftEntries: GoalDraftEntry[] = React.useMemo(
    () =>
      Object.entries(goalRecommendations).flatMap(([arcId, drafts]) =>
        (drafts ?? []).map((draft) => ({
          arcId,
          arcName: arcLookup[arcId] ?? 'Unknown Arc',
          draft,
        })),
      ),
    [goalRecommendations, arcLookup],
  );

  const handleAdoptDraft = (entry: GoalDraftEntry) => {
    const { arcId, draft } = entry;
    const timestamp = new Date().toISOString();
    const mergedForceIntent = { ...defaultForceLevels(0), ...draft.forceIntent };

    addGoal({
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      arcId,
      title: draft.title,
      description: draft.description,
      status: draft.status,
      startDate: timestamp,
      targetDate: undefined,
      forceIntent: mergedForceIntent,
      metrics: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    dismissGoalRecommendation(arcId, draft.title);
  };

  const hasDrafts = draftEntries.length > 0;

  const handlePressNewGoal = () => {
    if (arcs.length === 0) {
      Alert.alert(
        'Create an Arc first',
        'Goals live inside your Arcs. Create an Arc, then you can add goals.',
        [
          {
            text: 'Go to Arcs',
            onPress: () => {
              const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
              parent?.navigate('ArcsStack', {
                screen: 'ArcsList',
              });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
      return;
    }

    if (arcs.length === 1) {
      const onlyArc = arcs[0];
      const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
      parent?.navigate('ArcsStack', {
        screen: 'ArcDetail',
        params: {
          arcId: onlyArc.id,
          openGoalCreation: true,
        },
      });
      return;
    }

    setArcPickerVisible(true);
  };

  return (
    <AppShell>
      <PageHeader
        title="Goals"
        iconName="goals"
        menuOpen={menuOpen}
        onPressMenu={() => {
          const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
          parent?.dispatch(DrawerActions.openDrawer());
        }}
        rightElement={
          <IconButton
            accessibilityRole="button"
            accessibilityLabel="Create a new goal"
            style={styles.newGoalButton}
            hitSlop={8}
            onPress={handlePressNewGoal}
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
          </IconButton>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {hasGoals ? (
        <VStack space="sm">
          {goals.map((goal) => {
            const arcName = arcLookup[goal.arcId];
              const statusLabel = goal.status.replace('_', ' ');
              const activityCount = activityCountByGoal[goal.id] ?? 0;
              const activityLabel =
                activityCount === 0
                  ? 'No activities yet'
                  : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;

              const parentArc = arcs.find((arc) => arc.id === goal.arcId);

            return (
                <GoalListCard
                  key={goal.id}
                  goal={goal}
                  parentArc={parentArc}
                  activityCount={activityCount}
                  thumbnailStyles={thumbnailStyles}
                  onPress={() =>
                    navigation.push('GoalDetail', {
                      goalId: goal.id,
                      entryPoint: 'goalsTab',
                    })
                  }
                />
            );
          })}
        </VStack>
      ) : (
        <VStack space="sm" style={styles.emptyState}>
          <Heading style={styles.emptyTitle}>No goals yet</Heading>
          <Text style={styles.emptyBody}>
            Goals live inside your arcs and express concrete progress. Start by creating an Arc,
            then let Takado help you design a few goals.
          </Text>
        </VStack>
      )}

        {hasDrafts && (
          <GoalDraftSection
            entries={draftEntries}
            arcs={arcs}
            thumbnailStyles={thumbnailStyles}
            onAdopt={handleAdoptDraft}
            onDismiss={(entry) => dismissGoalRecommendation(entry.arcId, entry.draft.title)}
          />
        )}
      </ScrollView>
      <GoalArcPickerSheet
        visible={arcPickerVisible}
        arcs={arcs}
        onClose={() => setArcPickerVisible(false)}
        onSelectArc={(arcId) => {
          setArcPickerVisible(false);
          const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
          parent?.navigate('ArcsStack', {
            screen: 'ArcDetail',
            params: {
              arcId,
              openGoalCreation: true,
            },
          });
        }}
      />
    </AppShell>
  );
}

type GoalDraftSectionProps = {
  entries: GoalDraftEntry[];
  arcs: Arc[];
  thumbnailStyles: ThumbnailStyle[];
  onAdopt: (entry: GoalDraftEntry) => void;
  onDismiss: (entry: GoalDraftEntry) => void;
};

function GoalDraftSection({ entries, arcs, thumbnailStyles, onAdopt, onDismiss }: GoalDraftSectionProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <VStack space="xs" style={styles.draftSection}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={styles.draftToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide goal drafts' : 'Show goal drafts'}
      >
        <HStack alignItems="center" space="xs">
          <Text style={styles.draftToggleLabel}>Drafts</Text>
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.draftCountLabel}>({entries.length})</Text>
        </HStack>
      </Pressable>

      {expanded && (
        <VStack space="sm">
          {entries.map((entry) => {
            const { arcId, arcName, draft } = entry;
            const statusLabel = draft.status.replace('_', ' ');
            const activityLevel = draft.forceIntent['force-activity'] ?? 0;
            const masteryLevel = draft.forceIntent['force-mastery'] ?? 0;

            const parentArc = arcs.find((arc) => arc.id === arcId) ?? null;

            const totalSlots = 6; // Activity 3 + Mastery 3
            const filledSlots = activityLevel + masteryLevel;
            const readyPercentage =
              filledSlots <= 0 ? 0 : Math.round((filledSlots / totalSlots) * 100);

            const draftGoal: Goal = {
              id: `draft-${arcId}-${draft.title}`,
              arcId,
              title: draft.title,
              description: draft.description,
              status: draft.status,
              forceIntent: draft.forceIntent,
              metrics: [],
              createdAt: 'draft',
              updatedAt: 'draft',
            };

            return (
              <View key={`${entry.arcId}:${draft.title}`} style={styles.draftCard}>
                <GoalListCard
                  goal={draftGoal}
                  parentArc={parentArc}
                  showThumbnail={false}
                  showActivityMeta={false}
                  compact
                  thumbnailStyles={thumbnailStyles}
                >
                  <HStack
                    style={styles.draftFooterRow}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text style={styles.draftMetaText}>{`Ready ${readyPercentage}%`}</Text>
                    <HStack space="xs" alignItems="center">
                      <Button
                        variant="destructive"
                        size="icon"
                        onPress={() => onDismiss(entry)}
                        accessibilityLabel="Delete draft"
                      >
                        <Icon name="trash" size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onPress={() => onAdopt(entry)}
                      >
                        <HStack space="xs" alignItems="center">
                          <Text>Continue</Text>
                          <Icon name="chevronRight" size={14} />
                        </HStack>
                      </Button>
                    </HStack>
                  </HStack>
                </GoalListCard>
              </View>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}

type GoalArcPickerSheetProps = {
  visible: boolean;
  arcs: { id: string; name: string; narrative?: string | null }[];
  onClose: () => void;
  onSelectArc: (arcId: string) => void;
};

function GoalArcPickerSheet({ visible, arcs, onClose, onSelectArc }: GoalArcPickerSheetProps) {
  if (!visible) {
    return null;
  }

  return (
    <TakadoBottomSheet visible={visible} onClose={onClose} snapPoints={['55%']}>
      <View style={styles.arcPickerContainer}>
        <Heading style={styles.arcPickerTitle}>Choose an Arc for this goal</Heading>
        <Text style={styles.arcPickerBody}>
          Goals live inside your Arcs. Pick the home you want this new goal to strengthen.
        </Text>
        <ScrollView
          style={styles.arcPickerScroll}
          contentContainerStyle={styles.arcPickerScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="sm">
            {arcs.map((arc) => (
              <Pressable
                key={arc.id}
                onPress={() => onSelectArc(arc.id)}
                style={styles.arcPickerRow}
                accessibilityRole="button"
                accessibilityLabel={`Create goal in ${arc.name}`}
              >
                <Text style={styles.arcPickerName}>{arc.name}</Text>
                {arc.narrative ? (
                  <Text
                    style={styles.arcPickerNarrative}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {arc.narrative}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </VStack>
        </ScrollView>
      </View>
    </TakadoBottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
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
  newGoalButton: {
    alignSelf: 'flex-start',
    marginTop: 0,
  },
  draftSection: {
    marginTop: spacing['2xl'],
  },
  draftToggle: {
    paddingVertical: spacing.xs,
  },
  draftToggleLabel: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  draftCountLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  draftCard: {
    marginTop: spacing.sm,
  },
  draftFooterRow: {
    marginTop: spacing.sm,
  },
  draftMetaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  arcPickerContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    flex: 1,
  },
  arcPickerTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  arcPickerBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  arcPickerScroll: {
    flex: 1,
  },
  arcPickerScrollContent: {
    paddingBottom: spacing.lg,
  },
  arcPickerRow: {
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  arcPickerName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcPickerNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
});



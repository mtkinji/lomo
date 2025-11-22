import React from 'react';
import { Alert, StyleSheet, View, ScrollView, Image, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { VStack, Heading, Text, HStack, Pressable } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { GoalCard } from '../../ui/GoalCard';
import { Card } from '../../ui/Card';
import { colors, spacing, typography } from '../../theme';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import type { GoalDraft, ThumbnailStyle } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { TakadoBottomSheet } from '../../ui/BottomSheet';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
  buildArcThumbnailSeed,
} from '../arcs/thumbnailVisuals';

type GoalDraftEntry = {
  arcId: string;
  arcName: string;
  draft: GoalDraft;
};

export function GoalsScreen() {
  const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
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

  const thumbnailStyles = useAppStore((state): ThumbnailStyle[] => {
    const visuals = state.userProfile?.visuals;
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return ['topographyDots'];
  });

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
            onPress: () =>
              drawerNavigation.navigate('ArcsStack', {
                screen: 'ArcsList',
              }),
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
      drawerNavigation.navigate('ArcsStack', {
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
        onPressMenu={() => drawerNavigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <Button
            size="icon"
            iconButtonSize={28}
            accessibilityRole="button"
            accessibilityLabel="Create a new goal"
            style={styles.newGoalButton}
            hitSlop={8}
            onPress={handlePressNewGoal}
          >
            <Icon name="plus" size={16} color="#FFFFFF" />
          </Button>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {hasGoals ? (
        <VStack space="md">
          {goals.map((goal) => {
            const arcName = arcLookup[goal.arcId];
              const statusLabel = goal.status.replace('_', ' ');
              const activityCount = activityCountByGoal[goal.id] ?? 0;
              const activityLabel =
                activityCount === 0
                  ? 'No activities yet'
                  : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;

              const parentArc = arcs.find((arc) => arc.id === goal.arcId);
              const seed = buildArcThumbnailSeed(
                parentArc?.id ?? goal.id,
                parentArc?.name ?? goal.title,
                parentArc?.thumbnailVariant,
              );
              const { colors: gradientColors, direction } = getArcGradient(seed);
              const topoSizes = getArcTopoSizes(seed);
              const thumbnailStyle = pickThumbnailStyle(seed, thumbnailStyles);
              const showTopography = thumbnailStyle === 'topographyDots';
              const showGeoMosaic = thumbnailStyle === 'geoMosaic';
              const hasCustomThumbnail = Boolean(parentArc?.thumbnailUrl);
              const shouldShowTopography = showTopography && !hasCustomThumbnail;
              const shouldShowGeoMosaic = showGeoMosaic && !hasCustomThumbnail;

            return (
                <Pressable
                key={goal.id}
                onPress={() =>
                  drawerNavigation.navigate('ArcsStack', {
                    screen: 'GoalDetail',
                      params: { goalId: goal.id, entryPoint: 'goalsTab' },
                  })
                }
                >
                  <Card style={styles.goalListCard}>
                    <View style={styles.goalListContent}>
                      <View style={styles.goalThumbnailWrapper}>
                        <View style={styles.goalThumbnailInner}>
                          {parentArc?.thumbnailUrl ? (
                            <Image
                              source={{ uri: parentArc.thumbnailUrl }}
                              style={styles.goalThumbnail}
                              resizeMode="cover"
                            />
                          ) : (
                            <LinearGradient
                              colors={gradientColors}
                              start={direction.start}
                              end={direction.end}
                              style={styles.goalThumbnailGradient}
                            />
                          )}
                          {shouldShowTopography && (
                            <View style={styles.goalTopoLayer}>
                              <View style={styles.goalTopoGrid}>
                                {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                                  <View
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={`goal-topo-row-${rowIndex}`}
                                    style={styles.goalTopoRow}
                                  >
                                    {Array.from({ length: ARC_TOPO_GRID_SIZE }).map(
                                      (_, colIndex) => {
                                        const cellIndex =
                                          rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                                        const rawSize = topoSizes[cellIndex] ?? 0;
                                        const isHidden = rawSize < 0;
                                        const dotSize = isHidden ? 0 : rawSize;
                                        return (
                                          // eslint-disable-next-line react/no-array-index-key
                                          <View
                                            key={`goal-topo-cell-${rowIndex}-${colIndex}`}
                                            style={[
                                              styles.goalTopoDot,
                                              (dotSize === 0 || isHidden) &&
                                                styles.goalTopoDotSmall,
                                              dotSize === 1 && styles.goalTopoDotMedium,
                                              dotSize === 2 && styles.goalTopoDotLarge,
                                              isHidden && styles.goalTopoDotHidden,
                                            ]}
                                          />
                                        );
                                      },
                                    )}
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                          {shouldShowGeoMosaic && (
                            <View style={styles.goalMosaicLayer}>
                              {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                                <View
                                  // eslint-disable-next-line react/no-array-index-key
                                  key={`goal-mosaic-row-${rowIndex}`}
                                  style={styles.goalMosaicRow}
                                >
                                  {Array.from({ length: ARC_MOSAIC_COLS }).map(
                                    (_, colIndex) => {
                                      const cell = getArcMosaicCell(seed, rowIndex, colIndex);
                                      if (cell.shape === 0) {
                                        return (
                                          // eslint-disable-next-line react/no-array-index-key
                                          <View
                                            key={`goal-mosaic-cell-${rowIndex}-${colIndex}`}
                                            style={styles.goalMosaicCell}
                                          />
                                        );
                                      }

                                      let shapeStyle: StyleProp<ViewStyle> =
                                        styles.goalMosaicCircle;
                                      if (cell.shape === 2) {
                                        shapeStyle = styles.goalMosaicPillVertical;
                                      } else if (cell.shape === 3) {
                                        shapeStyle = styles.goalMosaicPillHorizontal;
                                      }

                                      return (
                                        // eslint-disable-next-line react/no-array-index-key
                                        <View
                                          key={`goal-mosaic-cell-${rowIndex}-${colIndex}`}
                                          style={styles.goalMosaicCell}
                                        >
                                          <View
                                            style={[
                                              styles.goalMosaicShapeBase,
                                              shapeStyle,
                                              { backgroundColor: cell.color },
                                            ]}
                                          />
                                        </View>
                                      );
                                    },
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                      <VStack style={styles.goalTextContainer}>
                        <Heading
                          style={styles.goalTitle}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {goal.title}
                        </Heading>
                        <HStack space="md" style={styles.goalMetaRow} alignItems="center">
                          <Text style={styles.goalStatus}>{statusLabel}</Text>
                          <HStack space="xs" alignItems="center">
                            <Icon name="activities" size={14} color={colors.textSecondary} />
                            <Text style={styles.goalActivityMeta}>{activityLabel}</Text>
                          </HStack>
                        </HStack>
                      </VStack>
                    </View>
                  </Card>
                </Pressable>
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
          drawerNavigation.navigate('ArcsStack', {
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
  onAdopt: (entry: GoalDraftEntry) => void;
  onDismiss: (entry: GoalDraftEntry) => void;
};

function GoalDraftSection({ entries, onAdopt, onDismiss }: GoalDraftSectionProps) {
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
            const { arcName, draft } = entry;
            const statusLabel = draft.status.replace('_', ' ');
            const activityLevel = draft.forceIntent['force-activity'] ?? 0;
            const masteryLevel = draft.forceIntent['force-mastery'] ?? 0;

            return (
              <View key={`${entry.arcId}:${draft.title}`} style={styles.draftCard}>
                <GoalCard
                  title={draft.title}
                  body={draft.description}
                  metaLeft={`Draft · ${statusLabel}`}
                  metaRight={`Activity ${activityLevel}/3 · Mastery ${masteryLevel}/3`}
                />
                <HStack space="sm" style={styles.draftActionsRow}>
                  <Button
                    variant="outline"
                    style={styles.draftButton}
                    onPress={() => onDismiss(entry)}
                  >
                    <Text style={styles.draftDismissText}>Dismiss</Text>
                  </Button>
                  <Button
                    variant="accent"
                    style={styles.draftButton}
                    onPress={() => onAdopt(entry)}
                  >
                    <Text style={styles.draftAdoptText}>Adopt Goal</Text>
                  </Button>
                </HStack>
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
  goalListCard: {
    padding: spacing.sm,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  goalListContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 68, // 72,
    gap: spacing.md,
  },
  goalThumbnailWrapper: {
    height: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  goalThumbnailInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  goalThumbnail: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  goalTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  goalTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalTopoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  goalTopoDotSmall: {
    width: 3,
    height: 3,
  },
  goalTopoDotMedium: {
    width: 5,
    height: 5,
  },
  goalTopoDotLarge: {
    width: 7,
    height: 7,
  },
  goalTopoDotHidden: {
    opacity: 0,
  },
  goalMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  goalMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalMosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMosaicShapeBase: {
    borderRadius: 999,
  },
  goalMosaicCircle: {
    width: '70%',
    height: '70%',
  },
  goalMosaicPillVertical: {
    width: '55%',
    height: '100%',
  },
  goalMosaicPillHorizontal: {
    width: '100%',
    height: '55%',
  },
  goalTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  goalTitle: {
    ...typography.body,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
    // lineHeight: 21,
  },
  goalArcName: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalSummary: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalMetaRow: {
    marginTop: spacing.xs / 2,
  },
  goalStatus: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalActivityMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: spacing.sm,
  },
  draftActionsRow: {
    marginTop: spacing.sm,
  },
  draftButton: {
    flex: 1,
  },
  draftDismissText: {
    ...typography.bodySm,
    color: colors.accent,
    textAlign: 'center',
  },
  draftAdoptText: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
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



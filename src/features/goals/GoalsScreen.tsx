import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StyleProp,
  ViewStyle,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { GoalListCard } from '../../ui/GoalListCard';
import { Card } from '../../ui/Card';
import { colors, spacing, typography } from '../../theme';
import type { RootDrawerParamList, GoalsStackParamList } from '../../navigation/RootNavigator';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import type { Arc, Goal, GoalDraft, ThumbnailStyle, ForceLevel } from '../../domain/types';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { VStack, Heading, Text, HStack } from '../../ui/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { BrandLockup } from '../../ui/BrandLockup';
import { generateGoals } from '../../services/ai';
import { Dialog } from '../../ui/Dialog';
import { fonts } from '../../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { getWorkflowLaunchConfig } from '../ai/workflowRegistry';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  buildArcThumbnailSeed,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
} from '../arcs/thumbnailVisuals';
import * as ImagePicker from 'expo-image-picker';

type GoalDraftEntry = {
  arcId: string;
  arcName: string;
  draft: GoalDraft;
};

type GoalCreationDraft = GoalDraft & {
  /**
   * Optional Arc this draft will be attached to once created. When unset, the
   * goal starts as a standalone goal and can be connected later from the
   * detail canvas.
   */
  arcId: string | null;
  thumbnailUrl?: string;
  thumbnailVariant?: number | null;
  heroImageMeta?: Goal['heroImageMeta'];
};

type GoalWizardStep = 'recommendations' | 'direction' | 'form' | 'scale' | 'timeframe' | 'review';

type GoalWizardState = {
  direction?: string;
  form?: string;
  scale?: 'small' | 'medium' | 'big';
  timeframe?: 'month' | 'quarter' | 'year' | 'none';
};

const GOAL_FORCE_ORDER: Array<'force-activity' | 'force-connection' | 'force-mastery' | 'force-spirituality'> =
  ['force-activity', 'force-connection', 'force-mastery', 'force-spirituality'];

const GOAL_FORCE_LABELS: Record<(typeof GOAL_FORCE_ORDER)[number], string> = {
  'force-activity': 'Activity',
  'force-connection': 'Connection',
  'force-mastery': 'Mastery',
  'force-spirituality': 'Spirituality',
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
  const [goalCoachVisible, setGoalCoachVisible] = React.useState(false);

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
    setGoalCoachVisible(true);
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
                  padding="xs"
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
            Goals live inside your arcs and express concrete progress. You can start with a
            standalone goal now, then connect it to an Arc later.
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
      <GoalCoachDrawer
        visible={goalCoachVisible}
        onClose={() => setGoalCoachVisible(false)}
        arcs={arcs}
        goals={goals}
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
                  padding="xs"
                  density="dense"
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

type GoalCoachDrawerProps = {
  visible: boolean;
  onClose: () => void;
  arcs: Arc[];
  goals: Goal[];
  /**
   * Optional Arc id to anchor goal creation to. When provided, manual goals
   * created from this drawer will be attached to that Arc, and the agent
   * launch context will reference the Arc detail surface.
   */
  launchFromArcId?: string;
  /**
   * When true (default), navigating to the new Goal detail screen after
   * manual creation. For Arc detail hosts we keep the user on the Arc canvas.
   */
  navigateToGoalDetailOnCreate?: boolean;
  /**
   * Optional callback fired after a Goal is created (manual or AI draft adopt).
   * Useful for onboarding flows that want to route into the new Goal plan.
   */
  onGoalCreated?: (goalId: string) => void;
};

type GoalWizardProps = {
  arc: Arc;
  onGoalCreated: (draft: GoalDraft) => void;
};

export function GoalCoachDrawer({
  visible,
  onClose,
  arcs,
  goals,
  launchFromArcId,
  navigateToGoalDetailOnCreate = true,
  onGoalCreated,
}: GoalCoachDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<'ai' | 'manual'>('ai');
  const [thumbnailSheetVisible, setThumbnailSheetVisible] = React.useState(false);
  const buildEmptyDraft = React.useCallback(
    (): GoalCreationDraft => ({
      title: '',
      description: '',
      status: 'planned',
      forceIntent: defaultForceLevels(0),
      arcId: launchFromArcId ?? null,
      thumbnailUrl: undefined,
      thumbnailVariant: 0,
      heroImageMeta: undefined,
    }),
    [launchFromArcId],
  );
  const [draft, setDraft] = React.useState<GoalCreationDraft>(() => buildEmptyDraft());
  const addGoal = useAppStore((state) => state.addGoal);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const navigation = useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const launchArc = React.useMemo(
    () => arcs.find((candidate) => candidate.id === launchFromArcId),
    [arcs, launchFromArcId]
  );
  const [isGoalAiInfoVisible, setIsGoalAiInfoVisible] = React.useState(false);

  const goalCreationWorkflow = React.useMemo(
    () => getWorkflowLaunchConfig('goalCreation'),
    []
  );

  const workspaceSnapshot = React.useMemo(
    () => buildArcCoachLaunchContext(arcs, goals),
    [arcs, goals],
  );

  const launchContext = React.useMemo(
    () =>
      launchFromArcId
        ? {
            source: 'arcDetail' as const,
            intent: 'goalCreation' as const,
            entityRef: { type: 'arc', id: launchFromArcId } as const,
            objectType: 'arc' as const,
            objectId: launchFromArcId,
          }
        : {
            source: 'todayScreen' as const,
            intent: 'goalCreation' as const,
          },
    [launchFromArcId],
  );

  React.useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setDraft(buildEmptyDraft());
    }
  }, [visible, buildEmptyDraft, setDraft]);

  const goalThumbnailSeed = React.useMemo(
    () => buildArcThumbnailSeed(undefined, draft.title || 'New goal', draft.thumbnailVariant ?? 0),
    [draft.title, draft.thumbnailVariant]
  );

  const { colors: goalThumbnailColors, direction: goalThumbnailDirection } = React.useMemo(
    () => getArcGradient(goalThumbnailSeed),
    [goalThumbnailSeed]
  );

  const thumbnailStyles = React.useMemo<ThumbnailStyle[]>(() => {
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return ['topographyDots'];
  }, [visuals]);

  const goalThumbnailTopoSizes = React.useMemo(
    () => getArcTopoSizes(goalThumbnailSeed),
    [goalThumbnailSeed]
  );

  const goalThumbnailStyle = React.useMemo(
    () => pickThumbnailStyle(goalThumbnailSeed, thumbnailStyles),
    [goalThumbnailSeed, thumbnailStyles]
  );

  const manualShowTopography = goalThumbnailStyle === 'topographyDots';
  const manualShowGeoMosaic = goalThumbnailStyle === 'geoMosaic';
  const manualShowContourRings = goalThumbnailStyle === 'contourRings';
  const manualShowPixelBlocks = goalThumbnailStyle === 'pixelBlocks';
  const manualHasCustomThumbnail = Boolean(draft.thumbnailUrl);

  const handleShuffleThumbnail = React.useCallback(() => {
    setDraft((current) => ({
      ...current,
      thumbnailUrl: current.thumbnailUrl,
      thumbnailVariant: (current.thumbnailVariant ?? 0) + 1,
      heroImageMeta: current.heroImageMeta,
    }));
  }, []);

  const handleUploadThumbnail = React.useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      const nowIso = new Date().toISOString();
      setDraft((current) => ({
        ...current,
        thumbnailUrl: asset.uri,
        heroImageMeta: {
          source: 'upload',
          prompt: undefined,
          createdAt: nowIso,
        },
      }));
    } catch {
      // Swallow picker errors for now; we can surface a toast in a later pass.
    }
  }, []);

  const handleCreateManualGoal = () => {
    const trimmedTitle = draft.title.trim();
    const trimmedDescription = (draft.description ?? '').trim();
    if (!trimmedTitle) {
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const goal: Goal = {
      id,
      arcId: draft.arcId ?? launchFromArcId ?? '',
      title: trimmedTitle,
      description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
      status: draft.status,
      startDate: timestamp,
      targetDate: undefined,
      forceIntent: draft.forceIntent,
      metrics: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      thumbnailUrl: draft.thumbnailUrl,
      thumbnailVariant: draft.thumbnailVariant ?? undefined,
      heroImageMeta: draft.heroImageMeta,
    };

    addGoal(goal);
    onGoalCreated?.(id);
    onClose();
    if (navigateToGoalDetailOnCreate) {
      navigation.push('GoalDetail', {
        goalId: id,
        entryPoint: 'goalsTab',
      });
    }
  };

  const handleCreateGoalFromDraft = React.useCallback(
    (arcId: string, goalDraft: GoalDraft) => {
      const timestamp = new Date().toISOString();
      const mergedForceIntent = { ...defaultForceLevels(0), ...goalDraft.forceIntent };

      const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const goal: Goal = {
        id,
        arcId,
        title: goalDraft.title,
        description: goalDraft.description,
        status: goalDraft.status,
        forceIntent: mergedForceIntent,
        metrics: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      addGoal(goal);
      onGoalCreated?.(id);
      onClose();
      if (navigateToGoalDetailOnCreate) {
        navigation.push('GoalDetail', {
          goalId: id,
          entryPoint: 'goalsTab',
        });
      }
    },
    [addGoal, navigateToGoalDetailOnCreate, navigation, onClose, onGoalCreated]
  );

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['100%']}>
      <View style={styles.goalCoachContainer}>
        <AgentModeHeader
          activeMode={activeTab}
          onChangeMode={setActiveTab}
          objectLabel="Goals"
          onPressInfo={() => setIsGoalAiInfoVisible(true)}
          infoAccessibilityLabel="Show context for Goals AI"
        />
        {/* Keep both panes mounted so users can switch between AI and Manual without
            losing their place in either canvas. We toggle visibility via styles
            instead of mounting/unmounting children. */}
        <View
          style={[
            styles.goalCoachBody,
            activeTab !== 'ai' && { display: 'none' },
          ]}
        >
          {launchArc ? (
            <GoalWizard
              arc={launchArc}
              onGoalCreated={(draftGoal) => handleCreateGoalFromDraft(launchArc.id, draftGoal)}
            />
          ) : (
            <AgentWorkspace
              // Goal creation uses the dedicated Goal Creation Agent mode so the
              // conversation stays tightly focused on drafting one clear goal.
              mode={goalCreationWorkflow.mode}
              launchContext={launchContext}
              workspaceSnapshot={workspaceSnapshot}
              workflowDefinitionId={goalCreationWorkflow.workflowDefinitionId}
              // For now, we rely on keeping the workspace mounted to preserve state
              // instead of resuming a persisted draft.
              resumeDraft={false}
              hideBrandHeader
              hidePromptSuggestions
            />
          )}
        </View>

        <Dialog
          visible={isGoalAiInfoVisible}
          onClose={() => setIsGoalAiInfoVisible(false)}
          title="Goals AI context"
          description="This coach shapes one clear goal inside your Arc using your existing context."
        >
          {launchArc && (
            <Text style={styles.modalBody}>
              {`Arc: ${launchArc.name}\n\nI’m using your Arc’s narrative and focus to keep this goal aligned with the version of you you’re trying to grow into.`}
            </Text>
          )}
        </Dialog>
          <KeyboardAvoidingView
            style={[
              styles.goalCoachBody,
              activeTab !== 'manual' && { display: 'none' },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Card padding="sm" style={{ width: '100%' }}>
                <Text style={styles.modalLabel}>Thumbnail</Text>
                <Pressable
                  style={styles.goalThumbnailSection}
                  accessibilityRole="button"
                  accessibilityLabel="Edit goal thumbnail"
                  onPress={() => setThumbnailSheetVisible(true)}
                >
                  <View style={styles.goalThumbnailPreview}>
                    {draft.thumbnailUrl ? (
                      <Image
                        source={{ uri: draft.thumbnailUrl }}
                        style={styles.goalThumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={goalThumbnailColors}
                        start={goalThumbnailDirection.start}
                        end={goalThumbnailDirection.end}
                        style={styles.goalThumbnailImage}
                      />
                    )}
                  </View>
                </Pressable>
                <Text style={styles.modalLabel}>Goal title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Build a Birdhouse"
                  placeholderTextColor={colors.textSecondary}
                  value={draft.title}
                  onChangeText={(next) =>
                    setDraft((current) => ({
                      ...current,
                      title: next,
                    }))
                  }
                />
                <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>
                  Short description
                </Text>
                <TextInput
                  style={[styles.input, styles.manualNarrativeInput]}
                  placeholder="Describe the concrete progress you want to make."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={draft.description ?? ''}
                  onChangeText={(next) =>
                    setDraft((current) => ({
                      ...current,
                      description: next,
                    }))
                  }
                />
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.modalLabel}>Force intent (optional)</Text>
                  {GOAL_FORCE_ORDER.map((forceId) => {
                    const level = (draft.forceIntent?.[forceId] ?? 0) as ForceLevel;
                    return (
                      <View key={forceId} style={styles.forceRow}>
                        <View style={styles.forceHeaderRow}>
                          <Text style={styles.forceLabel}>{GOAL_FORCE_LABELS[forceId]}</Text>
                          <Text style={styles.forceValue}>{level}/3</Text>
                        </View>
                        <View style={styles.forceChipsRow}>
                          {[0, 1, 2, 3].map((value) => {
                            const isActive = level === value;
                            return (
                              <Pressable
                                // eslint-disable-next-line react/no-array-index-key
                                key={value}
                                style={[
                                  styles.forceChip,
                                  isActive && styles.forceChipActive,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Set ${GOAL_FORCE_LABELS[forceId]} to level ${value}`}
                                onPress={() =>
                                  setDraft((current) => ({
                                    ...current,
                                    forceIntent: {
                                      ...current.forceIntent,
                                      [forceId]: value as ForceLevel,
                                    },
                                  }))
                                }
                              >
                                <Text
                                  style={[
                                    styles.forceChipLabel,
                                    isActive && styles.forceChipLabelActive,
                                  ]}
                                >
                                  {value}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
                <View style={{ marginTop: spacing.xl }}>
                  <Button
                    disabled={draft.title.trim().length === 0}
                    onPress={handleCreateManualGoal}
                  >
                    <Text style={styles.buttonText}>Create Goal</Text>
                  </Button>
                </View>
              </Card>
            </ScrollView>
          </KeyboardAvoidingView>
      </View>
      <BottomDrawer
        visible={thumbnailSheetVisible}
        onClose={() => setThumbnailSheetVisible(false)}
        snapPoints={['55%']}
        // This drawer is nested inside a full-screen BottomDrawer; render inline and
        // avoid an extra scrim layer.
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.goalThumbnailSheetContent}>
          <Text style={styles.goalThumbnailSheetTitle}>Goal thumbnail</Text>
          <View style={styles.goalThumbnailSheetPreviewFrame}>
            <View style={styles.goalThumbnailSheetPreviewInner}>
              {draft.thumbnailUrl ? (
                <Image
                  source={{ uri: draft.thumbnailUrl }}
                  style={styles.goalThumbnailSheetImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={goalThumbnailColors}
                  start={goalThumbnailDirection.start}
                  end={goalThumbnailDirection.end}
                  style={styles.goalThumbnailSheetImage}
                />
              )}
            </View>
          </View>
          <View style={styles.goalThumbnailSheetButtonsRow}>
            <Button
              variant="outline"
              style={styles.goalThumbnailSheetButton}
              onPress={handleShuffleThumbnail}
            >
              <Text style={styles.goalThumbnailButtonLabel}>Refresh</Text>
            </Button>
            <Button
              variant="outline"
              style={styles.goalThumbnailSheetButton}
              onPress={() => {
                void handleUploadThumbnail();
              }}
            >
              <Text style={styles.goalThumbnailButtonLabel}>Upload</Text>
            </Button>
          </View>
        </View>
      </BottomDrawer>
    </BottomDrawer>
  );
}

function GoalWizard({ arc, onGoalCreated }: GoalWizardProps) {
  const [step, setStep] = React.useState<GoalWizardStep>('recommendations');
  const [state, setState] = React.useState<GoalWizardState>({});
  const [recommended, setRecommended] = React.useState<GoalDraft[] | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = React.useState(false);
  const [recommendationsError, setRecommendationsError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<GoalDraft | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [introLine1, setIntroLine1] = React.useState('');
  const [introLine2, setIntroLine2] = React.useState('');
  const [introDone, setIntroDone] = React.useState(false);
  const [recommendedIndex, setRecommendedIndex] = React.useState(0);

  React.useEffect(() => {
    if (recommended || loadingRecommendations || step !== 'recommendations') return;
    setLoadingRecommendations(true);
    setRecommendationsError(null);
    void generateGoals({
      arcName: arc.name,
      arcNarrative: arc.narrative ?? undefined,
      prompt: undefined,
      timeHorizon: undefined,
      constraints: undefined,
    })
      .then((goals) => {
        setRecommended(goals);
        setRecommendedIndex(0);
        if (!goals || goals.length === 0) {
          setStep('direction');
        }
      })
      .catch(() => {
        setRecommendationsError('Unable to load suggestions right now.');
        setStep('direction');
      })
      .finally(() => {
        setLoadingRecommendations(false);
      });
  }, [arc.name, arc.narrative, loadingRecommendations, recommended, step]);

  React.useEffect(() => {
    if (step !== 'recommendations') return;

    const fullLine1 = `Let\u2019s add a goal to your ${arc.name} Arc.`;
    const fullLine2 =
      'Here’s one goal I’d recommend as a first step—you can try a different idea if this doesn’t feel right.';

    let line1Index = 0;
    let line2Index = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const typeLine2 = () => {
      if (line2Index > fullLine2.length) {
        setIntroDone(true);
        return;
      }
      setIntroLine2(fullLine2.slice(0, line2Index));
      line2Index += 1;
      timeoutId = setTimeout(typeLine2, 18);
    };

    const typeLine1 = () => {
      if (line1Index > fullLine1.length) {
        timeoutId = setTimeout(typeLine2, 240);
        return;
      }
      setIntroLine1(fullLine1.slice(0, line1Index));
      line1Index += 1;
      timeoutId = setTimeout(typeLine1, 18);
    };

    typeLine1();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [arc.name, step]);

  const handleGenerateDraft = React.useCallback(
    async (refinementHint?: string) => {
      if (!state.direction || !state.form || !state.scale || !state.timeframe) {
        return;
      }
      setGenerating(true);
      const timeHorizonMap: Record<NonNullable<GoalWizardState['timeframe']>, string> = {
        month: '1 month',
        quarter: '3 months',
        year: '12 months',
        none: 'unspecified',
      };
      const promptParts = [
        `Direction inside the arc: ${state.direction}.`,
        `Goal form: ${state.form}.`,
        `Scale: ${state.scale}.`,
        `Timeframe: ${state.timeframe}.`,
      ];
      if (refinementHint) {
        promptParts.push(`Refinement hint from user: ${refinementHint}.`);
      }
      const prompt = promptParts.join(' ');
      try {
        const goals = await generateGoals({
          arcName: arc.name,
          arcNarrative: arc.narrative ?? undefined,
          prompt,
          timeHorizon: timeHorizonMap[state.timeframe],
          constraints: undefined,
        });
        if (goals && goals.length > 0) {
          setDraft(goals[0]);
          setStep('review');
        }
      } finally {
        setGenerating(false);
      }
    },
    [arc.name, arc.narrative, state.direction, state.form, state.scale, state.timeframe]
  );

  const renderChipRow = (
    options: string[],
    selected: string | undefined,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.wizardChipRow}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={[
            styles.wizardChip,
            selected === option && styles.wizardChipSelected,
          ]}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.wizardChipLabel,
              selected === option && styles.wizardChipLabelSelected,
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (step === 'recommendations') {
    return (
      <ScrollView
        style={styles.wizardScroll}
        contentContainerStyle={styles.wizardContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {introLine1.length > 0 && (
          <>
            {(() => {
              const text = introLine1;
              const name = arc.name;
              const idx = text.indexOf(name);
              if (idx === -1) {
                return <Text style={styles.wizardTitle}>{text}</Text>;
              }
              const before = text.slice(0, idx);
              const namePart = text.slice(idx, idx + name.length);
              const after = text.slice(idx + name.length);
              return (
                <Text style={styles.wizardTitle}>
                  {before}
                  <Text style={styles.wizardTitleEmphasis}>{namePart}</Text>
                  {after}
                </Text>
              );
            })()}
            {introLine2.length > 0 && <Text style={styles.wizardBody}>{introLine2}</Text>}
          </>
        )}
        {introDone && (
          <View style={styles.wizardOuterCard}>
            {loadingRecommendations && (
              <View style={styles.wizardLoadingRow}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.wizardLoadingLabel}>Loading a goal suggestion…</Text>
              </View>
            )}
            {recommendationsError && (
              <Text style={styles.wizardErrorText}>{recommendationsError}</Text>
            )}
            {!loadingRecommendations &&
              !recommendationsError &&
              recommended &&
              recommended.length > 0 && (
                <View style={styles.wizardRecommendationCard}>
                  {(() => {
                    const draftGoal = recommended[recommendedIndex];
                    if (!draftGoal) return null;
                    const previewGoal: Goal = {
                      id: `recommendation-${arc.id}-${recommendedIndex}`,
                      arcId: arc.id,
                      title: draftGoal.title,
                      description: draftGoal.description,
                      status: draftGoal.status,
                      forceIntent: { ...defaultForceLevels(0), ...draftGoal.forceIntent },
                      metrics: [],
                      createdAt: 'draft',
                      updatedAt: 'draft',
                    };
                    return (
                      <GoalListCard
                        goal={previewGoal}
                        parentArc={arc}
                        padding="xs"
                        density="dense"
                        showThumbnail={false}
                        showActivityMeta={false}
                        compact
                        headerLabel={
                          <HStack
                            space="xs"
                            alignItems="center"
                            style={styles.wizardRecommendationHeaderLabel}
                          >
                            <Icon name="sparkles" size={14} color={colors.textSecondary} />
                            <Text style={styles.wizardRecommendationBadgeText}>AI recommendation</Text>
                          </HStack>
                        }
                      >
                        <VStack space="sm">
                          {draftGoal.description && (
                            <Text style={styles.wizardDraftBody}>{draftGoal.description}</Text>
                          )}
                          <HStack
                            style={styles.wizardDraftActions}
                            alignItems="center"
                            justifyContent="flex-end"
                            space="sm"
                          >
                            {recommended.length > 1 && (
                              <Button
                                variant="outline"
                                size="small"
                                onPress={() =>
                                  setRecommendedIndex((current) =>
                                    (current + 1) % (recommended.length || 1)
                                  )
                                }
                              >
                                <HStack space="xs" alignItems="center">
                                  <Icon name="refresh" size={14} color={colors.textSecondary} />
                                  <Text>Try again</Text>
                                </HStack>
                              </Button>
                            )}
                            <Button
                              variant="accent"
                              size="small"
                              onPress={() => {
                                const goal = recommended[recommendedIndex];
                                if (goal) {
                                  onGoalCreated(goal);
                                }
                              }}
                            >
                              <Text style={styles.primaryButtonLabel}>Accept</Text>
                            </Button>
                          </HStack>
                        </VStack>
                      </GoalListCard>
                    );
                  })()}
                </View>
              )}
          </View>
        )}
      </ScrollView>
    );
  }

  if (step === 'direction') {
    const options = [
      'Learning the craft',
      'Building a habit of consistency',
      'Strengthening my courage',
      'Improving my skills',
      'Supporting others generously',
      'Making something real',
      'Something else',
    ];
    return (
      <ScrollView
        style={styles.wizardScroll}
        contentContainerStyle={styles.wizardContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.wizardTitle}>
          Which direction inside this Arc do you want to strengthen first?
        </Text>
        {renderChipRow(options, state.direction, (value) => {
          setState((current) => ({ ...current, direction: value }));
          setStep('form');
        })}
      </ScrollView>
    );
  }

  if (step === 'form') {
    const options = [
      'Build a habit',
      'Build a skill',
      'Start a project',
      'Finish a project',
      'Reach a milestone',
      'Make a decision',
      'Explore something curious',
    ];
    return (
      <ScrollView
        style={styles.wizardScroll}
        contentContainerStyle={styles.wizardContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.wizardTitle}>What type of goal is this?</Text>
        {renderChipRow(options, state.form, (value) => {
          setState((current) => ({ ...current, form: value }));
          setStep('scale');
        })}
      </ScrollView>
    );
  }

  if (step === 'scale') {
    const labels: { key: GoalWizardState['scale']; label: string }[] = [
      { key: 'small', label: 'Something small and steady' },
      { key: 'medium', label: 'Something medium and meaningful' },
      { key: 'big', label: 'Something big and challenging' },
    ];
    return (
      <ScrollView
        style={styles.wizardScroll}
        contentContainerStyle={styles.wizardContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.wizardTitle}>What’s the scale of this goal?</Text>
        {renderChipRow(
          labels.map((entry) => entry.label),
          labels.find((entry) => entry.key === state.scale)?.label,
          (label) => {
            const match = labels.find((entry) => entry.label === label);
            setState((current) => ({ ...current, scale: match?.key }));
            setStep('timeframe');
          }
        )}
      </ScrollView>
    );
  }

  if (step === 'timeframe') {
    const labels: { key: NonNullable<GoalWizardState['timeframe']>; label: string }[] = [
      { key: 'month', label: 'This month' },
      { key: 'quarter', label: 'Next 3 months' },
      { key: 'year', label: 'This year' },
      { key: 'none', label: 'No specific timeframe' },
    ];
    return (
      <ScrollView
        style={styles.wizardScroll}
        contentContainerStyle={styles.wizardContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.wizardTitle}>What timeframe do you imagine?</Text>
        {renderChipRow(
          labels.map((entry) => entry.label),
          labels.find((entry) => entry.key === state.timeframe)?.label,
          (label) => {
            const match = labels.find((entry) => entry.label === label);
            setState((current) => ({ ...current, timeframe: match?.key }));
            void handleGenerateDraft();
          }
        )}
        {generating && (
          <View style={styles.wizardLoadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.wizardLoadingLabel}>Shaping your goal…</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // review
  if (!draft) {
    return (
      <View style={styles.wizardContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wizardScroll}
      contentContainerStyle={styles.wizardContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.wizardTitle}>Here’s a goal that fits this Arc</Text>
      <View style={styles.wizardDraftCard}>
        <Text style={styles.wizardDraftTitle}>{draft.title}</Text>
        {draft.description && (
          <Text style={styles.wizardDraftBody}>{draft.description}</Text>
        )}
      </View>
      <View style={styles.wizardFooterRow}>
        <Button onPress={() => onGoalCreated(draft)}>
          <Text>Yes, save this goal</Text>
        </Button>
        <Button
          variant="outline"
          onPress={() => handleGenerateDraft('Make it a little different')}
          disabled={generating}
        >
          <Text>Tweak it</Text>
        </Button>
      </View>
    </ScrollView>
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
  goalCoachContainer: {
    flex: 1,
    backgroundColor: colors.shell,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  goalCoachBody: {
    flex: 1,
  },
  headerSideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  segmentedOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  segmentedOptionActive: {
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentedOptionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentedOptionLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  segmentedOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  manualFormContainer: {
    flex: 1,
    // Let the BottomDrawer define the primary horizontal gutters so this form
    // aligns with other canvases. We only add vertical spacing here.
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  wizardContainer: {
    // Let BottomDrawer's horizontal padding define the primary gutters so this
    // canvas lines up with the rest of the Agent workspace surfaces.
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  wizardScroll: {
    flex: 1,
  },
  wizardTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  wizardTitleEmphasis: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  wizardBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  wizardChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  wizardChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  wizardChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.accent,
  },
  wizardChipLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  wizardChipLabelSelected: {
    color: colors.accent,
    fontFamily: typography.titleSm.fontFamily,
  },
  wizardDraftCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    gap: spacing.xs,
  },
  wizardOuterCard: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  wizardDraftTitle: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  wizardDraftBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  wizardDraftActions: {
    marginTop: spacing.sm,
  },
  wizardFooterRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  wizardLoadingRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wizardLoadingLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  wizardErrorText: {
    ...typography.bodySm,
    color: colors.destructive,
  },
  goalModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.canvas,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    gap: spacing.sm,
  },
  goalModePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  goalModePillIcon: {
    marginRight: spacing.xs,
  },
  goalModePillInfoIcon: {
    marginLeft: spacing.sm,
  },
  goalModePillText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  wizardRecommendationCard: {
    gap: spacing.sm,
  },
  wizardRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wizardRecommendationBadgeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  wizardRecommendationHeaderLabel: {
    marginBottom: spacing.sm,
  },
  wizardRecommendationRefreshText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  wizardLinkText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    minHeight: 44,
  },
  manualNarrativeInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  goalThumbnailSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    columnGap: spacing.md,
  },
  goalThumbnailPreview: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  goalThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalThumbnailTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  goalThumbnailTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalThumbnailTopoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  goalThumbnailTopoDotSmall: {
    width: 3,
    height: 3,
  },
  goalThumbnailTopoDotMedium: {
    width: 5,
    height: 5,
  },
  goalThumbnailTopoDotLarge: {
    width: 7,
    height: 7,
  },
  goalThumbnailTopoDotHidden: {
    opacity: 0,
  },
  goalThumbnailMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  goalThumbnailMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalThumbnailMosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalThumbnailMosaicBlock: {
    width: '80%',
    height: '80%',
    borderRadius: 4,
  },
  goalThumbnailContourLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalThumbnailContourRing: {
    borderWidth: 1,
    borderRadius: 999,
    borderColor: 'rgba(15,23,42,0.2)',
    ...StyleSheet.absoluteFillObject,
  },
  goalThumbnailPixelLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  goalThumbnailPixelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalThumbnailPixelCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 0.5,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.15)',
  },
  goalThumbnailPixelCellFilled: {
    backgroundColor: '#1D4ED8',
  },
  goalThumbnailSheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  goalThumbnailSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  goalThumbnailSheetPreviewFrame: {
    width: '100%',
    aspectRatio: 3 / 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
    marginBottom: spacing.lg,
  },
  goalThumbnailSheetPreviewInner: {
    flex: 1,
  },
  goalThumbnailSheetImage: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailSheetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
  },
  goalThumbnailSheetButton: {
    flexShrink: 1,
  },
  goalThumbnailButtonsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
  },
  goalThumbnailButton: {
    flexShrink: 1,
  },
  goalThumbnailButtonLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  buttonText: {
    ...typography.bodySm,
    color: colors.canvas,
  },
  forceRow: {
    marginTop: spacing.sm,
  },
  forceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  forceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  forceValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  forceChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  forceChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  forceChipLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceChipLabelActive: {
    color: colors.canvas,
  },
});



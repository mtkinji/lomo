import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StyleProp,
  ViewStyle,
  Pressable,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
  InteractionManager,
  Alert,
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
import { useToastStore } from '../../store/useToastStore';
import type { Arc, Goal, GoalDraft, ThumbnailStyle, ForceLevel } from '../../domain/types';
import { canCreateGoalInArc } from '../../domain/limits';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { VStack, Heading, Text, HStack, EmptyState, KeyboardAwareScrollView, ObjectPicker } from '../../ui/primitives';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import { richTextToPlainText } from '../../ui/richText';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { BrandLockup } from '../../ui/BrandLockup';
import { Dialog } from '../../ui/Dialog';
import { fonts } from '../../theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { getWorkflowLaunchConfig } from '../ai/workflowRegistry';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { openPaywallInterstitial } from '../../services/paywall';
import type { ObjectPickerOption } from '../../ui/ObjectPicker';
import { EditableField } from '../../ui/EditableField';
import { LongTextField } from '../../ui/LongTextField';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
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

const GOAL_FORCE_ORDER: Array<'force-activity' | 'force-connection' | 'force-mastery' | 'force-spirituality'> =
  ['force-activity', 'force-connection', 'force-mastery', 'force-spirituality'];

const GOAL_FORCE_LABELS: Record<(typeof GOAL_FORCE_ORDER)[number], string> = {
  'force-activity': 'Activity',
  'force-connection': 'Connection',
  'force-mastery': 'Mastery',
  'force-spirituality': 'Spirituality',
};

export function GoalsScreen() {
  const { capture } = useAnalytics();
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
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const isPro = useEntitlementsStore((state) => state.isPro);

  const arcLookup = arcs.reduce<Record<string, string>>((acc, arc) => {
    acc[arc.id] = arc.name;
    return acc;
  }, {});

  const visibleGoals = React.useMemo(
    () => goals.filter((goal) => goal.status !== 'archived'),
    [goals],
  );
  const archivedGoals = React.useMemo(
    () => goals.filter((goal) => goal.status === 'archived'),
    [goals],
  );
  const hasGoals = visibleGoals.length > 0;
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

    const canCreate = canCreateGoalInArc({ isPro, goals, arcId });
    if (!canCreate.ok) {
      Alert.alert(
        'Goal limit reached',
        `Free tier supports up to ${canCreate.limit} active goals per Arc. Archive a goal to make room, or upgrade to Pro.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Upgrade',
              onPress: () =>
                openPaywallInterstitial({ reason: 'limit_goals_per_arc', source: 'goals_draft_adopt' }),
          },
        ],
      );
      return;
    }

    const goalId = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Creating a Goal counts as showing up (planning is still engagement).
    recordShowUp();
    addGoal({
      id: goalId,
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
    capture(AnalyticsEvent.GoalCreated, {
      source: 'recommendation_adopt',
      goal_id: goalId,
      arc_id: arcId,
      has_description: Boolean(draft.description && draft.description.trim().length > 0),
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
        iconTone="goal"
        //Add this to the page header if you want to wrap the title in a large badge with the icon
        // boxedTitle
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
        <VStack space="xs">
          {visibleGoals.map((goal) => {
            const arcName = goal.arcId ? arcLookup[goal.arcId] : undefined;
              const statusLabel = goal.status.replace('_', ' ');
              const activityCount = activityCountByGoal[goal.id] ?? 0;
              const activityLabel =
                activityCount === 0
                  ? 'No activities yet'
                  : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;

              const parentArc = goal.arcId ? arcs.find((arc) => arc.id === goal.arcId) : undefined;

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
        <EmptyState
          title={archivedGoals.length > 0 ? 'No active goals' : 'No goals yet'}
          instructions={
            archivedGoals.length > 0
              ? 'Your archived goals are below.'
              : 'Create your first goal, then connect it to an Arc anytime.'
          }
          primaryAction={{
            label: 'Create goal',
            variant: 'accent',
            onPress: handlePressNewGoal,
            accessibilityLabel: 'Create a new goal',
          }}
          style={styles.emptyState}
        />
      )}

        {archivedGoals.length > 0 && (
          <VStack space="xs" style={styles.archivedSection}>
            <Text style={styles.archivedTitle}>Archived</Text>
            <Text style={styles.archivedHint}>
              Archived goals stay in your history, but won’t count toward your active goal limit.
            </Text>
            <VStack space="xs" style={{ marginTop: spacing.sm }}>
              {archivedGoals.map((goal) => {
                const parentArc = goal.arcId ? arcs.find((arc) => arc.id === goal.arcId) : undefined;
                const activityCount = activityCountByGoal[goal.id] ?? 0;
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
  const manualScrollRef = React.useRef<KeyboardAwareScrollViewHandle | null>(null);
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
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const { capture } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const navigation = useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const launchArc = React.useMemo(
    () => arcs.find((candidate) => candidate.id === launchFromArcId),
    [arcs, launchFromArcId]
  );
  const [isGoalAiInfoVisible, setIsGoalAiInfoVisible] = React.useState(false);
  const arcPickerOptions = React.useMemo<ObjectPickerOption[]>(() => {
    const list = [...arcs];
    list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    return list.map((a) => ({
      value: a.id,
      label: a.name,
      // Keep keywords tight—narratives are long and cause noisy matches for short queries.
      keywords: undefined,
    }));
  }, [arcs]);

  const goalCreationWorkflow = React.useMemo(
    () => getWorkflowLaunchConfig('goalCreation'),
    []
  );

  const workspaceSnapshot = React.useMemo(
    () => buildArcCoachLaunchContext(arcs, goals, launchFromArcId),
    [arcs, goals, launchFromArcId],
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

  // If the coach was launched from an Arc detail screen, default the manual draft
  // to that Arc—but do not force it (Goals can exist without an Arc).
  React.useEffect(() => {
    if (!visible) return;
    if (launchFromArcId) {
      setDraft((current) =>
        current.arcId === null ? { ...current, arcId: launchFromArcId } : current
      );
      return;
    }
  }, [launchFromArcId, visible, setDraft]);

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

    const resolvedArcId = launchFromArcId ?? draft.arcId ?? null;
    if (resolvedArcId) {
      const canCreate = canCreateGoalInArc({ isPro, goals, arcId: resolvedArcId });
      if (!canCreate.ok) {
        Alert.alert(
          'Goal limit reached',
          `Free tier supports up to ${canCreate.limit} active goals per Arc. Archive a goal to make room, or upgrade to Pro.`,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Upgrade',
              onPress: () =>
                openPaywallInterstitial({ reason: 'limit_goals_per_arc', source: 'goals_create_manual' }),
            },
          ],
        );
        return;
      }
    }

    const timestamp = new Date().toISOString();
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const goal: Goal = {
      id,
      arcId: resolvedArcId,
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

    // Creating a Goal counts as showing up.
    recordShowUp();
    addGoal(goal);
    showToast({ message: 'Goal created', variant: 'success', durationMs: 2200 });
    capture(AnalyticsEvent.GoalCreated, {
      source: 'manual',
      goal_id: goal.id,
      arc_id: goal.arcId ?? undefined,
      has_description: Boolean(goal.description && richTextToPlainText(goal.description).trim().length > 0),
    });
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

      const canCreate = canCreateGoalInArc({ isPro, goals, arcId });
      if (!canCreate.ok) {
        Alert.alert(
          'Goal limit reached',
          `Free tier supports up to ${canCreate.limit} active goals per Arc. Archive a goal to make room, or upgrade to Pro.`,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Upgrade',
              onPress: () =>
                openPaywallInterstitial({ reason: 'limit_goals_per_arc', source: 'goals_create_ai' }),
            },
          ],
        );
        return;
      }

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

      // Creating a Goal counts as showing up.
      recordShowUp();
      addGoal(goal);
      showToast({ message: 'Goal created', variant: 'success', durationMs: 2200 });
      capture(AnalyticsEvent.GoalCreated, {
        source: 'ai_coach',
        goal_id: goal.id,
        arc_id: arcId,
        has_description: Boolean(goal.description && richTextToPlainText(goal.description).trim().length > 0),
      });
      onGoalCreated?.(id);
      onClose();
      if (navigateToGoalDetailOnCreate) {
        navigation.push('GoalDetail', {
          goalId: id,
          entryPoint: 'goalsTab',
        });
      }
    },
    [addGoal, capture, goals, isPro, navigateToGoalDetailOnCreate, navigation, onClose, onGoalCreated, recordShowUp]
  );

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['100%']}
      // AgentWorkspace/AiChatScreen implements its own keyboard strategy (padding + scroll-to-focus).
      // Avoid double offsets from BottomDrawer's default keyboard avoidance.
      keyboardAvoidanceEnabled={false}
    >
      <View style={styles.goalCoachContainer}>
        <AgentModeHeader
          activeMode={activeTab}
          onChangeMode={setActiveTab}
          objectLabel="Goal"
          onPressInfo={() => setIsGoalAiInfoVisible(true)}
          infoAccessibilityLabel="Show Goal AI context"
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
            hostBottomInsetAlreadyApplied
            // Let users chat freely with the coach from the composer; keep suggestions visible.
            hidePromptSuggestions={false}
            onGoalCreated={(goalId) => {
              showToast({ message: 'Goal created', variant: 'success', durationMs: 2200 });
              onGoalCreated?.(goalId);
              onClose();
              if (navigateToGoalDetailOnCreate) {
                navigation.push('GoalDetail', {
                  goalId,
                  entryPoint: 'goalsTab',
                });
              }
            }}
          />
        </View>

        <Dialog
          visible={isGoalAiInfoVisible}
          onClose={() => setIsGoalAiInfoVisible(false)}
          title="Context"
          description="This coach shapes one clear goal inside your Arc using your existing context."
        >
          {launchArc && (
            <Text style={styles.modalBody}>
              {`Arc: ${launchArc.name}\n\nI’m using your Arc’s narrative and focus to keep this goal aligned with the version of you you’re trying to grow into.`}
            </Text>
          )}
        </Dialog>
          <View style={[styles.goalCoachBody, activeTab !== 'manual' && { display: 'none' }]}>
            <KeyboardAwareScrollView
              ref={manualScrollRef}
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              showsVerticalScrollIndicator={false}
            >
              <Card padding="sm" style={{ width: '100%' }}>
                {/* Pseudo Goal detail canvas (manual create): match layout orientation */}
                <HStack alignItems="center" space="sm">
                  <Pressable
                    style={styles.manualGoalThumbnailWrapper}
                    accessibilityRole="button"
                    accessibilityLabel="Edit goal thumbnail"
                    onPress={() => setThumbnailSheetVisible(true)}
                  >
                    <View style={styles.manualGoalThumbnailInner}>
                      {draft.thumbnailUrl ? (
                        <Image
                          source={{ uri: draft.thumbnailUrl }}
                          style={styles.manualGoalThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={goalThumbnailColors}
                          start={goalThumbnailDirection.start}
                          end={goalThumbnailDirection.end}
                          style={styles.manualGoalThumbnail}
                        />
                      )}
                    </View>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <EditableField
                      style={styles.manualInlineTitleField}
                      label="Title"
                      value={draft.title}
                      variant="title"
                      placeholder="Name this Goal"
                      validate={(next) => (next.trim().length === 0 ? 'Title cannot be empty' : null)}
                      onChange={(nextTitle) =>
                        setDraft((current) => ({
                          ...current,
                          title: nextTitle,
                        }))
                      }
                    />
                  </View>
                </HStack>

                <View style={{ marginTop: spacing.md }}>
                  <LongTextField
                    label="Description"
                    value={draft.description ?? ''}
                    placeholder="Add a short note about this Goal…"
                    enableAi={false}
                    onChange={(next) =>
                      setDraft((current) => ({
                        ...current,
                        description: next,
                      }))
                    }
                  />
                </View>

                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.arcConnectionLabel}>Linked Arc (optional)</Text>
                  <ObjectPicker
                    value={draft.arcId ?? ''}
                    onValueChange={(nextArcId) =>
                      setDraft((current) => ({
                        ...current,
                        arcId: nextArcId ? nextArcId : null,
                      }))
                    }
                    options={arcPickerOptions}
                    placeholder={arcs.length === 0 ? 'No Arcs yet' : 'Select Arc…'}
                    searchPlaceholder="Search arcs…"
                    emptyText="No arcs found."
                    accessibilityLabel="Change linked arc"
                    allowDeselect
                    disabled={arcs.length === 0}
                  />
                </View>

                <View style={{ marginTop: spacing.md }}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.forceIntentLabel}>Vectors for this goal</Text>
                  </HStack>
                  <VStack style={styles.forceCard} space="xs">
                    {GOAL_FORCE_ORDER.map((forceId) => {
                      const level = (draft.forceIntent?.[forceId] ?? 0) as ForceLevel;
                      return (
                        <VStack key={forceId} space="xs">
                          <HStack justifyContent="space-between" alignItems="center">
                            <Text style={styles.forceLabel}>{GOAL_FORCE_LABELS[forceId]}</Text>
                            <Text style={styles.forceValue}>{level}/3</Text>
                          </HStack>
                          <HStack space="xs" style={styles.forceSliderRow}>
                            {[0, 1, 2, 3].map((value) => {
                              const isActive = level === value;
                              return (
                                <Pressable
                                  // eslint-disable-next-line react/no-array-index-key
                                  key={value}
                                  style={[
                                    styles.forceLevelChip,
                                    isActive && styles.forceLevelChipActive,
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
                                      styles.forceLevelChipText,
                                      isActive && styles.forceLevelChipTextActive,
                                    ]}
                                  >
                                    {value}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </HStack>
                        </VStack>
                      );
                    })}
                  </VStack>
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
            </KeyboardAwareScrollView>
          </View>
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

// Legacy GoalWizard removed — Goal creation AI is now exclusively workflow-driven
// (AgentWorkspace + `goalCreation`), with the AI Goal Proposal card as the canonical
// recommendation + adoption UI.

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
  archivedSection: {
    marginTop: spacing.xl,
  },
  archivedTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  archivedHint: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
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
  wizardRefinePanel: {
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  wizardRefinePrompt: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },
  wizardRefineChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  wizardRefineChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  wizardRefineChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  wizardRefineDrawer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  wizardRefineDrawerTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  wizardRefineDrawerSecondaryText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  wizardRefineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
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
  manualGoalThumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  manualGoalThumbnailInner: {
    width: '100%',
    height: '100%',
  },
  manualGoalThumbnail: {
    width: '100%',
    height: '100%',
  },
  manualInlineTitleField: {
    // Pull the inline title field tighter so it visually matches the Goal detail header row.
    marginTop: 0,
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
  arcConnectionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  forceIntentLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  forceCard: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  forceSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  forceLevelChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  forceLevelChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  forceLevelChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceLevelChipTextActive: {
    color: colors.canvas,
  },
  buttonText: {
    ...typography.bodySm,
    color: colors.canvas,
  },
  manualArcRequiredHint: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
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



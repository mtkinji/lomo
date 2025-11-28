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
} from 'react-native';
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
import { BottomDrawer } from '../../ui/BottomDrawer';
import { VStack, Heading, Text, HStack } from '../../ui/primitives';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { Logo } from '../../ui/Logo';
import { fonts } from '../../theme/typography';

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
};

export function GoalCoachDrawer({
  visible,
  onClose,
  arcs,
  goals,
  launchFromArcId,
  navigateToGoalDetailOnCreate = true,
}: GoalCoachDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<'ai' | 'manual'>('ai');
  const [manualTitle, setManualTitle] = React.useState('');
  const [manualDescription, setManualDescription] = React.useState('');
  const addGoal = useAppStore((state) => state.addGoal);
  const navigation = useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();

  const workspaceSnapshot = React.useMemo(
    () => buildArcCoachLaunchContext(arcs, goals),
    [arcs, goals],
  );

  const launchContext = React.useMemo(
    () =>
      launchFromArcId
        ? {
            source: 'arcDetail',
            intent: 'goalCreation',
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
      setManualTitle('');
      setManualDescription('');
    }
  }, [visible]);

  const handleCreateManualGoal = () => {
    const trimmedTitle = manualTitle.trim();
    const trimmedDescription = manualDescription.trim();
    if (!trimmedTitle) {
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const goal: Goal = {
      id,
      arcId: launchFromArcId ?? '',
      title: trimmedTitle,
      description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
      status: 'planned',
      startDate: timestamp,
      targetDate: undefined,
      forceIntent: defaultForceLevels(0),
      metrics: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addGoal(goal);
    onClose();
    if (navigateToGoalDetailOnCreate) {
      navigation.push('GoalDetail', {
        goalId: id,
        entryPoint: 'goalsTab',
      });
    }
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={1}>
      <View style={styles.goalCoachContainer}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.brandLockup}>
            <Logo size={24} />
            <Text style={styles.brandWordmark}>Takado</Text>
          </View>
          <View style={styles.headerSideRight}>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[
                  styles.segmentedOption,
                  activeTab === 'ai' && styles.segmentedOptionActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create goal with AI"
                onPress={() => setActiveTab('ai')}
              >
                <View style={styles.segmentedOptionContent}>
                  <Icon
                    name="sparkles"
                    size={14}
                    color={activeTab === 'ai' ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentedOptionLabel,
                      activeTab === 'ai' && styles.segmentedOptionLabelActive,
                    ]}
                  >
                    AI
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={[
                  styles.segmentedOption,
                  activeTab === 'manual' && styles.segmentedOptionActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create goal manually"
                onPress={() => setActiveTab('manual')}
              >
                <View style={styles.segmentedOptionContent}>
                  <Icon
                    name="edit"
                    size={14}
                    color={activeTab === 'manual' ? colors.textPrimary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentedOptionLabel,
                      activeTab === 'manual' && styles.segmentedOptionLabelActive,
                    ]}
                  >
                    Manual
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
        {activeTab === 'ai' ? (
          <View style={styles.goalCoachBody}>
            <AgentWorkspace
              // Goal creation uses the dedicated Goal Creation Agent mode so the
              // conversation stays tightly focused on drafting one clear goal.
              mode="goalCreation"
              launchContext={launchContext}
              workspaceSnapshot={workspaceSnapshot}
              resumeDraft={false}
              hideBrandHeader
              hidePromptSuggestions
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.goalCoachBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalLabel}>Goal title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Build a Birdhouse"
                placeholderTextColor={colors.textSecondary}
                value={manualTitle}
                onChangeText={setManualTitle}
              />
              <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Short description</Text>
              <TextInput
                style={[styles.input, styles.manualNarrativeInput]}
                placeholder="Describe the concrete progress you want to make."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={manualDescription}
                onChangeText={setManualDescription}
              />
              <View style={{ marginTop: spacing.xl }}>
                <Button
                  disabled={manualTitle.trim().length === 0}
                  onPress={handleCreateManualGoal}
                >
                  <Text style={styles.buttonText}>Create Goal</Text>
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </BottomDrawer>
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
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandWordmark: {
    ...typography.bodySm,
    fontFamily: fonts.logo,
    color: colors.accent,
    marginLeft: spacing.xs,
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
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
});



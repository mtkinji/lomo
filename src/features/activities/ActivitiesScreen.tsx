import React from 'react';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type {
  ActivitiesStackParamList,
  RootDrawerParamList,
} from '../../navigation/RootNavigator';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { VStack, Heading, Text, HStack } from '../../ui/primitives';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { colors, spacing, typography } from '../../theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { Logo } from '../../ui/Logo';
import { ACTIVITY_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import type { Activity, Goal, Arc } from '../../domain/types';
import { fonts } from '../../theme/typography';

type ActivitySortMode = 'manual' | 'priority';
type ActivityFilterMode = 'all' | 'priority1' | 'active' | 'completed';
type ActivityViewId = 'default' | 'priorityFocus';

type CompletedActivitySectionProps = {
  activities: Activity[];
  goalTitleById: Record<string, string>;
  onToggleComplete: (activityId: string) => void;
  onTogglePriority: (activityId: string) => void;
  onPressActivity: (activityId: string) => void;
};

function CompletedActivitySection({
  activities,
  goalTitleById,
  onToggleComplete,
  onTogglePriority,
  onPressActivity,
}: CompletedActivitySectionProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <VStack space="xs" style={styles.completedSection}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={styles.completedToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide completed activities' : 'Show completed activities'}
      >
        <HStack alignItems="center" space="xs">
          <Text style={styles.completedToggleLabel}>Completed</Text>
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.completedCountLabel}>({activities.length})</Text>
        </HStack>
      </Pressable>

      {expanded && (
        <VStack space="xs">
          {activities.map((activity) => {
            const goalTitle = activity.goalId ? goalTitleById[activity.goalId] : undefined;
            const phase = activity.phase ?? undefined;
            const metaParts = [phase, goalTitle].filter(Boolean);
            const meta = metaParts.length > 0 ? metaParts.join(' · ') : undefined;

            return (
              <ActivityListItem
                key={activity.id}
                title={activity.title}
                meta={meta}
                isCompleted={activity.status === 'done'}
                onToggleComplete={() => onToggleComplete(activity.id)}
                isPriorityOne={activity.priority === 1}
                onTogglePriority={() => onTogglePriority(activity.id)}
                onPress={() => onPressActivity(activity.id)}
              />
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}

export function ActivitiesScreen() {
  const navigation = useNavigation<
    NativeStackNavigationProp<ActivitiesStackParamList, 'ActivitiesList'> &
      DrawerNavigationProp<RootDrawerParamList>
  >();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  const arcs = useAppStore((state) => state.arcs);
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);

  const [sortMode, setSortMode] = React.useState<ActivitySortMode>('manual');
  const [filterMode, setFilterMode] = React.useState<ActivityFilterMode>('all');
  const [activityCoachVisible, setActivityCoachVisible] = React.useState(false);
  const [activeView, setActiveView] = React.useState<ActivityViewId>('default');

  const goalTitleById = React.useMemo(
    () =>
      goals.reduce<Record<string, string>>((acc, goal) => {
        acc[goal.id] = goal.title;
        return acc;
      }, {}),
    [goals],
  );

  const filteredActivities = React.useMemo(
    () =>
      activities.filter((activity) => {
        switch (filterMode) {
          case 'priority1':
            return activity.priority === 1;
          case 'active':
            return activity.status !== 'done' && activity.status !== 'cancelled';
          case 'completed':
            return activity.status === 'done';
          case 'all':
          default:
            return true;
        }
      }),
    [activities, filterMode],
  );

  const visibleActivities = React.useMemo(() => {
    const list = [...filteredActivities];

    const compareManual = (a: (typeof list)[number], b: (typeof list)[number]) => {
      const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    };

    list.sort((a, b) => {
      if (sortMode === 'priority') {
        const priA = a.priority ?? Number.MAX_SAFE_INTEGER;
        const priB = b.priority ?? Number.MAX_SAFE_INTEGER;
        if (priA !== priB) return priA - priB;
      }
      return compareManual(a, b);
    });

    return list;
  }, [filteredActivities, sortMode]);

  const activeActivities = React.useMemo(
    () => visibleActivities.filter((activity) => activity.status !== 'done'),
    [visibleActivities],
  );

  const completedActivities = React.useMemo(
    () => visibleActivities.filter((activity) => activity.status === 'done'),
    [visibleActivities],
  );

  const hasAnyActivities = visibleActivities.length > 0;

  const handleToggleComplete = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (activity) => {
        const nextIsDone = activity.status !== 'done';
        return {
          ...activity,
          status: nextIsDone ? 'done' : 'planned',
          completedAt: nextIsDone ? timestamp : null,
          updatedAt: timestamp,
        };
      });
    },
    [updateActivity],
  );

  const handleTogglePriorityOne = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (activity) => {
        const nextPriority = activity.priority === 1 ? undefined : 1;
        return {
          ...activity,
          priority: nextPriority,
          updatedAt: timestamp,
        };
      });
    },
    [updateActivity],
  );

  const applyView = React.useCallback(
    (viewId: ActivityViewId) => {
      setActiveView(viewId);
      switch (viewId) {
        case 'priorityFocus':
          setFilterMode('priority1');
          setSortMode('priority');
          break;
        case 'default':
        default:
          setFilterMode('all');
          setSortMode('manual');
          break;
      }
    },
    [setFilterMode, setSortMode],
  );

  return (
    <AppShell>
      <PageHeader
        title="Activities"
        iconName="activities"
        menuOpen={menuOpen}
        onPressMenu={() => {
          const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
          parent?.dispatch(DrawerActions.openDrawer());
        }}
        rightElement={
          <IconButton
            accessibilityRole="button"
            accessibilityLabel="Add Activity"
            onPress={() => {
              setActivityCoachVisible(true);
            }}
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
        {activities.length > 0 && (
          <>
            <HStack
              style={styles.toolbarRow}
              alignItems="center"
              justifyContent="space-between"
            >
              <View style={styles.toolbarButtonWrapper}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="small"
                      accessibilityRole="button"
                      accessibilityLabel="Views menu"
                    >
                      <HStack alignItems="center" space="xs">
                        <Icon name="panelLeft" size={14} color={colors.textPrimary} />
                        <Text style={styles.toolbarButtonLabel}>Views</Text>
                      </HStack>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                    <DropdownMenuItem onPress={() => applyView('default')}>
                      <Text style={styles.menuItemText}>Default view</Text>
                    </DropdownMenuItem>
                    <DropdownMenuItem onPress={() => applyView('priorityFocus')}>
                      <Text style={styles.menuItemText}>Priority 1 focus</Text>
                    </DropdownMenuItem>
                    {/* TODO: Add \"Save current as view…\" flow when view persistence is designed. */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>

              <HStack space="sm" alignItems="center">
                <View style={styles.toolbarButtonWrapper}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="small"
                        accessibilityRole="button"
                        accessibilityLabel="Filter activities"
                      >
                        <HStack alignItems="center" space="xs">
                          <Icon name="funnel" size={14} color={colors.textPrimary} />
                          <Text style={styles.toolbarButtonLabel}>Filter</Text>
                        </HStack>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                      <DropdownMenuItem onPress={() => setFilterMode('all')}>
                        <Text style={styles.menuItemText}>All activities</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setFilterMode('priority1')}>
                        <Text style={styles.menuItemText}>Priority 1</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setFilterMode('active')}>
                        <Text style={styles.menuItemText}>Active</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setFilterMode('completed')}>
                        <Text style={styles.menuItemText}>Completed</Text>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>

                <View style={styles.toolbarButtonWrapper}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="small"
                        accessibilityRole="button"
                        accessibilityLabel="Sort activities"
                      >
                        <HStack alignItems="center" space="xs">
                          <Icon name="sort" size={14} color={colors.textPrimary} />
                          <Text style={styles.toolbarButtonLabel}>Sort</Text>
                        </HStack>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                      <DropdownMenuItem onPress={() => setSortMode('manual')}>
                        <Text style={styles.menuItemText}>Manual order</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setSortMode('priority')}>
                        <Text style={styles.menuItemText}>Priority (1 → 3)</Text>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>
              </HStack>
            </HStack>

            {(filterMode !== 'all' || sortMode !== 'manual' || activeView !== 'default') && (
              <HStack style={styles.appliedChipsRow} space="xs" alignItems="center">
                {activeView !== 'default' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Reset to default view"
                    onPress={() => applyView('default')}
                    style={styles.appliedChip}
                  >
                    <HStack space="xs" alignItems="center">
                      <Text style={styles.appliedChipLabel}>
                        View: {getViewLabel(activeView)}
                      </Text>
                      <Icon name="close" size={12} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                )}
                {filterMode !== 'all' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear activity filters"
                    onPress={() => setFilterMode('all')}
                    style={styles.appliedChip}
                  >
                    <HStack space="xs" alignItems="center">
                      <Text style={styles.appliedChipLabel}>
                        Filter: {getFilterLabel(filterMode)}
                      </Text>
                      <Icon name="close" size={12} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                )}
                {sortMode !== 'manual' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Reset sort to manual order"
                    onPress={() => setSortMode('manual')}
                    style={styles.appliedChip}
                  >
                    <HStack space="xs" alignItems="center">
                      <Text style={styles.appliedChipLabel}>
                        Sort: {getSortLabel(sortMode)}
                      </Text>
                      <Icon name="close" size={12} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                )}
              </HStack>
            )}
          </>
        )}

        {hasAnyActivities ? (
          <>
            {activeActivities.length > 0 && (
              <VStack space="xs">
                {activeActivities.map((activity) => {
                  const goalTitle = activity.goalId ? goalTitleById[activity.goalId] : undefined;
                  const phase = activity.phase ?? undefined;
                  const metaParts = [phase, goalTitle].filter(Boolean);
                  const meta = metaParts.length > 0 ? metaParts.join(' · ') : undefined;

                  return (
                    <ActivityListItem
                      key={activity.id}
                      title={activity.title}
                      meta={meta}
                      isCompleted={activity.status === 'done'}
                      onToggleComplete={() => handleToggleComplete(activity.id)}
                      isPriorityOne={activity.priority === 1}
                      onTogglePriority={() => handleTogglePriorityOne(activity.id)}
                      onPress={() =>
                        navigation.push('ActivityDetail', {
                          activityId: activity.id,
                        })
                      }
                    />
                  );
                })}
              </VStack>
            )}

            {completedActivities.length > 0 && (
              <CompletedActivitySection
                activities={completedActivities}
                goalTitleById={goalTitleById}
                onToggleComplete={handleToggleComplete}
                onTogglePriority={handleTogglePriorityOne}
                onPressActivity={(activityId) =>
                  navigation.push('ActivityDetail', {
                    activityId,
                  })
                }
              />
            )}
          </>
        ) : (
          <VStack space="sm" style={styles.emptyState}>
            <Heading style={styles.emptyTitle}>No activities yet</Heading>
            <Text style={styles.emptyBody}>
              Activities are the concrete tasks that move your arcs and goals forward. You can
              start by adding a single activity, then group and refine later.
            </Text>
      </VStack>
        )}
      </ScrollView>
      <ActivityCoachDrawer
        visible={activityCoachVisible}
        onClose={() => setActivityCoachVisible(false)}
        goals={goals}
        activities={activities}
        arcs={arcs}
        addActivity={addActivity}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  toolbarRow: {
    marginBottom: spacing.sm,
  },
  toolbarButtonWrapper: {
    flexShrink: 0,
  },
  toolbarButtonLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  appliedChipsRow: {
    // Keep the gap between the applied chips and the Activities canvas tight so
    // the pills feel directly connected to the list below.
    marginBottom: 0,
  },
  emptyState: {
    // When the list is empty, keep the "No activities yet" message close to the
    // filter/sort controls so the total gap feels like a single `lg` step.
    marginTop: spacing.lg,
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
  completedSection: {
    marginTop: spacing['2xl'],
  },
  completedToggle: {
    paddingVertical: spacing.xs,
  },
  completedToggleLabel: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  completedCountLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  menuItemText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  appliedChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  appliedChipLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  activityCoachContainer: {
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
  activityCoachBody: {
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

function getFilterLabel(mode: ActivityFilterMode): string {
  switch (mode) {
    case 'priority1':
      return 'Priority 1';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'all':
    default:
      return 'All';
  }
}

function getSortLabel(mode: ActivitySortMode): string {
  switch (mode) {
    case 'priority':
      return 'Priority (1 → 3)';
    case 'manual':
    default:
      return 'Manual order';
  }
}

function getViewLabel(viewId: ActivityViewId): string {
  switch (viewId) {
    case 'priorityFocus':
      return 'Priority 1 focus';
    case 'default':
    default:
      return 'Default view';
  }
}

type ActivityCoachDrawerProps = {
  visible: boolean;
  onClose: () => void;
  goals: Goal[];
  activities: Activity[];
  arcs: Arc[];
  addActivity: (activity: Activity) => void;
};

function ActivityCoachDrawer({
  visible,
  onClose,
  goals,
  activities,
  arcs,
  addActivity,
}: ActivityCoachDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<'ai' | 'manual'>('ai');
  const [manualActivityId, setManualActivityId] = React.useState<string | null>(null);
  const updateActivity = useAppStore((state) => state.updateActivity);

  const workspaceSnapshot = React.useMemo(
    () => buildActivityCoachLaunchContext(goals, activities),
    [goals, activities],
  );

  const launchContext = React.useMemo(
    () => ({
      source: 'activitiesList' as const,
      intent: 'activityCreation' as const,
    }),
    [],
  );

  React.useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setManualActivityId(null);
    }
  }, [visible]);

  const handleCreateManualActivity = React.useCallback(() => {
    if (manualActivityId) {
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const activity: Activity = {
      id,
      goalId: null,
      title: '',
      notes: undefined,
      reminderAt: null,
      priority: undefined,
      estimateMinutes: null,
      scheduledDate: null,
      repeatRule: undefined,
      orderIndex: (activities.length || 0) + 1,
      phase: null,
      status: 'planned',
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      forceActual: defaultForceLevels(0),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addActivity(activity);
    setManualActivityId(id);
  }, [activities.length, addActivity, manualActivityId]);

  React.useEffect(() => {
    if (!visible) return;
    if (activeTab !== 'manual') return;
    if (manualActivityId) return;
    handleCreateManualActivity();
  }, [visible, activeTab, manualActivityId, handleCreateManualActivity]);

  const manualActivity = React.useMemo(
    () => (manualActivityId ? activities.find((a) => a.id === manualActivityId) ?? null : null),
    [activities, manualActivityId],
  );

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={1}>
      <View style={styles.activityCoachContainer}>
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
                accessibilityLabel="Create activities with AI"
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
                accessibilityLabel="Create activity manually"
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
          <View style={styles.activityCoachBody}>
            <AgentWorkspace
              mode="activityCreation"
              launchContext={launchContext}
              workspaceSnapshot={workspaceSnapshot}
              workflowDefinitionId={ACTIVITY_CREATION_WORKFLOW_ID}
              resumeDraft={false}
              hideBrandHeader
              hidePromptSuggestions
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.activityCoachBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalLabel}>Activity title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Clear the workbench"
                placeholderTextColor={colors.textSecondary}
                value={manualActivity?.title ?? ''}
                onChangeText={(next) => {
                  if (!manualActivity) return;
                  const timestamp = new Date().toISOString();
                  updateActivity(manualActivity.id, (prev) => ({
                    ...prev,
                    title: next,
                    updatedAt: timestamp,
                  }));
                }}
              />
              <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.manualNarrativeInput]}
                placeholder="Add a short note or checklist for this activity."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={manualActivity?.notes ?? ''}
                onChangeText={(next) => {
                  if (!manualActivity) return;
                  const timestamp = new Date().toISOString();
                  updateActivity(manualActivity.id, (prev) => ({
                    ...prev,
                    notes: next.trim().length > 0 ? next : undefined,
                    updatedAt: timestamp,
                  }));
                }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </BottomDrawer>
  );
}


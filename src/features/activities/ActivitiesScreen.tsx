import React from 'react';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, TextInput } from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type {
  ActivitiesStackParamList,
  RootDrawerParamList,
} from '../../navigation/RootNavigator';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { VStack, Heading, Text, HStack, Input, Textarea } from '../../ui/primitives';
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
import type {
  Activity,
  ActivityView,
  ActivityFilterMode,
  ActivitySortMode,
  Goal,
  Arc,
} from '../../domain/types';
import { fonts } from '../../theme/typography';

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
  const activityViews = useAppStore((state) => state.activityViews);
  const activeActivityViewId = useAppStore((state) => state.activeActivityViewId);
  const setActiveActivityViewId = useAppStore((state) => state.setActiveActivityViewId);
  const addActivityView = useAppStore((state) => state.addActivityView);
  const updateActivityView = useAppStore((state) => state.updateActivityView);
  const removeActivityView = useAppStore((state) => state.removeActivityView);

  const [activityCoachVisible, setActivityCoachVisible] = React.useState(false);
  const [viewEditorVisible, setViewEditorVisible] = React.useState(false);
  const [viewEditorMode, setViewEditorMode] = React.useState<'create' | 'settings'>('create');
  const [viewEditorTargetId, setViewEditorTargetId] = React.useState<string | null>(null);
  const [viewEditorName, setViewEditorName] = React.useState('');
  const [viewsMenuOpen, setViewsMenuOpen] = React.useState(false);

  const activeView: ActivityView | undefined = React.useMemo(() => {
    const current =
      activityViews.find((view) => view.id === activeActivityViewId) ?? activityViews[0];
    return current;
  }, [activityViews, activeActivityViewId]);

  const filterMode = activeView?.filterMode ?? 'all';
  const sortMode = activeView?.sortMode ?? 'manual';
  const showCompleted = activeView?.showCompleted ?? true;

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

    const compareTitle = (a: (typeof list)[number], b: (typeof list)[number]) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

    const getDueDate = (activity: (typeof list)[number]) => {
      // Prefer a scheduled date as the canonical "due date", falling back to a reminder if present.
      const source = activity.scheduledDate ?? activity.reminderAt ?? null;
      if (!source) return Number.MAX_SAFE_INTEGER;
      return new Date(source).getTime();
    };

    list.sort((a, b) => {
      switch (sortMode) {
        case 'titleAsc':
          return compareTitle(a, b) || compareManual(a, b);
        case 'titleDesc':
          return compareTitle(b, a) || compareManual(a, b);
        case 'dueDateAsc': {
          const diff = getDueDate(a) - getDueDate(b);
          if (diff !== 0) return diff;
          return compareManual(a, b);
        }
        case 'dueDateDesc': {
          const diff = getDueDate(b) - getDueDate(a);
          if (diff !== 0) return diff;
          return compareManual(a, b);
        }
        case 'priority': {
        const priA = a.priority ?? Number.MAX_SAFE_INTEGER;
        const priB = b.priority ?? Number.MAX_SAFE_INTEGER;
        if (priA !== priB) return priA - priB;
          return compareManual(a, b);
      }
        case 'manual':
        default:
      return compareManual(a, b);
      }
    });

    return list;
  }, [filteredActivities, sortMode]);

  const activeActivities = React.useMemo(
    () => visibleActivities.filter((activity) => activity.status !== 'done'),
    [visibleActivities],
  );

  const completedActivities = React.useMemo(
    () =>
      showCompleted ? visibleActivities.filter((activity) => activity.status === 'done') : [],
    [visibleActivities, showCompleted],
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
    (viewId: string) => {
      setActiveActivityViewId(viewId);
    },
    [setActiveActivityViewId],
  );

  const handleUpdateFilterMode = React.useCallback(
    (next: ActivityFilterMode) => {
      if (!activeView) return;
      updateActivityView(activeView.id, (view) => ({
        ...view,
        filterMode: next,
      }));
    },
    [activeView, updateActivityView],
  );

  const handleUpdateSortMode = React.useCallback(
    (next: ActivitySortMode) => {
      if (!activeView) return;
      updateActivityView(activeView.id, (view) => ({
        ...view,
        sortMode: next,
      }));
    },
    [activeView, updateActivityView],
  );

  const handleUpdateShowCompleted = React.useCallback(
    (next: boolean) => {
      if (!activeView) return;
      updateActivityView(activeView.id, (view) => ({
        ...view,
        showCompleted: next,
      }));
    },
    [activeView, updateActivityView],
  );

  const handleOpenCreateView = React.useCallback(() => {
    setViewEditorMode('create');
    setViewEditorTargetId(null);
    setViewEditorName('New view');
    setViewEditorVisible(true);
  }, []);

  const handleOpenViewSettings = React.useCallback(
    (view: ActivityView) => {
      if (view.isSystem) {
        return;
      }
      setViewEditorMode('settings');
      setViewEditorTargetId(view.id);
      setViewEditorName(view.name);
      setViewEditorVisible(true);
    },
    [],
  );

  const handleConfirmViewEdit = React.useCallback(() => {
    const trimmedName = viewEditorName.trim() || 'Untitled view';

    if (viewEditorMode === 'create') {
      const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nextView: ActivityView = {
        id,
        name: trimmedName,
        // New views always start from the base default configuration.
        filterMode: 'all',
        sortMode: 'manual',
        isSystem: false,
      };
      addActivityView(nextView);
      setActiveActivityViewId(id);
    } else if (viewEditorMode === 'settings' && viewEditorTargetId) {
      updateActivityView(viewEditorTargetId, (view) => ({
        ...view,
        name: trimmedName,
      }));
    }

    setViewEditorVisible(false);
  }, [
    addActivityView,
    setActiveActivityViewId,
    updateActivityView,
    viewEditorMode,
    viewEditorName,
    viewEditorTargetId,
  ]);

  const handleDuplicateView = React.useCallback(
    (view: ActivityView) => {
      const id = `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nextView: ActivityView = {
        id,
        name: `${view.name} copy`,
        filterMode: view.filterMode,
        sortMode: view.sortMode,
        isSystem: false,
      };
      addActivityView(nextView);
      setActiveActivityViewId(id);
    },
    [addActivityView, setActiveActivityViewId],
  );

  const handleDeleteView = React.useCallback(
    (view: ActivityView) => {
      if (view.isSystem) {
        return;
      }
      removeActivityView(view.id);
    },
    [removeActivityView],
  );

  const handleDuplicateCurrentView = React.useCallback(() => {
    if (!viewEditorTargetId) return;
    const view = activityViews.find((v) => v.id === viewEditorTargetId);
    if (!view) return;
    handleDuplicateView(view);
    setViewEditorVisible(false);
  }, [activityViews, handleDuplicateView, viewEditorTargetId]);

  const handleDeleteCurrentView = React.useCallback(() => {
    if (!viewEditorTargetId) return;
    const view = activityViews.find((v) => v.id === viewEditorTargetId);
    if (!view || view.isSystem) return;
    handleDeleteView(view);
    setViewEditorVisible(false);
  }, [activityViews, handleDeleteView, viewEditorTargetId]);

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
                <DropdownMenu open={viewsMenuOpen} onOpenChange={setViewsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="small"
                      accessibilityRole="button"
                      accessibilityLabel="Views menu"
                    >
                      <HStack alignItems="center" space="xs">
                        <Icon name="panelLeft" size={14} color={colors.textPrimary} />
                        <Text style={styles.toolbarButtonLabel}>
                          {activeView?.name ?? 'Default view'}
                        </Text>
                      </HStack>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                    {activityViews.map((view) => (
                      <DropdownMenuItem key={view.id} onPress={() => applyView(view.id)}>
                        <HStack alignItems="center" justifyContent="space-between" space="sm">
                          <Text style={styles.menuItemText}>{view.name}</Text>
                          {!view.isSystem && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`View options for ${view.name}`}
                              onPress={() => {
                                setViewsMenuOpen(false);
                                handleOpenViewSettings(view);
                              }}
                            >
                              <Icon name="more" size={16} color={colors.textSecondary} />
                            </Pressable>
                          )}
                        </HStack>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onPress={handleOpenCreateView}>
                      <HStack alignItems="center" space="xs">
                        <Icon name="plus" size={14} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>New view</Text>
                      </HStack>
                    </DropdownMenuItem>
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
                          <Icon name="funnel" size={14} color={colors.textPrimary} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                      <DropdownMenuItem onPress={() => handleUpdateFilterMode('all')}>
                        <Text style={styles.menuItemText}>All activities</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateFilterMode('priority1')}>
                        <Text style={styles.menuItemText}>Priority 1</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateFilterMode('active')}>
                        <Text style={styles.menuItemText}>Active</Text>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateFilterMode('completed')}>
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
                          <Icon name="sort" size={14} color={colors.textPrimary} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                      <DropdownMenuItem onPress={() => handleUpdateSortMode('manual')}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="menu" size={14} color={colors.textSecondary} />
                        <Text style={styles.menuItemText}>Manual order</Text>
                        </HStack>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateSortMode('titleAsc')}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="arrowUp" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>Title A–Z</Text>
                        </HStack>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateSortMode('titleDesc')}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="arrowDown" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>Title Z–A</Text>
                        </HStack>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateSortMode('dueDateAsc')}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="today" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>Due date (soonest first)</Text>
                        </HStack>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateSortMode('dueDateDesc')}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="today" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>Due date (latest first)</Text>
                        </HStack>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => handleUpdateSortMode('priority')}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="star" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>Priority (P1 first)</Text>
                        </HStack>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>
              </HStack>
            </HStack>

            {(filterMode !== 'all' || sortMode !== 'manual') && (
              <HStack style={styles.appliedChipsRow} space="xs" alignItems="center">
                {filterMode !== 'all' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear activity filters"
                    onPress={() => handleUpdateFilterMode('all')}
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
                    onPress={() => handleUpdateSortMode('manual')}
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
      {viewEditorVisible && (
        <View style={styles.viewEditorOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.viewEditorBackdrop}
            onPress={() => setViewEditorVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss view editor"
          />
          <View style={styles.viewEditorCard}>
            <Text style={styles.viewEditorTitle}>
              {viewEditorMode === 'create' ? 'New view' : 'View settings'}
            </Text>
            <Text style={styles.viewEditorDescription}>
              {viewEditorMode === 'create'
                ? 'Give this view a short, memorable name.'
                : 'Rename this view or manage its shortcuts.'}
            </Text>
            <Text style={styles.viewEditorFieldLabel}>View name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Top priorities"
              placeholderTextColor={colors.textSecondary}
              value={viewEditorName}
              onChangeText={setViewEditorName}
            />
            {viewEditorMode === 'settings' && (
              <HStack
                style={styles.viewEditorToggleRow}
                alignItems="center"
                justifyContent="space-between"
              >
                <Text style={styles.viewEditorToggleLabel}>Show completed </Text>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Toggle visibility of completed activities section"
                  accessibilityState={{ checked: showCompleted }}
                  onPress={() => handleUpdateShowCompleted(!showCompleted)}
                  style={[
                    styles.viewEditorToggleTrack,
                    showCompleted && styles.viewEditorToggleTrackOn,
                  ]}
                >
                  <View
                    style={[
                      styles.viewEditorToggleThumb,
                      showCompleted && styles.viewEditorToggleThumbOn,
                    ]}
                  />
                </Pressable>
              </HStack>
            )}
            {viewEditorMode === 'settings' && (
              <VStack style={styles.viewEditorShortcutsSection} space="xs">
                <Text style={styles.viewEditorFieldLabel}>View actions</Text>
                <HStack style={styles.viewEditorSecondaryActions} space="sm" alignItems="center">
                  <Button
                    variant="outline"
                    size="small"
                    onPress={handleDuplicateCurrentView}
                    accessibilityRole="button"
                    accessibilityLabel="Duplicate this view"
                  >
                    <HStack alignItems="center" space="xs">
                      <Icon name="clipboard" size={14} color={colors.textPrimary} />
                      <Text style={styles.viewEditorShortcutLabel}>Duplicate view</Text>
                    </HStack>
                  </Button>
                  <Button
                    variant="destructive"
                    size="small"
                    onPress={handleDeleteCurrentView}
                    accessibilityRole="button"
                    accessibilityLabel="Delete this view"
                  >
                    <HStack alignItems="center" space="xs">
                      <Icon name="trash" size={14} color={colors.canvas} />
                      <Text style={styles.viewEditorShortcutDestructiveLabel}>Delete view</Text>
                    </HStack>
                  </Button>
                </HStack>
              </VStack>
            )}
            <HStack style={styles.viewEditorActions} space="sm" alignItems="center">
              <Button variant="ghost" onPress={() => setViewEditorVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleConfirmViewEdit}>
                <Text>Save</Text>
              </Button>
            </HStack>
          </View>
        </View>
      )}
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
    // Keep a comfortable gap between the applied chips and the Activities list
    // so the controls feel visually separate from the canvas, while still
    // clearly associated with it.
    marginBottom: spacing.lg,
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
    ...typography.bodySm,
    color: colors.textSecondary,
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
  viewEditorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewEditorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  viewEditorCard: {
    maxWidth: 480,
    width: '90%',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  viewEditorTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  viewEditorDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  viewEditorFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  viewEditorToggleRow: {
    marginTop: spacing.lg,
  },
  aiErrorFallbackRow: {
    // Deprecated: manual fallback card is now rendered inside AiChatScreen.
    display: 'none',
  },
  viewEditorToggleLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  viewEditorToggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    padding: 2,
    justifyContent: 'center',
  },
  viewEditorToggleTrackOn: {
    backgroundColor: colors.accent,
  },
  viewEditorToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    alignSelf: 'flex-start',
  },
  viewEditorToggleThumbOn: {
    alignSelf: 'flex-end',
  },
  viewEditorShortcutsSection: {
    marginTop: spacing.lg,
  },
  viewEditorSecondaryActions: {
    flexDirection: 'row',
  },
  viewEditorActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewEditorShortcutLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  viewEditorShortcutDestructiveLabel: {
    ...typography.bodySm,
    color: colors.canvas,
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
    case 'titleAsc':
      return 'Title A–Z';
    case 'titleDesc':
      return 'Title Z–A';
    case 'dueDateAsc':
      return 'Due date (soonest first)';
    case 'dueDateDesc':
      return 'Due date (latest first)';
    case 'priority':
      return 'Priority (P1 first)';
    case 'manual':
    default:
      return 'Manual order';
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
      steps: [],
      reminderAt: null,
      priority: undefined,
      estimateMinutes: null,
      creationSource: 'manual',
      planGroupId: null,
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

  const handleSwitchToManual = React.useCallback(() => {
    setActiveTab('manual');
  }, []);

  const handleAiComplete = React.useCallback(
    (outcome: unknown) => {
      const adoptedTitles = Array.isArray((outcome as any)?.adoptedActivityTitles)
        ? (outcome as any).adoptedActivityTitles
        : [];

      if (!adoptedTitles || adoptedTitles.length === 0) {
        return;
      }

      const baseIndex = activities.length;
      adoptedTitles.forEach((rawTitle: unknown, idx: number) => {
        if (typeof rawTitle !== 'string') return;
        const trimmedTitle = rawTitle.trim();
        if (!trimmedTitle) return;

        const timestamp = new Date().toISOString();
        const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const activity: Activity = {
          id,
          goalId: null,
          title: trimmedTitle,
          notes: undefined,
          steps: [],
          reminderAt: null,
          priority: undefined,
          estimateMinutes: null,
          creationSource: 'ai',
          planGroupId: null,
          scheduledDate: null,
          repeatRule: undefined,
          orderIndex: baseIndex + idx + 1,
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
      });
    },
    [activities.length, addActivity],
  );

  const handleAdoptActivitySuggestion = React.useCallback(
    (suggestion: import('../ai/AiChatScreen').ActivitySuggestion) => {
      const timestamp = new Date().toISOString();
      const baseIndex = activities.length;
      const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const steps =
        suggestion.steps?.map((step, index) => ({
          id: `step-${id}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          title: step.title,
          isOptional: step.isOptional ?? false,
          completedAt: null,
          orderIndex: index,
        })) ?? [];

      const activity: Activity = {
        id,
        goalId: null,
        title: suggestion.title.trim(),
        notes: suggestion.why,
        steps,
        reminderAt: null,
        priority: undefined,
        estimateMinutes: suggestion.timeEstimateMinutes ?? null,
        creationSource: 'ai',
        planGroupId: null,
        scheduledDate: null,
        repeatRule: undefined,
        orderIndex: baseIndex + 1,
        phase: null,
        status: 'planned',
        actualMinutes: null,
        startedAt: null,
        completedAt: null,
        aiPlanning: suggestion.timeEstimateMinutes || suggestion.energyLevel
          ? {
              estimateMinutes: suggestion.timeEstimateMinutes ?? null,
              difficulty:
                suggestion.energyLevel === 'light'
                  ? 'easy'
                  : suggestion.energyLevel === 'focused'
                  ? 'hard'
                  : undefined,
              lastUpdatedAt: timestamp,
              source: 'full_context',
            }
          : undefined,
        forceActual: defaultForceLevels(0),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      addActivity(activity);
    },
    [activities.length, addActivity],
  );

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={1}>
      <View style={styles.activityCoachContainer}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.brandLockup}>
            <Logo size={24} />
            <Text style={styles.brandWordmark}>kwilt</Text>
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
              onComplete={handleAiComplete}
              onTransportError={handleSwitchToManual}
              onAdoptActivitySuggestion={handleAdoptActivitySuggestion}
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.activityCoachBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'], gap: spacing.md }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Activity title"
                placeholder="e.g., Clear the workbench"
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
                variant="outline"
              />
              <Textarea
                label="Notes (optional)"
                placeholder="Add a short note or checklist for this activity."
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
                multiline
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </BottomDrawer>
  );
}


import React from 'react';
import { DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  TextInput,
} from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
import type {
  ActivitiesStackParamList,
  RootDrawerParamList,
} from '../../navigation/RootNavigator';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { VStack, Heading, Text, HStack, Input, Textarea, ButtonLabel, Card, EmptyState } from '../../ui/primitives';
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
import { Coachmark } from '../../ui/Coachmark';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { ACTIVITY_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import type {
  Activity,
  ActivityView,
  ActivityFilterMode,
  ActivitySortMode,
  Goal,
  Arc,
  ActivityStep,
} from '../../domain/types';
import { fonts } from '../../theme/typography';
import { Dialog } from '../../ui/Dialog';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

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

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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
  const isFocused = useIsFocused();
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
  const hasDismissedActivitiesListGuide = useAppStore(
    (state) => state.hasDismissedActivitiesListGuide,
  );
  const setHasDismissedActivitiesListGuide = useAppStore(
    (state) => state.setHasDismissedActivitiesListGuide,
  );

  const [activityCoachVisible, setActivityCoachVisible] = React.useState(false);
  const [viewEditorVisible, setViewEditorVisible] = React.useState(false);
  const [viewEditorMode, setViewEditorMode] = React.useState<'create' | 'settings'>('create');
  const [viewEditorTargetId, setViewEditorTargetId] = React.useState<string | null>(null);
  const [viewEditorName, setViewEditorName] = React.useState('');

  const addButtonRef = React.useRef<View | null>(null);
  const viewsButtonRef = React.useRef<View | null>(null);
  const filterButtonRef = React.useRef<View | null>(null);
  const sortButtonRef = React.useRef<View | null>(null);
  const [activitiesGuideStep, setActivitiesGuideStep] = React.useState(0);

  const guideVariant = activities.length > 0 ? 'full' : 'empty';
  const guideTotalSteps = guideVariant === 'full' ? 3 : 1;
  const shouldShowActivitiesListGuide =
    isFocused && !hasDismissedActivitiesListGuide && !activityCoachVisible && !viewEditorVisible;

  const dismissActivitiesListGuide = React.useCallback(() => {
    setHasDismissedActivitiesListGuide(true);
    setActivitiesGuideStep(0);
  }, [setHasDismissedActivitiesListGuide]);

  const guideTargetRef =
    guideVariant === 'empty'
      ? addButtonRef
      : activitiesGuideStep === 0
      ? viewsButtonRef
      : activitiesGuideStep === 1
      ? filterButtonRef
      : sortButtonRef;

  const guideCopy = React.useMemo(() => {
    if (guideVariant === 'empty') {
      return {
        title: 'Start here',
        body: 'Tap + to add your first Activity. Once you have a few, you can use Views, Filters, and Sort to stay focused.',
      };
    }
    if (activitiesGuideStep === 0) {
      return {
        title: 'Views = saved setups',
        body: 'Views remember your filter + sort (and “show completed”). Create a few like “This week” or “P1 only.”',
      };
    }
    if (activitiesGuideStep === 1) {
      return {
        title: 'Filter the list',
        body: 'Quickly switch between All, Active, Completed, or Priority 1 activities.',
      };
    }
    return {
      title: 'Sort changes the order',
      body: 'Try due date or priority sorting when the list grows. Manual keeps your custom ordering.',
    };
  }, [activitiesGuideStep, guideVariant]);

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
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          220,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
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
            ref={addButtonRef}
            collapsable={false}
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
      <Coachmark
        visible={shouldShowActivitiesListGuide}
        targetRef={guideTargetRef}
        scrimToken="subtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={16}
        highlightColor={colors.turmeric}
        actionColor={colors.turmeric}
        title={<Text style={styles.activitiesGuideTitle}>{guideCopy.title}</Text>}
        body={<Text style={styles.activitiesGuideBody}>{guideCopy.body}</Text>}
        progressLabel={`${Math.min(activitiesGuideStep + 1, guideTotalSteps)} of ${guideTotalSteps}`}
        actions={
          guideTotalSteps > 1
            ? [
                { id: 'skip', label: 'Skip', variant: 'outline' },
                {
                  id: activitiesGuideStep >= guideTotalSteps - 1 ? 'done' : 'next',
                  label: activitiesGuideStep >= guideTotalSteps - 1 ? 'Got it' : 'Next',
                  variant: 'accent',
                },
              ]
            : [{ id: 'done', label: 'Got it', variant: 'accent' }]
        }
        onAction={(actionId) => {
          if (actionId === 'skip') {
            dismissActivitiesListGuide();
            return;
          }
          if (actionId === 'next') {
            setActivitiesGuideStep((current) => Math.min(current + 1, guideTotalSteps - 1));
            return;
          }
          dismissActivitiesListGuide();
        }}
        onDismiss={dismissActivitiesListGuide}
        placement="below"
      />
      <CanvasScrollView
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
                  <DropdownMenuTrigger accessibilityRole="button" accessibilityLabel="Views menu">
                    <Button
                      ref={viewsButtonRef}
                      collapsable={false}
                      variant="outline"
                      size="small"
                      pointerEvents="none"
                      accessible={false}
                    >
                      <HStack alignItems="center" space="xs">
                        <Icon name="panelLeft" size={14} color={colors.textPrimary} />
                        <Text style={styles.toolbarButtonLabel}>
                          {activeView?.name ?? 'Default view'}
                        </Text>
                      </HStack>
                    </Button>
                  </DropdownMenuTrigger>
                  {!viewEditorVisible && (
                    <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                      {activityViews.map((view) => (
                        <DropdownMenuItem key={view.id} onPress={() => applyView(view.id)}>
                          <HStack
                            alignItems="center"
                            justifyContent="space-between"
                            space="sm"
                            flex={1}
                          >
                            <Text style={styles.menuItemText}>{view.name}</Text>
                            {activeView?.id === view.id ? (
                              <Icon name="more" size={16} color={colors.textSecondary} />
                            ) : null}
                          </HStack>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        disabled={!activeView}
                        onPress={() => {
                          if (!activeView) return;
                          handleOpenViewSettings(activeView);
                        }}
                      >
                        <HStack alignItems="center" space="xs">
                          <Icon name="more" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>View settings</Text>
                        </HStack>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={handleOpenCreateView}>
                        <HStack alignItems="center" space="xs">
                          <Icon name="plus" size={14} color={colors.textSecondary} />
                          <Text style={styles.menuItemText}>New view</Text>
                        </HStack>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              </View>

              <HStack space="sm" alignItems="center">
                <View style={styles.toolbarButtonWrapper}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      accessibilityRole="button"
                      accessibilityLabel="Filter activities"
                    >
                      <Button
                        ref={filterButtonRef}
                        collapsable={false}
                        variant="outline"
                        size="small"
                        pointerEvents="none"
                        accessible={false}
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
                    <DropdownMenuTrigger accessibilityRole="button" accessibilityLabel="Sort activities">
                      <Button
                        ref={sortButtonRef}
                        collapsable={false}
                        variant="outline"
                        size="small"
                        pointerEvents="none"
                        accessible={false}
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
          <EmptyState
            title="No activities yet"
            instructions="Add your first activity to start building momentum."
            primaryAction={{
              label: 'Add activity',
              variant: 'accent',
              onPress: () => setActivityCoachVisible(true),
              accessibilityLabel: 'Add a new activity',
            }}
            style={styles.emptyState}
          />
        )}
      </CanvasScrollView>
      <ActivityCoachDrawer
        visible={activityCoachVisible}
        onClose={() => setActivityCoachVisible(false)}
        goals={goals}
        activities={activities}
        arcs={arcs}
        addActivity={addActivity}
      />
      <Dialog
        visible={viewEditorVisible}
        onClose={() => setViewEditorVisible(false)}
        title={viewEditorMode === 'create' ? 'New view' : 'View settings'}
        size="md"
        showHeaderDivider
        footer={
          <HStack style={styles.viewEditorActions} space="sm" alignItems="center">
            <Button variant="ghost" size="small" onPress={() => setViewEditorVisible(false)}>
              <ButtonLabel size="md">Cancel</ButtonLabel>
            </Button>
            <Button size="small" onPress={handleConfirmViewEdit}>
              <ButtonLabel size="md" tone="inverse">
                Save
              </ButtonLabel>
            </Button>
          </HStack>
        }
      >
        <VStack space="md">
          <View>
            <Text style={styles.viewEditorFieldLabel}>View name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Top priorities"
              placeholderTextColor={colors.textSecondary}
              value={viewEditorName}
              onChangeText={setViewEditorName}
            />
          </View>

          {viewEditorMode === 'settings' && (
            <>
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
            </>
          )}
        </VStack>
      </Dialog>
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
  activitiesGuideTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  activitiesGuideBody: {
    ...typography.body,
    color: colors.textPrimary,
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
    // Let the BottomDrawer define the horizontal gutters; the card inside this
    // ScrollView will run full-width within those paddings.
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
  addStepInlineRow: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  rowsCard: {
    borderRadius: 20,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionLabelRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  addStepButtonText: {
    ...typography.label,
    color: colors.primaryForeground,
  },
  stepsEmpty: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stepRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPlanned: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  stepOptionalPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.shell,
  },
  stepOptionalText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  stepOptionalTextActive: {
    color: colors.accent,
  },
  removeStepButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: colors.shellAlt,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rowLabelActive: {
    color: colors.accent,
  },
  rowContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  rowRight: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
  rowValueAi: {
    color: colors.accent,
  },
  planningHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  datePickerContainer: {
    marginTop: spacing.sm,
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
  const removeActivity = useAppStore((state) => state.removeActivity);
  const [reminderSheetVisible, setReminderSheetVisible] = React.useState(false);
  const [dueDateSheetVisible, setDueDateSheetVisible] = React.useState(false);
  const [repeatSheetVisible, setRepeatSheetVisible] = React.useState(false);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = React.useState(false);
  const [isActivityAiInfoVisible, setIsActivityAiInfoVisible] = React.useState(false);
  const [isAddingStepInline, setIsAddingStepInline] = React.useState(false);
  const [newStepTitle, setNewStepTitle] = React.useState('');
  const newStepInputRef = React.useRef<TextInput | null>(null);

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

  const manualActivity = React.useMemo(
    () => (manualActivityId ? activities.find((a) => a.id === manualActivityId) ?? null : null),
    [activities, manualActivityId],
  );

  React.useEffect(() => {
    if (!visible) {
      // When the drawer closes, clean up any empty "scratch" Activity that was
      // created for the Manual tab but never meaningfully edited. This prevents
      // a new object from lingering in the store every time someone opens the
      // create flow and immediately bails.
      if (manualActivityId && manualActivity) {
        const title = manualActivity.title?.trim() ?? '';
        const hasTitle = title.length > 0;
        const hasNotes = (manualActivity.notes ?? '').trim().length > 0;
        const hasSteps = (manualActivity.steps ?? []).length > 0;
        const hasReminder = Boolean(manualActivity.reminderAt);
        const hasScheduledDate = Boolean(manualActivity.scheduledDate);
        const hasRepeatRule = Boolean(manualActivity.repeatRule);
        const hasEstimate = manualActivity.estimateMinutes != null;

        const isTriviallyEmpty =
          !hasTitle &&
          !hasNotes &&
          !hasSteps &&
          !hasReminder &&
          !hasScheduledDate &&
          !hasRepeatRule &&
          !hasEstimate;

        if (isTriviallyEmpty) {
          removeActivity(manualActivity.id);
        }
      }

      setActiveTab('ai');
      setManualActivityId(null);
    }
  }, [visible, manualActivityId, manualActivity, removeActivity]);

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

  const handleSwitchToManual = React.useCallback(() => {
    setActiveTab('manual');
  }, []);

  const handleUpdateManualSteps = React.useCallback(
    (updater: (steps: ActivityStep[]) => ActivityStep[]) => {
      if (!manualActivity) return;
      const timestamp = new Date().toISOString();
      updateActivity(manualActivity.id, (prev) => {
        const currentSteps = prev.steps ?? [];
        const nextSteps = updater(currentSteps);
        return {
          ...prev,
          steps: nextSteps,
          updatedAt: timestamp,
        };
      });
    },
    [manualActivity, updateActivity],
  );

  const handleAddManualStep = React.useCallback(() => {
    if (!manualActivity) return;
    handleUpdateManualSteps((steps) => {
      const nextIndex = steps.length;
      const newStep: ActivityStep = {
        id: `step-${manualActivity.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        completedAt: null,
        isOptional: false,
        orderIndex: nextIndex,
      };
      return [...steps, newStep];
    });
  }, [handleUpdateManualSteps, manualActivity]);

  const beginAddManualStepInline = React.useCallback(() => {
    setIsAddingStepInline(true);
    setNewStepTitle('');
    requestAnimationFrame(() => {
      newStepInputRef.current?.focus();
    });
  }, []);

  const commitManualInlineStep = React.useCallback(() => {
    if (!manualActivity) {
      setIsAddingStepInline(false);
      setNewStepTitle('');
      return;
    }

    const trimmed = newStepTitle.trim();
    if (!trimmed) {
      setIsAddingStepInline(false);
      setNewStepTitle('');
      return;
    }

    handleUpdateManualSteps((steps) => {
      const nextIndex = steps.length;
      const newStep: ActivityStep = {
        id: `step-${manualActivity.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmed,
        completedAt: null,
        isOptional: false,
        orderIndex: nextIndex,
      };
      return [...steps, newStep];
    });
    setIsAddingStepInline(false);
    setNewStepTitle('');
  }, [handleUpdateManualSteps, manualActivity, newStepTitle]);

  const handleChangeManualStepTitle = React.useCallback(
    (stepId: string, title: string) => {
      handleUpdateManualSteps((steps) =>
        steps.map((step) => (step.id === stepId ? { ...step, title } : step)),
      );
    },
    [handleUpdateManualSteps],
  );

  const handleToggleManualStepOptional = React.useCallback(
    (stepId: string) => {
      handleUpdateManualSteps((steps) =>
        steps.map((step) =>
          step.id === stepId ? { ...step, isOptional: !step.isOptional } : step,
        ),
      );
    },
    [handleUpdateManualSteps],
  );

  const handleRemoveManualStep = React.useCallback(
    (stepId: string) => {
      handleUpdateManualSteps((steps) => steps.filter((step) => step.id !== stepId));
    },
    [handleUpdateManualSteps],
  );

  const handleSelectManualReminder = React.useCallback(
    (offsetDays: number) => {
      if (!manualActivity) return;
      const date = new Date();
      date.setDate(date.getDate() + offsetDays);
      date.setHours(9, 0, 0, 0);
      const timestamp = new Date().toISOString();
      updateActivity(manualActivity.id, (prev) => ({
        ...prev,
        reminderAt: date.toISOString(),
        updatedAt: timestamp,
      }));
      setReminderSheetVisible(false);
    },
    [manualActivity, updateActivity],
  );

  const handleSelectManualDueDate = React.useCallback(
    (offsetDays: number) => {
      if (!manualActivity) return;
      const date = new Date();
      date.setDate(date.getDate() + offsetDays);
      date.setHours(23, 0, 0, 0);
      const timestamp = new Date().toISOString();
      updateActivity(manualActivity.id, (prev) => ({
        ...prev,
        scheduledDate: date.toISOString(),
        updatedAt: timestamp,
      }));
      setDueDateSheetVisible(false);
    },
    [manualActivity, updateActivity],
  );

  const handleClearManualDueDate = React.useCallback(() => {
    if (!manualActivity) return;
    const timestamp = new Date().toISOString();
    updateActivity(manualActivity.id, (prev) => ({
      ...prev,
      scheduledDate: null,
      updatedAt: timestamp,
    }));
    setDueDateSheetVisible(false);
    setIsDueDatePickerVisible(false);
  }, [manualActivity, updateActivity]);

  const getInitialManualDueDateForPicker = React.useCallback(() => {
    if (manualActivity?.scheduledDate) {
      const parsed = new Date(manualActivity.scheduledDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }, [manualActivity?.scheduledDate]);

  const handleManualDueDateChange = React.useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS !== 'ios') {
        setIsDueDatePickerVisible(false);
      }

      if (!manualActivity) return;
      if (!date || event.type === 'dismissed') {
        return;
      }

      const next = new Date(date);
      next.setHours(23, 0, 0, 0);

      const timestamp = new Date().toISOString();
      updateActivity(manualActivity.id, (prev) => ({
        ...prev,
        scheduledDate: next.toISOString(),
        updatedAt: timestamp,
      }));
      setDueDateSheetVisible(false);
    },
    [manualActivity, updateActivity],
  );

  const handleSelectManualRepeat = React.useCallback(
    (rule: NonNullable<Activity['repeatRule']>) => {
      if (!manualActivity) return;
      const timestamp = new Date().toISOString();
      updateActivity(manualActivity.id, (prev) => ({
        ...prev,
        repeatRule: rule,
        updatedAt: timestamp,
      }));
      setRepeatSheetVisible(false);
    },
    [manualActivity, updateActivity],
  );

  const reminderLabel = React.useMemo(() => {
    if (!manualActivity?.reminderAt) return 'None';
    const date = new Date(manualActivity.reminderAt);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [manualActivity?.reminderAt]);

  const dueDateLabel = React.useMemo(() => {
    if (!manualActivity?.scheduledDate) return 'None';
    const date = new Date(manualActivity.scheduledDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [manualActivity?.scheduledDate]);

  const repeatLabel = React.useMemo(() => {
    if (!manualActivity?.repeatRule) return 'Off';
    return manualActivity.repeatRule === 'weekdays'
      ? 'Weekdays'
      : manualActivity.repeatRule.charAt(0).toUpperCase() +
          manualActivity.repeatRule.slice(1);
  }, [manualActivity?.repeatRule]);

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
    return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min`;
  };

  const {
    timeEstimateLabel,
    timeEstimateIsAi,
    difficultyLabel,
    difficultyIsAi,
  } = React.useMemo(() => {
    if (!manualActivity) {
      return {
        timeEstimateLabel: 'Add a rough time estimate',
        timeEstimateIsAi: false,
        difficultyLabel: 'Optional: how heavy does this feel?',
        difficultyIsAi: false,
      };
    }

    const manualMinutes = manualActivity.estimateMinutes ?? null;
    const aiMinutes = manualActivity.aiPlanning?.estimateMinutes ?? null;

    const pickMinutes = () => {
      if (manualMinutes != null) {
        return {
          label: formatMinutes(manualMinutes),
          isAi: false,
        };
      }
      if (aiMinutes != null) {
        return {
          label: `${formatMinutes(aiMinutes)} · AI suggestion`,
          isAi: true,
        };
      }
      return {
        label: 'Add a rough time estimate',
        isAi: false,
      };
    };

    const manualDifficulty = manualActivity.difficulty ?? null;
    const aiDifficulty = manualActivity.aiPlanning?.difficulty ?? null;

    const formatDifficulty = (value: string) => {
      switch (value) {
        case 'very_easy':
          return 'Very easy';
        case 'easy':
          return 'Easy';
        case 'medium':
          return 'Medium';
        case 'hard':
          return 'Hard';
        case 'very_hard':
          return 'Very hard';
        default:
          return value;
      }
    };

    const pickDifficulty = () => {
      if (manualDifficulty) {
        return {
          label: formatDifficulty(manualDifficulty),
          isAi: false,
        };
      }
      if (aiDifficulty) {
        return {
          label: `${formatDifficulty(aiDifficulty)} · AI suggestion`,
          isAi: true,
        };
      }
      return {
        label: 'Optional: how heavy does this feel?',
        isAi: false,
      };
    };

    const minutes = pickMinutes();
    const difficulty = pickDifficulty();

    return {
      timeEstimateLabel: minutes.label,
      timeEstimateIsAi: minutes.isAi,
      difficultyLabel: difficulty.label,
      difficultyIsAi: difficulty.isAi,
    };
  }, [manualActivity]);

  const handleConfirmManualActivity = React.useCallback(() => {
    if (!manualActivity) return;
    const trimmedTitle = manualActivity.title.trim();
    const timestamp = new Date().toISOString();
    updateActivity(manualActivity.id, (prev) => ({
      ...prev,
      title: trimmedTitle || 'Untitled activity',
      updatedAt: timestamp,
    }));
    onClose();
  }, [manualActivity, onClose, updateActivity]);

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
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['100%']}>
      <View style={styles.activityCoachContainer}>
        <AgentModeHeader
          activeMode={activeTab}
          onChangeMode={setActiveTab}
          objectLabel="Activities"
          onPressInfo={() => setIsActivityAiInfoVisible(true)}
          infoAccessibilityLabel="Show context for Activities AI"
        />
        <Dialog
          visible={isActivityAiInfoVisible}
          onClose={() => setIsActivityAiInfoVisible(false)}
          title="Activities AI context"
          description="Activities AI proposes concrete activities using your existing goals and plans as context."
        >
          <Text style={styles.modalBody}>
            I’m using your existing goals and activities to keep suggestions realistic, aligned,
            and non-duplicative.
          </Text>
        </Dialog>
        {/* Keep both panes mounted so switching between AI and Manual preserves the AI thread state. */}
        <View
          style={[
            styles.activityCoachBody,
            activeTab !== 'ai' && { display: 'none' },
          ]}
        >
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
            onDismiss={onClose}
          />
        </View>

        <KeyboardAvoidingView
          style={[
            styles.activityCoachBody,
            activeTab !== 'manual' && { display: 'none' },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.manualFormContainer}
            contentContainerStyle={{ paddingBottom: spacing['2xl'], gap: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card padding="sm" style={{ width: '100%' }}>
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
              <View>
                <HStack alignItems="center" style={styles.sectionLabelRow}>
                  <Text style={styles.inputLabel}>STEPS</Text>
                </HStack>
                <View style={styles.rowsCard}>
                  {(manualActivity?.steps?.length ?? 0) === 0 ? (
                    <Text style={styles.stepsEmpty}>
                      Add 2–6 small steps so this activity is crystal clear.
                    </Text>
                  ) : (
                    <VStack space="xs">
                      {manualActivity?.steps?.map((step) => (
                        <HStack
                          key={step.id}
                          space="xs"
                          alignItems="center"
                          style={styles.stepRow}
                        >
                          <View
                            style={[
                              styles.checkboxBase,
                              styles.checkboxPlanned,
                              styles.stepCheckbox,
                            ]}
                          />
                          <TextInput
                            style={styles.stepInput}
                            value={step.title}
                            onChangeText={(text) => handleChangeManualStepTitle(step.id, text)}
                            placeholder="Describe the step"
                            placeholderTextColor={colors.muted}
                            multiline
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            iconButtonSize={24}
                            onPress={() => handleRemoveManualStep(step.id)}
                            accessibilityLabel="Remove step"
                            style={styles.removeStepButton}
                          >
                            <Icon name="close" size={14} color={colors.textSecondary} />
                          </Button>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                  <View style={styles.addStepInlineRow}>
                    {isAddingStepInline ? (
                      <HStack space="xs" alignItems="center" style={styles.stepRow}>
                        <View
                          style={[
                            styles.checkboxBase,
                            styles.checkboxPlanned,
                            styles.stepCheckbox,
                          ]}
                        />
                        <TextInput
                          ref={newStepInputRef}
                          style={styles.stepInput}
                          value={newStepTitle}
                          onChangeText={setNewStepTitle}
                          placeholder="Add step"
                          placeholderTextColor={colors.muted}
                          multiline
                          returnKeyType="done"
                          blurOnSubmit
                          onSubmitEditing={commitManualInlineStep}
                          onBlur={commitManualInlineStep}
                        />
                      </HStack>
                    ) : (
                      <Pressable
                        onPress={beginAddManualStepInline}
                        accessibilityRole="button"
                        accessibilityLabel="Add a step to this activity"
                      >
                        <HStack space="xs" alignItems="center">
                          <Icon name="plus" size={16} color={colors.primary} />
                          <Text style={styles.addStepInlineText}>Add step</Text>
                        </HStack>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              <View>
                <View style={styles.rowsCard}>
                  <VStack space="xs">
                    <VStack space="sm">
                      <Pressable
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        onPress={() => setReminderSheetVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Edit reminder"
                      >
                        <HStack space="sm" alignItems="center" style={styles.rowContent}>
                          <Icon name="daily" size={16} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.rowValue,
                              reminderLabel !== 'None' && styles.rowLabelActive,
                            ]}
                          >
                            {reminderLabel === 'None' ? 'Add reminder' : reminderLabel}
                          </Text>
                        </HStack>
                      </Pressable>
                    </VStack>

                    <VStack space="sm">
                      <Pressable
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        onPress={() => setDueDateSheetVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Edit due date"
                      >
                        <HStack
                          space="sm"
                          alignItems="center"
                          justifyContent="space-between"
                          style={styles.rowContent}
                        >
                          <HStack space="sm" alignItems="center" flex={1}>
                            <Icon name="today" size={16} color={colors.textSecondary} />
                            <Text
                              style={[
                                styles.rowValue,
                                manualActivity?.scheduledDate && styles.rowLabelActive,
                              ]}
                            >
                              {manualActivity?.scheduledDate ? dueDateLabel : 'Add due date'}
                            </Text>
                          </HStack>
                          {manualActivity?.scheduledDate ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearManualDueDate();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Clear due date"
                              hitSlop={8}
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </Pressable>
                          ) : null}
                        </HStack>
                      </Pressable>
                    </VStack>

                    <VStack space="sm">
                      <Pressable
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        onPress={() => setRepeatSheetVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Edit repeat schedule"
                      >
                        <HStack space="sm" alignItems="center" style={styles.rowContent}>
                          <Icon name="refresh" size={16} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.rowValue,
                              repeatLabel !== 'Off' && styles.rowLabelActive,
                            ]}
                          >
                            {repeatLabel === 'Off' ? 'Off' : repeatLabel}
                          </Text>
                        </HStack>
                      </Pressable>
                    </VStack>
                  </VStack>
                </View>
              </View>

              <View>
                <View style={styles.rowsCard}>
                  <VStack space="xs">
                    <Text style={styles.planningHeader}>Planning</Text>
                    <View style={styles.row}>
                      <HStack space="sm" alignItems="center" style={styles.rowContent}>
                        <Icon name="time" size={16} color={colors.textSecondary} />
                        <Text style={styles.rowLabel}>Time estimate</Text>
                      </HStack>
                      <View style={styles.rowRight}>
                        <Text
                          style={[
                            styles.rowValue,
                            timeEstimateIsAi && styles.rowValueAi,
                          ]}
                          numberOfLines={1}
                        >
                          {timeEstimateLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <HStack space="sm" alignItems="center" style={styles.rowContent}>
                        <Icon name="signal" size={16} color={colors.textSecondary} />
                        <Text style={styles.rowLabel}>Difficulty</Text>
                      </HStack>
                      <View style={styles.rowRight}>
                        <Text
                          style={[
                            styles.rowValue,
                            difficultyIsAi && styles.rowValueAi,
                          ]}
                          numberOfLines={1}
                        >
                          {difficultyLabel}
                        </Text>
                      </View>
                    </View>
                  </VStack>
                </View>
              </View>

              <Button
                onPress={handleConfirmManualActivity}
                disabled={!manualActivity || !manualActivity.title.trim()}
              >
                <Text>Add activity</Text>
              </Button>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      {activeTab === 'manual' && (
        <>
          <BottomDrawer
            visible={reminderSheetVisible}
            onClose={() => setReminderSheetVisible(false)}
            snapPoints={['40%']}
            presentation="inline"
            hideBackdrop
          >
            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Remind me</Text>
              <VStack space="sm">
                <SheetOption label="Later Today" onPress={() => handleSelectManualReminder(0)} />
                <SheetOption label="Tomorrow" onPress={() => handleSelectManualReminder(1)} />
                <SheetOption label="Next Week" onPress={() => handleSelectManualReminder(7)} />
              </VStack>
            </View>
          </BottomDrawer>

          <BottomDrawer
            visible={dueDateSheetVisible}
            onClose={() => {
              setDueDateSheetVisible(false);
              setIsDueDatePickerVisible(false);
            }}
            snapPoints={['40%']}
            presentation="inline"
            hideBackdrop
          >
            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Due</Text>
              <VStack space="sm">
                <SheetOption label="Today" onPress={() => handleSelectManualDueDate(0)} />
                <SheetOption label="Tomorrow" onPress={() => handleSelectManualDueDate(1)} />
                <SheetOption label="Next Week" onPress={() => handleSelectManualDueDate(7)} />
                <SheetOption
                  label="Pick a date…"
                  onPress={() => setIsDueDatePickerVisible(true)}
                />
                <SheetOption label="Clear due date" onPress={handleClearManualDueDate} />
              </VStack>
              {isDueDatePickerVisible && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    value={getInitialManualDueDateForPicker()}
                    onChange={handleManualDueDateChange}
                  />
                </View>
              )}
            </View>
          </BottomDrawer>

          <BottomDrawer
            visible={repeatSheetVisible}
            onClose={() => setRepeatSheetVisible(false)}
            snapPoints={['45%']}
            presentation="inline"
            hideBackdrop
          >
            <View style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Repeat</Text>
              <VStack space="sm">
                <SheetOption label="Daily" onPress={() => handleSelectManualRepeat('daily')} />
                <SheetOption label="Weekly" onPress={() => handleSelectManualRepeat('weekly')} />
                <SheetOption
                  label="Weekdays"
                  onPress={() => handleSelectManualRepeat('weekdays')}
                />
                <SheetOption label="Monthly" onPress={() => handleSelectManualRepeat('monthly')} />
                <SheetOption label="Yearly" onPress={() => handleSelectManualRepeat('yearly')} />
              </VStack>
            </View>
          </BottomDrawer>
        </>
      )}
    </BottomDrawer>
  );
}

type SheetOptionProps = {
  label: string;
  onPress: () => void;
};

function SheetOption({ label, onPress }: SheetOptionProps) {
  return (
    <Pressable style={styles.sheetRow} onPress={onPress}>
      <Text style={styles.sheetRowLabel}>{label}</Text>
    </Pressable>
  );
}

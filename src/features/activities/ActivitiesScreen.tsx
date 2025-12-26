import React from 'react';
import { DrawerActions, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  FlatList,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { CanvasFlatListWithRef } from '../../ui/layout/CanvasFlatList';
import type {
  ActivitiesStackParamList,
  RootDrawerParamList,
} from '../../navigation/RootNavigator';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import {
  VStack,
  Heading,
  Text,
  HStack,
  Input,
  Textarea,
  ButtonLabel,
  Card,
  EmptyState,
  KeyboardAwareScrollView,
} from '../../ui/primitives';
import { useAppStore, defaultForceLevels } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useToastStore } from '../../store/useToastStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { enrichActivityWithAI, sendCoachChat, type CoachChatTurn } from '../../services/ai';
import { HapticsService } from '../../services/HapticsService';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { colors, spacing, typography } from '../../theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomGuide } from '../../ui/BottomGuide';
import { Coachmark } from '../../ui/Coachmark';
import { useCoachmarkHost } from '../../ui/hooks/useCoachmarkHost';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { useQuickAddDockController } from './useQuickAddDockController';
import { ACTIVITY_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { buildActivityCoachLaunchContext, buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { ActivityDraftDetailFields, type ActivityDraft } from './ActivityDraftDetailFields';
import type {
  Activity,
  ActivityDifficulty,
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
import { QuickAddDock } from './QuickAddDock';
import { formatTags, parseTags, suggestTagsFromText } from '../../utils/tags';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import { OpportunityCard } from '../../ui/OpportunityCard';
import { suggestActivityTagsWithAi } from '../../services/ai';
import { openPaywallInterstitial, openPaywallPurchaseEntry } from '../../services/paywall';
import { getSuggestedNextStep, hasAnyActivitiesScheduledForToday } from '../../services/recommendations/nextStep';
import { PaywallContent } from '../paywall/PaywallDrawer';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';

type ViewMenuItemProps = {
  view: ActivityView;
  onApplyView: (viewId: string) => void;
  onOpenViewSettings: (view: ActivityView) => void;
};

function ViewMenuItem({ view, onApplyView, onOpenViewSettings }: ViewMenuItemProps) {
  const iconPressedRef = React.useRef(false);

  return (
    <DropdownMenuItem
      onPress={() => {
        if (!iconPressedRef.current) {
          onApplyView(view.id);
        }
        iconPressedRef.current = false;
      }}
    >
      <HStack alignItems="center" justifyContent="space-between" space="sm" flex={1}>
        <Text style={styles.menuItemText}>{view.name}</Text>
        <Pressable
          onPress={() => {
            iconPressedRef.current = true;
            onOpenViewSettings(view);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="more" size={16} color={colors.textSecondary} />
        </Pressable>
      </HStack>
    </DropdownMenuItem>
  );
}

type CompletedActivitySectionProps = {
  activities: Activity[];
  goalTitleById: Record<string, string>;
  onToggleComplete: (activityId: string) => void;
  onTogglePriority: (activityId: string) => void;
  onPressActivity: (activityId: string) => void;
  isMetaLoading?: (activityId: string) => boolean;
};

function CompletedActivitySection({
  activities,
  goalTitleById,
  onToggleComplete,
  onTogglePriority,
  onPressActivity,
  isMetaLoading,
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
            const { meta, metaLeadingIconName } = buildActivityListMeta({ activity, goalTitle });
            const metaLoading = Boolean(isMetaLoading?.(activity.id)) && !meta;

            return (
              <ActivityListItem
                key={activity.id}
                title={activity.title}
                meta={meta}
                metaLeadingIconName={metaLeadingIconName}
                metaLoading={metaLoading}
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
  const route = useRoute<RouteProp<ActivitiesStackParamList, 'ActivitiesList'>>();
  const insets = useSafeAreaInsets();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const { capture } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);

  const arcs = useAppStore((state) => state.arcs);
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const tryConsumeGenerativeCredit = useAppStore((state) => state.tryConsumeGenerativeCredit);
  const isPro = useEntitlementsStore((state) => state.isPro);
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
  const quickAddFocusedRef = React.useRef(false);
  const quickAddLastFocusAtRef = React.useRef<number>(0);
  const [isQuickAddAiGenerating, setIsQuickAddAiGenerating] = React.useState(false);
  const [hasQuickAddAiGenerated, setHasQuickAddAiGenerated] = React.useState(false);
  const lastQuickAddAiTitleRef = React.useRef<string | null>(null);
  // Credits warning toast is now handled centrally in `tryConsumeGenerativeCredit`.
  const [enrichingActivityIds, setEnrichingActivityIds] = React.useState<Set<string>>(() => new Set());
  const enrichingActivityIdsRef = React.useRef<Set<string>>(new Set());

  const suggestedCardYRef = React.useRef<number | null>(null);
  const [highlightSuggested, setHighlightSuggested] = React.useState<boolean>(
    Boolean(route.params?.highlightSuggested),
  );
  const [quickAddInfoVisible, setQuickAddInfoVisible] = React.useState(false);

  React.useEffect(() => {
    if (route.params?.highlightSuggested) {
      setHighlightSuggested(true);
    }
  }, [route.params?.highlightSuggested]);

  const suggested = React.useMemo(() => {
    return getSuggestedNextStep({
      arcs,
      goals,
      activities,
      now: new Date(),
    });
  }, [activities, arcs, goals]);

  const suggestedActivity = React.useMemo(() => {
    if (!suggested || suggested.kind !== 'activity') return null;
    return activities.find((a) => a.id === suggested.activityId) ?? null;
  }, [activities, suggested]);

  const suggestedActivityGoalTitle = React.useMemo(() => {
    if (!suggestedActivity?.goalId) return null;
    return goals.find((g) => g.id === suggestedActivity.goalId)?.title ?? null;
  }, [goals, suggestedActivity?.goalId]);

  const suggestedCardTitle = React.useMemo(() => {
    return suggestedActivity ? suggestedActivity.title : null;
  }, [suggestedActivity]);

  const suggestedCardBody = React.useMemo(() => {
    if (suggested?.kind === 'setup') {
      return suggested.reason === 'no_goals'
        ? 'Create your first Goal so Kwilt can help you stay consistent.'
        : 'Add one Activity so you can build momentum today.';
    }

    return 'Here’s a tiny step you can complete today.';
  }, [suggested, suggestedActivity, suggestedActivityGoalTitle]);

  const suggestedActivityMeta = React.useMemo(() => {
    if (!suggestedActivity) return { meta: undefined, metaLeadingIconName: undefined };
    return buildActivityListMeta({
      activity: suggestedActivity,
      goalTitle: suggestedActivityGoalTitle ?? undefined,
    });
  }, [suggestedActivity, suggestedActivityGoalTitle]);

  const handleAcceptSuggested = React.useCallback(() => {
    if (!suggested || suggested.kind !== 'activity' || !suggestedActivity) {
      // Fallback to prior behavior for setup / null cases.
      if (!suggested) {
        setActivityCoachVisible(true);
        return;
      }
      if (suggested.kind === 'setup') {
        if (suggested.reason === 'no_goals') {
          navigation.navigate('Goals', { screen: 'GoalsList' });
          return;
        }
        setActivityCoachVisible(true);
        return;
      }
      return;
    }

    const timestamp = new Date().toISOString();
    const scheduled = new Date();
    scheduled.setHours(9, 0, 0, 0);

    updateActivity(suggestedActivity.id, (prev) => ({
      ...prev,
      scheduledDate: scheduled.toISOString(),
      updatedAt: timestamp,
    }));
    void HapticsService.trigger('canvas.primary.confirm');
    showToast({ message: 'Added to Today', variant: 'success', durationMs: 2200 });
    setHighlightSuggested(false);
  }, [navigation, setActivityCoachVisible, showToast, suggested, suggestedActivity, updateActivity]);

  const shouldShowSuggestedCard = React.useMemo(() => {
    if (highlightSuggested) return true;
    if (!suggested) return false;
    // Only surface deterministic suggestions on "empty today" days to avoid noise.
    return !hasAnyActivitiesScheduledForToday({ activities, now: new Date() });
  }, [activities, highlightSuggested, suggested]);

  // Post-create "add a trigger" nudge (Option A): encourage a lightweight if/then
  // trigger after quick-add activity creation without forcing navigation.
  const [postCreateTriggerActivityId, setPostCreateTriggerActivityId] = React.useState<string | null>(null);
  const [triggerGuideVisible, setTriggerGuideVisible] = React.useState(false);
  const [triggerPickerVisible, setTriggerPickerVisible] = React.useState(false);
  const [triggerPickerActivityId, setTriggerPickerActivityId] = React.useState<string | null>(null);
  const [isTriggerDateTimePickerVisible, setIsTriggerDateTimePickerVisible] = React.useState(false);

  React.useEffect(() => {
    enrichingActivityIdsRef.current = enrichingActivityIds;
  }, [enrichingActivityIds]);

  const markActivityEnrichment = React.useCallback((activityId: string, isEnriching: boolean) => {
    setEnrichingActivityIds((prev) => {
      const next = new Set(prev);
      if (isEnriching) next.add(activityId);
      else next.delete(activityId);
      return next;
    });
  }, []);

  const isActivityEnriching = React.useCallback((activityId: string) => {
    return enrichingActivityIdsRef.current.has(activityId);
  }, []);

  const quickAddBottomPadding = Math.max(insets.bottom, spacing.sm);
  const quickAddInitialReservedHeight = QUICK_ADD_BAR_HEIGHT + quickAddBottomPadding + 4;

  const {
    value: quickAddTitle,
    setValue: setQuickAddTitle,
    inputRef: quickAddInputRef,
    isFocused: isQuickAddFocused,
    setIsFocused: setQuickAddFocusedBase,
    reservedHeight: quickAddReservedHeight,
    setReservedHeight: setQuickAddReservedHeight,
    reminderAt: quickAddReminderAt,
    setReminderAt: setQuickAddReminderAt,
    scheduledDate: quickAddScheduledDate,
    setScheduledDate: setQuickAddScheduledDate,
    repeatRule: quickAddRepeatRule,
    setRepeatRule: setQuickAddRepeatRule,
    estimateMinutes: quickAddEstimateMinutes,
    setEstimateMinutes: setQuickAddEstimateMinutes,
    collapse: collapseQuickAdd,
    openToolDrawer: openQuickAddToolDrawer,
    closeToolDrawer: closeQuickAddToolDrawer,
    submit: handleQuickAddActivity,
  } = useQuickAddDockController({
    goalId: null,
    activitiesCount: activities.length,
    addActivity,
    updateActivity,
    recordShowUp,
    showToast,
    initialReservedHeightPx: quickAddInitialReservedHeight,
    onCreated: (activity) => {
      pendingScrollToActivityIdRef.current = activity.id;
      // If the user didn't add any scheduling/reminder info during quick-add,
      // queue a gentle "add a trigger" guide for when the dock is collapsed.
      const hasTrigger =
        Boolean(activity.reminderAt) || Boolean(activity.scheduledDate) || Boolean(activity.repeatRule);
      if (!hasTrigger && !triggerGuideVisible && !triggerPickerVisible) {
        setPostCreateTriggerActivityId(activity.id);
      }
      capture(AnalyticsEvent.ActivityCreated, {
        source: 'quick_add',
        activity_id: activity.id,
        goal_id: null,
        has_due_date: Boolean(activity.scheduledDate),
        has_reminder: Boolean(activity.reminderAt),
        has_estimate: Boolean(activity.estimateMinutes),
      });
      setHasQuickAddAiGenerated(false);
      lastQuickAddAiTitleRef.current = null;
    },
    enrichActivityWithAI,
    markActivityEnrichment,
  });

  const setQuickAddFocused = React.useCallback(
    (next: boolean) => {
      if (next) {
        quickAddLastFocusAtRef.current = Date.now();
      }
      setQuickAddFocusedBase(next);
    },
    [setQuickAddFocusedBase],
  );

  React.useEffect(() => {
    quickAddFocusedRef.current = isQuickAddFocused;
  }, [isQuickAddFocused]);

  const [quickAddReminderSheetVisible, setQuickAddReminderSheetVisible] = React.useState(false);
  const [quickAddDueDateSheetVisible, setQuickAddDueDateSheetVisible] = React.useState(false);
  const [quickAddRepeatSheetVisible, setQuickAddRepeatSheetVisible] = React.useState(false);
  const [quickAddEstimateSheetVisible, setQuickAddEstimateSheetVisible] = React.useState(false);
  const [quickAddIsDueDatePickerVisible, setQuickAddIsDueDatePickerVisible] = React.useState(false);
  const canvasScrollRef = React.useRef<FlatList<Activity> | null>(null);
  const pendingScrollToActivityIdRef = React.useRef<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(320);

  React.useEffect(() => {
    if (!highlightSuggested) return;
    const y = suggestedCardYRef.current;
    if (typeof y !== 'number') return;
    canvasScrollRef.current?.scrollToOffset({ offset: Math.max(0, y - spacing.lg), animated: true });
    const t = setTimeout(() => setHighlightSuggested(false), 2400);
    return () => clearTimeout(t);
  }, [highlightSuggested]);

  React.useEffect(() => {
    const setTo = (next: number) => {
      setKeyboardHeight(next);
      if (next > 0) lastKnownKeyboardHeightRef.current = next;
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const frameEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : null;

    const onShow = (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      setTo(next);
    };
    const onHide = () => setTo(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    const frameSub = frameEvent ? Keyboard.addListener(frameEvent, onShow) : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, []);

  const guideVariant = activities.length > 0 ? 'full' : 'empty';
  const guideTotalSteps = guideVariant === 'full' ? 3 : 1;
  const shouldShowActivitiesListGuide =
    isFocused && !hasDismissedActivitiesListGuide && !activityCoachVisible && !viewEditorVisible;

  const dismissActivitiesListGuide = React.useCallback(() => {
    setHasDismissedActivitiesListGuide(true);
    setActivitiesGuideStep(0);
  }, [setHasDismissedActivitiesListGuide]);

  const activitiesGuideHost = useCoachmarkHost({
    active: shouldShowActivitiesListGuide,
    stepKey: activitiesGuideStep,
  });

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

  const buildQuickAddHeuristicPlan = React.useCallback(
    (id: string, title: string, timestamp: string) => {
      const lower = title.toLowerCase();
      const steps: ActivityStep[] = [
        { id: `step-${id}-0`, title: 'Prep the workspace', orderIndex: 0, completedAt: null },
        { id: `step-${id}-1`, title: 'Do the main work', orderIndex: 1, completedAt: null },
        { id: `step-${id}-2`, title: 'Clean up + reset', orderIndex: 2, completedAt: null },
      ];

      const estimateMinutes =
        /(install|replace|repair|fix)\b/.test(lower)
          ? 45
          : /(call|email|book|schedule)\b/.test(lower)
            ? 15
            : 25;
      const difficulty: ActivityDifficulty =
        /(repair|fix|install)\b/.test(lower) ? 'medium' : /(exercise|workout|run)\b/.test(lower) ? 'hard' : 'easy';

      return {
        steps,
        aiPlanning: {
          estimateMinutes,
          difficulty,
          confidence: 0.4,
          lastUpdatedAt: timestamp,
          source: 'quick_suggest' as const,
        },
      };
    },
    [],
  );

  // QuickAdd dock state + create handler are centralized in `useQuickAddDockController`
  // so Goal:Plan and Activities list stay in sync without duplicating behavior.

  const normalizeQuickAddAiTitle = React.useCallback((raw: string): string | null => {
    const firstLine = (raw ?? '')
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!firstLine) return null;

    let title = firstLine;
    title = title.replace(/^[\-\*\d]+[.)\s-]+/, '').trim();
    title = title.replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim();
    title = title.replace(/[.!?]+$/, '').trim();
    if (!title) return null;
    if (title.length > 80) title = `${title.slice(0, 80).trim()}`;
    return title.length > 0 ? title : null;
  }, []);

  const handleGenerateQuickAddActivityTitle = React.useCallback(async () => {
    if (isQuickAddAiGenerating) return;
    setIsQuickAddAiGenerating(true);

    try {
      const arcSnapshot = buildArcCoachLaunchContext(arcs, goals);
      const activitySnapshot = buildActivityCoachLaunchContext(
        goals,
        activities,
        undefined,
        arcs,
        undefined,
        activityTagHistory
      );
      const combinedSnapshot = [arcSnapshot, activitySnapshot].filter(Boolean).join('\n\n').trim();
      const snapshot = combinedSnapshot.length > 8000 ? `${combinedSnapshot.slice(0, 7999)}…` : combinedSnapshot;

      const launchContextSummary = [
        'Launch source: activities_quick_add_toolbar',
        'Intent: generate a single new Activity title to prefill the quick-add input.',
        'Constraints: Output ONLY the Activity title as plain text on a single line. No quotes. No bullets. No numbering. No trailing punctuation.',
        snapshot ? `\n${snapshot}` : '',
      ].join('\n');

      const turns: CoachChatTurn[] = [
        {
          role: 'system',
          content:
            'You are generating a single Activity title for the user.\n' +
            '- Output MUST be exactly one line: the title only.\n' +
            '- Keep it concrete and action-oriented (3–10 words).\n' +
            '- Choose the SINGLE highest-value activity the user can realistically do next.\n' +
            '- It MUST NOT duplicate or near-duplicate any existing activity title from the workspace snapshot (case-insensitive; ignore punctuation; avoid minor rewordings like swapping synonyms).\n' +
            '- Prefer high-leverage activities that unblock progress across the user’s current Arcs/Goals or create a clear next step.\n' +
            '- Do not include any explanation.',
        },
        {
          role: 'user',
          content:
            'Suggest one new, highest-value activity that fits the user’s current arcs and goals, complements existing activities, and is not already in their activity list.',
        },
      ];

      const reply = await sendCoachChat(turns, {
        launchContextSummary,
        paywallSource: 'activity_quick_add_ai',
      });
      const title = normalizeQuickAddAiTitle(reply);
      if (!title) return;

      setQuickAddTitle(title);
      setHasQuickAddAiGenerated(true);
      lastQuickAddAiTitleRef.current = title;
      if (!quickAddFocusedRef.current) {
        setQuickAddFocused(true);
      }
      requestAnimationFrame(() => {
        quickAddInputRef.current?.focus();
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[ActivitiesScreen] Failed to generate quick-add activity title:', err);
      }
    } finally {
      setIsQuickAddAiGenerating(false);
    }
  }, [
    activities,
    arcs,
    goals,
    isQuickAddAiGenerating,
    normalizeQuickAddAiTitle,
    setQuickAddTitle,
  ]);

  const handleQuickAddChangeText = React.useCallback(
    (next: string) => {
      setQuickAddTitle(next);
      const lastAi = lastQuickAddAiTitleRef.current;
      if (hasQuickAddAiGenerated && lastAi && next !== lastAi) {
        setHasQuickAddAiGenerated(false);
        lastQuickAddAiTitleRef.current = null;
      }
    },
    [hasQuickAddAiGenerated],
  );

  // NOTE: We intentionally avoid blurring the quick-add input on keyboard hide.
  // On iOS, keyboard show/hide transitions can fire events that cause a just-focused
  // TextInput to immediately blur, making the quick-add dock feel “broken”.

  // handleQuickAddActivity is provided by `useQuickAddDockController`.

  // Show the post-create trigger guide once the quick-add dock is collapsed, so it
  // doesn't compete with rapid entry (keyboard-open flow).
  React.useEffect(() => {
    if (triggerGuideVisible || triggerPickerVisible) return;
    if (isQuickAddFocused) return;
    if (activityCoachVisible || viewEditorVisible) return;
    const pendingId = postCreateTriggerActivityId;
    if (!pendingId) return;
    // Ensure the activity still exists (it might have been deleted).
    if (!activities.some((a) => a.id === pendingId)) {
      setPostCreateTriggerActivityId(null);
      return;
    }
    setTriggerGuideVisible(true);
  }, [
    activities,
    activityCoachVisible,
    isQuickAddFocused,
    postCreateTriggerActivityId,
    triggerGuideVisible,
    triggerPickerVisible,
    viewEditorVisible,
  ]);

  const dismissTriggerGuide = React.useCallback(() => {
    setTriggerGuideVisible(false);
    setPostCreateTriggerActivityId(null);
  }, []);

  const openTriggerPickerForGuide = React.useCallback(() => {
    if (!postCreateTriggerActivityId) return;
    setTriggerGuideVisible(false);
    setTriggerPickerActivityId(postCreateTriggerActivityId);
    setTriggerPickerVisible(true);
    setIsTriggerDateTimePickerVisible(false);
    // Close keyboard/dock so the trigger picker feels like a deliberate next step.
    setQuickAddFocused(false);
  }, [postCreateTriggerActivityId, setQuickAddFocused]);

  const setTriggerReminderByOffsetDays = React.useCallback(
    (offsetDays: number, hours = 9, minutes = 0) => {
      if (!triggerPickerActivityId) return;
      const date = new Date();
      date.setDate(date.getDate() + offsetDays);
      date.setHours(hours, minutes, 0, 0);
      const timestamp = new Date().toISOString();
      updateActivity(triggerPickerActivityId, (prev) => ({
        ...prev,
        reminderAt: date.toISOString(),
        updatedAt: timestamp,
      }));
      setTriggerPickerVisible(false);
      setIsTriggerDateTimePickerVisible(false);
      setTriggerPickerActivityId(null);
      setPostCreateTriggerActivityId(null);
    },
    [triggerPickerActivityId, updateActivity],
  );

  const clearTriggerReminder = React.useCallback(() => {
    if (!triggerPickerActivityId) return;
    const timestamp = new Date().toISOString();
    updateActivity(triggerPickerActivityId, (prev) => ({
      ...prev,
      reminderAt: null,
      updatedAt: timestamp,
    }));
    setTriggerPickerVisible(false);
    setIsTriggerDateTimePickerVisible(false);
    setTriggerPickerActivityId(null);
    setPostCreateTriggerActivityId(null);
  }, [triggerPickerActivityId, updateActivity]);

  const getInitialTriggerDateTime = React.useCallback(() => {
    const base = new Date();
    base.setMinutes(0, 0, 0);
    base.setHours(base.getHours() + 1);
    return base;
  }, []);

  const handleTriggerDateTimeChange = React.useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS !== 'ios') {
        setIsTriggerDateTimePickerVisible(false);
      }
      if (!triggerPickerActivityId) return;
      if (!date || event.type === 'dismissed') {
        return;
      }
      const next = new Date(date);
      const timestamp = new Date().toISOString();
      updateActivity(triggerPickerActivityId, (prev) => ({
        ...prev,
        reminderAt: next.toISOString(),
        updatedAt: timestamp,
      }));
      setTriggerPickerVisible(false);
      setTriggerPickerActivityId(null);
      setPostCreateTriggerActivityId(null);
    },
    [triggerPickerActivityId, updateActivity],
  );

  // After creating a new activity, scroll so it becomes visible just above the dock.
  // This relies on the reserved bottom padding from `quickAddReservedHeight`.
  React.useEffect(() => {
    const pendingId = pendingScrollToActivityIdRef.current;
    if (!pendingId) return;
    if (!activeActivities.some((a) => a.id === pendingId)) return;

    pendingScrollToActivityIdRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        canvasScrollRef.current?.scrollToEnd({ animated: true });
      });
    });
  }, [activeActivities, quickAddReservedHeight]);

  // When the quick-add dock is expanded (keyboard visible), the visible dock surface
  // occludes more of the canvas than the collapsed dock height alone. Add temporary
  // extra padding so `scrollToEnd()` lands the last row above the dock/keyboard.
  const effectiveKeyboardHeight =
    keyboardHeight > 0 ? keyboardHeight : isQuickAddFocused ? lastKnownKeyboardHeightRef.current : 0;
  const scrollExtraBottomPadding = isQuickAddFocused
    ? quickAddReservedHeight + effectiveKeyboardHeight
    : quickAddReservedHeight;

  const setQuickAddDueDateByOffsetDays = React.useCallback((offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(9, 0, 0, 0);
    setQuickAddScheduledDate(date.toISOString());
    closeQuickAddToolDrawer(() => {
      setQuickAddDueDateSheetVisible(false);
      setQuickAddIsDueDatePickerVisible(false);
    });
  }, [closeQuickAddToolDrawer]);

  const clearQuickAddDueDate = React.useCallback(() => {
    setQuickAddScheduledDate(null);
    closeQuickAddToolDrawer(() => {
      setQuickAddDueDateSheetVisible(false);
      setQuickAddIsDueDatePickerVisible(false);
    });
  }, [closeQuickAddToolDrawer]);

  const setQuickAddReminderByOffsetMinutes = React.useCallback((offsetMinutes: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + offsetMinutes);
    setQuickAddReminderAt(date.toISOString());
    closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
  }, [closeQuickAddToolDrawer]);

  const clearQuickAddReminder = React.useCallback(() => {
    setQuickAddReminderAt(null);
    closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
  }, [closeQuickAddToolDrawer]);

  const handleQuickAddSelectRepeat = React.useCallback((rule: Activity['repeatRule']) => {
    setQuickAddRepeatRule(rule);
    closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false));
  }, [closeQuickAddToolDrawer]);

  const clearQuickAddRepeat = React.useCallback(() => {
    setQuickAddRepeatRule(undefined);
    closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false));
  }, [closeQuickAddToolDrawer]);

  const handleQuickAddSelectEstimate = React.useCallback((minutes: number | null) => {
    setQuickAddEstimateMinutes(minutes);
    closeQuickAddToolDrawer(() => setQuickAddEstimateSheetVisible(false));
  }, [closeQuickAddToolDrawer]);

  const getQuickAddInitialDueDateForPicker = React.useCallback(() => {
    if (quickAddScheduledDate) return new Date(quickAddScheduledDate);
    return new Date();
  }, [quickAddScheduledDate]);

  const handleQuickAddDueDateChange = React.useCallback(
    (_: DateTimePickerEvent, selected?: Date) => {
      if (!selected) return;
      const next = new Date(selected);
      next.setHours(9, 0, 0, 0);
      setQuickAddScheduledDate(next.toISOString());
      closeQuickAddToolDrawer(() => {
        setQuickAddIsDueDatePickerVisible(false);
        setQuickAddDueDateSheetVisible(false);
      });
    },
    [closeQuickAddToolDrawer],
  );

  const handleToggleComplete = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      let didFireHaptic = false;
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          220,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
      updateActivity(activityId, (activity) => {
        const nextIsDone = activity.status !== 'done';
        if (!didFireHaptic) {
          didFireHaptic = true;
          void HapticsService.trigger(nextIsDone ? 'outcome.success' : 'canvas.primary.confirm');
        }
        capture(AnalyticsEvent.ActivityCompletionToggled, {
          source: 'activities_list',
          activity_id: activityId,
          goal_id: activity.goalId ?? null,
          next_status: nextIsDone ? 'done' : 'planned',
          had_steps: Boolean(activity.steps && activity.steps.length > 0),
        });
        return {
          ...activity,
          status: nextIsDone ? 'done' : 'planned',
          completedAt: nextIsDone ? timestamp : null,
          updatedAt: timestamp,
        };
      });
    },
    [capture, updateActivity],
  );

  const handleTogglePriorityOne = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      let didFireHaptic = false;
      updateActivity(activityId, (activity) => {
        const nextPriority = activity.priority === 1 ? undefined : 1;
        if (!didFireHaptic) {
          didFireHaptic = true;
          void HapticsService.trigger(nextPriority === 1 ? 'canvas.toggle.on' : 'canvas.toggle.off');
        }
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
      // Haptic only when the view actually changes.
      if (viewId !== activeActivityViewId) {
        void HapticsService.trigger('canvas.selection');
      }
      setActiveActivityViewId(viewId);
    },
    [activeActivityViewId, setActiveActivityViewId],
  );

  const handleUpdateFilterMode = React.useCallback(
    (next: ActivityFilterMode) => {
      if (!activeView) return;
      if (next !== activeView.filterMode) {
        void HapticsService.trigger('canvas.selection');
      }
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
      if (next !== activeView.sortMode) {
        void HapticsService.trigger('canvas.selection');
      }
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
        menuOpen={menuOpen}
        onPressMenu={() => {
          const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
          parent?.dispatch(DrawerActions.openDrawer());
        }}
        rightElement={
          isQuickAddFocused ? (
            <Button
              variant="secondary"
              size="xs"
              testID="e2e.activities.quickAdd.done"
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={collapseQuickAdd}
            >
              <ButtonLabel size="xs">Done</ButtonLabel>
            </Button>
          ) : (
            <IconButton
              ref={addButtonRef}
              collapsable={false}
              testID="e2e.activities.openCoach"
              accessibilityRole="button"
              accessibilityLabel="Add Activity"
              style={styles.addActivityIconButton}
              hitSlop={8}
              onPress={() => {
                setActivityCoachVisible(true);
              }}
            >
              <Icon name="plus" size={18} color="#FFFFFF" />
            </IconButton>
          )
        }
      />
      <Coachmark
        visible={activitiesGuideHost.coachmarkVisible}
        targetRef={guideTargetRef}
        remeasureKey={activitiesGuideHost.remeasureKey}
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
      <CanvasFlatListWithRef
        ref={canvasScrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        extraBottomPadding={scrollExtraBottomPadding}
        showsVerticalScrollIndicator={false}
        scrollEnabled={activitiesGuideHost.scrollEnabled}
        // The Activities screen owns keyboard avoidance for the docked quick-add.
        // Letting the scroll view also auto-adjust can cause iOS to "fight" the
        // keyboard transition and immediately dismiss it.
        automaticallyAdjustKeyboardInsets={false}
        keyboardShouldPersistTaps="handled"
        data={activeActivities}
        keyExtractor={(activity) => activity.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item: activity }) => {
          const goalTitle = activity.goalId ? goalTitleById[activity.goalId] : undefined;
          const { meta, metaLeadingIconName } = buildActivityListMeta({ activity, goalTitle });
          const metaLoading = enrichingActivityIds.has(activity.id) && !meta;

          return (
            <ActivityListItem
              title={activity.title}
              meta={meta}
              metaLeadingIconName={metaLeadingIconName}
              metaLoading={metaLoading}
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
        }}
        ListHeaderComponent={
          <>
            {shouldShowSuggestedCard && (
              <View
                onLayout={(e) => {
                  suggestedCardYRef.current = e.nativeEvent.layout.y;
                }}
              >
                <OpportunityCard
                  tone="brand"
                  shadow="layered"
                  // Match canonical opportunity card interior rhythm used across Arc/Goal empty states.
                  padding="xs"
                  ctaAlign="right"
                  header={
                    <HStack justifyContent="space-between" alignItems="center">
                      <HStack alignItems="center" space="xs">
                        <Icon name="sparkles" size={14} color={colors.parchment} />
                        <Text style={styles.aiPickOnBrandLabel}>AI quick add</Text>
                      </HStack>
                      <HStack alignItems="center" space="xs">
                        {suggested?.kind === 'setup' ? (
                          <Text style={styles.aiPickOnBrandPill}>Setup</Text>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="About AI pick"
                          hitSlop={10}
                          onPress={() => setQuickAddInfoVisible(true)}
                        >
                          <Icon name="info" size={16} color={colors.parchment} />
                        </Pressable>
                      </HStack>
                    </HStack>
                  }
                  title={null}
                  body={
                    suggested?.kind === 'activity' && suggestedActivity ? (
                      <ActivityListItem
                        title={suggestedActivity.title}
                        meta={suggestedActivityMeta.meta}
                        metaLeadingIconName={suggestedActivityMeta.metaLeadingIconName}
                        onPress={() =>
                          navigation.push('ActivityDetail', { activityId: suggestedActivity.id })
                        }
                        showPriorityControl={false}
                      />
                    ) : (
                      suggestedCardBody
                    )
                  }
                  ctaLabel={
                    suggested?.kind === 'setup'
                      ? suggested.reason === 'no_goals'
                        ? 'Create goal'
                        : 'Add activity'
                      : 'Add to Today'
                  }
                  ctaVariant={suggested?.kind === 'activity' ? 'inverse' : 'inverse'}
                  // Icon lives in the header; keep the CTA clean.
                  ctaLeadingIconName={suggested?.kind === 'activity' ? undefined : 'sparkles'}
                  ctaSize="xs"
                  ctaAccessibilityLabel={
                    suggested?.kind === 'activity'
                      ? 'Add suggested activity to Today'
                      : 'Add activity'
                  }
                  onPressCta={handleAcceptSuggested}
                  secondaryCtaLabel="Not now"
                  secondaryCtaVariant="ghost"
                  secondaryCtaSize="xs"
                  secondaryCtaAccessibilityLabel="Dismiss AI pick"
                  onPressSecondaryCta={() => setHighlightSuggested(false)}
                  style={[
                    styles.suggestedOpportunityCard,
                    highlightSuggested && styles.suggestedOpportunityCardHighlighted,
                  ]}
                />
              </View>
            )}

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
                            <ViewMenuItem
                              key={view.id}
                              view={view}
                              onApplyView={applyView}
                              onOpenViewSettings={handleOpenViewSettings}
                            />
                          ))}
                          <DropdownMenuItem
                            onPress={handleOpenCreateView}
                            style={styles.newViewMenuItem}
                          >
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
                            <HStack alignItems="center" space="xs">
                              <Icon name="star" size={14} color={colors.textSecondary} />
                              <Text style={styles.menuItemText}>Starred</Text>
                            </HStack>
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
                        <DropdownMenuTrigger
                          accessibilityRole="button"
                          accessibilityLabel="Sort activities"
                        >
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
          </>
        }
        ListEmptyComponent={
          !hasAnyActivities ? (
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
          ) : null
        }
        ListFooterComponent={
          completedActivities.length > 0 ? (
            <View style={{ marginTop: activeActivities.length > 0 ? spacing.sm : 0 }}>
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
                isMetaLoading={(activityId) => enrichingActivityIds.has(activityId)}
              />
            </View>
          ) : (
            <View />
          )
        }
      />
      <QuickAddDock
        value={quickAddTitle}
        onChangeText={handleQuickAddChangeText}
        inputRef={quickAddInputRef}
        isFocused={isQuickAddFocused}
        setIsFocused={setQuickAddFocused}
        onSubmit={handleQuickAddActivity}
        onCollapse={collapseQuickAdd}
        reminderAt={quickAddReminderAt}
        scheduledDate={quickAddScheduledDate}
        repeatRule={quickAddRepeatRule}
        estimateMinutes={quickAddEstimateMinutes}
        onPressReminder={() => openQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(true))}
        onPressDueDate={() => openQuickAddToolDrawer(() => setQuickAddDueDateSheetVisible(true))}
        onPressRepeat={() => openQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(true))}
        onPressEstimate={() => openQuickAddToolDrawer(() => setQuickAddEstimateSheetVisible(true))}
        onPressGenerateActivityTitle={handleGenerateQuickAddActivityTitle}
        isGeneratingActivityTitle={isQuickAddAiGenerating}
        hasGeneratedActivityTitle={hasQuickAddAiGenerated}
        onReservedHeightChange={setQuickAddReservedHeight}
      />
      <BottomGuide
        visible={triggerGuideVisible && Boolean(postCreateTriggerActivityId)}
        onClose={dismissTriggerGuide}
        scrim="none"
        snapPoints={['32%']}
      >
        <Text style={styles.triggerGuideTitle}>Add a trigger?</Text>
        <Text style={styles.triggerGuideBody}>
          Pick a moment (time/context) so this activity is much more likely to happen.
        </Text>
        <HStack space="sm" alignItems="center" style={styles.triggerGuideActions}>
          <Button variant="ghost" onPress={dismissTriggerGuide}>
            <ButtonLabel size="md">Not now</ButtonLabel>
          </Button>
          <Button onPress={openTriggerPickerForGuide}>
            <ButtonLabel size="md" tone="inverse">
              Add trigger
            </ButtonLabel>
          </Button>
        </HStack>
      </BottomGuide>

      <BottomDrawer
        visible={triggerPickerVisible}
        onClose={() => {
          setTriggerPickerVisible(false);
          setTriggerPickerActivityId(null);
          setIsTriggerDateTimePickerVisible(false);
        }}
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Trigger (reminder)</Text>
          <VStack space="sm">
            <SheetOption
              label="Later today (6pm)"
              onPress={() => setTriggerReminderByOffsetDays(0, 18, 0)}
            />
            <SheetOption
              label="Tomorrow morning (9am)"
              onPress={() => setTriggerReminderByOffsetDays(1, 9, 0)}
            />
            <SheetOption
              label="Next week (Mon 9am)"
              onPress={() => setTriggerReminderByOffsetDays(7, 9, 0)}
            />
            <SheetOption label="Pick date & time…" onPress={() => setIsTriggerDateTimePickerVisible(true)} />
            <SheetOption label="Clear trigger" onPress={clearTriggerReminder} />
          </VStack>
          {isTriggerDateTimePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialTriggerDateTime()}
                onChange={handleTriggerDateTimeChange}
              />
            </View>
          )}
        </View>
      </BottomDrawer>
      <BottomDrawer
        visible={quickAddReminderSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false))}
        snapPoints={['40%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Reminder</Text>
          <VStack space="sm">
            <SheetOption label="In 1 hour" onPress={() => setQuickAddReminderByOffsetMinutes(60)} />
            <SheetOption label="This evening" onPress={() => setQuickAddReminderByOffsetMinutes(60 * 6)} />
            <SheetOption label="Tomorrow morning" onPress={() => setQuickAddReminderByOffsetMinutes(60 * 18)} />
            <SheetOption label="Clear reminder" onPress={clearQuickAddReminder} />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddDueDateSheetVisible}
        onClose={() =>
          closeQuickAddToolDrawer(() => {
            setQuickAddDueDateSheetVisible(false);
            setQuickAddIsDueDatePickerVisible(false);
          })
        }
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Due</Text>
          <VStack space="sm">
            <SheetOption label="Today" onPress={() => setQuickAddDueDateByOffsetDays(0)} />
            <SheetOption label="Tomorrow" onPress={() => setQuickAddDueDateByOffsetDays(1)} />
            <SheetOption label="Next Week" onPress={() => setQuickAddDueDateByOffsetDays(7)} />
            <SheetOption label="Pick a date…" onPress={() => setQuickAddIsDueDatePickerVisible(true)} />
            <SheetOption label="Clear due date" onPress={clearQuickAddDueDate} />
          </VStack>
          {quickAddIsDueDatePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getQuickAddInitialDueDateForPicker()}
                onChange={handleQuickAddDueDateChange}
              />
            </View>
          )}
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddRepeatSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false))}
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Repeat</Text>
          <VStack space="sm">
            <SheetOption label="Daily" onPress={() => handleQuickAddSelectRepeat('daily')} />
            <SheetOption label="Weekly" onPress={() => handleQuickAddSelectRepeat('weekly')} />
            <SheetOption label="Weekdays" onPress={() => handleQuickAddSelectRepeat('weekdays')} />
            <SheetOption label="Monthly" onPress={() => handleQuickAddSelectRepeat('monthly')} />
            <SheetOption label="Yearly" onPress={() => handleQuickAddSelectRepeat('yearly')} />
            <SheetOption label="Off" onPress={clearQuickAddRepeat} />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddEstimateSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddEstimateSheetVisible(false))}
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Estimate</Text>
          <VStack space="sm">
            <SheetOption label="10 min" onPress={() => handleQuickAddSelectEstimate(10)} />
            <SheetOption label="20 min" onPress={() => handleQuickAddSelectEstimate(20)} />
            <SheetOption label="30 min" onPress={() => handleQuickAddSelectEstimate(30)} />
            <SheetOption label="45 min" onPress={() => handleQuickAddSelectEstimate(45)} />
            <SheetOption label="60 min" onPress={() => handleQuickAddSelectEstimate(60)} />
            <SheetOption label="Clear estimate" onPress={() => handleQuickAddSelectEstimate(null)} />
          </VStack>
        </View>
      </BottomDrawer>
      <ActivityCoachDrawer
        visible={activityCoachVisible}
        onClose={() => setActivityCoachVisible(false)}
        goals={goals}
        activities={activities}
        arcs={arcs}
        addActivity={addActivity}
        markActivityEnrichment={markActivityEnrichment}
        isActivityEnriching={isActivityEnriching}
      />
      <Dialog
        visible={quickAddInfoVisible}
        onClose={() => setQuickAddInfoVisible(false)}
        title="AI pick"
        size="sm"
        showHeaderDivider
      >
        <VStack space="sm">
          <Text style={styles.quickAddInfoBody}>
            AI pick highlights one next Activity from your existing list when you don’t have anything scheduled for today.
          </Text>
          <Text style={styles.quickAddInfoBody}>
            It doesn’t generate new activities, and it doesn’t use your generative credits.
          </Text>
        </VStack>
      </Dialog>
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

const QUICK_ADD_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  addActivityIconButton: {
    alignSelf: 'flex-start',
    marginTop: 0,
    backgroundColor: colors.primary,
  },
  scroll: {
    flex: 1,
    // Let the scroll view extend into the AppShell horizontal padding so shadows
    // can render up to the true screen edge (UIScrollView clips to its bounds).
    marginHorizontal: -spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
    // Re-apply the canonical canvas gutter inside the scroll content after
    // expanding the scroll view bounds.
    paddingHorizontal: spacing.sm,
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
    marginTop: spacing['2xl'],
  },
  suggestedCard: {
    // Deprecated: Suggested card has been migrated to OpportunityCard.
    // Keep this style around temporarily to avoid churn in diffs while we verify
    // the new design across states.
    marginBottom: spacing.md,
  },
  suggestedCardHighlighted: {
    // Deprecated: see `suggestedOpportunityCardHighlighted`.
    borderColor: colors.accent,
  },
  suggestedTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  suggestedPill: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  suggestedBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  // Legacy OpportunityCard styling for the old "Suggested" module. Keep around for now
  // to avoid noisy diffs in case we decide to bring back the green opportunity surface.
  suggestedOpportunityCard: { marginBottom: spacing.md },
  suggestedOpportunityCardHighlighted: { borderWidth: 2, borderColor: colors.accent },
  quickAddLabelOnBrand: { ...typography.bodySm, color: colors.parchment, fontFamily: fonts.semibold, letterSpacing: 0.2 },
  suggestedPillOnBrand: { ...typography.bodySm, color: colors.parchment, opacity: 0.9 },
  quickAddMetaOnBrand: { ...typography.bodySm, color: colors.parchment, opacity: 0.9 },
  aiPickCard: {
    marginBottom: spacing.md,
    marginHorizontal: 0,
  },
  aiPickCardHighlighted: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  aiPickLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  aiPickPill: {
    ...typography.bodySm,
    color: colors.textSecondary,
    opacity: 0.9,
  },
  aiPickCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  aiPickTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  aiPickSetupBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  aiPickOnBrandLabel: {
    ...typography.bodySm,
    color: colors.parchment,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
  },
  aiPickOnBrandPill: {
    ...typography.bodySm,
    color: colors.parchment,
    opacity: 0.9,
  },
  quickAddInfoBody: {
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
    ...typography.body,
    color: colors.textPrimary,
  },
  newViewMenuItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    marginHorizontal: -spacing.xs,
    paddingLeft: spacing.xs + spacing.sm,
    paddingRight: spacing.xs + spacing.sm,
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
  activityAiCreditsEmpty: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
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
    alignItems: 'flex-start',
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
  triggerGuideTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  triggerGuideBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  triggerGuideActions: {
    marginTop: spacing.sm,
    justifyContent: 'flex-end',
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
      return 'Starred';
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
  markActivityEnrichment: (activityId: string, isEnriching: boolean) => void;
  isActivityEnriching: (activityId: string) => boolean;
};

function ActivityCoachDrawer({
  visible,
  onClose,
  goals,
  activities,
  arcs,
  addActivity,
  markActivityEnrichment,
  isActivityEnriching,
}: ActivityCoachDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<'ai' | 'manual'>('ai');
  const { capture } = useAnalytics();
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const [isActivityAiInfoVisible, setIsActivityAiInfoVisible] = React.useState(false);
  const showToast = useToastStore((state) => state.showToast);

  const [manualDraft, setManualDraft] = React.useState<ActivityDraft>({
    title: '',
    type: 'task',
    notes: '',
    steps: [],
    tags: [],
    reminderAt: null,
    scheduledDate: null,
    repeatRule: undefined,
    estimateMinutes: null,
    difficulty: undefined,
  });

  const workspaceSnapshot = React.useMemo(
    () => buildActivityCoachLaunchContext(goals, activities, undefined, undefined, undefined, undefined),
    [goals, activities],
  );

  const launchContext = React.useMemo(
    () => ({
      source: 'activitiesList' as const,
      intent: 'activityCreation' as const,
    }),
    [],
  );

  const aiCreditsRemaining = React.useMemo(() => {
    const limit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
    const currentKey = getMonthKey(new Date());
    const ledger =
      generativeCredits && generativeCredits.monthKey === currentKey
        ? generativeCredits
        : { monthKey: currentKey, usedThisMonth: 0 };
    const usedRaw = Number((ledger as any).usedThisMonth ?? 0);
    const used = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
    return Math.max(0, limit - used);
  }, [generativeCredits, isPro]);

  const handleChangeMode = React.useCallback(
    (next: 'ai' | 'manual') => {
      // Allow switching into AI even when credits are exhausted; we show the paywall content inline.
      setActiveTab(next);
    },
    [],
  );

  React.useEffect(() => {
    if (!visible) {
      setActiveTab('ai');
      setIsActivityAiInfoVisible(false);
      setManualDraft({
        title: '',
        type: 'task',
        notes: '',
        steps: [],
        tags: [],
        reminderAt: null,
        scheduledDate: null,
        repeatRule: undefined,
        estimateMinutes: null,
        difficulty: undefined,
      });
    }
  }, [visible]);

  const handleConfirmManualActivity = React.useCallback(() => {
    const trimmedTitle = manualDraft.title.trim();
    if (!trimmedTitle) return;

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tags = manualDraft.tags ?? [];
    const notes = (manualDraft.notes ?? '').trim();
    const steps = (manualDraft.steps ?? [])
      .map((s) => ({ title: (s.title ?? '').trim() }))
      .filter((s) => s.title.length > 0)
      .map((s, idx) => ({
        id: `step-${id}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: s.title,
        completedAt: null,
        isOptional: false,
        orderIndex: idx,
      }));

    const activity: Activity = {
      id,
      goalId: null,
      title: trimmedTitle,
      type: manualDraft.type ?? 'task',
      tags,
      notes: notes.length > 0 ? notes : undefined,
      steps,
      reminderAt: manualDraft.reminderAt ?? null,
      priority: undefined,
      estimateMinutes: manualDraft.estimateMinutes ?? null,
      creationSource: 'manual',
      planGroupId: null,
      scheduledDate: manualDraft.scheduledDate ?? null,
      repeatRule: manualDraft.repeatRule,
      orderIndex: (activities.length || 0) + 1,
      phase: null,
      status: 'planned',
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      forceActual: defaultForceLevels(0),
      difficulty: manualDraft.difficulty,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    recordShowUp();
    addActivity(activity);
    capture(AnalyticsEvent.ActivityCreated, {
      source: 'manual_drawer',
      activity_id: activity.id,
      goal_id: null,
    });
    showToast({ message: 'Activity created', variant: 'success', durationMs: 2200 });
    void HapticsService.trigger('outcome.success');
    onClose();
  }, [
    activities.length,
    addActivity,
    capture,
    manualDraft.difficulty,
    manualDraft.estimateMinutes,
    manualDraft.notes,
    manualDraft.reminderAt,
    manualDraft.repeatRule,
    manualDraft.scheduledDate,
    manualDraft.steps,
    manualDraft.tags,
    manualDraft.title,
    manualDraft.type,
    onClose,
    recordShowUp,
    showToast,
  ]);

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

      const normalizeTitleKey = (value: string) =>
        value.trim().toLowerCase().replace(/\s+/g, ' ');

      const baseIndex = activities.length;
      let didAddAny = false;
      adoptedTitles.forEach((rawTitle: unknown, idx: number) => {
        if (typeof rawTitle !== 'string') return;
        const trimmedTitle = rawTitle.trim();
        if (!trimmedTitle) return;

        const titleKey = normalizeTitleKey(trimmedTitle);
        // Skip if an activity with this title already exists
        // (prevents duplicates when "accept all" triggers both onAdoptActivitySuggestion
        // and workflow completion)
        const alreadyExists = activities.some(
          (a) => normalizeTitleKey(a.title) === titleKey
        );
        if (alreadyExists) return;

        const timestamp = new Date().toISOString();
        const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const activity: Activity = {
          id,
          goalId: null,
          title: trimmedTitle,
          type: 'task',
          tags: [],
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
        didAddAny = true;
        capture(AnalyticsEvent.ActivityCreated, {
          source: 'ai_workflow',
          activity_id: activity.id,
          goal_id: null,
        });
      });
      if (didAddAny) {
        void HapticsService.trigger('outcome.success');
      }
    },
    [activities, addActivity, capture],
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
        type: suggestion.type ?? 'task',
        tags: [],
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
      void HapticsService.trigger('outcome.success');
      capture(AnalyticsEvent.ActivityCreated, {
        source: 'ai_suggestion',
        activity_id: activity.id,
        goal_id: null,
        has_steps: Boolean(activity.steps && activity.steps.length > 0),
        has_estimate: Boolean(activity.estimateMinutes),
      });
    },
    [activities.length, addActivity, capture],
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
      <View style={styles.activityCoachContainer}>
        <AgentModeHeader
          activeMode={activeTab}
          onChangeMode={handleChangeMode}
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
          {aiCreditsRemaining <= 0 ? (
            <View style={styles.activityAiCreditsEmpty}>
              <PaywallContent
                reason="generative_quota_exceeded"
                source="activity_quick_add_ai"
                showHeader={false}
                onClose={() => setActiveTab('manual')}
                onUpgrade={() => {
                  onClose();
                  setTimeout(() => openPaywallPurchaseEntry(), 360);
                }}
              />
            </View>
          ) : (
            <AgentWorkspace
              mode="activityCreation"
              launchContext={launchContext}
              workspaceSnapshot={workspaceSnapshot}
              workflowDefinitionId={ACTIVITY_CREATION_WORKFLOW_ID}
              resumeDraft={false}
              hideBrandHeader
              hidePromptSuggestions
              hostBottomInsetAlreadyApplied
              onComplete={handleAiComplete}
              onTransportError={handleSwitchToManual}
              onAdoptActivitySuggestion={handleAdoptActivitySuggestion}
              onDismiss={onClose}
            />
          )}
        </View>

        <View style={[styles.activityCoachBody, activeTab !== 'manual' && { display: 'none' }]}>
          <KeyboardAwareScrollView
            style={styles.manualFormContainer}
            contentContainerStyle={{ paddingBottom: spacing['2xl'], gap: spacing.xs }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%' }}>
              <ActivityDraftDetailFields
                draft={manualDraft}
                onChange={(updater) => setManualDraft((prev) => updater(prev))}
              />
              <Button
                style={{ marginTop: spacing.xs }}
                onPress={handleConfirmManualActivity}
                disabled={manualDraft.title.trim().length === 0}
              >
                <Text style={{ color: colors.canvas }}>Create activity</Text>
              </Button>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </BottomDrawer>
  );
}

type SheetOptionProps = {
  label: string;
  onPress: () => void;
};

function SheetOption({ label, onPress }: SheetOptionProps) {
  return (
    <Pressable
      style={styles.sheetRow}
      onPress={() => {
        void HapticsService.trigger('canvas.selection');
        onPress();
      }}
    >
      <Text style={styles.sheetRowLabel}>{label}</Text>
    </Pressable>
  );
}

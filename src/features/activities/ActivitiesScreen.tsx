import React from 'react';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  FlatList,
  InteractionManager,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  UIManager,
  View,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DraggableList } from '../../ui/DraggableList';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { useCapabilityShellOptional } from '../../navigation/CapabilityShellContext';
import { markFirstSurfaceUsable, wasNavigationRestoredForStartup } from '../../services/performance/startupTelemetry';
import { CanvasFlatListWithRef } from '../../ui/layout/CanvasFlatList';
import type { ActivitiesStackParamList, MainTabsParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
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
import { useActivityEnrichmentStore } from '../../store/useActivityEnrichmentStore';
import { useShowedUpToday, useRepairWindowActive } from '../../store/useShowedUpToday';
import { useCanUseProTools } from '../../store/proToolsAccess';
import { useToastStore } from '../../store/useToastStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import { useFeatureFlagVariant } from '../../services/analytics/useFeatureFlagVariant';
import { enrichActivityWithAI } from '../../services/ai';
import { HapticsService } from '../../services/HapticsService';
import { playActivityDoneSound } from '../../services/uiSounds';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import {
  celebrateFirstActivity,
  celebrateAllActivitiesDone,
  useCelebrationStore,
  recordShowUpWithCelebration,
} from '../../store/useCelebrationStore';
import { queueCheckinDraftFromProgress } from '../../services/checkinNudgeDrafts';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import { geocodePlaceBestEffort } from '../../services/locationOffers/geocodePlace';
import {
  applyDueDateReminderPolicy,
  REMINDER_SOURCE_MANUAL,
} from './dueDateReminderPolicy';
import { ActivityListItem, type ActivityPriorityIndicator } from '../../ui/ActivityListItem';
import { useNavigationTapGuard } from '../../ui/hooks/useNavigationTapGuard';
import { buildActivityDeleteUndoSnapshot } from '../../utils/activityDeletionUndo';
import {
  buildActivityCompletionUndoSnapshot,
  restoreActivityCompletionFromSnapshot,
  type ActivityCompletionUndoSnapshot,
} from './activityCompletionUndo';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { menuItemTextProps } from '../../ui/menuStyles';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomGuide } from '../../ui/BottomGuide';
import { Coachmark } from '../../ui/Coachmark';
import { useCoachmarkHost } from '../../ui/hooks/useCoachmarkHost';
import { useKeyboardHeight } from '../../ui/hooks/useKeyboardHeight';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import {
  useQuickAddDockController,
  type QuickAddAiAction,
  type QuickAddLocationTriggerRecommendation,
} from './useQuickAddDockController';
import { ACTIVITY_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { ActivityDraftDetailFields, type ActivityDraft } from './ActivityDraftDetailFields';
import { ActivityCoachDrawer, SheetOption } from './ActivityCoachDrawer';
import { CompletedActivitySection } from './CompletedActivitySection';
import { ViewMenuItem } from './ViewMenuItem';
import { TagGroupMenuItems } from './TagGroupMenuItems';
import { TagGroupsDrawer } from './TagGroupsDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { useActivityListData } from './hooks/useActivityListData';
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
import { styles, QUICK_ADD_BAR_HEIGHT } from './activitiesScreenStyles';
import { useChromeVisibility } from '../../navigation/ChromeVisibilityContext';
import { INVENTORY_CHROME_ANIMATION_MS, inventoryChromeReanimatedEasing } from '../../navigation/chromeMotion';
import { Dialog } from '../../ui/Dialog';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { QuickAddDock } from './QuickAddDock';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { formatTags, parseTags, suggestTagsFromText } from '../../utils/tags';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import { suggestActivityTagsWithAi } from '../../services/ai';
import { findActivityCoverImageWithAI } from './activityCoverImage';
import { RepeatInfoMenu } from './RepeatInfoMenu';
import { buildQuickAddDefaultsFromFilters } from './activityQuickAddDefaults';
import { openPaywallInterstitial, openPaywallPurchaseEntry } from '../../services/paywall';
import { retryDomainPull } from '../../services/sync/domainSync';
// (removed) in-list "AI pick / Quick add" offer now that Plan owns primary scheduling.
import { PaywallContent } from '../paywall/PaywallDrawer';

const KANBAN_CARD_FIELDS: Array<{
  id: string;
  field: KanbanCardField;
  title: string;
  toggleA11yLabel: string;
}> = [
  {
    id: 'goal',
    field: 'goal',
    title: 'Goal',
    toggleA11yLabel: 'Toggle Goal field on cards',
  },
  {
    id: 'steps',
    field: 'steps',
    title: 'Steps',
    toggleA11yLabel: 'Toggle Steps field on cards',
  },
  {
    id: 'attachments',
    field: 'attachments',
    title: 'Attachments',
    toggleA11yLabel: 'Toggle Attachments field on cards',
  },
  {
    id: 'dueDate',
    field: 'dueDate',
    title: 'Due',
    toggleA11yLabel: 'Toggle Due date field on cards',
  },
  {
    id: 'priority',
    field: 'priority',
    title: 'Star',
    toggleA11yLabel: 'Toggle Priority field on cards',
  },
  {
    id: 'estimate',
    field: 'estimate',
    title: 'Estimate',
    toggleA11yLabel: 'Toggle Estimate field on cards',
  },
];
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';
import { QueryService } from '../../services/QueryService';
import {
  getActivityPriorityReasonLabels,
  rankActivitiesBySmartOrder,
  sortActivitiesByPriorityRanking,
} from './activityPriority';
import { buildPriorityIndicator } from './activityPriorityIndicator';
import { getActivityListRowGap, getActivityListRowOuterGap } from './activityListSpacing';
import { FilterDrawer } from '../../ui/FilterDrawer';
import { SortDrawer } from '../../ui/SortDrawer';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { KanbanBoard } from './KanbanBoard';
import { GroupingDrawer } from './GroupingDrawer';
import { GroupedActivitySection } from './GroupedActivitySection';
import type { KanbanCardField } from './KanbanCard';
import { InlineViewCreator } from './InlineViewCreator';
import { ViewCustomizationGuide, type ViewPreset } from './ViewCustomizationGuide';
import { createViewFromPrompt } from '../../services/aiViewCreator';
import type {
  ActivityGroupingField,
  ActivityViewGrouping,
  FilterGroup,
  SortCondition,
  ActivityViewLayout,
  KanbanGroupBy,
} from '../../domain/types';
import {
  getActivityGroupingLabel,
  groupActivitiesForList,
  isGroupingApplied,
  setCollapsedGroupKey,
} from './activityGrouping';
import {
  buildActivityTagGroupFilter,
  buildActivityTagGroups,
} from './tagGroups';
import {
  INVENTORY_CHROME_FADE_MAX_ALPHA,
  INVENTORY_CHROME_TOOLBAR_VISUAL_FALLBACK_PX,
  INVENTORY_CHROME_TOP_REVEAL_THRESHOLD_PX,
  doesQuickAddOwnInventoryBottomFade,
  getInventoryChromeDragStartEffect,
  getInventoryChromeScrollEffect,
  getInventoryChromeSettleEffect,
  getTopInventoryFadeGeometry,
} from './inventoryChrome';

const LAYOUT_OPTIONS: Array<{ value: ActivityViewLayout; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'kanban', label: 'Kanban' },
];

const KANBAN_GROUP_OPTIONS: Array<{ value: KanbanGroupBy; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'goal', label: 'Goal' },
  { value: 'priority', label: 'Priority' },
  { value: 'phase', label: 'Phase' },
];

const INVENTORY_CHROME_SURFACE = 'activities-inventory';
const HEADER_COLLAPSE_DISTANCE_FALLBACK = 88;
type InventoryScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

function isPrioritySort(sortConditions: SortCondition[]): boolean {
  return sortConditions[0]?.field === 'priority';
}

function isTopPriorityBandIndicator(indicator?: ActivityPriorityIndicator | null): boolean {
  return (
    indicator?.label === '#1' ||
    indicator?.label === '#2' ||
    indicator?.label === '#3'
  );
}

function getTopPriorityBandRowStyle(indicator?: ActivityPriorityIndicator | null) {
  if (!isTopPriorityBandIndicator(indicator)) return null;

  return [
    styles.topPriorityBandRow,
    indicator?.label === '#1' ? styles.topPriorityBandFirstRow : null,
    indicator?.label === '#3' ? styles.topPriorityBandLastRow : null,
  ];
}

export function ActivitiesScreen() {
  const capabilityShell = useCapabilityShellOptional();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<ActivitiesStackParamList, 'ActivitiesList'>>();
  // This screen is used for both the canonical `today` entrypoint and widget-origin
  // `activities?viewId=...` entrypoints. Keep route typing permissive.
  const route = useRoute<RouteProp<ActivitiesStackParamList, any>>();
  const tabsNavigation = navigation.getParent<BottomTabNavigationProp<MainTabsParamList>>();
  const insets = useSafeAreaInsets();
  const {
    setChromeAutoHideEnabled,
    setChromeVisibility,
    notifyChromeScrollIntent,
    setChromeInteractionLock,
    setChromeBottomFadeSuppressed,
  } = useChromeVisibility();
  const { capture } = useAnalytics();
  const showToast = useToastStore((state) => state.showToast);
  const widgetNudgesEnabled = useFeatureFlag('widget_nudges_enabled', false);
  const widgetSurfaceVariant = useFeatureFlagVariant('widget_nudge_surface', 'inline_modal');
  const widgetTimingVariant = useFeatureFlagVariant('widget_nudge_timing', '3_5');
  const widgetCopyVariant = useFeatureFlagVariant('widget_nudge_copy', 'today_glance');
  const ftueActive = useFirstTimeUxStore((state) => state.isFlowActive);

  const arcs = useAppStore((state) => state.arcs);
  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const domainHydrated = useAppStore((state) => state.domainHydrated);

  React.useEffect(() => {
    if (!domainHydrated) return;
    const measurement = markFirstSurfaceUsable({
      capabilityId: 'todos',
      restored: wasNavigationRestoredForStartup(),
      shellVariant: 'option-g',
    });
    if (measurement) {
      capture(AnalyticsEvent.UnifiedShellFirstSurfaceUsable, {
        capability_id: measurement.capabilityId,
        restored: measurement.restored,
        shell_variant: measurement.shellVariant,
        app_to_root_ready_ms: measurement.appToRootReadyMs,
        app_to_first_surface_usable_ms: measurement.appToFirstSurfaceUsableMs,
      });
    }
  }, [capture, domainHydrated]);
  const domainSyncStatus = useAppStore((state) => state.domainSyncStatus);
  const domainSyncError = useAppStore((state) => state.domainSyncError);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const quickAddAiActions = useAppStore((state) => state.quickAddAiActions);
  const setQuickAddAiActions = useAppStore((state) => state.setQuickAddAiActions);
  const locationOfferPreferences = useAppStore((state) => state.locationOfferPreferences);
  const setLocationOfferPreferences = useAppStore((state) => state.setLocationOfferPreferences);
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const restoreRemovedActivity = useAppStore((state) => state.restoreRemovedActivity);
  const reorderActivities = useAppStore((state) => state.reorderActivities);
  // NOTE: Drag-and-drop reorder is temporarily disabled on this screen.
  // Manual order remains supported via Activity.orderIndex and the existing sorting logic.
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const tryConsumeGenerativeCredit = useAppStore((state) => state.tryConsumeGenerativeCredit);
  const isPro = useCanUseProTools('saved_views');
  const canUseUnsplash = useCanUseProTools('unsplash_banners');
  const activityViews = useAppStore((state) => state.activityViews);
  const avatarName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const avatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl;
  const currentShowUpStreak = useAppStore((state) => state.currentShowUpStreak);
  const lastShowUpDate = useAppStore((state) => state.lastShowUpDate);
  const streakGrace = useAppStore((state) => state.streakGrace);
  const streakBreakState = useAppStore((state) => state.streakBreakState);
  const showedUpToday = useShowedUpToday(lastShowUpDate);
  const shieldCount = (streakGrace?.freeDaysRemaining ?? 0) + (streakGrace?.shieldsAvailable ?? 0);
  const repairWindowActive = useRepairWindowActive(streakBreakState);

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
  const activitiesScreenVisitCount = useAppStore(
    (state) => state.activitiesScreenVisitCount,
  );
  const incrementActivitiesScreenVisitCount = useAppStore(
    (state) => state.incrementActivitiesScreenVisitCount,
  );
  const isPlanKickoffVisible = useAppStore((state) => state.isPlanKickoffVisible);
  const focusContextGoalId = useAppStore((state) => state.focusContextGoalId);
  const setFocusContextGoalId = useAppStore((state) => state.setFocusContextGoalId);
  const appOpenCount = useAppStore((state) => state.appOpenCount);
  const widgetNudge = useAppStore((state) => state.widgetNudge);
  const markWidgetPromptShown = useAppStore((state) => state.markWidgetPromptShown);
  const dismissWidgetPrompt = useAppStore((state) => state.dismissWidgetPrompt);

  const [activityCoachVisible, setActivityCoachVisible] = React.useState(false);
  const [viewEditorVisible, setViewEditorVisible] = React.useState(false);
  const [viewEditorMode, setViewEditorMode] = React.useState<'create' | 'settings'>('create');
  const [viewEditorTargetId, setViewEditorTargetId] = React.useState<string | null>(null);
  const [viewEditorName, setViewEditorName] = React.useState('');
  const [viewEditorLayout, setViewEditorLayout] = React.useState<import('../../domain/types').ActivityViewLayout>('list');
  const [viewEditorKanbanGroupBy, setViewEditorKanbanGroupBy] = React.useState<import('../../domain/types').KanbanGroupBy>('status');

  // Widget entrypoint: open the requested saved view (list) inside the existing app shell/canvas.
  React.useEffect(() => {
    const viewId = (route.params as any)?.viewId as string | undefined;
    if (!viewId) return;
    const exists = activityViews.some((v) => v.id === viewId);
    if (!exists) return;
    if (activeActivityViewId === viewId) return;
    setActiveActivityViewId(viewId);
  }, [route.params, activityViews, activeActivityViewId, setActiveActivityViewId]);
  
  // New inline view creator state
  const [viewCreatorVisible, setViewCreatorVisible] = React.useState(false);
  
  // View customization guide state (shown after creating a view)
  const [customizationGuideVisible, setCustomizationGuideVisible] = React.useState(false);
  const [newlyCreatedView, setNewlyCreatedView] = React.useState<ActivityView | null>(null);
  const [isApplyingAiCustomization, setIsApplyingAiCustomization] = React.useState(false);

  const viewsButtonRef = React.useRef<View | null>(null);
  const filterButtonRef = React.useRef<View | null>(null);
  const sortButtonRef = React.useRef<View | null>(null);

  const [filterDrawerVisible, setFilterDrawerVisible] = React.useState(false);
  const [groupingDrawerVisible, setGroupingDrawerVisible] = React.useState(false);
  const [sortDrawerVisible, setSortDrawerVisible] = React.useState(false);
  const [activeTagGroupTag, setActiveTagGroupTag] = React.useState<string | null>(null);
  const [tagGroupsDrawerVisible, setTagGroupsDrawerVisible] = React.useState(false);

  const [activitiesGuideStep, setActivitiesGuideStep] = React.useState(0);
  const quickAddFocusedRef = React.useRef(false);
  const quickAddLastFocusAtRef = React.useRef<number>(0);
  const canOpenActivityDetail = useNavigationTapGuard({ cooldownMs: 2000 });
  // Credits warning toast is now handled centrally in `tryConsumeGenerativeCredit`.
  const [enrichingActivityIds, setEnrichingActivityIds] = React.useState<Set<string>>(() => new Set());
  const enrichingActivityIdsRef = React.useRef<Set<string>>(new Set());
  /**
   * Track which "view/filter context" an activity was created in so our post-create
   * "ghost" behavior doesn't leak across view switches.
   *
   * Example bug fixed: create activities in the default view, then switch to a goal-filtered
   * view and see those unrelated activities as "ghosts". They should not appear at all.
   */
  const [sessionCreatedContextById, setSessionCreatedContextById] = React.useState<Record<string, string>>(
    () => ({}),
  );
  const lastCreatedActivityRef = React.useRef<Activity | null>(null);


  const [widgetModalVisible, setWidgetModalVisible] = React.useState(false);
  const hasTrackedWidgetInlineThisFocusRef = React.useRef(false);
  const hasOpenedWidgetModalThisFocusRef = React.useRef(false);

  const shouldShowWidgetNudgeInline = React.useMemo(() => {
    if (!widgetNudgesEnabled) return false;
    if (ftueActive) return false;
    if (!isFocused) return false;
    if (!activities || activities.length === 0) return false;
    if ((widgetNudge as any)?.status === 'completed') return false;
    if ((widgetNudge as any)?.cooldownUntilMs && Date.now() < (widgetNudge as any).cooldownUntilMs) return false;
    // Timing: avoid first-run; show after a few returns.
    const inlineThreshold =
      widgetTimingVariant === '4_6' ? 4 : widgetTimingVariant === '5_7' ? 5 : 3;
    if ((appOpenCount ?? 0) < inlineThreshold) return false;
    return true;
  }, [appOpenCount, activities, ftueActive, isFocused, widgetNudgesEnabled, widgetNudge, widgetTimingVariant]);

  const shouldAutoShowWidgetModal = React.useMemo(() => {
    if (!widgetNudgesEnabled) return false;
    if (widgetSurfaceVariant === 'inline_only') return false;
    if (ftueActive) return false;
    if (!isFocused) return false;
    if (!activities || activities.length === 0) return false;
    if ((widgetNudge as any)?.status === 'completed') return false;
    if ((widgetNudge as any)?.cooldownUntilMs && Date.now() < (widgetNudge as any).cooldownUntilMs) return false;
    // Escalation: only after at least one inline exposure, and on later opens.
    if (((widgetNudge as any)?.shownCount ?? 0) < 1) return false;
    const modalThreshold =
      widgetTimingVariant === '4_6' ? 6 : widgetTimingVariant === '5_7' ? 7 : 5;
    if ((appOpenCount ?? 0) < modalThreshold) return false;
    if (((widgetNudge as any)?.modalShownCount ?? 0) >= 1) return false;
    return true;
  }, [appOpenCount, activities, ftueActive, isFocused, widgetNudgesEnabled, widgetNudge, widgetSurfaceVariant, widgetTimingVariant]);

  React.useEffect(() => {
    if (!shouldShowWidgetNudgeInline) {
      hasTrackedWidgetInlineThisFocusRef.current = false;
      return;
    }
    if (hasTrackedWidgetInlineThisFocusRef.current) return;
    hasTrackedWidgetInlineThisFocusRef.current = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      markWidgetPromptShown('inline');
      capture(AnalyticsEvent.WidgetPromptExposed, {
        surface: 'inline',
        app_open_count: appOpenCount ?? 0,
      });
    });
    return () => interactionTask.cancel();
  }, [appOpenCount, capture, markWidgetPromptShown, shouldShowWidgetNudgeInline]);

  React.useEffect(() => {
    if (!shouldAutoShowWidgetModal) {
      hasOpenedWidgetModalThisFocusRef.current = false;
      return;
    }
    if (hasOpenedWidgetModalThisFocusRef.current) return;
    hasOpenedWidgetModalThisFocusRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      // Keep the existing delay so we don't stack on top of other startup UI.
      timeoutId = setTimeout(() => {
        setWidgetModalVisible(true);
        markWidgetPromptShown('modal');
        capture(AnalyticsEvent.WidgetPromptExposed, {
          surface: 'modal',
          app_open_count: appOpenCount ?? 0,
        });
      }, 400);
    });
    return () => {
      interactionTask.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [appOpenCount, capture, markWidgetPromptShown, shouldAutoShowWidgetModal]);

  React.useEffect(() => {
    if (!isFocused) return;
    InteractionManager.runAfterInteractions(() => {
      incrementActivitiesScreenVisitCount();
    });
  }, [isFocused, incrementActivitiesScreenVisitCount]);

  React.useEffect(() => {
    // Enable LayoutAnimation on Android (no-op on newer RN versions where it's enabled).
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  }, []);

  React.useEffect(() => {
    const id = (route.params as any)?.contextGoalId as string | undefined;
    if (!id) return;
    setFocusContextGoalId(id);
    // Best-effort: clear the param so returning to this screen doesn't re-trigger.
    try {
      (navigation as any).setParams?.({ contextGoalId: undefined });
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(route.params as any)?.contextGoalId]);

  React.useEffect(() => {
    if (!route.params?.openSearch) return;
    // Route the legacy `openSearch: true` deep-link through the unified
    // global search drawer (pre-scoped to Activities so this entry point
    // still feels Activities-specific).
    useAppStore.getState().openGlobalSearch({ initialScope: 'activities' });
    try {
      (navigation as any).setParams?.({ openSearch: undefined });
    } catch {
      // no-op
    }
  }, [navigation, route.params?.openSearch]);

  React.useEffect(() => {
    // Views (and their editor) are Pro Tools; don't leave the editor open if Pro is lost.
    if (!isPro && viewEditorVisible) {
      setViewEditorVisible(false);
    }
  }, [isPro, viewEditorVisible]);

  const systemViews = React.useMemo(() => activityViews.filter((v) => v.isSystem), [activityViews]);
  const systemViewIdSet = React.useMemo(() => new Set(systemViews.map((v) => v.id)), [systemViews]);

  const effectiveActiveViewId = React.useMemo(() => {
    if (isPro) return activeActivityViewId;
    // Free users can switch between system views, but not custom views.
    const activeId = activeActivityViewId ?? 'default';
    return systemViewIdSet.has(activeId) ? activeId : 'default';
  }, [activeActivityViewId, isPro, systemViewIdSet]);

  const activeView: ActivityView | undefined = React.useMemo(() => {
    const targetId = effectiveActiveViewId ?? 'default';
    const current = activityViews.find((view) => view.id === targetId) ?? activityViews[0];
    return current;
  }, [activityViews, effectiveActiveViewId]);

  const isKanbanLayout = activeView?.layout === 'kanban';
  const tagGroups = React.useMemo(
    () => buildActivityTagGroups({ activities, activityTagHistory }),
    [activities, activityTagHistory],
  );
  const activeTagGroupLabel = activeTagGroupTag?.trim() || null;
  const activeTagGroupFilterGroups = React.useMemo(
    () => (activeTagGroupLabel ? buildActivityTagGroupFilter(activeTagGroupLabel) : []),
    [activeTagGroupLabel],
  );

  // Local UI state for the Kanban expand/collapse control. Used to hide the fixed toolbar
  // and let the board claim that vertical space when expanded.
  const [isKanbanExpanded, setIsKanbanExpanded] = React.useState(false);
  React.useEffect(() => {
    // If we leave Kanban layout, reset the expanded state so returning to Kanban starts compact.
    if (!isKanbanLayout && isKanbanExpanded) {
      setIsKanbanExpanded(false);
    }
  }, [isKanbanExpanded, isKanbanLayout]);

  // Smoothly animate the fixed toolbar out/in (instead of mounting/unmounting) so the Kanban
  // expand/collapse transition doesn't "jump" vertically.
  const shouldShowFixedToolbar = activities.length > 0 && (!isKanbanLayout || !isKanbanExpanded);
  const fixedToolbarProgress = useSharedValue(shouldShowFixedToolbar ? 1 : 0);
  const [fixedToolbarMeasuredHeight, setFixedToolbarMeasuredHeight] = React.useState(0);
  const [fixedToolbarVisualHeight, setFixedToolbarVisualHeight] = React.useState(0);
  React.useEffect(() => {
    // When returning to the collapsed state, reset the cached measurement so we don't
    // get stuck with a clipped height from a previous animation frame.
    if (shouldShowFixedToolbar) {
      setFixedToolbarMeasuredHeight(0);
      setFixedToolbarVisualHeight(0);
    }
  }, [shouldShowFixedToolbar]);
  React.useEffect(() => {
    fixedToolbarProgress.value = withTiming(shouldShowFixedToolbar ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [fixedToolbarProgress, shouldShowFixedToolbar]);

  const fixedToolbarAnimatedStyle = useAnimatedStyle(() => {
    // Prefer a measured height so expanded Kanban reclaims *exactly* the prior toolbar space.
    // Fallback to maxHeight until we get the first measurement (so the toolbar can render).
    if (fixedToolbarMeasuredHeight > 0) {
      return {
        maxHeight: fixedToolbarMeasuredHeight * fixedToolbarProgress.value,
        opacity: fixedToolbarProgress.value,
        transform: [{ translateY: (1 - fixedToolbarProgress.value) * -8 }],
      };
    }

    const FALLBACK_MAX_TOOLBAR_HEIGHT = 140;
    return {
      maxHeight: FALLBACK_MAX_TOOLBAR_HEIGHT * fixedToolbarProgress.value,
      opacity: fixedToolbarProgress.value,
      transform: [{ translateY: (1 - fixedToolbarProgress.value) * -8 }],
    };
  }, [fixedToolbarMeasuredHeight, fixedToolbarProgress]);

  const [kanbanCardFieldsDrawerVisible, setKanbanCardFieldsDrawerVisible] = React.useState(false);
  const [kanbanCardFieldOrder, setKanbanCardFieldOrder] = React.useState<KanbanCardField[]>(
    KANBAN_CARD_FIELDS.map((f) => f.field),
  );
  const [kanbanCardFieldVisibility, setKanbanCardFieldVisibility] = React.useState<
    Record<KanbanCardField, boolean>
  >({
    goal: true,
    steps: true,
    attachments: true,
    dueDate: true,
    priority: true,
    estimate: true,
  });

  const kanbanCardVisibleFields = React.useMemo(() => {
    const entries = Object.entries(kanbanCardFieldVisibility) as Array<[KanbanCardField, boolean]>;
    return new Set(entries.filter(([, visible]) => visible).map(([field]) => field));
  }, [kanbanCardFieldVisibility]);

  const toggleKanbanCardField = React.useCallback((field: KanbanCardField) => {
    setKanbanCardFieldVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const orderedKanbanCardFieldItems = React.useMemo(() => {
    const configByField = new Map<KanbanCardField, (typeof KANBAN_CARD_FIELDS)[number]>();
    KANBAN_CARD_FIELDS.forEach((f) => configByField.set(f.field, f));

    // Ensure unknown/missing fields are appended at the end so the UI never breaks.
    const normalizedOrder: KanbanCardField[] = [
      ...kanbanCardFieldOrder.filter((f) => configByField.has(f)),
      ...KANBAN_CARD_FIELDS.map((f) => f.field).filter((f) => !kanbanCardFieldOrder.includes(f)),
    ];

    return normalizedOrder
      .map((field) => configByField.get(field))
      .filter(Boolean) as Array<(typeof KANBAN_CARD_FIELDS)[number]>;
  }, [kanbanCardFieldOrder]);

  // Custom views + editing are Pro Tools. System views are available to everyone.
  const filterMode = isPro ? (activeView?.filterMode ?? 'all') : 'all';
  const sortMode = isPro ? (activeView?.sortMode ?? 'manual') : 'manual';
  const showCompleted =
    isPro || activeView?.isSystem ? (activeView?.showCompleted ?? true) : true;
  const activeGrouping = React.useMemo<ActivityViewGrouping>(
    () => (isPro ? activeView?.grouping ?? { field: 'none' } : { field: 'none' }),
    [activeView?.grouping, isPro],
  );
  const groupingApplied = isGroupingApplied(activeGrouping);

  const goalTitleById = React.useMemo(
    () =>
      goals.reduce<Record<string, string>>((acc, goal) => {
        acc[goal.id] = goal.title;
        return acc;
      }, {}),
    [goals],
  );

  const baseFilterGroups = React.useMemo<FilterGroup[]>(() => {
    if (activeView?.filters && activeView.filters.length > 0) return activeView.filters;
    // Map legacy filterMode
    switch (filterMode) {
      case 'priority1':
        return [
          {
            logic: 'and',
            conditions: [{ id: 'legacy-p1', field: 'priority', operator: 'eq', value: 1 }],
          },
        ];
      case 'active':
        return [
          {
            logic: 'and',
            conditions: [
              { id: 'legacy-active-done', field: 'status', operator: 'neq', value: 'done' },
              { id: 'legacy-active-can', field: 'status', operator: 'neq', value: 'cancelled' },
              { id: 'legacy-active-skip', field: 'status', operator: 'neq', value: 'skipped' },
            ],
          },
        ];
      case 'completed':
        return [
          {
            logic: 'and',
            conditions: [{ id: 'legacy-completed', field: 'status', operator: 'eq', value: 'done' }],
          },
        ];
      case 'all':
      default:
        return [];
    }
  }, [activeView, filterMode]);

  const filterGroups = React.useMemo<FilterGroup[]>(
    () => [...baseFilterGroups, ...activeTagGroupFilterGroups],
    [activeTagGroupFilterGroups, baseFilterGroups],
  );
  const effectiveFilterGroupLogic = activeTagGroupFilterGroups.length > 0
    ? 'and'
    : activeView?.filterGroupLogic ?? 'or';

  const filterCount = React.useMemo(() => {
    return filterGroups.reduce((acc, g) => acc + g.conditions.length, 0);
  }, [filterGroups]);

  const structuredSorts = React.useMemo<SortCondition[]>(() => {
    // Structured sorts are Pro Tools. Free users should always see baseline sorting.
    if (!isPro) return [];
    return activeView?.sorts ?? [];
  }, [activeView?.sorts, isPro]);

  const sortConditions = React.useMemo<SortCondition[]>(() => {
    if (structuredSorts.length > 0) return structuredSorts;
    // Map legacy sortMode
    switch (sortMode) {
      case 'titleAsc':
        return [{ field: 'title', direction: 'asc' }];
      case 'titleDesc':
        return [{ field: 'title', direction: 'desc' }];
      case 'dueDateAsc':
        return [{ field: 'scheduledDate', direction: 'asc' }];
      case 'dueDateDesc':
        return [{ field: 'scheduledDate', direction: 'desc' }];
      case 'priority':
        return [{ field: 'priority', direction: 'asc' }];
      case 'manual':
      default:
        return [{ field: 'orderIndex', direction: 'asc' }];
    }
  }, [structuredSorts, sortMode]);

  const sortCount = sortConditions.length;

  const isManualOrderEffective = structuredSorts.length === 0 && sortMode === 'manual';

  // Sort button "applied" state:
  // - Manual/default sort (orderIndex) should NOT show as applied.
  // - Any non-manual legacy sortMode should show as applied (count 1).
  // - Any structured sorts should show as applied (count = number of sort levels).
  const appliedSortCount = React.useMemo(() => {
    if (structuredSorts.length > 0) return structuredSorts.length;
    return sortMode !== 'manual' ? 1 : 0;
  }, [structuredSorts.length, sortMode]);
  const appliedGroupingCount = groupingApplied ? 1 : 0;

  const ghostContextKey = React.useMemo(() => {
    // IMPORTANT: keep this stable across renders and insensitive to transient IDs.
    // We only include the semantic parts of filters (field/operator/value).
    const normalizedFilters = (filterGroups ?? []).map((g) => ({
      logic: g.logic,
      conditions: (g.conditions ?? []).map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
    }));
    return JSON.stringify({
      viewId: effectiveActiveViewId ?? 'default',
      focusContextGoalId: focusContextGoalId ?? null,
      groupLogic: effectiveFilterGroupLogic,
      filterGroups: normalizedFilters,
    });
  }, [effectiveActiveViewId, effectiveFilterGroupLogic, filterGroups, focusContextGoalId]);

  const sessionCreatedIdsForGhostContext = React.useMemo(() => {
    const ids = new Set<string>();
    for (const [id, ctx] of Object.entries(sessionCreatedContextById)) {
      if (ctx === ghostContextKey) ids.add(id);
    }
    return ids;
  }, [ghostContextKey, sessionCreatedContextById]);

  const filteredActivities = React.useMemo(() => {
    const base = activities.filter((activity) => {
      if (focusContextGoalId && activity.goalId !== focusContextGoalId) return false;
      return true;
    });

    if (filterGroups.length === 0) return base;

    // Apply filters but also include any IDs created in this same view/filter context ("ghost" logic)
    const filtered = QueryService.applyActivityFilters(
      base,
      filterGroups,
      effectiveFilterGroupLogic,
    );

    if (sessionCreatedIdsForGhostContext.size === 0) return filtered;

    const filteredIds = new Set(filtered.map((a) => a.id));
    const ghosts = base.filter((a) => sessionCreatedIdsForGhostContext.has(a.id) && !filteredIds.has(a.id));

    return [...filtered, ...ghosts];
  }, [
    activities,
    filterGroups,
    focusContextGoalId,
    effectiveFilterGroupLogic,
    sessionCreatedIdsForGhostContext,
  ]);

  const handleUpdateFilters = React.useCallback(
    (next: FilterGroup[], groupLogic: 'and' | 'or') => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_filter' });
        return;
      }
      if (!activeView) return;
      void HapticsService.trigger('canvas.selection');
      updateActivityView(activeView.id, (view) => ({
        ...view,
        filters: next,
        filterGroupLogic: groupLogic,
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const wrappedShowToast = React.useCallback(
    (payload: any) => {
      if (payload.message === 'To-do created' && lastCreatedActivityRef.current) {
        const activity = lastCreatedActivityRef.current;
        const matches =
          QueryService.applyActivityFilters(
            [activity],
            filterGroups,
            effectiveFilterGroupLogic,
          ).length > 0;

        if (!matches && filterGroups.length > 0) {
          showToast({
            ...payload,
            actionLabel: 'Clear filters',
            onPressAction: () => {
              handleUpdateFilters([], 'or');
              setActiveTagGroupTag(null);
            },
          });
          return;
        }
      }
      showToast(payload);
    },
    [showToast, filterGroups, effectiveFilterGroupLogic, handleUpdateFilters],
  );

  const handleUpdateSorts = React.useCallback(
    (next: SortCondition[]) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' });
        return;
      }
      if (!activeView) return;
      void HapticsService.trigger('canvas.selection');
      updateActivityView(activeView.id, (view) => ({
        ...view,
        sorts: next,
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const handleUpdateGrouping = React.useCallback(
    (next: ActivityViewGrouping) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' });
        return;
      }
      if (!activeView) return;
      void HapticsService.trigger('canvas.selection');
      updateActivityView(activeView.id, (view) => ({
        ...view,
        grouping: next.field === 'none' ? { field: 'none', collapsedGroupKeys: [] } : next,
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const handleToggleGroupCollapsed = React.useCallback(
    (groupKey: string, collapsed: boolean) => {
      if (!activeView) return;
      updateActivityView(activeView.id, (view) => ({
        ...view,
        grouping: setCollapsedGroupKey(view.grouping ?? activeGrouping, groupKey, collapsed),
      }));
    },
    [activeGrouping, activeView, updateActivityView],
  );

  const handleUpdateFilterMode = React.useCallback(
    (next: ActivityFilterMode) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_filter' });
        return;
      }
      if (!activeView) return;
      if (next !== activeView.filterMode) {
        void HapticsService.trigger('canvas.selection');
      }
      updateActivityView(activeView.id, (view) => ({
        ...view,
        filterMode: next,
        filters: undefined, // Clear structured filters when switching to legacy mode
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const handleUpdateSortMode = React.useCallback(
    (next: ActivitySortMode) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' });
        return;
      }
      if (!activeView) return;
      if (next !== activeView.sortMode) {
        void HapticsService.trigger('canvas.selection');
      }
      updateActivityView(activeView.id, (view) => ({
        ...view,
        sortMode: next,
        sorts: undefined, // Clear structured sorts when switching to legacy mode
      }));
    },
    [activeView, isPro, updateActivityView],
  );

  const visibleActivities = React.useMemo(() => {
    if (isPrioritySort(sortConditions)) {
      const sorted = sortActivitiesByPriorityRanking({
        activities: filteredActivities,
        goals,
        now: new Date(),
      });
      return sortConditions[0]?.direction === 'desc' ? [...sorted].reverse() : sorted;
    }
    return QueryService.applyActivitySorts(filteredActivities, sortConditions);
  }, [filteredActivities, goals, sortConditions]);

  const activeActivities = React.useMemo(
    () =>
      visibleActivities.filter(
        (activity) =>
          activity.status !== 'done' &&
          activity.status !== 'skipped' &&
          activity.status !== 'cancelled'
      ),
    [visibleActivities],
  );

  const priorityIndicatorByActivityId = React.useMemo(() => {
    if (!isPrioritySort(sortConditions)) {
      return new Map<string, ActivityPriorityIndicator>();
    }
    const rankedActive = rankActivitiesBySmartOrder({
      activities: filteredActivities,
      goals,
      now: new Date(),
    }).filter(
      (row) =>
        row.activity.status !== 'done' &&
        row.activity.status !== 'skipped' &&
        row.activity.status !== 'cancelled',
    );
    const total = rankedActive.length;
    const indicators = new Map<string, ActivityPriorityIndicator>();
    rankedActive.forEach((row, index) => {
      const indicator = buildPriorityIndicator({
        position: index + 1,
        total,
        reasons: getActivityPriorityReasonLabels(row.reasonCodes),
      });
      if (indicator) indicators.set(row.activity.id, indicator);
    });
    return indicators;
  }, [filteredActivities, goals, sortConditions]);

  const groupedActiveSections = React.useMemo(
    () =>
      groupActivitiesForList({
        activities: activeActivities,
        goals,
        grouping: activeGrouping,
        now: new Date(),
      }),
    [activeActivities, activeGrouping, goals],
  );

  const collapsedGroupKeys = React.useMemo(
    () => new Set(activeGrouping.collapsedGroupKeys ?? []),
    [activeGrouping.collapsedGroupKeys],
  );

  const completedActivities = React.useMemo(
    () =>
      showCompleted
        ? visibleActivities.filter(
            (activity) =>
              activity.status === 'done' ||
              activity.status === 'skipped' ||
              activity.status === 'cancelled'
          )
        : [],
    [visibleActivities, showCompleted],
  );

  const hasAnyActivities = visibleActivities.length > 0;
  const hasAnyStoredActivities = activities.length > 0;
  const isDomainLoading =
    !hasAnyStoredActivities &&
    (!domainHydrated ||
      domainSyncStatus === 'loading-local' ||
      domainSyncStatus === 'pulling-remote');
  const hasDomainLoadError = domainSyncStatus === 'error' && !hasAnyStoredActivities;
  const canShowEmptyState =
    domainHydrated &&
    !hasAnyActivities;
  const renderDomainEmptyState = React.useCallback(() => {
    if (hasDomainLoadError) {
      return (
        <EmptyState
          title="Couldn’t load your to-dos"
          instructions={domainSyncError ?? 'Check your connection and try again.'}
          iconName="warning"
          primaryAction={{
            label: 'Try again',
            variant: 'accent',
            onPress: () => {
              void retryDomainPull();
            },
            accessibilityLabel: 'Retry loading to-dos',
          }}
          style={styles.emptyState}
        />
      );
    }

    if (isDomainLoading) {
      return (
        <EmptyState
          title="Loading your to-dos…"
          instructions="We’re syncing your Kwilt records."
          iconName="refresh"
          style={styles.emptyState}
        />
      );
    }

    if (!canShowEmptyState) return null;
    if (filterGroups.length > 0 || hasAnyStoredActivities) {
      return (
        <EmptyState
          title="No matching to-dos"
          instructions="Check your filters to see more results."
          iconName="search"
          primaryAction={{
            label: 'Adjust filters',
            variant: 'outline',
            onPress: () => setFilterDrawerVisible(true),
            accessibilityLabel: 'Adjust filters',
          }}
          secondaryAction={
            !isPro
              ? {
                  label: 'Try Saved Views with Pro',
                  variant: 'outline',
                  onPress: () =>
                    openPaywallInterstitial({
                      reason: 'pro_only_views_filters',
                      source: 'activity_empty_state',
                    }),
                  accessibilityLabel: 'Learn about Pro saved views',
                }
              : undefined
          }
          style={styles.emptyState}
        />
      );
    }

    return (
      <EmptyState
        title="No to-dos yet"
        instructions="Add one to-do you can actually make room for."
        iconName="emptyBox"
        primaryAction={{
          label: 'Add to-do',
          variant: 'accent',
          onPress: () => setActivityCoachVisible(true),
          accessibilityLabel: 'Add a new to-do',
        }}
        style={styles.emptyState}
      />
    );
  }, [
    canShowEmptyState,
    domainSyncError,
    filterGroups.length,
    hasAnyStoredActivities,
    hasDomainLoadError,
    isDomainLoading,
    isPro,
  ]);

  const headerCollapseProgress = useSharedValue(0);
  const [collapsibleHeaderHeight, setCollapsibleHeaderHeight] = React.useState(0);
  const [headerCollapsedForA11y, setHeaderCollapsedForA11y] = React.useState(false);
  const [inventoryHeaderVisible, setInventoryHeaderVisibleTarget] = React.useState(true);
  const [inventoryViewportHeight, setInventoryViewportHeight] = React.useState(0);
  const [inventoryContentHeight, setInventoryContentHeight] = React.useState(0);
  const lastInventoryScrollYRef = React.useRef(0);
  const lastRawInventoryScrollYRef = React.useRef(0);
  const upwardScrollIntentRef = React.useRef(0);
  const inventoryScrollPhaseRef = React.useRef<'idle' | 'dragging' | 'momentum'>('idle');
  const lastInventoryScrollDirectionRef = React.useRef<'up' | 'down' | null>(null);
  const momentumRevealAllowedRef = React.useRef(false);
  const suppressRevealUntilNextDragRef = React.useRef(false);
  const headerVisibleRef = React.useRef(true);

  const headerCollapseDistance = Math.max(
    collapsibleHeaderHeight,
    HEADER_COLLAPSE_DISTANCE_FALLBACK,
  );
  const inventoryCanMeaningfullyScroll =
    inventoryContentHeight - inventoryViewportHeight > headerCollapseDistance + spacing.xl;
  const shouldRegisterInventoryChrome =
    isFocused &&
    hasAnyActivities &&
    !isKanbanLayout;
  const shouldAutoHideInventoryChrome =
    shouldRegisterInventoryChrome &&
    inventoryCanMeaningfullyScroll;

  const headerSlotHeight = collapsibleHeaderHeight || HEADER_COLLAPSE_DISTANCE_FALLBACK;
  const fixedToolbarHeight = fixedToolbarMeasuredHeight || 64;
  const headerGhostFadeGeometry = getTopInventoryFadeGeometry({
    safeAreaTop: insets.top,
    toolbarVisualHeight: fixedToolbarVisualHeight || INVENTORY_CHROME_TOOLBAR_VISUAL_FALLBACK_PX,
    toolbarContainerHeight: fixedToolbarHeight,
  });
  const headerGhostFadeListOverlapHeight = headerGhostFadeGeometry.listOverlapHeight;
  const headerGhostFadeHeight = headerGhostFadeGeometry.height;
  const headerGhostFadeRampStart = headerGhostFadeGeometry.rampStart;

  const collapsibleHeaderSlotAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerSlotHeight,
    };
  }, [headerSlotHeight]);

  const collapsibleHeaderContentAnimatedStyle = useAnimatedStyle(() => {
    const progress = headerCollapseProgress.value;

    return {
      opacity: 1 - progress,
      transform: [{ translateY: -headerSlotHeight * progress }],
    };
  }, [headerCollapseProgress, headerSlotHeight]);

  const inventoryBodyAnimatedStyle = useAnimatedStyle(() => {
    const progress = headerCollapseProgress.value;

    return {
      marginBottom: -headerSlotHeight * progress,
      transform: [{ translateY: -headerSlotHeight * progress }],
    };
  }, [headerCollapseProgress, headerSlotHeight]);

  const inventoryListBodyAnimatedStyle = useAnimatedStyle(() => {
    const progress = headerCollapseProgress.value;

    return {
      marginTop: -headerGhostFadeListOverlapHeight * progress,
    };
  }, [headerCollapseProgress, headerGhostFadeListOverlapHeight]);

  const headerGhostFadeAnimatedStyle = useAnimatedStyle(() => {
    return {
      top: -insets.top,
      height: headerGhostFadeHeight,
      opacity: headerCollapseProgress.value,
    };
  }, [headerCollapseProgress, headerGhostFadeHeight, insets.top]);

  const setHeaderCollapsedForA11yIfNeeded = React.useCallback((next: boolean) => {
    setHeaderCollapsedForA11y((current) => (current === next ? current : next));
  }, []);

  const setInventoryHeaderVisible = React.useCallback((visible: boolean) => {
    setInventoryHeaderVisibleTarget((current) => (current === visible ? current : visible));
  }, []);

  React.useEffect(() => {
    headerVisibleRef.current = inventoryHeaderVisible;
    if (inventoryHeaderVisible) {
      setHeaderCollapsedForA11yIfNeeded(false);
    }
    headerCollapseProgress.value = withTiming(
      inventoryHeaderVisible ? 0 : 1,
      {
        duration: INVENTORY_CHROME_ANIMATION_MS,
        easing: inventoryChromeReanimatedEasing,
      },
      (finished) => {
        if (finished && !inventoryHeaderVisible) {
          runOnJS(setHeaderCollapsedForA11yIfNeeded)(true);
        }
      },
    );
  }, [
    headerCollapseProgress,
    inventoryHeaderVisible,
    setHeaderCollapsedForA11yIfNeeded,
  ]);

  const resetInventoryChrome = React.useCallback(() => {
    setInventoryHeaderVisibleTarget(true);
    setHeaderCollapsedForA11y(false);
    headerVisibleRef.current = true;
    lastInventoryScrollYRef.current = 0;
    lastRawInventoryScrollYRef.current = 0;
    upwardScrollIntentRef.current = 0;
    inventoryScrollPhaseRef.current = 'idle';
    lastInventoryScrollDirectionRef.current = null;
    momentumRevealAllowedRef.current = false;
    suppressRevealUntilNextDragRef.current = false;
    setChromeVisibility(INVENTORY_CHROME_SURFACE, 'shown');
  }, [setChromeVisibility]);

  // (removed) Suggested/AI-pick card logic (Plan now owns primary scheduling flow)

  // When an activity is created that doesn't match current filters, we "ghost" it
  // (keep it visible during this session). This tracks the last such ID to trigger a guide.
  const [postCreateGhostId, setPostCreateGhostId] = React.useState<string | null>(null);
  const [ghostWarningVisible, setGhostWarningVisible] = React.useState(false);

  React.useEffect(() => {
    enrichingActivityIdsRef.current = enrichingActivityIds;
  }, [enrichingActivityIds]);

  const markActivityEnrichment = React.useCallback((activityId: string, isEnriching: boolean) => {
    useActivityEnrichmentStore.getState().markActivityEnrichment(activityId, isEnriching);
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

  const quickAddCompactBottomOffsetPx = Math.max(insets.bottom + spacing.sm, spacing.md);
  const quickAddDockBottomOffsetPx = isKanbanLayout
    ? 0
    : quickAddCompactBottomOffsetPx;
  const quickAddInitialReservedHeight = isKanbanLayout
    ? 0
    : QUICK_ADD_BAR_HEIGHT + quickAddDockBottomOffsetPx + spacing.xs;
  const quickAddLocationTriggersEnabled =
    Boolean(locationOfferPreferences.enabled) &&
    locationOfferPreferences.osPermissionStatus === 'authorized';
  const [pendingQuickAddLocationRecommendation, setPendingQuickAddLocationRecommendation] =
    React.useState<QuickAddLocationTriggerRecommendation | null>(null);

  const handleUseQuickAddLocationTrigger = React.useCallback(async () => {
    const pending = pendingQuickAddLocationRecommendation;
    if (!pending) return;

    const granted = await LocationPermissionService.ensurePermissionWithRationale('location_offers');
    const nextStatus = await LocationPermissionService.syncOsPermissionStatus().catch(() => 'unavailable' as const);
    const enabled = granted && nextStatus === 'authorized';
    setLocationOfferPreferences((current) => ({
      ...current,
      enabled,
      osPermissionStatus: nextStatus,
    }));

    if (enabled) {
      const nextUpdatedAt = new Date().toISOString();
      updateActivity(pending.activityId, (activity) => ({
        ...activity,
        location: pending.location,
        updatedAt: nextUpdatedAt,
      }));
      showToast({ message: 'Location trigger ready', variant: 'success', durationMs: 2200 });
    } else {
      showToast({
        message: 'Location triggers are off. The to-do is still saved.',
        variant: 'warning',
        durationMs: 2600,
      });
    }

    setPendingQuickAddLocationRecommendation(null);
  }, [
    pendingQuickAddLocationRecommendation,
    setLocationOfferPreferences,
    showToast,
    updateActivity,
  ]);

  const quickAddDefaultsFromFilters = React.useMemo<Partial<Activity>>(
    () => buildQuickAddDefaultsFromFilters({ filterGroups, activeTagGroupLabel }),
    [activeTagGroupLabel, filterGroups],
  );

  const effectiveQuickAddAiActions = React.useMemo(
    () =>
      canUseUnsplash
        ? quickAddAiActions
        : quickAddAiActions.filter((action) => action !== 'cover_image'),
    [canUseUnsplash, quickAddAiActions]
  );

  const handleLockedQuickAddAiActionPress = React.useCallback((action: QuickAddAiAction) => {
    if (action !== 'cover_image') return;
    openPaywallInterstitial({ reason: 'pro_only_unsplash_banners', source: 'activity_banner_sheet' });
  }, []);

  const findQuickAddCoverImageWithAI = React.useCallback(
    async (params: {
      activityId: string;
      title: string;
      goalId: string | null;
      activityType?: string;
      existingTags?: string[];
    }) => {
      return findActivityCoverImageWithAI({
        title: params.title,
        goalId: params.goalId,
        activityType: params.activityType,
        existingTags: params.existingTags,
        goals,
        arcs,
        canUseUnsplash,
      });
    },
    [arcs, canUseUnsplash, goals]
  );

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
    reminderSource: quickAddReminderSource,
    setReminderSource: setQuickAddReminderSource,
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
    getNextOrderIndex: () => {
      // Prepend to the top of the *currently visible* list so newly created activities
      // reliably appear at the top (and match the post-create scroll-to-top behavior).
      //
      // Note: We only consider numeric `orderIndex` values. Items without an `orderIndex`
      // are treated as "last" by the manual fallback sort, so using min-1 is the most
      // stable way to ensure the new item is first.
      let min = Number.POSITIVE_INFINITY;
      for (const a of activeActivities) {
        const v =
          typeof a.orderIndex === 'number' && Number.isFinite(a.orderIndex) ? a.orderIndex : null;
        if (v == null) continue;
        if (v < min) min = v;
      }
      return Number.isFinite(min) ? min - 1 : 0;
    },
    getActivityDefaults: () => quickAddDefaultsFromFilters,
    goals,
    addActivity,
    updateActivity,
    recordShowUp,
    showToast: wrappedShowToast,
    initialReservedHeightPx: quickAddInitialReservedHeight,
    focusAfterSubmit: false,
    locationTriggersEnabled: quickAddLocationTriggersEnabled,
    onLocationTriggerRecommended: setPendingQuickAddLocationRecommendation,
    onCreated: (activity) => {
      lastCreatedActivityRef.current = activity;
      setSessionCreatedContextById((prev) => ({ ...prev, [activity.id]: ghostContextKey }));
      pendingScrollToActivityIdRef.current = activity.id;

      // Check if this new activity matches current filters
      const matches =
        QueryService.applyActivityFilters(
          [activity],
          filterGroups,
          effectiveFilterGroupLogic,
        ).length > 0;

      if (!matches && filterGroups.length > 0) {
        setPostCreateGhostId(activity.id);
      }

      capture(AnalyticsEvent.ActivityCreated, {
        source: 'quick_add',
        activity_id: activity.id,
        goal_id: null,
        has_due_date: Boolean(activity.scheduledDate),
        has_reminder: Boolean(activity.reminderAt),
        has_estimate: Boolean(activity.estimateMinutes),
      });
    },
    enrichActivityWithAI,
    findCoverImageWithAI: findQuickAddCoverImageWithAI,
    markActivityEnrichment,
    tryConsumeGenerativeCredit,
    aiCreditTier: isPro ? 'pro' : 'free',
    onAiCreditsExhausted: () => {
      openPaywallInterstitial({ reason: 'generative_quota_exceeded', source: 'activity_quick_add_ai' });
    },
  });

  const kanbanAddCardAnchorRef = React.useRef<any>(null);

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
  const quickAddChromeLocked =
    isQuickAddFocused ||
    quickAddReminderSheetVisible ||
    quickAddDueDateSheetVisible ||
    quickAddRepeatSheetVisible ||
    quickAddEstimateSheetVisible;

  React.useEffect(() => {
    setChromeInteractionLock(INVENTORY_CHROME_SURFACE, quickAddChromeLocked);
    if (quickAddChromeLocked) {
      resetInventoryChrome();
    }
    return () => setChromeInteractionLock(INVENTORY_CHROME_SURFACE, false);
  }, [quickAddChromeLocked, resetInventoryChrome, setChromeInteractionLock]);

  React.useEffect(() => {
    setChromeAutoHideEnabled(INVENTORY_CHROME_SURFACE, shouldRegisterInventoryChrome);
    const isAtTop = lastInventoryScrollYRef.current <= INVENTORY_CHROME_TOP_REVEAL_THRESHOLD_PX;
    if (!shouldRegisterInventoryChrome || (!shouldAutoHideInventoryChrome && isAtTop)) {
      resetInventoryChrome();
    }
  }, [
    resetInventoryChrome,
    setChromeAutoHideEnabled,
    setChromeVisibility,
    shouldAutoHideInventoryChrome,
    shouldRegisterInventoryChrome,
  ]);

  React.useEffect(() => {
    return () => {
      setChromeAutoHideEnabled(INVENTORY_CHROME_SURFACE, false);
      setChromeVisibility(INVENTORY_CHROME_SURFACE, 'shown');
    };
  }, [setChromeAutoHideEnabled, setChromeVisibility]);

  React.useEffect(() => {
    const quickAddOwnsBottomFade = doesQuickAddOwnInventoryBottomFade({ isKanbanLayout });
    setChromeBottomFadeSuppressed(INVENTORY_CHROME_SURFACE, quickAddOwnsBottomFade);
    return () => setChromeBottomFadeSuppressed(INVENTORY_CHROME_SURFACE, false);
  }, [isKanbanLayout, setChromeBottomFadeSuppressed]);

  const canvasScrollRef = React.useRef<FlatList<Activity> | null>(null);
  const pendingScrollToActivityIdRef = React.useRef<string | null>(null);
  const { keyboardHeight, lastKnownKeyboardHeight } = useKeyboardHeight();

  // When switching to Kanban, remove the quick-add dock + its reserved scroll padding.
  // When switching back to list, restore a safe initial reserved height until the dock measures itself.
  React.useEffect(() => {
    if (isKanbanLayout) {
      setQuickAddFocused(false);
      collapseQuickAdd();
      setQuickAddReservedHeight(0);

      setQuickAddReminderSheetVisible(false);
      setQuickAddDueDateSheetVisible(false);
      setQuickAddRepeatSheetVisible(false);
      setQuickAddEstimateSheetVisible(false);
      setQuickAddIsDueDatePickerVisible(false);
      setKanbanCardFieldsDrawerVisible(false);
      return;
    }

    setQuickAddReservedHeight((prev) => (prev === 0 ? quickAddInitialReservedHeight : prev));
    setKanbanCardFieldsDrawerVisible(false);
  }, [
    collapseQuickAdd,
    isKanbanLayout,
    quickAddInitialReservedHeight,
    setQuickAddFocused,
    setQuickAddReservedHeight,
    setKanbanCardFieldsDrawerVisible,
  ]);

  // (removed) deep-link highlight behavior for the deleted suggested card

  const guideVariant = activities.length > 0 ? 'full' : 'empty';
  const guideTotalSteps = guideVariant === 'full' ? 3 : 1;
  const shouldShowActivitiesListGuide =
    isFocused &&
    !hasDismissedActivitiesListGuide &&
    !activityCoachVisible &&
    !viewEditorVisible &&
    !isPlanKickoffVisible &&
    (guideVariant === 'empty' || activitiesScreenVisitCount >= 2);

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
      ? isKanbanLayout
        ? kanbanAddCardAnchorRef
        : quickAddInputRef
      : activitiesGuideStep === 0
      ? viewsButtonRef
      : activitiesGuideStep === 1
      ? filterButtonRef
      : sortButtonRef;

  const guideCopy = React.useMemo(() => {
    if (guideVariant === 'empty') {
      return {
        title: 'Start here',
        body: isKanbanLayout
          ? 'Use “Add card” in a column to add your first to-do. Then use Plan to schedule it for Today. Once you have a few, Pro Tools lets you use Views, Filters, and Sort to stay focused.'
          : 'Use the field at the bottom to add your first to-do. Then use Plan to schedule it for Today. Once you have a few, Pro Tools lets you use Views, Filters, and Sort to stay focused.',
      };
    }
    if (activitiesGuideStep === 0) {
      return {
        title: isPro ? 'Save a View' : 'Views (Pro)',
        body: isPro
          ? 'A View remembers your Filter + Sort. Try “This week” or “Starred only.”'
          : 'Save Filter + Sort combos so you can switch contexts fast.',
      };
    }
    if (activitiesGuideStep === 1) {
      return {
        title: isPro ? 'Filter' : 'Filter (Pro)',
        body: isPro
          ? 'Show All, Active, Completed, or just ★ Starred items.'
          : 'Narrow the list to Active, Completed, or Starred.',
      };
    }
    return {
      title: isPro ? 'Sort' : 'Sort (Pro)',
      body: isPro
        ? 'Use Priority for Kwilt’s current order, due date for schedule order, or Manual for your own arrangement.'
        : 'Order by title, due date, or Kwilt priority.',
    };
  }, [activitiesGuideStep, guideVariant, isKanbanLayout, isPro]);

  const activityById = React.useMemo(() => {
    const map = new Map<string, Activity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const navigateToActivityDetail = React.useCallback(
    (activityId: string) => {
      // Prevent rapid taps from stacking duplicate ActivityDetail screens.
      if (!canOpenActivityDetail()) {
        return;
      }
      navigation.push('ActivityDetail', { activityId });
    },
    [canOpenActivityDetail, navigation],
  );

  const openActivityFocus = React.useCallback(
    (activityId: string) => {
      if (!canOpenActivityDetail()) {
        return;
      }
      navigation.push('ActivityDetail', { activityId, openFocus: true });
    },
    [canOpenActivityDetail, navigation],
  );

  const openActivitySchedule = React.useCallback(
    (activityId: string) => {
      if (!canOpenActivityDetail()) {
        return;
      }
      navigation.push('ActivityDetail', { activityId, openSchedule: true });
    },
    [canOpenActivityDetail, navigation],
  );

  const handleDeleteActivity = React.useCallback(
    (activity: Activity, source: string = 'activities_list_swipe') => {
      const undoSnapshot =
        buildActivityDeleteUndoSnapshot(activities, activity.id) ?? {
          activity,
          relatedActivities: [],
          originalIndex: activities.length,
        };

      void HapticsService.trigger('canvas.destructive.confirm');
      removeActivity(activity.id);
      capture(AnalyticsEvent.ActivityActionInvoked, {
        activityId: activity.id,
        action: 'delete',
        source,
      });
      showToast({
        message: 'To-do deleted',
        variant: 'light',
        durationMs: 5000,
        actionLabel: 'Undo',
        actionOnPress: () => {
          restoreRemovedActivity(undoSnapshot);
          void HapticsService.trigger('canvas.step.undo');
          capture(AnalyticsEvent.ActivityActionInvoked, {
            activityId: activity.id,
            action: 'delete_undo',
            source,
          });
        },
      });
    },
    [activities, capture, removeActivity, restoreRemovedActivity, showToast],
  );

  // (moved) reorder mode handlers are declared below `handleUpdateSortMode`

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

  // NOTE: We intentionally avoid blurring the quick-add input on keyboard hide.
  // On iOS, keyboard show/hide transitions can fire events that cause a just-focused
  // TextInput to immediately blur, making the quick-add dock feel “broken”.

  // handleQuickAddActivity is provided by `useQuickAddDockController`.

  // Show the filter warning guide once the quick-add dock is collapsed, so it
  // doesn't compete with rapid entry (keyboard-open flow).
  React.useEffect(() => {
    if (ghostWarningVisible) return;
    if (isQuickAddFocused) return;
    if (activityCoachVisible || viewEditorVisible) return;
    const pendingId = postCreateGhostId;
    if (!pendingId) return;
    // Ensure the activity still exists (it might have been deleted).
    if (!activities.some((a) => a.id === pendingId)) {
      setPostCreateGhostId(null);
      return;
    }
    setGhostWarningVisible(true);
  }, [
    activities,
    activityCoachVisible,
    isQuickAddFocused,
    postCreateGhostId,
    ghostWarningVisible,
    viewEditorVisible,
  ]);

  const dismissGhostWarning = React.useCallback(() => {
    setGhostWarningVisible(false);
    setPostCreateGhostId(null);
  }, []);

  const handleRefreshView = React.useCallback(() => {
    // Determine how many items will be hidden
    const ghostedIds = Array.from(sessionCreatedIdsForGhostContext).filter((id) => {
      const activity = activities.find((a) => a.id === id);
      if (!activity) return false;
      const matches =
        QueryService.applyActivityFilters(
          [activity],
          filterGroups,
          effectiveFilterGroupLogic,
        ).length > 0;
      return !matches;
    });

    // Clear ghost state for this *specific* view/filter context (so it doesn't leak across views).
    setSessionCreatedContextById((prev) => {
      const next = { ...prev };
      for (const id of sessionCreatedIdsForGhostContext) {
        if (next[id] === ghostContextKey) delete next[id];
      }
      return next;
    });
    setPostCreateGhostId(null);
    setGhostWarningVisible(false);

    if (ghostedIds.length > 0) {
      showToast({
        message: `${ghostedIds.length} ${ghostedIds.length === 1 ? 'activity' : 'activities'} hidden by filters`,
        variant: 'default',
      });
    }
  }, [
    activities,
    filterGroups,
    effectiveFilterGroupLogic,
    ghostContextKey,
    sessionCreatedIdsForGhostContext,
    showToast,
  ]);

  // After creating a new activity, scroll so it becomes visible.
  // - If it's at/near the top (common when manual ordering prepends), scroll to top.
  // - Otherwise, scroll directly to the item's index (e.g. when sorting by title/due date/etc.).
  React.useEffect(() => {
    const pendingId = pendingScrollToActivityIdRef.current;
    if (!pendingId) return;
    const index = activeActivities.findIndex((a) => a.id === pendingId);
    if (index < 0) return;

    pendingScrollToActivityIdRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (index <= 1) {
          canvasScrollRef.current?.scrollToOffset({ offset: 0, animated: true });
          return;
        }
        try {
          canvasScrollRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
        } catch {
          // Best-effort fallback: we'll also handle failures via onScrollToIndexFailed on the list.
          canvasScrollRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      });
    });
  }, [activeActivities]);

  // When the quick-add dock is expanded (keyboard visible), the visible dock surface
  // occludes more of the canvas than the collapsed dock height alone. Add temporary
  // extra padding so the last rows can still scroll above the dock/keyboard.
  const effectiveKeyboardHeight =
    keyboardHeight > 0 ? keyboardHeight : isQuickAddFocused ? lastKnownKeyboardHeight : 0;
  const scrollExtraBottomPadding = isKanbanLayout
    ? 0
    : isQuickAddFocused
      ? quickAddReservedHeight + effectiveKeyboardHeight
      : quickAddReservedHeight;

  const handleInventoryListLayout = React.useCallback((event: any) => {
    setInventoryViewportHeight(event.nativeEvent.layout.height);
  }, []);

  const handleInventoryContentSizeChange = React.useCallback((_width: number, height: number) => {
    setInventoryContentHeight(height);
  }, []);

  const getInventoryMaxScrollY = React.useCallback(() => (
    Math.max(0, inventoryContentHeight - inventoryViewportHeight)
  ), [inventoryContentHeight, inventoryViewportHeight]);

  const handleInventoryScrollBeginDrag = React.useCallback(() => {
    inventoryScrollPhaseRef.current = 'dragging';
    lastInventoryScrollDirectionRef.current = null;
    momentumRevealAllowedRef.current = false;
    suppressRevealUntilNextDragRef.current = false;

    const effect = getInventoryChromeDragStartEffect({
      canAutoHide: shouldAutoHideInventoryChrome,
      locked: quickAddChromeLocked,
      y: lastInventoryScrollYRef.current,
    });
    if (!effect) return;

    upwardScrollIntentRef.current = 0;
    notifyChromeScrollIntent(INVENTORY_CHROME_SURFACE, effect.direction, 0);
    setInventoryHeaderVisible(effect.visible);
  }, [
    notifyChromeScrollIntent,
    quickAddChromeLocked,
    setInventoryHeaderVisible,
    shouldAutoHideInventoryChrome,
  ]);

  const handleInventoryScrollOffset = React.useCallback(
    (rawY: number) => {
      const rawStillMovingDown = rawY >= lastRawInventoryScrollYRef.current - 0.5;
      const result = getInventoryChromeScrollEffect({
        y: rawY,
        lastY: lastInventoryScrollYRef.current,
        canAutoHide: shouldAutoHideInventoryChrome,
        locked: quickAddChromeLocked,
        allowReveal:
          !(inventoryScrollPhaseRef.current === 'momentum' && lastInventoryScrollDirectionRef.current === 'down') &&
          !rawStillMovingDown &&
          !suppressRevealUntilNextDragRef.current &&
          (inventoryScrollPhaseRef.current !== 'momentum' || momentumRevealAllowedRef.current),
        upwardIntent: upwardScrollIntentRef.current,
        maxScrollY: getInventoryMaxScrollY(),
      });

      lastInventoryScrollYRef.current = result.lastY;
      lastRawInventoryScrollYRef.current = Math.max(0, rawY);
      upwardScrollIntentRef.current = result.upwardIntent;
      if (result.scrollDirection) {
        lastInventoryScrollDirectionRef.current = result.scrollDirection;
      }
      if (result.effect?.visible) {
        suppressRevealUntilNextDragRef.current = false;
      }

      if (result.effect) {
        notifyChromeScrollIntent(INVENTORY_CHROME_SURFACE, result.effect.direction, 0);
        setInventoryHeaderVisible(result.effect.visible);
      }
    },
    [
      getInventoryMaxScrollY,
      notifyChromeScrollIntent,
      quickAddChromeLocked,
      setInventoryHeaderVisible,
      shouldAutoHideInventoryChrome,
    ],
  );

  const handleInventoryScroll = React.useCallback((event: InventoryScrollEvent) => {
    handleInventoryScrollOffset(event.nativeEvent.contentOffset.y ?? 0);
  }, [handleInventoryScrollOffset]);

  const handleInventoryMomentumScrollBegin = React.useCallback(() => {
    inventoryScrollPhaseRef.current = 'momentum';
    momentumRevealAllowedRef.current = lastInventoryScrollDirectionRef.current === 'up';
    suppressRevealUntilNextDragRef.current = lastInventoryScrollDirectionRef.current === 'down';
  }, []);

  const applyInventoryScrollSettle = React.useCallback((event: InventoryScrollEvent, final: boolean) => {
    const result = getInventoryChromeSettleEffect({
      y: event?.nativeEvent?.contentOffset?.y,
      lastY: lastInventoryScrollYRef.current,
      canAutoHide: shouldAutoHideInventoryChrome,
      locked: quickAddChromeLocked,
    });

    lastInventoryScrollYRef.current = result.lastY;
    if (typeof event?.nativeEvent?.contentOffset?.y === 'number') {
      lastRawInventoryScrollYRef.current = Math.max(0, event.nativeEvent.contentOffset.y);
    }
    upwardScrollIntentRef.current = result.upwardIntent;

    if (final) {
      inventoryScrollPhaseRef.current = 'idle';
      lastInventoryScrollDirectionRef.current = null;
      momentumRevealAllowedRef.current = false;
      suppressRevealUntilNextDragRef.current = false;
    }

    if (!result.effect) return;

    notifyChromeScrollIntent(INVENTORY_CHROME_SURFACE, result.effect.direction, 0);
    setInventoryHeaderVisible(result.effect.visible);
  }, [
    notifyChromeScrollIntent,
    quickAddChromeLocked,
    setInventoryHeaderVisible,
    shouldAutoHideInventoryChrome,
  ]);

  const handleInventoryScrollEndDrag = React.useCallback((event: InventoryScrollEvent) => {
    inventoryScrollPhaseRef.current = 'idle';
    suppressRevealUntilNextDragRef.current = lastInventoryScrollDirectionRef.current === 'down';
    applyInventoryScrollSettle(event, false);
  }, [applyInventoryScrollSettle]);

  const handleInventoryMomentumScrollEnd = React.useCallback((event: InventoryScrollEvent) => {
    applyInventoryScrollSettle(event, true);
  }, [applyInventoryScrollSettle]);

  const setQuickAddDueDateByOffsetDays = React.useCallback((offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(9, 0, 0, 0);
    const patch = applyDueDateReminderPolicy({
      activity: {
        reminderAt: quickAddReminderAt,
        reminderSource: quickAddReminderSource,
      },
      nextScheduledDate: date.toISOString(),
    });
    setQuickAddScheduledDate(patch.scheduledDate ?? null);
    if ('reminderAt' in patch) setQuickAddReminderAt(patch.reminderAt ?? null);
    if ('reminderSource' in patch) setQuickAddReminderSource(patch.reminderSource);
    closeQuickAddToolDrawer(() => {
      setQuickAddDueDateSheetVisible(false);
      setQuickAddIsDueDatePickerVisible(false);
    });
  }, [
    closeQuickAddToolDrawer,
    quickAddReminderAt,
    quickAddReminderSource,
    setQuickAddReminderAt,
    setQuickAddReminderSource,
    setQuickAddScheduledDate,
  ]);

  const clearQuickAddDueDate = React.useCallback(() => {
    const patch = applyDueDateReminderPolicy({
      activity: {
        reminderAt: quickAddReminderAt,
        reminderSource: quickAddReminderSource,
      },
      nextScheduledDate: null,
    });
    setQuickAddScheduledDate(patch.scheduledDate ?? null);
    if ('reminderAt' in patch) setQuickAddReminderAt(patch.reminderAt ?? null);
    if ('reminderSource' in patch) setQuickAddReminderSource(patch.reminderSource);
    closeQuickAddToolDrawer(() => {
      setQuickAddDueDateSheetVisible(false);
      setQuickAddIsDueDatePickerVisible(false);
    });
  }, [
    closeQuickAddToolDrawer,
    quickAddReminderAt,
    quickAddReminderSource,
    setQuickAddReminderAt,
    setQuickAddReminderSource,
    setQuickAddScheduledDate,
  ]);

  const setQuickAddReminderByOffsetMinutes = React.useCallback((offsetMinutes: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + offsetMinutes);
    setQuickAddReminderAt(date.toISOString());
    setQuickAddReminderSource(REMINDER_SOURCE_MANUAL);
    closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
  }, [closeQuickAddToolDrawer, setQuickAddReminderAt, setQuickAddReminderSource]);

  const clearQuickAddReminder = React.useCallback(() => {
    setQuickAddReminderAt(null);
    setQuickAddReminderSource(quickAddScheduledDate ? REMINDER_SOURCE_MANUAL : undefined);
    closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
  }, [closeQuickAddToolDrawer, quickAddScheduledDate, setQuickAddReminderAt, setQuickAddReminderSource]);

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
      const patch = applyDueDateReminderPolicy({
        activity: {
          reminderAt: quickAddReminderAt,
          reminderSource: quickAddReminderSource,
        },
        nextScheduledDate: next.toISOString(),
      });
      setQuickAddScheduledDate(patch.scheduledDate ?? null);
      if ('reminderAt' in patch) setQuickAddReminderAt(patch.reminderAt ?? null);
      if ('reminderSource' in patch) setQuickAddReminderSource(patch.reminderSource);
      closeQuickAddToolDrawer(() => {
        setQuickAddIsDueDatePickerVisible(false);
        setQuickAddDueDateSheetVisible(false);
      });
    },
    [
      closeQuickAddToolDrawer,
      quickAddReminderAt,
      quickAddReminderSource,
      setQuickAddReminderAt,
      setQuickAddReminderSource,
      setQuickAddScheduledDate,
    ],
  );

  const handleToggleComplete = React.useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      let didFireHaptic = false;
      let wasFirstCompletion = false;
      let completionUndoSnapshot: ActivityCompletionUndoSnapshot | null = null;
      let completedActivity: Activity | null = null;
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
          void HapticsService.trigger(nextIsDone ? 'outcome.bigSuccess' : 'canvas.primary.confirm');
        }
        if (nextIsDone) {
          void playActivityDoneSound();
          wasFirstCompletion = true;
          completionUndoSnapshot = buildActivityCompletionUndoSnapshot(activity);
          completedActivity = activity;
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

      // Celebration checks (run after state update settles)
      if (wasFirstCompletion) {
        const undoSnapshot = completionUndoSnapshot as ActivityCompletionUndoSnapshot | null;
        const activityAtCompletion = completedActivity as Activity | null;
        if (undoSnapshot && activityAtCompletion) {
          showToast({
            message: 'To-do complete',
            variant: 'light',
            durationMs: 5000,
            actionLabel: 'Undo',
            actionOnPress: () => {
              const restoredAt = new Date().toISOString();
              let didRestore = false;
              LayoutAnimation.configureNext(
                LayoutAnimation.create(
                  220,
                  LayoutAnimation.Types.easeInEaseOut,
                  LayoutAnimation.Properties.opacity,
                ),
              );
              updateActivity(activityId, (current) => {
                const result = restoreActivityCompletionFromSnapshot({
                  activity: current,
                  snapshot: undoSnapshot,
                  representedCompletedAt: timestamp,
                  restoredAt,
                });
                didRestore = result.didRestore;
                return result.activity;
              });
              if (!didRestore) return;
              void HapticsService.trigger('canvas.step.undo');
              capture(AnalyticsEvent.ActivityCompletionToggled, {
                source: 'activities_list',
                activity_id: activityId,
                goal_id: activityAtCompletion.goalId ?? null,
                next_status: undoSnapshot.status,
                had_steps: Boolean(activityAtCompletion.steps && activityAtCompletion.steps.length > 0),
              });
            },
          });
        }

        // Record the show-up (this also triggers daily streak celebration if milestone)
        recordShowUpWithCelebration();
        useAppStore.getState().recordScreenTimeQualifyingAction({
          action: 'activity_completed',
          occurredAt: new Date(timestamp),
        });
        reconcileScreenTimeRestrictions({ focusSessionActive: false, now: new Date(timestamp) }).catch(() => undefined);

        // Check if this is the user's very first completed activity
        const { hasBeenShown } = useCelebrationStore.getState();
        if (!hasBeenShown('first-activity-ever')) {
          // Check if there were any previously completed activities
          const completedActivities = activities.filter((a) => a.status === 'done');
          if (completedActivities.length === 0) {
            // This is their first activity completion ever!
            setTimeout(() => celebrateFirstActivity(), 600);
          }
        }

        // Check if all scheduled activities for today are now done
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const todayActivities = activities.filter((a) => {
          if (!a.scheduledDate) return false;
          const scheduled = new Date(a.scheduledDate);
          return scheduled >= todayStart && scheduled < todayEnd;
        });

        // After this completion, all today's activities are done
        const remainingIncomplete = todayActivities.filter(
          (a) => a.id !== activityId && a.status !== 'done' && a.status !== 'skipped' && a.status !== 'cancelled'
        );

        if (todayActivities.length >= 3 && remainingIncomplete.length === 0) {
          // All done for today! (only if they had 3+ activities planned)
          const celebrationId = `all-done-${todayStart.toISOString().slice(0, 10)}`;
          if (!hasBeenShown(celebrationId)) {
            setTimeout(() => celebrateAllActivitiesDone(), 800);
          }
        }

        // Check-in nudge for activities under shared goals
        const activityGoalId = activityAtCompletion?.goalId;
        if (activityGoalId) {
          void queueCheckinDraftFromProgress({
            goalId: activityGoalId,
            trigger: 'activity_complete',
            source: 'activities_list',
            sourceType: 'activity',
            sourceId: activityId,
            title: activityAtCompletion?.title ?? '',
            completedAt: timestamp,
            openPromptDelayMs: 1200,
            capture,
          });
        }
      }
    },
    [activities, capture, showToast, updateActivity],
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
      const target = activityViews.find((v) => v.id === viewId);
      const isSystem = target?.isSystem === true;
      if (!isPro && !isSystem) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_views' });
        return;
      }
      // Haptic only when the view actually changes.
      if (viewId !== activeActivityViewId) {
        void HapticsService.trigger('canvas.selection');
      }
      setActiveTagGroupTag(null);
      setActiveActivityViewId(viewId);
    },
    [activeActivityViewId, activityViews, isPro, setActiveActivityViewId],
  );

  const applyTagGroup = React.useCallback(
    (tag: string) => {
      const cleanTag = tag.trim();
      if (!cleanTag) return;
      if (activeTagGroupLabel !== cleanTag || effectiveActiveViewId !== 'default') {
        void HapticsService.trigger('canvas.selection');
      }
      setActiveActivityViewId('default');
      setActiveTagGroupTag(cleanTag);
      setTagGroupsDrawerVisible(false);
    },
    [activeTagGroupLabel, effectiveActiveViewId, setActiveActivityViewId],
  );

  const clearTagGroup = React.useCallback(() => {
    if (activeTagGroupLabel) {
      void HapticsService.trigger('canvas.selection');
    }
    setActiveTagGroupTag(null);
    setTagGroupsDrawerVisible(false);
  }, [activeTagGroupLabel]);

  const goalIdSet = React.useMemo(() => new Set(goals.map((g) => g.id)), [goals]);

  const getKanbanColumnIdForActivity = React.useCallback((activity: Activity, groupBy: KanbanGroupBy): string => {
    switch (groupBy) {
      case 'status':
        return activity.status;
      case 'priority':
        return activity.priority === 1 ? 'starred' : 'normal';
      case 'goal':
        return activity.goalId ?? 'no-goal';
      case 'phase':
        return activity.phase ?? 'no-phase';
      default:
        return activity.status;
    }
  }, []);

  const handleMoveActivity = React.useCallback(
    (activityId: string, params: { groupBy: KanbanGroupBy; toColumnId: string }) => {
      const { groupBy, toColumnId } = params;
      const atIso = new Date().toISOString();

      updateActivity(activityId, (activity) => {
        const fromColumnId = getKanbanColumnIdForActivity(activity, groupBy);
        if (fromColumnId === toColumnId) return activity;

        const patch: Partial<Activity> = {};
        if (groupBy === 'status') {
          patch.status = toColumnId as Activity['status'];
          // Keep completedAt consistent with done/not-done transitions.
          if (toColumnId === 'done') {
            patch.completedAt = activity.completedAt ?? atIso;
          } else if (activity.status === 'done') {
            patch.completedAt = null;
          }
        } else if (groupBy === 'priority') {
          patch.priority = toColumnId === 'starred' ? 1 : undefined;
        } else if (groupBy === 'goal') {
          if (toColumnId === 'no-goal') {
            patch.goalId = null;
          } else if (goalIdSet.has(toColumnId)) {
            patch.goalId = toColumnId;
          } else {
            // Unknown goal id (likely stale UI) - ignore.
            return activity;
          }
        } else if (groupBy === 'phase') {
          patch.phase = toColumnId === 'no-phase' ? null : toColumnId;
        }

        // Place the activity at the end of the destination column.
        const maxOrderInTarget = activities
          .filter((a) => a.id !== activityId)
          .filter((a) => getKanbanColumnIdForActivity(a, groupBy) === toColumnId)
          .reduce((max, a) => {
            const v = typeof a.orderIndex === 'number' ? a.orderIndex : -1;
            return Math.max(max, v);
          }, -1);

        return {
          ...activity,
          ...patch,
          orderIndex: maxOrderInTarget + 1,
          updatedAt: atIso,
        };
      });
    },
    [activities, getKanbanColumnIdForActivity, goalIdSet, updateActivity],
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
    if (!isPro) {
      openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_views' });
      return;
    }
    // Open the new inline view creator instead of the old dialog
    setViewCreatorVisible(true);
  }, [isPro]);

  // Handler for creating a view from a template
  const handleCreateViewFromTemplate = React.useCallback(
    (view: ActivityView) => {
      addActivityView(view);
      setActiveActivityViewId(view.id);
      setViewCreatorVisible(false);
      void HapticsService.trigger('canvas.selection');
      // Show the customization guide after a brief delay
      setNewlyCreatedView(view);
      setTimeout(() => setCustomizationGuideVisible(true), 300);
    },
    [addActivityView, setActiveActivityViewId],
  );

  // Handler for applying a preset to a view
  const handleApplyPreset = React.useCallback(
    (viewId: string, preset: ViewPreset) => {
      updateActivityView(viewId, (view) => ({
        ...view,
        filters: preset.filters ?? view.filters,
        sorts: preset.sorts ?? view.sorts,
        showCompleted: preset.showCompleted ?? view.showCompleted,
      }));
      showToast({ message: `Applied "${preset.label}"`, variant: 'success' });
    },
    [updateActivityView, showToast],
  );

  // Handler for applying AI customization to a view
  const handleApplyAiCustomization = React.useCallback(
    async (viewId: string, prompt: string) => {
      setIsApplyingAiCustomization(true);
      try {
        const result = await createViewFromPrompt(prompt);
        if (result.success) {
          // Apply the AI-generated filters/sorts to the existing view
          updateActivityView(viewId, (view) => ({
            ...view,
            filters: result.view.filters ?? view.filters,
            sorts: result.view.sorts ?? view.sorts,
            showCompleted: result.view.showCompleted ?? view.showCompleted,
          }));
          setCustomizationGuideVisible(false);
          void HapticsService.trigger('canvas.selection');
          showToast({ message: 'View customized', variant: 'success' });
        } else {
          showToast({ message: result.error, variant: 'danger' });
        }
      } catch (error) {
        showToast({ message: 'Failed to customize view. Please try again.', variant: 'danger' });
      } finally {
        setIsApplyingAiCustomization(false);
      }
    },
    [updateActivityView, showToast],
  );

  // Legacy handler for opening the view editor dialog (for settings mode)
  const handleOpenViewEditorDialog = React.useCallback(() => {
    setViewEditorMode('create');
    setViewEditorTargetId(null);
    setViewEditorName('New view');
    setViewEditorLayout('list');
    setViewEditorKanbanGroupBy('status');
    setViewEditorVisible(true);
  }, []);

  const handleOpenViewSettings = React.useCallback(
    (view: ActivityView) => {
      if (!isPro) {
        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_views' });
        return;
      }
      setViewEditorMode('settings');
      setViewEditorTargetId(view.id);
      setViewEditorName(view.name);
      setViewEditorLayout(view.layout ?? 'list');
      setViewEditorKanbanGroupBy(view.kanbanGroupBy ?? 'status');
      setViewEditorVisible(true);
    },
    [isPro],
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
        layout: viewEditorLayout,
        kanbanGroupBy: viewEditorLayout === 'kanban' ? viewEditorKanbanGroupBy : undefined,
        grouping: { field: 'none', collapsedGroupKeys: [] },
        isSystem: false,
      };
      addActivityView(nextView);
      setActiveActivityViewId(id);
    } else if (viewEditorMode === 'settings' && viewEditorTargetId) {
      updateActivityView(viewEditorTargetId, (view) => ({
        ...view,
        name: trimmedName,
        layout: viewEditorLayout,
        kanbanGroupBy: viewEditorLayout === 'kanban' ? viewEditorKanbanGroupBy : undefined,
      }));
    }

    setViewEditorVisible(false);
  }, [
    addActivityView,
    setActiveActivityViewId,
    updateActivityView,
    viewEditorMode,
    viewEditorName,
    viewEditorLayout,
    viewEditorKanbanGroupBy,
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
        layout: view.layout,
        kanbanGroupBy: view.kanbanGroupBy,
        grouping: view.grouping,
        filters: view.filters,
        filterGroupLogic: view.filterGroupLogic,
        sorts: view.sorts,
        showCompleted: view.showCompleted,
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

  const openWidgetSetup = React.useCallback(
    (surface: 'inline' | 'modal') => {
      capture(AnalyticsEvent.WidgetPromptCtaTapped, {
        surface,
        app_open_count: appOpenCount ?? 0,
      });
      setWidgetModalVisible(false);
      // Navigate into the Settings stack without breaking the shell/canvas structure.
      (navigation as any).navigate('Settings', { screen: 'SettingsWidgets' });
    },
    [appOpenCount, capture, navigation],
  );

  const handleDismissWidgetPrompt = React.useCallback(
    (surface: 'inline' | 'modal') => {
      dismissWidgetPrompt(surface);
      capture(AnalyticsEvent.WidgetPromptDismissed, {
        surface,
        app_open_count: appOpenCount ?? 0,
      });
      setWidgetModalVisible(false);
    },
    [appOpenCount, capture, dismissWidgetPrompt],
  );

  // (temporary) handleResetView removed

  const activityListHeader = (
    <>
      {shouldShowWidgetNudgeInline && (
        <Card style={styles.widgetNudgeCard}>
          <HStack justifyContent="space-between" alignItems="flex-start" space="sm">
            <VStack flex={1} space="xs">
              <HStack alignItems="center" space="xs">
                <Icon name="home" size={16} color={colors.textPrimary} />
                <Text style={styles.widgetNudgeTitle}>Add a Kwilt widget</Text>
              </HStack>
              <Text style={styles.widgetNudgeBody}>
                {widgetCopyVariant === 'start_focus_faster'
                  ? 'Start Focus with fewer taps.'
                  : 'See Today at a glance and jump in faster.'}
              </Text>
            </VStack>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss widget prompt"
              hitSlop={10}
              onPress={() => handleDismissWidgetPrompt('inline')}
            >
              <Icon name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          </HStack>
          <HStack justifyContent="flex-end" alignItems="center" space="sm" style={{ marginTop: spacing.sm }}>
            <Button variant="secondary" size="sm" onPress={() => openWidgetSetup('inline')}>
              <ButtonLabel size="sm">Set up widget</ButtonLabel>
            </Button>
          </HStack>
        </Card>
      )}
    </>
  );

  const handleCoachAddActivity = React.useCallback(
    (activity: Activity) => {
      lastCreatedActivityRef.current = activity;
      setSessionCreatedContextById((prev) => ({ ...prev, [activity.id]: ghostContextKey }));

      const matches =
        QueryService.applyActivityFilters(
          [activity],
          filterGroups,
          effectiveFilterGroupLogic,
        ).length > 0;

      if (!matches && filterGroups.length > 0) {
        setPostCreateGhostId(activity.id);
      }

      addActivity(activity);
    },
    [addActivity, filterGroups, effectiveFilterGroupLogic, ghostContextKey],
  );

  return (
    <AppShell>
      <Animated.View
        style={[styles.collapsibleHeaderAnimatedWrapper, collapsibleHeaderSlotAnimatedStyle]}
        pointerEvents={headerCollapsedForA11y ? 'none' : 'auto'}
        accessibilityElementsHidden={headerCollapsedForA11y}
        importantForAccessibility={headerCollapsedForA11y ? 'no-hide-descendants' : 'auto'}
      >
        <Animated.View style={collapsibleHeaderContentAnimatedStyle}>
          <View
            onLayout={(event) => {
              const h = event.nativeEvent.layout.height;
              if (h <= 0) return;
              setCollapsibleHeaderHeight((prev) => {
                const shouldAcceptHeight =
                  prev === 0 ||
                  headerVisibleRef.current ||
                  h > prev;

                return shouldAcceptHeight && Math.abs(prev - h) > 1 ? h : prev;
              });
            }}
          >
            <PageHeader
              title="To-dos"
              onPressMenu={capabilityShell?.openMenu}
              onPressAvatar={() => (navigation as any).navigate('Settings', { screen: 'SettingsHome' })}
              avatarName={avatarName}
              avatarUrl={avatarUrl}
              streakCount={currentShowUpStreak ?? 0}
              streakShowedUpToday={showedUpToday}
              shieldCount={shieldCount}
              repairWindowActive={repairWindowActive}
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
                ) : null
              }
            >
              {focusContextGoalId ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ ...typography.bodySm, color: colors.textSecondary }}>
                    Focus Filter: {goalTitleById[focusContextGoalId] ?? 'Goal'}
                  </Text>
                  <Button
                    variant="secondary"
                    size="xs"
                    accessibilityLabel="Clear Focus Filter"
                    onPress={() => setFocusContextGoalId(null)}
                  >
                    <ButtonLabel size="xs">Clear</ButtonLabel>
                  </Button>
                </View>
              ) : null}
            </PageHeader>
          </View>
        </Animated.View>
      </Animated.View>
      <Coachmark
        visible={activitiesGuideHost.coachmarkVisible}
        targetRef={guideTargetRef}
        remeasureKey={activitiesGuideHost.remeasureKey}
        scrimToken="subtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius="auto"
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
      <Dialog
        visible={widgetModalVisible}
        onClose={() => handleDismissWidgetPrompt('modal')}
        title="Add a Kwilt widget"
        description="Put Today and your next step on your Home Screen or Lock Screen."
      >
        <VStack space="md">
          <Text style={styles.widgetModalBody}>
            After you add it, tapping the widget should open Kwilt directly to Today or your next To-do.
          </Text>
          <HStack justifyContent="space-between" alignItems="center">
            <Button variant="secondary" onPress={() => handleDismissWidgetPrompt('modal')}>
              <ButtonLabel>Not now</ButtonLabel>
            </Button>
            <Button onPress={() => openWidgetSetup('modal')}>
              <ButtonLabel tone="inverse">Set up widget</ButtonLabel>
            </Button>
          </HStack>
        </VStack>
      </Dialog>
      <Animated.View style={[styles.inventoryBody, inventoryBodyAnimatedStyle]}>
        {/* Toolbar and suggestions rendered outside scroll views so they stay fixed when scrolling */}
        <View style={styles.inventoryToolbarLayer}>
          {activities.length > 0 && (
            <Animated.View
              style={[
                styles.fixedToolbarAnimatedWrapper,
                fixedToolbarAnimatedStyle,
              ]}
              pointerEvents={shouldShowFixedToolbar ? 'auto' : 'none'}
              accessibilityElementsHidden={!shouldShowFixedToolbar}
              importantForAccessibility={shouldShowFixedToolbar ? 'auto' : 'no-hide-descendants'}
            >
              <View
                style={styles.fixedToolbarContainer}
                onLayout={(e) => {
                  if (!shouldShowFixedToolbar) return;
                  const h = e.nativeEvent.layout.height;
                  // Ignore tiny heights that can happen during animation/clipping.
                  if (h >= 40) {
                    // Capture the "natural" toolbar height (including padding) while visible.
                    setFixedToolbarMeasuredHeight((prev) => (prev === 0 || Math.abs(prev - h) > 1 ? h : prev));
                  }
                }}
          >
            <HStack
              style={styles.toolbarRow}
              alignItems="center"
              justifyContent="space-between"
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h >= 32) {
                  setFixedToolbarVisualHeight((prev) => (prev === 0 || Math.abs(prev - h) > 1 ? h : prev));
                }
              }}
            >
              <View style={styles.toolbarButtonWrapper}>
                {isPro ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      testID="e2e.activities.toolbar.views"
                      accessibilityRole="button"
                      accessibilityLabel="Views menu"
                    >
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
                            {activeTagGroupLabel ?? activeView?.name ?? 'All to-dos'}
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
                            <Icon name="plus" size={16} color={colors.textSecondary} />
                            <Text style={styles.menuItemText} {...menuItemTextProps}>
                              New view
                            </Text>
                          </HStack>
                        </DropdownMenuItem>
                        <TagGroupMenuItems
                          tagGroups={tagGroups}
                          activeTagGroupLabel={activeTagGroupLabel}
                          onApplyTagGroup={applyTagGroup}
                          onClearTagGroup={clearTagGroup}
                          onViewAllTags={() => setTagGroupsDrawerVisible(true)}
                        />
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      testID="e2e.activities.toolbar.views"
                      accessibilityRole="button"
                      accessibilityLabel="Views"
                    >
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
                            {activeTagGroupLabel ?? activeView?.name ?? 'All to-dos'}
                          </Text>
                        </HStack>
                      </Button>
                    </DropdownMenuTrigger>
                    {!viewEditorVisible && (
                      <DropdownMenuContent side="bottom" sideOffset={4} align="start">
                        {systemViews.map((view) => (
                          <DropdownMenuItem key={view.id} onPress={() => applyView(view.id)}>
                            <HStack alignItems="center" space="xs">
                              <Text style={styles.menuItemText} {...menuItemTextProps}>
                                {view.name}
                              </Text>
                            </HStack>
                          </DropdownMenuItem>
                        ))}
                        <TagGroupMenuItems
                          tagGroups={tagGroups}
                          activeTagGroupLabel={activeTagGroupLabel}
                          onApplyTagGroup={applyTagGroup}
                          onClearTagGroup={clearTagGroup}
                          onViewAllTags={() => setTagGroupsDrawerVisible(true)}
                        />
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                )}
              </View>

              <HStack space="sm" alignItems="center">
                {isKanbanLayout && (
                  <View style={styles.toolbarButtonWrapper}>
                    <Button
                      variant="outline"
                      size="small"
                      onPress={() => setKanbanCardFieldsDrawerVisible(true)}
                      testID="e2e.activities.toolbar.cardFields"
                      accessibilityLabel="Card fields"
                    >
                      <Icon name="eye" size={14} color={colors.textPrimary} />
                    </Button>
                  </View>
                )}
                <View style={styles.toolbarButtonWrapper}>
                  {isPro ? (
                    <>
                        <Button
                          ref={filterButtonRef}
                          variant="outline"
                          size="small"
                          onPress={() => setFilterDrawerVisible(true)}
                          testID="e2e.activities.toolbar.filter"
                          style={filterCount > 0 ? styles.toolbarCountButtonActive : undefined}
                          accessibilityLabel={
                            filterCount > 0
                              ? `Filter activities (${filterCount})`
                              : 'Filter to-dos'
                          }
                        >
                          <HStack alignItems="center" space="xs">
                            <Icon
                              name="funnel"
                              size={14}
                              color={filterCount > 0 ? colors.primaryForeground : colors.textPrimary}
                            />
                            {filterCount > 0 ? (
                              <Text style={styles.toolbarCountButtonActiveText}>{filterCount}</Text>
                            ) : null}
                          </HStack>
                        </Button>
                    </>
                  ) : (
                    <Pressable
                      testID="e2e.activities.toolbar.filter"
                      accessibilityRole="button"
                      accessibilityLabel="Filter to-dos (Pro)"
                      onPress={() =>
                        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_filter' })
                      }
                    >
                      <View style={styles.proLockedButton}>
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
                        <View style={styles.proLockedBadge}>
                          <Icon name="lock" size={10} color={colors.textSecondary} />
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>

                <View style={styles.toolbarButtonWrapper}>
                  {isPro ? (
                    <Button
                      variant="outline"
                      size="small"
                      onPress={() => setGroupingDrawerVisible(true)}
                      testID="e2e.activities.toolbar.grouping"
                      style={appliedGroupingCount > 0 ? styles.toolbarCountButtonActive : undefined}
                      accessibilityLabel={
                        appliedGroupingCount > 0
                          ? `Grouping: ${getActivityGroupingLabel(activeGrouping)}`
                          : 'Group to-dos'
                      }
                    >
                      <HStack alignItems="center" space="xs">
                        <Icon
                          name="layers"
                          size={14}
                          color={appliedGroupingCount > 0 ? colors.primaryForeground : colors.textPrimary}
                        />
                        {appliedGroupingCount > 0 ? (
                          <Text style={styles.toolbarCountButtonActiveText}>1</Text>
                        ) : null}
                      </HStack>
                    </Button>
                  ) : (
                    <Pressable
                      testID="e2e.activities.toolbar.grouping"
                      accessibilityRole="button"
                      accessibilityLabel="Group to-dos (Pro)"
                      onPress={() =>
                        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' })
                      }
                    >
                      <View style={styles.proLockedButton}>
                        <Button
                          variant="outline"
                          size="small"
                          pointerEvents="none"
                          accessible={false}
                        >
                          <Icon name="layers" size={14} color={colors.textPrimary} />
                        </Button>
                        <View style={styles.proLockedBadge}>
                          <Icon name="lock" size={10} color={colors.textSecondary} />
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>

                <View style={styles.toolbarButtonWrapper}>
                  {isPro ? (
                    <>
                        <Button
                          ref={sortButtonRef}
                          variant="outline"
                          size="small"
                          onPress={() => setSortDrawerVisible(true)}
                          testID="e2e.activities.toolbar.sort"
                          style={appliedSortCount > 0 ? styles.toolbarCountButtonActive : undefined}
                          accessibilityLabel={
                            appliedSortCount > 0
                              ? `Sort activities (${appliedSortCount})`
                              : 'Sort to-dos'
                          }
                        >
                          <HStack alignItems="center" space="xs">
                            <Icon
                              name="sort"
                              size={14}
                              color={appliedSortCount > 0 ? colors.primaryForeground : colors.textPrimary}
                            />
                            {appliedSortCount > 0 ? (
                              <Text style={styles.toolbarCountButtonActiveText}>{appliedSortCount}</Text>
                            ) : null}
                          </HStack>
                        </Button>
                    </>
                  ) : (
                    <Pressable
                      testID="e2e.activities.toolbar.sort"
                      accessibilityRole="button"
                      accessibilityLabel="Sort to-dos (Pro)"
                      onPress={() =>
                        openPaywallInterstitial({ reason: 'pro_only_views_filters', source: 'activity_sort' })
                      }
                    >
                      <View style={styles.proLockedButton}>
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
                        <View style={styles.proLockedBadge}>
                          <Icon name="lock" size={10} color={colors.textSecondary} />
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>
              </HStack>
            </HStack>
          </View>
        </Animated.View>
      )}
    </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.headerGhostFade, headerGhostFadeAnimatedStyle]}
      >
        <LinearGradient
          colors={[
            `rgba(255,255,255,${INVENTORY_CHROME_FADE_MAX_ALPHA})`,
            `rgba(255,255,255,${INVENTORY_CHROME_FADE_MAX_ALPHA})`,
            'rgba(255,255,255,0)',
          ]}
          {...({ locations: [0, headerGhostFadeRampStart, 1] } as any)}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <Animated.View style={[styles.inventoryListBody, inventoryListBodyAnimatedStyle]}>
      {/* Render either Kanban or List view based on activeView.layout */}
      {activeView?.layout === 'kanban' ? (
        <KanbanBoard
          activities={visibleActivities}
          goals={goals}
          groupBy={activeView?.kanbanGroupBy ?? 'status'}
          enrichingActivityIds={enrichingActivityIds}
          onToggleComplete={handleToggleComplete}
          onTogglePriority={handleTogglePriorityOne}
          onPressActivity={navigateToActivityDetail}
          onMoveActivity={handleMoveActivity}
          onAddActivity={() => setActivityCoachVisible(true)}
          addCardAnchorRef={kanbanAddCardAnchorRef}
          cardVisibleFields={kanbanCardVisibleFields}
          extraBottomPadding={scrollExtraBottomPadding}
          isExpanded={isKanbanExpanded}
          onExpandedChange={setIsKanbanExpanded}
        />
      ) : groupingApplied ? (
        <CanvasFlatListWithRef
          style={styles.scroll}
          onLayout={handleInventoryListLayout}
          onContentSizeChange={handleInventoryContentSizeChange}
          onScroll={handleInventoryScroll}
          onScrollBeginDrag={handleInventoryScrollBeginDrag}
          onScrollEndDrag={handleInventoryScrollEndDrag}
          onMomentumScrollBegin={handleInventoryMomentumScrollBegin}
          onMomentumScrollEnd={handleInventoryMomentumScrollEnd}
          contentContainerStyle={[
            styles.scrollContent,
            styles.groupedListContent,
            groupedActiveSections.length === 0 ? { flexGrow: 1 } : null,
          ]}
          extraBottomPadding={scrollExtraBottomPadding}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          scrollEnabled={activitiesGuideHost.scrollEnabled}
          automaticallyAdjustKeyboardInsets={false}
          keyboardShouldPersistTaps="handled"
          data={groupedActiveSections}
          keyExtractor={(group) => group.key}
          renderItem={({ item: group }) => (
            <GroupedActivitySection
              groupKey={group.key}
              label={group.label}
              activities={group.activities}
              collapsed={collapsedGroupKeys.has(group.key)}
              goalTitleById={goalTitleById}
              onToggleCollapsed={handleToggleGroupCollapsed}
              onToggleComplete={handleToggleComplete}
              onTogglePriority={handleTogglePriorityOne}
              onStartFocus={openActivityFocus}
              onSchedule={openActivitySchedule}
              onPressActivity={(activityId) => navigateToActivityDetail(activityId)}
              onDeleteActivity={(activity) => handleDeleteActivity(activity)}
              isMetaLoading={(activityId) => enrichingActivityIds.has(activityId)}
              sessionCreatedIds={sessionCreatedIdsForGhostContext}
              filterGroups={filterGroups}
              activeView={activeView}
            />
          )}
          ListHeaderComponent={activityListHeader}
          ListEmptyComponent={renderDomainEmptyState()}
          ListFooterComponent={
            completedActivities.length > 0 ? (
              <View style={{ marginTop: groupedActiveSections.length > 0 ? spacing.xl : 0 }}>
                <CompletedActivitySection
                  activities={completedActivities}
                  goalTitleById={goalTitleById}
                  onToggleComplete={handleToggleComplete}
                  onTogglePriority={handleTogglePriorityOne}
                  onPressActivity={(activityId) => navigateToActivityDetail(activityId)}
                  onDeleteActivity={(activity) => handleDeleteActivity(activity)}
                  isMetaLoading={(activityId) => enrichingActivityIds.has(activityId)}
                  sessionCreatedIds={sessionCreatedIdsForGhostContext}
                  filterGroups={filterGroups}
                  activeView={activeView}
                />
              </View>
            ) : (
              <View />
            )
          }
        />
      ) : isManualOrderEffective ? (
        <DraggableList
          items={activeActivities}
          onOrderChange={reorderActivities}
          onLayout={handleInventoryListLayout}
          onContentSizeChange={handleInventoryContentSizeChange}
          onScrollBeginDrag={handleInventoryScrollBeginDrag}
          onScrollEndDrag={handleInventoryScrollEndDrag}
          onMomentumScrollBegin={handleInventoryMomentumScrollBegin}
          onMomentumScrollEnd={handleInventoryMomentumScrollEnd}
          onScrollOffsetChange={handleInventoryScrollOffset}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            activeActivities.length === 0 ? { flexGrow: 1 } : null,
          ]}
          extraBottomPadding={scrollExtraBottomPadding}
          renderItem={(activity, isDragging, index) => {
            const { meta, metaTone, estimateMeta, isDueToday } = buildActivityListMeta({ activity });
            const priorityIndicator = isPrioritySort(sortConditions)
              ? priorityIndicatorByActivityId.get(activity.id)
              : undefined;
            const metaLoading = enrichingActivityIds.has(activity.id) && !meta;
            const rowGap = getActivityListRowGap({
              isPrioritySort: isPrioritySort(sortConditions),
              priorityIndicator,
              hasNextItem: index < activeActivities.length - 1,
            });
            const rowOuterGap = getActivityListRowOuterGap({
              isPrioritySort: isPrioritySort(sortConditions),
              priorityIndicator,
              hasNextItem: index < activeActivities.length - 1,
            });
            const topPriorityBandRowStyle = getTopPriorityBandRowStyle(priorityIndicator);

            return (
              <View style={[
                { paddingBottom: rowGap },
                rowOuterGap > 0 ? { marginBottom: rowOuterGap } : null,
                topPriorityBandRowStyle,
                isDragging && { opacity: 0.9, shadowColor: colors.textPrimary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
              ]}>
                <ActivityListItem
                  title={activity.title}
                  meta={meta}
                  estimateMeta={estimateMeta}
                  metaTone={metaTone}
                  priorityIndicator={priorityIndicator}
                  metaLoading={metaLoading}
                  isCompleted={activity.status === 'done'}
                  onToggleComplete={isDragging ? undefined : () => handleToggleComplete(activity.id)}
                  isPriorityOne={activity.priority === 1}
                  onTogglePriority={isDragging ? undefined : () => handleTogglePriorityOne(activity.id)}
                  onStartFocus={isDragging ? undefined : () => openActivityFocus(activity.id)}
                  onSchedule={isDragging ? undefined : () => openActivitySchedule(activity.id)}
                  onPress={isDragging ? undefined : () => navigateToActivityDetail(activity.id)}
                  onDelete={isDragging ? undefined : () => handleDeleteActivity(activity)}
                  isDueToday={isDueToday}
                  isGhost={
                    sessionCreatedIdsForGhostContext.has(activity.id) &&
                    QueryService.applyActivityFilters(
                      [activity],
                      filterGroups,
                      effectiveFilterGroupLogic,
                    ).length === 0
                  }
                />
              </View>
            );
          }}
          ListHeaderComponent={activityListHeader}
          ListEmptyComponent={renderDomainEmptyState()}
          ListFooterComponent={
            completedActivities.length > 0 ? (
              <View style={{ marginTop: activeActivities.length > 0 ? spacing.xl : 0 }}>
                <CompletedActivitySection
                  activities={completedActivities}
                  goalTitleById={goalTitleById}
                  onToggleComplete={handleToggleComplete}
                  onTogglePriority={handleTogglePriorityOne}
                  onPressActivity={(activityId) => navigateToActivityDetail(activityId)}
                  onDeleteActivity={(activity) => handleDeleteActivity(activity)}
                  isMetaLoading={(activityId) => enrichingActivityIds.has(activityId)}
                  sessionCreatedIds={sessionCreatedIdsForGhostContext}
                  filterGroups={filterGroups}
                  activeView={activeView}
                />
              </View>
            ) : undefined
          }
        />
      ) : (
        <CanvasFlatListWithRef
          ref={canvasScrollRef}
          style={styles.scroll}
          onLayout={handleInventoryListLayout}
          onContentSizeChange={handleInventoryContentSizeChange}
          onScroll={handleInventoryScroll}
          onScrollBeginDrag={handleInventoryScrollBeginDrag}
          onScrollEndDrag={handleInventoryScrollEndDrag}
          onMomentumScrollBegin={handleInventoryMomentumScrollBegin}
          onMomentumScrollEnd={handleInventoryMomentumScrollEnd}
          contentContainerStyle={[
            styles.scrollContent,
            activeActivities.length === 0 ? { flexGrow: 1 } : null,
          ]}
          extraBottomPadding={scrollExtraBottomPadding}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          scrollEnabled={activitiesGuideHost.scrollEnabled}
          automaticallyAdjustKeyboardInsets={false}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={(info) => {
            // FlatList may not have measured enough rows yet; approximate, then retry.
            const approx = info.averageItemLength * info.index;
            canvasScrollRef.current?.scrollToOffset({ offset: approx, animated: true });
            setTimeout(() => {
              canvasScrollRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.2,
              });
            }, 80);
          }}
          data={activeActivities}
          keyExtractor={(activity) => activity.id}
          renderItem={({ item: activity, index }) => {
            const { meta, metaTone, estimateMeta, isDueToday } = buildActivityListMeta({ activity });
            const priorityIndicator = isPrioritySort(sortConditions)
              ? priorityIndicatorByActivityId.get(activity.id)
              : undefined;
            const metaLoading = enrichingActivityIds.has(activity.id) && !meta;
            const rowGap = getActivityListRowGap({
              isPrioritySort: isPrioritySort(sortConditions),
              priorityIndicator,
              hasNextItem: index < activeActivities.length - 1,
            });
            const rowOuterGap = getActivityListRowOuterGap({
              isPrioritySort: isPrioritySort(sortConditions),
              priorityIndicator,
              hasNextItem: index < activeActivities.length - 1,
            });
            const topPriorityBandRowStyle = getTopPriorityBandRowStyle(priorityIndicator);

            return (
              <View style={[
                { paddingBottom: rowGap },
                rowOuterGap > 0 ? { marginBottom: rowOuterGap } : null,
                topPriorityBandRowStyle,
              ]}>
                <ActivityListItem
                  title={activity.title}
                  meta={meta}
                  estimateMeta={estimateMeta}
                  metaTone={metaTone}
                  priorityIndicator={priorityIndicator}
                  metaLoading={metaLoading}
                  isCompleted={activity.status === 'done'}
                  onToggleComplete={() => handleToggleComplete(activity.id)}
                  isPriorityOne={activity.priority === 1}
                  onTogglePriority={() => handleTogglePriorityOne(activity.id)}
                  onStartFocus={() => openActivityFocus(activity.id)}
                  onSchedule={() => openActivitySchedule(activity.id)}
                  onPress={() => navigateToActivityDetail(activity.id)}
                  onDelete={() => handleDeleteActivity(activity)}
                  isDueToday={isDueToday}
                  isGhost={
                    sessionCreatedIdsForGhostContext.has(activity.id) &&
                    QueryService.applyActivityFilters(
                      [activity],
                      filterGroups,
                      effectiveFilterGroupLogic,
                    ).length === 0
                  }
                />
              </View>
            );
          }}
          ListHeaderComponent={activityListHeader}
          ListEmptyComponent={renderDomainEmptyState()}
          ListFooterComponent={
            completedActivities.length > 0 ? (
              <View style={{ marginTop: activeActivities.length > 0 ? spacing.xl : 0 }}>
                <CompletedActivitySection
                  activities={completedActivities}
                  goalTitleById={goalTitleById}
                  onToggleComplete={handleToggleComplete}
                  onTogglePriority={handleTogglePriorityOne}
                  onPressActivity={(activityId) => navigateToActivityDetail(activityId)}
                  onDeleteActivity={(activity) => handleDeleteActivity(activity)}
                  isMetaLoading={(activityId) => enrichingActivityIds.has(activityId)}
                  sessionCreatedIds={sessionCreatedIdsForGhostContext}
                  filterGroups={filterGroups}
                  activeView={activeView}
                />
              </View>
            ) : (
              <View />
            )
          }
        />
      )}
      </Animated.View>
      </Animated.View>

      {!isKanbanLayout && (
        <QuickAddDock
          value={quickAddTitle}
          onChangeText={setQuickAddTitle}
          inputRef={quickAddInputRef}
          isFocused={isQuickAddFocused}
          setIsFocused={setQuickAddFocused}
          onSubmit={handleQuickAddActivity}
          onCollapse={collapseQuickAdd}
          selectedAiActions={effectiveQuickAddAiActions}
          onSelectedAiActionsChange={setQuickAddAiActions}
          lockedAiActions={canUseUnsplash ? undefined : { cover_image: 'Pro' }}
          onLockedAiActionPress={handleLockedQuickAddAiActionPress}
          onReservedHeightChange={setQuickAddReservedHeight}
          collapsedBottomOffsetPx={quickAddDockBottomOffsetPx}
        />
      )}
      <BottomGuide
        visible={Boolean(pendingQuickAddLocationRecommendation)}
        onClose={() => setPendingQuickAddLocationRecommendation(null)}
        scrim="light"
        snapPoints={['34%']}
      >
        <Text style={styles.triggerGuideTitle}>Use location to make this automatic</Text>
        <Text style={styles.triggerGuideBody}>
          Kwilt can use this location to nudge you{' '}
          {pendingQuickAddLocationRecommendation?.location.trigger === 'arrive'
            ? 'when you arrive'
            : 'when you leave'}
          , so the to-do shows up at the moment it matters.
        </Text>
        <HStack space="sm" alignItems="center" style={styles.triggerGuideActions}>
          <Button
            variant="ghost"
            onPress={() => setPendingQuickAddLocationRecommendation(null)}
          >
            <ButtonLabel size="md">Keep regular to-do</ButtonLabel>
          </Button>
          <Button
            onPress={() => void handleUseQuickAddLocationTrigger()}
            style={{ backgroundColor: colors.turmeric700, borderColor: colors.turmeric800 }}
          >
            <ButtonLabel size="md" tone="inverse">
              Use location triggers
            </ButtonLabel>
          </Button>
        </HStack>
      </BottomGuide>
      <BottomGuide
        visible={ghostWarningVisible && Boolean(postCreateGhostId)}
        onClose={dismissGhostWarning}
        scrim="none"
        snapPoints={['32%']}
      >
        <Text style={styles.triggerGuideTitle}>Filter active</Text>
        <Text style={styles.triggerGuideBody}>
          This to-do doesn't match your current filters. It's only visible until you refresh the view.
        </Text>
        <HStack space="sm" alignItems="center" style={styles.triggerGuideActions}>
          <Button variant="ghost" onPress={dismissGhostWarning}>
            <ButtonLabel size="md">Not now</ButtonLabel>
          </Button>
          <Button
            onPress={handleRefreshView}
            style={{ backgroundColor: colors.turmeric700, borderColor: colors.turmeric800 }}
          >
            <ButtonLabel size="md" tone="inverse">
              Refresh view
            </ButtonLabel>
          </Button>
        </HStack>
      </BottomGuide>
      <BottomDrawer
        visible={quickAddReminderSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false))}
        snapPoints={['40%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Reminder"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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
        // iOS inline date picker needs more vertical space; otherwise it renders below the fold.
        // Use a two-stage sheet and auto-expand when picker opens.
        snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
        snapIndex={Platform.OS === 'ios' ? (quickAddIsDueDatePickerVisible ? 1 : 0) : 0}
        presentation="inline"
        hideBackdrop
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader
            title="Due"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddRepeatSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false))}
        snapPoints={['45%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Repeat"
            rightAction={<RepeatInfoMenu />}
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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
          <BottomDrawerHeader
            title="Estimate"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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
      <FilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        filters={baseFilterGroups}
        groupLogic={activeView?.filterGroupLogic ?? 'or'}
        onApply={handleUpdateFilters}
      />
      <TagGroupsDrawer
        visible={tagGroupsDrawerVisible}
        onClose={() => setTagGroupsDrawerVisible(false)}
        tagGroups={tagGroups}
        activeTagGroupLabel={activeTagGroupLabel}
        onApplyTagGroup={applyTagGroup}
        onClearTagGroup={clearTagGroup}
      />
      <GroupingDrawer
        visible={groupingDrawerVisible}
        onClose={() => setGroupingDrawerVisible(false)}
        grouping={activeGrouping}
        onApply={handleUpdateGrouping}
      />
      <SortDrawer
        visible={sortDrawerVisible}
        onClose={() => setSortDrawerVisible(false)}
        sorts={structuredSorts}
        defaultSortMode={sortMode}
        onApply={handleUpdateSorts}
      />
      <BottomDrawer
        visible={kanbanCardFieldsDrawerVisible}
        onClose={() => setKanbanCardFieldsDrawerVisible(false)}
        snapPoints={['95%']}
        presentation="inline"
        hideBackdrop
      >
        <View style={{ flex: 1 }}>
          <DraggableList
            items={orderedKanbanCardFieldItems}
            onOrderChange={(orderedIds) =>
              setKanbanCardFieldOrder(orderedIds as KanbanCardField[])
            }
            contentContainerStyle={styles.kanbanFieldsListContent}
            ListHeaderComponent={
              <>
                <BottomDrawerHeader
                  title="Card fields"
                  subtitle="Show only the fields you want visible on each card."
                  variant="minimal"
                  containerStyle={styles.sheetHeader}
                  titleStyle={styles.sheetTitle}
                  subtitleStyle={styles.kanbanFieldsSheetSubtitle}
                />
                <View style={{ height: spacing.md }} />
              </>
            }
            renderItem={(item, isDragging) => (
              <Card
                padding="none"
                elevation={isDragging ? 'lift' : 'none'}
                style={[styles.kanbanFieldsSortCard, isDragging && styles.kanbanFieldsSortCardActive]}
                marginVertical={spacing.xs / 2}
              >
                <HStack
                  space="sm"
                  alignItems="center"
                  justifyContent="space-between"
                  style={styles.kanbanFieldsSortRow}
                >
                  <View style={styles.kanbanFieldsDragHandle} pointerEvents="none">
                    <Icon name="menu" size={18} color={colors.textSecondary} />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.kanbanFieldsRowPressable,
                      pressed && styles.kanbanFieldsRowPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={item.toggleA11yLabel}
                    onPress={() => toggleKanbanCardField(item.field)}
                  >
                    <VStack>
                      <Text style={styles.kanbanFieldsRowTitle}>{item.title}</Text>
                    </VStack>
                  </Pressable>

                  <Switch
                    value={kanbanCardFieldVisibility[item.field]}
                    onValueChange={() => toggleKanbanCardField(item.field)}
                    trackColor={{ false: colors.shellAlt, true: colors.accent }}
                    thumbColor={colors.canvas}
                  />
                </HStack>
              </Card>
            )}
          />
        </View>
      </BottomDrawer>
      <ActivityCoachDrawer
        visible={activityCoachVisible}
        onClose={() => setActivityCoachVisible(false)}
        goals={goals}
        activities={activities}
        arcs={arcs}
        addActivity={handleCoachAddActivity}
        showToast={wrappedShowToast}
        markActivityEnrichment={markActivityEnrichment}
        isActivityEnriching={isActivityEnriching}
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

          <View>
            <Text style={styles.viewEditorFieldLabel}>Layout</Text>
            <SegmentedControl
              value={viewEditorLayout}
              onChange={setViewEditorLayout}
              options={LAYOUT_OPTIONS}
              size="compact"
            />
          </View>

          {viewEditorLayout === 'kanban' && (
            <View>
              <Text style={styles.viewEditorFieldLabel}>Group by</Text>
              <SegmentedControl
                value={viewEditorKanbanGroupBy}
                onChange={setViewEditorKanbanGroupBy}
                options={KANBAN_GROUP_OPTIONS}
                size="compact"
              />
            </View>
          )}

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
                  accessibilityLabel="Toggle visibility of completed to-dos section"
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

      {/* Inline View Creator Drawer */}
      <BottomDrawer
        visible={viewCreatorVisible}
        onClose={() => setViewCreatorVisible(false)}
        snapPoints={['60%']}
      >
        <BottomDrawerScrollView>
          <View style={styles.sheetContent}>
            <BottomDrawerHeader
              title="Choose a view type"
              variant="minimal"
              containerStyle={styles.sheetHeader}
              titleStyle={styles.sheetTitle}
            />
            <InlineViewCreator
              goals={goals}
              onCreateView={handleCreateViewFromTemplate}
              onClose={() => setViewCreatorVisible(false)}
            />
          </View>
        </BottomDrawerScrollView>
      </BottomDrawer>

      {/* View Customization Guide (shown after creating a view) */}
      <ViewCustomizationGuide
        visible={customizationGuideVisible}
        onClose={() => setCustomizationGuideVisible(false)}
        view={newlyCreatedView}
        onApplyPreset={handleApplyPreset}
        onApplyAiCustomization={handleApplyAiCustomization}
        isAiLoading={isApplyingAiCustomization}
      />
    </AppShell>
  );
}

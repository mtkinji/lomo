import React from 'react';
import { DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
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
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
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
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { ACTIVITY_CREATION_WORKFLOW_ID } from '../../domain/workflows';
import { buildActivityCoachLaunchContext, buildArcCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
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
import { suggestActivityTagsWithAi } from '../../services/ai';
import { openPaywallInterstitial } from '../../services/paywall';

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
  const [quickAddTitle, setQuickAddTitle] = React.useState('');
  const quickAddInputRef = React.useRef<TextInput | null>(null);
  const [isQuickAddFocused, setIsQuickAddFocused] = React.useState(false);
  const quickAddFocusedRef = React.useRef(false);
  const quickAddLastFocusAtRef = React.useRef<number>(0);
  const [isQuickAddAiGenerating, setIsQuickAddAiGenerating] = React.useState(false);
  const [hasQuickAddAiGenerated, setHasQuickAddAiGenerated] = React.useState(false);
  const lastQuickAddAiTitleRef = React.useRef<string | null>(null);
  // Credits warning toast is now handled centrally in `tryConsumeGenerativeCredit`.
  const [enrichingActivityIds, setEnrichingActivityIds] = React.useState<Set<string>>(() => new Set());
  const enrichingActivityIdsRef = React.useRef<Set<string>>(new Set());
  const [quickAddReminderAt, setQuickAddReminderAt] = React.useState<string | null>(null);
  const [quickAddScheduledDate, setQuickAddScheduledDate] = React.useState<string | null>(null);
  const [quickAddRepeatRule, setQuickAddRepeatRule] = React.useState<Activity['repeatRule']>(undefined);
  const [quickAddEstimateMinutes, setQuickAddEstimateMinutes] = React.useState<number | null>(null);

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

  const [quickAddReminderSheetVisible, setQuickAddReminderSheetVisible] = React.useState(false);
  const [quickAddDueDateSheetVisible, setQuickAddDueDateSheetVisible] = React.useState(false);
  const [quickAddRepeatSheetVisible, setQuickAddRepeatSheetVisible] = React.useState(false);
  const [quickAddEstimateSheetVisible, setQuickAddEstimateSheetVisible] = React.useState(false);
  const [quickAddIsDueDatePickerVisible, setQuickAddIsDueDatePickerVisible] = React.useState(false);
  const quickAddBottomPadding = Math.max(insets.bottom, spacing.sm);
  const [quickAddReservedHeight, setQuickAddReservedHeight] = React.useState(
    QUICK_ADD_BAR_HEIGHT + quickAddBottomPadding + 4,
  );
  const canvasScrollRef = React.useRef<ScrollView | null>(null);
  const pendingScrollToActivityIdRef = React.useRef<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(320);

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

  const collapseQuickAdd = React.useCallback(() => {
    // Optimistically flip the UI state immediately; the TextInput blur will also
    // drive `onBlur` shortly after.
    setIsQuickAddFocused(false);
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      quickAddInputRef.current?.blur();
    });
  }, []);

  // When opening a quick-add "tool drawer" (reminder/due/repeat/estimate), we want:
  // - keyboard dismissed (so the tool drawer has space)
  // - quick-add dock temporarily collapsed (avoid stacking 2 inline drawers)
  // - on close, restore quick-add dock + keyboard so the user can continue typing
  const QUICK_ADD_TOOL_DRAWER_ANIMATION_MS = 240;
  const shouldResumeQuickAddAfterToolRef = React.useRef(false);

  const setQuickAddFocused = React.useCallback((next: boolean) => {
    if (next) {
      quickAddLastFocusAtRef.current = Date.now();
    }
    setIsQuickAddFocused(next);
  }, []);

  const openQuickAddToolDrawer = React.useCallback(
    (open: () => void) => {
      shouldResumeQuickAddAfterToolRef.current = isQuickAddFocused;
      if (isQuickAddFocused) {
        collapseQuickAdd();
      } else {
        Keyboard.dismiss();
      }
      requestAnimationFrame(() => open());
    },
    [collapseQuickAdd, isQuickAddFocused],
  );

  const closeQuickAddToolDrawer = React.useCallback(
    (close: () => void) => {
      close();
      if (!shouldResumeQuickAddAfterToolRef.current) return;
      shouldResumeQuickAddAfterToolRef.current = false;
      setTimeout(() => {
        setQuickAddFocused(true);
      }, QUICK_ADD_TOOL_DRAWER_ANIMATION_MS);
    },
    [setQuickAddFocused],
  );

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
        setIsQuickAddFocused(true);
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

  React.useEffect(() => {
    quickAddFocusedRef.current = isQuickAddFocused;
  }, [isQuickAddFocused]);

  // NOTE: We intentionally avoid blurring the quick-add input on keyboard hide.
  // On iOS, keyboard show/hide transitions can fire events that cause a just-focused
  // TextInput to immediately blur, making the quick-add dock feel “broken”.

  const handleQuickAddActivity = React.useCallback(() => {
    const trimmed = quickAddTitle.trim();
    if (!trimmed) return;

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // TODO(paywall): gate this behind real Pro entitlement / active trial.
    const proAutoPopulateEnabled = false;
    const proPlan = proAutoPopulateEnabled
      ? buildQuickAddHeuristicPlan(id, trimmed, timestamp)
      : { steps: [], aiPlanning: undefined };

    const activity: Activity = {
      id,
      goalId: null,
      title: trimmed,
      type: 'task',
      tags: [],
      notes: undefined,
      steps: proPlan.steps,
      reminderAt: quickAddReminderAt ?? null,
      priority: undefined,
      estimateMinutes: quickAddEstimateMinutes ?? null,
      creationSource: 'manual',
      planGroupId: null,
      scheduledDate: quickAddScheduledDate ?? null,
      repeatRule: quickAddRepeatRule,
      repeatCustom: undefined,
      orderIndex: (activities.length || 0) + 1,
      phase: null,
      status: 'planned',
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      aiPlanning: proPlan.aiPlanning,
      forceActual: defaultForceLevels(0),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Creating an Activity (even as planning) counts as showing up.
    recordShowUp();
    addActivity(activity);
    showToast({
      message: 'Activity created',
      variant: 'success',
      // Keep it above the quick add dock (and above the keyboard when open).
      bottomOffset: quickAddReservedHeight + spacing.sm,
      durationMs: 2200,
    });
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
    setQuickAddTitle('');
    setQuickAddReminderAt(null);
    setQuickAddScheduledDate(null);
    setQuickAddRepeatRule(undefined);
    setQuickAddEstimateMinutes(null);
    setHasQuickAddAiGenerated(false);
    lastQuickAddAiTitleRef.current = null;
    // Keep the keyboard up for rapid entry.
    requestAnimationFrame(() => {
      quickAddInputRef.current?.focus();
    });

    // Enrich activity with AI details asynchronously
    markActivityEnrichment(activity.id, true);
    enrichActivityWithAI({
      title: trimmed,
      goalId: null,
    })
      .then((enrichment) => {
        if (!enrichment) return;

        const timestamp = new Date().toISOString();
        updateActivity(activity.id, (prev) => {
          const updates: Partial<Activity> = {
            updatedAt: timestamp,
          };

          // Only update fields that weren't already set by the user
          if (enrichment.notes && !prev.notes) {
            updates.notes = enrichment.notes;
          }
          if (enrichment.tags && enrichment.tags.length > 0 && (!prev.tags || prev.tags.length === 0)) {
            updates.tags = enrichment.tags;
          }
          if (enrichment.steps && enrichment.steps.length > 0 && (!prev.steps || prev.steps.length === 0)) {
            updates.steps = enrichment.steps.map((step, idx) => ({
              id: `step-${activity.id}-${idx}`,
              title: step.title,
              orderIndex: idx,
              completedAt: null,
            }));
          }
          if (enrichment.estimateMinutes != null && prev.estimateMinutes == null) {
            updates.estimateMinutes = enrichment.estimateMinutes;
          }
          if (enrichment.priority != null && prev.priority == null) {
            updates.priority = enrichment.priority;
          }

          // Update aiPlanning with difficulty suggestion
          if (enrichment.difficulty) {
            updates.aiPlanning = {
              ...prev.aiPlanning,
              difficulty: enrichment.difficulty,
              estimateMinutes: enrichment.estimateMinutes ?? prev.aiPlanning?.estimateMinutes,
              confidence: 0.7,
              lastUpdatedAt: timestamp,
              source: 'quick_suggest' as const,
            };
          }

          return { ...prev, ...updates };
        });
      })
      .catch((err) => {
        // Silently fail - activity creation should succeed even if enrichment fails
        if (__DEV__) {
          console.warn('[ActivitiesScreen] Failed to enrich activity:', err);
        }
      })
      .finally(() => {
        markActivityEnrichment(activity.id, false);
      });
  }, [
    activities.length,
    addActivity,
    updateActivity,
    buildQuickAddHeuristicPlan,
    capture,
    quickAddEstimateMinutes,
    quickAddReminderAt,
    quickAddReservedHeight,
    quickAddRepeatRule,
    quickAddScheduledDate,
    quickAddTitle,
    markActivityEnrichment,
    recordShowUp,
    showToast,
    triggerGuideVisible,
    triggerPickerVisible,
  ]);

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
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          220,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
      updateActivity(activityId, (activity) => {
        const nextIsDone = activity.status !== 'done';
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
        iconTone="activity"
        menuOpen={menuOpen}
        onPressMenu={() => {
          const parent = navigation.getParent<DrawerNavigationProp<RootDrawerParamList>>();
          parent?.dispatch(DrawerActions.openDrawer());
        }}
        rightElement={
          isQuickAddFocused ? (
            <Button
              variant="accent"
              size="xs"
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={collapseQuickAdd}
            >
              <ButtonLabel size="xs" tone="inverse">Done</ButtonLabel>
            </Button>
          ) : (
            <IconButton
              ref={addButtonRef}
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel="Add Activity"
              style={styles.addActivityIconButton}
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
        ref={canvasScrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        extraBottomPadding={scrollExtraBottomPadding}
        showsVerticalScrollIndicator={false}
        // The Activities screen owns keyboard avoidance for the docked quick-add.
        // Letting the scroll view also auto-adjust can cause iOS to "fight" the
        // keyboard transition and immediately dismiss it.
        automaticallyAdjustKeyboardInsets={false}
        keyboardShouldPersistTaps="handled"
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
                  const { meta, metaLeadingIconName } = buildActivityListMeta({ activity, goalTitle });
                  const metaLoading = enrichingActivityIds.has(activity.id) && !meta;

                  return (
                    <ActivityListItem
                      key={activity.id}
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
                isMetaLoading={(activityId) => enrichingActivityIds.has(activityId)}
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
    backgroundColor: colors.primary,
  },
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
  const [manualActivityId, setManualActivityId] = React.useState<string | null>(null);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const [isManualTagsThinking, setIsManualTagsThinking] = React.useState(false);
  const [reminderSheetVisible, setReminderSheetVisible] = React.useState(false);
  const [dueDateSheetVisible, setDueDateSheetVisible] = React.useState(false);
  const [repeatSheetVisible, setRepeatSheetVisible] = React.useState(false);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = React.useState(false);
  const [isActivityAiInfoVisible, setIsActivityAiInfoVisible] = React.useState(false);
  const [isAddingStepInline, setIsAddingStepInline] = React.useState(false);
  const [newStepTitle, setNewStepTitle] = React.useState('');
  const newStepInputRef = React.useRef<TextInput | null>(null);
  // Step titles should wrap to show their content, but stay bounded so the list remains scannable.
  const STEP_MAX_LINES = 4;
  const STEP_LINE_HEIGHT = typography.bodySm.lineHeight;
  const STEP_MIN_HEIGHT = STEP_LINE_HEIGHT;
  const STEP_MAX_HEIGHT = STEP_LINE_HEIGHT * STEP_MAX_LINES + spacing.sm;
  const clampStepHeight = React.useCallback(
    (height: number) => Math.max(STEP_MIN_HEIGHT, Math.min(height, STEP_MAX_HEIGHT)),
    [STEP_MIN_HEIGHT, STEP_MAX_HEIGHT],
  );
  const [manualStepHeights, setManualStepHeights] = React.useState<Record<string, number>>({});
  const [newStepHeight, setNewStepHeight] = React.useState<number>(STEP_MIN_HEIGHT);

  const workspaceSnapshot = React.useMemo(
    () => buildActivityCoachLaunchContext(goals, activities, undefined, undefined, undefined, activityTagHistory),
    [goals, activities, activityTagHistory],
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
        const hasTags = (manualActivity.tags ?? []).length > 0;
        const hasNotes = (manualActivity.notes ?? '').trim().length > 0;
        const hasSteps = (manualActivity.steps ?? []).length > 0;
        const hasReminder = Boolean(manualActivity.reminderAt);
        const hasScheduledDate = Boolean(manualActivity.scheduledDate);
        const hasRepeatRule = Boolean(manualActivity.repeatRule);
        const hasEstimate = manualActivity.estimateMinutes != null;

        const isTriviallyEmpty =
          !hasTitle &&
          !hasTags &&
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
      type: 'task',
      tags: [],
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
    capture(AnalyticsEvent.ActivityCreated, {
      source: 'manual_drawer',
      activity_id: activity.id,
      goal_id: null,
    });
    setManualActivityId(id);
  }, [activities.length, addActivity, capture, manualActivityId]);

  // Enrich activity with AI when title becomes non-empty
  React.useEffect(() => {
    if (!manualActivity) return;
    const title = manualActivity.title?.trim() ?? '';
    if (title.length === 0) return;
    // Only enrich if we haven't enriched yet (check if aiPlanning exists and was set by us)
    if (manualActivity.aiPlanning?.source === 'quick_suggest') return;

    // Debounce: wait a bit after user stops typing
    const timeoutId = setTimeout(() => {
      if (isActivityEnriching(manualActivity.id)) {
        return;
      }
      markActivityEnrichment(manualActivity.id, true);
      enrichActivityWithAI({
        title,
        goalId: manualActivity.goalId,
        existingNotes: manualActivity.notes,
        existingTags: manualActivity.tags,
      })
        .then((enrichment) => {
          if (!enrichment) return;

          const timestamp = new Date().toISOString();
          updateActivity(manualActivity.id, (prev) => {
            const updates: Partial<Activity> = {
              updatedAt: timestamp,
            };

            // Only update fields that weren't already set by the user
            if (enrichment.notes && !prev.notes) {
              updates.notes = enrichment.notes;
            }
            if (enrichment.tags && enrichment.tags.length > 0 && (!prev.tags || prev.tags.length === 0)) {
              updates.tags = enrichment.tags;
            }
            if (enrichment.steps && enrichment.steps.length > 0 && (!prev.steps || prev.steps.length === 0)) {
              updates.steps = enrichment.steps.map((step, idx) => ({
                id: `step-${manualActivity.id}-${idx}`,
                title: step.title,
                orderIndex: idx,
                completedAt: null,
              }));
            }
            if (enrichment.estimateMinutes != null && prev.estimateMinutes == null) {
              updates.estimateMinutes = enrichment.estimateMinutes;
            }
            if (enrichment.priority != null && prev.priority == null) {
              updates.priority = enrichment.priority;
            }

            // Update aiPlanning with difficulty suggestion
            if (enrichment.difficulty) {
              updates.aiPlanning = {
                ...prev.aiPlanning,
                difficulty: enrichment.difficulty,
                estimateMinutes: enrichment.estimateMinutes ?? prev.aiPlanning?.estimateMinutes,
                confidence: 0.7,
                lastUpdatedAt: timestamp,
                source: 'quick_suggest' as const,
              };
            }

            return { ...prev, ...updates };
          });
        })
        .catch((err) => {
          // Silently fail - activity creation should succeed even if enrichment fails
          if (__DEV__) {
            console.warn('[ActivityCoachDrawer] Failed to enrich activity:', err);
          }
        })
        .finally(() => {
          markActivityEnrichment(manualActivity.id, false);
        });
    }, 1500); // Wait 1.5 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [
    manualActivity?.title,
    manualActivity?.id,
    manualActivity?.goalId,
    manualActivity?.notes,
    manualActivity?.tags,
    manualActivity?.aiPlanning?.source,
    enrichActivityWithAI,
    isActivityEnriching,
    markActivityEnrichment,
    updateActivity,
  ]);

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

      const normalizeTitleKey = (value: string) =>
        value.trim().toLowerCase().replace(/\s+/g, ' ');

      const baseIndex = activities.length;
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
        capture(AnalyticsEvent.ActivityCreated, {
          source: 'ai_workflow',
          activity_id: activity.id,
          goal_id: null,
        });
      });
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
            hostBottomInsetAlreadyApplied
            onComplete={handleAiComplete}
            onTransportError={handleSwitchToManual}
            onAdoptActivitySuggestion={handleAdoptActivitySuggestion}
            onDismiss={onClose}
          />
        </View>

        <View style={[styles.activityCoachBody, activeTab !== 'manual' && { display: 'none' }]}>
          <KeyboardAwareScrollView
            style={styles.manualFormContainer}
            contentContainerStyle={{ paddingBottom: spacing['2xl'], gap: spacing.lg }}
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
              <Input
                label="Tags (comma-separated)"
                placeholder="e.g., errands, outdoors"
                value={formatTags(manualActivity?.tags)}
                trailingElement={
                  manualActivity && (manualActivity.tags?.length ?? 0) === 0 ? (
                    <AiAutofillBadge
                      accessibilityLabel="Autofill tags with AI"
                      loading={isManualTagsThinking}
                      onPress={() => {
                        if (!manualActivity) return;
                        // TODO(entitlements): replace tier selection with real Pro state.
                        const tier: 'free' | 'pro' = isPro ? 'pro' : 'free';
                        const consumed = tryConsumeGenerativeCredit({ tier });
                        if (!consumed.ok) {
                          openPaywallInterstitial({
                            reason: 'generative_quota_exceeded',
                            source: 'activity_tags_ai',
                          });
                          return;
                        }
                        (async () => {
                          setIsManualTagsThinking(true);
                          const aiTags = await suggestActivityTagsWithAi({
                            activityTitle: manualActivity.title,
                            activityNotes: manualActivity.notes,
                            tagHistory: activityTagHistory,
                            maxTags: 4,
                          });
                          const suggested =
                            aiTags && aiTags.length > 0
                              ? aiTags
                              : suggestTagsFromText(manualActivity.title, manualActivity.notes);
                          const timestamp = new Date().toISOString();
                          updateActivity(manualActivity.id, (prev) => ({
                            ...prev,
                            tags: suggested,
                            updatedAt: timestamp,
                          }));
                        })()
                          .catch(() => undefined)
                          .finally(() => setIsManualTagsThinking(false));
                      }}
                    />
                  ) : null
                }
                onChangeText={(raw) => {
                  if (!manualActivity) return;
                  const timestamp = new Date().toISOString();
                  updateActivity(manualActivity.id, (prev) => ({
                    ...prev,
                    tags: parseTags(raw),
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
                            value={step.title}
                            onChangeText={(text) => handleChangeManualStepTitle(step.id, text)}
                            placeholder="Describe the step"
                            placeholderTextColor={colors.muted}
                            multiline
                            textAlignVertical="top"
                            blurOnSubmit
                            returnKeyType="done"
                            scrollEnabled={(manualStepHeights[step.id] ?? STEP_MIN_HEIGHT) >= STEP_MAX_HEIGHT}
                            onContentSizeChange={(event) => {
                              const nextHeight = clampStepHeight(event.nativeEvent.contentSize.height);
                              setManualStepHeights((prev) =>
                                prev[step.id] === nextHeight ? prev : { ...prev, [step.id]: nextHeight },
                              );
                            }}
                            // Drive height so the field expands up to 4 visible lines, then stays bounded.
                            // (When bounded, `scrollEnabled` flips on so longer content remains editable.)
                            // eslint-disable-next-line react-native/no-inline-styles
                            style={[
                              styles.stepInput,
                              { height: manualStepHeights[step.id] ?? STEP_MIN_HEIGHT, maxHeight: STEP_MAX_HEIGHT },
                            ]}
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
                          // eslint-disable-next-line react-native/no-inline-styles
                          style={[styles.stepInput, { height: newStepHeight, maxHeight: STEP_MAX_HEIGHT }]}
                          value={newStepTitle}
                          onChangeText={setNewStepTitle}
                          placeholder="Add step"
                          placeholderTextColor={colors.muted}
                          multiline
                          textAlignVertical="top"
                          returnKeyType="done"
                          blurOnSubmit
                          scrollEnabled={newStepHeight >= STEP_MAX_HEIGHT}
                          onContentSizeChange={(event) => {
                            setNewStepHeight(clampStepHeight(event.nativeEvent.contentSize.height));
                          }}
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
          </KeyboardAwareScrollView>
        </View>
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

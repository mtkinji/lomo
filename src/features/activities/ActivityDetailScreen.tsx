import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Keyboard,
  Modal,
  Share,
  Linking,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import { useToastStore } from '../../store/useToastStore';
import type {
  ActivityDifficulty,
  ActivityRepeatCustom,
  ActivityStatus,
  ActivityStep,
  ActivityType,
} from '../../domain/types';
import type {
  ActivitiesStackParamList,
} from '../../navigation/RootNavigator';
import type { ActivityDetailRouteParams } from '../../navigation/routeParams';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { NumberWheelPicker } from '../../ui/NumberWheelPicker';
import { Picker } from '@react-native-picker/picker';
import { preloadSoundscape, startSoundscapeLoop, stopSoundscapeLoop } from '../../services/soundscape';
import { VStack, HStack, Input, ThreeColumnRow, Combobox, ObjectPicker, KeyboardAwareScrollView } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ObjectTypeIconBadge } from '../../ui/ObjectTypeIconBadge';
import { BrandLockup } from '../../ui/BrandLockup';
import { Coachmark } from '../../ui/Coachmark';
import { BreadcrumbBar } from '../../ui/BreadcrumbBar';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import { LongTextField } from '../../ui/LongTextField';
import { richTextToPlainText } from '../../ui/richText';
import { Badge } from '../../ui/Badge';
import { KeyActionsRow } from '../../ui/KeyActionsRow';
import { Card } from '../../ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { parseTags, suggestTagsFromText } from '../../utils/tags';
import { suggestActivityTagsWithAi } from '../../services/ai';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { buildIcsEvent } from '../../utils/ics';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import { openPaywallInterstitial } from '../../services/paywall';
import { Toast } from '../../ui/Toast';

type FocusSessionState =
  | {
      mode: 'running';
      startedAtMs: number;
      endAtMs: number;
    }
  | {
      mode: 'paused';
      startedAtMs: number;
      remainingMs: number;
    };

type ActivityDetailRouteProp = RouteProp<
  { ActivityDetail: ActivityDetailRouteParams },
  'ActivityDetail'
>;

type ActivityDetailNavigationProp = NativeStackNavigationProp<
  ActivitiesStackParamList,
  'ActivityDetail'
>;

export function ActivityDetailScreen() {
  // Focus duration limits:
  // MVP gating: free users are capped at 10 minutes. Pro removes the cap.
  const isPro = useEntitlementsStore((state) => state.isPro);
  const focusMaxMinutes = isPro ? 180 : 10;
  const isFocused = useIsFocused();
  const { capture } = useAnalytics();
  const showToast = useToastStore((s) => s.showToast);
  const insets = useSafeAreaInsets();
  const route = useRoute<ActivityDetailRouteProp>();
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const { activityId, openFocus } = route.params;

  const KEYBOARD_CLEARANCE = spacing['2xl'] + spacing.lg;
  const scrollRef = useRef<KeyboardAwareScrollViewHandle | null>(null);

  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const arcs = useAppStore((state) => state.arcs);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const breadcrumbsEnabled = __DEV__ && useAppStore((state) => state.devBreadcrumbsEnabled);
  const devHeaderV2Enabled = __DEV__ && useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const abHeaderV2Enabled = useFeatureFlag('object_detail_header_v2', false);
  const headerV2Enabled = devHeaderV2Enabled || abHeaderV2Enabled;
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const recordCompletedFocusSession = useAppStore((state) => state.recordCompletedFocusSession);
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const lastFocusMinutes = useAppStore((state) => state.lastFocusMinutes);
  const setLastFocusMinutes = useAppStore((state) => state.setLastFocusMinutes);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const setSoundscapeEnabled = useAppStore((state) => state.setSoundscapeEnabled);
  const currentFocusStreak = useAppStore((state) => state.currentFocusStreak);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const agentHostActions = useAppStore((state) => state.agentHostActions);
  const consumeAgentHostActions = useAppStore((state) => state.consumeAgentHostActions);
  const hasDismissedActivityDetailGuide = useAppStore(
    (state) => state.hasDismissedActivityDetailGuide,
  );
  const setHasDismissedActivityDetailGuide = useAppStore(
    (state) => state.setHasDismissedActivityDetailGuide,
  );
  const tryConsumeGenerativeCredit = useAppStore((state) => state.tryConsumeGenerativeCredit);

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );

  const activityWorkspaceSnapshot = useMemo(() => {
    // Focus the snapshot on this activity's goal when possible so the agent
    // can offer grounded help (next steps, reframes, timeboxing, etc.).
    const focusGoalId = activity?.goalId ?? undefined;
    const focusActivityId = activity?.id ?? undefined;
    return buildActivityCoachLaunchContext(
      goals,
      activities,
      focusGoalId,
      arcs,
      focusActivityId,
      activityTagHistory
    );
  }, [activities, activity?.goalId, activity?.id, activityTagHistory, arcs, goals]);

  const { openForScreenContext: openAgentForActivity, AgentWorkspaceSheet } = useAgentLauncher(
    activityWorkspaceSnapshot,
    {
      snapPoints: ['100%'],
      hideBrandHeader: false,
      screenMode: 'activityGuidance',
    },
  );

  const goal = useMemo(() => {
    if (!activity?.goalId) return undefined;
    return goals.find((g) => g.id === activity.goalId);
  }, [activity?.goalId, goals]);

  const arc = useMemo(() => {
    if (!goal?.arcId) return undefined;
    return arcs.find((a) => a.id === goal.arcId);
  }, [arcs, goal?.arcId]);

  const goalTitle = useMemo(() => {
    if (!activity?.goalId) return undefined;
    const goal = goals.find((g) => g.id === activity.goalId);
    return goal?.title;
  }, [activity?.goalId, goals]);

  const goalOptions = useMemo(
    () =>
      goals
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((g) => ({ value: g.id, label: g.title })),
    [goals],
  );

  const recommendedGoalOption = useMemo(() => {
    // Only recommend when the activity is currently unlinked.
    if (activity?.goalId) return null;
    if (!goals || goals.length === 0) return null;
    if (!activities || activities.length === 0) return null;

    const tagKeys = new Set((activity?.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean));
    const candidates = goals.map((g) => {
      const related = activities.filter((a) => a.goalId === g.id && a.id !== activity?.id);
      const overlapCount =
        tagKeys.size === 0
          ? 0
          : related.filter((a) => (a.tags ?? []).some((t) => tagKeys.has(String(t).trim().toLowerCase()))).length;

      // Most recent activity recency for this goal.
      const mostRecent = related
        .map((a) => Date.parse(a.updatedAt))
        .filter((ms) => Number.isFinite(ms))
        .sort((a, b) => b - a)[0];
      const recencyMs = typeof mostRecent === 'number' ? mostRecent : -Infinity;

      return {
        goal: g,
        overlapCount,
        recencyMs,
        // Score: tag overlap dominates; recency breaks ties.
        score: overlapCount * 10 + (Number.isFinite(recencyMs) ? recencyMs / 1e12 : 0),
      };
    });

    const ordered = candidates.slice().sort((a, b) => b.score - a.score);
    const best = ordered[0];
    const second = ordered[1];
    if (!best) return null;

    // Only show if we have a "good" recommendation:
    // - If the activity has tags, require at least one overlapping activity under that goal.
    // - If no tags, require the best goal to have a clearly more recent activity than the runner-up.
    const hasTags = tagKeys.size > 0;
    if (hasTags) {
      if (best.overlapCount < 1) return null;
    } else {
      const bestRecency = best.recencyMs;
      const secondRecency = second?.recencyMs ?? -Infinity;
      const recencyGapMs = bestRecency - secondRecency;
      // Require at least ~2 days gap to avoid noisy recommendations.
      if (!Number.isFinite(bestRecency) || recencyGapMs < 2 * 24 * 60 * 60 * 1000) return null;
    }

    return { value: best.goal.id, label: best.goal.title, recommendedLabel: 'Recommended' };
  }, [activity?.goalId, activity?.id, activity?.tags, activities, goals]);

  const difficultyOptions = useMemo(
    () => [
      { value: 'very_easy', label: 'Very easy' },
      { value: 'easy', label: 'Easy' },
      { value: 'medium', label: 'Medium' },
      { value: 'hard', label: 'Hard' },
      { value: 'very_hard', label: 'Very hard' },
    ],
    [],
  );

  const activityTypeOptions = useMemo(
    () => [
      {
        value: 'task',
        label: 'Task',
        keywords: ['todo', 'to-do', 'action'],
        leftElement: <Icon name="activity" size={16} color={colors.textSecondary} />,
      },
      {
        value: 'checklist',
        label: 'Checklist',
        keywords: ['checklist', 'list', 'packing', 'prep'],
        leftElement: <Icon name="clipboard" size={16} color={colors.textSecondary} />,
      },
      {
        value: 'shopping_list',
        label: 'Shopping list',
        keywords: ['grocery', 'groceries', 'shopping', 'list'],
        leftElement: <Icon name="cart" size={16} color={colors.textSecondary} />,
      },
      {
        value: 'instructions',
        label: 'Recipe / instructions',
        keywords: ['recipe', 'instructions', 'how-to', 'steps'],
        leftElement: <Icon name="chapters" size={16} color={colors.textSecondary} />,
      },
      {
        value: 'plan',
        label: 'Plan',
        keywords: ['plan', 'timeline', 'overview'],
        // Use a list-style glyph (distinct from calendar/today).
        leftElement: <Icon name="listOrdered" size={16} color={colors.textSecondary} />,
      },
    ],
    [],
  );

  const [reminderSheetVisible, setReminderSheetVisible] = useState(false);
  const [dueDateSheetVisible, setDueDateSheetVisible] = useState(false);
  const [repeatSheetVisible, setRepeatSheetVisible] = useState(false);
  const [customRepeatSheetVisible, setCustomRepeatSheetVisible] = useState(false);
  const [customRepeatInterval, setCustomRepeatInterval] = useState<number>(1);
  const [customRepeatCadence, setCustomRepeatCadence] = useState<ActivityRepeatCustom['cadence']>('weeks');
  const [customRepeatWeekdays, setCustomRepeatWeekdays] = useState<number[]>(() => [new Date().getDay()]);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = useState(false);

  // Avoid stacking modal BottomDrawers during transitions (can leave an invisible backdrop).
  const repeatDrawerTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (repeatDrawerTransitionTimeoutRef.current) {
        clearTimeout(repeatDrawerTransitionTimeoutRef.current);
        repeatDrawerTransitionTimeoutRef.current = null;
      }
    };
  }, []);

  // Credits warning toast is now handled centrally in `tryConsumeGenerativeCredit`.

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activity?.title ?? '');
  const titleInputRef = useRef<TextInput | null>(null);

  const [tagsInputDraft, setTagsInputDraft] = useState('');
  const tagsInputRef = useRef<TextInput | null>(null);
  const tagsFieldContainerRef = useRef<View | null>(null);
  const tagsAutofillInFlightRef = useRef(false);
  const [isTagsAutofillThinking, setIsTagsAutofillThinking] = useState(false);
  const [stepsDraft, setStepsDraft] = useState<ActivityStep[]>(activity?.steps ?? []);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isAddingStepInline, setIsAddingStepInline] = useState(false);
  const newStepInputRef = useRef<TextInput | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputFocusCountRef = useRef(0);
  const [isAnyInputFocused, setIsAnyInputFocused] = useState(false);
  const [goalComboboxOpen, setGoalComboboxOpen] = useState(false);
  const [difficultyComboboxOpen, setDifficultyComboboxOpen] = useState(false);
  const [estimateSheetVisible, setEstimateSheetVisible] = useState(false);
  const [estimateHoursDraft, setEstimateHoursDraft] = useState('0');
  const [estimateMinutesDraft, setEstimateMinutesDraft] = useState('0');
  // iOS-only: use a wheel-style countdown picker to avoid the keyboard entirely.
  const [estimateCountdownDate, setEstimateCountdownDate] = useState<Date>(new Date(0));
  const [estimateCountdownMinutes, setEstimateCountdownMinutes] = useState<number>(0);

  const [focusSheetVisible, setFocusSheetVisible] = useState(false);
  const [focusMinutesDraft, setFocusMinutesDraft] = useState('25');
  const [focusDurationMode, setFocusDurationMode] = useState<'preset' | 'custom'>('preset');
  const [focusSelectedPresetMinutes, setFocusSelectedPresetMinutes] = useState<number>(25);
  const [focusCustomExpanded, setFocusCustomExpanded] = useState(false);
  const [focusSession, setFocusSession] = useState<FocusSessionState | null>(null);
  const [focusTickMs, setFocusTickMs] = useState(() => Date.now());
  const focusEndNotificationIdRef = useRef<string | null>(null);
  const focusLaunchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [calendarSheetVisible, setCalendarSheetVisible] = useState(false);
  const [calendarStartDraft, setCalendarStartDraft] = useState<Date>(new Date());
  const [calendarDurationDraft, setCalendarDurationDraft] = useState('30');
  const [calendarPermissionStatus, setCalendarPermissionStatus] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [writableCalendars, setWritableCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [isCreatingCalendarEvent, setIsCreatingCalendarEvent] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [sendToSheetVisible, setSendToSheetVisible] = useState(false);
  const [isOutlookInstalled, setIsOutlookInstalled] = useState(false);
  const [pendingCalendarToast, setPendingCalendarToast] = useState<string | null>(null);

  const titleStepsBundleRef = useRef<View | null>(null);
  const scheduleAndPlanningCardRef = useRef<View | null>(null);
  const [detailGuideStep, setDetailGuideStep] = useState(0);
  const [isTitleStepsBundleReady, setIsTitleStepsBundleReady] = useState(false);
  const [isScheduleCardReady, setIsScheduleCardReady] = useState(false);

  const handleBackToActivities = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ActivitiesList');
    }
  };

  const canSendTo = useMemo(() => {
    if (!activity) return false;
    // Keep this high-signal to avoid UI clutter.
    return activity.type === 'shopping_list' || activity.type === 'instructions';
  }, [activity]);

  const buildActivityExportText = useCallback(() => {
    if (!activity) return '';
    const lines: string[] = [];
    const title = activity.title?.trim();
    if (title) lines.push(title);

    const notes = (activity.notes ?? '').trim();
    if (notes) {
      lines.push('', notes);
    }

    const steps = (activity.steps ?? [])
      .map((s) => (s.title ?? '').trim())
      .filter(Boolean);
    if (steps.length > 0) {
      lines.push('', activity.type === 'shopping_list' ? 'Items:' : 'Steps:');
      for (const step of steps) {
        lines.push(`- ${step}`);
      }
    }

    return lines.join('\n').trim();
  }, [activity]);

  const buildSendToSearchQuery = useCallback(() => {
    if (!activity) return '';
    const base = activity.title?.trim() ?? '';
    const stepTitles = (activity.steps ?? [])
      .map((s) => (s.title ?? '').trim())
      .filter(Boolean)
      .slice(0, 5);
    const combined = [base, ...stepTitles].filter(Boolean).join(', ');
    // Keep URLs reasonably short.
    return combined.length > 140 ? combined.slice(0, 140) : combined;
  }, [activity]);

  const openExternalUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', 'Unable to open that app or link on this device right now.');
    }
  }, []);

  const handleSendToCopy = useCallback(async () => {
    try {
      const text = buildActivityExportText();
      if (!text) return;
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Activity details copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Unable to copy to clipboard on this device right now.');
    }
  }, [buildActivityExportText]);

  const handleSendToShare = useCallback(async () => {
    try {
      const text = buildActivityExportText();
      if (!text) return;
      await Share.share({ message: text });
    } catch {
      // No-op: Share sheets can be dismissed or unavailable on some platforms.
    }
  }, [buildActivityExportText]);

  const handleSendToAmazon = useCallback(async () => {
    const q = buildSendToSearchQuery();
    if (!q) return;
    await openExternalUrl(`https://www.amazon.com/s?k=${encodeURIComponent(q)}`);
  }, [buildSendToSearchQuery, openExternalUrl]);

  const handleSendToHomeDepot = useCallback(async () => {
    const q = buildSendToSearchQuery();
    if (!q) return;
    await openExternalUrl(`https://www.homedepot.com/s/${encodeURIComponent(q)}`);
  }, [buildSendToSearchQuery, openExternalUrl]);

  const handleSendToInstacart = useCallback(async () => {
    const q = buildSendToSearchQuery();
    if (!q) return;
    // Best-effort web fallback (native deep links can be added later).
    await openExternalUrl(`https://www.instacart.com/store/s?k=${encodeURIComponent(q)}`);
  }, [buildSendToSearchQuery, openExternalUrl]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Composite control keyboard reveal:
  // The Tags field is a "chip input" where the focused TextInput is smaller than the
  // visible field container. To avoid only revealing the caret/label, we ask the scroll
  // container to reveal the entire field container.
  // Needs to account for a 2-row field (chips row + input row) plus a bit of breathing room.
  // Equivalent to 64 with current spacing scale; keep it expressed in tokens so it
  // tracks design-system changes.
  const TAGS_REVEAL_EXTRA_OFFSET = spacing['2xl'] + spacing['2xl'];
  const TAGS_AI_AUTOFILL_SIZE = 26;
  const prepareRevealTagsField = () => {
    const handle = tagsFieldContainerRef.current
      ? findNodeHandle(tagsFieldContainerRef.current)
      : null;
    if (typeof handle !== 'number') return null;
    scrollRef.current?.setNextRevealTarget(handle, TAGS_REVEAL_EXTRA_OFFSET);
    return handle;
  };

  if (!activity) {
    return (
      <AppShell>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Activity not found</Text>
          <Text style={styles.emptyBody}>
            This activity may have been deleted or moved.
          </Text>
        </View>
      </AppShell>
    );
  }

  const isCompleted = activity.status === 'done';
  const showDoneButton = isKeyboardVisible || isAnyInputFocused || isEditingTitle || isAddingStepInline;
  const showTagsAutofill =
    (activity.tags ?? []).length === 0 && tagsInputDraft.trim().length === 0;

  // Only show coachmarks for activities belonging to the onboarding goal
  const isOnboardingActivity = Boolean(
    lastOnboardingGoalId && activity.goalId === lastOnboardingGoalId
  );

  const shouldShowDetailGuide =
    isFocused &&
    isOnboardingActivity &&
    !hasDismissedActivityDetailGuide &&
    !showDoneButton &&
    !goalComboboxOpen &&
    !difficultyComboboxOpen &&
    !reminderSheetVisible &&
    !dueDateSheetVisible &&
    !repeatSheetVisible &&
    !estimateSheetVisible &&
    (detailGuideStep === 0 ? isTitleStepsBundleReady : isScheduleCardReady);

  const dismissDetailGuide = () => {
    setHasDismissedActivityDetailGuide(true);
    setDetailGuideStep(0);
  };

  const detailGuideTargetRef = detailGuideStep === 0 ? titleStepsBundleRef : scheduleAndPlanningCardRef;
  const detailGuideTitle = detailGuideStep === 0 ? 'Edit + complete here' : 'Schedule + plan';
  const detailGuideBody =
    detailGuideStep === 0
      ? 'Tap the circle to mark done. Add a few steps for clarity—when required steps are completed, the Activity completes automatically.'
      : 'Add reminders, due dates, and repeats. Use time estimate + difficulty to keep your plan realistic (AI suggestions appear when available).';

  const handleDoneEditing = () => {
    // Prefer blurring the known inline inputs first so their onBlur commits fire.
    titleInputRef.current?.blur();
    newStepInputRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleAnyInputFocus = () => {
    inputFocusCountRef.current += 1;
    if (!isAnyInputFocused) setIsAnyInputFocused(true);
  };

  const handleAnyInputBlur = () => {
    inputFocusCountRef.current = Math.max(0, inputFocusCountRef.current - 1);
    if (inputFocusCountRef.current === 0) setIsAnyInputFocused(false);
  };

  const handleDeleteActivity = () => {
    Alert.alert(
      'Delete activity?',
      'This will remove the activity from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeActivity(activity.id);
            handleBackToActivities();
          },
        },
      ],
    );
  };

  const openFocusSheet = () => {
    const fallback = Math.min(
      focusMaxMinutes,
      Math.max(
      1,
      Math.round(typeof lastFocusMinutes === 'number' ? lastFocusMinutes : (activity.estimateMinutes ?? 25)),
      ),
    );
    setFocusMinutesDraft(String(fallback));
    const presets = [10, 25, 45, 60];
    if (presets.includes(fallback)) {
      setFocusDurationMode('preset');
      setFocusSelectedPresetMinutes(fallback);
      setFocusCustomExpanded(false);
    } else {
      setFocusDurationMode('custom');
      // Keep the wheel hidden until the user taps the custom chip.
      setFocusCustomExpanded(false);
    }
    setFocusSheetVisible(true);
  };

  // Allow deep links (e.g. from calendar event descriptions) to land directly in Focus mode UI.
  useEffect(() => {
    if (!openFocus) return;
    // Defer to the next frame so initial layout settles before opening the sheet.
    requestAnimationFrame(() => {
      openFocusSheet();
      // Best-effort: clear the param so returning to this screen doesn't re-trigger.
      try {
        navigation.setParams({ openFocus: undefined } as any);
      } catch {
        // no-op
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFocus]);

  useEffect(() => {
    if (!isFocused) return;
    if (!pendingCalendarToast) return;
    showToast({
      message: pendingCalendarToast,
      variant: 'default',
      durationMs: 2500,
      behaviorDuringSuppression: 'queue',
    });
    setPendingCalendarToast(null);
  }, [isFocused, pendingCalendarToast, showToast]);

  const cancelFocusNotificationIfNeeded = async () => {
    const existing = focusEndNotificationIdRef.current;
    focusEndNotificationIdRef.current = null;
    if (!existing) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(existing);
    } catch {
      // best-effort
    }
  };

  const endFocusSession = async () => {
    await cancelFocusNotificationIfNeeded();
    await stopSoundscapeLoop({ unload: true }).catch(() => undefined);
    setFocusSession(null);
  };

  const startFocusSession = async () => {
    const minutes = Math.max(1, Math.floor(Number(focusMinutesDraft)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Choose a duration', 'Enter a number of minutes greater than 0.');
      return;
    }
    if (minutes > focusMaxMinutes) {
      openPaywallInterstitial({ reason: 'pro_only_focus_mode', source: 'activity_focus_mode' });
      return;
    }
    setLastFocusMinutes(minutes);

    setFocusSheetVisible(false);
    // Start preloading immediately so sound can come up quickly once the focus overlay appears.
    preloadSoundscape().catch(() => undefined);
    // Avoid stacking our focus interstitial modal on top of the BottomDrawer modal
    // while it is animating out; otherwise iOS can show the scrim but hide the next modal.
    if (focusLaunchTimeoutRef.current) {
      clearTimeout(focusLaunchTimeoutRef.current);
    }

    // If sound is enabled, start playback right away (don't wait for the focus modal delay).
    if (soundscapeEnabled) {
      startSoundscapeLoop({ fadeInMs: 250 }).catch(() => undefined);
    }

    focusLaunchTimeoutRef.current = setTimeout(() => {
      const startedAtMs = Date.now();
      const endAtMs = startedAtMs + minutes * 60_000;
      setFocusSession({ mode: 'running', startedAtMs, endAtMs });
      setFocusTickMs(startedAtMs);

      // Best-effort: schedule a "time's up" local notification if permissions are already granted
      // and the user hasn't disabled reminders in app settings.
      (async () => {
        try {
          const permissions = await Notifications.getPermissionsAsync();
          const canNotify =
            permissions.status === 'granted' &&
            notificationPreferences.notificationsEnabled &&
            notificationPreferences.allowActivityReminders;

          if (canNotify) {
            const identifier = await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Focus session complete',
                body: activity.title,
                data: { type: 'focusSession', activityId: activity.id },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: minutes * 60,
                repeats: false,
              },
            });
            focusEndNotificationIdRef.current = identifier;
          }
        } catch {
          // best-effort
        }
      })().catch(() => undefined);
    }, 320);
  };

  const remainingFocusMs = (() => {
    if (!focusSession) return 0;
    if (focusSession.mode === 'paused') return Math.max(0, focusSession.remainingMs);
    return Math.max(0, focusSession.endAtMs - focusTickMs);
  })();

  const togglePauseFocusSession = async () => {
    if (!focusSession) return;
    if (focusSession.mode === 'paused') {
      const endAtMs = Date.now() + focusSession.remainingMs;
      setFocusSession({ mode: 'running', startedAtMs: focusSession.startedAtMs, endAtMs });
      setFocusTickMs(Date.now());
      return;
    }

    await cancelFocusNotificationIfNeeded();
    setFocusSession({
      mode: 'paused',
      startedAtMs: focusSession.startedAtMs,
      remainingMs: remainingFocusMs,
    });
  };

  useEffect(() => {
    if (!focusSession) return;
    if (focusSession.mode !== 'running') return;

    const id = setInterval(() => {
      setFocusTickMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [focusSession]);

  useEffect(() => {
    // Keep soundscape aligned with Focus session state (handles toggling + pause/resume).
    if (focusSession?.mode === 'running' && soundscapeEnabled) {
      startSoundscapeLoop({ fadeInMs: 250 }).catch(() => undefined);
      return;
    }
    stopSoundscapeLoop().catch(() => undefined);
  }, [focusSession?.mode, soundscapeEnabled]);

  useEffect(() => {
    if (!focusSession) return;
    if (focusSession.mode !== 'running') return;
    if (remainingFocusMs > 0) return;

    // Session completed
    recordShowUp();
    recordCompletedFocusSession({ completedAtMs: Date.now() });
    endFocusSession().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingFocusMs, focusSession?.mode]);

  const openCalendarSheet = () => {
    const existingStart = activity.scheduledAt ? new Date(activity.scheduledAt) : null;
    const existingIsValid = Boolean(existingStart && !Number.isNaN(existingStart.getTime()));
    const existingIsReasonablyFuture =
      existingIsValid && (existingStart as Date).getTime() > Date.now() - 60_000 /* 1 min grace */;

    const base = existingIsReasonablyFuture ? (existingStart as Date) : new Date();
    const draftStart = (() => {
      if (existingIsReasonablyFuture) return base;
      // Round up to the next 15-minute boundary so the default feels intentional.
      const intervalMs = 15 * 60_000;
      return new Date(Math.ceil(base.getTime() / intervalMs) * intervalMs);
    })();

    setCalendarStartDraft(draftStart);
    setCalendarDurationDraft(String(Math.max(5, Math.round(activity.estimateMinutes ?? 30))));
    setCalendarSheetVisible(true);
  };

  useEffect(() => {
    if (!activity) return;
    const pending = agentHostActions?.some(
      (a) => a.objectType === 'activity' && a.objectId === activity.id
    );
    if (!pending) return;

    const actions = consumeAgentHostActions({ objectType: 'activity', objectId: activity.id });
    if (!actions || actions.length === 0) return;

    actions.forEach((action) => {
      if (action.type === 'openFocusMode') {
        const minutes =
          typeof action.minutes === 'number' && Number.isFinite(action.minutes)
            ? Math.max(1, Math.round(action.minutes))
            : Math.max(1, Math.round(activity.estimateMinutes ?? 25));
        setFocusMinutesDraft(String(minutes));
        const presets = [10, 25, 45, 60];
        if (presets.includes(minutes)) {
          setFocusDurationMode('preset');
          setFocusSelectedPresetMinutes(minutes);
          setFocusCustomExpanded(false);
        } else {
          setFocusDurationMode('custom');
          setFocusCustomExpanded(false);
        }
        setFocusSheetVisible(true);
        return;
      }

      if (action.type === 'openCalendar') {
        const fromAction = action.startAtISO ? new Date(action.startAtISO) : null;
        const fromExisting = activity.scheduledAt ? new Date(activity.scheduledAt) : null;
        const draftStart =
          fromAction && !Number.isNaN(fromAction.getTime())
            ? fromAction
            : fromExisting && !Number.isNaN(fromExisting.getTime())
              ? fromExisting
              : (() => {
                  const base = new Date();
                  const intervalMs = 15 * 60_000;
                  return new Date(Math.ceil(base.getTime() / intervalMs) * intervalMs);
                })();

        const duration =
          typeof action.durationMinutes === 'number' && Number.isFinite(action.durationMinutes)
            ? Math.max(5, Math.round(action.durationMinutes))
            : Math.max(5, Math.round(activity.estimateMinutes ?? 30));

        setCalendarStartDraft(draftStart);
        setCalendarDurationDraft(String(duration));
        setCalendarSheetVisible(true);
      }

      if (action.type === 'confirmStepCompletion') {
        const index = Math.floor(Number(action.stepIndex));
        const desired = Boolean(action.completed);
        const steps = activity.steps ?? [];
        const step = steps[index];
        if (!step) return;

        Alert.alert(
          desired ? 'Mark step complete?' : 'Mark step incomplete?',
          `Step: ${step.title}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: desired ? 'Mark complete' : 'Mark incomplete',
              style: desired ? 'default' : 'destructive',
              onPress: () => {
                const timestamp = new Date().toISOString();
                if (desired && !step.completedAt) {
                  // Completing a step counts as "showing up".
                  recordShowUp();
                }
                updateActivity(activity.id, (prev) => {
                  const prevSteps = prev.steps ?? [];
                  const nextSteps = prevSteps.map((s, idx) => {
                    if (idx !== index) return s;
                    return {
                      ...s,
                      completedAt: desired ? (s.completedAt ?? timestamp) : null,
                    };
                  });
                  return { ...prev, steps: nextSteps, updatedAt: timestamp };
                });

                // Keep local draft in sync immediately.
                setStepsDraft((prevDraft) =>
                  prevDraft.map((s, idx) =>
                    idx === index ? { ...s, completedAt: desired ? (s.completedAt ?? timestamp) : null } : s,
                  ),
                );
              },
            },
          ],
        );
      }
    });
  }, [activity, agentHostActions, consumeAgentHostActions]);

  const loadWritableCalendars = async (): Promise<boolean> => {
    setIsLoadingCalendars(true);
    try {
      const permissions = await Calendar.getCalendarPermissionsAsync();
      const hasPermission = permissions.status === 'granted';
      if (!hasPermission) {
        const requested = await Calendar.requestCalendarPermissionsAsync();
        if (requested.status !== 'granted') {
          setCalendarPermissionStatus('denied');
          setWritableCalendars([]);
          setSelectedCalendarId(null);
          return false;
        }
      }

      setCalendarPermissionStatus('granted');
      const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = all.filter((cal) => {
        // iOS exposes `allowsModifications`; Android uses accessLevel/source.
        // We treat missing fields as permissive and let createEventAsync fail gracefully if needed.
        const anyCal = cal as unknown as { allowsModifications?: boolean; isPrimary?: boolean };
        if (anyCal.allowsModifications === false) return false;
        return true;
      });

      setWritableCalendars(writable);

      // Auto-select:
      // - keep existing selection if still valid
      // - else prefer the OS default calendar when it is writable
      // - else fall back to any primary calendar (if present)
      // - else first writable
      const isExistingValid = Boolean(selectedCalendarId && writable.some((c) => c.id === selectedCalendarId));
      if (isExistingValid) return true;

      let nextId: string | null = null;
      try {
        const defaultCal = await Calendar.getDefaultCalendarAsync();
        if (defaultCal?.id && writable.some((c) => c.id === defaultCal.id)) {
          nextId = defaultCal.id;
        }
      } catch {
        // ignore
      }

      if (!nextId) {
        const anyPrimary = writable.find((c) => (c as unknown as { isPrimary?: boolean }).isPrimary);
        nextId = anyPrimary?.id ?? writable[0]?.id ?? null;
      }

      setSelectedCalendarId(nextId);
      return true;
    } catch {
      setCalendarPermissionStatus('denied');
      setWritableCalendars([]);
      setSelectedCalendarId(null);
      return false;
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  useEffect(() => {
    if (!calendarSheetVisible) return;
    // Lazy-load calendars only when the sheet is opened.
    loadWritableCalendars().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarSheetVisible]);

  useEffect(() => {
    if (!calendarSheetVisible) return;
    if (Platform.OS !== 'ios') {
      setIsOutlookInstalled(false);
      return;
    }
    // No prompt; iOS only answers this if the scheme is whitelisted in Info.plist.
    Linking.canOpenURL('ms-outlook://')
      .then((ok) => setIsOutlookInstalled(Boolean(ok)))
      .catch(() => setIsOutlookInstalled(false));
  }, [calendarSheetVisible]);

  const selectedCalendarName = useMemo(() => {
    if (!selectedCalendarId) return 'Choose…';
    const cal = writableCalendars.find((c) => c.id === selectedCalendarId);
    if (!cal) return 'Choose…';
    const anyCal = cal as unknown as { source?: { name?: string }; ownerAccount?: string };
    const sourceName = anyCal.source?.name ?? anyCal.ownerAccount ?? '';
    if (sourceName && sourceName !== cal.title) {
      return `${cal.title} (${sourceName})`;
    }
    return cal.title ?? 'Choose…';
  }, [selectedCalendarId, writableCalendars]);

  const addActivityToNativeCalendar = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Calendar events can only be created on iOS/Android.');
      return;
    }

    if (calendarPermissionStatus !== 'granted') {
      const ok = await loadWritableCalendars();
      if (!ok) {
        Alert.alert('Calendar access needed', 'Enable Calendar access in system settings, or use “Share calendar file”.', [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              try {
                void Linking.openSettings();
              } catch {
                // no-op
              }
            },
          },
        ]);
        return;
      }
    }

    if (!selectedCalendarId) {
      Alert.alert('Choose a calendar', 'Select which calendar (Google/Outlook/iCloud) to add this event to.');
      return;
    }

    const minutes = Math.max(5, Math.floor(Number(calendarDurationDraft)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Duration needed', 'Enter a duration in minutes (5 or more).');
      return;
    }

    const startAt = calendarStartDraft;
    if (!startAt || Number.isNaN(startAt.getTime())) {
      Alert.alert('Start time needed', 'Pick a start date/time.');
      return;
    }

    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const goalTitlePart = goalTitle ? `Goal: ${goalTitle}` : '';
    const notesPlain = activity.notes ? richTextToPlainText(activity.notes) : '';
    const notesPart = notesPlain.trim() ? `Notes: ${notesPlain.trim()}` : '';
    const focusLink = `kwilt://activity/${activity.id}?openFocus=1`;
    const focusPart = `Focus mode: ${focusLink}`;
    const notes = [goalTitlePart, notesPart, focusPart].filter(Boolean).join('\n\n') || undefined;

    setIsCreatingCalendarEvent(true);
    try {
      const eventId = await Calendar.createEventAsync(selectedCalendarId, {
        title: activity.title,
        startDate: startAt,
        endDate: endAt,
        notes,
      });

      // Persist scheduledAt (additive model).
      updateActivity(activity.id, (prev) => ({
        ...prev,
        scheduledAt: startAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setCalendarSheetVisible(false);
      setPendingCalendarToast(`Event created in “${selectedCalendarName}”.`);
      // Best-effort: open the iOS Calendar app so the user can refine details there.
      if (Platform.OS === 'ios') {
        Linking.openURL('calshow://').catch(() => undefined);
      }
      if (__DEV__) {
        console.log('[calendar] created event', { eventId, calendarId: selectedCalendarId });
      }
    } catch (error) {
      Alert.alert(
        'Could not create event',
        'Something went wrong adding this event to your calendar. You can still use “Share calendar file” as a fallback.',
      );
      if (__DEV__) {
        console.warn('[calendar] createEventAsync failed', error);
      }
    } finally {
      setIsCreatingCalendarEvent(false);
    }
  };

  const shareActivityAsIcs = async () => {
    const minutes = Math.max(5, Math.floor(Number(calendarDurationDraft)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Duration needed', 'Enter a duration in minutes (5 or more).');
      return;
    }

    const startAt = calendarStartDraft;
    if (!startAt || Number.isNaN(startAt.getTime())) {
      Alert.alert('Start time needed', 'Pick a start date/time.');
      return;
    }

    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const goalTitlePart = goalTitle ? `Goal: ${goalTitle}` : '';
    const notesPlain = activity.notes ? richTextToPlainText(activity.notes) : '';
    const notesPart = notesPlain.trim() ? `Notes: ${notesPlain.trim()}` : '';
    const focusLink = `kwilt://activity/${activity.id}?openFocus=1`;
    const focusPart = `Focus mode: ${focusLink}`;
    const description = [goalTitlePart, notesPart, focusPart].filter(Boolean).join('\n\n');
    const ics = buildIcsEvent({
      uid: `kwilt-activity-${activity.id}`,
      title: activity.title,
      description,
      startAt,
      endAt,
    });

    try {
      const filename = `kwilt-${activity.title.trim().slice(0, 48).replace(/[^a-z0-9-_]+/gi, '-') || 'activity'}.ics`;
      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      const fileUri = `${baseDir}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, ics, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(ics);
        updateActivity(activity.id, (prev) => ({
          ...prev,
          scheduledAt: startAt.toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setCalendarSheetVisible(false);
        Alert.alert('Copied', 'Calendar file contents copied to clipboard.');
        return;
      }

      const result = await Share.share({
        title: 'Send to calendar',
        message: activity.title,
        url: fileUri,
      });

      if ((result as any)?.action === (Share as any).dismissedAction) {
        // User cancelled share; don't mutate the Activity.
        return;
      }

      updateActivity(activity.id, (prev) => ({
        ...prev,
        scheduledAt: startAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setCalendarSheetVisible(false);
    } catch (error) {
      // Last-ditch fallback: copy the ICS text.
      try {
        await Clipboard.setStringAsync(ics);
        updateActivity(activity.id, (prev) => ({
          ...prev,
          scheduledAt: startAt.toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setCalendarSheetVisible(false);
        Alert.alert('Copied', 'Calendar file contents copied to clipboard.');
      } catch {
        Alert.alert('Could not share', 'Something went wrong while exporting to calendar.');
        if (__DEV__) {
          console.warn('ICS share failed', error);
        }
      }
    }
  };

  // NOTE: iOS does not offer a reliable deep link to open Apple Calendar’s "new event"
  // composer with prefilled data. We create the event in the system calendar store and
  // then open Calendar so the user can refine it there.

  const openOutlookEventComposer = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not available', 'This shortcut is only available on iOS.');
      return;
    }

    const minutes = Math.max(5, Math.floor(Number(calendarDurationDraft)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Duration needed', 'Enter a duration in minutes (5 or more).');
      return;
    }

    const startAt = calendarStartDraft;
    if (!startAt || Number.isNaN(startAt.getTime())) {
      Alert.alert('Start time needed', 'Pick a start date/time.');
      return;
    }

    const endAt = new Date(startAt.getTime() + minutes * 60_000);
    const goalTitlePart = goalTitle ? `Goal: ${goalTitle}` : '';
    const notesPlain = activity.notes ? richTextToPlainText(activity.notes) : '';
    const notesPart = notesPlain.trim() ? `Notes: ${notesPlain.trim()}` : '';
    const focusLink = `kwilt://activity/${activity.id}?openFocus=1`;
    const focusPart = `Focus mode: ${focusLink}`;
    const body = [goalTitlePart, notesPart, focusPart].filter(Boolean).join('\n\n');

    const qs = [
      ['subject', activity.title],
      ['body', body],
      ['start', startAt.toISOString()],
      ['end', endAt.toISOString()],
    ]
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');

    const nativeUrl = `ms-outlook://events/new?${qs}`;
    const webUrl =
      `https://outlook.office.com/calendar/0/deeplink/compose` +
      `?subject=${encodeURIComponent(activity.title)}` +
      `&startdt=${encodeURIComponent(startAt.toISOString())}` +
      `&enddt=${encodeURIComponent(endAt.toISOString())}` +
      (body ? `&body=${encodeURIComponent(body)}` : '');

    try {
      if (isOutlookInstalled) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(webUrl);
      }

      // Best-effort: mark as scheduled once we've handed off to Outlook.
      updateActivity(activity.id, (prev) => ({
        ...prev,
        scheduledAt: startAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setCalendarSheetVisible(false);
    } catch {
      Alert.alert('Could not open Outlook', 'Use “.ics file” instead.');
    }
  };

  const openGoogleCalendarComposer = async () => {
    const minutes = Math.max(5, Math.floor(Number(calendarDurationDraft)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Duration needed', 'Enter a duration in minutes (5 or more).');
      return;
    }

    const startAt = calendarStartDraft;
    if (!startAt || Number.isNaN(startAt.getTime())) {
      Alert.alert('Start time needed', 'Pick a start date/time.');
      return;
    }

    const endAt = new Date(startAt.getTime() + minutes * 60_000);

    const toGCalDate = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');

    const goalTitlePart = goalTitle ? `Goal: ${goalTitle}` : '';
    const notesPlain = activity.notes ? richTextToPlainText(activity.notes) : '';
    const notesPart = notesPlain.trim() ? `Notes: ${notesPlain.trim()}` : '';
    const focusLink = `kwilt://activity/${activity.id}?openFocus=1`;
    const focusPart = `Focus mode: ${focusLink}`;
    const details = [goalTitlePart, notesPart, focusPart].filter(Boolean).join('\n\n');

    const url =
      `https://www.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(activity.title)}` +
      `&dates=${encodeURIComponent(`${toGCalDate(startAt)}/${toGCalDate(endAt)}`)}` +
      (details ? `&details=${encodeURIComponent(details)}` : '');

    try {
      await Linking.openURL(url);
      updateActivity(activity.id, (prev) => ({
        ...prev,
        scheduledAt: startAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setCalendarSheetVisible(false);
    } catch {
      Alert.alert('Could not open Google Calendar', 'Use “Share calendar file (.ics)” instead.');
    }
  };

  useEffect(() => {
    return () => {
      if (focusLaunchTimeoutRef.current) {
        clearTimeout(focusLaunchTimeoutRef.current);
      }
    };
  }, []);

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === activity.title) {
      setIsEditingTitle(false);
      setTitleDraft(activity.title);
      return;
    }
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      title: next,
      updatedAt: timestamp,
    }));
    setIsEditingTitle(false);
  };

  const addTags = (raw: string | string[]) => {
    const incoming = Array.isArray(raw) ? raw : parseTags(raw);
    if (incoming.length === 0) return;
    const current = Array.isArray(activity.tags) ? activity.tags : [];
    const existingKeys = new Set(current.map((t) => t.toLowerCase()));
    const next = [...current];
    incoming.forEach((tag) => {
      const key = tag.toLowerCase();
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      next.push(tag);
    });
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      tags: next,
      updatedAt: timestamp,
    }));
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const current = Array.isArray(activity.tags) ? activity.tags : [];
    const next = current.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase());
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      tags: next,
      updatedAt: timestamp,
    }));
  };

  const commitTagsInputDraft = () => {
    const trimmed = tagsInputDraft.trim();
    if (!trimmed) return;
    addTags(trimmed);
    setTagsInputDraft('');
  };

  const deriveStatusFromSteps = (
    prevStatus: ActivityStatus,
    nextSteps: ActivityStep[],
    timestamp: string,
    prevCompletedAt?: string | null
  ) => {
    if (nextSteps.length === 0) {
      return { nextStatus: prevStatus, nextCompletedAt: prevCompletedAt ?? null };
    }

    const requiredSteps = nextSteps.filter((step) => !step.isOptional);
    const allRequiredComplete = requiredSteps.length > 0 && requiredSteps.every((s) => !!s.completedAt);
    const anyStepComplete = nextSteps.some((s) => !!s.completedAt);

    let nextStatus: ActivityStatus = prevStatus;
    if (allRequiredComplete) {
      nextStatus = 'done';
    } else if (anyStepComplete && prevStatus === 'planned') {
      nextStatus = 'in_progress';
    } else if (!anyStepComplete && prevStatus === 'in_progress') {
      nextStatus = 'planned';
    } else if (!anyStepComplete && prevStatus === 'done') {
      nextStatus = 'in_progress';
    }

    const nextCompletedAt = nextStatus === 'done' ? prevCompletedAt ?? timestamp : null;

    return { nextStatus, nextCompletedAt };
  };

  const applyStepUpdate = (updater: (current: ActivityStep[]) => ActivityStep[]) => {
    const timestamp = new Date().toISOString();
    let markedDone = false;
    let nextLocalSteps: ActivityStep[] = [];

    updateActivity(activity.id, (prev) => {
      const currentSteps = prev.steps ?? [];
      const nextSteps = updater(currentSteps);
      nextLocalSteps = nextSteps;
      const { nextStatus, nextCompletedAt } = deriveStatusFromSteps(
        prev.status,
        nextSteps,
        timestamp,
        prev.completedAt
      );

      if (prev.status !== 'done' && nextStatus === 'done') {
        markedDone = true;
      }

      return {
        ...prev,
        steps: nextSteps,
        status: nextStatus,
        completedAt: nextCompletedAt ?? prev.completedAt ?? null,
        updatedAt: timestamp,
      };
    });

    setStepsDraft(nextLocalSteps);

    if (markedDone) {
      recordShowUp();
      capture(AnalyticsEvent.ActivityCompletionToggled, {
        source: 'activity_detail',
        activity_id: activity.id,
        goal_id: activity.goalId ?? null,
        next_status: 'done',
        had_steps: Boolean(nextLocalSteps.length > 0),
      });
    }
  };

  const handleToggleStepComplete = (stepId: string) => {
    const existing = (stepsDraft ?? []).find((s) => s.id === stepId);
    // Marking a step complete is meaningful progress; count it as "showing up".
    if (existing && !existing.completedAt) {
      recordShowUp();
    }
    const completedAt = new Date().toISOString();
    applyStepUpdate((steps) =>
      steps.map((step) =>
        step.id === stepId ? { ...step, completedAt: step.completedAt ? null : completedAt } : step
      )
    );
  };

  const handleChangeStepTitle = (stepId: string, title: string) => {
    applyStepUpdate((steps) => steps.map((step) => (step.id === stepId ? { ...step, title } : step)));
  };

  const handleToggleStepOptional = (stepId: string) => {
    applyStepUpdate((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, isOptional: !step.isOptional } : step))
    );
  };

  const handleRemoveStep = (stepId: string) => {
    applyStepUpdate((steps) => steps.filter((step) => step.id !== stepId));
  };

  const handleAddStep = () => {
    const newStep: ActivityStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      completedAt: null,
      isOptional: false,
      orderIndex: stepsDraft.length,
    };
    applyStepUpdate((steps) => [...steps, newStep]);
  };

  const beginAddStepInline = () => {
    setIsAddingStepInline(true);
    setNewStepTitle('');
    requestAnimationFrame(() => {
      newStepInputRef.current?.focus();
    });
  };

  const commitInlineStep = () => {
    const trimmed = newStepTitle.trim();
    if (!trimmed) {
      setIsAddingStepInline(false);
      setNewStepTitle('');
      return;
    }

    const newStep: ActivityStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      completedAt: null,
      isOptional: false,
      orderIndex: stepsDraft.length,
    };
    applyStepUpdate((steps) => [...steps, newStep]);
    setIsAddingStepInline(false);
    setNewStepTitle('');
  };

  const handleToggleComplete = () => {
    const timestamp = new Date().toISOString();
    const wasCompleted = isCompleted;
    updateActivity(activity.id, (prev) => {
      const nextIsDone = prev.status !== 'done';
      const nextSteps =
        prev.steps?.map((step) =>
          nextIsDone && !step.completedAt ? { ...step, completedAt: timestamp } : step
        ) ?? prev.steps;
      return {
        ...prev,
        steps: nextSteps,
        status: nextIsDone ? 'done' : 'planned',
        completedAt: nextIsDone ? timestamp : null,
        updatedAt: timestamp,
      };
    });
    if (!wasCompleted) {
      // Toggling from not-done to done counts as "showing up" for the day.
      recordShowUp();
    }
  };

  const handleSelectReminder = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    // Default to 9am local time for quick picks.
    date.setHours(9, 0, 0, 0);
    const timestamp = new Date().toISOString();
    // Planning counts as showing up (reminders are a commitment device).
    recordShowUp();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: date.toISOString(),
      updatedAt: timestamp,
    }));
    setReminderSheetVisible(false);
  };

  const handleSelectDueDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(23, 0, 0, 0);
    const timestamp = new Date().toISOString();
    // Planning counts as showing up.
    recordShowUp();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: date.toISOString(),
      updatedAt: timestamp,
    }));
    setDueDateSheetVisible(false);
  };

  const handleClearDueDate = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: null,
      updatedAt: timestamp,
    }));
    setDueDateSheetVisible(false);
    setIsDueDatePickerVisible(false);
  };

  const getInitialDueDateForPicker = () => {
    if (activity.scheduledDate) {
      const parsed = new Date(activity.scheduledDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const handleDueDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsDueDatePickerVisible(false);
    }

    if (!date || event.type === 'dismissed') {
      return;
    }

    const next = new Date(date);
    // Treat due dates as "end of day" semantics.
    next.setHours(23, 0, 0, 0);

    const timestamp = new Date().toISOString();
    // Planning counts as showing up.
    recordShowUp();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: next.toISOString(),
      updatedAt: timestamp,
    }));

    // Once a date is chosen, close the sheet to confirm the selection.
    setDueDateSheetVisible(false);
  };

  const handleSelectRepeat = (rule: NonNullable<typeof activity.repeatRule>) => {
    const timestamp = new Date().toISOString();
    // Planning counts as showing up.
    recordShowUp();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: rule,
      repeatCustom: rule === 'custom' ? prev.repeatCustom : undefined,
      updatedAt: timestamp,
    }));
    setRepeatSheetVisible(false);
  };

  const openCustomRepeat = () => {
    // Hydrate from existing custom config if present.
    if (activity.repeatRule === 'custom' && activity.repeatCustom) {
      const cfg = activity.repeatCustom;
      setCustomRepeatCadence(cfg.cadence);
      const interval = Math.max(1, Math.round(cfg.interval ?? 1));
      setCustomRepeatInterval(interval);
      if (cfg.cadence === 'weeks') {
        const list = Array.isArray(cfg.weekdays) ? cfg.weekdays : [];
        setCustomRepeatWeekdays(list.length > 0 ? list : [new Date().getDay()]);
      } else {
        setCustomRepeatWeekdays([new Date().getDay()]);
      }
    } else {
      setCustomRepeatCadence('weeks');
      setCustomRepeatInterval(1);
      setCustomRepeatWeekdays([new Date().getDay()]);
    }
    setRepeatSheetVisible(false);
    if (repeatDrawerTransitionTimeoutRef.current) {
      clearTimeout(repeatDrawerTransitionTimeoutRef.current);
    }
    repeatDrawerTransitionTimeoutRef.current = setTimeout(() => {
      setCustomRepeatSheetVisible(true);
    }, 260);
  };

  const commitCustomRepeat = () => {
    const interval = Math.max(1, Math.round(customRepeatInterval));
    const weekdays =
      customRepeatWeekdays.length > 0
        ? Array.from(new Set(customRepeatWeekdays))
            .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)
            .sort((a, b) => a - b)
        : [new Date().getDay()];

    const payload: ActivityRepeatCustom =
      customRepeatCadence === 'weeks'
        ? { cadence: 'weeks', interval, weekdays }
        : { cadence: customRepeatCadence, interval };
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: 'custom',
      repeatCustom: payload,
      updatedAt: timestamp,
    }));
    setCustomRepeatSheetVisible(false);
  };

  const handleClearReminder = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: null,
      updatedAt: timestamp,
    }));
    setReminderSheetVisible(false);
  };

  const reminderLabel = useMemo(() => {
    if (!activity.reminderAt) return 'None';
    const date = new Date(activity.reminderAt);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [activity.reminderAt]);

  const dueDateLabel = useMemo(() => {
    if (!activity.scheduledDate) return 'None';
    const date = new Date(activity.scheduledDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [activity.scheduledDate]);

  const repeatLabel = (() => {
    const rule = activity.repeatRule ?? null;
    if (!rule) return 'Off';
    if (rule === 'weekdays') return 'Weekdays';
    if (rule === 'custom') {
      const cfg = activity.repeatCustom;
      if (cfg && cfg.cadence === 'weeks') {
        const interval = Math.max(1, Math.round(cfg.interval ?? 1));
        const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const days: number[] = Array.isArray(cfg.weekdays) ? cfg.weekdays : [];
        const picked =
          days.length > 0
            ? Array.from(new Set(days))
                .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6)
                .sort((a, b) => a - b)
            : [];
        const dayLabel = picked.length > 0 ? picked.map((d) => names[d] ?? '').filter(Boolean).join(' ') : '';
        return interval === 1
          ? (dayLabel ? `Weekly (${dayLabel})` : 'Weekly')
          : (dayLabel ? `Every ${interval} weeks (${dayLabel})` : `Every ${interval} weeks`);
      }
      if (cfg) {
        const interval = Math.max(1, Math.round(cfg.interval ?? 1));
        const unit =
          cfg.cadence === 'days'
            ? 'day'
            : cfg.cadence === 'months'
              ? 'month'
              : cfg.cadence === 'years'
                ? 'year'
                : 'week';
        return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
      }
      return 'Custom';
    }
    return rule.charAt(0).toUpperCase() + rule.slice(1);
  })();

  const handleClearRepeatRule = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: undefined,
      repeatCustom: undefined,
      updatedAt: timestamp,
    }));
    setRepeatSheetVisible(false);
  };

  const completedStepsCount = useMemo(
    () => (activity.steps ?? []).filter((step) => !!step.completedAt).length,
    [activity.steps]
  );
  const totalStepsCount = activity.steps?.length ?? 0;

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
  } = useMemo(() => {
    const manualMinutes = activity.estimateMinutes ?? null;
    const aiMinutes = activity.aiPlanning?.estimateMinutes ?? null;

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

    const manualDifficulty = activity.difficulty ?? null;
    const aiDifficulty = activity.aiPlanning?.difficulty ?? null;

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
  }, [activity.estimateMinutes, activity.aiPlanning, activity.difficulty]);

  const hasTimeEstimate =
    activity.estimateMinutes != null || activity.aiPlanning?.estimateMinutes != null;
  const hasDifficulty = activity.difficulty != null || activity.aiPlanning?.difficulty != null;

  const handleClearTimeEstimate = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => {
      // Prefer clearing the user-controlled canonical estimate first.
      if (prev.estimateMinutes != null) {
        return { ...prev, estimateMinutes: undefined, updatedAt: timestamp };
      }
      // Otherwise clear the AI suggestion (so the label can return to the empty state).
      if (prev.aiPlanning?.estimateMinutes != null) {
        return {
          ...prev,
          aiPlanning: { ...prev.aiPlanning, estimateMinutes: null },
          updatedAt: timestamp,
        };
      }
      return { ...prev, updatedAt: timestamp };
    });
  };

  const handleClearDifficulty = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => {
      if (prev.difficulty != null) {
        return { ...prev, difficulty: undefined, updatedAt: timestamp };
      }
      if (prev.aiPlanning?.difficulty != null) {
        const nextAi = { ...prev.aiPlanning };
        delete nextAi.difficulty;
        return { ...prev, aiPlanning: nextAi, updatedAt: timestamp };
      }
      return { ...prev, updatedAt: timestamp };
    });
  };

  const openEstimateSheet = () => {
    const minutes = activity.estimateMinutes ?? activity.aiPlanning?.estimateMinutes ?? 0;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    setEstimateHoursDraft(String(hrs));
    setEstimateMinutesDraft(String(mins));
    if (Platform.OS === 'ios') {
      setEstimateCountdownMinutes(Math.max(0, minutes));
      // For iOS countdown pickers, treat the Date as "today at HH:MM".
      // Seed at local midnight + duration so `getHours/getMinutes` maps cleanly.
      const seed = new Date();
      seed.setHours(0, 0, 0, 0);
      seed.setTime(seed.getTime() + Math.max(0, minutes) * 60_000);
      setEstimateCountdownDate(seed);
    }
    setEstimateSheetVisible(true);
  };

  const commitEstimateDraft = () => {
    const total =
      Platform.OS === 'ios'
        ? Math.max(0, Math.round(estimateCountdownMinutes))
        : (() => {
            const hours = Math.max(0, Number.parseInt(estimateHoursDraft || '0', 10) || 0);
            const minutes = Math.max(0, Number.parseInt(estimateMinutesDraft || '0', 10) || 0);
            return hours * 60 + minutes;
          })();
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      estimateMinutes: total > 0 ? total : undefined,
      updatedAt: timestamp,
    }));
    setEstimateSheetVisible(false);
  };

  useEffect(() => {
    setTitleDraft(activity.title ?? '');
    setTagsInputDraft('');
    setStepsDraft(activity.steps ?? []);
  }, [activity.title, activity.notes, activity.steps, activity.id]);

  return (
    <AppShell>
      <View style={styles.screen}>
        {/* Credits warning toasts are rendered globally via AppShell. */}
        <VStack space="lg" style={styles.pageContent}>
          <HStack alignItems="center">
            {breadcrumbsEnabled ? (
              <>
                <View style={styles.breadcrumbsLeft}>
                  <BreadcrumbBar
                    items={[
                      {
                        id: 'arcs',
                        label: 'Arcs',
                        onPress: () => rootNavigationRef.navigate('ArcsStack', { screen: 'ArcsList' }),
                      },
                      ...(arc?.id
                        ? [
                            {
                              id: 'arc',
                              label: arc?.name ?? 'Arc',
                              onPress: () =>
                                rootNavigationRef.navigate('ArcsStack', {
                                  screen: 'ArcDetail',
                                  params: { arcId: arc.id },
                                }),
                            },
                          ]
                        : []),
                      ...(goal?.id
                        ? [
                            {
                              id: 'goal',
                              label: goal?.title ?? 'Goal',
                              onPress: () => {
                                if (navigation.canGoBack()) {
                                  navigation.goBack();
                                  return;
                                }
                                rootNavigationRef.navigate('Goals', {
                                  screen: 'GoalDetail',
                                  params: { goalId: goal.id, entryPoint: 'goalsTab' },
                                });
                              },
                            },
                          ]
                        : []),
                      { id: 'activity', label: activity?.title ?? 'Activity' },
                    ]}
                  />
                </View>
                <View style={[styles.headerSideRight, styles.breadcrumbsRight]}>
                  {showDoneButton ? (
                    <Pressable
                      onPress={handleDoneEditing}
                      accessibilityRole="button"
                      accessibilityLabel="Done editing"
                      hitSlop={8}
                      style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </Pressable>
                  ) : headerV2Enabled ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => {
                        handleSendToShare().catch(() => undefined);
                      }}
                      accessibilityLabel="Share activity"
                    >
                      <Icon name="share" size={18} color={colors.textPrimary} />
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger accessibilityLabel="Activity actions">
                        <IconButton style={styles.optionsButton} pointerEvents="none" accessible={false}>
                          <Icon name="more" size={18} color={colors.canvas} />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                        <DropdownMenuItem
                          onPress={() => {
                            capture(AnalyticsEvent.ActivityActionInvoked, {
                              activityId: activity.id,
                              action: 'focusMode',
                            });
                            openFocusSheet();
                          }}
                        >
                          <Text style={styles.menuRowText}>Focus mode</Text>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onPress={() => {
                            capture(AnalyticsEvent.ActivityActionInvoked, {
                              activityId: activity.id,
                              action: 'addToCalendar',
                            });
                            openCalendarSheet();
                          }}
                        >
                          <Text style={styles.menuRowText}>Send to calendar</Text>
                        </DropdownMenuItem>
                        <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                          <Text style={styles.destructiveMenuRowText}>Delete activity</Text>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </View>
              </>
            ) : (
              <>
                {headerV2Enabled ? (
                  <View style={styles.headerV2}>
                    <View style={styles.headerV2TopRow}>
                      <HStack alignItems="center" space="xs" style={{ flex: 1 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={handleBackToActivities}
                          accessibilityLabel="Back to Activities"
                        >
                          <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
                        </Button>
                        <View style={styles.objectTypeRow}>
                          <ObjectTypeIconBadge iconName="activities" tone="activity" size={16} badgeSize={28} />
                          <Text style={styles.objectTypeLabelV2}>Activity</Text>
                        </View>
                      </HStack>
                      {showDoneButton ? (
                        <Pressable
                          onPress={handleDoneEditing}
                          accessibilityRole="button"
                          accessibilityLabel="Done editing"
                          hitSlop={8}
                          style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
                        >
                          <Text style={styles.doneButtonText}>Done</Text>
                        </Pressable>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={() => {
                            handleSendToShare().catch(() => undefined);
                          }}
                          accessibilityLabel="Share activity"
                        >
                          <Icon name="share" size={18} color={colors.textPrimary} />
                        </Button>
                      )}
                    </View>
                    <Text style={styles.headerV2Title} numberOfLines={1} ellipsizeMode="tail">
                      {(activity?.title ?? '').trim() || 'Activity'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.headerSide}>
                      <IconButton
                        style={styles.backButton}
                        onPress={handleBackToActivities}
                        accessibilityLabel="Back to Activities"
                      >
                        <Icon name="arrowLeft" size={20} color={colors.canvas} />
                      </IconButton>
                    </View>
                    <View style={styles.headerCenter}>
                      <View style={styles.objectTypeRow}>
                        <ObjectTypeIconBadge iconName="activities" tone="activity" size={16} badgeSize={28} />
                        <Text style={styles.objectTypeLabel}>Activity</Text>
                      </View>
                    </View>
                    <View style={styles.headerSideRight}>
                      {showDoneButton ? (
                        <Pressable
                          onPress={handleDoneEditing}
                          accessibilityRole="button"
                          accessibilityLabel="Done editing"
                          hitSlop={8}
                          style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
                        >
                          <Text style={styles.doneButtonText}>Done</Text>
                        </Pressable>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger accessibilityLabel="Activity actions">
                            <IconButton style={styles.optionsButton} pointerEvents="none" accessible={false}>
                              <Icon name="more" size={18} color={colors.canvas} />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                            <DropdownMenuItem
                              onPress={() => {
                                capture(AnalyticsEvent.ActivityActionInvoked, {
                                  activityId: activity.id,
                                  action: 'focusMode',
                                });
                                openFocusSheet();
                              }}
                            >
                              <Text style={styles.menuRowText}>Focus mode</Text>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onPress={() => {
                                capture(AnalyticsEvent.ActivityActionInvoked, {
                                  activityId: activity.id,
                                  action: 'addToCalendar',
                                });
                                openCalendarSheet();
                              }}
                            >
                              <Text style={styles.menuRowText}>Send to calendar</Text>
                            </DropdownMenuItem>
                            <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                              <Text style={styles.destructiveMenuRowText}>Delete activity</Text>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </HStack>

          <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            // Activity detail has a few composite controls (e.g. tag chips) where the
            // focused TextInput sits inside a taller bordered container. Slightly
            // increase the clearance so the *whole* field clears the keyboard.
            keyboardClearance={KEYBOARD_CLEARANCE + spacing.lg}
            showsVerticalScrollIndicator={false}
          >
            {/* Title + Steps bundle (task-style, no enclosing card) */}
            <View style={styles.section}>
              <View
                ref={titleStepsBundleRef}
                collapsable={false}
                style={styles.titleStepsBundle}
                onLayout={() => {
                  // Ensure the onboarding coachmark can safely measure this target.
                  setIsTitleStepsBundleReady(true);
                }}
              >
                <ThreeColumnRow
                  style={styles.titleRow}
                  contentStyle={styles.titleRowContent}
                  left={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isCompleted ? 'Mark activity as not done' : 'Mark activity as done'
                      }
                      hitSlop={8}
                      onPress={handleToggleComplete}
                    >
                      <View
                        style={[
                          styles.checkboxBase,
                          isCompleted ? styles.checkboxCompleted : styles.checkboxPlanned,
                        ]}
                      >
                        {isCompleted ? (
                          <Icon name="check" size={14} color={colors.primaryForeground} />
                        ) : null}
                      </View>
                    </Pressable>
                  }
                  right={null}
                >
                  <Pressable
                    style={styles.titlePressable}
                    onPress={() => {
                      if (!isEditingTitle) {
                        setIsEditingTitle(true);
                        requestAnimationFrame(() => {
                          titleInputRef.current?.focus();
                        });
                      }
                    }}
                  >
                    {isEditingTitle ? (
                      <TextInput
                        ref={titleInputRef}
                        style={styles.titleInput}
                        value={titleDraft}
                        onChangeText={setTitleDraft}
                        placeholder="Name this activity"
                        placeholderTextColor={colors.muted}
                        onFocus={handleAnyInputFocus}
                        onBlur={() => {
                          handleAnyInputBlur();
                          commitTitle();
                        }}
                        onSubmitEditing={commitTitle}
                        multiline
                        scrollEnabled={false}
                        blurOnSubmit
                        returnKeyType="done"
                      />
                    ) : (
                      <Text style={styles.titleText}>{activity.title || 'Name this activity'}</Text>
                    )}
                  </Pressable>
                </ThreeColumnRow>

                {/* No divider between title and steps; treat as one continuous bundle. */}

                {stepsDraft.length === 0 ? null : (
                  <VStack space="xs">
                    {stepsDraft.map((step) => {
                      const isChecked = !!step.completedAt;
                      return (
                        <View key={step.id}>
                          <ThreeColumnRow
                            style={styles.stepRow}
                            contentStyle={styles.stepRowContent}
                            left={
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={
                                  isChecked ? 'Mark step as not done' : 'Mark step as done'
                                }
                                hitSlop={8}
                                onPress={() => handleToggleStepComplete(step.id)}
                              >
                                {/* Keep the step circle visually smaller, but align its CENTER with the title circle. */}
                                <View style={styles.stepLeftIconBox}>
                                  <View
                                    style={[
                                      styles.checkboxBase,
                                      isChecked ? styles.checkboxCompleted : styles.checkboxPlanned,
                                      styles.stepCheckbox,
                                    ]}
                                  >
                                    {isChecked ? (
                                      <Icon name="check" size={12} color={colors.primaryForeground} />
                                    ) : null}
                                  </View>
                                </View>
                              </Pressable>
                            }
                            right={
                              <DropdownMenu>
                                <DropdownMenuTrigger accessibilityLabel="Step actions">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    iconButtonSize={24}
                                    style={styles.removeStepButton}
                                    pointerEvents="none"
                                    accessible={false}
                                  >
                                    <Icon name="more" size={16} color={colors.textSecondary} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                                  <DropdownMenuItem
                                    onPress={() => handleRemoveStep(step.id)}
                                    variant="destructive"
                                  >
                                    <Text style={styles.destructiveMenuRowText}>Delete step</Text>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            }
                          >
                            <Input
                              value={step.title}
                              onChangeText={(text) => handleChangeStepTitle(step.id, text)}
                              onFocus={handleAnyInputFocus}
                              onBlur={handleAnyInputBlur}
                              placeholder="Describe the step"
                              size="sm"
                              variant="inline"
                              // Allow step titles to wrap (and grow) up to 4 lines so content remains visible.
                              multiline
                              multilineMinHeight={typography.bodySm.lineHeight}
                              multilineMaxHeight={typography.bodySm.lineHeight * 4 + spacing.sm}
                              blurOnSubmit
                              returnKeyType="done"
                            />
                          </ThreeColumnRow>
                        </View>
                      );
                    })}
                  </VStack>
                )}

                <ThreeColumnRow
                  left={
                    <View style={styles.stepLeftIconBox}>
                      <Icon name="plus" size={16} color={colors.accent} />
                    </View>
                  }
                  right={null}
                  onPress={beginAddStepInline}
                  accessibilityLabel="Add a step to this activity"
                  style={[styles.stepRow, styles.addStepRow]}
                  contentStyle={styles.stepRowContent}
                >
                  {isAddingStepInline ? (
                    <Input
                      ref={newStepInputRef}
                      value={newStepTitle}
                      onChangeText={setNewStepTitle}
                      onFocus={handleAnyInputFocus}
                      placeholder="Add step"
                      size="sm"
                      variant="inline"
                      multiline={false}
                      blurOnSubmit
                      returnKeyType="done"
                      onSubmitEditing={commitInlineStep}
                      onBlur={() => {
                        handleAnyInputBlur();
                        commitInlineStep();
                      }}
                    />
                  ) : (
                    <Text style={styles.addStepInlineText}>Add step</Text>
                  )}
                </ThreeColumnRow>
              </View>
            </View>

            {/* Key actions */}
            <View style={styles.section}>
              <View style={styles.keyActionsInset}>
                <VStack space="sm">
                  <KeyActionsRow
                    items={[
                      {
                        id: 'focusMode',
                        icon: 'estimate',
                        label: 'Focus mode',
                        tileBackgroundColor: colors.pine700,
                        tileBorderColor: 'rgba(255,255,255,0.10)',
                        tileLabelColor: colors.primaryForeground,
                        onPress: () => {
                          capture(AnalyticsEvent.ActivityActionInvoked, {
                            activityId: activity.id,
                            action: 'focusMode',
                          });
                          openFocusSheet();
                        },
                      },
                      {
                        id: 'addToCalendar',
                        icon: 'today',
                        label: 'Send to calendar',
                        tileBackgroundColor: colors.pine700,
                        tileBorderColor: 'rgba(255,255,255,0.10)',
                        tileLabelColor: colors.primaryForeground,
                        onPress: () => {
                          capture(AnalyticsEvent.ActivityActionInvoked, {
                            activityId: activity.id,
                            action: 'addToCalendar',
                          });
                          openCalendarSheet();
                        },
                      },
                    ]}
                  />

                  <KeyActionsRow
                    items={[
                      {
                        id: 'chatWithAi',
                        icon: 'sparkles',
                        label: 'Get help from AI',
                        tileBackgroundColor: colors.pine700,
                        tileBorderColor: 'rgba(255,255,255,0.10)',
                        tileLabelColor: colors.primaryForeground,
                        onPress: () => {
                          capture(AnalyticsEvent.ActivityActionInvoked, {
                            activityId: activity.id,
                            action: 'chatWithAi',
                          });
                          openAgentForActivity({ objectType: 'activity', objectId: activity.id });
                        },
                      },
                      ...(canSendTo
                        ? ([
                            {
                              id: 'sendTo',
                              icon: 'share',
                              label: 'Send to…',
                              tileBackgroundColor: colors.pine700,
                              tileBorderColor: 'rgba(255,255,255,0.10)',
                              tileLabelColor: colors.primaryForeground,
                              onPress: () => {
                                capture(AnalyticsEvent.ActivityActionInvoked, {
                                  activityId: activity.id,
                                  action: 'sendTo',
                                });
                                setSendToSheetVisible(true);
                              },
                            },
                          ] as const)
                        : []),
                    ]}
                  />
                </VStack>
              </View>
            </View>

            {/* 3) Triggers (time-based) */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>TRIGGERS</Text>
              <View
                ref={scheduleAndPlanningCardRef}
                collapsable={false}
                style={styles.rowsCard}
                onLayout={() => {
                  // Ensure the onboarding coachmark can safely measure this target.
                  setIsScheduleCardReady(true);
                }}
              >
                <View style={styles.rowPadding}>
                  <VStack space="xs">
                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setReminderSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit reminder"
                    >
                      <ThreeColumnRow
                        left={<Icon name="bell" size={16} color={colors.textSecondary} />}
                        right={
                          activity.reminderAt ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearReminder();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Clear reminder"
                              hitSlop={8}
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </Pressable>
                          ) : null
                        }
                      >
                        <Text
                          style={[
                            styles.rowValue,
                            reminderLabel !== 'None' && styles.rowValueSet,
                          ]}
                          numberOfLines={1}
                        >
                          {reminderLabel === 'None' ? 'Time trigger (reminder)' : reminderLabel}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>

                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setDueDateSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit due date"
                    >
                      <ThreeColumnRow
                        left={<Icon name="today" size={16} color={colors.textSecondary} />}
                        right={
                          activity.scheduledDate ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearDueDate();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Clear due date"
                              hitSlop={8}
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </Pressable>
                          ) : null
                        }
                      >
                        <Text
                          style={[
                            styles.rowValue,
                            activity.scheduledDate && styles.rowValueSet,
                          ]}
                          numberOfLines={1}
                        >
                          {activity.scheduledDate ? dueDateLabel : 'Deadline (due date)'}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>

                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setRepeatSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit repeat schedule"
                    >
                      <ThreeColumnRow
                        left={<Icon name="refresh" size={16} color={colors.textSecondary} />}
                        right={
                          activity.repeatRule ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearRepeatRule();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Clear repeat schedule"
                              hitSlop={8}
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </Pressable>
                          ) : null
                        }
                      >
                        <Text
                          style={[
                            styles.rowValue,
                            repeatLabel !== 'Off' && styles.rowValueSet,
                          ]}
                          numberOfLines={1}
                        >
                          {repeatLabel === 'Off' ? 'Repeat trigger' : repeatLabel}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>
                </VStack>
                </View>
              </View>
            </View>

            {/* 4) Planning */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>PLANNING</Text>
              <View style={styles.rowsCard}>
                <View style={styles.rowPadding}>
                  <VStack space="xs">
                  <View style={styles.row}>
                    <ThreeColumnRow
                      left={<Icon name="estimate" size={16} color={colors.textSecondary} />}
                      right={
                        hasTimeEstimate ? (
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation();
                              handleClearTimeEstimate();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Clear time estimate"
                            hitSlop={8}
                          >
                            <Icon name="close" size={16} color={colors.textSecondary} />
                          </Pressable>
                        ) : (
                          <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                        )
                      }
                      onPress={openEstimateSheet}
                      accessibilityLabel="Edit time estimate"
                    >
                      <Text
                        style={[
                          styles.rowValue,
                            hasTimeEstimate && !timeEstimateIsAi && styles.rowValueSet,
                          timeEstimateIsAi && styles.rowValueAi,
                        ]}
                        numberOfLines={1}
                      >
                        {timeEstimateLabel}
                      </Text>
                    </ThreeColumnRow>
                  </View>

                  <Combobox
                    open={difficultyComboboxOpen}
                    onOpenChange={setDifficultyComboboxOpen}
                    value={activity.difficulty ?? ''}
                    onValueChange={(nextDifficulty) => {
                      const timestamp = new Date().toISOString();
                      updateActivity(activity.id, (prev) => ({
                        ...prev,
                        difficulty: (nextDifficulty || undefined) as ActivityDifficulty | undefined,
                        updatedAt: timestamp,
                      }));
                    }}
                    options={difficultyOptions}
                    searchPlaceholder="Search difficulty…"
                    emptyText="No difficulty options found."
                    allowDeselect
                    trigger={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit difficulty"
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      >
                        <ThreeColumnRow
                          left={<Icon name="difficulty" size={16} color={colors.textSecondary} />}
                          right={
                            hasDifficulty ? (
                              <Pressable
                                onPress={(event) => {
                                  event.stopPropagation();
                                  handleClearDifficulty();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Clear difficulty estimate"
                                hitSlop={8}
                              >
                                <Icon name="close" size={16} color={colors.textSecondary} />
                              </Pressable>
                            ) : (
                              <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.rowValue,
                              hasDifficulty && !difficultyIsAi && styles.rowValueSet,
                              difficultyIsAi && styles.rowValueAi,
                            ]}
                            numberOfLines={1}
                          >
                            {difficultyLabel}
                          </Text>
                        </ThreeColumnRow>
                      </Pressable>
                    }
                  />
                </VStack>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>NOTES</Text>
              <LongTextField
                label="Notes"
                hideLabel
                value={activity.notes ?? ''}
                placeholder="Add context or reminders for this activity."
                autosaveDebounceMs={900}
                onChange={(next) => {
                  const nextValue = next.trim().length ? next : '';
                  const current = activity.notes ?? '';
                  if (nextValue === current) return;
                  const timestamp = new Date().toISOString();
                  updateActivity(activity.id, (prev) => ({
                    ...prev,
                    notes: nextValue.length ? nextValue : undefined,
                    updatedAt: timestamp,
                  }));
                }}
              />
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>TAGS</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit tags"
                onPress={() => {
                  // Set the reveal target *before* focusing so the keyboard-open auto-scroll
                  // lands on the whole field container (not just the inner TextInput).
                  prepareRevealTagsField();
                  tagsInputRef.current?.focus();
                }}
                style={[
                  styles.tagsFieldContainer,
                  showTagsAutofill
                    ? { paddingRight: spacing.md + TAGS_AI_AUTOFILL_SIZE + spacing.sm }
                    : null,
                ]}
                ref={tagsFieldContainerRef}
              >
                <View style={styles.tagsFieldInner}>
                  {(activity.tags ?? []).map((tag) => (
                    <Pressable
                      key={tag}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove tag ${tag}`}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag);
                      }}
                    >
                      <Badge variant="secondary" style={styles.tagChip}>
                        <HStack space="xs" alignItems="center">
                          <Text style={styles.tagChipText}>{tag}</Text>
                          <Icon name="close" size={14} color={colors.textSecondary} />
                        </HStack>
                      </Badge>
                    </Pressable>
                  ))}
                  <TextInput
                    ref={tagsInputRef}
                    value={tagsInputDraft}
                    onChangeText={(next) => {
                      // If the user types/pastes a comma-separated list, adopt all completed tags
                      // and keep the trailing fragment in the input.
                      if (next.includes(',')) {
                        const parts = next.split(',');
                        const trailing = parts.pop() ?? '';
                        const completed = parts.join(',');
                        addTags(completed);
                        setTagsInputDraft(trailing.trimStart());
                        return;
                      }
                      setTagsInputDraft(next);
                    }}
                    onFocus={() => {
                      handleAnyInputFocus();
                      // Let the screen-level keyboard strategy handle revealing this field.
                      // (Avoid per-field scroll calls that can fight the container.)
                      const handle = prepareRevealTagsField();
                      // If the keyboard is already open, we won't get a keyboardDidShow event,
                      // so run the reveal immediately.
                      if (handle && isKeyboardVisible) {
                        const totalOffset = KEYBOARD_CLEARANCE + spacing.lg + TAGS_REVEAL_EXTRA_OFFSET;
                        requestAnimationFrame(() => {
                          scrollRef.current?.scrollToNodeHandle(handle, totalOffset);
                        });
                      }
                    }}
                    onBlur={() => {
                      handleAnyInputBlur();
                      commitTagsInputDraft();
                    }}
                    onSubmitEditing={commitTagsInputDraft}
                    placeholder={(activity.tags ?? []).length === 0 ? 'e.g., errands, outdoors' : ''}
                    placeholderTextColor={colors.muted}
                    style={styles.tagsTextInput}
                    returnKeyType="done"
                    // "Done" should dismiss the keyboard for this lightweight chip input.
                    // (We still commit the draft via `onSubmitEditing`.)
                    blurOnSubmit
                    autoCapitalize="none"
                    autoCorrect={false}
                    onKeyPress={(e) => {
                      // Backspace on empty input removes the last tag (nice token-input affordance).
                      if (e.nativeEvent.key !== 'Backspace') return;
                      if (tagsInputDraft.length > 0) return;
                      const current = activity.tags ?? [];
                      const last = current[current.length - 1];
                      if (!last) return;
                      handleRemoveTag(last);
                    }}
                  />
                </View>
                {showTagsAutofill ? (
                  <View
                    pointerEvents="box-none"
                    style={[
                      styles.tagsAutofillBadge,
                      { right: spacing.md, top: 22 - TAGS_AI_AUTOFILL_SIZE / 2 },
                    ]}
                  >
                    <AiAutofillBadge
                      accessibilityLabel="Autofill tags with AI"
                      size={TAGS_AI_AUTOFILL_SIZE}
                      loading={isTagsAutofillThinking}
                      onPress={() => {
                        if (tagsAutofillInFlightRef.current) return;
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
                        tagsAutofillInFlightRef.current = true;
                        setIsTagsAutofillThinking(true);
                        (async () => {
                          const aiTags = await suggestActivityTagsWithAi({
                            activityTitle: activity.title,
                            activityNotes: activity.notes,
                            goalTitle: goalTitle ?? null,
                            tagHistory: activityTagHistory,
                            maxTags: 4,
                          });
                          const suggested =
                            aiTags && aiTags.length > 0
                              ? aiTags
                              : suggestTagsFromText(activity.title, activity.notes, goalTitle);
                          addTags(suggested);
                        })()
                          .catch(() => undefined)
                          .finally(() => {
                            tagsAutofillInFlightRef.current = false;
                            setIsTagsAutofillThinking(false);
                          });
                      }}
                    />
                  </View>
                ) : null}
              </Pressable>
            </View>

            {/* Linked Goal */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Linked Goal</Text>
              <ObjectPicker
                value={activity.goalId ?? ''}
                onValueChange={(nextGoalId) => {
                  const timestamp = new Date().toISOString();
                  updateActivity(activity.id, (prev) => ({
                    ...prev,
                    goalId: nextGoalId ? nextGoalId : null,
                    updatedAt: timestamp,
                  }));
                }}
                options={goalOptions}
                recommendedOption={recommendedGoalOption ?? undefined}
                placeholder="Select goal…"
                searchPlaceholder="Search goals…"
                emptyText="No goals found."
                accessibilityLabel="Change linked goal"
                allowDeselect
                presentation="drawer"
                drawerSnapPoints={['60%']}
                size="compact"
                leadingIcon="goals"
              />
            </View>

            {/* Type */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Type</Text>
              <ObjectPicker
                value={activity.type}
                onValueChange={(nextType) => {
                  const timestamp = new Date().toISOString();
                  const normalized = (nextType || 'task') as ActivityType;
                  updateActivity(activity.id, (prev) => ({
                    ...prev,
                    type: normalized,
                    updatedAt: timestamp,
                  }));
                }}
                options={activityTypeOptions}
                placeholder="Select type…"
                searchPlaceholder="Search types…"
                emptyText="No type options found."
                accessibilityLabel="Change activity type"
                allowDeselect={false}
                presentation="drawer"
                drawerSnapPoints={['45%']}
                size="compact"
                leadingIcon="listBulleted"
              />
            </View>

            {headerV2Enabled ? (
              <View style={styles.section}>
                <Card>
                  <Text style={styles.actionsTitle}>Actions</Text>
                  <VStack space="sm" style={{ marginTop: spacing.sm }}>
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={openFocusSheet}
                      accessibilityLabel="Open focus mode"
                    >
                      <Text style={styles.actionsButtonLabel}>Focus mode</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={openCalendarSheet}
                      accessibilityLabel="Send to calendar"
                    >
                      <Text style={styles.actionsButtonLabel}>Send to calendar</Text>
                    </Button>
                    <Button
                      variant="destructive"
                      fullWidth
                      onPress={handleDeleteActivity}
                      accessibilityLabel="Delete activity"
                    >
                      <Text style={styles.actionsButtonLabelDestructive}>Delete activity</Text>
                    </Button>
                  </VStack>
                </Card>
              </View>
            ) : null}
          </KeyboardAwareScrollView>
        </VStack>
      </View>

      <Coachmark
        visible={shouldShowDetailGuide}
        targetRef={detailGuideTargetRef}
        scrimToken="pineSubtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={18}
        offset={spacing.xs}
        highlightColor={colors.turmeric}
        actionColor={colors.turmeric}
        attentionPulse
        attentionPulseDelayMs={2500}
        attentionPulseDurationMs={15000}
        title={<Text style={styles.detailGuideTitle}>{detailGuideTitle}</Text>}
        body={<Text style={styles.detailGuideBody}>{detailGuideBody}</Text>}
        progressLabel={`${detailGuideStep + 1} of 2`}
        actions={[
          { id: 'skip', label: 'Skip', variant: 'outline' },
          {
            id: detailGuideStep === 0 ? 'next' : 'done',
            label: detailGuideStep === 0 ? 'Next' : 'Got it',
            variant: 'accent',
          },
        ]}
        onAction={(actionId) => {
          if (actionId === 'skip') {
            dismissDetailGuide();
            return;
          }
          if (actionId === 'next') {
            setDetailGuideStep(1);
            return;
          }
          dismissDetailGuide();
        }}
        onDismiss={dismissDetailGuide}
        placement="below"
      />

      <BottomDrawer
        visible={reminderSheetVisible}
        onClose={() => setReminderSheetVisible(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Remind me</Text>
          <VStack space="sm">
            <SheetOption label="Later Today" onPress={() => handleSelectReminder(0)} />
            <SheetOption label="Tomorrow" onPress={() => handleSelectReminder(1)} />
            <SheetOption label="Next Week" onPress={() => handleSelectReminder(7)} />
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
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Due</Text>
          <VStack space="sm">
            <SheetOption label="Today" onPress={() => handleSelectDueDate(0)} />
            <SheetOption label="Tomorrow" onPress={() => handleSelectDueDate(1)} />
            <SheetOption label="Next Week" onPress={() => handleSelectDueDate(7)} />
            <SheetOption
              label="Pick a date…"
              onPress={() => setIsDueDatePickerVisible(true)}
            />
            <SheetOption label="Clear due date" onPress={handleClearDueDate} />
          </VStack>
          {isDueDatePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialDueDateForPicker()}
                onChange={handleDueDateChange}
              />
            </View>
          )}
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={repeatSheetVisible}
        onClose={() => setRepeatSheetVisible(false)}
        snapPoints={['60%']}
        presentation="inline"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Repeat</Text>
          <VStack space="sm">
            <SheetOption label="Daily" onPress={() => handleSelectRepeat('daily')} />
            <SheetOption label="Weekly" onPress={() => handleSelectRepeat('weekly')} />
            <SheetOption label="Weekdays" onPress={() => handleSelectRepeat('weekdays')} />
            <SheetOption label="Monthly" onPress={() => handleSelectRepeat('monthly')} />
            <SheetOption label="Yearly" onPress={() => handleSelectRepeat('yearly')} />
            <SheetOption label="Custom…" onPress={openCustomRepeat} />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={customRepeatSheetVisible}
        onClose={() => setCustomRepeatSheetVisible(false)}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['60%']}
        presentation="inline"
      >
        <View style={styles.sheetContent}>
          <HStack alignItems="center" justifyContent="space-between" style={styles.customRepeatHeaderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to repeat options"
              onPress={() => {
                setCustomRepeatSheetVisible(false);
                if (repeatDrawerTransitionTimeoutRef.current) {
                  clearTimeout(repeatDrawerTransitionTimeoutRef.current);
                }
                repeatDrawerTransitionTimeoutRef.current = setTimeout(() => {
                  setRepeatSheetVisible(true);
                }, 260);
              }}
              hitSlop={8}
            >
              <Icon name="arrowLeft" size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.customRepeatHeaderTitle}>Repeat every…</Text>
              <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set custom repeat rule"
                onPress={commitCustomRepeat}
              hitSlop={8}
            >
              <Text style={styles.customRepeatSetLabel}>Set</Text>
            </Pressable>
          </HStack>

          <View style={styles.customRepeatPickerBlock}>
            <HStack space="md" alignItems="center" justifyContent="center">
              {Platform.OS === 'ios' ? (
                <>
                  <View style={styles.iosWheelFrame}>
                    <Picker
                      selectedValue={customRepeatInterval}
                      onValueChange={(value) => setCustomRepeatInterval(Number(value))}
                      itemStyle={styles.iosWheelItem}
                    >
                      {Array.from(
                        {
                          length:
                            customRepeatCadence === 'days'
                              ? 30
                              : customRepeatCadence === 'weeks'
                                ? 12
                                : customRepeatCadence === 'months'
                                  ? 24
                                  : 10,
                        },
                        (_, idx) => idx + 1,
                      ).map((n) => (
                        <Picker.Item key={String(n)} label={String(n)} value={n} />
                      ))}
                    </Picker>
                  </View>
                  <View style={styles.iosWheelFrame}>
                    <Picker
                      selectedValue={customRepeatCadence}
                      onValueChange={(value) => setCustomRepeatCadence(value)}
                      itemStyle={styles.iosWheelItem}
                    >
                      <Picker.Item label="Days" value="days" />
                      <Picker.Item label="Weeks" value="weeks" />
                      <Picker.Item label="Months" value="months" />
                      <Picker.Item label="Years" value="years" />
                    </Picker>
                  </View>
                </>
              ) : (
                <>
                  <NumberWheelPicker
                    value={customRepeatInterval}
                    onChange={setCustomRepeatInterval}
                    min={1}
                    max={
                      customRepeatCadence === 'days'
                        ? 30
                        : customRepeatCadence === 'weeks'
                          ? 12
                          : customRepeatCadence === 'months'
                            ? 24
                            : 10
                    }
                  />
                  <NumberWheelPicker
                    value={['days', 'weeks', 'months', 'years'].indexOf(customRepeatCadence)}
                    onChange={(idx) => {
                      const next = (['days', 'weeks', 'months', 'years'] as const)[idx] ?? 'weeks';
                      setCustomRepeatCadence(next);
                    }}
                    min={0}
                    max={3}
                    formatLabel={(idx) => {
                      const v = (['Days', 'Weeks', 'Months', 'Years'] as const)[idx] ?? 'Weeks';
                      return v;
                    }}
                  />
                </>
              )}
            </HStack>
          </View>

          {customRepeatCadence === 'weeks' ? (
            <>
              <Text style={styles.customRepeatSectionLabel}>Repeat on</Text>
              <HStack space="sm" alignItems="center" style={styles.customRepeatWeekdayRow}>
                {(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const).map((label, idx) => {
                  const selected = customRepeatWeekdays.includes(idx);
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle ${label}`}
                      onPress={() => {
                        setCustomRepeatWeekdays((prev) => {
                          if (prev.includes(idx)) {
                            const next = prev.filter((d) => d !== idx);
                            return next.length > 0 ? next : prev; // keep at least one selected
                          }
                          return [...prev, idx];
                        });
                      }}
                      style={[
                        styles.customRepeatWeekdayChip,
                        selected && styles.customRepeatWeekdayChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.customRepeatWeekdayChipText,
                          selected && styles.customRepeatWeekdayChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </HStack>
            </>
          ) : null}
        </View>
      </BottomDrawer>


      <BottomDrawer
        visible={estimateSheetVisible}
        onClose={() => setEstimateSheetVisible(false)}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['40%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Duration</Text>
          <VStack space="md">
            {Platform.OS === 'ios' ? (
              <View style={styles.estimatePickerContainer}>
                <DateTimePicker
                  mode="countdown"
                  display="spinner"
                  value={estimateCountdownDate}
                  onChange={(_event, date) => {
                    if (!date) return;
                    setEstimateCountdownDate(date);
                    // Interpret the picker's value as a duration in local HH:MM.
                    // (Countdown picker can return a "today at HH:MM" Date; don't use day/month/year.)
                    const hours = Math.max(0, date.getHours?.() ?? 0);
                    const minutes = Math.max(0, date.getMinutes?.() ?? 0);
                    const seconds = Math.max(0, date.getSeconds?.() ?? 0);
                    const totalMinutes = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
                    setEstimateCountdownMinutes(totalMinutes);
                    setEstimateHoursDraft(String(Math.floor(totalMinutes / 60)));
                    setEstimateMinutesDraft(String(totalMinutes % 60));
                  }}
                />
              </View>
            ) : (
              <HStack space="sm" alignItems="center" style={styles.estimateFieldsRow}>
                <View style={styles.estimateField}>
                  <Text style={styles.estimateFieldLabel}>Hours</Text>
                  <Input
                    value={estimateHoursDraft}
                    onChangeText={setEstimateHoursDraft}
                    placeholder="0"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    size="sm"
                    variant="outline"
                    elevation="flat"
                  />
                </View>
                <View style={styles.estimateField}>
                  <Text style={styles.estimateFieldLabel}>Minutes</Text>
                  <Input
                    value={estimateMinutesDraft}
                    onChangeText={setEstimateMinutesDraft}
                    placeholder="0"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    size="sm"
                    variant="outline"
                    elevation="flat"
                  />
                </View>
              </HStack>
            )}

            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  handleClearTimeEstimate();
                  setEstimateSheetVisible(false);
                }}
              >
                <Text style={styles.sheetRowLabel}>Clear</Text>
              </Button>
              <Button variant="primary" style={{ flex: 1 }} onPress={commitEstimateDraft}>
                <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>
                  Save
                </Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={focusSheetVisible}
        onClose={() => setFocusSheetVisible(false)}
        snapPoints={['52%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Focus mode</Text>
          <Text style={styles.sheetDescription}>
            How long do you want to focus? (We can’t toggle system Focus / Do Not Disturb for you, but we’ll keep you on a distraction-free timer.)
          </Text>
          <Text style={styles.focusStreakSheetLabel}>
            Current streak: {currentFocusStreak} day{currentFocusStreak === 1 ? '' : 's'}
          </Text>
          <VStack space="md">
            <HStack space="sm" alignItems="center" style={styles.focusPresetRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.focusPresetChip,
                  focusDurationMode === 'preset' &&
                    focusSelectedPresetMinutes === 10 &&
                    styles.focusPresetChipSelected,
                  pressed && styles.focusPresetChipPressed,
                ]}
                onPress={() => {
                  setFocusDurationMode('preset');
                  setFocusSelectedPresetMinutes(10);
                  setFocusMinutesDraft('10');
                  setFocusCustomExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.focusPresetChipText,
                    focusDurationMode === 'preset' &&
                      focusSelectedPresetMinutes === 10 &&
                      styles.focusPresetChipTextSelected,
                  ]}
                >
                  10m
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.focusPresetChip,
                  focusDurationMode === 'preset' &&
                    focusSelectedPresetMinutes === 25 &&
                    styles.focusPresetChipSelected,
                  pressed && styles.focusPresetChipPressed,
                ]}
                onPress={() => {
                  setFocusDurationMode('preset');
                  setFocusSelectedPresetMinutes(25);
                  setFocusMinutesDraft('25');
                  setFocusCustomExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.focusPresetChipText,
                    focusDurationMode === 'preset' &&
                      focusSelectedPresetMinutes === 25 &&
                      styles.focusPresetChipTextSelected,
                  ]}
                >
                  25m
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.focusPresetChip,
                  focusDurationMode === 'preset' &&
                    focusSelectedPresetMinutes === 45 &&
                    styles.focusPresetChipSelected,
                  pressed && styles.focusPresetChipPressed,
                ]}
                onPress={() => {
                  setFocusDurationMode('preset');
                  setFocusSelectedPresetMinutes(45);
                  setFocusMinutesDraft('45');
                  setFocusCustomExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.focusPresetChipText,
                    focusDurationMode === 'preset' &&
                      focusSelectedPresetMinutes === 45 &&
                      styles.focusPresetChipTextSelected,
                  ]}
                >
                  45m
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.focusPresetChip,
                  focusDurationMode === 'preset' &&
                    focusSelectedPresetMinutes === 60 &&
                    styles.focusPresetChipSelected,
                  pressed && styles.focusPresetChipPressed,
                ]}
                onPress={() => {
                  setFocusDurationMode('preset');
                  setFocusSelectedPresetMinutes(60);
                  setFocusMinutesDraft('60');
                  setFocusCustomExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.focusPresetChipText,
                    focusDurationMode === 'preset' &&
                      focusSelectedPresetMinutes === 60 &&
                      styles.focusPresetChipTextSelected,
                  ]}
                >
                  60m
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.focusPresetChip,
                  focusDurationMode === 'custom' && styles.focusPresetChipSelected,
                  pressed && styles.focusPresetChipPressed,
                ]}
                onPress={() => {
                  setFocusDurationMode('custom');
                  setFocusCustomExpanded(true);
                }}
              >
                <Text
                  style={[
                    styles.focusPresetChipText,
                    focusDurationMode === 'custom' && styles.focusPresetChipTextSelected,
                  ]}
                >
                  {(() => {
                    const presets = [10, 25, 45, 60];
                    const draft = Math.max(1, Math.floor(Number(focusMinutesDraft) || 1));
                    if (focusDurationMode === 'custom') return `${draft}m`;
                    if (typeof lastFocusMinutes === 'number' && !presets.includes(lastFocusMinutes)) {
                      return `${Math.max(1, Math.round(lastFocusMinutes))}m`;
                    }
                    return 'Custom';
                  })()}
                </Text>
              </Pressable>
            </HStack>

            {focusDurationMode === 'custom' && focusCustomExpanded ? (
              <View>
                <Text style={styles.estimateFieldLabel}>Minutes</Text>
                <NumberWheelPicker
                  value={Math.max(1, Math.floor(Number(focusMinutesDraft) || 1))}
                  onChange={(next) => setFocusMinutesDraft(String(next))}
                  min={1}
                  max={focusMaxMinutes}
                />
              </View>
            ) : null}

            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setFocusSheetVisible(false)}
              >
                <Text style={styles.sheetRowLabel}>Cancel</Text>
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => {
                  startFocusSession().catch(() => undefined);
                }}
              >
                <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>
                  Start
                </Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={calendarSheetVisible}
        onClose={() => {
          setCalendarSheetVisible(false);
        }}
        snapPoints={['75%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Send to calendar</Text>
          <Text style={styles.sheetDescription}>
            Choose a calendar app. We’ll create a draft event with details filled in, then you can refine it there.
          </Text>

          <VStack space="md">
            <Text style={styles.sheetDescription}>
              Draft: {calendarStartDraft.toLocaleString()} · {Math.max(5, Math.floor(Number(calendarDurationDraft)))} min
            </Text>

            <KeyActionsRow
              size="lg"
              items={[
                {
                  id: 'calendar',
                  icon: 'apple',
                  label: 'Apple',
                  tileBackgroundColor: colors.canvas,
                  tileBorderColor: colors.border,
                  onPress: () => {
                    addActivityToNativeCalendar().catch(() => undefined);
                  },
                },
                ...(Platform.OS === 'ios'
                  ? ([
                      {
                        id: 'outlook',
                        icon: 'outlook',
                        label: 'Outlook',
                        tileBackgroundColor: colors.canvas,
                        tileBorderColor: colors.border,
                        onPress: () => {
                          openOutlookEventComposer().catch(() => undefined);
                        },
                      },
                    ] as const)
                  : []),
              ]}
            />

            <KeyActionsRow
              size="lg"
              items={[
                {
                  id: 'googleCalendar',
                  icon: 'google',
                  label: 'Google',
                  tileBackgroundColor: colors.canvas,
                  tileBorderColor: colors.border,
                  onPress: () => {
                    openGoogleCalendarComposer().catch(() => undefined);
                  },
                },
                {
                  id: 'ics',
                  icon: 'fileText',
                  label: '.ics file',
                  tileBackgroundColor: colors.canvas,
                  tileBorderColor: colors.border,
                  onPress: () => {
                    shareActivityAsIcs().catch(() => undefined);
                  },
                },
              ]}
            />

            {/* `.ics` export is available as a tile above to keep this sheet "app picker" focused. */}
          </VStack>
        </View>
      </BottomDrawer>

      <Modal
        visible={Boolean(focusSession)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          endFocusSession().catch(() => undefined);
        }}
      >
        <View
          style={[
            styles.focusOverlay,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={styles.focusTopBar}>
            <BrandLockup
              logoSize={28}
              wordmarkSize="sm"
              logoVariant="parchment"
              color={colors.parchment}
            />
            <Pressable
              onPress={() => setSoundscapeEnabled(!soundscapeEnabled)}
              style={({ pressed }) => [
                styles.focusSoundToggle,
                soundscapeEnabled ? styles.focusSoundToggleOn : styles.focusSoundToggleOff,
                pressed && styles.focusSoundTogglePressed,
              ]}
              accessibilityRole="switch"
              accessibilityLabel="Focus soundscape"
              accessibilityState={{ checked: soundscapeEnabled }}
              accessibilityHint={soundscapeEnabled ? 'Double tap to turn audio off' : 'Double tap to turn audio on'}
            >
              <HStack space="xs" alignItems="center">
                <Icon
                  name={soundscapeEnabled ? 'sound' : 'soundOff'}
                  size={18}
                  color={soundscapeEnabled ? colors.pine800 : colors.parchment}
                />
                <Text
                  style={[
                    styles.focusSoundToggleLabel,
                    soundscapeEnabled ? styles.focusSoundToggleLabelOn : styles.focusSoundToggleLabelOff,
                  ]}
                >
                  {soundscapeEnabled ? 'Audio on' : 'Audio off'}
                </Text>
              </HStack>
            </Pressable>
          </View>

          <View style={styles.focusCenter}>
            <Text style={styles.focusTimer}>{formatMsAsTimer(remainingFocusMs)}</Text>
            <Text style={styles.focusActivityTitle} numberOfLines={2}>
              {activity.title}
            </Text>
            <Text style={styles.focusStreakOverlayLabel}>
              Streak: {currentFocusStreak} day{currentFocusStreak === 1 ? '' : 's'}
            </Text>
          </View>

          <HStack space="sm" style={styles.focusBottomBar}>
            <Button
              accessibilityRole="button"
              accessibilityLabel="End focus session"
              variant="ghost"
              size="icon"
              iconButtonSize={56}
              style={styles.focusActionIconButton}
              onPress={() => endFocusSession().catch(() => undefined)}
            >
              <Icon name="stop" size={22} color={colors.parchment} />
            </Button>
            <Button
              accessibilityRole="button"
              accessibilityLabel={focusSession?.mode === 'paused' ? 'Resume focus session' : 'Pause focus session'}
              variant="ghost"
              size="icon"
              iconButtonSize={56}
              style={styles.focusActionIconButton}
              onPress={() => togglePauseFocusSession().catch(() => undefined)}
            >
              <Icon
                name={focusSession?.mode === 'paused' ? 'play' : 'pause'}
                size={22}
                color={colors.parchment}
              />
            </Button>
          </HStack>
        </View>
      </Modal>

      {AgentWorkspaceSheet}

      <BottomDrawer
        visible={sendToSheetVisible}
        onClose={() => setSendToSheetVisible(false)}
        snapPoints={['45%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Send to…</Text>
          <SheetOption
            label="Amazon"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToAmazon' });
              setSendToSheetVisible(false);
              handleSendToAmazon().catch(() => undefined);
            }}
          />
          <SheetOption
            label="Home Depot"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToHomeDepot' });
              setSendToSheetVisible(false);
              handleSendToHomeDepot().catch(() => undefined);
            }}
          />
          <SheetOption
            label="Instacart"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToInstacart' });
              setSendToSheetVisible(false);
              handleSendToInstacart().catch(() => undefined);
            }}
          />
          <View style={styles.cardSectionDivider} />
          <SheetOption
            label="Copy details"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToCopy' });
              setSendToSheetVisible(false);
              handleSendToCopy().catch(() => undefined);
            }}
          />
          <SheetOption
            label="Share…"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToShare' });
              setSendToSheetVisible(false);
              handleSendToShare().catch(() => undefined);
            }}
          />
          <View style={styles.cardSectionDivider} />
          <SheetOption label="Cancel" onPress={() => setSendToSheetVisible(false)} />
        </View>
      </BottomDrawer>
    </AppShell>
  );
}

function formatMsAsTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
  },
  headerSide: {
    flex: 1,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  breadcrumbsLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  breadcrumbsRight: {
    flex: 0,
  },
  menuRowText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  tagsFieldContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  tagsFieldInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tagsTextInput: {
    flexGrow: 1,
    flexShrink: 1,
    // Important: keep this small so the presence of an (empty) TextInput does NOT
    // force a second wrapped row when chips still fit on the current row.
    flexBasis: 40,
    minWidth: 40,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: typography.bodySm.lineHeight + 2,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  tagsAutofillBadge: {
    position: 'absolute',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  section: {
    paddingVertical: spacing.xs,
  },
  keyActionsInset: {
    // AppShell already provides the page gutter. Keep Key Actions aligned with the
    // rest of the Activity canvas (and avoid double-padding).
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.md,
    flexWrap: 'wrap',
  },
  rowPadding: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  titleStepsBundle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bundleDivider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginVertical: 2,
  },
  titlePressable: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleRow: {
    paddingHorizontal: 0,
    minHeight: 44,
  },
  titleRowContent: {
    // Keep the title vertically centered against the (slightly larger) checkbox.
    paddingVertical: spacing.xs,
  },
  titleText: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  titleInput: {
    ...typography.titleSm,
    color: colors.textPrimary,
    padding: 0,
    flexShrink: 1,
  },
  comboboxTrigger: {
    width: '100%',
  },
    comboboxValueContainer: {
      // `Input` dims non-editable fields by default. For combobox triggers, we want the
      // selected value to use the standard dark text appearance like other inputs.
      opacity: 1,
    },
    comboboxValueInput: {
      // Improve vertical centering of single-line value text (icon is already centered).
      color: colors.textPrimary,
      paddingVertical: 0,
      // Keep these explicit so we can safely override line metrics.
      fontFamily: typography.bodySm.fontFamily,
      fontSize: typography.bodySm.fontSize,
      // Line-height strongly affects perceived vertical centering.
      lineHeight: Platform.OS === 'ios' ? typography.bodySm.fontSize + 2 : typography.bodySm.lineHeight,
      // Android-only props (harmless on iOS, but not relied upon there).
      includeFontPadding: false,
      textAlignVertical: 'center',
      // iOS: very small baseline nudge upward (text tends to sit slightly low).
      ...(Platform.OS === 'ios' ? { marginTop: -1 } : null),
    },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  detailGuideTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  detailGuideBody: {
    ...typography.body,
    color: colors.textPrimary,
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
  checkboxCompleted: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
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
  rowValueSet: {
    color: colors.sumi,
  },
  rowContent: {
    // Slightly taller than default row height without feeling oversized.
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  cardSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginVertical: 2,
  },
  rowsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  sectionLabelRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 2,
  },
  stepsHeaderRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  stepsHeaderLabel: {
    ...typography.label,
    color: colors.textSecondary,
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
    paddingVertical: spacing.xs,
  },
  stepRow: {
    minHeight: 40,
    // Center checkbox / text / actions vertically for consistent row rhythm.
    alignItems: 'center',
  },
  stepRowContent: {
    paddingVertical: 0,
    justifyContent: 'center',
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepLeftIconBox: {
    // Alignment box: keep left-column centers consistent with the title's 24x24 check-circle,
    // while allowing the actual step circle to remain smaller (via `stepCheckbox`).
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    ...typography.bodySm,
    color: colors.textPrimary,
    paddingVertical: spacing.xs / 2,
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
    width: 28,
    height: 28,
    borderRadius: 999,
  },
  addStepRow: {
    marginTop: 0,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.accent,
    // Match the inline `Input` baseline metrics so "Add step" aligns with step titles.
    // (Vector icon glyphs + iOS baselines tend to read slightly low otherwise.)
    lineHeight: 18,
    ...(Platform.OS === 'android'
      ? ({
          includeFontPadding: false,
          textAlignVertical: 'center',
        } as const)
      : ({ marginTop: -1 } as const)),
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  rowRight: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
  rowValueAi: {
    color: colors.accent,
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
  estimateFieldsRow: {
    width: '100%',
  },
  estimatePickerContainer: {
    width: '100%',
    // Keep the wheel comfortably separated from the buttons.
    paddingVertical: spacing.sm,
    // Let the iOS wheel claim vertical space inside the sheet.
    flexGrow: 1,
    justifyContent: 'center',
  },
  estimateField: {
    flex: 1,
  },
  estimateFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  customRepeatHeaderRow: {
    width: '100%',
    marginBottom: spacing.md,
  },
  customRepeatHeaderTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  customRepeatSetLabel: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  customRepeatPickerBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  iosWheelFrame: {
    width: 140,
    height: 190,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  iosWheelItem: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  customRepeatSectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  customRepeatWeekdayRow: {
    flexWrap: 'wrap',
  },
  customRepeatWeekdayChip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRepeatWeekdayChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  customRepeatWeekdayChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  customRepeatWeekdayChipTextSelected: {
    color: colors.primaryForeground,
  },
  datePickerContainer: {
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  objectTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  objectTypeLabel: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  objectTypeLabelV2: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerV2: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  headerV2TopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerV2Title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionsTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  actionsButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  actionsButtonLabelDestructive: {
    ...typography.body,
    color: colors.canvas,
    fontFamily: fonts.medium,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  optionsButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  destructiveMenuRowText: {
    ...typography.body,
    color: colors.destructive,
  },
  doneButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  doneButtonPressed: {
    opacity: 0.75,
  },
  doneButtonText: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  sheetDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  calendarPermissionNotice: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  calendarListContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  calendarChoiceRow: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.shell,
  },
  calendarChoiceRowSelected: {
    backgroundColor: colors.accent,
  },
  calendarChoiceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  calendarChoiceLabelSelected: {
    color: colors.primaryForeground,
  },
  focusPresetRow: {
    flexWrap: 'wrap',
  },
  focusPresetChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  focusPresetChipPressed: {
    opacity: 0.86,
  },
  focusPresetChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  focusPresetChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  focusPresetChipTextSelected: {
    color: colors.primaryForeground,
  },
  focusOverlay: {
    flex: 1,
    backgroundColor: colors.pine700,
    paddingHorizontal: spacing.lg,
  },
  focusTopBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  focusSoundToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusSoundToggleOn: {
    backgroundColor: colors.parchment,
    borderColor: 'rgba(250,247,237,0.9)',
  },
  focusSoundToggleOff: {
    backgroundColor: 'rgba(250,247,237,0.08)',
    borderColor: 'rgba(250,247,237,0.35)',
  },
  focusSoundTogglePressed: {
    opacity: 0.9,
  },
  focusSoundToggleLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  focusSoundToggleLabelOn: {
    color: colors.pine800,
  },
  focusSoundToggleLabelOff: {
    color: colors.parchment,
  },
  focusCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  focusStreakOverlayLabel: {
    ...typography.body,
    color: colors.parchment,
    opacity: 0.9,
    marginTop: spacing.sm,
  },
  focusStreakSheetLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  focusTimer: {
    // Best approximation of the Apple Watch “thick rounded” vibe without bundling new fonts:
    // iOS will render a very watch-like result with heavy system weights and tabular numbers.
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Rounded' : fonts.black,
    fontWeight: Platform.OS === 'ios' ? '900' : '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.2,
    fontSize: 78,
    lineHeight: 84,
    color: colors.parchment,
    textAlign: 'center',
  },
  focusActivityTitle: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  focusBottomBar: {
    marginTop: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusActionIconButton: {
    borderWidth: 1,
    borderColor: 'rgba(250,247,237,0.28)',
    backgroundColor: 'rgba(250,247,237,0.08)',
  },
});



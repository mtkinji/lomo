import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
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
import { NumberWheelPicker } from '../../ui/NumberWheelPicker';
import { Picker } from '@react-native-picker/picker';
import { SOUND_SCAPES, preloadSoundscape, startSoundscapeLoop, stopSoundscapeLoop } from '../../services/soundscape';
import { VStack, HStack, Input, ThreeColumnRow, Combobox, ObjectPicker, KeyboardAwareScrollView } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ObjectTypeIconBadge } from '../../ui/ObjectTypeIconBadge';
import { BrandLockup } from '../../ui/BrandLockup';
import { HeaderActionPill } from '../../ui/layout/ObjectPageHeader';
import { Coachmark } from '../../ui/Coachmark';
import { BreadcrumbBar } from '../../ui/BreadcrumbBar';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import { LongTextField } from '../../ui/LongTextField';
import { NarrativeEditableTitle } from '../../ui/NarrativeEditableTitle';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { richTextToPlainText } from '../../ui/richText';
import { DurationPicker } from './DurationPicker';
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
import { buildOutlookEventLinks } from '../../utils/outlookEventLinks';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import { openPaywallInterstitial } from '../../services/paywall';
import { Toast } from '../../ui/Toast';
import { buildAffiliateRetailerSearchUrl } from '../../services/affiliateLinks';
import { HapticsService } from '../../services/HapticsService';
import { useCoachmarkHost } from '../../ui/hooks/useCoachmarkHost';
import { styles } from './activityDetailStyles';
import { ActivityDetailRefresh } from './ActivityDetailRefresh';
import { ActionDock } from '../../ui/ActionDock';

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
  const headerInk = colors.sumi;
  const route = useRoute<ActivityDetailRouteProp>();
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const { activityId, openFocus } = route.params;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Geometry for screen-edge scroll fade (only affects scroll content beneath header/dock).
  // AppShell applies `spacing.sm + insets.top` padding to the canvas; we use that to extend
  // the top fade up to the physical top of the device.
  const appShellTopInsetPx = spacing.sm + insets.top;
  const [refreshContainerHeightPx, setRefreshContainerHeightPx] = useState<number | null>(null);
  const [actionDockLayoutY, setActionDockLayoutY] = useState<number | null>(null);
  const bottomFadeHeightPx =
    !isKeyboardVisible && refreshContainerHeightPx != null && actionDockLayoutY != null
      ? Math.max(0, refreshContainerHeightPx - actionDockLayoutY)
      : undefined;

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
  const remoteJtbdRefreshEnabled = useFeatureFlag('activity_detail_jtbd_refresh', false);
  const devActivityDetailJtbdRefreshEnabled = useAppStore(
    (state) => state.devActivityDetailJtbdRefreshEnabled,
  );
  const jtbdRefreshEnabled = (__DEV__ && devActivityDetailJtbdRefreshEnabled) || remoteJtbdRefreshEnabled;
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const recordCompletedFocusSession = useAppStore((state) => state.recordCompletedFocusSession);
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const lastFocusMinutes = useAppStore((state) => state.lastFocusMinutes);
  const setLastFocusMinutes = useAppStore((state) => state.setLastFocusMinutes);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const setSoundscapeEnabled = useAppStore((state) => state.setSoundscapeEnabled);
  const soundscapeTrackId = useAppStore((state) => state.soundscapeTrackId);
  const setSoundscapeTrackId = useAppStore((state) => state.setSoundscapeTrackId);
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

  type ActiveSheet =
    | 'reminder'
    | 'due'
    | 'repeat'
    | 'customRepeat'
    | 'estimate'
    | 'focus'
    | 'calendar'
    | 'sendTo'
    | null;

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const reminderSheetVisible = activeSheet === 'reminder';
  const dueDateSheetVisible = activeSheet === 'due';
  const repeatSheetVisible = activeSheet === 'repeat';
  const customRepeatSheetVisible = activeSheet === 'customRepeat';
  const [customRepeatInterval, setCustomRepeatInterval] = useState<number>(1);
  const [customRepeatCadence, setCustomRepeatCadence] = useState<ActivityRepeatCustom['cadence']>('weeks');
  const [customRepeatWeekdays, setCustomRepeatWeekdays] = useState<number[]>(() => [new Date().getDay()]);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = useState(false);
  const [isReminderDateTimePickerVisible, setIsReminderDateTimePickerVisible] = useState(false);

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
  const inputFocusCountRef = useRef(0);
  const [isAnyInputFocused, setIsAnyInputFocused] = useState(false);
  const [goalComboboxOpen, setGoalComboboxOpen] = useState(false);
  const [difficultyComboboxOpen, setDifficultyComboboxOpen] = useState(false);
  const estimateSheetVisible = activeSheet === 'estimate';
  const [estimateDraftMinutes, setEstimateDraftMinutes] = useState<number>(30);

  const focusSheetVisible = activeSheet === 'focus';
  const [focusMinutesDraft, setFocusMinutesDraft] = useState('25');
  const [focusCustomExpanded, setFocusCustomExpanded] = useState(false);
  const [focusSession, setFocusSession] = useState<FocusSessionState | null>(null);
  const [focusTickMs, setFocusTickMs] = useState(() => Date.now());
  const focusEndNotificationIdRef = useRef<string | null>(null);
  const focusLaunchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusPresetValues = [10, 25, 45, 60];
  const focusDraftMinutes = Math.min(
    focusMaxMinutes,
    Math.max(1, Math.floor(Number(focusMinutesDraft) || 1)),
  );
  const focusIsCustomValue = !focusPresetValues.includes(focusDraftMinutes);

  const focusSheetSnapPoints = useMemo(() => {
    // Ensure the sheet can show the full preset row + optional custom wheel + soundscape + CTA buttons
    // without requiring scroll on typical phone sizes.
    if (Platform.OS === 'ios') {
      return [focusCustomExpanded ? ('82%' as const) : ('72%' as const)];
    }
    return [focusCustomExpanded ? ('74%' as const) : ('62%' as const)];
  }, [focusCustomExpanded]);

  const calendarSheetVisible = activeSheet === 'calendar';
  const [calendarStartDraft, setCalendarStartDraft] = useState<Date>(new Date());
  const [calendarDurationDraft, setCalendarDurationDraft] = useState('30');
  const [calendarPermissionStatus, setCalendarPermissionStatus] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [writableCalendars, setWritableCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [isCreatingCalendarEvent, setIsCreatingCalendarEvent] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const sendToSheetVisible = activeSheet === 'sendTo';
  const [isOutlookInstalled, setIsOutlookInstalled] = useState(false);
  const [pendingCalendarToast, setPendingCalendarToast] = useState<string | null>(null);

  const titleStepsBundleRef = useRef<View | null>(null);
  const scheduleAndPlanningCardRef = useRef<View | null>(null);
  const finishMutationRef = useRef<{ completedAtStamp: string; stepIds: string[] } | null>(null);
  const [detailGuideStep, setDetailGuideStep] = useState(0);
  const [isTitleStepsBundleReady, setIsTitleStepsBundleReady] = useState(false);
  const [isScheduleCardReady, setIsScheduleCardReady] = useState(false);
  const [titleStepsBundleOffset, setTitleStepsBundleOffset] = useState<number | null>(null);
  const [scheduleCardOffset, setScheduleCardOffset] = useState<number | null>(null);

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
    const url = buildAffiliateRetailerSearchUrl('amazon', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [buildSendToSearchQuery, openExternalUrl]);

  const handleSendToHomeDepot = useCallback(async () => {
    const q = buildSendToSearchQuery();
    if (!q) return;
    const url = buildAffiliateRetailerSearchUrl('homeDepot', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [buildSendToSearchQuery, openExternalUrl]);

  const handleSendToInstacart = useCallback(async () => {
    const q = buildSendToSearchQuery();
    if (!q) return;
    // Best-effort web fallback (native deep links can be added later).
    const url = buildAffiliateRetailerSearchUrl('instacart', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [buildSendToSearchQuery, openExternalUrl]);

  useEffect(() => {
    // iOS interactive dismissal can fail to fire `keyboardDidHide`, leaving stale state.
    // Use the more reliable "will*" + frame-change events on iOS.
    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
      const hideSub = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        const nextHeight = e?.endCoordinates?.height ?? 0;
        setIsKeyboardVisible(nextHeight > 0);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
        frameSub.remove();
      };
    }

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
  // Editing/keyboard state: used to suppress certain UI (coachmarks, completion checkmark)
  // that can be confusing when the keyboard is present.
  const editingUiActive = isKeyboardVisible || isEditingTitle || isAddingStepInline;
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
    !editingUiActive &&
    !goalComboboxOpen &&
    !difficultyComboboxOpen &&
    !reminderSheetVisible &&
    !dueDateSheetVisible &&
    !repeatSheetVisible &&
    !estimateSheetVisible &&
    (detailGuideStep === 0 ? isTitleStepsBundleReady : isScheduleCardReady);

  const detailGuideTargetScrollY = useMemo(() => {
    if (detailGuideStep === 0) return 0;
    return scheduleCardOffset != null ? Math.max(0, scheduleCardOffset - 120) : null;
  }, [detailGuideStep, scheduleCardOffset]);

  const detailGuideStepReady = detailGuideStep === 0 || scheduleCardOffset != null;

  const detailGuideHost = useCoachmarkHost({
    active: shouldShowDetailGuide && detailGuideStepReady,
    stepKey: detailGuideStep,
    targetScrollY: detailGuideTargetScrollY,
    scrollTo: (args) => scrollRef.current?.scrollTo(args),
  });

  const dismissDetailGuide = () => {
    setHasDismissedActivityDetailGuide(true);
    setDetailGuideStep(0);
  };

  const detailGuideTargetRef = detailGuideStep === 0 ? titleStepsBundleRef : scheduleAndPlanningCardRef;
  const detailGuideTitle = detailGuideStep === 0 ? 'Edit + complete here' : 'Schedule + plan';
  const detailGuideBody =
    detailGuideStep === 0
      ? 'Check steps to make progress—when all steps are checked, the Activity is complete. Tap the bottom-right button to finish remaining steps fast; tap again to undo that finish.'
      : 'Add reminders, due dates, and repeats. Use time estimate + difficulty to keep your plan realistic (AI suggestions appear when available).';

  const handleDoneEditing = () => {
    // Prefer blurring the known inline inputs first so their onBlur commits fire.
    titleInputRef.current?.blur();
    newStepInputRef.current?.blur();
    // Also blur any currently-focused input (e.g. step title Input) so iOS reliably exits edit mode.
    const focused = (TextInput as any)?.State?.currentlyFocusedInput?.();
    if (focused) {
      (TextInput as any)?.State?.blurTextInput?.(focused);
    }
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
    setFocusCustomExpanded(false);
    setActiveSheet('focus');
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
      void HapticsService.trigger('outcome.warning');
      openPaywallInterstitial({ reason: 'pro_only_focus_mode', source: 'activity_focus_mode' });
      return;
    }
    void HapticsService.trigger('canvas.primary.confirm');
    setLastFocusMinutes(minutes);

    setActiveSheet(null);
    // Start preloading immediately so sound can come up quickly once the focus overlay appears.
    preloadSoundscape({ soundscapeId: soundscapeTrackId }).catch(() => undefined);
    // Avoid stacking our focus interstitial modal on top of the BottomDrawer modal
    // while it is animating out; otherwise iOS can show the scrim but hide the next modal.
    if (focusLaunchTimeoutRef.current) {
      clearTimeout(focusLaunchTimeoutRef.current);
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
      void HapticsService.trigger('canvas.toggle.on');
      const endAtMs = Date.now() + focusSession.remainingMs;
      setFocusSession({ mode: 'running', startedAtMs: focusSession.startedAtMs, endAtMs });
      setFocusTickMs(Date.now());
      return;
    }

    void HapticsService.trigger('canvas.toggle.off');
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
      startSoundscapeLoop({ fadeInMs: 250, soundscapeId: soundscapeTrackId }).catch(() => undefined);
      return;
    }
    stopSoundscapeLoop().catch(() => undefined);
  }, [focusSession?.mode, soundscapeEnabled, soundscapeTrackId]);

  useEffect(() => {
    if (!focusSession) return;
    if (focusSession.mode !== 'running') return;
    if (remainingFocusMs > 0) return;

    // Session completed
    void HapticsService.trigger('outcome.success');
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
    setActiveSheet('calendar');
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
        setFocusCustomExpanded(false);
        setActiveSheet('focus');
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
        setActiveSheet('calendar');
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

      setActiveSheet(null);
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
        setActiveSheet(null);
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
      setActiveSheet(null);
    } catch (error) {
      // Last-ditch fallback: copy the ICS text.
      try {
        await Clipboard.setStringAsync(ics);
        updateActivity(activity.id, (prev) => ({
          ...prev,
          scheduledAt: startAt.toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setActiveSheet(null);
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
    const { nativeUrl, webUrl } = buildOutlookEventLinks({
      subject: activity.title,
      body,
      startAt,
      endAt,
    });

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
      setActiveSheet(null);
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
      setActiveSheet(null);
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

    const allStepsComplete = nextSteps.length > 0 && nextSteps.every((s) => !!s.completedAt);
    const anyStepComplete = nextSteps.some((s) => !!s.completedAt);

    let nextStatus: ActivityStatus = prevStatus;
    if (allStepsComplete) {
      nextStatus = 'done';
    } else if (anyStepComplete) {
      nextStatus = 'in_progress';
    } else {
      nextStatus = 'planned';
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
    const hasSteps = (stepsDraft?.length ?? 0) > 0;

    // No steps: keep the manual done toggle behavior.
    if (!hasSteps) {
      finishMutationRef.current = null;
      const wasCompleted = isCompleted;
      updateActivity(activity.id, (prev) => {
        const nextIsDone = prev.status !== 'done';
        return {
          ...prev,
          status: nextIsDone ? 'done' : 'planned',
          completedAt: nextIsDone ? timestamp : null,
          updatedAt: timestamp,
        };
      });
      if (!wasCompleted) {
        // Toggling from not-done to done counts as "showing up" for the day.
        recordShowUp();
      }
      return;
    }

    // Steps exist: completion is driven by steps. The button is a Finish/Undo shortcut.
    const stepsNow = stepsDraft ?? [];
    const allStepsCompleteNow = stepsNow.length > 0 && stepsNow.every((s) => !!s.completedAt);

    if (!allStepsCompleteNow) {
      const stepIdsToComplete = stepsNow.filter((s) => !s.completedAt).map((s) => s.id);
      if (stepIdsToComplete.length === 0) return;
      finishMutationRef.current = { completedAtStamp: timestamp, stepIds: stepIdsToComplete };
      const idSet = new Set(stepIdsToComplete);
      applyStepUpdate((steps) =>
        steps.map((step) =>
          idSet.has(step.id) && !step.completedAt ? { ...step, completedAt: timestamp } : step
        )
      );
      return;
    }

    // Undo finish: only revert steps that were completed by the most recent Finish action.
    const mutation = finishMutationRef.current;
    if (!mutation || mutation.stepIds.length === 0) {
      return;
    }
    finishMutationRef.current = null;
    const idSet = new Set(mutation.stepIds);
    applyStepUpdate((steps) =>
      steps.map((step) =>
        idSet.has(step.id) && step.completedAt === mutation.completedAtStamp
          ? { ...step, completedAt: null }
          : step
      )
    );
  };

  const handleSelectReminder = (offsetDays: number, hours = 9, minutes = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(hours, minutes, 0, 0);
    const timestamp = new Date().toISOString();
    // Planning counts as showing up (reminders are a commitment device).
    recordShowUp();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: date.toISOString(),
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsReminderDateTimePickerVisible(false);
  };

  const handleReminderDateTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsReminderDateTimePickerVisible(false);
    }
    if (!date || event.type === 'dismissed') return;
    const next = new Date(date);
    const timestamp = new Date().toISOString();
    recordShowUp();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: next.toISOString(),
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsReminderDateTimePickerVisible(false);
  };

  const getInitialReminderDateTimeForPicker = () => {
    if (activity.reminderAt) return new Date(activity.reminderAt);
    const base = new Date();
    base.setMinutes(0, 0, 0);
    base.setHours(base.getHours() + 1);
    return base;
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
    setActiveSheet(null);
  };

  const handleClearDueDate = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: null,
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
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
    setActiveSheet(null);
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
    setActiveSheet(null);
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
    setActiveSheet(null);
    if (repeatDrawerTransitionTimeoutRef.current) {
      clearTimeout(repeatDrawerTransitionTimeoutRef.current);
    }
    repeatDrawerTransitionTimeoutRef.current = setTimeout(() => {
      setActiveSheet('customRepeat');
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
    setActiveSheet(null);
  };

  const handleClearReminder = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: null,
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsReminderDateTimePickerVisible(false);
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
    setActiveSheet(null);
  };

  const completedStepsCount = useMemo(
    () => (stepsDraft ?? []).filter((step) => !!step.completedAt).length,
    [stepsDraft]
  );
  const totalStepsCount = stepsDraft?.length ?? 0;

  const actionDockRightProgress =
    totalStepsCount > 0 ? Math.max(0, Math.min(1, completedStepsCount / totalStepsCount)) : undefined;
  const allStepsComplete = totalStepsCount > 0 && completedStepsCount >= totalStepsCount;
  const dockCompleteColor = colors.pine700;
  const actionDockCountLabel = totalStepsCount > 0 ? `${completedStepsCount}/${totalStepsCount}` : undefined;

  const [rightItemCelebrateKey, setRightItemCelebrateKey] = useState(0);
  const prevProgressRef = useRef<number>(0);
  const [rightItemCenterLabelPulseKey, setRightItemCenterLabelPulseKey] = useState(0);
  const prevCompletedCountRef = useRef<number>(completedStepsCount);
  const completionToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTypeLabel = useMemo(() => {
    const match = (activityTypeOptions ?? []).find((opt: any) => opt?.value === activity.type);
    return (match?.label ?? 'Activity') as string;
  }, [activity.type, activityTypeOptions]);
  useEffect(() => {
    const next = typeof actionDockRightProgress === 'number' && Number.isFinite(actionDockRightProgress) ? actionDockRightProgress : 0;
    const prev = prevProgressRef.current;
    // Trigger only on the edge: < 1 -> 1
    if (prev < 1 && next >= 1) {
      setRightItemCelebrateKey((k) => k + 1);
      if (completionToastTimeoutRef.current) {
        clearTimeout(completionToastTimeoutRef.current);
        completionToastTimeoutRef.current = null;
      }
      // Pop after the celebration finishes (ring 420ms + confetti 450ms ≈ 870ms).
      completionToastTimeoutRef.current = setTimeout(() => {
        showToast({
          message: `${activityTypeLabel} complete`,
          variant: 'light',
          durationMs: 2200,
        });
      }, 900);
    }
    prevProgressRef.current = next;
  }, [actionDockRightProgress]);

  useEffect(() => {
    // Pulse the center count only on single-step toggles while in partial completion.
    if (totalStepsCount <= 0) return;
    if (completedStepsCount >= totalStepsCount) return;
    const prevCompleted = prevCompletedCountRef.current;
    const delta = completedStepsCount - prevCompleted;
    if (Math.abs(delta) === 1) {
      setRightItemCenterLabelPulseKey((k) => k + 1);
    }
    prevCompletedCountRef.current = completedStepsCount;
  }, [completedStepsCount, totalStepsCount]);

  useEffect(() => {
    return () => {
      if (completionToastTimeoutRef.current) {
        clearTimeout(completionToastTimeoutRef.current);
        completionToastTimeoutRef.current = null;
      }
    };
  }, []);

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
    setEstimateDraftMinutes(Math.max(15, Math.round(minutes > 0 ? minutes : 30)));
    setActiveSheet('estimate');
  };

  const commitEstimateDraft = () => {
    const total = Math.max(0, Math.round(estimateDraftMinutes));
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      estimateMinutes: total > 0 ? total : undefined,
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
  };

  useEffect(() => {
    setTitleDraft(activity.title ?? '');
    setTagsInputDraft('');
    setStepsDraft(activity.steps ?? []);
  }, [activity.title, activity.notes, activity.steps, activity.id]);

  return (
    <AppShell fullBleedCanvas={jtbdRefreshEnabled}>
      <View style={styles.screen}>
        {/* Credits warning toasts are rendered globally via AppShell. */}
        <VStack space="lg" style={styles.pageContent}>
          {jtbdRefreshEnabled ? (
            <View
              style={{ flex: 1 }}
              onLayout={(e) => {
                const h = e?.nativeEvent?.layout?.height;
                if (typeof h === 'number' && Number.isFinite(h)) setRefreshContainerHeightPx(h);
              }}
            >
              <ActivityDetailRefresh
              breadcrumbsEnabled={breadcrumbsEnabled}
              arc={arc}
              goal={goal}
              navigation={navigation}
              headerV2Enabled={headerV2Enabled}
              editingUiActive={editingUiActive}
              handleDoneEditing={handleDoneEditing}
              handleToggleComplete={handleToggleComplete}
              isCompleted={isCompleted}
              handleSendToShare={handleSendToShare}
              handleBackToActivities={handleBackToActivities}
              rootNavigationRef={rootNavigationRef}
              activity={activity}
              capture={capture}
              openFocusSheet={openFocusSheet}
              openCalendarSheet={openCalendarSheet}
              openAgentForActivity={openAgentForActivity}
              canSendTo={canSendTo}
              setActiveSheet={setActiveSheet}
              scrollRef={scrollRef}
              KEYBOARD_CLEARANCE={KEYBOARD_CLEARANCE}
              detailGuideHost={detailGuideHost}
              styles={styles}
              updateActivity={updateActivity}
              titleStepsBundleRef={titleStepsBundleRef}
              setIsTitleStepsBundleReady={setIsTitleStepsBundleReady}
              setTitleStepsBundleOffset={setTitleStepsBundleOffset}
              stepsDraft={stepsDraft}
              handleToggleStepComplete={handleToggleStepComplete}
              handleRemoveStep={handleRemoveStep}
              handleChangeStepTitle={handleChangeStepTitle}
              beginAddStepInline={beginAddStepInline}
              isAddingStepInline={isAddingStepInline}
              newStepInputRef={newStepInputRef}
              newStepTitle={newStepTitle}
              setNewStepTitle={setNewStepTitle}
              commitInlineStep={commitInlineStep}
              handleAnyInputFocus={handleAnyInputFocus}
              handleAnyInputBlur={handleAnyInputBlur}
              scheduleAndPlanningCardRef={scheduleAndPlanningCardRef}
              setIsScheduleCardReady={setIsScheduleCardReady}
              setScheduleCardOffset={setScheduleCardOffset}
              reminderLabel={reminderLabel}
              dueDateLabel={dueDateLabel}
              repeatLabel={repeatLabel}
              timeEstimateLabel={timeEstimateLabel}
              timeEstimateIsAi={timeEstimateIsAi}
              difficultyLabel={difficultyLabel}
              difficultyIsAi={difficultyIsAi}
              hasTimeEstimate={hasTimeEstimate}
              hasDifficulty={hasDifficulty}
              handleClearReminder={handleClearReminder}
              handleClearDueDate={handleClearDueDate}
              handleClearRepeatRule={handleClearRepeatRule}
              openEstimateSheet={openEstimateSheet}
              handleClearTimeEstimate={handleClearTimeEstimate}
              difficultyComboboxOpen={difficultyComboboxOpen}
              setDifficultyComboboxOpen={setDifficultyComboboxOpen}
              difficultyOptions={difficultyOptions}
              handleClearDifficulty={handleClearDifficulty}
              totalStepsCount={totalStepsCount}
              completedStepsCount={completedStepsCount}
              tagsFieldContainerRef={tagsFieldContainerRef}
              tagsInputRef={tagsInputRef}
              prepareRevealTagsField={prepareRevealTagsField}
              tagsInputDraft={tagsInputDraft}
              setTagsInputDraft={setTagsInputDraft}
              showTagsAutofill={showTagsAutofill}
              TAGS_AI_AUTOFILL_SIZE={TAGS_AI_AUTOFILL_SIZE}
              isTagsAutofillThinking={isTagsAutofillThinking}
              tagsAutofillInFlightRef={tagsAutofillInFlightRef}
              isPro={isPro}
              tryConsumeGenerativeCredit={tryConsumeGenerativeCredit}
              openPaywallInterstitial={openPaywallInterstitial}
              suggestActivityTagsWithAi={suggestActivityTagsWithAi}
              activityTagHistory={activityTagHistory}
              goalTitle={goalTitle}
              suggestTagsFromText={suggestTagsFromText}
              addTags={addTags}
              isKeyboardVisible={isKeyboardVisible}
              TAGS_REVEAL_EXTRA_OFFSET={TAGS_REVEAL_EXTRA_OFFSET}
              commitTagsInputDraft={commitTagsInputDraft}
              handleRemoveTag={handleRemoveTag}
              goalOptions={goalOptions}
              recommendedGoalOption={recommendedGoalOption}
              activityTypeOptions={activityTypeOptions}
              handleDeleteActivity={handleDeleteActivity}
              setIsTagsAutofillThinking={setIsTagsAutofillThinking}
              // Full-bleed canvas: the refresh layout handles safe area itself.
              appShellTopInsetPx={0}
              safeAreaTopInsetPx={insets.top}
              pageGutterX={spacing.xl}
              bottomFadeHeightPx={bottomFadeHeightPx}
              />
              {!isKeyboardVisible ? (
                <ActionDock
                  onLayout={(e) => {
                    const y = e?.nativeEvent?.layout?.y;
                    if (typeof y === 'number' && Number.isFinite(y)) setActionDockLayoutY(y);
                  }}
                  leftItems={[
                    {
                      id: 'focus',
                      icon: 'focus',
                      accessibilityLabel: 'Open focus mode',
                      onPress: () => {
                        capture(AnalyticsEvent.ActivityActionInvoked, {
                          activityId: activity.id,
                          action: 'focusMode',
                        });
                        openFocusSheet();
                      },
                      // Preserve existing e2e id
                      testID: 'e2e.activityDetail.keyAction.focusMode',
                    },
                    {
                      id: 'schedule',
                      icon: 'sendToCalendar',
                      accessibilityLabel: 'Send to calendar',
                      onPress: () => {
                        capture(AnalyticsEvent.ActivityActionInvoked, {
                          activityId: activity.id,
                          action: 'addToCalendar',
                        });
                        openCalendarSheet();
                      },
                      // Preserve existing e2e id
                      testID: 'e2e.activityDetail.keyAction.addToCalendar',
                    },
                    ...(canSendTo
                      ? ([
                          {
                            id: 'sendTo',
                            icon: 'sendTo',
                            accessibilityLabel: 'Send to…',
                            onPress: () => {
                              capture(AnalyticsEvent.ActivityActionInvoked, {
                                activityId: activity.id,
                                action: 'sendTo',
                              });
                              setActiveSheet('sendTo');
                            },
                            testID: 'e2e.activityDetail.dock.sendTo',
                          },
                        ] as const)
                      : []),
                    {
                      id: 'ai',
                      icon: 'sparkles',
                      accessibilityLabel: 'Get help from AI',
                      onPress: () => {
                        capture(AnalyticsEvent.ActivityActionInvoked, {
                          activityId: activity.id,
                          action: 'chatWithAi',
                        });
                        openAgentForActivity({ objectType: 'activity', objectId: activity.id });
                      },
                      testID: 'e2e.activityDetail.dock.ai',
                    },
                  ]}
                  rightItem={{
                    id: 'done',
                    icon: 'check',
                    accessibilityLabel: isCompleted
                      ? 'Mark activity as not done'
                      : 'Mark activity as done',
                    onPress: handleToggleComplete,
                    testID: 'e2e.activityDetail.dock.donePrimary',
                    // Keep the checkmark Sumi until all steps are complete.
                    color: allStepsComplete ? colors.parchment : colors.sumi,
                  }}
                  rightItemProgress={actionDockRightProgress}
                  rightItemRingColor={dockCompleteColor}
                  rightItemBackgroundColor={allStepsComplete ? dockCompleteColor : undefined}
                  rightItemCelebrateKey={rightItemCelebrateKey}
                  rightItemCenterLabel={actionDockCountLabel}
                  rightItemCenterLabelPulseKey={rightItemCenterLabelPulseKey}
                  // AppShell already provides the canvas gutter; keep docks “nested” into the corners.
                  // Nestle into the corners, but keep a consistent 16pt inset from the canvas edges.
                  // Match Arc/Goal effective page gutter (xl) while ActivityDetail runs inside
                  // AppShell's default gutter (sm). Add the delta so total ~= xl.
                  insetX={spacing.xl}
                  insetBottom={16}
                  // Notes-style: apply a partial safe-area lift so the dock “matches the corner curve”
                  // without jumping as high as the full home-indicator inset.
                  safeAreaLift="half"
                />
              ) : null}
            </View>
          ) : null}

          {/* Legacy layout (kept as fallback; hidden when the refresh flag is enabled). */}
          <View
            style={[
              styles.legacyContainer,
              jtbdRefreshEnabled ? styles.legacyHidden : undefined,
            ]}
          >
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
                  {headerV2Enabled ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => {
                        handleSendToShare().catch(() => undefined);
                      }}
                      accessibilityLabel="Share activity"
                    >
                      <Icon name="share" size={18} color={headerInk} />
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger accessibilityLabel="Activity actions">
                        <IconButton style={styles.optionsButton} pointerEvents="none" accessible={false}>
                          <Icon name="more" size={18} color={headerInk} />
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
                        <HeaderActionPill
                          onPress={handleBackToActivities}
                          accessibilityLabel="Back to Activities"
                          materialVariant="onLight"
                          size={44}
                        >
                          <Icon name="chevronLeft" size={20} color={headerInk} />
                        </HeaderActionPill>
                      </HStack>
                      {(
                        <HeaderActionPill
                          onPress={() => {
                            handleSendToShare().catch(() => undefined);
                          }}
                          accessibilityLabel="Share activity"
                          materialVariant="onLight"
                          size={44}
                        >
                          <Icon name="share" size={18} color={headerInk} />
                        </HeaderActionPill>
                      )}
                    </View>
                    <Text style={styles.headerV2Title} numberOfLines={1} ellipsizeMode="tail">
                      {(activity?.title ?? '').trim() || 'Activity'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.headerSide}>
                      <HeaderActionPill
                        onPress={handleBackToActivities}
                        accessibilityLabel="Back to Activities"
                        materialVariant="onLight"
                        size={44}
                      >
                        <Icon name="chevronLeft" size={20} color={headerInk} />
                      </HeaderActionPill>
                    </View>
                    <View style={styles.headerCenter}>
                      {/* Intentionally omit the object-type pill in the header for Activity detail. */}
                    </View>
                    <View style={styles.headerSideRight}>
                      {(
                        <DropdownMenu>
                          <DropdownMenuTrigger accessibilityLabel="Activity actions">
                            <HeaderActionPill
                              accessibilityLabel="Activity actions"
                              materialVariant="onLight"
                              size={44}
                            >
                              <Icon name="more" size={18} color={headerInk} />
                            </HeaderActionPill>
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
            scrollEnabled={detailGuideHost.scrollEnabled}
          >
            {/* Title + Steps bundle (task-style, no enclosing card) */}
            <View style={styles.section}>
              <View
                ref={titleStepsBundleRef}
                collapsable={false}
                style={styles.titleStepsBundle}
                onLayout={(event) => {
                  // Ensure the onboarding coachmark can safely measure this target.
                  setIsTitleStepsBundleReady(true);
                  const y = event.nativeEvent.layout.y;
                  if (typeof y === 'number' && Number.isFinite(y)) {
                    setTitleStepsBundleOffset(y);
                  }
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
                  testID="e2e.activityDetail.steps.addRow"
                  accessibilityLabel="Add a step to this activity"
                  style={[styles.stepRow, styles.addStepRow]}
                  contentStyle={styles.stepRowContent}
                >
                  {isAddingStepInline ? (
                    <Input
                      ref={newStepInputRef}
                      testID="e2e.activityDetail.steps.newInput"
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
                    testIDPrefix="e2e.activityDetail.keyAction"
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
                              icon: 'sendToCalendar',
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
                    testIDPrefix="e2e.activityDetail.keyAction"
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
                              icon: 'sendTo',
                              label: 'Send to…',
                              tileBackgroundColor: colors.pine700,
                              tileBorderColor: 'rgba(255,255,255,0.10)',
                              tileLabelColor: colors.primaryForeground,
                              onPress: () => {
                                capture(AnalyticsEvent.ActivityActionInvoked, {
                                  activityId: activity.id,
                                  action: 'sendTo',
                                });
                                setActiveSheet('sendTo');
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
                onLayout={(event) => {
                  // Ensure the onboarding coachmark can safely measure this target.
                  setIsScheduleCardReady(true);
                  const y = event.nativeEvent.layout.y;
                  if (typeof y === 'number' && Number.isFinite(y)) {
                    setScheduleCardOffset(y);
                  }
                }}
              >
                <View style={styles.rowPadding}>
                  <VStack space="xs">
                  <VStack space="sm">
                    <Pressable
                      testID="e2e.activityDetail.triggers.reminder.open"
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setActiveSheet('reminder')}
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
                      testID="e2e.activityDetail.triggers.dueDate.open"
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setActiveSheet('due')}
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
                      testID="e2e.activityDetail.triggers.repeat.open"
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setActiveSheet('repeat')}
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
                      testID="e2e.activityDetail.planning.estimate.open"
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
                testID="e2e.activityDetail.notes"
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
              <View ref={tagsFieldContainerRef} collapsable={false}>
                <Pressable
                  testID="e2e.activityDetail.tags.open"
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
                    testID="e2e.activityDetail.tags.input"
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
                      testID="e2e.activityDetail.openFocus"
                    >
                      <Text style={styles.actionsButtonLabel}>Focus mode</Text>
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={openCalendarSheet}
                      accessibilityLabel="Send to calendar"
                      testID="e2e.activityDetail.openCalendar"
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
          </View>
        </VStack>
      </View>

      <Coachmark
        visible={detailGuideHost.coachmarkVisible}
        targetRef={detailGuideTargetRef}
        remeasureKey={detailGuideHost.remeasureKey}
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
        onClose={() => {
          setActiveSheet(null);
          setIsReminderDateTimePickerVisible(false);
        }}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['45%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Remind me</Text>
          <VStack space="sm">
            <SheetOption
              testID="e2e.activityDetail.reminder.laterToday"
              label="Later Today"
              onPress={() => handleSelectReminder(0, 18, 0)}
            />
            <SheetOption
              testID="e2e.activityDetail.reminder.tomorrow"
              label="Tomorrow"
              onPress={() => handleSelectReminder(1, 9, 0)}
            />
            <SheetOption
              testID="e2e.activityDetail.reminder.nextWeek"
              label="Next Week"
              onPress={() => handleSelectReminder(7, 9, 0)}
            />
            <SheetOption
              testID="e2e.activityDetail.reminder.pickDateTime"
              label="Pick date & time…"
              onPress={() => setIsReminderDateTimePickerVisible(true)}
            />
            <SheetOption
              testID="e2e.activityDetail.reminder.clear"
              label="Clear reminder"
              onPress={handleClearReminder}
            />
          </VStack>
          {isReminderDateTimePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialReminderDateTimeForPicker()}
                onChange={handleReminderDateTimeChange}
              />
            </View>
          )}
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={dueDateSheetVisible}
        onClose={() => {
          setActiveSheet(null);
          setIsDueDatePickerVisible(false);
        }}
        snapPoints={['40%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Due</Text>
          <VStack space="sm">
            <SheetOption testID="e2e.activityDetail.dueDate.today" label="Today" onPress={() => handleSelectDueDate(0)} />
            <SheetOption testID="e2e.activityDetail.dueDate.tomorrow" label="Tomorrow" onPress={() => handleSelectDueDate(1)} />
            <SheetOption testID="e2e.activityDetail.dueDate.nextWeek" label="Next Week" onPress={() => handleSelectDueDate(7)} />
            <SheetOption
              testID="e2e.activityDetail.dueDate.pickDate"
              label="Pick a date…"
              onPress={() => setIsDueDatePickerVisible(true)}
            />
            <SheetOption testID="e2e.activityDetail.dueDate.clear" label="Clear due date" onPress={handleClearDueDate} />
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
        onClose={() => setActiveSheet(null)}
        snapPoints={['60%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Repeat</Text>
          <VStack space="sm">
            <SheetOption testID="e2e.activityDetail.repeat.daily" label="Daily" onPress={() => handleSelectRepeat('daily')} />
            <SheetOption testID="e2e.activityDetail.repeat.weekly" label="Weekly" onPress={() => handleSelectRepeat('weekly')} />
            <SheetOption testID="e2e.activityDetail.repeat.weekdays" label="Weekdays" onPress={() => handleSelectRepeat('weekdays')} />
            <SheetOption testID="e2e.activityDetail.repeat.monthly" label="Monthly" onPress={() => handleSelectRepeat('monthly')} />
            <SheetOption testID="e2e.activityDetail.repeat.yearly" label="Yearly" onPress={() => handleSelectRepeat('yearly')} />
            <SheetOption testID="e2e.activityDetail.repeat.custom" label="Custom…" onPress={openCustomRepeat} />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={customRepeatSheetVisible}
        onClose={() => setActiveSheet(null)}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['60%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <HStack alignItems="center" justifyContent="space-between" style={styles.customRepeatHeaderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to repeat options"
              testID="e2e.activityDetail.customRepeat.back"
              onPress={() => {
                setActiveSheet(null);
                if (repeatDrawerTransitionTimeoutRef.current) {
                  clearTimeout(repeatDrawerTransitionTimeoutRef.current);
                }
                repeatDrawerTransitionTimeoutRef.current = setTimeout(() => {
                  setActiveSheet('repeat');
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
              testID="e2e.activityDetail.customRepeat.set"
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
        onClose={() => setActiveSheet(null)}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['40%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Duration</Text>
          <VStack space="md">
            <DurationPicker
              valueMinutes={estimateDraftMinutes}
              onChangeMinutes={setEstimateDraftMinutes}
              accessibilityLabel="Select duration"
            />

            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                testID="e2e.activityDetail.estimate.clear"
                onPress={() => {
                  handleClearTimeEstimate();
                  setActiveSheet(null);
                }}
              >
                <Text style={styles.sheetRowLabel}>Clear</Text>
              </Button>
              <Button variant="primary" style={{ flex: 1 }} testID="e2e.activityDetail.estimate.save" onPress={commitEstimateDraft}>
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
        onClose={() => setActiveSheet(null)}
        snapPoints={focusSheetSnapPoints}
        scrimToken="pineSubtle"
      >
        <View style={[styles.sheetContent, { flex: 1 }]}>
          <VStack space="md" style={{ flex: 1 }}>
            <View>
              <Text style={styles.sheetTitle}>Focus mode</Text>
              <Text style={styles.sheetDescription}>
                Start a distraction-free timer for this activity. Pick a duration, then tap Start.
              </Text>
            </View>

            <View>
              <Text style={styles.estimateFieldLabel}>Minutes</Text>
              <HStack space="sm" alignItems="center" style={styles.focusPresetRow}>
                {(focusPresetValues as number[]).map((m) => {
                  const selected = !focusCustomExpanded && focusDraftMinutes === m;
                  return (
                    <Pressable
                      key={String(m)}
                      style={({ pressed }) => [
                        styles.focusPresetChip,
                        selected && styles.focusPresetChipSelected,
                        pressed && styles.focusPresetChipPressed,
                      ]}
                      onPress={() => {
                        setFocusMinutesDraft(String(m));
                        setFocusCustomExpanded(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.focusPresetChipText,
                          selected && styles.focusPresetChipTextSelected,
                        ]}
                      >
                        {m}m
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={({ pressed }) => {
                    const selected = focusCustomExpanded || focusIsCustomValue;
                    return [
                      styles.focusPresetChip,
                      selected && styles.focusPresetChipSelected,
                      pressed && styles.focusPresetChipPressed,
                    ];
                  }}
                  onPress={() => setFocusCustomExpanded((v) => !v)}
                >
                  <Text
                    style={[
                      styles.focusPresetChipText,
                      (focusCustomExpanded || focusIsCustomValue) && styles.focusPresetChipTextSelected,
                    ]}
                  >
                    {(() => {
                      if (focusCustomExpanded) return `${focusDraftMinutes}m`;
                      if (focusIsCustomValue) return `${focusDraftMinutes}m`;
                      return 'Custom';
                    })()}
                  </Text>
                </Pressable>
              </HStack>

              {focusCustomExpanded ? (
                <View style={{ marginTop: spacing.md }}>
                  <DurationPicker
                    valueMinutes={focusDraftMinutes}
                    onChangeMinutes={(next) => setFocusMinutesDraft(String(next))}
                    optionsMinutes={Array.from({ length: focusMaxMinutes }, (_, idx) => idx + 1)}
                    accessibilityLabel="Select custom focus duration"
                    iosWheelHeight={160}
                    showHelperText={false}
                    iosUseEdgeFades={false}
                  />
                </View>
              ) : null}
            </View>

            <View>
              <Text style={styles.estimateFieldLabel}>Soundscape</Text>
              <DropdownMenu>
                <DropdownMenuTrigger accessibilityLabel="Select soundscape">
                  <Pressable
                    style={({ pressed }) => [
                      styles.focusSoundscapeTrigger,
                      pressed && styles.focusPresetChipPressed,
                    ]}
                  >
                    <HStack space="xs" alignItems="center">
                      <Text style={styles.focusSoundscapeTriggerText}>
                        {(SOUND_SCAPES.find((s) => s.id === soundscapeTrackId)?.title ?? 'Soundscape')}
                      </Text>
                      <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                    </HStack>
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={6} align="start">
                  {SOUND_SCAPES.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onPress={() => {
                        setSoundscapeTrackId(s.id);
                      }}
                    >
                      <Text style={styles.menuRowText}>{s.title}</Text>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </View>

            <View style={{ flex: 1 }} />

          <HStack space="sm">
            <Button
              variant="outline"
              style={{ flex: 1 }}
              testID="e2e.activityDetail.focus.cancel"
              onPress={() => setActiveSheet(null)}
            >
              <Text style={styles.sheetRowLabel}>Cancel</Text>
            </Button>
            <Button
              variant="primary"
              style={{ flex: 1 }}
              testID="e2e.activityDetail.focus.start"
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
          setActiveSheet(null);
        }}
        snapPoints={['75%']}
        scrimToken="pineSubtle"
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

            <Button
              variant="outline"
              fullWidth
              testID="e2e.activityDetail.calendar.close"
              onPress={() => setActiveSheet(null)}
              style={{ marginTop: spacing.md }}
            >
              <Text style={styles.sheetRowLabel}>Close</Text>
            </Button>
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
            <HeaderActionPill
              size={56}
              accessibilityLabel="End focus session"
              style={styles.focusActionIconButton}
              onPress={() => endFocusSession().catch(() => undefined)}
            >
              <Icon name="stop" size={22} color={colors.parchment} />
            </HeaderActionPill>
            <HeaderActionPill
              size={56}
              accessibilityLabel={
                focusSession?.mode === 'paused' ? 'Resume focus session' : 'Pause focus session'
              }
              style={styles.focusActionIconButton}
              onPress={() => togglePauseFocusSession().catch(() => undefined)}
            >
              <Icon
                name={focusSession?.mode === 'paused' ? 'play' : 'pause'}
                size={22}
                color={colors.parchment}
              />
            </HeaderActionPill>
          </HStack>
        </View>
      </Modal>

      {AgentWorkspaceSheet}

      <BottomDrawer
        visible={sendToSheetVisible}
        onClose={() => setActiveSheet(null)}
        snapPoints={['45%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Send to…</Text>
          <SheetOption
            testID="e2e.activityDetail.sendTo.amazon"
            label="Amazon"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToAmazon' });
              setActiveSheet(null);
              handleSendToAmazon().catch(() => undefined);
            }}
          />
          <SheetOption
            testID="e2e.activityDetail.sendTo.homeDepot"
            label="Home Depot"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToHomeDepot' });
              setActiveSheet(null);
              handleSendToHomeDepot().catch(() => undefined);
            }}
          />
          <SheetOption
            testID="e2e.activityDetail.sendTo.instacart"
            label="Instacart"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToInstacart' });
              setActiveSheet(null);
              handleSendToInstacart().catch(() => undefined);
            }}
          />
          <View style={styles.cardSectionDivider} />
          <SheetOption
            testID="e2e.activityDetail.sendTo.copy"
            label="Copy details"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToCopy' });
              setActiveSheet(null);
              handleSendToCopy().catch(() => undefined);
            }}
          />
          <SheetOption
            testID="e2e.activityDetail.sendTo.share"
            label="Share…"
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToShare' });
              setActiveSheet(null);
              handleSendToShare().catch(() => undefined);
            }}
          />
          <View style={styles.cardSectionDivider} />
          <SheetOption testID="e2e.activityDetail.sendTo.cancel" label="Cancel" onPress={() => setActiveSheet(null)} />
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
  testID?: string;
};

function SheetOption({ label, onPress, testID }: SheetOptionProps) {
  return (
    <Pressable
      testID={testID}
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

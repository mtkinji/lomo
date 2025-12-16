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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import type { ActivityDifficulty, ActivityStatus, ActivityStep } from '../../domain/types';
import type {
  ActivitiesStackParamList,
  ActivityDetailRouteParams,
} from '../../navigation/RootNavigator';
import { rootNavigationRef } from '../../navigation/RootNavigator';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { NumberWheelPicker } from '../../ui/NumberWheelPicker';
import { startSoundscapeLoop, stopSoundscapeLoop } from '../../services/soundscape';
import { VStack, HStack, Input, Textarea, ThreeColumnRow, Combobox, KeyboardAwareScrollView } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BrandLockup } from '../../ui/BrandLockup';
import { Coachmark } from '../../ui/Coachmark';
import { BreadcrumbBar } from '../../ui/BreadcrumbBar';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import { Badge } from '../../ui/Badge';
import { KeyActionsRow } from '../../ui/KeyActionsRow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { parseTags } from '../../utils/tags';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { buildIcsEvent } from '../../utils/ics';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';

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
  // TODO(paywall): when monetization is implemented, free users should be capped at 5 minutes.
  // For now, keep this generous.
  const focusMaxMinutes = 180;
  const isFocused = useIsFocused();
  const { capture } = useAnalytics();
  const insets = useSafeAreaInsets();
  const route = useRoute<ActivityDetailRouteProp>();
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const { activityId } = route.params;

  const KEYBOARD_CLEARANCE = spacing['2xl'] + spacing.lg;
  const scrollRef = useRef<KeyboardAwareScrollViewHandle | null>(null);

  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const arcs = useAppStore((state) => state.arcs);
  const breadcrumbsEnabled = __DEV__ && useAppStore((state) => state.devBreadcrumbsEnabled);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const lastFocusMinutes = useAppStore((state) => state.lastFocusMinutes);
  const setLastFocusMinutes = useAppStore((state) => state.setLastFocusMinutes);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const setSoundscapeEnabled = useAppStore((state) => state.setSoundscapeEnabled);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const agentHostActions = useAppStore((state) => state.agentHostActions);
  const consumeAgentHostActions = useAppStore((state) => state.consumeAgentHostActions);
  const hasDismissedActivityDetailGuide = useAppStore(
    (state) => state.hasDismissedActivityDetailGuide,
  );
  const setHasDismissedActivityDetailGuide = useAppStore(
    (state) => state.setHasDismissedActivityDetailGuide,
  );

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );

  const activityWorkspaceSnapshot = useMemo(() => {
    // Focus the snapshot on this activity's goal when possible so the agent
    // can offer grounded help (next steps, reframes, timeboxing, etc.).
    const focusGoalId = activity?.goalId ?? undefined;
    const focusActivityId = activity?.id ?? undefined;
    return buildActivityCoachLaunchContext(goals, activities, focusGoalId, arcs, focusActivityId);
  }, [activities, activity?.goalId, activity?.id, arcs, goals]);

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

  const [reminderSheetVisible, setReminderSheetVisible] = useState(false);
  const [dueDateSheetVisible, setDueDateSheetVisible] = useState(false);
  const [repeatSheetVisible, setRepeatSheetVisible] = useState(false);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activity?.title ?? '');
  const titleInputRef = useRef<TextInput | null>(null);

  const [notesDraft, setNotesDraft] = useState(activity?.notes ?? '');
  const [tagsInputDraft, setTagsInputDraft] = useState('');
  const tagsInputRef = useRef<TextInput | null>(null);
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
  const [isCalendarPickerVisible, setIsCalendarPickerVisible] = useState(false);
  const [calendarPermissionStatus, setCalendarPermissionStatus] = useState<
    'unknown' | 'granted' | 'denied'
  >('unknown');
  const [writableCalendars, setWritableCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [isCalendarListVisible, setIsCalendarListVisible] = useState(false);
  const [isCreatingCalendarEvent, setIsCreatingCalendarEvent] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

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

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    await stopSoundscapeLoop().catch(() => undefined);
    setFocusSession(null);
  };

  const startFocusSession = async () => {
    const minutes = Math.max(1, Math.floor(Number(focusMinutesDraft)));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert('Choose a duration', 'Enter a number of minutes greater than 0.');
      return;
    }
    if (minutes > focusMaxMinutes) {
      Alert.alert('Duration too long', `Focus mode is currently limited to ${focusMaxMinutes} minutes.`);
      return;
    }
    setLastFocusMinutes(minutes);

    setFocusSheetVisible(false);
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
      if (soundscapeEnabled) {
        startSoundscapeLoop().catch(() => undefined);
      }

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
      startSoundscapeLoop().catch(() => undefined);
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
    endFocusSession().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingFocusMs, focusSession?.mode]);

  const openCalendarSheet = () => {
    const existingStart = activity.scheduledAt ? new Date(activity.scheduledAt) : null;
    const draftStart = existingStart && !Number.isNaN(existingStart.getTime()) ? existingStart : new Date();
    setCalendarStartDraft(draftStart);
    setCalendarDurationDraft(String(Math.max(5, Math.round(activity.estimateMinutes ?? 30))));
    setCalendarSheetVisible(true);
    setIsCalendarPickerVisible(false);
    setIsCalendarListVisible(false);
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
        const fallback = new Date();
        const draftStart =
          fromAction && !Number.isNaN(fromAction.getTime())
            ? fromAction
            : fromExisting && !Number.isNaN(fromExisting.getTime())
              ? fromExisting
              : fallback;

        const duration =
          typeof action.durationMinutes === 'number' && Number.isFinite(action.durationMinutes)
            ? Math.max(5, Math.round(action.durationMinutes))
            : Math.max(5, Math.round(activity.estimateMinutes ?? 30));

        setCalendarStartDraft(draftStart);
        setCalendarDurationDraft(String(duration));
        setCalendarSheetVisible(true);
        setIsCalendarPickerVisible(false);
        setIsCalendarListVisible(false);
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

  const selectedCalendarName = useMemo(() => {
    if (!selectedCalendarId) return 'Choose…';
    return writableCalendars.find((c) => c.id === selectedCalendarId)?.title ?? 'Choose…';
  }, [selectedCalendarId, writableCalendars]);

  const addActivityToNativeCalendar = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Calendar events can only be created on iOS/Android.');
      return;
    }

    if (calendarPermissionStatus !== 'granted') {
      const ok = await loadWritableCalendars();
      if (!ok) {
        Alert.alert(
          'Calendar access needed',
          'Enable Calendar access in system settings, or use the “Share calendar file” option.',
        );
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
    const notesPart = activity.notes?.trim() ? `Notes: ${activity.notes.trim()}` : '';
    const notes = [goalTitlePart, notesPart].filter(Boolean).join('\n\n') || undefined;

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
      Alert.alert('Added to calendar', `Added to “${selectedCalendarName}”.`);
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
    const notesPart = activity.notes?.trim() ? `Notes: ${activity.notes.trim()}` : '';
    const description = [goalTitlePart, notesPart].filter(Boolean).join('\n\n');
    const ics = buildIcsEvent({
      uid: `kwilt-activity-${activity.id}`,
      title: activity.title,
      description,
      startAt,
      endAt,
    });

    // Persist scheduledAt (additive model).
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledAt: startAt.toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setCalendarSheetVisible(false);

    try {
      const filename = `kwilt-${activity.title.trim().slice(0, 48).replace(/[^a-z0-9-_]+/gi, '-') || 'activity'}.ics`;
      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      const fileUri = `${baseDir}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, ics, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(ics);
        Alert.alert('Copied', 'Calendar file contents copied to clipboard.');
        return;
      }

      await Share.share({
        title: 'Add to calendar',
        message: activity.title,
        url: fileUri,
      });
    } catch (error) {
      // Last-ditch fallback: copy the ICS text.
      try {
        await Clipboard.setStringAsync(ics);
        Alert.alert('Copied', 'Calendar file contents copied to clipboard.');
      } catch {
        Alert.alert('Could not share', 'Something went wrong while exporting to calendar.');
        if (__DEV__) {
          console.warn('ICS share failed', error);
        }
      }
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

  const commitNotes = () => {
    const next = notesDraft.trim();
    const current = activity.notes ?? '';
    if (next === current) {
      return;
    }
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      notes: next.length ? next : undefined,
      updatedAt: timestamp,
    }));
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
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: rule,
      updatedAt: timestamp,
    }));
    setRepeatSheetVisible(false);
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

  const repeatLabel = activity.repeatRule
    ? activity.repeatRule === 'weekdays'
      ? 'Weekdays'
      : activity.repeatRule.charAt(0).toUpperCase() + activity.repeatRule.slice(1)
    : 'Off';

  const handleClearRepeatRule = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: undefined,
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
    setNotesDraft(activity.notes ?? '');
    setTagsInputDraft('');
    setStepsDraft(activity.steps ?? []);
  }, [activity.title, activity.notes, activity.steps, activity.id]);

  return (
    <AppShell>
      <View style={styles.screen}>
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
                          <Text style={styles.menuRowText}>Add to calendar</Text>
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
                    <Icon name="activities" size={18} color={colors.textSecondary} />
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
                        <IconButton
                          style={styles.optionsButton}
                          pointerEvents="none"
                          accessible={false}
                        >
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
                          <Text style={styles.menuRowText}>Add to calendar</Text>
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
          </HStack>

          <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardClearance={KEYBOARD_CLEARANCE}
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
                  left={<Icon name="plus" size={16} color={colors.accent} />}
                  right={null}
                  onPress={beginAddStepInline}
                  accessibilityLabel="Add a step to this activity"
                  style={styles.addStepRow}
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
                        tileBackgroundColor: colors.canvas,
                        badgeColor: colors.indigo700,
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
                        label: 'Add to calendar',
                        tileBackgroundColor: colors.canvas,
                        badgeColor: colors.accent,
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
                        tileBackgroundColor: colors.canvas,
                        badgeColor: colors.turmeric600,
                        onPress: () => {
                          capture(AnalyticsEvent.ActivityActionInvoked, {
                            activityId: activity.id,
                            action: 'chatWithAi',
                          });
                          openAgentForActivity({ objectType: 'activity', objectId: activity.id });
                        },
                      },
                    ]}
                  />
                </VStack>
              </View>
            </View>

            {/* Linked goal */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Linked Goal</Text>
              <Combobox
                open={goalComboboxOpen}
                onOpenChange={setGoalComboboxOpen}
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
                title="Select goal…"
                searchPlaceholder="Search goals…"
                emptyText="No goals found."
                allowDeselect
                trigger={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change linked goal"
                    onPress={() => setGoalComboboxOpen(true)}
                    style={styles.comboboxTrigger}
                  >
                    <View pointerEvents="none">
                      <Input
                        value={goalTitle ?? ''}
                        placeholder="Select goal…"
                        editable={false}
                        variant="outline"
                        elevation="flat"
                        trailingIcon="chevronsUpDown"
                        containerStyle={styles.comboboxValueContainer}
                        inputStyle={styles.comboboxValueInput}
                      />
                    </View>
                  </Pressable>
                }
              />
            </View>

            {/* 3) Reminder / Due date / Recurrence */}
            <View style={styles.section}>
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
                  {/* Timing */}
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
                            reminderLabel !== 'None' && styles.rowLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {reminderLabel === 'None' ? 'Add reminder' : reminderLabel}
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
                            activity.scheduledDate && styles.rowLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {activity.scheduledDate ? dueDateLabel : 'Add due date'}
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
                            repeatLabel !== 'Off' && styles.rowLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {repeatLabel === 'Off' ? 'Repeat' : repeatLabel}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>

                  <View style={styles.cardSectionDivider} />

                  {/* Planning (no group label; treated as part of the same metadata card) */}
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
                    title="Difficulty"
                    searchPlaceholder="Search difficulty…"
                    emptyText="No difficulty options found."
                    allowDeselect
                    trigger={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit difficulty"
                        onPress={() => setDifficultyComboboxOpen(true)}
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

            {/* 5) Notes */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>TAGS</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit tags"
                onPress={() => tagsInputRef.current?.focus()}
                style={styles.tagsFieldContainer}
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
                      requestAnimationFrame(() => {
                        scrollRef.current?.scrollToFocusedInput(KEYBOARD_CLEARANCE);
                      });
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
                    blurOnSubmit={false}
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
              </Pressable>
              <Text style={styles.tagsHelperText}>
                Type a tag, then press comma or Done. Tap a chip (or backspace on empty) to remove.
              </Text>
            </View>

            {/* 6) Notes */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>NOTES</Text>
              <Textarea
                value={notesDraft}
                onChangeText={setNotesDraft}
                onFocus={() => {
                  handleAnyInputFocus();
                  requestAnimationFrame(() => {
                    scrollRef.current?.scrollToFocusedInput(KEYBOARD_CLEARANCE);
                  });
                }}
                onBlur={() => {
                  handleAnyInputBlur();
                  commitNotes();
                }}
                placeholder="Add context or reminders for this activity."
                multiline
                variant="outline"
                elevation="flat"
                // Compact note field vs the larger default textarea spec.
                multilineMinHeight={80}
                multilineMaxHeight={180}
              />
            </View>
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
        snapPoints={['45%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Repeat</Text>
          <VStack space="sm">
            <SheetOption label="Daily" onPress={() => handleSelectRepeat('daily')} />
            <SheetOption label="Weekly" onPress={() => handleSelectRepeat('weekly')} />
            <SheetOption label="Weekdays" onPress={() => handleSelectRepeat('weekdays')} />
            <SheetOption label="Monthly" onPress={() => handleSelectRepeat('monthly')} />
            <SheetOption label="Yearly" onPress={() => handleSelectRepeat('yearly')} />
          </VStack>
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
          setIsCalendarPickerVisible(false);
          setIsCalendarListVisible(false);
        }}
        snapPoints={['60%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Add to calendar</Text>
          <Text style={styles.sheetDescription}>
            Choose which calendar to add this event to (iCloud, Google, Outlook, etc.). These options come from accounts configured on your phone.
          </Text>

          <VStack space="md">
            <SheetOption
              label={`Start: ${calendarStartDraft.toLocaleString()}`}
              onPress={() => setIsCalendarPickerVisible((v) => !v)}
            />
            {isCalendarPickerVisible && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  value={calendarStartDraft}
                  onChange={(_, date) => {
                    if (date) setCalendarStartDraft(date);
                  }}
                />
              </View>
            )}

            {calendarPermissionStatus === 'denied' ? (
              <View style={styles.calendarPermissionNotice}>
                <Text style={styles.sheetDescription}>
                  Calendar access is disabled. You can enable it in system settings, or share a calendar file instead.
                </Text>
              </View>
            ) : (
              <>
                <SheetOption
                  label={`Calendar: ${isLoadingCalendars ? 'Loading…' : selectedCalendarName}`}
                  onPress={() => {
                    if (!isLoadingCalendars) {
                      setIsCalendarListVisible((v) => !v);
                    }
                  }}
                />
                {isCalendarListVisible && (
                  <View style={styles.calendarListContainer}>
                    <BottomDrawerScrollView
                      style={{ maxHeight: 220 }}
                      contentContainerStyle={{ paddingBottom: spacing.sm }}
                      showsVerticalScrollIndicator={false}
                    >
                      <VStack space="xs">
                        {writableCalendars.length === 0 ? (
                          <Text style={styles.sheetDescription}>
                            No writable calendars found. Add a calendar account (Google/Outlook/iCloud) in system settings, or share a calendar file instead.
                          </Text>
                        ) : (
                          writableCalendars.map((cal) => {
                            const selected = cal.id === selectedCalendarId;
                            return (
                              <Pressable
                                key={cal.id}
                                style={({ pressed }) => [
                                  styles.calendarChoiceRow,
                                  pressed && styles.rowPressed,
                                  selected && styles.calendarChoiceRowSelected,
                                ]}
                                onPress={() => {
                                  setSelectedCalendarId(cal.id);
                                  setIsCalendarListVisible(false);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`Use calendar ${cal.title}`}
                              >
                                <HStack space="sm" alignItems="center" justifyContent="space-between">
                                  <Text
                                    style={[
                                      styles.calendarChoiceLabel,
                                      selected && styles.calendarChoiceLabelSelected,
                                    ]}
                                  >
                                    {cal.title}
                                  </Text>
                                  {selected ? (
                                    <Icon name="check" size={16} color={colors.primaryForeground} />
                                  ) : null}
                                </HStack>
                              </Pressable>
                            );
                          })
                        )}
                      </VStack>
                    </BottomDrawerScrollView>
                  </View>
                )}
              </>
            )}

            <View>
              <Text style={styles.estimateFieldLabel}>Duration (minutes)</Text>
              <Input
                value={calendarDurationDraft}
                onChangeText={setCalendarDurationDraft}
                placeholder="30"
                keyboardType="number-pad"
                returnKeyType="done"
                size="sm"
                variant="outline"
                elevation="flat"
              />
            </View>

            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setCalendarSheetVisible(false)}
              >
                <Text style={styles.sheetRowLabel}>Cancel</Text>
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                disabled={isCreatingCalendarEvent}
                onPress={() => {
                  addActivityToNativeCalendar().catch(() => undefined);
                }}
              >
                <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>
                  {isCreatingCalendarEvent ? 'Adding…' : 'Add event'}
                </Text>
              </Button>
            </HStack>

            <Button
              variant="outline"
              onPress={() => {
                shareActivityAsIcs().catch(() => undefined);
              }}
            >
              <Text style={styles.sheetRowLabel}>Share calendar file (.ics)</Text>
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
            <HStack space="xs" alignItems="center">
              <Icon
                name="sound"
                size={18}
                color={soundscapeEnabled ? colors.parchment : 'rgba(250,247,237,0.72)'}
              />
              <Switch
                value={soundscapeEnabled}
                onValueChange={setSoundscapeEnabled}
                trackColor={{
                  false: 'rgba(250,247,237,0.25)',
                  true: 'rgba(250,247,237,0.65)',
                }}
                thumbColor={soundscapeEnabled ? colors.parchment : 'rgba(250,247,237,0.92)'}
                ios_backgroundColor="rgba(250,247,237,0.25)"
              />
            </HStack>
          </View>

          <View style={styles.focusCenter}>
            <Text style={styles.focusTimer}>{formatMsAsTimer(remainingFocusMs)}</Text>
            <Text style={styles.focusActivityTitle} numberOfLines={2}>
              {activity.title}
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
    minWidth: 120,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: typography.bodySm.lineHeight + 2,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  tagsHelperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    // Give tile shadows room to render inside the scroll viewport so they
    // don't get clipped at the canvas edges.
    paddingHorizontal: spacing.sm,
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
    // Keep step content vertically centered against the checkbox.
    minHeight: 40,
    // When step titles wrap, pin the checkbox/actions to the top of the content block.
    alignItems: 'flex-start',
  },
  stepRowContent: {
    paddingVertical: 0,
    justifyContent: 'flex-start',
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
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
    marginTop: 2,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.accent,
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
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  optionsButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    width: 36,
    height: 36,
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
  focusCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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



import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  Image,
  InteractionManager,
  LayoutAnimation,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  Keyboard,
  Modal,
  Share,
  Linking,
  useWindowDimensions,
  Animated,
  PanResponder,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { PortalHost } from '@rn-primitives/portal';
import { FullWindowOverlay } from 'react-native-screens';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { persistImageUri } from '../../utils/persistImageUri';
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
import type { Activity } from '../../domain/types';
import type {
  ActivitiesStackParamList,
} from '../../navigation/RootNavigator';
import type { ActivityDetailRouteParams } from '../../navigation/routeParams';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { BottomDrawer, BottomDrawerNativeGestureView, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { StaticMapImage } from '../../ui/maps/StaticMapImage';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import { getCurrentLocationBestEffort } from '../../services/location/currentLocation';
import { applePlaceSearchBestEffort, cancelApplePlaceSearchBestEffort } from '../../services/locationOffers/applePlaceSearch';
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
import * as ImagePicker from 'expo-image-picker';
import { getImagePickerMediaTypesImages } from '../../utils/imagePickerMediaTypes';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { buildIcsEvent } from '../../utils/ics';
import { buildOutlookEventLinks } from '../../utils/outlookEventLinks';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import { openPaywallInterstitial } from '../../services/paywall';
import {
  recordShowUpWithCelebration,
  recordCompletedFocusSessionWithMilestone,
} from '../../store/useCelebrationStore';
import { useCheckinNudgeStore } from '../../store/useCheckinNudgeStore';
import { useToastStore } from '../../store/useToastStore';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { trackUnsplashDownload, type UnsplashPhoto, withUnsplashReferral } from '../../services/unsplash';
import {
  cancelAudioRecording,
  deleteAttachment,
  getAttachmentDownloadUrl,
  openAttachment,
  startAudioRecording,
  setAttachmentSharedWithGoalMembers,
  stopAudioRecordingAndAttachToActivity,
} from '../../services/attachments/activityAttachments';
import { Toast } from '../../ui/Toast';
import { buildAffiliateRetailerSearchUrl } from '../../services/affiliateLinks';
import { listExecutionTargets, type ExecutionTargetRow } from '../../services/executionTargets/executionTargets';
import { handoffActivityToExecutionTarget } from '../../services/executionTargets/activityHandoffs';
import { getDestinationSupportedActivityTypes } from '../../domain/destinationCapabilities';
import { HapticsService } from '../../services/HapticsService';
import { playActivityDoneSound, playStepDoneSound } from '../../services/uiSounds';
import { useCoachmarkHost } from '../../ui/hooks/useCoachmarkHost';
import { styles } from './activityDetailStyles';
import { ActivityDetailRefresh } from './ActivityDetailRefresh';
import type { NarrativeEditableTitleRef } from '../../ui/NarrativeEditableTitle';
import { ArcBannerSheet } from '../arcs/ArcBannerSheet';
import type { ArcHeroImage } from '../arcs/arcHeroLibrary';
import { getArcGradient, getArcTopoSizes } from '../arcs/thumbnailVisuals';
import { getActivityHeaderArtworkSource } from './activityTypeHeaderArtwork';
import { ActionDock } from '../../ui/ActionDock';
import { setGlanceableFocusSession } from '../../services/appleEcosystem/glanceableState';
import { syncLiveActivity, endLiveActivity } from '../../services/appleEcosystem/liveActivity';
import MapView, { Circle, type Region } from 'react-native-maps';

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
  { ActivityDetail: ActivityDetailRouteParams; ActivityDetailFromGoal: ActivityDetailRouteParams },
  'ActivityDetail' | 'ActivityDetailFromGoal'
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
  const isFocusedRef = useRef(isFocused);
  const { capture } = useAnalytics();
  const showToast = useToastStore((s) => s.showToast);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const headerInk = colors.sumi;
  const route = useRoute<ActivityDetailRouteProp>();
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const { activityId, openFocus, autoStartFocus, minutes: autoStartMinutes, endFocus } =
    route.params as ActivityDetailRouteParams;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const planExpanded = useAppStore((s) => s.activityDetailPlanExpanded);
  const detailsExpanded = useAppStore((s) => s.activityDetailDetailsExpanded);
  const togglePlanExpandedInStore = useAppStore((s) => s.toggleActivityDetailPlanExpanded);
  const toggleDetailsExpandedInStore = useAppStore((s) => s.toggleActivityDetailDetailsExpanded);

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
  const [thumbnailSheetVisible, setThumbnailSheetVisible] = useState(false);
  const [heroImageLoading, setHeroImageLoading] = useState(false);
  const [heroImageError, setHeroImageError] = useState('');

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Enable LayoutAnimation on Android (no-op on newer RN versions where it's enabled).
    try {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    } catch {
      // no-op
    }
  }, []);

  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const arcs = useAppStore((state) => state.arcs);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const domainHydrated = useAppStore((state) => state.domainHydrated);
  const breadcrumbsEnabled = __DEV__ && useAppStore((state) => state.devBreadcrumbsEnabled);
  const devHeaderV2Enabled = __DEV__ && useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const abHeaderV2Enabled = useFeatureFlag('object_detail_header_v2', false);
  const headerV2Enabled = devHeaderV2Enabled || abHeaderV2Enabled;
  // Activity detail uses the refresh layout only (legacy implementation removed).
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
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
  const enabledSendToDestinations = useAppStore((state) => state.enabledSendToDestinations);

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );

  const heroSeed = useMemo(() => activity?.id ?? 'activity', [activity?.id]);
  const { colors: heroGradientColors, direction: heroGradientDirection } = useMemo(
    () => getArcGradient(heroSeed),
    [heroSeed]
  );
  const heroTopoSizes = useMemo(() => getArcTopoSizes(heroSeed), [heroSeed]);

  const defaultHeroUrl = useMemo(() => {
    if (!activity) return undefined;
    const source = getActivityHeaderArtworkSource(activity.type as any);
    if (!source) return undefined;
    try {
      const resolved = Image.resolveAssetSource(source);
      return resolved?.uri;
    } catch {
      return undefined;
    }
  }, [activity]);

  const displayThumbnailUrlForSheet = activity?.thumbnailUrl ?? defaultHeroUrl;

  const handleUploadActivityThumbnail = useCallback(async () => {
    if (!activity) return;
    try {
      setHeroImageLoading(true);
      setHeroImageError('');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getImagePickerMediaTypesImages(),
        quality: 0.9,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      const stableUri = await persistImageUri({
        uri: asset.uri,
        subdir: 'hero-images',
        namePrefix: `activity-${activity.id}-hero`,
      });
      const nowIso = new Date().toISOString();
      updateActivity(activity.id, (prev: any) => ({
        ...prev,
        thumbnailUrl: stableUri,
        heroImageMeta: {
          source: 'upload',
          prompt: prev.heroImageMeta?.prompt,
          createdAt: nowIso,
        },
        updatedAt: nowIso,
      }));
      setThumbnailSheetVisible(false);
    } catch {
      setHeroImageError('Unable to upload image right now.');
    } finally {
      setHeroImageLoading(false);
    }
  }, [activity, updateActivity]);

  const handleClearActivityHeroImage = useCallback(() => {
    if (!activity) return;
    const nowIso = new Date().toISOString();
    updateActivity(activity.id, (prev: any) => ({
      ...prev,
      thumbnailUrl: undefined,
      heroImageMeta: undefined,
      updatedAt: nowIso,
    }));
  }, [activity, updateActivity]);

  const handleSelectCuratedActivityHero = useCallback(
    (image: ArcHeroImage) => {
      if (!activity) return;
      const nowIso = new Date().toISOString();
      updateActivity(activity.id, (prev: any) => ({
        ...prev,
        thumbnailUrl: image.uri,
        thumbnailVariant: prev.thumbnailVariant ?? 0,
        heroImageMeta: {
          source: 'curated',
          prompt: prev.heroImageMeta?.prompt,
          createdAt: nowIso,
          curatedId: image.id,
        },
        updatedAt: nowIso,
      }));
    },
    [activity, updateActivity]
  );

  const handleSelectUnsplashActivityHero = useCallback(
    (photo: UnsplashPhoto) => {
      if (!activity) return;
      const nowIso = new Date().toISOString();
      updateActivity(activity.id, (prev: any) => ({
        ...prev,
        thumbnailUrl: photo.urls.regular,
        heroImageMeta: {
          source: 'unsplash',
          prompt: prev.heroImageMeta?.prompt,
          createdAt: nowIso,
          unsplashPhotoId: photo.id,
          unsplashAuthorName: photo.user.name,
          unsplashAuthorLink: withUnsplashReferral(photo.user.links.html),
          unsplashLink: withUnsplashReferral(photo.links.html),
        },
        updatedAt: nowIso,
      }));
      trackUnsplashDownload(photo.id).catch(() => undefined);
    },
    [activity, updateActivity]
  );

  const activitiesById = useMemo(() => {
    const map: Record<string, Activity> = {};
    for (const item of activities) {
      map[item.id] = item;
    }
    return map;
  }, [activities]);

  const effectiveGoalId = useMemo((): string | null => {
    if (activity?.goalId) return activity.goalId;

    // Defensive: some Activities may be missing `goalId` (older persisted snapshots or
    // step-derived Activities). In that case, try to inherit the goal link from the
    // origin chain (activity_step → parent activity → ...).
    const visited = new Set<string>();
    let cursor: Activity | undefined = activity;
    let hops = 0;
    while (cursor && hops < 8) {
      hops += 1;
      if (cursor.goalId) return cursor.goalId;
      if (cursor.id) visited.add(cursor.id);

      const parentId = cursor.origin?.kind === 'activity_step' ? cursor.origin.parentActivityId : null;
      if (!parentId) break;
      if (visited.has(parentId)) break;
      cursor = activitiesById[parentId];
    }

    return null;
  }, [activity, activitiesById]);

  const openActivityDetail = useCallback(
    (nextActivityId: string) => {
      const screenName = route.name === 'ActivityDetailFromGoal' ? 'ActivityDetailFromGoal' : 'ActivityDetail';
      // Important: from inside ActivityDetail, we want the user to be able to go "back"
      // to the previous Activity detail (e.g. when converting a checklist step into an Activity).
      // `navigate` may reuse an existing route instance; `push` guarantees a new detail view.
      (navigation as any).push(screenName, {
        activityId: nextActivityId,
        // Preserve entryPoint semantics when present (e.g., goalPlan back behavior).
        entryPoint: (route.params as any)?.entryPoint,
      });
    },
    [navigation, route.name, route.params]
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
    | 'location'
    | 'repeat'
    | 'customRepeat'
    | 'estimate'
    | 'focus'
    | 'calendar'
    | 'sendTo'
    | 'recordAudio'
    | 'attachmentDetails'
    | null;

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const reminderSheetVisible = activeSheet === 'reminder';
  const dueDateSheetVisible = activeSheet === 'due';
  const locationSheetVisible = activeSheet === 'location';
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
  const titleInputRef = useRef<NarrativeEditableTitleRef>(null);

  const [tagsInputDraft, setTagsInputDraft] = useState('');
  const tagsInputRef = useRef<TextInput | null>(null);
  const tagsFieldContainerRef = useRef<View | null>(null);
  const tagsAutofillInFlightRef = useRef(false);
  const [isTagsAutofillThinking, setIsTagsAutofillThinking] = useState(false);
  const [stepsDraft, setStepsDraft] = useState<ActivityStep[]>(activity?.steps ?? []);
  // Prevent double-firing the "big completion" haptic when we fire it eagerly on the last step
  // and the deferred status-derivation logic also detects the done transition.
  const suppressNextAutoDoneHapticRef = useRef(false);
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

  const focusPresetValues = useMemo<number[]>(() => [10, 25, 45, 60], []);
  const focusCustomOptionsMinutes = useMemo<number[]>(() => {
    // Keep the list reference stable so the custom picker doesn't churn/rebuild items on every tap.
    return Array.from(
      { length: Math.max(1, Math.floor(focusMaxMinutes / 5)) },
      (_, idx) => (idx + 1) * 5,
    );
  }, [focusMaxMinutes]);
  const handleChangeFocusMinutes = useCallback((next: number) => {
    setFocusMinutesDraft(String(next));
  }, []);
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
  const [installedDestinations, setInstalledDestinations] = useState<ExecutionTargetRow[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const recordAudioSheetVisible = activeSheet === 'recordAudio';
  const attachmentDetailsSheetVisible = activeSheet === 'attachmentDetails';
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [attachmentDownloadUrl, setAttachmentDownloadUrl] = useState<string | null>(null);
  const [isLoadingAttachmentDownloadUrl, setIsLoadingAttachmentDownloadUrl] = useState(false);
  const [attachmentPhotoAspectRatio, setAttachmentPhotoAspectRatio] = useState<number>(4 / 3);
  const openAttachmentDetails = useCallback((att: any) => {
    setSelectedAttachment(att ?? null);
    setActiveSheet('attachmentDetails');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const att = selectedAttachment;
    const visible = attachmentDetailsSheetVisible;
    const kind = (att?.kind ?? '').toString();

    setAttachmentDownloadUrl(null);
    setIsLoadingAttachmentDownloadUrl(false);
    setAttachmentPhotoAspectRatio(4 / 3);

    // Fetch a signed URL for downloading (and photo preview rendering).
    if (!visible || !att?.id) return;

    setIsLoadingAttachmentDownloadUrl(true);
    getAttachmentDownloadUrl(String(att.id))
      .then((url) => {
        if (cancelled) return;
        setAttachmentDownloadUrl(url);
        if (kind === 'photo') {
          try {
            Image.getSize(
              url,
              (w, h) => {
                if (cancelled) return;
                if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
                  setAttachmentPhotoAspectRatio(w / h);
                }
              },
              () => undefined,
            );
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAttachmentDownloadUrl(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingAttachmentDownloadUrl(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attachmentDetailsSheetVisible, selectedAttachment]);
  const LOCATION_SHEET_PORTAL_HOST = 'activity-detail-location-sheet';
  const FOCUS_SHEET_PORTAL_HOST = 'activity-detail-focus-sheet';
  const DEFAULT_RADIUS_FT = 150;
  const LOCATION_RADIUS_FT_OPTIONS = [50, 100, 150, 300, 500] as const;
  const LOCATION_MAP_ZOOM = 15;
  const MIN_LOCATION_RADIUS_FT = 50;
  const MAX_LOCATION_RADIUS_FT = 2000;

  // Location picker (Plan → Location)
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<
    Array<{ id: string; label: string; latitude: number; longitude: number }>
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [previewLocation, setPreviewLocation] = useState<{ label: string; latitude: number; longitude: number } | null>(
    null,
  );
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [locationSelectedValue, setLocationSelectedValue] = useState('');
  const [locationTriggerDraft, setLocationTriggerDraft] = useState<'arrive' | 'leave'>('leave');
  // MVP (US-only): feet-only radius UI. We still store meters canonically.
  const [locationRadiusMetersDraft, setLocationRadiusMetersDraft] = useState<number>(DEFAULT_RADIUS_FT * 0.3048);

  const formatRadiusLabel = useCallback(
    (meters: number) => {
      const metersClamped = Math.max(
        MIN_LOCATION_RADIUS_FT * 0.3048,
        Math.min(MAX_LOCATION_RADIUS_FT * 0.3048, meters),
      );
      // Convert meters -> feet without rounding meters first (avoids 150 -> 151).
      const ft = Math.round(metersClamped / 0.3048);
      return `${ft} feet`;
    },
    [MAX_LOCATION_RADIUS_FT, MIN_LOCATION_RADIUS_FT],
  );

  const [locationStatusHint, setLocationStatusHint] = useState<string | null>(null);
  const [mapCenterOverride, setMapCenterOverride] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapCenterOverrideRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const mapDragStartCenterRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const didAutoCenterLocationSheetRef = useRef(false);

  const locationMapWidthPx = useMemo(() => Math.max(1, windowWidth - spacing.xl * 2), [windowWidth]);
  const locationMapHeightPx = useMemo(
    () => Math.round(Math.max(200, Math.min(340, (locationMapWidthPx * 2) / 3))),
    [locationMapWidthPx],
  );

  const resolvedLocationMapCenter = useMemo(() => {
    return (
      mapCenterOverride ??
      (previewLocation ? { latitude: previewLocation.latitude, longitude: previewLocation.longitude } : null) ??
      currentCoords ??
      (activity?.location &&
      typeof (activity as any).location?.latitude === 'number' &&
      typeof (activity as any).location?.longitude === 'number'
        ? { latitude: (activity as any).location.latitude, longitude: (activity as any).location.longitude }
        : null)
    );
  }, [activity, currentCoords, mapCenterOverride, previewLocation]);

  const mapRef = useRef<MapView | null>(null);
  const mapCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSearchAbortRef = useRef<AbortController | null>(null);
  const locationSearchCacheRef = useRef<
    Map<string, Array<{ id: string; label: string; latitude: number; longitude: number }>>
  >(new Map());

  const normalizePlaceLabel = useCallback((raw: string) => {
    const base = String(raw ?? '').trim();
    if (!base) return '';
    const parts = base
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return base;

    const isUsCountry = (p: string) => {
      const t = p.trim().toLowerCase();
      return (
        t === 'united states' ||
        t === 'united states of america' ||
        t === 'usa' ||
        t === 'us'
      );
    };

    // Drop trailing country.
    while (parts.length > 0 && isUsCountry(parts[parts.length - 1]!)) parts.pop();
    // Drop any "* County" segment.
    const withoutCounty = parts.filter((p) => !/\bcounty\b/i.test(p));

    // Fix Apple-style split street number: "368, East Echo Ledge Drive" -> "368 East Echo Ledge Drive"
    if (withoutCounty.length >= 2 && /^\d+$/.test(withoutCounty[0]!)) {
      withoutCounty[0] = `${withoutCounty[0]} ${withoutCounty[1]}`;
      withoutCounty.splice(1, 1);
    }

    // If we can detect a US ZIP, rebuild as "street, city, state zip" and drop obvious venue-y fragments.
    const zipIdx = (() => {
      for (let i = withoutCounty.length - 1; i >= 0; i--) {
        if (/^\d{5}(?:-\d{4})?$/.test(withoutCounty[i]!)) return i;
      }
      return -1;
    })();

    if (zipIdx >= 2) {
      const zip = withoutCounty[zipIdx]!;
      const state = withoutCounty[zipIdx - 1]!;
      const city = withoutCounty[zipIdx - 2]!;
      const streetParts = withoutCounty.slice(0, zipIdx - 2);

      const VENUE_Y_TERMS = [
        'resort',
        'hotel',
        'inn',
        'plaza',
        'mall',
        'shopping center',
        'shopping centre',
        'center',
        'centre',
      ];

      const streetClean = streetParts.filter((p) => {
        const t = p.toLowerCase();
        // Keep apartment/unit identifiers and anything with digits.
        if (/\d/.test(p)) return true;
        // Drop common venue fragments when they're standalone comma segments.
        return !VENUE_Y_TERMS.some((term) => t.includes(term));
      });

      const street = (streetClean[0] ?? withoutCounty[0] ?? '').trim();
      const out = [street, city, `${state} ${zip}`].filter(Boolean).join(', ');
      return out || base;
    }

    return withoutCounty.join(', ');
  }, []);

  const getSafeLocationRadiusM = useCallback(() => {
    return Math.max(
      MIN_LOCATION_RADIUS_FT * 0.3048,
      Math.min(MAX_LOCATION_RADIUS_FT * 0.3048, locationRadiusMetersDraft || DEFAULT_RADIUS_FT * 0.3048),
    );
  }, [
    DEFAULT_RADIUS_FT,
    MAX_LOCATION_RADIUS_FT,
    MIN_LOCATION_RADIUS_FT,
    locationRadiusMetersDraft,
  ]);

  const commitLocation = useCallback(
    (loc: { label: string; latitude: number; longitude: number }) => {
      if (!activity?.id) return;
      const safeRadiusM = getSafeLocationRadiusM();
      const timestamp = new Date().toISOString();
      updateActivity(activity.id, (prev) => ({
        ...prev,
        location: {
          label: loc.label,
          latitude: loc.latitude,
          longitude: loc.longitude,
          trigger: locationTriggerDraft,
          radiusM: safeRadiusM,
        },
        updatedAt: timestamp,
      }));
    },
    [
      activity?.id,
      locationTriggerDraft,
      updateActivity,
      getSafeLocationRadiusM,
    ],
  );

  const scheduleCommitLocation = useCallback(
    (loc: { label: string; latitude: number; longitude: number }) => {
      if (mapCommitTimeoutRef.current) {
        clearTimeout(mapCommitTimeoutRef.current);
      }
      // Avoid spamming the global Activity store during active map gestures (pinch/pan).
      mapCommitTimeoutRef.current = setTimeout(() => {
        commitLocation(loc);
      }, 420);
    },
    [commitLocation],
  );
  const computeRegionForRadius = useCallback((center: { latitude: number; longitude: number }, radiusM: number): Region => {
    // Roughly fit ~3 radii to each edge of the viewport.
    const safeRadius = Math.max(10, Math.min(5000, radiusM));
    const deltaLat = Math.max(0.005, (safeRadius * 6) / 111_000);
    const cos = Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180));
    const deltaLon = Math.max(0.005, deltaLat / cos);
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLon,
    };
  }, []);

  const animateMapToCenter = useCallback(
    (center: { latitude: number; longitude: number }, radiusM: number) => {
      const region = computeRegionForRadius(center, radiusM);
      mapRef.current?.animateToRegion(region, 250);
    },
    [computeRegionForRadius],
  );

  useEffect(() => {
    if (!locationSheetVisible) return;
    // Reset per-opening so the sheet recenters on saved/preview location even if the MapView
    // is still mounted from a prior open.
    didAutoCenterLocationSheetRef.current = false;
  }, [locationSheetVisible]);

  useEffect(() => {
    if (!locationSheetVisible) return;
    if (didAutoCenterLocationSheetRef.current) return;
    if (!resolvedLocationMapCenter) return;
    if (!mapRef.current) return;
    didAutoCenterLocationSheetRef.current = true;
    animateMapToCenter(resolvedLocationMapCenter, getSafeLocationRadiusM());
  }, [
    animateMapToCenter,
    getSafeLocationRadiusM,
    locationSheetVisible,
    resolvedLocationMapCenter,
  ]);

  const locationMapPanResponder = useMemo(() => {
    // WebMercator helpers (pixel space at given zoom).
    const worldSize = 256 * Math.pow(2, LOCATION_MAP_ZOOM);
    const clampLat = (lat: number) => Math.max(-85.05112878, Math.min(85.05112878, lat));
    const lonToX = (lon: number) => ((lon + 180) / 360) * worldSize;
    const latToY = (lat: number) => {
      const rad = (clampLat(lat) * Math.PI) / 180;
      const sin = Math.sin(rad);
      return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize;
    };
    const xToLon = (x: number) => (x / worldSize) * 360 - 180;
    const yToLat = (y: number) => {
      const n = Math.PI - (2 * Math.PI * y) / worldSize;
      return (180 / Math.PI) * Math.atan(Math.sinh(n));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => Boolean(resolvedLocationMapCenter),
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Boolean(resolvedLocationMapCenter) && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        if (!resolvedLocationMapCenter) return;
        mapDragStartCenterRef.current = { ...resolvedLocationMapCenter };
      },
      onPanResponderMove: (_evt, gesture) => {
        const start = mapDragStartCenterRef.current;
        if (!start) return;
        // Dragging the map moves the camera opposite the finger direction.
        const startX = lonToX(start.longitude);
        const startY = latToY(start.latitude);
        const nextX = startX - gesture.dx;
        const nextY = startY - gesture.dy;
        const nextCenter = { latitude: clampLat(yToLat(nextY)), longitude: xToLon(nextX) };
        mapCenterOverrideRef.current = nextCenter;
        setMapCenterOverride(nextCenter);
      },
      onPanResponderRelease: () => {
        const center = mapCenterOverrideRef.current ?? resolvedLocationMapCenter;
        if (!center) return;
        const loc = { label: 'Dropped pin', latitude: center.latitude, longitude: center.longitude };
        setPreviewLocation(loc);
        commitLocation(loc);
      },
      onPanResponderTerminate: () => {
        // no-op
      },
    });
  }, [LOCATION_MAP_ZOOM, commitLocation, resolvedLocationMapCenter]);

  const clearLocationSelection = useCallback(() => {
    setLocationQuery('');
    setLocationResults([]);
    setIsSearchingLocation(false);
    setPreviewLocation(null);
    setMapCenterOverride(null);
    mapCenterOverrideRef.current = null;
    setLocationSelectedValue('');
    setIsLocationSearchOpen(false);
    if (activity?.location) {
      const timestamp = new Date().toISOString();
      updateActivity(activity.id, (prev) => ({
        ...prev,
        location: null,
        updatedAt: timestamp,
      }));
    }
  }, [activity?.id, activity?.location, updateActivity]);

  // If a location is already attached, keep trigger/radius changes in sync immediately (no "Set" CTA).
  useEffect(() => {
    if (!locationSheetVisible) return;
    if (!activity?.id) return;
    const loc = (activity as any)?.location as any;
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
    const safeRadiusM = Math.max(
      MIN_LOCATION_RADIUS_FT * 0.3048,
      Math.min(MAX_LOCATION_RADIUS_FT * 0.3048, locationRadiusMetersDraft || DEFAULT_RADIUS_FT * 0.3048),
    );
    if (loc.trigger === locationTriggerDraft && Number(loc.radiusM) === Number(safeRadiusM)) return;
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      location: {
        ...((prev as any).location ?? loc),
        trigger: locationTriggerDraft,
        radiusM: safeRadiusM,
      },
      updatedAt: timestamp,
    }));
  }, [
    activity,
    locationRadiusMetersDraft,
    locationSheetVisible,
    locationTriggerDraft,
    updateActivity,
    DEFAULT_RADIUS_FT,
    MAX_LOCATION_RADIUS_FT,
    MIN_LOCATION_RADIUS_FT,
  ]);

  useEffect(() => {
    if (!locationSheetVisible) return;
    setLocationStatusHint(null);
    setMapCenterOverride(null);
    mapCenterOverrideRef.current = null;
    setLocationSelectedValue('');
    // Initialize trigger/radius from current activity (or defaults).
    const loc = (activity as any)?.location as any;
    const trigger = loc?.trigger === 'arrive' || loc?.trigger === 'leave' ? loc.trigger : 'leave';
    const radiusM =
      typeof loc?.radiusM === 'number' && Number.isFinite(loc.radiusM)
        ? Math.max(MIN_LOCATION_RADIUS_FT * 0.3048, Math.min(MAX_LOCATION_RADIUS_FT * 0.3048, loc.radiusM))
        : DEFAULT_RADIUS_FT * 0.3048;
    setLocationTriggerDraft(trigger);
    setLocationRadiusMetersDraft(radiusM);
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      setPreviewLocation({
        label: String(loc.label ?? 'Selected location'),
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    } else {
      setPreviewLocation(null);
    }
    // Best-effort: if we haven't asked yet, request so we can center on "current location".
    void (async () => {
      const prefs = useAppStore.getState().locationOfferPreferences;
      if (prefs.osPermissionStatus === 'notRequested') {
        await LocationPermissionService.requestOsPermission();
      } else {
        await LocationPermissionService.syncOsPermissionStatus();
      }
      const coords = await getCurrentLocationBestEffort();
      if (coords) {
        setCurrentCoords(coords);
      } else {
        const next = useAppStore.getState().locationOfferPreferences.osPermissionStatus;
        if (next === 'denied' || next === 'restricted') {
          setLocationStatusHint('Location is blocked in system settings. Search still works.');
        } else if (next === 'unavailable') {
          setLocationStatusHint('Location isn’t available in this build yet. Search still works.');
        } else {
          setLocationStatusHint('Couldn’t read current location. Search still works.');
        }
      }
    })();
  }, [locationSheetVisible]);

  useEffect(() => {
    if (!locationSheetVisible) return;
    const q = locationQuery.trim();
    if (q.length < 2) {
      setLocationResults([]);
      setIsSearchingLocation(false);
      setLocationSearchError(null);
      locationSearchAbortRef.current?.abort();
      cancelApplePlaceSearchBestEffort();
      return;
    }
    // Any new query invalidates the previous in-flight request immediately (even before debounce),
    // so stale responses can’t overwrite newer results.
    locationSearchAbortRef.current?.abort();
    cancelApplePlaceSearchBestEffort();
    // Show "Searching…" immediately (even during debounce) so the UI doesn't flash
    // "No results found" while we wait to fire the request.
    setIsSearchingLocation(true);
    setLocationSearchError(null);
    const timer = setTimeout(() => {
      const cacheKey = q.toLowerCase();
      const cached = locationSearchCacheRef.current.get(cacheKey);
      if (cached) {
        setIsSearchingLocation(false);
        setLocationSearchError(null);
        setLocationResults(cached);
        if (cached.length > 0) {
          setPreviewLocation((prev) => prev ?? cached[0] ?? null);
        }
        return;
      }

      const controller = new AbortController();
      locationSearchAbortRef.current = controller;

      void (async () => {
        // Keep searching state on while the request is in-flight.
        setIsSearchingLocation(true);
        try {
          // iOS (dev build): prefer Apple Maps search for high-quality local addresses.
          // Fallback: Nominatim (cross-platform).
          const apple = await applePlaceSearchBestEffort({
            query: q,
            center: currentCoords,
            radiusKm: 200,
            limit: 6,
          });
          if (controller.signal.aborted) return;

          if (apple && apple.length > 0) {
            const next = apple.map((r) => ({
              id: r.id,
              label: normalizePlaceLabel(r.label),
              latitude: r.latitude,
              longitude: r.longitude,
            }));
            setLocationResults(next);
            locationSearchCacheRef.current.set(cacheKey, next);
            setLocationSearchError(null);
            if (next.length > 0) setPreviewLocation((prev) => prev ?? next[0] ?? null);
            return;
          }

          // Nominatim best-effort fallback (used on Android/web, and on iOS when Apple search isn't available).
          const baseUrl = 'https://nominatim.openstreetmap.org/search';
          const makeUrl = (opts: { bounded: boolean }) => {
            const params = new URLSearchParams();
            params.set('format', 'json');
            // Pull more than we display so we can distance-sort for local relevance.
            params.set('limit', currentCoords ? '18' : '6');
            params.set('q', q);
            // Prefer English-ish labels; Nominatim accepts multiple languages but this helps US addresses.
            params.set('accept-language', 'en');
            // Bias toward US results; still not strictly bounded unless we set viewbox+bounded.
            params.set('countrycodes', 'us');

            if (currentCoords) {
              const lat = currentCoords.latitude;
              const lon = currentCoords.longitude;
              // ~200km radius bounding box.
              const radiusKm = 200;
              const dLat = radiusKm / 111;
              const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
              const dLon = radiusKm / (111 * cos);
              const left = lon - dLon;
              const right = lon + dLon;
              const top = lat + dLat;
              const bottom = lat - dLat;
              params.set('viewbox', `${left},${top},${right},${bottom}`);
              if (opts.bounded) {
                // Strictly constrain to the viewbox (best for "near me" address search).
                params.set('bounded', '1');
              }
            }

            return `${baseUrl}?${params.toString()}`;
          };

          const fetchNominatim = async (opts: { bounded: boolean }) => {
            const url = makeUrl(opts);
            const resp = await fetch(url, {
              signal: controller.signal,
              headers: {
                Accept: 'application/json',
                // Nominatim usage policy requests a UA identifying the application.
                // This is best-effort; some platforms may ignore it.
                'User-Agent': 'Kwilt/1.0 (location search)',
              },
            });
            if (!resp.ok) {
              const text = await resp.text().catch(() => '');
              throw new Error(`Nominatim ${resp.status}${text ? `: ${text.slice(0, 160)}` : ''}`);
            }
            const json = (await resp.json()) as Array<any>;
            const raw = (Array.isArray(json) ? json : [])
              .map((row) => {
                const lat = Number.parseFloat(String(row?.lat ?? ''));
                const lon = Number.parseFloat(String(row?.lon ?? ''));
                const label = normalizePlaceLabel(String(row?.display_name ?? '').trim());
                const idRaw = row?.place_id ?? row?.osm_id ?? null;
                const id = idRaw != null ? String(idRaw) : `${lat}:${lon}:${label}`;
                if (!Number.isFinite(lat) || !Number.isFinite(lon) || !label) return null;
                return { id, label, latitude: lat, longitude: lon };
              })
              .filter(Boolean) as Array<{ id: string; label: string; latitude: number; longitude: number }>;

            if (!currentCoords) return raw.slice(0, 6);

            // Nearest-first sort when we have a user location.
            const toRad = (deg: number) => (deg * Math.PI) / 180;
            const lat1 = toRad(currentCoords.latitude);
            const lon1 = toRad(currentCoords.longitude);
            const haversineMeters = (lat2d: number, lon2d: number) => {
              const R = 6371e3;
              const lat2 = toRad(lat2d);
              const lon2 = toRad(lon2d);
              const dLat = lat2 - lat1;
              const dLon = lon2 - lon1;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLon / 2) * Math.sin(dLon / 2));
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              return R * c;
            };
            return raw
              .map((r) => ({ ...r, _dist: haversineMeters(r.latitude, r.longitude) }))
              .sort((a, b) => a._dist - b._dist)
              .slice(0, 6)
              .map(({ _dist: _ignored, ...r }) => r);
          };

          // Two-pass strategy:
          // - Pass 1: bounded to the local viewbox (best for "near me" addresses)
          // - Pass 2: unbounded (still US-biased) if pass 1 returns nothing
          let next = await fetchNominatim({ bounded: Boolean(currentCoords) });
          if (controller.signal.aborted) return;
          if (next.length === 0 && currentCoords) {
            next = await fetchNominatim({ bounded: false });
          }

          if (controller.signal.aborted) return;
          setLocationResults(next);
          locationSearchCacheRef.current.set(cacheKey, next);
          setLocationSearchError(null);
          // If the user hasn't explicitly picked a preview, default the preview to the top result.
          if (next.length > 0) {
            setPreviewLocation((prev) => prev ?? next[0] ?? null);
          }
        } catch (err) {
          if ((err as any)?.name === 'AbortError') return;
          setLocationResults([]);
          setLocationSearchError(err instanceof Error ? err.message : 'Search failed.');
        } finally {
          if (!controller.signal.aborted) {
            setIsSearchingLocation(false);
          }
        }
      })();
    }, 280);
    return () => {
      clearTimeout(timer);
      locationSearchAbortRef.current?.abort();
      cancelApplePlaceSearchBestEffort();
    };
  }, [locationQuery, locationSheetVisible, normalizePlaceLabel]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isOutlookInstalled, setIsOutlookInstalled] = useState(false);
  const [pendingCalendarToast, setPendingCalendarToast] = useState<string | null>(null);

  const titleStepsBundleRef = useRef<View | null>(null);
  const scheduleAndPlanningCardRef = useRef<View | null>(null);
  const actionDockLeftRef = useRef<View | null>(null);
  const actionDockRightRef = useRef<View | null>(null);
  const finishMutationRef = useRef<{ completedAtStamp: string; stepIds: string[] } | null>(null);
  const [detailGuideStep, setDetailGuideStep] = useState(0);
  const [isTitleStepsBundleReady, setIsTitleStepsBundleReady] = useState(false);
  const [isScheduleCardReady, setIsScheduleCardReady] = useState(false);
  const [isActionDockReady, setIsActionDockReady] = useState(false);
  const [titleStepsBundleOffset, setTitleStepsBundleOffset] = useState<number | null>(null);
  const [scheduleCardOffset, setScheduleCardOffset] = useState<number | null>(null);

  const handleBackToActivities = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // Fallback for deep links / cold opens: if this Activity was created from a checklist step,
    // prefer returning to the parent Activity detail rather than dumping the user into the list.
    const origin = (activity as any)?.origin;
    const parentActivityId = origin?.kind === 'activity_step' ? origin?.parentActivityId : null;
    if (parentActivityId) {
      const screenName = route.name === 'ActivityDetailFromGoal' ? 'ActivityDetailFromGoal' : 'ActivityDetail';
      (navigation as any).navigate(screenName, {
        activityId: parentActivityId,
        entryPoint: (route.params as any)?.entryPoint,
      });
      return;
    }

    navigation.navigate('ActivitiesList');
  };

  const activityExportText = useMemo(() => {
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

  const sendToSearchQuery = useMemo(() => {
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
      const text = activityExportText;
      if (!text) return;
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Activity details copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Unable to copy to clipboard on this device right now.');
    }
  }, [activityExportText]);

  const handleSendToShare = useCallback(async () => {
    try {
      const text = activityExportText;
      if (!text) return;
      await Share.share({ message: text });
    } catch {
      // No-op: Share sheets can be dismissed or unavailable on some platforms.
    }
  }, [activityExportText]);

  const handleSendToAmazon = useCallback(async () => {
    const q = sendToSearchQuery;
    if (!q) return;
    const url = buildAffiliateRetailerSearchUrl('amazon', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [openExternalUrl, sendToSearchQuery]);

  const handleSendToHomeDepot = useCallback(async () => {
    const q = sendToSearchQuery;
    if (!q) return;
    const url = buildAffiliateRetailerSearchUrl('homeDepot', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [openExternalUrl, sendToSearchQuery]);

  const handleSendToInstacart = useCallback(async () => {
    const q = sendToSearchQuery;
    if (!q) return;
    // Best-effort web fallback (native deep links can be added later).
    const url = buildAffiliateRetailerSearchUrl('instacart', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [openExternalUrl, sendToSearchQuery]);

  const handleSendToDoorDash = useCallback(async () => {
    const q = sendToSearchQuery;
    if (!q) return;
    const url = buildAffiliateRetailerSearchUrl('doorDash', q);
    if (!url) return;
    await openExternalUrl(url);
  }, [openExternalUrl, sendToSearchQuery]);

  useEffect(() => {
    if (!sendToSheetVisible) return;
    setIsLoadingDestinations(true);
    listExecutionTargets()
      .then((tgs) => setInstalledDestinations(Array.isArray(tgs) ? tgs : []))
      .catch(() => setInstalledDestinations([]))
      .finally(() => setIsLoadingDestinations(false));
  }, [sendToSheetVisible]);

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
    if (!domainHydrated) {
      return (
        <AppShell>
          <PageHeader title="Activity" onPressBack={handleBackToActivities} />
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.textPrimary} />
            <Text style={[styles.emptyBody, { marginTop: spacing.lg }]}>Loading activity…</Text>
          </View>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <PageHeader title="Activity" onPressBack={handleBackToActivities} />
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

  const detailGuideStepCount = 4;
  const detailGuideStepReady = (() => {
    if (detailGuideStep === 0) return isTitleStepsBundleReady;
    if (detailGuideStep === 1) return isScheduleCardReady;
    // Dock steps: require the dock to be mounted (it is hidden while keyboard/editing UI is active).
    return isActionDockReady;
  })();

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
    detailGuideStepReady;

  const detailGuideTargetScrollY = useMemo(() => {
    if (detailGuideStep === 0) return 0;
    if (detailGuideStep === 1) {
      return scheduleCardOffset != null ? Math.max(0, scheduleCardOffset - 120) : null;
    }
    // Dock targets are fixed to the bottom of the viewport; no scroll needed.
    return null;
  }, [detailGuideStep, scheduleCardOffset]);

  const detailGuideHost = useCoachmarkHost({
    active: shouldShowDetailGuide,
    stepKey: detailGuideStep,
    targetScrollY: detailGuideTargetScrollY,
    scrollTo: (args) => scrollRef.current?.scrollTo(args),
  });

  const dismissDetailGuide = () => {
    setHasDismissedActivityDetailGuide(true);
    setDetailGuideStep(0);
  };

  const detailGuideTargetRef = (() => {
    if (detailGuideStep === 0) return titleStepsBundleRef;
    if (detailGuideStep === 1) return scheduleAndPlanningCardRef;
    if (detailGuideStep === 2) return actionDockLeftRef;
    return actionDockRightRef;
  })();

  const detailGuideTitle = (() => {
    if (detailGuideStep === 0) return 'Edit + complete here';
    if (detailGuideStep === 1) return 'Schedule + plan';
    if (detailGuideStep === 2) return 'Quick actions';
    return 'Finish fast';
  })();

  const detailGuideBody = (() => {
    if (detailGuideStep === 0) {
      return 'Check steps to make progress—when all steps are checked, the Activity is complete. Tap the bottom-right button to finish remaining steps fast; tap again to undo that finish.';
    }
    if (detailGuideStep === 1) {
      return 'Add reminders, due dates, and repeats. Use time estimate + difficulty to keep your plan realistic (AI suggestions appear when available).';
    }
    if (detailGuideStep === 2) {
      return 'Use the left action dock for common shortcuts like Focus mode, Calendar, Send to… (when available), and AI help.';
    }
    return 'Use the bottom-right button to mark the activity done (or undo). When your steps are complete, you’ll see the progress ring fill and the button celebrate.';
  })();

  const detailGuidePlacement = detailGuideStep >= 2 ? 'above' : 'below';
  const detailGuideIsFinalStep = detailGuideStep >= detailGuideStepCount - 1;

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

  // iOS ecosystem surfaces (Shortcuts / widgets) can request a best-effort single-tap
  // "Start Focus" experience by deep-linking with `autoStartFocus=1`.
  useEffect(() => {
    if (!autoStartFocus) return;
    if (!activity) return;
    requestAnimationFrame(() => {
      const minutes =
        typeof autoStartMinutes === 'number' && Number.isFinite(autoStartMinutes)
          ? autoStartMinutes
          : undefined;
      startFocusSession(minutes).catch(() => undefined);
      // Best-effort: clear params so returning to this screen doesn't re-trigger.
      try {
        navigation.setParams({ autoStartFocus: undefined, minutes: undefined } as any);
      } catch {
        // no-op
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartFocus, activity?.id]);

  // iOS ecosystem surfaces (Shortcuts) can request ending an in-progress Focus session.
  useEffect(() => {
    if (!endFocus) return;
    if (!activity) return;
    requestAnimationFrame(() => {
      endFocusSession().catch(() => undefined);
      try {
        navigation.setParams({ endFocus: undefined } as any);
      } catch {
        // no-op
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endFocus, activity?.id]);

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

  const startFocusSession = async (overrideMinutes?: number) => {
    const draftOrOverride =
      typeof overrideMinutes === 'number' && Number.isFinite(overrideMinutes)
        ? overrideMinutes
        : Number(focusMinutesDraft);
    const minutes = Math.max(1, Math.floor(draftOrOverride));
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

  // Best-effort: expose Focus session state to iOS ecosystem surfaces via App Group.
  useEffect(() => {
    if (!activity) return;
    if (!focusSession) {
      void setGlanceableFocusSession(null);
      void endLiveActivity();
      return;
    }

    const common = {
      id: `${activity.id}-${focusSession.startedAtMs}`,
      mode: focusSession.mode,
      startedAtMs: focusSession.startedAtMs,
      activityId: activity.id,
      title: activity.title,
    } as const;

    if (focusSession.mode === 'running') {
      void setGlanceableFocusSession({
        ...common,
        endAtMs: focusSession.endAtMs,
      });
      void syncLiveActivity({
        mode: 'running',
        activityId: activity.id,
        title: activity.title,
        startedAtMs: focusSession.startedAtMs,
        endAtMs: focusSession.endAtMs,
      });
      return;
    }

    void setGlanceableFocusSession({
      ...common,
      remainingMs: focusSession.remainingMs,
    });
    // For v1, end the Live Activity when paused (avoids stale timers).
    void syncLiveActivity({
      mode: 'paused',
      activityId: activity.id,
      title: activity.title,
      startedAtMs: focusSession.startedAtMs,
      endAtMs: Date.now() + focusSession.remainingMs,
    });
  }, [activity?.id, activity?.title, focusSession]);

  useEffect(() => {
    if (!focusSession) return;
    if (focusSession.mode !== 'running') return;
    if (remainingFocusMs > 0) return;

    // Session completed
    void HapticsService.trigger('outcome.success');
    recordShowUpWithCelebration();
    recordCompletedFocusSessionWithMilestone({ completedAtMs: Date.now() });
    endFocusSession().catch(() => undefined);

    // Check-in nudge for activities under shared goals
    const activityGoalId = activity?.goalId;
    if (activityGoalId) {
      const { shouldShowNudge } = useCheckinNudgeStore.getState();
      if (shouldShowNudge(activityGoalId, 'focus_complete')) {
        setTimeout(() => {
          useToastStore.getState().showToast({
            message: 'Great focus session! Share with your team?',
            variant: 'default',
            durationMs: 4000,
            actionLabel: 'Check in',
            actionOnPress: () => {
              rootNavigationRef.navigate('ArcsStack', {
                screen: 'GoalDetail',
                params: {
                  goalId: activityGoalId,
                  entryPoint: 'activitiesStack',
                  openActivitySheet: true,
                },
              });
            },
          });
        }, 1500); // Slightly longer delay to not compete with completion celebration
      }
    }
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
                  recordShowUpWithCelebration();
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
    prevSteps: ActivityStep[],
    nextSteps: ActivityStep[],
    timestamp: string,
    prevCompletedAt?: string | null
  ) => {
    if (nextSteps.length === 0) {
      return { nextStatus: prevStatus, nextCompletedAt: prevCompletedAt ?? null };
    }

    const prevAllStepsComplete = prevSteps.length > 0 && prevSteps.every((s) => !!s.completedAt);
    const allStepsComplete = nextSteps.length > 0 && nextSteps.every((s) => !!s.completedAt);
    const anyStepComplete = nextSteps.some((s) => !!s.completedAt);

    let nextStatus: ActivityStatus = prevStatus;
    if (allStepsComplete) {
      // Key UX: when a user checks the last step, we auto-mark the activity done once.
      // But if they later un-mark the activity as not done, we should NOT force it back to done
      // just because the steps remain checked.
      if (!prevAllStepsComplete && prevStatus !== 'done') {
        nextStatus = 'done';
      } else if (prevStatus === 'done') {
        nextStatus = 'done';
      } else {
        nextStatus = 'in_progress';
      }
    } else if (anyStepComplete) {
      nextStatus = 'in_progress';
    } else {
      nextStatus = 'planned';
    }

    const nextCompletedAt = nextStatus === 'done' ? prevCompletedAt ?? timestamp : null;

    return { nextStatus, nextCompletedAt };
  };

  const applyStepUpdate = (updater: (current: ActivityStep[]) => ActivityStep[]) => {
    // Important: Persisting the app store currently serializes a large object to AsyncStorage.
    // Doing that synchronously in the press handler can delay the visual checkmark update.
    // We apply the change locally first (instant UI feedback) and defer the persisted store
    // write until after interactions so touches feel snappy.
    const localCurrent = stepsDraft ?? [];
    const nextLocalSteps = updater(localCurrent);
    setStepsDraft(nextLocalSteps);

    // Defer the heavier store update/persistence.
    InteractionManager.runAfterInteractions(() => {
      const timestamp = new Date().toISOString();
      let markedDone = false;
      let hadSteps = false;

      updateActivity(activity.id, (prev) => {
        const currentSteps = prev.steps ?? [];
        const nextSteps = updater(currentSteps);
        hadSteps = nextSteps.length > 0;
        const { nextStatus, nextCompletedAt } = deriveStatusFromSteps(
          prev.status,
          currentSteps,
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
          // Important: allow un-finishing to clear completedAt (don't keep the prior stamp).
          completedAt: nextCompletedAt,
          updatedAt: timestamp,
        };
      });

      if (markedDone) {
        if (suppressNextAutoDoneHapticRef.current) {
          suppressNextAutoDoneHapticRef.current = false;
        } else {
          void HapticsService.trigger('outcome.bigSuccess');
        }
        void playActivityDoneSound();
        recordShowUpWithCelebration();
        capture(AnalyticsEvent.ActivityCompletionToggled, {
          source: 'activity_detail',
          activity_id: activity.id,
          goal_id: activity.goalId ?? null,
          next_status: 'done',
          had_steps: hadSteps,
        });

        // Check-in nudge for activities under shared goals
        const activityGoalId = activity.goalId;
        if (activityGoalId) {
          const { shouldShowNudge } = useCheckinNudgeStore.getState();
          if (shouldShowNudge(activityGoalId, 'activity_complete')) {
            setTimeout(() => {
              useToastStore.getState().showToast({
                message: 'Share your progress with your team?',
                variant: 'default',
                durationMs: 4000,
                actionLabel: 'Check in',
                actionOnPress: () => {
                  rootNavigationRef.navigate('ArcsStack', {
                    screen: 'GoalDetail',
                    params: {
                      goalId: activityGoalId,
                      entryPoint: 'activitiesStack',
                      openActivitySheet: true,
                    },
                  });
                },
              });
            }, 1200);
          }
        }
      }
    });
  };

  const handleToggleStepComplete = (stepId: string) => {
    const existing = (stepsDraft ?? []).find((s) => s.id === stepId);
    if (existing?.linkedActivityId) {
      // Linked steps mirror completion from the target Activity and are not directly checkable here.
      return;
    }
    const willComplete = Boolean(existing && !existing.completedAt);
    const wouldFinishActivity =
      willComplete &&
      (() => {
        const current = stepsDraft ?? [];
        const stamp = new Date().toISOString();
        const next = current.map((s) =>
          s.id === stepId ? { ...s, completedAt: s.completedAt ? null : stamp } : s
        );
        return next.length > 0 && next.every((s) => !!s.completedAt);
      })();

    if (wouldFinishActivity) {
      suppressNextAutoDoneHapticRef.current = true;
      void HapticsService.trigger('outcome.bigSuccess');
    } else {
      void HapticsService.trigger(willComplete ? 'canvas.step.complete' : 'canvas.step.undo');
    }
    if (willComplete) {
      void playStepDoneSound();
    }
    // Marking a step complete is meaningful progress; count it as "showing up".
    if (existing && !existing.completedAt) {
      recordShowUpWithCelebration();
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

  const handleConvertStepToActivity = useCallback(
    (stepId: string) => {
      const step = (stepsDraft ?? []).find((s) => s.id === stepId) ?? null;
      if (!step) return;
      if (step.linkedActivityId) {
        // Already linked; just open the existing Activity.
        if (step.linkedActivityId) openActivityDetail(step.linkedActivityId);
        return;
      }
      const trimmedTitle = (step.title ?? '').trim();
      if (!trimmedTitle) return;

      const timestamp = new Date().toISOString();
      const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const nextActivity: Activity = {
        id,
        goalId: effectiveGoalId,
        title: trimmedTitle,
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
        scheduledAt: null,
        repeatRule: undefined,
        repeatCustom: undefined,
        orderIndex: (activities.length || 0) + 1,
        phase: null,
        status: 'planned',
        actualMinutes: null,
        startedAt: null,
        completedAt: null,
        aiPlanning: undefined,
        forceActual: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        origin: {
          kind: 'activity_step',
          parentActivityId: activity.id,
          parentStepId: stepId,
        },
      };

      // Note: Creating activities no longer counts as "showing up" for streaks.
      addActivity(nextActivity);
      // Replace the step with a linked redirect row (completion becomes derived).
      updateActivity(activity.id, (prev) => ({
        ...prev,
        steps: (prev.steps ?? []).map((s) =>
          s.id === stepId ? { ...s, linkedActivityId: id, linkedAt: timestamp, completedAt: null } : s
        ),
        updatedAt: timestamp,
      }));

      openActivityDetail(id);
    },
    [
      activities.length,
      activity?.id,
      addActivity,
      effectiveGoalId,
      openActivityDetail,
      recordShowUp,
      stepsDraft,
      updateActivity,
    ]
  );

  const handleUnlinkStepActivity = useCallback(
    (stepId: string) => {
      const step = (stepsDraft ?? []).find((s) => s.id === stepId) ?? null;
      const linkedActivityId = step?.linkedActivityId ?? null;
      if (!linkedActivityId) return;

      Alert.alert(
        'Unlink activity?',
        'This will turn the row back into a normal checklist step. The linked activity will remain.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlink',
            style: 'destructive',
            onPress: () => {
              const timestamp = new Date().toISOString();
              updateActivity(activity.id, (prev) => ({
                ...prev,
                steps: (prev.steps ?? []).map((s) =>
                  s.id === stepId
                    ? { ...s, linkedActivityId: null, linkedAt: undefined, completedAt: null }
                    : s
                ),
                updatedAt: timestamp,
              }));
              // Best-effort: clear provenance on the child activity so it no longer points back.
              updateActivity(linkedActivityId, (prev) => ({
                ...prev,
                origin: undefined,
                updatedAt: timestamp,
              }));
            },
          },
        ]
      );
    },
    [activity.id, stepsDraft, updateActivity]
  );

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

  const commitInlineStep = (mode: 'continue' | 'exit' = 'exit') => {
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
    setNewStepTitle('');
    if (mode === 'exit') {
      setIsAddingStepInline(false);
      return;
    }
    // Keep the inline "Add step" input active so users can rapidly enter multiple steps.
    // (We don't rely solely on `blurOnSubmit={false}`; re-focusing is defensive across platforms.)
    requestAnimationFrame(() => {
      newStepInputRef.current?.focus();
    });
  };

  const handleToggleComplete = () => {
    const timestamp = new Date().toISOString();
    const hasSteps = (stepsDraft?.length ?? 0) > 0;

    // No steps: keep the manual done toggle behavior.
    if (!hasSteps) {
      finishMutationRef.current = null;
      const wasCompleted = isCompleted;
      void HapticsService.trigger(wasCompleted ? 'canvas.primary.confirm' : 'outcome.bigSuccess');
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
        recordShowUpWithCelebration();
      }
      return;
    }

    // Steps exist: completion is driven by steps. The button is a Finish/Undo shortcut.
    const stepsNow = stepsDraft ?? [];
    const allStepsCompleteNow = stepsNow.length > 0 && stepsNow.every((s) => !!s.completedAt);

    if (!allStepsCompleteNow) {
      void HapticsService.trigger('canvas.primary.confirm');
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

    // All steps complete:
    // - If the user used Finish, allow tapping again to undo that Finish (revert only the steps that Finish checked).
    // - Otherwise, treat this as an explicit "done / not-done" toggle that does NOT change step checkmarks.
    const mutation = finishMutationRef.current;
    if (mutation && mutation.stepIds.length > 0) {
      finishMutationRef.current = null;
      void HapticsService.trigger('canvas.primary.confirm');
      const idSet = new Set(mutation.stepIds);
      applyStepUpdate((steps) =>
        steps.map((step) =>
          idSet.has(step.id) && step.completedAt === mutation.completedAtStamp
            ? { ...step, completedAt: null }
            : step
        )
      );
      return;
    }

    // Manual completion toggle (keep steps as-is).
    finishMutationRef.current = null;
    const wasCompleted = isCompleted;
    void HapticsService.trigger(wasCompleted ? 'canvas.primary.confirm' : 'outcome.bigSuccess');
    updateActivity(activity.id, (prev) => {
      const nextIsDone = prev.status !== 'done';
      return {
        ...prev,
        status: nextIsDone ? 'done' : 'in_progress',
        completedAt: nextIsDone ? timestamp : null,
        updatedAt: timestamp,
      };
    });
    if (!wasCompleted) {
      recordShowUpWithCelebration();
    }
    capture(AnalyticsEvent.ActivityCompletionToggled, {
      source: 'activity_detail',
      activity_id: activity.id,
      goal_id: activity.goalId ?? null,
      next_status: wasCompleted ? 'in_progress' : 'done',
      had_steps: true,
    });
  };

  const handleSelectReminder = (offsetDays: number, hours = 9, minutes = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(hours, minutes, 0, 0);
    const timestamp = new Date().toISOString();
    // Note: Planning no longer counts as "showing up" for streaks.
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
    // Note: Planning no longer counts as "showing up" for streaks.
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
    // Note: Planning no longer counts as "showing up" for streaks.
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
    // Note: Planning no longer counts as "showing up" for streaks.
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
    // Note: Planning no longer counts as "showing up" for streaks.
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
  const hasInitializedProgressRef = useRef(false);
  const [rightItemCenterLabelPulseKey, setRightItemCenterLabelPulseKey] = useState(0);
  const prevCompletedCountRef = useRef<number>(completedStepsCount);
  const activityTypeLabel = useMemo(() => {
    const match = (activityTypeOptions ?? []).find((opt: any) => opt?.value === activity.type);
    return (match?.label ?? 'Activity') as string;
  }, [activity.type, activityTypeOptions]);

  useEffect(() => {
    // Defensive: if this screen instance is reused for a different activity id,
    // reset baseline refs so we don't "celebrate on mount" for the next activity.
    hasInitializedProgressRef.current = false;
    prevProgressRef.current = 0;
    prevCompletedCountRef.current = completedStepsCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  useEffect(() => {
    const next = typeof actionDockRightProgress === 'number' && Number.isFinite(actionDockRightProgress) ? actionDockRightProgress : 0;
    // Only emit completion celebration/toast while this screen is actually visible.
    // When we `push` into another ActivityDetail (e.g. after converting a linked step),
    // the parent ActivityDetail remains mounted underneath; without this guard it can
    // schedule a duplicate toast.
    if (!isFocused) {
      prevProgressRef.current = next;
      return;
    }
    if (!hasInitializedProgressRef.current) {
      // Establish baseline for this activity's current completion state.
      // This prevents a fully-complete activity from triggering celebration just by opening it.
      hasInitializedProgressRef.current = true;
      prevProgressRef.current = next;
      return;
    }
    const prev = prevProgressRef.current;
    // Trigger only on the edge: < 1 -> 1
    if (prev < 1 && next >= 1) {
      setRightItemCelebrateKey((k) => k + 1);
    }
    prevProgressRef.current = next;
  }, [actionDockRightProgress, activityTypeLabel, isFocused, showToast]);

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

  useEffect(() => {
    // Keep linked-step completion mirrored with the target activity so both UI and
    // parent-activity status derivation stay consistent across screens.
    const currentSteps = activity.steps ?? [];
    if (currentSteps.length === 0) return;
    const hasLinked = currentSteps.some((s) => !!s.linkedActivityId);
    if (!hasLinked) return;

    let didChange = false;
    const timestamp = new Date().toISOString();
    const nextSteps = currentSteps.map((s) => {
      const linkedId = s.linkedActivityId ?? null;
      if (!linkedId) return s;
      const linked = activitiesById[linkedId] ?? null;
      const isLinkedDone = Boolean(linked && (linked.status === 'done' || linked.completedAt));
      const nextCompletedAt = isLinkedDone ? s.completedAt ?? linked?.completedAt ?? timestamp : null;
      if ((s.completedAt ?? null) === (nextCompletedAt ?? null)) return s;
      didChange = true;
      return { ...s, completedAt: nextCompletedAt };
    });

    if (!didChange) return;

    // Defer this writeback so it can't block the user's tap/scroll interactions.
    InteractionManager.runAfterInteractions(() => {
      updateActivity(activity.id, (prev) => {
        const { nextStatus, nextCompletedAt } = deriveStatusFromSteps(
          prev.status,
          prev.steps ?? [],
          nextSteps,
          timestamp,
          prev.completedAt
        );
        return {
          ...prev,
          steps: nextSteps,
          status: nextStatus,
          // Important: allow linked-step sync to clear completedAt when the child is un-completed.
          completedAt: nextCompletedAt,
          updatedAt: timestamp,
        };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, activity.steps, activitiesById, updateActivity]);

  const togglePlanExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    togglePlanExpandedInStore();
  }, [togglePlanExpandedInStore]);

  const toggleDetailsExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleDetailsExpandedInStore();
  }, [toggleDetailsExpandedInStore]);

  return (
    <AppShell fullBleedCanvas>
      <View style={styles.screen}>
        {/* Credits warning toasts are rendered globally via AppShell. */}
        <VStack space="lg" style={styles.pageContent}>
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
              onPressEditHeaderImage={() => setThumbnailSheetVisible(true)}
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
              setActiveSheet={setActiveSheet}
              openAttachmentDetails={openAttachmentDetails}
              scrollRef={scrollRef}
              KEYBOARD_CLEARANCE={KEYBOARD_CLEARANCE}
              detailGuideHost={detailGuideHost}
              styles={styles}
              planExpanded={planExpanded}
              onTogglePlanExpanded={togglePlanExpanded}
              detailsExpanded={detailsExpanded}
              onToggleDetailsExpanded={toggleDetailsExpanded}
              updateActivity={updateActivity}
              titleRef={titleInputRef}
              isTitleEditing={isEditingTitle}
              setIsTitleEditing={setIsEditingTitle}
              titleStepsBundleRef={titleStepsBundleRef}
              setIsTitleStepsBundleReady={setIsTitleStepsBundleReady}
              setTitleStepsBundleOffset={setTitleStepsBundleOffset}
              stepsDraft={stepsDraft}
              activitiesById={activitiesById}
              openActivityDetail={openActivityDetail}
              handleToggleStepComplete={handleToggleStepComplete}
              handleRemoveStep={handleRemoveStep}
              handleChangeStepTitle={handleChangeStepTitle}
              handleConvertStepToActivity={handleConvertStepToActivity}
              handleUnlinkStepActivity={handleUnlinkStepActivity}
              beginAddStepInline={beginAddStepInline}
              isAddingStepInline={isAddingStepInline}
              newStepInputRef={newStepInputRef}
              newStepTitle={newStepTitle}
              setNewStepTitle={setNewStepTitle}
              commitInlineStep={commitInlineStep}
              handleAnyInputFocus={handleAnyInputFocus}
              handleAnyInputBlur={handleAnyInputBlur}
              isAnyInputFocused={isAnyInputFocused}
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
                    if (!isActionDockReady) setIsActionDockReady(true);
                  }}
                  leftDockTargetRef={actionDockLeftRef}
                  rightDockTargetRef={actionDockRightRef}
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
                    // Reflect explicit Activity completion (users may keep all steps checked but un-mark the Activity).
                    color: isCompleted ? colors.parchment : colors.sumi,
                  }}
                  rightItemProgress={actionDockRightProgress}
                  rightItemRingColor={dockCompleteColor}
                  rightItemBackgroundColor={isCompleted ? dockCompleteColor : undefined}
                  rightItemCelebrateKey={rightItemCelebrateKey}
                  onRightItemCelebrateComplete={() => {
                    if (!isFocusedRef.current) return;
                    showToast({
                      message: `${activityTypeLabel} complete`,
                      variant: 'light',
                      durationMs: 2200,
                    });
                  }}
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

        </VStack>
      </View>

      <Coachmark
        visible={detailGuideHost.coachmarkVisible}
        targetRef={detailGuideTargetRef}
        remeasureKey={detailGuideHost.remeasureKey}
        scrimToken="pineSubtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={detailGuideStep >= 2 ? 'auto' : 18}
        offset={spacing.xs}
        highlightColor={colors.turmeric}
        actionColor={colors.turmeric}
        attentionPulse
        attentionPulseDelayMs={2500}
        attentionPulseDurationMs={15000}
        title={<Text style={styles.detailGuideTitle}>{detailGuideTitle}</Text>}
        body={<Text style={styles.detailGuideBody}>{detailGuideBody}</Text>}
        progressLabel={`${detailGuideStep + 1} of ${detailGuideStepCount}`}
        actions={[
          { id: 'skip', label: 'Skip', variant: 'outline' },
          {
            id: detailGuideIsFinalStep ? 'done' : 'next',
            label: detailGuideIsFinalStep ? 'Got it' : 'Next',
            variant: 'accent',
          },
        ]}
        onAction={(actionId) => {
          if (actionId === 'skip') {
            dismissDetailGuide();
            return;
          }
          if (actionId === 'next') {
            setDetailGuideStep((s) => Math.min(detailGuideStepCount - 1, s + 1));
            return;
          }
          dismissDetailGuide();
        }}
        onDismiss={dismissDetailGuide}
        placement={detailGuidePlacement}
      />

      <BottomDrawer
        visible={reminderSheetVisible}
        onClose={() => {
          setActiveSheet(null);
          setIsReminderDateTimePickerVisible(false);
        }}
        // iOS inline date picker is tall; use a two-stage sheet and auto-expand when picker opens.
        snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
        snapIndex={Platform.OS === 'ios' ? (isReminderDateTimePickerVisible ? 1 : 0) : 0}
        scrimToken="pineSubtle"
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
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
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={dueDateSheetVisible}
        onClose={() => {
          setActiveSheet(null);
          setIsDueDatePickerVisible(false);
        }}
        // iOS inline date picker needs more vertical space; otherwise "Pick a date…"
        // appears to do nothing because the picker renders below the fold.
        // Use a two-stage sheet and auto-expand when picker opens.
        snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
        snapIndex={Platform.OS === 'ios' ? (isDueDatePickerVisible ? 1 : 0) : 0}
        scrimToken="pineSubtle"
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
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
        </BottomDrawerScrollView>
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
        visible={locationSheetVisible}
        onClose={() => {
          setActiveSheet(null);
          setLocationQuery('');
          setLocationResults([]);
          setIsSearchingLocation(false);
          setPreviewLocation(null);
          setMapCenterOverride(null);
          mapCenterOverrideRef.current = null;
          setLocationSelectedValue('');
          locationSearchAbortRef.current?.abort();
          if (mapCommitTimeoutRef.current) {
            clearTimeout(mapCommitTimeoutRef.current);
            mapCommitTimeoutRef.current = null;
          }
        }}
        snapPoints={Platform.OS === 'ios' ? ['92%'] : ['82%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          {/* Ensure dropdown menus can render above the BottomDrawer modal layer. */}
          {Platform.OS === 'ios' ? (
            <FullWindowOverlay>
              <PortalHost name={LOCATION_SHEET_PORTAL_HOST} />
            </FullWindowOverlay>
          ) : (
            <PortalHost name={LOCATION_SHEET_PORTAL_HOST} />
          )}
          <Text style={styles.sheetTitle}>Location</Text>

          {locationStatusHint ? (
            <Text style={[styles.sheetRowSubtext, { marginTop: spacing.xs }]}>{locationStatusHint}</Text>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            {(() => {
              const radiusM = locationRadiusMetersDraft || DEFAULT_RADIUS_FT * 0.3048;
              const center = resolvedLocationMapCenter;
              const showNativeMap = Platform.OS === 'ios';

              return (
                <View
                  style={{ position: 'relative' }}
                  {...(!showNativeMap ? locationMapPanResponder.panHandlers : undefined)}
                >
                  {center ? (
                    showNativeMap ? (
                      <BottomDrawerNativeGestureView
                        style={{
                          width: '100%',
                          height: locationMapHeightPx,
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                      >
                        <MapView
                          ref={(r) => {
                            mapRef.current = r;
                          }}
                          style={{ width: '100%', height: '100%' }}
                          mapType="standard"
                          scrollEnabled
                          zoomEnabled
                          rotateEnabled={false}
                          pitchEnabled={false}
                          showsUserLocation={false}
                          showsMyLocationButton={false}
                          initialRegion={computeRegionForRadius(center, radiusM)}
                          onRegionChangeComplete={(region) => {
                            const nextCenter = { latitude: region.latitude, longitude: region.longitude };
                            setMapCenterOverride(nextCenter);
                            mapCenterOverrideRef.current = nextCenter;
                            const label =
                              previewLocation?.label ??
                              ((activity as any)?.location?.label as string | undefined) ??
                              'Dropped pin';
                            scheduleCommitLocation({ label, latitude: nextCenter.latitude, longitude: nextCenter.longitude });
                          }}
                        >
                          <Circle
                            center={{ latitude: center.latitude, longitude: center.longitude }}
                            radius={radiusM}
                            strokeWidth={2}
                            strokeColor={colors.accent}
                            fillColor="rgba(49,85,69,0.12)"
                          />
                        </MapView>
                      </BottomDrawerNativeGestureView>
                    ) : (
                      <StaticMapImage
                        latitude={center.latitude}
                        longitude={center.longitude}
                        heightPx={locationMapHeightPx}
                        zoom={LOCATION_MAP_ZOOM}
                        radiusM={radiusM}
                      />
                    )
                  ) : (
                    <View
                      style={{
                        height: locationMapHeightPx,
                        borderRadius: 12,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        backgroundColor: colors.shellAlt,
                      }}
                    />
                  )}

                  {center ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="pin" size={22} color={colors.accent} />
                    </View>
                  ) : null}

                  <IconButton
                    variant="secondary"
                    accessibilityRole="button"
                    accessibilityLabel="Center map on current location"
                    onPress={() => {
                      void (async () => {
                        // Best-effort: ensure we can request if needed, then read the current position.
                        await LocationPermissionService.ensurePermissionWithRationale('attach_place');
                        const coords = await getCurrentLocationBestEffort();
                        if (coords) {
                          setCurrentCoords(coords);
                          setMapCenterOverride(coords);
                          mapCenterOverrideRef.current = coords;
                          setPreviewLocation({
                            label: 'Dropped pin',
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                          });
                          animateMapToCenter(coords, radiusM);
                        } else {
                          setLocationStatusHint((prev) => prev ?? 'Couldn’t read current location on this device.');
                        }
                      })();
                    }}
                    style={{
                      position: 'absolute',
                      right: spacing.sm,
                      top: spacing.sm,
                    }}
                  >
                    <Icon name="locate" size={18} color={colors.sumi} />
                  </IconButton>
                </View>
              );
            })()}
          </View>

          <View style={{ marginTop: spacing.md }}>
            {/* Rule builder */}
            <VStack space="sm">
              <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
                <Text style={styles.sheetRowLabel}>Send a notification</Text>
                <DropdownMenu>
                  <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select location trigger">
                    <Pressable
                      style={({ pressed }) => [styles.locationFormulaTrigger, pressed ? { opacity: 0.85 } : null]}
                    >
                      <HStack space="xs" alignItems="center">
                        <Text style={styles.locationFormulaTriggerText}>
                          {locationTriggerDraft === 'leave' ? 'When I leave' : 'When I enter'}
                        </Text>
                        <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                      </HStack>
                    </Pressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    portalHost={LOCATION_SHEET_PORTAL_HOST}
                    side="bottom"
                    sideOffset={6}
                    align="start"
                  >
                    <DropdownMenuItem onPress={() => setLocationTriggerDraft('leave')}>
                      <Text style={styles.menuRowText}>When I leave</Text>
                    </DropdownMenuItem>
                    <DropdownMenuItem onPress={() => setLocationTriggerDraft('arrive')}>
                      <Text style={styles.menuRowText}>When I enter</Text>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </HStack>

              <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
                <Text style={styles.sheetRowLabel}>Boundary radius</Text>
                <DropdownMenu>
                  <DropdownMenuTrigger {...({ asChild: true } as any)} accessibilityLabel="Select boundary radius">
                    <Pressable
                      style={({ pressed }) => [styles.locationFormulaTrigger, pressed ? { opacity: 0.85 } : null]}
                    >
                      <HStack space="xs" alignItems="center">
                        <Text style={styles.locationFormulaTriggerText}>
                          {formatRadiusLabel(locationRadiusMetersDraft)}
                        </Text>
                        <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                      </HStack>
                    </Pressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    portalHost={LOCATION_SHEET_PORTAL_HOST}
                    side="bottom"
                    sideOffset={6}
                    align="start"
                  >
                    {LOCATION_RADIUS_FT_OPTIONS.map((ft) => (
                      <DropdownMenuItem
                        key={ft}
                        onPress={() => {
                          setLocationRadiusMetersDraft(ft * 0.3048);
                        }}
                      >
                        <Text style={styles.menuRowText}>{ft} feet</Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </HStack>

              <HStack space="sm" alignItems="center" style={{ flexWrap: 'wrap' }}>
                <Text style={styles.sheetRowLabel}>from</Text>
                <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 220 }}>
                  <Combobox
                    open={isLocationSearchOpen}
                    onOpenChange={setIsLocationSearchOpen}
                    value={locationSelectedValue}
                    onValueChange={(next) => {
                      setLocationSelectedValue(next);
                      if (!next) return;
                      if (next === '__current_location__') {
                        const coords = currentCoords;
                        if (!coords) return;
                        const loc = { label: 'Current location', latitude: coords.latitude, longitude: coords.longitude };
                        setPreviewLocation(loc);
                        setMapCenterOverride(coords);
                        mapCenterOverrideRef.current = coords;
                        commitLocation(loc);
                        animateMapToCenter(coords, getSafeLocationRadiusM());
                        return;
                      }
                      const found = locationResults.find((r) => r.id === next);
                      if (!found) return;
                      const loc = { label: found.label, latitude: found.latitude, longitude: found.longitude };
                      setPreviewLocation(loc);
                      const coords = { latitude: found.latitude, longitude: found.longitude };
                      setMapCenterOverride(coords);
                      mapCenterOverrideRef.current = coords;
                      commitLocation(loc);
                      animateMapToCenter(coords, getSafeLocationRadiusM());
                    }}
                    options={[
                      ...(isSearchingLocation
                        ? ([
                            {
                              value: '__location_searching__',
                              label: 'Searching…',
                              disabled: true,
                              leftElement: <ActivityIndicator size="small" color={colors.textSecondary} />,
                            },
                          ] as const)
                        : []),
                      ...(currentCoords
                        ? ([
                            {
                              value: '__current_location__',
                              label: 'Use current location',
                              leftElement: <Icon name="locate" size={16} color={colors.textSecondary} />,
                            },
                          ] as const)
                        : []),
                      ...locationResults.map((r) => ({
                        value: r.id,
                        label: r.label,
                        leftElement: <Icon name="pin" size={16} color={colors.textSecondary} />,
                      })),
                    ]}
                    query={locationQuery}
                    onQueryChange={setLocationQuery}
                    autoFilter={false}
                    searchPlaceholder="Enter a place or address"
                    emptyText={
                      isSearchingLocation
                        ? 'Searching…'
                        : locationSearchError
                          ? locationSearchError
                        : locationQuery.trim().length >= 2
                          ? 'No results found.'
                          : 'Type to search.'
                    }
                    // iOS: popover + keyboard inside a BottomDrawer can land the search input/menu
                    // under the keyboard (and trigger "Error measuring text field" warnings).
                    // Use the keyboard-safe drawer presentation instead.
                    presentation={Platform.OS === 'ios' ? 'drawer' : 'popover'}
                    portalHost={LOCATION_SHEET_PORTAL_HOST}
                    allowDeselect={false}
                    trigger={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Enter a place or address"
                        onPress={() => setIsLocationSearchOpen(true)}
                        style={({ pressed }) => [
                          {
                            backgroundColor: colors.fieldFill,
                            borderRadius: 12,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.sm,
                            minHeight: 44,
                          },
                          pressed ? { opacity: 0.92 } : null,
                        ]}
                      >
                        <Icon name="pin" size={16} color={colors.textSecondary} />
                        <Text
                          numberOfLines={1}
                          style={[
                            typography.bodySm,
                            {
                              color: previewLocation || activity?.location ? colors.textPrimary : colors.muted,
                              flex: 1,
                            },
                          ]}
                        >
                          {previewLocation?.label ??
                            ((activity as any)?.location?.label as string | undefined) ??
                            'Enter a place or address'}
                        </Text>
                        {previewLocation || activity?.location ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Clear location"
                            hitSlop={10}
                            onPress={clearLocationSelection}
                          >
                            <Icon name="close" size={16} color={colors.textSecondary} />
                          </Pressable>
                        ) : (
                          <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                        )}
                      </Pressable>
                    }
                  />
                </View>
              </HStack>
            </VStack>
          </View>

          {/* Results now render in the dropdown menu anchored to the "from" field. */}
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
              iosUseEdgeFades={false}
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
        <View style={{ flex: 1 }}>
          {/* Ensure dropdown menus can render above the BottomDrawer modal layer. */}
          {Platform.OS === 'ios' ? (
            <FullWindowOverlay>
              <PortalHost name={FOCUS_SHEET_PORTAL_HOST} />
            </FullWindowOverlay>
          ) : (
            <PortalHost name={FOCUS_SHEET_PORTAL_HOST} />
          )}

          <BottomDrawerScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            <VStack space="md">
              <View>
                <Text style={styles.sheetTitle}>Focus mode</Text>
                <Text style={styles.sheetDescription}>
                  Start a distraction-free timer for this activity. Pick a duration, then tap Start.
                </Text>
              </View>

              <View>
                <Text style={styles.estimateFieldLabel}>Minutes</Text>
                <HStack space="sm" alignItems="center" style={styles.focusPresetRow}>
                  {focusPresetValues.map((m) => {
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
                        (focusCustomExpanded || focusIsCustomValue) &&
                          styles.focusPresetChipTextSelected,
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
                      onChangeMinutes={handleChangeFocusMinutes}
                      optionsMinutes={focusCustomOptionsMinutes}
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
                  <DropdownMenuTrigger
                    {...({ asChild: true } as any)}
                    accessibilityLabel="Select soundscape"
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.focusSoundscapeTrigger,
                        pressed && styles.focusPresetChipPressed,
                      ]}
                    >
                      <HStack space="xs" alignItems="center">
                        <Text style={styles.focusSoundscapeTriggerText}>
                          {SOUND_SCAPES.find((s) => s.id === soundscapeTrackId)?.title ??
                            'Soundscape'}
                        </Text>
                        <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                      </HStack>
                    </Pressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    portalHost={FOCUS_SHEET_PORTAL_HOST}
                    side="bottom"
                    sideOffset={6}
                    align="start"
                  >
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
            </VStack>
          </BottomDrawerScrollView>

          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
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
          </View>
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

      <ArcBannerSheet
        visible={thumbnailSheetVisible}
        onClose={() => setThumbnailSheetVisible(false)}
        objectLabel="Activity"
        arcName={activity?.title ?? 'Activity'}
        arcNarrative={activity?.notes}
        canUseUnsplash={isPro}
        onRequestUpgrade={() => {
          setThumbnailSheetVisible(false);
          setTimeout(
            () => openPaywallInterstitial({ reason: 'pro_only_unsplash_banners', source: 'activity_banner_sheet' }),
            360
          );
        }}
        heroSeed={heroSeed}
        hasHero={Boolean(activity?.thumbnailUrl)}
        loading={heroImageLoading}
        error={heroImageError}
        thumbnailUrl={displayThumbnailUrlForSheet}
        heroGradientColors={heroGradientColors}
        heroGradientDirection={heroGradientDirection}
        heroTopoSizes={heroTopoSizes}
        showTopography={false}
        showGeoMosaic={false}
        onGenerate={() => undefined}
        onUpload={() => {
          void handleUploadActivityThumbnail();
        }}
        onRemove={handleClearActivityHeroImage}
        onSelectCurated={handleSelectCuratedActivityHero}
        onSelectUnsplash={handleSelectUnsplashActivityHero}
      />

      {AgentWorkspaceSheet}

      <BottomDrawer
        visible={attachmentDetailsSheetVisible}
        onClose={() => {
          setActiveSheet(null);
          setSelectedAttachment(null);
          setAttachmentDownloadUrl(null);
          setIsLoadingAttachmentDownloadUrl(false);
          setAttachmentPhotoAspectRatio(4 / 3);
        }}
        // Allow the sheet to grow near full-height when the preview is tall,
        // while still supporting a more compact resting state.
        snapPoints={Platform.OS === 'ios' ? (['70%', '96%'] as const) : (['66%', '94%'] as const)}
        scrimToken="pineSubtle"
        enableContentPanningGesture
        // Let the sheet surface extend all the way to the bottom of the screen.
        // We'll handle safe-area padding inside the scroll content so buttons never clip.
        sheetStyle={{ paddingBottom: 0, paddingTop: 0, paddingHorizontal: 0 }}
      >
        <BottomDrawerScrollView
          // Important: keep the scroll view itself flexed to fill the sheet height.
          style={{ flex: 1 }}
          // Avoid `flex: 1` on the content container; it can prevent scroll when content is taller.
          contentContainerStyle={{
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing['2xl'] + insets.bottom,
          }}
        >
          {(() => {
            const att = selectedAttachment;
            if (!att) {
              return (
                <>
                  <Text style={styles.sheetTitle}>Attachment</Text>
                  <Text style={styles.sheetBody}>No attachment selected.</Text>
                </>
              );
            }

            const kind = (att?.kind ?? '').toString();
            const kindLabel =
              kind === 'photo'
                ? 'Photo'
                : kind === 'video'
                  ? 'Video'
                  : kind === 'audio'
                    ? 'Audio'
                    : kind === 'document'
                      ? 'Document'
                      : 'Attachment';
            const rawName = typeof att?.fileName === 'string' ? att.fileName : '';
            const name = rawName.trim() ? rawName.trim() : 'Attachment';
            const status = (att?.uploadStatus ?? 'uploaded').toString();
            const isOpenable = status === 'uploaded';
            const isFailed = status === 'failed';

            const formatBytes = (bytes: number) => {
              if (!Number.isFinite(bytes) || bytes <= 0) return '';
              const kb = bytes / 1024;
              if (kb < 1024) return `${Math.round(kb)} KB`;
              const mb = kb / 1024;
              if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
              const gb = mb / 1024;
              return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
            };

            const formatDuration = (secs: number) => {
              if (!Number.isFinite(secs) || secs <= 0) return '';
              const s = Math.round(secs);
              const m = Math.floor(s / 60);
              const r = s % 60;
              return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
            };

            const sizeBytes = typeof att?.sizeBytes === 'number' ? att.sizeBytes : null;
            const durationSeconds = typeof att?.durationSeconds === 'number' ? att.durationSeconds : null;
            const createdAt = typeof att?.createdAt === 'string' ? att.createdAt : null;
            const uploadError = typeof att?.uploadError === 'string' ? att.uploadError.trim() : '';

            return (
              <>
                <View
                  style={[
                    styles.attachmentPreviewFrame,
                    // Photos should render at natural aspect ratio (can push content and enable scroll).
                    kind === 'photo' ? { aspectRatio: attachmentPhotoAspectRatio } : { height: 164 },
                  ]}
                >
                  {isLoadingAttachmentDownloadUrl ? (
                    <View style={styles.attachmentPreviewPlaceholder}>
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                      <Text style={styles.attachmentPreviewPlaceholderText}>Loading…</Text>
                    </View>
                  ) : kind === 'photo' && attachmentDownloadUrl ? (
                    <Image source={{ uri: attachmentDownloadUrl }} style={styles.attachmentPreviewImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.attachmentPreviewPlaceholder}>
                      <Icon
                        name={kind === 'video' ? 'image' : kind === 'audio' ? 'mic' : 'paperclip'}
                        size={22}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.attachmentPreviewPlaceholderText}>
                        {kind === 'photo' ? 'Preview unavailable' : 'Preview available for photos'}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sheetTitle}>{name}</Text>
                <Text style={[styles.sheetBody, { marginBottom: spacing.md }]}>
                  {kindLabel}
                  {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ''}
                  {durationSeconds ? ` · ${formatDuration(durationSeconds)}` : ''}
                </Text>

                <View style={styles.rowsCard}>
                  <View style={[styles.row, styles.rowContent]}>
                    <Text style={styles.rowLabel}>Status</Text>
                    <Text style={[styles.rowValue, isFailed ? { color: colors.destructive } : null]}>
                      {status === 'uploading' ? 'Uploading' : status === 'failed' ? 'Failed' : 'Uploaded'}
                    </Text>
                  </View>
                  {createdAt ? (
                    <>
                      <View style={styles.cardSectionDivider} />
                      <View style={[styles.row, styles.rowContent]}>
                        <Text style={styles.rowLabel}>Added</Text>
                        <Text style={styles.rowValue}>{new Date(createdAt).toLocaleString()}</Text>
                      </View>
                    </>
                  ) : null}
                  {uploadError ? (
                    <>
                      <View style={styles.cardSectionDivider} />
                      <View style={[styles.row, styles.rowContent]}>
                        <Text style={styles.rowLabel}>Error</Text>
                        <Text style={[styles.rowValue, { color: colors.destructive }]} numberOfLines={2}>
                          {uploadError}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>

                <View style={{ marginTop: spacing.md }}>
                  <VStack space="sm">
                    <Button
                      variant="primary"
                      fullWidth
                      disabled={!isOpenable || !attachmentDownloadUrl}
                      accessibilityLabel="Download attachment"
                      onPress={() => {
                        if (!isOpenable || !attachmentDownloadUrl) return;
                        // iOS: share sheet includes "Save Image" for photos.
                        Share.share({ url: attachmentDownloadUrl, message: attachmentDownloadUrl }).catch(() => {
                          Linking.openURL(attachmentDownloadUrl).catch(() => undefined);
                        });
                      }}
                    >
                      <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>Download</Text>
                    </Button>

                    <Button
                      variant="outline"
                      fullWidth
                      accessibilityLabel="Delete attachment"
                      onPress={() => {
                        Alert.alert('Delete attachment?', 'This will remove it from this activity.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              void deleteAttachment({
                                activityId: activity.id,
                                attachmentId: String(att.id),
                              }).catch(() => undefined);
                              setActiveSheet(null);
                              setSelectedAttachment(null);
                            },
                          },
                        ]);
                      }}
                    >
                      <Text style={[styles.sheetRowLabel, { color: colors.destructive }]}>Delete</Text>
                    </Button>
                  </VStack>
                </View>
              </>
            );
          })()}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={recordAudioSheetVisible}
        onClose={() => {
          setActiveSheet(null);
          if (isRecordingAudio) {
            setIsRecordingAudio(false);
            cancelAudioRecording().catch(() => undefined);
          }
        }}
        snapPoints={Platform.OS === 'ios' ? ['52%'] : ['48%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Record audio</Text>
          <Text style={[styles.sheetBody, { marginBottom: spacing.md }]}>
            Record a quick voice note and attach it to this activity.
          </Text>

          <VStack space="sm">
            <Button
              variant={isRecordingAudio ? 'outline' : 'primary'}
              fullWidth
              accessibilityLabel={isRecordingAudio ? 'Recording in progress' : 'Start recording'}
              testID="e2e.activityDetail.attachments.record.start"
              onPress={() => {
                if (isRecordingAudio) return;
                startAudioRecording()
                  .then(() => setIsRecordingAudio(true))
                  .catch(() => undefined);
              }}
            >
              <Text style={[styles.sheetRowLabel, !isRecordingAudio ? { color: colors.primaryForeground } : null]}>
                {isRecordingAudio ? 'Recording…' : 'Start recording'}
              </Text>
            </Button>

            <Button
              variant={isRecordingAudio ? 'primary' : 'outline'}
              fullWidth
              accessibilityLabel="Stop recording and attach"
              testID="e2e.activityDetail.attachments.record.stopAttach"
              onPress={() => {
                if (!isRecordingAudio) return;
                setIsRecordingAudio(false);
                stopAudioRecordingAndAttachToActivity(activity)
                  .catch(() => undefined)
                  .finally(() => {
                    setActiveSheet(null);
                  });
              }}
            >
              <Text
                style={[
                  styles.sheetRowLabel,
                  isRecordingAudio ? { color: colors.primaryForeground } : null,
                ]}
              >
                Stop & save
              </Text>
            </Button>

            <Button
              variant="outline"
              fullWidth
              accessibilityLabel="Cancel recording"
              testID="e2e.activityDetail.attachments.record.cancel"
              onPress={() => {
                setIsRecordingAudio(false);
                cancelAudioRecording().catch(() => undefined);
                setActiveSheet(null);
              }}
            >
              <Text style={styles.sheetRowLabel}>Cancel</Text>
            </Button>
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={sendToSheetVisible}
        onClose={() => setActiveSheet(null)}
        snapPoints={['45%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Send to…</Text>
          {(() => {
            const type = (activity?.type ?? 'task') as any;
            const supported = installedDestinations
              .filter((t) => Boolean(t.is_enabled))
              .filter((t) => getDestinationSupportedActivityTypes(t.kind as any).includes(type));
            if (supported.length === 0) return null;
            return (
              <>
                {supported.map((t) => (
                  <SheetOption
                    key={t.id}
                    testID={`e2e.activityDetail.sendTo.destination.${t.id}`}
                    label={t.display_name || t.kind}
                    subtext="Destination"
                    onPress={() => {
                      capture(AnalyticsEvent.ActivityActionInvoked, {
                        activityId: activity.id,
                        action: 'sendToDestination',
                        destinationKind: t.kind,
                      } as any);
                      setActiveSheet(null);
                      handoffActivityToExecutionTarget({ activityId: activity.id, executionTargetId: t.id })
                        .then((res) => {
                          if (res.ok) {
                            showToast({ message: `Sent to ${t.display_name || 'destination'}.` });
                          } else {
                            Alert.alert('Unable to send', res.message);
                          }
                        })
                        .catch(() => {
                          Alert.alert('Unable to send', 'Something went wrong. Please try again.');
                        });
                    }}
                  />
                ))}
                <View style={styles.cardSectionDivider} />
              </>
            );
          })()}
          {activity.type === 'shopping_list' && (enabledSendToDestinations?.amazon ?? false) ? (
            <SheetOption
            testID="e2e.activityDetail.sendTo.amazon"
            label="Amazon"
            disabled={!sendToSearchQuery}
            subtext={!sendToSearchQuery ? 'Add a title or items to search.' : undefined}
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToAmazon' });
              setActiveSheet(null);
              handleSendToAmazon().catch(() => undefined);
            }}
          />
          ) : null}
          {activity.type === 'shopping_list' && (enabledSendToDestinations?.home_depot ?? false) ? (
            <SheetOption
            testID="e2e.activityDetail.sendTo.homeDepot"
            label="Home Depot"
            disabled={!sendToSearchQuery}
            subtext={!sendToSearchQuery ? 'Add a title or items to search.' : undefined}
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToHomeDepot' });
              setActiveSheet(null);
              handleSendToHomeDepot().catch(() => undefined);
            }}
          />
          ) : null}
          {activity.type === 'shopping_list' && (enabledSendToDestinations?.instacart ?? false) ? (
            <SheetOption
            testID="e2e.activityDetail.sendTo.instacart"
            label="Instacart"
            disabled={!sendToSearchQuery}
            subtext={!sendToSearchQuery ? 'Add a title or items to search.' : undefined}
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToInstacart' });
              setActiveSheet(null);
              handleSendToInstacart().catch(() => undefined);
            }}
          />
          ) : null}
          {activity.type === 'shopping_list' && (enabledSendToDestinations?.doordash ?? false) ? (
            <SheetOption
            testID="e2e.activityDetail.sendTo.doorDash"
            label="DoorDash"
            disabled={!sendToSearchQuery}
            subtext={!sendToSearchQuery ? 'Add a title or items to search.' : undefined}
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToDoorDash' });
              setActiveSheet(null);
              handleSendToDoorDash().catch(() => undefined);
            }}
          />
          ) : null}
          <View style={styles.cardSectionDivider} />
          <SheetOption
            testID="e2e.activityDetail.sendTo.copy"
            label="Copy details"
            disabled={!activityExportText}
            subtext={!activityExportText ? 'Add some details to copy.' : undefined}
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToCopy' });
              setActiveSheet(null);
              handleSendToCopy().catch(() => undefined);
            }}
          />
          <SheetOption
            testID="e2e.activityDetail.sendTo.share"
            label="Share…"
            disabled={!activityExportText}
            subtext={!activityExportText ? 'Add some details to share.' : undefined}
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
  disabled?: boolean;
  subtext?: string;
};

function SheetOption({ label, onPress, testID, disabled, subtext }: SheetOptionProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityState={disabled ? { disabled: true } : undefined}
      style={[styles.sheetRow, disabled ? { opacity: 0.45 } : null]}
      onPress={() => {
        if (disabled) return;
        void HapticsService.trigger('canvas.selection');
        onPress();
      }}
    >
      <Text style={[styles.sheetRowLabel, disabled ? { color: colors.textSecondary } : null]}>
        {label}
      </Text>
      {subtext ? <Text style={styles.sheetRowSubtext}>{subtext}</Text> : null}
    </Pressable>
  );
}

import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  InteractionManager,
  LayoutAnimation,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  TextInput,
  Platform,
  Keyboard,
  Modal,
  Share,
  Linking,
  useWindowDimensions,
  Animated,
  Easing,
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
import { useActivityEnrichmentStore } from '../../store/useActivityEnrichmentStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useCanUseProTools } from '../../store/proToolsAccess';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { initHeroImageUpload, uploadHeroImageToSignedUrl } from '../../services/heroImages';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import { useToastStore } from '../../store/useToastStore';
import type {
  ActivityDifficulty,
  ActivityPriorityState,
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
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { SOUND_SCAPES, preloadSoundscape } from '../../services/soundscape';
import { VStack, HStack, Input, ThreeColumnRow, Combobox, KeyboardAwareScrollView } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { Icon, type IconName } from '../../ui/Icon';
import { ObjectTypeIconBadge } from '../../ui/ObjectTypeIconBadge';
import { BrandLockup } from '../../ui/BrandLockup';
import { HeaderActionPill } from '../../ui/layout/ObjectPageHeader';
import { Coachmark } from '../../ui/Coachmark';
import { BreadcrumbBar } from '../../ui/BreadcrumbBar';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import { LongTextField } from '../../ui/LongTextField';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { BottomDrawerFooter } from '../../ui/layout/BottomDrawerFooter';
import { NarrativeEditableTitle } from '../../ui/NarrativeEditableTitle';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { richTextToPlainText } from '../../ui/richText';
import { DurationPicker, formatDurationMinutes } from './DurationPicker';
import type { ActiveFocusSession } from './focusSessionLifecycle';
import { useFocusSessionStore } from './focusSessionStore';
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
import { normalizeActivitySteps } from '../../domain/normalizeActivity';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { parseTags, suggestTagsFromText } from '../../utils/tags';
import { suggestActivityTagsWithAi } from '../../services/ai';
import * as ImagePicker from 'expo-image-picker';
import { getImagePickerMediaTypesImages } from '../../utils/imagePickerMediaTypes';
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { toLocalDateKey } from '../../services/plan/planDates';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import {
  applyDueDateReminderPolicy,
  REMINDER_SOURCE_MANUAL,
} from './dueDateReminderPolicy';
import { openPaywallInterstitial } from '../../services/paywall';
import {
  recordShowUpWithCelebration,
} from '../../store/useCelebrationStore';
import { queueCheckinDraftFromProgress } from '../../services/checkinNudgeDrafts';
import { trackUnsplashDownload, type UnsplashPhoto, withUnsplashReferral } from '../../services/unsplash';
import { deriveStatusFromSteps } from './activityStepStatus';
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
import { ActivityRepeatSheets } from './ActivityRepeatSheets';
import { useActivityRepeatEditor } from './useActivityRepeatEditor';
import { ActivityAttachmentSheets } from './ActivityAttachmentSheets';
import { useActivityAttachmentsController } from './useActivityAttachmentsController';
import { ActivityLocationSheet } from './ActivityLocationSheet';
import { useActivityLocationEditor } from './useActivityLocationEditor';
import type { NarrativeEditableTitleRef } from '../../ui/NarrativeEditableTitle';
import { ArcBannerSheet } from '../arcs/ArcBannerSheet';
import type { ArcHeroImage } from '../arcs/arcHeroLibrary';
import { getArcGradient, getArcTopoSizes } from '../arcs/thumbnailVisuals';
import { findActivityCoverImageWithAI } from './activityCoverImage';
import { buildLinkedGoalOptions, isSelectableLinkedGoal } from './activityGoalOptions';
import { ActivityScheduleSheet } from './ActivityScheduleSheet';
import { useActivityScheduleSheetController } from './useActivityScheduleSheetController';
import { useHeroImageUrl } from '../../ui/hooks/useHeroImageUrl';
import { ActionDock } from '../../ui/ActionDock';
import { OpportunityCard } from '../../ui/OpportunityCard';
import { ActivityNextActionInlineContent } from './ActivityNextActionDock';
import {
  ACTIVITY_NEXT_BEST_ACTION_MENU_ORDER,
  ACTIVITY_NEXT_BEST_ACTIONS,
  getNextBestActivityAction,
  type ActivityNextBestActionId,
} from './nextBestAction';
import { reconcileScreenTimeRestrictions } from '../../services/screenTimeProtectionRuntime';
import {
  normalizeScreenTimeProtectionSettings,
  shouldShowScreenTimeSetupOffer,
} from '../../services/screenTimeProtection';
import { nativeCrashErrorMessage, recordNativeCrashBreadcrumb } from '../../services/nativeCrashBreadcrumbs';

type FocusSessionState = ActiveFocusSession;

type ActivityDetailRouteProp = RouteProp<
  { ActivityDetail: ActivityDetailRouteParams; ActivityDetailFromGoal: ActivityDetailRouteParams },
  'ActivityDetail' | 'ActivityDetailFromGoal'
>;

type ActivityDetailNavigationProp = NativeStackNavigationProp<
  ActivitiesStackParamList,
  'ActivityDetail'
>;

async function runFocusNativeBoundary<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  await recordFocusNativeBreadcrumb(operation, 'before', context);
  try {
    const result = await fn();
    await recordFocusNativeBreadcrumb(operation, 'after', context);
    return result;
  } catch (error) {
    await recordFocusNativeBreadcrumb(operation, 'error', context, error);
    throw error;
  }
}

async function recordFocusNativeBreadcrumb(
  operation: string,
  phase: 'before' | 'after' | 'error',
  context?: Record<string, unknown>,
  error?: unknown,
): Promise<void> {
  await recordNativeCrashBreadcrumb({
    area: 'focus.session',
    operation,
    phase,
    context,
    errorMessage: error === undefined ? undefined : nativeCrashErrorMessage(error),
  });
}

export function ActivityDetailScreen() {
  // Focus duration limits:
  // MVP gating: free users are capped at 10 minutes. Pro removes the cap.
  const isPro = useEntitlementsStore((state) => state.isPro);
  const canUseFocus = useCanUseProTools('focus_mode');
  const canUseUnsplash = useCanUseProTools('unsplash_banners');
  const focusMaxMinutes = canUseFocus ? 180 : 10;
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const { capture } = useAnalytics();
  const showToast = useToastStore((s) => s.showToast);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const headerInk = colors.sumi;
  const route = useRoute<ActivityDetailRouteProp>();
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const { activityId, openFocus, openSchedule, autoStartFocus, minutes: autoStartMinutes, endFocus } =
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
  const userProfile = useAppStore((state) => state.userProfile);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const activityAreas = useAppStore((state) => state.activityAreas);
  const domainHydrated = useAppStore((state) => state.domainHydrated);
  const breadcrumbsEnabled = __DEV__ && useAppStore((state) => state.devBreadcrumbsEnabled);
  const devHeaderV2Enabled = __DEV__ && useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const abHeaderV2Enabled = useFeatureFlag('object_detail_header_v2', false);
  const headerV2Enabled = devHeaderV2Enabled || abHeaderV2Enabled;
  // Activity detail uses the refresh layout only (legacy implementation removed).
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const setActivityPriorityState = useAppStore((state) => state.setActivityPriorityState);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const screenTimeProtection = useAppStore((state) => state.screenTimeProtection);
  const completedFocusSessionCount = useAppStore((state) => state.completedFocusSessionCount);
  const markScreenTimeSetupOfferShown = useAppStore((state) => state.markScreenTimeSetupOfferShown);
  const markScreenTimeSetupOfferDismissed = useAppStore((state) => state.markScreenTimeSetupOfferDismissed);
  const markScreenTimeSetupOfferCtaTapped = useAppStore((state) => state.markScreenTimeSetupOfferCtaTapped);
  const lastFocusMinutes = useAppStore((state) => state.lastFocusMinutes);
  const setLastFocusMinutes = useAppStore((state) => state.setLastFocusMinutes);
  const focusOverlayColorIndex = useAppStore((state) => state.focusOverlayColorIndex);
  const setFocusOverlayColorIndex = useAppStore((state) => state.setFocusOverlayColorIndex);
  const soundscapeEnabled = useAppStore((state) => state.soundscapeEnabled);
  const setSoundscapeEnabled = useAppStore((state) => state.setSoundscapeEnabled);
  const soundscapeTrackId = useAppStore((state) => state.soundscapeTrackId);
  const setSoundscapeTrackId = useAppStore((state) => state.setSoundscapeTrackId);
  const hasShownFocusSoundscapeVolumeHint = useAppStore(
    (state) => state.hasShownFocusSoundscapeVolumeHint,
  );
  const setHasShownFocusSoundscapeVolumeHint = useAppStore(
    (state) => state.setHasShownFocusSoundscapeVolumeHint,
  );
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const agentHostActions = useAppStore((state) => state.agentHostActions);
  const consumeAgentHostActions = useAppStore((state) => state.consumeAgentHostActions);
  const hasDismissedActivityDetailGuide = useAppStore(
    (state) => state.hasDismissedActivityDetailGuide,
  );
  const setHasDismissedActivityDetailGuide = useAppStore(
    (state) => state.setHasDismissedActivityDetailGuide,
  );
  const hasSeenFocusModeCoachmark = useAppStore((state) => state.hasSeenFocusModeCoachmark);
  const setHasSeenFocusModeCoachmark = useAppStore(
    (state) => state.setHasSeenFocusModeCoachmark,
  );
  const hasCompletedFirstTimeOnboarding = useAppStore(
    (state) => state.hasCompletedFirstTimeOnboarding,
  );
  const isPlanKickoffVisible = useAppStore((state) => state.isPlanKickoffVisible);
  const tryConsumeGenerativeCredit = useAppStore((state) => state.tryConsumeGenerativeCredit);
  const enabledSendToDestinations = useAppStore((state) => state.enabledSendToDestinations);

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );
  const normalizedScreenTimeProtection = useMemo(
    () => normalizeScreenTimeProtectionSettings(screenTimeProtection),
    [screenTimeProtection],
  );
  const shouldShowFocusScreenTimeOffer = useMemo(
    () =>
      Boolean(activity) &&
      shouldShowScreenTimeSetupOffer({
        settings: normalizedScreenTimeProtection,
        setupIntent: 'focus_sessions',
        surface: 'focus_drawer',
        completedFocusSessions: completedFocusSessionCount,
        realMoveDayCount: 0,
        activeActivityCount: 1,
        now: new Date(),
      }),
    [activity, completedFocusSessionCount, normalizedScreenTimeProtection],
  );

  const heroSeed = useMemo(() => activity?.id ?? 'activity', [activity?.id]);
  const { colors: heroGradientColors, direction: heroGradientDirection } = useMemo(
    () => getArcGradient(heroSeed),
    [heroSeed]
  );
  const heroTopoSizes = useMemo(() => getArcTopoSizes(heroSeed), [heroSeed]);

  const resolvedHeroUrl = useHeroImageUrl(activity);
  const displayThumbnailUrlForSheet = resolvedHeroUrl ?? undefined;

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

      const { storagePath, uploadSignedUrl } = await initHeroImageUpload({
        entityType: 'activity',
        entityId: activity.id,
        mimeType: typeof (asset as any)?.mimeType === 'string' ? ((asset as any).mimeType as string) : null,
      });
      await uploadHeroImageToSignedUrl({
        signedUrl: uploadSignedUrl,
        fileUri: asset.uri,
        mimeType: typeof (asset as any)?.mimeType === 'string' ? ((asset as any).mimeType as string) : null,
      });
      const nowIso = new Date().toISOString();
      updateActivity(activity.id, (prev: any) => ({
        ...prev,
        thumbnailUrl: undefined,
        heroImageMeta: {
          source: 'upload',
          prompt: prev.heroImageMeta?.prompt,
          createdAt: nowIso,
          uploadStoragePath: storagePath,
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

  const handleFindActivityHeroImage = useCallback(async () => {
    if (!activity) return;
    try {
      setHeroImageLoading(true);
      setHeroImageError('');
      const selection = await findActivityCoverImageWithAI({
        title: activity.title ?? '',
        goalId: activity.goalId ?? null,
        activityType: activity.type,
        existingTags: activity.tags,
        goals,
        arcs,
        canUseUnsplash,
      });

      if (!selection?.thumbnailUrl && !selection?.heroImageMeta) {
        setHeroImageError('No image-library cover found for this to-do.');
        return;
      }

      const nowIso = new Date().toISOString();
      updateActivity(activity.id, (prev: any) => ({
        ...prev,
        thumbnailUrl: selection.thumbnailUrl,
        heroImageMeta: selection.heroImageMeta,
        updatedAt: nowIso,
      }));
    } catch {
      setHeroImageError('Unable to find a cover image right now.');
    } finally {
      setHeroImageLoading(false);
    }
  }, [activity, arcs, canUseUnsplash, goals, updateActivity]);

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

  const selectableLinkedGoals = useMemo(() => goals.filter(isSelectableLinkedGoal), [goals]);

  const goalOptions = useMemo(() => buildLinkedGoalOptions(goals), [goals]);

  const recommendedGoalOption = useMemo(() => {
    // Only recommend when the activity is currently unlinked.
    if (activity?.goalId) return null;
    if (selectableLinkedGoals.length === 0) return null;
    if (!activities || activities.length === 0) return null;

    const tagKeys = new Set((activity?.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean));
    const candidates = selectableLinkedGoals.map((g) => {
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
  }, [activity?.goalId, activity?.id, activity?.tags, activities, selectableLinkedGoals]);

  const difficultyOptions = useMemo(
    () => [
      { value: 'very_easy', label: '1 · Very easy' },
      { value: 'easy', label: '2 · Easy' },
      { value: 'medium', label: '3 · Medium' },
      { value: 'hard', label: '5 · Hard' },
      { value: 'very_hard', label: '8 · Very hard' },
    ],
    [],
  );

  const activityTypeOptions = useMemo(
    () => [
      {
        value: 'task',
        label: 'To-do',
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
        label: 'Instructions',
        keywords: ['recipe', 'instructions', 'how-to', 'steps'],
        leftElement: <Icon name="fileText" size={16} color={colors.textSecondary} />,
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
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = useState(false);
  const [isReminderDateTimePickerVisible, setIsReminderDateTimePickerVisible] = useState(false);
  const repeatController = useActivityRepeatEditor({
    activity,
    updateActivity,
    onClose: () => setActiveSheet(null),
    onOpenCustom: () => setActiveSheet('customRepeat'),
    onReturnToPresets: () => setActiveSheet('repeat'),
  });

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
  const [difficultyComboboxOpen, setDifficultyComboboxOpen] = useState(false);
  const estimateSheetVisible = activeSheet === 'estimate';
  const [estimateDraftMinutes, setEstimateDraftMinutes] = useState<number>(30);

  const focusSheetVisible = activeSheet === 'focus';
  useEffect(() => {
    if (!focusSheetVisible || !shouldShowFocusScreenTimeOffer) return;
    markScreenTimeSetupOfferShown('focus_drawer');
    capture(AnalyticsEvent.ScreenTimeSetupOfferShown, {
      setup_intent: 'focus_sessions',
      surface: 'focus_drawer',
      activity_id: activity?.id,
    });
  }, [
    activity?.id,
    capture,
    focusSheetVisible,
    markScreenTimeSetupOfferShown,
    shouldShowFocusScreenTimeOffer,
  ]);

  const [focusMinutesDraft, setFocusMinutesDraft] = useState('25');
  const [focusCustomExpanded, setFocusCustomExpanded] = useState(false);
  const activeFocusSession = useFocusSessionStore((state) => state.activeSession);
  const focusSession: FocusSessionState | null =
    activeFocusSession?.activityId === activityId ? activeFocusSession : null;
  const [focusTickMs, setFocusTickMs] = useState(() => Date.now());
  const [focusSoundscapeMenuOpen, setFocusSoundscapeMenuOpen] = useState(false);
  const [focusSoundscapeMenuVisible, setFocusSoundscapeMenuVisible] = useState(false);
  const suppressNextFocusAudioTapRef = useRef(false);
  const focusSoundscapeMenuAnim = useRef(new Animated.Value(0)).current;
  const focusOverlayColors = useMemo(
    () => [
      colors.pine700,        // Default: G
      colors.madder700,      // R
      colors.orange700,      // O
      colors.turmeric700,    // Y
      colors.quiltBlue600,   // B
      colors.indigo900,      // I (deepest premium indigo)
      colors.violet700,      // V
    ],
    [],
  );
  const normalizedFocusOverlayColorIndex = useMemo(() => {
    if (!Number.isFinite(focusOverlayColorIndex) || focusOverlayColorIndex < 0) return 0;
    if (focusOverlayColors.length <= 0) return 0;
    return Math.floor(focusOverlayColorIndex) % focusOverlayColors.length;
  }, [focusOverlayColorIndex, focusOverlayColors.length]);
  const focusOverlayColorStep = useRef(new Animated.Value(normalizedFocusOverlayColorIndex)).current;
  const focusOverlayColorStepRef = useRef(normalizedFocusOverlayColorIndex);
  const focusOverlayAnimatingRef = useRef(false);
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
  const focusOverlayBackgroundColor = focusOverlayColorStep.interpolate({
    inputRange: Array.from({ length: focusOverlayColors.length + 1 }, (_, idx) => idx),
    outputRange: [...focusOverlayColors, focusOverlayColors[0] ?? colors.pine700],
  });

  const handleFocusOverlayTap = useCallback(() => {
    if (focusSoundscapeMenuOpen) {
      setFocusSoundscapeMenuOpen(false);
      return;
    }
    if (focusOverlayAnimatingRef.current) return;
    const paletteSize = focusOverlayColors.length;
    let currentStep = focusOverlayColorStepRef.current;
    if (currentStep >= paletteSize) {
      currentStep = currentStep % paletteSize;
      focusOverlayColorStepRef.current = currentStep;
      focusOverlayColorStep.stopAnimation();
      focusOverlayColorStep.setValue(currentStep);
    }
    const toStep = currentStep + 1;
    focusOverlayAnimatingRef.current = true;
    Animated.timing(focusOverlayColorStep, {
      toValue: toStep,
      duration: 520,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      focusOverlayAnimatingRef.current = false;
      if (!finished) return;
      if (toStep >= paletteSize) {
        focusOverlayColorStepRef.current = 0;
        setFocusOverlayColorIndex(0);
        focusOverlayColorStep.setValue(0);
        return;
      }
      focusOverlayColorStepRef.current = toStep;
      setFocusOverlayColorIndex(toStep);
    });
  }, [focusOverlayColorStep, focusOverlayColors, setFocusOverlayColorIndex, focusSoundscapeMenuOpen]);

  const handlePressFocusAudio = useCallback(() => {
    if (suppressNextFocusAudioTapRef.current) {
      suppressNextFocusAudioTapRef.current = false;
      return;
    }
    setFocusSoundscapeMenuOpen(false);
    setSoundscapeEnabled(!soundscapeEnabled);
  }, [setSoundscapeEnabled, soundscapeEnabled]);

  const handleLongPressFocusAudio = useCallback(() => {
    suppressNextFocusAudioTapRef.current = true;
    setFocusSoundscapeMenuOpen(true);
  }, []);

  useEffect(() => {
    if (focusOverlayAnimatingRef.current) return;
    focusOverlayColorStepRef.current = normalizedFocusOverlayColorIndex;
    focusOverlayColorStep.stopAnimation();
    focusOverlayColorStep.setValue(normalizedFocusOverlayColorIndex);
  }, [normalizedFocusOverlayColorIndex, focusOverlayColorStep]);

  useEffect(() => {
    if (!focusSession) return;
    focusOverlayAnimatingRef.current = false;
    focusOverlayColorStepRef.current = normalizedFocusOverlayColorIndex;
    focusOverlayColorStep.stopAnimation();
    focusOverlayColorStep.setValue(normalizedFocusOverlayColorIndex);
  }, [focusSession?.startedAtMs, focusOverlayColorStep, normalizedFocusOverlayColorIndex]);

  useEffect(() => {
    if (focusSession) return;
    setFocusSoundscapeMenuOpen(false);
  }, [focusSession]);

  useEffect(() => {
    if (focusSoundscapeMenuOpen) {
      setFocusSoundscapeMenuVisible(true);
      Animated.timing(focusSoundscapeMenuAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(focusSoundscapeMenuAnim, {
      toValue: 0,
      duration: 130,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setFocusSoundscapeMenuVisible(false);
    });
  }, [focusSoundscapeMenuOpen, focusSoundscapeMenuAnim]);

  const focusSheetSnapPoints = useMemo(() => {
    // Ensure the sheet can show the full preset row + optional custom wheel + soundscape + CTA buttons
    // without requiring scroll on typical phone sizes.
    if (Platform.OS === 'ios') {
      if (focusCustomExpanded) return ['82%' as const];
      return ['72%' as const];
    }
    if (focusCustomExpanded) return ['74%' as const];
    return ['62%' as const];
  }, [focusCustomExpanded]);

  const focusScreenTimeOfferCard = shouldShowFocusScreenTimeOffer ? (
    <OpportunityCard
      title="Fewer distractions during Focus."
      body="Block selected apps while Focus runs."
      tone="brand"
      shadow="layered"
      padding="sm"
      ctaAlign="right"
      ctaLabel="Set Up"
      ctaVariant="inverse"
      ctaLeadingIconName={null}
      ctaSize="sm"
      onPressCta={() => {
        markScreenTimeSetupOfferCtaTapped('focus_drawer');
        capture(AnalyticsEvent.ScreenTimeSetupOfferCtaTapped, {
          setup_intent: 'focus_sessions',
          surface: 'focus_drawer',
          activity_id: activity?.id,
        });
        rootNavigationRef.navigate('Settings', {
          screen: 'SettingsScreenTimeProtection',
          params: {
            setupIntent: 'focus_sessions',
            entrySurface: 'focus_drawer',
            returnToActivityId: activity?.id,
          },
        } as any);
      }}
      secondaryCtaLabel="Not now"
      secondaryCtaVariant="ghost"
      secondaryCtaSize="sm"
      onPressSecondaryCta={() => {
        markScreenTimeSetupOfferDismissed('focus_drawer');
        capture(AnalyticsEvent.ScreenTimeSetupOfferDismissed, {
          setup_intent: 'focus_sessions',
          surface: 'focus_drawer',
          activity_id: activity?.id,
        });
      }}
      secondaryCtaAccessibilityLabel="Dismiss Screen Time Controls setup"
    />
  ) : null;

  const calendarSheetVisible = activeSheet === 'calendar';
  const [pendingCalendarToast, setPendingCalendarToast] = useState<string | null>(null);
  const scheduleController = useActivityScheduleSheetController({
    visible: calendarSheetVisible,
    activity,
    activities,
    goals,
    activityAreas,
    userProfile,
    updateActivity,
    showToast,
    onOpen: () => setActiveSheet('calendar'),
    onClose: () => setActiveSheet(null),
    onScheduled: setPendingCalendarToast,
  });
  const sendToSheetVisible = activeSheet === 'sendTo';
  const [installedDestinations, setInstalledDestinations] = useState<ExecutionTargetRow[]>([]);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const recordAudioSheetVisible = activeSheet === 'recordAudio';
  const attachmentDetailsSheetVisible = activeSheet === 'attachmentDetails';
  const attachmentsController = useActivityAttachmentsController({
    activity,
    detailsVisible: attachmentDetailsSheetVisible,
    onOpenDetails: () => setActiveSheet('attachmentDetails'),
    onCloseDetails: () => setActiveSheet(null),
    onCloseRecording: () => setActiveSheet(null),
  });
  const LOCATION_SHEET_PORTAL_HOST = 'activity-detail-location-sheet';
  const FOCUS_SHEET_PORTAL_HOST = 'activity-detail-focus-sheet';
  const locationController = useActivityLocationEditor({
    visible: locationSheetVisible,
    activity,
    updateActivity,
    onClose: () => setActiveSheet(null),
  });
  const scheduleLensHeightPx = useMemo(() => {
    return Math.max(360, Math.min(640, Math.round(windowHeight * 0.52)));
  }, [windowHeight]);
  const titleStepsBundleRef = useRef<View | null>(null);
  const scheduleAndPlanningCardRef = useRef<View | null>(null);
  const nextActionDockRef = useRef<View | null>(null);
  const focusModeCoachmarkWasVisibleRef = useRef(false);
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

  const supportedSendToDestinations = useMemo(() => {
    const type = (activity?.type ?? 'task') as any;
    return installedDestinations
      .filter((t) => Boolean(t.is_enabled))
      .filter((t) => getDestinationSupportedActivityTypes(t.kind as any).includes(type));
  }, [activity?.type, installedDestinations]);

  const hasRetailerSendToOptions =
    activity?.type === 'shopping_list' &&
    Boolean(
      (enabledSendToDestinations?.amazon ?? false) ||
        (enabledSendToDestinations?.home_depot ?? false) ||
        (enabledSendToDestinations?.instacart ?? false) ||
        (enabledSendToDestinations?.doordash ?? false)
    );

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
      Alert.alert('Copied', 'To-do details copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Unable to copy to clipboard on this device right now.');
    }
  }, [activityExportText]);

  const handleSendToShare = useCallback(async () => {
    const text = activityExportText;
    if (!text) return;

    // iOS can fail to present the system share sheet if we attempt to open it while
    // another overlay (e.g. our BottomDrawer/DropdownMenu) is dismissing. Deferring
    // to the next interaction makes the presentation reliable.
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    // Give modal overlays a moment to unmount before presenting the native share sheet.
    // This avoids an iOS edge-case where `Share.share()` no-ops if called while a Modal is
    // still being dismissed in the same tick.
    await new Promise<void>((resolve) => setTimeout(resolve, Platform.OS === 'ios' ? 300 : 0));

    try {
      await Share.share({ message: text });
    } catch (error) {
      console.warn('[ActivityDetailScreen] Share failed', error);
      Alert.alert('Could not share', 'Something went wrong while opening the share sheet.');
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

  // Coachmark guide state — must be computed before any early returns so hook
  // call order stays stable across renders where `activity` is temporarily null
  // (e.g. store rehydration after backgrounding).
  const editingUiActive = isKeyboardVisible || isEditingTitle || isAddingStepInline;
  const isOnboardingActivity = Boolean(
    activity && lastOnboardingGoalId && activity.goalId === lastOnboardingGoalId
  );

  const detailGuideStepCount = 3;
  const detailGuideStepReady = (() => {
    if (detailGuideStep === 0) return isTitleStepsBundleReady;
    if (detailGuideStep === 1) return isScheduleCardReady;
    return isActionDockReady;
  })();

  const shouldShowDetailGuide =
    isFocused &&
    isOnboardingActivity &&
    !hasDismissedActivityDetailGuide &&
    !editingUiActive &&
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
    return null;
  }, [detailGuideStep, scheduleCardOffset]);

  const detailGuideHost = useCoachmarkHost({
    active: shouldShowDetailGuide,
    stepKey: detailGuideStep,
    targetScrollY: detailGuideTargetScrollY,
    scrollTo: (args) => scrollRef.current?.scrollTo(args),
  });

  const isCompleted = activity?.status === 'done';
  const nextBestAction = useMemo(
    () =>
      activity
        ? getNextBestActivityAction({ activity: { ...activity, steps: stepsDraft } })
        : ACTIVITY_NEXT_BEST_ACTIONS.askKwilt,
    [activity, stepsDraft],
  );
  const shouldShowFocusModeCoachmark =
    isFocused &&
    Boolean(activity) &&
    !isCompleted &&
    nextBestAction.id === 'startFocusSprint' &&
    hasCompletedFirstTimeOnboarding &&
    !hasSeenFocusModeCoachmark &&
    isActionDockReady &&
    !shouldShowDetailGuide &&
    !detailGuideHost.coachmarkVisible &&
    !editingUiActive &&
    !difficultyComboboxOpen &&
    activeSheet == null &&
    activeFocusSession == null &&
    !isPlanKickoffVisible;

  useEffect(() => {
    if (shouldShowFocusModeCoachmark) {
      focusModeCoachmarkWasVisibleRef.current = true;
    }
  }, [shouldShowFocusModeCoachmark]);

  useEffect(
    () => () => {
      if (focusModeCoachmarkWasVisibleRef.current) {
        useAppStore.getState().setHasSeenFocusModeCoachmark(true);
      }
    },
    [],
  );

  const markFocusModeCoachmarkSeen = useCallback(() => {
    setHasSeenFocusModeCoachmark(true);
  }, [setHasSeenFocusModeCoachmark]);

  const showTagsAutofill =
    (activity?.tags ?? []).length === 0 && tagsInputDraft.trim().length === 0;

  const dismissDetailGuide = () => {
    setHasDismissedActivityDetailGuide(true);
    setDetailGuideStep(0);
  };

  const detailGuideTargetRef = (() => {
    if (detailGuideStep === 0) return titleStepsBundleRef;
    if (detailGuideStep === 1) return scheduleAndPlanningCardRef;
    return nextActionDockRef;
  })();

  const detailGuideTitle = (() => {
    if (detailGuideStep === 0) return 'Edit + complete here';
    if (detailGuideStep === 1) return 'Schedule + plan';
    return 'Next best action';
  })();

  const detailGuideBody = (() => {
    if (detailGuideStep === 0) {
      return 'Check steps to make progress. When all steps are checked, the to-do is ready to finish.';
    }
    if (detailGuideStep === 1) {
      return 'Add reminders, due dates, and repeats. Use time estimate + difficulty to keep your plan realistic (AI suggestions appear when available).';
    }
    return 'Tap the bottom button for Kwilt’s recommended next move. Use the chevron to find the other actions.';
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
    if (!activity) return;
    Alert.alert(
      'Delete to-do?',
      'This will remove the to-do from your list.',
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

  const handleSkipRecurringActivity = () => {
    if (!activity?.repeatRule || activity.status === 'done' || activity.status === 'skipped' || activity.status === 'cancelled') {
      return;
    }
    const timestamp = new Date().toISOString();
    void HapticsService.trigger('canvas.primary.confirm');
    updateActivity(activity.id, (prev) => ({
      ...prev,
      status: 'skipped',
      completedAt: null,
      updatedAt: timestamp,
    }));
    showToast({
      message: 'Skipped this copy',
      variant: 'light',
      durationMs: 2200,
    });
  };

  const openFocusSheet = () => {
    if (!activity) return;
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

  const clearPendingFocusLaunch = () => {
    if (focusLaunchTimeoutRef.current) {
      clearTimeout(focusLaunchTimeoutRef.current);
      focusLaunchTimeoutRef.current = null;
    }
  };

  const cancelScheduledFocusNotification = async (
    notificationId: string,
    context?: Record<string, unknown>,
  ) => {
    await runFocusNativeBoundary(
      'Notifications.cancelScheduledNotificationAsync.focusComplete',
      () => Notifications.cancelScheduledNotificationAsync(notificationId),
      { notificationId, ...context },
    );
  };

  const cancelFocusNotificationIfNeeded = async () => {
    const existing = focusSession?.notificationId ?? null;
    if (!existing) return;
    try {
      await cancelScheduledFocusNotification(existing);
      useFocusSessionStore.getState().clearNotificationId(focusSession?.sessionId ?? '');
    } catch {
      // best-effort
    }
  };

  const recordScreenTimeProgress = (
    action: 'activity_completed' | 'activity_progress_recorded',
    occurredAt = new Date(),
  ) => {
    useAppStore.getState().recordScreenTimeQualifyingAction({ action, occurredAt });
    reconcileScreenTimeRestrictions({
      focusSessionActive: Boolean(focusSession),
      now: occurredAt,
    }).catch(() => undefined);
  };

  const endFocusSession = async () => {
    clearPendingFocusLaunch();
    const ended = useFocusSessionStore.getState().endSession(focusSession?.sessionId);
    if (ended?.notificationId) {
      await cancelScheduledFocusNotification(ended.notificationId, { reason: 'ended_by_user' }).catch(() => undefined);
    }
  };

  const startFocusSession = async (overrideMinutes?: number) => {
    if (!activity) return;
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

    const replacedSession = useFocusSessionStore.getState().endSession();
    if (replacedSession?.notificationId) {
      await cancelScheduledFocusNotification(replacedSession.notificationId, { reason: 'replaced_by_new_session' }).catch(
        () => undefined,
      );
    }
    setActiveSheet(null);
    // Start preloading immediately so sound can come up quickly once the focus overlay appears.
    preloadSoundscape({ soundscapeId: soundscapeTrackId }).catch(() => undefined);
    // Avoid stacking our focus interstitial modal on top of the BottomDrawer modal
    // while it is animating out; otherwise iOS can show the scrim but hide the next modal.
    clearPendingFocusLaunch();

    focusLaunchTimeoutRef.current = setTimeout(() => {
      const startedAtMs = Date.now();
      useFocusSessionStore.getState().startSession({
        activityId: activity.id,
        goalId: activity.goalId ?? null,
        title: activity.title,
        minutes,
        startedAtMs,
      });
      focusLaunchTimeoutRef.current = null;
      setFocusTickMs(startedAtMs);
      reconcileScreenTimeRestrictions({
        focusSessionActive: true,
        now: new Date(startedAtMs),
      }).catch(() => undefined);
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
      if (!activity) return;
      await cancelFocusNotificationIfNeeded();
      const resumedAtMs = Date.now();
      useFocusSessionStore.getState().resumeSession(focusSession.sessionId, resumedAtMs);
      setFocusTickMs(resumedAtMs);
      return;
    }

    void HapticsService.trigger('canvas.toggle.off');
    const paused = useFocusSessionStore.getState().pauseSession(focusSession.sessionId);
    if (paused?.notificationId) {
      await cancelScheduledFocusNotification(paused.notificationId, { reason: 'paused' }).catch(() => undefined);
    }
  };

  useEffect(() => {
    if (!focusSession) return;
    if (focusSession.mode !== 'running') return;

    const id = setInterval(() => {
      setFocusTickMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [focusSession]);

  const focusSoundscapeShouldPlay = focusSession?.mode === 'running' && soundscapeEnabled;

  useEffect(() => {
    if (!focusSoundscapeShouldPlay || hasShownFocusSoundscapeVolumeHint) return;
    showToast({
      message: "If you don't hear Focus audio, turn up your device volume.",
      variant: 'default',
      durationMs: 2600,
      behaviorDuringSuppression: 'queue',
    });
    setHasShownFocusSoundscapeVolumeHint(true);
  }, [
    focusSoundscapeShouldPlay,
    hasShownFocusSoundscapeVolumeHint,
    showToast,
    setHasShownFocusSoundscapeVolumeHint,
  ]);


  const openCalendarSheet = scheduleController.open;

  useEffect(() => {
    if (!openSchedule) return;
    if (!activity) return;
    requestAnimationFrame(() => {
      openCalendarSheet();
      try {
        navigation.setParams({ openSchedule: undefined } as any);
      } catch {
        // no-op
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSchedule, activity?.id]);

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
        const duration =
          typeof action.durationMinutes === 'number' && Number.isFinite(action.durationMinutes)
            ? Math.max(5, Math.round(action.durationMinutes))
            : Math.max(5, Math.round(activity.estimateMinutes ?? 30));
        scheduleController.open({
          startAt: fromAction && !Number.isNaN(fromAction.getTime()) ? fromAction : null,
          durationMinutes: duration,
        });
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
                  recordScreenTimeProgress('activity_progress_recorded', new Date(timestamp));
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

  useEffect(() => {
    return () => {
      clearPendingFocusLaunch();
    };
  }, []);

  const commitTitle = () => {
    if (!activity) return;
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
    if (!activity) return;
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
    if (!activity) return;
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

  const applyStepUpdate = (updater: (current: ActivityStep[]) => ActivityStep[]) => {
    if (!activity) return;
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
        const { nextStatus, nextCompletedAt } = deriveStatusFromSteps({
          prevStatus: prev.status,
          prevSteps: currentSteps,
          nextSteps,
          timestamp,
          prevCompletedAt: prev.completedAt,
        });

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
        recordScreenTimeProgress('activity_completed', new Date(timestamp));
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
          void queueCheckinDraftFromProgress({
            goalId: activityGoalId,
            trigger: 'activity_complete',
            source: 'activity_detail',
            sourceType: 'activity',
            sourceId: activity.id,
            title: activity.title ?? '',
            completedAt: timestamp,
            openPromptDelayMs: 1200,
            capture,
          });
        }
      }
    });
  };

  const handleToggleStepComplete = (stepId: string) => {
    if (!stepId) return;
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
    if (!stepId) return;
    applyStepUpdate((steps) => steps.map((step) => (step.id === stepId ? { ...step, title } : step)));
  };

  const handleToggleStepOptional = (stepId: string) => {
    if (!stepId) return;
    applyStepUpdate((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, isOptional: !step.isOptional } : step))
    );
  };

  const handleRemoveStep = (stepId: string) => {
    if (!stepId) return;
    applyStepUpdate((steps) => steps.filter((step) => step.id !== stepId));
  };

  const handleConvertStepToActivity = useCallback(
    (stepId: string) => {
      if (!activity) return;
      if (!stepId) return;
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
        areaId: activity.areaId ?? null,
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
      activity?.areaId,
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
      if (!activity) return;
      const step = (stepsDraft ?? []).find((s) => s.id === stepId) ?? null;
      const linkedActivityId = step?.linkedActivityId ?? null;
      if (!linkedActivityId) return;

      Alert.alert(
        'Unlink to-do?',
        'This will turn the row back into a normal checklist step. The linked to-do will remain.',
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
    [activity?.id, stepsDraft, updateActivity]
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

  // Guard against duplicate commits when `onSubmitEditing` and `onBlur` both fire
  // for the same "Done" action (platform-dependent). This should only suppress the
  // immediate double-fire window, not prevent adding the same title twice intentionally.
  const inlineStepCommitGuardRef = useRef<{ value: string; ts: number } | null>(null);

  const commitInlineStep = (mode: 'continue' | 'exit' = 'exit') => {
    const trimmed = newStepTitle.trim();
    if (!trimmed) {
      setIsAddingStepInline(false);
      setNewStepTitle('');
      return;
    }

    const now = Date.now();
    const prevCommit = inlineStepCommitGuardRef.current;
    if (prevCommit && prevCommit.value === trimmed && now - prevCommit.ts < 200) {
      // Ignore the duplicate call (commonly a trailing blur after submit).
      return;
    }
    inlineStepCommitGuardRef.current = { value: trimmed, ts: now };

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
    if (!activity) return;
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
        recordScreenTimeProgress('activity_completed', new Date(timestamp));
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
      recordScreenTimeProgress('activity_completed', new Date(timestamp));
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
    if (!activity) return;
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(hours, minutes, 0, 0);
    const timestamp = new Date().toISOString();
    // Note: Planning no longer counts as "showing up" for streaks.
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: date.toISOString(),
      reminderSource: REMINDER_SOURCE_MANUAL,
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsReminderDateTimePickerVisible(false);
  };

  const handleReminderDateTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (!activity) return;
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
      reminderSource: REMINDER_SOURCE_MANUAL,
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsReminderDateTimePickerVisible(false);
  };

  const getInitialReminderDateTimeForPicker = () => {
    if (!activity) return new Date();
    if (activity.reminderAt) return new Date(activity.reminderAt);
    const base = new Date();
    base.setMinutes(0, 0, 0);
    base.setHours(base.getHours() + 1);
    return base;
  };

  const handleSelectDueDate = (offsetDays: number) => {
    if (!activity) return;
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(23, 0, 0, 0);
    const timestamp = new Date().toISOString();
    // Note: Planning no longer counts as "showing up" for streaks.
    updateActivity(activity.id, (prev) => ({
      ...prev,
      ...applyDueDateReminderPolicy({
        activity: prev,
        nextScheduledDate: date.toISOString(),
        now: new Date(timestamp),
      }),
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
  };

  const handleClearDueDate = () => {
    if (!activity) return;
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      ...applyDueDateReminderPolicy({
        activity: prev,
        nextScheduledDate: null,
        now: new Date(timestamp),
      }),
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsDueDatePickerVisible(false);
  };

  const getInitialDueDateForPicker = () => {
    if (!activity) return new Date();
    if (activity.scheduledDate) {
      const parsed = new Date(activity.scheduledDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const handleDueDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (!activity) return;
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
      ...applyDueDateReminderPolicy({
        activity: prev,
        nextScheduledDate: next.toISOString(),
        now: new Date(timestamp),
      }),
      updatedAt: timestamp,
    }));

    // Once a date is chosen, close the sheet to confirm the selection.
    setActiveSheet(null);
  };

  const handleClearReminder = () => {
    if (!activity) return;
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: null,
      reminderSource: prev.scheduledDate ? REMINDER_SOURCE_MANUAL : undefined,
      updatedAt: timestamp,
    }));
    setActiveSheet(null);
    setIsReminderDateTimePickerVisible(false);
  };

  const reminderLabel = useMemo(() => {
    if (!activity?.reminderAt) return 'None';
    const date = new Date(activity.reminderAt);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [activity?.reminderAt]);

  const dueDateLabel = useMemo(() => {
    if (!activity?.scheduledDate) return 'None';
    const date = new Date(activity.scheduledDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [activity?.scheduledDate]);

  const repeatLabel = repeatController.repeatLabel;

  const completedStepsCount = useMemo(
    () => (stepsDraft ?? []).filter((step) => !!step.completedAt).length,
    [stepsDraft]
  );
  const totalStepsCount = stepsDraft?.length ?? 0;

  const actionDockRightProgress =
    totalStepsCount > 0 ? Math.max(0, Math.min(1, completedStepsCount / totalStepsCount)) : undefined;
  const dockCompleteColor = colors.pine700;
  const actionDockCountLabel = totalStepsCount > 0 ? `${completedStepsCount}/${totalStepsCount}` : undefined;
  const isAiEnrichingActivity = useActivityEnrichmentStore((state) =>
    activity?.id ? Boolean(state.enrichingById[activity.id]) : false,
  );

  const [rightItemCelebrateKey, setRightItemCelebrateKey] = useState(0);
  const prevProgressRef = useRef<number>(0);
  const hasInitializedProgressRef = useRef(false);
  const [rightItemCenterLabelPulseKey, setRightItemCenterLabelPulseKey] = useState(0);
  const prevCompletedCountRef = useRef<number>(completedStepsCount);
  const activityTypeLabel = useMemo(() => {
    const match = (activityTypeOptions ?? []).find((opt: any) => opt?.value === activity?.type);
    return (match?.label ?? 'To-do') as string;
  }, [activity?.type, activityTypeOptions]);

  useEffect(() => {
    if (!activity) return;
    hasInitializedProgressRef.current = false;
    prevProgressRef.current = 0;
    prevCompletedCountRef.current = completedStepsCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

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

  const nextActionMenuActions = useMemo(() => {
    const orderedIds = [
      nextBestAction.id,
      ...ACTIVITY_NEXT_BEST_ACTION_MENU_ORDER.filter((id) => id !== nextBestAction.id),
    ];
    return orderedIds.map((id) => ACTIVITY_NEXT_BEST_ACTIONS[id]);
  }, [nextBestAction.id]);

  const disabledNextActionIds = useMemo<Partial<Record<ActivityNextBestActionId, boolean>>>(
    () => ({
      share: !activityExportText,
    }),
    [activityExportText],
  );

  const handleNextActionPress = useCallback(
    (actionId: ActivityNextBestActionId, source: 'primary' | 'menu') => {
      if (!activity) return;

      const captureAction = (action: string, extra?: Record<string, unknown>) => {
        capture(AnalyticsEvent.ActivityActionInvoked, {
          activityId: activity.id,
          action,
          nextBestActionId: nextBestAction.id,
          nextBestActionSource: source,
          ...extra,
        } as any);
      };

      if (actionId === 'startFocusSprint') {
        markFocusModeCoachmarkSeen();
        captureAction('focusMode');
        openFocusSheet();
        return;
      }

      if (actionId === 'scheduleTime') {
        captureAction('addToCalendar');
        openCalendarSheet();
        return;
      }

      if (actionId === 'breakIntoSteps') {
        captureAction('breakIntoSteps');
        beginAddStepInline();
        return;
      }

      if (actionId === 'askKwilt') {
        captureAction('chatWithAi');
        openAgentForActivity({ objectType: 'activity', objectId: activity.id });
        return;
      }

      if (actionId === 'share') {
        if (!activityExportText) return;
        captureAction('sendToShare');
        handleSendToShare().catch(() => undefined);
        return;
      }

    },
    [
      activity,
      activityExportText,
      capture,
      handleSendToShare,
      beginAddStepInline,
      markFocusModeCoachmarkSeen,
      nextBestAction.id,
      openCalendarSheet,
      openAgentForActivity,
      openFocusSheet,
    ],
  );

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
    const manualMinutes = activity?.estimateMinutes ?? null;
    const aiMinutes = activity?.aiPlanning?.estimateMinutes ?? null;

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

    const manualDifficulty = activity?.difficulty ?? null;
    const aiDifficulty = activity?.aiPlanning?.difficulty ?? null;

    const formatDifficulty = (value: string) => {
      switch (value) {
        case 'very_easy':
          return '1 · Very easy';
        case 'easy':
          return '2 · Easy';
        case 'medium':
          return '3 · Medium';
        case 'hard':
          return '5 · Hard';
        case 'very_hard':
          return '8 · Very hard';
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
  }, [activity?.estimateMinutes, activity?.aiPlanning, activity?.difficulty]);

  const hasTimeEstimate =
    activity?.estimateMinutes != null || activity?.aiPlanning?.estimateMinutes != null;
  const hasDifficulty = activity?.difficulty != null || activity?.aiPlanning?.difficulty != null;

  const handleClearTimeEstimate = () => {
    if (!activity) return;
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
    if (!activity) return;
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
    if (!activity) return;
    const minutes = activity.estimateMinutes ?? activity.aiPlanning?.estimateMinutes ?? 0;
    setEstimateDraftMinutes(Math.max(15, Math.round(minutes > 0 ? minutes : 30)));
    setActiveSheet('estimate');
  };

  const commitEstimateDraft = () => {
    if (!activity) return;
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
    if (!activity) return;
    setTitleDraft(activity.title ?? '');
    setTagsInputDraft('');
    const nowIso = new Date().toISOString();
    const normalized = normalizeActivitySteps({ activityId: activity.id, steps: activity.steps ?? [], nowIso });
    setStepsDraft(normalized.steps);
    if (normalized.changed) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[ActivityDetailScreen] normalized invalid/duplicate step ids', { activityId: activity.id });
      }
      InteractionManager.runAfterInteractions(() => {
        updateActivity(activity.id, (prev) => ({
          ...prev,
          steps: normalized.steps,
          updatedAt: nowIso,
        }));
      });
    }
  }, [activity?.title, activity?.notes, activity?.steps, activity?.id, updateActivity]);

  useEffect(() => {
    if (!activity) return;
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
        const currentSteps = prev.steps ?? [];
        const { nextStatus, nextCompletedAt } = deriveStatusFromSteps({
          prevStatus: prev.status,
          prevSteps: currentSteps as any,
          nextSteps: nextSteps as any,
          timestamp,
          prevCompletedAt: prev.completedAt,
        });
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
  }, [activity?.id, activity?.steps, activitiesById, updateActivity]);

  const togglePlanExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    togglePlanExpandedInStore();
  }, [togglePlanExpandedInStore]);

  const toggleDetailsExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleDetailsExpandedInStore();
  }, [toggleDetailsExpandedInStore]);

  if (!activity) {
    if (!domainHydrated) {
      return (
        <AppShell>
          <PageHeader title="To-do" onPressBack={handleBackToActivities} />
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.textPrimary} />
            <Text style={[styles.emptyBody, { marginTop: spacing.lg }]}>Loading to-do…</Text>
          </View>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <PageHeader title="To-do" onPressBack={handleBackToActivities} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>To-do not found</Text>
          <Text style={styles.emptyBody}>
            This to-do may have been deleted or moved.
          </Text>
        </View>
      </AppShell>
    );
  }

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
              openAttachmentDetails={attachmentsController.openDetails}
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
              handleClearRepeatRule={repeatController.clear}
              openEstimateSheet={openEstimateSheet}
              handleClearTimeEstimate={handleClearTimeEstimate}
              difficultyComboboxOpen={difficultyComboboxOpen}
              setDifficultyComboboxOpen={setDifficultyComboboxOpen}
              difficultyOptions={difficultyOptions}
              handleClearDifficulty={handleClearDifficulty}
              setActivityPriorityState={(nextState: ActivityPriorityState) => {
                setActivityPriorityState(activity.id, nextState);
              }}
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
              activityAreas={activityAreas}
              handleDeleteActivity={handleDeleteActivity}
              handleSkipRecurringActivity={handleSkipRecurringActivity}
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
                  leftDockTargetRef={nextActionDockRef}
                  leftContent={
                    <ActivityNextActionInlineContent
                      recommendedAction={nextBestAction}
                      menuActions={nextActionMenuActions}
                      onActionPress={handleNextActionPress}
                      disabledActionIds={disabledNextActionIds}
                    />
                  }
                  rightItem={{
                    id: 'done',
                    icon: 'check',
                    accessibilityLabel: isAiEnrichingActivity
                      ? 'AI is finishing this to-do'
                      : isCompleted
                        ? 'Mark to-do as not done'
                        : 'Mark to-do as done',
                    onPress: handleToggleComplete,
                    testID: 'e2e.activityDetail.dock.donePrimary',
                    disabled: isAiEnrichingActivity,
                    // Reflect explicit Activity completion (users may keep all steps checked but un-mark the Activity).
                    color: isAiEnrichingActivity ? colors.aiForeground : isCompleted ? colors.parchment : colors.sumi,
                  }}
                  rightItemProgress={actionDockRightProgress}
                  rightItemRingColor={isAiEnrichingActivity ? colors.accentMuted : dockCompleteColor}
                  rightItemBackgroundColor={
                    isAiEnrichingActivity ? colors.accentMuted : isCompleted ? dockCompleteColor : undefined
                  }
                  rightItemThinking={isAiEnrichingActivity}
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

      <Coachmark
        visible={shouldShowFocusModeCoachmark}
        targetRef={nextActionDockRef}
        scrimToken="pineSubtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius="auto"
        offset={spacing.xs}
        highlightColor={colors.turmeric}
        actionColor={colors.turmeric}
        attentionPulse
        attentionPulseDelayMs={2500}
        attentionPulseDurationMs={15000}
        title={<Text style={styles.detailGuideTitle}>Protect time for this</Text>}
        body={
          <Text style={styles.detailGuideBody}>
            Focus starts a timer for this to-do, with optional soundscape audio when you
            want fewer distractions.
          </Text>
        }
        actions={[
          { id: 'dismiss', label: 'Got it', variant: 'outline' },
          { id: 'startFocus', label: 'Start Focus', variant: 'accent' },
        ]}
        onAction={(actionId) => {
          markFocusModeCoachmarkSeen();
          if (actionId === 'startFocus') {
            if (activity) {
              capture(AnalyticsEvent.ActivityActionInvoked, {
                activityId: activity.id,
                action: 'focusMode',
              });
            }
            openFocusSheet();
          }
        }}
        onDismiss={markFocusModeCoachmarkSeen}
        placement="above"
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
          <BottomDrawerHeader
            title="Remind me"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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
          <BottomDrawerHeader
            title="Due"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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

      <ActivityRepeatSheets
        presetVisible={repeatSheetVisible}
        customVisible={customRepeatSheetVisible}
        controller={repeatController}
      />
      <ActivityLocationSheet
        visible={locationSheetVisible}
        controller={locationController}
        portalHostName={LOCATION_SHEET_PORTAL_HOST}
      />
      <BottomDrawer
        visible={estimateSheetVisible}
        onClose={() => setActiveSheet(null)}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['40%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Duration"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
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
                <VStack space="md">
                  <BottomDrawerHeader
                    title="Focus mode"
                    variant="withClose"
                    onClose={() => setActiveSheet(null)}
                    containerStyle={styles.sheetHeader}
                    titleStyle={styles.focusSheetTitle}
                  />

                  {focusScreenTimeOfferCard}

                  <Text style={styles.sheetDescription}>
                    Pick a duration. Kwilt keeps the session tied to this to-do, so the
                    work has a place to land.
                  </Text>
                </VStack>
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
                        <Text style={styles.menuRowText} numberOfLines={1} ellipsizeMode="tail">
                          {s.title}
                        </Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            </VStack>
          </BottomDrawerScrollView>

          <View style={styles.focusSheetFooter}>
            <Button
              variant="primary"
              fullWidth
              testID="e2e.activityDetail.focus.start"
              onPress={() => {
                startFocusSession().catch(() => undefined);
              }}
            >
              <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>
                Start
              </Text>
            </Button>
          </View>
        </View>
      </BottomDrawer>

      <ActivityScheduleSheet
        visible={calendarSheetVisible}
        activityTitle={activity?.title ?? 'To-do'}
        lensHeight={scheduleLensHeightPx}
        controller={scheduleController}
        onOpenCalendarSettings={() => {
          rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
        }}
        onOpenAvailabilitySettings={() => {
          rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanAvailability' } as any);
        }}
      />
      {focusSession ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => {
            endFocusSession().catch(() => undefined);
          }}
        >
          <Pressable
            onPress={handleFocusOverlayTap}
            accessibilityRole="button"
            accessibilityLabel="Focus color"
            accessibilityHint="Double tap to shift focus background color"
            style={{ flex: 1 }}
          >
          <Animated.View
            style={[
              styles.focusOverlay,
              { backgroundColor: focusOverlayBackgroundColor },
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
            </View>

            <View style={styles.focusCenter}>
              <Text style={styles.focusTimer}>{formatMsAsTimer(remainingFocusMs)}</Text>
              <Text style={styles.focusActivityTitle} numberOfLines={2}>
                {activity.title}
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
              <View style={styles.focusAudioControlWrap}>
                {focusSoundscapeMenuVisible ? (
                  <Animated.View
                    style={[
                      styles.focusSoundscapeQuickMenu,
                      {
                        opacity: focusSoundscapeMenuAnim,
                        transform: [
                          {
                            translateY: focusSoundscapeMenuAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [8, 0],
                            }),
                          },
                          {
                            scale: focusSoundscapeMenuAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.98, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {SOUND_SCAPES.map((s) => {
                      const selected = s.id === soundscapeTrackId;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => {
                            setSoundscapeTrackId(s.id);
                            setFocusSoundscapeMenuOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.focusSoundscapeQuickMenuItem,
                            selected && styles.focusSoundscapeQuickMenuItemActive,
                            pressed && styles.focusSoundscapeQuickMenuItemPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${s.title} soundscape`}
                        >
                          <Text style={styles.focusSoundscapeQuickMenuItemText} numberOfLines={1}>
                            {s.title}
                          </Text>
                          {selected ? <Icon name="check" size={16} color={colors.textPrimary} /> : null}
                        </Pressable>
                      );
                    })}
                  </Animated.View>
                ) : null}
                <HeaderActionPill
                  size={56}
                  accessibilityLabel="Focus soundscape"
                  style={styles.focusActionIconButton}
                  onPress={handlePressFocusAudio}
                  onLongPress={handleLongPressFocusAudio}
                >
                  <Icon name={soundscapeEnabled ? 'sound' : 'soundOff'} size={22} color={colors.parchment} />
                </HeaderActionPill>
              </View>
            </HStack>
          </Animated.View>
          </Pressable>
        </Modal>
      ) : null}

      <ArcBannerSheet
        visible={thumbnailSheetVisible}
        onClose={() => setThumbnailSheetVisible(false)}
        objectLabel="To-do"
        objectKind="activity"
        arcName={activity?.title ?? 'To-do'}
        arcNarrative={activity?.notes}
        canUseUnsplash={canUseUnsplash}
        onRequestUpgrade={() => {
          setThumbnailSheetVisible(false);
          setTimeout(
            () => openPaywallInterstitial({ reason: 'pro_only_unsplash_banners', source: 'activity_banner_sheet' }),
            360
          );
        }}
        heroSeed={heroSeed}
        hasHero={Boolean(resolvedHeroUrl)}
        loading={heroImageLoading}
        error={heroImageError}
        thumbnailUrl={displayThumbnailUrlForSheet}
        heroGradientColors={heroGradientColors}
        heroGradientDirection={heroGradientDirection}
        heroTopoSizes={heroTopoSizes}
        showTopography={false}
        showGeoMosaic={false}
        onGenerate={() => {
          void handleFindActivityHeroImage();
        }}
        onUpload={() => {
          void handleUploadActivityThumbnail();
        }}
        onRemove={handleClearActivityHeroImage}
        onSelectCurated={handleSelectCuratedActivityHero}
        onSelectUnsplash={handleSelectUnsplashActivityHero}
      />

      {AgentWorkspaceSheet}

      <ActivityAttachmentSheets
        detailsVisible={attachmentDetailsSheetVisible}
        recordingVisible={recordAudioSheetVisible}
        bottomInset={insets.bottom}
        controller={attachmentsController}
      />
      <BottomDrawer
        visible={sendToSheetVisible}
        onClose={() => setActiveSheet(null)}
        snapPoints={['45%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Send to…"
            variant="withClose"
            onClose={() => setActiveSheet(null)}
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          {supportedSendToDestinations.length > 0 ? (
            <>
              {supportedSendToDestinations.map((t) => (
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
          ) : null}
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
          {supportedSendToDestinations.length > 0 || hasRetailerSendToOptions ? (
            <View style={styles.cardSectionDivider} />
          ) : null}
          <SheetOption
            testID="e2e.activityDetail.sendTo.copy"
            iconName="clipboard"
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
            iconName="share"
            label="Share…"
            disabled={!activityExportText}
            subtext={!activityExportText ? 'Add some details to share.' : undefined}
            onPress={() => {
              capture(AnalyticsEvent.ActivityActionInvoked, { activityId: activity.id, action: 'sendToShare' });
              setActiveSheet(null);
              handleSendToShare().catch(() => undefined);
            }}
          />
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
  iconName?: IconName;
};

function SheetOption({ label, onPress, testID, disabled, subtext, iconName }: SheetOptionProps) {
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
      <HStack alignItems="flex-start" space="sm" style={styles.sheetRowInner}>
        {iconName ? (
          <View style={styles.sheetRowIcon}>
            <Icon
              name={iconName}
              size={18}
              color={disabled ? colors.textSecondary : colors.textPrimary}
            />
          </View>
        ) : null}
        <View style={styles.sheetRowTextBlock}>
          <Text style={[styles.sheetRowLabel, disabled ? { color: colors.textSecondary } : null]}>
            {label}
          </Text>
          {subtext ? <Text style={styles.sheetRowSubtext}>{subtext}</Text> : null}
        </View>
      </HStack>
    </Pressable>
  );
}

import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import {
  Animated,
  LayoutAnimation,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Keyboard,
  Pressable,
  Linking,
  UIManager,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { Badge } from '../../ui/Badge';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { menuItemTextProps, menuStyles } from '../../ui/menuStyles';
import { useAppStore, defaultForceLevels, getCanonicalForce } from '../../store/useAppStore';
import { useCelebrationStore } from '../../store/useCelebrationStore';
import { useToastStore } from '../../store/useToastStore';
import type { GoalDetailRouteParams } from '../../navigation/routeParams';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ObjectTypeIconBadge } from '../../ui/ObjectTypeIconBadge';
import { Card } from '../../ui/Card';
import { OpportunityCard } from '../../ui/OpportunityCard';
import {
  Dialog,
  VStack,
  Heading,
  Text,
  HStack,
  KeyboardAwareScrollView,
  Input,
  Textarea,
  ObjectPicker,
} from '../../ui/primitives';
import { LongTextField } from '../../ui/LongTextField';
import { richTextToPlainText } from '../../ui/richText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Arc, ForceLevel, ThumbnailStyle, Goal, Activity, ActivityType, ActivityStep } from '../../domain/types';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { useNavigationTapGuard } from '../../ui/hooks/useNavigationTapGuard';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomGuide } from '../../ui/BottomGuide';
import { Coachmark } from '../../ui/Coachmark';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { enrichActivityWithAI } from '../../services/ai';
import { geocodePlaceBestEffort } from '../../services/locationOffers/geocodePlace';
import { suggestTagsFromText } from '../../utils/tags';
import { shareUrlWithPreview } from '../../utils/share';
import { initHeroImageUpload, uploadHeroImageToSignedUrl } from '../../services/heroImages';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  DEFAULT_THUMBNAIL_STYLE,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
  buildArcThumbnailSeed,
} from './thumbnailVisuals';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import type { ObjectPickerOption } from '../../ui/ObjectPicker';
import { NarrativeEditableTitle } from '../../ui/NarrativeEditableTitle';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import * as ImagePicker from 'expo-image-picker';
import { getImagePickerMediaTypesImages } from '../../utils/imagePickerMediaTypes';
import { ActivityListItem } from '../../ui/ActivityListItem';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { buildActivityCoachLaunchContext } from '../ai/workspaceSnapshots';
import { getWorkflowLaunchConfig } from '../ai/workflowRegistry';
import { AgentModeHeader } from '../../ui/AgentModeHeader';
import { GoalProgressSignalsRow, type GoalProgressSignal } from '../../ui/GoalProgressSignalsRow';
import { ArcBannerSheet } from './ArcBannerSheet';
import type { ArcHeroImage } from './arcHeroLibrary';
import { trackUnsplashDownload, type UnsplashPhoto, withUnsplashReferral } from '../../services/unsplash';
import { useHeroImageUrl } from '../../ui/hooks/useHeroImageUrl';
import {
  ObjectPageHeader,
  HeaderActionPill,
  HeaderActionGroupPill,
  OBJECT_PAGE_HEADER_BAR_HEIGHT,
} from '../../ui/layout/ObjectPageHeader';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { buildActivityListMeta } from '../../utils/activityListMeta';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { PaywallContent } from '../paywall/PaywallDrawer';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { FREE_GENERATIVE_CREDITS_PER_MONTH, PRO_GENERATIVE_CREDITS_PER_MONTH, getMonthKey } from '../../domain/generativeCredits';
import { parseTags } from '../../utils/tags';
import { ActivityDraftDetailFields, type ActivityDraft } from '../activities/ActivityDraftDetailFields';
import { QuickAddDock } from '../activities/QuickAddDock';
import { useQuickAddDockController } from '../activities/useQuickAddDockController';
import { DurationPicker } from '../activities/DurationPicker';
import type { GoalProposalDraft } from '../ai/AiChatScreen';
import { useScrollLinkedStatusBarStyle } from '../../ui/hooks/useScrollLinkedStatusBarStyle';
import { useCoachmarkHost } from '../../ui/hooks/useCoachmarkHost';
import { HapticsService } from '../../services/HapticsService';
import { celebrateGoalCompleted } from '../../store/useCelebrationStore';
import { GOAL_STATUS_OPTIONS, getGoalStatusAppearance } from '../../ui/goalStatusAppearance';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import { buildInviteOpenUrl, createGoalInvite, extractInviteCode } from '../../services/invites';
import { createReferralCode } from '../../services/referrals';
import { leaveSharedGoal, listGoalMembers, type SharedMember } from '../../services/sharedGoals';
import { createProgressSignal } from '../../services/progressSignals';
import { GoalFeedSection } from '../goals/GoalFeedSection';
import Constants from 'expo-constants';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { OverlappingAvatarStack } from '../../ui/OverlappingAvatarStack';
import { ensureSignedInWithPrompt, signInWithProvider } from '../../services/backend/auth';

type GoalDetailRouteProp = RouteProp<{ GoalDetail: GoalDetailRouteParams }, 'GoalDetail'>;

const FORCE_ORDER: Array<string> = [
  'force-activity',
  'force-connection',
  'force-mastery',
  'force-spirituality',
];

const FIRST_GOAL_ILLUSTRATION = require('../../../assets/illustrations/goal-set.png');

export function GoalDetailScreen() {
  const route = useRoute<GoalDetailRouteProp>();
  const navigation = useNavigation();
  const { goalId, entryPoint, initialTab, openActivitySheet } = route.params;
  const showToast = useToastStore((state) => state.showToast);
  const setToastsSuppressed = useToastStore((state) => state.setToastsSuppressed);
  const { capture } = useAnalytics();
  const isFocused = useIsFocused();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const { height: windowHeight } = useWindowDimensions();
  const canOpenActivityDetail = useNavigationTapGuard({ cooldownMs: 2000 });

  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const domainHydrated = useAppStore((state) => state.domainHydrated);
  const hasCompletedFirstTimeOnboarding = useAppStore((state) => state.hasCompletedFirstTimeOnboarding);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const pendingPostGoalPlanGuideGoalId = useAppStore((state) => state.pendingPostGoalPlanGuideGoalId);
  const dismissedPostGoalPlanGuideGoalIds = useAppStore(
    (state) => state.dismissedPostGoalPlanGuideGoalIds
  );
  const dismissPostGoalPlanGuideForGoal = useAppStore((state) => state.dismissPostGoalPlanGuideForGoal);
  const hasSeenPostGoalPlanCoachmark = useAppStore((state) => state.hasSeenPostGoalPlanCoachmark);
  const setHasSeenPostGoalPlanCoachmark = useAppStore((state) => state.setHasSeenPostGoalPlanCoachmark);
  const hasSeenOnboardingSharePrompt = useAppStore((state) => state.hasSeenOnboardingSharePrompt);
  const setHasSeenOnboardingSharePrompt = useAppStore(
    (state) => state.setHasSeenOnboardingSharePrompt
  );
  const hasDismissedOnboardingActivitiesGuide = useAppStore(
    (state) => state.hasDismissedOnboardingActivitiesGuide
  );
  const setHasDismissedOnboardingActivitiesGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingActivitiesGuide
  );
  const hasDismissedOnboardingPlanReadyGuide = useAppStore(
    (state) => state.hasDismissedOnboardingPlanReadyGuide
  );
  const setHasDismissedOnboardingPlanReadyGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingPlanReadyGuide
  );
  const hasSeenFirstGoalCelebration = useAppStore(
    (state) => state.hasSeenFirstGoalCelebration
  );
  const setHasSeenFirstGoalCelebration = useAppStore(
    (state) => state.setHasSeenFirstGoalCelebration
  );
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const removeGoal = useAppStore((state) => state.removeGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const devHeaderV2Enabled = __DEV__ && useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const abHeaderV2Enabled = useFeatureFlag('object_detail_header_v2', false);
  const headerV2Enabled = devHeaderV2Enabled || abHeaderV2Enabled;
  const thumbnailStyles = useMemo<ThumbnailStyle[]>(() => {
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return [DEFAULT_THUMBNAIL_STYLE];
  }, [visuals]);
  // Goals no longer support the legacy dot-overlay thumbnail style.
  // Filter it out so we fall back to a clean gradient or other styles.
  const effectiveThumbnailStyles = useMemo<ThumbnailStyle[]>(
    () => thumbnailStyles.filter((style) => style !== 'topographyDots'),
    [thumbnailStyles]
  );
  const [editingForces, setEditingForces] = useState(false);
  const [heroImageLoading, setHeroImageLoading] = useState(false);
  const [heroImageError, setHeroImageError] = useState('');
  const [editForceIntent, setEditForceIntent] = useState<Record<string, ForceLevel>>(
    defaultForceLevels(0)
  );
  const [showFirstGoalCelebration, setShowFirstGoalCelebration] = useState(false);
  const [showOnboardingSharePrompt, setShowOnboardingSharePrompt] = useState(false);
  const [pendingOnboardingSharePrompt, setPendingOnboardingSharePrompt] = useState(false);
  const [shareSignInSheetVisible, setShareSignInSheetVisible] = useState(false);
  const [shareSignInSheetBusy, setShareSignInSheetBusy] = useState(false);
  // Track activity count transitions so we only trigger onboarding handoffs on
  // *real* changes (not just because a goal already has activities when the screen mounts).
  const onboardingSharePrevActivityCountRef = useRef<number | null>(null);
  const firstGoalCelebrationHapticPlayedRef = useRef(false);
  const planReadyHapticPlayedRef = useRef(false);
  const [vectorsInfoVisible, setVectorsInfoVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const [activityComposerVisible, setActivityComposerVisible] = useState(false);
  const [activityCoachVisible, setActivityCoachVisible] = useState(false);
  // Share UX: vNext prefers native share sheet (FTUE provides onboarding copy once).

  // --- Scroll-linked header + hero behavior (sheet-top threshold) ---
  // Header bar height below the safe area inset (not including inset).
  // We render larger action pills on this screen; keep a bit of breathing room below them.
  const HEADER_ACTION_PILL_SIZE = 44;
  const GOAL_HEADER_HEIGHT = OBJECT_PAGE_HEADER_BAR_HEIGHT + 8; // ~44px pill + 8px breathing room
  const HEADER_BOTTOM_Y = insets.top + GOAL_HEADER_HEIGHT;
  const SHEET_HEADER_TRANSITION_RANGE_PX = 72;

  const scrollY = useRef(new Animated.Value(0)).current;
  const sheetTopRef = useRef<View | null>(null);
  const [sheetTopAtRestWindowY, setSheetTopAtRestWindowY] = useState<number | null>(null);

  const measureSheetTopAtRest = useCallback(() => {
    const node = sheetTopRef.current;
    if (!node) return;
    const handle = findNodeHandle(node);
    if (!handle) return;
    UIManager.measureInWindow(handle, (_x, y) => {
      if (typeof y === 'number' && Number.isFinite(y)) {
        setSheetTopAtRestWindowY(y);
      }
    });
  }, []);

  useEffect(() => {
    // Measure once after initial layout. This is our scroll threshold anchor.
    requestAnimationFrame(() => {
      measureSheetTopAtRest();
    });
  }, [measureSheetTopAtRest]);

  // `measureInWindow` can occasionally report a too-small Y for views inside scroll containers,
  // which collapses our interpolation ranges and makes the hero fade immediately.
  // Provide a layout-based fallback that matches this screen's fixed hero/sheet geometry.
  const ESTIMATED_GOAL_HERO_HEIGHT_PX = 240; // keep in sync with `styles.goalHeroSection.height`
  const ESTIMATED_GOAL_SHEET_MARGIN_TOP_PX = -20; // keep in sync with `styles.goalSheet.marginTop`
  const estimatedHeaderTransitionStartScrollY = Math.max(
    0,
    ESTIMATED_GOAL_HERO_HEIGHT_PX + ESTIMATED_GOAL_SHEET_MARGIN_TOP_PX - HEADER_BOTTOM_Y,
  );

  const measuredHeaderTransitionStartScrollY =
    sheetTopAtRestWindowY != null && Number.isFinite(sheetTopAtRestWindowY)
      ? Math.max(0, sheetTopAtRestWindowY - HEADER_BOTTOM_Y)
      : null;

  const headerTransitionStartScrollY =
    measuredHeaderTransitionStartScrollY != null && measuredHeaderTransitionStartScrollY >= 24
      ? measuredHeaderTransitionStartScrollY
      : estimatedHeaderTransitionStartScrollY;

  // iOS status bar (safe-area chrome) should be readable over the hero image.
  // Keep it light while the hero is visible; switch to dark once the header becomes opaque.
  const statusBarStyle = useScrollLinkedStatusBarStyle(scrollY, headerTransitionStartScrollY, {
    enabled: isFocused,
    initialStyle: 'light',
    inactiveStyle: 'dark',
    hysteresisPx: 12,
    platform: 'ios',
  });

  // Header background should be fully opaque exactly when the sheet top reaches the header
  // so it cleanly hides whatever is underneath.
  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [
      Math.max(0, headerTransitionStartScrollY - SHEET_HEADER_TRANSITION_RANGE_PX),
      headerTransitionStartScrollY,
    ],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Keep a separate progress for pill material (so we can still ease it after the
  // header has already become opaque).
  const headerPillProgress = scrollY.interpolate({
    inputRange: [
      headerTransitionStartScrollY,
      headerTransitionStartScrollY + SHEET_HEADER_TRANSITION_RANGE_PX,
    ],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Fade the hero out so it reaches 0 opacity exactly when the sheet top touches the
  // bottom of the fixed header (the start of the header transition).
  const HERO_FADE_LEAD_PX = 160;
  const HERO_FADE_HOLD_PX = 50;

  // Ensure monotonic input ranges for interpolation (Animated can behave oddly when
  // input ranges collapse or invert).
  const heroFadeEndScrollY = Math.max(1, headerTransitionStartScrollY);
  const heroFadeStartScrollY = Math.min(
    Math.max(HERO_FADE_HOLD_PX, heroFadeEndScrollY - HERO_FADE_LEAD_PX),
    heroFadeEndScrollY - 1,
  );

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, heroFadeStartScrollY, heroFadeEndScrollY],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const headerActionPillOpacity = headerPillProgress.interpolate({
    inputRange: [0, 1],
    // Keep a faint pill even once the header is solid so the actions feel consistent.
    outputRange: [1, 0.2],
    extrapolate: 'clamp',
  });

  // The hero is inside the scroll content, so it already moves at 1x scroll speed.
  // Translate it down by +0.5x scroll to net out to ~0.5x upward movement (Airbnb-like parallax).
  const heroParallaxTranslateY = Animated.multiply(scrollY, 0.5);

  // Goal:Plan quick add dock (reuse the Activities quick-add pattern).
  // Goal detail renders the collapsed trigger inline in the Activities section (vs an absolute bottom dock),
  // so we do NOT reserve scroll space for it.
  const quickAddBottomPadding = Math.max(insets.bottom, spacing.sm);
  const quickAddInitialReservedHeightPx = 0;
  const quickAddToastBottomOffsetPx = quickAddBottomPadding + spacing.lg;
  const [quickAddReminderSheetVisible, setQuickAddReminderSheetVisible] = useState(false);
  const [quickAddDueDateSheetVisible, setQuickAddDueDateSheetVisible] = useState(false);
  const [quickAddRepeatSheetVisible, setQuickAddRepeatSheetVisible] = useState(false);
  const [quickAddEstimateSheetVisible, setQuickAddEstimateSheetVisible] = useState(false);
  const [quickAddIsDueDatePickerVisible, setQuickAddIsDueDatePickerVisible] = useState(false);
  const [quickAddIsReminderDateTimePickerVisible, setQuickAddIsReminderDateTimePickerVisible] =
    useState(false);
  const [quickAddEstimateDraftMinutes, setQuickAddEstimateDraftMinutes] = useState<number>(30);

  const {
    value: quickAddTitle,
    setValue: setQuickAddTitle,
    inputRef: quickAddInputRef,
    isFocused: isQuickAddFocused,
    setIsFocused: setQuickAddFocused,
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
    goalId,
    activitiesCount: activities.length,
    getNextOrderIndex: () => {
      // Append to the bottom of this goal's active list when using manual ordering.
      // (Using `activities.length` can insert into the middle when `orderIndex` has gaps.)
      let max = -1;
      for (const a of activities) {
        if ((a.goalId ?? null) !== (goalId ?? null)) continue;
        if (a.status === 'done' || a.status === 'cancelled') continue;
        const v = typeof a.orderIndex === 'number' && Number.isFinite(a.orderIndex) ? a.orderIndex : -1;
        if (v > max) max = v;
      }
      return max + 1;
    },
    addActivity,
    updateActivity,
    recordShowUp,
    showToast,
    enrichActivityWithAI,
    initialReservedHeightPx: quickAddInitialReservedHeightPx,
    toastBottomOffsetOverridePx: quickAddToastBottomOffsetPx,
    focusAfterSubmit: false,
    onCreated: (activity) => {
      capture(AnalyticsEvent.ActivityCreated, {
        source: 'goal_detail_quick_add',
        activity_id: activity.id,
        goal_id: goalId,
      });

      // Bring the user straight into the "form" so AI-filled details (notes/steps/tags/estimates)
      // are immediately visible and editable.
      handleOpenActivityDetail(activity.id);

      // After creating a new activity, scroll so the Activities list is in full view.
      // (Hard-jumping to the bottom feels disorienting.)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const y = activitiesHeaderOffset;
          if (typeof y === 'number' && Number.isFinite(y)) {
            // `GoalHeader` overlays the scroll surface, so the "top of view" for content
            // is actually *below* the header region. Compensate so the Activities title
            // is visible (not tucked under the header).
            const targetY = Math.max(0, y - (HEADER_BOTTOM_Y + spacing.sm));
            scrollRef.current?.scrollTo({ y: targetY, animated: true });
          }
        });
      });
    },
  });

  useEffect(() => {
    if (!quickAddEstimateSheetVisible) return;
    const seed =
      quickAddEstimateMinutes != null && quickAddEstimateMinutes > 0 ? quickAddEstimateMinutes : 30;
    setQuickAddEstimateDraftMinutes(Math.max(15, Math.round(seed)));
  }, [quickAddEstimateMinutes, quickAddEstimateSheetVisible]);

  useEffect(() => {
    // Ensure the keyboard doesn't compete with the tool drawers.
    if (quickAddReminderSheetVisible || quickAddDueDateSheetVisible || quickAddRepeatSheetVisible || quickAddEstimateSheetVisible) {
      setQuickAddFocused(false);
    }
  }, [quickAddDueDateSheetVisible, quickAddEstimateSheetVisible, quickAddReminderSheetVisible, quickAddRepeatSheetVisible, setQuickAddFocused]);

  const getInitialQuickAddReminderDateTime = useCallback(() => {
    if (quickAddReminderAt) return new Date(quickAddReminderAt);
    const base = new Date();
    base.setMinutes(0, 0, 0);
    base.setHours(base.getHours() + 1);
    return base;
  }, [quickAddReminderAt]);

  const setQuickAddReminderByOffsetDays = useCallback(
    (offsetDays: number, hours: number, minutes: number) => {
      const date = new Date();
      date.setDate(date.getDate() + offsetDays);
      date.setHours(hours, minutes, 0, 0);
      setQuickAddReminderAt(date.toISOString());
      closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
      setQuickAddIsReminderDateTimePickerVisible(false);
    },
    [closeQuickAddToolDrawer, setQuickAddReminderAt],
  );

  const clearQuickAddReminder = useCallback(() => {
    setQuickAddReminderAt(null);
    closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
    setQuickAddIsReminderDateTimePickerVisible(false);
  }, [closeQuickAddToolDrawer, setQuickAddReminderAt]);

  const getInitialQuickAddDueDate = useCallback(() => {
    if (quickAddScheduledDate) return new Date(quickAddScheduledDate);
    return new Date();
  }, [quickAddScheduledDate]);

  const setQuickAddDueDateByOffsetDays = useCallback(
    (offsetDays: number) => {
      const date = new Date();
      date.setDate(date.getDate() + offsetDays);
      date.setHours(23, 0, 0, 0);
      setQuickAddScheduledDate(date.toISOString());
      closeQuickAddToolDrawer(() => setQuickAddDueDateSheetVisible(false));
      setQuickAddIsDueDatePickerVisible(false);
    },
    [closeQuickAddToolDrawer, setQuickAddScheduledDate],
  );

  const clearQuickAddDueDate = useCallback(() => {
    setQuickAddScheduledDate(null);
    closeQuickAddToolDrawer(() => setQuickAddDueDateSheetVisible(false));
    setQuickAddIsDueDatePickerVisible(false);
  }, [closeQuickAddToolDrawer, setQuickAddScheduledDate]);
  const scrollRef = useRef<KeyboardAwareScrollViewHandle | null>(null);
  const pageContentRef = useRef<View | null>(null);
  const activitiesHeaderRef = useRef<View | null>(null);
  const [activitiesHeaderOffset, setActivitiesHeaderOffset] = useState<number | null>(null);
  const addActivitiesButtonRef = useRef<View>(null);
  const [isAddActivitiesButtonReady, setIsAddActivitiesButtonReady] = useState(false);
  const [addActivitiesButtonOffset, setAddActivitiesButtonOffset] = useState<number | null>(null);
  const vectorsSectionRef = useRef<View | null>(null);
  const [vectorsSectionOffset, setVectorsSectionOffset] = useState<number | null>(null);
  /**
   * We only want to "spotlight" the + button when the user arrives to Plan via
   * the onboarding handoff (mirrors the Arc → Goals coachmark pattern).
   */
  const [shouldPromptAddActivity, setShouldPromptAddActivity] = useState(false);
  const [hasTransitionedFromActivitiesGuide, setHasTransitionedFromActivitiesGuide] = useState(false);
  const [hasTransitionedFromPostGoalPlanGuide, setHasTransitionedFromPostGoalPlanGuide] = useState(false);

  const { openForScreenContext, openForFieldContext, AgentWorkspaceSheet } = useAgentLauncher();
  const [thumbnailSheetVisible, setThumbnailSheetVisible] = useState(false);
  const [refineGoalSheetVisible, setRefineGoalSheetVisible] = useState(false);
  const [goalTargetDateSheetVisible, setGoalTargetDateSheetVisible] = useState(false);
  const [goalTargetDateSheetStep, setGoalTargetDateSheetStep] = useState<'menu' | 'picker'>('menu');
  const [goalStatusSheetVisible, setGoalStatusSheetVisible] = useState(false);

  const handleBack = () => {
    const nav: any = navigation;

    // Prefer stack back for a smooth, consistent slide transition whenever
    // possible (both from the Arcs stack and the Goals stack).
    if (nav && typeof nav.canGoBack === 'function' && nav.canGoBack()) {
      nav.goBack();
      return;
    }

    // Fallback: if something unexpected happens with the stack history, route
    // back to a safe top-level canvas based on the entry point hint.
    if (nav && typeof nav.getParent === 'function') {
      const parent = nav.getParent();
      if (parent && typeof parent.navigate === 'function') {
        if (entryPoint === 'arcsStack') {
          parent.navigate('MainTabs', {
            screen: 'MoreTab',
            params: { screen: 'MoreArcs', params: { screen: 'ArcsList' } },
          });
        } else {
          parent.navigate('MainTabs', {
            screen: 'GoalsTab',
            params: { screen: 'GoalsList' },
          });
        }
        return;
      }
    }
    if (nav && typeof nav.navigate === 'function') {
      if (entryPoint === 'arcsStack') {
        nav.navigate('MainTabs', {
          screen: 'MoreTab',
          params: { screen: 'MoreArcs', params: { screen: 'ArcsList' } },
        });
      } else {
        nav.navigate('MainTabs', {
          screen: 'GoalsTab',
          params: { screen: 'GoalsList' },
        });
      }
    }
  };

  const goal = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);
  const arc = useMemo(() => arcs.find((a) => a.id === goal?.arcId), [arcs, goal?.arcId]);

  const [sharedMembers, setSharedMembers] = useState<SharedMember[] | null>(null);
  const [sharedMembersBusy, setSharedMembersBusy] = useState(false);
  const [membersSheetVisible, setMembersSheetVisible] = useState(false);
  const [membersSheetTab, setMembersSheetTab] = useState<'activity' | 'members'>('activity');
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [leaveSharedGoalBusy, setLeaveSharedGoalBusy] = useState(false);

  // Determine if this is a shared goal (has members beyond just the current user)
  const isSharedGoal = useMemo(() => {
    return Array.isArray(sharedMembers) && sharedMembers.length > 1;
  }, [sharedMembers]);

  // Open the activity sheet if requested via route param (e.g., from activity completion nudge)
  useEffect(() => {
    if (openActivitySheet && isFocused) {
      // Small delay to let the screen settle before showing the sheet
      const timer = setTimeout(() => {
        setMembersSheetVisible(true);
        setMembersSheetTab('activity');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [openActivitySheet, isFocused]);

  const canLeaveSharedGoal = useMemo(() => {
    const uid = authIdentity?.userId ?? '';
    if (!uid) return false;
    if (!Array.isArray(sharedMembers) || sharedMembers.length === 0) return false;
    return sharedMembers.some((m) => m.userId === uid);
  }, [authIdentity?.userId, sharedMembers]);

  useEffect(() => {
    let cancelled = false;
    if (!isFocused) return;
    if (!goalId) return;

    setSharedMembersBusy(true);
    listGoalMembers(goalId)
      .then((members) => {
        if (cancelled) return;
        setSharedMembers(members);
      })
      .catch(() => {
        if (cancelled) return;
        // Best-effort: do not surface errors in the core canvas.
        setSharedMembers(null);
      })
      .finally(() => {
        if (cancelled) return;
        setSharedMembersBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [goalId, isFocused]);

  const headerAvatars = useMemo(() => {
    if (Array.isArray(sharedMembers) && sharedMembers.length > 0) {
      return sharedMembers.map((m) => ({ id: m.userId, name: m.name ?? null, avatarUrl: m.avatarUrl ?? null }));
    }
    const fallbackId = authIdentity?.userId || userProfile?.id || 'local';
    const fallbackName = authIdentity?.name || userProfile?.fullName || 'You';
    const fallbackAvatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl || null;
    return [{ id: String(fallbackId), name: fallbackName, avatarUrl: fallbackAvatarUrl }];
  }, [authIdentity?.avatarUrl, authIdentity?.name, authIdentity?.userId, sharedMembers, userProfile?.avatarUrl, userProfile?.fullName, userProfile?.id]);

  const setGoalTargetDateByOffsetDays = useCallback(
    (offsetDays: number) => {
      if (!goal?.id) return;
      const date = new Date();
      date.setDate(date.getDate() + offsetDays);
      date.setHours(23, 0, 0, 0);
      const timestamp = new Date().toISOString();
      updateGoal(goal.id, (prev) => ({
        ...prev,
        targetDate: date.toISOString(),
        qualityState: prev.metrics && prev.metrics.length > 0 ? 'ready' : 'draft',
        updatedAt: timestamp,
      }));
      setGoalTargetDateSheetVisible(false);
      setGoalTargetDateSheetStep('menu');
    },
    [goal?.id, updateGoal],
  );

  const clearGoalTargetDate = useCallback(() => {
    if (!goal?.id) return;
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      targetDate: undefined,
      qualityState: 'draft',
      updatedAt: timestamp,
    }));
    setGoalTargetDateSheetVisible(false);
    setGoalTargetDateSheetStep('menu');
  }, [goal?.id, updateGoal]);

  const getInitialGoalTargetDate = useCallback(() => {
    const existing = goal?.targetDate ? Date.parse(goal.targetDate) : NaN;
    if (Number.isFinite(existing)) return new Date(existing);
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 14);
    fallback.setHours(23, 0, 0, 0);
    return fallback;
  }, [goal?.targetDate]);

  const refineGoalLaunchContext = useMemo(
    () => ({
      source: 'goalDetail' as const,
      intent: 'goalEditing' as const,
      entityRef: { type: 'goal', id: goalId } as const,
      objectType: 'goal' as const,
      objectId: goalId,
    }),
    [goalId],
  );

  const refineGoalWorkspaceSnapshot = useMemo(() => {
    const base =
      buildActivityCoachLaunchContext(goals, activities, goalId, arcs, undefined, undefined) ?? '';
    const metricSummary =
      goal?.metrics && goal.metrics.length > 0
        ? goal.metrics
            .slice(0, 3)
            .map((m) => {
              const kind = (m as any).kind ? ` kind:${(m as any).kind}` : '';
              const target = typeof m.target === 'number' ? ` target:${m.target}` : '';
              const unit = m.unit ? ` unit:${m.unit}` : '';
              const milestoneDone = (m as any).completedAt ? ` done:true` : '';
              return `- ${m.label}${kind}${target}${unit}${milestoneDone}`;
            })
            .join('\n')
        : 'None';

    const extraLines = [
      '',
      '---',
      'TASK: refine the focused goal (do NOT create a different goal).',
      'Return a revised GOAL_PROPOSAL_JSON that makes the goal more specific + timeboxed.',
      'Prefer including both a structured targetDate and 1 metric in metrics if possible.',
      '',
      `Current targetDate: ${goal?.targetDate ?? 'None'}`,
      'Current metrics:',
      metricSummary,
    ].join('\n');

    return `${base}${extraLines}`;
  }, [activities, arcs, goal?.metrics, goal?.targetDate, goalId, goals]);

  const handleApplyRefinedGoal = useCallback(
    (proposal: GoalProposalDraft) => {
      if (!goal?.id) return;
      const now = new Date().toISOString();
      const nextTitle = typeof proposal.title === 'string' ? proposal.title.trim() : '';
      const nextDescription =
        typeof proposal.description === 'string' && proposal.description.trim().length > 0
          ? proposal.description.trim()
          : undefined;
      const nextTargetDate = typeof proposal.targetDate === 'string' ? proposal.targetDate : undefined;
      const nextMetrics = Array.isArray(proposal.metrics) ? proposal.metrics : undefined;
      const nextPriority = proposal.priority;

      updateGoal(goal.id, (prev) => {
        const mergedTargetDate = nextTargetDate ?? prev.targetDate;
        const mergedMetrics = nextMetrics ?? prev.metrics;
        const hasQuality = Boolean(mergedTargetDate) && Array.isArray(mergedMetrics) && mergedMetrics.length > 0;
        return {
          ...prev,
          title: nextTitle || prev.title,
          description: typeof nextDescription === 'string' ? nextDescription : prev.description,
          ...(nextTargetDate ? { targetDate: nextTargetDate } : null),
          ...(nextMetrics ? { metrics: nextMetrics } : null),
          ...(nextPriority !== undefined ? { priority: nextPriority } : null),
          qualityState: hasQuality ? 'ready' : 'draft',
          updatedAt: now,
        };
      });

      showToast({ message: 'Goal refined', variant: 'success', durationMs: 2200 });
      setRefineGoalSheetVisible(false);
    },
    [goal?.id, showToast, updateGoal],
  );

  const performShareGoalInvite = useCallback(async () => {
    try {
      if (!goal) return;
      capture(AnalyticsEvent.ShareInviteChannelSelected, { goalId: goal.id, channel: 'share_sheet' });
      const referralCode = await createReferralCode().catch(() => '');
      const goalImageUrl = (() => {
        const raw = (displayThumbnailUrl ?? '').trim();
        if (!raw) return undefined;
        try {
          const u = new URL(raw);
          // Only include publicly fetchable URLs for OG previews (no file://, ph://, etc).
          if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
          return u.toString();
        } catch {
          return undefined;
        }
      })();

      const { inviteUrl, inviteRedirectUrl, inviteLandingUrl } = await createGoalInvite({
        goalId: goal.id,
        goalTitle: goal.title,
        goalImageUrl,
        kind: 'people',
      });
      const code = extractInviteCode(inviteUrl);
      const open = buildInviteOpenUrl(code);
      const isExpoGo = Constants.appOwnership === 'expo';
      const fallbackTapUrl = inviteRedirectUrl
        ? isExpoGo
          ? `${inviteRedirectUrl}?exp=${encodeURIComponent(open.primary)}`
          : inviteRedirectUrl
        : open.primary;

      // Share-sheet preview needs a URL that returns OG metadata. Our Edge Function does that.
      // Note: this URL may not be a Universal Link host; that's ok for previews, and it still
      // performs a best-effort kwilt:// handoff via HTML.
      const shareUrlBase = inviteRedirectUrl ?? inviteLandingUrl ?? fallbackTapUrl;

      // Tap/open URL for humans: prefer the public landing host (Universal Links) when available.
      const tapUrlBase = inviteLandingUrl ?? fallbackTapUrl;

      const withRef = (rawUrl: string): string => {
        const ref = referralCode.trim();
        if (!rawUrl) return rawUrl;
        if (!ref) return rawUrl;
        try {
          const u = new URL(rawUrl);
          if (!(u.searchParams.get('ref') ?? '').trim()) {
            u.searchParams.set('ref', ref);
          }
          return u.toString();
        } catch {
          const joiner = rawUrl.includes('?') ? '&' : '?';
          return `${rawUrl}${joiner}ref=${encodeURIComponent(ref)}`;
        }
      };

      const tapUrl = withRef(tapUrlBase);
      const shareUrl = withRef(shareUrlBase);

      const title = `Join my shared goal in Kwilt: “${goal.title}”`;
      // Share sheets: on iOS we must share the URL as the primary item to get a rich preview card.
      // On Android, most targets only receive `message`, so include the link there.
      const baseMessage =
        `Join my shared goal in Kwilt: “${goal.title}”.\n\n` +
        `Default sharing: signals only (check-ins + cheers). Activity titles stay private unless we choose to share them.\n\n` +
        `Plus: we’ll both get +25 AI credits when you join.`;
      const message = Platform.OS === 'android' ? baseMessage : undefined;

      await shareUrlWithPreview({
        url: shareUrl,
        message,
        subject: title,
        androidDialogTitle: 'Share goal invite',
      });
    } catch {
      // No-op: Share sheets can be dismissed or unavailable on some platforms.
    }
  }, [capture, goal]);

  const handleShareGoal = useCallback(async () => {
    if (!goal) return;
    if (!authIdentity) {
      // Standard share UX: show a bottom sheet auth gate (not a system Alert).
      setShareSignInSheetVisible(true);
      return;
    }
    await performShareGoalInvite();
  }, [authIdentity, goal, performShareGoalInvite]);

  useEffect(() => {
    // no-op placeholder; reserved for future debug instrumentation
  }, []);

  useEffect(() => {
    // Reset local handoff state when navigating between goals (or replaying onboarding)
    // so the "Your new Goal is ready" guide can show again when eligible.
    setHasTransitionedFromActivitiesGuide(false);
    setShouldPromptAddActivity(false);
    setHasTransitionedFromPostGoalPlanGuide(false);
  }, [goalId]);

  const arcOptions = useMemo<ObjectPickerOption[]>(() => {
    const list = [...arcs];
    list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    return list.map((a) => ({
      value: a.id,
      label: a.name,
      // Keep keywords tight—narratives are long and cause noisy matches for short queries.
      keywords: undefined,
    }));
  }, [arcs]);
  // Goal detail is a single-scroll workboard (no tabs).
  const hasAutoSwitchedToPlanRef = useRef(false);
  const goalActivities = useMemo(
    () => activities.filter((activity) => activity.goalId === goalId),
    [activities, goalId]
  );
  const isPlanEmpty = goalActivities.length === 0;
  const isOnboardingActivitiesHandoffEligible =
    goal?.id === lastOnboardingGoalId &&
    goalActivities.length === 0 &&
    !showFirstGoalCelebration &&
    !hasDismissedOnboardingActivitiesGuide;

  const shouldShowOnboardingActivitiesGuide =
    isOnboardingActivitiesHandoffEligible && !hasTransitionedFromActivitiesGuide;

  const shouldShowOnboardingActivitiesCoachmark =
    isOnboardingActivitiesHandoffEligible &&
    hasTransitionedFromActivitiesGuide &&
    isAddActivitiesButtonReady &&
    shouldPromptAddActivity &&
    !activityCoachVisible &&
    !activityComposerVisible;
  const shouldShowOnboardingPlanReadyGuide =
    goal?.id === lastOnboardingGoalId &&
    goalActivities.length > 0 &&
    !showFirstGoalCelebration &&
    !showOnboardingSharePrompt &&
    !hasDismissedOnboardingPlanReadyGuide &&
    !activityCoachVisible &&
    !activityComposerVisible;

  const shouldShowPostGoalPlanGuide =
    hasCompletedFirstTimeOnboarding &&
    goal?.id != null &&
    goal.id === pendingPostGoalPlanGuideGoalId &&
    !(dismissedPostGoalPlanGuideGoalIds ?? {})[goal.id] &&
    isPlanEmpty &&
    !activityCoachVisible &&
    !activityComposerVisible;

  useEffect(() => {
    if (!goal?.id) return;
    if (!hasCompletedFirstTimeOnboarding) return;
    if (goal.id !== pendingPostGoalPlanGuideGoalId) return;
    if (hasAutoSwitchedToPlanRef.current) return;
    hasAutoSwitchedToPlanRef.current = true;
    setShouldPromptAddActivity(true);
  }, [goal?.id, hasCompletedFirstTimeOnboarding, pendingPostGoalPlanGuideGoalId]);

  const isAnyBottomGuideVisible =
    shouldShowOnboardingActivitiesGuide ||
    shouldShowPostGoalPlanGuide ||
    shouldShowOnboardingPlanReadyGuide;

  const handleOpenActivityCoach = useCallback(() => {
    // Once the user taps into the Activities creation surface, consider the
    // onboarding "add activities" handoff complete so it doesn't re-appear.
    if (isOnboardingActivitiesHandoffEligible) {
      setHasDismissedOnboardingActivitiesGuide(true);
    }
    // Also permanently dismiss the post-goal "create a plan" guide the first time
    // the user enters the Activities creation surface from this goal.
    if (goal?.id && goal.id === pendingPostGoalPlanGuideGoalId) {
      dismissPostGoalPlanGuideForGoal(goal.id);
    }
    setHasSeenPostGoalPlanCoachmark(true);
    setShouldPromptAddActivity(false);
    setHasTransitionedFromPostGoalPlanGuide(false);
    setActivityCoachVisible(true);
  }, [
    dismissPostGoalPlanGuideForGoal,
    goal?.id,
    isOnboardingActivitiesHandoffEligible,
    pendingPostGoalPlanGuideGoalId,
    setHasDismissedOnboardingActivitiesGuide,
    setHasSeenPostGoalPlanCoachmark,
  ]);

  const shouldShowPostGoalPlanCoachmark =
    hasTransitionedFromPostGoalPlanGuide &&
    !hasSeenPostGoalPlanCoachmark &&
    hasCompletedFirstTimeOnboarding &&
    isPlanEmpty &&
    isAddActivitiesButtonReady &&
    shouldPromptAddActivity &&
    !activityCoachVisible &&
    !activityComposerVisible;

  const shouldShowAddActivitiesCoachmark =
    (shouldShowOnboardingActivitiesCoachmark || shouldShowPostGoalPlanCoachmark) &&
    !isAnyBottomGuideVisible &&
    addActivitiesButtonOffset != null;

  const measureActivitiesHeaderOffset = useCallback(() => {
    const node = activitiesHeaderRef.current;
    const container = pageContentRef.current;
    if (!node || !container) return;
    const nodeHandle = findNodeHandle(node);
    const containerHandle = findNodeHandle(container);
    if (!nodeHandle || !containerHandle) return;
    // Compute Y relative to the scroll content root (not the local parent layout),
    // so we can scroll to the correct content-space offset.
    UIManager.measureLayout(
      nodeHandle,
      containerHandle,
      () => {},
      (_x, y) => {
        if (typeof y === 'number' && Number.isFinite(y)) {
          setActivitiesHeaderOffset(y);
        }
      },
    );
  }, []);

  const measureAddActivitiesButtonOffset = useCallback(() => {
    const node = addActivitiesButtonRef.current;
    const container = pageContentRef.current;
    if (!node || !container) return;
    const nodeHandle = findNodeHandle(node);
    const containerHandle = findNodeHandle(container);
    if (!nodeHandle || !containerHandle) return;
    // Compute Y relative to the scroll content root (not the local parent layout),
    // so we can scroll to the correct content-space offset.
    UIManager.measureLayout(
      nodeHandle,
      containerHandle,
      () => {},
      (_x, y) => {
        if (typeof y === 'number' && Number.isFinite(y)) {
          setAddActivitiesButtonOffset(y);
        }
      },
    );
  }, []);

  useEffect(() => {
    // If the target is ready and we intend to show a coachmark, re-measure once
    // to get a stable content-relative Y.
    if (!isAddActivitiesButtonReady) return;
    if (!shouldShowOnboardingActivitiesCoachmark && !shouldShowPostGoalPlanCoachmark) return;
    requestAnimationFrame(() => {
      measureAddActivitiesButtonOffset();
    });
  }, [
    isAddActivitiesButtonReady,
    measureAddActivitiesButtonOffset,
    shouldShowOnboardingActivitiesCoachmark,
    shouldShowPostGoalPlanCoachmark,
  ]);

  const targetScrollY = useMemo(() => {
    if (addActivitiesButtonOffset == null) return null;
    // Place the target high enough that the coachmark bubble (placement="below")
    // has room to render without pushing the CTA out of view—especially on short devices.
    // Tuned to avoid over-scrolling on tall devices while still being safe on small screens.
    // - Lower on screen => less scroll
    // - Always keep it below the header region
    const desiredTargetTopPx = Math.max(
      220,
      Math.min(360, Math.max(HEADER_BOTTOM_Y + 120, windowHeight * 0.32)),
    );
    return Math.max(0, addActivitiesButtonOffset - desiredTargetTopPx);
  }, [addActivitiesButtonOffset, windowHeight, HEADER_BOTTOM_Y]);

  const addActivitiesCoachmarkHost = useCoachmarkHost({
    active: shouldShowAddActivitiesCoachmark,
    stepKey: shouldShowOnboardingActivitiesCoachmark ? 'onboardingActivities' : 'postGoalPlanActivities',
    targetScrollY,
    scrollTo: (args) => scrollRef.current?.scrollTo(args),
  });

  const scrollEnabledWhileGuiding = addActivitiesCoachmarkHost.scrollEnabled;
  const activeGoalActivities = useMemo(
    () => goalActivities.filter((activity) => activity.status !== 'done'),
    [goalActivities]
  );
  const completedGoalActivities = useMemo(
    () => goalActivities.filter((activity) => activity.status === 'done'),
    [goalActivities]
  );

  const [completedActivitiesExpanded, setCompletedActivitiesExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleCompletedActivitiesExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCompletedActivitiesExpanded((current) => !current);
  }, []);

  const goalProgressSignals = useMemo<GoalProgressSignal[]>(() => {
    const nowMs = Date.now();
    const weekAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
    const targetDateLabelLocal = goal?.targetDate
      ? new Date(goal.targetDate).toLocaleDateString(undefined, {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
        })
      : undefined;

    const doneWithTimestamps = completedGoalActivities
      .map((activity) => {
        const completedAt = activity.completedAt ?? activity.updatedAt ?? activity.createdAt ?? null;
        const completedAtMs = completedAt ? Date.parse(completedAt) : NaN;
        return { activity, completedAtMs };
      })
      .filter((entry) => Number.isFinite(entry.completedAtMs));

    const doneLast7Days = doneWithTimestamps.filter((entry) => entry.completedAtMs >= weekAgoMs).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const nextScheduled = goalActivities
      .map((activity) => {
        const scheduledAt = activity.scheduledDate ?? null;
        const scheduledAtMs = scheduledAt ? Date.parse(scheduledAt) : NaN;
        return { scheduledAt, scheduledAtMs };
      })
      .filter((entry) => Number.isFinite(entry.scheduledAtMs) && entry.scheduledAtMs >= todayStartMs)
      .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs)[0]?.scheduledAt;

    const nextScheduledLabel = nextScheduled
      ? (() => {
          const d = new Date(nextScheduled);
          const diffDays = Math.round((d.getTime() - todayStartMs) / (24 * 60 * 60 * 1000));
          if (diffDays === 0) return 'Today';
          if (diffDays === 1) return 'Tomorrow';
          return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
        })()
      : null;

    const targetValue = (() => {
      if (!goal?.targetDate) return 'No date';
      const targetMs = Date.parse(goal.targetDate);
      if (!Number.isFinite(targetMs)) return targetDateLabelLocal ?? 'No date';
      const diffDays = Math.ceil((targetMs - nowMs) / (24 * 60 * 60 * 1000));
      const absDiff = Math.abs(diffDays);
      // When it's close, show a countdown; otherwise show the date label.
      if (absDiff <= 21) {
        if (diffDays === 0) return 'Due today';
        if (diffDays > 0) return `${diffDays}d left`;
        return `${absDiff}d overdue`;
      }
      return (
        targetDateLabelLocal ??
        new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' })
      );
    })();
    const targetValueColor =
      typeof targetValue === 'string' && targetValue.includes('overdue')
        ? colors.destructive
        : targetValue === 'No date'
          ? colors.gray600
          : typeof targetValue === 'string' && (targetValue.includes('left') || targetValue.includes('Due today'))
            ? colors.indigo600
            : colors.textPrimary;
    const momentumValueColor = doneLast7Days > 0 ? colors.indigo600 : colors.gray600;

    const signals: GoalProgressSignal[] = [
      {
        id: 'goal-signal-plan',
        value: `${completedGoalActivities.length}/${goalActivities.length}`,
        label: 'Done',
        accessibilityLabel: `Plan: ${completedGoalActivities.length} of ${goalActivities.length} done`,
        valueColor:
          goalActivities.length > 0 && completedGoalActivities.length === goalActivities.length
            ? colors.indigo600
            : colors.textPrimary,
      },
      {
        id: 'goal-signal-momentum',
        value: `${doneLast7Days}`,
        label: 'This week',
        accessibilityLabel: `${doneLast7Days} activities done in the last 7 days`,
        valueColor: momentumValueColor,
      },
      {
        id: 'goal-signal-target',
        value: targetValue,
        label: 'Finish by',
        onPress: () => {
          setGoalTargetDateSheetStep('menu');
          setGoalTargetDateSheetVisible(true);
        },
        accessibilityLabel: `Finish by: ${targetValue}. Tap to set a finish date.`,
        valueColor: targetValueColor,
      },
    ];

    if (nextScheduledLabel) {
      signals.push({
        id: 'goal-signal-next',
        value: nextScheduledLabel,
        label: 'Next',
      });
    }

    return signals;
  }, [completedGoalActivities, goal, goalActivities]);
  const firstPlanActivityId = useMemo(() => {
    const list = [...activeGoalActivities];
    if (list.length === 0) return goalActivities[0]?.id ?? null;
    list.sort((a, b) => {
      const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      const createdA = a.createdAt ?? '';
      const createdB = b.createdAt ?? '';
      return createdA.localeCompare(createdB);
    });
    return list[0]?.id ?? null;
  }, [activeGoalActivities, goalActivities]);

  const handleToggleActivityComplete = useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      let didFireHaptic = false;
      let wasCompleted = false;
      updateActivity(activityId, (activity) => {
        const nextIsDone = activity.status !== 'done';
        if (!didFireHaptic) {
          didFireHaptic = true;
          void HapticsService.trigger(nextIsDone ? 'outcome.bigSuccess' : 'canvas.primary.confirm');
        }
        wasCompleted = nextIsDone;
        return {
          ...activity,
          status: nextIsDone ? 'done' : 'planned',
          completedAt: nextIsDone ? timestamp : null,
          updatedAt: timestamp,
        };
      });
      // Fire progress signal for shared goals (fire-and-forget)
      if (wasCompleted && goalId) {
        void createProgressSignal({ goalId, type: 'progress_made' });
      }
    },
    [updateActivity, goalId]
  );

  const handleOpenActivityDetail = useCallback(
    (activityId: string) => {
      if (!canOpenActivityDetail()) {
        return;
      }
      const nav: any = navigation;
      if (nav && typeof nav.navigate === 'function') {
        nav.navigate('ActivityDetailFromGoal', {
          activityId,
          entryPoint: 'goalPlan',
        });
      }
    },
    [canOpenActivityDetail, navigation],
  );

  const handleToggleActivityPriorityOne = useCallback(
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
    [updateActivity]
  );

  const heroSeed = useMemo(
    () =>
      buildArcThumbnailSeed(goal?.id, goal?.title, goal?.thumbnailVariant),
    [goal?.id, goal?.title, goal?.thumbnailVariant]
  );
  const { colors: heroGradientColors, direction: heroGradientDirection } = useMemo(
    () => getArcGradient(heroSeed),
    [heroSeed]
  );
  const heroTopoSizes = useMemo(() => getArcTopoSizes(heroSeed), [heroSeed]);
  const thumbnailStyle =
    effectiveThumbnailStyles.length > 0 ? pickThumbnailStyle(heroSeed, effectiveThumbnailStyles) : null;
  const showTopography = false;
  const showGeoMosaic = thumbnailStyle === 'geoMosaic';
  const goalHeroUri = useHeroImageUrl(goal);
  const arcHeroUri = useHeroImageUrl(arc);
  const hasCustomThumbnail = Boolean(goalHeroUri);
  const shouldShowGeoMosaic = showGeoMosaic && !hasCustomThumbnail;
  const displayThumbnailUrl = goalHeroUri ?? arcHeroUri;
  const heroAttributionMeta = goalHeroUri ? goal?.heroImageMeta : arc?.heroImageMeta;

  if (!goal) {
    if (!domainHydrated) {
      return (
        <AppShell>
          <VStack space="md">
            <Button
              size="icon"
                  variant="secondary"
                  iconButtonSize={36}
                  style={styles.backButton}
              onPress={handleBack}
              accessibilityLabel="Back"
            >
                  <Icon name="arrowLeft" size={20} color={colors.textPrimary} />
            </Button>
            <View style={{ paddingTop: spacing.md }}>
              <ActivityIndicator color={colors.textPrimary} />
              <Text style={{ marginTop: spacing.lg }}>Loading Goal…</Text>
            </View>
          </VStack>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <VStack space="md">
          <Button
            size="icon"
            variant="secondary"
            iconButtonSize={36}
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={20} color={colors.textPrimary} />
          </Button>
          <Text style={styles.emptyBody}>Goal not found.</Text>
        </VStack>
      </AppShell>
    );
  }

  useEffect(() => {
    setEditForceIntent({ ...defaultForceLevels(0), ...goal.forceIntent });
  }, [goal]);

  useEffect(() => {
    // Lightweight evangelism prompt: once the user creates their *first*
    // onboarding activities, invite them to share for social accountability.
    // Only trigger on the transition 0 → >0 activities.
    // Note: we intentionally keep this non-blocking and skippable.
    const prev = onboardingSharePrevActivityCountRef.current;
    const next = goalActivities.length;
    // On first mount for a given goal, seed the ref and do nothing. Otherwise,
    // any goal that already has activities would look like a "0 → >0" transition.
    if (prev === null) {
      onboardingSharePrevActivityCountRef.current = next;
      return;
    }
    onboardingSharePrevActivityCountRef.current = next;

    if (
      prev === 0 &&
      next > 0 &&
      goal.id === lastOnboardingGoalId &&
      !hasSeenOnboardingSharePrompt
    ) {
      // Handoff first: switch to the Plan canvas so the user sees their newly
      // created Activities, then queue the share prompt after the plan-ready
      // guide has had a chance to run.
      setPendingOnboardingSharePrompt(true);
    }
  }, [
    goalActivities.length,
    goal.id,
    lastOnboardingGoalId,
    hasSeenOnboardingSharePrompt,
  ]);

  useEffect(() => {
    if (!showFirstGoalCelebration) return;
    // When replaying the celebration (especially via DevTools), ensure we start
    // on the Goal Details canvas so the onboarding guide can orient the user
    // before we move them into the Activities plan.
    setActivityCoachVisible(false);
    setActivityComposerVisible(false);
  }, [showFirstGoalCelebration]);

  useEffect(() => {
    if (!showFirstGoalCelebration) {
      firstGoalCelebrationHapticPlayedRef.current = false;
      return;
    }
    if (firstGoalCelebrationHapticPlayedRef.current) return;
    firstGoalCelebrationHapticPlayedRef.current = true;
    void HapticsService.trigger('outcome.success');
  }, [showFirstGoalCelebration]);

  useEffect(() => {
    // While the full-screen celebration is up, suppress toasts so we don't
    // stack transient UI over an interstitial.
    setToastsSuppressed({
      key: 'goal_created_interstitial',
      suppressed: showFirstGoalCelebration,
    });
    return () => {
      setToastsSuppressed({ key: 'goal_created_interstitial', suppressed: false });
    };
  }, [setToastsSuppressed, showFirstGoalCelebration]);

  useEffect(() => {
    if (!pendingOnboardingSharePrompt) return;
    if (hasSeenOnboardingSharePrompt) {
      setPendingOnboardingSharePrompt(false);
      return;
    }
    // Only show this prompt when this screen is actively focused. GoalDetailScreen can remain
    // mounted underneath other stack screens (e.g. Activity detail), and showing a Modal while
    // unfocused can feel like the UI has become "untappable".
    if (!isFocused) return;
    // Wait until the plan-ready handoff has been dismissed so we don't stack guidance.
    if (shouldShowOnboardingPlanReadyGuide) return;
    if (showFirstGoalCelebration) return;

    setShowOnboardingSharePrompt(true);
    setHasSeenOnboardingSharePrompt(true);
    setPendingOnboardingSharePrompt(false);
  }, [
    pendingOnboardingSharePrompt,
    hasSeenOnboardingSharePrompt,
    setHasSeenOnboardingSharePrompt,
    isFocused,
    shouldShowOnboardingPlanReadyGuide,
    showFirstGoalCelebration,
  ]);

  useEffect(() => {
    // Safety valve: never allow a queued onboarding prompt to linger indefinitely.
    // If something goes wrong with the plan-ready handoff dismissal (or a modal stack hiccup),
    // leaving this true can repeatedly re-run effects and contribute to "stuck" reports.
    if (!pendingOnboardingSharePrompt) return;
    const timeoutId = setTimeout(() => {
      setPendingOnboardingSharePrompt(false);
    }, 15000);
    return () => clearTimeout(timeoutId);
  }, [pendingOnboardingSharePrompt]);

  useEffect(() => {
    if (!shouldShowOnboardingPlanReadyGuide) {
      planReadyHapticPlayedRef.current = false;
      return;
    }
    if (planReadyHapticPlayedRef.current) return;
    planReadyHapticPlayedRef.current = true;
    void HapticsService.trigger('outcome.success');
  }, [shouldShowOnboardingPlanReadyGuide]);

  useEffect(() => {
    if (
      goal &&
      lastOnboardingGoalId &&
      goal.id === lastOnboardingGoalId &&
      !hasSeenFirstGoalCelebration
    ) {
      setShowFirstGoalCelebration(true);
    }
  }, [goal, lastOnboardingGoalId, hasSeenFirstGoalCelebration]);

  const startDateLabel = goal.startDate
    ? new Date(goal.startDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const targetDateLabel = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const forceIntent = { ...defaultForceLevels(0), ...goal.forceIntent };
  const liveForceIntent = editingForces ? editForceIntent : forceIntent;

  const statusAppearance = getGoalStatusAppearance(goal.status);
  const statusLabel = statusAppearance.label;

  const updatedAtLabel = goal.updatedAt
    ? new Date(goal.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const createdAtLabel = goal.createdAt
    ? new Date(goal.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  type GoalHistoryEventKind =
    | 'goalCreated'
    | 'goalCompleted'
    | 'activityCreated'
    | 'activityCompleted';

  type GoalHistoryEvent = {
    id: string;
    kind: GoalHistoryEventKind;
    timestamp: string;
    title: string;
    dateLabel: string;
    meta?: string;
  };

  const historyEvents: GoalHistoryEvent[] = useMemo(() => {
    const events: GoalHistoryEvent[] = [];

    const formatDateLabel = (timestamp: string) =>
      new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    // Goal created milestone
    events.push({
      id: `goal-created-${goal.id}`,
      kind: 'goalCreated',
      timestamp: goal.createdAt,
      title: 'Goal created',
      dateLabel: formatDateLabel(goal.createdAt),
      meta: undefined,
    });

    // Goal completed milestone
    if (goal.status === 'completed') {
      const completedTimestamp = goal.updatedAt ?? goal.createdAt;
      events.push({
        id: `goal-completed-${goal.id}`,
        kind: 'goalCompleted',
        timestamp: completedTimestamp,
        title: 'Goal marked complete',
        dateLabel: formatDateLabel(completedTimestamp),
        meta: undefined,
      });
    }

    // Activity added events
    goalActivities.forEach((activity) => {
      const createdAt = activity.createdAt;
      if (!createdAt) {
        return;
      }

      const metaParts: string[] = [];
      if (activity.creationSource === 'ai') {
        metaParts.push('Added from AI plan');
      }

      events.push({
        id: `activity-created-${activity.id}`,
        kind: 'activityCreated',
        timestamp: createdAt,
        title: activity.title || 'Activity added',
        dateLabel: formatDateLabel(createdAt),
        meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      });
    });

    // Activity completion events
    completedGoalActivities.forEach((activity) => {
      if (!activity.completedAt) {
        return;
      }
      const minutes = activity.actualMinutes ?? undefined;

      const metaParts: string[] = [];
      if (minutes && minutes > 0) {
        const hours = minutes / 60;
        if (hours >= 1) {
          const rounded = Math.round(hours * 10) / 10;
          metaParts.push(`${rounded} hr${rounded === 1 ? '' : 's'}`);
        } else {
          metaParts.push(`${minutes} min`);
        }
      }

      events.push({
        id: `activity-completed-${activity.id}`,
        kind: 'activityCompleted',
        timestamp: activity.completedAt,
        title: activity.title || 'Activity completed',
        dateLabel: formatDateLabel(activity.completedAt),
        meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
      });
    });

    // Newest first
    return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [goal, goalActivities, completedGoalActivities]);

  const handleShuffleGoalThumbnail = useCallback(() => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      thumbnailUrl: prev.thumbnailUrl,
      thumbnailVariant: (prev.thumbnailVariant ?? 0) + 1,
      updatedAt: timestamp,
    }));
  }, [goal.id, updateGoal]);

  const handleUploadGoalThumbnail = useCallback(async () => {
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
        entityType: 'goal',
        entityId: goal.id,
        mimeType: typeof (asset as any)?.mimeType === 'string' ? ((asset as any).mimeType as string) : null,
      });
      await uploadHeroImageToSignedUrl({
        signedUrl: uploadSignedUrl,
        fileUri: asset.uri,
        mimeType: typeof (asset as any)?.mimeType === 'string' ? ((asset as any).mimeType as string) : null,
      });
      const nowIso = new Date().toISOString();
      updateGoal(goal.id, (prev) => ({
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
      // Mirror Arc behavior: close the sheet after a successful upload to
      // return the user to the Goal canvas.
      setThumbnailSheetVisible(false);
    } catch {
      setHeroImageError('Unable to upload image right now.');
    } finally {
      setHeroImageLoading(false);
    }
  }, [goal.id, updateGoal]);

  const handleClearGoalHeroImage = useCallback(() => {
    const nowIso = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      thumbnailUrl: undefined,
      heroImageMeta: undefined,
      updatedAt: nowIso,
    }));
  }, [goal.id, updateGoal]);

  const handleSelectCuratedGoalHero = useCallback(
    (image: ArcHeroImage) => {
      const nowIso = new Date().toISOString();
      updateGoal(goal.id, (prev) => ({
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
    [goal.id, updateGoal]
  );

  const handleSelectUnsplashGoalHero = useCallback(
    (photo: UnsplashPhoto) => {
      const nowIso = new Date().toISOString();
      updateGoal(goal.id, (prev) => ({
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
    [goal.id, updateGoal]
  );

  const handleDismissFirstGoalCelebration = () => {
    setShowFirstGoalCelebration(false);
    setHasSeenFirstGoalCelebration(true);
  };

  const handleContinueFirstGoalCelebration = () => {
    setShowFirstGoalCelebration(false);
    setHasSeenFirstGoalCelebration(true);
    // Keep the user on the Goal canvas so the onboarding guide can explain
    // where Activities live before we open any AI/creation surfaces.
    setShouldPromptAddActivity(true);
  };

  const handleDeleteGoal = () => {
    Alert.alert(
      'Delete goal?',
      'This will remove the goal and related activities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'This can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete goal',
                style: 'destructive',
                onPress: () => {
                  removeGoal(goal.id);
                  handleBack();
                },
              },
            ]);
          },
        },
      ],
    );
  };

  const handleToggleArchiveGoal = () => {
    const isArchived = goal.status === 'archived';
    const nextStatus = isArchived ? 'planned' : 'archived';
    const actionLabel = isArchived ? 'Restore' : 'Archive';
    const detail = isArchived
      ? 'This will make the goal active again.'
      : 'Archived goals stay in your history, but won’t count toward your active goal limit.';

    Alert.alert(`${actionLabel} goal?`, detail, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        onPress: () => {
          const timestamp = new Date().toISOString();
          updateGoal(goal.id, (prev) => ({
            ...prev,
            status: nextStatus,
            updatedAt: timestamp,
          }));
          showToast({
            message: isArchived ? 'Goal restored' : 'Goal archived',
            variant: 'success',
            durationMs: 2200,
          });

          // After archiving, return to the previous canvas so users don't end up
          // "stuck" in an archived detail surface.
          if (!isArchived) {
            handleBack();
          }
        },
      },
    ]);
  };

  const handleUpdateArc = (nextArcId: string | null) => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      arcId: nextArcId ?? '',
      updatedAt: timestamp,
    }));
  };

  const commitForceEdit = () => {
    if (!editingForces) return;
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      forceIntent: editForceIntent,
      updatedAt: timestamp,
    }));
    setEditingForces(false);
  };

  const handleToggleForceEdit = () => {
    if (editingForces) {
      commitForceEdit();
      return;
    }
    // Enter edit mode with the latest store values
    setEditForceIntent({ ...defaultForceLevels(0), ...goal.forceIntent });
    setEditingForces(true);
  };

  const handleSetForceLevel = (forceId: string, level: ForceLevel) => {
    setEditForceIntent((prev) => ({
      ...prev,
      [forceId]: level,
    }));
  };

  const handleCreateActivityFromPlan = (values: { title: string; notes?: string; type: ActivityType }) => {
    const trimmedTitle = values.title.trim();
    if (!trimmedTitle) {
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const nextActivity: Activity = {
      id,
      goalId: goal.id,
      title: trimmedTitle,
      type: values.type,
      tags: [],
      notes: values.notes?.trim().length ? values.notes.trim() : undefined,
      steps: [],
      reminderAt: null,
      priority: undefined,
      estimateMinutes: null,
      creationSource: 'manual',
      planGroupId: null,
      scheduledDate: null,
      repeatRule: undefined,
      repeatCustom: undefined,
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

    // Note: Creating activities no longer counts as "showing up" for streaks.
    // Streaks require completing activities/focus sessions.
    addActivity(nextActivity);
    showToast({ message: 'Activity created', variant: 'success', durationMs: 2200 });
    setActivityComposerVisible(false);

    // Enrich activity with AI details asynchronously
    enrichActivityWithAI({
      activityId: nextActivity.id,
      title: trimmedTitle,
      goalId: goal.id,
      activityType: values.type,
      existingNotes: values.notes?.trim(),
      existingTags: [],
    })
      .then((enrichment) => {
        if (!enrichment) return;

        const timestamp = new Date().toISOString();
        updateActivity(nextActivity.id, (prev) => {
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
              id: `step-${nextActivity.id}-${idx}`,
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
      .catch((err: unknown) => {
        // Silently fail - activity creation should succeed even if enrichment fails
        if (__DEV__) {
          console.warn('[GoalDetailScreen] Failed to enrich activity:', err);
        }
      });
  };

  return (
    <AppShell fullBleedCanvas>
      <StatusBar style={statusBarStyle} animated />
      {/* ShareGoalDrawer deprecated in vNext share UX; keep removed from render to avoid non-standard flows. */}
      <BottomDrawer
        visible={shareSignInSheetVisible}
        onClose={() => {
          if (shareSignInSheetBusy) return;
          setShareSignInSheetVisible(false);
        }}
        snapPoints={['50%']}
        initialSnapIndex={0}
        dismissable={!shareSignInSheetBusy}
        enableContentPanningGesture
        scrimToken="pineSubtle"
        sheetStyle={styles.shareSignInSheet}
        handleContainerStyle={styles.shareSignInHandleContainer}
        handleStyle={styles.shareSignInHandle}
      >
        <View style={styles.shareSignInContent}>
          <VStack space="md">
            <VStack space="xs">
              <Text style={styles.shareSignInTitle}>Sign in to share</Text>
              <Text style={styles.shareSignInBody}>Sign in to share this goal with an invite link.</Text>
            </VStack>
            <VStack space="sm" style={styles.shareSignInButtonGroup}>
              <Button
                fullWidth
                variant="outline"
                style={styles.shareSignInOutlineButton}
                disabled={shareSignInSheetBusy}
                onPress={async () => {
                  if (shareSignInSheetBusy) return;
                  setShareSignInSheetBusy(true);
                  try {
                    await signInWithProvider('apple');
                    setShareSignInSheetVisible(false);
                    await performShareGoalInvite();
                  } finally {
                    setShareSignInSheetBusy(false);
                  }
                }}
                accessibilityLabel="Continue with Apple to share goal"
              >
                <HStack alignItems="center" justifyContent="center" space="sm">
                  <Icon name="apple" size={18} color={colors.textPrimary} />
                  <Text style={styles.shareAuthButtonLabel}>Continue with Apple</Text>
                </HStack>
              </Button>
              <Button
                fullWidth
                variant="outline"
                style={styles.shareSignInOutlineButton}
                disabled={shareSignInSheetBusy}
                onPress={async () => {
                  if (shareSignInSheetBusy) return;
                  setShareSignInSheetBusy(true);
                  try {
                    await signInWithProvider('google');
                    setShareSignInSheetVisible(false);
                    await performShareGoalInvite();
                  } finally {
                    setShareSignInSheetBusy(false);
                  }
                }}
                accessibilityLabel="Continue with Google to share goal"
              >
                <HStack alignItems="center" justifyContent="center" space="sm">
                  <Icon name="google" size={18} color={colors.textPrimary} />
                  <Text style={styles.shareAuthButtonLabel}>Continue with Google</Text>
                </HStack>
              </Button>
              <Button
                fullWidth
                variant="ghost"
                disabled={shareSignInSheetBusy}
                onPress={() => setShareSignInSheetVisible(false)}
                accessibilityLabel="Cancel"
              >
                <Text style={styles.shareSignInCancelLabel}>Cancel</Text>
              </Button>
            </VStack>
          </VStack>
        </View>
      </BottomDrawer>
      <FullScreenInterstitial
        visible={showFirstGoalCelebration}
        onDismiss={handleDismissFirstGoalCelebration}
        progression="button"
        backgroundColor="indigo"
        transition="fade"
        contentStyle={{
          paddingTop: insets.top + spacing['2xl'],
          paddingBottom: insets.bottom + spacing['2xl'],
          paddingHorizontal: spacing.lg,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.celebrationBadge}>Goal created</Text>
            <Text style={[styles.celebrationTitle, { marginTop: spacing.sm }]}>Nice work.</Text>
            <Text style={[styles.celebrationSubtitle, { marginTop: spacing.sm }]}>
              Your next step is simple: add a couple of Activities so you always know what to do next.
            </Text>
          </View>

          <View style={styles.celebrationMediaSlot}>
            <Image
              source={FIRST_GOAL_ILLUSTRATION as number}
              style={{ width: '100%', maxWidth: 360, height: 280 }}
              resizeMode="contain"
              accessibilityLabel="Goal created illustration"
            />
          </View>

          <View>
            <Button
              fullWidth
              style={styles.celebrationContinueButton}
              onPress={handleContinueFirstGoalCelebration}
              accessibilityLabel="Continue to activities"
            >
              <Text style={styles.celebrationContinueLabel}>Continue</Text>
            </Button>
          </View>
        </View>
      </FullScreenInterstitial>
      <Dialog
        visible={showOnboardingSharePrompt}
        onClose={() => setShowOnboardingSharePrompt(false)}
        title="Invite people to this goal?"
        description="Share an invite link so someone can cheer you on (or keep you honest)."
        footer={
          <HStack space="sm" marginTop={spacing.lg}>
            <Button
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => setShowOnboardingSharePrompt(false)}
            >
              <Text style={styles.secondaryCtaText}>Not now</Text>
            </Button>
            <Button
              style={{ flex: 1 }}
              onPress={async () => {
                try {
                  await handleShareGoal();
                } finally {
                  setShowOnboardingSharePrompt(false);
                }
              }}
            >
              <Text style={styles.primaryCtaText}>Invite people</Text>
            </Button>
          </HStack>
        }
      >
        <Text style={styles.firstGoalBody}>
          By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.
        </Text>
      </Dialog>
      <BottomGuide
        visible={shouldShowOnboardingActivitiesGuide}
        onClose={() => setHasDismissedOnboardingActivitiesGuide(true)}
        scrim="light"
      >
        <Heading variant="sm">Your new Goal is ready</Heading>
        <Text style={styles.onboardingGuideBody}>
          Next, we’ll add 1–3 Activities so you always know what to work on next — and we’ll use AI to help
          plan them out (or you can switch to Manual).
        </Text>
        <HStack space="sm" marginTop={spacing.sm} justifyContent="flex-end">
          <Button
            variant="outline"
            onPress={() => setHasDismissedOnboardingActivitiesGuide(true)}
          >
            <Text style={styles.onboardingGuideSecondaryLabel}>Not now</Text>
          </Button>
          <Button
            variant="turmeric"
            onPress={() => {
              // Mirror the first Arc handoff pattern: take the user to *where* the
              // Activities CTA lives, then coachmark that CTA (no confirmation button).
              setHasTransitionedFromActivitiesGuide(true);
              setShouldPromptAddActivity(true);
            }}
          >
            <Text style={styles.onboardingGuidePrimaryLabel}>Add activities</Text>
          </Button>
        </HStack>
      </BottomGuide>
      <BottomGuide
        visible={shouldShowPostGoalPlanGuide}
        onClose={() => {
          if (goal?.id) {
            dismissPostGoalPlanGuideForGoal(goal.id);
          }
        }}
        scrim="light"
      >
        <Heading variant="sm">Add activities</Heading>
        <Text style={styles.onboardingGuideBody}>
          Want help picking your next few Activities? Tap below to generate a starter plan with AI.
        </Text>
        <HStack space="sm" marginTop={spacing.sm} justifyContent="flex-end">
          <Button
            variant="outline"
            onPress={() => {
              if (goal?.id) {
                dismissPostGoalPlanGuideForGoal(goal.id);
              }
            }}
          >
            <Text style={styles.onboardingGuideSecondaryLabel}>Not now</Text>
          </Button>
          <Button
            variant="turmeric"
            onPress={() => {
              if (goal?.id) {
                dismissPostGoalPlanGuideForGoal(goal.id);
              }
              // Intended flow: dismiss this guide, then spotlight the in-canvas
              // "Add activities" CTA with a coachmark (user taps CTA to open AI or Manual).
              setHasTransitionedFromPostGoalPlanGuide(true);
              setShouldPromptAddActivity(true);
            }}
          >
            <Text style={styles.onboardingGuidePrimaryLabel}>Add activities</Text>
          </Button>
        </HStack>
      </BottomGuide>
      <BottomGuide
        visible={shouldShowOnboardingPlanReadyGuide}
        onClose={() => setHasDismissedOnboardingPlanReadyGuide(true)}
        scrim="light"
      >
        <Heading variant="sm">Your first plan is ready</Heading>
        <Text style={styles.onboardingGuideBody}>
          Great — you've got Activities to start with. Open one and schedule it so it actually happens.
        </Text>
        <HStack space="sm" marginTop={spacing.sm} justifyContent="flex-end">
          <Button
            variant="outline"
            onPress={() => setHasDismissedOnboardingPlanReadyGuide(true)}
          >
            <Text style={styles.onboardingGuideSecondaryLabel}>Not now</Text>
          </Button>
          <Button
            variant="turmeric"
            onPress={() => {
              setHasDismissedOnboardingPlanReadyGuide(true);
              if (firstPlanActivityId) {
                handleOpenActivityDetail(firstPlanActivityId);
              }
            }}
          >
            <Text style={styles.onboardingGuidePrimaryLabel}>Open Activity</Text>
          </Button>
        </HStack>
      </BottomGuide>
      <Coachmark
        visible={addActivitiesCoachmarkHost.coachmarkVisible}
        targetRef={addActivitiesButtonRef}
        remeasureKey={addActivitiesCoachmarkHost.remeasureKey}
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
        title={<Text style={styles.goalCoachmarkTitle}>Add your first activities</Text>}
        body={
          <Text style={styles.goalCoachmarkBody}>
            Tap “Add activities” to generate Activities with AI (or switch to Manual for something you
            already know you should do next).
          </Text>
        }
        actions={[]}
        onDismiss={() => {
          // Coachmarks with `actions={[]}` are typically dismissed by completing the intended action.
          // Still provide a safe fallback in case the component adds dismiss affordances later.
          if (isOnboardingActivitiesHandoffEligible) {
            setHasDismissedOnboardingActivitiesGuide(true);
          }
          setHasSeenPostGoalPlanCoachmark(true);
          setHasTransitionedFromPostGoalPlanGuide(false);
          setShouldPromptAddActivity(false);
        }}
        placement="below"
      />
      {editingForces && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.forceEditOverlay}
          onPress={commitForceEdit}
        />
      )}
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          <View style={{ flex: 1 }}>
            <ObjectPageHeader
              barHeight={GOAL_HEADER_HEIGHT}
              backgroundOpacity={headerBackgroundOpacity}
              actionPillOpacity={headerActionPillOpacity}
              left={
                <HeaderActionPill
                  size={HEADER_ACTION_PILL_SIZE}
                  onPress={handleBack}
                  accessibilityLabel="Back"
                  materialOpacity={headerActionPillOpacity}
                >
                  <Icon name="arrowLeft" size={22} color={colors.textPrimary} />
                </HeaderActionPill>
              }
              right={
                <HStack alignItems="center" space="sm">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View members"
                    hitSlop={12}
                    onPress={() => setMembersSheetVisible(true)}
                    style={styles.headerMembersStandalone}
                  >
                    <OverlappingAvatarStack
                      avatars={headerAvatars}
                      size={HEADER_ACTION_PILL_SIZE}
                      maxVisible={2}
                      overlapPx={18}
                    />
                  </Pressable>
                  <HeaderActionPill
                    accessibilityLabel="Share goal"
                    materialOpacity={headerActionPillOpacity}
                    size={HEADER_ACTION_PILL_SIZE}
                    onPress={handleShareGoal}
                  >
                    <Icon name="share" size={22} color={colors.textPrimary} />
                  </HeaderActionPill>
                  <DropdownMenu>
                    <DropdownMenuTrigger accessibilityLabel="Goal actions">
                      <View pointerEvents="none">
                        <HeaderActionPill
                          accessibilityLabel="Goal actions"
                          materialOpacity={headerActionPillOpacity}
                          size={HEADER_ACTION_PILL_SIZE}
                        >
                          <Icon name="more" size={22} color={colors.textPrimary} />
                        </HeaderActionPill>
                      </View>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                      <DropdownMenuItem onPress={() => setThumbnailSheetVisible(true)}>
                        <View style={menuStyles.menuItemRow}>
                          <Icon name="image" size={16} color={colors.textSecondary} />
                          <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
                            Edit banner
                          </Text>
                        </View>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setRefineGoalSheetVisible(true)}>
                        <View style={menuStyles.menuItemRow}>
                          <Icon name="sparkles" size={16} color={colors.textSecondary} />
                          <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
                            Refine goal with AI
                          </Text>
                        </View>
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={handleToggleArchiveGoal}>
                        <View style={menuStyles.menuItemRow}>
                          <Icon
                            name={goal?.status === 'archived' ? 'refresh' : 'archive'}
                            size={16}
                            color={colors.textSecondary}
                          />
                          <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
                            {goal?.status === 'archived' ? 'Restore' : 'Archive'}
                          </Text>
                        </View>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onPress={handleDeleteGoal} variant="destructive">
                        <View style={menuStyles.menuItemRow}>
                          <Icon name="trash" size={16} color={colors.destructive} />
                          <Text style={menuStyles.destructiveMenuItemText} {...menuItemTextProps}>
                            Delete goal
                          </Text>
                        </View>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </HStack>
              }
            />

            <KeyboardAwareScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              scrollEnabled={scrollEnabledWhileGuiding}
              contentContainerStyle={{
                paddingBottom: spacing['2xl'] + quickAddBottomPadding,
              }}
              keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: false,
              })}
              scrollEventThrottle={16}
            >
              <View ref={pageContentRef} collapsable={false} style={styles.pageContent}>
                <View style={styles.goalHeroSection}>
                  <Animated.View
                    style={{
                      opacity: heroOpacity,
                      transform: [{ translateY: heroParallaxTranslateY }],
                    }}
                  >
                    <View style={styles.heroFullBleedWrapper}>
                      <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => setThumbnailSheetVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Edit Goal banner"
                        activeOpacity={0.95}
                      >
                        {displayThumbnailUrl ? (
                          <Image
                            source={{ uri: displayThumbnailUrl }}
                            style={styles.heroFullBleedImage}
                            resizeMode="cover"
                            accessibilityLabel="Goal banner"
                          />
                        ) : (
                          <LinearGradient
                            colors={heroGradientColors}
                            start={heroGradientDirection.start}
                            end={heroGradientDirection.end}
                            style={styles.heroFullBleedImage}
                          />
                        )}
                      </TouchableOpacity>
                      {heroAttributionMeta?.source === 'unsplash' &&
                      heroAttributionMeta.unsplashAuthorName &&
                      heroAttributionMeta.unsplashAuthorLink &&
                      heroAttributionMeta.unsplashLink ? (
                        <View pointerEvents="box-none" style={styles.heroAttributionOverlay}>
                          <View style={styles.heroAttributionPill}>
                            <Text style={styles.heroAttributionText} numberOfLines={1} ellipsizeMode="tail">
                              Photo by{' '}
                              <Text
                                style={[styles.heroAttributionText, styles.heroAttributionLink]}
                                onPress={() => {
                                  const url = heroAttributionMeta?.unsplashAuthorLink;
                                  if (url) {
                                    Linking.openURL(url).catch(() => {});
                                  }
                                }}
                              >
                                {heroAttributionMeta.unsplashAuthorName}
                              </Text>{' '}
                              on{' '}
                              <Text
                                style={[styles.heroAttributionText, styles.heroAttributionLink]}
                                onPress={() => {
                                  const url = heroAttributionMeta?.unsplashLink;
                                  if (url) {
                                    Linking.openURL(url).catch(() => {});
                                  }
                                }}
                              >
                                Unsplash
                              </Text>
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </Animated.View>
                </View>

                <View
                  ref={sheetTopRef}
                  collapsable={false}
                  onLayout={measureSheetTopAtRest}
                  style={styles.goalSheet}
                >
                  <View style={styles.goalSheetInner}>
                    <VStack space="lg">
                <View style={styles.goalTitleBlock}>
                  <View style={styles.goalTypePillRow}>
                    <HStack style={styles.goalTypePill} alignItems="center" space="xs">
                      <Icon name="goals" size={12} color={colors.textSecondary} />
                      <Text style={styles.goalTypePillLabel}>Goal</Text>
                    </HStack>
                  </View>
                  <NarrativeEditableTitle
                    value={goal.title}
                    placeholder="Goal title"
                    accessibilityLabel="Edit goal title"
                    onCommit={(trimmed) => {
                      if (!trimmed || trimmed === goal.title) return;
                      const timestamp = new Date().toISOString();
                      updateGoal(goal.id, (prev) => ({
                        ...prev,
                        title: trimmed,
                        updatedAt: timestamp,
                      }));
                    }}
                    textStyle={styles.goalNarrativeTitle}
                    inputStyle={styles.goalNarrativeTitleInput}
                    containerStyle={styles.goalNarrativeTitleContainer}
                  />
                        <GoalProgressSignalsRow
                          style={styles.goalSignalsRow}
                          signals={goalProgressSignals}
                        />
                        {/*
                          Members avatar is rendered on the hero/banner (canvas) so it can be large
                          without constraining header action pills.
                        */}

                        <View style={{ marginTop: spacing.sm, width: '100%' }}>
                    <LongTextField
                      label="Description"
                      hideLabel
                      surfaceVariant="flat"
                      value={goal.description ?? ''}
                      placeholder="Add a short description…"
                      enableAi
                      aiContext={{
                        objectType: 'goal',
                        objectId: goal.id,
                        fieldId: 'description',
                      }}
                      onChange={(nextDescription) => {
                        const trimmed = nextDescription.trim();
                        const timestamp = new Date().toISOString();
                        updateGoal(goal.id, (prev) => ({
                          ...prev,
                          description: trimmed.length === 0 ? undefined : trimmed,
                          updatedAt: timestamp,
                        }));
                      }}
                      onRequestAiHelp={({ objectType, objectId, fieldId, currentText }) => {
                        openForFieldContext({
                          objectType,
                          objectId,
                          fieldId,
                          currentText,
                          fieldLabel: 'Goal description',
                        });
                      }}
                    />
                  </View>
                </View>

                {/* Activities-first section */}
                <View style={styles.sectionDivider} />
                <VStack space="md">
                  <View
                    ref={activitiesHeaderRef}
                    collapsable={false}
                    onLayout={() => {
                      // Measure relative to the scroll content root; `layout.y` is only local to the parent.
                      requestAnimationFrame(() => {
                        measureActivitiesHeaderOffset();
                      });
                    }}
                  >
                    <HStack alignItems="center" justifyContent="space-between">
                      <Heading style={styles.sectionTitle}>Activities</Heading>
                      {!isPlanEmpty ? (
                        <View>
                          <Button
                            variant="ai"
                            size="sm"
                            onPress={handleOpenActivityCoach}
                            accessibilityLabel="Plan activities with AI"
                          >
                            <HStack alignItems="center" space="xs">
                              <Icon name="sparkles" size={14} color={colors.primaryForeground} />
                              <Text style={styles.primaryCtaText}>Plan with AI</Text>
                            </HStack>
                          </Button>
                        </View>
                      ) : null}
                    </HStack>
                  </View>

                  {isPlanEmpty ? (
                    <>
                      <View
                        ref={addActivitiesButtonRef}
                        collapsable={false}
                        onLayout={(event) => {
                          setIsAddActivitiesButtonReady(true);
                          // Measure relative to the scroll content root; `layout.y` is only local to the parent.
                          requestAnimationFrame(() => {
                            measureAddActivitiesButtonOffset();
                          });
                        }}
                      >
                        <OpportunityCard
                          title="Turn this goal into a plan"
                          body="Activities are the concrete steps that move this goal forward. Add a few now so you always know what to do next."
                          tone="brand"
                          ctaLabel="Add activities"
                          ctaVariant="inverse"
                          shadow="layered"
                          onPressCta={handleOpenActivityCoach}
                          ctaAccessibilityLabel="Add activities"
                          style={styles.planValueCard}
                        />
                      </View>
                      <View style={{ marginTop: spacing.md }}>
                        <QuickAddDock
                          placement="inline"
                          value={quickAddTitle}
                          onChangeText={setQuickAddTitle}
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
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      {activeGoalActivities.length > 0 && (
                        <VStack space={2}>
                          {activeGoalActivities.map((activity) => {
                            const { meta, metaLeadingIconName, metaLeadingIconNames, isDueToday } = buildActivityListMeta({ activity });
                            return (
                              <ActivityListItem
                                key={activity.id}
                                title={activity.title}
                                meta={meta}
                                metaLeadingIconName={metaLeadingIconName}
                                metaLeadingIconNames={metaLeadingIconNames}
                                isCompleted={activity.status === 'done'}
                                onToggleComplete={() => handleToggleActivityComplete(activity.id)}
                                isPriorityOne={activity.priority === 1}
                                onTogglePriority={() => handleToggleActivityPriorityOne(activity.id)}
                                onPress={() => handleOpenActivityDetail(activity.id)}
                                isDueToday={isDueToday}
                              />
                            );
                          })}
                        </VStack>
                      )}

                      <View style={{ marginTop: spacing.md }}>
                        <QuickAddDock
                          placement="inline"
                          value={quickAddTitle}
                          onChangeText={setQuickAddTitle}
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
                        />
                      </View>

                      {completedGoalActivities.length > 0 && (
                        <VStack space="xs" style={styles.completedSection}>
                          <Pressable
                            onPress={toggleCompletedActivitiesExpanded}
                            style={styles.completedToggle}
                            accessibilityRole="button"
                            accessibilityLabel={
                              completedActivitiesExpanded
                                ? 'Hide completed activities'
                                : 'Show completed activities'
                            }
                            hitSlop={10}
                          >
                            <HStack alignItems="center" space="xs">
                              <Text style={styles.completedToggleLabel}>Completed</Text>
                              <Icon
                                name={completedActivitiesExpanded ? 'chevronDown' : 'chevronRight'}
                                size={14}
                                color={colors.textSecondary}
                              />
                              <Text style={styles.completedCountLabel}>
                                ({completedGoalActivities.length})
                              </Text>
                            </HStack>
                          </Pressable>

                          {completedActivitiesExpanded && (
                            <VStack space={2}>
                              {completedGoalActivities.map((activity) => {
                                const { meta, metaLeadingIconName, metaLeadingIconNames, isDueToday } = buildActivityListMeta({ activity });
                                return (
                                  <ActivityListItem
                                    key={activity.id}
                                    title={activity.title}
                                    meta={meta}
                                    metaLeadingIconName={metaLeadingIconName}
                                    metaLeadingIconNames={metaLeadingIconNames}
                                    isCompleted={activity.status === 'done'}
                                    onToggleComplete={() => handleToggleActivityComplete(activity.id)}
                                    isPriorityOne={activity.priority === 1}
                                    onTogglePriority={() => handleToggleActivityPriorityOne(activity.id)}
                                    onPress={() => handleOpenActivityDetail(activity.id)}
                                    isDueToday={isDueToday}
                                  />
                                );
                              })}
                            </VStack>
                          )}
                        </VStack>
                      )}
                    </>
                  )}
                </VStack>

                {/* Details section */}
                <View style={styles.sectionDivider} />
                <VStack space="lg">
                  <Heading style={styles.sectionTitle}>Details</Heading>
                  <VStack space="md">
                    <HStack style={styles.timeRow}>
                      <VStack space="xs" style={styles.lifecycleColumn}>
                        <Text style={styles.timeLabel}>Status</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Status: ${statusLabel}. Tap to change status.`}
                          onPress={() => setGoalStatusSheetVisible(true)}
                          style={({ pressed }) => [
                            styles.valuePillButton,
                            {
                              backgroundColor: statusAppearance.badgeBackgroundColor,
                              borderColor: statusAppearance.dotColor,
                            },
                            pressed ? styles.timeValueButtonPressed : null,
                          ]}
                          hitSlop={10}
                        >
                          <HStack alignItems="center" space="xs">
                            <Text style={[styles.valuePillText, { color: statusAppearance.badgeTextColor }]}>
                              {statusLabel}
                            </Text>
                            <Icon name="chevronDown" size={14} color={statusAppearance.badgeTextColor} />
                          </HStack>
                        </Pressable>
                      </VStack>
                      <VStack space="xs" style={styles.lifecycleColumn}>
                        <Text style={styles.timeLabel}>Target date</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Target date: ${targetDateLabel ?? 'No date'}. Tap to change target date.`}
                          onPress={() => {
                            setGoalTargetDateSheetStep('menu');
                            setGoalTargetDateSheetVisible(true);
                          }}
                          style={({ pressed }) => [
                            styles.valuePillButton,
                            pressed ? styles.timeValueButtonPressed : null,
                          ]}
                          hitSlop={10}
                        >
                          <HStack alignItems="center" space="xs">
                            <Text
                              style={[
                                styles.valuePillText,
                                { color: targetDateLabel ? colors.textSecondary : colors.muted },
                              ]}
                            >
                              {targetDateLabel ?? 'No date'}
                            </Text>
                            <Icon name="chevronDown" size={14} color={colors.textSecondary} />
                          </HStack>
                        </Pressable>
                      </VStack>
                    </HStack>

                    <HStack style={styles.timeRow}>
                      <VStack space="xs" style={styles.lifecycleColumn}>
                        <Text style={styles.timeLabel}>Last modified</Text>
                        <Text style={styles.timeText}>{updatedAtLabel ?? 'Just now'}</Text>
                      </VStack>
                      <VStack space="xs" style={styles.lifecycleColumn}>
                        <Text style={styles.timeLabel}>Created</Text>
                        <Text style={styles.timeText}>{createdAtLabel ?? '—'}</Text>
                      </VStack>
                    </HStack>
                  </VStack>

                  <View style={styles.detailFieldBlock}>
                    <Text style={styles.arcConnectionLabel}>Linked Arc</Text>
                    <ObjectPicker
                      value={goal.arcId ?? ''}
                      onValueChange={(nextArcId) => {
                        handleUpdateArc(nextArcId ? nextArcId : null);
                      }}
                      options={arcOptions}
                      placeholder="Select Arc…"
                      searchPlaceholder="Search arcs…"
                      emptyText="No arcs found."
                      accessibilityLabel={arc ? 'Change linked arc' : 'Link this goal to an arc'}
                      allowDeselect
                    />
                  </View>

                  <View style={styles.detailFieldBlock}>
                    <Text style={styles.arcConnectionLabel}>Priority</Text>
                    <ObjectPicker
                      value={goal.priority != null ? String(goal.priority) : ''}
                      onValueChange={(nextPriority) => {
                        const timestamp = new Date().toISOString();
                        const parsed = nextPriority ? (Number(nextPriority) as 1 | 2 | 3) : undefined;
                        updateGoal(goal.id, (prev) => ({
                          ...prev,
                          priority: parsed,
                          updatedAt: timestamp,
                        }));
                      }}
                      options={[
                        { value: '1', label: 'P1 (High)' },
                        { value: '2', label: 'P2 (Medium)' },
                        { value: '3', label: 'P3 (Low)' },
                      ]}
                      placeholder="No priority"
                      searchPlaceholder="Search priority…"
                      emptyText="No priority options."
                      accessibilityLabel="Set goal priority"
                      allowDeselect
                    />
                  </View>

                  <View
                    style={styles.detailFieldBlock}
                    ref={vectorsSectionRef}
                    collapsable={false}
                    onLayout={(event) => {
                      const y = event.nativeEvent.layout.y;
                      if (typeof y === 'number' && Number.isFinite(y)) {
                        setVectorsSectionOffset(y);
                      }
                    }}
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <HStack alignItems="center" space="xs">
                        <Text style={styles.forceIntentLabel}>Vectors for this goal</Text>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setVectorsInfoVisible(true)}
                          accessibilityRole="button"
                          accessibilityLabel="Learn how vectors work for this goal"
                          style={styles.forceInfoIconButton}
                        >
                          <Icon name="info" size={16} color={colors.muted} />
                        </TouchableOpacity>
                      </HStack>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleToggleForceEdit}
                        accessibilityRole="button"
                        accessibilityLabel={
                          editingForces
                            ? 'Save vector balance updates'
                            : 'Edit how this goal moves different vectors in your life'
                        }
                        style={styles.forceEditIconButton}
                      >
                        <Icon
                          name="edit"
                          size={16}
                          color={editingForces ? colors.accent : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </HStack>
                    <VStack
                      style={[styles.forceCard, editingForces && styles.editableFieldActive]}
                      space="xs"
                    >
                      {FORCE_ORDER.map((forceId) => {
                        const force = getCanonicalForce(forceId);
                        if (!force) return null;
                        const level = liveForceIntent[forceId] ?? 0;
                        const percentage = (Number(level) / 3) * 100;

                        if (!editingForces) {
                          return (
                            <HStack key={forceId} style={styles.forceRow} alignItems="center">
                              <Text style={styles.forceLabel}>{force.name}</Text>
                              <View style={styles.forceBarWrapper}>
                                <View style={styles.forceBarTrack}>
                                  <View style={[styles.forceBarFill, { width: `${percentage}%` }]} />
                                </View>
                              </View>
                              <Text style={styles.forceValue}>{level}/3</Text>
                            </HStack>
                          );
                        }

                        return (
                          <VStack key={forceId} space="xs">
                            <HStack justifyContent="space-between" alignItems="center">
                              <Text style={styles.forceLabel}>{force.name}</Text>
                              <Text style={styles.forceValue}>{level}/3</Text>
                            </HStack>
                            <HStack space="xs" style={styles.forceSliderRow}>
                              {[0, 1, 2, 3].map((value) => (
                                <TouchableOpacity
                                  key={value}
                                  activeOpacity={0.8}
                                  style={[
                                    styles.forceLevelChip,
                                    level === value && styles.forceLevelChipActive,
                                  ]}
                                  onPress={() => handleSetForceLevel(forceId, value as ForceLevel)}
                                >
                                  <Text
                                    style={[
                                      styles.forceLevelChipText,
                                      level === value && styles.forceLevelChipTextActive,
                                    ]}
                                  >
                                    {value}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </HStack>
                          </VStack>
                        );
                      })}
                    </VStack>
                  </View>

                  {headerV2Enabled ? (
                    <Card marginTop="lg">
                      <Text style={styles.actionsTitle}>Actions</Text>
                      <VStack space="sm" style={{ marginTop: spacing.sm }}>
                        <Button
                          variant="secondary"
                          fullWidth
                          onPress={handleToggleArchiveGoal}
                          accessibilityLabel={goal?.status === 'archived' ? 'Restore goal' : 'Archive goal'}
                        >
                          <Text style={styles.actionsButtonLabel}>
                            {goal?.status === 'archived' ? 'Restore goal' : 'Archive goal'}
                          </Text>
                        </Button>
                        <Button
                          variant="destructive"
                          fullWidth
                          onPress={handleDeleteGoal}
                          accessibilityLabel="Delete goal"
                        >
                          <Text style={styles.actionsButtonLabelDestructive}>Delete goal</Text>
                        </Button>
                      </VStack>
                    </Card>
                  ) : null}
                </VStack>
          </VStack>
        </View>
                </View>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </View>
      <BottomDrawer
        visible={membersSheetVisible}
        onClose={() => {
          setMembersSheetVisible(false);
          // Reset to Activity tab for next open
          setMembersSheetTab('activity');
        }}
        snapPoints={['90%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.membersSheetContent}>
          {/* Tabbed header */}
          <View style={styles.membersSheetHeader}>
            <SegmentedControl
              value={membersSheetTab}
              onChange={setMembersSheetTab}
              options={[
                { value: 'activity', label: 'Activity' },
                { value: 'members', label: 'Members' },
              ]}
              size="compact"
            />
          </View>

          {/* Activity Tab */}
          {membersSheetTab === 'activity' ? (
            <View style={styles.activityTabContent}>
              {/* Feed - automatic progress signals, no manual check-in */}
              <View style={styles.feedSection}>
                <GoalFeedSection goalId={goalId} refreshKey={feedRefreshKey} />
              </View>
            </View>
          ) : null}

          {/* Members Tab */}
          {membersSheetTab === 'members' ? (
            <View style={styles.membersTabContent}>
          {authIdentity ? (
            <>
              {sharedMembersBusy ? (
                <Text style={styles.membersSheetBody}>Loading members…</Text>
              ) : Array.isArray(sharedMembers) && sharedMembers.length > 0 ? (
                <VStack space="sm" style={{ marginTop: spacing.sm }}>
                  {sharedMembers.map((m) => (
                    <HStack key={m.userId} alignItems="center" space="sm" style={styles.memberRow}>
                      <ProfileAvatar
                        name={m.name ?? undefined}
                        avatarUrl={m.avatarUrl ?? undefined}
                        size={36}
                        borderRadius={18}
                      />
                      <VStack flex={1} space="xs">
                        <Text style={styles.memberName}>{m.name ?? 'Member'}</Text>
                        {m.role ? <Text style={styles.memberMeta}>{m.role}</Text> : null}
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text style={styles.membersSheetBody}>
                  No members found yet. If you just joined, try again in a moment.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.membersSheetBody}>
              Sign in to see who's here and invite others.
            </Text>
          )}

          <View style={styles.membersSheetActions}>
            {authIdentity && canLeaveSharedGoal ? (
              <Button
                variant="secondary"
                fullWidth
                disabled={leaveSharedGoalBusy}
                onPress={() => {
                  if (leaveSharedGoalBusy) return;
                  Alert.alert(
                    'Leave shared goal?',
                    "You'll lose access to this shared goal on this account. You can rejoin later with a new invite link.",
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Leave',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            setLeaveSharedGoalBusy(true);
                            await leaveSharedGoal(goalId);
                            // Local-first: remove the goal from this device so the canvas stays consistent.
                            removeGoal(goalId);
                            setMembersSheetVisible(false);
                            handleBack();
                            useToastStore.getState().showToast({
                              message: 'Left shared goal',
                              variant: 'success',
                              durationMs: 2200,
                            });
                          } catch {
                            Alert.alert('Unable to leave', 'Please try again.');
                          } finally {
                            setLeaveSharedGoalBusy(false);
                          }
                        },
                      },
                    ],
                  );
                }}
                label="Leave goal"
                accessibilityLabel="Leave shared goal"
              />
            ) : null}
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                setMembersSheetVisible(false);
                void handleShareGoal();
              }}
              label="Invite"
              accessibilityLabel="Invite"
            />
          </View>
            </View>
          ) : null}
        </View>
      </BottomDrawer>
      <BottomDrawer
        visible={refineGoalSheetVisible}
        onClose={() => setRefineGoalSheetVisible(false)}
        snapPoints={['90%']}
        // Agent chat implements its own keyboard avoidance + focused-input scrolling.
        keyboardAvoidanceEnabled={false}
      >
        <AgentWorkspace
          mode="goalCreation"
          launchContext={refineGoalLaunchContext as any}
          workspaceSnapshot={refineGoalWorkspaceSnapshot}
          workflowDefinitionId={undefined}
          resumeDraft={false}
          hideBrandHeader
          hostBottomInsetAlreadyApplied
          onAdoptGoalProposal={handleApplyRefinedGoal}
          onDismiss={() => setRefineGoalSheetVisible(false)}
        />
      </BottomDrawer>
      <BottomDrawer
        visible={goalTargetDateSheetVisible}
        onClose={() => {
          setGoalTargetDateSheetVisible(false);
          setGoalTargetDateSheetStep('menu');
        }}
        snapPoints={
          Platform.OS === 'ios'
            ? [goalTargetDateSheetStep === 'picker' ? '88%' : '62%']
            : ['45%']
        }
        scrimToken="pineSubtle"
      >
        <View style={[styles.quickAddSheetContent, { flex: 1 }]}>
          {goalTargetDateSheetStep === 'menu' ? (
            <>
              <BottomDrawerHeader
                title="Target date"
                variant="minimal"
                containerStyle={styles.quickAddSheetHeader}
                titleStyle={styles.quickAddSheetTitle}
              />
              <VStack space="sm">
                <Pressable style={styles.quickAddSheetRow} onPress={() => setGoalTargetDateByOffsetDays(0)}>
                  <Text style={styles.quickAddSheetRowLabel}>Today</Text>
                </Pressable>
                <Pressable style={styles.quickAddSheetRow} onPress={() => setGoalTargetDateByOffsetDays(1)}>
                  <Text style={styles.quickAddSheetRowLabel}>Tomorrow</Text>
                </Pressable>
                <Pressable style={styles.quickAddSheetRow} onPress={() => setGoalTargetDateByOffsetDays(7)}>
                  <Text style={styles.quickAddSheetRowLabel}>Next week</Text>
                </Pressable>
                <Pressable style={styles.quickAddSheetRow} onPress={() => setGoalTargetDateSheetStep('picker')}>
                  <Text style={styles.quickAddSheetRowLabel}>Pick a date…</Text>
                </Pressable>
              </VStack>

              {goal?.targetDate ? (
                <>
                  <View style={styles.quickAddSheetDivider} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear target date"
                    onPress={clearGoalTargetDate}
                    style={({ pressed }) => [
                      styles.quickAddSheetClearRow,
                      pressed ? { opacity: 0.72 } : null,
                    ]}
                  >
                    <Text style={styles.quickAddSheetClearLabel}>Clear target date</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.quickAddPickerHeaderRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={() => setGoalTargetDateSheetStep('menu')}
                  style={({ pressed }) => [
                    styles.quickAddPickerBackButton,
                    pressed ? { opacity: 0.72 } : null,
                  ]}
                >
                  <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
                  <Text style={styles.quickAddPickerBackLabel}>Back</Text>
                </Pressable>
                <Text style={styles.quickAddPickerTitle}>Pick a date</Text>
                <View style={styles.quickAddPickerHeaderSpacer} />
              </View>

              <View style={styles.quickAddDatePickerContainer}>
                <DateTimePicker
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  value={getInitialGoalTargetDate()}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (event.type === 'dismissed' || !date) {
                      setGoalTargetDateSheetStep('menu');
                      return;
                    }
                    if (!goal?.id) return;
                    const next = new Date(date);
                    next.setHours(23, 0, 0, 0);
                    const timestamp = new Date().toISOString();
                    updateGoal(goal.id, (prev) => ({
                      ...prev,
                      targetDate: next.toISOString(),
                      qualityState: prev.metrics && prev.metrics.length > 0 ? 'ready' : 'draft',
                      updatedAt: timestamp,
                    }));
                    setGoalTargetDateSheetVisible(false);
                    setGoalTargetDateSheetStep('menu');
                  }}
                />
              </View>
            </>
          )}
        </View>
      </BottomDrawer>
      <BottomDrawer
        visible={goalStatusSheetVisible}
        onClose={() => setGoalStatusSheetVisible(false)}
        snapPoints={Platform.OS === 'ios' ? ['52%'] : ['40%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.quickAddSheetContent}>
          <BottomDrawerHeader
            title="Status"
            variant="minimal"
            containerStyle={styles.quickAddSheetHeader}
            titleStyle={styles.quickAddSheetTitle}
          />
          <VStack space="sm">
            {GOAL_STATUS_OPTIONS.map((nextStatus) => {
              const nextAppearance = getGoalStatusAppearance(nextStatus);
              const isSelected = goal?.status === nextStatus;
              return (
                <Pressable
                  key={nextStatus}
                  style={[styles.quickAddSheetRow, isSelected ? styles.statusRowSelected : null]}
                  onPress={() => {
                    if (!goal?.id) return;
                    const timestamp = new Date().toISOString();
                    const wasNotCompleted = goal.status !== 'completed';
                    updateGoal(goal.id, (prev) => ({
                      ...prev,
                      status: nextStatus,
                      updatedAt: timestamp,
                    }));
                    setGoalStatusSheetVisible(false);
                    // Trigger celebration when marking a goal as completed
                    if (nextStatus === 'completed' && wasNotCompleted) {
                      celebrateGoalCompleted(goal.title);
                      // Fire progress signal for shared goals (fire-and-forget)
                      void createProgressSignal({ goalId: goal.id, type: 'goal_completed' });
                    }
                  }}
                >
                  <HStack alignItems="center" justifyContent="space-between">
                    <HStack alignItems="center" space="sm">
                      <View
                        style={[
                          styles.statusOptionPill,
                          {
                            backgroundColor: nextAppearance.badgeBackgroundColor,
                            borderColor: nextAppearance.dotColor,
                          },
                        ]}
                      >
                        <Text style={[styles.statusOptionPillText, { color: nextAppearance.badgeTextColor }]}>
                          {nextAppearance.label}
                        </Text>
                      </View>
                    </HStack>
                    {isSelected ? <Icon name="check" size={16} color={nextAppearance.textColor} /> : null}
                  </HStack>
                </Pressable>
              );
            })}
          </VStack>
        </View>
      </BottomDrawer>
      {/* Agent FAB entry for Goal detail is temporarily disabled for MVP.
          Once the tap-centric Agent entry is refined for object canvases,
          we can reintroduce a contextual FAB here that fits the final UX. */}
      {AgentWorkspaceSheet}
      <BottomDrawer
        visible={quickAddReminderSheetVisible}
        onClose={() =>
          closeQuickAddToolDrawer(() => {
            setQuickAddReminderSheetVisible(false);
            setQuickAddIsReminderDateTimePickerVisible(false);
          })
        }
        // iOS inline date/time picker is tall; use a two-stage sheet and auto-expand when picker opens.
        snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
        snapIndex={Platform.OS === 'ios' ? (quickAddIsReminderDateTimePickerVisible ? 1 : 0) : 0}
        scrimToken="pineSubtle"
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.quickAddSheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader
            title="Reminder"
            variant="minimal"
            containerStyle={styles.quickAddSheetHeader}
            titleStyle={styles.quickAddSheetTitle}
          />
          <VStack space="sm">
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddReminderByOffsetDays(0, 18, 0)}>
              <Text style={styles.quickAddSheetRowLabel}>Later today (6pm)</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddReminderByOffsetDays(1, 9, 0)}>
              <Text style={styles.quickAddSheetRowLabel}>Tomorrow morning (9am)</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddReminderByOffsetDays(7, 9, 0)}>
              <Text style={styles.quickAddSheetRowLabel}>Next week (9am)</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddIsReminderDateTimePickerVisible(true)}>
              <Text style={styles.quickAddSheetRowLabel}>Pick date & time…</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={clearQuickAddReminder}>
              <Text style={styles.quickAddSheetRowLabel}>Clear reminder</Text>
            </Pressable>
          </VStack>
          {quickAddIsReminderDateTimePickerVisible && (
            <View style={styles.quickAddDatePickerContainer}>
              <DateTimePicker
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialQuickAddReminderDateTime()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setQuickAddIsReminderDateTimePickerVisible(false);
                  if (!date || event.type === 'dismissed') return;
                  setQuickAddReminderAt(new Date(date).toISOString());
                  closeQuickAddToolDrawer(() => setQuickAddReminderSheetVisible(false));
                  setQuickAddIsReminderDateTimePickerVisible(false);
                }}
              />
            </View>
          )}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddDueDateSheetVisible}
        onClose={() =>
          closeQuickAddToolDrawer(() => {
            setQuickAddDueDateSheetVisible(false);
            setQuickAddIsDueDatePickerVisible(false);
          })
        }
        // iOS inline date picker is tall; use a two-stage sheet and auto-expand when picker opens.
        snapPoints={Platform.OS === 'ios' ? ['45%', '92%'] : ['45%']}
        snapIndex={Platform.OS === 'ios' ? (quickAddIsDueDatePickerVisible ? 1 : 0) : 0}
        scrimToken="pineSubtle"
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.quickAddSheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <BottomDrawerHeader
            title="Due"
            variant="minimal"
            containerStyle={styles.quickAddSheetHeader}
            titleStyle={styles.quickAddSheetTitle}
          />
          <VStack space="sm">
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddDueDateByOffsetDays(0)}>
              <Text style={styles.quickAddSheetRowLabel}>Today</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddDueDateByOffsetDays(1)}>
              <Text style={styles.quickAddSheetRowLabel}>Tomorrow</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddDueDateByOffsetDays(7)}>
              <Text style={styles.quickAddSheetRowLabel}>Next week</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={() => setQuickAddIsDueDatePickerVisible(true)}>
              <Text style={styles.quickAddSheetRowLabel}>Pick a date…</Text>
            </Pressable>
            <Pressable style={styles.quickAddSheetRow} onPress={clearQuickAddDueDate}>
              <Text style={styles.quickAddSheetRowLabel}>Clear due date</Text>
            </Pressable>
          </VStack>
          {quickAddIsDueDatePickerVisible && (
            <View style={styles.quickAddDatePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialQuickAddDueDate()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (Platform.OS !== 'ios') setQuickAddIsDueDatePickerVisible(false);
                  if (!date || event.type === 'dismissed') return;
                  const next = new Date(date);
                  next.setHours(23, 0, 0, 0);
                  setQuickAddScheduledDate(next.toISOString());
                  closeQuickAddToolDrawer(() => setQuickAddDueDateSheetVisible(false));
                  setQuickAddIsDueDatePickerVisible(false);
                }}
              />
            </View>
          )}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddRepeatSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false))}
        snapPoints={['55%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.quickAddSheetContent}>
          <BottomDrawerHeader
            title="Repeat"
            variant="minimal"
            containerStyle={styles.quickAddSheetHeader}
            titleStyle={styles.quickAddSheetTitle}
          />
          <VStack space="sm">
            {(['daily', 'weekly', 'weekdays', 'monthly', 'yearly'] as const).map((rule) => (
              <Pressable
                key={rule}
                style={styles.quickAddSheetRow}
                onPress={() => {
                  setQuickAddRepeatRule(rule);
                  closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false));
                }}
              >
                <Text style={styles.quickAddSheetRowLabel}>
                  {rule === 'weekdays' ? 'Weekdays' : rule.charAt(0).toUpperCase() + rule.slice(1)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.quickAddSheetRow}
              onPress={() => {
                setQuickAddRepeatRule(undefined);
                closeQuickAddToolDrawer(() => setQuickAddRepeatSheetVisible(false));
              }}
            >
              <Text style={styles.quickAddSheetRowLabel}>Off</Text>
            </Pressable>
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={quickAddEstimateSheetVisible}
        onClose={() => closeQuickAddToolDrawer(() => setQuickAddEstimateSheetVisible(false))}
        snapPoints={Platform.OS === 'ios' ? ['62%'] : ['45%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.quickAddSheetContent}>
          <BottomDrawerHeader
            title="Duration"
            variant="minimal"
            containerStyle={styles.quickAddSheetHeader}
            titleStyle={styles.quickAddSheetTitle}
          />
          <VStack space="md">
            <DurationPicker
              valueMinutes={quickAddEstimateDraftMinutes}
              onChangeMinutes={setQuickAddEstimateDraftMinutes}
              accessibilityLabel="Select duration"
              iosUseEdgeFades={false}
            />
            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  setQuickAddEstimateMinutes(null);
                  closeQuickAddToolDrawer(() => setQuickAddEstimateSheetVisible(false));
                }}
              >
                <Text style={styles.quickAddSheetRowLabel}>Clear</Text>
              </Button>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onPress={() => {
                  setQuickAddEstimateMinutes(quickAddEstimateDraftMinutes);
                  closeQuickAddToolDrawer(() => setQuickAddEstimateSheetVisible(false));
                }}
              >
                <Text style={[styles.quickAddSheetRowLabel, { color: colors.primaryForeground }]}>
                  Save
                </Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={vectorsInfoVisible}
        onClose={() => setVectorsInfoVisible(false)}
        snapPoints={['40%']}
      >
        <VStack space="md" style={styles.vectorInfoContent}>
          <Heading style={styles.vectorInfoTitle}>What are Vectors?</Heading>
          <Text style={styles.vectorInfoBody}>
            Vectors are the core directions of your life that this goal can move — like activity,
            connection, mastery, and spirituality.
          </Text>
          <Text style={styles.vectorInfoBody}>
            Use the levels to show how much this goal is about each vector. We use this to shape
            better suggestions, reflections, and plans with you.
          </Text>
          <View style={styles.vectorInfoFooter}>
            <Button variant="ghost" onPress={() => setVectorsInfoVisible(false)}>
              <Text style={styles.vectorInfoCloseLabel}>Got it</Text>
            </Button>
          </View>
        </VStack>
      </BottomDrawer>
      <ArcBannerSheet
        visible={thumbnailSheetVisible}
        onClose={() => setThumbnailSheetVisible(false)}
        objectLabel="Goal"
        arcName={goal.title}
        arcNarrative={goal.description}
        arcGoalTitles={goalActivities.map((activity) => activity.title)}
        canUseUnsplash={isPro}
        onRequestUpgrade={() => {
          setThumbnailSheetVisible(false);
          setTimeout(() => openPaywallPurchaseEntry(), 360);
        }}
        heroSeed={heroSeed}
        hasHero={Boolean(goalHeroUri)}
        loading={heroImageLoading}
        error={heroImageError}
        thumbnailUrl={displayThumbnailUrl ?? undefined}
        heroGradientColors={heroGradientColors}
        heroGradientDirection={heroGradientDirection}
        heroTopoSizes={heroTopoSizes}
        showTopography={showTopography}
        showGeoMosaic={showGeoMosaic}
        onGenerate={handleShuffleGoalThumbnail}
        onUpload={() => {
          void handleUploadGoalThumbnail();
        }}
        onRemove={handleClearGoalHeroImage}
        onSelectCurated={handleSelectCuratedGoalHero}
        onSelectUnsplash={handleSelectUnsplashGoalHero}
      />
      <GoalActivityCoachDrawer
        visible={activityCoachVisible}
        onClose={() => setActivityCoachVisible(false)}
        goals={goals}
        activities={activities}
        focusGoalId={goal.id}
      />
      <GoalActivityComposerModal
        visible={activityComposerVisible}
        onClose={() => setActivityComposerVisible(false)}
        onSubmit={handleCreateActivityFromPlan}
        insetTop={insets.top}
      />
    </AppShell>
  );
}

type ArcSelectorModalProps = {
  visible: boolean;
  arcs: Arc[];
  currentArcId: string | null;
  onClose: () => void;
  onSubmit: (arcId: string | null) => void;
};

function ArcSelectorModal({
  visible,
  arcs,
  currentArcId,
  onClose,
  onSubmit,
}: ArcSelectorModalProps) {
  const [selectedArcId, setSelectedArcId] = useState<string | null>(currentArcId);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[goalDetail] ArcSelectorModal opened', {
          currentArcId,
          availableArcs: arcs.length,
        });
      }
      setSelectedArcId(currentArcId);
      setQuery('');
    }
  }, [visible, currentArcId]);

  const filteredArcs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return arcs;
    return arcs.filter((arc) => {
      const name = arc.name.toLowerCase();
      const narrative = (arc.narrative ?? '').toLowerCase();
      return name.includes(term) || narrative.includes(term);
    });
  }, [arcs, query]);

  const handleConfirm = () => {
    onSubmit(selectedArcId);
  };

  const handleRemoveConnection = () => {
    setSelectedArcId(null);
  };

  const hasSelectionChanged = selectedArcId !== currentArcId;

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['75%']}
      hideBackdrop
      handleContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
      handleStyle={{ width: 0, height: 0, opacity: 0 }}
      sheetStyle={{ backgroundColor: 'transparent', paddingHorizontal: 0, paddingTop: 0 }}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAwareScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[styles.modalContent, { paddingTop: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <Heading style={styles.modalTitle}>Connect to an Arc</Heading>
          <Text style={styles.modalBody}>
            Choose an Arc this goal contributes to. You can change or remove this connection at any
            time.
          </Text>

          <TextInput
            style={[styles.input, styles.arcSearchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search arcs…"
            placeholderTextColor="#6B7280"
          />

          <VStack space="sm" style={{ marginTop: spacing.lg }}>
            {filteredArcs.map((arc) => {
              const selected = selectedArcId === arc.id;
              return (
                <TouchableOpacity
                  key={arc.id}
                  activeOpacity={0.8}
                  style={[
                    styles.arcOptionRow,
                    selected && styles.arcOptionRowSelected,
                  ]}
                  onPress={() => setSelectedArcId(arc.id)}
                >
                  <VStack space="xs" flex={1}>
                    <Text style={styles.arcOptionName}>{arc.name}</Text>
                    {arc.narrative ? (
                      <Text
                        style={styles.arcOptionNarrative}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {richTextToPlainText(arc.narrative)}
                      </Text>
                    ) : null}
                  </VStack>
                  <View
                    style={[
                      styles.arcOptionRadio,
                      selected && styles.arcOptionRadioSelected,
                    ]}
                  >
                    {selected && <View style={styles.arcOptionRadioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            {filteredArcs.length === 0 && (
              <Text style={styles.emptyBody}>
                No arcs match that search. Try a different phrase or clear the search.
              </Text>
            )}
          </VStack>

          <VStack space="sm">
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.removeArcButton}
              onPress={handleRemoveConnection}
              disabled={currentArcId === null && selectedArcId === null}
            >
              <Text style={styles.removeArcText}>
                {currentArcId || selectedArcId ? 'Remove arc connection' : 'No arc connected'}
              </Text>
            </TouchableOpacity>

            <HStack space="sm" marginTop={spacing.sm}>
              <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
                <Text style={styles.secondaryCtaText}>Cancel</Text>
              </Button>
              <Button
                style={{ flex: 1 }}
                disabled={!hasSelectionChanged}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryCtaText}>Save</Text>
              </Button>
            </HStack>
          </VStack>
        </KeyboardAwareScrollView>
      </View>
    </BottomDrawer>
  );
}

type GoalActivityComposerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: { title: string; notes?: string; type: ActivityType }) => void;
  insetTop: number;
};

function GoalActivityComposerModal({
  visible,
  onClose,
  onSubmit,
  insetTop,
}: GoalActivityComposerModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('task');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setNotes('');
      setActivityType('task');
    }
  }, [visible]);

  const disabled = title.trim().length === 0;

  const handleSubmit = () => {
    if (disabled) return;
    onSubmit({ title, notes: notes.trim().length > 0 ? notes : undefined, type: activityType });
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['55%']}
      hideBackdrop
      handleContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
      handleStyle={{ width: 0, height: 0, opacity: 0 }}
      sheetStyle={{ backgroundColor: 'transparent', paddingHorizontal: 0, paddingTop: 0 }}
    >
      <View style={[styles.modalOverlay, { paddingTop: insetTop }]}>
        <KeyboardAwareScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[styles.modalContent, { paddingTop: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <Heading style={styles.modalTitle}>Add Activity</Heading>
          <Text style={styles.modalBody}>
            Capture a concrete step that moves this goal forward. You can refine details later from
            the Activities canvas.
          </Text>

          <Text style={styles.modalLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Measure the desk area"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.modalLabel}>Type</Text>
          <SegmentedControl<ActivityType>
            value={activityType}
            onChange={setActivityType}
            size="compact"
            options={[
              { value: 'task', label: 'Task' },
              { value: 'checklist', label: 'Checklist' },
              { value: 'shopping_list', label: 'List' },
              { value: 'instructions', label: 'Instructions' },
              { value: 'plan', label: 'Plan' },
            ]}
          />

          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a short note or checklist for this activity."
            placeholderTextColor="#6B7280"
            multiline
          />

          <HStack space="sm" marginTop={spacing.lg}>
            <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
              <Text style={styles.secondaryCtaText}>Cancel</Text>
            </Button>
            <Button style={{ flex: 1 }} disabled={disabled} onPress={handleSubmit}>
              <Text style={styles.primaryCtaText}>Add</Text>
            </Button>
          </HStack>
        </KeyboardAwareScrollView>
      </View>
    </BottomDrawer>
  );
}

type GoalActivityCoachDrawerProps = {
  visible: boolean;
  onClose: () => void;
  goals: Goal[];
  activities: Activity[];
  focusGoalId: string;
};

function GoalActivityCoachDrawer({
  visible,
  onClose,
  goals,
  activities,
  focusGoalId,
}: GoalActivityCoachDrawerProps) {
  const { capture } = useAnalytics();
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const arcs = useAppStore((state) => state.arcs);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const generativeCredits = useAppStore((state) => state.generativeCredits);
  const activityTagHistory = useAppStore((state) => state.activityTagHistory);
  const addActivity = useAppStore((state) => state.addActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const [isActivityAiInfoVisible, setIsActivityAiInfoVisible] = useState(false);
  const [manualDraft, setManualDraft] = useState<ActivityDraft>({
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

  const activityCreationWorkflow = useMemo(
    () => getWorkflowLaunchConfig('activityCreation'),
    []
  );

  const workspaceSnapshot = useMemo(
    () => buildActivityCoachLaunchContext(goals, activities, focusGoalId, arcs, undefined, activityTagHistory),
    [goals, activities, focusGoalId, arcs, activityTagHistory]
  );

  const focusGoal = useMemo(
    () => goals.find((candidate) => candidate.id === focusGoalId) ?? null,
    [goals, focusGoalId]
  );

  const arc = useMemo(() => {
    if (!focusGoal?.arcId) return null;
    return arcs.find((candidate) => candidate.id === focusGoal.arcId) ?? null;
  }, [arcs, focusGoal?.arcId]);

  const launchContext = useMemo(
    () => ({
      source: 'goalDetail' as const,
      intent: 'activityCreation' as const,
      entityRef: { type: 'goal', id: focusGoalId } as const,
      objectType: 'goal' as const,
      objectId: focusGoalId,
    }),
    [focusGoalId]
  );

  const aiCreditsRemaining = useMemo(() => {
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

  const handleChangeMode = useCallback((next: 'ai' | 'manual') => {
    // Allow switching into AI even when credits are exhausted; we show the paywall content inline.
    setActiveTab(next);
  }, []);

  useEffect(() => {
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

  const handleConfirmManualActivity = useCallback(() => {
    const trimmedTitle = manualDraft.title.trim();
    if (!trimmedTitle) return;

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notes = (manualDraft.notes ?? '').trim();
    const tags = manualDraft.tags ?? [];
    const steps: ActivityStep[] = (manualDraft.steps ?? [])
      .map((s) => ({ title: (s.title ?? '').trim() }))
      .filter((s) => s.title.length > 0)
      .map((s, index) => ({
        id: `step-${id}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        title: s.title,
        completedAt: null,
        isOptional: false,
        orderIndex: index,
      }));

    const activity: Activity = {
      id,
      goalId: focusGoalId,
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

    // Note: Creating activities no longer counts as "showing up" for streaks.
    addActivity(activity);
    capture(AnalyticsEvent.ActivityCreated, {
      source: 'goal_detail_manual',
      activity_id: activity.id,
      goal_id: focusGoalId,
    });
    onClose();
  }, [activities.length, addActivity, capture, focusGoalId, manualDraft, onClose]);

  const handleSwitchToManual = useCallback(() => {
    setActiveTab('manual');
  }, []);

  const handleAiComplete = useCallback(
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
        // Skip if an activity with this title already exists for this goal
        // (prevents duplicates when "accept all" triggers both onAdoptActivitySuggestion
        // and workflow completion)
        const alreadyExists = activities.some(
          (a) => (a.goalId ?? null) === focusGoalId && normalizeTitleKey(a.title) === titleKey
        );
        if (alreadyExists) return;

        const timestamp = new Date().toISOString();
        const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const nextActivity: Activity = {
          id,
          goalId: focusGoalId,
          title: trimmedTitle,
          type: 'task',
          tags: suggestTagsFromText(trimmedTitle, focusGoal?.title ?? null),
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

        // Note: Creating activities no longer counts as "showing up" for streaks.
        addActivity(nextActivity);
        capture(AnalyticsEvent.ActivityCreated, {
          source: 'goal_detail_ai_workflow',
          activity_id: nextActivity.id,
          goal_id: focusGoalId,
        });
      });
    },
    [activities, addActivity, capture, focusGoalId]
  );

  const handleAdoptActivitySuggestion = useCallback(
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

      const nextActivity: Activity = {
        id,
        goalId: focusGoalId,
        title: suggestion.title.trim(),
        type: suggestion.type ?? 'task',
        tags:
          Array.isArray(suggestion.tags) && suggestion.tags.length > 0
            ? suggestion.tags
            : suggestTagsFromText(suggestion.title, suggestion.why ?? null, focusGoal?.title ?? null),
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

      // Note: Creating activities no longer counts as "showing up" for streaks.
      addActivity(nextActivity);
      // Best-effort: if the model suggested a location offer, geocode and attach it asynchronously.
      const locOffer = suggestion.locationOffer;
      if (locOffer?.placeQuery && typeof locOffer.placeQuery === 'string') {
        const query = locOffer.placeQuery.trim();
        if (query.length > 0) {
          const trigger =
            locOffer.trigger === 'arrive' || locOffer.trigger === 'leave' ? locOffer.trigger : 'leave';
          const radiusM =
            typeof locOffer.radiusM === 'number' && Number.isFinite(locOffer.radiusM)
              ? locOffer.radiusM
              : undefined;
          void (async () => {
            const place = await geocodePlaceBestEffort({ query });
            if (!place) return;
            const nextAt = new Date().toISOString();
            updateActivity(id, (prev) => ({
              ...prev,
              location: {
                label:
                  typeof locOffer.label === 'string' && locOffer.label.trim().length > 0
                    ? locOffer.label.trim()
                    : place.label,
                latitude: place.latitude,
                longitude: place.longitude,
                trigger,
                ...(typeof radiusM === 'number' ? { radiusM } : null),
              },
              updatedAt: nextAt,
            }));
          })();
        }
      }
      capture(AnalyticsEvent.ActivityCreated, {
        source: 'goal_detail_ai_suggestion',
        activity_id: nextActivity.id,
        goal_id: focusGoalId,
        has_steps: Boolean(nextActivity.steps && nextActivity.steps.length > 0),
        has_estimate: Boolean(nextActivity.estimateMinutes),
      });
    },
    [activities.length, addActivity, capture, focusGoal?.title, focusGoalId, recordShowUp, updateActivity]
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
            {focusGoal
              ? `Goal: ${focusGoal.title}${arc ? `\nArc: ${arc.name}` : ''}\n\nI’m using this goal${arc ? ' and its Arc' : ''}, plus your other goals and activities, to keep suggestions realistic, aligned, and non-duplicative.`
              : 'I’m using your existing goals and activities to keep suggestions realistic, aligned, and non-duplicative.'}
          </Text>
        </Dialog>
        {activeTab === 'ai' ? (
          <View style={styles.activityCoachBody}>
            {!isPro && aiCreditsRemaining <= 0 ? (
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
                mode={activityCreationWorkflow.mode}
                launchContext={launchContext}
                workspaceSnapshot={workspaceSnapshot}
                workflowDefinitionId={activityCreationWorkflow.workflowDefinitionId}
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
        ) : (
          <View style={styles.activityCoachBody}>
            <KeyboardAwareScrollView
              style={styles.manualFormContainer}
              contentContainerStyle={{ paddingBottom: spacing['2xl'], gap: spacing.xs }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ width: '100%' }}>
                <ActivityDraftDetailFields
                  draft={manualDraft}
                  onChange={(updater) => setManualDraft((prev) => updater(prev))}
                  goalLabel={focusGoal?.title ?? null}
                  lockGoalLabel
                />
                <Button
                  style={{ marginTop: spacing.xs }}
                  onPress={handleConfirmManualActivity}
                  disabled={manualDraft.title.trim().length === 0}
                >
                  <Text style={styles.primaryCtaText}>Create activity</Text>
                </Button>
              </View>
            </KeyboardAwareScrollView>
          </View>
        )}
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sectionDivider: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray300,
    borderRadius: 999,
  },
  goalTypePillRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalTypePillLabel: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timeValueButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs / 2,
    borderRadius: 8,
  },
  timeValueButtonPressed: {
    opacity: 0.7,
  },
  timeValueButtonText: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
  backButton: {
    alignSelf: 'flex-start',
    // Sizing is controlled via `iconButtonSize={36}` on the Button.
  },
  addActivityIconButton: {
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationBadge: {
    ...typography.label,
    color: colors.turmeric200,
  },
  celebrationTitle: {
    ...typography.titleLg,
    color: colors.primaryForeground,
  },
  celebrationSubtitle: {
    ...typography.body,
    color: colors.indigo100,
  },
  celebrationMediaSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  celebrationContinueButton: {
    backgroundColor: colors.quiltBlue200,
    borderColor: colors.quiltBlue200,
    borderRadius: 18,
  },
  celebrationContinueLabel: {
    ...typography.titleSm,
    color: colors.indigo900,
    lineHeight: 22,
  },
  shareAuthButton: {
    backgroundColor: colors.canvas,
    borderColor: colors.canvas,
    borderRadius: 18,
  },
  shareAuthButtonSharing: {
    backgroundColor: 'transparent',
    borderColor: colors.sharing,
    borderRadius: 18,
  },
  shareAuthButtonLabel: {
    ...typography.titleSm,
    color: colors.textPrimary,
    lineHeight: 22,
    includeFontPadding: false,
  },
  shareAuthNotNowLabel: {
    ...typography.body,
    color: colors.indigo100,
    textAlign: 'center',
  },
  shareSignInSheet: {
    backgroundColor: colors.canvas,
  },
  shareSignInHandleContainer: {
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
  },
  shareSignInHandle: {
    backgroundColor: colors.border,
  },
  shareSignInContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  shareSignInButtonGroup: {
    marginTop: spacing.lg,
  },
  shareSignInOutlineButton: {
    borderRadius: 18,
  },
  shareSignInTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  shareSignInBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  shareSignInCancelLabel: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  goalCoachmarkTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalCoachmarkBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionsButton: {
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  arcRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    width: '100%',
  },
  arcConnectionLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    marginBottom: spacing.xs,
    paddingLeft: 0,
  },
  arcLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arcName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  arcEmptyHelper: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcChipTextConnected: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  arcRight: {
    marginLeft: spacing.md,
  },
  arcChangeText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  goalTitle: {
    // Goal title – slightly smaller than the Arc header to keep this canvas
    // feeling focused without overwhelming the hero thumbnail.
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  goalTitleInput: {
    ...typography.titleMd,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  goalDescription: {
    // Goal description – make this slightly larger and higher contrast so it
    // reads as primary supporting context under the title.
    ...typography.body,
    color: colors.textPrimary,
  },
  goalDescriptionInput: {
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  detailFieldBlock: {
    marginTop: spacing.md,
  },
  valuePillButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.shellAlt,
  },
  valuePillText: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  timeLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  lifecycleLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    paddingLeft: 0,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  completedSection: {
    marginTop: spacing.md,
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
  lifecycleColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray200,
    marginVertical: spacing.lg,
    borderRadius: 999,
  },
  forceIntentLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    paddingLeft: 0,
  },
  forceInfoIconButton: {
    padding: spacing.xs,
  },
  forceCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  forceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingHorizontal: 0,
  },
  forceBarWrapper: {
    flex: 1,
  },
  forceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    minWidth: 120,
  },
  forceValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  forceBarTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
    width: '100%',
  },
  forceBarFill: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  createdAtText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: 0,
    marginTop: spacing.xs,
  },
  historyHintText: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  vectorInfoContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  vectorInfoTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  vectorInfoBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  vectorInfoFooter: {
    marginTop: spacing.md,
    alignItems: 'flex-end',
  },
  vectorInfoCloseLabel: {
    ...typography.bodySm,
    color: colors.accent,
  },
  primaryCtaText: {
    ...typography.body,
    color: colors.canvas,
  },
  secondaryCtaText: {
    ...typography.body,
    color: colors.accent,
  },
  onboardingGuideBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  onboardingGuidePrimaryLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontFamily: fonts.medium,
  },
  onboardingGuideSecondaryLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  linkLabel: {
    ...typography.bodySm,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  activityCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  activityPhase: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  activityMeta: {
    ...typography.bodySm,
    color: colors.muted,
  },
  activityTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  activityNotes: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  addActivityLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  planEmptyState: {
    marginTop: spacing.lg,
    paddingHorizontal: 0,
  },
  planEmptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  planEmptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  planEmptyHint: {
    ...typography.bodySm,
    color: colors.muted,
  },
  planValueCard: {
    marginVertical: 0,
  },
  forceEditOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  goalThumbnailWrapper: {
    // Slightly smaller than the Arc thumbnail in the list so the title has
    // more breathing room and the header feels less top‑heavy.
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
  },
  goalThumbnailInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalThumbnail: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailControlsRow: {
    // no-op placeholder; controls moved into bottom sheet
    marginTop: 0,
  },
  goalThumbnailSheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  goalThumbnailSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  goalThumbnailSheetPreviewFrame: {
    width: '100%',
    aspectRatio: 3 / 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
    marginBottom: spacing.lg,
  },
  goalThumbnailSheetPreviewInner: {
    flex: 1,
  },
  goalThumbnailSheetImage: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailSheetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
  },
  goalThumbnailSheetButton: {
    flexShrink: 1,
  },
  goalThumbnailControlLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  pageContent: {
    width: '100%',
    position: 'relative',
  },
  goalHeroSection: {
    height: 240,
    backgroundColor: colors.canvas,
  },
  heroFullBleedWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.shellAlt,
    position: 'relative',
  },
  heroFullBleedImage: {
    width: '100%',
    height: '100%',
  },
  heroAttributionOverlay: {
    position: 'absolute',
    // Lift above the sheet overlap (Goal sheet starts at -20px).
    bottom: spacing.sm + 20,
    right: spacing.xl,
    alignItems: 'flex-end',
  },
  heroAttributionPill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  heroAttributionText: {
    ...typography.bodySm,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textPrimary,
  },
  heroAttributionLink: {
    textDecorationLine: 'underline',
  },
  headerMembersStandalone: {
    height: '100%',
    justifyContent: 'center',
  },
  goalSheet: {
    marginTop: -20,
    backgroundColor: colors.canvas,
    // No rounding on Goal sheets (unlike the Arc hero sheet).
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  goalSheetInner: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  goalBannerFrame: {
    width: '100%',
    height: 148,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  goalBannerImage: {
    width: '100%',
    height: '100%',
  },
  goalTitleBlock: {
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  goalMetaLine: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    // Status moved into a pill next to the object type; keep this style for any
    // future supporting meta lines without encouraging it as an interactive element.
  },
  goalSignalsRow: {
    marginBottom: spacing.md,
  },
  headerShareMembersPill: {
    paddingHorizontal: spacing.sm,
  },
  headerShareZone: {
    height: '100%',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
  },
  headerMembersZone: {
    height: '100%',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
  },
  membersSheetContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  membersSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  membersSheetBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  memberRow: {
    paddingVertical: spacing.xs,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  memberMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  membersSheetActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  membersSheetButtonLabel: {
    ...typography.bodySm,
    color: colors.primaryForeground,
    fontFamily: fonts.medium,
  },
  membersSheetHeader: {
    marginBottom: spacing.md,
  },
  activityTabContent: {
    flex: 1,
  },
  membersTabContent: {
    flex: 1,
  },
  feedSection: {
    flex: 1,
  },
  editableField: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineTitleField: {
    // Reduce vertical padding so the title row vertically centers better
    // alongside the goal thumbnail in the header.
    paddingVertical: spacing.sm,
  },
  // Remove top padding from the Goal title wrapper so the text baseline
  // aligns more closely with the top edge of the thumbnail.
  goalTitleEditableField: {
    paddingTop: 0,
  },
  editableFieldActive: {
    borderColor: colors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
    padding: spacing.md,
    minHeight: 48,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  forceSliderRow: {
    flexDirection: 'row',
  },
  forceLevelChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  forceLevelChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  forceLevelChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceLevelChipTextActive: {
    color: colors.canvas,
  },
  forceEditIconButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  arcOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  arcOptionRowSelected: {
    backgroundColor: colors.shellAlt,
  },
  arcOptionName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcOptionNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  arcOptionRadioSelected: {
    borderColor: colors.accent,
  },
  arcOptionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  removeArcButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  arcSearchInput: {
    marginTop: spacing.md,
  },
  removeArcText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  objectTypeLabel: {
    // Match Arc detail header: slightly larger mixed-case label centered
    // between the navigation buttons.
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
  goalNarrativeTitleContainer: {
    // Keep the title feeling like content (not a boxed input) by letting it flow
    // naturally within the canvas column.
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  goalNarrativeTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
    textAlign: 'center',
    maxWidth: 420,
  },
  goalNarrativeTitleInput: {
    // Minimal edit affordance: no border/background. Keep typography identical.
    ...typography.titleLg,
    color: colors.textPrimary,
    textAlign: 'center',
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
  firstGoalBadge: {
    ...typography.bodySm,
    color: colors.accent,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  firstGoalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  firstGoalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  historyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  historySubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  historySummaryColumn: {
    flex: 1,
  },
  historySummaryLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  historySummaryValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
    marginTop: spacing.xs / 2,
  },
  historyEmptyCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  historyEmptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  historyEmptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  historyScroll: {
    flex: 1,
    marginTop: spacing.md,
  },
  historyScrollContent: {
    paddingBottom: spacing['2xl'],
  },
  historyEventCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    flex: 1,
  },
  historyEventDate: {
    ...typography.label,
    color: colors.muted,
    marginBottom: spacing.xs / 2,
  },
  historyEventTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  historyEventMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  segmentedControlRow: {
    marginTop: spacing.xs,
  },
  segmentedControl: {
    // Deprecated: visual styles now provided by shared `SegmentedControl` primitive.
  },
  segmentedOption: {
    // Deprecated: use `SegmentedControl` instead.
  },
  segmentedOptionActive: {
    // Deprecated: use `SegmentedControl` instead.
  },
  segmentedOptionLabel: {
    // Deprecated: use `SegmentedControl` instead.
  },
  segmentedOptionLabelActive: {
    // Deprecated: use `SegmentedControl` instead.
  },
  activityModePillInfoIcon: {
    marginLeft: spacing.sm,
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
  manualFormContainer: {
    flex: 1,
  },
  quickAddSheetContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  quickAddSheetHeader: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  quickAddSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  quickAddSheetRow: {
    paddingVertical: spacing.sm,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  quickAddSheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  quickAddSheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  quickAddSheetClearRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  quickAddSheetClearLabel: {
    ...typography.bodySm,
    color: colors.destructive,
    fontFamily: fonts.medium,
  },
  quickAddPickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  quickAddPickerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
  },
  quickAddPickerBackLabel: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  quickAddPickerTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  quickAddPickerHeaderSpacer: {
    width: 62,
  },
  statusRowSelected: {
    borderColor: colors.gray300,
    backgroundColor: colors.shellAlt,
  },
  statusOptionPill: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusOptionPillText: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
  },
  quickAddDatePickerContainer: {
    marginTop: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
});



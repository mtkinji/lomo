import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  Animated,
  StyleSheet,
  View,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  Image,
  Share,
  StyleProp,
  ViewStyle,
  Text,
  UIManager,
  findNodeHandle,
} from 'react-native';
import {
  ObjectPageHeader,
  HeaderActionPill,
  OBJECT_PAGE_HEADER_BAR_HEIGHT,
} from '../../ui/layout/ObjectPageHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { useToastStore } from '../../store/useToastStore';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import type { ThumbnailStyle } from '../../domain/types';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/Icon';
import { ObjectTypeIconBadge } from '../../ui/ObjectTypeIconBadge';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import {
  VStack,
  Heading,
  HStack,
  KeyboardAwareScrollView,
} from '../../ui/primitives';
import { LongTextField } from '../../ui/LongTextField';
import { BreadcrumbBar } from '../../ui/BreadcrumbBar';
import { BottomGuide } from '../../ui/BottomGuide';
import { Coachmark } from '../../ui/Coachmark';
import { useCoachmarkHost } from '../../ui/hooks/useCoachmarkHost';
import { NarrativeEditableTitle } from '../../ui/NarrativeEditableTitle';
import { EditableTextArea } from '../../ui/EditableTextArea';
import { Card } from '../../ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { GoalListCard } from '../../ui/GoalListCard';
import { OpportunityCard } from '../../ui/OpportunityCard';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { openPaywallInterstitial } from '../../services/paywall';
import { HapticsService } from '../../services/HapticsService';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  DEFAULT_THUMBNAIL_STYLE,
  type ArcGradientDirection,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
  buildArcThumbnailSeed,
} from './thumbnailVisuals';
import { type ArcHeroImage } from './arcHeroLibrary';
import { trackUnsplashDownload, withUnsplashReferral, type UnsplashPhoto } from '../../services/unsplash';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { GoalCoachDrawer } from '../goals/GoalsScreen';
import { ArcBannerSheet } from './ArcBannerSheet';
import type { KeyboardAwareScrollViewHandle } from '../../ui/KeyboardAwareScrollView';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ArcsStackParamList } from '../../navigation/RootNavigator';

const logArcDetailDebug = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) {
    if (payload) {
      console.log(`[arcDetail] ${event}`, payload);
    } else {
      console.log(`[arcDetail] ${event}`);
    }
  }
};

type ArcDetailRouteProp = RouteProp<ArcsStackParamList, 'ArcDetail'>;
type ArcDetailNavigationProp = NativeStackNavigationProp<ArcsStackParamList, 'ArcDetail'>;

export function ArcDetailScreen() {
  const route = useRoute<ArcDetailRouteProp>();
  const navigation = useNavigation<ArcDetailNavigationProp>();
  const { arcId, openGoalCreation, showFirstArcCelebration: showCelebrationFromRoute } =
    route.params;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<KeyboardAwareScrollViewHandle | null>(null);
  const createGoalCtaRef = useRef<View>(null);
  const goalsHeaderRef = useRef<View>(null);
  const heroBannerRef = useRef<View>(null);
  const heroSpotlightRef = useRef<View>(null);
  const insightsSectionRef = useRef<View>(null);

  const arcs = useAppStore((state) => state.arcs);
  const breadcrumbsEnabled = __DEV__ && useAppStore((state) => state.devBreadcrumbsEnabled);
  const devHeaderV2Enabled = __DEV__ && useAppStore((state) => state.devObjectDetailHeaderV2Enabled);
  const abHeaderV2Enabled = useFeatureFlag('object_detail_header_v2', false);
  const headerV2Enabled = devHeaderV2Enabled || abHeaderV2Enabled;
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const removeArc = useAppStore((state) => state.removeArc);
  const updateArc = useAppStore((state) => state.updateArc);
  const showToast = useToastStore((state) => state.showToast);
  const addGoal = useAppStore((state) => state.addGoal);
  const lastOnboardingArcId = useAppStore((state) => state.lastOnboardingArcId);
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const hasSeenFirstArcCelebration = useAppStore(
    (state) => state.hasSeenFirstArcCelebration
  );
  const setHasSeenFirstArcCelebration = useAppStore(
    (state) => state.setHasSeenFirstArcCelebration
  );
  const hasDismissedOnboardingGoalGuide = useAppStore(
    (state) => state.hasDismissedOnboardingGoalGuide
  );
  const setHasDismissedOnboardingGoalGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingGoalGuide
  );
  const hasDismissedArcExploreGuide = useAppStore((state) => state.hasDismissedArcExploreGuide);
  const setHasDismissedArcExploreGuide = useAppStore((state) => state.setHasDismissedArcExploreGuide);

  const arc = useMemo(() => arcs.find((item) => item.id === arcId), [arcs, arcId]);

  const handleShareArc = useCallback(async () => {
    try {
      if (!arc) return;
      await Share.share({
        message: `Arc in kwilt: “${arc.name ?? 'Arc'}”.`,
      });
    } catch {
      // No-op: Share sheets can be dismissed or unavailable on some platforms.
    }
  }, [arc]);

  const isPro = useEntitlementsStore((state) => state.isPro);
  const arcGoals = useMemo(() => goals.filter((goal) => goal.arcId === arcId), [goals, arcId]);
  const completedArcGoals = useMemo(
    () => arcGoals.filter((goal) => goal.status === 'completed'),
    [arcGoals],
  );
  const completedArcActivities = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.goalId && arcGoals.some((goal) => goal.id === activity.goalId) &&
          activity.status === 'done' &&
          activity.completedAt,
      ),
    [activities, arcGoals],
  );
  const activityCountByGoal = useMemo(
    () =>
      activities.reduce<Record<string, number>>((acc, activity) => {
        if (!activity.goalId) return acc;
        acc[activity.goalId] = (acc[activity.goalId] ?? 0) + 1;
        return acc;
      }, {}),
    [activities],
  );
  const thumbnailStyles = useMemo<ThumbnailStyle[]>(() => {
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return ['topographyDots'];
  }, [visuals]);
  const [isNarrativeEditorVisible, setIsNarrativeEditorVisible] = useState(false);
  const [isGoalCoachVisible, setIsGoalCoachVisible] = useState(false);
  const [hasOpenedGoalCreationFromParam, setHasOpenedGoalCreationFromParam] =
    useState(false);
  const [showOnboardingArcHandoff, setShowOnboardingArcHandoff] = useState(
    Boolean(showCelebrationFromRoute && !hasSeenFirstArcCelebration),
  );
  const onboardingArcHandoffHapticPlayedRef = useRef(false);
  const hasConsumedRouteCelebrationRef = useRef(false);
  const [arcExploreGuideStep, setArcExploreGuideStep] = useState(0);
  const hasStartedArcExploreGuideRef = useRef(false);
  const [goalsSectionOffset, setGoalsSectionOffset] = useState<number | null>(null);
  const [insightsSectionOffset, setInsightsSectionOffset] = useState<number | null>(null);

  const { openForScreenContext, openForFieldContext, AgentWorkspaceSheet } = useAgentLauncher();

  // --- Scroll-linked header + hero behavior (sheet-top threshold) ---
  // Header bar height below the safe area inset.
  // Pills are 36px; target ~12px breathing room below them => 48px.
  const ARC_HEADER_HEIGHT = OBJECT_PAGE_HEADER_BAR_HEIGHT;
  const HEADER_BOTTOM_Y = insets.top + ARC_HEADER_HEIGHT;
  const SHEET_HEADER_TRANSITION_RANGE_PX = 72;
  const BOTTOM_CTA_BAR_HEIGHT = 92;

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
  const ESTIMATED_ARC_HERO_HEIGHT_PX = 320; // keep in sync with `styles.arcHeroSection.height`
  const ESTIMATED_ARC_SHEET_MARGIN_TOP_PX = -28; // keep in sync with `styles.arcSheet.marginTop`
  // The Arc sheet overlaps the hero by `-marginTop`, so the *visible* hero height is reduced.
  // Use this for spotlight targeting so the coachmark doesn't frame the white sheet overlap.
  const estimatedVisibleHeroHeightPx = Math.max(
    0,
    ESTIMATED_ARC_HERO_HEIGHT_PX + ESTIMATED_ARC_SHEET_MARGIN_TOP_PX,
  );
  const estimatedHeaderTransitionStartScrollY = Math.max(
    0,
    ESTIMATED_ARC_HERO_HEIGHT_PX + ESTIMATED_ARC_SHEET_MARGIN_TOP_PX - HEADER_BOTTOM_Y,
  );

  const measuredHeaderTransitionStartScrollY =
    sheetTopAtRestWindowY != null && Number.isFinite(sheetTopAtRestWindowY)
      ? Math.max(0, sheetTopAtRestWindowY - HEADER_BOTTOM_Y)
      : null;

  const headerTransitionStartScrollY =
    measuredHeaderTransitionStartScrollY != null && measuredHeaderTransitionStartScrollY >= 24
      ? measuredHeaderTransitionStartScrollY
      : estimatedHeaderTransitionStartScrollY;

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
    inputRange: [headerTransitionStartScrollY, headerTransitionStartScrollY + SHEET_HEADER_TRANSITION_RANGE_PX],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Fade the hero out so it reaches 0 opacity exactly when the sheet top touches the
  // bottom of the fixed header (the start of the header transition).
  //
  // Important UX detail: the sheet starts fairly close to the top (it also overlaps
  // the hero a bit), so a long fade lead can cause the hero to start fading on the
  // very first pixels of scroll. Add a small "hold" so the hero remains fully visible
  // until the user has scrolled a meaningful amount, while still syncing the fade-out
  // endpoint to the sheet/header alignment.
  const HERO_FADE_LEAD_PX = 180;
  const HERO_FADE_HOLD_PX = 60;

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

  // When navigated to with `openGoalCreation: true` (for example, from the Goals
  // canvas "new goal" affordance), immediately surface the Goal creation
  // wizard so the user can adopt a draft without hunting for the inline "+".
  useEffect(() => {
    if (openGoalCreation && !hasOpenedGoalCreationFromParam) {
      setIsGoalCoachVisible(true);
      setHasOpenedGoalCreationFromParam(true);
    }
  }, [openGoalCreation, hasOpenedGoalCreationFromParam]);

  const handleBackToArcs = useCallback(() => {
    // In some persisted navigation states ArcDetail can be the first (and only)
    // screen in the Arcs stack. In that case, `goBack` would dispatch a
    // GO_BACK action that no navigator can handle, triggering a noisy dev
    // warning. Instead, treat the back affordance as "return to the Arcs
    // canvas" and explicitly jump to the ArcsList root when there is no stack
    // history to pop.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ArcsList');
    }
  }, [navigation]);

  const handleDismissOnboardingArcHandoff = useCallback(() => {
    setShowOnboardingArcHandoff(false);
    setHasSeenFirstArcCelebration(true);
    // If this handoff was requested via navigation params, consume it so it
    // doesn't re-open on app reload / navigation state restore.
    if (showCelebrationFromRoute && !hasConsumedRouteCelebrationRef.current) {
      hasConsumedRouteCelebrationRef.current = true;
      navigation.setParams({ showFirstArcCelebration: false });
    }
  }, [navigation, setHasSeenFirstArcCelebration, showCelebrationFromRoute]);

  useEffect(() => {
    // If the navigation explicitly requested the celebration (for example,
    // immediately after onboarding), honor that first.
    if (
      showCelebrationFromRoute &&
      !hasSeenFirstArcCelebration &&
      !hasConsumedRouteCelebrationRef.current
    ) {
      setShowOnboardingArcHandoff(true);
      // Mark consumed so state restoration doesn't repeatedly trigger this.
      hasConsumedRouteCelebrationRef.current = true;
      return;
    }
    if (
      arc &&
      arc.id === lastOnboardingArcId &&
      !hasSeenFirstArcCelebration
    ) {
      setShowOnboardingArcHandoff(true);
    }
  }, [arc, lastOnboardingArcId, hasSeenFirstArcCelebration, showCelebrationFromRoute]);

  useEffect(() => {
    if (!showOnboardingArcHandoff) {
      onboardingArcHandoffHapticPlayedRef.current = false;
      return;
    }
    if (onboardingArcHandoffHapticPlayedRef.current) return;
    onboardingArcHandoffHapticPlayedRef.current = true;
    void HapticsService.trigger('outcome.success');
  }, [showOnboardingArcHandoff]);

  const shouldShowOnboardingGoalGuide =
    Boolean(arc) &&
    arc?.id === lastOnboardingArcId &&
    hasSeenFirstArcCelebration &&
    arcGoals.length === 0 &&
    !hasDismissedOnboardingGoalGuide;

  const onboardingGoalCoachmarkHost = useCoachmarkHost({
    active: Boolean(shouldShowOnboardingGoalGuide && arcGoals.length === 0 && createGoalCtaRef.current),
    stepKey: 'onboardingGoal',
  });

  const shouldOfferArcExploreGuide =
    Boolean(arc) && !showOnboardingArcHandoff && !hasDismissedArcExploreGuide;

  const arcExploreTargetScrollY = useMemo(() => {
    if (arcExploreGuideStep === 0) return 0;
    if (arcExploreGuideStep === 1) {
      return goalsSectionOffset != null ? Math.max(0, goalsSectionOffset - 120) : null;
    }
    return insightsSectionOffset != null ? Math.max(0, insightsSectionOffset - 120) : null;
  }, [arcExploreGuideStep, goalsSectionOffset, insightsSectionOffset]);

  const arcExploreStepReady =
    arcExploreGuideStep === 0 ||
    (arcExploreGuideStep === 1 && goalsSectionOffset != null) ||
    (arcExploreGuideStep === 2 && insightsSectionOffset != null);

  const arcExploreGuideHost = useCoachmarkHost({
    active: shouldOfferArcExploreGuide && arcExploreStepReady,
    stepKey: arcExploreGuideStep,
    targetScrollY: arcExploreTargetScrollY,
    scrollTo: (args) => scrollRef.current?.scrollTo(args),
  });

  useEffect(() => {
    // When the user navigates between Arcs, allow the guide to re-arm if it has not
    // been dismissed yet (still gated by the persisted dismissal flag).
    hasStartedArcExploreGuideRef.current = false;
    setArcExploreGuideStep(0);
  }, [arcId]);

  useEffect(() => {
    if (!shouldOfferArcExploreGuide) return;
    if (hasStartedArcExploreGuideRef.current) return;
    hasStartedArcExploreGuideRef.current = true;
    setArcExploreGuideStep(0);
  }, [shouldOfferArcExploreGuide]);

  const dismissArcExploreGuide = useCallback(() => {
    setHasDismissedArcExploreGuide(true);
  }, [setHasDismissedArcExploreGuide]);

  useEffect(() => {
    if (!__DEV__) return;
    logArcDetailDebug('onboarding:handoff-state', {
      arcId: arc?.id ?? null,
      routeArcId: arcId,
      lastOnboardingArcId,
      hasSeenFirstArcCelebration,
      hasDismissedOnboardingGoalGuide,
      arcGoalsCount: arcGoals.length,
      showCelebrationFromRoute: Boolean(showCelebrationFromRoute),
      showOnboardingArcHandoff,
      shouldShowOnboardingGoalGuide,
    });
  }, [
    arc?.id,
    arcId,
    arcGoals.length,
    hasDismissedOnboardingGoalGuide,
    hasSeenFirstArcCelebration,
    lastOnboardingArcId,
    showCelebrationFromRoute,
    showOnboardingArcHandoff,
    shouldShowOnboardingGoalGuide,
  ]);

  const heroSeed = useMemo(() => {
    if (!arc) {
      return null;
    }
    return buildArcThumbnailSeed(arc.id, arc.name, arc.thumbnailVariant);
  }, [arc]);

  const {
    colors: headerGradientColors,
    direction: headerGradientDirection,
  } = useMemo(() => {
    if (!heroSeed) {
      // Fallback visual so the hook can run safely even when the Arc is missing.
      const fallbackSeed = buildArcThumbnailSeed(
        String(arcId ?? 'missing-arc'),
        'Missing Arc',
        null,
      );
      return getArcGradient(fallbackSeed);
    }
    return getArcGradient(heroSeed);
  }, [heroSeed, arcId]);

  const heroTopoSizes = useMemo(() => {
    if (!heroSeed) {
      return getArcTopoSizes('arc-topography');
    }
    return getArcTopoSizes(heroSeed);
  }, [heroSeed]);

  const heroThumbnailStyle: ThumbnailStyle = useMemo(() => {
    if (!heroSeed) {
      return DEFAULT_THUMBNAIL_STYLE;
    }
    return pickThumbnailStyle(heroSeed, thumbnailStyles);
  }, [heroSeed, thumbnailStyles]);

  const showTopography = heroThumbnailStyle === 'topographyDots';
  const showGeoMosaic = heroThumbnailStyle === 'geoMosaic';

  const [isHeroModalVisible, setIsHeroModalVisible] = useState(false);
  const [heroImageLoading, setHeroImageLoading] = useState(false);
  const [heroImageError, setHeroImageError] = useState('');

  // Hero banner is always visible; the previous "hide banner" toggle has been removed.

  const handleDeleteArc = useCallback(() => {
    if (!arc) {
      return;
    }

    Alert.alert(
      'Delete arc?',
      'This will remove the arc and related goals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeArc(arc.id);
            showToast({
              message: 'Arc deleted',
              variant: 'danger',
              durationMs: 2200,
              behaviorDuringSuppression: 'queue',
            });
            handleBackToArcs();
          },
        },
      ],
    );
  }, [arc, handleBackToArcs, removeArc, showToast]);

  const handleToggleArchiveArc = useCallback(() => {
    if (!arc) return;

    const isArchived = arc.status === 'archived';
    const nextStatus = isArchived ? 'active' : 'archived';
    const actionLabel = isArchived ? 'Restore' : 'Archive';
    const detail = isArchived
      ? 'This will make the arc active again.'
      : 'Archived arcs stay in your history, but are hidden from your main list.';

    Alert.alert(`${actionLabel} arc?`, detail, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        onPress: () => {
          const timestamp = new Date().toISOString();
          updateArc(arc.id, (prev) => ({
            ...prev,
            status: nextStatus,
            updatedAt: timestamp,
          }));
          showToast({
            message: isArchived ? 'Arc restored' : 'Arc archived',
            variant: isArchived ? 'success' : 'default',
            durationMs: 2200,
            behaviorDuringSuppression: 'queue',
          });

          // After archiving, return to the Arcs canvas so users don't end up
          // "stuck" in an archived detail surface.
          if (!isArchived) {
            handleBackToArcs();
          }
        },
      },
    ]);
  }, [arc, handleBackToArcs, showToast, updateArc]);

  const handleShuffleHeroThumbnail = useCallback(() => {
    if (!arc) {
      return;
    }
    const nowIso = new Date().toISOString();
    updateArc(arc.id, (current) => ({
      ...current,
      thumbnailVariant: (current.thumbnailVariant ?? 0) + 1,
      updatedAt: nowIso,
    }));
    // Keep the interaction consistent with uploads: once the banner changes, return
    // the user to the Arc canvas so we don't leave a full-screen overlay up.
    setIsHeroModalVisible(false);
  }, [arc, updateArc]);

  const handleClearHeroImage = useCallback(() => {
    if (!arc) {
      return;
    }
    const nowIso = new Date().toISOString();
    updateArc(arc.id, (current) => ({
      ...current,
      thumbnailUrl: undefined,
      heroImageMeta: undefined,
      updatedAt: nowIso,
    }));
    // Return to the canvas immediately after the banner is cleared.
    setIsHeroModalVisible(false);
  }, [arc, updateArc]);

  const handleUploadHeroImage = useCallback(async () => {
    if (!arc) return;
    try {
      setHeroImageLoading(true);
      setHeroImageError('');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      const nowIso = new Date().toISOString();
      updateArc(arc.id, (current) => ({
        ...current,
        thumbnailUrl: asset.uri,
        heroImageMeta: {
          source: 'upload',
          prompt: current.heroImageMeta?.prompt,
          createdAt: nowIso,
        },
        heroHidden: false,
        updatedAt: nowIso,
      }));
      // After a successful upload, close the banner sheet so the user is returned
      // to the Arc canvas (and we avoid leaving an overlay mounted that can block taps).
      setIsHeroModalVisible(false);
    } catch {
      setHeroImageError('Unable to upload image right now.');
    } finally {
      setHeroImageLoading(false);
    }
  }, [arc, updateArc]);

  const handleSelectCuratedHero = useCallback(
    (image: ArcHeroImage) => {
      if (!arc) return;
      const nowIso = new Date().toISOString();
      updateArc(arc.id, (current) => ({
        ...current,
        thumbnailUrl: image.uri,
        thumbnailVariant: current.thumbnailVariant ?? 0,
        heroImageMeta: {
          source: 'curated',
          prompt: current.heroImageMeta?.prompt,
          createdAt: nowIso,
          curatedId: image.id,
        },
        heroHidden: false,
        updatedAt: nowIso,
      }));
      // After selection, close the sheet to avoid leaving an overlay that can block taps.
      setIsHeroModalVisible(false);
    },
    [arc, updateArc]
  );

  const handleSelectUnsplashHero = useCallback(
    (photo: UnsplashPhoto) => {
      if (!arc) return;
      const nowIso = new Date().toISOString();
      updateArc(arc.id, (current) => ({
        ...current,
        thumbnailUrl: photo.urls.regular,
        heroImageMeta: {
          source: 'unsplash',
          prompt: current.heroImageMeta?.prompt,
          createdAt: nowIso,
          unsplashPhotoId: photo.id,
          unsplashAuthorName: photo.user.name,
          unsplashAuthorLink: withUnsplashReferral(photo.user.links.html),
          unsplashLink: withUnsplashReferral(photo.links.html),
        },
        heroHidden: false,
        updatedAt: nowIso,
      }));
      trackUnsplashDownload(photo.id).catch(() => undefined);
      // After selection, close the sheet to avoid leaving an overlay that can block taps.
      setIsHeroModalVisible(false);
    },
    [arc, updateArc]
  );

  const hasDevelopmentInsights =
    !!arc &&
    ((arc.developmentStrengths && arc.developmentStrengths.length > 0) ||
      (arc.developmentGrowthEdges && arc.developmentGrowthEdges.length > 0) ||
      (arc.developmentPitfalls && arc.developmentPitfalls.length > 0));

  // History tab removed (Airbnb-style listing scroll). We may reintroduce a timeline section later.

  if (!arc) {
    return (
      <AppShell>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyTitle}>Arc not found</Text>
          <Text style={styles.emptyBody}>
            This Arc may have been deleted or is no longer available. You can return to your
            Arcs screen and choose another Arc to open.
          </Text>
          <Button
            variant="primary"
            style={styles.emptyPrimaryButton}
            onPress={handleBackToArcs}
          >
            <Text style={styles.emptyPrimaryLabel}>Back to Arcs</Text>
          </Button>
        </View>
      </AppShell>
    );
  }


  const renderInsightsSection = () => {
    if (!hasDevelopmentInsights) {
      return null;
    }

    const strengths = arc.developmentStrengths ?? [];
    const growthEdges = arc.developmentGrowthEdges ?? [];
    const pitfalls = arc.developmentPitfalls ?? [];

    const normalizeInsightLine = (value: string): string => {
      const trimmed = value.trim();
      // Strip common markdown/list prefixes so we don't double-render bullets.
      return trimmed
        .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const renderItem = ({
      id,
      title,
      lines,
      icon,
    }: {
      id: 'strengths' | 'growthEdges' | 'pitfalls';
      title: string;
      lines: string[];
      icon: IconName;
    }) => {
      const normalized = (lines ?? [])
        .flatMap((line) => line.split('\n'))
        .map(normalizeInsightLine)
        .filter(Boolean);

      if (normalized.length === 0) return null;

      return (
        <View key={id} style={styles.insightItemRow}>
          <View style={styles.insightItemIconCol}>
            <Icon name={icon} size={20} color={colors.textPrimary} />
          </View>
          <View style={styles.insightItemContent}>
            <Text style={styles.insightItemTitle}>{title}</Text>
            <View style={styles.insightItemLines}>
              {normalized.map((line, idx) => (
                <Text key={`${id}-${idx}`} style={styles.insightItemLineText}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        </View>
      );
    };

    return (
      <View
        ref={insightsSectionRef}
        collapsable={false}
        onLayout={(event) => {
          const y = event.nativeEvent.layout.y;
          if (typeof y === 'number' && Number.isFinite(y)) {
            setInsightsSectionOffset(y);
          }
        }}
        style={styles.insightsSectionContainer}
      >
        <Text style={styles.sectionTitleBlock}>Insights</Text>
        <View style={styles.insightsList}>
          {renderItem({
            id: 'strengths',
            title: 'Strengths to build on',
            lines: strengths,
            icon: 'thumbsUp',
          })}
          {renderItem({
            id: 'growthEdges',
            title: 'Growth edges to work on',
            lines: growthEdges,
            icon: 'activity',
          })}
          {renderItem({
            id: 'pitfalls',
            title: 'Pitfalls to watch for',
            lines: pitfalls,
            icon: 'info',
          })}
        </View>
      </View>
    );
  };

  return (
    <AppShell fullBleedCanvas>
      <BottomGuide
        visible={showOnboardingArcHandoff}
        onClose={handleDismissOnboardingArcHandoff}
        scrim="light"
      >
        <Heading variant="sm">🚀 Your first Arc is ready</Heading>
        <Text style={styles.onboardingGuideBody}>
          This Arc is saved to your Arcs list. Next we’ll turn it into a Goal (and then small Activities) so you
          have a clear next step. Tap “Go to Goals” to continue.
        </Text>
        <HStack space="sm" marginTop={spacing.sm} justifyContent="flex-end">
          <Button
            variant="outline"
            onPress={handleDismissOnboardingArcHandoff}
          >
            <Text style={styles.onboardingGuideSecondaryLabel}>Explore first</Text>
          </Button>
          <Button
            variant="turmeric"
            onPress={() => {
              // Step 1: navigate to the Goals tab. The in-context callout there
              // will guide the user to the "Create goals for this Arc" button.
              setShowOnboardingArcHandoff(false);
              setHasSeenFirstArcCelebration(true);
              if (showCelebrationFromRoute && !hasConsumedRouteCelebrationRef.current) {
                hasConsumedRouteCelebrationRef.current = true;
                navigation.setParams({ showFirstArcCelebration: false });
              }
              // Jump to Goals section (Airbnb-style: no tabs).
              requestAnimationFrame(() => {
                if (goalsSectionOffset == null) {
                  return;
                }
                const targetY = Math.max(0, goalsSectionOffset - HEADER_BOTTOM_Y - spacing.md);
                scrollRef.current?.scrollTo({ y: targetY, animated: true });
              });
            }}
          >
            <Text style={styles.onboardingGuidePrimaryLabel}>Go to Goals</Text>
          </Button>
        </HStack>
      </BottomGuide>
      <View style={styles.screen}>
          <ObjectPageHeader
            barHeight={ARC_HEADER_HEIGHT}
            backgroundOpacity={headerBackgroundOpacity}
            actionPillOpacity={headerActionPillOpacity}
            left={
              <HeaderActionPill
                onPress={handleBackToArcs}
                accessibilityLabel="Back to Arcs"
                materialOpacity={headerActionPillOpacity}
              >
                <Icon name="chevronLeft" size={20} color={colors.textPrimary} />
              </HeaderActionPill>
            }
            right={
              <HStack alignItems="center" space="sm">
                <HeaderActionPill
                  onPress={() => {
                    handleShareArc().catch(() => undefined);
                  }}
                  accessibilityLabel="Share arc"
                  materialOpacity={headerActionPillOpacity}
                >
                  <Icon name="share" size={18} color={colors.textPrimary} />
                </HeaderActionPill>
                <DropdownMenu>
                  <DropdownMenuTrigger accessibilityLabel="Arc actions">
                    <HeaderActionPill
                      accessibilityLabel="Arc actions"
                      materialOpacity={headerActionPillOpacity}
                    >
                      <Icon name="more" size={18} color={colors.textPrimary} />
                    </HeaderActionPill>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                    <DropdownMenuItem
                      onPress={() => {
                        setIsHeroModalVisible(true);
                      }}
                    >
                      <View style={styles.menuItemRow}>
                        <Icon name="edit" size={16} color={colors.textSecondary} />
                        <Text style={styles.menuItemLabel}>Edit banner</Text>
                      </View>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onPress={handleToggleArchiveArc}>
                      <View style={styles.menuItemRow}>
                        <Icon
                          name={arc?.status === 'archived' ? 'refresh' : 'archive'}
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.menuItemLabel}>
                          {arc?.status === 'archived' ? 'Restore' : 'Archive'}
                        </Text>
                      </View>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onPress={handleDeleteArc} variant="destructive">
                      <View style={styles.menuItemRow}>
                        <Icon name="trash" size={16} color={colors.destructive} />
                        <Text style={styles.destructiveMenuRowText}>Delete arc</Text>
                      </View>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </HStack>
            }
          />

          <KeyboardAwareScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: spacing['2xl'] + insets.bottom + BOTTOM_CTA_BAR_HEIGHT },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={arcExploreGuideHost.scrollEnabled && onboardingGoalCoachmarkHost.scrollEnabled}
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
            keyboardShouldPersistTaps="handled"
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })}
            scrollEventThrottle={16}
          >
            <View style={styles.pageContent}>
              <View style={styles.arcHeroSection}>
                <View ref={heroBannerRef} collapsable={false}>
                  <View
                    ref={heroSpotlightRef}
                    collapsable={false}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: estimatedVisibleHeroHeightPx,
                    }}
                  />
                  <Animated.View
                    style={{
                      opacity: heroOpacity,
                      transform: [{ translateY: heroParallaxTranslateY }],
                    }}
                  >
                    <TouchableOpacity
                      testID="e2e.arcDetail.heroBanner"
                      style={styles.heroFullBleedWrapper}
                      onPress={() => {
                        logArcDetailDebug('hero:pressed', {
                          previousVisible: isHeroModalVisible,
                        });
                        setIsHeroModalVisible(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Edit Arc banner"
                      activeOpacity={0.95}
                    >
                      {arc.thumbnailUrl ? (
                        <Image
                          source={{ uri: arc.thumbnailUrl }}
                          style={styles.heroFullBleedImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={headerGradientColors}
                          start={headerGradientDirection.start}
                          end={headerGradientDirection.end}
                          style={styles.heroFullBleedImage}
                        />
                      )}
                      {arc.heroImageMeta?.source === 'unsplash' &&
                      arc.heroImageMeta.unsplashAuthorName &&
                      arc.heroImageMeta.unsplashAuthorLink &&
                      arc.heroImageMeta.unsplashLink ? (
                        <View pointerEvents="box-none" style={styles.heroAttributionOverlay}>
                          <View style={styles.heroAttributionPill}>
                            <Text style={styles.heroAttributionText} numberOfLines={1} ellipsizeMode="tail">
                              Photo by{' '}
                              <Text
                                style={[styles.heroAttributionText, styles.heroAttributionLink]}
                                onPress={() => {
                                  Linking.openURL(arc.heroImageMeta!.unsplashAuthorLink!).catch(() => {});
                                }}
                              >
                                {arc.heroImageMeta.unsplashAuthorName}
                              </Text>{' '}
                              on{' '}
                              <Text
                                style={[styles.heroAttributionText, styles.heroAttributionLink]}
                                onPress={() => {
                                  Linking.openURL(arc.heroImageMeta!.unsplashLink!).catch(() => {});
                                }}
                              >
                                Unsplash
                              </Text>
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              <View
                ref={sheetTopRef}
                collapsable={false}
                onLayout={measureSheetTopAtRest}
                style={styles.arcSheet}
              >
                <View style={styles.arcSheetInner}>
                  <View style={styles.arcTypePillRow}>
                    <HStack style={styles.arcTypePill} alignItems="center" space="xs">
                      <Icon name="arcs" size={12} color={colors.textSecondary} />
                      <Text style={styles.arcTypePillLabel}>Arc</Text>
                    </HStack>
                  </View>
                  <NarrativeEditableTitle
                    value={arc.name}
                    placeholder="Name this Arc"
                    accessibilityLabel="Edit arc name"
                    onCommit={(trimmed) => {
                      if (!trimmed || trimmed === arc.name) return;
                      updateArc(arc.id, (current) => ({
                        ...current,
                        name: trimmed,
                        updatedAt: new Date().toISOString(),
                      }));
                      showToast({
                        message: 'Arc renamed',
                        variant: 'success',
                        durationMs: 1800,
                        behaviorDuringSuppression: 'queue',
                      });
                    }}
                    textStyle={styles.arcNarrativeTitle}
                    inputStyle={styles.arcNarrativeTitleInput}
                    containerStyle={styles.arcNarrativeTitleContainer}
                    validate={(nextTrimmed) => {
                      if (!nextTrimmed.trim()) return 'Name cannot be empty';
                      return null;
                    }}
                  />
                  <Text style={styles.arcTitleMeta}>
                    {arcGoals.length === 0
                      ? 'No goals yet'
                      : `${arcGoals.length} goal${arcGoals.length === 1 ? '' : 's'} · ${completedArcGoals.length} completed`}
                  </Text>

                  <View style={{ marginTop: spacing.sm }}>
                    <LongTextField
                      label="Description"
                      hideLabel
                      surfaceVariant="flat"
                      value={arc.narrative ?? ''}
                      placeholder="Add a short note about this Arc…"
                      enableAi
                      aiContext={{
                        objectType: 'arc',
                        objectId: arc.id,
                        fieldId: 'narrative',
                      }}
                      onChange={(nextNarrative) => {
                        const trimmed = nextNarrative.trim();
                        updateArc(arc.id, (current) => ({
                          ...current,
                          narrative: trimmed.length === 0 ? undefined : trimmed,
                          updatedAt: new Date().toISOString(),
                        }));
                      }}
                      onRequestAiHelp={({ objectType, objectId, fieldId, currentText }) => {
                        openForFieldContext({
                          objectType,
                          objectId,
                          fieldId,
                          currentText,
                          fieldLabel: 'Arc narrative',
                        });
                      }}
                    />
                  </View>

                  <View
                    style={styles.goalsSection}
                    onLayout={(event) => {
                      setGoalsSectionOffset(event.nativeEvent.layout.y);
                    }}
                  >
                    <View style={[styles.sectionDivider, styles.sectionDividerTightTop]} />
                    <View style={styles.goalsDrawerInner}>
                      <View
                        ref={goalsHeaderRef}
                        collapsable={false}
                        style={[
                          styles.goalsDrawerHeaderRow,
                          styles.goalsDrawerHeaderRowRaised,
                          styles.goalsHeaderRowLeft,
                        ]}
                      >
                        <Text style={styles.sectionTitle}>Goals <Text style={styles.goalCount}>({arcGoals.length})</Text></Text>
                      </View>

                      {arcGoals.length === 0 ? (
                        <OpportunityCard
                          title="Turn this Arc into clear goals"
                          body={'Add 3–5 goals so kwilt knows what "success" looks like here.'}
                          tone="brand"
                          shadow="layered"
                          ctaLabel="Create goal"
                          ctaVariant="inverse"
                          ctaLeadingIconName="sparkles"
                          onPressCta={() => {
                            setHasDismissedOnboardingGoalGuide(true);
                            setIsGoalCoachVisible(true);
                          }}
                          ctaAccessibilityLabel="Create a goal for this Arc"
                          style={{ marginTop: spacing.md }}
                        />
                      ) : (
                        <View style={styles.goalsScrollContent}>
                          <View style={{ gap: 0 }}>
                            {arcGoals.map((goal) => (
                              <GoalListCard
                                key={goal.id}
                                goal={goal}
                                parentArc={arc}
                                activityCount={activityCountByGoal[goal.id] ?? 0}
                                thumbnailStyles={thumbnailStyles}
                                density="dense"
                                variant="flat"
                                showActivityMeta={false}
                                onPress={() =>
                                  navigation.navigate('GoalDetail', {
                                    goalId: goal.id,
                                    entryPoint: 'arcsStack',
                                  })
                                }
                              />
                            ))}
                          </View>
                        </View>
                      )}

                      <View
                        collapsable={false}
                        style={{
                          marginTop: arcGoals.length === 0 ? spacing.sm : spacing.xs,
                        }}
                      >
                        {arcGoals.length > 0 ? (
                          <Button
                            variant="secondary"
                            fullWidth
                            onPress={() => {
                              setHasDismissedOnboardingGoalGuide(true);
                              setIsGoalCoachVisible(true);
                            }}
                            accessibilityLabel="Add goal"
                          >
                            <Text style={styles.goalsAddSecondaryLabel}>Add goal</Text>
                          </Button>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {hasDevelopmentInsights ? (
                    <>
                      <View
                        style={styles.sectionDivider}
                      />
                      {renderInsightsSection()}
                    </>
                  ) : null}

                  {headerV2Enabled ? (
                    <View style={{ paddingTop: spacing.lg }}>
                      <Card>
                        <Text style={styles.actionsTitle}>Actions</Text>
                        <VStack space="sm" style={{ marginTop: spacing.sm }}>
                          <Button
                            variant="secondary"
                            fullWidth
                            onPress={handleToggleArchiveArc}
                            accessibilityLabel={arc?.status === 'archived' ? 'Restore arc' : 'Archive arc'}
                          >
                            <Text style={styles.actionsButtonLabel}>
                              {arc?.status === 'archived' ? 'Restore arc' : 'Archive arc'}
                            </Text>
                          </Button>
                          <Button
                            variant="destructive"
                            fullWidth
                            onPress={handleDeleteArc}
                            accessibilityLabel="Delete arc"
                          >
                            <Text style={styles.actionsButtonLabelDestructive}>Delete arc</Text>
                          </Button>
                        </VStack>
                      </Card>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </KeyboardAwareScrollView>
          <View
            pointerEvents="box-none"
            style={[styles.bottomCtaBar, { paddingBottom: insets.bottom }]}
          >
            <View style={styles.bottomCtaRow}>
              <View style={styles.bottomCtaLeftMeta}>
                <Text style={styles.bottomCtaMetaTitle}>Goals</Text>
                <Text style={styles.bottomCtaMetaBody}>
                  {arcGoals.length === 0
                    ? 'None yet'
                    : `${completedArcGoals.length}/${arcGoals.length} completed`}
                </Text>
              </View>
              <View style={styles.bottomCtaRight}>
                <View
                  ref={createGoalCtaRef}
                  collapsable={false}
                  style={styles.bottomCtaActionTarget}
                >
                  {shouldShowOnboardingGoalGuide ? (
                    <View pointerEvents="none" style={styles.bottomCtaPrimaryButtonRing} />
                  ) : null}
                <Button
                  variant="ai"
                  fullWidth={false}
                  onPress={() => {
                    setHasDismissedOnboardingGoalGuide(true);
                    setIsGoalCoachVisible(true);
                  }}
                  accessibilityLabel="Create a goal for this Arc"
                >
                  <Text style={styles.bottomCtaLabel}>Create goal</Text>
                </Button>
                </View>
              </View>
            </View>
          </View>
        </View>
      <ArcBannerSheet
        visible={isHeroModalVisible}
        onClose={() => setIsHeroModalVisible(false)}
        arcName={arc.name}
        arcNarrative={arc.narrative}
        arcGoalTitles={arcGoals.map((goal) => goal.title)}
        canUseUnsplash={isPro}
        onRequestUpgrade={() =>
          openPaywallInterstitial({ reason: 'pro_only_unsplash_banners', source: 'arc_banner_sheet' })
        }
        heroSeed={
          heroSeed ??
          buildArcThumbnailSeed(arc.id, arc.name, arc.thumbnailVariant)
        }
        hasHero={Boolean(arc.thumbnailUrl)}
        loading={heroImageLoading}
        error={heroImageError}
        thumbnailUrl={arc.thumbnailUrl}
        heroGradientColors={headerGradientColors}
        heroGradientDirection={headerGradientDirection}
        heroTopoSizes={heroTopoSizes}
        showTopography={showTopography}
        showGeoMosaic={showGeoMosaic}
        onGenerate={handleShuffleHeroThumbnail}
        onUpload={() => {
          void handleUploadHeroImage();
        }}
        onRemove={handleClearHeroImage}
        onSelectCurated={handleSelectCuratedHero}
        onSelectUnsplash={handleSelectUnsplashHero}
      />
      <GoalCoachDrawer
        visible={isGoalCoachVisible}
        onClose={() => setIsGoalCoachVisible(false)}
        arcs={arcs}
        goals={goals}
        launchFromArcId={arc.id}
        navigateToGoalDetailOnCreate={false}
        onGoalCreated={(goalId) => {
          setLastOnboardingGoalId(goalId);
          // During onboarding, immediately route into the new Goal canvas so the
          // user can add Activities and reach minimum value quickly.
          if (arc.id === lastOnboardingArcId) {
            navigation.navigate('GoalDetail', {
              goalId,
              entryPoint: 'arcsStack',
            });
          }
        }}
      />
      {/* Agent FAB entry for Arc detail is temporarily disabled for MVP.
          Once the tap-centric Agent entry is refined for object canvases,
          we can reintroduce a contextual FAB here that fits the final UX. */}
      {AgentWorkspaceSheet}
      <Coachmark
        visible={Boolean(
          arcExploreGuideHost.coachmarkVisible &&
            (arcExploreGuideStep === 0
              ? heroSpotlightRef.current
              : arcExploreGuideStep === 1
                ? goalsHeaderRef.current
                : hasDevelopmentInsights && insightsSectionRef.current),
        )}
        targetRef={
          arcExploreGuideStep === 0
            ? heroSpotlightRef
            : arcExploreGuideStep === 1
              ? goalsHeaderRef
              : insightsSectionRef
        }
        remeasureKey={arcExploreGuideHost.remeasureKey}
        scrimToken="subtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={18}
        offset={spacing.xs}
        highlightColor={colors.turmeric}
        actionColor={colors.turmeric}
        attentionPulse
        attentionPulseDelayMs={2500}
        attentionPulseDurationMs={12000}
        title={
          <Text style={styles.arcExploreCoachmarkTitle}>
            {arcExploreGuideStep === 0
              ? 'Make this Arc yours'
              : arcExploreGuideStep === 1
                ? 'Turn it into goals'
                : 'Review your insights'}
          </Text>
        }
        body={
          <Text style={styles.arcExploreCoachmarkBody}>
            {arcExploreGuideStep === 0
              ? 'Tap the banner to change the image (upload, curated picks, or search the image library).'
              : arcExploreGuideStep === 1
                ? 'Scroll down to the Goals section and add 3–5 goals so kwilt knows what success looks like.'
                : 'We generated insights to help you steer this chapter. Review them and adjust your goals or plan as needed.'}
          </Text>
        }
        progressLabel={`${arcExploreGuideStep + 1} of ${hasDevelopmentInsights ? 3 : 2}`}
        actions={[
          { id: 'skip', label: 'Skip', variant: 'outline' },
          {
            id:
              arcExploreGuideStep + 1 < (hasDevelopmentInsights ? 3 : 2) ? 'next' : 'done',
            label:
              arcExploreGuideStep + 1 < (hasDevelopmentInsights ? 3 : 2) ? 'Next' : 'Got it',
            variant: 'accent',
          },
        ]}
        onAction={(actionId) => {
          if (actionId === 'skip') {
            dismissArcExploreGuide();
            return;
          }
          if (actionId === 'next') {
            const totalSteps = hasDevelopmentInsights ? 3 : 2;
            setArcExploreGuideStep((current) => Math.min(current + 1, totalSteps - 1));
            return;
          }
          dismissArcExploreGuide();
        }}
        onDismiss={dismissArcExploreGuide}
        placement="below"
      />
      <Coachmark
        visible={onboardingGoalCoachmarkHost.coachmarkVisible}
        targetRef={createGoalCtaRef}
        remeasureKey={onboardingGoalCoachmarkHost.remeasureKey}
        scrimToken="pineSubtle"
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={16}
        offset={spacing.xs}
        highlightColor={colors.turmeric}
        actionColor={colors.turmeric}
        attentionPulse
        attentionPulseDelayMs={3000}
        attentionPulseDurationMs={15000}
        title={<Text style={styles.goalCoachmarkTitle}>Next step</Text>}
        body={
          <Text style={styles.goalCoachmarkBody}>
            Tap “Create goal" to add your first goal.
          </Text>
        }
        onDismiss={() => setHasDismissedOnboardingGoalGuide(true)}
        placement="above"
      />
    </AppShell>
  );
}

type ArcNarrativeEditorSheetProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  narrative?: string;
  onSave: (nextNarrative: string) => void;
};

function ArcNarrativeEditorSheet({
  visible,
  onClose,
  arcName,
  narrative,
  onSave,
}: ArcNarrativeEditorSheetProps) {
  const [draft, setDraft] = useState(narrative ?? '');

  useEffect(() => {
    setDraft(narrative ?? '');
  }, [narrative]);

  if (!visible) {
    return null;
  }

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['90%']}>
      <View style={styles.narrativeSheetContent}>
        <View style={styles.narrativeSheetHeaderRow}>
          <View style={styles.narrativeSheetHeaderSide}>
            <Button
              variant="ghost"
              onPress={onClose}
              style={styles.narrativeSheetHeaderButton}
            >
              <Text style={styles.narrativeSheetHeaderLinkText}>Cancel</Text>
            </Button>
          </View>
          <View style={styles.narrativeSheetHeaderCenter}>
            <Text style={styles.narrativeSheetTitle}>Arc note</Text>
            <Text style={styles.narrativeSheetSubtitle} numberOfLines={1}>
              {arcName}
            </Text>
          </View>
          <View style={styles.narrativeSheetHeaderSideRight}>
            <Button
              variant="ghost"
              onPress={handleSave}
              style={styles.narrativeSheetHeaderButton}
            >
              <Text style={styles.narrativeSheetHeaderPrimaryText}>Done</Text>
            </Button>
          </View>
        </View>

        <View style={styles.narrativeRichToolbar}>
          <View style={styles.narrativeRichToolbarModePill}>
            <Text style={styles.narrativeRichToolbarModeText}>Body</Text>
          </View>
          <View style={styles.narrativeRichToolbarSpacer} />
          <View style={styles.narrativeRichToolbarGroup}>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>B</Text>
            </View>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>I</Text>
            </View>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>U</Text>
            </View>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>•</Text>
            </View>
          </View>
        </View>

        <View style={styles.narrativeSheetEditorContainer}>
          <TextInput
            style={styles.narrativeSheetTextInput}
            multiline
            textAlignVertical="top"
            placeholder="Describe this Arc in your own words. What future version of you is this chapter about, and how do you imagine it changing your goals and days?"
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            autoFocus
          />
        </View>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Header styles live in `ObjectPageHeader`.
  bottomCtaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    // Used to reserve scroll space so content doesn't hide beneath the CTA.
    minHeight: 92,
  },
  bottomCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  bottomCtaLeftMeta: {
    flex: 1,
    minWidth: 120,
  },
  bottomCtaRight: {
    alignItems: 'flex-end',
  },
  bottomCtaActionTarget: {
    position: 'relative',
    alignSelf: 'flex-end',
  },
  bottomCtaPrimaryButtonRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  bottomCtaMetaTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  bottomCtaMetaBody: {
    ...typography.bodySm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  bottomCtaLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
    flexGrow: 1,
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
  goalsDrawerInner: {
    paddingHorizontal: 0,
    // paddingTop: spacing.xs,
    paddingBottom: 0,
  },
  paddedSection: {
    // Let the AppShell define the primary horizontal gutters so this screen
    // matches other canvases. We only add vertical spacing here.
    paddingHorizontal: 0,
  },
  arcHeaderSection: {
    marginTop: spacing.lg,
  },
  heroContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  arcHeroSection: {
    height: 320,
    backgroundColor: colors.canvas,
  },
  heroFullBleedWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.shellAlt,
  },
  heroFullBleedImage: {
    width: '100%',
    height: '100%',
  },
  arcSheet: {
    marginTop: -28,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  arcSheetInner: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  heroImageWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroImage: {
    width: '100%',
    // Match the Arc list card hero: a wide banner that still leaves room
    // for content below.
    aspectRatio: 12 / 5,
  },
  heroMinimal: {
    width: '100%',
    aspectRatio: 12 / 5,
    backgroundColor: colors.shellAlt,
  },
  buttonTextAlt: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  heroModalPreviewSection: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  heroModalContainer: {
    flex: 1,
  },
  heroModalSubheader: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  heroModalSourceTabs: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  heroModalCard: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.sm,
  },
  heroModalScroll: {
    flex: 1,
  },
  heroModalScrollContent: {
    paddingBottom: spacing.lg,
  },
  heroModalPreviewColumn: {
    flexBasis: '50%',
    flexGrow: 1,
    minWidth: 220,
  },
  heroModalPreviewFrame: {
    width: '100%',
      // Match the main Arc hero banner aspect ratio so the preview feels 1:1.
      aspectRatio: 12 / 5,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.shellAlt,
  },
  heroModalPreviewInner: {
    flex: 1,
  },
  heroModalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  heroModalControls: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 220,
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  heroModalAction: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroModalActionButton: {
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroModalActionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  heroModalSupportText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  heroModalUploadContainer: {
    width: '100%',
  },
  heroModalUpload: {
    width: '100%',
  },
  heroCuratedThumbnailWrapper: {
    width: 96,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  heroCuratedThumbnailWrapperSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  heroCuratedThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  heroUnsplashSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroUnsplashInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    minHeight: 40,
  },
  heroUnsplashSearchLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  heroModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    paddingTop: spacing.sm,
  },
  heroModalFooterButton: {
    flex: 1,
  },
  heroModalFooterLink: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: fonts.semibold,
  },
  heroModalFooterPrimary: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
    fontFamily: fonts.semibold,
  },
  heroMetaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.xl,
  },
  heroAttributionOverlay: {
    position: 'absolute',
    // Keep this in the bottom-right, but lift it above the sheet overlap.
    bottom: spacing.sm + 28,
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
    // Micro caption: keep it subtle and compact.
    fontSize: 11,
    lineHeight: 13,
    color: colors.textPrimary,
  },
  heroAttributionLink: {
    textDecorationLine: 'underline',
  },
  // Thumbnail used in the header row – smaller, card-like image.
  arcThumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
  },
  arcThumbnailInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  arcThumbnail: {
    width: '100%',
    height: '100%',
  },
  arcHeroTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcHeroTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  arcHeroTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcHeroTopoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  arcHeroTopoDotSmall: {
    width: 4,
    height: 4,
  },
  arcHeroTopoDotMedium: {
    width: 7,
    height: 7,
  },
  arcHeroTopoDotLarge: {
    width: 10,
    height: 10,
  },
  arcHeroTopoDotHidden: {
    opacity: 0,
  },
  arcHeroMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  arcHeroMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcHeroMosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcHeroMosaicShapeBase: {
    borderRadius: 999,
  },
  arcHeroMosaicCircle: {
    width: '70%',
    height: '70%',
  },
  arcHeroMosaicPillVertical: {
    width: '55%',
    height: '100%',
  },
  arcHeroMosaicPillHorizontal: {
    width: '100%',
    height: '55%',
  },
  arcHeroInitial: {
    ...typography.titleSm,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  optionsButton: {
    borderRadius: 999,
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
  },
  goalCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcTitle: {
    // Primary Arc title – slightly larger than list card titles for hierarchy
    ...typography.titleSm,
    fontFamily: fonts.extrabold,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  arcTitleInput: {
    // Match the display title sizing so inline edits feel 1:1
    ...typography.titleSm,
    fontFamily: fonts.extrabold,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
    padding: 0,
    margin: 0,
  },
  arcNarrative: {
    // Arc description – bump to the base body size for better readability
    ...typography.body,
    color: colors.textPrimary,
  },
  arcNarrativePlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  arcNarrativeInput: {
    // Keep edit state consistent with the display narrative
    ...typography.body,
    color: colors.textSecondary,
    padding: 0,
    margin: 0,
  },
  editableField: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  // Remove top padding from the Arc name wrapper so the text baseline
  // aligns more closely with the top edge of the thumbnail.
  arcNameEditableField: {
    paddingTop: 0,
    // Hug the thumbnail closely on the left while preserving the
    // general editable field padding on the right.
    paddingLeft: 0,
  },
  editableFieldActive: {
    borderColor: colors.accent,
  },
  inlineEditOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  objectTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  objectTypeLabel: {
    // Centered object type label (e.g. "Arc") that visually balances between
    // the back and overflow buttons in the header, without forcing uppercase.
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
  arcNarrativeTitleContainer: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  arcNarrativeTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
    textAlign: 'center',
    maxWidth: 420,
  },
  arcTitleMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  arcNarrativeTitleInput: {
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
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  sectionTitleBlock: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  goalsDrawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalsDrawerHeaderRowRaised: {
    paddingBottom: spacing.sm,
  },
  goalsHeaderRowLeft: {
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
  },
  goalsSection: {
    marginTop: 0,
  },
  sectionDivider: {
    // Canonical section rhythm: keep divider spacing perfectly symmetric.
    // If the gap below reads well, the gap above should match exactly.
    marginVertical: spacing.xl,
    // Use a full-width, pill-shaped rule so the section break is legible
    // against the light shell background while still feeling airy.
    height: StyleSheet.hairlineWidth,
    // Darker than `colors.border` so it reads as a real divider even at hairline thickness.
    backgroundColor: colors.gray300,
    borderRadius: 999,
  },
  sectionDividerTightTop: {
    // Optical compensation: the narrative LongTextField (flat) and rich text rendering
    // can make the space *above* the first divider read slightly larger than below.
    // Reduce only the top margin here to preserve the overall airy rhythm while
    // restoring perceived symmetry.
    marginTop: spacing.xl - spacing.sm,
  },
  sectionActionText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  linkText: {
    ...typography.body,
    color: colors.accent,
  },
  buttonText: {
    ...typography.body,
    color: colors.canvas,
  },
  goalCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  goalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  emptyPrimaryButton: {
    marginTop: spacing.sm,
    minWidth: 180,
  },
  emptyPrimaryLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
  },
  goalsEmptyState: {
    marginTop: spacing.lg,
  },
  arcTypePillRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  arcTypePill: {
    backgroundColor: colors.gray100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  arcTypePillLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 14,
  },
  goalsScroll: {
    marginTop: spacing.md,
  },
  goalsScrollContent: {
    paddingBottom: spacing.lg,
  },
  goalsEmptyStateContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: spacing.lg,
    backgroundColor: colors.canvas,
    shadowColor: cardSurfaceStyle.shadowColor,
    shadowOpacity: cardSurfaceStyle.shadowOpacity,
    shadowRadius: cardSurfaceStyle.shadowRadius,
    shadowOffset: cardSurfaceStyle.shadowOffset,
    elevation: (cardSurfaceStyle as any).elevation,
    borderWidth: cardSurfaceStyle.borderWidth,
    borderColor: cardSurfaceStyle.borderColor,
  },
  goalsEmptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  goalsEmptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  goalsEmptyPrimaryButton: {
    width: '100%',
  },
  goalsEmptyPrimaryLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
  },
  goalsAddSecondaryLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  goalsPrimaryButtonWrapper: {
    position: 'relative',
    width: '100%',
  },
  goalsPrimaryButtonRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  goalCoachmarkTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalCoachmarkBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcExploreCoachmarkTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  arcExploreCoachmarkBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  goalsEmptyImageWrapper: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  goalsEmptyImage: {
    ...StyleSheet.absoluteFillObject,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  recommendationCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  firstArcInterstitialCard: {
    width: '100%',
    borderRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
    rowGap: spacing.md,
  },
  firstArcTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  firstArcInterstitialBody: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  forceIntentRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  intentChip: {
    ...typography.bodySm,
    color: colors.textSecondary,
    backgroundColor: colors.cardMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrimStrong,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  modalContent: {
    // Let the BottomDrawer sheet act as the primary surface so the hero picker
    // feels like a full-bleed workspace instead of a card sitting on top.
    flex: 1,
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
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  questionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 60,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  recommendationsEntryButton: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  recommendationsEntryText: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
    fontFamily: typography.titleSm.fontFamily,
  },
  recommendationsModalContent: {
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    height: '95%',
  },
  recommendationsOverlay: {
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  recommendationsCloseButton: {
    borderRadius: 999,
    width: 32,
    height: 32,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
    width: '100%',
  },
  menuItemLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  destructiveMenuRowText: {
    ...typography.bodySm,
    color: colors.destructive,
    fontFamily: fonts.medium,
  },
  narrativeSheetContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  narrativeSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  narrativeSheetHeaderSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  narrativeSheetHeaderSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  narrativeSheetHeaderCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrativeSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  narrativeSheetSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  narrativeSheetHeaderButton: {
    minHeight: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  narrativeSheetHeaderLinkText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  narrativeSheetHeaderPrimaryText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.medium,
  },
  narrativeRichToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    marginBottom: spacing.md,
  },
  narrativeRichToolbarModePill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.canvas,
  },
  narrativeRichToolbarModeText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  narrativeRichToolbarSpacer: {
    flex: 1,
  },
  narrativeRichToolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  narrativeRichToolbarButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.canvas,
  },
  narrativeRichToolbarButtonText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  narrativeSheetEditorContainer: {
    flex: 1,
    marginTop: spacing.sm,
  },
  narrativeSheetTextInput: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.canvas,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  insightsSectionContainer: {
    marginTop: 0,
  },
  insightsList: {
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  insightItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.md,
  },
  insightItemIconCol: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  insightItemContent: {
    flex: 1,
  },
  insightItemTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  insightItemLines: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  insightItemLineText: {
    ...typography.bodySm,
    color: colors.sumi800,
  },
  segmentedControlRow: {
    marginTop: 0,
    marginBottom: spacing.lg,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    alignSelf: 'flex-start',
  },
  segmentedOption: {
    paddingHorizontal: spacing.lg,
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
  historyTabPlaceholder: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  historyTabTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  historyTabBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
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
    marginTop: spacing.lg,
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
  goalNextStepToastContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    // `bottom` is injected at render time so we can respect safe area insets.
    zIndex: 5,
  },
  goalNextStepToast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    // Let the shared Card primitive provide elevation and border styling so
    // this banner visually matches other elevated surfaces.
  },
  goalNextStepTextColumn: {
    flex: 1,
    marginRight: spacing.sm,
    rowGap: spacing.xs / 2,
  },
  goalNextStepTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  goalNextStepBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalNextStepActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  goalNextStepCtaLabel: {
    ...typography.bodySm,
    color: colors.canvas,
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
});


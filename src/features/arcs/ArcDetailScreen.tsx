import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Share,
  StyleProp,
  ViewStyle,
  Text,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { ThumbnailStyle } from '../../domain/types';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/Icon';
import { VStack, Heading, HStack, CelebrationGif } from '../../ui/primitives';
import { EditableField } from '../../ui/EditableField';
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
import { BottomDrawer } from '../../ui/BottomDrawer';
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
import { ARC_HERO_LIBRARY, type ArcHeroImage } from './arcHeroLibrary';
import { searchUnsplashPhotos, type UnsplashPhoto } from '../../services/unsplash';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import { GoalCoachDrawer } from '../goals/GoalsScreen';
import { SegmentedControl } from '../../ui/SegmentedControl';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ArcDetailScreen() {
  const route = useRoute<ArcDetailRouteProp>();
  const navigation = useNavigation<ArcDetailNavigationProp>();
  const { arcId, openGoalCreation, showFirstArcCelebration: showCelebrationFromRoute } =
    route.params;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);

  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const removeArc = useAppStore((state) => state.removeArc);
  const updateArc = useAppStore((state) => state.updateArc);
  const addGoal = useAppStore((state) => state.addGoal);
  const lastOnboardingArcId = useAppStore((state) => state.lastOnboardingArcId);
  const hasSeenFirstArcCelebration = useAppStore(
    (state) => state.hasSeenFirstArcCelebration
  );
  const setHasSeenFirstArcCelebration = useAppStore(
    (state) => state.setHasSeenFirstArcCelebration
  );

  const arc = useMemo(() => arcs.find((item) => item.id === arcId), [arcs, arcId]);
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
  const [showFirstArcCelebration, setShowFirstArcCelebration] = useState(
    Boolean(showCelebrationFromRoute),
  );
  const [showGoalNextStepToast, setShowGoalNextStepToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'goals' | 'history'>(
    'details',
  );
  const [goalsSectionOffset, setGoalsSectionOffset] = useState(0);
  const [openInsightsSection, setOpenInsightsSection] = useState<
    'strengths' | 'growthEdges' | 'pitfalls' | null
  >(null);

  const { openForScreenContext, openForFieldContext, AgentWorkspaceSheet } = useAgentLauncher();

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

  const handleDismissFirstArcCelebration = () => {
    setShowFirstArcCelebration(false);
    setHasSeenFirstArcCelebration(true);
    // After the brief full-screen celebration, gently invite the user to
    // create a goal without blocking the Arc canvas.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGoalNextStepToast(true);
  };

  useEffect(() => {
    // If the navigation explicitly requested the celebration (for example,
    // immediately after onboarding), honor that first.
    if (showCelebrationFromRoute) {
      setShowFirstArcCelebration(true);
      return;
    }
    if (
      arc &&
      arc.id === lastOnboardingArcId &&
      !hasSeenFirstArcCelebration
    ) {
      setShowFirstArcCelebration(true);
    }
  }, [arc, lastOnboardingArcId, hasSeenFirstArcCelebration, showCelebrationFromRoute]);

  // Auto-dismiss the full-screen celebration after a short beat so it feels
  // like a transition moment rather than a blocking dialog.
  useEffect(() => {
    if (!showFirstArcCelebration) {
      return;
    }
    const timeoutId = setTimeout(() => {
      handleDismissFirstArcCelebration();
    }, 2200);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showFirstArcCelebration]);

  // Let the toast linger long enough to be noticed, but disappear on its own
  // so it never feels like a permanent overlay.
  useEffect(() => {
    if (!showGoalNextStepToast) {
      return;
    }
    const timeoutId = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowGoalNextStepToast(false);
    }, 9000);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [showGoalNextStepToast]);

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

  const isHeroHidden = arc?.heroHidden ?? false;

  useEffect(() => {
    logArcDetailDebug('heroModal:visibility-changed', {
      isHeroModalVisible,
    });
  }, [isHeroModalVisible]);

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
            handleBackToArcs();
          },
        },
      ],
    );
  }, [arc, handleBackToArcs, removeArc]);

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
  }, [arc, updateArc]);

  const handleToggleHeroHidden = useCallback(() => {
    if (!arc) {
      return;
    }
    const nowIso = new Date().toISOString();
    updateArc(arc.id, (current) => ({
      ...current,
      heroHidden: !current.heroHidden,
      updatedAt: nowIso,
    }));
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
          unsplashAuthorLink: photo.user.links.html,
          unsplashLink: photo.links.html,
        },
        heroHidden: false,
        updatedAt: nowIso,
      }));
    },
    [arc, updateArc]
  );

  const hasDevelopmentInsights =
    !!arc &&
    ((arc.developmentStrengths && arc.developmentStrengths.length > 0) ||
      (arc.developmentGrowthEdges && arc.developmentGrowthEdges.length > 0) ||
      (arc.developmentPitfalls && arc.developmentPitfalls.length > 0));

  type ArcHistoryEventKind = 'arcCreated' | 'goalCreated' | 'goalCompleted' | 'activityCompleted';

  type ArcHistoryEvent = {
    id: string;
    kind: ArcHistoryEventKind;
    timestamp: string;
    title: string;
    dateLabel: string;
    meta?: string;
  };

  const arcHistoryEvents: ArcHistoryEvent[] = useMemo(() => {
    // When an Arc has been deleted (or the detail screen is mounted with a
    // stale / missing `arcId`), avoid trying to build a history timeline.
    // This keeps the hooks tree stable while letting the early-return
    // "Arc not found" state render safely.
    if (!arc) {
      return [];
    }

    const events: ArcHistoryEvent[] = [];

    const formatDateLabel = (timestamp: string) =>
      new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    events.push({
      id: `arc-created-${arc.id}`,
      kind: 'arcCreated',
      timestamp: arc.createdAt,
      title: 'Arc created',
      dateLabel: formatDateLabel(arc.createdAt),
      meta: undefined,
    });

    arcGoals.forEach((goal) => {
      events.push({
        id: `goal-created-${goal.id}`,
        kind: 'goalCreated',
        timestamp: goal.createdAt,
        title: `Goal created: ${goal.title}`,
        dateLabel: formatDateLabel(goal.createdAt),
        meta: undefined,
      });

      if (goal.status === 'completed') {
        const completedTimestamp = goal.updatedAt ?? goal.createdAt;
        events.push({
          id: `goal-completed-${goal.id}`,
          kind: 'goalCompleted',
          timestamp: completedTimestamp,
          title: `Goal completed: ${goal.title}`,
          dateLabel: formatDateLabel(completedTimestamp),
          meta: undefined,
        });
      }
    });

    completedArcActivities.forEach((activity) => {
      if (!activity.completedAt) return;
      const goalTitle = arcGoals.find((goal) => goal.id === activity.goalId)?.title;
      const minutes = activity.actualMinutes ?? undefined;

      const metaParts: string[] = [];
      if (goalTitle) {
        metaParts.push(goalTitle);
      }
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

    return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [arc, arcGoals, completedArcActivities]);

  if (!arc) {
    return (
      <AppShell>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyTitle}>Arc not found</Text>
          <Text style={styles.emptyBody}>
            This Arc may have been deleted or is no longer available. You can return to your
            Arcs canvas and choose another Arc to open.
          </Text>
          <Button
            variant="accent"
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

    const renderBlock = (
      id: 'strengths' | 'growthEdges' | 'pitfalls',
      title: string,
      bullets: string[],
    ) => {
      const isOpen = openInsightsSection === id;
      const hasBullets = bullets.length > 0;
      if (!hasBullets) return null;

      let headerIcon: IconName;
      let headerIconColor = colors.textSecondary;
      if (id === 'strengths') {
        headerIcon = 'thumbsUp';
        headerIconColor = colors.success;
      } else if (id === 'growthEdges') {
        headerIcon = 'activity';
        headerIconColor = colors.turmeric;
      } else {
        headerIcon = 'info';
        headerIconColor = colors.warning;
      }

      const blockStyles: any[] = [styles.insightBlock];
      if (isOpen) {
        blockStyles.push(styles.insightBlockActive);
      }

      return (
        <TouchableOpacity
          key={id}
          activeOpacity={0.85}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOpenInsightsSection((current) => (current === id ? null : id));
          }}
          style={blockStyles}
        >
          <View style={styles.insightHeaderRow}>
            <View style={styles.insightHeaderLeft}>
              <Icon name={headerIcon} size={16} color={headerIconColor} />
              <Text style={styles.insightTitle}>{title}</Text>
            </View>
            <Icon
              name={isOpen ? 'chevronUp' : 'chevronDown'}
              size={18}
              color={colors.textSecondary}
            />
          </View>
          {isOpen && (
            <View style={styles.insightBody}>
              {bullets.map((line) => (
                <View key={line} style={styles.insightBulletRow}>
                  <Text style={styles.insightBulletGlyph}>•</Text>
                  <Text style={styles.insightBulletText}>{line}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.insightsSectionContainer}>
        <Text style={styles.insightsSectionLabel}>Arc Development Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightsBlocksStack}>
            {renderBlock('strengths', 'Strengths to build on', strengths)}
            {renderBlock('growthEdges', 'Growth edges to work on', growthEdges)}
            {renderBlock('pitfalls', 'Pitfalls to watch for', pitfalls)}
          </View>
        </View>
      </View>
    );
  };

  return (
    <AppShell>
      {showFirstArcCelebration && (
        <View style={styles.firstArcOverlay} pointerEvents="box-none">
          <TouchableWithoutFeedback
            onPress={handleDismissFirstArcCelebration}
            accessible={false}
          >
            <View style={styles.firstArcOverlayTapArea}>
              <View style={styles.firstArcInterstitialCard}>
                <Text style={styles.firstArcTitle}>🚀 You&apos;re on your way!</Text>
                <CelebrationGif role="celebration" kind="firstArcCelebrate" size="md" />
                <Text style={styles.firstArcInterstitialBody}>
                  We’ve turned your vision into an Arc. Next, kwilt will help you choose a
                  first goal so you know what to focus on.
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.screen}>
          <View style={styles.paddedSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerSide}>
                <IconButton
                  style={styles.backButton}
                  onPress={handleBackToArcs}
                  accessibilityLabel="Back to Arcs"
                >
                  <Icon name="arrowLeft" size={20} color={colors.canvas} />
                </IconButton>
              </View>
              <View style={styles.headerCenter}>
                <View style={styles.objectTypeRow}>
                  <Icon name="arcs" size={18} color={colors.textSecondary} />
                  <Text style={styles.objectTypeLabel}>Arc</Text>
                </View>
              </View>
              <View style={styles.headerSideRight}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton style={styles.optionsButton} accessibilityLabel="Arc actions">
                      <Icon name="more" size={18} color={colors.canvas} />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                    {/* Primary, non-destructive action(s) first */}
                    <DropdownMenuItem
                      onPress={() => {
                        // TODO: wire up real archive behavior once the store exposes it.
                        Alert.alert(
                          'Archive arc',
                          'Archiving is not yet implemented. This will be wired to an archive action in the store.'
                        );
                      }}
                    >
                      <View style={styles.menuItemRow}>
                        <Icon name="info" size={16} color={colors.textSecondary} />
                        <Text style={styles.menuItemLabel}>Archive</Text>
                      </View>
                    </DropdownMenuItem>

                    {/* Divider before destructive actions */}
                    <DropdownMenuSeparator />

                    {/* Destructive action pinned to the bottom */}
                    <DropdownMenuItem onPress={handleDeleteArc} variant="destructive">
                      <View style={styles.menuItemRow}>
                        <Icon name="trash" size={16} color={colors.destructive} />
                        <Text style={styles.destructiveMenuRowText}>Delete arc</Text>
                      </View>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
          >
            <View style={styles.pageContent}>
              <View>
                <View style={[styles.paddedSection, styles.arcHeaderSection]}>
                  <View style={styles.heroContainer}>
                    <TouchableOpacity
                      style={styles.heroImageWrapper}
                      onPress={() => {
                        logArcDetailDebug('hero:pressed', {
                          previousVisible: isHeroModalVisible,
                        });
                        setIsHeroModalVisible(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Edit Arc banner"
                      activeOpacity={0.9}
                    >
                      {isHeroHidden ? (
                        <View style={styles.heroMinimal} />
                      ) : arc.thumbnailUrl ? (
                        <Image
                          source={{ uri: arc.thumbnailUrl }}
                          style={styles.heroImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={headerGradientColors}
                          start={headerGradientDirection.start}
                          end={headerGradientDirection.end}
                          style={styles.heroImage}
                        />
                      )}
                      <View style={styles.heroEditButton}>
                        <Icon name="edit" size={16} color={colors.canvas} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <EditableField
                    label="Name"
                    value={arc.name}
                    variant="title"
                  autoFocusOnEdit={false}
                    onChange={(nextName) => {
                      const trimmed = nextName.trim();
                      if (trimmed.length === 0 || trimmed === arc.name) {
                        return;
                      }
                      updateArc(arc.id, (current) => ({
                        ...current,
                        name: trimmed,
                        updatedAt: new Date().toISOString(),
                      }));
                    }}
                    placeholder="Name this Arc"
                    validate={(next) => {
                      if (!next.trim()) {
                        return 'Name cannot be empty';
                      }
                      return null;
                    }}
                  />
                  {/* Canvas mode toggle: Details vs Goals vs History */}
                  <View style={styles.segmentedControlRow}>
                    <SegmentedControl
                      value={activeTab}
                      onChange={setActiveTab}
                      options={[
                        { value: 'details', label: 'Details' },
                        { value: 'goals', label: 'Goals' },
                        { value: 'history', label: 'History' },
                          ]}
                    />
                  </View>
                  {activeTab === 'details' && (
                    <View style={{ marginTop: spacing.sm }}>
                      <EditableTextArea
                        label="Description"
                        value={arc.narrative ?? ''}
                        placeholder="Add a short note about this Arc…"
                        // For Arc narratives, always expose the full text instead of
                        // truncating so longer descriptions remain fully readable.
                        maxCollapsedLines={0}
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
                        onRequestAiHelp={({
                          objectType,
                          objectId,
                          fieldId,
                          currentText,
                        }) => {
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
                  )}
                </View>
              </View>
              {activeTab === 'details' && (
                <>
                  {renderInsightsSection()}
                  <View style={styles.sectionDivider} />
                </>
              )}

              {activeTab === 'goals' && (
                <View
                  style={styles.goalsSection}
                  onLayout={(event) => {
                    setGoalsSectionOffset(event.nativeEvent.layout.y);
                  }}
                >
                  <View
                    style={[
                      styles.goalsDrawerInner,
                      { paddingBottom: spacing['2xl'] + insets.bottom },
                    ]}
                  >
                    <View
                      style={[styles.goalsDrawerHeaderRow, styles.goalsDrawerHeaderRowRaised]}
                    >
                      <Text style={styles.sectionTitle}>
                        Goals <Text style={styles.goalCount}>({arcGoals.length})</Text>
                      </Text>
                      <IconButton
                        style={styles.goalsExpandButton}
                        onPress={() => setIsGoalCoachVisible(true)}
                        accessibilityLabel="Create a new goal"
                      >
                        <Icon name="plus" size={18} color={colors.canvas} />
                      </IconButton>
                    </View>

                    {arcGoals.length === 0 ? (
                      <View style={styles.goalsEmptyStateContainer}>
                        <Text style={styles.goalsEmptyTitle}>Turn this Arc into clear goals</Text>
                        <Text style={styles.goalsEmptyBody}>
                          Start by adding 3–5 goals that live inside this Arc so kwilt knows what
                          “success” looks like here.
                        </Text>
                        <Button
                          variant="accent"
                          style={styles.goalsEmptyPrimaryButton}
                          onPress={() => setIsGoalCoachVisible(true)}
                        >
                          <Text style={styles.goalsEmptyPrimaryLabel}>
                            Create goals for this Arc
                          </Text>
                        </Button>
                      </View>
                    ) : (
                      <View style={styles.goalsScrollContent}>
                        <View style={{ gap: spacing.sm }}>
                          {arcGoals.map((goal) => (
                            <GoalListCard
                              key={goal.id}
                              goal={goal}
                              parentArc={arc}
                              activityCount={activityCountByGoal[goal.id] ?? 0}
                              thumbnailStyles={thumbnailStyles}
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
                  </View>
                </View>
              )}

              {activeTab === 'history' && (
                <View style={styles.historyTabPlaceholder}>
                  <Text style={styles.historyTabTitle}>History</Text>
                  <Text style={styles.historyTabBody}>
                    See the key milestones and completed work inside this Arc over time.
                  </Text>

                  {arcHistoryEvents.length === 0 ? (
                    <View style={styles.historyEmptyCard}>
                      <Text style={styles.historyEmptyTitle}>No history yet</Text>
                      <Text style={styles.historyEmptyBody}>
                        As you create and complete goals and activities in this Arc, a timeline
                        of key moments will appear here.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.historyScroll}
                      contentContainerStyle={styles.historyScrollContent}
                      showsVerticalScrollIndicator={false}
                    >
                      <VStack space="sm">
                        {arcHistoryEvents.map((event) => (
                          <View key={event.id} style={styles.historyEventCard}>
                            <Text style={styles.historyEventDate}>{event.dateLabel}</Text>
                            <Text style={styles.historyEventTitle}>{event.title}</Text>
                            {event.meta ? (
                              <Text style={styles.historyEventMeta}>{event.meta}</Text>
                            ) : null}
                          </View>
                        ))}
                      </VStack>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      {showGoalNextStepToast && (
        <View
          style={[
            styles.goalNextStepToastContainer,
            { bottom: insets.bottom + spacing.sm },
          ]}
          pointerEvents="box-none"
        >
          <Card style={styles.goalNextStepToast}>
            <View style={styles.goalNextStepTextColumn}>
              <Text style={styles.goalNextStepTitle}>Next step: create a goal</Text>
              <Text style={styles.goalNextStepBody}>
                Choose one concrete goal inside this Arc so kwilt knows what progress
                matters most right now.
              </Text>
            </View>
            <View style={styles.goalNextStepActionsRow}>
              <Button
                variant="accent"
                size="small"
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowGoalNextStepToast(false);
                  setActiveTab('goals');
                  setIsGoalCoachVisible(true);
                }}
              >
                <Text style={styles.goalNextStepCtaLabel}>Create goal</Text>
              </Button>
              <IconButton
                variant="ghost"
                accessibilityLabel="Dismiss"
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowGoalNextStepToast(false);
                }}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </IconButton>
            </View>
          </Card>
        </View>
      )}
      <HeroImageModal
        visible={isHeroModalVisible}
        onClose={() => setIsHeroModalVisible(false)}
        arcName={arc.name}
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
        heroHidden={isHeroHidden}
        onGenerate={handleShuffleHeroThumbnail}
        onUpload={() => {
          void handleUploadHeroImage();
        }}
        onRemove={handleClearHeroImage}
        onToggleHeroHidden={handleToggleHeroHidden}
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
      />
      {/* Agent FAB entry for Arc detail is temporarily disabled for MVP.
          Once the tap-centric Agent entry is refined for object canvases,
          we can reintroduce a contextual FAB here that fits the final UX. */}
      {AgentWorkspaceSheet}
    </AppShell>
  );
}

type HeroImageModalProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  heroSeed: string;
  hasHero: boolean;
  loading: boolean;
  error: string;
  thumbnailUrl?: string;
  heroGradientColors: string[];
  heroGradientDirection: ArcGradientDirection;
  heroTopoSizes: number[];
  showTopography: boolean;
  showGeoMosaic: boolean;
  onGenerate: () => void;
  onUpload: () => void;
  onRemove: () => void;
   heroHidden: boolean;
   onToggleHeroHidden: () => void;
   onSelectCurated: (image: ArcHeroImage) => void;
   onSelectUnsplash: (photo: UnsplashPhoto) => void;
};

type ArcNarrativeEditorSheetProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  narrative?: string;
  onSave: (nextNarrative: string) => void;
};

function HeroImageModal({
  visible,
  onClose,
  arcName,
  heroSeed,
  hasHero,
  loading,
  error,
  thumbnailUrl,
  heroGradientColors,
  heroGradientDirection,
  heroTopoSizes,
  showTopography,
  showGeoMosaic,
  onGenerate,
  onUpload,
  onRemove,
  heroHidden,
  onToggleHeroHidden,
  onSelectCurated,
  onSelectUnsplash,
}: HeroImageModalProps) {
  const shouldShowTopography = showTopography && !thumbnailUrl;
  const shouldShowGeoMosaic = showGeoMosaic && !thumbnailUrl;
  const showRefreshAction = !thumbnailUrl;

  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([]);

  useEffect(() => {
    logArcDetailDebug('heroModal:visible-prop-changed', { visible });
    if (!visible) {
      setUnsplashQuery('');
      setUnsplashError(null);
      setUnsplashResults([]);
      setUnsplashLoading(false);
    }
  }, [visible]);

  const handleSearchUnsplash = useCallback(async () => {
    const query = unsplashQuery.trim() || arcName.trim();
    if (!query) {
      return;
    }
    try {
      setUnsplashLoading(true);
      setUnsplashError(null);
      const results = await searchUnsplashPhotos(query, { perPage: 12, page: 1 });
      if (!results || results.length === 0) {
        setUnsplashError('No Unsplash results found for that query.');
      }
      setUnsplashResults(results ?? []);
    } catch {
      setUnsplashError('Unable to load Unsplash images right now.');
    } finally {
      setUnsplashLoading(false);
    }
  }, [arcName, unsplashQuery]);

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={0.9}>
      <View style={styles.modalContent}>
        <Heading style={styles.modalTitle}>Arc Thumbnail</Heading>
        <View style={styles.heroModalPreviewSection}>
          <View style={styles.heroModalPreviewColumn}>
            <View style={styles.heroModalPreviewFrame}>
              <View style={styles.heroModalPreviewInner}>
                {thumbnailUrl ? (
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={styles.heroModalPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={heroGradientColors}
                    start={heroGradientDirection.start}
                    end={heroGradientDirection.end}
                    style={styles.heroModalPreviewImage}
                  />
                )}
                {shouldShowTopography && (
                  <View style={styles.arcHeroTopoLayer}>
                    <View style={styles.arcHeroTopoGrid}>
                      {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                        <View
                          // eslint-disable-next-line react/no-array-index-key
                          key={`hero-modal-topo-row-${rowIndex}`}
                          style={styles.arcHeroTopoRow}
                        >
                          {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, colIndex) => {
                            const cellIndex = rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                            const rawSize = heroTopoSizes[cellIndex] ?? 0;
                            const isHidden = rawSize < 0;
                            const dotSize = isHidden ? 0 : rawSize;
                            return (
                              // eslint-disable-next-line react/no-array-index-key
                              <View
                                key={`hero-modal-topo-cell-${rowIndex}-${colIndex}`}
                                style={[
                                  styles.arcHeroTopoDot,
                                  (dotSize === 0 || isHidden) && styles.arcHeroTopoDotSmall,
                                  dotSize === 1 && styles.arcHeroTopoDotMedium,
                                  dotSize === 2 && styles.arcHeroTopoDotLarge,
                                  isHidden && styles.arcHeroTopoDotHidden,
                                ]}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {shouldShowGeoMosaic && (
                  <View style={styles.arcHeroMosaicLayer}>
                    {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                      <View
                        // eslint-disable-next-line react/no-array-index-key
                        key={`hero-modal-mosaic-row-${rowIndex}`}
                        style={styles.arcHeroMosaicRow}
                      >
                        {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                          const cell = getArcMosaicCell(heroSeed, rowIndex, colIndex);
                          if (cell.shape === 0) {
                            return (
                              // eslint-disable-next-line react/no-array-index-key
                              <View
                                key={`hero-modal-mosaic-cell-${rowIndex}-${colIndex}`}
                                style={styles.arcHeroMosaicCell}
                              />
                            );
                          }

                          let shapeStyle: StyleProp<ViewStyle> = styles.arcHeroMosaicCircle;
                          if (cell.shape === 2) {
                            shapeStyle = styles.arcHeroMosaicPillVertical;
                          } else if (cell.shape === 3) {
                            shapeStyle = styles.arcHeroMosaicPillHorizontal;
                          }

                          return (
                            // eslint-disable-next-line react/no-array-index-key
                            <View
                              key={`hero-modal-mosaic-cell-${rowIndex}-${colIndex}`}
                              style={styles.arcHeroMosaicCell}
                            >
                              <View
                                style={[
                                  styles.arcHeroMosaicShapeBase,
                                  shapeStyle,
                                  { backgroundColor: cell.color },
                                ]}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.heroModalControls}>
            <View style={styles.heroModalActionRow}>
              <View style={styles.heroModalAction}>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!showRefreshAction || loading}
                  onPress={onGenerate}
                  style={styles.heroModalActionButton}
                  accessibilityLabel="Refresh thumbnail"
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Icon
                      name="refresh"
                      size={20}
                      color={showRefreshAction ? colors.textPrimary : colors.textSecondary}
                    />
                  )}
                </Button>
                <Text
                  style={[
                    styles.heroModalActionLabel,
                    !showRefreshAction && { color: colors.textSecondary },
                  ]}
                >
                  Refresh
                </Text>
              </View>
              <View style={styles.heroModalAction}>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasHero || loading}
                  onPress={onRemove}
                  style={styles.heroModalActionButton}
                  accessibilityLabel="Remove image"
                >
                  <Icon
                    name="trash"
                    size={20}
                    color={colors.textSecondary}
                    style={{ opacity: hasHero ? 1 : 0.4 }}
                  />
                </Button>
                <Text
                  style={[
                    styles.heroModalActionLabel,
                    !hasHero && { color: colors.textSecondary, opacity: 0.5 },
                  ]}
                >
                  Remove
                </Text>
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.heroModalUploadContainer}>
              <Button
                variant="outline"
                disabled={loading}
                onPress={onUpload}
                style={styles.heroModalUpload}
              >
                <Icon name="image" size={18} color={colors.textPrimary} />
                <Text style={styles.buttonTextAlt}>Upload</Text>
              </Button>
            </View>
          </View>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.heroModalSupportText}>Curated banners</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing.sm, columnGap: spacing.sm }}
          >
            {ARC_HERO_LIBRARY.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={styles.heroCuratedThumbnailWrapper}
                activeOpacity={0.85}
                onPress={() => {
                  onSelectCurated(image);
                  onClose();
                }}
              >
                <Image
                  source={{ uri: image.uri }}
                  style={styles.heroCuratedThumbnailImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.heroModalSupportText}>Search Unsplash</Text>
          <View style={styles.heroUnsplashSearchRow}>
            <TextInput
              style={styles.heroUnsplashInput}
              placeholder={`Try \"${arcName}\" or \"sunrise\"…`}
              placeholderTextColor={colors.textSecondary}
              value={unsplashQuery}
              onChangeText={setUnsplashQuery}
            />
            <Button
              variant="outline"
              size="small"
              onPress={() => {
                void handleSearchUnsplash();
              }}
              disabled={unsplashLoading}
            >
              {unsplashLoading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.heroUnsplashSearchLabel}>Search</Text>
              )}
            </Button>
          </View>
          {unsplashError ? <Text style={styles.errorText}>{unsplashError}</Text> : null}
          {unsplashResults.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingVertical: spacing.sm,
                columnGap: spacing.sm,
              }}
            >
              {unsplashResults.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.heroCuratedThumbnailWrapper}
                  activeOpacity={0.85}
                  onPress={() => {
                    onSelectUnsplash(photo);
                    onClose();
                  }}
                >
                  <Image
                    source={{ uri: photo.urls.small }}
                    style={styles.heroCuratedThumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Button
            variant="outline"
            onPress={onToggleHeroHidden}
            style={styles.heroHideBannerButton}
          >
            <Text style={styles.heroHideBannerLabel}>
              {heroHidden ? 'Show banner on this Arc' : 'Hide banner on this Arc'}
            </Text>
          </Button>
        </View>
      </View>
    </BottomDrawer>
  );
}

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
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={0.9}>
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
  goalsDrawerInner: {
    paddingHorizontal: 0,
    // paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
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
    aspectRatio: 3 / 1,
  },
  heroMinimal: {
    width: '100%',
    aspectRatio: 3 / 1,
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
  heroModalPreviewColumn: {
    flexBasis: '50%',
    flexGrow: 1,
    minWidth: 220,
  },
  heroModalPreviewFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
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
  heroHideBannerButton: {
    alignSelf: 'stretch',
  },
  heroHideBannerLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroEditButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.xl,
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
  },
  optionsButton: {
    borderRadius: 999,
    width: 36,
    height: 36,
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
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalsDrawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalsDrawerHeaderRowRaised: {
    paddingBottom: spacing.sm,
  },
  goalsExpandButton: {
    alignSelf: 'flex-end',
    marginTop: 0,
  },
  goalsSection: {
    marginTop: 0,
  },
  sectionDivider: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    // Use a full-width, pill-shaped rule so the section break is legible
    // against the light shell background while still feeling airy.
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
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
  firstArcOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    // Use the main shell background so the interstitial reads as a dedicated
    // full-screen moment rather than a dialog layered on top of Arc detail.
    backgroundColor: colors.shell,
    zIndex: 10,
  },
  firstArcOverlayTapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: spacing.lg,
  },
  insightsCard: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: cardSurfaceStyle.shadowColor,
    shadowOpacity: cardSurfaceStyle.shadowOpacity,
    shadowRadius: cardSurfaceStyle.shadowRadius,
    shadowOffset: cardSurfaceStyle.shadowOffset,
    elevation: (cardSurfaceStyle as any).elevation,
    gap: spacing.sm,
  },
  insightsSectionLabel: {
    ...typography.label,
    color: colors.muted,
  },
  insightsBlocksStack: {
    // Keep the inner stack vertically balanced inside the card: rely on the
    // card's padding for top/bottom breathing room so spacing feels uniform.
    marginTop: 0,
    gap: spacing.xs,
  },
  insightBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // Each section is its own rounded panel with even treatment top/bottom.
    borderRadius: spacing.md,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  insightBlockActive: {
    // Keep the open panel on the same white background so the bullets feel
    // continuous with the header; rely on motion and content instead of a
    // different fill.
    backgroundColor: colors.canvas,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    flex: 1,
  },
  insightTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    // Slightly stronger weight than standard body to give each panel header
    // a clear anchor without jumping up to full title size.
    fontFamily: fonts.medium,
  },
  insightBody: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  insightBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.xs,
  },
  insightBulletGlyph: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 1,
  },
  insightBulletText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
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
});


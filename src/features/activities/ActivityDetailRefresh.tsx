import React from 'react';
import { Alert, Animated, Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BreadcrumbBar } from '../../ui/BreadcrumbBar';
import { VStack, HStack, Input, ThreeColumnRow, Combobox, ObjectPicker, KeyboardAwareScrollView } from '../../ui/primitives';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/DropdownMenu';
import { NarrativeEditableTitle } from '../../ui/NarrativeEditableTitle';
import { LongTextField } from '../../ui/LongTextField';
import { Badge } from '../../ui/Badge';
import { AiAutofillBadge } from '../../ui/AiAutofillBadge';
import type { ActivityDifficulty, ActivityType } from '../../domain/types';
import { AnalyticsEvent } from '../../services/analytics/events';
import { HeaderActionPill, ObjectPageHeader, OBJECT_PAGE_HEADER_BAR_HEIGHT } from '../../ui/layout/ObjectPageHeader';
import { getActivityHeaderArtworkSource } from './activityTypeHeaderArtwork';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import {
  addDocumentToActivity,
  addPhotoOrVideoToActivity,
  deleteAttachment,
  openAttachment,
  setAttachmentSharedWithGoalMembers,
} from '../../services/attachments/activityAttachments';
import { openPaywallInterstitial, openPaywallPurchaseEntry } from '../../services/paywall';

function withAlpha(hex: string, alpha: number) {
  // Supports #RRGGBB. Falls back to the original string if format is unexpected.
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (![r, g, b].every(Number.isFinite)) return hex;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Render-only extraction of the feature-flagged Activity detail refresh layout.
 * All state and callbacks are passed through from `ActivityDetailScreen` to avoid behavior drift.
 */
export function ActivityDetailRefresh(props: any) {
  const { width: windowWidth } = useWindowDimensions();
  // NOTE: ActivityDetailScreen is wrapped by AppShell, which already applies safe-area top padding
  // to the canvas. Do NOT double-count insets here, or the header will be pushed down.
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // Match the effective page gutter used by Arc/Goal pages:
  // Arcs/Goals often run `AppShell fullBleedCanvas` and then apply `spacing.xl` internally.
  // ActivityDetail uses AppShell default gutter (`spacing.sm`), so we add the delta.
  const PAGE_GUTTER_X = typeof props.pageGutterX === 'number' ? props.pageGutterX : spacing.xl - spacing.sm;
  const resolvedSafeAreaTopInsetPx =
    typeof props.safeAreaTopInsetPx === 'number' && Number.isFinite(props.safeAreaTopInsetPx)
      ? Math.max(0, props.safeAreaTopInsetPx)
      : 0;
  const headerTotalHeight = resolvedSafeAreaTopInsetPx + OBJECT_PAGE_HEADER_BAR_HEIGHT;
  // Ensure scroll content never sits under the bottom action docks.
  const DOCK_CLEARANCE_PX = 160;
  const {
    breadcrumbsEnabled,
    arc,
    goal,
    navigation,
    headerV2Enabled,
    handleSendToShare,
    handleBackToActivities,
    rootNavigationRef,
    activity,
    capture,
    openFocusSheet,
    openCalendarSheet,
    openAgentForActivity,
    canSendTo,
    setActiveSheet,
    scrollRef,
    KEYBOARD_CLEARANCE,
    styles,
    planExpanded,
    onTogglePlanExpanded,
    detailsExpanded,
    onToggleDetailsExpanded,

    updateActivity,
    // Steps
    titleStepsBundleRef,
    setIsTitleStepsBundleReady,
    setTitleStepsBundleOffset,
    stepsDraft,
    activitiesById,
    openActivityDetail,
    handleToggleStepComplete,
    handleRemoveStep,
    handleChangeStepTitle,
    handleConvertStepToActivity,
    handleUnlinkStepActivity,
    beginAddStepInline,
    isAddingStepInline,
    newStepInputRef,
    newStepTitle,
    setNewStepTitle,
    commitInlineStep,
    handleAnyInputFocus,
    handleAnyInputBlur,

    // Plan section
    scheduleAndPlanningCardRef,
    setIsScheduleCardReady,
    setScheduleCardOffset,
    reminderLabel,
    dueDateLabel,
    repeatLabel,
    timeEstimateLabel,
    timeEstimateIsAi,
    difficultyLabel,
    difficultyIsAi,
    hasTimeEstimate,
    hasDifficulty,
    handleClearReminder,
    handleClearDueDate,
    handleClearRepeatRule,
    openEstimateSheet,
    handleClearTimeEstimate,
    difficultyComboboxOpen,
    setDifficultyComboboxOpen,
    difficultyOptions,
    handleClearDifficulty,
    totalStepsCount,
    completedStepsCount,

    // Details section
    tagsFieldContainerRef,
    tagsInputRef,
    prepareRevealTagsField,
    tagsInputDraft,
    setTagsInputDraft,
    showTagsAutofill,
    TAGS_AI_AUTOFILL_SIZE,
    isTagsAutofillThinking,
    setIsTagsAutofillThinking,
    tagsAutofillInFlightRef,
    isPro,
    tryConsumeGenerativeCredit,
    openPaywallInterstitial,
    suggestActivityTagsWithAi,
    activityTagHistory,
    goalTitle,
    suggestTagsFromText,
    addTags,
    isKeyboardVisible,
    TAGS_REVEAL_EXTRA_OFFSET,
    commitTagsInputDraft,
    handleRemoveTag,
    goalOptions,
    recommendedGoalOption,
    activityTypeOptions,
    handleDeleteActivity,
    // Fade geometry (provided by ActivityDetailScreen)
    appShellTopInsetPx,
    bottomFadeHeightPx,
    safeAreaTopInsetPx,
    pageGutterX,
  } = props;

  const planConfiguredCount = React.useMemo(() => {
    const hasReminder = Boolean(activity?.reminderAt);
    const hasDueDate = Boolean(activity?.scheduledDate);
    const hasRepeat = Boolean(activity?.repeatRule);
    const hasEstimate = Boolean(hasTimeEstimate);
    const hasDiff = Boolean(hasDifficulty);
    return [hasReminder, hasDueDate, hasRepeat, hasEstimate, hasDiff].filter(Boolean).length;
  }, [activity?.reminderAt, activity?.scheduledDate, activity?.repeatRule, hasDifficulty, hasTimeEstimate]);

  const detailsConfiguredCount = React.useMemo(() => {
    const hasNotes = Boolean((activity?.notes ?? '').trim().length);
    const tagCount = Array.isArray(activity?.tags) ? activity.tags.length : 0;
    const hasTags = tagCount > 0;
    const hasAttachments = Array.isArray(activity?.attachments) && activity.attachments.length > 0;
    const hasLinkedGoal = Boolean(activity?.goalId);
    // Avoid showing a "configured" signal just because the default ActivityType exists.
    const hasNonDefaultType = Boolean(activity?.type && activity.type !== 'task');
    return [hasNotes, hasTags, hasAttachments, hasLinkedGoal, hasNonDefaultType].filter(Boolean).length;
  }, [activity?.attachments, activity?.goalId, activity?.notes, activity?.tags, activity?.type]);

  const showPlanCountBadge = !planExpanded && planConfiguredCount > 0;
  const showDetailsCountBadge = !detailsExpanded && detailsConfiguredCount > 0;

  const planChevronAnim = React.useRef(new Animated.Value(planExpanded ? 1 : 0)).current;
  const detailsChevronAnim = React.useRef(new Animated.Value(detailsExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(planChevronAnim, {
      toValue: planExpanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [planChevronAnim, planExpanded]);

  React.useEffect(() => {
    Animated.timing(detailsChevronAnim, {
      toValue: detailsExpanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [detailsChevronAnim, detailsExpanded]);

  const planChevronRotation = planChevronAnim.interpolate({
    inputRange: [0, 1],
    // Collapsed: point right. Expanded: point down.
    outputRange: ['-90deg', '0deg'],
  });

  const detailsChevronRotation = detailsChevronAnim.interpolate({
    inputRange: [0, 1],
    // Collapsed: point right. Expanded: point down.
    outputRange: ['-90deg', '0deg'],
  });

  const headerArtworkSource = getActivityHeaderArtworkSource(activity.type as ActivityType);
  const resolvedHeaderArtwork = headerArtworkSource ? Image.resolveAssetSource(headerArtworkSource) : undefined;
  const headerArtworkAspectRatio =
    resolvedHeaderArtwork?.width && resolvedHeaderArtwork?.height
      ? resolvedHeaderArtwork.width / resolvedHeaderArtwork.height
      : undefined;
  // Activities always have a mapped hero artwork; keep this boolean explicit for future overrides.
  const heroEnabled = Boolean(headerArtworkSource);
  const headerPillMaterialVariant = heroEnabled ? 'default' : 'onLight';

  // ---------------------------------------------------------------------------
  // Goals-like hero behavior (parallax + fade out as you scroll up).
  // Keep smaller than Goals (Goal hero = 240px).
  // ---------------------------------------------------------------------------
  const ACTIVITY_HERO_HEIGHT_PX = 168;
  // Fade the hero out roughly when the hero has scrolled under the fixed header.
  const heroFadeEndScrollY = Math.max(1, ACTIVITY_HERO_HEIGHT_PX - headerTotalHeight);
  const heroFadeStartScrollY = Math.max(0, heroFadeEndScrollY - 48);
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, heroFadeStartScrollY, heroFadeEndScrollY],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });
  // Hero is inside scroll content (moves at 1x). Translate it down by +0.35x scroll
  // so it nets out to ~0.65x upward movement (subtle parallax).
  const heroParallaxTranslateY = Animated.multiply(scrollY, 0.35);

  // Header background becomes opaque as the hero disappears (Goals-like).
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, heroFadeStartScrollY, heroFadeEndScrollY],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [0, heroFadeStartScrollY, heroFadeEndScrollY],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const headerActionPillOpacity = scrollY.interpolate({
    inputRange: [0, 44],
    // Keep the frosted pill material present on scroll so controls don't read washed out.
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });
  // Use SUMI for darker ink on light surfaces (consistent with our warm neutral palette).
  const headerInk = colors.sumi;

  const SCRIM_ALPHA = 0.75; // => content appears at ~25% opacity at the edge.
  const scrimStrong = withAlpha(colors.canvas, SCRIM_ALPHA);
  const scrimClear = withAlpha(colors.canvas, 0);
  // Make the fade ramp faster so header/footer stand out more, while still reaching the same
  // target opacity at the physical screen edges.
  // 0.45 => ramp happens over ~45% of the distance; the remaining region stays near-max.
  const FADE_RAMP_FRACTION = 0.45;
  const topFadeHeightPx =
    typeof appShellTopInsetPx === 'number' && Number.isFinite(appShellTopInsetPx)
      ? Math.max(0, appShellTopInsetPx) + headerTotalHeight
      : headerTotalHeight;
  const resolvedTopOverscanPx =
    typeof appShellTopInsetPx === 'number' && Number.isFinite(appShellTopInsetPx)
      ? Math.max(0, appShellTopInsetPx)
      : 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Screen-edge scroll fade: affects only scroll content underneath the fixed header/dock.
          When a hero is present, avoid washing out the artwork at the top. */}
      {!heroEnabled ? (
        <View pointerEvents="none" style={[localStyles.edgeFade, { top: -resolvedTopOverscanPx, height: topFadeHeightPx }]}>
          <LinearGradient
            colors={[scrimStrong, scrimStrong, scrimClear]}
            {...({ locations: [0, 1 - FADE_RAMP_FRACTION, 1] } as any)}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ) : null}
      {typeof bottomFadeHeightPx === 'number' && Number.isFinite(bottomFadeHeightPx) && bottomFadeHeightPx > 0 ? (
        <View pointerEvents="none" style={[localStyles.edgeFade, { top: undefined, bottom: 0, height: bottomFadeHeightPx }]}>
          <LinearGradient
            colors={[scrimClear, scrimStrong, scrimStrong]}
            {...({ locations: [0, FADE_RAMP_FRACTION, 1] } as any)}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      ) : null}

      {/* Sticky header overlay with scroll-linked fade (Activity-only), using the same blur pills as Arc/Goal headers. */}
      {!breadcrumbsEnabled ? (
        <ObjectPageHeader
          barHeight={OBJECT_PAGE_HEADER_BAR_HEIGHT}
          backgroundOpacity={headerBgOpacity}
          backgroundColor={colors.canvas}
          actionPillOpacity={headerActionPillOpacity}
          safeAreaTopInset={resolvedSafeAreaTopInsetPx}
          horizontalPadding={PAGE_GUTTER_X}
          blurBackground={false}
          sideSlotWidth={56}
          left={
            <HeaderActionPill
              onPress={handleBackToActivities}
              accessibilityLabel="Back to Activities"
              materialOpacity={headerActionPillOpacity}
              materialVariant={headerPillMaterialVariant}
            >
              <Icon name="chevronLeft" size={20} color={headerInk} />
            </HeaderActionPill>
          }
          // Intentionally omit the object-type pill in the header for Activity detail.
          center={null}
          right={
            <HStack alignItems="center" space="sm">
              <DropdownMenu>
                <DropdownMenuTrigger accessibilityLabel="Activity actions">
                  <View pointerEvents="none">
                    <HeaderActionPill
                      accessibilityLabel="Activity actions"
                      materialOpacity={headerActionPillOpacity}
                      materialVariant={headerPillMaterialVariant}
                    >
                      <Icon name="more" size={18} color={headerInk} />
                    </HeaderActionPill>
                  </View>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={6} align="end" style={{ minWidth: 260 }}>
                  <DropdownMenuItem
                    onPress={() => {
                      handleSendToShare().catch(() => undefined);
                    }}
                  >
                    <View style={styles.menuItemRow}>
                      <Icon name="share" size={16} color={headerInk} />
                      <Text style={styles.menuRowText} numberOfLines={1} ellipsizeMode="tail">
                        Share
                      </Text>
                    </View>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                    <View style={styles.menuItemRow}>
                      <Icon name="trash" size={16} color={colors.destructive} />
                      <Text style={styles.destructiveMenuRowText} numberOfLines={1} ellipsizeMode="tail">
                        Delete activity
                      </Text>
                    </View>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </HStack>
          }
        />
      ) : (
        // Dev breadcrumbs mode: keep the existing inline breadcrumb header to avoid reworking its layout.
        <View pointerEvents="box-none" style={[localStyles.headerOverlay, { height: headerTotalHeight }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: colors.canvas,
                opacity: headerBgOpacity as any,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              localStyles.headerBottomBorder,
              {
                opacity: headerBorderOpacity as any,
              },
            ]}
          />
          <View style={[localStyles.headerRow, { paddingTop: 0, height: headerTotalHeight }]}>
            <HStack alignItems="center">
              <View style={styles.breadcrumbsLeft}>
                <BreadcrumbBar
                  items={[
                    {
                      id: 'arcs',
                      label: 'Arcs',
                      onPress: () =>
                        rootNavigationRef.navigate('ArcsStack', { screen: 'ArcsList' }),
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
                    ...(activity?.origin?.kind === 'activity_step'
                      ? (() => {
                          const parentId = activity.origin.parentActivityId;
                          const parent = activitiesById?.[parentId] ?? null;
                          if (!parent) return [];
                          return [
                            {
                              id: 'parentActivity',
                              label: parent.title ?? 'Activity',
                              onPress: () => openActivityDetail?.(parentId),
                            },
                          ];
                        })()
                      : []),
                    { id: 'activity', label: activity?.title ?? 'Activity' },
                  ]}
                />
              </View>
              <View style={[styles.headerSideRight, styles.breadcrumbsRight]}>
                <DropdownMenu>
                  <DropdownMenuTrigger accessibilityLabel="Activity actions">
                    <View pointerEvents="none">
                      <IconButton style={styles.optionsButton} accessible={false}>
                        <Icon name="more" size={18} color={headerInk} />
                      </IconButton>
                    </View>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={6} align="end" style={{ minWidth: 260 }}>
                    <DropdownMenuItem
                      onPress={() => {
                        handleSendToShare().catch(() => undefined);
                      }}
                    >
                      <View style={styles.menuItemRow}>
                        <Icon name="share" size={16} color={headerInk} />
                        <Text style={styles.menuRowText} numberOfLines={1} ellipsizeMode="tail">
                          Share
                        </Text>
                      </View>
                    </DropdownMenuItem>
                    <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                      <View style={styles.menuItemRow}>
                        <Icon name="trash" size={16} color={colors.destructive} />
                        <Text style={styles.destructiveMenuRowText} numberOfLines={1} ellipsizeMode="tail">
                          Delete activity
                        </Text>
                      </View>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            </HStack>
          </View>
        </View>
      )}

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerTotalHeight + spacing.xs,
            paddingBottom: spacing['2xl'] + DOCK_CLEARANCE_PX,
            paddingHorizontal: PAGE_GUTTER_X,
          },
        ]}
        keyboardClearance={KEYBOARD_CLEARANCE + spacing.lg}
        showsVerticalScrollIndicator={false}
        // Refresh layout does not currently render coachmarks; never lock scrolling here.
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e?.nativeEvent?.contentOffset?.y ?? 0;
          scrollY.setValue(y);
        }}
      >
        {/* Hero artwork (Goals-like): full-bleed, subtle parallax, fades as it scrolls away. */}
        {heroEnabled ? (
          <View
            style={[
              localStyles.activityHeroSection,
              {
                height: ACTIVITY_HERO_HEIGHT_PX,
                marginTop: -(headerTotalHeight + spacing.xs),
                // Full-bleed hero: match device width explicitly and shift left by the page gutter.
                // This avoids relying on negative margins to "stretch" within padded scroll content.
                width: windowWidth,
                marginLeft: -PAGE_GUTTER_X,
              },
            ]}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroParallaxTranslateY }],
                },
              ]}
            >
              <View style={localStyles.activityHeroImageClip}>
                {headerArtworkAspectRatio ? (
                  <Image
                    source={headerArtworkSource}
                    // Use numeric sizing (not percentages) to guarantee true full-bleed width.
                    // We size to the device width and let the hero container clip top/bottom.
                    style={{ width: windowWidth, height: windowWidth / headerArtworkAspectRatio }}
                    resizeMode="cover"
                  />
                ) : (
                  <Image source={headerArtworkSource} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                )}
              </View>
            </Animated.View>
          </View>
        ) : null}

        {/* Narrative title block */}
        <View style={styles.section}>
          <View style={styles.narrativeTitleBlock}>
            <NarrativeEditableTitle
              value={activity.title ?? ''}
              placeholder="Name this activity"
              accessibilityLabel="Edit activity title"
              onCommit={(trimmed) => {
                if (!trimmed || trimmed === (activity.title ?? '').trim()) return;
                const timestamp = new Date().toISOString();
                updateActivity(activity.id, (prev: any) => ({
                  ...prev,
                  title: trimmed,
                  updatedAt: timestamp,
                }));
              }}
              textStyle={styles.narrativeTitle}
              inputStyle={styles.narrativeTitleInput}
              containerStyle={styles.narrativeTitleContainer}
            />
            {activity?.origin?.kind === 'activity_step' ? (() => {
              const parentId = activity.origin.parentActivityId;
              const parent = parentId ? activitiesById?.[parentId] ?? null : null;
              if (!parentId || !parent) return null;
              const label = parent.title ?? 'Parent activity';
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open parent activity: ${parent.title}`}
                  onPress={() => openActivityDetail?.(parentId)}
                  style={({ pressed }) => [styles.originLinkRow, pressed ? { opacity: 0.7 } : null]}
                  hitSlop={8}
                >
                  <Icon name="link" size={12} color={colors.linked} />
                  <Text style={styles.originLinkText} numberOfLines={1} ellipsizeMode="tail">
                    {label}
                  </Text>
                </Pressable>
              );
            })() : null}
          </View>
        </View>

        {/* Steps bundle (completion moved to header) */}
        <View style={styles.section}>
          <View
            ref={titleStepsBundleRef}
            collapsable={false}
            // `styles.titleStepsBundle` includes a small horizontal padding for the legacy
            // canvas gutter. When we apply the Arc/Goal gutter above, remove the inner pad
            // so the steps align with the rest of the page rhythm.
            style={[styles.titleStepsBundle, { paddingHorizontal: 0 }]}
            onLayout={(event) => {
              setIsTitleStepsBundleReady(true);
              const y = event.nativeEvent.layout.y;
              if (typeof y === 'number' && Number.isFinite(y)) {
                setTitleStepsBundleOffset(y);
              }
            }}
          >
            {stepsDraft.length === 0 ? null : (
              <VStack space="xs">
                {stepsDraft.map((step: any) => {
                  const linkedActivityId = step?.linkedActivityId ?? null;
                  const linkedActivity = linkedActivityId ? activitiesById?.[linkedActivityId] ?? null : null;
                  const isLinked = Boolean(linkedActivityId);
                  const isLinkedDone = Boolean(linkedActivity && (linkedActivity.status === 'done' || linkedActivity.completedAt));
                  const isChecked = isLinked ? isLinkedDone : !!step.completedAt;
                  const primaryTitle = isLinked ? (linkedActivity?.title ?? step.title) : step.title;
                  const openLinkedActivity =
                    isLinked && linkedActivityId && linkedActivity ? () => openActivityDetail?.(linkedActivityId) : undefined;
                  const linkedStatusLabel = linkedActivity
                    ? linkedActivity.status === 'done'
                      ? 'Completed'
                      : linkedActivity.status === 'in_progress'
                        ? 'In progress'
                        : 'Planned'
                    : 'Activity missing';
                  return (
                    <View key={step.id}>
                      <ThreeColumnRow
                        style={styles.stepRow}
                        contentStyle={isLinked ? styles.linkedStepRowContent : styles.stepRowContent}
                        left={
                          isLinked ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                linkedActivity ? `Open linked activity: ${primaryTitle}` : 'Linked activity missing'
                              }
                              disabled={!openLinkedActivity}
                              hitSlop={8}
                              onPress={openLinkedActivity}
                              style={({ pressed }) => [pressed ? { opacity: 0.7 } : null]}
                            >
                              <View style={styles.stepLeftIconBox}>
                                <View
                                  style={[
                                    styles.checkboxBase,
                                    isChecked ? styles.linkedCheckboxCompleted : styles.linkedCheckboxPlanned,
                                    styles.stepCheckbox,
                                  ]}
                                >
                                  <Icon
                                    name="link"
                                    size={12}
                                    color={isChecked ? colors.linkedForeground : colors.linked}
                                  />
                                </View>
                              </View>
                            </Pressable>
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                isChecked ? 'Mark step as not done' : 'Mark step as done'
                              }
                              hitSlop={8}
                              onPress={() => handleToggleStepComplete(step.id)}
                            >
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
                          )
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
                            <DropdownMenuContent side="bottom" sideOffset={6} align="end" style={{ minWidth: 260 }}>
                              {isLinked ? (
                                <>
                                  {linkedActivityId && linkedActivity ? (
                                    <DropdownMenuItem onPress={() => openActivityDetail?.(linkedActivityId)}>
                                      <Text style={styles.menuRowText} numberOfLines={1} ellipsizeMode="tail">
                                        Open activity
                                      </Text>
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuItem onPress={() => handleUnlinkStepActivity?.(step.id)}>
                                    <Text style={styles.menuRowText} numberOfLines={1} ellipsizeMode="tail">
                                      Unlink
                                    </Text>
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem onPress={() => handleConvertStepToActivity?.(step.id)}>
                                  <Text style={styles.menuRowText} numberOfLines={1} ellipsizeMode="tail">
                                    Convert to activity
                                  </Text>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onPress={() => handleRemoveStep(step.id)}
                                variant="destructive"
                              >
                                <Text style={styles.destructiveMenuRowText} numberOfLines={1} ellipsizeMode="tail">
                                  Delete step
                                </Text>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        }
                      >
                        {isLinked ? (
                          openLinkedActivity ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Open linked activity: ${primaryTitle}`}
                              onPress={openLinkedActivity}
                              style={({ pressed }) => [styles.linkedStepTextBlock, pressed ? { opacity: 0.7 } : null]}
                            >
                              <Text
                                style={[styles.linkedStepTitle, styles.linkedStepTitleLinked]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {primaryTitle}
                              </Text>
                              {!linkedActivity ? (
                                <Text style={styles.linkedStepSubtitle} numberOfLines={1} ellipsizeMode="tail">
                                  {linkedStatusLabel}
                                </Text>
                              ) : null}
                            </Pressable>
                          ) : (
                            <View style={styles.linkedStepTextBlock}>
                              <Text
                                style={[styles.linkedStepTitle, styles.linkedStepTitleLinked]}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {primaryTitle}
                              </Text>
                              {!linkedActivity ? (
                                <Text style={styles.linkedStepSubtitle} numberOfLines={1} ellipsizeMode="tail">
                                  {linkedStatusLabel}
                                </Text>
                              ) : null}
                            </View>
                          )
                        ) : (
                          <Input
                            value={step.title}
                            onChangeText={(text) => handleChangeStepTitle(step.id, text)}
                            onFocus={handleAnyInputFocus}
                            onBlur={handleAnyInputBlur}
                            placeholder="Describe the step"
                            size="md"
                            variant="inline"
                            inputStyle={styles.stepInput}
                            multiline
                            multilineMinHeight={typography.body.lineHeight}
                            multilineMaxHeight={typography.body.lineHeight * 4 + spacing.sm}
                            blurOnSubmit
                            returnKeyType="done"
                          />
                        )}
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
                  size="md"
                  variant="inline"
                  inputStyle={styles.stepInput}
                  multiline={false}
                  blurOnSubmit={false}
                  returnKeyType="done"
                  onSubmitEditing={() => commitInlineStep('continue')}
                  onBlur={() => {
                    handleAnyInputBlur();
                    commitInlineStep('exit');
                  }}
                />
              ) : (
                <Text style={styles.addStepInlineText}>Add step</Text>
              )}
            </ThreeColumnRow>
          </View>
        </View>

        {/* Actions moved to persistent bottom dock (Notes-style). */}

        <View style={styles.sectionDivider} />

        {/* Plan (collapsible): triggers + planning */}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Plan${planExpanded ? ', expanded' : ', collapsed'}${
              showPlanCountBadge ? `, ${planConfiguredCount} set` : ''
            }`}
            accessibilityState={{ expanded: !!planExpanded }}
            onPress={onTogglePlanExpanded}
            hitSlop={8}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
              pressed ? { opacity: 0.6 } : null,
            ]}
            testID="e2e.activityDetail.plan.toggle"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 28 }}>
              <Text
                style={[
                  styles.sectionTitleBlock,
                  { flexShrink: 1 },
                  // Keep header row height stable; spacing is applied to the expanded body instead.
                  { marginBottom: 0 },
                ]}
                numberOfLines={1}
              >
                Plan
              </Text>
              {showPlanCountBadge ? (
                <Badge
                  variant="secondary"
                  style={styles.sectionCountBadge}
                  textStyle={styles.sectionCountBadgeText}
                >
                  {planConfiguredCount}
                </Badge>
              ) : null}
            </View>
            <Animated.View
              style={{
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: planChevronRotation }],
              }}
            >
              <Icon name="chevronDown" size={20} color={colors.textSecondary} />
            </Animated.View>
          </Pressable>

          {planExpanded ? (
            <View
              ref={scheduleAndPlanningCardRef}
              collapsable={false}
              style={[styles.planList, { marginTop: spacing.sm }]}
              onLayout={(event) => {
                setIsScheduleCardReady(true);
                const y = event.nativeEvent.layout.y;
                if (typeof y === 'number' && Number.isFinite(y)) {
                  setScheduleCardOffset(y);
                }
              }}
            >
              <Pressable
                testID="e2e.activityDetail.triggers.reminder.open"
                accessibilityRole="button"
                accessibilityLabel="Edit reminder"
                onPress={() => setActiveSheet('reminder')}
                style={({ pressed }) => [styles.planListRow, pressed ? styles.planListRowPressed : null]}
              >
                <ThreeColumnRow
                  left={<Icon name="bell" size={18} color={colors.sumi} />}
                  right={null}
                  style={styles.planListRowInner}
                >
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {`Reminder · ${reminderLabel === 'None' ? 'Off' : reminderLabel}`}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <Pressable
                testID="e2e.activityDetail.triggers.dueDate.open"
                accessibilityRole="button"
                accessibilityLabel="Edit due date"
                onPress={() => setActiveSheet('due')}
                style={({ pressed }) => [styles.planListRow, pressed ? styles.planListRowPressed : null]}
              >
                <ThreeColumnRow
                  left={<Icon name="today" size={18} color={colors.sumi} />}
                  right={null}
                  style={styles.planListRowInner}
                >
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {`Due date · ${activity.scheduledDate ? dueDateLabel : 'Off'}`}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <Pressable
                testID="e2e.activityDetail.triggers.repeat.open"
                accessibilityRole="button"
                accessibilityLabel="Edit repeat schedule"
                onPress={() => setActiveSheet('repeat')}
                style={({ pressed }) => [styles.planListRow, pressed ? styles.planListRowPressed : null]}
              >
                <ThreeColumnRow
                  left={<Icon name="refresh" size={18} color={colors.sumi} />}
                  right={null}
                  style={styles.planListRowInner}
                >
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {`Repeat · ${repeatLabel === 'Off' ? 'Off' : repeatLabel}`}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <Pressable
                testID="e2e.activityDetail.planning.estimate.open"
                accessibilityRole="button"
                accessibilityLabel="Edit time estimate"
                onPress={openEstimateSheet}
                style={({ pressed }) => [styles.planListRow, pressed ? styles.planListRowPressed : null]}
              >
                <ThreeColumnRow
                  left={<Icon name="estimate" size={18} color={colors.sumi} />}
                  right={null}
                  style={styles.planListRowInner}
                >
                  <Text
                    style={[styles.rowLabel, timeEstimateIsAi ? { color: colors.accent } : null]}
                    numberOfLines={1}
                  >
                    {`Time estimate · ${timeEstimateLabel}`}
                  </Text>
                </ThreeColumnRow>
              </Pressable>

              <Combobox
                open={difficultyComboboxOpen}
                onOpenChange={setDifficultyComboboxOpen}
                value={activity.difficulty ?? ''}
                onValueChange={(nextDifficulty) => {
                  const timestamp = new Date().toISOString();
                  updateActivity(activity.id, (prev: any) => ({
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
                    style={({ pressed }) => [
                      styles.planListRow,
                      pressed ? styles.planListRowPressed : null,
                    ]}
                  >
                    <ThreeColumnRow
                      left={<Icon name="difficulty" size={18} color={colors.sumi} />}
                      right={null}
                      style={styles.planListRowInner}
                    >
                      <Text
                        style={[
                          styles.rowLabel,
                          difficultyIsAi ? { color: colors.accent } : null,
                        ]}
                        numberOfLines={1}
                      >
                        {`Difficulty · ${difficultyLabel}`}
                      </Text>
                    </ThreeColumnRow>
                  </Pressable>
                }
              />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionDivider} />

        {/* Details (collapsible): notes + tags + goal + type */}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Details${detailsExpanded ? ', expanded' : ', collapsed'}${
              showDetailsCountBadge ? `, ${detailsConfiguredCount} set` : ''
            }`}
            accessibilityState={{ expanded: !!detailsExpanded }}
            onPress={onToggleDetailsExpanded}
            hitSlop={8}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
              pressed ? { opacity: 0.6 } : null,
            ]}
            testID="e2e.activityDetail.details.toggle"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 28 }}>
              <Text
                style={[
                  styles.sectionTitleBlock,
                  { flexShrink: 1 },
                  // Keep header row height stable; spacing is applied to the expanded body instead.
                  { marginBottom: 0 },
                ]}
                numberOfLines={1}
              >
                Details
              </Text>
              {showDetailsCountBadge ? (
                <Badge
                  variant="secondary"
                  style={styles.sectionCountBadge}
                  textStyle={styles.sectionCountBadgeText}
                >
                  {detailsConfiguredCount}
                </Badge>
              ) : null}
            </View>
            <Animated.View
              style={{
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: detailsChevronRotation }],
              }}
            >
              <Icon name="chevronDown" size={20} color={colors.textSecondary} />
            </Animated.View>
          </Pressable>

          {detailsExpanded ? (
            <>
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.inputLabel}>NOTES</Text>
                <LongTextField
                  testID="e2e.activityDetail.notes"
                  label="Notes"
                  hideLabel
                  surfaceVariant="filled"
                  value={activity.notes ?? ''}
                  placeholder="Add context or reminders for this activity."
                  autosaveDebounceMs={900}
                  onChange={(next) => {
                    const nextValue = next.trim().length ? next : '';
                    const current = activity.notes ?? '';
                    if (nextValue === current) return;
                    const timestamp = new Date().toISOString();
                    updateActivity(activity.id, (prev: any) => ({
                      ...prev,
                      notes: nextValue.length ? nextValue : undefined,
                      updatedAt: timestamp,
                    }));
                  }}
                />
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.inputLabel}>TAGS</Text>
                <View ref={tagsFieldContainerRef} collapsable={false}>
                  <Pressable
                    testID="e2e.activityDetail.tags.open"
                    accessibilityRole="button"
                    accessibilityLabel="Edit tags"
                    onPress={() => {
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
                      {(activity.tags ?? []).map((tag: string) => (
                        <Pressable
                          key={tag}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove tag ${tag}`}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag);
                          }}
                        >
                          <Badge variant="outline" style={styles.tagChip}>
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
                          const handle = prepareRevealTagsField();
                          if (handle && isKeyboardVisible) {
                            const totalOffset =
                              KEYBOARD_CLEARANCE +
                              spacing.lg +
                              TAGS_REVEAL_EXTRA_OFFSET;
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
                        blurOnSubmit
                        autoCapitalize="none"
                        autoCorrect={false}
                        onKeyPress={(e: any) => {
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

              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.inputLabel}>ATTACHMENTS</Text>
                {(() => {
                  const isProToolsTrial = useEntitlementsStore((s) => s.isProToolsTrial);
                  const canUseAttachments = Boolean(isPro || isProToolsTrial);
                  const attachments = ((activity as any).attachments ?? []) as any[];
                  const count = attachments.length;
                  const label = count > 0 ? `Attachments · ${count}` : 'Add attachments';

                  const Field = (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={canUseAttachments ? 'Add attachment' : 'Unlock attachments'}
                      testID="e2e.activityDetail.attachments.add"
                      onPress={() => {
                        if (!canUseAttachments) {
                          openPaywallInterstitial({ reason: 'pro_only_attachments', source: 'activity_attachments' });
                        }
                      }}
                      style={({ pressed }) => [
                        styles.attachmentsFieldContainer,
                        pressed ? { opacity: 0.92 } : null,
                      ]}
                    >
                      <HStack space="sm" alignItems="center" style={styles.attachmentsFieldLeft}>
                        <Icon name="paperclip" size={16} color={colors.textSecondary} />
                        <Text numberOfLines={1} style={styles.attachmentsFieldLabel}>
                          {label}
                        </Text>
                      </HStack>
                      <View style={styles.attachmentsFieldAction}>
                        <Icon
                          name={canUseAttachments ? 'plus' : 'lock'}
                          size={16}
                          color={colors.textSecondary}
                        />
                      </View>
                    </Pressable>
                  );

                  if (!canUseAttachments) return Field;

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>{Field}</DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onPress={() => {
                            void addPhotoOrVideoToActivity(activity).catch(() => undefined);
                          }}
                        >
                          <HStack space="sm" alignItems="center">
                            <Icon name="image" size={16} color={colors.textSecondary} />
                            <Text style={styles.menuItemText}>Photo / Video</Text>
                          </HStack>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onPress={() => {
                            void addDocumentToActivity(activity).catch(() => undefined);
                          }}
                        >
                          <HStack space="sm" alignItems="center">
                            <Icon name="fileText" size={16} color={colors.textSecondary} />
                            <Text style={styles.menuItemText}>Document</Text>
                          </HStack>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onPress={() => {
                            setActiveSheet?.('recordAudio');
                          }}
                        >
                          <HStack space="sm" alignItems="center">
                            <Icon name="mic" size={16} color={colors.textSecondary} />
                            <Text style={styles.menuItemText}>Record audio</Text>
                          </HStack>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()}

                {(() => {
                  const isProToolsTrial = useEntitlementsStore((s) => s.isProToolsTrial);
                  const canUseAttachments = Boolean(isPro || isProToolsTrial);
                  if (!canUseAttachments) return null;
                  return (
                    <View style={{ marginTop: spacing.xs }}>
                    {(((activity as any).attachments ?? []) as any[]).length === 0 ? null : (
                      <VStack space="xs">
                        {(((activity as any).attachments ?? []) as any[]).map((att: any) => {
                          const kind = (att?.kind ?? '').toString();
                          const leadingIcon =
                            kind === 'photo' || kind === 'video'
                              ? 'image'
                              : kind === 'document'
                                ? 'fileText'
                                : kind === 'audio'
                                  ? 'mic'
                                  : 'paperclip';
                          const status = (att?.uploadStatus ?? 'uploaded').toString();
                          const statusLabel =
                            status === 'uploading'
                              ? 'Uploading…'
                              : status === 'failed'
                                ? 'Upload failed'
                                : '';

                          return (
                            <Pressable
                              key={String(att.id)}
                              accessibilityRole="button"
                              accessibilityLabel={`Open attachment ${att.fileName ?? ''}`}
                              onPress={() => {
                                void openAttachment(String(att.id)).catch(() => undefined);
                              }}
                              style={({ pressed }) => [
                                styles.planListRow,
                                pressed ? styles.planListRowPressed : null,
                              ]}
                            >
                              <ThreeColumnRow
                                left={<Icon name={leadingIcon} size={18} color={colors.sumi} />}
                                right={
                                  <HStack space="sm" alignItems="center">
                                    {activity.goalId ? (
                                      <IconButton
                                        accessibilityLabel={
                                          att.sharedWithGoalMembers
                                            ? 'Stop sharing with goal members'
                                            : 'Share with goal members'
                                        }
                                        variant="ghost"
                                        onPress={() => {
                                          const next = !Boolean(att.sharedWithGoalMembers);
                                          void setAttachmentSharedWithGoalMembers({
                                            activityId: activity.id,
                                            attachmentId: String(att.id),
                                            sharedWithGoalMembers: next,
                                          }).catch(() => undefined);
                                        }}
                                      >
                                        <Icon
                                          name={att.sharedWithGoalMembers ? 'share' : 'lock'}
                                          size={18}
                                          color={colors.textSecondary}
                                        />
                                      </IconButton>
                                    ) : null}
                                    <IconButton
                                      accessibilityLabel="Delete attachment"
                                      variant="ghost"
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
                                            },
                                          },
                                        ]);
                                      }}
                                    >
                                      <Icon name="trash" size={18} color={colors.textSecondary} />
                                    </IconButton>
                                  </HStack>
                                }
                                style={styles.planListRowInner}
                              >
                                <VStack space="xs" style={{ flex: 1 }}>
                                  <Text style={styles.rowLabel} numberOfLines={1}>
                                    {att.fileName ?? 'Attachment'}
                                  </Text>
                                  {statusLabel ? (
                                    <Text style={[styles.meta, status === 'failed' ? { color: colors.destructive } : null]}>
                                      {statusLabel}
                                    </Text>
                                  ) : null}
                                </VStack>
                              </ThreeColumnRow>
                            </Pressable>
                          );
                        })}
                      </VStack>
                    )}
                  </View>
                  );
                })()}
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.inputLabel}>Linked Goal</Text>
                <ObjectPicker
                  value={activity.goalId ?? ''}
                  onValueChange={(nextGoalId) => {
                    const timestamp = new Date().toISOString();
                    updateActivity(activity.id, (prev: any) => ({
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
                  fieldVariant="filled"
                />
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.inputLabel}>Type</Text>
                <ObjectPicker
                  value={activity.type}
                  onValueChange={(nextType) => {
                    const timestamp = new Date().toISOString();
                    const normalized = (nextType || 'task') as ActivityType;
                    updateActivity(activity.id, (prev: any) => ({
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
                  fieldVariant="filled"
                />
              </View>
            </>
          ) : null}
        </View>

      </KeyboardAwareScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  edgeFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
    // Android: ensure zIndex ordering participates in elevation stacking.
    elevation: 4,
  },
  headerTypePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTypePillTint: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor set at render-time to support light-surface variant.
  },
  headerTypePillContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 55,
  },
  activityHeroSection: {
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1,
  },
  activityHeroImageClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    paddingHorizontal: spacing.xl,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  headerBottomBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});



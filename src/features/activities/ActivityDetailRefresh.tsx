import React from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  // NOTE: ActivityDetailScreen is wrapped by AppShell, which already applies safe-area top padding
  // to the canvas. Do NOT double-count insets here, or the header will be pushed down.
  const scrollY = React.useRef(new Animated.Value(0)).current;
  // Match the effective page gutter used by Arc/Goal pages:
  // Arcs/Goals often run `AppShell fullBleedCanvas` and then apply `spacing.xl` internally.
  // ActivityDetail uses AppShell default gutter (`spacing.sm`), so we add the delta.
  const PAGE_GUTTER_X = typeof props.pageGutterX === 'number' ? props.pageGutterX : spacing.xl - spacing.sm;
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 44],
    // Keep a faint header presence even at rest (Notes-like translucency).
    // Notes-like: subtle background that never becomes fully opaque.
    outputRange: [0.0, 0.25],
    extrapolate: 'clamp',
  });
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [0, 44],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
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

    updateActivity,
    // Steps
    titleStepsBundleRef,
    setIsTitleStepsBundleReady,
    setTitleStepsBundleOffset,
    stepsDraft,
    handleToggleStepComplete,
    handleRemoveStep,
    handleChangeStepTitle,
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
      {/* Screen-edge scroll fade: affects only scroll content underneath the fixed header/dock. */}
      <View pointerEvents="none" style={[localStyles.edgeFade, { top: -resolvedTopOverscanPx, height: topFadeHeightPx }]}>
        <LinearGradient
          colors={[scrimStrong, scrimStrong, scrimClear]}
          {...({ locations: [0, 1 - FADE_RAMP_FRACTION, 1] } as any)}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
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
              materialVariant="onLight"
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
                  <HeaderActionPill
                    accessibilityLabel="Activity actions"
                    materialOpacity={headerActionPillOpacity}
                    materialVariant="onLight"
                  >
                    <Icon name="more" size={18} color={headerInk} />
                  </HeaderActionPill>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                  <DropdownMenuItem
                    onPress={() => {
                      handleSendToShare().catch(() => undefined);
                    }}
                  >
                    <View style={styles.menuItemRow}>
                      <Icon name="share" size={16} color={headerInk} />
                      <Text style={styles.menuRowText}>Share</Text>
                    </View>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                    <View style={styles.menuItemRow}>
                      <Icon name="trash" size={16} color={colors.destructive} />
                      <Text style={styles.destructiveMenuRowText}>Delete activity</Text>
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
                    { id: 'activity', label: activity?.title ?? 'Activity' },
                  ]}
                />
              </View>
              <View style={[styles.headerSideRight, styles.breadcrumbsRight]}>
                <DropdownMenu>
                  <DropdownMenuTrigger accessibilityLabel="Activity actions">
                    <IconButton style={styles.optionsButton} pointerEvents="none" accessible={false}>
                      <Icon name="more" size={18} color={headerInk} />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                    <DropdownMenuItem
                      onPress={() => {
                        handleSendToShare().catch(() => undefined);
                      }}
                    >
                      <View style={styles.menuItemRow}>
                        <Icon name="share" size={16} color={headerInk} />
                        <Text style={styles.menuRowText}>Share</Text>
                      </View>
                    </DropdownMenuItem>
                    <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                      <View style={styles.menuItemRow}>
                        <Icon name="trash" size={16} color={colors.destructive} />
                        <Text style={styles.destructiveMenuRowText}>Delete activity</Text>
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

        {/* Actions moved to persistent bottom dock (Notes-style). */}

        <View style={styles.sectionDivider} />

        {/* Plan (collapsible): triggers + planning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleBlock}>Plan</Text>
          <View
            ref={scheduleAndPlanningCardRef}
            collapsable={false}
            style={styles.planList}
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
        </View>

        <View style={styles.sectionDivider} />

        {/* Details (collapsible): notes + tags + goal + type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleBlock}>Details</Text>
            <View style={{ paddingTop: spacing.sm }}>
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
              />
            </View>
        </View>

        {/* Delete (quiet) */}
        <View style={styles.section}>
          <View style={styles.deleteLinkRow}>
            <Button
              variant="ghost"
              size="sm"
              onPress={handleDeleteActivity}
              accessibilityLabel="Delete activity"
            >
              <HStack alignItems="center" space="xs">
                <Icon name="trash" size={16} color={colors.destructive} />
                <Text style={styles.deleteLinkLabel}>Delete</Text>
              </HStack>
            </Button>
          </View>
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



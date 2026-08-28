import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused, type NavigationProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { colors, fonts, radii, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { Input } from '../../../ui/Input';
import { KwiltRefreshFrame, useKwiltRefresh } from '../../../ui/KwiltRefresh';
import {
  SettingsChoiceRow,
  SettingsDivider,
  SettingsGroup,
  SettingsRow,
  SettingsTextInputRow,
  SettingsToggleRow,
} from '../../../ui/SettingsSurface';
import { AppShell } from '../../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import {
  ObjectDetailMediaHero,
  ObjectDetailMediaSheet,
  resolveObjectDetailMediaGeometry,
} from '../../../ui/layout/ObjectDetailMediaShell';
import {
  HeaderActionPill,
  ObjectPageHeader,
  OBJECT_PAGE_HEADER_BAR_HEIGHT,
} from '../../../ui/layout/ObjectPageHeader';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { HStack } from '../../../ui/primitives';
import { useScrollLinkedStatusBarStyle } from '../../../ui/hooks/useScrollLinkedStatusBarStyle';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import { MoneyCategoryCover } from '../components/MoneyCategoryCover';
import { MoneyCategoryCoverDrawer } from '../components/MoneyCategoryCoverDrawer';
import { MoneyDetailMeter } from '../components/MoneyDetailMeter';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney, formatMoneyFreshness, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';
import { parseCategoryName, parseMonthlyAmount } from '../domain/categoryPlanDraft';
import { groupMoneyTransactionsByDate } from '../domain/moneyDetailView';
import { getLocalMoneyPeriodId } from '../domain/moneyCalendar';
import { projectMoneyCategoryPeriodView } from '../domain/moneyPeriodView';
import { projectMoneyRebalanceAnswer, type MoneyRebalanceAnswer } from '../domain/moneyRebalanceAnswer';
import type { MoneyForecastMode } from '../domain/moneyForecast';
import type { MoneyCategoryPlanRole } from '../domain/moneyCategoryPlanRole';
import type { MoneyStackParamList } from '../navigation/types';
import type { RootDrawerParamList } from '../../../navigation/RootNavigator';
import { projectCategoryFunding, type CategoryFundingRhythm } from '../domain/categoryFunding';
import type { LivingPlanOverridePreview } from '../runtime/livingPlanReconciliation';
import { captureMoneyMutation } from '../runtime/moneyMutationTelemetry';
import { buildMoneyRebalanceChangesOpenedProps, buildMoneyRebalanceOutcomeProps, buildMoneyRebalancePreviewViewedProps } from '../runtime/moneyPlanLimitAnalytics';
import { signalMoneyMutationOutcome, signalMoneyToggle } from '../runtime/moneyMutationFeedback';

const ACTIVITY_INLINE_LIMIT = 5;
const CATEGORY_HEADER_PILL_SIZE = 44;
const CATEGORY_HEADER_BAR_HEIGHT = OBJECT_PAGE_HEADER_BAR_HEIGHT + 8;
const CATEGORY_MEDIA_GEOMETRY = resolveObjectDetailMediaGeometry('compact');

export function MoneyCategoryDetailScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyCategoryDetail'>) {
  const rootNavigation = navigation.getParent<NavigationProp<RootDrawerParamList>>();
  const { capture } = useAnalytics();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const scrollY = useRef(new Animated.Value(0)).current;
  const {
    previewCategoryPlanAmount,
    refresh,
    renameCategory,
    savingCategory,
    snapshot,
    status,
    updateCategoryCover,
    updateCategoryPlan,
  } = useMoneyData();
  const [monthOffset, setMonthOffset] = useState(route.params.monthOffset ?? 0);
  const [forecastInfoOpen, setForecastInfoOpen] = useState(false);
  const [forecastSettingsOpen, setForecastSettingsOpen] = useState(false);
  const [forecastModeDraft, setForecastModeDraft] = useState<MoneyForecastMode>('paced');
  const [manualForecastDraft, setManualForecastDraft] = useState('');
  const [scheduledAmountDraft, setScheduledAmountDraft] = useState('');
  const [scheduledDueDayDraft, setScheduledDueDayDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoryNameDraft, setCategoryNameDraft] = useState('');
  const [categoryAmountDraft, setCategoryAmountDraft] = useState('');
  const [fundingRhythmDraft, setFundingRhythmDraft] = useState<CategoryFundingRhythm>('monthly');
  const [planRoleDraft, setPlanRoleDraft] = useState<MoneyCategoryPlanRole>('flexible');
  const [expectedNeedDraft, setExpectedNeedDraft] = useState('');
  const [expectedNeedDueMonthDraft, setExpectedNeedDueMonthDraft] = useState('');
  const [planImpact, setPlanImpact] = useState<LivingPlanOverridePreview | null>(null);
  const [showPlanChanges, setShowPlanChanges] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [chartScrubbing, setChartScrubbing] = useState(false);
  const [coverDrawerOpen, setCoverDrawerOpen] = useState(false);
  const {
    onScroll: onRefreshScroll,
    refreshControl,
    refreshOverlay,
    refreshing,
    scrollEventThrottle,
  } = useKwiltRefresh({
    backgroundColor: colors.parchment,
    onRefresh: refresh,
    overlayTopOffset: insets.top,
    scrollY,
  });
  const view = useMemo(() => snapshot
    ? projectMoneyCategoryPeriodView(snapshot, route.params.categoryId, monthOffset)
    : null, [monthOffset, route.params.categoryId, snapshot]);
  const category = view?.category;
  const rebalanceAnswer = useMemo(() => (
    category && planImpact?.outcome === 'ready'
      ? projectMoneyRebalanceAnswer(planImpact, category.id)
      : null
  ), [category, planImpact]);
  useEffect(() => {
    if (!rebalanceAnswer) return;
    capture(AnalyticsEvent.MoneyRebalancePreviewViewed, buildMoneyRebalancePreviewViewedProps({ answer: rebalanceAnswer }));
  }, [capture, rebalanceAnswer]);
  const groups = useMemo(() => groupMoneyTransactionsByDate(
    (view?.transactions ?? []).slice(0, ACTIVITY_INLINE_LIMIT),
  ), [view?.transactions]);
  const headerTotalHeight = insets.top + CATEGORY_HEADER_BAR_HEIGHT;
  const refreshHeaderTranslateY = scrollY.interpolate({
    inputRange: [-1, 0],
    outputRange: [1, 0],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
  const headerTransitionStartScrollY = Math.max(
    1,
    CATEGORY_MEDIA_GEOMETRY.heroHeight - CATEGORY_MEDIA_GEOMETRY.overlap - headerTotalHeight,
  );
  const statusBarStyle = useScrollLinkedStatusBarStyle(scrollY, headerTransitionStartScrollY, {
    enabled: isFocused,
    initialStyle: 'light',
    inactiveStyle: 'dark',
    hysteresisPx: 8,
    platform: 'ios',
  });

  useEffect(() => {
    if (!category) return;
    setCategoryNameDraft(category.name);
    setCategoryAmountDraft((category.plannedCents / 100).toFixed(2));
    setFundingRhythmDraft(category.fundingRhythm);
    setPlanRoleDraft(category.planRole ?? 'flexible');
    setExpectedNeedDraft(formatCentsInput(category.expectedNeed?.amountCents));
    setExpectedNeedDueMonthDraft(category.expectedNeed?.dueMonth ?? '');
    setPlanImpact(null);
    setShowPlanChanges(false);
    setForecastModeDraft(category.forecastSettings?.mode ?? category.forecast.mode);
    setManualForecastDraft(formatCentsInput(category.forecastSettings?.manualProjectedSpendCents));
    setScheduledAmountDraft(formatCentsInput(category.forecastSettings?.scheduledAmountCents));
    setScheduledDueDayDraft(category.forecastSettings?.scheduledDueDay?.toString() ?? '');
    setCategoryError(null);
  }, [category?.expectedNeed, category?.forecast.mode, category?.forecastSettings, category?.fundingRhythm, category?.name, category?.planRole, category?.plannedCents, category?.sourceId]);

  const previewMonthlyAmount = async () => {
    if (!category) return null;
    try {
      const expectedNeedCents = fundingRhythmDraft === 'reserve' ? parseOptionalMoney(expectedNeedDraft) : null;
      const expectedNeedDueMonth = fundingRhythmDraft === 'reserve' ? parseOptionalMonth(expectedNeedDueMonthDraft) : null;
      if ((expectedNeedCents == null) !== (expectedNeedDueMonth == null)) throw new Error('Enter both an expected amount and due month.');
      const preview = await previewCategoryPlanAmount(category.sourceId, parseMonthlyAmount(categoryAmountDraft), {
        fundingRhythm: fundingRhythmDraft,
        expectedNeedCents,
        expectedNeedDueMonth,
      });
      setPlanImpact(preview);
      setShowPlanChanges(false);
      return preview;
    } catch (error) {
      setMutationError(error);
      return null;
    }
  };

  const saveCategorySettings = async () => {
    if (!category) return;
    const startedAtMs = Date.now();
    setCategoryError(null);
    try {
      const name = parseCategoryName(categoryNameDraft);
      const budgetCents = parseMonthlyAmount(categoryAmountDraft);
      const expectedNeedCents = fundingRhythmDraft === 'reserve' ? parseOptionalMoney(expectedNeedDraft) : null;
      const dueMonth = fundingRhythmDraft === 'reserve' ? parseOptionalMonth(expectedNeedDueMonthDraft) : null;
      if ((expectedNeedCents == null) !== (dueMonth == null)) throw new Error('Enter both an expected amount and due month.');

      const planChanged = budgetCents !== category.plannedCents
        || fundingRhythmDraft !== category.fundingRhythm
        || expectedNeedCents !== (category.expectedNeed?.amountCents ?? null)
        || dueMonth !== (category.expectedNeed?.dueMonth ?? null);
      const roleChanged = planRoleDraft !== category.planRole;

      if (planChanged) {
        const preview = planImpact ?? await previewCategoryPlanAmount(category.sourceId, budgetCents, {
          fundingRhythm: fundingRhythmDraft,
          expectedNeedCents,
          expectedNeedDueMonth: dueMonth,
        });
        if (preview && preview.outcome !== 'ready' && preview.outcome !== 'no_op') {
          throw new Error('Kwilt needs current account evidence before it can check this amount against your living target.');
        }
        await updateCategoryPlan(category.sourceId, {
          budgetCents,
          fundingRhythm: fundingRhythmDraft,
          expectedNeedCents,
          expectedNeedDueMonth: dueMonth,
        }, preview?.outcome === 'ready' ? preview : undefined);
      }
      if (roleChanged) await updateCategoryPlan(category.sourceId, { planRole: planRoleDraft });
      if (name !== category.name) await renameCategory(category.sourceId, name);
      setSettingsOpen(false);
      if (rebalanceAnswer) capture(AnalyticsEvent.MoneyRebalanceSaved, buildMoneyRebalanceOutcomeProps({ outcome: 'saved', answerState: rebalanceAnswer.state }));
      captureMoneyMutation(capture, { operation: 'category_settings', outcome: 'succeeded', durationMs: Date.now() - startedAtMs });
      signalMoneyMutationOutcome('succeeded');
    } catch (error) {
      setMutationError(error);
      if (rebalanceAnswer && error instanceof Error && error.message.includes('changed since you reviewed')) {
        capture(AnalyticsEvent.MoneyRebalanceStaleRejected, buildMoneyRebalanceOutcomeProps({ outcome: 'stale_rejected', answerState: rebalanceAnswer.state }));
      }
      captureMoneyMutation(capture, { operation: 'category_settings', outcome: 'failed', durationMs: Date.now() - startedAtMs });
      signalMoneyMutationOutcome('failed');
    }
  };

  const setMutationError = (error: unknown) => {
    setCategoryError(error instanceof Error ? error.message : 'The category could not be updated.');
  };

  const saveForecastSettings = async () => {
    if (!category) return;
    setCategoryError(null);
    try {
      await updateCategoryPlan(category.sourceId, {
        forecastMode: forecastModeDraft,
        manualProjectedSpendCents: forecastModeDraft === 'manual' ? parseOptionalMoney(manualForecastDraft) : null,
        scheduledAmountCents: forecastModeDraft === 'scheduled' || forecastModeDraft === 'hybrid' ? parseOptionalMoney(scheduledAmountDraft) : null,
        scheduledDueDay: forecastModeDraft === 'scheduled' || forecastModeDraft === 'hybrid' ? parseOptionalDay(scheduledDueDayDraft) : null,
      });
      setForecastSettingsOpen(false);
    } catch (error) {
      setMutationError(error);
    }
  };

  const toggleRollover = async () => {
    if (!category) return;
    const nextValue = !category.rolloverEnabled;
    signalMoneyToggle(nextValue);
    setCategoryError(null);
    try {
      await updateCategoryPlan(category.sourceId, { rolloverEnabled: nextValue });
      signalMoneyMutationOutcome('succeeded');
    } catch (error) {
      setMutationError(error);
      signalMoneyMutationOutcome('failed');
    }
  };

  if (!view || !category) {
    return (
      <AppShell>
        <PageHeader title="Category" onPressBack={() => navigation.goBack()} />
        <View style={styles.unavailable}>
          <Text style={styles.emptyTitle}>{status === 'loading' ? 'Loading category…' : 'This category is unavailable'}</Text>
          <Text style={styles.emptyCopy}>It may have changed since the last successful Money sync.</Text>
          <Button variant="outline" onPress={() => void refresh()}>Try again</Button>
        </View>
      </AppShell>
    );
  }

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger accessibilityLabel={`${category.name} actions`}>
        <View pointerEvents="none">
          <HeaderActionPill
            accessibilityLabel={`${category.name} actions`}
            materialVariant="floatingWhite"
            size={CATEGORY_HEADER_PILL_SIZE}
          >
            <Icon name="more" size={22} color={colors.textPrimary} />
          </HeaderActionPill>
        </View>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
        <DetailMenuItem icon="edit" label="Category settings" onPress={() => setSettingsOpen(true)} />
        {category.fundingRhythm === 'monthly' ? <DetailMenuItem icon="gauge" label="Forecast settings" onPress={() => setForecastSettingsOpen(true)} /> : null}
        <DetailMenuItem icon="image" label="Edit cover" onPress={() => setCoverDrawerOpen(true)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <AppShell fullBleedCanvas>
        <StatusBar style={statusBarStyle} animated />
        <View style={styles.screen}>
          <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing} style={styles.refreshBackdrop}>
            <Animated.View
              pointerEvents="box-none"
              style={[styles.refreshHeader, { height: headerTotalHeight, transform: [{ translateY: refreshHeaderTranslateY }] }]}
            >
              <ObjectPageHeader
                barHeight={CATEGORY_HEADER_BAR_HEIGHT}
                showFullWidthBackground={false}
                left={(
                  <HeaderActionPill
                    accessibilityLabel="Back to budget summary"
                    materialVariant="floatingWhite"
                    onPress={() => navigation.goBack()}
                    size={CATEGORY_HEADER_PILL_SIZE}
                  >
                    <Icon name="arrowLeft" size={22} color={colors.textPrimary} />
                  </HeaderActionPill>
                )}
                right={<HStack alignItems="center" space="sm">{moreMenu}</HStack>}
              />
            </Animated.View>
            <Animated.ScrollView
              contentInsetAdjustmentBehavior="never"
              scrollEnabled={!chartScrubbing}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={refreshControl}
              onScroll={onRefreshScroll}
              scrollEventThrottle={scrollEventThrottle}
            >
            <View style={styles.refreshPage}>
              <ObjectDetailMediaHero
                variant="compact"
                motionVariant="standard"
                scrollY={scrollY}
                headerBoundary={headerTotalHeight}
                extendArtworkBehindSheetCorners
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${category.name} cover`}
                  onPress={() => setCoverDrawerOpen(true)}
                  style={StyleSheet.absoluteFillObject}
                >
                  <MoneyCategoryCover
                    attributionBottomInset={CATEGORY_MEDIA_GEOMETRY.sheetRadius}
                    cover={category.coverImage}
                  />
                </Pressable>
              </ObjectDetailMediaHero>

              <ObjectDetailMediaSheet variant="compact">
                <View style={styles.detailSheetInner}>
                  <View style={styles.summarySection}>
              <Text accessibilityRole="header" style={styles.categoryTitle}>{category.name}</Text>
              <MoneyDetailMeter
                category={category}
                historicalTransactions={view.historicalTransactions}
                monthOffset={monthOffset}
                onForecastInfo={() => setForecastInfoOpen(true)}
                onNextMonth={() => setMonthOffset((value) => Math.min(12, value + 1))}
                onPreviousMonth={() => setMonthOffset((value) => Math.max(-24, value - 1))}
                onResetMonth={() => setMonthOffset(0)}
                onScrubActiveChange={setChartScrubbing}
                periodElapsedPercent={view.periodElapsedPercent}
                periodEndIso={view.periodEndIso}
                periodLabel={view.periodLabel}
                periodStartIso={view.periodStartIso}
                transactions={view.transactions}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${category.name} settings`}
                onPress={() => setSettingsOpen(true)}
                style={({ pressed }) => [styles.categorySettingsLink, pressed ? styles.categorySettingsLinkPressed : null]}
              >
                <Text style={styles.categorySettingsText}>Category settings</Text>
                <Icon name="chevronRight" size={18} color={colors.textSecondary} />
              </Pressable>
                  </View>

                  <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Activity</Text>
                <Text style={styles.sectionCount}>{view.transactions.length} {view.transactions.length === 1 ? 'transaction' : 'transactions'}</Text>
              </View>
              <View style={styles.activityInventory}>
                {groups.length > 0 ? groups.map((group) => (
                  <View key={group.dateIso} style={styles.activityGroup}>
                    <Text style={styles.dateLabel}>{group.label}</Text>
                    <View style={styles.activityRows}>
                      {group.transactions.map((transaction, index) => (
                        <CategoryTransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          showDivider={index < group.transactions.length - 1}
                          onPress={() => navigation.navigate('MoneyTransactionDetail', { transactionId: transaction.id })}
                        />
                      ))}
                    </View>
                  </View>
                )) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No {view.periodLabel} {category.name} activity yet</Text>
                    <Text style={styles.emptyCopy}>Transactions assigned to this category will appear here.</Text>
                  </View>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('MoneyTransactions', {
                  categoryId: category.id,
                  monthStart: view.periodStartIso,
                  monthEnd: view.periodEndIso,
                  monthLabel: view.periodLabel,
                })}
                style={styles.viewAllRow}
              >
                <Text style={styles.viewAllText}>View all activity</Text>
                <Icon name="chevronRight" size={18} color={colors.textSecondary} />
              </Pressable>
                  </View>

                  <View style={styles.statsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>This month</Text>
                <Text style={styles.sectionCount}>{formatMoneyFreshness(snapshot?.lastSyncedAt ?? null)}</Text>
              </View>
              <View style={styles.statsRow}>
                <Stat value={formatMoney(category.spentCents)} label="Spent" />
                <View style={styles.statDivider} />
                <Stat value={formatMoney(category.remainingCents)} label={category.fundingRhythm === 'reserve' ? 'Available' : 'Left'} tone={category.remainingCents < 0 ? 'danger' : 'default'} />
                <View style={styles.statDivider} />
                <Stat value={formatMoney(category.plannedCents)} label={category.fundingRhythm === 'reserve' ? 'Contribution' : 'Limit'} />
              </View>
              <View style={styles.factsRow}>
                <Fact label="Used" value={`${category.percentUsed}%`} />
                <Fact label="Month elapsed" value={`${view.periodElapsedPercent}%`} />
                <Fact label="Funding" value={category.fundingRhythm === 'reserve' ? 'Reserve' : 'Monthly'} />
              </View>
                  </View>
                </View>
              </ObjectDetailMediaSheet>
            </View>
            </Animated.ScrollView>
          </KwiltRefreshFrame>
        </View>
      </AppShell>

      <BottomDrawer visible={forecastInfoOpen} onClose={() => setForecastInfoOpen(false)} snapPoints={['42%']}>
        <View style={styles.drawerContent}>
          <BottomDrawerHeader
            closeAccessibilityLabel="Close forecast details"
            onClose={() => setForecastInfoOpen(false)}
            title="How this forecast works"
            variant="withClose"
          />
          <Text style={styles.drawerCopy}>{category.fundingRhythm === 'reserve'
            ? category.expectedNeed
              ? `Kwilt compares the reserve you can accumulate with ${formatMoney(category.expectedNeed.amountCents)} needed by ${formatDueMonth(category.expectedNeed.dueMonth)}.`
              : `Kwilt shows the reserve available now. Add an expected need only when there is a real amount and month to cover.`
            : `Kwilt estimates where ${category.name} could land by month end from spending so far, days remaining, and the category’s forecast mode.`}</Text>
          <View style={styles.forecastFacts}>
            {category.fundingRhythm === 'reserve' ? (
              <>
                <Fact label="Available" value={category.reserveAvailabilityKnown ? formatMoney(category.reserveAvailableCents) : 'Not known'} />
                <Fact label="Expected" value={category.expectedNeed ? formatMoney(category.expectedNeed.amountCents) : 'Not set'} />
                <Fact label="Coverage" value={fundingCoverageLabel(category)} />
              </>
            ) : (
              <>
                <Fact label="Projected" value={formatMoney(category.forecast.projectedSpendCents)} />
                <Fact label="Likely low" value={formatMoney(category.forecast.projectionRangeLowCents)} />
                <Fact label="Likely high" value={formatMoney(category.forecast.projectionRangeHighCents)} />
              </>
            )}
          </View>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        snapPoints={['82%']}
        keyboardBehavior="resize"
        bottomAccessory={(
          <Button
            disabled={savingCategory}
            fullWidth
            loading={savingCategory}
            loadingLabel="Saving…"
            onPress={() => void saveCategorySettings()}
          >
            Save changes
          </Button>
        )}
        bottomAccessoryPlacement="phoneFloating"
        sheetStyle={styles.settingsDrawerSheet}
      >
        <View style={styles.drawerFixedHeader}>
          <BottomDrawerHeader
            closeAccessibilityLabel="Close category settings"
            onClose={() => setSettingsOpen(false)}
            title={`${category.name} settings`}
            variant="withClose"
          />
        </View>
        <BottomDrawerScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.settingsDrawerScrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <SettingsGroup title="CATEGORY">
            <SettingsTextInputRow editable={!savingCategory} label="Name" onChangeText={(value) => { setCategoryNameDraft(value); setPlanImpact(null); setShowPlanChanges(false); }} value={categoryNameDraft} />
            <SettingsDivider />
            <SettingsTextInputRow editable={!savingCategory} keyboardType="decimal-pad" label={fundingRhythmDraft === 'reserve' ? 'Monthly contribution' : 'Monthly amount'} onBlur={() => void previewMonthlyAmount()} onChangeText={(value) => { setCategoryAmountDraft(value); setPlanImpact(null); }} value={categoryAmountDraft} />
          </SettingsGroup>

          <SettingsGroup
            title="COUNTS AS"
            footer={planRoleDraft === 'protected'
              ? 'Kwilt keeps this amount aside before calculating flexible room.'
              : 'Spending here counts against flexible room.'}
          >
            <SettingsChoiceRow disabled={savingCategory} selected={planRoleDraft === 'protected'} description="Keep this amount aside before flexible spending." title="Protected" onPress={() => setPlanRoleDraft('protected')} />
            <SettingsDivider />
            <SettingsChoiceRow disabled={savingCategory} selected={planRoleDraft === 'flexible'} description="Count spending here against flexible room." title="Flexible" onPress={() => setPlanRoleDraft('flexible')} />
          </SettingsGroup>

          <SettingsGroup title="FUNDING RHYTHM">
            <SettingsChoiceRow disabled={savingCategory} selected={fundingRhythmDraft === 'monthly'} description="Use this amount for the month. Rollover stays separate." title="Monthly" onPress={() => { signalMoneyToggle(false); setFundingRhythmDraft('monthly'); setPlanImpact(null); }} />
            <SettingsDivider />
            <SettingsChoiceRow disabled={savingCategory} selected={fundingRhythmDraft === 'reserve'} description="Build available money across months for lumpy needs." title="Reserve" onPress={() => { signalMoneyToggle(true); setFundingRhythmDraft('reserve'); setForecastSettingsOpen(false); setPlanImpact(null); }} />
          </SettingsGroup>

          {fundingRhythmDraft === 'reserve' ? (
            <SettingsGroup title="EXPECTED NEED" footer={reserveCoverageCopy(category, categoryAmountDraft, expectedNeedDraft, expectedNeedDueMonthDraft)}>
              <SettingsTextInputRow editable={!savingCategory} keyboardType="decimal-pad" label="Amount" onChangeText={(value) => { setExpectedNeedDraft(value); setPlanImpact(null); }} value={expectedNeedDraft} />
              <SettingsDivider />
              <SettingsTextInputRow autoCapitalize="none" editable={!savingCategory} label="Due month" accessibilityHint="Enter a month in YYYY-MM format" onChangeText={(value) => { setExpectedNeedDueMonthDraft(value); setPlanImpact(null); }} value={expectedNeedDueMonthDraft} />
            </SettingsGroup>
          ) : (
            <SettingsGroup footer="Unused or overspent amounts carry into the next month." title="ROLLOVER">
              <SettingsToggleRow
              disabled={savingCategory}
              enabled={category.rolloverEnabled}
              onPress={() => void toggleRollover()}
              title="Carry unused money forward"
              />
            </SettingsGroup>
          )}
          {planImpact?.outcome === 'ready' && rebalanceAnswer ? (
            <SettingsGroup title="PLAN IMPACT">
              <View style={styles.settingsSummary}>
                <RebalanceConsequence
                  answer={rebalanceAnswer}
                  editedCategoryId={category.id}
                  livingPercent={planImpact.after.livingPercent}
                  livingLimitCents={planImpact.after.targetCents}
                  categories={snapshot?.categories ?? []}
                  expanded={showPlanChanges}
                  onToggle={() => setShowPlanChanges((value) => {
                    if (!value) capture(AnalyticsEvent.MoneyRebalanceChangesOpened, buildMoneyRebalanceChangesOpenedProps({ changedCount: rebalanceAnswer.changedCategories.length }));
                    return !value;
                  })}
                />
              </View>
            </SettingsGroup>
          ) : null}
          <SettingsGroup footer="Choose apps and decide when this category should ask for a spending review." title="FOLLOW THROUGH">
            <SettingsRow
              disabled={savingCategory}
              onPress={() => {
                setSettingsOpen(false);
                rootNavigation?.navigate('Settings', {
                  screen: 'SettingsScreenTimeRuleBuilder',
                  params: {
                    entry: 'contextual',
                    suggestedBudgetCondition: {
                      categorySourceId: category.sourceId,
                      categoryName: category.name,
                      preset: 'when_over',
                    },
                    setupIntent: 'settings_discovery',
                    entrySurface: 'settings',
                  },
                });
              }}
              title="Screen Time rule"
              value="Create"
            />
          </SettingsGroup>
          {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={forecastSettingsOpen}
        onClose={() => setForecastSettingsOpen(false)}
        snapPoints={['82%']}
        keyboardBehavior="extend"
      >
        <View style={styles.drawerFixedHeader}>
          <BottomDrawerHeader
            closeAccessibilityLabel="Close forecast settings"
            onClose={() => setForecastSettingsOpen(false)}
            title="Forecast settings"
            variant="withClose"
          />
        </View>
        <BottomDrawerScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.drawerScrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.drawerCopy}>Choose the evidence Kwilt should use for the month-end estimate. This changes the forecast, not transactions or the monthly limit.</Text>
          <View style={styles.modeList}>
            <ForecastModeRow active={forecastModeDraft === 'paced'} detail="Extend spending so far across the rest of the month." label="Spending pace" onPress={() => setForecastModeDraft('paced')} />
            <ForecastModeRow active={forecastModeDraft === 'scheduled'} detail="Add a known bill that has not happened yet." label="Scheduled bill" onPress={() => setForecastModeDraft('scheduled')} />
            <ForecastModeRow active={forecastModeDraft === 'hybrid'} detail="Combine spending pace with a known upcoming bill." label="Pace + scheduled" onPress={() => setForecastModeDraft('hybrid')} />
            <ForecastModeRow active={forecastModeDraft === 'manual'} detail="Use a total you already expect for month end." label="Set month-end total" onPress={() => setForecastModeDraft('manual')} />
          </View>
          {forecastModeDraft === 'manual' ? (
            <Input keyboardType="decimal-pad" label="Expected month-end total" onChangeText={setManualForecastDraft} value={manualForecastDraft} />
          ) : null}
          {forecastModeDraft === 'scheduled' || forecastModeDraft === 'hybrid' ? (
            <View style={styles.forecastInputs}>
              <Input keyboardType="decimal-pad" label="Scheduled amount" onChangeText={setScheduledAmountDraft} value={scheduledAmountDraft} />
              <Input keyboardType="number-pad" label="Due day (1–31)" onChangeText={setScheduledDueDayDraft} value={scheduledDueDayDraft} />
            </View>
          ) : null}
          {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
          <Button disabled={savingCategory} fullWidth onPress={() => void saveForecastSettings()}>{savingCategory ? 'Saving…' : 'Save forecast'}</Button>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <MoneyCategoryCoverDrawer
        categoryName={category.name}
        currentCover={category.coverImage}
        onClose={() => setCoverDrawerOpen(false)}
        onSave={(cover) => updateCategoryCover(category.sourceId, cover)}
        saving={savingCategory}
        visible={coverDrawerOpen}
      />
    </>
  );
}

export function CategoryTransactionRow({ onPress, showDivider, transaction }: { onPress: () => void; showDivider: boolean; transaction: MoneyTransaction }) {
  const amount = transaction.direction === 'inflow' ? transaction.amountCents : -transaction.amountCents;
  const amountLabel = `${amount > 0 ? '+' : ''}${formatMoney(amount, transaction.currencyCode)}`;
  const savedResourceCents = Math.min(transaction.amountCents, Math.max(0, transaction.savedResourceCents ?? 0));
  const planCoverageCents = Math.max(0, transaction.amountCents - savedResourceCents);
  const coverageLabel = savedResourceCents > 0
    ? `Saved money · ${formatMoney(planCoverageCents, transaction.currencyCode)} from plan`
    : null;
  const coverageAccessibilityLabel = savedResourceCents > 0
    ? `, covered by saved money, ${formatMoney(planCoverageCents, transaction.currencyCode)} from plan`
    : '';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${transaction.merchantName} transaction, ${transaction.accountName}, ${amountLabel}${coverageAccessibilityLabel}`} onPress={onPress} style={({ pressed }) => [styles.transactionRow, showDivider ? styles.transactionRowDivider : null, pressed ? styles.pressed : null]}>
      <View style={styles.transactionCopy}>
        <Text numberOfLines={1} style={styles.transactionMerchant}>{transaction.merchantName}</Text>
        <Text numberOfLines={1} style={styles.transactionMeta}>{transaction.reviewState === 'needs_review' ? 'Needs review' : transaction.accountName}</Text>
        {coverageLabel ? <Text numberOfLines={1} style={styles.transactionCoverage}>{coverageLabel}</Text> : null}
      </View>
      <Text style={[styles.transactionAmount, transaction.direction === 'inflow' ? styles.inflow : null, coverageLabel ? styles.savedTransactionAmount : null]}>{amountLabel}</Text>
      <Icon name="chevronRight" size={16} color={colors.gray400} />
    </Pressable>
  );
}

function Stat({ label, tone = 'default', value }: { label: string; tone?: 'default' | 'danger'; value: string }) {
  return <View style={styles.stat}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.statValue, tone === 'danger' ? styles.danger : null]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text numberOfLines={1} style={styles.factValue}>{value}</Text></View>;
}

function DetailMenuItem({ icon, label, onPress }: { icon: 'edit' | 'gauge' | 'image'; label: string; onPress: () => void }) {
  return <DropdownMenuItem accessibilityLabel={label} onPress={onPress}><View style={menuStyles.menuItemRow}><Icon name={icon} size={18} color={colors.textPrimary} /><Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text></View></DropdownMenuItem>;
}

function ForecastModeRow({ active, detail, label, onPress }: { active: boolean; detail: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.modeRow, active ? styles.modeRowActive : null]}>
      <View style={styles.modeCopy}><Text style={styles.modeTitle}>{label}</Text><Text style={styles.modeDetail}>{detail}</Text></View>
      <Icon name={active ? 'checkCircle' : 'dot'} size={20} color={active ? colors.pine700 : colors.gray400} />
    </Pressable>
  );
}

function formatCentsInput(value: number | null | undefined): string {
  return value == null ? '' : (value / 100).toFixed(2);
}

function parseOptionalMoney(value: string): number | null {
  return value.trim() ? parseMonthlyAmount(value) : null;
}

function parseOptionalDay(value: string): number | null {
  if (!value.trim()) return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Enter a due day from 1 through 31.');
  return day;
}

function parseOptionalMonth(value: string): string | null {
  const month = value.trim();
  if (!month) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Enter the due month as YYYY-MM.');
  return month;
}

function formatDueMonth(periodId: string): string {
  const [year, month] = periodId.split('-').map(Number);
  if (!year || !month) return periodId;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function reserveCoverageCopy(
  category: MoneyCategory,
  contributionDraft: string,
  amountDraft: string,
  dueMonthDraft: string,
): string {
  const contribution = Number(contributionDraft.replace(/[$,\s]/g, ''));
  const amount = Number(amountDraft.replace(/[$,\s]/g, ''));
  const dueMonth = dueMonthDraft.trim();
  if (!Number.isFinite(contribution) || contribution < 0) return 'Enter a monthly contribution to check this reserve.';
  if (!amountDraft.trim() && !dueMonth) return `${formatMoney(category.reserveAvailableCents)} is available now.`;
  if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(dueMonth)) {
    return 'Enter both an expected amount and due month to check coverage.';
  }
  const coverage = projectCategoryFunding({
    rhythm: 'reserve',
    monthlyContributionCents: Math.round(contribution * 100),
    priorReserveCents: category.reserveAvailableCents - category.monthlyContributionCents + category.spentCents,
    countedSpendCents: category.spentCents,
    periodId: getLocalMoneyPeriodId(new Date()),
    expectedNeed: { amountCents: Math.round(amount * 100), dueMonth },
  }).coverage;
  if (coverage.status === 'none') return `${formatMoney(category.reserveAvailableCents)} is available now.`;
  if (coverage.status === 'covered') return `${formatMoney(coverage.projectedAvailableCents)} is projected by ${formatDueMonth(coverage.dueMonth)}. The need is covered.`;
  if (coverage.status === 'past_due') return `The expected month has passed. Update the need before relying on this forecast.`;
  return `${formatMoney(coverage.projectedAvailableCents)} is projected by ${formatDueMonth(coverage.dueMonth)}, ${formatMoney(coverage.shortfallCents)} short. A ${formatMoney(coverage.catchUpContributionCents)} monthly catch-up would close the gap.`;
}

function fundingCoverageLabel(category: MoneyCategory): string {
  if (!category.reserveAvailabilityKnown) return 'Not known';
  const coverage = category.fundingCoverage;
  if (coverage.status === 'none') return 'No need set';
  if (coverage.status === 'covered') return 'Covered';
  if (coverage.status === 'past_due') return 'Update need';
  return `${formatMoney(coverage.shortfallCents)} short`;
}

function RebalanceConsequence({
  answer,
  categories,
  editedCategoryId,
  expanded,
  livingLimitCents,
  livingPercent,
  onToggle,
}: {
  answer: MoneyRebalanceAnswer;
  categories: MoneyCategory[];
  editedCategoryId: string;
  expanded: boolean;
  livingLimitCents: number;
  livingPercent: number;
  onToggle: () => void;
}) {
  const otherChanges = answer.changedCategories.filter((change) => change.categoryId !== editedCategoryId);
  const decreasedNames = otherChanges
    .filter((change) => change.deltaCents < 0)
    .map((change) => categories.find((category) => category.id === change.categoryId || category.sourceId === change.categoryId)?.name ?? change.categoryId);
  const headline = answer.state === 'over_limit'
    ? `This puts your plan ${formatMoney(answer.headlineAmountCents)} over its ${livingPercent}% living limit.`
    : answer.state === 'no_change'
      ? `This does not change your ${livingPercent}% living limit.`
      : `This stays within your ${livingPercent}% living limit of ${formatMoney(livingLimitCents)}.`;
  const support = answer.state === 'within_unassigned'
    ? `This uses ${formatMoney(answer.headlineAmountCents)} that was not assigned. No other category changes.`
    : answer.state === 'within_reallocated'
      ? `${formatMoney(answer.movedCents)} moves from ${naturalList(decreasedNames)}. ${answer.protectedAmountsUnchanged ? 'Protected expenses do not change.' : 'Review the protected changes below.'}`
      : answer.state === 'over_limit'
        ? answer.protectedAmountsUnchanged ? 'Protected amounts stay in place.' : 'Review the protected changes below.'
        : 'No category amount changes.';
  return (
    <View style={styles.rebalanceSummary}>
      <Text style={styles.rebalanceHeadline}>{headline}</Text>
      <Text style={styles.toggleDescription}>{support}</Text>
      {otherChanges.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide changes' : 'See changes'} onPress={onToggle} hitSlop={8}>
          <Text style={styles.rebalanceAction}>{expanded ? 'Hide changes' : 'See changes'}</Text>
        </Pressable>
      ) : null}
      {expanded ? (
        <View style={styles.rebalanceChanges}>
          {otherChanges.map((change) => {
            const name = categories.find((category) => category.id === change.categoryId || category.sourceId === change.categoryId)?.name ?? change.categoryId;
            return <Text key={change.categoryId} style={styles.toggleDescription}>{name}: {formatMoney(change.beforeCents ?? 0)} → {formatMoney(change.afterCents ?? 0)}</Text>;
          })}
        </View>
      ) : null}
    </View>
  );
}

function naturalList(values: string[]): string {
  if (values.length === 0) return 'other flexible categories';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  refreshBackdrop: { backgroundColor: colors.parchment },
  refreshHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  scrollContent: { flexGrow: 1 },
  refreshPage: {
    flexGrow: 1,
    position: 'relative',
    backgroundColor: colors.canvas,
  },
  detailSheetInner: { gap: spacing.xl, paddingTop: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 80 },
  summarySection: { gap: spacing.md },
  categoryTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  categorySettingsLink: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  categorySettingsLinkPressed: { opacity: 0.62 },
  categorySettingsText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  activitySection: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  sectionCount: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  activityInventory: { gap: spacing.md, padding: spacing.sm, borderRadius: radii.card, backgroundColor: colors.fieldFill },
  activityGroup: { gap: spacing.xs },
  dateLabel: { paddingTop: spacing.xs, color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  activityRows: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.card },
  transactionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  transactionRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder },
  pressed: { opacity: 0.72 },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionMerchant: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  transactionMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  transactionAmount: { minWidth: 72, color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  savedTransactionAmount: { color: colors.textSecondary },
  transactionCoverage: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, fontWeight: '500' },
  inflow: { color: colors.pine700 },
  emptyState: { gap: spacing.xs, paddingVertical: spacing.lg },
  emptyTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  emptyCopy: { ...typography.bodySm, color: colors.textSecondary },
  viewAllRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAllText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  statsSection: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23, fontWeight: '600', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.cardBorder },
  danger: { color: colors.madder600 },
  factsRow: { flexDirection: 'row', gap: spacing.sm },
  fact: { flex: 1, minWidth: 0, gap: 2, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, backgroundColor: colors.gray50 },
  factLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, textTransform: 'uppercase' },
  factValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  reviewCard: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.pine200, borderRadius: 14, backgroundColor: colors.pine50 },
  reviewBody: { gap: spacing.xs },
  offerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.canvas },
  offerTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  offerCopy: { ...typography.bodySm, color: colors.textSecondary },
  receiptText: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  drawerFixedHeader: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  drawerScrollContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 60 },
  settingsDrawerSheet: { backgroundColor: colors.shellAlt },
  settingsDrawerScrollContent: { gap: spacing.xl, paddingHorizontal: spacing.md, paddingBottom: spacing['3xl'] },
  settingsSummary: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  drawerCopy: { ...typography.bodySm, color: colors.textSecondary },
  forecastFacts: { flexDirection: 'row', gap: spacing.sm },
  toggleDescription: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  modeList: { gap: spacing.sm },
  modeRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.card },
  modeRowActive: { borderColor: colors.pine300, backgroundColor: colors.pine50 },
  modeCopy: { flex: 1, minWidth: 0, gap: 2 },
  modeTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  modeDetail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  forecastInputs: { gap: spacing.md },
  rebalanceSummary: { gap: spacing.xs },
  rebalanceHeadline: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  rebalanceAction: { alignSelf: 'flex-start', color: colors.pine700, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, fontWeight: '600', paddingVertical: spacing.xs },
  rebalanceChanges: { gap: spacing.xs, paddingTop: spacing.xs },
  errorText: { color: colors.destructive, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});

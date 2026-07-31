import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { colors, fonts, spacing, typography } from '../../../theme';
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
import { KwiltSwitch } from '../../../ui/KwiltSwitch';
import { AppShell } from '../../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
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
import { projectMoneyCategoryPeriodView } from '../domain/moneyPeriodView';
import { projectMoneyRebalanceAnswer, type MoneyRebalanceAnswer } from '../domain/moneyRebalanceAnswer';
import type { MoneyForecastMode } from '../domain/moneyForecast';
import type { MoneyStackParamList } from '../navigation/types';
import { projectCategoryFunding, type CategoryFundingRhythm } from '../domain/categoryFunding';
import type { LivingPlanOverridePreview } from '../runtime/livingPlanReconciliation';
import { captureMoneyMutation } from '../runtime/moneyMutationTelemetry';
import { buildMoneyRebalanceChangesOpenedProps, buildMoneyRebalanceOutcomeProps, buildMoneyRebalancePreviewViewedProps } from '../runtime/moneyPlanLimitAnalytics';
import { signalMoneyMutationOutcome, signalMoneyToggle } from '../runtime/moneyMutationFeedback';

const ACTIVITY_INLINE_LIMIT = 5;
const CATEGORY_HERO_HEIGHT = 168;
const CATEGORY_HEADER_PILL_SIZE = 44;
const CATEGORY_HEADER_BAR_HEIGHT = OBJECT_PAGE_HEADER_BAR_HEIGHT + 8;

export function MoneyCategoryDetailScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyCategoryDetail'>) {
  const { capture } = useAnalytics();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const scrollY = useRef(new Animated.Value(0)).current;
  const {
    pendingAppControlReviewCategoryId,
    previewCategoryPlanAmount,
    refresh,
    renameCategory,
    reviewMoneyAppControl,
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
  const [expectedNeedDraft, setExpectedNeedDraft] = useState('');
  const [expectedNeedDueMonthDraft, setExpectedNeedDueMonthDraft] = useState('');
  const [planImpact, setPlanImpact] = useState<LivingPlanOverridePreview | null>(null);
  const [showPlanChanges, setShowPlanChanges] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [reviewReceipt, setReviewReceipt] = useState<'opened_for_now' | 'left_blocked' | null>(null);
  const [chartScrubbing, setChartScrubbing] = useState(false);
  const [coverDrawerOpen, setCoverDrawerOpen] = useState(false);
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
  const heroFadeEnd = Math.max(1, CATEGORY_HERO_HEIGHT - headerTotalHeight);
  const heroFadeStart = Math.max(0, heroFadeEnd - 40);
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, heroFadeStart, heroFadeEnd],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });
  const heroParallaxTranslateY = Animated.multiply(scrollY, 0.35);
  const statusBarStyle = useScrollLinkedStatusBarStyle(scrollY, heroFadeEnd, {
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
    setExpectedNeedDraft(formatCentsInput(category.expectedNeed?.amountCents));
    setExpectedNeedDueMonthDraft(category.expectedNeed?.dueMonth ?? '');
    setPlanImpact(null);
    setShowPlanChanges(false);
    setForecastModeDraft(category.forecastSettings?.mode ?? category.forecast.mode);
    setManualForecastDraft(formatCentsInput(category.forecastSettings?.manualProjectedSpendCents));
    setScheduledAmountDraft(formatCentsInput(category.forecastSettings?.scheduledAmountCents));
    setScheduledDueDayDraft(category.forecastSettings?.scheduledDueDay?.toString() ?? '');
    setCategoryError(null);
  }, [category?.expectedNeed, category?.forecast.mode, category?.forecastSettings, category?.fundingRhythm, category?.name, category?.plannedCents, category?.sourceId]);

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

  const recordReview = async (outcome: 'opened_for_now' | 'left_blocked') => {
    if (!category) return;
    try {
      await reviewMoneyAppControl(category.sourceId, outcome);
      setReviewReceipt(outcome);
    } catch (error) {
      setMutationError(error);
    }
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
        <DetailMenuItem icon="image" label="Edit cover" onPress={() => setCoverDrawerOpen(true)} />
        <DetailMenuItem icon="edit" label="Category settings" onPress={() => setSettingsOpen(true)} />
        {category.fundingRhythm === 'monthly' ? <DetailMenuItem icon="gauge" label="Forecast settings" onPress={() => setForecastSettingsOpen(true)} /> : null}
        <DetailMenuItem icon="shield" label="App controls" onPress={() => navigation.navigate('MoneyAppControl', { categoryId: category.id })} />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <AppShell fullBleedCanvas>
        <StatusBar style={statusBarStyle} animated />
        <View style={styles.screen}>
          <ObjectPageHeader
            barHeight={CATEGORY_HEADER_BAR_HEIGHT}
            horizontalPadding={spacing.xl}
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
          <Animated.ScrollView
            contentInsetAdjustmentBehavior="never"
            scrollEnabled={!chartScrubbing}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
          >
            <View style={styles.heroClip}>
              <Animated.View
                style={[
                  styles.heroArtwork,
                  { opacity: heroOpacity, transform: [{ translateY: heroParallaxTranslateY }] },
                ]}
              >
                <MoneyCategoryCover cover={category.coverImage} />
              </Animated.View>
            </View>
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
            </View>

            {pendingAppControlReviewCategoryId === category.sourceId ? (
              <View style={styles.reviewCard}>
                <View style={styles.offerIcon}><Icon name="shield" size={20} color={colors.pine700} /></View>
                <View style={styles.reviewBody}>
                  <Text style={styles.offerTitle}>Review {category.name} before opening selected apps</Text>
                  <Text style={styles.offerCopy}>Choose whether this pause still helps before access changes.</Text>
                </View>
                <Button fullWidth onPress={() => void recordReview('opened_for_now')}>Open for 20 min</Button>
                <Button fullWidth variant="outline" onPress={() => void recordReview('left_blocked')}>Keep blocked</Button>
              </View>
            ) : reviewReceipt ? (
              <Text style={styles.receiptText}>{reviewReceipt === 'opened_for_now' ? 'Selected apps are open for 20 min.' : 'Selected apps remain blocked.'}</Text>
            ) : null}

            <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Activity</Text>
                <Text style={styles.sectionCount}>{view.transactions.length} {view.transactions.length === 1 ? 'transaction' : 'transactions'}</Text>
              </View>
              {groups.length > 0 ? groups.map((group) => (
                <View key={group.dateIso} style={styles.activityGroup}>
                  <Text style={styles.dateLabel}>{group.label}</Text>
                  {group.transactions.map((transaction) => (
                    <CategoryTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onPress={() => navigation.navigate('MoneyTransactionDetail', { transactionId: transaction.id })}
                    />
                  ))}
                </View>
              )) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No {view.periodLabel} {category.name} activity yet</Text>
                  <Text style={styles.emptyCopy}>Transactions assigned to this category will appear here.</Text>
                </View>
              )}
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
                <Text style={styles.viewAllText}>View all in Transactions</Text>
                <Icon name="chevronRight" size={18} color={colors.pine700} />
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
          </Animated.ScrollView>
        </View>
      </AppShell>

      <BottomDrawer visible={forecastInfoOpen} onClose={() => setForecastInfoOpen(false)} snapPoints={['42%']}>
        <View style={styles.drawerContent}>
          <BottomDrawerHeader
            closeAccessibilityLabel="Close forecast details"
            onClose={() => setForecastInfoOpen(false)}
            title="How this forecast works"
            titleVariant="lg"
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

      <BottomDrawer visible={settingsOpen} onClose={() => setSettingsOpen(false)} snapPoints={['82%']} enableContentPanningGesture>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerScrollContent} keyboardShouldPersistTaps="handled">
          <BottomDrawerHeader
            closeAccessibilityLabel="Close category settings"
            onClose={() => setSettingsOpen(false)}
            title="Category settings"
            titleVariant="lg"
            variant="withClose"
          />
          <Input editable={!savingCategory} label="Name" onChangeText={(value) => { setCategoryNameDraft(value); setPlanImpact(null); setShowPlanChanges(false); }} value={categoryNameDraft} />
          <Input editable={!savingCategory} keyboardType="decimal-pad" label={fundingRhythmDraft === 'reserve' ? 'Monthly contribution' : 'Monthly amount'} onBlur={() => void previewMonthlyAmount()} onChangeText={(value) => { setCategoryAmountDraft(value); setPlanImpact(null); }} value={categoryAmountDraft} />
          <View style={styles.modeList}>
            <ForecastModeRow active={fundingRhythmDraft === 'monthly'} detail="Use this amount for the month. Optional rollover stays separate." label="Monthly" onPress={() => { signalMoneyToggle(false); setFundingRhythmDraft('monthly'); setPlanImpact(null); }} />
            <ForecastModeRow active={fundingRhythmDraft === 'reserve'} detail="Build available money across months for lumpy needs." label="Reserve" onPress={() => { signalMoneyToggle(true); setFundingRhythmDraft('reserve'); setForecastSettingsOpen(false); setPlanImpact(null); }} />
          </View>
          {fundingRhythmDraft === 'reserve' ? (
            <View style={styles.forecastInputs}>
              <Input editable={!savingCategory} keyboardType="decimal-pad" label="Expected amount (optional)" onChangeText={(value) => { setExpectedNeedDraft(value); setPlanImpact(null); }} value={expectedNeedDraft} />
              <Input autoCapitalize="none" editable={!savingCategory} label="Due month (YYYY-MM)" onChangeText={(value) => { setExpectedNeedDueMonthDraft(value); setPlanImpact(null); }} value={expectedNeedDueMonthDraft} />
              <Text style={styles.drawerCopy}>{reserveCoverageCopy(category, categoryAmountDraft, expectedNeedDraft, expectedNeedDueMonthDraft)}</Text>
            </View>
          ) : (
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Carry unused money forward</Text>
              <Text style={styles.toggleDescription}>Unused or overspent amounts carry into the next month.</Text>
            </View>
            <KwiltSwitch
              accessibilityLabel="Carry unused money forward"
              disabled={savingCategory}
              value={category.rolloverEnabled}
              onPress={() => void toggleRollover()}
            />
          </View>
          )}
          {planImpact?.outcome === 'ready' && rebalanceAnswer ? (
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
          ) : null}
          {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}
          <Button
            disabled={savingCategory}
            fullWidth
            onPress={() => void saveCategorySettings()}
          >
            {savingCategory ? 'Saving…' : 'Save changes'}
          </Button>
          <Button fullWidth variant="outline" onPress={() => { setSettingsOpen(false); navigation.navigate('MoneyAppControl', { categoryId: category.id }); }}>
            App controls
          </Button>
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer visible={forecastSettingsOpen} onClose={() => setForecastSettingsOpen(false)} snapPoints={['82%']} enableContentPanningGesture>
        <BottomDrawerScrollView contentContainerStyle={styles.drawerScrollContent} keyboardShouldPersistTaps="handled">
          <BottomDrawerHeader
            closeAccessibilityLabel="Close forecast settings"
            onClose={() => setForecastSettingsOpen(false)}
            title="Forecast settings"
            titleVariant="lg"
            variant="withClose"
          />
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

function CategoryTransactionRow({ onPress, transaction }: { onPress: () => void; transaction: MoneyTransaction }) {
  const amount = transaction.direction === 'inflow' ? transaction.amountCents : -transaction.amountCents;
  const amountLabel = `${amount > 0 ? '+' : ''}${formatMoney(amount, transaction.currencyCode)}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${transaction.merchantName} transaction, ${transaction.accountName}, ${amountLabel}`} onPress={onPress} style={({ pressed }) => [styles.transactionRow, pressed ? styles.pressed : null]}>
      <View style={styles.transactionCopy}>
        <Text numberOfLines={1} style={styles.transactionMerchant}>{transaction.merchantName}</Text>
        <Text numberOfLines={1} style={styles.transactionMeta}>{transaction.pending ? 'Pending' : transaction.reviewState === 'needs_review' ? 'Needs review' : transaction.accountName}</Text>
      </View>
      <Text style={[styles.transactionAmount, transaction.direction === 'inflow' ? styles.inflow : null]}>{amountLabel}</Text>
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

function DetailMenuItem({ icon, label, onPress }: { icon: 'edit' | 'gauge' | 'image' | 'shield'; label: string; onPress: () => void }) {
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
    periodId: new Date().toISOString().slice(0, 7),
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
  content: { paddingBottom: 80, paddingHorizontal: spacing.xl, gap: spacing.xl },
  heroClip: { height: CATEGORY_HERO_HEIGHT, marginHorizontal: -spacing.xl, overflow: 'hidden' },
  heroArtwork: { ...StyleSheet.absoluteFillObject },
  summarySection: { gap: spacing.md },
  categoryTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  activitySection: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  sectionCount: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  activityGroup: { gap: spacing.xs },
  dateLabel: { paddingTop: spacing.xs, color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  transactionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingVertical: spacing.sm },
  pressed: { opacity: 0.72 },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionMerchant: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  transactionMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  transactionAmount: { minWidth: 72, color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  inflow: { color: colors.pine700 },
  emptyState: { gap: spacing.xs, paddingVertical: spacing.lg },
  emptyTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  emptyCopy: { ...typography.bodySm, color: colors.textSecondary },
  viewAllRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAllText: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontWeight: '600' },
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
  drawerScrollContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 60 },
  drawerCopy: { ...typography.bodySm, color: colors.textSecondary },
  forecastFacts: { flexDirection: 'row', gap: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.cardBorder },
  toggleCopy: { flex: 1, gap: 2 },
  toggleTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
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

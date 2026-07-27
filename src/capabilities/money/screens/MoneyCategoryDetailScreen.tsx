import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
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
import { PageHeader } from '../../../ui/layout/PageHeader';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import { MoneyDetailMeter } from '../components/MoneyDetailMeter';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney, formatMoneyFreshness, type MoneyCategory, type MoneyTransaction } from '../data/moneySnapshot';
import { parseCategoryName, parseMonthlyAmount } from '../domain/categoryPlanDraft';
import { groupMoneyTransactionsByDate } from '../domain/moneyDetailView';
import { projectMoneyCategoryPeriodView } from '../domain/moneyPeriodView';
import type { MoneyForecastMode } from '../domain/moneyForecast';
import type { MoneyStackParamList } from '../navigation/types';
import { projectCategoryFunding, type CategoryFundingRhythm } from '../domain/categoryFunding';
import type { LivingPlanOverridePreview } from '../runtime/livingPlanReconciliation';
import { captureMoneyMutation } from '../runtime/moneyMutationTelemetry';
import { signalMoneyMutationOutcome, signalMoneyToggle } from '../runtime/moneyMutationFeedback';

const ACTIVITY_INLINE_LIMIT = 5;

export function MoneyCategoryDetailScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyCategoryDetail'>) {
  const { capture } = useAnalytics();
  const insets = useSafeAreaInsets();
  const {
    pendingAppControlReviewCategoryId,
    previewCategoryPlanAmount,
    refresh,
    renameCategory,
    reviewMoneyAppControl,
    savingCategory,
    snapshot,
    status,
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
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [reviewReceipt, setReviewReceipt] = useState<'opened_for_now' | 'left_blocked' | null>(null);
  const view = useMemo(() => snapshot
    ? projectMoneyCategoryPeriodView(snapshot, route.params.categoryId, monthOffset)
    : null, [monthOffset, route.params.categoryId, snapshot]);
  const category = view?.category;
  const groups = useMemo(() => groupMoneyTransactionsByDate(
    (view?.transactions ?? []).slice(0, ACTIVITY_INLINE_LIMIT),
  ), [view?.transactions]);

  useEffect(() => {
    if (!category) return;
    setCategoryNameDraft(category.name);
    setCategoryAmountDraft((category.plannedCents / 100).toFixed(2));
    setFundingRhythmDraft(category.fundingRhythm);
    setExpectedNeedDraft(formatCentsInput(category.expectedNeed?.amountCents));
    setExpectedNeedDueMonthDraft(category.expectedNeed?.dueMonth ?? '');
    setPlanImpact(null);
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
        });
      }
      if (name !== category.name) await renameCategory(category.sourceId, name);
      setSettingsOpen(false);
      captureMoneyMutation(capture, { operation: 'category_settings', outcome: 'succeeded', durationMs: Date.now() - startedAtMs });
      signalMoneyMutationOutcome('succeeded');
    } catch (error) {
      setMutationError(error);
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
      <DropdownMenuTrigger asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={`${category.name} actions`} style={styles.headerButton}>
          <Icon name="more" size={21} color={colors.textPrimary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
        <DetailMenuItem icon="edit" label="Category settings" onPress={() => setSettingsOpen(true)} />
        {category.fundingRhythm === 'monthly' ? <DetailMenuItem icon="gauge" label="Forecast settings" onPress={() => setForecastSettingsOpen(true)} /> : null}
        <DetailMenuItem icon="shield" label="App controls" onPress={() => navigation.navigate('MoneyAppControl', { categoryId: category.id })} />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <AppShell fullBleedCanvas>
        <View style={styles.screen}>
          <View style={[styles.headerSurface, { paddingTop: insets.top }]}> 
            <PageHeader title={category.name} onPressBack={() => navigation.goBack()} moreMenu={moreMenu} />
          </View>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <CategoryCover categoryName={category.name} />
            <MoneyDetailMeter
              category={category}
              monthOffset={monthOffset}
              onForecastInfo={() => setForecastInfoOpen(true)}
              onNextMonth={() => setMonthOffset((value) => Math.min(12, value + 1))}
              onPreviousMonth={() => setMonthOffset((value) => Math.max(-24, value - 1))}
              onResetMonth={() => setMonthOffset(0)}
              periodElapsedPercent={view.periodElapsedPercent}
              periodEndIso={view.periodEndIso}
              periodLabel={view.periodLabel}
              periodStartIso={view.periodStartIso}
              transactions={view.transactions}
            />

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
          </ScrollView>
        </View>
      </AppShell>

      <BottomDrawer visible={forecastInfoOpen} onClose={() => setForecastInfoOpen(false)} snapPoints={['42%']}>
        <View style={styles.drawerContent}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerEyebrow}>FORECAST</Text>
              <Text style={styles.drawerTitle}>How this estimate works</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close forecast details" onPress={() => setForecastInfoOpen(false)} style={styles.closeButton}>
              <Icon name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
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
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerEyebrow}>CATEGORY</Text>
              <Text style={styles.drawerTitle}>Category settings</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close category settings" onPress={() => setSettingsOpen(false)} style={styles.closeButton}>
              <Icon name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Input editable={!savingCategory} label="Name" onChangeText={setCategoryNameDraft} value={categoryNameDraft} />
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
          {planImpact?.outcome === 'ready' ? (
            <View style={styles.impactBox}>
              <Text style={styles.toggleTitle}>{planImpact.changes.length === 1 ? '1 other category changes' : planImpact.changes.length > 1 ? `${planImpact.changes.length} other categories change` : 'No other category changes'}</Text>
              <Text style={styles.toggleDescription}>{planImpact.after.overTargetCents > 0
                ? `${formatMoney(planImpact.after.overTargetCents)} over the living target. Protected amounts stay in place.`
                : `The full living target stays allocated. Spending already recorded does not change.`}</Text>
            </View>
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
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerEyebrow}>FORECAST</Text>
              <Text style={styles.drawerTitle}>Forecast settings</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close forecast settings" onPress={() => setForecastSettingsOpen(false)} style={styles.closeButton}>
              <Icon name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
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
    </>
  );
}

function CategoryCover({ categoryName }: { categoryName: string }) {
  const uri = getCategoryCover(categoryName);
  return (
    <View style={styles.cover}>
      {uri ? <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : (
        <LinearGradient colors={[colors.pine50, colors.pine200, colors.pine700]} style={StyleSheet.absoluteFillObject} />
      )}
      <View style={styles.coverScrim} />
    </View>
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

function DetailMenuItem({ icon, label, onPress }: { icon: 'edit' | 'gauge' | 'shield'; label: string; onPress: () => void }) {
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

function getCategoryCover(name: string): string | null {
  const key = name.toLowerCase();
  if (key.includes('grocer')) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=82';
  if (key.includes('restaurant') || key.includes('dining')) return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82';
  if (key.includes('gas') || key.includes('auto')) return 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=82';
  if (key.includes('shop')) return 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=82';
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  headerSurface: { paddingHorizontal: spacing.sm, backgroundColor: colors.canvas, zIndex: 2 },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  content: { paddingBottom: 80, paddingHorizontal: spacing.xl, gap: spacing.xl },
  cover: { height: 124, marginHorizontal: -spacing.xl, overflow: 'hidden', backgroundColor: colors.pine100 },
  coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,40,32,0.08)' },
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
  drawerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  drawerEyebrow: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7 },
  drawerTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  drawerCopy: { ...typography.bodySm, color: colors.textSecondary },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.gray100 },
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
  impactBox: { gap: spacing.xs, padding: spacing.md, borderRadius: 12, backgroundColor: colors.pine50 },
  errorText: { color: colors.destructive, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});

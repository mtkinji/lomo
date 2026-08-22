import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  FlatList,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { HapticsService } from '../../../services/HapticsService';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { colors, fonts, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Button } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { menuItemTextProps, menuStyles } from '../../../ui/menuStyles';
import {
  formatMoney,
  formatMoneyFreshness,
  type MoneyTransaction,
  type MonthlyHouseholdPlanStatement,
} from '../data/moneySnapshot';
import { useMoneyData } from '../data/MoneyDataContext';
import { projectMoneyPeriodView, type MoneyPeriodView } from '../domain/moneyPeriodView';
import type { MoneyStackParamList } from '../navigation/types';
import {
  MoneyCategoryListRow,
  MoneyCategoryMeterTile,
  type MoneyCategoryPresentation,
  resolveCategoryPresentation,
} from '../components/MoneyCategoryMeterTile';
import { MoneyPlanLimitAnswer } from '../components/MoneyPlanLimitAnswer';
import type { MoneyPlanLimitAnswer as LivingLimitAnswer } from '../domain/moneyPlanLimitAnswer';
import { MoneyScreenFrame } from './MoneyScreenFrame';
import { buildMoneyBudgetAnswerViewedProps, buildMoneyBudgetExplanationOpenedProps } from '../runtime/moneyPlanLimitAnalytics';
import { refreshStaleMoneySummary } from '../runtime/moneySummaryAutoRefresh';
import { projectMoneyPlanAudit, type MoneyPlanAudit } from '../domain/moneyPlanAudit';
import { projectMonthlyBudgetSummary, type MonthlyBudgetSummary } from '../domain/monthlyBudgetSummary';
import { MoneyCategoryReorderDrawer } from '../components/MoneyCategoryReorderDrawer';
import { Coachmark } from '../../../ui/Coachmark';
import { getMoneyCategoryDestination } from '../domain/moneyAppControlOnboarding';
import { EmptyState } from '../../../ui/EmptyState';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Heading, HStack, VStack } from '../../../ui/primitives';
import { CelebrationGif } from '../../../ui/CelebrationGif';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';
import {
  getMoneyOnboardingHandoffGuide,
  type MoneyOnboardingHandoffReceipt,
  type MoneyOnboardingHandoffState,
} from '../domain/moneyOnboardingHandoff';
import {
  acknowledgeMoneyOnboardingBudgetGuide,
  acknowledgeMoneyOnboardingFollowThroughGuide,
  loadMoneyOnboardingState,
} from '../runtime/moneyOnboardingStorage';
import { buildMoneyOnboardingDemoBudget } from '../domain/moneyOnboardingDemoBudget';
import { MoneyFreshnessStamp } from '../components/MoneyFreshnessStamp';
import { formatBudgetOverviewMoney } from '../presentation/budgetOverviewMoney';
import { ActionDock, useActionDockClearance } from '../../../ui/ActionDock';
import { InventoryControlGroup } from '../../../ui/InventoryControlGroup';

const MONTH_RADIUS = 12;
const INITIAL_MONTH_INDEX = MONTH_RADIUS;
export function MoneySummaryScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  const { snapshot: liveSnapshot, refresh, reconcileConnectedActivity, reorderCategories, savingCategoryOrder, userId } = useMoneyData();
  const { capture } = useAnalytics();
  const { width: windowWidth } = useWindowDimensions();
  const actionDockClearance = useActionDockClearance();
  const [measuredPagerWidth, setMeasuredPagerWidth] = useState(0);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(INITIAL_MONTH_INDEX);
  const [limitExplanationOpen, setLimitExplanationOpen] = useState(false);
  const [monthlySummaryOpen, setMonthlySummaryOpen] = useState(false);
  const [unclearReviewOpen, setUnclearReviewOpen] = useState(false);
  const [categoryPresentation, setCategoryPresentation] = useState<MoneyCategoryPresentation>('list');
  const [categoryReorderOpen, setCategoryReorderOpen] = useState(false);
  const [appControlGuideVisible, setAppControlGuideVisible] = useState(
    route.params?.entryIntent === 'app-control-onboarding',
  );
  const freshHandoff = route.params?.onboardingHandoff ?? null;
  const [onboardingHandoff, setOnboardingHandoff] = useState<MoneyOnboardingHandoffState | null>(() => (
    freshHandoff ? handoffStateFromReceipt(freshHandoff) : null
  ));
  const [onboardingGuide, setOnboardingGuide] = useState<'budgets' | 'follow_through' | null>(
    freshHandoff ? 'budgets' : null,
  );
  const snapshot = useMemo(() => (
    __DEV__ && route.params?.devBudgetState === 'onboarding-sample'
      ? buildMoneyOnboardingDemoBudget()
      : liveSnapshot
  ), [liveSnapshot, route.params?.devBudgetState]);
  const autoRefreshKeyRef = useRef<string | null>(null);
  const categoryGuideTargetRef = useRef<View | null>(null);
  const pagerRef = useRef<FlatList<MoneyPeriodView>>(null);
  const onboardingHandoffRef = useRef(onboardingHandoff);
  const freshCompletionVisitRef = useRef(Boolean(freshHandoff));
  const exploredBudgetThisVisitRef = useRef(false);
  const budgetGuideAcknowledgedRef = useRef(Boolean(onboardingHandoff?.budgetGuideAcknowledgedAt));
  const leftSummaryAfterBudgetGuideRef = useRef(false);
  const pagerWidth = measuredPagerWidth > 24
    ? measuredPagerWidth
    : Math.max(1, windowWidth - spacing.sm * 4);
  const periods = useMemo(() => {
    if (!snapshot) return [];
    return Array.from({ length: MONTH_RADIUS * 2 + 1 }, (_, index) => (
      projectMoneyPeriodView(snapshot, index - MONTH_RADIUS)
    ));
  }, [snapshot]);
  const currentPeriod = periods[currentMonthIndex] ?? periods[INITIAL_MONTH_INDEX];
  const selectableBudgetCount = snapshot?.categories.filter((category) => category.planRole !== 'protected').length ?? 0;
  const rehearsingNoBudgets = __DEV__ && route.params?.devBudgetState === 'none';
  const refreshBudget = useCallback(async () => {
    if (!liveSnapshot?.accounts.length) {
      await refresh();
      return;
    }
    await reconcileConnectedActivity({ trigger: 'manual_sync', sync: true });
  }, [liveSnapshot?.accounts.length, reconcileConnectedActivity, refresh]);

  onboardingHandoffRef.current = onboardingHandoff;
  budgetGuideAcknowledgedRef.current = Boolean(onboardingHandoff?.budgetGuideAcknowledgedAt);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadMoneyOnboardingState(userId).then((state) => {
      if (!active || !state.handoff) return;
      const next = state.handoff;
      onboardingHandoffRef.current = next;
      budgetGuideAcknowledgedRef.current = Boolean(next.budgetGuideAcknowledgedAt);
      setOnboardingHandoff(next);
      setOnboardingGuide(getMoneyOnboardingHandoffGuide({
        exploredBudgetThisVisit: exploredBudgetThisVisitRef.current,
        handoff: next,
        isFreshCompletion: freshCompletionVisitRef.current,
      }));
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    const removeBlur = navigation.addListener?.('blur', () => {
      if (budgetGuideAcknowledgedRef.current) leftSummaryAfterBudgetGuideRef.current = true;
    });
    const removeFocus = navigation.addListener?.('focus', () => {
      if (leftSummaryAfterBudgetGuideRef.current) freshCompletionVisitRef.current = false;
      const next = onboardingHandoffRef.current;
      setOnboardingGuide(getMoneyOnboardingHandoffGuide({
        exploredBudgetThisVisit: exploredBudgetThisVisitRef.current,
        handoff: next,
        isFreshCompletion: freshCompletionVisitRef.current,
      }));
    });
    return () => {
      removeBlur?.();
      removeFocus?.();
    };
  }, [navigation]);

  const scrollToMonth = useCallback((nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= periods.length) return;
    pagerRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentMonthIndex(nextIndex);
    void HapticsService.trigger('canvas.selection');
  }, [periods.length]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagerWidth <= 0) return;
    const nextIndex = Math.max(0, Math.min(periods.length - 1, Math.round(event.nativeEvent.contentOffset.x / pagerWidth)));
    if (nextIndex !== currentMonthIndex) {
      setCurrentMonthIndex(nextIndex);
      void HapticsService.trigger('canvas.selection');
    }
  }, [currentMonthIndex, pagerWidth, periods.length]);

  const openBudgetSettings = useCallback(() => {
    rootNavigationRef.navigate('Settings', { screen: 'SettingsBudget' });
  }, []);

  const summaryMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Budget options" style={styles.headerMoreButton}>
          <Icon name="more" size={22} color={colors.textPrimary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={6}>
        <SummaryMenuItem icon="plus" label="Add category" onPress={() => navigation.navigate('MoneyCategoryCreate')} />
        <SummaryMenuItem icon="receipt" label="Transactions" onPress={() => navigation.navigate('MoneyTransactions', {})} />
        <SummaryMenuItem
          icon="settings"
          label="Settings"
          onPress={openBudgetSettings}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const livingLimitAnswer = snapshot?.livingLimitAnswer ?? null;
  const isPristineMoney = Boolean(
    snapshot
      && snapshot.accounts.length === 0
      && snapshot.transactions.length === 0
      && !livingLimitAnswer,
  );
  const planAuditPeriodId = livingLimitAnswer?.facts.periodId ?? snapshot?.monthlyPlan?.periodId ?? null;
  const planAudit = useMemo(() => (
    snapshot && planAuditPeriodId
      ? projectMoneyPlanAudit({
          periodId: planAuditPeriodId,
          categories: snapshot.categories,
          transactions: snapshot.transactions,
        })
      : null
  ), [planAuditPeriodId, snapshot]);
  const monthlyBudgetSummary = useMemo(() => (
    planAudit && snapshot?.monthlyPlan
      ? projectMonthlyBudgetSummary({ audit: planAudit, monthlyPlan: snapshot.monthlyPlan, answer: livingLimitAnswer })
      : null
  ), [livingLimitAnswer, planAudit, snapshot?.monthlyPlan]);
  const unclearTransactions = useMemo(() => {
    if (!snapshot || !planAudit) return [];
    const unclearIds = new Set(planAudit.unclearTransactionIds);
    return snapshot.transactions.filter((transaction) => unclearIds.has(transaction.id));
  }, [planAudit, snapshot]);

  useEffect(() => {
    if (!livingLimitAnswer || currentMonthIndex !== INITIAL_MONTH_INDEX) return;
    capture(AnalyticsEvent.MoneyBudgetAnswerViewed, buildMoneyBudgetAnswerViewedProps({ answer: livingLimitAnswer, periodRelation: 'current' }));
  }, [capture, currentMonthIndex, livingLimitAnswer]);

  useEffect(() => {
    if (route.params?.entryIntent === 'app-control-onboarding') {
      setAppControlGuideVisible(true);
    }
  }, [route.params?.entryIntent]);

  useEffect(() => {
    if (route.params?.entryIntent !== 'app-control-onboarding' || !snapshot) return;
    if (!rehearsingNoBudgets && selectableBudgetCount > 0) return;
    setAppControlGuideVisible(false);
    navigation.setParams({ entryIntent: undefined, devBudgetState: undefined });
    navigation.navigate('MoneyCategoryCreate');
  }, [navigation, rehearsingNoBudgets, route.params?.entryIntent, selectableBudgetCount, snapshot]);

  useEffect(() => {
    if (!snapshot || livingLimitAnswer?.state !== 'stale') return;
    const refreshKey = `${livingLimitAnswer.facts.planVersionId}:${snapshot.lastSyncedAt ?? 'never'}`;
    if (autoRefreshKeyRef.current === refreshKey) return;
    autoRefreshKeyRef.current = refreshKey;
    void refreshStaleMoneySummary({
      reconcileConnectedActivity: async () => {
        await reconcileConnectedActivity({ trigger: 'stale_summary', sync: true });
      },
    }).catch(() => {
      // Keep the last useful answer visible. Account-specific repair belongs in Accounts.
    });
  }, [livingLimitAnswer, reconcileConnectedActivity, snapshot]);

  return (
    <>
    <MoneyScreenFrame
      headerRightElement={liveSnapshot?.lastSyncedAt
        ? <MoneyFreshnessStamp lastSyncedAt={liveSnapshot.lastSyncedAt} />
        : undefined}
      moreMenu={summaryMenu}
      onRefresh={refreshBudget}
      title="Budget"
    >
      {isPristineMoney ? (
        <EmptyState
          illustration={null}
          title="Build your budget from real life"
          instructions="Connect the accounts that matter and Kwilt will shape a useful monthly view from your income and spending."
          primaryAction={{
            label: 'Connect accounts',
            onPress: () => navigation.navigate('MoneyEntry', {
              requestedPlace: 'MoneySummary',
              source: 'empty-state',
              mode: 'setup',
            }),
          }}
        />
      ) : snapshot && currentPeriod ? (
        <View
          style={[styles.monthSwipeSurface, { paddingBottom: actionDockClearance }]}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width);
            if (width > 24) setMeasuredPagerWidth(width);
          }}
        >
          <View style={styles.monthHeader}>
            <View style={styles.monthPicker}>
              <InventoryControlGroup testID="money-month-switcher">
                <MonthArrow
                  direction="left"
                  disabled={currentMonthIndex === 0}
                  label={`Show previous month from ${currentPeriod.periodLabel}`}
                  onPress={() => scrollToMonth(currentMonthIndex - 1)}
                />
                <MonthArrow
                  direction="right"
                  disabled={currentMonthIndex === periods.length - 1}
                  label={`Show next month from ${currentPeriod.periodLabel}`}
                  onPress={() => scrollToMonth(currentMonthIndex + 1)}
                />
              </InventoryControlGroup>
              <Text numberOfLines={1} style={styles.monthTitle}>{currentPeriod.periodLabel}</Text>
            </View>
            <View style={styles.monthActions}>
              <CategoryViewMenu
                onPresentationChange={setCategoryPresentation}
                onReorder={() => setCategoryReorderOpen(true)}
                presentation={categoryPresentation}
              />
            </View>
          </View>

          <FlatList
            testID="money-month-pager"
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={periods}
            keyExtractor={(period) => `money-month-${period.monthOffset}`}
            initialScrollIndex={INITIAL_MONTH_INDEX}
            getItemLayout={(_, index) => ({ index, length: pagerWidth, offset: pagerWidth * index })}
            onMomentumScrollEnd={handleMomentumEnd}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => pagerRef.current?.scrollToIndex({ index, animated: false }));
            }}
            renderItem={({ item }) => (
              <SummaryMonthPanel
                pageWidth={pagerWidth}
                period={item}
                freshness={formatMoneyFreshness(snapshot.lastSyncedAt)}
                answer={item.monthOffset === 0 ? livingLimitAnswer : null}
                audit={item.monthOffset === 0 ? planAudit : null}
                monthlyPlan={item.monthOffset === 0 ? snapshot.monthlyPlan ?? null : null}
                onExplain={() => {
                  if (livingLimitAnswer) capture(AnalyticsEvent.MoneyBudgetExplanationOpened, buildMoneyBudgetExplanationOpenedProps({ answer: livingLimitAnswer, surface: 'budget' }));
                  setLimitExplanationOpen(true);
                }}
                onOpenMonthlySummary={() => setMonthlySummaryOpen(true)}
                onReviewIncome={openBudgetSettings}
                onReviewOverages={() => navigation.navigate('MoneyTransactions', {
                  inventoryTitle: 'Review overages',
                  overageReview: true,
                  flexibleRoomCents: livingLimitAnswer?.facts.flexibleRoomCents ?? 0,
                })}
                onReviewUnclear={() => setUnclearReviewOpen(true)}
                onOpenCategory={(categoryId) => {
                  exploredBudgetThisVisitRef.current = true;
                  const destination = getMoneyCategoryDestination({
                    categoryId,
                    monthOffset: item.monthOffset,
                    entryIntent: route.params?.entryIntent,
                  });
                  if (destination.screen === 'MoneyAppControl') {
                    navigation.navigate('MoneyAppControl', destination.params);
                  } else {
                    navigation.navigate('MoneyCategoryDetail', destination.params);
                  }
                }}
                categoryTargetRef={item.monthOffset === 0 ? categoryGuideTargetRef : undefined}
                categoryPresentation={categoryPresentation}
              />
            )}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            style={styles.monthPager}
          />
        </View>
      ) : null}
    </MoneyScreenFrame>
    {!isPristineMoney && snapshot && currentPeriod ? (
      <ActionDock
        rightItem={{
          id: 'add-category',
          icon: 'plus',
          accessibilityLabel: 'Add category',
          testID: 'money-add-category-fab',
          onPress: () => navigation.navigate('MoneyCategoryCreate'),
        }}
      />
    ) : null}
    <BottomDrawer
      visible={Boolean(livingLimitAnswer) && limitExplanationOpen}
      onClose={() => setLimitExplanationOpen(false)}
      snapPoints={['78%']}
      dynamicSizing={false}
      enableContentPanningGesture
    >
      {livingLimitAnswer && planAudit ? (
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            title="Flexible spending"
            variant="withClose"
            closeAccessibilityLabel="Close flexible spending calculation"
            onClose={() => setLimitExplanationOpen(false)}
          />
          <LimitFacts
            answer={livingLimitAnswer}
            audit={planAudit}
            freshness={formatMoneyFreshness(snapshot?.lastSyncedAt ?? null)}
            onChangeTarget={() => {
              setLimitExplanationOpen(false);
              openBudgetSettings();
            }}
            onOpenUnclear={() => {
              setLimitExplanationOpen(false);
              setUnclearReviewOpen(true);
            }}
            onOpenTransactions={(title, transactionIds) => {
              if (transactionIds.length === 0) return;
              setLimitExplanationOpen(false);
              navigation.navigate('MoneyTransactions', {
                inventoryTitle: title,
                reviewTransactionIds: transactionIds,
              });
            }}
          />
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
    <BottomDrawer
      visible={monthlySummaryOpen && Boolean(monthlyBudgetSummary && planAudit && snapshot?.monthlyPlan)}
      onClose={() => setMonthlySummaryOpen(false)}
      snapPoints={['72%']}
      dynamicSizing={false}
      enableContentPanningGesture
    >
      {monthlyBudgetSummary && planAudit && snapshot?.monthlyPlan ? (
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            title={`${moneyMonthName(snapshot.monthlyPlan.periodId)} summary`}
            variant="withClose"
            closeAccessibilityLabel="Close monthly budget summary"
            onClose={() => setMonthlySummaryOpen(false)}
          />
          <MonthlySummaryFacts
            answer={livingLimitAnswer}
            audit={planAudit}
            summary={monthlyBudgetSummary}
            onReviewPlan={() => {
              setMonthlySummaryOpen(false);
              openBudgetSettings();
            }}
          />
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
    <BottomDrawer
      visible={unclearReviewOpen && unclearTransactions.length > 0}
      onClose={() => setUnclearReviewOpen(false)}
      snapPoints={['84%']}
      dynamicSizing={false}
      enableContentPanningGesture
    >
      {planAudit && unclearTransactions.length > 0 ? (
        <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
          <BottomDrawerHeader
            title="Unclear spending"
            variant="withClose"
            closeAccessibilityLabel="Close unclear spending review"
            onClose={() => setUnclearReviewOpen(false)}
          />
          <UnclearSpendingReview
            audit={planAudit}
            transactions={unclearTransactions}
            onReviewTransaction={(transactionId) => {
              setUnclearReviewOpen(false);
              navigation.navigate('MoneyTransactionDetail', {
                transactionId,
                economicRoleReview: true,
              });
            }}
          />
        </BottomDrawerScrollView>
      ) : null}
    </BottomDrawer>
    <MoneyCategoryReorderDrawer
      categories={snapshot?.categories ?? []}
      onClose={() => setCategoryReorderOpen(false)}
      onSave={reorderCategories}
      saving={savingCategoryOrder}
      visible={categoryReorderOpen}
    />
    <MoneyOnboardingHandoffGuide
      guide={appControlGuideVisible ? null : onboardingGuide}
      handoff={onboardingHandoff}
      onAcknowledgeBudgets={() => {
        if (!onboardingHandoff) return;
        const acknowledgedAt = new Date().toISOString();
        const next = { ...onboardingHandoff, budgetGuideAcknowledgedAt: acknowledgedAt };
        onboardingHandoffRef.current = next;
        budgetGuideAcknowledgedRef.current = true;
        setOnboardingHandoff(next);
        setOnboardingGuide(null);
        navigation.setParams({ onboardingHandoff: undefined });
        if (userId) void acknowledgeMoneyOnboardingBudgetGuide(userId, acknowledgedAt);
      }}
      onAcknowledgeFollowThrough={(openGoal) => {
        if (!onboardingHandoff) return;
        const acknowledgedAt = new Date().toISOString();
        const next = { ...onboardingHandoff, followThroughGuideAcknowledgedAt: acknowledgedAt };
        onboardingHandoffRef.current = next;
        setOnboardingHandoff(next);
        setOnboardingGuide(null);
        if (userId) void acknowledgeMoneyOnboardingFollowThroughGuide(userId, acknowledgedAt);
        if (openGoal && onboardingHandoff.goalId) {
          rootNavigationRef.navigate('MainTabs', {
            screen: 'GoalsTab',
            params: {
              screen: 'GoalDetail',
              params: { goalId: onboardingHandoff.goalId, entryPoint: 'goalsTab' },
            },
          });
        }
      }}
    />
    {route.params?.entryIntent === 'app-control-onboarding' ? <Coachmark
      actions={[
        { id: 'dismiss', label: 'Got it', variant: 'accent' },
        { id: 'not-now', label: 'Not now', variant: 'ghost' },
      ]}
      body={<Text style={styles.guideBody}>Pick the kind of spending you want to use as a boundary. You’ll choose the apps and when to pause them next.</Text>}
      onAction={() => {
        setAppControlGuideVisible(false);
        navigation.setParams({ entryIntent: undefined });
      }}
      onDismiss={() => {
        setAppControlGuideVisible(false);
        navigation.setParams({ entryIntent: undefined });
      }}
      placement="above"
      targetRef={categoryGuideTargetRef}
      title={<Text style={styles.guideTitle}>Choose a budget</Text>}
      visible={appControlGuideVisible && !rehearsingNoBudgets && selectableBudgetCount > 0}
    /> : null}
    </>
  );
}

export function MoneyOnboardingHandoffGuide({
  guide,
  handoff,
  onAcknowledgeBudgets,
  onAcknowledgeFollowThrough,
}: {
  guide: 'budgets' | 'follow_through' | null;
  handoff: MoneyOnboardingHandoffState | null;
  onAcknowledgeBudgets: () => void;
  onAcknowledgeFollowThrough: (openGoal: boolean) => void;
}) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  if (!handoff) return null;
  return (
    <BottomGuide
      bottomAccessory={guide === 'budgets' ? (
        <Button fullWidth onPress={onAcknowledgeBudgets} size="md" variant="primary">
          Explore budgets
        </Button>
      ) : undefined}
      dynamicSizing
      onClose={guide === 'budgets'
        ? onAcknowledgeBudgets
        : () => onAcknowledgeFollowThrough(false)}
      scrim="light"
      snapPoints={guide === 'budgets' ? ['52%'] : ['40%']}
      visible={Boolean(guide)}
    >
      {guide === 'budgets' ? (
        <VStack space={spacing.lg} style={styles.onboardingWelcomeContent}>
          <Heading variant="sm">Your budgets are ready 🎉</Heading>
          {reduceMotionEnabled ? (
            <View style={styles.onboardingWelcomeMedia}>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={require('../../../../assets/illustrations/capability-onboarding/money-ready-transparent.png')}
                style={styles.onboardingWelcomeIllustration}
              />
            </View>
          ) : (
            <CelebrationGif
              fallbackSource={require('../../../../assets/illustrations/capability-onboarding/money-ready-transparent.png')}
              frameStyle={styles.onboardingWelcomeGifFrame}
              kind="firstBudget"
              maxHeight={128}
              resizeMode="cover"
              showControls={false}
              size="sm"
              stylePreference="minimal"
            />
          )}
          <Text style={styles.onboardingGuideBody}>
            We built a {formatMoney(handoff.selectedPlanCents)} monthly plan from the accounts you connected. You can change any budget.
          </Text>
        </VStack>
      ) : guide === 'follow_through' && handoff.goalId ? (
        <VStack space={spacing.lg} style={styles.onboardingWelcomeContent}>
          <VStack space={spacing.sm}>
            <Heading variant="sm">Your Spend Less goal is ready</Heading>
            <Text style={styles.onboardingGuideBody}>
              {handoff.savingsCents > 0
                ? `Save about ${formatMoney(handoff.savingsCents)} a month with ${handoff.todoCount} practical first steps. Nothing has been scheduled.`
                : `${handoff.todoCount} practical first steps are ready. Nothing has been scheduled.`}
            </Text>
          </VStack>
          <VStack space={spacing.xs}>
            <Button fullWidth onPress={() => onAcknowledgeFollowThrough(true)} size="md" variant="primary">Review goal</Button>
            <Button fullWidth onPress={() => onAcknowledgeFollowThrough(false)} size="sm" variant="ghost">Later</Button>
          </VStack>
        </VStack>
      ) : null}
    </BottomGuide>
  );
}

function handoffStateFromReceipt(receipt: MoneyOnboardingHandoffReceipt): MoneyOnboardingHandoffState {
  return {
    ...receipt,
    budgetGuideAcknowledgedAt: null,
    followThroughGuideAcknowledgedAt: null,
  };
}

function SummaryMonthPanel({
  answer,
  audit,
  categoryPresentation,
  categoryTargetRef,
  freshness,
  monthlyPlan,
  onExplain,
  onOpenMonthlySummary,
  onOpenCategory,
  onReviewIncome,
  onReviewOverages,
  onReviewUnclear,
  pageWidth,
  period,
}: {
  answer: LivingLimitAnswer | null;
  audit: MoneyPlanAudit | null;
  monthlyPlan: MonthlyHouseholdPlanStatement | null;
  categoryPresentation: MoneyCategoryPresentation;
  categoryTargetRef?: RefObject<View | null>;
  freshness: string;
  onExplain: () => void;
  onOpenMonthlySummary: () => void;
  onOpenCategory: (categoryId: string) => void;
  onReviewIncome: () => void;
  onReviewOverages: () => void;
  onReviewUnclear: () => void;
  pageWidth: number;
  period: MoneyPeriodView;
}) {
  const cardWidth = Math.max(1, Math.floor((pageWidth - spacing.sm) / 2));
  const categoryView = resolveCategoryPresentation(categoryPresentation);
  const flexibleCategories = period.categories.filter((category) => category.planRole !== 'protected');
  const committedCategories = period.categories.filter((category) => category.planRole === 'protected');
  const monthlySummary = audit && monthlyPlan
    ? projectMonthlyBudgetSummary({ audit, monthlyPlan, answer })
    : null;
  return (
    <View style={[styles.monthBody, { width: pageWidth }]}>
      <View style={styles.categorySection}>
        {!answer || answer.state === 'missing_income_basis' ? <View style={styles.categoryHeader}>
          <CategoryConceptHeader
            label="Flexible spending"
            accessibilityLabel="About flexible spending"
            explanation="Everyday categories that use the flexible spending amount shown here."
          />
        </View> : null}
        {answer ? (
          <MoneyPlanLimitAnswer
            answer={answer}
            freshness={freshness}
            onExplain={onExplain}
            onReviewIncome={onReviewIncome}
            onReviewOverages={onReviewOverages}
          />
        ) : null}
        <View
          testID="money-flexible-category-collection"
          style={[
            categoryView.layout === 'meters' ? styles.categoryGrid : styles.categoryList,
            answer ? styles.flexibleCategoryCollection : null,
          ]}
        >
          {flexibleCategories.map((category, index) => (
            categoryView.layout === 'meters' ? (
              <MoneyCategoryMeterTile
                key={category.id}
                category={category}
                periodElapsedPercent={period.periodElapsedPercent}
                onPress={() => onOpenCategory(category.id)}
                style={{ width: cardWidth, flexBasis: cardWidth, flexGrow: 0, maxWidth: cardWidth }}
                targetRef={index === 0 ? categoryTargetRef : undefined}
              />
            ) : (
              <MoneyCategoryListRow
                key={category.id}
                category={category}
                onPress={() => onOpenCategory(category.id)}
                periodElapsedPercent={period.periodElapsedPercent}
                targetRef={index === 0 ? categoryTargetRef : undefined}
              />
            )
          ))}
        </View>
      </View>
      {committedCategories.length > 0 ? (
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <CategoryConceptHeader
              label="Committed spending"
              accessibilityLabel="About committed spending"
              explanation="Bills and money already set aside before your flexible spending is calculated."
            />
          </View>
          <View style={categoryView.layout === 'meters' ? styles.categoryGrid : styles.categoryList}>
            {committedCategories.map((category) => (
              categoryView.layout === 'meters' ? (
                <MoneyCategoryMeterTile
                  key={category.id}
                  category={category}
                  periodElapsedPercent={period.periodElapsedPercent}
                  onPress={() => onOpenCategory(category.id)}
                  style={{ width: cardWidth, flexBasis: cardWidth, flexGrow: 0, maxWidth: cardWidth }}
                />
              ) : (
                <MoneyCategoryListRow
                  key={category.id}
                  category={category}
                  onPress={() => onOpenCategory(category.id)}
                  periodElapsedPercent={period.periodElapsedPercent}
                />
              )
            ))}
          </View>
        </View>
      ) : null}
      {audit && audit.unclearTransactionIds.length > 0 ? (
        <UnclearSpendingProjection audit={audit} onPress={onReviewUnclear} />
      ) : null}
      {monthlySummary ? (
        <Pressable
          accessibilityLabel={monthlySummaryAccessibilityLabel(period.periodLabel, monthlySummary)}
          accessibilityRole="button"
          onPress={onOpenMonthlySummary}
          testID="money-month-summary"
          style={({ pressed }) => [styles.monthlyPlanSummary, pressed ? styles.monthlyPlanSummaryPressed : null]}
        >
          <View style={styles.monthlyPlanSummaryHeader}>
            <Text style={styles.monthlyPlanSummaryTitle}>{moneyPeriodMonthName(period.periodLabel)} summary</Text>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </View>
          <Text style={styles.monthlyPlanSummarySectionLabel}>ACTUAL</Text>
          <View style={styles.monthlyPlanSummaryRow}>
            <Text style={styles.monthlyPlanSummaryLabel}>Income received</Text>
            <Text style={styles.monthlyPlanSummaryValue}>{formatBudgetOverviewMoney(monthlySummary.incomeReceivedCents)}</Text>
          </View>
          <View style={styles.monthlyPlanSummaryRow}>
            <Text style={styles.monthlyPlanSummaryLabel}>Total spent</Text>
            <Text style={styles.monthlyPlanSummaryValue}>{formatBudgetOverviewMoney(monthlySummary.totalSpendingCents)}</Text>
          </View>
          {monthlySummary.spendingOutsideCurrentPlanCents > 0 ? (
            <Text style={styles.monthlyPlanSummarySupport}>
              {formatBudgetOverviewMoney(monthlySummary.spendingOutsideCurrentPlanCents)} of spending did not count toward this month’s plan.
            </Text>
          ) : null}
          <Text style={[styles.monthlyPlanSummarySectionLabel, styles.monthlyPlanSummaryPlanLabel]}>PLAN</Text>
          <View style={styles.monthlyPlanSummaryRow}>
            <Text style={styles.monthlyPlanSummaryTotalLabel}>Monthly plan</Text>
            <Text style={styles.monthlyPlanSummaryTotalValue}>{formatBudgetOverviewMoney(monthlySummary.monthlyPlanCents)}</Text>
          </View>
          <MonthPlanResultRow summary={monthlySummary} />
        </Pressable>
      ) : null}
      {!answer ? <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatBudgetOverviewMoney(period.totals.spentCents)} / {formatBudgetOverviewMoney(period.totals.plannedCents)} ({period.totals.percentUsed}%)
          </Text>
        </View>
        <Text style={styles.remainingLabel}>{formatBudgetOverviewMoney(period.totals.remainingCents)} left across planned categories</Text>
      </View> : null}
      <Text style={styles.updatedLabel}>{period.monthOffset === 0 ? `Connected accounts · ${freshness}` : 'Saved transaction history'}</Text>
    </View>
  );
}

function MonthlySummaryFacts({
  answer,
  audit,
  onReviewPlan,
  summary,
}: {
  answer: LivingLimitAnswer | null;
  audit: MoneyPlanAudit;
  onReviewPlan: () => void;
  summary: MonthlyBudgetSummary;
}) {
  const effectiveProtectedCents = answer?.facts.protectedPlanCents == null
    ? null
    : answer.facts.protectedPlanCents + answer.facts.protectedOverageCents;
  return (
    <View style={styles.drawerFacts}>
      <StatementSection label="ACTUAL">
        <StatementRow label="Income received" value={formatMoney(summary.incomeReceivedCents)} />
        <StatementRow label="Total spent" value={formatMoney(summary.totalSpendingCents)} emphasized />
        {audit.savedResourceSpendingCents > 0 ? (
          <StatementRow label="Paid from saved money" value={formatMoney(audit.savedResourceSpendingCents)} />
        ) : null}
        {audit.outsidePlanSpendingCents > 0 ? (
          <StatementRow label="Outside this month’s plan" value={formatMoney(audit.outsidePlanSpendingCents)} />
        ) : null}
      </StatementSection>

      <StatementSection label="PLAN">
        <StatementRow label="Monthly plan" value={formatMoney(summary.monthlyPlanCents)} />
        {answer ? (
          <>
            <StatementRow
              label="Bills and money set aside"
              value={effectiveProtectedCents == null ? 'Not available' : formatStatementOutflow(effectiveProtectedCents)}
            />
            <StatementRow
              label={audit.unclearSpendingCents > 0 ? 'Flexible and unclear spending' : 'Flexible spending from plan'}
              value={answer.facts.countedFlexibleSpendCents == null
                ? 'Not available'
                : formatStatementOutflow(answer.facts.countedFlexibleSpendCents)}
            />
          </>
        ) : null}
        <View style={styles.drawerRule} />
        <StatementRow
          label={monthPlanResultLabel(summary)}
          value={summary.planResult ? formatMoney(summary.planResult.amountCents) : 'Not available'}
          emphasized
          destructive={summary.planResult?.status === 'over'}
        />
      </StatementSection>

      {summary.spendingOutsideCurrentPlanCents > 0 ? (
        <Text style={styles.drawerEvidence}>
          {formatMoney(summary.spendingOutsideCurrentPlanCents)} of actual spending did not count toward this month’s plan.
        </Text>
      ) : null}
      <View style={styles.drawerActions}>
        <Button accessibilityLabel="Review monthly plan" fullWidth onPress={onReviewPlan} size="sm" variant="outline">
          Review monthly plan
        </Button>
      </View>
    </View>
  );
}

function MonthPlanResultRow({ summary }: { summary: MonthlyBudgetSummary }) {
  return (
    <View style={[styles.monthlyPlanSummaryRow, styles.monthlyPlanSummaryTotal]}>
      <Text style={styles.monthlyPlanSummaryTotalLabel}>{monthPlanResultLabel(summary)}</Text>
      <Text style={[
        styles.monthlyPlanSummaryTotalValue,
        summary.planResult?.status === 'over' ? styles.monthlyPlanSummaryResultOver : null,
      ]}>
        {summary.planResult ? formatBudgetOverviewMoney(summary.planResult.amountCents) : 'Not available'}
      </Text>
    </View>
  );
}

function monthPlanResultLabel(summary: MonthlyBudgetSummary): string {
  if (!summary.planResult) return 'Plan result';
  if (summary.planResult.status === 'over') return 'Over plan';
  if (summary.planResult.status === 'even') return 'On plan';
  return 'Left in plan';
}

function monthlySummaryAccessibilityLabel(periodLabel: string, summary: MonthlyBudgetSummary): string {
  const result = summary.planResult
    ? `${formatMoney(summary.planResult.amountCents)} ${summary.planResult.status === 'over' ? 'over plan' : summary.planResult.status === 'left' ? 'left in plan' : 'on plan'}`
    : 'plan comparison unavailable';
  return `Review ${moneyPeriodMonthName(periodLabel)} summary, ${formatMoney(summary.incomeReceivedCents)} income received, ${formatMoney(summary.totalSpendingCents)} spent, ${formatMoney(summary.monthlyPlanCents)} monthly plan, ${result}`;
}

function moneyPeriodMonthName(periodLabel: string): string {
  return periodLabel.trim().split(/\s+/)[0] || 'Monthly';
}

function UnclearSpendingProjection({ audit, onPress }: {
  audit: MoneyPlanAudit;
  onPress: () => void;
}) {
  const count = audit.unclearTransactionIds.length;
  const transactionLabel = count === 1 ? 'transaction' : 'transactions';
  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>Unclear spending</Text>
      </View>
      <Pressable
        accessibilityLabel={`Review unclear spending, ${formatMoney(audit.unclearSpendingCents)} across ${count} ${transactionLabel}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.unclearProjection, pressed ? styles.monthlyPlanSummaryPressed : null]}
      >
        <View style={styles.unclearProjectionCopy}>
          <Text style={styles.unclearProjectionAmount}>{formatMoney(audit.unclearSpendingCents)}</Text>
          <Text style={styles.unclearProjectionSupport}>
            {count} {transactionLabel} {count === 1 ? 'needs' : 'need'} a place
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function UnclearSpendingReview({ audit, onReviewTransaction, transactions }: {
  audit: MoneyPlanAudit;
  onReviewTransaction: (transactionId: string) => void;
  transactions: MoneyTransaction[];
}) {
  const count = transactions.length;
  return (
    <View style={styles.unclearReview}>
      <Text style={styles.unclearReviewSummary}>
        {count} {count === 1 ? 'transaction' : 'transactions'} · {formatMoney(audit.unclearSpendingCents)}
      </Text>
      <Text style={styles.unclearReviewIntroduction}>
        Kwilt could not place these confidently. Review only the ones you recognize; the rest can wait here.
      </Text>
      <View style={styles.unclearReviewRows}>
        {transactions.map((transaction) => (
          <Pressable
            key={transaction.id}
            accessibilityLabel={`Review ${transaction.merchantName}, ${formatMoney(transaction.amountCents)}`}
            accessibilityRole="button"
            onPress={() => onReviewTransaction(transaction.id)}
            style={({ pressed }) => [styles.unclearReviewRow, pressed ? styles.monthlyPlanSummaryPressed : null]}
          >
            <View style={styles.unclearReviewRowCopy}>
              <Text numberOfLines={1} style={styles.unclearReviewMerchant}>{transaction.merchantName}</Text>
              <Text style={styles.unclearReviewMeta}>{formatTransactionDate(transaction.date)} · Needs a place</Text>
            </View>
            <Text style={styles.unclearReviewAmount}>{formatMoney(transaction.amountCents)}</Text>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CategoryConceptHeader({ accessibilityLabel, explanation, label }: {
  accessibilityLabel: string;
  explanation: string;
  label: string;
}) {
  return (
    <View style={styles.categoryConceptHeader}>
      <Text style={styles.categoryTitle}>{label}</Text>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Pressable
            accessibilityHint={explanation}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            hitSlop={10}
            style={({ pressed }) => [styles.categoryInfoButton, pressed ? styles.iconButtonPressed : null]}
          >
            <Icon name="info" size={16} color={colors.textSecondary} />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4} style={styles.categoryConceptPopover}>
          <Text style={styles.categoryConceptPopoverTitle}>{label}</Text>
          <Text style={styles.categoryConceptPopoverCopy}>{explanation}</Text>
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}

function CategoryViewMenu({ onPresentationChange, onReorder, presentation }: {
  onPresentationChange: (value: MoneyCategoryPresentation) => void;
  onReorder: () => void;
  presentation: MoneyCategoryPresentation;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable
          accessibilityLabel="View category display"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.viewTrigger, pressed ? styles.iconButtonPressed : null]}
        >
          <Text style={styles.viewTriggerText}>View</Text>
          <Icon name="chevronDown" size={14} color={colors.textSecondary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
        <DropdownMenuRadioGroup value={presentation} onValueChange={(value) => value && onPresentationChange(value as MoneyCategoryPresentation)}>
          <CategoryViewChoice label="List" value="list" />
          <CategoryViewChoice label="Meters" value="meters" />
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem accessibilityLabel="Reorder categories" onPress={onReorder}>
          <View style={menuStyles.menuItemRow}>
            <Icon name="menu" size={18} color={colors.textPrimary} />
            <Text style={menuStyles.menuItemText} {...menuItemTextProps}>Reorder categories</Text>
          </View>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CategoryViewChoice({ label, value }: { label: string; value: string }) {
  return (
    <DropdownMenuRadioItem accessibilityLabel={label} value={value}>
      <Text style={menuStyles.menuItemText} {...menuItemTextProps}>{label}</Text>
    </DropdownMenuRadioItem>
  );
}

function LimitFacts({
  answer,
  audit,
  freshness,
  onChangeTarget,
  onOpenUnclear,
  onOpenTransactions,
}: {
  answer: LivingLimitAnswer;
  audit: MoneyPlanAudit;
  freshness: string;
  onChangeTarget: () => void;
  onOpenUnclear: () => void;
  onOpenTransactions: (title: string, transactionIds: string[]) => void;
}) {
  const { facts } = answer;
  const protectedOverageCents = facts.protectedOverageCents ?? 0;
  const effectiveProtectedCents = facts.protectedPlanCents == null
    ? null
    : facts.protectedPlanCents + protectedOverageCents;
  const roomCents = facts.flexibleRoomCents;
  const monthlyRoomCents = roomCents == null ? null : roomCents - protectedOverageCents;
  const monthName = moneyMonthName(facts.periodId);
  const monthlyResultValue = monthlyRoomCents == null
    ? 'Not available'
    : formatMoney(Math.abs(monthlyRoomCents));
  const committedSupport = facts.protectedPlanCents == null
    ? undefined
    : protectedOverageCents > 0
      ? `Budget ${formatMoney(facts.protectedPlanCents)} · ${formatMoney(protectedOverageCents)} over`
      : `Budget ${formatMoney(facts.protectedPlanCents)}`;
  const flexibleSupport = facts.flexibleCapacityCents == null
    ? undefined
    : roomCents == null
      ? `Budget ${formatMoney(facts.flexibleCapacityCents)}`
      : `Budget ${formatMoney(facts.flexibleCapacityCents)} · ${formatMoney(Math.abs(roomCents))} ${roomCents < 0 ? 'over' : 'left'}`;
  const calculationSpendingLabel = audit.unclearSpendingCents > 0
    ? 'Flexible and unclear spending'
    : 'Flexible spending this month';
  return (
    <View style={styles.drawerFacts}>
      <StatementSection label={`${monthName.toUpperCase()} SPENDING`}>
        <StatementRow
          label="Total spent"
          value={formatMoney(audit.totalSpendingCents)}
          emphasized
        />
        <StatementRow label="Committed" value={formatMoney(audit.committedSpendingCents)} />
        <StatementRow label="Flexible" value={formatMoney(audit.flexibleSpendingCents)} />
        {audit.unclearSpendingCents > 0 ? (
          <StatementRow label="Unclear" value={formatMoney(audit.unclearSpendingCents)} />
        ) : null}
        {audit.outsidePlanSpendingCents > 0 ? (
          <StatementRow label="Outside the plan" value={formatMoney(audit.outsidePlanSpendingCents)} />
        ) : null}
      </StatementSection>

      <StatementSection label="HOW YOUR FLEXIBLE ROOM WORKS">
        <StatementRow
          label="Monthly plan"
          value={facts.livingLimitCents == null ? 'Not available' : formatMoney(facts.livingLimitCents)}
        />
        <StatementRow
          label="Bills and money set aside"
          value={effectiveProtectedCents == null ? 'Not available' : formatStatementOutflow(effectiveProtectedCents)}
          support={committedSupport}
        />
        <StatementRow
          label={calculationSpendingLabel}
          value={facts.countedFlexibleSpendCents == null ? 'Not available' : formatStatementOutflow(facts.countedFlexibleSpendCents)}
          support={flexibleSupport}
        />
        {audit.savedResourceSpendingCents > 0 ? (
          <StatementRow label="Paid from saved money" value={formatMoney(audit.savedResourceSpendingCents)} />
        ) : null}
        <View style={styles.drawerRule} />
        <StatementRow
          label={monthlyRoomCents != null && monthlyRoomCents < 0 ? 'Over monthly plan' : 'Left in monthly plan'}
          value={monthlyResultValue}
          emphasized
          destructive={monthlyRoomCents != null && monthlyRoomCents < 0}
        />
      </StatementSection>

      {audit.nonSpendingCents > 0 ? (
        <Text style={styles.drawerEvidence}>
          {formatMoney(audit.nonSpendingCents)} in income, transfers, and other non-spending activity is outside this total.
        </Text>
      ) : null}
      <Text style={styles.drawerBasis}>
        {facts.resourceBasisCents == null ? 'Income basis unavailable' : `${basisLabel(facts.resourceBasisKind)}: ${formatMoney(facts.resourceBasisCents)}`} · {freshness}
      </Text>

      <View style={styles.drawerActions}>
        {audit.flexibleTransactionIds.length > 0 ? (
          <Button
            accessibilityLabel="Review flexible transactions"
            fullWidth
            onPress={() => onOpenTransactions('Flexible spending', audit.flexibleTransactionIds)}
            size="sm"
            variant="outline"
          >
            Review flexible transactions
          </Button>
        ) : null}
        {audit.unclearTransactionIds.length > 0 ? (
          <Button
            accessibilityLabel="Review unclear spending"
            fullWidth
            onPress={onOpenUnclear}
            size="sm"
            variant="outline"
          >
            Review unclear spending
          </Button>
        ) : null}
        <Button
          accessibilityLabel={`Change ${facts.livingPercent}% target`}
          fullWidth
          onPress={onChangeTarget}
          size="sm"
          variant="ghost"
        >
          {`Change ${facts.livingPercent}% target`}
        </Button>
      </View>
    </View>
  );
}

function StatementSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.statementSection}>
      <Text style={styles.statementLabel}>{label}</Text>
      <View style={styles.statementRows}>{children}</View>
    </View>
  );
}

function StatementRow({
  destructive = false,
  emphasized = false,
  label,
  support,
  value,
}: {
  destructive?: boolean;
  emphasized?: boolean;
  label: string;
  support?: string;
  value: string;
}) {
  return (
    <View style={styles.drawerStatementItem}>
      <View style={styles.drawerFactRow}>
        <Text style={[styles.drawerFactLabel, emphasized ? styles.drawerFactEmphasized : null, destructive ? styles.drawerFactDestructive : null]}>{label}</Text>
        <Text style={[styles.drawerFactValue, emphasized ? styles.drawerFactEmphasized : null, destructive ? styles.drawerFactDestructive : null]}>{value}</Text>
      </View>
      {support ? <Text style={styles.drawerSupportingFact}>{support}</Text> : null}
    </View>
  );
}

function basisLabel(kind: LivingLimitAnswer['facts']['resourceBasisKind']): string {
  if (kind === 'user_set') return 'You set this';
  if (kind === 'detected_income') return 'Detected income';
  if (kind === 'prior_supported_basis') return 'Last supported income';
  return 'Not confirmed';
}

function moneyMonthName(periodId: string): string {
  const [year, month] = periodId.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return 'Monthly';
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

function formatTransactionDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return date;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatStatementOutflow(cents: number): string {
  return cents > 0 ? `−${formatMoney(cents)}` : formatMoney(0);
}

function MonthArrow({ direction, disabled, label, onPress }: {
  direction: 'left' | 'right';
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthArrowButton,
        disabled ? styles.iconButtonDisabled : null,
        pressed ? styles.iconButtonPressed : null,
      ]}
    >
      <Icon name={direction === 'left' ? 'chevronLeft' : 'chevronRight'} size={15} color={disabled ? colors.textSecondary : colors.textPrimary} />
    </Pressable>
  );
}

function SummaryMenuItem({ icon, label, onPress }: {
  icon: 'plus' | 'receipt' | 'settings';
  label: string;
  onPress: () => void;
}) {
  return (
    <DropdownMenuItem onPress={onPress} accessibilityLabel={label} label={label} icon={icon} />
  );
}

const styles = StyleSheet.create({
  headerMoreButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthSwipeSurface: { gap: spacing.lg, overflow: 'hidden' },
  monthPager: { overflow: 'hidden' },
  monthHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  monthPicker: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  monthTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  monthArrowButton: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center' },
  iconButtonPressed: { backgroundColor: colors.fieldFillPressed },
  iconButtonDisabled: { opacity: 0.35 },
  monthBody: { minHeight: 520, gap: spacing.lg },
  monthlyPlanSummary: { gap: spacing.sm, borderRadius: 18, backgroundColor: colors.fieldFill, padding: spacing.md },
  monthlyPlanSummaryPressed: { backgroundColor: colors.fieldFillPressed },
  monthlyPlanSummaryHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  monthlyPlanSummaryTitle: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  monthlyPlanSummarySectionLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, fontWeight: '600', letterSpacing: 0.8 },
  monthlyPlanSummaryPlanLabel: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder, paddingTop: spacing.sm, marginTop: spacing.xs },
  monthlyPlanSummaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  monthlyPlanSummaryLabel: { flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  monthlyPlanSummaryValue: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, fontWeight: '500', fontVariant: ['tabular-nums'] },
  monthlyPlanSummaryTotal: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.sm },
  monthlyPlanSummaryTotalLabel: { flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  monthlyPlanSummaryTotalValue: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  monthlyPlanSummaryResultOver: { color: colors.destructive },
  monthlyPlanSummarySupport: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  categorySection: { gap: spacing.sm },
  categoryHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  categoryConceptHeader: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  categoryTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  categoryInfoButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  categoryConceptPopover: { width: 260, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs },
  categoryConceptPopoverTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  categoryConceptPopoverCopy: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  viewTrigger: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: spacing.xs },
  viewTriggerText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, columnGap: spacing.sm },
  flexibleCategoryCollection: { marginTop: spacing.sm },
  categoryList: {
    overflow: 'hidden',
    borderWidth: 0,
    borderRadius: radii.card,
    backgroundColor: colors.fieldFill,
    paddingBottom: spacing.sm,
  },
  unclearProjection: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.fieldFill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  unclearProjectionCopy: { minWidth: 0, flex: 1, gap: 2 },
  unclearProjectionAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, fontWeight: '600', fontVariant: ['tabular-nums'] },
  unclearProjectionSupport: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  totalSection: { gap: spacing.xs, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.cardBorder, paddingVertical: spacing.lg },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  totalLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  totalValue: { color: colors.textPrimary, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  remainingLabel: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  updatedLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  drawerFacts: { gap: spacing.lg },
  statementSection: { gap: spacing.xs },
  statementLabel: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.7 },
  statementRows: { gap: 0 },
  drawerStatementItem: { paddingVertical: spacing.xs },
  drawerFactRow: { minHeight: 32, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  drawerFactLabel: { flex: 1, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  drawerFactValue: { flexShrink: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, textAlign: 'right', fontVariant: ['tabular-nums'] },
  drawerFactEmphasized: { color: colors.textPrimary, fontFamily: fonts.bold, fontWeight: '700' },
  drawerFactDestructive: { color: colors.destructive },
  drawerRule: { height: 1, backgroundColor: colors.cardBorder, marginVertical: spacing.xs },
  drawerSupportingFact: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  drawerEvidence: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  drawerBasis: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  drawerActions: { gap: spacing.xs },
  unclearReview: { gap: spacing.md },
  unclearReviewSummary: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 27, fontWeight: '600', fontVariant: ['tabular-nums'] },
  unclearReviewIntroduction: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  unclearReviewRows: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.fieldFill },
  unclearReviewRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  unclearReviewRowCopy: { minWidth: 0, flex: 1, gap: 2 },
  unclearReviewMerchant: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  unclearReviewMeta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  unclearReviewAmount: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  onboardingGuideBody: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  onboardingWelcomeContent: { paddingTop: spacing.sm },
  onboardingWelcomeGifFrame: { borderRadius: radii.card, marginBottom: 0 },
  onboardingWelcomeMedia: {
    alignItems: 'center',
    backgroundColor: colors.shellAlt,
    borderRadius: radii.card,
    height: 128,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  onboardingWelcomeIllustration: { height: 124, width: '92%' },
  guideTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  guideBody: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});

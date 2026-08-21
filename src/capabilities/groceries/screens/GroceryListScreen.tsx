import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { FloatingControlSurface } from '../../../features/activities/FloatingControlSurface';
import { FloatingDockActionButton } from '../../../features/activities/FloatingDockActionButton';
import { QuickAddDock } from '../../../features/activities/QuickAddDock';
import { MealPlanHeaderAction } from '../../../features/household-food/components/MealPlanHeaderAction';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { useCapabilityMenuOpen } from '../../../navigation/CapabilityMenuStateContext';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing } from '../../../theme';
import { Button, IconButton } from '../../../ui/Button';
import { Coachmark } from '../../../ui/Coachmark';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { KwiltRefreshFrame, useKwiltRefresh } from '../../../ui/KwiltRefresh';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import { Text } from '../../../ui/Typography';
import { EmptyState } from '../../../ui/EmptyState';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';
import { RecipeIngredientChecklist } from '../../recipes/components/RecipeIngredientList';
import { buildRecipeLibraryInventory } from '../../recipes/data/starterRecipeCatalog';
import { formatKitchenQuantity } from '../../recipes/domain/recipeScaling';
import { useRecipeStore } from '../../recipes/runtime/useRecipeStore';
import {
  createMealPlanningRepository,
  type MealPlanProjection,
} from '../../meal-planning/data/mealPlanningRepository';
import { groceryCache } from '../data/groceryCache';
import { groceryEducation } from '../data/groceryEducation';
import { onlineShoppingPreferencesRepository } from '../data/onlineShoppingPreferencesRepository';
import { preferredGroceryStore } from '../data/preferredGroceryStore';
import {
  createGroceryRepository,
  type GroceryProjection,
} from '../data/groceryRepository';
import {
  applyQueuedGroceryStates,
  groceryOfflineQueue,
  reconcileGroceryOfflineQueue,
} from '../data/groceryOfflineQueue';
import { groceryFulfillmentSummary } from '../domain/groceryFulfillment';
import { isOnlineShoppingCountryEligible } from '../domain/groceryOnlineShoppingEligibility';
import {
  buildRecipeEquipmentSuggestions,
  collectRecipeEquipmentSources,
  formatEquipmentRecipeProvenance,
} from '../domain/recipeEquipmentSuggestions';
import { resolveOnlineShoppingLaunch } from '../domain/onlineShoppingLaunch';
import {
  buildApprovedAffiliateProductSearch,
  getAffiliateRetailerLinkDisclosure,
  getOnlineRetailerRuntimePolicies,
  openAffiliateProductSearch,
} from '../providers/affiliateRetailerProvider';
import {
  getAffiliateRetailerTestingEnabled,
  getAmazonBatchPreparationEnabled,
} from '../../../utils/getEnv';
import { useCapabilityOnboardingStore } from '../../../features/capability-onboarding/useCapabilityOnboardingStore';
import { foodFirstCycleStepFromCheckpoint } from '../../../features/household-food/onboarding/foodFirstCycleGuide';

type Props = NativeStackScreenProps<FoodStackParamList, 'GroceryList'>;

const aisleLabels: Record<string, string> = {
  produce: 'Produce',
  bakery: 'Bakery',
  dairy_eggs: 'Dairy & eggs',
  meat_seafood: 'Meat & seafood',
  pantry: 'Pantry',
  frozen: 'Frozen',
  beverages: 'Beverages',
  household: 'Household',
  other: 'Other',
};

const GROCERY_EMPTY_ILLUSTRATION = require('../../../../assets/illustrations/groceries-empty.png');

type MarkReviewed = (
  listId: string,
  expectedRevision: number,
) => Promise<unknown>;

export async function prepareGroceryListForFulfillment(
  list: GroceryProjection,
  markReviewed: MarkReviewed,
): Promise<void> {
  if (list.status === 'stale') {
    throw new Error('Update this grocery list from the current Plan before shopping.');
  }
  if (list.status === 'review_needed') {
    await markReviewed(list.id, list.revision);
  }
}

export function formatShopOnlineLabel(itemCount: number): string {
  return `Shop online · ${itemCount} item${itemCount === 1 ? '' : 's'}`;
}

function AnimatedShopOnlineLabel({ itemCount }: { itemCount: number }) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const [displayedCount, setDisplayedCount] = useState(itemCount);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (itemCount === displayedCount) return;

    progress.stopAnimation();
    setDisplayedCount(itemCount);
    if (reduceMotionEnabled) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      damping: 18,
      stiffness: 260,
      mass: 0.55,
      useNativeDriver: true,
    }).start();
  }, [displayedCount, itemCount, progress, reduceMotionEnabled]);

  return (
    <View accessible={false} pointerEvents="none" style={styles.shopLabelFrame}>
      <Text style={styles.shopLabel}>Shop online · </Text>
      <Animated.View
        style={[
          styles.animatedShopCount,
          {
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          },
        ]}
      >
        <Text style={styles.shopLabel}>{displayedCount}</Text>
      </Animated.View>
      <Text style={styles.shopLabel}>{` item${displayedCount === 1 ? '' : 's'}`}</Text>
    </View>
  );
}

export function resolveGroceryListEntry(
  lists: GroceryProjection[],
  planId: string,
  planVersion: number,
): { kind: 'show'; list: GroceryProjection } | { kind: 'compile' } {
  const current = lists.find(
    (item) =>
      item.status !== 'stale' &&
      item.sourceMealPlanId === planId &&
      item.sourceMealPlanVersion === planVersion,
  );
  if (current) return { kind: 'show', list: current };
  const stale = lists.find(
    (item) => item.status === 'stale' && item.sourceMealPlanId === planId,
  );
  return stale ? { kind: 'show', list: stale } : { kind: 'compile' };
}

function groceryItemDisplay(item: GroceryProjection['items'][number]): string {
  if (item.quantityMin === null) return item.concept;
  const amount = `${formatKitchenQuantity(item.quantityMin)}${
    item.quantityMax === null ? '' : `–${formatKitchenQuantity(item.quantityMax)}`
  }`;
  const unit = item.unit && item.unit !== 'count' ? ` ${item.unit}` : '';
  return `${amount}${unit} ${item.concept}`;
}

function GroceriesMenu({
  coveredCount,
  reviewingCovered,
  onToggleReview,
}: {
  coveredCount: number;
  reviewingCovered: boolean;
  onToggleReview(): void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger accessibilityLabel="Grocery list options">
        <View pointerEvents="none">
          <IconButton
            accessibilityRole="button"
            accessibilityLabel="Grocery list options"
            variant="ghost"
          >
            <Icon name="more" size={18} color={colors.textPrimary} />
          </IconButton>
        </View>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={6} align="start">
        <DropdownMenuItem
          icon="check"
          label={
            reviewingCovered
              ? 'Show full list'
              : `Review checked items${coveredCount ? ` (${coveredCount})` : ''}`
          }
          disabled={!coveredCount && !reviewingCovered}
          onPress={onToggleReview}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GroceryListScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const { capture } = useAnalytics();
  const { openMenu } = useCapabilityShell();
  const capabilityMenuOpen = useCapabilityMenuOpen();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const foodGuideCheckpoint = useCapabilityOnboardingStore((state) =>
    userId ? state.recordsByUserId[userId]?.checkpoint : null,
  );
  const dispatchCapabilityOnboarding = useCapabilityOnboardingStore((state) => state.dispatch);
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [sourcePlan, setSourcePlan] = useState<MealPlanProjection | null>(null);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [manualItem, setManualItem] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const manualItemInputRef = useRef<TextInput | null>(null);
  const firstGroceryItemRef = useRef<View | null>(null);
  const [reviewingCovered, setReviewingCovered] = useState(false);
  const [alreadyHaveEducationLoaded, setAlreadyHaveEducationLoaded] = useState(false);
  const [alreadyHaveEducationSeen, setAlreadyHaveEducationSeen] = useState(true);
  const [cartFlowStarted, setCartFlowStarted] = useState(true);
  const [sourcePlanMealCount, setSourcePlanMealCount] = useState(0);
  const [equipmentActionId, setEquipmentActionId] = useState<string | null>(null);
  const requestedListId = route.params?.listId;
  const onlineShoppingCountryEligible = isOnlineShoppingCountryEligible(
    getLocales()[0]?.regionCode,
  );

  const chooseList = useCallback(
    (lists: GroceryProjection[]) =>
      requestedListId
        ? (lists.find((item) => item.id === requestedListId) ?? null)
        : (lists.find((item) => item.status !== 'stale') ?? lists[0] ?? null),
    [requestedListId],
  );

  const load = useCallback(async () => {
    if (!userId) return;
    const [cached, pending] = await Promise.all([
      groceryCache.read(userId),
      groceryOfflineQueue.read(userId),
    ]);
    const cachedWithPending = applyQueuedGroceryStates(cached, pending);
    const cachedList = chooseList(cachedWithPending);
    if (cachedList) setList(cachedList);
    setPendingCount(pending.length);
    try {
      const repository = createGroceryRepository();
      const lists = await repository.list();
      const reconciled = await reconcileGroceryOfflineQueue({
        userId,
        lists,
        queue: groceryOfflineQueue,
        setItemState: repository.setItemState,
      });
      setList(chooseList(reconciled.lists));
      setPendingCount(reconciled.pendingCount);
      setOffline(reconciled.interrupted);
      await groceryCache.write(userId, reconciled.lists);
    } catch {
      setOffline(Boolean(cachedList));
    }
  }, [chooseList, userId]);
  const { onScroll, refreshControl, refreshOverlay, refreshing, scrollEventThrottle } = useKwiltRefresh({ onRefresh: load });

  useEffect(() => {
    let cancelled = false;
    setAlreadyHaveEducationLoaded(false);
    void Promise.all([
      groceryEducation.hasSeenAlreadyHave(userId),
      groceryEducation.hasStartedCartFlow(userId),
    ])
      .then(([seen, started]) => {
        if (!cancelled) {
          setAlreadyHaveEducationSeen(seen);
          setCartFlowStarted(started);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAlreadyHaveEducationSeen(true);
          setCartFlowStarted(true);
        }
      })
      .finally(() => {
        if (!cancelled) setAlreadyHaveEducationLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    void (async () => {
      if (route.params?.planId && route.params.planVersion) {
        setBusy(true);
        try {
          const repository = createGroceryRepository();
          const existing = await repository.list();
          const entry = resolveGroceryListEntry(
            existing,
            route.params.planId,
            route.params.planVersion,
          );
          if (entry.kind === 'show') {
            navigation.replace('GroceryList', { listId: entry.list.id });
            return;
          }
          const receipt = await repository.compile(
            route.params.planId,
            route.params.planVersion,
          );
          capture(AnalyticsEvent.GroceryListCompiled, {
            outcome: 'success',
            replayed: receipt.replayed,
          });
          navigation.replace('GroceryList', { listId: receipt.groceryListId });
          return;
        } catch (error) {
          Alert.alert(
            'Grocery list did not compile',
            error instanceof Error ? error.message : 'Please try again.',
          );
        } finally {
          setBusy(false);
        }
      }
      await load();
    })();
  }, [capture, load, navigation, route.params?.planId, route.params?.planVersion]);

  useEffect(() => {
    let cancelled = false;
    if (!list?.sourceMealPlanId) {
      setSourcePlan(null);
      setSourcePlanMealCount(0);
      return () => {
        cancelled = true;
      };
    }
    void createMealPlanningRepository()
      .list()
      .then((plans) => {
        if (cancelled) return;
        const sourcePlan = plans.find(
          (plan) =>
            plan.id === list.sourceMealPlanId &&
            (list.sourceMealPlanVersion === null || plan.version === list.sourceMealPlanVersion),
        );
        setSourcePlan(sourcePlan ?? null);
        if (list.sourceKind === 'household_plan') {
          const candidateIds = new Set(
            list.items.flatMap((item) =>
              (item.sources ?? []).flatMap((source) => source.planCandidateId ? [source.planCandidateId] : []),
            ),
          );
          setSourcePlanMealCount(candidateIds.size);
        } else {
          setSourcePlanMealCount(sourcePlan?.entries.length ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourcePlan(null);
          setSourcePlanMealCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [list?.items, list?.sourceKind, list?.sourceMealPlanId, list?.sourceMealPlanVersion]);

  const recipeInventory = useMemo(
    () => buildRecipeLibraryInventory(personalRecipes),
    [personalRecipes],
  );
  const contributingCandidateIds = useMemo(
    () => [...new Set((list?.items ?? []).flatMap((item) =>
      (item.sources ?? []).flatMap((source) => source.planCandidateId ? [source.planCandidateId] : []),
    ))],
    [list?.items],
  );
  const equipmentSources = useMemo(
    () => collectRecipeEquipmentSources({
      sourceKind: list?.sourceKind ?? '',
      sourceRecipeVersionId: list?.sourceRecipeVersionId ?? null,
      sourceTitle: list?.sourceTitle ?? null,
      contributingCandidateIds,
      plan: sourcePlan,
    }),
    [contributingCandidateIds, list?.sourceKind, list?.sourceRecipeVersionId, list?.sourceTitle, sourcePlan],
  );
  const equipmentSuggestions = useMemo(
    () => buildRecipeEquipmentSuggestions({
      sources: equipmentSources,
      recipes: recipeInventory.map((projection) => ({
        versionId: projection.currentVersion.id,
        instructions: projection.currentVersion.instructions.map((step) => step.text),
      })),
      existingItemConcepts: (list?.items ?? []).map((item) => item.concept),
      limit: 3,
    }),
    [equipmentSources, list?.items, recipeInventory],
  );
  const actionableEquipmentSuggestions = useMemo(
    () => equipmentSuggestions.filter((suggestion) => Boolean(
      buildApprovedAffiliateProductSearch('amazon', suggestion.searchQuery),
    )),
    [equipmentSuggestions],
  );
  const amazonEquipmentLinkDisclosure = getAffiliateRetailerLinkDisclosure('amazon');

  const fulfillment = groceryFulfillmentSummary(list?.items ?? []);
  const remainderCapturedRef = useRef(false);
  useEffect(() => {
    if (remainderCapturedRef.current || fulfillment.cartedCount === 0) return;
    remainderCapturedRef.current = true;
    capture(AnalyticsEvent.OnlineShoppingRemainderViewed, { acknowledged_count: fulfillment.cartedCount, count: fulfillment.remainingCount, outcome: fulfillment.remainingCount === 0 ? 'all_in_carts' : 'remainder_visible' });
  }, [capture, fulfillment.cartedCount, fulfillment.remainingCount]);
  const coveredIds = useMemo(
    () =>
      new Set(
        (list?.items ?? [])
          .filter((item) => item.state !== 'needed')
          .map((item) => item.id),
      ),
    [list],
  );
  const checklistItems = useMemo(() => {
    const grouped = new Map<string, GroceryProjection['items']>();
    for (const item of list?.items ?? []) {
      if (item.state === 'skipped') continue;
      if (reviewingCovered && item.state === 'needed') continue;
      grouped.set(item.aisle, [...(grouped.get(item.aisle) ?? []), item]);
    }
    return [...grouped.entries()].flatMap(([aisle, items]) =>
      items.map((item) => ({
        id: item.id,
        display: groceryItemDisplay(item),
        groupLabel: aisleLabels[aisle] ?? 'Other',
        supportingText: item.retailerCart
          ? `In ${item.retailerCart.retailerLabel} ${item.retailerCart.fulfillmentMode} cart`
          : null,
      })),
    );
  }, [list, reviewingCovered]);

  const toggle = async (itemId: string) => {
    if (!list || !userId || list.status === 'stale') return;
    const item = list.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const mutations = await groceryOfflineQueue.enqueue(userId, {
      listId: list.id,
      itemId,
      state: item.state === 'needed' ? 'already_have' : 'needed',
      queuedAt: `${new Date().toISOString()}#${Crypto.randomUUID()}`,
    });
    const cached = await groceryCache.read(userId);
    const optimistic = applyQueuedGroceryStates(cached.length ? cached : [list], mutations);
    await groceryCache.write(userId, optimistic);
    setList(chooseList(optimistic));
    setPendingCount(mutations.length);
    void load();
  };

  const refreshWithChanges = async () => {
    if (!list || offline) return;
    setBusy(true);
    try {
      const plan = (await createMealPlanningRepository().list()).find(
        (item) => item.id === list.sourceMealPlanId,
      );
      if (!plan || plan.state !== 'finalized') {
        throw new Error('Finalize the updated meal plan before rebuilding groceries.');
      }
      const receipt = await createGroceryRepository().compile(
        plan.id,
        plan.version,
        { fromListId: list.id, expectedRevision: list.revision },
      );
      navigation.replace('GroceryList', { listId: receipt.groceryListId });
    } catch (error) {
      Alert.alert(
        'List did not update',
        error instanceof Error ? error.message : 'Open Plan and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const openFulfillment = async () => {
    if (!list || busy || offline || pendingCount) return;
    setCartFlowStarted(true);
    void groceryEducation.markCartFlowStarted(userId).catch(() => undefined);
    setBusy(true);
    try {
      const repository = createGroceryRepository();
      await prepareGroceryListForFulfillment(list, repository.markReviewed);
      if (list.status === 'review_needed') {
        capture(AnalyticsEvent.GroceryListReviewed, { count: list.items.length });
      }
      const preferences = await onlineShoppingPreferencesRepository.read(userId);
      if (!preferences) {
        navigation.navigate('OnlineShoppingSetup', { listId: list.id });
        return;
      }
      const preferredStore = await preferredGroceryStore.read(userId);
      const launch = resolveOnlineShoppingLaunch({
        listId: list.id,
        preferences,
        policies: getOnlineRetailerRuntimePolicies(),
        preferredStore,
        amazonBatchPreparationEnabled:
          getAffiliateRetailerTestingEnabled() || getAmazonBatchPreparationEnabled(),
      });
      if (launch.screen === 'RetailerLinkShopping') {
        navigation.navigate(launch.screen, launch.params);
      } else {
        navigation.navigate(launch.screen, launch.params);
      }
    } catch (error) {
      Alert.alert(
        'Shopping is not ready',
        error instanceof Error ? error.message : 'Refresh the list and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const addManualItem = async () => {
    if (!list || !manualItem.trim() || busy || offline) return;
    setBusy(true);
    try {
      await createGroceryRepository().addItem(list.id, list.revision, manualItem.trim());
      setManualItem('');
      setShowAddDrawer(false);
      await load();
    } catch (error) {
      Alert.alert(
        'Item did not save',
        error instanceof Error ? error.message : 'Refresh and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const startManualList = async () => {
    if (busy || offline) return;
    if (list) {
      setShowAddDrawer(true);
      return;
    }
    setBusy(true);
    try {
      const receipt = await createGroceryRepository().createManualList();
      navigation.replace('GroceryList', { listId: receipt.groceryListId });
      setShowAddDrawer(true);
    } catch (error) {
      Alert.alert(
        'Grocery list did not start',
        error instanceof Error ? error.message : 'Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  const addEquipmentSuggestion = async (id: string, label: string) => {
    if (!list || equipmentActionId || busy || offline || list.status === 'stale') return;
    setEquipmentActionId(id);
    try {
      await createGroceryRepository().addItem(list.id, list.revision, label);
      await load();
    } catch (error) {
      Alert.alert(
        'Kitchen item did not save',
        error instanceof Error ? error.message : 'Refresh and try again.',
      );
    } finally {
      setEquipmentActionId(null);
    }
  };

  const openEquipmentOnAmazon = async (actionId: string, label: string, searchQuery: string) => {
    if (equipmentActionId || busy) return;
    setEquipmentActionId(actionId);
    try {
      const opened = await openAffiliateProductSearch('amazon', searchQuery);
      if (opened) return;
      throw new Error('amazon.product_link_unavailable');
    } catch {
      Alert.alert(
        "Amazon didn't open",
        offline
          ? 'Try again when you are back online.'
          : `You can add ${label} to your grocery list instead.`,
        [
          { text: 'Not now', style: 'cancel' },
          ...(!offline ? [{
            text: 'Add to list',
            onPress: () => {
              void addEquipmentSuggestion(actionId, label);
            },
          }] : []),
        ],
      );
    } finally {
      setEquipmentActionId(null);
    }
  };

  const shopLabel = list?.status === 'stale'
    ? 'Update from Plan'
    : list
      ? formatShopOnlineLabel(fulfillment.remainingCount)
      : 'Shop online';
  const shopDisabled =
    !list ||
    busy ||
    offline ||
    pendingCount > 0 ||
    (list.status !== 'stale' && fulfillment.disabled);
  const shopVisuallyDisabled =
    !list ||
    offline ||
    (list?.status !== 'stale' && fulfillment.disabled);
  const coachmarkTargetItemId =
    checklistItems.find((item) => !coveredIds.has(item.id))?.id ?? null;
  const hasRetailerCartHistory = Boolean(
    list?.items.some((item) => Boolean(item.retailerCart)),
  );
  const showAlreadyHaveCoachmark =
    isFocused &&
    onlineShoppingCountryEligible &&
    alreadyHaveEducationLoaded &&
    !alreadyHaveEducationSeen &&
    !cartFlowStarted &&
    !hasRetailerCartHistory &&
    !capabilityMenuOpen &&
    !showAddDrawer &&
    list?.status !== 'stale' &&
    coachmarkTargetItemId !== null;
  const showFirstCyclePayoff =
    isFocused &&
    !capabilityMenuOpen &&
    !showAddDrawer &&
    foodFirstCycleStepFromCheckpoint(foodGuideCheckpoint) === 'review-groceries' &&
    checklistItems.length > 0;
  const dismissAlreadyHaveCoachmark = () => {
    setAlreadyHaveEducationSeen(true);
    void groceryEducation.markAlreadyHaveSeen(userId).catch(() => undefined);
  };

  return (
    <AppShell>
      <PageHeader
        title="Groceries"
        titleMaxFontSizeMultiplier={1.6}
        onPressMenu={route.params?.entryPoint === 'capability-menu' ? openMenu : undefined}
        onPressBack={route.params?.entryPoint === 'capability-menu' ? undefined : () => navigation.goBack()}
        moreMenu={
          list ? (
            <GroceriesMenu
              coveredCount={coveredIds.size}
              reviewingCovered={reviewingCovered}
              onToggleReview={() => setReviewingCovered((current) => !current)}
            />
          ) : undefined
        }
        rightElement={
          <MealPlanHeaderAction
            count={sourcePlanMealCount}
            onPress={() => navigation.navigate('RecipeLibrary', { openPlan: true })}
          />
        }
      />
      <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing}>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          scrollEventThrottle={scrollEventThrottle}
        >
          {busy && !list ? <Text tone="secondary">Building your grocery list…</Text> : null}
          {!busy && !list ? (
            <EmptyState
              variant="screen"
              illustration={GROCERY_EMPTY_ILLUSTRATION}
              title="No grocery list yet"
              instructions="Start with an item now, or send meals from Plan and their ingredients will come together here."
              primaryAction={{
                label: 'Add first item',
                accessibilityLabel: 'Start a grocery list with an item',
                disabled: offline,
                onPress: () => { void startManualList(); },
              }}
              style={styles.empty}
            />
          ) : null}
          {list?.status === 'stale' ? (
            <Text tone="secondary">Plan changed. Update this list before shopping.</Text>
          ) : null}
          {list && checklistItems.length ? (
            <RecipeIngredientChecklist
              items={checklistItems}
              checked={coveredIds}
              firstItemTargetRef={firstGroceryItemRef}
              targetItemId={coachmarkTargetItemId}
              disabled={list.status === 'stale'}
              onToggle={(itemId) => {
                void toggle(itemId);
              }}
              onLongPress={(itemId) =>
                navigation.navigate('GroceryItemEdit', { listId: list.id, itemId })
              }
              accessibilityHint={(_, checked) =>
                `Double tap to mark as ${checked ? 'needed' : 'already covered'}. Long press to edit.`
              }
            />
          ) : list && reviewingCovered ? (
            <Text tone="secondary">No checked items yet.</Text>
          ) : list && list.status !== 'stale' ? (
            <EmptyState
              variant="screen"
              illustration={GROCERY_EMPTY_ILLUSTRATION}
              title="Nothing to pick up"
              instructions="Add an item when something comes to mind."
              style={styles.empty}
            />
          ) : null}
          {list && !reviewingCovered && list.status !== 'stale' && actionableEquipmentSuggestions.length ? (
            <View testID="recipe-equipment-suggestions" style={styles.equipmentSection}>
              <View style={styles.equipmentHeading}>
                <Text variant="label" tone="secondary">For these recipes</Text>
                <Text variant="bodySm" tone="secondary">
                  Kitchen tools to check before you cook.
                </Text>
              </View>
              {actionableEquipmentSuggestions.map((suggestion) => (
                <View
                  key={`${suggestion.id}:${suggestion.searchQuery}`}
                  style={styles.equipmentRow}
                >
                  <View style={styles.equipmentCopy}>
                    <Text>{suggestion.label}</Text>
                    <Text variant="bodySm" tone="secondary" numberOfLines={3}>
                      {`${formatEquipmentRecipeProvenance(suggestion.recipeTitles)} · ${amazonEquipmentLinkDisclosure}`}
                    </Text>
                  </View>
                  <Button
                    accessibilityLabel={`Search Amazon for ${suggestion.label}`}
                    disabled={Boolean(equipmentActionId)}
                    loading={equipmentActionId === `${suggestion.id}:${suggestion.searchQuery}`}
                    loadingLabel="Opening…"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      void openEquipmentOnAmazon(
                        `${suggestion.id}:${suggestion.searchQuery}`,
                        suggestion.label,
                        suggestion.searchQuery,
                      );
                    }}
                  >
                    Search Amazon
                  </Button>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KwiltRefreshFrame>

      {!showAddDrawer ? (
        <View
          testID="grocery-list-dock"
          pointerEvents="box-none"
          style={styles.dock}
        >
          {list?.status === 'stale' || onlineShoppingCountryEligible ? (
            <Pressable
              testID="grocery-shop-remaining"
              accessibilityRole="button"
              accessibilityLabel={shopLabel}
              accessibilityState={{ disabled: shopDisabled }}
              disabled={shopDisabled}
              onPress={() => {
                if (list?.status === 'stale') void refreshWithChanges();
                else void openFulfillment();
              }}
              style={({ pressed }) => [
                styles.shopButton,
                shopVisuallyDisabled && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <FloatingControlSurface
                testID="grocery-shop-surface"
                borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2}
                isProminent
                style={styles.shopSurface}
                surfaceStyle={[styles.shopSurfaceContent, styles.shopSurfaceBlack]}
              >
                {busy ? (
                  <Text style={styles.shopLabel}>Working…</Text>
                ) : list?.status === 'stale' ? (
                  <Text style={styles.shopLabel}>Update from Plan</Text>
                ) : list ? (
                  <AnimatedShopOnlineLabel itemCount={fulfillment.remainingCount} />
                ) : (
                  <Text style={styles.shopLabel}>Shop online</Text>
                )}
              </FloatingControlSurface>
            </Pressable>
          ) : null}
          <FloatingDockActionButton
            testID="grocery-add-item"
            accessibilityLabel="Add grocery item"
            accessibilityHint="Opens the grocery item composer"
            icon="plus"
            isProminent
            size={RESTING_COMPOSER_HEIGHT_PX}
            disabled={busy || offline}
            onPress={() => {
              void startManualList();
            }}
          />
        </View>
      ) : null}
      <QuickAddDock
        placement="bottomDock"
        placeholder="Add a grocery item"
        value={manualItem}
        onChangeText={setManualItem}
        inputRef={manualItemInputRef}
        isFocused={showAddDrawer}
        setIsFocused={setShowAddDrawer}
        onSubmit={() => {
          void addManualItem();
        }}
        onCollapse={() => {
          setManualItem('');
          setShowAddDrawer(false);
        }}
        dismissAfterSubmit={false}
        showCollapsedTrigger={false}
        showLeadingAffordance={false}
        showAiActions={false}
        inputAccessibilityLabel="Grocery item"
        submitAccessibilityLabel="Add grocery item to list"
      />
      <Coachmark
        visible={showAlreadyHaveCoachmark && !showFirstCyclePayoff}
        targetRef={firstGroceryItemRef}
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={12}
        highlightColor={colors.textPrimary}
        actionColor={colors.textPrimary}
        title={<Text style={styles.coachmarkTitle}>Already have something?</Text>}
        body={(
          <Text style={styles.coachmarkBody}>
            Check it off here. It won’t be sent to your online cart.
          </Text>
        )}
        actions={[{ id: 'dismiss', label: 'Got it', variant: 'accent' }]}
        onAction={dismissAlreadyHaveCoachmark}
        onDismiss={dismissAlreadyHaveCoachmark}
        placement="below"
      />
      <Coachmark
        visible={showFirstCyclePayoff}
        targetRef={firstGroceryItemRef}
        spotlight="hole"
        spotlightPadding={spacing.xs}
        spotlightRadius={12}
        highlightColor={colors.textPrimary}
        actionColor={colors.textPrimary}
        title={<Text style={styles.coachmarkTitle}>One list, ready to finish</Text>}
        body={<Text style={styles.coachmarkBody}>Recipe ingredients stay together here. Add anything else your household needs.</Text>}
        actions={[{ id: 'done', label: 'Got it', variant: 'accent' }]}
        onAction={() => {
          if (!userId || !list) return;
          dispatchCapabilityOnboarding(userId, {
            type: 'complete-path',
            pathId: 'make-meals-easier',
            receiptId: list.id,
            now: Date.now(),
          });
        }}
        onDismiss={() => {
          if (!userId || !list) return;
          dispatchCapabilityOnboarding(userId, {
            type: 'complete-path',
            pathId: 'make-meals-easier',
            receiptId: list.id,
            now: Date.now(),
          });
        }}
        placement="below"
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom:
      RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX +
      RESTING_COMPOSER_HEIGHT_PX +
      spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    paddingBottom: spacing['3xl'],
  },
  coachmarkTitle: { fontWeight: '700' },
  coachmarkBody: { color: colors.textSecondary },
  dock: {
    position: 'absolute',
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
    height: RESTING_COMPOSER_HEIGHT_PX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    zIndex: 60,
    elevation: 60,
  },
  shopButton: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  shopSurface: {
    flex: 1,
    height: RESTING_COMPOSER_HEIGHT_PX,
    backgroundColor: colors.primary,
  },
  shopSurfaceContent: {
    height: RESTING_COMPOSER_HEIGHT_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopSurfaceBlack: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shopLabel: {
    color: colors.primaryForeground,
    fontVariant: ['tabular-nums'],
  },
  shopLabelFrame: {
    width: '100%',
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedShopCount: {
    minWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentSection: {
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  equipmentHeading: { gap: spacing.xs },
  equipmentRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  equipmentCopy: { flex: 1, gap: 2 },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.985 }] },
});

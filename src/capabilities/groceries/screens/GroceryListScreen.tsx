import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { FloatingControlSurface } from '../../../features/activities/FloatingControlSurface';
import { MealPlanHeaderAction } from '../../../features/household-food/components/MealPlanHeaderAction';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button, IconButton } from '../../../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/DropdownMenu';
import { Icon } from '../../../ui/Icon';
import { AppShell } from '../../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { PageHeader } from '../../../ui/layout/PageHeader';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import { Heading, Text } from '../../../ui/Typography';
import { RecipeIngredientChecklist } from '../../recipes/components/RecipeIngredientList';
import { formatKitchenQuantity } from '../../recipes/domain/recipeScaling';
import { createMealPlanningRepository } from '../../meal-planning/data/mealPlanningRepository';
import { groceryCache } from '../data/groceryCache';
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
  const { capture } = useAnalytics();
  const { openMenu } = useCapabilityShell();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualItem, setManualItem] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [reviewingCovered, setReviewingCovered] = useState(false);
  const [sourcePlanMealCount, setSourcePlanMealCount] = useState(0);
  const requestedListId = route.params?.listId;

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
        setSourcePlanMealCount(sourcePlan?.entries.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) setSourcePlanMealCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [list?.sourceMealPlanId, list?.sourceMealPlanVersion]);

  const fulfillment = groceryFulfillmentSummary(list?.items ?? []);
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
          ? `In ${item.retailerCart.retailerLabel} cart`
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
    setBusy(true);
    try {
      const repository = createGroceryRepository();
      await prepareGroceryListForFulfillment(list, repository.markReviewed);
      if (list.status === 'review_needed') {
        capture(AnalyticsEvent.GroceryListReviewed, { count: list.items.length });
      }
      navigation.navigate('KrogerCart', { listId: list.id });
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

  const shopLabel = list?.status === 'stale'
    ? 'Update from Plan'
    : offline || pendingCount
      ? 'Sync to shop'
      : fulfillment.actionLabel;
  const shopDisabled =
    !list ||
    busy ||
    offline ||
    pendingCount > 0 ||
    (list.status !== 'stale' && fulfillment.disabled);

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
            onPress={() => navigation.navigate('NextMeals')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {offline || pendingCount ? (
          <Text tone="secondary" accessibilityLiveRegion="polite">
            {pendingCount
              ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} saved on this device. Pull to sync.`
              : 'Showing the saved list. Pull to refresh when reconnected.'}
          </Text>
        ) : null}
        {busy && !list ? <Text tone="secondary">Building your grocery list…</Text> : null}
        {!busy && !list ? (
          <View style={styles.empty}>
            <Heading variant="md">No grocery list yet.</Heading>
          </View>
        ) : null}
        {list?.status === 'stale' ? (
          <Text tone="secondary">Plan changed. Update this list before shopping.</Text>
        ) : null}
        {list && checklistItems.length ? (
          <RecipeIngredientChecklist
            items={checklistItems}
            checked={coveredIds}
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
        ) : null}
      </ScrollView>

      <View testID="grocery-list-dock" pointerEvents="box-none" style={styles.dock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add grocery item"
          disabled={!list || busy || offline}
          onPress={() => setShowAddDrawer(true)}
          style={({ pressed }) => [
            styles.addButton,
            (!list || busy || offline) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <FloatingControlSurface
            borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2}
            isProminent
            style={styles.addSurface}
            surfaceStyle={styles.addSurfaceContent}
          >
            <View style={styles.addContent}>
              <Icon name="plus" size={18} color={colors.textPrimary} />
              <Text tone="secondary">Add item</Text>
            </View>
          </FloatingControlSurface>
        </Pressable>
        <Button
          testID="grocery-shop-remaining"
          variant="primary"
          disabled={shopDisabled}
          style={styles.shopButton}
          onPress={() => {
            if (list?.status === 'stale') void refreshWithChanges();
            else void openFulfillment();
          }}
        >
          {busy ? 'Working…' : shopLabel}
        </Button>
      </View>

      <BottomDrawer
        visible={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        snapPoints={['42%']}
      >
        <BottomDrawerHeader
          variant="withClose"
          title="Add grocery item"
          onClose={() => setShowAddDrawer(false)}
        />
        <View style={styles.addDrawerContent}>
          <TextInput
            autoFocus
            accessibilityLabel="Grocery item"
            placeholder="Milk, dish soap…"
            value={manualItem}
            onChangeText={setManualItem}
            onSubmitEditing={() => {
              void addManualItem();
            }}
            returnKeyType="done"
            style={styles.input}
          />
          <Button
            variant="primary"
            disabled={!manualItem.trim() || busy || offline}
            onPress={() => {
              void addManualItem();
            }}
          >
            Add to Groceries
          </Button>
        </View>
      </BottomDrawer>
    </AppShell>
  );
}

const styles = StyleSheet.create({
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
  },
  dock: {
    position: 'absolute',
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
    height: RESTING_COMPOSER_HEIGHT_PX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 60,
    elevation: 60,
  },
  addButton: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  addSurface: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  addSurfaceContent: {
    height: RESTING_COMPOSER_HEIGHT_PX,
    justifyContent: 'center',
  },
  addContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  shopButton: { flex: 1.25, height: RESTING_COMPOSER_HEIGHT_PX },
  addDrawerContent: { gap: spacing.md },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.68 },
});

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Pressable,
  PixelRatio,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { useAppStore } from "../../../store/useAppStore";
import { colors, spacing } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import { groceryCache } from "../data/groceryCache";
import {
  createGroceryRepository,
  type GroceryProjection,
} from "../data/groceryRepository";
import {
  StoreOpportunityCaptureSheet,
  type StoreOpportunityDraft,
} from "../components/StoreOpportunityCaptureSheet";
import { createFoodScenarioRepository } from "../data/foodScenarioRepository";
import { GroceryItemProvenanceSheet } from "../components/GroceryItemProvenanceSheet";
import { createMealPlanningRepository } from "../../meal-planning/data/mealPlanningRepository";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import {
  applyQueuedGroceryStates,
  groceryOfflineQueue,
  reconcileGroceryOfflineQueue,
  shouldStackGroceryItemLayout,
} from "../data/groceryOfflineQueue";

type Props = NativeStackScreenProps<FoodStackParamList, "GroceryList">;
const aisleLabels: Record<string, string> = {
  produce: "Produce",
  bakery: "Bakery",
  dairy_eggs: "Dairy & eggs",
  meat_seafood: "Meat & seafood",
  pantry: "Pantry",
  frozen: "Frozen",
  beverages: "Beverages",
  household: "Household",
  other: "Other",
};

export function resolveGroceryListEntry(
  lists: GroceryProjection[],
  planId: string,
  planVersion: number,
): { kind: "show"; list: GroceryProjection } | { kind: "compile" } {
  const current = lists.find(
    (item) =>
      item.status !== "stale" &&
      item.sourceMealPlanId === planId &&
      item.sourceMealPlanVersion === planVersion,
  );
  if (current) return { kind: "show", list: current };
  const stale = lists.find(
    (item) => item.status === "stale" && item.sourceMealPlanId === planId,
  );
  return stale ? { kind: "show", list: stale } : { kind: "compile" };
}

export function GroceryListScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showOpportunity, setShowOpportunity] = useState(false);
  const [manualItem, setManualItem] = useState("");
  const [showManualItem, setShowManualItem] = useState(false);
  const [provenanceItem, setProvenanceItem] = useState<
    GroceryProjection["items"][number] | null
  >(null);
  const { width, fontScale } = useWindowDimensions();
  const stackItemRows = shouldStackGroceryItemLayout({ width, fontScale: Math.max(fontScale, PixelRatio.getFontScale()) });
  const requestedListId = route.params?.listId;
  const chooseList = useCallback(
    (lists: GroceryProjection[]) =>
      requestedListId
        ? (lists.find((item) => item.id === requestedListId) ?? null)
        : (lists.find((item) => item.status !== "stale") ?? lists[0] ?? null),
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
          if (entry.kind === "show") {
            navigation.replace("GroceryList", { listId: entry.list.id });
            return;
          }
          const receipt = await repository.compile(
            route.params.planId,
            route.params.planVersion,
          );
          capture(AnalyticsEvent.GroceryListCompiled, {
            outcome: "success",
            replayed: receipt.replayed,
          });
          navigation.replace("GroceryList", { listId: receipt.groceryListId });
          return;
        } catch (error) {
          Alert.alert(
            "Grocery list did not compile",
            error instanceof Error ? error.message : "Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }
      await load();
    })();
  }, [capture, load, navigation, route.params?.planId, route.params?.planVersion]);
  const groups = useMemo(() => {
    const map = new Map<string, GroceryProjection["items"]>();
    for (const item of list?.items ?? [])
      map.set(item.aisle, [...(map.get(item.aisle) ?? []), item]);
    return [...map.entries()];
  }, [list]);
  const toggle = async (itemId: string, state: "needed" | "already_have") => {
    if (!list || !userId || list.status === "stale") return;
    const mutations = await groceryOfflineQueue.enqueue(userId, {
      listId: list.id,
      itemId,
      state,
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
      if (!plan || plan.state !== "finalized")
        throw new Error(
          "Finalize the updated meal plan before rebuilding groceries.",
        );
      const receipt = await createGroceryRepository().compile(
        plan.id,
        plan.version,
        { fromListId: list.id, expectedRevision: list.revision },
      );
      const preserved =
        receipt.rebasedCorrectionCount + receipt.rebasedManualCount;
      capture(AnalyticsEvent.GroceryListCompiled, {
        outcome: receipt.rebaseConflictCount ? "review_required" : "success",
        count: preserved,
        warning_count: receipt.rebaseConflictCount,
      });
      Alert.alert(
        "New list ready",
        `${preserved} change${preserved === 1 ? " was" : "s were"} carried forward.${receipt.rebaseConflictCount ? ` ${receipt.rebaseConflictCount} need${receipt.rebaseConflictCount === 1 ? "s" : ""} review.` : ""}`,
      );
      navigation.replace("GroceryList", { listId: receipt.groceryListId });
    } catch (error) {
      Alert.alert(
        "List did not refresh",
        error instanceof Error
          ? error.message
          : "Review the current plan and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Groceries"
        titleMaxFontSizeMultiplier={1.6}
        onPressBack={() => navigation.goBack()}
        rightElement={
          list?.status === "ready" && !stackItemRows ? (
            <Button
              size="sm"
              onPress={() =>
                navigation.navigate("GroceryHandoff", { listId: list.id })
              }
            >
              Shop
            </Button>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          void load().finally(() => setRefreshing(false));
        }} />}
      >
        {offline || pendingCount ? (
          <Text tone="secondary" accessibilityLiveRegion="polite">
            {pendingCount
              ? `${pendingCount} change${pendingCount === 1 ? "" : "s"} saved on this device. Pull to sync when reconnected.`
              : "Showing the saved list. Pull to refresh when reconnected."}
          </Text>
        ) : null}
        {busy && !list ? <Text>Compiling ingredients…</Text> : null}
        {!busy && !list ? (
          <View style={styles.empty}>
            <Heading variant="md">
              Finalize a meal plan to make its grocery list.
            </Heading>
            <Button onPress={() => navigation.navigate("NextMeals")}>
              Open Meal Plan
            </Button>
          </View>
        ) : null}
        {list ? (
          <>
            <View style={styles.summary}>
              <Heading variant="md">
                {list.items.filter((item) => item.state === "needed").length}{" "}
                things to get
              </Heading>
              <Text tone="secondary">
                {list.status === "stale"
                  ? "The meal plan changed. Rebuild this list and review carried-forward changes."
                  : list.status === "review_needed"
                    ? "Review uncertain quantities and what you already have."
                    : "Ready to shop."}
              </Text>
            </View>
            {list.status === "ready" && stackItemRows ? (
              <Button onPress={() => navigation.navigate("GroceryHandoff", { listId: list.id })}>
                Shop
              </Button>
            ) : null}
            {list.status === "stale" ? (
              <Button
                disabled={busy || offline}
                onPress={() => {
                  void refreshWithChanges();
                }}
              >
                Refresh and preserve my changes
              </Button>
            ) : null}
            {list.status === "review_needed" ? (
              <Button
                onPress={() =>
                  navigation.navigate("AlreadyHaveReview", { listId: list.id })
                }
              >
                Review what I already have
              </Button>
            ) : null}
            {groups.map(([aisle, items]) => (
              <View key={aisle} style={styles.group}>
                <Heading variant="sm">{aisleLabels[aisle] ?? "Other"}</Heading>
                {items.map((item) => {
                  const quantity = item.quantityMin !== null
                    ? `${item.quantityMin}${item.quantityMax !== null ? `–${item.quantityMax}` : ""}${item.unit ? ` ${item.unit}` : ""} `
                    : "";
                  const stateLabel = item.state === "already_have" ? "Have it" : item.state === "needed" ? "Need" : item.state === "purchased" ? "Purchased" : "Skipped";
                  return (
                    <View key={item.id} style={[styles.item, stackItemRows && styles.itemStacked]}>
                      <Pressable
                        disabled={list.status === "stale"}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${quantity}${item.concept}`}
                        accessibilityHint={`Double tap to mark as ${item.state === "needed" ? "already have" : "needed"}. Long press to edit this item.`}
                        accessibilityState={{ checked: item.state !== "needed", disabled: list.status === "stale" }}
                        onPress={() => { void toggle(item.id, item.state === "needed" ? "already_have" : "needed"); }}
                        onLongPress={() => navigation.navigate("GroceryItemEdit", { listId: list.id, itemId: item.id })}
                        style={[styles.itemCheck, stackItemRows && styles.itemCheckStacked, item.state !== "needed" && styles.done]}
                      >
                        <View style={styles.itemText}>
                          <Text>{quantity}{item.concept}</Text>
                          {item.reviewReason ? <Text tone="secondary">{item.reviewReason}</Text> : null}
                        </View>
                        <Text tone="secondary">{stateLabel}</Text>
                      </Pressable>
                      <Button size="xs" variant="ghost" onPress={() => setProvenanceItem(item)} accessibilityLabel={`Why ${item.concept} is on the list`}>
                        Why?
                      </Button>
                    </View>
                  );
                })}
              </View>
            ))}
            {list.status === "review_needed" ? (
              <Button
                disabled={busy || offline}
                onPress={() => {
                  void createGroceryRepository()
                    .markReviewed(list.id, list.revision)
                    .then(() => {
                      capture(AnalyticsEvent.GroceryListReviewed, {
                        count: list.items.length,
                      });
                      return load();
                    });
                }}
              >
                List looks right
              </Button>
            ) : null}
            {list.status === "ready" ? (
              <Button
                variant="outline"
                onPress={() =>
                  navigation.navigate("GrocerySavings", { listId: list.id })
                }
              >
                Check savings
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onPress={() => setShowManualItem((current) => !current)}
            >
              Add a household request or staple
            </Button>
            {showManualItem ? (
              <View style={styles.manual}>
                <TextInput
                  accessibilityLabel="Household request or staple"
                  placeholder="Milk, dish soap…"
                  value={manualItem}
                  onChangeText={setManualItem}
                  style={styles.input}
                />
                <Button
                  disabled={!manualItem.trim() || busy || offline}
                  onPress={() => {
                    if (!list) return;
                    setBusy(true);
                    void createGroceryRepository()
                      .addItem(list.id, list.revision, manualItem.trim())
                      .then(() => {
                        setManualItem("");
                        setShowManualItem(false);
                        return load();
                      })
                      .catch((error) =>
                        Alert.alert(
                          "Item did not save",
                          error instanceof Error
                            ? error.message
                            : "Refresh and try again.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Add to this list
                </Button>
                <Text tone="secondary">
                  Added separately from recipe ingredients so everyone can see
                  why it is here.
                </Text>
              </View>
            ) : null}
            <Button variant="ghost" onPress={() => setShowOpportunity(true)}>
              Found a sale or store opportunity?
            </Button>
          </>
        ) : null}
      </ScrollView>
      <StoreOpportunityCaptureSheet
        visible={showOpportunity}
        onClose={() => setShowOpportunity(false)}
        onSubmit={async (draft: StoreOpportunityDraft) => {
          const observedAt = new Date().toISOString();
          const quantity = Number(draft.quantity);
          const priceCents = Math.round(Number(draft.price) * 100);
          const comparable = Math.round(
            Number(draft.regularUnitPrice || Number(draft.price) / quantity) *
              100,
          );
          await createFoodScenarioRepository().capture({
            concept: draft.concept.trim(),
            evidenceMethod: "manual",
            provider: null,
            barcode: null,
            artifactRef: null,
            sourceUrl: null,
            transcript: null,
            retailer: draft.retailer.trim(),
            locationId: null,
            packageQuantity: quantity,
            packageUnit: draft.unit.trim(),
            observedPriceCents: priceCents,
            comparableUnitPriceCents: comparable,
            comparableUnit: draft.unit.trim(),
            confidence: 1,
            observedAt,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          });
          capture(AnalyticsEvent.StoreOpportunityCaptured, { method: "manual" });
          setShowOpportunity(false);
          Alert.alert(
            "Opportunity saved",
            "Kwilt saved the observed price. Review it before changing meals or the list.",
          );
        }}
      />
      <GroceryItemProvenanceSheet
        visible={Boolean(provenanceItem)}
        item={provenanceItem}
        onClose={() => setProvenanceItem(null)}
      />
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  summary: { gap: spacing.xs },
  manual: { gap: spacing.sm },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  group: { gap: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemStacked: { alignItems: "stretch", flexDirection: "column", paddingBottom: spacing.xs },
  itemCheck: { minHeight: 48, flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  itemCheckStacked: { alignItems: "flex-start", flexDirection: "column" },
  itemText: { flex: 1, gap: 2 },
  done: { opacity: 0.5 },
});

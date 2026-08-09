import { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";

import { colors, radii, spacing, typography } from "../../../theme";
import { BottomDrawer, BottomDrawerScrollView } from "../../../ui/BottomDrawer";
import { Button, IconButton } from "../../../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui/DropdownMenu";
import { Icon, type IconName } from "../../../ui/Icon";
import { menuItemTextProps, menuStyles } from "../../../ui/menuStyles";
import { AppShell } from "../../../ui/layout/AppShell";
import { BottomDrawerHeader } from "../../../ui/layout/BottomDrawerHeader";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { HeaderActionPill } from "../../../ui/layout/ObjectPageHeader";
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from "../../../ui/layout/restingComposerMetrics";
import { Heading, Text } from "../../../ui/Typography";
import { useCapabilityShell } from "../../../navigation/CapabilityShellContext";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { UnifiedChatDrawer } from "../../../features/unifiedChat/UnifiedChatDrawer";
import type { UnifiedChatLaunchContext } from "../../../features/unifiedChat/launchContext";
import { FloatingControlSurface } from "../../../features/activities/FloatingControlSurface";
import { FloatingDockActionButton } from "../../../features/activities/FloatingDockActionButton";
import { INVENTORY_DOCK_BUTTON_SIZE_PX } from "../../../features/activities/InventoryDockAffordances";
import {
  InventoryControlGroup,
  InventoryControlSurface,
} from "../../../ui/InventoryControlGroup";
import { useRecipeStore } from "../runtime/useRecipeStore";
import { useRecipeFavoriteStore } from "../runtime/useRecipeFavoriteStore";
import type { RecipeProjection } from "../data/recipeCache";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { RecipeArtwork } from "../components/RecipeArtwork";
import { RecipeArtworkGallery } from "../components/RecipeArtworkGallery";
import { useAppStore } from "../../../store/useAppStore";
import { createMealPlanningRepository, type MealPlanProjection } from "../../meal-planning/data/mealPlanningRepository";
import { getCommittedMealPlan } from "../../meal-planning/domain/mealPlanPresentation";
import { mealPlanningCache } from "../../meal-planning/data/mealPlanningCache";
import { createGroceryRepository, type GroceryProjection } from "../../groceries/data/groceryRepository";
import type { SharedMealCartProjection } from "../../meal-planning/domain/sharedMealCart";
import {
  buildMealCommitmentOccasions,
  type MealCommitment,
} from "../../meal-planning/domain/mealCommitments";
import { HiddenMealsDrawer } from "../components/HiddenMealsDrawer";
import {
  removeCandidateFromSharedMealCart,
  sharedMealCartContainsRecipeVersion,
  toggleRecipeInSharedMealCart,
} from "../domain/mealPlanSelection";
import { excludeHiddenRecipes } from "../domain/hiddenRecipes";
import { getCommittedMealPreviews, getGroceryPlanAction } from "../domain/mealPlanAffordance";
import {
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  clampDefaultMealServings,
  resolveDefaultMealServings,
} from "../domain/mealPreferences";
import {
  buildRecipeRecommendations,
  type RecipeRecommendation,
  type RecipeRecommendationReason,
} from "../domain/recipeRecommendations";
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  STARTER_RECIPE_CATEGORIES,
  STARTER_RECIPE_CUISINES,
  buildRecipeLibraryInventory,
  countActiveRecipeInventoryFilters,
  filterRecipeInventory,
  getRecipeElapsedMinutes,
  type RecipeInventoryFilters,
  type RecipeInventorySortMode,
  type StarterRecipeMetadata,
} from "../data/starterRecipeCatalog";
import { useHiddenRecipeStore } from "../runtime/useHiddenRecipeStore";
import {
  getEditorialCollection,
  getMealEditorialEdition,
} from "../data/editorialMealCollections";
import type {
  EditorialCollection,
  MealEditorialPlacement,
} from "../domain/editorialMealCollectionContracts";
import { MealSetupDrawer } from "../../../features/household-food/components/MealSetupDrawer";
import { UsualDinersDrawer } from "../../../features/household-food/components/UsualDinersDrawer";
import { FoodNeedsDrawer } from "../../../features/household-food/components/FoodNeedsDrawer";
import { useHouseholdMealPreferencesStore } from "../../../features/household-food/runtime/useHouseholdMealPreferencesStore";


import {
  buildVisibleRecipeInventory,
  buildRecipeDiscoverySections,
  buildRecipeShelves,
  RecipeInventoryControls,
} from "./RecipeLibraryDiscovery";
import {
  MealPlanDrawer,
  RecipeCaptureDrawer,
  RecipeFilterDrawer,
  RecipeInventoryDock,
  RecipeSortDrawer,
  type MealPlanTrayItem,
} from "./RecipeLibraryDrawers";
import {
  MealPlanHeaderAction,
  MealsOverflowMenu,
  RecipeLibraryView,
} from "./RecipeLibraryPresentation";

export {
  buildVisibleRecipeInventory,
  buildRecipeDiscoverySections,
  buildRecipeShelves,
  MealPlanDrawer,
  MealPlanHeaderAction,
  MealsOverflowMenu,
  RecipeInventoryControls,
  RecipeInventoryDock,
  RecipeLibraryView,
};
export type { MealPlanTrayItem };

type FilterKey = keyof RecipeInventoryFilters;
type Props = NativeStackScreenProps<FoodStackParamList, "RecipeLibrary">;

export function RecipeLibraryScreen({ navigation }: Props) {
  const { openMenu } = useCapabilityShell();
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const status = useRecipeStore((state) => state.status);
  const refresh = useRecipeStore((state) => state.refresh);
  const favoriteRecipeIds = useRecipeFavoriteStore((state) => state.recipeIds);
  const hiddenRecipeIds = useHiddenRecipeStore((state) => state.recipeIds);
  const setRecipeHidden = useHiddenRecipeStore((state) => state.setHidden);
  const mealPreferences = useHouseholdMealPreferencesStore(
    (state) => state.projection,
  );
  const setMealSetupState = useHouseholdMealPreferencesStore(
    (state) => state.setSetupState,
  );
  const setUsualDiners = useHouseholdMealPreferencesStore(
    (state) => state.setUsualDiners,
  );
  const setFoodNeed = useHouseholdMealPreferencesStore(
    (state) => state.setFoodNeed,
  );
  const [filters, setFilters] = useState<RecipeInventoryFilters>(
    DEFAULT_RECIPE_INVENTORY_FILTERS,
  );
  const [sort, setSort] = useState<RecipeInventorySortMode>("featured");
  const [browseMode, setBrowseMode] = useState<"shelves" | "results">(
    "shelves",
  );
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [sortDrawerVisible, setSortDrawerVisible] = useState(false);
  const [hiddenDrawerVisible, setHiddenDrawerVisible] = useState(false);
  const [preferenceDrawer, setPreferenceDrawer] = useState<
    "diners" | "food_needs" | null
  >(null);
  const [captureDrawerVisible, setCaptureDrawerVisible] = useState(false);
  const [mealChatVisible, setMealChatVisible] = useState(false);
  const [mealChatThreadId, setMealChatThreadId] = useState<string | null>(null);
  const [sharedCart, setSharedCart] = useState<SharedMealCartProjection | null>(null);
  const [committedPlan, setCommittedPlan] = useState<MealPlanProjection | null>(null);
  const [groceryLists, setGroceryLists] = useState<GroceryProjection[]>([]);
  const [planBrowsing, setPlanBrowsing] = useState(false);
  const [planMutationBusy, setPlanMutationBusy] = useState(false);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const defaultServings = useAppStore((state) =>
    resolveDefaultMealServings(
      state.userProfile?.preferences?.meals?.defaultServings,
    ),
  );
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const { capture } = useAnalytics();
  const mealChatLaunchContext = useMemo<UnifiedChatLaunchContext>(
    () => ({
      capabilityId: "meal_planning",
      surface: "inventory",
      returnTarget: { name: "Food", params: { screen: "RecipeLibrary" } },
    }),
    [],
  );
  useEffect(() => {
    capture(AnalyticsEvent.RecipeLibraryViewed, { source: "food" });
  }, [capture]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadMealPlan = async () => {
        if (!userId || !mealPreferences?.householdId) {
          setSharedCart(null);
          setCommittedPlan(null);
          setGroceryLists([]);
          return;
        }
        const cachedPlans = await mealPlanningCache.read(userId);
        if (!cancelled && cachedPlans.length) setCommittedPlan(getCommittedMealPlan(cachedPlans));
        try {
          const mealRepository = createMealPlanningRepository();
          const [latest, plans] = await Promise.all([
            mealRepository.getSharedCart(mealPreferences.householdId),
            mealRepository.list(),
          ]);
          if (!cancelled) {
            setSharedCart(latest);
            setCommittedPlan(getCommittedMealPlan(plans));
            await mealPlanningCache.write(userId, plans);
          }
        } catch {
          // Preserve the last truthful projection while refreshing fails.
        }
        try {
          const lists = await createGroceryRepository().list();
          if (!cancelled) setGroceryLists(lists);
        } catch {
          // Grocery state is optional here; the list screen resolves it again.
        }
      };
      void loadMealPlan();
      return () => {
        cancelled = true;
      };
    }, [mealPreferences?.householdId, userId]),
  );
  const inventory = useMemo(
    () => buildRecipeLibraryInventory(personalRecipes),
    [personalRecipes],
  );
  const visibleInventory = useMemo(
    () => buildVisibleRecipeInventory(personalRecipes, hiddenRecipeIds),
    [hiddenRecipeIds, personalRecipes],
  );
  const hiddenRecipes = useMemo(() => {
    const hidden = new Set(hiddenRecipeIds);
    return inventory.filter((projection) => hidden.has(projection.recipe.id));
  }, [hiddenRecipeIds, inventory]);
  const filtered = useMemo(
    () => filterRecipeInventory(visibleInventory, { query: "", filters, sort }),
    [filters, sort, visibleInventory],
  );
  const editorialPlacements = useMemo(
    () => getMealEditorialEdition().placements,
    [],
  );
  const dinerSummary = mealPreferences?.usualDinerPersonIds.length
    ? `${mealPreferences.usualDinerPersonIds.length} ${mealPreferences.usualDinerPersonIds.length === 1 ? "person" : "people"}`
    : "Choose";
  const foodNeedsSummary = mealPreferences?.foodNeeds.length
    ? `${mealPreferences.foodNeeds.length} recorded`
    : "Add";
  const runPreferenceMutation = useCallback(
    (mutation: Promise<void>, title: string) => {
      void mutation.catch((caught) =>
        Alert.alert(
          title,
          caught instanceof Error ? caught.message : "Try again in a moment.",
        ),
      );
    },
    [],
  );
  const mealPlanCount = sharedCart?.candidates.length ?? 0;
  const committedMeals = useMemo(() => getCommittedMealPreviews(committedPlan), [committedPlan]);
  const committedMealCount = useMemo(
    () => committedPlan?.occasions.reduce((total, occasion) => total + occasion.dishes.length, 0) ?? 0,
    [committedPlan],
  );
  const planHeaderCount = committedMealCount + mealPlanCount;
  const groceryAction = useMemo(
    () => committedPlan ? getGroceryPlanAction(committedPlan, groceryLists) : null,
    [committedPlan, groceryLists],
  );
  const mealPlanTrayItems = useMemo<MealPlanTrayItem[]>(() => {
    if (!sharedCart) return [];
    return sharedCart.candidates.map((candidate) => {
      const media = candidate?.recipeSnapshot?.media;
      const storageRef =
        typeof media === "object" &&
        media !== null &&
        "storageRef" in media &&
        typeof media.storageRef === "string"
          ? media.storageRef
          : null;
      return {
        id: candidate.id,
        candidateId: candidate.id,
        title: candidate.title,
        storageRef,
        contributor: candidate.contributor,
        supporters: candidate.supporters,
        viewerReacted: candidate.viewerReacted,
        canReact: candidate.canReact && candidate.contributor.personId !== sharedCart.viewer.personId,
        canWithdraw: candidate.canWithdraw,
        selected: candidate.selected,
      };
    });
  }, [sharedCart]);
  const reloadSharedCart = useCallback(async () => {
    if (!mealPreferences?.householdId) throw new Error("Set up your Household before starting a shared Plan.");
    const mealRepository = createMealPlanningRepository();
    const [next, plans] = await Promise.all([
      mealRepository.getSharedCart(mealPreferences.householdId),
      mealRepository.list(),
    ]);
    const lists = await createGroceryRepository().list().catch(() => groceryLists);
    setSharedCart(next);
    setCommittedPlan(getCommittedMealPlan(plans));
    setGroceryLists(lists);
    if (userId) await mealPlanningCache.write(userId, plans);
    return next;
  }, [groceryLists, mealPreferences?.householdId, userId]);
  const toggleMealInPlan = useCallback(
    async (projection: RecipeProjection) => {
      if (planMutationBusy) return;
      setPlanMutationBusy(true);
      try {
        const repository = createMealPlanningRepository();
        if (!mealPreferences?.householdId) throw new Error("Set up your Household before starting a shared Plan.");
        const result = await toggleRecipeInSharedMealCart({
          cart: sharedCart,
          householdId: mealPreferences.householdId,
          projection,
          servings: defaultServings,
          candidateId: Crypto.randomUUID(),
          repository,
          reloadCart: reloadSharedCart,
        });
        setSharedCart(result.cart);
        if (result.cart.candidates.length === 0) setPlanBrowsing(false);
      } catch (caught) {
        setSharedCart(sharedCart);
        Alert.alert(
          "Meal Plan not updated",
          caught instanceof Error ? caught.message : "Try again in a moment.",
        );
      } finally {
        setPlanMutationBusy(false);
      }
    },
    [defaultServings, mealPreferences?.householdId, planMutationBusy, reloadSharedCart, sharedCart],
  );
  const removeCandidate = useCallback(
    async (candidateId: string) => {
      if (!sharedCart || planMutationBusy) return;
      setPlanMutationBusy(true);
      try {
        const nextCart = await removeCandidateFromSharedMealCart({
          candidateId,
          repository: createMealPlanningRepository(),
          reloadCart: reloadSharedCart,
        });
        setSharedCart(nextCart);
        if (nextCart.candidates.length === 0) {
          setPlanBrowsing(false);
        }
      } catch (caught) {
        setSharedCart(sharedCart);
        Alert.alert(
          "Meal Plan not updated",
          caught instanceof Error ? caught.message : "Try again in a moment.",
        );
      } finally {
        setPlanMutationBusy(false);
      }
    },
    [planMutationBusy, reloadSharedCart, sharedCart],
  );
  const setCandidateReaction = useCallback(async (candidateId: string, reacted: boolean) => {
    if (planMutationBusy) return;
    setPlanMutationBusy(true);
    try {
      await createMealPlanningRepository().setSharedReaction(candidateId, reacted);
      await reloadSharedCart();
    } catch (caught) {
      Alert.alert("Plan not updated", caught instanceof Error ? caught.message : "Try again in a moment.");
    } finally {
      setPlanMutationBusy(false);
    }
  }, [planMutationBusy, reloadSharedCart]);
  const settleSharedCart = useCallback(async (commitments: MealCommitment[]) => {
    if (!sharedCart?.planId || !sharedCart.version || sharedCart.state !== "draft" || planMutationBusy) return;
    const dinerPersonIds = mealPreferences?.usualDinerPersonIds ?? [];
    if (!dinerPersonIds.length) {
      Alert.alert("Choose usual diners first", "Set who usually eats before settling these meals.");
      return;
    }
    const selected = sharedCart.candidates.filter((candidate) => commitments.some((commitment) => commitment.candidateId === candidate.id));
    if (!selected.length) return;
    setPlanMutationBusy(true);
    try {
      await createMealPlanningRepository().finalize({
        planId: sharedCart.planId,
        expectedVersion: sharedCart.version,
        organizerNote: null,
        occasions: buildMealCommitmentOccasions({
          commitments,
          dinerPersonIds,
          defaultServings,
          selectedServingsByCandidateId: new Map(selected.flatMap((candidate) =>
            typeof candidate.recipeSnapshot?.selectedServings === "number"
              ? [[candidate.id, candidate.recipeSnapshot.selectedServings] as const]
              : [],
          )),
          createId: Crypto.randomUUID,
        }),
      });
      await reloadSharedCart();
      setPlanBrowsing(false);
    } catch (caught) {
      Alert.alert("Plan did not settle", caught instanceof Error ? caught.message : "Try again in a moment.");
    } finally {
      setPlanMutationBusy(false);
    }
  }, [defaultServings, mealPreferences?.usualDinerPersonIds, planMutationBusy, reloadSharedCart, sharedCart]);
  const openMealSearch = useCallback(
    () => useAppStore.getState().openGlobalSearch({ initialScope: "recipes" }),
    [],
  );
  const clearFilter = (key: FilterKey) => {
    setFilters((current) => {
      const next = { ...current, [key]: DEFAULT_RECIPE_INVENTORY_FILTERS[key] };
      if (countActiveRecipeInventoryFilters(next) === 0 && sort === "featured")
        setBrowseMode("shelves");
      return next;
    });
  };
  const resetInventory = () => {
    setFilters(DEFAULT_RECIPE_INVENTORY_FILTERS);
    setSort("featured");
    setBrowseMode("shelves");
  };
  return (
    <AppShell>
      <PageHeader
        title="Meals"
        onPressMenu={openMenu}
        moreMenu={
          <MealsOverflowMenu
            hiddenCount={hiddenRecipes.length}
            defaultServings={defaultServings}
            foodNeedsCount={mealPreferences?.foodNeeds.length ?? 0}
            onOpenHidden={() => setHiddenDrawerVisible(true)}
            onChangeDefaultServings={(servings) =>
              updateUserProfile((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  meals: {
                    ...current.preferences?.meals,
                    defaultServings: servings,
                  },
                },
              }))
            }
            onOpenFoodNeeds={() => setPreferenceDrawer("food_needs")}
          />
        }
        rightElement={
          <MealPlanHeaderAction
            count={planHeaderCount}
            onPress={() => setPlanBrowsing(true)}
          />
        }
      />
      <RecipeLibraryView
        recipes={filtered}
        onOpen={(recipeId) => navigation.navigate("RecipeHome", { recipeId })}
        onRefresh={() => {
          void refresh();
        }}
        refreshing={status === "refreshing"}
        cached={status === "cached" || status === "refreshing"}
        filters={filters}
        sort={sort}
        onOpenFilters={() => setFilterDrawerVisible(true)}
        onOpenSort={() => setSortDrawerVisible(true)}
        onClearFilter={clearFilter}
        onReset={resetInventory}
        browseMode={browseMode}
        onSeeAll={(next) => {
          setFilters(next);
          setSort("featured");
          setBrowseMode("results");
        }}
        editorialPlacements={editorialPlacements}
        onOpenCollection={(collectionId) =>
          navigation.navigate("EditorialMealCollection", { collectionId })
        }
        onAddToPlan={(projection) => {
          void toggleMealInPlan(projection);
        }}
        isInPlan={(projection) =>
          sharedCart
            ? sharedMealCartContainsRecipeVersion(sharedCart, projection)
            : false
        }
        isFavorite={(projection) =>
          favoriteRecipeIds.includes(projection.recipe.id)
        }
        totalCount={visibleInventory.length}
      />
      {planBrowsing ? (
        <MealPlanDrawer
          visible
          items={mealPlanTrayItems}
          committedMeals={committedMeals}
          committedMealCount={committedMealCount}
          groceryAction={groceryAction}
          canEdit={sharedCart?.state === "draft"}
          onClose={() => setPlanBrowsing(false)}
          onContinue={() => {
            setPlanBrowsing(false);
            navigation.navigate("NextMeals");
          }}
          onRemove={(candidateId) => {
            void removeCandidate(candidateId);
          }}
          canSettle={Boolean(sharedCart?.viewer.canSettle)}
          onReact={(candidateId, reacted) => { void setCandidateReaction(candidateId, reacted); }}
          onSettle={(commitments) => { void settleSharedCart(commitments); }}
          onOpenGroceries={() => {
            if (!groceryAction) return;
            setPlanBrowsing(false);
            navigation.navigate("GroceryList", groceryAction.params);
          }}
        />
      ) : (
        <RecipeInventoryDock
          onAdd={() => setCaptureDrawerVisible(true)}
          onSearch={openMealSearch}
          onAsk={() => setMealChatVisible(true)}
        />
      )}
      <RecipeFilterDrawer
        visible={filterDrawerVisible}
        value={filters}
        onClose={() => setFilterDrawerVisible(false)}
        onApply={(next) => {
          setFilters(next);
          setBrowseMode(
            countActiveRecipeInventoryFilters(next) ? "results" : "shelves",
          );
          setFilterDrawerVisible(false);
        }}
      />
      <RecipeSortDrawer
        visible={sortDrawerVisible}
        value={sort}
        onClose={() => setSortDrawerVisible(false)}
        onChange={(next) => {
          setSort(next);
          setBrowseMode(
            next === "featured" && !countActiveRecipeInventoryFilters(filters)
              ? "shelves"
              : "results",
          );
        }}
      />
      <HiddenMealsDrawer
        visible={hiddenDrawerVisible}
        recipes={hiddenRecipes}
        onClose={() => setHiddenDrawerVisible(false)}
        onRestore={(projection) => {
          void setRecipeHidden(projection.recipe.id, false).catch((caught) => {
            Alert.alert(
              "Meal not restored",
              caught instanceof Error
                ? caught.message
                : "Try again in a moment.",
            );
          });
        }}
      />
      <MealSetupDrawer
        visible={
          mealPreferences?.setupState === "unseen" && preferenceDrawer === null
        }
        dinerSummary={dinerSummary}
        foodNeedsSummary={foodNeedsSummary}
        onOpenDiners={() => setPreferenceDrawer("diners")}
        onOpenFoodNeeds={() => setPreferenceDrawer("food_needs")}
        onDone={() =>
          runPreferenceMutation(
            setMealSetupState("completed"),
            "Meal setup not saved",
          )
        }
        onNotNow={() =>
          runPreferenceMutation(
            setMealSetupState("skipped"),
            "Meal setup not saved",
          )
        }
      />
      <UsualDinersDrawer
        visible={preferenceDrawer === "diners"}
        members={mealPreferences?.members ?? []}
        selectedPersonIds={mealPreferences?.usualDinerPersonIds ?? []}
        onClose={() => setPreferenceDrawer(null)}
        onSave={(personIds) => {
          runPreferenceMutation(
            setUsualDiners(personIds),
            "Usual diners not saved",
          );
          setPreferenceDrawer(null);
        }}
      />
      <FoodNeedsDrawer
        visible={preferenceDrawer === "food_needs"}
        members={mealPreferences?.members ?? []}
        foodNeeds={mealPreferences?.foodNeeds ?? []}
        onClose={() => setPreferenceDrawer(null)}
        onSetFoodNeed={(input) =>
          runPreferenceMutation(setFoodNeed(input), "Food need not saved")
        }
      />
      <RecipeCaptureDrawer
        visible={captureDrawerVisible}
        onClose={() => setCaptureDrawerVisible(false)}
        onFamily={() => navigation.navigate("RecipeImportReview", { intent: "family" })}
        onWeb={() => navigation.navigate("RecipeImportReview", { intent: "web" })}
        onManual={() => navigation.navigate("RecipeEdit", {})}
      />
      <UnifiedChatDrawer
        visible={mealChatVisible}
        onClose={() => setMealChatVisible(false)}
        launchContext={mealChatLaunchContext}
        scopeLabel="Meals"
        source="meals_inventory_contextual_drawer"
        threadId={mealChatThreadId}
        onThreadIdChange={setMealChatThreadId}
      />
    </AppShell>
  );
}

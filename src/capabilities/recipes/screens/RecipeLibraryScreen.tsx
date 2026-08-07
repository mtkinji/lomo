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
import { mealPlanningCache } from "../../meal-planning/data/mealPlanningCache";
import {
  createMealPlanningRepository,
  type MealPlanProjection,
} from "../../meal-planning/data/mealPlanningRepository";
import {
  getActiveMealPlan,
  getActiveMealPlanCount,
} from "../../meal-planning/domain/mealPlanPresentation";
import { HiddenMealsDrawer } from "../components/HiddenMealsDrawer";
import {
  mealPlanContainsSelectedRecipeVersion,
  removeCandidateFromMealPlan,
  toggleRecipeInMealPlan,
} from "../domain/mealPlanSelection";
import { excludeHiddenRecipes } from "../domain/hiddenRecipes";
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
import { getHouseholdSnapshot } from "../../../features/household/data/household";
import { getSupabaseClient } from "../../../services/backend/supabaseClient";


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
  const [activePlan, setActivePlan] = useState<MealPlanProjection | null>(null);
  const [planBrowsing, setPlanBrowsing] = useState(false);
  const [planDrawerSnapIndex, setPlanDrawerSnapIndex] = useState(0);
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
        if (!userId) {
          setActivePlan(null);
          return;
        }
        const cached = await mealPlanningCache.read(userId);
        if (!cancelled) setActivePlan(getActiveMealPlan(cached));
        try {
          const latest = await createMealPlanningRepository().list();
          if (!cancelled) setActivePlan(getActiveMealPlan(latest));
          await mealPlanningCache.write(userId, latest);
        } catch {
          // Keep the cached plan while offline.
        }
      };
      void loadMealPlan();
      return () => {
        cancelled = true;
      };
    }, [userId]),
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
  const mealPlanCount = activePlan ? getActiveMealPlanCount([activePlan]) : 0;
  const mealPlanTrayItems = useMemo<MealPlanTrayItem[]>(() => {
    if (!activePlan) return [];
    const sourceItems =
      activePlan.state === "finalized"
        ? activePlan.entries.map((entry) => ({
            id: entry.id,
            candidateId: entry.candidateId,
            title: entry.title,
            candidate: activePlan.candidates.find(
              (candidate) => candidate.id === entry.candidateId,
            ),
          }))
        : activePlan.candidates.map((candidate) => ({
            id: candidate.id,
            candidateId: candidate.id,
            title: candidate.title,
            candidate,
          }));
    return sourceItems.map(({ id, candidateId, title, candidate }) => {
      const media = candidate?.recipeSnapshot?.media;
      const storageRef =
        typeof media === "object" &&
        media !== null &&
        "storageRef" in media &&
        typeof media.storageRef === "string"
          ? media.storageRef
          : null;
      return { id, candidateId, title, storageRef };
    });
  }, [activePlan]);
  const reloadActivePlan = useCallback(async () => {
    if (!userId) return null;
    const latest = await createMealPlanningRepository().list();
    await mealPlanningCache.write(userId, latest);
    const next = getActiveMealPlan(latest);
    setActivePlan(next);
    return next;
  }, [userId]);
  const toggleMealInPlan = useCallback(
    async (projection: RecipeProjection) => {
      if (planMutationBusy) return;
      setPlanBrowsing(true);
      setPlanDrawerSnapIndex(0);
      setPlanMutationBusy(true);
      try {
        const repository = createMealPlanningRepository();
        const result = await toggleRecipeInMealPlan({
          plan: activePlan,
          projection,
          servings: defaultServings,
          candidateId: Crypto.randomUUID(),
          repository,
          reloadPlan: reloadActivePlan,
          resolveHouseholdId: async () => {
            const household = await getHouseholdSnapshot(getSupabaseClient());
            if (!household.household)
              throw new Error(
                "Set up your Household before starting a shared Meal Plan.",
              );
            return household.household.id;
          },
        });
        setActivePlan(result.plan);
        if (getActiveMealPlanCount([result.plan]) === 0) setPlanBrowsing(false);
      } catch (caught) {
        setActivePlan(activePlan);
        Alert.alert(
          "Meal Plan not updated",
          caught instanceof Error ? caught.message : "Try again in a moment.",
        );
      } finally {
        setPlanMutationBusy(false);
      }
    },
    [activePlan, defaultServings, planMutationBusy, reloadActivePlan],
  );
  const removeCandidate = useCallback(
    async (candidateId: string) => {
      if (!activePlan || planMutationBusy) return;
      setPlanMutationBusy(true);
      try {
        const nextPlan = await removeCandidateFromMealPlan({
          plan: activePlan,
          candidateId,
          repository: createMealPlanningRepository(),
          reloadPlan: reloadActivePlan,
        });
        setActivePlan(nextPlan);
        if (getActiveMealPlanCount([nextPlan]) === 0) {
          setPlanBrowsing(false);
          setPlanDrawerSnapIndex(0);
        }
      } catch (caught) {
        setActivePlan(activePlan);
        Alert.alert(
          "Meal Plan not updated",
          caught instanceof Error ? caught.message : "Try again in a moment.",
        );
      } finally {
        setPlanMutationBusy(false);
      }
    },
    [activePlan, planMutationBusy, reloadActivePlan],
  );
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
            count={mealPlanCount}
            onPress={() => {
              setPlanBrowsing(true);
              setPlanDrawerSnapIndex(1);
            }}
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
          activePlan
            ? mealPlanContainsSelectedRecipeVersion(activePlan, projection)
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
          canEdit={
            !activePlan ||
            activePlan.state === "draft" ||
            activePlan.state === "finalized"
          }
          snapIndex={planDrawerSnapIndex}
          onSnapIndexChange={setPlanDrawerSnapIndex}
          onSearch={openMealSearch}
          onClose={() => {
            setPlanBrowsing(false);
            setPlanDrawerSnapIndex(0);
          }}
          onContinue={() => {
            setPlanBrowsing(false);
            setPlanDrawerSnapIndex(0);
            navigation.navigate("NextMeals");
          }}
          onRemove={(candidateId) => {
            void removeCandidate(candidateId);
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

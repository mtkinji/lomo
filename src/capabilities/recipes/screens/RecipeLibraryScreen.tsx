import { Pressable } from '@/src/ui/HapticPressable';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
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
import { AlertDialog } from "../../../ui/AlertDialog";
import { Coachmark } from "../../../ui/Coachmark";
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
import { getSupabaseClient } from "../../../services/backend/supabaseClient";
import { getHouseholdSnapshot } from "../../../features/household/data/household";
import { RecipeArtwork } from "../components/RecipeArtwork";
import { RecipeArtworkGallery } from "../components/RecipeArtworkGallery";
import { useAppStore } from "../../../store/useAppStore";
import { useToastStore } from "../../../store/useToastStore";
import {
  createMealPlanningRepository,
  type GuestMealFeedbackSummary,
} from "../../meal-planning/data/mealPlanningRepository";
import { createMealPlanAttentionRepository } from "../../meal-planning/data/mealPlanAttentionRepository";
import {
  loadCurrentHouseholdMealCart,
  resolveCurrentMealPlanHouseholdId,
} from "../../meal-planning/data/mealPlanHouseholdScope";
import {
  shareGuestMealPlan,
  type GuestMealPlanInvitation,
} from "../../meal-planning/domain/guestMealPlanSharing";
import { shareUrlWithPreview } from "../../../utils/share";
import {
  optimisticallySetSharedMealReaction,
  type PlanReaction,
  type SharedMealCartProjection,
} from "../../meal-planning/domain/sharedMealCart";
import { HiddenMealsDrawer } from "../components/HiddenMealsDrawer";
import {
  addRecipeRecommendationsToSharedMealCart,
  sharedMealCartContainsRecipeVersion,
  toggleRecipeInSharedMealCart,
  withdrawMealCandidatesFromSharedMealCart,
} from "../domain/mealPlanSelection";
import { excludeHiddenRecipes } from "../domain/hiddenRecipes";
import {
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  clampDefaultMealServings,
  resolveDefaultMealServings,
  resolveSuggestedMealServings,
} from "../domain/mealPreferences";
import {
  buildMealPlanIdeaRecommendations,
  buildRecipeRecommendationPlanningContext,
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
import { groceryEducation } from "../../groceries/data/groceryEducation";
import { useCapabilityOnboardingStore } from "../../../features/capability-onboarding/useCapabilityOnboardingStore";
import {
  FOOD_FIRST_CYCLE_CHECKPOINTS,
  foodFirstCycleStepFromCheckpoint,
} from "../../../features/household-food/onboarding/foodFirstCycleGuide";

import {
  buildVisibleRecipeInventory,
  buildRecipeDiscoverySections,
  buildRecipeShelves,
  RecipeInventoryControls,
  resolveRecipeBrowseMode,
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
import { styles } from "./RecipeLibraryScreen.styles";

export {
  buildVisibleRecipeInventory,
  buildRecipeDiscoverySections,
  buildRecipeShelves,
  MealPlanDrawer,
  MealPlanHeaderAction,
  MealsOverflowMenu,
  RecipeInventoryControls,
  resolveRecipeBrowseMode,
  RecipeInventoryDock,
  RecipeLibraryView,
};
export type { MealPlanTrayItem };

export function shouldShowPickMealGuide({
  routeOnboarding,
  foodGuideCheckpoint,
  hasRecipes,
}: {
  routeOnboarding: string | undefined;
  foodGuideCheckpoint: string | null;
  hasRecipes: boolean;
}): boolean {
  if (!hasRecipes) return false;
  if (foodGuideCheckpoint !== null) {
    return foodFirstCycleStepFromCheckpoint(foodGuideCheckpoint) === "choose-recipe";
  }
  return routeOnboarding === "pick-meal";
}

type FilterKey = keyof RecipeInventoryFilters;
type Props = NativeStackScreenProps<FoodStackParamList, "RecipeLibrary">;

export function RecipeLibraryScreen({ navigation, route }: Props) {
  const [recommendationPlanningContext] = useState(() =>
    buildRecipeRecommendationPlanningContext(),
  );
  const { openMenu } = useCapabilityShell();
  const personalRecipes = useRecipeStore((state) => state.recipes);
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
  const deferredFilters = useDeferredValue(filters);
  const filterUpdating = deferredFilters !== filters;
  const [sort, setSort] = useState<RecipeInventorySortMode>("featured");
  const [browseMode, setBrowseMode] = useState<"shelves" | "results">(
    "shelves",
  );
  const [likedOnly, setLikedOnly] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
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
  const [mealPlanHouseholdId, setMealPlanHouseholdId] = useState<string | null | undefined>(undefined);
  const [planBrowsing, setPlanBrowsing] = useState(false);
  const [mealPlanNeedsAttention, setMealPlanNeedsAttention] = useState(false);
  const [guestInvitation, setGuestInvitation] = useState<GuestMealPlanInvitation | null>(null);
  const [guestFeedbackSummary, setGuestFeedbackSummary] = useState<GuestMealFeedbackSummary | null>(null);
  const [activeGuestInviteIds, setActiveGuestInviteIds] = useState<string[]>([]);
  const [guestShareBusy, setGuestShareBusy] = useState(false);
  const [guestShareSheetVisible, setGuestShareSheetVisible] = useState(false);
  const [planMutationBusy, setPlanMutationBusy] = useState(false);
  const [gettingKwiltIdeas, setGettingKwiltIdeas] = useState(false);
  const [reactingCandidateIds, setReactingCandidateIds] = useState<Set<string>>(new Set());
  const reactingCandidateIdsRef = useRef<Set<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<MealPlanTrayItem | null>(null);
  const [planEducationLoaded, setPlanEducationLoaded] = useState(false);
  const [hasSeenSentRemoval, setHasSeenSentRemoval] = useState(false);
  const [hasSeenReadyPlan, setHasSeenReadyPlan] = useState(false);
  const planHeaderRef = useRef<View | null>(null);
  const onboardingRecipeRef = useRef<View | null>(null);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const foodGuideCheckpoint = useCapabilityOnboardingStore((state) =>
    userId ? state.recordsByUserId[userId]?.checkpoint : null,
  );
  const dispatchCapabilityOnboarding = useCapabilityOnboardingStore((state) => state.dispatch);
  const showToast = useToastStore((state) => state.showToast);
  const profileDefaultServings = useAppStore((state) =>
    resolveDefaultMealServings(
      state.userProfile?.preferences?.meals?.defaultServings,
    ),
  );
  const defaultServings = resolveSuggestedMealServings({
    usualDinerCount: mealPreferences?.usualDinerCount,
    usualDinerPersonIds: mealPreferences?.usualDinerPersonIds,
    numericFallback: profileDefaultServings,
  });
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const { capture } = useAnalytics();
  const mealPlanAttentionRepository = useMemo(() => createMealPlanAttentionRepository(), []);
  const resolveMealPlanHouseholdId = useCallback(async () => {
    const householdId = await resolveCurrentMealPlanHouseholdId(
      () => getHouseholdSnapshot(getSupabaseClient()),
    );
    setMealPlanHouseholdId(householdId);
    return householdId;
  }, []);
  const loadCurrentMealCart = useCallback(async () => {
    const repository = createMealPlanningRepository();
    return loadCurrentHouseholdMealCart(
      () => getHouseholdSnapshot(getSupabaseClient()),
      (householdId) => repository.getMealCart(householdId),
    );
  }, []);
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
          setSharedCart(null);
          return;
        }
        try {
          const latest = await loadCurrentMealCart();
          if (!cancelled) {
            setMealPlanHouseholdId(latest.householdId);
            setSharedCart(latest.cart);
          }
        } catch {
          // Preserve the last truthful projection while refreshing fails.
        }
      };
      void loadMealPlan();
      return () => {
        cancelled = true;
      };
    }, [loadCurrentMealCart, userId]),
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
  const filtered = useMemo(() => {
    const inventoryForView = likedOnly
      ? visibleInventory.filter((projection) =>
          favoriteRecipeIds.includes(projection.recipe.id),
        )
      : visibleInventory;
    return filterRecipeInventory(inventoryForView, {
      query: "",
      filters: deferredFilters,
      sort,
    });
  }, [deferredFilters, favoriteRecipeIds, likedOnly, sort, visibleInventory]);
  const editorialPlacements = useMemo(
    () => getMealEditorialEdition().placements,
    [],
  );
  const dinerSummary = mealPreferences?.usualDinerCount
    ? `${mealPreferences.usualDinerCount} ${mealPreferences.usualDinerCount === 1 ? "person" : "people"}`
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
  const refreshFromPull = useCallback(() => {
    setPullRefreshing(true);
    void refresh().finally(() => {
      setPullRefreshing(false);
    });
  }, [refresh]);
  const mealPlanCount = sharedCart?.activeCount ?? 0;
  const planPersonId = sharedCart?.viewer.personId ?? null;
  const foodGuideStep = foodFirstCycleStepFromCheckpoint(foodGuideCheckpoint);
  const showPickMealGuide = shouldShowPickMealGuide({
    routeOnboarding: route.params?.onboarding,
    foodGuideCheckpoint,
    hasRecipes: filtered.length > 0,
  });
  const dismissPickMealGuide = useCallback(() => {
    navigation.setParams({ onboarding: undefined });
    if (userId) dispatchCapabilityOnboarding(userId, {
      type: 'checkpoint',
      checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS.dismissed,
      now: Date.now(),
    });
  }, [dispatchCapabilityOnboarding, navigation, userId]);
  const hasReadyRecipe = Boolean(sharedCart?.candidates.some((candidate) => candidate.lifecycle === "ready"));
  useEffect(() => {
    let cancelled = false;
    setPlanEducationLoaded(false);
    void Promise.all([
      groceryEducation.hasSeenSentRecipeRemoval(planPersonId),
      groceryEducation.hasSeenReadyPlan(planPersonId),
    ]).then(([removalSeen, readySeen]) => {
      if (!cancelled) {
        setHasSeenSentRemoval(removalSeen);
        setHasSeenReadyPlan(readySeen);
      }
    }).catch(() => {
      if (!cancelled) {
        setHasSeenSentRemoval(true);
        setHasSeenReadyPlan(true);
      }
    }).finally(() => {
      if (!cancelled) setPlanEducationLoaded(true);
    });
    return () => { cancelled = true; };
  }, [planPersonId]);
  useEffect(() => {
    if (!route.params?.openPlan) return;
    setPlanBrowsing(true);
    setHasSeenReadyPlan(true);
    void groceryEducation.markReadyPlanSeen(planPersonId).catch(() => undefined);
    navigation.setParams({ openPlan: undefined });
  }, [navigation, planPersonId, route.params?.openPlan]);
  useFocusEffect(useCallback(() => {
    if (!userId) {
      setMealPlanNeedsAttention(false);
      return undefined;
    }
    let cancelled = false;
    void mealPlanAttentionRepository.getAttentionStatus()
      .then((status) => {
        if (!cancelled) setMealPlanNeedsAttention(status.needsAttention);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [mealPlanAttentionRepository, userId]));
  useEffect(() => {
    if (!planBrowsing || !sharedCart?.planId) return;
    const targetPlanId = route.params?.planId?.trim();
    if (targetPlanId && targetPlanId !== sharedCart.planId) return;
    void mealPlanAttentionRepository.markPlanViewed(sharedCart.planId)
      .then(() => {
        setMealPlanNeedsAttention(false);
        if (targetPlanId) navigation.setParams({ planId: undefined });
      })
      .catch(() => undefined);
  }, [mealPlanAttentionRepository, navigation, planBrowsing, route.params?.planId, sharedCart?.planId]);
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
        lifecycle: candidate.lifecycle,
        createdAt: candidate.createdAt,
        sentAt: candidate.sentAt,
        voteCount: candidate.voteCount,
        downvoteCount: candidate.downvoteCount,
        hardPassCount: candidate.hardPassCount,
        requiresHardPassReview: candidate.requiresHardPassReview,
        reactionCounts: candidate.reactionCounts,
        missingItemCount: candidate.missingItemCount,
        contributor: candidate.contributor,
        supporters: candidate.supporters,
        viewerReaction: candidate.viewerReaction,
        viewerReactionReason: candidate.viewerReactionReason,
        canReact: candidate.canReact,
        canRemove: candidate.canRemove,
        canMarkMade: candidate.canMarkMade,
      };
    });
  }, [sharedCart]);
  const mealPlanIdeaRecommendations = useMemo(
    () => buildMealPlanIdeaRecommendations({
      recipes: visibleInventory,
      favoriteRecipeIds: new Set(favoriteRecipeIds),
      existingRecipeVersionIds: new Set(
        sharedCart?.candidates.flatMap((candidate) =>
          typeof candidate.recipeSnapshot?.recipeVersionId === "string"
            ? [candidate.recipeSnapshot.recipeVersionId]
            : [],
        ) ?? [],
      ),
      limit: 3,
      planningContext: recommendationPlanningContext,
    }),
    [
      favoriteRecipeIds,
      recommendationPlanningContext,
      sharedCart?.candidates,
      visibleInventory,
    ],
  );
  const reloadSharedCart = useCallback(async () => {
    const next = await loadCurrentMealCart();
    setMealPlanHouseholdId(next.householdId);
    setSharedCart(next.cart);
    if (!next.cart) throw new Error('The Plan is not available yet.');
    return next.cart;
  }, [loadCurrentMealCart]);
  const getIdeasFromKwilt = useCallback(async (): Promise<boolean> => {
    if (gettingKwiltIdeas || planMutationBusy || !mealPlanIdeaRecommendations.length) return false;
    setGettingKwiltIdeas(true);
    setPlanMutationBusy(true);
    try {
      const repository = createMealPlanningRepository();
      const householdId = await resolveMealPlanHouseholdId();
      const { candidateIds } = await addRecipeRecommendationsToSharedMealCart({
        householdId,
        projections: mealPlanIdeaRecommendations.map(({ projection }) => projection),
        plannedPortions: defaultServings,
        createCandidateId: Crypto.randomUUID,
        repository,
        reloadCart: reloadSharedCart,
      });
      const addedCount = candidateIds.length;
      capture(AnalyticsEvent.MealCandidatesPrepared, {
        candidate_count: addedCount,
        method: "ideas_drawer_recommended",
      });
      showToast({
        message: `Added ${addedCount} ${addedCount === 1 ? "idea" : "ideas"}`,
        durationMs: 6000,
        actionLabel: "Undo",
        actionOnPress: () => {
          void withdrawMealCandidatesFromSharedMealCart({
            householdId,
            candidateIds,
            repository: createMealPlanningRepository(),
            reloadCart: reloadSharedCart,
          }).catch(() => {
            showToast({ message: "Couldn’t undo that change", variant: "warning" });
          });
        },
      });
      return true;
    } catch (caught) {
      await reloadSharedCart().catch(() => undefined);
      Alert.alert(
        "Ideas not added",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
      return false;
    } finally {
      setGettingKwiltIdeas(false);
      setPlanMutationBusy(false);
    }
  }, [
    capture,
    defaultServings,
    gettingKwiltIdeas,
    mealPlanIdeaRecommendations,
    planMutationBusy,
    reloadSharedCart,
    resolveMealPlanHouseholdId,
    showToast,
  ]);
  const refreshGuestFeedback = useCallback(async () => {
    const planId = sharedCart?.planId;
    if (!planId) {
      setGuestFeedbackSummary(null);
      setActiveGuestInviteIds([]);
      return;
    }
    const summary = await createMealPlanningRepository().getGuestFeedbackSummary(planId);
    setGuestFeedbackSummary(summary);
    setActiveGuestInviteIds(summary.invites
      .filter((invite) => invite.state === "active")
      .map((invite) => invite.id));
  }, [sharedCart?.planId]);
  useEffect(() => {
    if (!sharedCart?.planId) {
      setGuestInvitation(null);
      setGuestFeedbackSummary(null);
      setActiveGuestInviteIds([]);
      return undefined;
    }
    let cancelled = false;
    void refreshGuestFeedback()
      .catch(() => {
        if (!cancelled) {
          setGuestFeedbackSummary(null);
          setActiveGuestInviteIds([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshGuestFeedback, sharedCart?.planId]);
  useEffect(() => {
    return createMealPlanningRepository().subscribe(() => {
      void reloadSharedCart().catch(() => undefined);
      void refreshGuestFeedback().catch(() => undefined);
    });
  }, [refreshGuestFeedback, reloadSharedCart]);
  const toggleMealInPlan = useCallback(
    async (projection: RecipeProjection) => {
      if (planMutationBusy) return;
      const existing = sharedCart?.candidates.find((candidate) => candidate.kind === "recipe" && candidate.recipeSnapshot?.recipeVersionId === projection.currentVersion.id);
      if (existing && existing.lifecycle !== "idea") {
        setPlanBrowsing(true);
        return;
      }
      setPlanMutationBusy(true);
      try {
        const repository = createMealPlanningRepository();
        const householdId = await resolveMealPlanHouseholdId();
        const result = await toggleRecipeInSharedMealCart({
          cart: sharedCart,
          householdId,
          projection,
          recipeScaleMultiplier: 1,
          plannedPortions: defaultServings,
          candidateId: Crypto.randomUUID(),
          repository,
          reloadCart: reloadSharedCart,
        });
        setSharedCart(result.cart);
        if (result.selected) {
          showToast({
            message: "Added to Ideas in your meal plan",
            durationMs: 2400,
          });
          if (foodGuideStep === 'choose-recipe' && userId) {
            dispatchCapabilityOnboarding(userId, {
              type: 'checkpoint',
              checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['share-plan'],
              now: Date.now(),
            });
          }
        }
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
    [defaultServings, dispatchCapabilityOnboarding, foodGuideStep, planMutationBusy, reloadSharedCart, resolveMealPlanHouseholdId, sharedCart, showToast, userId],
  );
  const removeCandidate = useCallback(async (item: MealPlanTrayItem, keepGroceries = false) => {
    if (!sharedCart?.planId || !sharedCart.version || planMutationBusy) return;
    setPlanMutationBusy(true);
    try {
      const repository = createMealPlanningRepository();
      if (item.lifecycle === "idea") await repository.withdrawMealCandidate(sharedCart.householdId, item.candidateId);
      else if (keepGroceries) await repository.keepGroceriesAndRemoveSharedCandidate(item.candidateId, sharedCart.version);
      else await repository.removeSentSharedCandidate(sharedCart.planId, sharedCart.version, item.candidateId);
      const nextCart = await reloadSharedCart();
      if (nextCart.activeCount === 0) setPlanBrowsing(false);
    } catch (caught) {
      Alert.alert("Plan not updated", caught instanceof Error ? caught.message : "Try again in a moment.");
    } finally {
      setPlanMutationBusy(false);
      setPendingRemoval(null);
    }
  }, [planMutationBusy, reloadSharedCart, sharedCart]);
  const setCandidateReaction = useCallback(async (
    candidateId: string,
    reaction: PlanReaction | null,
    reason: string | null = null,
  ) => {
    if (reactingCandidateIdsRef.current.has(candidateId)) return;
    reactingCandidateIdsRef.current.add(candidateId);
    setReactingCandidateIds(new Set(reactingCandidateIdsRef.current));
    const previousReaction = sharedCart?.candidates.find((candidate) => candidate.id === candidateId)?.viewerReaction ?? null;
    const previousReason = sharedCart?.candidates.find((candidate) => candidate.id === candidateId)?.viewerReactionReason ?? null;
    setSharedCart((current) => current ? optimisticallySetSharedMealReaction(current, candidateId, reaction, reason) : current);
    try {
      await createMealPlanningRepository().setSharedReaction(candidateId, reaction, reason);
      await reloadSharedCart();
    } catch (caught) {
      setSharedCart((current) => current
        ? optimisticallySetSharedMealReaction(current, candidateId, previousReaction, previousReason)
        : current);
      const message = caught instanceof Error && caught.message.includes('shared_text_not_allowed')
        ? 'That wording can’t be shared. Change it and try again.'
        : caught instanceof Error ? caught.message : "Try again in a moment.";
      Alert.alert("Plan not updated", message);
    } finally {
      reactingCandidateIdsRef.current.delete(candidateId);
      setReactingCandidateIds(new Set(reactingCandidateIdsRef.current));
    }
  }, [reloadSharedCart, sharedCart]);
  const sendToGroceries = useCallback(async (
    candidateIds: string[],
    options?: { acknowledgeHardPasses?: boolean },
  ) => {
    if (!sharedCart?.planId || !sharedCart.version || planMutationBusy || !candidateIds.length) return null;
    setPlanMutationBusy(true);
    try {
      const receipt = await createMealPlanningRepository().sendSharedCandidates(
        sharedCart.planId,
        sharedCart.version,
        candidateIds,
        options,
      );
      await reloadSharedCart();
      const movedMeal = sharedCart.candidates.find((candidate) => candidate.id === candidateIds[0]);
      if (candidateIds.length === 1 && movedMeal) {
        useToastStore.getState().showToast({
          message: `${movedMeal.title} moved to Planned`,
          actionLabel: "Undo",
          actionOnPress: () => {
            void createMealPlanningRepository()
              .returnSharedCandidateToPlan(sharedCart.planId!, receipt.version, movedMeal.id)
              .then(() => reloadSharedCart())
              .catch(() => useToastStore.getState().showToast({ message: "Couldn’t undo that change", variant: "warning" }));
          },
        });
      }
      return receipt;
    } catch (caught) {
      Alert.alert("Meal not planned", caught instanceof Error ? caught.message : "Try again in a moment.");
    } finally {
      setPlanMutationBusy(false);
    }
    return null;
  }, [planMutationBusy, reloadSharedCart, sharedCart]);
  const returnCandidateToPlan = useCallback(async (candidateId: string) => {
    if (!sharedCart?.planId || !sharedCart.version || planMutationBusy) return null;
    const movedMeal = sharedCart.candidates.find((candidate) => candidate.id === candidateId);
    setPlanMutationBusy(true);
    try {
      const receipt = await createMealPlanningRepository().returnSharedCandidateToPlan(
        sharedCart.planId,
        sharedCart.version,
        candidateId,
      );
      await reloadSharedCart();
      if (movedMeal) {
        useToastStore.getState().showToast({
          message: `${movedMeal.title} returned to Ideas`,
          actionLabel: "Undo",
          actionOnPress: () => {
            void createMealPlanningRepository()
              .sendSharedCandidates(sharedCart.planId!, receipt.version, [candidateId])
              .then(() => reloadSharedCart())
              .catch(() => useToastStore.getState().showToast({ message: "Couldn’t undo that change", variant: "warning" }));
          },
        });
      }
      return receipt;
    } catch (caught) {
      Alert.alert("Meal not returned to Ideas", caught instanceof Error ? caught.message : "Try again in a moment.");
    } finally {
      setPlanMutationBusy(false);
    }
    return null;
  }, [planMutationBusy, reloadSharedCart, sharedCart]);
  const markCandidateMade = useCallback(async (candidateId: string) => {
    if (!sharedCart?.version || planMutationBusy) return;
    setPlanMutationBusy(true);
    try {
      await createMealPlanningRepository().markSharedCandidateMade(candidateId, sharedCart.version);
      await reloadSharedCart();
    } catch (caught) {
      Alert.alert("Recipe not marked Made", caught instanceof Error ? caught.message : "Try again in a moment.");
    } finally {
      setPlanMutationBusy(false);
    }
  }, [planMutationBusy, reloadSharedCart, sharedCart]);
  const sharePlanWithGuest = useCallback(async () => {
    if (!sharedCart?.planId || sharedCart.version == null || guestShareBusy) return;
    setGuestShareBusy(true);
    try {
      const repository = createMealPlanningRepository();
      const invitation = await shareGuestMealPlan({
        planId: sharedCart.planId,
        planVersion: sharedCart.version,
        currentInvitation: guestInvitation,
        createInvite: (input) => repository.createGuestFeedbackInvite(input),
        shareUrl: async (params) => {
          setGuestShareSheetVisible(true);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await shareUrlWithPreview(params);
        },
        onShareSheetDismissStart: () => {
          setGuestShareSheetVisible(false);
        },
      });
      setGuestInvitation(invitation);
      setActiveGuestInviteIds((current) => [...new Set([...current, invitation.inviteId])]);
    } catch (caught) {
      Alert.alert(
        "Could not share Plan",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
    } finally {
      setGuestShareSheetVisible(false);
      setGuestShareBusy(false);
    }
  }, [guestInvitation, guestShareBusy, sharedCart]);
  const turnOffGuestLinks = useCallback(async () => {
    if (!activeGuestInviteIds.length || guestShareBusy) return;
    setGuestShareBusy(true);
    try {
      const repository = createMealPlanningRepository();
      await Promise.all(activeGuestInviteIds.map((inviteId) => repository.revokeGuestFeedbackInvite(inviteId)));
      setActiveGuestInviteIds([]);
      setGuestInvitation(null);
      setGuestFeedbackSummary((current) => current ? {
        ...current,
        invites: current.invites.map((invite) => (
          activeGuestInviteIds.includes(invite.id) ? { ...invite, state: "revoked" } : invite
        )),
      } : current);
      showToast({ message: "Guest link turned off", variant: "success", durationMs: 2000 });
    } catch (caught) {
      Alert.alert(
        "Could not turn off guest link",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
    } finally {
      setGuestShareBusy(false);
    }
  }, [activeGuestInviteIds, guestShareBusy, showToast]);
  const openMealSearch = useCallback(
    () => useAppStore.getState().openGlobalSearch({
      initialScope: "recipes",
      showScopeSelector: false,
    }),
    [],
  );
  const clearFilter = (key: FilterKey) => {
    setFilters((current) => {
      const next = { ...current, [key]: DEFAULT_RECIPE_INVENTORY_FILTERS[key] };
      setBrowseMode(resolveRecipeBrowseMode(next, likedOnly, sort));
      return next;
    });
  };
  const resetInventory = () => {
    setFilters(DEFAULT_RECIPE_INVENTORY_FILTERS);
    setSort("featured");
    setLikedOnly(false);
    setBrowseMode("shelves");
  };
  return (
    <AppShell fullBleedHorizontal>
      <View style={styles.appShellHeaderInset}>
        <PageHeader
          title="Recipes"
          onPressMenu={openMenu}
          moreMenu={
            <MealsOverflowMenu
              hiddenCount={hiddenRecipes.length}
              defaultServings={defaultServings}
              minimumServings={mealPreferences?.usualDinerPersonIds.length ?? 1}
              foodNeedsCount={mealPreferences?.foodNeeds.length ?? 0}
              onOpenHidden={() => setHiddenDrawerVisible(true)}
              onChangeDefaultServings={(servings) => {
                if (mealPreferences) {
                  runPreferenceMutation(setUsualDiners({
                    usualDinerCount: servings,
                    personIds: mealPreferences.usualDinerPersonIds,
                  }), "Usual quantity not saved");
                  return;
                }
                updateUserProfile((current) => ({
                  ...current,
                  preferences: {
                    ...current.preferences,
                    meals: {
                      ...current.preferences?.meals,
                      defaultServings: servings,
                    },
                  },
                }));
              }}
              onOpenFoodNeeds={() => setPreferenceDrawer("food_needs")}
            />
          }
          rightElement={
            <MealPlanHeaderAction
              ref={planHeaderRef}
              count={mealPlanCount}
              needsAttention={mealPlanNeedsAttention}
              onPress={() => setPlanBrowsing(true)}
            />
          }
        />
      </View>
      <RecipeLibraryView
        key={showPickMealGuide ? 'guided-first-cycle' : 'recipe-library'}
        recipes={filtered}
        onOpen={(recipeId) => {
          navigation.setParams({ onboarding: undefined });
          if (showPickMealGuide && userId) dispatchCapabilityOnboarding(userId, {
            type: 'checkpoint',
            checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['add-to-plan'],
            now: Date.now(),
          });
          navigation.navigate("RecipeHome", { recipeId });
        }}
        onRefresh={refreshFromPull}
        refreshing={pullRefreshing}
        filters={filters}
        sort={sort}
        onOpenFilters={() => setFilterDrawerVisible(true)}
        onOpenSort={() => setSortDrawerVisible(true)}
        onClearFilter={clearFilter}
        likedOnly={likedOnly}
        onToggleLiked={() => {
          const nextLikedOnly = !likedOnly;
          setLikedOnly(nextLikedOnly);
          setBrowseMode(resolveRecipeBrowseMode(filters, nextLikedOnly, sort));
        }}
        onReset={resetInventory}
        browseMode={browseMode}
        onSeeAll={(next) => {
          setFilters(next);
          setBrowseMode(resolveRecipeBrowseMode(next, likedOnly, sort));
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
        recommendationPlanningContext={recommendationPlanningContext}
        onboardingTargetRef={onboardingRecipeRef}
      />
      <Coachmark
        visible={showPickMealGuide}
        targetRef={onboardingRecipeRef}
        title={<Text style={{ fontWeight: "700" }}>Add to your meal plan</Text>}
        body={<Text tone="secondary">Tap + on any recipe. It’ll start in Ideas; move it to Planned when you’re ready.</Text>}
        actions={[{ id: "dismiss", label: "I’ll look around", variant: "ghost" }]}
        spotlight="hole"
        spotlightRadius={18}
        attentionPulse
        placement="below"
        onAction={dismissPickMealGuide}
        onDismiss={dismissPickMealGuide}
      />
      {planBrowsing ? (
        <MealPlanDrawer
          visible
          items={mealPlanTrayItems}
          canManage={Boolean(sharedCart?.viewer.canManage)}
          onClose={() => setPlanBrowsing(false)}
          onRemove={(item) => {
            if (item.lifecycle === "idea") void removeCandidate(item);
            else if (planEducationLoaded && hasSeenSentRemoval) void removeCandidate(item);
            else setPendingRemoval(item);
          }}
          currentPersonId={sharedCart?.viewer.personId ?? null}
          onReact={(candidateId, reaction, reason) => { void setCandidateReaction(candidateId, reaction, reason); }}
          reactingCandidateIds={reactingCandidateIds}
          guideStep={foodGuideStep === 'share-plan' || foodGuideStep === 'send-to-groceries'
            ? foodGuideStep
            : null}
          onGuideAdvance={() => {
            if (!userId) return;
            dispatchCapabilityOnboarding(userId, {
              type: 'checkpoint',
              checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['send-to-groceries'],
              now: Date.now(),
            });
          }}
          onSharePlan={sharedCart?.planId && sharedCart.version != null && sharedCart.viewer.canManage && sharedCart.candidates.length
            ? () => { void sharePlanWithGuest(); }
            : undefined}
          guestSuggestions={guestFeedbackSummary?.invites.flatMap((invite) => invite.responses
            .filter((response): response is typeof response & { suggestion: string } => Boolean(response.suggestion))
            .map((response) => ({
              id: response.id,
              displayName: response.displayName,
              suggestion: response.suggestion,
            }))) ?? []}
          shareBusy={guestShareBusy}
          shareSheetVisible={guestShareSheetVisible}
          hasActiveGuestLink={activeGuestInviteIds.length > 0}
          onTurnOffGuestLink={activeGuestInviteIds.length ? () => { void turnOffGuestLinks(); } : undefined}
          onSafetyHidden={() => {
            void Promise.all([reloadSharedCart(), refreshGuestFeedback()]);
          }}
          onSendToGroceries={(candidateIds, options) => (
            sendToGroceries(candidateIds, options).then((receipt) => {
              if (!receipt) return;
              if (foodGuideStep === 'send-to-groceries' && userId) {
                dispatchCapabilityOnboarding(userId, {
                  type: 'checkpoint',
                  checkpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['review-groceries'],
                  now: Date.now(),
                });
                setPlanBrowsing(false);
                navigation.navigate('GroceryList', { listId: receipt.groceryListId });
              }
              return receipt;
            })
          )}
          onReturnToPlan={returnCandidateToPlan}
          onMarkMade={(candidateId) => { void markCandidateMade(candidateId); }}
          onGetIdeas={userId && mealPlanIdeaRecommendations.length > 0 && (
            sharedCart?.viewer.canAdd ?? mealPlanHouseholdId === null
          ) ? getIdeasFromKwilt : undefined}
          gettingIdeas={gettingKwiltIdeas}
          getIdeasDisabled={planMutationBusy && !gettingKwiltIdeas}
          onOpenGroceries={() => {
            if (!sharedCart?.groceryListId) return;
            setPlanBrowsing(false);
            navigation.navigate("GroceryList", { listId: sharedCart.groceryListId });
          }}
        />
      ) : (
        <RecipeInventoryDock
          onAdd={() => setCaptureDrawerVisible(true)}
          onSearch={openMealSearch}
          onAsk={() => setMealChatVisible(true)}
        />
      )}
      <Coachmark
        visible={planEducationLoaded && hasReadyRecipe && !hasSeenReadyPlan && !planBrowsing && pendingRemoval === null}
        targetRef={planHeaderRef}
        title={<Text style={{ fontWeight: "700" }}>Your recipes are ready</Text>}
        body={<Text tone="secondary">Find what you planned here when you’re ready to cook.</Text>}
        actions={[{ id: "view", label: "View Plan", variant: "accent" }]}
        spotlight="hole"
        spotlightRadius="auto"
        highlightColor={colors.textPrimary}
        actionColor={colors.textPrimary}
        placement="below"
        onAction={() => {
          setHasSeenReadyPlan(true);
          void groceryEducation.markReadyPlanSeen(planPersonId).catch(() => undefined);
          setPlanBrowsing(true);
        }}
        onDismiss={() => {
          setHasSeenReadyPlan(true);
          void groceryEducation.markReadyPlanSeen(planPersonId).catch(() => undefined);
        }}
      />
      <AlertDialog
        visible={pendingRemoval !== null}
        title="Remove this recipe from Plan?"
        description="Its unpurchased grocery contribution will also be removed. Purchased items stay in your grocery history."
        cancelLabel="Keep grocery items"
        actionLabel="Remove recipe + groceries"
        onClose={() => setPendingRemoval(null)}
        onCancel={() => {
          setHasSeenSentRemoval(true);
          void groceryEducation.markSentRecipeRemovalSeen(planPersonId).catch(() => undefined);
          if (pendingRemoval) void removeCandidate(pendingRemoval, true);
        }}
        onAction={() => {
          setHasSeenSentRemoval(true);
          void groceryEducation.markSentRecipeRemovalSeen(planPersonId).catch(() => undefined);
          if (pendingRemoval) void removeCandidate(pendingRemoval, false);
        }}
        disabled={planMutationBusy}
      />
      <RecipeFilterDrawer
        visible={filterDrawerVisible}
        value={filters}
        updating={filterUpdating}
        onClose={() => setFilterDrawerVisible(false)}
        onChange={(next) => {
          setFilters(next);
          setBrowseMode(resolveRecipeBrowseMode(next, likedOnly, sort));
        }}
      />
      <RecipeSortDrawer
        visible={sortDrawerVisible}
        value={sort}
        onClose={() => setSortDrawerVisible(false)}
        onChange={(next) => {
          setSort(next);
          setBrowseMode(resolveRecipeBrowseMode(filters, likedOnly, next));
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
        usualDinerCount={mealPreferences?.usualDinerCount ?? defaultServings}
        selectedPersonIds={mealPreferences?.usualDinerPersonIds ?? []}
        onClose={() => setPreferenceDrawer(null)}
        onSave={(input) => {
          runPreferenceMutation(
            setUsualDiners(input),
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
        scopeLabel="Recipes"
        source="meals_inventory_contextual_drawer"
        threadId={mealChatThreadId}
        onThreadIdChange={setMealChatThreadId}
      />
    </AppShell>
  );
}

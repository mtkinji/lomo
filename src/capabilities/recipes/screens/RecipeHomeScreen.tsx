import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Crypto from "expo-crypto";
import {
  Alert,
  Animated,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing } from "../../../theme";
import { SplitActionDock } from "../../../ui/SplitActionDock";
import { Icon } from "../../../ui/Icon";
import { AppShell } from "../../../ui/layout/AppShell";
import {
  HeaderActionPill,
  ObjectPageHeader,
} from "../../../ui/layout/ObjectPageHeader";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { ObjectDetailMediaShell } from "../../../ui/layout/ObjectDetailMediaShell";
import { Heading, Text } from "../../../ui/Typography";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { createMealPlanningRepository } from "../../meal-planning/data/mealPlanningRepository";
import type { MealPlanProjection } from "../../meal-planning/data/mealPlanningRepository";
import type { SharedMealCartProjection } from "../../meal-planning/domain/sharedMealCart";
import { mealPlanningCache } from "../../meal-planning/data/mealPlanningCache";
import { getActiveMealPlan } from "../../meal-planning/domain/mealPlanPresentation";
import { RecipeActionsMenu } from "../components/RecipeActionsMenu";
import { RecipeArtworkGallery } from "../components/RecipeArtworkGallery";
import { RecipeHero } from "../components/RecipeHero";
import { RecipeIngredientList } from "../components/RecipeIngredientList";
import { RecipeMethodPreview } from "../components/RecipeMethodPreview";
import { RecipeRecommendationsSection } from "../components/RecipeRecommendationsSection";
import { RecipeSummaryBar } from "../components/RecipeSummaryBar";
import type { RecipeProjection } from "../data/recipeCache";
import { exportRecipeMarkdown } from "../recipeExport";
import { useRecipeStore } from "../runtime/useRecipeStore";
import { useAppStore } from "../../../store/useAppStore";
import { useToastStore } from "../../../store/useToastStore";
import { recipeCookCache } from "../data/recipeCookCache";
import type { RecipeCookSession } from "../domain/recipeCookContracts";
import {
  createRecipeCookRepository,
  type RecipeCookRecordProjection,
} from "../data/recipeCookRepository";
import {
  getStarterRecipeMetadata,
  buildRecipeLibraryInventory,
  isStarterRecipe,
  STARTER_RECIPE_PROJECTIONS,
} from "../data/starterRecipeCatalog";
import {
  buildContextualRecipeRecommendations,
  type RecipeRecommendation,
} from "../domain/recipeRecommendations";
import { resolveDefaultMealServings } from "../domain/mealPreferences";
import { canHideRecipe } from "../domain/hiddenRecipes";
import { useHiddenRecipeStore } from "../runtime/useHiddenRecipeStore";
import { useRecipeFavoriteStore } from "../runtime/useRecipeFavoriteStore";
import { resolveAvailableRecipe } from "../data/resolveAvailableRecipe";
import {
  sharedMealCartContainsRecipeVersion,
  toggleRecipeInSharedMealCart,
} from "../domain/mealPlanSelection";
import { getHouseholdSnapshot } from "../../../features/household/data/household";
import { getSupabaseClient } from "../../../services/backend/supabaseClient";
import { createGroceryRepository } from "../../groceries/data/groceryRepository";
import {
  deriveRecipeNextActions,
  type RecipeNextAction,
  type RecipeNextActionId,
} from "../domain/recipeNextAction";
import { UnifiedChatDrawer } from "../../../features/unifiedChat/UnifiedChatDrawer";
import type { UnifiedChatLaunchContext } from "../../../features/unifiedChat/launchContext";

type HideToast = {
  message: string;
  actionLabel?: string;
  actionOnPress?: () => void | Promise<void>;
};

export async function hideCatalogMeal({
  recipeId,
  setHidden,
  onHidden,
  onError,
  onUndoError,
  showToast,
}: {
  recipeId: string;
  setHidden(recipeId: string, hidden: boolean): Promise<void>;
  onHidden(): void;
  onError(error: Error): void;
  onUndoError?(error: Error): void;
  showToast(toast: HideToast): void;
}): Promise<void> {
  try {
    await setHidden(recipeId, true);
    onHidden();
    showToast({
      message: "Hidden from your recipes",
      actionLabel: "Undo",
      actionOnPress: async () => {
        try {
          await setHidden(recipeId, false);
        } catch (caught) {
          onUndoError?.(
            caught instanceof Error ? caught : new Error(String(caught)),
          );
        }
      },
    });
  } catch (caught) {
    onError(caught instanceof Error ? caught : new Error(String(caught)));
  }
}

export function RecipeHeaderActions({
  isFavorite,
  favoriteBusy,
  hideAvailable,
  onToggleFavorite,
  onHide,
  onShare,
}: {
  isFavorite: boolean;
  favoriteBusy: boolean;
  hideAvailable: boolean;
  onToggleFavorite(): void;
  onHide(): void;
  onShare(): void;
}) {
  return (
    <View style={styles.headerActions}>
      <HeaderActionPill
        accessibilityLabel="Share recipe"
        materialVariant="floatingWhite"
        onPress={onShare}
      >
        <Icon name="share" size={18} color={colors.textPrimary} />
      </HeaderActionPill>
      {hideAvailable ? (
        <HeaderActionPill
          accessibilityLabel="Not for us — hide this meal"
          materialVariant="floatingWhite"
          onPress={onHide}
        >
          <Icon name="thumbsDown" size={18} color={colors.textPrimary} />
        </HeaderActionPill>
      ) : null}
      <HeaderActionPill
        accessibilityLabel={isFavorite ? "Unlike this meal" : "Like this meal"}
        accessibilityState={{ selected: isFavorite }}
        disabled={favoriteBusy}
        materialVariant="floatingWhite"
        onPress={onToggleFavorite}
      >
        <Icon
          name="thumbsUp"
          size={18}
          color={colors.textPrimary}
          fill={isFavorite ? colors.textPrimary : "none"}
        />
      </HeaderActionPill>
    </View>
  );
}

export function RecipeHomeView({
  projection,
  servings,
  checkedIngredients = new Set<string>(),
  priorLearning = null,
  cookCount = 0,
  syncPending = false,
  recommendedAction,
  menuActions,
  actionBusy,
  showMoreActions = true,
  recommendations = [],
  onServingsChange,
  onToggleIngredient = () => undefined,
  onDockAction,
  onMore,
  onChat = () => undefined,
  onOpenRecipe = () => undefined,
}: {
  projection: RecipeProjection;
  servings: number;
  checkedIngredients?: Set<string>;
  priorLearning?: RecipeCookRecordProjection | null;
  cookCount?: number;
  syncPending?: boolean;
  recommendedAction: RecipeNextAction;
  menuActions: RecipeNextAction[];
  actionBusy: boolean;
  showMoreActions?: boolean;
  recommendations?: RecipeRecommendation[];
  onServingsChange(value: number): void;
  onToggleIngredient?(id: string): void;
  onDockAction(actionId: RecipeNextActionId, source: "primary" | "menu"): void;
  onMore(): void;
  onChat?(): void;
  onOpenRecipe?(recipeId: string): void;
}) {
  const { recipe, currentVersion: version } = projection;
  const starterMetadata = getStarterRecipeMetadata(recipe.id);
  const familyLabel =
    recipe.credits.find((credit) => credit.role === "family_source")
      ?.displayLabel ?? null;
  const notesLabel =
    recipe.provenance.rightsBasis === "kwilt_authored"
      ? "About this meal"
      : "Notes";
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 116 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        <ObjectDetailMediaShell
          variant="immersive"
          scrollY={scrollY}
          headerBoundary={insets.top + 64}
          hero={
            <RecipeArtworkGallery
              mediaAssets={recipe.mediaAssets}
              recipeTitle={version.title}
              exposeArtworkToAccessibility
              fallback={
                <RecipeHero
                  media={null}
                  familyLabel={familyLabel}
                  style={styles.heroFullBleed}
                />
              }
              testID="recipe-home-gallery"
              style={styles.heroFullBleed}
            />
          }
          sheetInnerStyle={styles.recipeSheetInner}
        >
          <View style={styles.headingRow}>
            <View style={styles.heading}>
              <Heading variant="lg">{version.title}</Heading>
              {version.description ? (
                <Text tone="secondary">{version.description}</Text>
              ) : null}
            </View>
            {showMoreActions ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recipe actions"
                hitSlop={8}
                onPress={onMore}
                style={({ pressed }) => [
                  styles.recipeActionsButton,
                  pressed ? styles.recipeActionsPressed : null,
                ]}
              >
                <Icon name="more" size={22} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <RecipeSummaryBar
            prepMinutes={version.prepMinutes}
            cookMinutes={version.cookMinutes}
            inactiveMinutes={starterMetadata?.inactiveMinutes}
            yieldQuantity={version.yieldQuantity}
            servings={servings}
            onServingsChange={onServingsChange}
          />
          {priorLearning &&
          (priorLearning.privateNote ||
            priorLearning.wouldMakeAgain !== null ||
            priorLearning.outcomeRating !== null ||
            priorLearning.substitutions.length > 0) ? (
            <View style={styles.learning}>
              <Text variant="label">From your last cook</Text>
              {cookCount > 0 ? (
                <Text tone="secondary">
                  Cooked {cookCount} {cookCount === 1 ? "time" : "times"}
                </Text>
              ) : null}
              {priorLearning.outcomeRating !== null ? (
                <Text>You rated this cook {priorLearning.outcomeRating} out of 5.</Text>
              ) : null}
              {priorLearning.privateNote ? (
                <Text>{priorLearning.privateNote}</Text>
              ) : null}
              {priorLearning.wouldMakeAgain === true ? (
                <Text tone="secondary">You said you’d make this again.</Text>
              ) : priorLearning.wouldMakeAgain === false ? (
                <Text tone="secondary">
                  You said this one wasn’t a repeat yet.
                </Text>
              ) : null}
              {priorLearning.substitutions.map((substitution) => (
                <View key={substitution.id} style={styles.learningSubstitution}>
                  <Text>
                    Last time you used {substitution.usedInstead} instead of {substitution.ingredientText}.
                  </Text>
                  {substitution.resultRating !== null || substitution.note ? (
                    <Text tone="secondary">
                      {substitution.resultRating !== null
                        ? `That substitution was ${substitution.resultRating} out of 5`
                        : "Substitution note"}
                      {substitution.note ? ` · ${substitution.note}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))}
              <Text tone="secondary">
                Private Cook record ·{" "}
                {new Date(priorLearning.completedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
          <RecipeIngredientList
            lines={version.ingredients}
            fromYield={version.yieldQuantity}
            toYield={servings}
            checked={checkedIngredients}
            onToggle={onToggleIngredient}
          />
          <RecipeMethodPreview steps={version.instructions} />
          {version.notes ? (
            <View style={styles.note}>
              <Text variant="label">{notesLabel}</Text>
              <Text>{version.notes}</Text>
            </View>
          ) : null}
          <View style={styles.provenance}>
            {syncPending ? (
              <Text tone="secondary">Saved on this device · Will sync when connected</Text>
            ) : null}
            <Text variant="label">Source</Text>
            <Text tone="secondary">
              {recipe.provenance.sourceTitle ??
                recipe.provenance.sourceAuthor ??
                "Added by you"}{" "}
              · Version {version.version}
            </Text>
            {familyLabel ? (
              <Text tone="secondary">Family recipe from {familyLabel}</Text>
            ) : null}
            <Text tone="secondary">
              {recipe.provenance.rightsBasis === "kwilt_authored"
                ? "Included with Kwilt"
                : recipe.accessGrants.some((grant) => grant.status === "active")
                  ? "Shared with specific people"
                  : "Private to you"}
            </Text>
          </View>
          <RecipeRecommendationsSection
            recommendations={recommendations}
            onOpenRecipe={onOpenRecipe}
          />
        </ObjectDetailMediaShell>
      </Animated.ScrollView>
      <SplitActionDock
        recommendedAction={recommendedAction}
        menuActions={menuActions}
        onActionPress={onDockAction}
        disabledActionIds={actionBusy
          ? Object.fromEntries([recommendedAction, ...menuActions].map((action) => [action.id, true]))
          : undefined}
        menuAccessibilityLabel="Show other Meal actions"
        primaryTestID="recipe-next-action-primary"
        menuTriggerTestID="recipe-next-action-menu"
        getMenuTestID={(actionId) => `recipe-next-action-${actionId}`}
        rightItem={{
          id: "recipe-chat",
          icon: "navAiGuide",
          accessibilityLabel: "Chat about this meal",
          onPress: onChat,
          testID: "recipe-contextual-chat",
        }}
      />
    </View>
  );
}

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeHome">;
export function RecipeHomeScreen({ navigation, route }: Props) {
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const projection = resolveAvailableRecipe(
    personalRecipes,
    route.params.recipeId,
    STARTER_RECIPE_PROJECTIONS,
  );
  const starterRecipe = isStarterRecipe(route.params.recipeId);
  const deleteRecipe = useRecipeStore((state) => state.delete);
  const pendingRecipeIds = useRecipeStore((state) => state.pendingRecipeIds);
  const setRecipeHidden = useHiddenRecipeStore((state) => state.setHidden);
  const hiddenRecipeIds = useHiddenRecipeStore((state) => state.recipeIds);
  const favoriteRecipeIds = useRecipeFavoriteStore((state) => state.recipeIds);
  const togglingFavoriteRecipeIds = useRecipeFavoriteStore(
    (state) => state.togglingRecipeIds,
  );
  const toggleFavorite = useRecipeFavoriteStore((state) => state.toggle);
  const defaultServings = useAppStore((state) =>
    resolveDefaultMealServings(
      state.userProfile?.preferences?.meals?.defaultServings,
    ),
  );
  const [servings, setServings] = useState(defaultServings);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [mealChatVisible, setMealChatVisible] = useState(false);
  const [mealChatThreadId, setMealChatThreadId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<MealPlanProjection | null>(null);
  const [sharedCart, setSharedCart] = useState<SharedMealCartProjection | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [activeCook, setActiveCook] = useState<RecipeCookSession | null>(null);
  const [priorLearning, setPriorLearning] =
    useState<RecipeCookRecordProjection | null>(null);
  const [cookCount, setCookCount] = useState(0);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const { capture } = useAnalytics();
  const mealChatLaunchContext = useMemo<UnifiedChatLaunchContext>(
    () => ({
      capabilityId: "recipes",
      surface: "detail",
      object: { type: "recipe", id: route.params.recipeId },
      returnTarget: {
        name: "Food",
        params: { screen: "RecipeHome", params: { recipeId: route.params.recipeId } },
      },
    }),
    [route.params.recipeId],
  );
  const recommendations = useMemo(
    () =>
      projection
        ? buildContextualRecipeRecommendations({
            current: projection,
            recipes: buildRecipeLibraryInventory(personalRecipes),
            hiddenRecipeIds,
          })
        : [],
    [hiddenRecipeIds, personalRecipes, projection],
  );
  const reloadActivePlan = useCallback(async () => {
    if (!userId) return null;
    const latest = await createMealPlanningRepository().list();
    await mealPlanningCache.write(userId, latest);
    const next = getActiveMealPlan(latest);
    setActivePlan(next);
    return next;
  }, [userId]);
  const reloadSharedCart = useCallback(async () => {
    const household = await getHouseholdSnapshot(getSupabaseClient());
    if (!household.household) throw new Error("Set up your Household before starting a shared Plan.");
    const next = await createMealPlanningRepository().getSharedCart(household.household.id);
    setSharedCart(next);
    return next;
  }, []);
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
          const household = await getHouseholdSnapshot(getSupabaseClient());
          if (household.household) {
            const cart = await createMealPlanningRepository().getSharedCart(household.household.id);
            if (!cancelled) setSharedCart(cart);
          }
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
  useEffect(() => {
    if (projection)
      capture(AnalyticsEvent.RecipeHomeViewed, { source: "recipe_library" });
  }, [capture, projection]);
  useEffect(() => {
    if (userId)
      void recipeCookCache
        .read(userId)
        .then((session) =>
          setActiveCook(
            session?.recipeId === route.params.recipeId &&
              session.recipeVersionId === projection?.currentVersion.id &&
              ["active", "paused"].includes(session.status)
              ? session
              : null,
          ),
        );
  }, [projection?.currentVersion.id, route.params.recipeId, userId]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!userId) {
        setPriorLearning(null);
        setCookCount(0);
        return () => {
          cancelled = true;
        };
      }
      void createRecipeCookRepository()
        .historyForRecipe(route.params.recipeId, 6)
        .then((history) => {
          if (cancelled) return;
          setPriorLearning(history.records[0] ?? null);
          setCookCount(history.cookCount);
        })
        .catch(() => {
          if (cancelled) return;
          setPriorLearning(null);
          setCookCount(0);
        });
      return () => {
        cancelled = true;
      };
    }, [route.params.recipeId, userId]),
  );
  if (!projection)
    return (
      <AppShell>
        <PageHeader title="Recipe" onPressBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Text>This recipe is not available on this device.</Text>
        </View>
      </AppShell>
    );
  const togglePlanMembership = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const repository = createMealPlanningRepository();
      const household = await getHouseholdSnapshot(getSupabaseClient());
      if (!household.household) throw new Error("Set up your Household before starting a shared Plan.");
      const result = await toggleRecipeInSharedMealCart({
        cart: sharedCart,
        householdId: household.household.id,
        projection,
        servings,
        candidateId: Crypto.randomUUID(),
        repository,
        reloadCart: reloadSharedCart,
      });
      setSharedCart(result.cart);
    } catch (caught) {
      Alert.alert(
        "Meal Plan not updated",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
    } finally {
      setActionBusy(false);
    }
  };
  const confirmDelete = () =>
    Alert.alert(
      "Delete recipe?",
      "This removes it from your recipe box. Shared copies are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteRecipe(
              projection.recipe.id,
              projection.currentVersion.version,
            ).then(() => navigation.goBack());
          },
        },
      ],
    );
  const hideMeal = () =>
    hideCatalogMeal({
      recipeId: projection.recipe.id,
      setHidden: setRecipeHidden,
      onHidden: () => navigation.goBack(),
      onError: (caught) =>
        Alert.alert(
          "Meal not hidden",
          caught.message || "Try again in a moment.",
        ),
      onUndoError: () =>
        useToastStore.getState().showToast({
          message: "Couldn’t restore this meal",
          variant: "danger",
        }),
      showToast: (toast) => useToastStore.getState().showToast(toast),
    });
  const isFavorite = favoriteRecipeIds.includes(projection.recipe.id);
  const favoriteBusy = togglingFavoriteRecipeIds.includes(projection.recipe.id);
  const toggleMealFavorite = () => {
    void toggleFavorite(projection.recipe.id).catch((caught) => {
      Alert.alert(
        "Meal preference not updated",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
    });
  };
  const shareRecipe = () => {
    void Share.share({
      title: projection.currentVersion.title,
      message: exportRecipeMarkdown(projection),
    });
  };
  const isInPlan = sharedCart
    ? sharedMealCartContainsRecipeVersion(sharedCart, projection)
    : false;
  const nextActions = deriveRecipeNextActions({
    activeCook: Boolean(activeCook),
    isInPlan,
    planState: activePlan?.state ?? null,
  });
  const openCook = () =>
    activeCook
      ? navigation.navigate("RecipeCookMode", {
          recipeId: projection.recipe.id,
          servings,
        })
      : navigation.navigate("RecipeReadiness", {
          recipeId: projection.recipe.id,
          servings,
        });
  const compileIngredients = async (scope: "recipe" | "meal_plan") => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const repository = createGroceryRepository();
      const receipt = scope === "meal_plan"
        ? await (() => {
            if (!activePlan || activePlan.state !== "finalized")
              throw new Error("Finalize the Meal Plan before compiling all of its ingredients.");
            return repository.compile(activePlan.id, activePlan.version);
          })()
        : await repository.compileRecipe({
            recipeId: projection.recipe.id,
            recipeVersionId: projection.currentVersion.id,
            recipeVersion: projection.currentVersion.version,
            contentHash: projection.currentVersion.contentHash,
            sourceType: projection.recipe.provenance.method,
            title: projection.currentVersion.title,
            yieldQuantity: projection.currentVersion.yieldQuantity,
            ingredients: projection.currentVersion.ingredients.map((line) => ({
              id: line.id,
              originalText: line.originalText,
              optional: line.optional,
            })),
            servings,
          });
      capture(AnalyticsEvent.GroceryListCompiled, {
        outcome: "success",
        replayed: receipt.replayed,
      });
      navigation.navigate("AlreadyHaveReview", { listId: receipt.groceryListId });
    } catch (caught) {
      Alert.alert(
        "Ingredients not ready",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
    } finally {
      setActionBusy(false);
    }
  };
  const handleDockAction = (actionId: RecipeNextActionId) => {
    switch (actionId) {
      case "get_this_meal":
        void compileIngredients("recipe");
        return;
      case "get_meal_plan":
        void compileIngredients("meal_plan");
        return;
      case "review_meal_plan":
        navigation.navigate("NextMeals");
        return;
      case "start_cooking":
      case "continue_cooking":
        openCook();
        return;
      case "add_to_plan":
      case "remove_from_plan":
        void togglePlanMembership();
    }
  };
  return (
    <AppShell fullBleedCanvas>
      <ObjectPageHeader
        showFullWidthBackground={false}
        left={
          <HeaderActionPill
            accessibilityLabel="Back to Recipes"
            materialVariant="floatingWhite"
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrowLeft" size={20} color={colors.textPrimary} />
          </HeaderActionPill>
        }
        right={
          <RecipeHeaderActions
            isFavorite={isFavorite}
            favoriteBusy={favoriteBusy}
            hideAvailable={canHideRecipe(projection)}
            onToggleFavorite={toggleMealFavorite}
            onHide={() => {
              void hideMeal();
            }}
            onShare={shareRecipe}
          />
        }
      />
      <RecipeHomeView
        projection={projection}
        servings={servings}
        checkedIngredients={checkedIngredients}
        priorLearning={priorLearning}
        cookCount={cookCount}
        syncPending={pendingRecipeIds.includes(projection.recipe.id)}
        recommendedAction={nextActions.recommendedAction}
        menuActions={nextActions.menuActions}
        actionBusy={actionBusy}
        showMoreActions={!starterRecipe}
        recommendations={recommendations}
        onServingsChange={setServings}
        onToggleIngredient={(id) =>
          setCheckedIngredients((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onDockAction={handleDockAction}
        onMore={() => setShowMore(true)}
        onChat={() => setMealChatVisible(true)}
        onOpenRecipe={(recipeId) =>
          navigation.push("RecipeHome", { recipeId })
        }
      />
      <RecipeActionsMenu
        visible={showMore}
        onClose={() => setShowMore(false)}
        onEdit={() => {
          setShowMore(false);
          navigation.navigate("RecipeEdit", { recipeId: projection.recipe.id });
        }}
        onDelete={() => {
          setShowMore(false);
          confirmDelete();
        }}
      />
      <UnifiedChatDrawer
        visible={mealChatVisible}
        onClose={() => setMealChatVisible(false)}
        launchContext={mealChatLaunchContext}
        scopeLabel={projection.currentVersion.title}
        source="recipe_detail_contextual_drawer"
        threadId={mealChatThreadId}
        onThreadIdChange={setMealChatThreadId}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { backgroundColor: colors.canvas },
  heroFullBleed: {
    width: "100%",
    height: "100%",
    aspectRatio: undefined,
    borderRadius: 0,
  },
  recipeSheetInner: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing["2xl"],
  },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  heading: { flex: 1, gap: spacing.xs },
  recipeActionsButton: {
    width: 44,
    height: 44,
    marginTop: -spacing.sm,
    marginRight: -spacing.sm,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeActionsPressed: { backgroundColor: colors.cardMuted },
  note: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  learning: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.pine50,
  },
  learningSubstitution: { gap: spacing.xs, paddingTop: spacing.xs },
  provenance: { gap: spacing.xs, paddingTop: spacing.sm },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

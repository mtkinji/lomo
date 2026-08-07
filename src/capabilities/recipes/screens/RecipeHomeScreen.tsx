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
import { Button } from "../../../ui/Button";
import { ActionDock } from "../../../ui/ActionDock";
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
  mealPlanContainsSelectedRecipeVersion,
  toggleRecipeInMealPlan,
} from "../domain/mealPlanSelection";
import { getHouseholdSnapshot } from "../../../features/household/data/household";
import { getSupabaseClient } from "../../../services/backend/supabaseClient";

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
      message: "Hidden from your Meals",
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
  checked,
  priorLearning = null,
  syncPending = false,
  isInPlan,
  planBusy,
  cookActionLabel,
  showMoreActions = true,
  recommendations = [],
  onServingsChange,
  onToggleIngredient,
  onTogglePlan,
  onCook,
  onMore,
  onOpenRecipe = () => undefined,
}: {
  projection: RecipeProjection;
  servings: number;
  checked: Set<string>;
  priorLearning?: RecipeCookRecordProjection | null;
  syncPending?: boolean;
  isInPlan: boolean;
  planBusy: boolean;
  cookActionLabel: "Start cooking" | "Continue cooking";
  showMoreActions?: boolean;
  recommendations?: RecipeRecommendation[];
  onServingsChange(value: number): void;
  onToggleIngredient(id: string): void;
  onTogglePlan(): void;
  onCook(): void;
  onMore(): void;
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
            yieldUnit={version.yieldUnit}
          />
          {priorLearning &&
          (priorLearning.privateNote ||
            priorLearning.wouldMakeAgain !== null) ? (
            <View style={styles.learning}>
              <Text variant="label">From your last cook</Text>
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
              <Text tone="secondary">
                Private Cook record ·{" "}
                {new Date(priorLearning.completedAt).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
          {version.yieldQuantity ? (
            <View style={styles.servings}>
              <Text variant="label">Scale recipe</Text>
              <Button
                size="sm"
                variant="outline"
                disabled={servings <= 1}
                onPress={() => onServingsChange(Math.max(1, servings - 1))}
              >
                −
              </Button>
              <Text>{servings} servings</Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => onServingsChange(servings + 1)}
              >
                +
              </Button>
            </View>
          ) : null}
          <RecipeIngredientList
            lines={version.ingredients}
            fromYield={version.yieldQuantity}
            toYield={servings}
            checked={checked}
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
      <ActionDock
        insetX={spacing.md}
        insetBottom={spacing.sm}
        safeAreaLift="half"
        leftContent={
          <Pressable
            accessibilityRole="button"
            testID="recipe-start-cooking"
            onPress={onCook}
            style={({ pressed }) => [
              styles.cookDockAction,
              pressed ? styles.dockPressed : null,
            ]}
          >
            <Icon name="play" size={20} color={colors.textPrimary} />
            <Text variant="label">{cookActionLabel}</Text>
          </Pressable>
        }
        rightItem={{
          id: "meal-plan",
          icon: isInPlan ? "check" : "plus",
          accessibilityLabel: isInPlan
            ? "Remove this meal from the Plan"
            : "Add this meal to the Plan",
          disabled: planBusy,
          testID: "recipe-plan-toggle",
          onPress: onTogglePlan,
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
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [activePlan, setActivePlan] = useState<MealPlanProjection | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [activeCook, setActiveCook] = useState<RecipeCookSession | null>(null);
  const [priorLearning, setPriorLearning] =
    useState<RecipeCookRecordProjection | null>(null);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const { capture } = useAnalytics();
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
  useEffect(() => {
    if (userId)
      void createRecipeCookRepository()
        .latestForRecipe(route.params.recipeId)
        .then(setPriorLearning)
        .catch(() => setPriorLearning(null));
  }, [route.params.recipeId, userId]);
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
    if (planBusy) return;
    setPlanBusy(true);
    try {
      const repository = createMealPlanningRepository();
      const result = await toggleRecipeInMealPlan({
        plan: activePlan,
        projection,
        servings,
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
    } catch (caught) {
      Alert.alert(
        "Meal Plan not updated",
        caught instanceof Error ? caught.message : "Try again in a moment.",
      );
    } finally {
      setPlanBusy(false);
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
  return (
    <AppShell fullBleedCanvas>
      <ObjectPageHeader
        showFullWidthBackground={false}
        left={
          <HeaderActionPill
            accessibilityLabel="Back to Meals"
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
        checked={checked}
        priorLearning={priorLearning}
        syncPending={pendingRecipeIds.includes(projection.recipe.id)}
        isInPlan={
          activePlan
            ? mealPlanContainsSelectedRecipeVersion(activePlan, projection)
            : false
        }
        planBusy={planBusy}
        cookActionLabel={activeCook ? "Continue cooking" : "Start cooking"}
        showMoreActions={!starterRecipe}
        recommendations={recommendations}
        onServingsChange={setServings}
        onToggleIngredient={(id) =>
          setChecked((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onTogglePlan={() => {
          void togglePlanMembership();
        }}
        onCook={() =>
          activeCook
            ? navigation.navigate("RecipeCookMode", {
                recipeId: projection.recipe.id,
                servings,
              })
            : navigation.navigate("RecipeReadiness", {
                recipeId: projection.recipe.id,
                servings,
              })
        }
        onMore={() => setShowMore(true)}
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
  servings: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cookDockAction: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dockPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
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
  provenance: { gap: spacing.xs, paddingTop: spacing.sm },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

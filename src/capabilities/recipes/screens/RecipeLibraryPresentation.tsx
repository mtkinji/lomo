import type { RefObject } from "react";
import { useMemo } from "react";
import {
  FlatList,
  Pressable,
  View,
} from "react-native";

import { colors } from "../../../theme";
import { Button, IconButton } from "../../../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../ui/DropdownMenu";
import { Icon } from "../../../ui/Icon";
import { KwiltRefreshFrame, useKwiltRefresh } from "../../../ui/KwiltRefresh";
import { menuItemTextProps, menuStyles } from "../../../ui/menuStyles";
import { Heading, Text } from "../../../ui/Typography";
import type { RecipeProjection } from "../data/recipeCache";
import {
  buildRecipeRecommendations,
  type RecipeRecommendationPlanningContext,
} from "../domain/recipeRecommendations";
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  countActiveRecipeInventoryFilters,
  type RecipeInventoryFilters,
  type RecipeInventorySortMode,
} from "../data/starterRecipeCatalog";
import { getEditorialCollection } from "../data/editorialMealCollections";
import type { MealEditorialPlacement } from "../domain/editorialMealCollectionContracts";
import {
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  clampDefaultMealServings,
} from "../domain/mealPreferences";
import {
  buildRecipeDiscoverySections,
  buildRecipeShelves,
  CuisineFamilyRow,
  EditorialCollectionOffer,
  RecommendedRecipeRow,
  RecipeCard,
  RecipeInventoryControls,
  RecipeQuickFilterRow,
  RecipeShelfRow,
  type FilterKey,
} from "./RecipeLibraryDiscovery";
import { styles } from "./RecipeLibraryScreen.styles";

export function RecipeLibraryView({
  recipes,
  onOpen,
  onRefresh,
  refreshing: _refreshing,
  filters,
  sort,
  onOpenFilters,
  onOpenSort,
  onClearFilter,
  onReset,
  browseMode,
  onSeeAll,
  editorialPlacements,
  onOpenCollection,
  onAddToPlan,
  isInPlan,
  isFavorite,
  likedOnly,
  onToggleLiked,
  totalCount,
  recommendationPlanningContext,
  onboardingTargetRef,
}: {
  recipes: RecipeProjection[];
  onOpen(recipeId: string): void;
  onRefresh(): Promise<unknown> | unknown;
  refreshing: boolean;
  filters: RecipeInventoryFilters;
  sort: RecipeInventorySortMode;
  onOpenFilters(): void;
  onOpenSort(): void;
  onClearFilter(key: FilterKey): void;
  onReset(): void;
  browseMode: "shelves" | "results";
  onSeeAll(filters: RecipeInventoryFilters): void;
  editorialPlacements: readonly MealEditorialPlacement[];
  onOpenCollection(collectionId: string): void;
  onAddToPlan(projection: RecipeProjection): void;
  isInPlan(projection: RecipeProjection): boolean;
  isFavorite(projection: RecipeProjection): boolean;
  likedOnly: boolean;
  onToggleLiked(): void;
  totalCount: number;
  recommendationPlanningContext: RecipeRecommendationPlanningContext;
  onboardingTargetRef?: RefObject<View | null>;
}) {
  const hasFilters = countActiveRecipeInventoryFilters(filters) > 0;
  const { onScroll, refreshControl, refreshOverlay, refreshing, scrollEventThrottle } = useKwiltRefresh({ onRefresh });
  const showShelves =
    browseMode === "shelves" &&
    sort === "featured" &&
    !hasFilters &&
    recipes.length > 0;
  const recommendations = useMemo(
    () =>
      showShelves
        ? buildRecipeRecommendations(
            recipes,
            6,
            new Set(
              recipes
                .filter(isFavorite)
                .map((projection) => projection.recipe.id),
            ),
            recommendationPlanningContext,
          )
        : [],
    [isFavorite, recipes, recommendationPlanningContext, showShelves],
  );
  const shelves = useMemo(
    () => (showShelves ? buildRecipeShelves(recipes) : []),
    [recipes, showShelves],
  );
  const discoverySections = useMemo(
    () => (showShelves ? buildRecipeDiscoverySections(shelves, editorialPlacements) : []),
    [editorialPlacements, shelves, showShelves],
  );

  const controls = (
    <RecipeInventoryControls
      sort={sort}
      resultCount={recipes.length}
      totalCount={totalCount}
      filterCount={countActiveRecipeInventoryFilters(filters)}
      onOpenFilters={onOpenFilters}
      onOpenSort={onOpenSort}
    />
  );

  if (showShelves) {
    return (
      <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing}>
        <FlatList
          key="recipe-discovery-shelves"
          testID="recipe-discovery-shelves"
          data={discoverySections}
          keyExtractor={(section) => section.kind === "shelf"
            ? `shelf-${section.shelf.id}`
            : `offer-${section.placement.collectionId}`}
          refreshControl={refreshControl}
          contentContainerStyle={styles.discoveryList}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={5}
          maxToRenderPerBatch={2}
          windowSize={4}
          ListHeaderComponent={(
            <View style={styles.discoveryHeader}>
              {controls}
              <View testID="recipe-discovery-navigation" style={styles.discoveryNavigation}>
                <RecipeQuickFilterRow
                  filters={filters}
                  likedOnly={likedOnly}
                  onClearFilter={onClearFilter}
                  onToggleLiked={onToggleLiked}
                  onSelect={onSeeAll}
                />
                <CuisineFamilyRow
                  onOpen={(family) =>
                    onSeeAll({
                      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
                      cuisine: family.shortLabel,
                    })
                  }
                />
              </View>
              <RecommendedRecipeRow
                recommendations={recommendations}
                onOpen={onOpen}
                onAddToPlan={onAddToPlan}
                isInPlan={isInPlan}
                onboardingTargetRef={onboardingTargetRef}
              />
            </View>
          )}
          renderItem={({ item: section }) => {
            if (section.kind === "shelf")
              return (
                <RecipeShelfRow
                  section={section.shelf}
                  onOpen={onOpen}
                  onSeeAll={onSeeAll}
                  onAddToPlan={onAddToPlan}
                  isInPlan={isInPlan}
                />
              );
            const collection = getEditorialCollection(
              section.placement.collectionId,
            );
            if (!collection) return null;
            return (
              <EditorialCollectionOffer
                collection={collection}
                hero={recipes.find(
                  (recipe) => recipe.recipe.id === collection.heroRecipeId,
                )}
                onPress={() => onOpenCollection(collection.id)}
              />
            );
          }}
        />
      </KwiltRefreshFrame>
    );
  }

  return (
    <KwiltRefreshFrame refreshOverlay={refreshOverlay} refreshing={refreshing}>
      <FlatList
        key="recipe-results-grid"
        testID="recipe-results-grid"
        data={recipes}
        numColumns={2}
        keyExtractor={(item) => item.recipe.id}
        columnWrapperStyle={styles.gridRow}
        refreshControl={refreshControl}
        contentContainerStyle={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.libraryHeader}>
          {controls}
          <RecipeQuickFilterRow
            filters={filters}
            likedOnly={likedOnly}
            onClearFilter={onClearFilter}
            onToggleLiked={onToggleLiked}
            onSelect={onSeeAll}
          />
          <Heading variant="md">
            {likedOnly ? "Liked meals" : hasFilters ? "Matching meals" : "All meals"}
          </Heading>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Heading variant="md">Nothing matches yet.</Heading>
          <Text tone="secondary">Try removing a filter.</Text>
          <Button variant="outline" onPress={onReset}>
            Clear filters
          </Button>
        </View>
      }
      renderItem={({ item, index }) => (
        <RecipeCard
          projection={item}
          onOpen={onOpen}
          onAddToPlan={onAddToPlan}
          isInPlan={isInPlan(item)}
          targetRef={index === 0 ? onboardingTargetRef : undefined}
        />
      )}
      />
    </KwiltRefreshFrame>
  );
}
export { MealPlanHeaderAction } from '../../../features/household-food/components/MealPlanHeaderAction';

export function MealsOverflowMenu({
  hiddenCount,
  defaultServings,
  minimumServings,
  foodNeedsCount,
  onOpenHidden,
  onChangeDefaultServings,
  onOpenFoodNeeds,
}: {
  hiddenCount: number;
  defaultServings: number;
  minimumServings: number;
  foodNeedsCount: number;
  onOpenHidden(): void;
  onChangeDefaultServings(servings: number): void;
  onOpenFoodNeeds(): void;
}) {
  const canDecrease = defaultServings > Math.max(MIN_MEAL_SERVINGS, minimumServings);
  const canIncrease = defaultServings < MAX_MEAL_SERVINGS;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...({ asChild: true } as const)}
        accessibilityLabel="Recipes actions"
      >
        <IconButton accessibilityLabel="Recipes actions" variant="ghost">
          <Icon name="more" size={20} color={colors.textPrimary} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        sideOffset={6}
        align="start"
        style={styles.mealsMenuContent}
      >
        <View style={styles.menuServingRow}>
          <View style={[styles.menuItemRow, styles.menuServingLabel]}>
            <Icon
              testID="default-servings-menu-icon"
              name="users"
              size={18}
              color={colors.textPrimary}
            />
            <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
              Default servings
            </Text>
          </View>
          <View style={styles.menuServingControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease default servings"
              accessibilityState={{ disabled: !canDecrease }}
              disabled={!canDecrease}
              hitSlop={8}
              onPress={() =>
                onChangeDefaultServings(
                  clampDefaultMealServings(defaultServings - 1),
                )
              }
              style={({ pressed }) => [
                styles.menuServingButton,
                !canDecrease && styles.menuServingButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuServingButtonLabel}>−</Text>
            </Pressable>
            <Text
              accessibilityLabel={`${defaultServings} servings`}
              accessibilityLiveRegion="polite"
              style={styles.menuServingCount}
            >
              {defaultServings}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase default servings"
              accessibilityState={{ disabled: !canIncrease }}
              disabled={!canIncrease}
              hitSlop={8}
              onPress={() =>
                onChangeDefaultServings(
                  clampDefaultMealServings(defaultServings + 1),
                )
              }
              style={({ pressed }) => [
                styles.menuServingButton,
                !canIncrease && styles.menuServingButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.menuServingButtonLabel}>+</Text>
            </Pressable>
          </View>
        </View>
        <DropdownMenuItem onPress={onOpenFoodNeeds}>
          <View style={styles.menuItemRow}>
            <Icon
              testID="foods-to-avoid-menu-icon"
              name={foodNeedsCount ? "shield" : "plus"}
              size={18}
              color={colors.textPrimary}
            />
            <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
              {foodNeedsCount ? "Edit foods to avoid" : "Add foods to avoid"}
            </Text>
          </View>
        </DropdownMenuItem>
        {hiddenCount > 0 ? (
          <DropdownMenuItem onPress={onOpenHidden}>
            <View style={styles.menuItemRow}>
              <Icon name="eyeOff" size={18} color={colors.textPrimary} />
              <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
                {hiddenCount === 1
                  ? "1 hidden meal"
                  : `${hiddenCount} hidden meals`}
              </Text>
            </View>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

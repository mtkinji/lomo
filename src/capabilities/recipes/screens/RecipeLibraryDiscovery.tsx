import type { RefObject } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  View,
  type ImageSourcePropType,
} from "react-native";

import { colors } from "../../../theme";
import { HapticsService } from "../../../services/HapticsService";
import { Badge } from "../../../ui/Badge";
import { HeaderActionPill } from "../../../ui/layout/ObjectPageHeader";
import { Icon, type IconName } from "../../../ui/Icon";
import { Heading, Text } from "../../../ui/Typography";
import {
  InventoryControlGroup,
  InventoryControlSurface,
} from "../../../ui/InventoryControlGroup";
import { RecipeArtwork } from "../components/RecipeArtwork";
import { RecipeArtworkGallery } from "../components/RecipeArtworkGallery";
import type { RecipeProjection } from "../data/recipeCache";
import { excludeHiddenRecipes } from "../domain/hiddenRecipes";
import type {
  RecipeRecommendation,
  RecipeRecommendationReason,
} from "../domain/recipeRecommendations";
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  STARTER_RECIPE_CATEGORIES,
  buildRecipeLibraryInventory,
  countActiveRecipeInventoryFilters,
  filterRecipeInventory,
  getRecipeElapsedMinutes,
  type RecipeInventoryFilters,
  type RecipeInventorySortMode,
  type StarterRecipeMetadata,
} from "../data/starterRecipeCatalog";
import {
  FEATURED_CUISINE_FAMILY_IDS,
  getCuisineFamily,
  getCuisineFamilyForFilterValue,
  type CuisineFamily,
  type CuisineFamilyId,
} from "../domain/cuisineFamilies";
import type {
  EditorialCollection,
  MealEditorialPlacement,
} from "../domain/editorialMealCollectionContracts";
import { styles } from "./RecipeLibraryScreen.styles";

const RECIPE_CATEGORIES: readonly StarterRecipeMetadata["category"][] =
  STARTER_RECIPE_CATEGORIES;
const SORT_LABELS: Record<RecipeInventorySortMode, string> = {
  featured: "Featured",
  quickest: "Quickest",
  title: "A–Z",
};

const CUISINE_ARTWORK: Partial<
  Record<CuisineFamilyId, ImageSourcePropType>
> = {
  "north-american": require("../../../../assets/illustrations/cuisines/north-american.png"),
  mexican: require("../../../../assets/illustrations/cuisines/mexican.png"),
  "latin-american": require("../../../../assets/illustrations/cuisines/latin-american.png"),
  caribbean: require("../../../../assets/illustrations/cuisines/caribbean.png"),
  french: require("../../../../assets/illustrations/cuisines/french.png"),
  italian: require("../../../../assets/illustrations/cuisines/italian.png"),
  "middle-eastern": require("../../../../assets/illustrations/cuisines/middle-eastern.png"),
  "indian-south-asian": require("../../../../assets/illustrations/cuisines/indian-south-asian.png"),
  chinese: require("../../../../assets/illustrations/cuisines/chinese.png"),
  japanese: require("../../../../assets/illustrations/cuisines/japanese.png"),
  korean: require("../../../../assets/illustrations/cuisines/korean.png"),
  thai: require("../../../../assets/illustrations/cuisines/thai.png"),
  vietnamese: require("../../../../assets/illustrations/cuisines/vietnamese.png"),
};

const FEATURED_CUISINE_FAMILIES = FEATURED_CUISINE_FAMILY_IDS.map((id) =>
  getCuisineFamily(id),
).filter((item): item is CuisineFamily => item !== null);

export type FilterKey = keyof RecipeInventoryFilters;

export type RecipeShelf = {
  id: string;
  title: string;
  filters: RecipeInventoryFilters;
  recipes: RecipeProjection[];
  canSeeAll?: boolean;
};

export function resolveRecipeBrowseMode(
  filters: RecipeInventoryFilters,
  likedOnly: boolean,
  sort: RecipeInventorySortMode = "featured",
): "shelves" | "results" {
  return likedOnly ||
    sort !== "featured" ||
    countActiveRecipeInventoryFilters(filters) > 0
    ? "results"
    : "shelves";
}

function totalMinutes(projection: RecipeProjection): string {
  const minutes = getRecipeElapsedMinutes(projection);
  return minutes > 0 ? `${minutes} min` : "Anytime";
}

function activeFilterLabels(
  filters: RecipeInventoryFilters,
): Array<{ key: FilterKey; label: string }> {
  const labels: Array<{ key: FilterKey; label: string }> = [];
  if (filters.source === "yours")
    labels.push({ key: "source", label: "Yours" });
  if (filters.maxMinutes !== null)
    labels.push({
      key: "maxMinutes",
      label: `${filters.maxMinutes} min or less`,
    });
  if (filters.category !== null)
    labels.push({ key: "category", label: filters.category });
  if (filters.cuisine !== null)
    labels.push({
      key: "cuisine",
      label:
        getCuisineFamilyForFilterValue(filters.cuisine)?.shortLabel ??
        filters.cuisine,
    });
  return labels;
}

const RECIPE_SHELF_DEFINITIONS: ReadonlyArray<{
  id: string;
  title: string;
  filters: RecipeInventoryFilters;
}> = [
  {
    id: "quick",
    title: "Ready in 30 minutes",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30 },
  },
  {
    id: "breakfast",
    title: "Breakfast favorites",
    filters: {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      category: "Breakfast & brunch",
    },
  },
  {
    id: "dinner",
    title: "Dinner ideas",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: "Dinner" },
  },
  {
    id: "mexican",
    title: "Mexican night",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, cuisine: "Mexican" },
  },
  {
    id: "salads",
    title: "Fresh salads & bowls",
    filters: {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      category: "Salads & bowls",
    },
  },
  {
    id: "soup",
    title: "Soup season",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: "Soups & stews" },
  },
  {
    id: "dessert",
    title: "Something sweet",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: "Desserts" },
  },
  {
    id: "yours",
    title: "Your recipes",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, source: "yours" },
  },
];

export function buildRecipeShelves(
  recipes: RecipeProjection[],
  _favoriteRecipeIds: ReadonlySet<string> = new Set(),
): RecipeShelf[] {
  return RECIPE_SHELF_DEFINITIONS.map((definition) => ({
    ...definition,
    recipes: filterRecipeInventory(recipes, {
      query: "",
      filters: definition.filters,
      sort: "featured",
    }),
  })).filter((section) => section.recipes.length > 0);
}

export function buildVisibleRecipeInventory(
  personalRecipes: readonly RecipeProjection[],
  hiddenRecipeIds: readonly string[],
): RecipeProjection[] {
  return excludeHiddenRecipes(
    buildRecipeLibraryInventory(personalRecipes),
    hiddenRecipeIds,
  );
}
export function RecipeCard({
  projection,
  onOpen,
  onAddToPlan,
  isInPlan,
  recommendationReason,
  shelf = false,
  instance = "results",
  targetRef,
}: {
  projection: RecipeProjection;
  onOpen(recipeId: string): void;
  onAddToPlan(projection: RecipeProjection): void;
  isInPlan: boolean;
  recommendationReason?: RecipeRecommendationReason;
  shelf?: boolean;
  instance?: string;
  targetRef?: RefObject<View | null>;
}) {
  const photoCount = projection.recipe.mediaAssets.filter(
    (asset) => asset.lifecycle === "active",
  ).length;
  const open = () => onOpen(projection.recipe.id);
  return (
    <View
      ref={targetRef}
      collapsable={targetRef ? false : undefined}
      testID={`recipe-card-${instance}-${projection.recipe.id}`}
      style={[styles.card, shelf && styles.shelfCard]}
    >
      <View style={styles.cardArtworkFrame}>
        <RecipeArtworkGallery
          mediaAssets={projection.recipe.mediaAssets}
          recipeTitle={projection.currentVersion.title}
          onOpen={open}
          testID={`recipe-card-gallery-${projection.recipe.id}`}
          style={styles.cardArtwork}
        />
        <MealPlanCardToggle
          projection={projection}
          selected={isInPlan}
          onPress={onAddToPlan}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${projection.currentVersion.title}${photoCount > 1 ? `, ${photoCount} photos` : ""}`}
        onPress={open}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
      >
        <Text style={styles.cardTitle} numberOfLines={2}>
          {projection.currentVersion.title}
        </Text>
        {recommendationReason ? (
          <View
            testID={`recommendation-reason-${projection.recipe.id}`}
          >
            <Badge
              variant="secondary"
              style={styles.recommendationReason}
              textStyle={styles.recommendationReasonText}
            >
              {recommendationReason.label}
            </Badge>
          </View>
        ) : null}
        <Text tone="secondary" style={styles.cardMeta}>
          {totalMinutes(projection)}
        </Text>
      </Pressable>
    </View>
  );
}
export function RecommendedRecipeRow({
  recommendations,
  onOpen,
  onAddToPlan,
  isInPlan,
  onboardingTargetRef,
}: {
  recommendations: readonly RecipeRecommendation[];
  onOpen(recipeId: string): void;
  onAddToPlan(projection: RecipeProjection): void;
  isInPlan(projection: RecipeProjection): boolean;
  onboardingTargetRef?: RefObject<View | null>;
}) {
  if (!recommendations.length) return null;
  return (
    <View testID="recipe-shelf-recommended" style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Heading variant="sm">Recommended</Heading>
      </View>
      <FlatList
        testID="recipe-shelf-scroll-recommended"
        data={recommendations}
        keyExtractor={({ projection }) => projection.recipe.id}
        horizontal
        nestedScrollEnabled
        style={styles.edgeToEdgeRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        renderItem={({ item: { projection, reason }, index }) => (
          <RecipeCard
            projection={projection}
            recommendationReason={reason}
            onOpen={onOpen}
            onAddToPlan={onAddToPlan}
            isInPlan={isInPlan(projection)}
            shelf
            instance="recommended"
            targetRef={index === 0 ? onboardingTargetRef : undefined}
          />
        )}
      />
    </View>
  );
}

export function RecipeShelfRow({
  section,
  onOpen,
  onSeeAll,
  onAddToPlan,
  isInPlan,
}: {
  section: RecipeShelf;
  onOpen(recipeId: string): void;
  onSeeAll(filters: RecipeInventoryFilters): void;
  onAddToPlan(projection: RecipeProjection): void;
  isInPlan(projection: RecipeProjection): boolean;
}) {
  return (
    <View testID={`recipe-shelf-${section.id}`} style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Heading variant="sm">{section.title}</Heading>
        {section.canSeeAll === false ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${section.title}`}
            onPress={() => onSeeAll(section.filters)}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        testID={`recipe-shelf-scroll-${section.id}`}
        data={section.recipes.slice(0, 12)}
        keyExtractor={(projection) => projection.recipe.id}
        horizontal
        nestedScrollEnabled
        style={styles.edgeToEdgeRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        renderItem={({ item: projection }) => (
          <RecipeCard
            projection={projection}
            onOpen={onOpen}
            onAddToPlan={onAddToPlan}
            isInPlan={isInPlan(projection)}
            shelf
            instance={section.id}
          />
        )}
      />
    </View>
  );
}

function MealPlanCardToggle({
  projection,
  selected,
  onPress,
}: {
  projection: RecipeProjection;
  selected: boolean;
  onPress(projection: RecipeProjection): void;
}) {
  const verb = selected ? "Remove" : "Add";
  return (
    <HeaderActionPill
      accessibilityLabel={`${verb} ${projection.currentVersion.title} ${selected ? "from" : "to"} Meal Plan`}
      accessibilityState={{ selected }}
      hitSlop={8}
      onPress={() => {
        void HapticsService.trigger(selected ? "canvas.toggle.off" : "canvas.toggle.on");
        onPress(projection);
      }}
      materialVariant="floatingWhite"
      material={!selected}
      size={36}
      style={[styles.planCardToggle, selected && styles.planCardToggleSelected]}
    >
      <Icon
        name={selected ? "check" : "plus"}
        size={17}
        color={selected ? colors.primaryForeground : colors.textPrimary}
      />
    </HeaderActionPill>
  );
}

export function EditorialCollectionOffer({
  collection,
  hero,
  onPress,
}: {
  collection: EditorialCollection;
  hero: RecipeProjection | undefined;
  onPress(): void;
}) {
  const media = hero?.recipe.mediaAssets.find(
    (asset) => asset.lifecycle === "active",
  );
  return (
    <Pressable
      testID={`editorial-collection-offer-${collection.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open Collection: ${collection.title}`}
      accessibilityHint="Opens a curated set of meals"
      onPress={onPress}
      style={({ pressed }) => [
        styles.editorialOffer,
        pressed && styles.editorialOfferPressed,
      ]}
    >
      <RecipeArtwork
        storageRef={media?.storageRef}
        accessibilityLabel={media?.altText ?? collection.title}
        style={styles.editorialOfferArtwork}
      />
      <View pointerEvents="none" style={styles.editorialOfferShade} />
      <View pointerEvents="none" style={styles.editorialOfferCopy}>
        <Text variant="label" style={styles.editorialOfferEyebrow}>
          {collection.eyebrow}
        </Text>
        <Heading
          numberOfLines={2}
          variant="sm"
          style={styles.editorialOfferTitle}
        >
          {collection.title}
        </Heading>
        <View style={styles.editorialOfferAction}>
          <Text variant="label" style={styles.editorialOfferActionText}>
            Explore meals
          </Text>
          <Icon name="arrowRight" size={16} color={colors.accent} />
        </View>
      </View>
    </Pressable>
  );
}

export function CuisineFamilyRow({
  activeCuisine = null,
  onOpen,
}: {
  activeCuisine?: string | null;
  onOpen(family: CuisineFamily): void;
}) {
  const activeFamily = activeCuisine
    ? getCuisineFamilyForFilterValue(activeCuisine)
    : null;
  return (
    <View testID="cuisine-family-row">
      <FlatList
        testID="cuisine-family-scroll"
        data={FEATURED_CUISINE_FAMILIES}
        keyExtractor={(item) => item.id}
        horizontal
        style={styles.edgeToEdgeRail}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cuisineRow}
        initialNumToRender={5}
        maxToRenderPerBatch={4}
        windowSize={3}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Browse ${item.shortLabel} meals`}
            accessibilityHint="Shows matching meals and regional cuisines"
            accessibilityState={{ selected: activeFamily?.id === item.id }}
            onPress={() => onOpen(item)}
            style={({ pressed }) => [
              styles.cuisineCard,
              pressed && styles.cuisineCardPressed,
            ]}
          >
            <View style={styles.cuisineAvatar}>
              <Image
                accessible={false}
                source={CUISINE_ARTWORK[item.id]}
                resizeMode="contain"
                style={styles.cuisineArtwork}
              />
            </View>
            <Text numberOfLines={1} variant="label" style={styles.cuisineLabel}>
              {item.shortLabel}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function QuickFilter({
  id,
  icon,
  label,
  accessibilityLabel,
  selected = false,
  onPress,
}: {
  id: string;
  icon?: IconName;
  label: string;
  accessibilityLabel: string;
  selected?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      testID={`recipe-filter-pill-${id}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      hitSlop={{ top: 5, bottom: 5 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickFilter,
        selected && styles.quickFilterSelected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Icon
          testID={`recipe-quick-filter-${id}-icon`}
          name={icon}
          size={15}
          color={selected ? colors.primaryForeground : colors.textPrimary}
        />
      ) : null}
      <Text
        variant="label"
        numberOfLines={1}
        style={selected ? styles.quickFilterTextSelected : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function RecipeQuickFilterRow({
  filters,
  likedOnly,
  onClearFilter,
  onToggleLiked,
  onSelect,
}: {
  filters: RecipeInventoryFilters;
  likedOnly: boolean;
  onClearFilter(key: FilterKey): void;
  onToggleLiked(): void;
  onSelect(filters: RecipeInventoryFilters): void;
}) {
  const quickSelected = filters.maxMinutes === 30;
  const breakfastSelected = filters.category === "Breakfast & brunch";
  const dinnerSelected = filters.category === "Dinner";
  const cuisineFamily = filters.cuisine
    ? getCuisineFamilyForFilterValue(filters.cuisine)
    : null;
  const hasCuisineScope = Boolean(
    cuisineFamily && cuisineFamily.cuisines.length > 1,
  );
  const cuisineScopeOptions = hasCuisineScope && cuisineFamily
    ? [
        {
          value: cuisineFamily.label,
          label: `All ${cuisineFamily.shortLabel}`,
        },
        ...cuisineFamily.cuisines
          .filter((cuisine) => cuisine !== cuisineFamily.label)
          .map((cuisine) => ({ value: cuisine, label: cuisine })),
      ]
    : [];
  const appliedFilters = activeFilterLabels(filters).filter(({ key }) => {
    if (key === "cuisine" && hasCuisineScope) return false;
    if (key === "maxMinutes" && filters.maxMinutes === 30) return false;
    return !(
      key === "category" &&
      (filters.category === "Breakfast & brunch" || filters.category === "Dinner")
    );
  });
  return (
    <ScrollView
      testID="recipe-filter-rail"
      horizontal
      style={styles.quickFilterRail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickFilterRow}
    >
      {appliedFilters.map(({ key, label }) => (
        <QuickFilter
          key={key}
          id={`applied-${key}`}
          label={label}
          accessibilityLabel={`Remove ${label} filter`}
          selected
          onPress={() => onClearFilter(key)}
        />
      ))}
      {cuisineScopeOptions
        .filter(({ value }) => value === filters.cuisine)
        .map(({ value, label }) => (
          <QuickFilter
            key={value}
            id={
              value === cuisineFamily?.label
                ? "cuisine-all"
                : `cuisine-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
            }
            label={label}
            accessibilityLabel={
              value === cuisineFamily?.label
                ? `Remove ${value} filter`
                : `Show ${value} meals`
            }
            selected
            onPress={() =>
              value === cuisineFamily?.label
                ? onClearFilter("cuisine")
                : onSelect({ ...filters, cuisine: cuisineFamily?.label ?? value })
            }
          />
        ))}
      <QuickFilter
        id="liked"
        icon="heart"
        label="Liked"
        accessibilityLabel={likedOnly ? "Show all meals" : "Show liked meals"}
        selected={likedOnly}
        onPress={onToggleLiked}
      />
      <QuickFilter
        id="quick"
        icon="timer"
        label="30 min"
        accessibilityLabel="Show meals ready in 30 minutes"
        selected={quickSelected}
        onPress={() =>
          onSelect({
            ...filters,
            maxMinutes: quickSelected ? null : 30,
          })
        }
      />
      <QuickFilter
        id="breakfast"
        icon="coffee"
        label="Breakfast"
        accessibilityLabel="Show breakfast and brunch meals"
        selected={breakfastSelected}
        onPress={() =>
          onSelect({
            ...filters,
            category: breakfastSelected ? null : "Breakfast & brunch",
          })
        }
      />
      <QuickFilter
        id="dinner"
        icon="meal"
        label="Dinner"
        accessibilityLabel="Show dinner meals"
        selected={dinnerSelected}
        onPress={() =>
          onSelect({
            ...filters,
            category: dinnerSelected ? null : "Dinner",
          })
        }
      />
      {cuisineScopeOptions
        .filter(({ value }) => value !== filters.cuisine)
        .map(({ value, label }) => (
          <QuickFilter
            key={value}
            id={
              value === cuisineFamily?.label
                ? "cuisine-all"
                : `cuisine-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
            }
            label={label}
            accessibilityLabel={
              value === cuisineFamily?.label
                ? `Show all ${value} meals`
                : `Show ${value} meals`
            }
            onPress={() => onSelect({ ...filters, cuisine: value })}
          />
        ))}
    </ScrollView>
  );
}

export type RecipeDiscoverySection =
  | { kind: "shelf"; shelf: RecipeShelf }
  | { kind: "offer"; placement: MealEditorialPlacement };

export function buildRecipeDiscoverySections(
  shelves: readonly RecipeShelf[],
  placements: readonly MealEditorialPlacement[],
): RecipeDiscoverySection[] {
  const placementByCount = new Map<number, MealEditorialPlacement>();
  for (const placement of placements.slice(0, 2)) {
    placementByCount.set(
      placement.slot === "after_third_shelf" ? 3 : 6,
      placement,
    );
  }
  return shelves.flatMap((shelf, index): RecipeDiscoverySection[] => {
    const placement = placementByCount.get(index + 1);
    return placement
      ? [
          { kind: "shelf", shelf },
          { kind: "offer", placement },
        ]
      : [{ kind: "shelf", shelf }];
  });
}

function InventoryControlButton({
  icon,
  label,
  onPress,
  active = false,
  count,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
  active?: boolean;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <InventoryControlSurface
        active={active}
        count={count}
        iconName={icon}
        testID={`recipe-${icon}-control-surface`}
      />
    </Pressable>
  );
}

export function RecipeInventoryControls({
  sort,
  resultCount,
  totalCount,
  filterCount,
  onOpenFilters,
  onOpenSort,
}: {
  sort: RecipeInventorySortMode;
  resultCount: number;
  totalCount: number;
  filterCount: number;
  onOpenFilters(): void;
  onOpenSort(): void;
}) {
  const countLabel =
    resultCount === totalCount
      ? `${totalCount} meals`
      : `${resultCount} of ${totalCount}`;

  return (
    <View style={styles.inventoryControls}>
      <View style={styles.controlRow}>
        <InventoryControlGroup testID="recipe-inventory-control-group">
          <InventoryControlButton
            icon="funnel"
            label={`Filter meals${filterCount ? `, ${filterCount} active` : ""}`}
            onPress={onOpenFilters}
            active={filterCount > 0}
            count={filterCount}
          />
          <InventoryControlButton
            icon="sort"
            label={`Sort meals, ${SORT_LABELS[sort]}`}
            onPress={onOpenSort}
            active={sort !== "featured"}
          />
        </InventoryControlGroup>
        <Text variant="label" tone="secondary" style={styles.resultCount}>
          {countLabel}
        </Text>
      </View>
    </View>
  );
}

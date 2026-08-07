import {
  Image,
  Pressable,
  ScrollView,
  View,
  type ImageSourcePropType,
} from "react-native";

import { colors } from "../../../theme";
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
    labels.push({ key: "cuisine", label: filters.cuisine });
  return labels;
}

const RECIPE_SHELF_DEFINITIONS: ReadonlyArray<{
  id: string;
  title: string;
  filters: RecipeInventoryFilters;
}> = [
  {
    id: "yours",
    title: "Your recipes",
    filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, source: "yours" },
  },
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
];

export function buildRecipeShelves(
  recipes: RecipeProjection[],
  favoriteRecipeIds: ReadonlySet<string> = new Set(),
): RecipeShelf[] {
  const favorites = recipes.filter((projection) =>
    favoriteRecipeIds.has(projection.recipe.id),
  );
  const standardShelves = RECIPE_SHELF_DEFINITIONS.map((definition) => ({
    ...definition,
    recipes: filterRecipeInventory(recipes, {
      query: "",
      filters: definition.filters,
      sort: "featured",
    }),
  })).filter((section) => section.recipes.length > 0);
  return favorites.length
    ? [
        {
          id: "favorites",
          title: "Liked meals",
          filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
          recipes: favorites,
          canSeeAll: false,
        },
        ...standardShelves,
      ]
    : standardShelves;
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
}: {
  projection: RecipeProjection;
  onOpen(recipeId: string): void;
  onAddToPlan(projection: RecipeProjection): void;
  isInPlan: boolean;
  recommendationReason?: RecipeRecommendationReason;
  shelf?: boolean;
  instance?: string;
}) {
  const photoCount = projection.recipe.mediaAssets.filter(
    (asset) => asset.lifecycle === "active",
  ).length;
  const open = () => onOpen(projection.recipe.id);
  return (
    <View
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
            style={styles.recommendationReason}
          >
            <Icon
              name={recommendationReason.icon}
              size={13}
              color={colors.pine700}
            />
            <Text variant="label" style={styles.recommendationReasonText}>
              {recommendationReason.label}
            </Text>
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
}: {
  recommendations: readonly RecipeRecommendation[];
  onOpen(recipeId: string): void;
  onAddToPlan(projection: RecipeProjection): void;
  isInPlan(projection: RecipeProjection): boolean;
}) {
  if (!recommendations.length) return null;
  return (
    <View testID="recipe-shelf-recommended" style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Heading variant="sm">Recommended</Heading>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
      >
        {recommendations.map(({ projection, reason }) => (
          <RecipeCard
            key={projection.recipe.id}
            projection={projection}
            recommendationReason={reason}
            onOpen={onOpen}
            onAddToPlan={onAddToPlan}
            isInPlan={isInPlan(projection)}
            shelf
            instance="recommended"
          />
        ))}
      </ScrollView>
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
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
      >
        {section.recipes.slice(0, 12).map((projection) => (
          <RecipeCard
            key={projection.recipe.id}
            projection={projection}
            onOpen={onOpen}
            onAddToPlan={onAddToPlan}
            isInPlan={isInPlan(projection)}
            shelf
            instance={section.id}
          />
        ))}
      </ScrollView>
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
      onPress={() => onPress(projection)}
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
  onOpen,
}: {
  onOpen(family: CuisineFamily): void;
}) {
  return (
    <View testID="cuisine-family-row" style={styles.cuisineSection}>
      <Heading variant="md">Explore cuisines</Heading>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cuisineRow}
      >
        {FEATURED_CUISINE_FAMILIES.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${item.label} meals`}
            accessibilityHint="Shows matching meals and regional cuisines"
            onPress={() => onOpen(item)}
            style={({ pressed }) => [
              styles.cuisineCard,
              pressed && styles.cuisineCardPressed,
            ]}
          >
            <Image
              accessible={false}
              source={CUISINE_ARTWORK[item.id]}
              resizeMode="contain"
              style={styles.cuisineArtwork}
            />
            <Text numberOfLines={2} variant="label" style={styles.cuisineLabel}>
              {item.shortLabel}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function CuisineRefinementRow({
  filters,
  onChange,
}: {
  filters: RecipeInventoryFilters;
  onChange(filters: RecipeInventoryFilters): void;
}) {
  const family = filters.cuisine
    ? getCuisineFamilyForFilterValue(filters.cuisine)
    : null;
  if (!family || family.cuisines.length <= 1) return null;
  const regionalCuisines = family.cuisines.filter(
    (cuisine) => cuisine !== family.label,
  );

  return (
    <View style={styles.cuisineRefinement}>
      <Text variant="label" tone="secondary">
        Explore {family.shortLabel}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cuisineRefinementRow}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show all ${family.label} meals`}
          accessibilityState={{ selected: filters.cuisine === family.label }}
          onPress={() => onChange({ ...filters, cuisine: family.label })}
          style={({ pressed }) => [
            styles.cuisineRefinementChip,
            filters.cuisine === family.label &&
              styles.cuisineRefinementChipSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text variant="label">All</Text>
        </Pressable>
        {regionalCuisines.map((cuisine) => (
          <Pressable
            key={cuisine}
            accessibilityRole="button"
            accessibilityLabel={`Show ${cuisine} meals`}
            accessibilityState={{ selected: filters.cuisine === cuisine }}
            onPress={() => onChange({ ...filters, cuisine })}
            style={({ pressed }) => [
              styles.cuisineRefinementChip,
              filters.cuisine === cuisine &&
                styles.cuisineRefinementChipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="label">{cuisine}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  filters,
  sort,
  resultCount,
  totalCount,
  onOpenFilters,
  onOpenSort,
  onClearFilter,
}: {
  filters: RecipeInventoryFilters;
  sort: RecipeInventorySortMode;
  resultCount: number;
  totalCount: number;
  onOpenFilters(): void;
  onOpenSort(): void;
  onClearFilter(key: FilterKey): void;
}) {
  const activeCount = countActiveRecipeInventoryFilters(filters);
  const filterLabels = activeFilterLabels(filters);
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
            label={`Filter meals${activeCount ? `, ${activeCount} active` : ""}`}
            onPress={onOpenFilters}
            active={activeCount > 0}
            count={activeCount}
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
      {filterLabels.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.appliedFilters}
        >
          {filterLabels.map(({ key, label }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${label} filter`}
              onPress={() => onClearFilter(key)}
              style={({ pressed }) => [
                styles.appliedFilter,
                pressed && styles.pressed,
              ]}
            >
              <Text variant="label">{label}</Text>
              <Icon name="close" size={13} color={colors.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

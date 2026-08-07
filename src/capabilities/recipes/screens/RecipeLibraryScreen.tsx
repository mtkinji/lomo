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

const RECIPE_CATEGORIES: readonly StarterRecipeMetadata["category"][] =
  STARTER_RECIPE_CATEGORIES;
const RECIPE_CUISINES = STARTER_RECIPE_CUISINES;
const SORT_LABELS: Record<RecipeInventorySortMode, string> = {
  featured: "Featured",
  quickest: "Quickest",
  title: "A–Z",
};

type FilterKey = keyof RecipeInventoryFilters;

type RecipeShelf = {
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

function RecipeCard({
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

function RecommendedRecipeRow({
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

function RecipeShelfRow({
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

function EditorialCollectionOffer({
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

function FilterChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChoice,
        selected && styles.filterChoiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        variant="label"
        style={selected ? styles.filterChoiceTextSelected : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RecipeFilterDrawer({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: RecipeInventoryFilters;
  onClose(): void;
  onApply(value: RecipeInventoryFilters): void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);
  const update = <Key extends FilterKey>(
    key: Key,
    next: RecipeInventoryFilters[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={["82%"]}
      enableContentPanningGesture
    >
      <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
        <BottomDrawerHeader
          title="Filter meals"
          subtitle="Choose only what matters for this search."
          variant="withClose"
          onClose={onClose}
        />
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            SOURCE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              label="All recipes"
              selected={draft.source === "all"}
              onPress={() => update("source", "all")}
            />
            <FilterChoice
              label="Yours"
              selected={draft.source === "yours"}
              onPress={() => update("source", "yours")}
            />
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            TIME
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              label="Any time"
              selected={draft.maxMinutes === null}
              onPress={() => update("maxMinutes", null)}
            />
            <FilterChoice
              label="30 min or less"
              selected={draft.maxMinutes === 30}
              onPress={() => update("maxMinutes", 30)}
            />
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            MEAL TYPE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              label="Any meal"
              selected={draft.category === null}
              onPress={() => update("category", null)}
            />
            {RECIPE_CATEGORIES.map((category) => (
              <FilterChoice
                key={category}
                label={category}
                selected={draft.category === category}
                onPress={() => update("category", category)}
              />
            ))}
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">
            CUISINE
          </Text>
          <View style={styles.choiceWrap}>
            <FilterChoice
              label="Any cuisine"
              selected={draft.cuisine === null}
              onPress={() => update("cuisine", null)}
            />
            {RECIPE_CUISINES.map((cuisine) => (
              <FilterChoice
                key={cuisine}
                label={cuisine}
                selected={draft.cuisine === cuisine}
                onPress={() => update("cuisine", cuisine)}
              />
            ))}
          </View>
        </View>
        <View style={styles.drawerActions}>
          <Button
            variant="ghost"
            onPress={() => setDraft(DEFAULT_RECIPE_INVENTORY_FILTERS)}
          >
            Reset
          </Button>
          <View style={styles.drawerApply}>
            <Button fullWidth variant="primary" onPress={() => onApply(draft)}>
              Show meals
            </Button>
          </View>
        </View>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

function RecipeSortDrawer({
  visible,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: RecipeInventorySortMode;
  onClose(): void;
  onChange(value: RecipeInventorySortMode): void;
}) {
  const options: Array<{
    value: RecipeInventorySortMode;
    label: string;
    detail: string;
  }> = [
    { value: "featured", label: "Featured", detail: "Kwilt’s household order" },
    { value: "quickest", label: "Quickest", detail: "Least total time first" },
    { value: "title", label: "A–Z", detail: "Recipe title" },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[360]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader
          title="Sort meals"
          variant="withClose"
          onClose={onClose}
        />
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={selected ? styles.optionSelected : undefined}>
                  {option.label}
                </Text>
                <Text tone="secondary">{option.detail}</Text>
              </View>
              {selected ? (
                <Icon name="check" size={18} color={colors.accent} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomDrawer>
  );
}

function RecipeCaptureDrawer({
  visible,
  onClose,
  onImport,
  onManual,
}: {
  visible: boolean;
  onClose(): void;
  onImport(): void;
  onManual(): void;
}) {
  const options: Array<{
    icon: IconName;
    label: string;
    detail: string;
    onPress(): void;
  }> = [
    {
      icon: "camera",
      label: "Photo or scan",
      detail: "Capture a cookbook page or recipe card",
      onPress: onImport,
    },
    {
      icon: "link",
      label: "Link, text, or voice",
      detail: "Bring in a recipe from wherever it lives",
      onPress: onImport,
    },
    {
      icon: "edit",
      label: "Write it yourself",
      detail: "Start with a blank family recipe",
      onPress: onManual,
    },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[430]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader
          title="Add a recipe"
          subtitle="Start with what you already have."
          variant="withClose"
          onClose={onClose}
        />
        {options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => {
              onClose();
              option.onPress();
            }}
            style={({ pressed }) => [
              styles.captureRow,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.captureIcon}>
              <Icon name={option.icon} size={19} color={colors.textPrimary} />
            </View>
            <View style={styles.optionCopy}>
              <Text>{option.label}</Text>
              <Text tone="secondary">{option.detail}</Text>
            </View>
            <Icon name="chevronRight" size={17} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </BottomDrawer>
  );
}

export function RecipeInventoryDock({
  onAdd,
  onSearch,
  onAsk,
}: {
  onAdd(): void;
  onSearch(): void;
  onAsk(): void;
}) {
  return (
    <View
      testID="recipe-inventory-dock"
      pointerEvents="box-none"
      style={styles.dock}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a recipe"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.addDockButton,
          pressed && styles.pressed,
        ]}
      >
        <FloatingControlSurface
          borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2}
          isProminent
          style={styles.addDockSurface}
          surfaceStyle={styles.addDockSurfaceContent}
        >
          <View style={styles.addDockContent}>
            <Icon name="plus" size={19} color={colors.textPrimary} />
            <Text tone="secondary">Add a recipe</Text>
          </View>
        </FloatingControlSurface>
      </Pressable>
      <FloatingDockActionButton
        testID="recipe-inventory-search"
        accessibilityLabel="Search meals"
        accessibilityHint="Opens Search scoped to Meals"
        icon="search"
        isProminent
        onPress={onSearch}
        size={INVENTORY_DOCK_BUTTON_SIZE_PX}
      />
      <FloatingDockActionButton
        testID="recipe-inventory-ai"
        accessibilityLabel="Ask Kwilt about meals"
        accessibilityHint="Opens AI chat"
        icon="navAiGuide"
        isProminent
        onPress={onAsk}
        size={INVENTORY_DOCK_BUTTON_SIZE_PX}
      />
    </View>
  );
}

export type MealPlanTrayItem = {
  id: string;
  candidateId: string;
  title: string;
  storageRef: string | null;
};

const MEAL_PLAN_DRAWER_PEEK_HEIGHT = 124;

export function MealPlanDrawer({
  visible,
  items,
  canEdit,
  snapIndex,
  onSnapIndexChange,
  onSearch,
  onClose,
  onRemove,
}: {
  visible: boolean;
  items: MealPlanTrayItem[];
  canEdit: boolean;
  snapIndex: number;
  onSnapIndexChange(index: number): void;
  onSearch(): void;
  onClose(): void;
  onRemove(candidateId: string): void;
}) {
  const count = items.length;
  const mealLabel = count === 1 ? "1 meal" : `${count} meals`;
  const visibleItems = items.slice(0, 4);
  const overflowCount = Math.max(0, count - visibleItems.length);
  return (
    <>
      {visible && snapIndex === 0 ? (
        <View style={styles.planDrawerSearch}>
          <FloatingDockActionButton
            testID="meal-plan-drawer-search"
            accessibilityLabel="Search meals"
            accessibilityHint="Opens Search scoped to Meals"
            icon="search"
            isProminent
            onPress={onSearch}
            size={INVENTORY_DOCK_BUTTON_SIZE_PX}
          />
        </View>
      ) : null}
      <BottomDrawer
        visible={visible}
        onClose={onClose}
        snapPoints={[MEAL_PLAN_DRAWER_PEEK_HEIGHT, "88%"]}
        snapIndex={snapIndex}
        onSnapIndexChange={(index) => onSnapIndexChange(index)}
        dismissable={false}
        hideBackdrop={snapIndex === 0}
        presentation="inline"
        enableContentPanningGesture
        contentExtendsIntoBottomSafeArea
        sheetStyle={styles.planDrawerSheet}
        handleContainerStyle={styles.planDrawerHandleRegion}
      >
        <View style={styles.planDrawerViewport}>
          <View style={styles.planDrawerHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Review Meal Plan, ${mealLabel}`}
              accessibilityHint={
                snapIndex === 0 ? "Expands the Meal Plan drawer" : undefined
              }
              onPress={() => onSnapIndexChange(1)}
              style={({ pressed }) => [
                styles.planDrawerHeaderMain,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.planDrawerTitleRow}>
                <Icon name="meal" size={16} color={colors.textPrimary} />
                <Text variant="label">Plan</Text>
                <Text variant="label" tone="secondary">
                  {count}
                </Text>
              </View>
              <View style={styles.planDrawerThumbnails}>
                {visibleItems.map((item) => (
                  <View
                    key={item.id}
                    testID="meal-plan-drawer-thumbnail"
                    style={styles.planDrawerThumbnailFrame}
                  >
                    <RecipeArtwork
                      storageRef={item.storageRef}
                      accessibilityLabel={item.title}
                      style={styles.planDrawerThumbnail}
                    />
                  </View>
                ))}
                {overflowCount ? (
                  <Text
                    variant="label"
                    tone="secondary"
                    style={styles.planDrawerOverflow}
                  >
                    +{overflowCount}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Finish planning"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.planDrawerClose,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="close" size={17} color={colors.textSecondary} />
            </Pressable>
          </View>
          <BottomDrawerScrollView
            contentContainerStyle={styles.planDrawerContent}
          >
            {items.length ? (
              <View style={styles.planDrawerList}>
                {items.map((item) => (
                  <View key={item.id} style={styles.planDrawerRow}>
                    <View style={styles.planDrawerArtworkFrame}>
                      <RecipeArtwork
                        storageRef={item.storageRef}
                        accessibilityLabel={item.title}
                        style={styles.planDrawerArtwork}
                      />
                    </View>
                    <Text style={styles.planDrawerTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {canEdit ? (
                      <IconButton
                        accessibilityLabel={`Remove ${item.title} from Meal Plan`}
                        variant="ghost"
                        onPress={() => onRemove(item.candidateId)}
                      >
                        <Icon
                          name="close"
                          size={17}
                          color={colors.textSecondary}
                        />
                      </IconButton>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.planDrawerEmpty}>
                <Heading variant="sm">Choose what sounds good.</Heading>
                <Text tone="secondary">
                  Tap + on any meal. Your choices will collect here.
                </Text>
              </View>
            )}
            {!canEdit && items.length ? (
              <Text tone="secondary">
                Family choices are underway. Finish reviewing them before
                changing this plan.
              </Text>
            ) : null}
          </BottomDrawerScrollView>
        </View>
      </BottomDrawer>
    </>
  );
}

export function RecipeLibraryView({
  recipes,
  onOpen,
  onRefresh,
  refreshing,
  cached,
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
  totalCount,
}: {
  recipes: RecipeProjection[];
  onOpen(recipeId: string): void;
  onRefresh(): void;
  refreshing: boolean;
  cached: boolean;
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
  totalCount: number;
}) {
  const hasFilters = countActiveRecipeInventoryFilters(filters) > 0;
  const showShelves =
    browseMode === "shelves" &&
    sort === "featured" &&
    !hasFilters &&
    recipes.length > 0;
  const recommendations = useMemo(
    () => (showShelves ? buildRecipeRecommendations(recipes) : []),
    [recipes, showShelves],
  );
  const favoriteRecipeIds = useMemo(
    () =>
      new Set(
        recipes.filter(isFavorite).map((projection) => projection.recipe.id),
      ),
    [isFavorite, recipes],
  );
  const shelves = showShelves
    ? buildRecipeShelves(recipes, favoriteRecipeIds)
    : [];

  const controls = (
    <RecipeInventoryControls
      filters={filters}
      sort={sort}
      resultCount={recipes.length}
      totalCount={totalCount}
      onOpenFilters={onOpenFilters}
      onOpenSort={onOpenSort}
      onClearFilter={onClearFilter}
    />
  );

  if (showShelves) {
    return (
      <ScrollView
        testID="recipe-discovery-shelves"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.discoveryList}
        showsVerticalScrollIndicator={false}
      >
        {controls}
        {cached ? (
          <Text tone="secondary">
            Your saved recipes are here while Kwilt refreshes.
          </Text>
        ) : null}
        <RecommendedRecipeRow
          recommendations={recommendations}
          onOpen={onOpen}
          onAddToPlan={onAddToPlan}
          isInPlan={isInPlan}
        />
        {buildRecipeDiscoverySections(shelves, editorialPlacements).map(
          (section) => {
            if (section.kind === "shelf")
              return (
                <RecipeShelfRow
                  key={section.shelf.id}
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
                key={`offer-${collection.id}`}
                collection={collection}
                hero={recipes.find(
                  (recipe) => recipe.recipe.id === collection.heroRecipeId,
                )}
                onPress={() => onOpenCollection(collection.id)}
              />
            );
          },
        )}
      </ScrollView>
    );
  }

  return (
    <FlatList
      testID="recipe-results-grid"
      data={recipes}
      numColumns={2}
      keyExtractor={(item) => item.recipe.id}
      columnWrapperStyle={styles.gridRow}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.libraryHeader}>
          {controls}
          {cached ? (
            <Text tone="secondary">
              Your saved recipes are here while Kwilt refreshes.
            </Text>
          ) : null}
          <Heading variant="md">
            {hasFilters ? "Matching meals" : "All meals"}
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
      renderItem={({ item }) => (
        <RecipeCard
          projection={item}
          onOpen={onOpen}
          onAddToPlan={onAddToPlan}
          isInPlan={isInPlan(item)}
        />
      )}
    />
  );
}

type Props = NativeStackScreenProps<FoodStackParamList, "RecipeLibrary">;

export function MealPlanHeaderAction({
  count,
  onPress,
}: {
  count: number;
  onPress(): void;
}) {
  const countLabel = count > 99 ? "99+" : String(count);
  return (
    <Pressable
      testID="meal-plan-header-action"
      accessibilityRole="button"
      accessibilityLabel={count ? `Plan, ${count} meals` : "Plan"}
      onPress={onPress}
      style={({ pressed }) => [
        styles.mealPlanHeaderAction,
        pressed && styles.pressed,
      ]}
    >
      <Icon name="meal" size={15} color={colors.textPrimary} />
      <Text variant="label" style={styles.mealPlanHeaderLabel}>
        Plan
      </Text>
      {count ? (
        <View testID="meal-plan-header-count" style={styles.mealPlanCountBadge}>
          <Text variant="label" style={styles.mealPlanCountText}>
            {countLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function MealsOverflowMenu({
  hiddenCount,
  defaultServings,
  foodNeedsCount,
  onOpenHidden,
  onChangeDefaultServings,
  onOpenFoodNeeds,
}: {
  hiddenCount: number;
  defaultServings: number;
  foodNeedsCount: number;
  onOpenHidden(): void;
  onChangeDefaultServings(servings: number): void;
  onOpenFoodNeeds(): void;
}) {
  const canDecrease = defaultServings > MIN_MEAL_SERVINGS;
  const canIncrease = defaultServings < MAX_MEAL_SERVINGS;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...({ asChild: true } as const)}
        accessibilityLabel="Meals actions"
      >
        <IconButton accessibilityLabel="Meals actions" variant="ghost">
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
        onImport={() => navigation.navigate("RecipeImportReview")}
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

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom:
      RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX +
      RESTING_COMPOSER_HEIGHT_PX +
      spacing.lg,
    gap: spacing.sm,
  },
  libraryHeader: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  discoveryList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom:
      RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX +
      RESTING_COMPOSER_HEIGHT_PX +
      spacing.lg,
    gap: spacing.lg,
  },
  inventoryControls: { gap: spacing.sm },
  controlRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  resultCount: { marginLeft: "auto", flexShrink: 0 },
  menuItemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mealsMenuContent: { width: 276, minWidth: 276 },
  menuServingRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  menuServingLabel: { flex: 1, minWidth: 0 },
  menuServingControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  menuServingButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuServingButtonDisabled: { opacity: 0.4 },
  menuServingButtonLabel: { ...typography.titleSm, lineHeight: 22 },
  menuServingCount: { ...typography.body, minWidth: 16, textAlign: "center" },
  mealPlanHeaderAction: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.fieldFill,
  },
  mealPlanHeaderLabel: { color: colors.textPrimary },
  mealPlanCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive,
  },
  mealPlanCountText: {
    color: colors.primaryForeground,
    fontSize: 10,
    lineHeight: 12,
  },
  appliedFilters: { gap: spacing.xs, paddingRight: spacing.sm },
  appliedFilter: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.secondary,
  },
  editorialOffer: {
    width: "100%",
    height: 104,
    overflow: "hidden",
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  editorialOfferPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  editorialOfferArtwork: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  editorialOfferShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,26,25,0.48)",
  },
  editorialOfferCopy: {
    position: "absolute",
    top: spacing.sm,
    bottom: spacing.sm,
    left: spacing.md,
    zIndex: 2,
    width: 184,
    justifyContent: "center",
    gap: spacing.xs,
  },
  editorialOfferEyebrow: {
    color: colors.primaryForeground,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  editorialOfferTitle: { color: colors.primaryForeground },
  editorialOfferAction: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
  },
  editorialOfferActionText: { color: colors.primaryForeground },
  gridRow: { gap: spacing.sm },
  card: { flex: 1, minWidth: 0, marginBottom: spacing.md },
  shelfCard: { flex: 0, width: 164, marginBottom: 0 },
  cardArtworkFrame: { position: "relative" },
  cardArtwork: { width: "100%", aspectRatio: 1.15, borderRadius: 18 },
  planCardToggle: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
  },
  planCardToggleSelected: { backgroundColor: colors.sumi900 },
  cardBody: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  cardTitle: {
    fontFamily: typography.titleSm.fontFamily,
    fontSize: 15,
    lineHeight: 19,
  },
  cardMeta: { ...typography.bodyXs },
  recommendationReason: { flexDirection: "row", alignItems: "center", gap: 4 },
  recommendationReasonText: {
    color: colors.pine700,
    fontSize: 11,
    lineHeight: 14,
  },
  shelf: { gap: spacing.sm },
  shelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  seeAll: {
    minHeight: 44,
    minWidth: 64,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: spacing.sm,
  },
  seeAllText: {
    fontFamily: typography.titleSm.fontFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  shelfContent: { gap: spacing.sm, paddingRight: spacing.md },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.md,
  },
  drawerContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  filterSection: { gap: spacing.sm },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filterChoice: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChoiceSelected: {
    backgroundColor: colors.sumi900,
    borderColor: colors.sumi900,
  },
  filterChoiceTextSelected: { color: colors.canvas },
  drawerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  drawerApply: { flex: 1 },
  optionRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionSelected: {
    fontFamily: typography.titleSm.fontFamily,
    color: colors.accent,
  },
  captureRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  captureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  dock: {
    position: "absolute",
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
    height: RESTING_COMPOSER_HEIGHT_PX,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 60,
    elevation: 60,
  },
  addDockButton: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  addDockSurface: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  addDockSurfaceContent: {
    height: RESTING_COMPOSER_HEIGHT_PX,
    justifyContent: "center",
  },
  addDockContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  planDrawerSearch: {
    position: "absolute",
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: MEAL_PLAN_DRAWER_PEEK_HEIGHT + spacing.sm,
    zIndex: 70,
    elevation: 70,
  },
  planDrawerSheet: {
    paddingHorizontal: 0,
    paddingTop: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  planDrawerHandleRegion: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  planDrawerViewport: { flex: 1, minHeight: 0, overflow: "hidden" },
  planDrawerHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  planDrawerHeaderMain: { flex: 1, minWidth: 0, gap: spacing.xs },
  planDrawerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  planDrawerThumbnails: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  planDrawerThumbnailFrame: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.canvas,
  },
  planDrawerThumbnail: { width: 24, height: 24, borderRadius: 12 },
  planDrawerOverflow: { marginLeft: 2, fontSize: 11, lineHeight: 15 },
  planDrawerClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  planDrawerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  planDrawerList: { gap: spacing.xs },
  planDrawerRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  planDrawerArtworkFrame: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.secondary,
  },
  planDrawerArtwork: { width: 48, height: 48, borderRadius: 14 },
  planDrawerTitle: { flex: 1, minWidth: 0 },
  planDrawerEmpty: { gap: spacing.xs, paddingVertical: spacing.md },
});

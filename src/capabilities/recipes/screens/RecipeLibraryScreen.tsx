import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing, typography } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon, type IconName } from '../../../ui/Icon';
import { AppShell } from '../../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { PageHeader } from '../../../ui/layout/PageHeader';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import { Heading, Text } from '../../../ui/Typography';
import { useCapabilityShell } from '../../../navigation/CapabilityShellContext';
import { rootNavigationRef } from '../../../navigation/rootNavigationRef';
import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { FloatingControlSurface } from '../../../features/activities/FloatingControlSurface';
import { FloatingDockActionButton } from '../../../features/activities/FloatingDockActionButton';
import { INVENTORY_DOCK_BUTTON_SIZE_PX } from '../../../features/activities/InventoryDockAffordances';
import { InventoryControlGroup, InventoryControlSurface } from '../../../ui/InventoryControlGroup';
import { useRecipeStore } from '../runtime/useRecipeStore';
import type { RecipeProjection } from '../data/recipeCache';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { RecipeArtworkGallery } from '../components/RecipeArtworkGallery';
import { useAppStore } from '../../../store/useAppStore';
import {
  DEFAULT_RECIPE_INVENTORY_FILTERS,
  buildRecipeLibraryInventory,
  countActiveRecipeInventoryFilters,
  filterRecipeInventory,
  getStarterRecipeMetadata,
  type RecipeInventoryFilters,
  type RecipeInventorySortMode,
  type StarterRecipeMetadata,
} from '../data/starterRecipeCatalog';

const RECIPE_CATEGORIES: readonly StarterRecipeMetadata['category'][] = [
  'Breakfast', 'Lunch', 'Dinner', 'Soup', 'Vegetarian', 'Dessert',
];
const RECIPE_CUISINES = [
  'American', 'Mexican', 'French', 'Japanese', 'Italian', 'Indian',
  'Mediterranean', 'Chinese', 'Thai', 'Global',
] as const;
const SORT_LABELS: Record<RecipeInventorySortMode, string> = {
  featured: 'Featured',
  quickest: 'Quickest',
  title: 'A–Z',
};

type FilterKey = keyof RecipeInventoryFilters;

type RecipeShelf = {
  id: string;
  title: string;
  filters: RecipeInventoryFilters;
  recipes: RecipeProjection[];
};

function totalMinutes(projection: RecipeProjection): string {
  const minutes = (projection.currentVersion.prepMinutes ?? 0) + (projection.currentVersion.cookMinutes ?? 0);
  return minutes > 0 ? `${minutes} min` : 'Anytime';
}

function activeFilterLabels(filters: RecipeInventoryFilters): Array<{ key: FilterKey; label: string }> {
  const labels: Array<{ key: FilterKey; label: string }> = [];
  if (filters.source === 'yours') labels.push({ key: 'source', label: 'Yours' });
  if (filters.maxMinutes !== null) labels.push({ key: 'maxMinutes', label: `${filters.maxMinutes} min or less` });
  if (filters.category !== null) labels.push({ key: 'category', label: filters.category });
  if (filters.cuisine !== null) labels.push({ key: 'cuisine', label: filters.cuisine });
  return labels;
}

const RECIPE_SHELF_DEFINITIONS: ReadonlyArray<{ id: string; title: string; filters: RecipeInventoryFilters }> = [
  { id: 'yours', title: 'Your recipes', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, source: 'yours' } },
  { id: 'quick', title: 'Ready in 30 minutes', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30 } },
  { id: 'breakfast', title: 'Breakfast favorites', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: 'Breakfast' } },
  { id: 'dinner', title: 'Dinner ideas', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: 'Dinner' } },
  { id: 'mexican', title: 'Mexican night', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, cuisine: 'Mexican' } },
  { id: 'vegetarian', title: 'Vegetarian', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: 'Vegetarian' } },
  { id: 'soup', title: 'Soup season', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: 'Soup' } },
  { id: 'dessert', title: 'Something sweet', filters: { ...DEFAULT_RECIPE_INVENTORY_FILTERS, category: 'Dessert' } },
];

export function buildRecipeShelves(recipes: RecipeProjection[]): RecipeShelf[] {
  return RECIPE_SHELF_DEFINITIONS.map((definition) => ({
    ...definition,
    recipes: filterRecipeInventory(recipes, { query: '', filters: definition.filters, sort: 'featured' }),
  })).filter((section) => section.recipes.length > 0);
}

function RecipeCard({ projection, onOpen, shelf = false, instance = 'results' }: {
  projection: RecipeProjection;
  onOpen(recipeId: string): void;
  shelf?: boolean;
  instance?: string;
}) {
  const metadata = getStarterRecipeMetadata(projection.recipe.id);
  const photoCount = projection.recipe.mediaAssets.filter((asset) => asset.lifecycle === 'active').length;
  const open = () => onOpen(projection.recipe.id);
  return (
    <View
      testID={`recipe-card-${instance}-${projection.recipe.id}`}
      style={[styles.card, shelf && styles.shelfCard]}
    >
      <RecipeArtworkGallery
        mediaAssets={projection.recipe.mediaAssets}
        recipeTitle={projection.currentVersion.title}
        onOpen={open}
        testID={`recipe-card-gallery-${projection.recipe.id}`}
        style={styles.cardArtwork}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${projection.currentVersion.title}${photoCount > 1 ? `, ${photoCount} photos` : ''}`}
        onPress={open}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
      >
        <Text style={styles.cardTitle} numberOfLines={2}>{projection.currentVersion.title}</Text>
        <Text variant="label" tone="secondary" numberOfLines={1} style={styles.cardMetaLabel}>
          {metadata ? `${metadata.cuisine} · ${metadata.category}` : 'Your recipe'}
        </Text>
        <Text tone="secondary" style={styles.cardMeta}>{totalMinutes(projection)} · Serves {projection.currentVersion.yieldQuantity ?? '—'}</Text>
      </Pressable>
    </View>
  );
}

function RecipeShelfRow({ section, onOpen, onSeeAll }: {
  section: RecipeShelf;
  onOpen(recipeId: string): void;
  onSeeAll(filters: RecipeInventoryFilters): void;
}) {
  return (
    <View testID={`recipe-shelf-${section.id}`} style={styles.shelf}>
      <View style={styles.shelfHeader}>
        <Heading variant="sm">{section.title}</Heading>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`See all ${section.title}`}
          onPress={() => onSeeAll(section.filters)}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
        >
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
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
            shelf
            instance={section.id}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function PlanWithKwiltOffer({ onPress }: { onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Plan with Kwilt"
      accessibilityHint="Opens an editable draft in Meal Planning"
      onPress={onPress}
      style={({ pressed }) => [styles.planOffer, pressed && styles.pressed]}
    >
      <View style={styles.planOfferIcon}>
        <Icon name="navAiGuide" size={20} color={colors.pine700} />
      </View>
      <View style={styles.planOfferCopy}>
        <Text variant="label" style={styles.eyebrow}>MEAL PLANNING</Text>
        <Heading variant="sm">Plan with Kwilt</Heading>
        <Text tone="secondary">Turn a few ideas into your next meals.</Text>
        <Text variant="label" style={styles.planOfferAction}>Choose a horizon and review a starting point</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textSecondary} />
    </Pressable>
  );
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
  const countLabel = resultCount === totalCount ? `${totalCount} recipes` : `${resultCount} of ${totalCount}`;

  return (
    <View style={styles.inventoryControls}>
      <View style={styles.controlRow}>
        <InventoryControlGroup testID="recipe-inventory-control-group">
          <InventoryControlButton
            icon="funnel"
            label={`Filter recipes${activeCount ? `, ${activeCount} active` : ''}`}
            onPress={onOpenFilters}
            active={activeCount > 0}
            count={activeCount}
          />
          <InventoryControlButton
            icon="sort"
            label={`Sort recipes, ${SORT_LABELS[sort]}`}
            onPress={onOpenSort}
            active={sort !== 'featured'}
          />
        </InventoryControlGroup>
        <Text variant="label" tone="secondary" style={styles.resultCount}>{countLabel}</Text>
      </View>
      {filterLabels.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.appliedFilters}>
          {filterLabels.map(({ key, label }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${label} filter`}
              onPress={() => onClearFilter(key)}
              style={({ pressed }) => [styles.appliedFilter, pressed && styles.pressed]}
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

function FilterChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChoice, selected && styles.filterChoiceSelected, pressed && styles.pressed]}
    >
      <Text variant="label" style={selected ? styles.filterChoiceTextSelected : undefined}>{label}</Text>
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
  useEffect(() => { if (visible) setDraft(value); }, [value, visible]);
  const update = <Key extends FilterKey>(key: Key, next: RecipeInventoryFilters[Key]) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['82%']} enableContentPanningGesture>
      <BottomDrawerScrollView contentContainerStyle={styles.drawerContent}>
        <BottomDrawerHeader title="Filter recipes" subtitle="Choose only what matters for this search." variant="withClose" onClose={onClose} />
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">SOURCE</Text>
          <View style={styles.choiceWrap}>
            <FilterChoice label="All recipes" selected={draft.source === 'all'} onPress={() => update('source', 'all')} />
            <FilterChoice label="Yours" selected={draft.source === 'yours'} onPress={() => update('source', 'yours')} />
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">TIME</Text>
          <View style={styles.choiceWrap}>
            <FilterChoice label="Any time" selected={draft.maxMinutes === null} onPress={() => update('maxMinutes', null)} />
            <FilterChoice label="30 min or less" selected={draft.maxMinutes === 30} onPress={() => update('maxMinutes', 30)} />
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">MEAL TYPE</Text>
          <View style={styles.choiceWrap}>
            <FilterChoice label="Any meal" selected={draft.category === null} onPress={() => update('category', null)} />
            {RECIPE_CATEGORIES.map((category) => (
              <FilterChoice key={category} label={category} selected={draft.category === category} onPress={() => update('category', category)} />
            ))}
          </View>
        </View>
        <View style={styles.filterSection}>
          <Text variant="label" tone="secondary">CUISINE</Text>
          <View style={styles.choiceWrap}>
            <FilterChoice label="Any cuisine" selected={draft.cuisine === null} onPress={() => update('cuisine', null)} />
            {RECIPE_CUISINES.map((cuisine) => (
              <FilterChoice key={cuisine} label={cuisine} selected={draft.cuisine === cuisine} onPress={() => update('cuisine', cuisine)} />
            ))}
          </View>
        </View>
        <View style={styles.drawerActions}>
          <Button variant="ghost" onPress={() => setDraft(DEFAULT_RECIPE_INVENTORY_FILTERS)}>Reset</Button>
          <View style={styles.drawerApply}><Button fullWidth variant="primary" onPress={() => onApply(draft)}>Show recipes</Button></View>
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
  const options: Array<{ value: RecipeInventorySortMode; label: string; detail: string }> = [
    { value: 'featured', label: 'Featured', detail: 'Kwilt’s household order' },
    { value: 'quickest', label: 'Quickest', detail: 'Least total time first' },
    { value: 'title', label: 'A–Z', detail: 'Recipe title' },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[360]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader title="Sort recipes" variant="withClose" onClose={onClose} />
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => { onChange(option.value); onClose(); }}
              style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
            >
              <View style={styles.optionCopy}>
                <Text style={selected ? styles.optionSelected : undefined}>{option.label}</Text>
                <Text tone="secondary">{option.detail}</Text>
              </View>
              {selected ? <Icon name="check" size={18} color={colors.accent} /> : null}
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
  const options: Array<{ icon: IconName; label: string; detail: string; onPress(): void }> = [
    { icon: 'camera', label: 'Photo or scan', detail: 'Capture a cookbook page or recipe card', onPress: onImport },
    { icon: 'link', label: 'Link, text, or voice', detail: 'Bring in a recipe from wherever it lives', onPress: onImport },
    { icon: 'edit', label: 'Write it yourself', detail: 'Start with a blank family recipe', onPress: onManual },
  ];
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={[430]}>
      <View style={styles.drawerContent}>
        <BottomDrawerHeader title="Add a recipe" subtitle="Start with what you already have." variant="withClose" onClose={onClose} />
        {options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => { onClose(); option.onPress(); }}
            style={({ pressed }) => [styles.captureRow, pressed && styles.pressed]}
          >
            <View style={styles.captureIcon}><Icon name={option.icon} size={19} color={colors.textPrimary} /></View>
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

export function RecipeInventoryDock({ onAdd, onSearch, onAsk }: {
  onAdd(): void;
  onSearch(): void;
  onAsk(): void;
}) {
  return (
    <View testID="recipe-inventory-dock" pointerEvents="box-none" style={styles.dock}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a recipe"
        onPress={onAdd}
        style={({ pressed }) => [styles.addDockButton, pressed && styles.pressed]}
      >
        <FloatingControlSurface borderRadius={RESTING_COMPOSER_HEIGHT_PX / 2} isProminent style={styles.addDockSurface} surfaceStyle={styles.addDockSurfaceContent}>
          <View style={styles.addDockContent}>
            <Icon name="plus" size={19} color={colors.textPrimary} />
            <Text tone="secondary">Add a recipe</Text>
          </View>
        </FloatingControlSurface>
      </Pressable>
      <FloatingDockActionButton
        testID="recipe-inventory-search"
        accessibilityLabel="Search recipes"
        accessibilityHint="Opens Search scoped to Recipes"
        icon="search"
        isProminent
        onPress={onSearch}
        size={INVENTORY_DOCK_BUTTON_SIZE_PX}
      />
      <FloatingDockActionButton
        testID="recipe-inventory-ai"
        accessibilityLabel="Ask Kwilt about recipes"
        accessibilityHint="Opens AI chat"
        icon="navAiGuide"
        isProminent
        onPress={onAsk}
        size={INVENTORY_DOCK_BUTTON_SIZE_PX}
      />
    </View>
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
  onPlanWithKwilt,
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
  browseMode: 'shelves' | 'results';
  onSeeAll(filters: RecipeInventoryFilters): void;
  onPlanWithKwilt(): void;
  totalCount: number;
}) {
  const hasFilters = countActiveRecipeInventoryFilters(filters) > 0;
  const showShelves = browseMode === 'shelves' && sort === 'featured' && !hasFilters && recipes.length > 0;
  const featured = showShelves
    ? recipes.find((projection) => getStarterRecipeMetadata(projection.recipe.id)?.featured)
    : undefined;
  const shelves = showShelves ? buildRecipeShelves(recipes) : [];

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

  const featuredCard = featured ? (
    <View testID="featured-recipe-card" style={styles.featured}>
      <RecipeArtworkGallery
        mediaAssets={featured.recipe.mediaAssets}
        recipeTitle={featured.currentVersion.title}
        onOpen={() => onOpen(featured.recipe.id)}
        testID="featured-recipe-gallery"
        style={styles.featuredArtwork}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open featured recipe ${featured.currentVersion.title}${featured.recipe.mediaAssets.filter((asset) => asset.lifecycle === 'active').length > 1 ? `, ${featured.recipe.mediaAssets.filter((asset) => asset.lifecycle === 'active').length} photos` : ''}`}
        onPress={() => onOpen(featured.recipe.id)}
        style={({ pressed }) => [styles.featuredBody, pressed && styles.pressed]}
      >
        <Heading variant="md">{featured.currentVersion.title}</Heading>
        <Text tone="secondary" numberOfLines={2}>{featured.currentVersion.description}</Text>
        <Text>{totalMinutes(featured)} · Serves {featured.currentVersion.yieldQuantity}</Text>
        <Text variant="label" style={styles.eyebrow}>KWILT KITCHEN</Text>
      </Pressable>
    </View>
  ) : null;

  if (showShelves) {
    return (
      <ScrollView
        testID="recipe-discovery-shelves"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.discoveryList}
        showsVerticalScrollIndicator={false}
      >
        {controls}
        {cached ? <Text tone="secondary">Your saved recipes are here while Kwilt refreshes.</Text> : null}
        {featuredCard}
        <PlanWithKwiltOffer onPress={onPlanWithKwilt} />
        {shelves.map((section) => (
          <RecipeShelfRow key={section.id} section={section} onOpen={onOpen} onSeeAll={onSeeAll} />
        ))}
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={(
        <View style={styles.libraryHeader}>
          {controls}
          {cached ? <Text tone="secondary">Your saved recipes are here while Kwilt refreshes.</Text> : null}
          <Heading variant="md">{hasFilters ? 'Matching recipes' : 'All recipes'}</Heading>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Heading variant="md">Nothing matches yet.</Heading>
          <Text tone="secondary">Try removing a filter.</Text>
          <Button variant="outline" onPress={onReset}>Clear filters</Button>
        </View>
      )}
      renderItem={({ item }) => <RecipeCard projection={item} onOpen={onOpen} />}
    />
  );
}

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeLibrary'>;

export function RecipeLibraryScreen({ navigation }: Props) {
  const { openMenu } = useCapabilityShell();
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const status = useRecipeStore((state) => state.status);
  const refresh = useRecipeStore((state) => state.refresh);
  const [filters, setFilters] = useState<RecipeInventoryFilters>(DEFAULT_RECIPE_INVENTORY_FILTERS);
  const [sort, setSort] = useState<RecipeInventorySortMode>('featured');
  const [browseMode, setBrowseMode] = useState<'shelves' | 'results'>('shelves');
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [sortDrawerVisible, setSortDrawerVisible] = useState(false);
  const [captureDrawerVisible, setCaptureDrawerVisible] = useState(false);
  const { capture } = useAnalytics();
  useEffect(() => { capture(AnalyticsEvent.RecipeLibraryViewed, { source: 'food' }); }, [capture]);
  const inventory = useMemo(() => buildRecipeLibraryInventory(personalRecipes), [personalRecipes]);
  const filtered = useMemo(
    () => filterRecipeInventory(inventory, { query: '', filters, sort }),
    [filters, inventory, sort],
  );
  const clearFilter = (key: FilterKey) => {
    setFilters((current) => {
      const next = { ...current, [key]: DEFAULT_RECIPE_INVENTORY_FILTERS[key] };
      if (countActiveRecipeInventoryFilters(next) === 0 && sort === 'featured') setBrowseMode('shelves');
      return next;
    });
  };
  const resetInventory = () => {
    setFilters(DEFAULT_RECIPE_INVENTORY_FILTERS);
    setSort('featured');
    setBrowseMode('shelves');
  };
  return (
    <AppShell>
      <PageHeader title="Recipes" onPressMenu={openMenu} />
      <RecipeLibraryView
        recipes={filtered}
        onOpen={(recipeId) => navigation.navigate('RecipeHome', { recipeId })}
        onRefresh={() => { void refresh(); }}
        refreshing={status === 'refreshing'}
        cached={status === 'cached' || status === 'refreshing'}
        filters={filters}
        sort={sort}
        onOpenFilters={() => setFilterDrawerVisible(true)}
        onOpenSort={() => setSortDrawerVisible(true)}
        onClearFilter={clearFilter}
        onReset={resetInventory}
        browseMode={browseMode}
        onSeeAll={(next) => { setFilters(next); setSort('featured'); setBrowseMode('results'); }}
        onPlanWithKwilt={() => navigation.navigate('MealPlanEditor', { source: 'recipe_library' })}
        totalCount={inventory.length}
      />
      <RecipeInventoryDock
        onAdd={() => setCaptureDrawerVisible(true)}
        onSearch={() => useAppStore.getState().openGlobalSearch({ initialScope: 'recipes' })}
        onAsk={() => rootNavigationRef.navigate('UnifiedChat', { entry: 'fresh', source: 'recipes_inventory_ai' })}
      />
      <RecipeFilterDrawer
        visible={filterDrawerVisible}
        value={filters}
        onClose={() => setFilterDrawerVisible(false)}
        onApply={(next) => { setFilters(next); setBrowseMode(countActiveRecipeInventoryFilters(next) ? 'results' : 'shelves'); setFilterDrawerVisible(false); }}
      />
      <RecipeSortDrawer visible={sortDrawerVisible} value={sort} onClose={() => setSortDrawerVisible(false)} onChange={(next) => { setSort(next); setBrowseMode(next === 'featured' && !countActiveRecipeInventoryFilters(filters) ? 'shelves' : 'results'); }} />
      <RecipeCaptureDrawer
        visible={captureDrawerVisible}
        onClose={() => setCaptureDrawerVisible(false)}
        onImport={() => navigation.navigate('RecipeImportReview')}
        onManual={() => navigation.navigate('RecipeEdit', {})}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX + RESTING_COMPOSER_HEIGHT_PX + spacing.lg,
    gap: spacing.sm,
  },
  libraryHeader: { gap: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  discoveryList: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX + RESTING_COMPOSER_HEIGHT_PX + spacing.lg,
    gap: spacing.lg,
  },
  inventoryControls: { gap: spacing.sm },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultCount: { marginLeft: 'auto', flexShrink: 0 },
  appliedFilters: { gap: spacing.xs, paddingRight: spacing.sm },
  appliedFilter: { minHeight: 34, paddingHorizontal: spacing.sm, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.secondary },
  featured: { gap: spacing.sm },
  featuredArtwork: { width: '100%', aspectRatio: 1.78, borderRadius: 24 },
  featuredBody: { paddingHorizontal: spacing.xs, gap: spacing.xs },
  eyebrow: { color: colors.pine700, letterSpacing: 1.1 },
  planOffer: { minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 22, backgroundColor: colors.secondary },
  planOfferIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  planOfferCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  planOfferAction: { color: colors.pine700 },
  gridRow: { gap: spacing.sm },
  card: { flex: 1, minWidth: 0, marginBottom: spacing.md },
  shelfCard: { flex: 0, width: 164, marginBottom: 0 },
  cardArtwork: { width: '100%', aspectRatio: 1.15, borderRadius: 18 },
  cardBody: { paddingTop: spacing.sm, paddingHorizontal: spacing.xs, gap: spacing.xs },
  cardTitle: { fontFamily: typography.titleSm.fontFamily, fontSize: 15, lineHeight: 19 },
  cardMetaLabel: { fontSize: 10, lineHeight: 14 },
  cardMeta: { ...typography.bodyXs },
  shelf: { gap: spacing.sm },
  shelfHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.xs },
  seeAll: { minHeight: 44, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center', paddingLeft: spacing.sm },
  seeAllText: { fontFamily: typography.titleSm.fontFamily, fontSize: 14, lineHeight: 20 },
  shelfContent: { gap: spacing.sm, paddingRight: spacing.md },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.md },
  drawerContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  filterSection: { gap: spacing.sm },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterChoice: { minHeight: 38, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  filterChoiceSelected: { backgroundColor: colors.sumi900, borderColor: colors.sumi900 },
  filterChoiceTextSelected: { color: colors.canvas },
  drawerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  drawerApply: { flex: 1 },
  optionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionCopy: { flex: 1, minWidth: 0, gap: 2 },
  optionSelected: { fontFamily: typography.titleSm.fontFamily, color: colors.accent },
  captureRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  captureIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
  dock: {
    position: 'absolute',
    left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
    bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
    height: RESTING_COMPOSER_HEIGHT_PX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 60,
    elevation: 60,
  },
  addDockButton: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  addDockSurface: { flex: 1, height: RESTING_COMPOSER_HEIGHT_PX },
  addDockSurfaceContent: { height: RESTING_COMPOSER_HEIGHT_PX, justifyContent: 'center' },
  addDockContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
});

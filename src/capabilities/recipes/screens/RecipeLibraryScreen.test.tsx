import { act, fireEvent, render, within } from '@testing-library/react-native';
import { createRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type TestTreeNode = { props: { style?: StyleProp<ViewStyle>; [key: string]: unknown } };

type MockBottomDrawerProps = {
  visible: boolean;
  children?: ReactNode;
  bottomAccessory?: ReactNode;
  actionDock?: ReactNode;
  bottomAccessoryPlacement?: 'drawer' | 'phoneFloating';
  bottomAccessoryShowTopBorder?: boolean;
  snapIndex?: number;
  snapPoints?: Array<number | string>;
  dismissable?: boolean;
  dismissOnBackdropPress?: boolean;
  hideBackdrop?: boolean;
  dynamicSizing?: boolean;
  presentation?: string;
  animateOnHide?: boolean;
  keyboardBehavior?: 'lift' | 'extend';
  keyboardAvoidanceEnabled?: boolean;
  contentLayout?: 'inset' | 'edgeToEdge';
};

const mockBottomDrawerProps: MockBottomDrawerProps[] = [];

jest.mock('../../../features/unifiedChat/UnifiedChatDrawer', () => ({
  UnifiedChatDrawer: () => null,
}));
jest.mock('../../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));
let mockReduceMotionEnabled = false;
jest.mock('../../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: mockReduceMotionEnabled, screenReaderEnabled: false }),
}));
jest.mock('../../../ui/ActionDock', () => {
  const { Pressable, View } = require('react-native');
  return {
    ActionDock: ({ rightItem }: { rightItem?: Record<string, unknown> }) => (
      <View>
        {rightItem ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightItem.accessibilityLabel as string}
            testID={rightItem.testID as string}
            onPress={rightItem.onPress as () => void}
            style={{ width: 56, height: 56 }}
          />
        ) : null}
      </View>
    ),
    useActionDockClearance: () => 88,
  };
});
jest.mock('../../../ui/AlertDialog', () => ({
  AlertDialog: ({ visible, title, description, cancelLabel, actionLabel, onCancel, onAction }: Record<string, unknown>) => {
    if (!visible) return null;
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Text>{title as ReactNode}</Text>
        <Text>{description as ReactNode}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel as string} onPress={onCancel as () => void}><Text>{cancelLabel as string}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel as string} onPress={onAction as () => void}><Text>{actionLabel as string}</Text></Pressable>
      </View>
    );
  },
}));
jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: (props: MockBottomDrawerProps) => {
      mockBottomDrawerProps.push(props);
      const { visible, children, bottomAccessory, actionDock, snapIndex, snapPoints } = props;
      return visible
        ? (
          <View
            testID="meal-plan-drawer"
            accessibilityLabel={JSON.stringify({ snapIndex, snapPoints })}
          >
            {children}
            {bottomAccessory}
            {actionDock}
          </View>
        )
        : null;
    },
    BottomDrawerScrollView: ScrollView,
    useBottomDrawerActionDockClearance: () => 88,
  };
});
import { colors, fonts, radii, spacing, typography } from '../../../theme';
import { HapticsService } from '../../../services/HapticsService';
import { BUTTON_SIZE_TOKENS } from '../../../ui/buttonTokens';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { buildRecipeLibraryInventory, DEFAULT_RECIPE_INVENTORY_FILTERS } from '../data/starterRecipeCatalog';
import { EDITORIAL_MEAL_COLLECTIONS, getMealEditorialEdition } from '../data/editorialMealCollections';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import { FOOD_FIRST_CYCLE_CHECKPOINTS } from '../../../features/household-food/onboarding/foodFirstCycleGuide';
import { INVENTORY_DOCK_BUTTON_SIZE_PX } from '../../../features/activities/InventoryDockAffordances';
import {
  MealPlanHeaderAction,
  MealPlanDrawer,
  RecipeInventoryControls,
  RecipeInventoryDock,
  RecipeLibraryView,
  buildVisibleRecipeInventory,
  buildRecipeDiscoverySections,
  buildRecipeShelves,
  resolveRecipeBrowseMode,
  shouldShowPickMealGuide,
} from './RecipeLibraryScreen';
import { RecipeCaptureDrawer, RecipeFilterDrawer } from './RecipeLibraryDrawers';

const editorialPlacements = getMealEditorialEdition(new Date('2026-08-06T12:00:00.000Z')).placements;

const viewProps = {
  onOpen: jest.fn(),
  onRefresh: jest.fn(),
  refreshing: false,
  filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
  sort: 'featured' as const,
  onOpenFilters: jest.fn(),
  onOpenSort: jest.fn(),
  onClearFilter: jest.fn(),
  likedOnly: false,
  onToggleLiked: jest.fn(),
  onReset: jest.fn(),
  browseMode: 'shelves' as const,
  onSeeAll: jest.fn(),
  editorialPlacements,
  onOpenCollection: jest.fn(),
  onAddToPlan: jest.fn(),
  isInPlan: () => false,
  isFavorite: () => false,
  totalCount: 100,
  recommendationPlanningContext: { localHour: 9 },
};

describe('Recipe library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomDrawerProps.length = 0;
    mockReduceMotionEnabled = false;
  });

  it('returns to discovery when the final quick filter is cleared', () => {
    expect(resolveRecipeBrowseMode(DEFAULT_RECIPE_INVENTORY_FILTERS, false)).toBe('shelves');
    expect(resolveRecipeBrowseMode(
      { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30 },
      false,
    )).toBe('results');
    expect(resolveRecipeBrowseMode(DEFAULT_RECIPE_INVENTORY_FILTERS, true)).toBe('results');
  });

  it('offers one clear recovery action when filters are empty', () => {
    const onReset = jest.fn();
    const screen = render(<RecipeLibraryView {...viewProps} recipes={[]} onReset={onReset} />);
    expect(screen.getByText('Nothing matches yet.')).toBeTruthy();
    fireEvent.press(screen.getByText('Clear filters'));
    expect(onReset).toHaveBeenCalled();
  });

  it('keeps cached recipes stationary while background data refreshes', () => {
    const onOpen = jest.fn();
    const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const screen = render(<RecipeLibraryView {...viewProps} recipes={[projection]} onOpen={onOpen} />);
    expect(screen.queryByText('Your saved recipes are here while Kwilt refreshes.')).toBeNull();
    fireEvent.press(screen.getByLabelText("Open Grandma Ruth's Cake"));
    expect(onOpen).toHaveBeenCalledWith(projection.recipe.id);
  });

  it('can attach onboarding guidance to a real recipe card', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const targetRef = createRef<View>();
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        recipes={recipes}
        onboardingTargetRef={targetRef}
      />,
    );

    expect(targetRef.current).toBeTruthy();
    expect(
      screen
        .getAllByTestId(/^recipe-plan-toggle-target-/)
        .some((target) => target.props.collapsable === false),
    ).toBe(true);
  });

  it('uses the borderless Goals card grammar for ordinary and recommended recipes', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const ordinary = recipes[1];
    const resultsScreen = render(<RecipeLibraryView {...viewProps} browseMode="results" recipes={recipes} />);
    const cardStyle = StyleSheet.flatten(resultsScreen.getByTestId(`recipe-card-results-${ordinary.recipe.id}`).props.style);
    resultsScreen.unmount();
    const shelvesScreen = render(<RecipeLibraryView {...viewProps} recipes={recipes} />);
    const recommendedStyle = StyleSheet.flatten(
      shelvesScreen.getAllByTestId(/^recipe-card-recommended-/)[0].props.style,
    );

    expect(cardStyle).not.toHaveProperty('backgroundColor');
    expect(cardStyle).not.toHaveProperty('borderWidth');
    expect(recommendedStyle).not.toHaveProperty('backgroundColor');
    expect(recommendedStyle).not.toHaveProperty('borderWidth');
  });

  it('browses horizontal shelves and sends See all into an exact collection', () => {
    const onSeeAll = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(<RecipeLibraryView {...viewProps} recipes={recipes} onSeeAll={onSeeAll} />);

    expect(screen.getByTestId('recipe-discovery-shelves')).toBeTruthy();
    expect(screen.getByTestId('recipe-shelf-breakfast')).toBeTruthy();
    expect(screen.getByTestId('recipe-shelf-mexican')).toBeTruthy();
    expect(screen.queryByTestId('recipe-results-grid')).toBeNull();
    fireEvent.press(screen.getByLabelText('See all Mexican night'));
    expect(onSeeAll).toHaveBeenCalledWith({ ...DEFAULT_RECIPE_INVENTORY_FILTERS, cuisine: 'Mexican' });
  });

  it('keeps Your recipes after the image-rich discovery shelves', () => {
    const personalRecipe = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const recipes = buildRecipeLibraryInventory([personalRecipe]);
    const shelfIds = buildRecipeShelves(recipes).map((shelf) => shelf.id);

    expect(shelfIds.at(-1)).toBe('yours');
    expect(shelfIds.indexOf('yours')).toBeGreaterThan(shelfIds.indexOf('dessert'));
  });

  it('switches from discovery shelves to a two-column See all result without reusing list geometry', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(<RecipeLibraryView {...viewProps} recipes={recipes} />);
    const filters = { ...DEFAULT_RECIPE_INVENTORY_FILTERS, source: 'yours' as const };

    expect(() => {
      screen.rerender(
        <RecipeLibraryView
          {...viewProps}
          browseMode="results"
          filters={filters}
          recipes={recipes.slice(0, 4)}
        />,
      );
    }).not.toThrow();
    expect(screen.getByTestId('recipe-results-grid')).toBeTruthy();
  });

  it('virtualizes discovery sections and recipe rails instead of mounting the full library at launch', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(<RecipeLibraryView {...viewProps} recipes={recipes} />);

    const discovery = screen.getByTestId('recipe-discovery-shelves');
    expect(discovery.props.data.length).toBeGreaterThan(discovery.props.initialNumToRender);
    expect(discovery.props.maxToRenderPerBatch).toBeLessThan(discovery.props.data.length);

    const recommended = screen.getByTestId('recipe-shelf-scroll-recommended');
    expect(recommended.props.horizontal).toBe(true);
    expect(recommended.props.initialNumToRender).toBeLessThan(recommended.props.data.length);

    const breakfast = screen.getByTestId('recipe-shelf-scroll-breakfast');
    expect(breakfast.props.horizontal).toBe(true);
    expect(breakfast.props.initialNumToRender).toBeLessThan(breakfast.props.data.length);
  });

  it('opens a compact illustrated cuisine family from discovery', () => {
    const onSeeAll = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} onSeeAll={onSeeAll} />,
    );

    expect(screen.getByTestId('cuisine-family-row')).toBeTruthy();
    expect(screen.getByText('American')).toBeTruthy();
    const cuisineRail = screen.getByTestId('cuisine-family-scroll');
    expect(cuisineRail.props.data.some((family: { shortLabel: string }) => family.shortLabel === 'Vietnamese')).toBe(true);
    expect(screen.getByText('French').props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(screen.getByText('French').props.style)).toMatchObject({
      fontSize: 10,
    });
    expect(StyleSheet.flatten(screen.getByLabelText('Browse French meals').props.style)).toMatchObject({
      width: 88,
    });
    fireEvent.press(screen.getByLabelText('Browse French meals'));

    expect(onSeeAll).toHaveBeenCalledWith({
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      cuisine: 'French',
    });
  });

  it('groups compact cuisine navigation with discovery controls', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} isFavorite={() => true} />,
    );
    expect(screen.getByTestId('recipe-discovery-navigation')).toBeTruthy();
    expect(screen.getByTestId('cuisine-family-row')).toBeTruthy();
    expect(screen.getByTestId('recipe-shelf-recommended')).toBeTruthy();
  });

  it('lets filter, cuisine, and recipe rails scroll through the full screen width', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} isFavorite={() => true} />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('recipe-filter-rail').props.style)).toMatchObject({
      marginHorizontal: -20,
    });
    expect(StyleSheet.flatten(screen.getByTestId('recipe-filter-rail').props.contentContainerStyle)).toMatchObject({
      paddingHorizontal: 20,
    });
    expect(StyleSheet.flatten(screen.getByTestId('cuisine-family-scroll').props.style)).toMatchObject({
      marginHorizontal: -20,
    });
    expect(StyleSheet.flatten(screen.getByTestId('cuisine-family-scroll').props.contentContainerStyle)).toMatchObject({
      paddingHorizontal: 20,
    });
    expect(StyleSheet.flatten(screen.getByTestId('recipe-shelf-scroll-recommended').props.style)).toMatchObject({
      marginHorizontal: -20,
    });
    expect(StyleSheet.flatten(screen.getByTestId('recipe-shelf-scroll-recommended').props.contentContainerStyle)).toMatchObject({
      paddingHorizontal: 20,
    });
  });

  it('keeps regional cuisine refinements in the single filter rail above results', () => {
    const onSeeAll = jest.fn();
    const filters = {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      cuisine: 'French',
    };
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        browseMode="results"
        filters={filters}
        recipes={recipes}
        onSeeAll={onSeeAll}
      />,
    );

    expect(screen.getAllByTestId('recipe-filter-rail')).toHaveLength(1);
    expect(screen.queryByText('Explore French')).toBeNull();
    expect(screen.queryByTestId('cuisine-refinement-row')).toBeNull();
    expect(screen.queryByTestId('cuisine-family-row')).toBeNull();
    fireEvent.press(screen.getByLabelText('Show Provençal French meals'));

    expect(onSeeAll).toHaveBeenCalledWith({
      ...filters,
      cuisine: 'Provençal French',
    });
  });

  it('removes an active regional refinement by tapping its selected pill', () => {
    const onSeeAll = jest.fn();
    const filters = {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      cuisine: 'Provençal French',
    };
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        browseMode="results"
        filters={filters}
        recipes={buildRecipeLibraryInventory([])}
        onSeeAll={onSeeAll}
      />,
    );

    fireEvent.press(screen.getByLabelText('Show Provençal French meals'));

    expect(onSeeAll).toHaveBeenCalledWith({
      ...filters,
      cuisine: 'French',
    });
    expect(StyleSheet.flatten(
      screen.getByTestId('recipe-filter-pill-cuisine-proven-al-french').props.style,
    )).toMatchObject({ height: 34, paddingHorizontal: 12, backgroundColor: colors.sumi900 });
  });

  it('keeps liked meals in the quick-filter rail instead of a full discovery shelf', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const favoriteIds = new Set([recipes[2].recipe.id, recipes[5].recipe.id]);
    const onToggleLiked = jest.fn();
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        recipes={recipes}
        isFavorite={(recipe) => favoriteIds.has(recipe.recipe.id)}
        onToggleLiked={onToggleLiked}
      />,
    );

    expect(screen.queryByTestId('recipe-shelf-favorites')).toBeNull();
    fireEvent.press(screen.getByLabelText('Show liked meals'));
    expect(onToggleLiked).toHaveBeenCalled();
  });

  it('offers practical quick filters with unique icons', () => {
    const onSeeAll = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} onSeeAll={onSeeAll} />,
    );

    fireEvent.press(screen.getByLabelText('Show meals ready in 30 minutes'));
    expect(onSeeAll).toHaveBeenCalledWith({
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      maxMinutes: 30,
    });
    fireEvent.press(screen.getByLabelText('Show breakfast and brunch meals'));
    expect(onSeeAll).toHaveBeenCalledWith({
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      category: 'Breakfast & brunch',
    });
    expect(screen.getAllByTestId('recipe-quick-filter-liked-icon').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('recipe-quick-filter-quick-icon').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('recipe-quick-filter-breakfast-icon').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('recipe-quick-filter-dinner-icon').length).toBeGreaterThan(0);
  });

  it('composes a quick filter with drawer-applied filters', () => {
    const onSeeAll = jest.fn();
    const filters = {
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      category: 'Desserts' as const,
    };
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        browseMode="results"
        filters={filters}
        recipes={recipes}
        onSeeAll={onSeeAll}
      />,
    );

    fireEvent.press(screen.getByLabelText('Show meals ready in 30 minutes'));

    expect(onSeeAll).toHaveBeenCalledWith({
      ...filters,
      maxMinutes: 30,
    });
  });

  it('removes hidden meals before any discovery surface is derived', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const hidden = recipes[0];
    const visible = buildVisibleRecipeInventory([], [hidden.recipe.id]);

    expect(visible.some((projection) => projection.recipe.id === hidden.recipe.id)).toBe(false);
    expect(buildRecipeShelves(visible).flatMap((shelf) => shelf.recipes).some((projection) => projection.recipe.id === hidden.recipe.id)).toBe(false);
  });

  it('does not add Hide as a third floating meal-card control', () => {
    const recipes = buildRecipeLibraryInventory([]).slice(0, 2);
    const screen = render(<RecipeLibraryView {...viewProps} browseMode="results" recipes={recipes} />);

    expect(screen.queryByLabelText(/Hide .* meal/i)).toBeNull();
  });

  it('keeps Recommended and the first card on the canonical leading gutter', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const shelvesScreen = render(<RecipeLibraryView {...viewProps} recipes={recipes} />);
    const shelvesStyle = StyleSheet.flatten(
      shelvesScreen.getByTestId('recipe-discovery-shelves').props.contentContainerStyle,
    );
    expect(shelvesStyle.paddingHorizontal).toBe(spacing.sm + spacing.md);
    shelvesScreen.unmount();

    const resultsScreen = render(
      <RecipeLibraryView {...viewProps} browseMode="results" recipes={recipes.slice(0, 4)} />,
    );
    const resultsStyle = StyleSheet.flatten(
      resultsScreen.getByTestId('recipe-results-grid').props.contentContainerStyle,
    );
    expect(resultsStyle.paddingHorizontal).toBe(spacing.sm + spacing.md);
  });

  it('places at most two benefit-led editorial invitations through the shelves', () => {
    const onOpenCollection = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} onOpenCollection={onOpenCollection} />,
    );

    const firstCollection = EDITORIAL_MEAL_COLLECTIONS.find((collection) => collection.id === editorialPlacements[0].collectionId)!;
    fireEvent.press(screen.getByRole('button', { name: `Open Collection: ${firstCollection.title}` }));
    expect(onOpenCollection).toHaveBeenCalledWith(firstCollection.id);

    const discovery = buildRecipeDiscoverySections(buildRecipeShelves(recipes), editorialPlacements);
    expect(discovery.filter((item) => item.kind === 'offer')).toHaveLength(2);
    const firstOfferIndex = discovery.findIndex((item) => item.kind === 'offer');
    const secondOfferIndex = discovery.findIndex((item, index) => item.kind === 'offer' && index > firstOfferIndex);
    expect(discovery.slice(0, firstOfferIndex).filter((item) => item.kind === 'shelf')).toHaveLength(3);
    expect(discovery.slice(0, secondOfferIndex).filter((item) => item.kind === 'shelf')).toHaveLength(6);
  });

  it('replaces the giant hero with explained recommendations and time-only card metadata', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(<RecipeLibraryView {...viewProps} recipes={recipes} />);

    expect(screen.getByTestId('recipe-shelf-recommended')).toBeTruthy();
    expect(screen.queryByTestId('featured-recipe-card')).toBeNull();
    expect(screen.getAllByTestId(/^recommendation-reason-/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Serves /)).toBeNull();
    expect(screen.queryByText(/American ·|Italian ·|Mexican ·/)).toBeNull();
  });

  it('keeps narrowed results in the two-column grid', () => {
    const recipes = buildRecipeLibraryInventory([]).slice(0, 4);
    const filters = { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30 };
    const screen = render(<RecipeLibraryView {...viewProps} browseMode="results" filters={filters} recipes={recipes} />);

    expect(screen.getByTestId('recipe-results-grid')).toBeTruthy();
    expect(screen.queryByTestId('recipe-discovery-shelves')).toBeNull();
    expect(screen.queryByTestId(/^editorial-collection-offer-/)).toBeNull();
    expect(screen.getByText('Matching meals')).toBeTruthy();
  });

  it('uses the canonical compact inventory controls without duplicating Search', () => {
    const onOpenFilters = jest.fn();
    const screen = render(
      <RecipeInventoryControls
        sort="featured"
        resultCount={100}
        totalCount={100}
        filterCount={2}
        onOpenFilters={onOpenFilters}
        onOpenSort={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Search recipes')).toBeNull();
    expect(screen.getByText('100 meals')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Filter meals, 2 active'));
    expect(onOpenFilters).toHaveBeenCalled();
    expect(screen.getByTestId('recipe-inventory-control-group')).toBeTruthy();
    expect(screen.getByTestId('recipe-funnel-control-surface')).toBeTruthy();
    const sortStyle = StyleSheet.flatten(screen.getByTestId('recipe-sort-control-surface').props.style);
    expect(sortStyle).toMatchObject({ minWidth: 40, height: 34 });
  });

  it('uses one selected-pill grammar for quick and drawer-applied filters', () => {
    const onOpenFilters = jest.fn();
    const onClearFilter = jest.fn();
    const filters = { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30, cuisine: 'Mexican' };
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        browseMode="results"
        recipes={recipes}
        filters={filters}
        sort="quickest"
        totalCount={100}
        onOpenFilters={onOpenFilters}
        onOpenSort={jest.fn()}
        onClearFilter={onClearFilter}
      />,
    );

    fireEvent.press(screen.getByLabelText('Filter meals, 2 active'));
    expect(onOpenFilters).toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Remove Mexican filter'));
    expect(onClearFilter).toHaveBeenCalledWith('cuisine');
    expect(screen.queryByText('Filters · 2')).toBeNull();
    expect(screen.queryByTestId('recipe-filter-pill-filters')).toBeNull();
    expect(screen.queryByTestId(/applied-filter/)).toBeNull();
    const filterRailLabels = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel)
      .filter((label) => typeof label === 'string');
    expect(filterRailLabels.indexOf('Remove Mexican filter')).toBeLessThan(
      filterRailLabels.indexOf('Show liked meals'),
    );
    expect(StyleSheet.flatten(screen.getByTestId('recipe-funnel-control-surface').props.style)).toMatchObject({
      height: 34,
      backgroundColor: colors.sumi900,
    });
    expect(StyleSheet.flatten(screen.getByTestId('recipe-filter-pill-cuisine-all').props.style)).toMatchObject({
      height: 34,
      paddingHorizontal: 12,
      backgroundColor: colors.sumi900,
    });
  });

  it('gives every quick filter a distinct leading icon', () => {
    const screen = render(
      <RecipeFilterDrawer
        visible
        value={DEFAULT_RECIPE_INVENTORY_FILTERS}
        onClose={jest.fn()}
        onChange={jest.fn()}
      />,
    );
    const icons = screen.getAllByTestId(/^recipe-filter-choice-icon-/, {
      includeHiddenElements: true,
    });
    const iconIds = icons.map((icon) => icon.props.testID);

    expect(icons).toHaveLength(35);
    expect(new Set(iconIds).size).toBe(iconIds.length);
  });

  it('applies drawer filters immediately and stays open until explicitly closed', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    const screen = render(
      <RecipeFilterDrawer
        visible
        value={DEFAULT_RECIPE_INVENTORY_FILTERS}
        onClose={onClose}
        onChange={onChange}
      />,
    );

    fireEvent.press(screen.getByText('Yours'));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      source: 'yours',
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Show meals')).toBeNull();
  });

  it('shows filter progress only when an update remains pending', () => {
    jest.useFakeTimers();
    try {
      const screen = render(
        <RecipeFilterDrawer
          visible
          value={DEFAULT_RECIPE_INVENTORY_FILTERS}
          updating
          onClose={jest.fn()}
          onChange={jest.fn()}
        />,
      );

      expect(screen.queryByText('Updating meals…')).toBeNull();
      act(() => jest.advanceTimersByTime(200));
      expect(screen.getByText('Updating meals…')).toBeTruthy();
      expect(screen.getByLabelText('Updating meals')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('makes Search the labeled primary action and keeps Add as a circular plus', () => {
    const onAdd = jest.fn();
    const onSearch = jest.fn();
    const onAsk = jest.fn();
    const screen = render(<RecipeInventoryDock onAdd={onAdd} onSearch={onSearch} onAsk={onAsk} />);

    expect(screen.getByText('Find recipes')).toBeTruthy();
    expect(screen.queryByText('Add a recipe')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('recipe-inventory-add').props.style)).toMatchObject({
      width: INVENTORY_DOCK_BUTTON_SIZE_PX,
      height: INVENTORY_DOCK_BUTTON_SIZE_PX,
    });
    fireEvent.press(screen.getByLabelText('Add a recipe'));
    fireEvent.press(screen.getByLabelText('Find recipes'));
    fireEvent.press(screen.getByLabelText('Ask Kwilt about meals'));
    expect(onAdd).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalled();
    expect(onAsk).toHaveBeenCalled();
  });

  it('starts recipe capture from intent instead of import mechanics', () => {
    const onFamily = jest.fn();
    const onWeb = jest.fn();
    const onManual = jest.fn();
    const screen = render(
      <RecipeCaptureDrawer
        visible
        onClose={jest.fn()}
        onFamily={onFamily}
        onWeb={onWeb}
        onManual={onManual}
      />,
    );

    expect(screen.queryByText('Photo or scan')).toBeNull();
    expect(screen.queryByText('Link, text, or voice')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Family recipe' }));
    fireEvent.press(screen.getByRole('button', { name: 'Recipe from the web' }));
    fireEvent.press(screen.getByRole('button', { name: 'Start blank' }));
    expect(onFamily).toHaveBeenCalledTimes(1);
    expect(onWeb).toHaveBeenCalledTimes(1);
    expect(onManual).toHaveBeenCalledTimes(1);
  });

  it('puts a direct Meal Plan toggle on every meal card', () => {
    const onAddToPlan = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const featured = recipes.find((projection) => projection.recipe.id === 'kwilt-starter-buttermilk-berry-pancakes') ?? recipes[0];
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        recipes={recipes}
        onAddToPlan={onAddToPlan}
        isInPlan={(projection) => projection.currentVersion.id === featured.currentVersion.id}
      />,
    );

    const selectedToggle = screen.getAllByLabelText(`Remove ${featured.currentVersion.title} from Meal Plan`)[0];
    const selectedStyle = StyleSheet.flatten(selectedToggle.props.style);
    expect(selectedStyle).toMatchObject({ width: 36, height: 36, backgroundColor: colors.sumi900 });
    fireEvent.press(selectedToggle);
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.toggle.off');
    expect(onAddToPlan).toHaveBeenCalledWith(featured);
    const ordinary = recipes.find((projection) => projection.currentVersion.id !== featured.currentVersion.id)!;
    fireEvent.press(screen.getAllByLabelText(`Add ${ordinary.currentVersion.title} to Meal Plan`)[0]);
    expect(HapticsService.trigger).toHaveBeenLastCalledWith('canvas.toggle.on');
    expect(onAddToPlan).toHaveBeenCalledWith(ordinary);
  });

  it('keeps Add to Meal Plan as the only visible action on inventory cards', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView
        {...viewProps}
        browseMode="results"
        recipes={recipes.slice(0, 2)}
      />,
    );

    const add = screen.getByLabelText(`Add ${recipes[0].currentVersion.title} to Meal Plan`);
    const addStyle = StyleSheet.flatten(add.props.style);
    expect(addStyle).toMatchObject({ width: 36, height: 36 });
    expect(screen.queryByLabelText(/favorites/i)).toBeNull();
    expect(screen.getAllByRole('button').filter((button) => /Meal Plan/.test(button.props.accessibilityLabel ?? ''))).toHaveLength(2);
  });

  it('opens one complete Meal Plan drawer from the durable header affordance', () => {
    const onClose = jest.fn();
    const onRemove = jest.fn();
    const items = Array.from({ length: 6 }, (_, index) => ({
      id: `meal-${index + 1}`,
      candidateId: `candidate-${index + 1}`,
      title: `Meal ${index + 1}`,
      storageRef: `bundle://household-recipe-atlas/${index + 1}`,
      lifecycle: 'idea' as const,
      createdAt: `2026-08-1${index + 1}T12:00:00.000Z`,
      sentAt: null,
      voteCount: 1,
      missingItemCount: null,
      canRemove: true,
    }));
    const drawer = render(
      <MealPlanDrawer
        visible
        items={items}
        canManage
        onClose={onClose}
        onRemove={onRemove}
      />,
    );

    expect(drawer.getByText('Ideas')).toBeTruthy();
    expect(drawer.getByText('Meals you’re considering. Add any recipe with +, or ask Kwilt.')).toBeTruthy();
    expect(drawer.getByLabelText('Meal plan, 6 meals')).toBeTruthy();
    expect(drawer.queryByTestId('meal-plan-drawer-count')).toBeNull();
    expect(drawer.queryByTestId('meal-plan-drawer-thumbnail')).toBeNull();
    expect(drawer.queryByLabelText('Search meals')).toBeNull();
    expect(drawer.getByText('Meal 6')).toBeTruthy();
    expect(drawer.queryByLabelText('More actions for Meal 1')).toBeNull();
    expect(drawer.getAllByTestId('plan-remove-minus-candidate-1').length).toBeGreaterThan(0);
    fireEvent.press(drawer.getByRole('button', { name: 'Remove Meal 1 from Meal ideas' }));
    expect(onRemove).toHaveBeenCalledWith(items[0]);
  });

  it('keeps household sharing inside the native Share entry point', () => {
    const onSharePlan = jest.fn();
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[{
          id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
          lifecycle: 'idea', createdAt: '2026-08-12T12:00:00.000Z', sentAt: null,
          voteCount: 0, missingItemCount: null, canRemove: true,
        }]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSharePlan={onSharePlan}
        hasActiveGuestLink
        onTurnOffGuestLink={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(drawer.getByText('Meal plan').props.style)).toMatchObject({
      fontFamily: typography.titleLg.fontFamily,
      fontSize: typography.titleLg.fontSize,
    });
    expect(drawer.getByText('Share')).toBeTruthy();
    expect(drawer.getAllByTestId('plan-drawer-header-icon').length).toBeGreaterThan(0);
    expect(drawer.queryByTestId('meal-plan-drawer-count')).toBeNull();
    const shareButton = drawer.getByRole('button', { name: 'Share Plan' });
    expect(StyleSheet.flatten(shareButton.props.style)).toMatchObject({
      backgroundColor: 'transparent',
      borderWidth: 0,
    });
    expect(drawer.getByTestId('plan-share-icon')).toBeTruthy();
    expect(StyleSheet.flatten(drawer.getByText('Share').props.style)).toMatchObject({
      fontFamily: BUTTON_SIZE_TOKENS.sm.text.fontFamily,
      fontSize: BUTTON_SIZE_TOKENS.sm.text.fontSize,
    });
    expect(within(drawer.getByTestId('plan-drawer-title-cluster')).getByLabelText('Guest link options')).toBeTruthy();
    fireEvent.press(shareButton);
    expect(onSharePlan).toHaveBeenCalledTimes(1);

    expect(drawer.queryByRole('button', { name: 'Ask household' })).toBeNull();
  });

  it('lets a durable Food checkpoint override a stale pick-meal route hint', () => {
    expect(shouldShowPickMealGuide({
      routeOnboarding: 'pick-meal',
      foodGuideCheckpoint: FOOD_FIRST_CYCLE_CHECKPOINTS['share-plan'],
      hasRecipes: true,
    })).toBe(false);
    expect(shouldShowPickMealGuide({
      routeOnboarding: 'pick-meal',
      foodGuideCheckpoint: 'complete',
      hasRecipes: true,
    })).toBe(false);
    expect(shouldShowPickMealGuide({
      routeOnboarding: 'pick-meal',
      foodGuideCheckpoint: null,
      hasRecipes: true,
    })).toBe(true);
  });

  it('moves the grocery action below the translucent native share sheet without unmounting it', () => {
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[{
          id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
          lifecycle: 'idea', createdAt: '2026-08-12T12:00:00.000Z', sentAt: null,
          voteCount: 0, missingItemCount: null, canRemove: true,
        }]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSharePlan={jest.fn()}
        shareBusy
        shareSheetVisible
        onSendToGroceries={jest.fn()}
        onOpenGroceries={jest.fn()}
      />,
    );

    const planDrawer = mockBottomDrawerProps.find((props) => (
      props.visible && props.snapPoints?.[0] === '100%'
    ));
    expect(planDrawer?.actionDock).toBeTruthy();
    const transition = drawer.getByTestId(
      'plan-grocery-action-transition',
      { includeHiddenElements: true },
    );
    expect(StyleSheet.flatten(transition.props.style)).toMatchObject({
      transform: [{ translateY: 96 }],
    });
  });

  it('keeps guest suggestions in the Plan instead of the sharing surface', () => {
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[{
          id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
          lifecycle: 'idea', createdAt: '2026-08-12T12:00:00.000Z', sentAt: null,
          voteCount: 0, missingItemCount: null, canRemove: true,
        }]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        guestSuggestions={[{
          id: 'response-1',
          displayName: 'Blaire',
          suggestion: 'Breakfast for dinner',
        }]}
      />,
    );

    expect(drawer.getByText('Guest suggestions')).toBeTruthy();
    expect(drawer.getByText('Blaire · “Breakfast for dinner”')).toBeTruthy();
  });

  it('bounds long Plan titles beside a top-aligned thumbnail and anchored actions', () => {
    const title = 'Open-faced bean and cheese rolls with roasted peppers and a very long family recipe name';
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[{
          id: 'meal-long', candidateId: 'candidate-long', title, storageRef: null,
          lifecycle: 'idea', createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
          voteCount: 0, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 }, missingItemCount: null,
          contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null }, supporters: [],
          viewerReaction: null, canReact: true, canRemove: true, canMarkMade: false,
        }]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(drawer.getByTestId('plan-row-candidate-long').props.style)).toMatchObject({
      alignItems: 'flex-start',
    });
    expect(StyleSheet.flatten(drawer.getByTestId('plan-title-candidate-long').props.style)).toMatchObject({
      minWidth: 0,
      fontFamily: fonts.semibold,
      fontSize: 15,
      lineHeight: 22,
    });
    expect(within(drawer.getByTestId('plan-copy-candidate-long')).getByTestId(
      'plan-reaction-row-candidate-long',
    )).toBeTruthy();
    expect(drawer.getByRole('button', { name: `Remove ${title} from Meal ideas` })).toBeTruthy();
  });

  it('keeps one two-row thumbnail height when a Plan title wraps to a third row', () => {
    const shortTitle = 'Tacos';
    const longTitle = 'Tex-Mex scrambled eggs with tortilla strips (Migas)';
    const item = (candidateId: string, title: string) => ({
      id: candidateId, candidateId, title, storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 0, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 }, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null }, supporters: [],
      viewerReaction: null, canReact: true, canRemove: false, canMarkMade: false,
    });
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[item('short', shortTitle), item('long', longTitle)]}
        canManage={false}
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onReact={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(drawer.getByLabelText(shortTitle).props.style)).toMatchObject({ width: 56, height: 56 });
    expect(StyleSheet.flatten(drawer.getByLabelText(longTitle).props.style)).toMatchObject({ width: 56, height: 56 });
  });

  it('reuses the household food illustration to invite an empty first idea', () => {
    const onGetIdeas = jest.fn();
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onGetIdeas={onGetIdeas}
      />,
    );

    expect(drawer.getByText('Add a meal idea')).toBeTruthy();
    fireEvent.press(drawer.getByRole('button', { name: 'Suggest meals' }));
    expect(onGetIdeas).toHaveBeenCalledTimes(1);
    expect(drawer.queryByText('Nothing in Plan yet')).toBeNull();
    expect(drawer.queryByText('Add any recipe you might want to make.')).toBeNull();
  });

  it('places the Kwilt ideas action between Ideas and Planned and changes its label after success', async () => {
    const onGetIdeas = jest.fn().mockResolvedValue(true);
    const idea = {
      id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 0, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 }, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
      supporters: [], viewerReaction: null, canReact: false, canRemove: true, canMarkMade: false,
    };
    const drawer = render(
      <MealPlanDrawer
        visible items={[idea]} canManage onClose={jest.fn()} onRemove={jest.fn()}
        onGetIdeas={onGetIdeas}
      />,
    );
    const draggableList = drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      Array.isArray(node.props.items) && typeof node.props.onOrderChange === 'function'
    ))[0];

    expect(draggableList.props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'meal-1',
      'get-ideas-from-kwilt',
      'planned-heading',
      'planned-empty',
    ]);
    expect(StyleSheet.flatten(
      drawer.getByRole('button', { name: 'Suggest meals' }).props.style,
    )).toMatchObject({
      width: '100%',
      minHeight: 48,
      backgroundColor: colors.shellAlt,
      borderWidth: 0,
      borderRadius: radii.card,
      alignItems: 'flex-start',
    });
    await act(async () => {
      fireEvent.press(drawer.getByRole('button', { name: 'Suggest meals' }));
    });
    expect(onGetIdeas).toHaveBeenCalledTimes(1);
    expect(drawer.getByRole('button', { name: 'Suggest more meals' })).toBeTruthy();
  });

  it('uses standard drawer dismissal without a redundant close button', () => {
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    const planDrawerProps = mockBottomDrawerProps.find((props) => props.visible);
    expect(planDrawerProps).toMatchObject({
      snapPoints: ['100%'],
      snapIndex: 0,
      keyboardAvoidanceEnabled: false,
    });
    expect(planDrawerProps?.dismissable).not.toBe(false);
    expect(planDrawerProps?.dismissOnBackdropPress).not.toBe(false);
    expect(drawer.queryByRole('button', { name: 'Close Plan' })).toBeNull();
    expect(StyleSheet.flatten(drawer.getByLabelText('Meal plan, 0 meals').props.style).flex).toBeUndefined();
    expect(drawer.queryByTestId('meal-plan-drawer-count')).toBeNull();
  });

  it('shows Meal ideas and Planned as two sections of one list with a View groceries dock', () => {
    const onSendToGroceries = jest.fn();
    const onOpenGroceries = jest.fn();
    const idea = {
      id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 0, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 }, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
      supporters: [], viewerReaction: null, canReact: false, canRemove: true, canMarkMade: false,
    };
    const sent = {
      ...idea,
      id: 'meal-2', candidateId: 'candidate-2', title: 'Soup', lifecycle: 'sent' as const,
      sentAt: '2026-08-11T13:00:00.000Z', missingItemCount: 4, canMarkMade: true,
    };
    const drawer = render(
      <MealPlanDrawer
        visible items={[idea, sent]} canManage onClose={jest.fn()}
        onRemove={jest.fn()} onSendToGroceries={onSendToGroceries} onOpenGroceries={onOpenGroceries}
      />,
    );

    expect(drawer.getByTestId('meal-plan-drawer').props.accessibilityLabel).toBe(
      JSON.stringify({ snapIndex: 0, snapPoints: ['100%'] }),
    );
    expect(drawer.queryByText('Open for ideas')).toBeNull();
    expect(drawer.queryByText(/Everyone can add/)).toBeNull();
    expect(drawer.queryByText('Sent to groceries')).toBeNull();
    expect(drawer.queryByRole('button', { name: 'Send to Groceries' })).toBeNull();
    expect(drawer.getByRole('button', { name: 'Move Tacos' })).toBeTruthy();
    expect(drawer.getByText('Planned').props.accessibilityRole).toBe('header');
    expect(drawer.getByText('Soup')).toBeTruthy();
    expect(drawer.queryByText(/item.*left/i)).toBeNull();
    expect(drawer.queryByText(/grocer.*left/i)).toBeNull();
    expect(drawer.queryByText('Drop in Planned')).toBeNull();
    const groceryAction = drawer.getByRole('button', { name: 'View groceries' });
    expect(StyleSheet.flatten(groceryAction.props.style)).toMatchObject({
      width: '100%',
      minHeight: 44,
      backgroundColor: colors.primary,
    });
    expect(drawer.getByText('View groceries')).toBeTruthy();
    const planDrawerProps = mockBottomDrawerProps.find((props) => props.visible);
    expect(planDrawerProps?.actionDock).toBeTruthy();
    expect(planDrawerProps?.contentLayout).toBe('edgeToEdge');
    expect(planDrawerProps?.bottomAccessory).toBeUndefined();
    expect(drawer.queryByTestId('plan-view-groceries.trailing-icon')).toBeNull();
    const planList = drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      node.props.activationMode === 'handle' && Array.isArray(node.props.items)
    ))[0];
    expect(planList.props.extraBottomPadding).toBe(88);
    fireEvent(drawer.getByRole('button', { name: 'Move Tacos' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'addToGroceries' },
    });
    expect(onSendToGroceries).toHaveBeenCalledWith(['candidate-1']);
    fireEvent.press(drawer.getByRole('button', { name: 'View groceries' }));
    expect(onOpenGroceries).toHaveBeenCalledTimes(1);
  });

  it('lights the destination section and commits exactly one lifecycle move from the live placeholder index', () => {
    const onSendToGroceries = jest.fn();
    const onReturnToPlan = jest.fn();
    const base = {
      storageRef: null,
      createdAt: '2026-08-11T12:00:00.000Z',
      voteCount: 0,
      reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 },
      missingItemCount: null,
      supporters: [],
      viewerReaction: null,
      canReact: false,
      canRemove: true,
      canMarkMade: false,
    };
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[
          { ...base, id: 'idea', candidateId: 'idea', title: 'Tacos', lifecycle: 'idea', sentAt: null },
          { ...base, id: 'planned', candidateId: 'planned', title: 'Soup', lifecycle: 'sent', sentAt: '2026-08-11T13:00:00.000Z' },
        ]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSendToGroceries={onSendToGroceries}
        onReturnToPlan={onReturnToPlan}
      />,
    );
    const draggableList = drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      typeof node.props.onDragPositionChange === 'function'
      && typeof node.props.onDragStart === 'function'
      && typeof node.props.onOrderChange === 'function'
    ))[0];

    act(() => {
      draggableList.props.onDragStart(0);
      draggableList.props.onDragPositionChange(0, 2);
    });

    const firstDropIds = draggableList.props.items.map((entry: { id: string }) => entry.id);
    const [firstMoved] = firstDropIds.splice(0, 1);
    firstDropIds.splice(2, 0, firstMoved);
    act(() => draggableList.props.onOrderChange(firstDropIds, { fromIndex: 0, toIndex: 2 }));
    expect(onSendToGroceries).toHaveBeenCalledTimes(1);
    expect(onSendToGroceries).toHaveBeenCalledWith(['idea']);
    expect(onReturnToPlan).not.toHaveBeenCalled();

    const nextDraggableList = drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      typeof node.props.onDragPositionChange === 'function'
      && typeof node.props.onDragStart === 'function'
      && typeof node.props.onOrderChange === 'function'
    ))[0];
    const plannedIndex = nextDraggableList.props.items.findIndex((entry: { id: string }) => entry.id === 'planned');
    const secondDropIds = nextDraggableList.props.items.map((entry: { id: string }) => entry.id);
    const [secondMoved] = secondDropIds.splice(plannedIndex, 1);
    secondDropIds.splice(0, 0, secondMoved);
    act(() => {
      nextDraggableList.props.onDragStart(plannedIndex);
      nextDraggableList.props.onDragPositionChange(plannedIndex, 0);
      nextDraggableList.props.onOrderChange(secondDropIds, { fromIndex: plannedIndex, toIndex: 0 });
    });
    expect(onReturnToPlan).toHaveBeenCalledTimes(1);
    expect(onReturnToPlan).toHaveBeenCalledWith('planned');
  });

  it('keeps a meal where it was dropped through the lifecycle receipt and an identical reload', () => {
    const base = {
      storageRef: null,
      voteCount: 0,
      reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 },
      missingItemCount: null,
      supporters: [],
      viewerReaction: null,
      canReact: false,
      canRemove: true,
      canMarkMade: false,
    };
    const idea = {
      ...base,
      id: 'idea', candidateId: 'idea', title: 'Tacos', lifecycle: 'idea' as const,
      createdAt: '2026-08-11T14:00:00.000Z', sentAt: null, voteCount: 10,
    };
    const soup = {
      ...base,
      id: 'soup', candidateId: 'soup', title: 'Soup', lifecycle: 'sent' as const,
      createdAt: '2026-08-11T12:00:00.000Z', sentAt: '2026-08-11T15:00:00.000Z',
    };
    const pie = {
      ...base,
      id: 'pie', candidateId: 'pie', title: 'Pie', lifecycle: 'sent' as const,
      createdAt: '2026-08-11T13:00:00.000Z', sentAt: '2026-08-11T15:00:00.000Z',
    };
    const commonProps = {
      visible: true,
      canManage: true,
      onClose: jest.fn(),
      onRemove: jest.fn(),
      onSendToGroceries: jest.fn(() => Promise.resolve({ version: 2 })),
    };
    const drawer = render(<MealPlanDrawer {...commonProps} items={[idea, soup, pie]} />);
    const findDraggableList = () => drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      typeof node.props.onOrderChange === 'function' && Array.isArray(node.props.items)
    ))[0];
    const draggableList = findDraggableList();
    const dropIds = draggableList.props.items.map((entry: { id: string }) => entry.id);
    const [moved] = dropIds.splice(0, 1);
    dropIds.splice(3, 0, moved);

    act(() => draggableList.props.onOrderChange(dropIds, { fromIndex: 0, toIndex: 3 }));
    expect(findDraggableList().props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'planned-heading', 'pie', 'soup', 'idea',
    ]);

    const authoritativeItems = [{ ...idea, lifecycle: 'sent' as const, sentAt: '2026-08-11T16:00:00.000Z' }, soup, pie];
    drawer.rerender(<MealPlanDrawer {...commonProps} items={authoritativeItems} />);
    expect(findDraggableList().props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'planned-heading', 'pie', 'soup', 'idea',
    ]);

    drawer.rerender(<MealPlanDrawer {...commonProps} items={authoritativeItems.map((item) => ({ ...item }))} />);
    expect(findDraggableList().props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'planned-heading', 'pie', 'soup', 'idea',
    ]);
  });

  it('restores the original section and position when a lifecycle move is rejected', async () => {
    const base = {
      storageRef: null,
      voteCount: 0,
      reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 },
      missingItemCount: null,
      supporters: [],
      viewerReaction: null,
      canReact: false,
      canRemove: true,
      canMarkMade: false,
    };
    const firstIdea = {
      ...base,
      id: 'first', candidateId: 'first', title: 'First idea', lifecycle: 'idea' as const,
      createdAt: '2026-08-11T14:00:00.000Z', sentAt: null,
    };
    const secondIdea = {
      ...base,
      id: 'second', candidateId: 'second', title: 'Second idea', lifecycle: 'idea' as const,
      createdAt: '2026-08-11T13:00:00.000Z', sentAt: null,
    };
    const planned = {
      ...base,
      id: 'planned', candidateId: 'planned', title: 'Planned meal', lifecycle: 'sent' as const,
      createdAt: '2026-08-11T12:00:00.000Z', sentAt: '2026-08-11T15:00:00.000Z',
    };
    const onSendToGroceries = jest.fn(() => Promise.reject(new Error('offline')));
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[firstIdea, secondIdea, planned]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSendToGroceries={onSendToGroceries}
      />,
    );
    const findDraggableList = () => drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      typeof node.props.onOrderChange === 'function' && Array.isArray(node.props.items)
    ))[0];
    const draggableList = findDraggableList();
    const dropIds = draggableList.props.items.map((entry: { id: string }) => entry.id);
    const [moved] = dropIds.splice(0, 1);
    dropIds.push(moved);

    act(() => draggableList.props.onOrderChange(dropIds, { fromIndex: 0, toIndex: dropIds.length - 1 }));
    expect(findDraggableList().props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'second', 'planned-heading', 'planned', 'first',
    ]);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(findDraggableList().props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'first', 'second', 'planned-heading', 'planned',
    ]);
  });

  it('keeps a meal where it was dropped within Planned without issuing a lifecycle move', () => {
    const onSendToGroceries = jest.fn();
    const onReturnToPlan = jest.fn();
    const base = {
      storageRef: null,
      createdAt: '2026-08-11T12:00:00.000Z',
      voteCount: 0,
      reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 },
      missingItemCount: null,
      supporters: [],
      viewerReaction: null,
      canReact: false,
      canRemove: true,
      canMarkMade: false,
      lifecycle: 'sent' as const,
      sentAt: '2026-08-11T13:00:00.000Z',
    };
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[
          { ...base, id: 'huevos', candidateId: 'huevos', title: 'Huevos rancheros', voteCount: 2 },
          { ...base, id: 'grilled', candidateId: 'grilled', title: 'Grilled cheeseburgers', voteCount: 1 },
          { ...base, id: 'pie', candidateId: 'pie', title: 'Classic apple pie' },
        ]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSendToGroceries={onSendToGroceries}
        onReturnToPlan={onReturnToPlan}
      />,
    );
    const findDraggableList = () => drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      typeof node.props.onOrderChange === 'function' && Array.isArray(node.props.items)
    ))[0];
    const draggableList = findDraggableList();
    const from = draggableList.props.items.findIndex((entry: { id: string }) => entry.id === 'grilled');
    const dropIds = draggableList.props.items.map((entry: { id: string }) => entry.id);
    const [moved] = dropIds.splice(from, 1);
    dropIds.push(moved);

    act(() => draggableList.props.onOrderChange(dropIds, { fromIndex: from, toIndex: dropIds.length - 1 }));

    expect(findDraggableList().props.items.map((entry: { id: string }) => entry.id)).toEqual([
      'planned-heading', 'huevos', 'pie', 'grilled',
    ]);
    expect(onSendToGroceries).not.toHaveBeenCalled();
    expect(onReturnToPlan).not.toHaveBeenCalled();
  });

  it('shows existing positive reactions, reveals their people, and allows only one viewer reaction', () => {
    const onReact = jest.fn();
    const item = {
      id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 2, reactionCounts: { thumbs_up: 1, heart: 1, yum: 0, excited: 0, fire: 0, downvote: 0 }, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
      supporters: [
        { personId: 'person-2', displayName: 'Sam', avatarUrl: null, reaction: 'thumbs_up' as const },
        { personId: 'person-3', displayName: 'Alex', avatarUrl: null, reaction: 'heart' as const },
      ],
      viewerReaction: 'heart' as const, canReact: true, canRemove: false, canMarkMade: false,
    };
    const drawer = render(
      <MealPlanDrawer
        visible items={[item]} canManage={false} onClose={jest.fn()}
        onRemove={jest.fn()} onReact={onReact}
      />,
    );

    expect(drawer.getByText('👍')).toBeTruthy();
    expect(drawer.getByText('❤️')).toBeTruthy();
    expect(StyleSheet.flatten(drawer.getByLabelText('Thumbs up Tacos, 1').props.style)).toMatchObject({
      minHeight: 32,
      paddingHorizontal: 8,
    });
    expect(drawer.getByLabelText('Thumbs up Tacos, 1').props.hitSlop).toBe(6);
    expect(StyleSheet.flatten(drawer.getByText('👍').props.style)).toMatchObject({
      fontSize: 16,
      lineHeight: 22,
      transform: [{ translateY: 1 }],
    });
    expect(drawer.queryByLabelText('React to Tacos')).toBeNull();
    expect(drawer.queryByLabelText('Not for me: Tacos')).toBeNull();

    fireEvent.press(drawer.getByLabelText('Thumbs up Tacos, 1'));
    expect(drawer.getByLabelText('Thumbs up Tacos, 1').props.accessibilityState).toMatchObject({ expanded: true, selected: false });
    expect(onReact).not.toHaveBeenCalled();

    fireEvent.press(drawer.getByLabelText('Love Tacos, 1'));
    expect(onReact).toHaveBeenCalledWith('candidate-1', null);

  });

  it('keeps ordinary reactions and the Hard Pass reason inside one keyboard-safe drawer', () => {
    jest.useFakeTimers();
    const onReact = jest.fn();
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[{
          id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
          lifecycle: 'idea', createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
          voteCount: 0, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 }, missingItemCount: null,
          contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null }, supporters: [],
          viewerReaction: null, canReact: true, canRemove: false, canMarkMade: false,
        }]}
        canManage={false}
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onReact={onReact}
      />,
    );

    expect(drawer.queryByText('👍')).toBeNull();
    expect(drawer.queryByText('☺')).toBeNull();
    expect(drawer.getAllByTestId('plan-positive-reaction-icon-candidate-1').length).toBeGreaterThan(0);
    expect(drawer.queryByTestId('plan-not-for-me-icon-candidate-1')).toBeNull();
    expect(StyleSheet.flatten(drawer.getByLabelText('React to Tacos').props.style)).toMatchObject({
      width: 32,
      height: 32,
      backgroundColor: colors.secondary,
    });
    fireEvent.press(drawer.getByLabelText('React to Tacos'));
    expect(drawer.getByText('React to Tacos')).toBeTruthy();
    expect(drawer.getByText('Upvote')).toBeTruthy();
    expect(drawer.getByText('Not for me')).toBeTruthy();
    expect(drawer.getByText('Hard pass')).toBeTruthy();
    expect(drawer.queryByText('Yum')).toBeNull();
    expect(drawer.queryByText('Thumbs up')).toBeNull();
    expect(drawer.getAllByRole('button').filter((button) => /^React with /.test(button.props.accessibilityLabel ?? ''))).toHaveLength(11);
    const reactionDrawerProps = mockBottomDrawerProps.findLast(
      (props) => props.visible && props.presentation === 'modal',
    );
    expect(reactionDrawerProps).toMatchObject({
      presentation: 'modal',
      contentLayout: 'edgeToEdge',
      snapPoints: ['46%', '62%', '85%'],
      snapIndex: 0,
      keyboardBehavior: 'extend',
    });

    fireEvent.press(drawer.getByLabelText('React with Yum'));
    expect(drawer.getByLabelText('React with Yum').props.accessibilityState).toMatchObject({ selected: true });
    expect(onReact).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(180));
    expect(onReact).toHaveBeenCalledWith('candidate-1', 'yum');

    fireEvent.press(drawer.getByLabelText('React to Tacos'));
    fireEvent.press(drawer.getByLabelText('React with Hard pass'));
    expect(drawer.getByLabelText('React with Hard pass').props.accessibilityState).toMatchObject({ selected: true });
    const hardPassDrawerProps = mockBottomDrawerProps.findLast(
      (props) => props.visible && props.presentation === 'modal',
    );
    expect(drawer.getAllByTestId('meal-plan-drawer')).toHaveLength(2);
    expect(hardPassDrawerProps).toMatchObject({
      contentLayout: 'edgeToEdge',
      snapPoints: ['46%', '62%', '85%'],
      snapIndex: 1,
      keyboardBehavior: 'extend',
      presentation: 'modal',
    });
    expect(drawer.getByTestId('plan-hard-pass-composer')).toBeTruthy();
    expect(drawer.queryByText('Upvote')).toBeNull();
    expect(drawer.queryByText('Not for me')).toBeNull();
    expect(StyleSheet.flatten(drawer.getByLabelText('React with Hard pass').props.style)).toMatchObject({
      minHeight: 36,
    });
    expect(drawer.getAllByRole('radio')).toHaveLength(6);
    expect(drawer.getByLabelText('Allergy')).toBeTruthy();
    expect(drawer.getByLabelText('Dietary need')).toBeTruthy();
    expect(drawer.getByLabelText("Don't like it")).toBeTruthy();
    expect(drawer.getByLabelText('Too spicy')).toBeTruthy();
    expect(drawer.getByLabelText('Texture')).toBeTruthy();
    expect(drawer.getByLabelText('Other')).toBeTruthy();
    expect(drawer.queryByLabelText('Why is this a hard pass?')).toBeNull();
    expect(hardPassDrawerProps).toMatchObject({ snapIndex: 1 });
    expect(hardPassDrawerProps?.bottomAccessory).toBeTruthy();

    fireEvent.press(drawer.getByLabelText('Texture'));
    expect(drawer.getByLabelText('Texture').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(drawer.getByLabelText('Save hard pass reason'));
    expect(onReact).toHaveBeenCalledWith('candidate-1', 'hard_pass', 'Texture');

    fireEvent.press(drawer.getByLabelText('React to Tacos'));
    fireEvent.press(drawer.getByLabelText('React with Hard pass'));
    fireEvent.press(drawer.getByLabelText('Other'));
    const textarea = drawer.getByLabelText('Why is this a hard pass?');
    expect(textarea.props.multiline).toBe(true);
    expect(textarea.props.autoFocus).toBe(true);
    expect(textarea.props.placeholder).toBe('Say why (optional)');
    expect(mockBottomDrawerProps.findLast(
      (props) => props.visible && props.presentation === 'modal',
    )).toMatchObject({ snapIndex: 2 });

    fireEvent.press(drawer.getByLabelText('React with Hard pass'));
    expect(drawer.queryByLabelText('Why is this a hard pass?')).toBeNull();
    expect(drawer.getByText('Upvote')).toBeTruthy();

    fireEvent.press(drawer.getByLabelText('React with Hard pass'));
    fireEvent.press(drawer.getByLabelText('Other'));
    fireEvent.changeText(drawer.getByLabelText('Why is this a hard pass?'), 'Mushrooms');
    fireEvent.press(drawer.getByLabelText('Save hard pass reason'));
    expect(onReact).toHaveBeenCalledWith('candidate-1', 'hard_pass', 'Mushrooms');

    fireEvent.press(drawer.getByLabelText('React to Tacos'));
    fireEvent.press(drawer.getByLabelText('React with Hard pass'));
    fireEvent.press(drawer.getByLabelText('React with Hard pass'));
    expect(drawer.queryByLabelText('Why is this a hard pass?')).toBeNull();
    expect(drawer.getByText('Upvote')).toBeTruthy();
    expect(mockBottomDrawerProps.findLast(
      (props) => props.visible && props.presentation === 'modal',
    )).toMatchObject({ snapIndex: 0 });
    expect(onReact).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('requires a lead to acknowledge a hard pass before sending that recipe to Groceries', () => {
    const onSendToGroceries = jest.fn();
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[{
          id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
          lifecycle: 'idea', createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
          voteCount: 0, downvoteCount: 0, hardPassCount: 1, requiresHardPassReview: true,
          reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0, hard_pass: 1 }, missingItemCount: null,
          contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
          supporters: [{ personId: 'person-child', displayName: 'Alex', avatarUrl: null, reaction: 'hard_pass', reason: 'Mushrooms' }],
          viewerReaction: null, viewerReactionReason: null, canReact: true, canRemove: false, canMarkMade: false,
        }]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onSendToGroceries={onSendToGroceries}
      />,
    );

    const draggableList = drawer.UNSAFE_root.findAll((node: TestTreeNode) => (
      typeof node.props.onDragStart === 'function'
      && typeof node.props.onOrderChange === 'function'
    ))[0];
    const dropIds = draggableList.props.items.map((entry: { id: string }) => entry.id);
    const [moved] = dropIds.splice(0, 1);
    dropIds.splice(2, 0, moved);
    act(() => draggableList.props.onOrderChange(dropIds, { fromIndex: 0, toIndex: 2 }));

    expect(onSendToGroceries).not.toHaveBeenCalled();
    expect(drawer.getByText('Tacos')).toBeTruthy();
    expect(drawer.getByText('Tacos has a hard pass')).toBeTruthy();
    expect(drawer.getByText(/Alex: “Mushrooms”/)).toBeTruthy();
    fireEvent.press(drawer.getByLabelText('Include anyway'));
    expect(onSendToGroceries).toHaveBeenCalledWith(['candidate-1'], { acknowledgeHardPasses: true });
  });

  it('shows who downvoted and makes the selected pill the only removal control', () => {
    const onReact = jest.fn();
    const item = {
      id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 1, downvoteCount: 2,
      reactionCounts: { thumbs_up: 1, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 2 }, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
      supporters: [
        { personId: 'person-2', displayName: 'Sam', avatarUrl: null, reaction: 'thumbs_up' as const },
        { personId: 'person-3', displayName: 'Alex', avatarUrl: null, reaction: 'downvote' as const },
        { personId: 'person-4', displayName: 'Jordan', avatarUrl: null, reaction: 'downvote' as const },
      ],
      viewerReaction: 'downvote' as const, canReact: true, canRemove: false, canMarkMade: false,
    };
    const drawer = render(
      <MealPlanDrawer
        visible items={[item]} canManage={false} onClose={jest.fn()}
        onRemove={jest.fn()} onReact={onReact}
      />,
    );

    expect(drawer.getByLabelText('Thumbs down Tacos, 2')).toBeTruthy();
    expect(drawer.queryByLabelText('React to Tacos')).toBeNull();
    expect(drawer.queryByLabelText('Not for me: Tacos')).toBeNull();
    fireEvent.press(drawer.getByLabelText('Thumbs down Tacos, 2'));
    expect(onReact).toHaveBeenCalledWith('candidate-1', null);

  });

  it('presents the durable count as one Meal plan and preserves its quiet badge treatment', () => {
    const onPress = jest.fn();
    const screen = render(<MealPlanHeaderAction count={5} needsAttention={false} onPress={onPress} />);

    expect(screen.getByText('Meal plan')).toBeTruthy();
    expect(screen.queryByText('Ideas')).toBeNull();
    expect(screen.getByText('5')).toBeTruthy();
    const actionStyle = StyleSheet.flatten(screen.getByTestId('meal-plan-header-action').props.style);
    const countStyle = StyleSheet.flatten(screen.getByTestId('meal-plan-header-count', { includeHiddenElements: true }).props.style);
    expect(actionStyle).toMatchObject({ minHeight: 36, backgroundColor: colors.fieldFill });
    expect(actionStyle).not.toHaveProperty('borderColor');
    expect(countStyle).toMatchObject({
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      alignSelf: 'center',
      backgroundColor: colors.actionAttention,
    });
    expect(countStyle).not.toHaveProperty('position');
    fireEvent.press(screen.getByLabelText('Meal plan, 5 meals'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('coordinates the Meal plan badge pulse with an animated number change and stays still for Reduce Motion', () => {
    const start = jest.fn();
    const sequence = jest.spyOn(Animated, 'sequence').mockReturnValue({ start } as unknown as Animated.CompositeAnimation);
    const parallel = jest.spyOn(Animated, 'parallel').mockReturnValue({ start } as unknown as Animated.CompositeAnimation);
    const screen = render(<MealPlanHeaderAction count={1} needsAttention={false} onPress={jest.fn()} />);

    screen.rerender(<MealPlanHeaderAction count={2} needsAttention={false} onPress={jest.fn()} />);
    expect(sequence).toHaveBeenCalledTimes(1);
    expect(parallel).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('meal-plan-header-count-outgoing')).toHaveTextContent('1');
    expect(screen.getByTestId('meal-plan-header-count-current')).toHaveTextContent('2');

    sequence.mockClear();
    parallel.mockClear();
    mockReduceMotionEnabled = true;
    screen.rerender(<MealPlanHeaderAction count={3} needsAttention={false} onPress={jest.fn()} />);
    expect(sequence).not.toHaveBeenCalled();
    expect(parallel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('meal-plan-header-count-outgoing')).toBeNull();
    expect(screen.getByTestId('meal-plan-header-count-current')).toHaveTextContent('3');

    sequence.mockRestore();
    parallel.mockRestore();
  });

  it('keeps planned meals visible without exposing Groceries inventory state and can return them to ideas', () => {
    const onOpenGroceries = jest.fn();
    const onMarkMade = jest.fn();
    const onReturnToPlan = jest.fn();
    const onReact = jest.fn();
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[
          {
            id: 'ready', candidateId: 'ready', title: 'Tacos', storageRef: null, lifecycle: 'ready',
            createdAt: '2026-08-10T12:00:00.000Z', sentAt: '2026-08-11T12:00:00.000Z',
            voteCount: 3, reactionCounts: { thumbs_up: 2, heart: 1, yum: 0, excited: 0, fire: 0, downvote: 0 },
            supporters: [
              { personId: 'person-2', displayName: 'Sam', avatarUrl: null, reaction: 'thumbs_up' as const },
              { personId: 'person-3', displayName: 'Alex', avatarUrl: null, reaction: 'heart' as const },
            ],
            viewerReaction: 'heart' as const, canReact: true, missingItemCount: 0, canRemove: true, canMarkMade: true,
          },
          { id: 'sent', candidateId: 'sent', title: 'Soup', storageRef: null, lifecycle: 'sent', createdAt: '2026-08-11T12:00:00.000Z', sentAt: '2026-08-11T13:00:00.000Z', voteCount: 1, missingItemCount: 1, canRemove: true, canMarkMade: true },
        ]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onOpenGroceries={onOpenGroceries}
        onMarkMade={onMarkMade}
        onReturnToPlan={onReturnToPlan}
        onReact={onReact}
      />,
    );

    expect(drawer.getByText('Planned').props.accessibilityRole).toBe('header');
    expect(drawer.queryByText('Ready to cook')).toBeNull();
    expect(drawer.getByText('Tacos')).toBeTruthy();
    expect(within(drawer.getByTestId('plan-grocery-row-ready')).getByLabelText('Thumbs up Tacos, 2')).toBeTruthy();
    expect(within(drawer.getByTestId('plan-grocery-row-ready')).getByLabelText('Love Tacos, 1')).toBeTruthy();
    fireEvent.press(drawer.getByLabelText('Love Tacos, 1'));
    expect(onReact).toHaveBeenCalledWith('ready', null);
    expect(drawer.queryByText('1 grocery left')).toBeNull();
    expect(drawer.getByLabelText('More actions for Tacos')).toBeTruthy();
    expect(drawer.queryByRole('button', { name: 'Remove Tacos from Plan' })).toBeNull();
    expect(drawer.getByRole('button', { name: 'Move Tacos' })).toBeTruthy();
    fireEvent(drawer.getByRole('button', { name: 'Move Tacos' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'returnToPlan' },
    });
    expect(onReturnToPlan).toHaveBeenCalledWith('ready');
    fireEvent.press(drawer.getByRole('button', { name: 'View groceries' }));
    expect(onOpenGroceries).toHaveBeenCalledTimes(1);
  });

  it('uses the shared To-do and Goals resting dock geometry', () => {
    const screen = render(<RecipeInventoryDock onAdd={jest.fn()} onSearch={jest.fn()} onAsk={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getByTestId('recipe-inventory-dock').props.style);

    expect(style).toMatchObject({
      position: 'absolute',
      left: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
      right: RESTING_COMPOSER_HORIZONTAL_INSET_PX,
      bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
      height: RESTING_COMPOSER_HEIGHT_PX,
    });
  });
});

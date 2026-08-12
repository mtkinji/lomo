import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('../../../features/unifiedChat/UnifiedChatDrawer', () => ({
  UnifiedChatDrawer: () => null,
}));
jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children, bottomAccessory, snapIndex, snapPoints }: any) => visible
      ? (
        <View
          testID="meal-plan-drawer"
          accessibilityLabel={JSON.stringify({ snapIndex, snapPoints })}
        >
          {children}
          {bottomAccessory}
        </View>
      )
      : null,
    BottomDrawerScrollView: ScrollView,
  };
});
import { colors, radii, spacing } from '../../../theme';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { buildRecipeLibraryInventory, DEFAULT_RECIPE_INVENTORY_FILTERS } from '../data/starterRecipeCatalog';
import { EDITORIAL_MEAL_COLLECTIONS, getMealEditorialEdition } from '../data/editorialMealCollections';
import {
  RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX,
  RESTING_COMPOSER_HEIGHT_PX,
  RESTING_COMPOSER_HORIZONTAL_INSET_PX,
} from '../../../ui/layout/restingComposerMetrics';
import {
  MealPlanHeaderAction,
  MealPlanDrawer,
  RecipeInventoryControls,
  RecipeInventoryDock,
  RecipeLibraryView,
  buildVisibleRecipeInventory,
  buildRecipeDiscoverySections,
  buildRecipeShelves,
} from './RecipeLibraryScreen';
import { RecipeCaptureDrawer } from './RecipeLibraryDrawers';

const editorialPlacements = getMealEditorialEdition(new Date('2026-08-06T12:00:00.000Z')).placements;

const viewProps = {
  onOpen: jest.fn(),
  onRefresh: jest.fn(),
  refreshing: false,
  cached: false,
  filters: DEFAULT_RECIPE_INVENTORY_FILTERS,
  sort: 'featured' as const,
  onOpenFilters: jest.fn(),
  onOpenSort: jest.fn(),
  onClearFilter: jest.fn(),
  onReset: jest.fn(),
  browseMode: 'shelves' as const,
  onSeeAll: jest.fn(),
  editorialPlacements,
  onOpenCollection: jest.fn(),
  onAddToPlan: jest.fn(),
  isInPlan: () => false,
  isFavorite: () => false,
  totalCount: 100,
};

describe('Recipe library', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers one clear recovery action when filters are empty', () => {
    const onReset = jest.fn();
    const screen = render(<RecipeLibraryView {...viewProps} recipes={[]} onReset={onReset} />);
    expect(screen.getByText('Nothing matches yet.')).toBeTruthy();
    fireEvent.press(screen.getByText('Clear filters'));
    expect(onReset).toHaveBeenCalled();
  });

  it('shows a cached recipe and opens it', () => {
    const onOpen = jest.fn();
    const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const screen = render(<RecipeLibraryView {...viewProps} recipes={[projection]} onOpen={onOpen} cached />);
    expect(screen.getByText('Your saved recipes are here while Kwilt refreshes.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open Grandma Ruth's Cake"));
    expect(onOpen).toHaveBeenCalledWith(projection.recipe.id);
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

  it('opens a compact illustrated cuisine family from discovery', () => {
    const onSeeAll = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} onSeeAll={onSeeAll} />,
    );

    expect(screen.getByText('Explore cuisines')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Browse French meals'));

    expect(onSeeAll).toHaveBeenCalledWith({
      ...DEFAULT_RECIPE_INVENTORY_FILTERS,
      cuisine: 'French',
    });
  });

  it('reveals regional cuisine refinements inside a family result', () => {
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

    fireEvent.press(screen.getByLabelText('Show Provençal French meals'));

    expect(onSeeAll).toHaveBeenCalledWith({
      ...filters,
      cuisine: 'Provençal French',
    });
  });

  it('puts liked meals first without turning them into a new inventory', () => {
    const recipes = buildRecipeLibraryInventory([]);
    const favoriteIds = new Set([recipes[2].recipe.id, recipes[5].recipe.id]);
    const shelves = buildRecipeShelves(recipes, favoriteIds);

    expect(shelves[0]).toMatchObject({ id: 'favorites', title: 'Liked meals' });
    expect(shelves[0].recipes.map((recipe) => recipe.recipe.id)).toEqual([
      recipes[2].recipe.id,
      recipes[5].recipe.id,
    ]);
    expect(buildRecipeShelves(recipes, new Set())[0].id).not.toBe('favorites');
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
    expect(shelvesStyle.paddingHorizontal).toBe(spacing.md);
    shelvesScreen.unmount();

    const resultsScreen = render(
      <RecipeLibraryView {...viewProps} browseMode="results" recipes={recipes.slice(0, 4)} />,
    );
    const resultsStyle = StyleSheet.flatten(
      resultsScreen.getByTestId('recipe-results-grid').props.contentContainerStyle,
    );
    expect(resultsStyle.paddingHorizontal).toBe(spacing.md);
  });

  it('places at most two benefit-led editorial invitations through the shelves', () => {
    const onOpenCollection = jest.fn();
    const recipes = buildRecipeLibraryInventory([]);
    const screen = render(
      <RecipeLibraryView {...viewProps} recipes={recipes} onOpenCollection={onOpenCollection} />,
    );

    const offers = screen.getAllByTestId(/^editorial-collection-offer-/);
    expect(offers).toHaveLength(2);
    const firstCollection = EDITORIAL_MEAL_COLLECTIONS.find((collection) => collection.id === editorialPlacements[0].collectionId)!;
    fireEvent.press(screen.getByRole('button', { name: `Open Collection: ${firstCollection.title}` }));
    expect(onOpenCollection).toHaveBeenCalledWith(firstCollection.id);

    const discovery = buildRecipeDiscoverySections(buildRecipeShelves(recipes), editorialPlacements);
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
    const screen = render(
      <RecipeInventoryControls
        filters={DEFAULT_RECIPE_INVENTORY_FILTERS}
        sort="featured"
        resultCount={100}
        totalCount={100}
        onOpenFilters={jest.fn()}
        onOpenSort={jest.fn()}
        onClearFilter={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Search recipes')).toBeNull();
    expect(screen.getByText('100 meals')).toBeTruthy();
    const filterStyle = StyleSheet.flatten(screen.getByTestId('recipe-funnel-control-surface').props.style);
    expect(filterStyle).toMatchObject({ minWidth: 40, height: 34 });
  });

  it('shows the active filter count and makes each filter directly removable', () => {
    const onOpenFilters = jest.fn();
    const onClearFilter = jest.fn();
    const filters = { ...DEFAULT_RECIPE_INVENTORY_FILTERS, maxMinutes: 30, cuisine: 'Mexican' };
    const screen = render(
      <RecipeInventoryControls
        filters={filters}
        sort="quickest"
        resultCount={4}
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
    expect(screen.getByText('4 of 100')).toBeTruthy();
  });

  it('keeps capture, Search, and AI as separate bottom dock actions', () => {
    const onAdd = jest.fn();
    const onSearch = jest.fn();
    const onAsk = jest.fn();
    const screen = render(<RecipeInventoryDock onAdd={onAdd} onSearch={onSearch} onAsk={onAsk} />);

    fireEvent.press(screen.getByLabelText('Add a recipe'));
    fireEvent.press(screen.getByLabelText('Search meals'));
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
    expect(onAddToPlan).toHaveBeenCalledWith(featured);
    const ordinary = recipes.find((projection) => projection.currentVersion.id !== featured.currentVersion.id)!;
    fireEvent.press(screen.getAllByLabelText(`Add ${ordinary.currentVersion.title} to Meal Plan`)[0]);
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

    expect(drawer.getByText('Plan')).toBeTruthy();
    expect(drawer.getByLabelText('Plan, 6 recipes')).toBeTruthy();
    expect(drawer.queryByTestId('meal-plan-drawer-thumbnail')).toBeNull();
    expect(drawer.queryByLabelText('Search meals')).toBeNull();
    expect(drawer.getByText('Meal 6')).toBeTruthy();
    expect(drawer.getByLabelText('More actions for Meal 1')).toBeTruthy();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('reuses the household food illustration to invite recipes into an empty Plan', () => {
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(drawer.getByText('Add recipes to your Plan')).toBeTruthy();
    expect(drawer.queryByText('Nothing in Plan yet')).toBeNull();
    expect(drawer.queryByText('Add any recipe you might want to make.')).toBeNull();
  });

  it('groups the persistent Plan by readiness and keeps grocery commitment primary', () => {
    const onSendToGroceries = jest.fn();
    const onOpenGroceries = jest.fn();
    const item = {
      id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 1, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
      supporters: [], viewerReacted: false, canReact: false, canRemove: true, canMarkMade: false,
    };
    const drawer = render(
      <MealPlanDrawer
        visible items={[item]} canManage onClose={jest.fn()}
        onRemove={jest.fn()} onSendToGroceries={onSendToGroceries} onOpenGroceries={onOpenGroceries}
      />,
    );

    expect(drawer.getByTestId('meal-plan-drawer').props.accessibilityLabel).toBe(
      JSON.stringify({ snapIndex: 0, snapPoints: ['88%'] }),
    );
    expect(drawer.queryByText('Open for ideas')).toBeNull();
    expect(drawer.queryByText(/Everyone can add/)).toBeNull();
    expect(drawer.queryByText('Ideas')).toBeNull();
    fireEvent.press(drawer.getByRole('button', { name: 'Send to Groceries' }));
    fireEvent.press(drawer.getByRole('checkbox', { name: 'Send Tacos to Groceries' }));
    fireEvent.press(drawer.getByRole('button', { name: 'Send 1 recipe to Groceries' }));
    expect(onSendToGroceries).toHaveBeenCalledWith(['candidate-1']);
  });

  it('keeps household support compact and directly tappable', () => {
    const onReact = jest.fn();
    const item = {
      id: 'meal-1', candidateId: 'candidate-1', title: 'Tacos', storageRef: null,
      lifecycle: 'idea' as const, createdAt: '2026-08-11T12:00:00.000Z', sentAt: null,
      voteCount: 2, missingItemCount: null,
      contributor: { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
      supporters: [
        { personId: 'person-2', displayName: 'Sam', avatarUrl: null },
        { personId: 'person-3', displayName: 'Alex', avatarUrl: null },
      ],
      viewerReacted: false, canReact: true, canRemove: false, canMarkMade: false,
    };
    const drawer = render(
      <MealPlanDrawer
        visible items={[item]} canManage={false} onClose={jest.fn()}
        onRemove={jest.fn()} onReact={onReact}
      />,
    );

    expect(drawer.queryByText('Added by Sam')).toBeNull();
    const reaction = drawer.getByLabelText('Thumbs up Tacos, 2');
    expect(drawer.getByText('👍')).toBeTruthy();
    fireEvent.press(reaction);
    expect(drawer.getByLabelText('Thumbs up Tacos, 2').props.accessibilityState).toMatchObject({ expanded: true, selected: false });
    expect(drawer.getAllByText('2')).toHaveLength(1);
    expect(onReact).toHaveBeenCalledWith('candidate-1', true);
  });

  it('keeps the familiar Plan icon and meal counter', () => {
    const onPress = jest.fn();
    const screen = render(<MealPlanHeaderAction count={5} onPress={onPress} />);

    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.queryByText('Meal Plan')).toBeNull();
    expect(screen.getByText('5')).toBeTruthy();
    const actionStyle = StyleSheet.flatten(screen.getByTestId('meal-plan-header-action').props.style);
    const countStyle = StyleSheet.flatten(screen.getByTestId('meal-plan-header-count', { includeHiddenElements: true }).props.style);
    expect(actionStyle).toMatchObject({ minHeight: 36, backgroundColor: colors.fieldFill });
    expect(actionStyle).not.toHaveProperty('borderColor');
    expect(countStyle).toMatchObject({
      minWidth: 18,
      height: 18,
      backgroundColor: colors.sumi900,
    });
    expect(countStyle).not.toHaveProperty('position');
    fireEvent.press(screen.getByLabelText('Plan, 5 meals'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('leads with ready recipes, keeps sent recipes visible, and resolves Made explicitly', () => {
    const onOpenGroceries = jest.fn();
    const onMarkMade = jest.fn();
    const drawer = render(
      <MealPlanDrawer
        visible
        items={[
          { id: 'ready', candidateId: 'ready', title: 'Tacos', storageRef: null, lifecycle: 'ready', createdAt: '2026-08-10T12:00:00.000Z', sentAt: '2026-08-11T12:00:00.000Z', voteCount: 3, missingItemCount: 0, canRemove: true, canMarkMade: true },
          { id: 'sent', candidateId: 'sent', title: 'Soup', storageRef: null, lifecycle: 'sent', createdAt: '2026-08-11T12:00:00.000Z', sentAt: '2026-08-11T13:00:00.000Z', voteCount: 1, missingItemCount: 1, canRemove: true, canMarkMade: true },
        ]}
        canManage
        onClose={jest.fn()}
        onRemove={jest.fn()}
        onOpenGroceries={onOpenGroceries}
        onMarkMade={onMarkMade}
      />,
    );

    expect(drawer.getByText('Ready to cook')).toBeTruthy();
    expect(drawer.getByText('Sent to groceries')).toBeTruthy();
    expect(drawer.getByText('Tacos')).toBeTruthy();
    expect(drawer.getByText('Missing 1 item')).toBeTruthy();
    fireEvent.press(drawer.getAllByRole('button', { name: 'Made' })[0]);
    expect(onMarkMade).toHaveBeenCalledWith('ready');
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

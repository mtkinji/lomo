import {
  CAPABILITY_GROUPS,
  CAPABILITY_MENU_REGISTRY,
  CAPABILITY_REGISTRY,
  getCapability,
  getCapabilityMenuDestination,
} from './registry';

describe('capability registry', () => {
  it('orders the capability families by the accepted navigation hierarchy', () => {
    expect(CAPABILITY_GROUPS.map(({ id }) => id)).toEqual([
      'money',
      'food',
      'goals-plans',
      'fun',
    ]);
  });

  it('keeps the accepted Phase 1 capability order', () => {
    expect(CAPABILITY_REGISTRY.map(({ id }) => id)).toEqual([
      'goals',
      'todos',
      'plan',
      'arcs',
      'chapters',
      'money',
      'explore',
      'games',
      'recipes',
      'meal-planning',
      'groceries',
      'chores',
    ]);
  });

  it('uses a chore-specific icon instead of the Home destination icon', () => {
    expect(getCapability('chores').icon).toBe('chores');
    expect(getCapabilityMenuDestination('chores').icon).toBe('chores');
  });

  it('keeps Meal Planning contextual while exposing Recipes and Groceries as user-facing destinations', () => {
    expect(CAPABILITY_REGISTRY.filter(({ id }) => ['recipes', 'meal-planning', 'groceries'].includes(id))).toEqual([
      expect.objectContaining({ id: 'recipes', label: 'Recipes', icon: 'cookingPot', availability: 'active' }),
      expect.objectContaining({ id: 'meal-planning', label: 'Meal Plan', availability: 'active' }),
      expect.objectContaining({ id: 'groceries', label: 'Groceries', availability: 'active' }),
    ]);
    expect(CAPABILITY_MENU_REGISTRY.filter(({ group }) => group === 'food').map(
      ({ id, label, ownerId, rootRoute }) => ({ id, label, ownerId, rootRoute }),
    )).toEqual([
      { id: 'recipes', label: 'Recipes', ownerId: 'recipes', rootRoute: { root: 'Food', screen: 'RecipeLibrary' } },
      { id: 'groceries', label: 'Groceries', ownerId: 'groceries', rootRoute: { root: 'Food', screen: 'GroceryList' } },
    ]);
    expect(CAPABILITY_MENU_REGISTRY.some(({ id }) => id === ('food' as never))).toBe(false);
  });

  it('orders Goals & Plans from identity through reflection', () => {
    expect(
      CAPABILITY_MENU_REGISTRY.filter(({ group }) => group === 'goals-plans').map(
        ({ id, label }) => ({ id, label }),
      ),
    ).toEqual([
      { id: 'arcs', label: 'Arcs' },
      { id: 'goals', label: 'Goals' },
      { id: 'todos', label: 'To-dos' },
      { id: 'plan', label: 'Plans' },
      { id: 'chapters', label: 'Chapters' },
    ]);
  });

  it('uses unique capability IDs', () => {
    const ids = CAPABILITY_REGISTRY.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references only registered groups', () => {
    const groupIds = new Set(CAPABILITY_GROUPS.map(({ id }) => id));

    expect(
      CAPABILITY_REGISTRY.every(({ group }) => group === null || groupIds.has(group)),
    ).toBe(true);
  });

  it('gives every active capability a root route', () => {
    expect(
      CAPABILITY_REGISTRY.filter(({ availability }) => availability === 'active').every(
        ({ rootRoute }) => rootRoute.root.length > 0,
      ),
    ).toBe(true);
  });

  it('registers Money as active after live reads and bounded Chat coverage are ready', () => {
    expect(getCapability('money')).toMatchObject({
      id: 'money',
      label: 'Money',
      group: 'money',
      rootRoute: { root: 'Money', screen: 'MoneySummary' },
      availability: 'active',
    });
  });

  it('registers Explore in the Fun group', () => {
    expect(getCapability('explore')).toMatchObject({
      id: 'explore',
      label: 'Explore',
      group: 'fun',
      rootRoute: { root: 'Explore', screen: 'ExploreMap' },
      availability: 'active',
    });
  });

  it('registers Games as one destination in the Fun group', () => {
    expect(getCapability('games')).toMatchObject({
      id: 'games',
      label: 'Games',
      group: 'fun',
      rootRoute: { root: 'Games', screen: 'GamesShelf' },
      availability: 'active',
    });
    expect(CAPABILITY_MENU_REGISTRY.filter(({ ownerId }) => ownerId === 'games')).toHaveLength(1);
    expect(CAPABILITY_MENU_REGISTRY.filter(({ group }) => group === 'fun').map(({ id }) => id))
      .toEqual(['explore', 'games']);
  });

  it('keeps Budgets as the only active global Money destination', () => {
    expect(
      CAPABILITY_MENU_REGISTRY.filter(({ group, availability }) => group === 'money' && availability === 'active').map(
        ({ id, label, ownerId, rootRoute }) => ({ id, label, ownerId, rootRoute }),
      ),
    ).toEqual([
      {
        id: 'money-summary',
        label: 'Budgets',
        ownerId: 'money',
        rootRoute: { root: 'Money', screen: 'MoneySummary' },
      },
    ]);

    expect(getCapabilityMenuDestination('money-summary').ownerId).toBe('money');
    expect(getCapabilityMenuDestination('money-summary').icon).toBe('wallet');
    expect(getCapabilityMenuDestination('money-transactions')).toMatchObject({
      availability: 'hidden',
      rootRoute: { root: 'Money', screen: 'MoneyTransactions' },
    });
  });

  it('maps the current capabilities onto their existing host routes', () => {
    expect(CAPABILITY_REGISTRY.map(({ id, rootRoute }) => [id, rootRoute])).toEqual([
      ['goals', { root: 'MainTabs', tab: 'GoalsTab', screen: 'GoalsList' }],
      ['todos', { root: 'MainTabs', tab: 'ActivitiesTab', screen: 'ActivitiesList' }],
      ['plan', { root: 'MainTabs', tab: 'PlanTab' }],
      ['arcs', { root: 'MainTabs', tab: 'MoreTab', screen: 'MoreArcs' }],
      ['chapters', { root: 'MainTabs', tab: 'MoreTab', screen: 'MoreChapters' }],
      ['money', { root: 'Money', screen: 'MoneySummary' }],
      ['explore', { root: 'Explore', screen: 'ExploreMap' }],
      ['games', { root: 'Games', screen: 'GamesShelf' }],
      ['recipes', { root: 'Food', screen: 'RecipeLibrary' }],
      ['meal-planning', { root: 'Food', screen: 'NextMeals' }],
      ['groceries', { root: 'Food', screen: 'GroceryList' }],
      ['chores', { root: 'Chores' }],
    ]);
  });
});

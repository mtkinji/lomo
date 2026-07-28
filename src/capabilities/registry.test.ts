import {
  CAPABILITY_GROUPS,
  CAPABILITY_MENU_REGISTRY,
  CAPABILITY_REGISTRY,
  getCapability,
  getCapabilityMenuDestination,
} from './registry';

describe('capability registry', () => {
  it('keeps the accepted Phase 1 capability order', () => {
    expect(CAPABILITY_REGISTRY.map(({ id }) => id)).toEqual([
      'goals',
      'todos',
      'plan',
      'arcs',
      'chapters',
      'money',
      'explore',
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

  it('registers Explore as a direct named capability', () => {
    expect(getCapability('explore')).toMatchObject({
      id: 'explore',
      label: 'Explore',
      group: null,
      rootRoute: { root: 'Explore', screen: 'ExploreMap' },
      availability: 'active',
    });
  });

  it('exposes each established Money place directly in the global capability menu', () => {
    expect(
      CAPABILITY_MENU_REGISTRY.filter(({ group }) => group === 'money').map(
        ({ id, label, ownerId, rootRoute }) => ({ id, label, ownerId, rootRoute }),
      ),
    ).toEqual([
      {
        id: 'money-summary',
        label: 'Summary',
        ownerId: 'money',
        rootRoute: { root: 'Money', screen: 'MoneySummary' },
      },
      {
        id: 'money-transactions',
        label: 'Transactions',
        ownerId: 'money',
        rootRoute: { root: 'Money', screen: 'MoneyTransactions' },
      },
      {
        id: 'money-accounts',
        label: 'Accounts',
        ownerId: 'money',
        rootRoute: { root: 'Money', screen: 'MoneyAccounts' },
      },
    ]);

    expect(getCapabilityMenuDestination('money-summary').ownerId).toBe('money');
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
    ]);
  });
});

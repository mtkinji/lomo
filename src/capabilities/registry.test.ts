import { CAPABILITY_GROUPS, CAPABILITY_REGISTRY, getCapability } from './registry';

describe('capability registry', () => {
  it('keeps the accepted Phase 1 capability order', () => {
    expect(CAPABILITY_REGISTRY.map(({ id }) => id)).toEqual([
      'goals',
      'todos',
      'plan',
      'arcs',
      'chapters',
      'money',
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

  it('registers Money as a preview capability until live financial reads are ready', () => {
    expect(getCapability('money')).toMatchObject({
      id: 'money',
      label: 'Money',
      group: 'money',
      rootRoute: { root: 'Money', screen: 'MoneySummary' },
      availability: 'preview',
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
    ]);
  });
});

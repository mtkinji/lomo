import { resolveCapabilityNavigation } from './capabilityNavigation';

describe('resolveCapabilityNavigation', () => {
  it.each([
    ['goals', { name: 'MainTabs', params: { screen: 'GoalsTab', params: { screen: 'GoalsList' } } }],
    [
      'todos',
      {
        name: 'MainTabs',
        params: { screen: 'ActivitiesTab', params: { screen: 'ActivitiesList' } },
      },
    ],
    ['plan', { name: 'MainTabs', params: { screen: 'PlanTab' } }],
    [
      'arcs',
      { name: 'MainTabs', params: { screen: 'MoreTab', params: { screen: 'MoreArcs' } } },
    ],
    [
      'chapters',
      {
        name: 'MainTabs',
        params: { screen: 'MoreTab', params: { screen: 'MoreChapters' } },
      },
    ],
  ] as const)('resolves %s through the existing host navigator', (id, expected) => {
    expect(resolveCapabilityNavigation(id)).toEqual(expected);
  });
});

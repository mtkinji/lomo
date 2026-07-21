import { deriveActiveCapabilityId } from './CapabilityShellContext';

function state(...names: string[]) {
  return names.reduceRight<Record<string, unknown> | undefined>((child, name) => ({
    index: 0,
    routes: [{ name, ...(child ? { state: child } : {}) }],
  }), undefined);
}

describe('deriveActiveCapabilityId', () => {
  it.each([
    [['MainTabs', 'GoalsTab', 'GoalDetail'], 'goals'],
    [['MainTabs', 'ActivitiesTab', 'ActivityDetail'], 'todos'],
    [['MainTabs', 'PlanTab'], 'plan'],
    [['MainTabs', 'MoreTab', 'MoreArcs', 'ArcDetail'], 'arcs'],
    [['MainTabs', 'MoreTab', 'MoreChapters'], 'chapters'],
    [['MainTabs', 'MoreTab', 'MoreChapterDetail'], 'chapters'],
    [['ArcsStack', 'ArcsList'], 'arcs'],
  ] as const)('derives %s as %s', (routeNames, expected) => {
    expect(deriveActiveCapabilityId(state(...routeNames))).toBe(expected);
  });

  it('returns null for global and compatibility surfaces without a capability', () => {
    expect(deriveActiveCapabilityId(state('Agent'))).toBeNull();
    expect(deriveActiveCapabilityId(state('Settings', 'SettingsHome'))).toBeNull();
    expect(deriveActiveCapabilityId(state('MainTabs', 'MoreTab', 'MoreHome'))).toBeNull();
  });
});

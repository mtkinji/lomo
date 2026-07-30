import { CommonActions, DrawerRouter } from '@react-navigation/native';
import {
  ROOT_DRAWER_BACK_BEHAVIOR,
  resolveCapabilityNavigation,
} from './capabilityNavigation';

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
    ['money', { name: 'Money', params: { screen: 'MoneySummary' } }],
    ['money-summary', { name: 'Money', params: { screen: 'MoneySummary' } }],
    ['money-transactions', { name: 'Money', params: { screen: 'MoneyTransactions' } }],
    ['money-accounts', { name: 'Money', params: { screen: 'MoneyAccounts' } }],
    ['explore', { name: 'Explore', params: { screen: 'ExploreMap' } }],
    ['games', { name: 'Games', params: { screen: 'GamesShelf' } }],
  ] as const)('resolves %s through the existing host navigator', (id, expected) => {
    expect(resolveCapabilityNavigation(id)).toEqual(expected);
  });
});

describe('root capability drawer history', () => {
  it('returns from Settings to the capability that opened it', () => {
    const routeNames = ['MainTabs', 'Games', 'Settings'];
    const routeParamList = { MainTabs: undefined, Games: undefined, Settings: undefined };
    const routeGetIdList = { MainTabs: undefined, Games: undefined, Settings: undefined };
    const router = DrawerRouter({
      initialRouteName: 'MainTabs',
      backBehavior: ROOT_DRAWER_BACK_BEHAVIOR,
    });
    const options = { routeNames, routeParamList, routeGetIdList };
    const initial = router.getInitialState(options);
    const games = router.getStateForAction(initial, CommonActions.navigate('Games'), options);
    if (!games || games.stale !== false) throw new Error('Expected a complete Games state');
    const settings = router.getStateForAction(games, CommonActions.navigate('Settings'), options);
    if (!settings || settings.stale !== false) throw new Error('Expected a complete Settings state');
    const returned = router.getStateForAction(settings, CommonActions.goBack(), options);
    if (!returned || returned.stale !== false) throw new Error('Expected a complete return state');

    expect(settings.routes[settings.index].name).toBe('Settings');
    expect(returned.routes[returned.index].name).toBe('Games');
  });
});

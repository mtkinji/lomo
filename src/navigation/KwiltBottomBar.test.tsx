import { fireEvent } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { renderWithProviders } from '../test/renderWithProviders';
import { KwiltBottomBar } from './KwiltBottomBar';

jest.mock('../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({
    capture: jest.fn(),
  }),
}));

jest.mock('../features/ai/useAgentLauncher', () => ({
  useAgentLauncher: () => ({
    openForScreenContext: jest.fn(),
    AgentWorkspaceSheet: null,
  }),
}));

jest.mock('./ChromeVisibilityContext', () => ({
  useChromeVisibility: () => ({
    bottomBarVisible: true,
    bottomBarFadeVisible: true,
  }),
}));

describe('KwiltBottomBar', () => {
  it('renders the active tab indicator after the initial active item layout', () => {
    const props = createBottomBarProps({ activeIndex: 0 });
    const { getByLabelText, queryByTestId } = renderWithProviders(<KwiltBottomBar {...props} />);

    expect(queryByTestId('kwilt-bottom-bar-active-indicator')).toBeNull();

    fireEvent(getByLabelText('Goals'), 'layout', {
      nativeEvent: {
        layout: { x: 8, y: 0, width: 72, height: 48 },
      },
    });

    expect(queryByTestId('kwilt-bottom-bar-active-indicator')).toBeTruthy();
  });
});

function createBottomBarProps({ activeIndex }: { activeIndex: number }): BottomTabBarProps {
  const routes = [
    { key: 'goals-key', name: 'GoalsTab' },
    { key: 'activities-key', name: 'ActivitiesTab' },
    { key: 'plan-key', name: 'PlanTab' },
    { key: 'more-key', name: 'MoreTab' },
  ];
  const state: BottomTabBarProps['state'] = {
    stale: false,
    type: 'tab',
    key: 'main-tabs',
    index: activeIndex,
    routeNames: routes.map((route) => route.name),
    routes,
    history: [],
    preloadedRouteKeys: [],
  };
  const navigation = createNavigationMock(state);

  return {
    state,
    descriptors: Object.fromEntries(
      routes.map((route) => [
        route.key,
        {
          route,
          navigation,
          options: { title: titleForRoute(route.name) },
          render: () => <></>,
        },
      ]),
    ),
    navigation,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as BottomTabBarProps;
}

function createNavigationMock(state: BottomTabBarProps['state']) {
  const noop = () => undefined;
  return {
    dispatch: noop,
    navigate: jest.fn(),
    navigateDeprecated: jest.fn(),
    preload: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: () => true,
    canGoBack: () => false,
    getId: () => undefined,
    getParent: () => undefined,
    getState: () => state,
    setParams: jest.fn(),
    replaceParams: jest.fn(),
    addListener: jest.fn(() => noop),
    removeListener: jest.fn(),
    emit: jest.fn((options) => ({
      type: options.type,
      target: options.target,
      defaultPrevented: false,
      preventDefault: jest.fn(),
    })),
    jumpTo: jest.fn(),
    setOptions: jest.fn(),
  };
}

function titleForRoute(routeName: string) {
  switch (routeName) {
    case 'GoalsTab':
      return 'Goals';
    case 'ActivitiesTab':
      return 'To-dos';
    case 'PlanTab':
      return 'Plan';
    case 'MoreTab':
      return 'More';
    default:
      return routeName;
  }
}
